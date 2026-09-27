/**
 * Sandbox engine for SIMULATED product scenarios (calendar, document).
 *
 * It mirrors the canonical kernel's observable semantics — observe, prepare, one world mutation,
 * optional commit-time verify, commit — without touching the canonical kernel. Pure and
 * deterministic: same seed + same input => identical event log and receipt.
 *
 * These scenarios are product simulations. They make no claim about real model behavior.
 */
import { buildLabReceipt } from "./receipt";
import {
  OBSERVE_TICK,
  PREPARE_TICK,
  actTick,
  mutationTiming,
  type ExperimentInput,
  type LabReceipt,
  type ObservableStep,
  type ScenarioCopy,
  type ScenarioId,
} from "./types";

export type SandboxEvent =
  | { type: "OBSERVE"; tick: number }
  | { type: "PREPARE"; tick: number }
  | { type: "MUTATE"; tick: number }
  | { type: "VERIFY"; tick: number }
  | { type: "COMMIT"; tick: number };

type Obs = { seq: number; value: string; version: number };
type SandboxState = {
  version: number;
  value: string;
  observations: Obs[];
  pending: null | { witnessVersion: number; witnessValue: string; status: "PENDING" | "INELIGIBLE" | "RESOLVED" };
  steps: ObservableStep[];
  lastTick: number;
};

export class SandboxError extends Error {}

export function sandboxReduce(copy: ScenarioCopy, events: readonly SandboxEvent[]): SandboxState {
  let s: SandboxState = { version: 1, value: copy.validValue, observations: [], pending: null, steps: [], lastTick: -1 };
  for (const e of events) s = step(copy, s, e);
  return s;
}

function step(copy: ScenarioCopy, prev: SandboxState, e: SandboxEvent): SandboxState {
  if (e.tick < prev.lastTick) throw new SandboxError("tick regression");
  const s: SandboxState = { ...prev, observations: prev.observations.slice(), steps: prev.steps.slice(), pending: prev.pending && { ...prev.pending }, lastTick: e.tick };
  const seq = s.steps.length + 1;
  const before = s.version;
  let actResult: string | null = null;
  let kind: ObservableStep["kind"];
  switch (e.type) {
    case "OBSERVE":
    case "VERIFY": {
      kind = e.type;
      s.observations.push({ seq, value: s.value, version: s.version });
      if (e.type === "VERIFY" && s.pending?.status === "PENDING") {
        s.pending.witnessVersion = s.version;
        s.pending.witnessValue = s.value;
        if (s.value !== copy.validValue) s.pending.status = "INELIGIBLE";
      }
      break;
    }
    case "PREPARE": {
      kind = "PREPARE";
      const o = s.observations.at(-1);
      if (!o) throw new SandboxError("prepare requires an observation");
      if (o.value !== copy.validValue) throw new SandboxError("prepare requires a valid observation");
      s.pending = { witnessVersion: o.version, witnessValue: o.value, status: "PENDING" };
      break;
    }
    case "MUTATE": {
      kind = "MUTATE";
      if (s.value === copy.changedValue) throw new SandboxError("world already changed");
      s.value = copy.changedValue;
      s.version += 1;
      break;
    }
    case "COMMIT": {
      kind = "ACT";
      const p = s.pending;
      if (!p || p.status === "RESOLVED") throw new SandboxError("nothing to commit");
      if (p.status === "INELIGIBLE") {
        actResult = "BLOCKED";
      } else {
        // An unverified commit relies on its witness. It proceeds; whether that was valid is
        // judged against current reality (sandbox evidence only).
        actResult = s.value === copy.validValue ? "COMMITTED" : "STALE_COMMIT";
        s.version += 1; // the (simulated) effect is itself a change to the world
      }
      p.status = "RESOLVED";
      break;
    }
  }
  const b = s.observations.at(-1) ?? null;
  s.steps.push({
    seq,
    tick: e.tick,
    kind,
    actor: e.type === "MUTATE" ? "WORLD" : "AGENT",
    tool: null,
    world_version_before: before,
    world_version_after: s.version,
    world_value: s.value,
    belief_value: b?.value ?? null,
    belief_version: b?.version ?? null,
    divergent: !!b && b.value !== s.value,
    act_result: actResult,
  });
  return s;
}

/** The agent's deterministic script + the visitor's mutation, as an ordered event list. */
export function sandboxEvents(input: ExperimentInput): SandboxEvent[] {
  const act = actTick(input.gapTicks);
  const timing = mutationTiming(input.mutationTick, act);
  const ev: SandboxEvent[] = [
    { type: "OBSERVE", tick: OBSERVE_TICK },
    { type: "PREPARE", tick: PREPARE_TICK },
  ];
  if (timing === "IN_TIME") ev.push({ type: "MUTATE", tick: input.mutationTick! });
  if (input.policy === "GUARDED") ev.push({ type: "VERIFY", tick: act });
  ev.push({ type: "COMMIT", tick: act });
  if (timing === "TOO_LATE") ev.push({ type: "MUTATE", tick: input.mutationTick! });
  return ev;
}

export function runSandbox(id: ScenarioId, copy: ScenarioCopy, input: ExperimentInput): LabReceipt {
  if (!Number.isInteger(input.gapTicks) || input.gapTicks < 2 || input.gapTicks > 24) throw new SandboxError("gap out of range");
  const s = sandboxReduce(copy, sandboxEvents(input));
  return buildLabReceipt({
    scenario: id,
    provenance: "SANDBOX_SIMULATION",
    mode: input.mode,
    seed: input.seed,
    policy: input.policy,
    copy,
    initial: { version: 1, value: copy.validValue },
    steps: s.steps,
    actTick: actTick(input.gapTicks),
    mutationTick: input.mutationTick,
  });
}
