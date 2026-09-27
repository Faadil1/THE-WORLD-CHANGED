/** In-memory session state for the Lab (no persistence, no network). */
import type { LabReceipt, ScenarioId } from "../scenarios/types";

export type Setup = { gap: number; mutationTick: number | null; policy: "UNGUARDED" | "GUARDED" };

export const LAB_SEED = "twc-hero-0001";

export const store = {
  lastRun: null as LabReceipt | null,
  setups: {} as Partial<Record<ScenarioId, Setup>>,
};

export function setupFor(id: ScenarioId): Setup {
  return store.setups[id] ?? { gap: 8, mutationTick: null, policy: "UNGUARDED" };
}
