/**
 * Deterministic run receipt (proof/RUN-RECEIPT-SCHEMA.md "Deterministic receipt")
 * and exact replay from seed + ordered events.
 *
 * Required schema fields are all present with the schema's names. Additional fields
 * (kernel_version, policy, initial_state, stale_authority, committed_effects, replay_hash)
 * extend — never replace — the schema.
 */
import { canonicalJson, stableHash } from "./rng";
import { KERNEL_VERSION, createWorld, reduce } from "./reducer";
import type { CommitPolicy, Outcome, WorldEvent, WorldEventInput, WorldState } from "./types";

export type ReceiptEvent = {
  seq: number;
  tick: number;
  type: WorldEventInput["type"];
  actor: WorldEvent["actor"];
  payload: Record<string, number | string>;
  mutation: boolean;
  world_version_before: number;
  world_version_after: number;
};

export type ReceiptObservation = {
  id: string;
  seq: number;
  tick: number;
  kind: "OBSERVE" | "VERIFY";
  witnessed_world_version: number;
  witnessed_authorization_version: number;
  access_state: WorldState["accessState"];
};

export type ReceiptAttempt = {
  id: string;
  seq: number;
  tick: number;
  action_id: string;
  policy: CommitPolicy;
  witness_world_version: number;
  witness_authorization_version: number;
  current_world_version: number;
  current_authorization_version: number;
  current_access_state: WorldState["accessState"];
  witness_stale: boolean;
  interval_ticks: number;
  result: string;
  reason: string;
  effect_id: string | null;
};

export type ReceiptWorldSnapshot = {
  world_version: number;
  access_state: WorldState["accessState"];
  authorization_version: number;
  pending_action: null | {
    id: string;
    kind: "EXPORT";
    record_count: number;
    status: string;
    ineligible_reason: string | null;
    witness_world_version: number;
    witness_authorization_version: number;
  };
  committed_effects: Array<{ id: string; kind: "EXPORT"; record_count: number; world_version: number }>;
};

export type DeterministicReceipt = {
  mode: "deterministic";
  scenario: "authority-expired";
  kernel_version: string;
  seed: string;
  policy: CommitPolicy;
  initial_world_version: number;
  initial_state: ReceiptWorldSnapshot;
  events: ReceiptEvent[];
  observations: ReceiptObservation[];
  action_attempts: ReceiptAttempt[];
  final_world_version: number;
  final_state: ReceiptWorldSnapshot;
  outcome: Outcome;
  /** Explicit stale-authority evidence (null when no attempt used a stale witness). */
  stale_authority: null | {
    attempt_id: string;
    witness_world_version: number;
    world_version_at_commit: number;
    witness_authorization_version: number;
    authorization_version_at_commit: number;
    versions_behind: number;
    mutations_between: Array<{ seq: number; type: string }>;
  };
  /** Hash of the replay-relevant content; replay must reproduce it exactly. */
  replay_hash: string;
};

export function outcomeOf(s: WorldState): Outcome {
  return s.actionAttempts.at(-1)?.result ?? "PENDING";
}

export function snapshot(s: WorldState): ReceiptWorldSnapshot {
  const p = s.pendingAction;
  return {
    world_version: s.worldVersion,
    access_state: s.accessState,
    authorization_version: s.authorizationVersion,
    pending_action: p
      ? {
          id: p.id,
          kind: p.kind,
          record_count: p.recordCount,
          status: p.status,
          ineligible_reason: p.ineligibleReason,
          witness_world_version: p.witnessWorldVersion,
          witness_authorization_version: p.witnessAuthorizationVersion,
        }
      : null,
    committed_effects: s.committedEffects.map((e) => ({
      id: e.id,
      kind: e.kind,
      record_count: e.recordCount,
      world_version: e.worldVersion,
    })),
  };
}

function payloadOf(e: WorldEventInput): Record<string, number | string> {
  switch (e.type) {
    case "PREPARE_EXPORT":
      return { record_count: e.recordCount };
    case "COMMIT_EXPORT":
      return { witness_world_version: e.witnessWorldVersion, policy: e.policy };
    default:
      return {};
  }
}

