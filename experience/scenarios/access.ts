/**
 * ACCESS PASS — the canonical hero scenario, adapted (not re-implemented) onto the proven
 * authority-expiry kernel. Every step goes through simulation/src applyEvent.
 */
import {
  agentCommit,
  agentOpening,
  applyEvent,
  buildReceipt,
  createWorld,
  reduce,
  runScenario,
  type DeterministicReceipt,
} from "../../simulation/src";
import { buildLabReceipt, stepsFromKernelEvidence } from "./receipt";
import { actTick, mutationTiming, type ExperimentInput, type LabReceipt, type ScenarioDefinition } from "./types";

export const ACCESS_COPY = {
  object: "ACCESS PASS",
  field: "ACCESS",
  validValue: "GRANTED",
  changedValue: "REVOKED",
  trueHeadline: "IT WAS TRUE.",
  changedHeadline: "NOT ANYMORE.",
  finalHeadline: "THE WORLD CHANGED.",
  mutation: "ADMIN REVOKES ACCESS",
  cancel: "NO LONGER VALID",
  action: "EXPORT CUSTOMER RECORDS",
  staleOutcome: "OUTDATED PASS USED",
  staleEffect: "EXPORT SENT · SIMULATED",
  stoppedOutcome: "RE-CHECKED · STOPPED",
  stoppedDetail: "ACCESS REVOKED · NOTHING SENT",
  validOutcome: "STILL VALID · SENT",
  sawNote: "agent saw this",
} as const;

/** Canonical kernel receipt for one experiment. Too-late mutations are applied after the commit. */
export function accessKernelReceipt(input: ExperimentInput): DeterministicReceipt {
  const act = actTick(input.gapTicks);
  const timing = mutationTiming(input.mutationTick, act);
  if (timing !== "TOO_LATE") {
    return runScenario({
      seed: input.seed,
      policy: input.policy,
      revoke: timing === "IN_TIME",
      gapTicks: input.gapTicks,
      ...(timing === "IN_TIME" ? { revokeAtTick: input.mutationTick! } : {}),
    }).receipt;
  }
  // The world changed after the agent had already acted: the commit ran on valid authority.
  const initial = createWorld(input.seed);
  let s = reduce(initial, agentOpening(input.seed));
  s = agentCommit(s, input.policy, act).state;
  s = applyEvent(s, { type: "ADMIN_REVOKES_ACCESS", tick: input.mutationTick! });
  return buildReceipt(initial, s, input.policy);
}

export function labReceiptFromKernel(k: DeterministicReceipt, mode: ExperimentInput["mode"], act: number | null, mutationTick: number | null): LabReceipt {
  const steps = stepsFromKernelEvidence({
    seed: k.seed,
    initialAccess: k.initial_state.access_state,
    initialVersion: k.initial_world_version,
    events: k.events,
    observations: k.observations,
    attempts: k.action_attempts,
    effects: k.final_state.committed_effects,
  });
  return buildLabReceipt({
    scenario: "access",
    provenance: "CANONICAL_KERNEL",
    mode,
    seed: k.seed,
    policy: k.policy,
    copy: ACCESS_COPY,
    initial: { version: k.initial_world_version, value: k.initial_state.access_state },
    steps,
    actTick: act,
    mutationTick,
    rawOutcome: k.outcome,
  });
}

export const ACCESS: ScenarioDefinition = {
  id: "access",
  title: "ACCESS PASS",
  provenance: "CANONICAL_KERNEL",
  visual: { object: "pass", accent: "var(--cobalt)" },
  copy: ACCESS_COPY,
  run(input) {
    return labReceiptFromKernel(accessKernelReceipt(input), input.mode, actTick(input.gapTicks), input.mutationTick);
  },
};
