import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CANONICAL_RUNS, RECEIPT_DIR, renderReceipt } from "../../proof/receipts";
import { replayReceipt, type DeterministicReceipt } from "../src";

/** proof/RUN-RECEIPT-SCHEMA.md — required deterministic fields. */
const REQUIRED: Array<[keyof DeterministicReceipt, string]> = [
  ["mode", "string"],
  ["scenario", "string"],
  ["seed", "string"],
  ["initial_world_version", "number"],
  ["events", "array"],
  ["observations", "array"],
  ["action_attempts", "array"],
  ["final_world_version", "number"],
  ["final_state", "object"],
  ["outcome", "string"],
];

const load = (file: string) => readFileSync(join(RECEIPT_DIR, file), "utf8");

describe("committed deterministic receipts", () => {
  for (const { file, opts } of CANONICAL_RUNS) {
    describe(file, () => {
      it("matches the schema's required fields", () => {
        const receipt = JSON.parse(load(file)) as DeterministicReceipt;
        for (const [k, t] of REQUIRED) {
          const v = receipt[k];
          const actual = Array.isArray(v) ? "array" : typeof v;
          expect(actual, String(k)).toBe(t);
        }
        expect(receipt.mode).toBe("deterministic");
        expect(receipt.scenario).toBe("authority-expired");
      });

      it("is stable: regenerating yields byte-identical content", () => {
        expect(renderReceipt(opts)).toBe(load(file));
      });

      it("replays exactly from seed + ordered events", () => {
        expect(replayReceipt(JSON.parse(load(file)))).toMatchObject({ ok: true });
      });
    });
  }

  it("A exposes stale authority; B does not and has no effect", () => {
    const a = JSON.parse(load(CANONICAL_RUNS[0]!.file)) as DeterministicReceipt;
    const b = JSON.parse(load(CANONICAL_RUNS[1]!.file)) as DeterministicReceipt;
    expect(a.outcome).toBe("STALE_AUTHORITY");
    expect(a.stale_authority?.versions_behind).toBe(1);
    expect(b.outcome).toBe("BLOCKED");
    expect(b.stale_authority).toBeNull();
    expect(b.final_state.committed_effects).toEqual([]);
  });
});
