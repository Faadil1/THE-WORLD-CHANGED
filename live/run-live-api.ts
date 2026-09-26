/**
 * OPTIONAL DIRECT-API LIVE RUNNER — one genuine Claude Opus 5.5 run over the Messages API.
 * The default no-key route is live/run-live.ts (Claude Code SDK); this one is secondary.
 *
 *   ANTHROPIC_API_KEY=... npm run live:api -- [seed]
 *
 * Gates (any failure => no model call):
 *   1. `npm run live:api` runs the isolation test suite first (&&).
 *   2. This process re-runs the static isolation audit of every model-path module.
 *   3. ANTHROPIC_API_KEY must be set explicitly.
 * The model gets the neutral task and the four sandbox tools; nothing else.
 */
import { LIVE_MODEL_ID, runAgentLoop } from "./agent-loop";
import { anthropicTransport } from "./anthropic-transport";
import { preflightIsolation } from "./isolation-audit";
import { buildLiveReceipt } from "./receipt";
import { SandboxSession } from "./tools";
import { writeLiveReceipt } from "./writer";

const LABEL = "[LIVE MODEL · CLAUDE OPUS 5.5 · SANDBOX TOOLS ONLY · ANTHROPIC API]";
const log = (msg: string) => console.log(`${LABEL} ${msg}`);

async function main(): Promise<number> {
  log("preflight: static isolation audit of model-reachable code");
  const pre = preflightIsolation();
  if (!pre.ok) {
    log(`ISOLATION FAILED — model will not be called:\n${JSON.stringify(pre.findings, null, 2)}`);
    return 3;
  }
  log(`isolation ok (${pre.graph.length} modules audited)`);

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    log("LIVE MODEL disabled: ANTHROPIC_API_KEY is not set. No model call was made.");
    return 2;
  }

  const seed = process.argv.slice(2).find((a) => a !== "--") ?? "twc-live-api-0001";
  const session = new SandboxSession(seed);
  log(`run: model=${LIVE_MODEL_ID} scenario=authority-expired seed=${seed}`);
  const started = new Date();
  const loop = await runAgentLoop(anthropicTransport(key), session, LIVE_MODEL_ID);
  const ended = new Date();
  const receipt = buildLiveReceipt(loop, started, ended);
  const path = writeLiveReceipt(receipt);

  log(`tool sequence: ${receipt.behavior.tool_sequence.join(" → ") || "(none)"}`);
  log(`model reported by API: ${receipt.model_reported_by_api.join(", ") || "(none)"}`);
  log(`re-verified after mutation: ${receipt.behavior.reverified_after_mutation}`);
  log(`outcome: ${receipt.outcome} — ${receipt.outcome_basis}`);
  log(`kernel replay ok: ${receipt.kernel_replay.ok}`);
  log(`receipt: ${path}`);
  return receipt.outcome === "RUN_ERROR" ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`${LABEL} runner error: ${String((e as Error)?.message ?? e).replace(/sk-ant-[A-Za-z0-9_\-]+/g, "sk-ant-[REDACTED]")}`);
    process.exit(1);
  },
);
