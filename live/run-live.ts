/**
 * DEFAULT LIVE RUNNER — one genuine Claude Opus 5.5 run against the sandbox through
 * Claude Code / Claude Agent SDK, using the operator's existing Claude Code login.
 * No separate API key is required.
 *
 *   npm run live -- [seed]
 *
 * Gates (any failure => the model is never called):
 *   1. `npm run live` runs the isolation suite and the Claude Code transport suite first (&&).
 *   2. This process re-runs the static isolation audit of every model-path module.
 *   3. ANTHROPIC_API_KEY must be ABSENT (it would override the Claude Code login path).
 *   4. Pre-prompt gate over the SDK control channel: exactly one connected in-process `twc`
 *      server exposing exactly the four tools, and no agents. The task is not released otherwise.
 *   5. Init gate: the SDK init tool list must equal exactly the four mcp__twc__ tools, or the run
 *      is aborted immediately and marked invalid.
 * Credentials are never read here: Claude Code owns authentication.
 */
import { LIVE_MODEL_ID } from "./agent-loop";
import { PreflightError, runClaudeCodeLoop } from "./claude-code-loop";
import { claudeCodeDriver, describeQueryConfig } from "./claude-code-transport";
import { preflightIsolation } from "./isolation-audit";
import { buildLiveReceipt } from "./receipt";
import { SandboxSession } from "./tools";
import { writeLiveReceipt } from "./writer";

const LABEL = "[LIVE MODEL · CLAUDE OPUS 5.5 · SANDBOX TOOLS ONLY · CLAUDE CODE SDK]";
const log = (msg: string) => console.log(`${LABEL} ${msg}`);
const scrub = (s: string) => s.replace(/sk-ant-[A-Za-z0-9_\-]+/g, "sk-ant-[REDACTED]");

async function main(): Promise<number> {
  log("preflight: static isolation audit of model-reachable code");
  const pre = preflightIsolation();
  if (!pre.ok) {
    log(`ISOLATION FAILED — model will not be called:\n${JSON.stringify(pre.findings, null, 2)}`);
    return 3;
  }
  log(`isolation ok (${pre.graph.length} modules audited)`);

  if ("ANTHROPIC_API_KEY" in process.env) {
    log("ABORT: ANTHROPIC_API_KEY is set. It would override the Claude Code login. Run `unset ANTHROPIC_API_KEY` and retry. No model call was made.");
    return 2;
  }

  const seed = process.argv.slice(2).find((a) => a !== "--") ?? "twc-live-0001";
  const session = new SandboxSession(seed);
  log(`run: model=${LIVE_MODEL_ID} transport=claude-code-sdk scenario=authority-expired seed=${seed}`);
  const started = new Date();
  let loop;
  try {
    loop = await runClaudeCodeLoop(claudeCodeDriver(process.env), session, LIVE_MODEL_ID);
  } catch (e) {
    if (e instanceof PreflightError) {
      log(`PRE-PROMPT GATE FAILED — the task was never sent, no model call was made:\n  ${e.failures.join("\n  ")}`);
      return 4;
    }
    throw e;
  }
  const ended = new Date();
  const receipt = buildLiveReceipt(loop, started, ended, describeQueryConfig());
  const path = writeLiveReceipt(receipt);
  const c = receipt.claude_code_sdk;

  log(`SDK init: session=${c?.init?.session_id ?? "(none)"} model=${c?.init?.model ?? "(none)"} claude_code=${c?.init?.claude_code_version ?? "?"}`);
  log(`SDK init tools: ${JSON.stringify(c?.init?.tools ?? null)} exact=${c?.init_tool_set_exact ?? false}`);
  log(`model reported on responses: ${receipt.model_reported_by_api.join(", ") || "(none)"}`);
  log(`tool sequence: ${receipt.behavior.tool_sequence.join(" → ") || "(none)"}`);
  log(`re-verified after mutation: ${receipt.behavior.reverified_after_mutation}`);
  log(`permission denials: ${c?.permission_denials.length ?? 0}; non-TWC tool attempts: ${c?.non_twc_tool_attempts.length ?? 0}`);
  log(`outcome: ${receipt.outcome} — ${receipt.outcome_basis}`);
  log(`kernel replay ok: ${receipt.kernel_replay.ok}`);
  log(`LIVE PROOF valid: ${receipt.live_proof.valid}${receipt.live_proof.failures.length ? ` — ${receipt.live_proof.failures.join("; ")}` : ""}`);
  log(`receipt: ${path}`);
  return receipt.outcome === "RUN_ERROR" || !receipt.live_proof.valid ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`${LABEL} runner error: ${scrub(String((e as Error)?.message ?? e))}`);
    process.exit(1);
  },
);