/** Receipt event -> reducer input. Only seq-ordered type/tick/payload are used for replay. */
export function inputFromReceiptEvent(e: ReceiptEvent): WorldEventInput {
  switch (e.type) {
    case "PREPARE_EXPORT":
      return { type: e.type, tick: e.tick, recordCount: Number(e.payload.record_count) };
    case "COMMIT_EXPORT":
      return {
        type: e.type,
        tick: e.tick,
        witnessWorldVersion: Number(e.payload.witness_world_version),
        policy: e.payload.policy as CommitPolicy,
      };
    default:
      return { type: e.type, tick: e.tick } as WorldEventInput;
  }
}

export function buildReceipt(initial: WorldState, final: WorldState, policy: CommitPolicy): DeterministicReceipt {
  const events: ReceiptEvent[] = final.eventLog.map((e) => ({
    seq: e.seq,
    tick: e.tick,
    type: e.type,
    actor: e.actor,
    payload: payloadOf(e),
    mutation: e.mutation,
    world_version_before: e.worldVersionBefore,
    world_version_after: e.worldVersionAfter,
  }));

  const staleAttempt = final.actionAttempts.find((a) => a.witnessStale);
  const stale_authority = staleAttempt
    ? {
        attempt_id: staleAttempt.id,
        witness_world_version: staleAttempt.witnessWorldVersion,
        world_version_at_commit: staleAttempt.currentWorldVersion,
        witness_authorization_version: staleAttempt.witnessAuthorizationVersion,
        authorization_version_at_commit: staleAttempt.currentAuthorizationVersion,
        versions_behind: staleAttempt.currentWorldVersion - staleAttempt.witnessWorldVersion,
        mutations_between: final.eventLog
          .filter(
            (e) =>
              e.mutation &&
              e.worldVersionAfter > staleAttempt.witnessWorldVersion &&
              e.seq < staleAttempt.seq,
          )
          .map((e) => ({ seq: e.seq, type: e.type })),
      }
    : null;

  const body: Omit<DeterministicReceipt, "replay_hash"> = {
    mode: "deterministic",
    scenario: "authority-expired",
    kernel_version: KERNEL_VERSION,
    seed: final.seed,
    policy,
    initial_world_version: initial.worldVersion,
    initial_state: snapshot(initial),
    events,
    observations: final.observations.map((o) => ({
      id: o.id,
      seq: o.seq,
      tick: o.tick,
      kind: o.kind,
      witnessed_world_version: o.witnessedWorldVersion,
      witnessed_authorization_version: o.witnessedAuthorizationVersion,
      access_state: o.accessState,
    })),
    action_attempts: final.actionAttempts.map((a) => ({
      id: a.id,
      seq: a.seq,
      tick: a.tick,
      action_id: a.actionId,
      policy: a.policy,
      witness_world_version: a.witnessWorldVersion,
      witness_authorization_version: a.witnessAuthorizationVersion,
      current_world_version: a.currentWorldVersion,
      current_authorization_version: a.currentAuthorizationVersion,
      current_access_state: a.currentAccessState,
      witness_stale: a.witnessStale,
      interval_ticks: a.intervalTicks,
      result: a.result,
      reason: a.reason,
      effect_id: a.effectId,
    })),
    final_world_version: final.worldVersion,
    final_state: snapshot(final),
    outcome: outcomeOf(final),
    stale_authority,
  };
  return { ...body, replay_hash: stableHash(body) };
}

export type ReplayResult = { ok: true; receipt: DeterministicReceipt } | { ok: false; reason: string };

/** Rebuild the run from seed + ordered events only, and require byte-identical output. */
export function replayReceipt(receipt: DeterministicReceipt): ReplayResult {
  const initial = createWorld(receipt.seed);
  if (canonicalJson(snapshot(initial)) !== canonicalJson(receipt.initial_state)) {
    return { ok: false, reason: "initial state does not match createWorld(seed)" };
  }
  const ordered = receipt.events.slice().sort((a, b) => a.seq - b.seq);
  let final: WorldState;
  try {
    final = reduce(initial, ordered.map(inputFromReceiptEvent));
  } catch (err) {
    return { ok: false, reason: `reducer rejected replay: ${(err as Error).message}` };
  }
  const rebuilt = buildReceipt(initial, final, receipt.policy);
  if (canonicalJson(rebuilt) !== canonicalJson(receipt)) {
    return { ok: false, reason: `replay diverged (hash ${rebuilt.replay_hash} vs ${receipt.replay_hash})` };
  }
  return { ok: true, receipt: rebuilt };
}
