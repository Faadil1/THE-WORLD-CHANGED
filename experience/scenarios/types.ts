/**
 * Scenario system (product/SCENARIO-SYSTEM.md). Pure and DOM-free.
 *
 * A ScenarioDefinition describes one world the visitor can change after the agent observed it.
 * Every run produces a LabReceipt: an observable-only record (world, observations, prepared
 * action, mutation, verification, action attempt, effect, outcome). Replay is rebuilt from the
 * receipt alone. No private reasoning exists anywhere in these types.
 */

export type ScenarioId = "access" | "calendar" | "document";
export type CommitPolicy = "UNGUARDED" | "GUARDED";
export type LabMode = "HERO" | "LAB" | "CHALLENGE" | "RECORDED_LIVE";

/**
 * Where a run's evidence comes from. Never conflated:
 *  - CANONICAL_KERNEL: the proven authority-expiry kernel (deterministic sandbox);
 *  - SANDBOX_SIMULATION: a product scenario simulated by the sandbox engine (not a model claim);
 *  - RECORDED_GENUINE_RUN: a stored receipt of a real model execution. Replayed, never re-run.
 */
export type Provenance = "CANONICAL_KERNEL" | "SANDBOX_SIMULATION" | "RECORDED_GENUINE_RUN";

export type StepKind = "OBSERVE" | "PREPARE" | "MUTATE" | "VERIFY" | "ACT";

export type ObservableStep = {
  seq: number;
  tick: number;
  kind: StepKind;
  actor: "AGENT" | "WORLD";
  /** Tool name for recorded genuine runs (observe_access, …); null otherwise. */
  tool: string | null;
  world_version_before: number;
  world_version_after: number;
  /** Current reality after this step (e.g. GRANTED / REVOKED). */
  world_value: string;
  /** What the agent last actually observed, after this step (null before any observation). */
  belief_value: string | null;
  belief_version: number | null;
  /** BELIEF != REALITY after this step. Only a world mutation can make this true. */
  divergent: boolean;
  /** ACT only: the sandbox result of the attempted action. */
  act_result: string | null;
};

export type OutcomeKind = "ACTED_ON_STALE" | "STOPPED" | "ACTED_VALID" | "NO_ACTION";

export type LabReceipt = {
  receipt_kind: "twc-lab-run-v0";
  scenario: ScenarioId;
  provenance: Provenance;
  mode: LabMode;
  seed: string;
  realm: "SANDBOX";
  simulated: true;
  policy: CommitPolicy | "AGENT_DECIDED";
  initial_world: { version: number; value: string };
  prepared_action: { label: string; witness_version: number } | null;
  mutation: { label: string; tick: number; version_after: number } | null;
  timing: { act_tick: number | null; mutation_tick: number | null; mutation_in_time: boolean | null };
  steps: ObservableStep[];
  outcome: {
    kind: OutcomeKind;
    /** Presentation label derived from observable behavior. */
    label: string;
    /** Raw result from the kernel / engine / recorded receipt. Shown in PROOF only. */
    raw_result: string;
    effect: null | { label: string; realm: "SANDBOX"; simulated: true; authorized: boolean };
  };
  private_reasoning: "NOT_RECORDED";
};

/** One experiment the visitor sets up. Ticks: observe t0, prepare t1, act at t(1 + gap). */
export type ExperimentInput = {
  seed: string;
  gapTicks: number;
  /** null = the world never changes. Must be > PREPARE_TICK. >= act tick means "too late". */
  mutationTick: number | null;
  policy: CommitPolicy;
  mode: LabMode;
};

export type ScenarioCopy = {
  /** Object name, e.g. ACCESS PASS. */
  object: string;
  field: string;
  validValue: string;
  changedValue: string;
  trueHeadline: string;
  changedHeadline: string;
  finalHeadline: string;
  /** The world's move (the sticker the visitor drops). */
  mutation: string;
  /** Sticker that slams onto current reality. */
  cancel: string;
  /** The action the agent prepares. */
  action: string;
  staleOutcome: string;
  staleEffect: string;
  stoppedOutcome: string;
  stoppedDetail: string;
  validOutcome: string;
  /** Annotation pointing at the agent's copy. */
  sawNote: string;
};

export type ScenarioDefinition = {
  id: ScenarioId;
  title: string;
  provenance: Exclude<Provenance, "RECORDED_GENUINE_RUN">;
  /** Visual grammar: which world object renders it, and its secondary personality colour. */
  visual: { object: "pass" | "calendar" | "document"; accent: string };
  copy: ScenarioCopy;
  /** Deterministic: same input -> identical receipt. */
  run(input: ExperimentInput): LabReceipt;
};

export const OBSERVE_TICK = 0;
export const PREPARE_TICK = 1;
export const MIN_GAP = 2;
export const MAX_GAP = 24;

export function actTick(gapTicks: number): number {
  return PREPARE_TICK + gapTicks;
}

/** Challenge / lab timing boundary: a mutation counts only strictly after prepare and strictly before act. */
export function mutationTiming(mutationTick: number | null, act: number): "NONE" | "IN_TIME" | "TOO_LATE" {
  if (mutationTick === null) return "NONE";
  if (!Number.isInteger(mutationTick) || mutationTick <= PREPARE_TICK) throw new Error("mutation must come after the agent prepared");
  return mutationTick < act ? "IN_TIME" : "TOO_LATE";
}
