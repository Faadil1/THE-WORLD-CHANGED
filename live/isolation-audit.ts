/**
 * Static isolation audit helpers (used by tests and by the live runner's preflight).
 * Reads source files only; never executes them.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Code reachable by a live model: the tool adapter and everything it imports. */
export const MODEL_REACHABLE_ENTRY = "live/tools.ts";
/** Code on the model request path (loop + receipt). Must also be free of I/O. */
export const MODEL_PATH_ENTRIES = ["live/tools.ts", "live/agent-loop.ts", "live/claude-code-loop.ts", "live/receipt.ts"];
/** Modules allowed on the model path besides simulation/src. The SDK/API transports are deliberately absent. */
export const MODEL_PATH_ALLOWED = ["live/tools.ts", "live/diff.ts", "live/agent-loop.ts", "live/claude-code-loop.ts", "live/receipt.ts"];

/** Patterns that would give tool code network, process, filesystem, or dynamic-code capability. */
export const FORBIDDEN_CAPABILITIES: Array<[RegExp, string]> = [
  [/from\s+["'](?!\.{1,2}\/)[^"']+["']/, "non-relative import (package or node: builtin)"],
  [/\bimport\s*\(/, "dynamic import"],
  [/\brequire\s*\(/, "require()"],
  [/\bfetch\s*\(/, "fetch"],
  [/XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon/, "browser network API"],
  [/\bchild_process\b|\bspawn\s*\(|\bexecSync\b|\bexecFile\b|\bfork\s*\(/, "process execution"],
  [/\bprocess\s*\./, "process object"],
  [/\bglobalThis\b|\bwindow\b|\bself\s*\./, "global object access"],
  [/\beval\s*\(|new\s+Function\s*\(|\bFunction\s*\(/, "dynamic code"],
  [/\bDeno\b|\bBun\b/, "alternate runtime API"],
  [/writeFile|appendFile|createWriteStream|unlink|rmSync|rmdir|mkdir|rename|copyFile|symlink|truncate/, "filesystem mutation"],
];

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Transitive relative-import graph from the given entry files (repo-relative paths). */
export function importGraph(entries: string[]): string[] {
  const seen = new Set<string>();
  const stack = entries.map((e) => resolve(REPO_ROOT, e));
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const code = stripComments(readFileSync(file, "utf8"));
    for (const m of code.matchAll(/(?:import|export)\s[^;]*?from\s+["'](\.{1,2}\/[^"']+)["']/g)) {
      let target = resolve(dirname(file), m[1]!);
      if (existsSync(target + ".ts")) target += ".ts";
      else if (existsSync(resolve(target, "index.ts"))) target = resolve(target, "index.ts");
      stack.push(target);
    }
  }
  return [...seen].map((f) => relative(REPO_ROOT, f)).sort();
}

export type AuditFinding = { file: string; capability: string; excerpt: string };

export function auditCapabilities(files: string[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const f of files) {
    const code = stripComments(readFileSync(resolve(REPO_ROOT, f), "utf8"));
    for (const [re, capability] of FORBIDDEN_CAPABILITIES) {
      const m = code.match(re);
      if (m) findings.push({ file: f, capability, excerpt: m[0].slice(0, 80) });
    }
  }
  return findings;
}

/** Preflight used by the live runner: the model path must audit clean. */
export function preflightIsolation(): { ok: boolean; graph: string[]; findings: AuditFinding[] } {
  const graph = importGraph(MODEL_PATH_ENTRIES);
  const outside = graph.filter((f) => !f.startsWith("simulation/src/") && !MODEL_PATH_ALLOWED.includes(f));
  const findings = auditCapabilities(graph);
  for (const f of outside) findings.push({ file: f, capability: "module outside sandbox boundary", excerpt: f });
  return { ok: findings.length === 0, graph, findings };
}
