/**
 * Deterministic scripted agent + canonical AUTHORITY EXPIRED scenario builder.
 *
 * This is NOT a model. It is a fixed policy used for the deterministic experience mode
 * and for tests. Live Claude runs are out of scope for kernel-v0 and must never be
 * presented using this script.
 *
 * Tool contract mapping (TECHNICAL-REALITY-GATE.md "Candidate tool contract"):
 *   observe_access()               -> OBSERVE_ACCESS
 *   prepare_export(record_count)   -> PREPARE_EXPORT
 *   verify_access()                -> VERIFY_ACCESS
 *   commit_export(witness_version) -> COMMIT_EXPORT
 */
import { createRng, rngInt } from "./rng";
import { applyEvent, createWorld } from "./reducer";
import { KernelError, type CommitPolicy, type WorldEventInput, type WorldState } from "./types";

export const OBSERVE_TICK = 0;
export const PREPARE_TICK = 1;
export const DEFAULT_GAP_TICKS = 8;
export const MAX_GAP_TICKS = 24;

/** Seed-derived scenario parameters. Only the seed decides these. */
export function seededParams(seed: string): { recordCount: number } {
  const rng = createRng(seed);
  return { recordCount: rngInt(rng, 1_200, 9_800) };
}

/** Agent opening moves: observe correctly, then prepare the export on that witness. */
export function agentOpening(seed: string): WorldEventInput[] {
  return [
    { type: "OBSERVE_ACCESS", tick: OBSERVE_TICK },
    { type: "PREPARE_EXPORT", tick: PREPARE_TICK, recordCount: seededParams(seed).recordCount },
  ];
}

/**
 * Agent closing moves at commit time.
 * UNGUARDED: commit_export(witness of the original observation).
 * GUARDED:   verify_access(), then commit_export(witness of the refreshed observation).
 * Returns the emitted inputs and the resulting state (applied through the reducer).
 */
export function agentCommit(
  state: WorldState,
  policy: CommitPolicy,
  tick: number,
): { state: WorldState; emitted: WorldEventInput[] } {
  const emitted: WorldEventInput[] = [];
  let s = state;
  if (!s.pendingAction) throw new KernelError("NO_PENDING_ACTION", "agent has nothing to commit");
  if (policy === "GUARDED") {
    const verify: WorldEventInput = { type: "VERIFY_ACCESS", tick };
    s = applyEvent(s, verify);
    emitted.push(verify);
  }
  const pending = s.pendingAction;
  if (!pending) throw new KernelError("NO_PENDING_ACTION", "agent has nothing to commit");
  const commit: WorldEventInput = {
    type: "COMMIT_EXPORT",
    tick,
    witnessWorldVersion: pending.witnessWorldVersion,
    policy,
  };
  s = applyEvent(s, commit);
  emitted.push(commit);
  return { state: s, emitted };
}

export type ScenarioOptions = {
  seed: string;
  policy: CommitPolicy;
  /** Inject ADMIN_REVOKES_ACCESS inside the gap. false = control run. */
  revoke: boolean;
  /** Logical width of THE GAP (ticks between prepare and commit). */
  gapTicks?: number;
  /** Tick at which the world event lands inside the gap. */
  revokeAtTick?: number;
};

export function commitTickFor(gapTicks: number): number {
  return PREPARE_TICK + gapTicks;
}

/** Full ordered input list for one run. Deterministic in its options. */
export function buildScenarioEvents(opts: ScenarioOptions): WorldEventInput[] {
  const gap = opts.gapTicks ?? DEFAULT_GAP_TICKS;
  if (!Number.isInteger(gap) || gap < 2 || gap > MAX_GAP_TICKS) {
    throw new KernelError("INVALID_PAYLOAD", `gapTicks must be an integer in [2, ${MAX_GAP_TICKS}]`);
  }
  const commitTick = commitTickFor(gap);
  let s = createWorld(opts.seed);
  const inputs: WorldEventInput[] = [];
  for (const e of agentOpening(opts.seed)) {
    s = applyEvent(s, e);
    inputs.push(e);
  }
  if (opts.revoke) {
    const t = opts.revokeAtTick ?? PREPARE_TICK + Math.ceil(gap / 2);
    if (t <= PREPARE_TICK || t >= commitTick) {
      throw new KernelError("INVALID_PAYLOAD", `revokeAtTick must lie strictly inside the gap (${PREPARE_TICK}, ${commitTick})`);
    }
    const revoke: WorldEventInput = { type: "ADMIN_REVOKES_ACCESS", tick: t };
    s = applyEvent(s, revoke);
    inputs.push(revoke);
  }
  const closing = agentCommit(s, opts.policy, commitTick);
  inputs.push(...closing.emitted);
  return inputs;
}
