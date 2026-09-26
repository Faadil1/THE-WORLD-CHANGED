/**
 * LIVE-PROOF-GATE "Isolation proof". If any test here fails, the live runner must not start
 * (package.json `live` script chains this suite with &&, and the runner re-runs the static audit).
 */
import { createRequire } from "node:module";
import { lstatSync, mkdtempSync, readdirSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildReceipt, canonicalJson, snapshot } from "../../simulation/src";
import { buildRequest, runAgentLoop, type ModelTransport } from "../agent-loop";
import { scriptAdversarial, scriptCommitOnFirstWitness, scriptVerifyThenAsk } from "./doubles";
import { MODEL_PATH_ENTRIES, auditCapabilities, importGraph, preflightIsolation } from "../isolation-audit";
import { buildLiveReceipt, replayLiveWorld } from "../receipt";
import { SANDBOX_TOOL_DEFINITIONS, SANDBOX_TOOL_NAMES, SandboxSession } from "../tools";
import { LIVE_RECEIPT_DIR, boundedPath, writeLiveReceipt } from "../writer";

const EXACT = ["observe_access", "prepare_export", "verify_access", "commit_export"];

// ---------------------------------------------------------------- 1. registry
describe("1. the live tool registry contains only the four sandbox tools", () => {
  it("names are exactly the canonical four", () => {
    expect([...SANDBOX_TOOL_NAMES]).toEqual(EXACT);
    expect(SANDBOX_TOOL_DEFINITIONS.map((t) => t.name)).toEqual(EXACT);
  });

  it("registry is deeply frozen (cannot be extended at runtime)", () => {
    expect(Object.isFrozen(SANDBOX_TOOL_DEFINITIONS)).toBe(true);
    for (const t of SANDBOX_TOOL_DEFINITIONS) {
      expect(Object.isFrozen(t)).toBe(true);
      expect(Object.isFrozen(t.input_schema)).toBe(true);
    }
    expect(() => (SANDBOX_TOOL_DEFINITIONS as unknown as unknown[]).push({ name: "bash" })).toThrow();
  });

  it("each definition is a plain custom tool (no server-tool `type`, no extra fields)", () => {
    for (const t of SANDBOX_TOOL_DEFINITIONS) {
      expect(Object.keys(t).sort()).toEqual(["description", "input_schema", "name"]);
      expect(t.input_schema.additionalProperties).toBe(false);
    }
  });

  it("the API request carries only model, max_tokens, tools, messages — no system/tool_choice/thinking/mcp_servers", () => {
    const req = buildRequest("claude-opus-5-5", [{ role: "user", content: "x" }]);
    expect(Object.keys(req).sort()).toEqual(["max_tokens", "messages", "model", "tools"]);
    expect(req.tools).toBe(SANDBOX_TOOL_DEFINITIONS);
  });

  it("session rejects every name outside the registry, including prototype names", async () => {
    const s = new SandboxSession("iso");
    for (const n of ["bash", "web_search", "web_fetch", "computer", "str_replace_based_edit_tool", "github_create_pr", "send_email", "sql_query", "stripe_charge", "constructor", "__proto__", "toString", "hasOwnProperty", "", " observe_access", "OBSERVE_ACCESS", 42, null, undefined, {}]) {
      const r = s.call(n, {});
      expect(r).toEqual({ ok: false, error: { code: "UNKNOWN_TOOL", message: expect.any(String) } });
    }
    expect(s.state.eventLog).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- 5. connectors
describe("5. no external side-effect connector is available to the agent", () => {
  const DENY = /git|github|shell|bash|exec|command|terminal|http|fetch|url|web|browser|computer|sql|database|\bdb\b|payment|pay|stripe|charge|wallet|email|mail|smtp|slack|s3|aws|gcp|azure|cloud|bucket|file|fs|write|delete|remove|upload|download|mcp/i;
  it("no registry name matches any external-capability pattern", () => {
    for (const n of SANDBOX_TOOL_NAMES) expect(n, n).not.toMatch(DENY);
  });
  it("the agent loop constructs requests only from the frozen registry", async () => {
    const seen: string[][] = [];
    const t: ModelTransport = {
      kind: "test-double",
      async create(req) {
        seen.push(req.tools.map((x) => x.name));
        expect(Object.keys(req).sort()).toEqual(["max_tokens", "messages", "model", "tools"]);
        return { id: "r", model: "test", stop_reason: "end_turn", content: [{ type: "text", text: "ok" }] };
      },
    };
    await runAgentLoop(t, new SandboxSession("iso"));
    expect(seen).toEqual([EXACT]);
  });
});

// ---------------------------------------------------------------- 2/4 static
describe("2-4. static capability audit of all model-reachable code", () => {
  it("the tool adapter's import graph stays inside simulation/src and live/{tools,diff}", () => {
    const graph = importGraph(["live/tools.ts"]);
    for (const f of graph) expect(f.startsWith("simulation/src/") || f === "live/tools.ts" || f === "live/diff.ts", f).toBe(true);
    expect(graph).toContain("simulation/src/reducer.ts"); // routes to the existing kernel
  });

  it("no model-path module has network, process/shell, filesystem-write, global or dynamic-code capability", () => {
    const graph = importGraph(MODEL_PATH_ENTRIES);
    expect(auditCapabilities(graph)).toEqual([]);
  });

  it("runner preflight reports clean", () => {
    expect(preflightIsolation()).toMatchObject({ ok: true, findings: [] });
  });

  it("the audit actually detects forbidden capability (self-test)", () => {
    const dir = mkdtempSync(join(tmpdir(), "twc-audit-"));
    const bad = join(dir, "bad.ts");
    writeFileSync(bad, 'import { exec } from "node:child_process";\nfetch("https://x");\nprocess.env.X;\n');
    const found = auditCapabilities([bad]).map((f) => f.capability);
    expect(found).toEqual(expect.arrayContaining(["non-relative import (package or node: builtin)", "fetch", "process object"]));
  });
});

// ---------------------------------------------------------------- 2/3/4 runtime
const req = createRequire(import.meta.url);
type Patch = { obj: Record<string, unknown>; key: string; orig: unknown };
let patches: Patch[] = [];
let tripped: string[] = [];

function trap(obj: Record<string, unknown> | undefined, keys: string[], label: string) {
  if (!obj) return;
  for (const key of keys) {
    if (typeof obj[key] !== "function") continue;
    patches.push({ obj, key, orig: obj[key] });
    obj[key] = (..._a: unknown[]) => {
      tripped.push(`${label}.${key}`);
      throw new Error(`isolation sentinel: ${label}.${key}`);
    };
  }
}

describe("2-4. runtime sentinels: tools perform no network, process, or filesystem calls", () => {
  beforeEach(() => {
    patches = [];
    tripped = [];
    const net = req("node:net");
    trap(req("node:http"), ["request", "get"], "http");
    trap(req("node:https"), ["request", "get"], "https");
    trap(net, ["connect", "createConnection"], "net");
    trap(net.Socket.prototype, ["connect"], "net.Socket");
    trap(req("node:tls"), ["connect"], "tls");
    trap(req("node:dns"), ["lookup", "resolve"], "dns");
    trap(req("node:dgram"), ["createSocket"], "dgram");
    trap(globalThis as unknown as Record<string, unknown>, ["fetch"], "global");
    trap(req("node:child_process"), ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"], "child_process");
    const fsw = ["writeFile", "writeFileSync", "appendFile", "appendFileSync", "mkdir", "mkdirSync", "rm", "rmSync", "rmdir", "rmdirSync", "unlink", "unlinkSync", "rename", "renameSync", "copyFile", "copyFileSync", "open", "openSync", "createWriteStream", "symlink", "symlinkSync", "truncate", "truncateSync"];
    trap(req("node:fs"), fsw, "fs");
    trap(req("node:fs").promises, ["writeFile", "appendFile", "mkdir", "rm", "rmdir", "unlink", "rename", "copyFile", "open", "symlink", "truncate"], "fs.promises");
  });
  afterEach(() => {
    for (const p of patches.reverse()) p.obj[p.key] = p.orig;
  });

  it("full agent loops (commit, verify, adversarial) trip no sentinel", async () => {
    for (const script of [scriptCommitOnFirstWitness(), scriptVerifyThenAsk(), scriptAdversarial()]) {
      const s = new SandboxSession("iso-runtime");
      const loop = await runAgentLoop(script, s);
      buildLiveReceipt(loop, new Date(0), new Date(1));
    }
    expect(tripped).toEqual([]);
  });
});

// ---------------------------------------------------------------- 6. adversarial arguments
describe("6. malformed / adversarial arguments cannot escape the sandbox state model", () => {
  const polluted = JSON.parse('{"__proto__": {"polluted": true}, "record_count": 5}');
  const throwingProxy = new Proxy({}, {
    get() { throw new Error("boom"); },
    ownKeys() { throw new Error("boom"); },
    getPrototypeOf() { throw new Error("boom"); },
    getOwnPropertyDescriptor() { throw new Error("boom"); },
  });
  const getter = Object.defineProperty({}, "record_count", { enumerable: true, get() { throw new Error("side effect"); } });
  const BAD: Array<[string, unknown]> = [
    ["prepare_export", {}],
    ["prepare_export", { record_count: "10" }],
    ["prepare_export", { record_count: -1 }],
    ["prepare_export", { record_count: 0 }],
    ["prepare_export", { record_count: 1.5 }],
    ["prepare_export", { record_count: Number.NaN }],
    ["prepare_export", { record_count: Infinity }],
    ["prepare_export", { record_count: 1e300 }],
    ["prepare_export", { record_count: 2 ** 53 }],
    ["prepare_export", { record_count: [5] }],
    ["prepare_export", { record_count: { valueOf: () => 5 } }],
    ["prepare_export", { record_count: 5, path: "../../etc/passwd" }],
    ["prepare_export", polluted],
    ["prepare_export", getter],
    ["prepare_export", throwingProxy],
    ["prepare_export", [5]],
    ["prepare_export", "record_count=5"],
    ["prepare_export", Object.assign(Object.create({ record_count: 5 }), {})],
    ["commit_export", {}],
    ["commit_export", { witness_version: "1; rm -rf /" }],
    ["commit_export", { witness_version: -1 }],
    ["commit_export", { witness_version: 1, policy: "GUARDED" }],
    ["commit_export", { witness_version: 1, effect: { realm: "EXTERNAL" } }],
    ["observe_access", { url: "https://example.com" }],
    ["observe_access", { cmd: "curl evil" }],
    ["verify_access", { force: true }],
    ["verify_access", 42],
  ];

  it("every malformed call returns a structured error and leaves world state byte-identical", () => {
    const s = new SandboxSession("iso-fuzz");
    s.call("observe_access", {}); // make prepare structurally possible
    const before = canonicalJson(s.state);
    for (const [name, input] of BAD) {
      const r = s.call(name, input);
      expect(r.ok, `${name} case ${BAD.findIndex((x) => x[1] === input)}`).toBe(false);
      expect(canonicalJson(s.state)).toBe(before);
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    // recorded arguments are inert copies: the getter/proxy were never executed
    const recorded = JSON.stringify(s.toolTrace.map((t) => t.arguments));
    expect(recorded).toContain("[accessor]");
    expect(recorded).toContain("[unreadable]");
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
  });

  it("well-typed but illegal sequences are rejected by the kernel without mutation", () => {
    const s = new SandboxSession("iso-seq");
    const snap = () => canonicalJson(s.state);
    let b = snap();
    expect(s.call("prepare_export", { record_count: 10 })).toMatchObject({ ok: false, error: { code: "NO_OBSERVATION" } });
    expect(s.call("commit_export", { witness_version: 1 })).toMatchObject({ ok: false, error: { code: "NO_PENDING_ACTION" } });
    expect(snap()).toBe(b);
    s.call("observe_access", {});
    s.call("prepare_export", { record_count: 10 });
    b = snap();
    expect(s.call("commit_export", { witness_version: 999 })).toMatchObject({ ok: false, error: { code: "UNKNOWN_WITNESS" } });
    expect(s.call("prepare_export", { record_count: 10 })).toMatchObject({ ok: false, error: { code: "ACTION_ALREADY_PENDING" } });
    expect(snap()).toBe(b);
  });

  it("every state change is a kernel event: replaying the event log reproduces the state", () => {
    const s = new SandboxSession("iso-replay");
    s.call("observe_access", {});
    s.injectWorldEvent("ADMIN_REVOKES_ACCESS");
    s.call("prepare_export", { record_count: 42 });
    s.call("verify_access", {});
    s.call("commit_export", { witness_version: 2 });
    const k = buildReceipt(s.initial, s.state, "AGENT_DECIDED");
    const r = replayLiveWorld(s.seed, k.events, snapshot(s.state));
    expect(r.ok).toBe(true);
  });

  it("the world side accepts only the canonical mutation", () => {
    const s = new SandboxSession("iso-world");
    expect(() => s.injectWorldEvent("DELETE_EVERYTHING" as never)).toThrow();
    expect(s.state.eventLog).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- 4. bounded writer
describe("4. receipt writing is confined to the bounded live-receipt directory", () => {
  it("boundedPath refuses traversal, absolute, nested, hidden and control-character names", () => {
    const base = mkdtempSync(join(tmpdir(), "twc-bound-"));
    for (const n of ["../x.json", "..", "/etc/passwd", "a/b.json", "a\\b.json", ".hidden", "", "x\0y", "%2e%2e%2fx", "x".repeat(300)]) {
      expect(() => boundedPath(base, n), JSON.stringify(n)).toThrow();
    }
    expect(boundedPath(base, "ok.json")).toBe(join(base, "ok.json"));
  });

  it("test-double runs can never be written into evidence/runs/live", async () => {
    const loop = await runAgentLoop(scriptCommitOnFirstWitness(), new SandboxSession("iso-w"));
    const r = buildLiveReceipt(loop, new Date(0), new Date(1));
    const before = existsSync(LIVE_RECEIPT_DIR) ? readdirSync(LIVE_RECEIPT_DIR).length : 0;
    expect(() => writeLiveReceipt(r)).toThrow(/only real anthropic-api runs/);
    expect(existsSync(LIVE_RECEIPT_DIR) ? readdirSync(LIVE_RECEIPT_DIR).length : 0).toBe(before);
  });

  it("writes once into a bounded dir, never overwrites, refuses a symlinked dir", async () => {
    const base = mkdtempSync(join(tmpdir(), "twc-w-"));
    const loop = await runAgentLoop(scriptCommitOnFirstWitness(), new SandboxSession("iso-w2"));
    const r = buildLiveReceipt(loop, new Date(0), new Date(1));
    const p = writeLiveReceipt(r, base);
    expect(p.startsWith(base)).toBe(true);
    expect(readdirSync(base)).toHaveLength(1);
    expect(() => writeLiveReceipt(r, base)).toThrow(); // wx: no overwrite
    const link = join(mkdtempSync(join(tmpdir(), "twc-l-")), "link");
    symlinkSync(base, link);
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(() => writeLiveReceipt({ ...r, started_at: "1970-01-01T00:00:00.002Z" }, link)).toThrow(/symlink/);
  });

  it("a receipt containing reasoning-shaped content is refused", async () => {
    const base = mkdtempSync(join(tmpdir(), "twc-cot-"));
    const loop = await runAgentLoop(scriptCommitOnFirstWitness(), new SandboxSession("iso-cot"));
    const r = buildLiveReceipt(loop, new Date(0), new Date(1));
    const leaked = { ...r, assistant_turns: [{ ...r.assistant_turns[0]!, thinking: "secret" }] } as never;
    expect(() => writeLiveReceipt(leaked, base)).toThrow(/reasoning/);
    expect(readdirSync(base)).toHaveLength(0);
  });
});


// ---------------------------------------------------------------- transport boundary
describe("the network-capable transport is outside the tool boundary", () => {
  it("live/anthropic-transport.ts is not reachable from tool or model-path code", () => {
    expect(importGraph(MODEL_PATH_ENTRIES)).not.toContain("live/anthropic-transport.ts");
    expect(importGraph(["live/tools.ts"])).not.toContain("live/anthropic-transport.ts");
  });
  it("the transport pins the public API base URL and reads the key only from its argument", async () => {
    const src = (await import("node:fs")).readFileSync(new URL("../anthropic-transport.ts", import.meta.url), "utf8");
    expect(src).toContain('baseURL: ANTHROPIC_PUBLIC_API');
    expect(src).toContain('"https://api.anthropic.com"');
    expect(src).not.toMatch(/process\.env/);
    // no tool_choice, system, thinking or mcp params are forwarded
    expect(src).not.toMatch(/tool_choice|system:|thinking|mcp_servers|betas/);
  });
});
