/**
 * Writes the canonical deterministic run receipts into evidence/runs/deterministic/.
 * Run: npm run receipts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CANONICAL_RUNS, RECEIPT_DIR, renderReceipt } from "./receipts";

mkdirSync(RECEIPT_DIR, { recursive: true });
for (const { file, opts } of CANONICAL_RUNS) {
  const json = renderReceipt(opts);
  writeFileSync(join(RECEIPT_DIR, file), json);
  const r = JSON.parse(json);
  console.log(`${file}  outcome=${r.outcome}  hash=${r.replay_hash}`);
}
