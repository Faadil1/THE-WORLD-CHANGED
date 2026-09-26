/**
 * Public kernel surface. Rendering code imports from here only.
 */
export * from "./types";
export * from "./rng";
export * from "./reducer";
export * from "./agent";
export * from "./receipt";

import { buildScenarioEvents, type ScenarioOptions } from "./agent";
import { buildReceipt, type DeterministicReceipt } from "./receipt";
import { createWorld, reduce } from "./reducer";
import type { WorldEventInput, WorldState } from "./types";

export type ScenarioRun = {
  initial: WorldState;
  final: WorldState;
  inputs: WorldEventInput[];
  receipt: DeterministicReceipt;
};

/** Run one canonical AUTHORITY EXPIRED scenario end to end. */
export function runScenario(opts: ScenarioOptions): ScenarioRun {
  const initial = createWorld(opts.seed);
  const inputs = buildScenarioEvents(opts);
  const final = reduce(initial, inputs);
  return { initial, final, inputs, receipt: buildReceipt(initial, final, opts.policy) };
}
