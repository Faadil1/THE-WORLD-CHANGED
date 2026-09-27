/**
 * CHANGE-THE-WORLD CHALLENGE timing. Pure.
 *
 * After the agent observes (t0) and prepares (t1), it travels toward ACT across a fixed gap.
 * Wall-clock time is converted to logical ticks here and ONLY here; the kernel/engine sees ticks.
 * A change counts if it lands strictly before ACT. At or after ACT it is too late: the agent
 * already acted on what was then true.
 */
import { PREPARE_TICK, actTick, mutationTiming, type CommitPolicy, type LabReceipt, type ScenarioDefinition } from "./types";

export const CHALLENGE_GAP = 10;
export const CHALLENGE_TICK_MS = 560;
export const CHALLENGE_ACT_TICK = actTick(CHALLENGE_GAP);
/** Time from the start of travel until a change would land AT the act tick (i.e. too late). */
export const CHALLENGE_WINDOW_MS = (CHALLENGE_ACT_TICK - (PREPARE_TICK + 1)) * CHALLENGE_TICK_MS;

/** Logical tick at which a change made `elapsedMs` after the agent started travelling lands. */
export function tickAtElapsed(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error("elapsed must be >= 0");
  // The earliest possible change lands at PREPARE_TICK + 1 (after the agent prepared).
  return PREPARE_TICK + 1 + Math.floor(elapsedMs / CHALLENGE_TICK_MS);
}

export type ChallengeResult = {
  timing: "NONE" | "IN_TIME" | "TOO_LATE";
  mutationTick: number | null;
  receipt: LabReceipt;
};

export function runChallenge(def: ScenarioDefinition, seed: string, policy: CommitPolicy, changedAtMs: number | null): ChallengeResult {
  const mutationTick = changedAtMs === null ? null : tickAtElapsed(changedAtMs);
  const timing = mutationTiming(mutationTick, CHALLENGE_ACT_TICK);
  const receipt = def.run({ seed, gapTicks: CHALLENGE_GAP, mutationTick, policy, mode: "CHALLENGE" });
  return { timing, mutationTick, receipt };
}
