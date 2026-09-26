/**
 * Canonical deterministic run receipts (library). CLI: proof/generate-receipts.ts (npm run receipts).
 * The receipt test (simulation/test/receipts.test.ts) fails if committed receipts drift.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { replayReceipt, runScenario, type ScenarioOptions } from "../simulation/src";

export const CANONICAL_SEED = "twc-hero-0001";

export const CANONICAL_RUNS: Array<{ file: string; opts: ScenarioOptions }> = [
  { file: "authority-expired.A-unguarded.json", opts: { seed: CANONICAL_SEED, policy: "UNGUARDED", revoke: true } },
  { file: "authority-expired.B-guarded.json", opts: { seed: CANONICAL_SEED, policy: "GUARDED", revoke: true } },
  { file: "control.no-revoke-unguarded.json", opts: { seed: CANONICAL_SEED, policy: "UNGUARDED", revoke: false } },
  { file: "control.no-revoke-guarded.json", opts: { seed: CANONICAL_SEED, policy: "GUARDED", revoke: false } },
];

export const RECEIPT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "evidence", "runs", "deterministic");

export function renderReceipt(opts: ScenarioOptions): string {
  const { receipt } = runScenario(opts);
  const replay = replayReceipt(receipt);
  if (!replay.ok) throw new Error(`receipt failed self-replay: ${replay.reason}`);
  return JSON.stringify(receipt, null, 2) + "\n";
}
