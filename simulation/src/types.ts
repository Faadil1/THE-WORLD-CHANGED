/**
 * THE WORLD CHANGED — deterministic simulation kernel types.
 *
 * Canon: product/TECHNICAL-REALITY-GATE.md ("Required deterministic world state").
 * This module has no DOM, timer, clock, or randomness dependency.
 */

export type AccessState = "GRANTED" | "REVOKED";

/** Which side of the world an event comes from. The visitor plays WORLD. */
export type Actor = "AGENT" | "WORLD";

/** Agent commit policy. GUARDED re-verifies current state at commit time. */
export type CommitPolicy = "UNGUARDED" | "GUARDED";

export type ActionResult = "COMMITTED" | "STALE_AUTHORITY" | "BLOCKED";

/**
 * Inputs to the reducer. These are the only things a receipt needs to replay a run
 * (together with seed + initial state). `tick` is a logical clock, never wall time.
 */
export type WorldEventInput =
  | { type: "OBSERVE_ACCESS"; tick: number }
  | { type: "PREPARE_EXPORT"; tick: number; recordCount: number }
  | { type: "ADMIN_REVOKES_ACCESS"; tick: number }
  | { type: "VERIFY_ACCESS"; tick: number }
  | { type: "COMMIT_EXPORT"; tick: number; witnessWorldVersion: number; policy: CommitPolicy };

export type WorldEventType = WorldEventInput["type"];

/** Event as recorded in the event log: the input plus ordering + version evidence. */
export type WorldEvent = WorldEventInput & {
  seq: number;
  actor: Actor;
  /** true if this event changed external world facts (and therefore bumped worldVersion). */
  mutation: boolean;
  worldVersionBefore: number;
  worldVersionAfter: number;
};

export type Observation = {
  id: string;
  seq: number;
  tick: number;
  /** OBSERVE = initial read; VERIFY = commit-time re-read. */
  kind: "OBSERVE" | "VERIFY";
  witnessedWorldVersion: number;
  witnessedAuthorizationVersion: number;
  accessState: AccessState;
};

export type PendingAction = {
  id: string;
  kind: "EXPORT";
  recordCount: number;
  preparedAtSeq: number;
  preparedAtTick: number;
  /** The observation this action currently relies on for authority. */
  witnessObservationId: string;
  witnessWorldVersion: number;
  witnessAuthorizationVersion: number;
  status: "PENDING" | "INELIGIBLE" | "RESOLVED";
  ineligibleReason: "ACCESS_REVOKED" | null;
};

export type Effect = {
  id: string;
  kind: "EXPORT";
  recordCount: number;
  seq: number;
  /** World version produced by committing this effect. */
  worldVersion: number;
  authorizationVersion: number;
};

export type ActionAttempt = {
  id: string;
  seq: number;
  tick: number;
  actionId: string;
  policy: CommitPolicy;
  witnessWorldVersion: number;
  witnessAuthorizationVersion: number;
  witnessObservationTick: number;
  currentWorldVersion: number;
  currentAuthorizationVersion: number;
  currentAccessState: AccessState;
  /** Authority witness no longer matches current authorization version. */
  witnessStale: boolean;
  /** Logical ticks between the witness observation and this commit attempt. */
  intervalTicks: number;
  result: ActionResult;
  reason: "WITNESS_CURRENT" | "AUTHORIZATION_VERSION_ADVANCED" | "ACCESS_REVOKED_AT_VERIFY";
  /** Id of the committed effect, or null when no irreversible effect occurred. */
  effectId: string | null;
};

/** Minimum state from TECHNICAL-REALITY-GATE.md, plus actionAttempts for the receipt. */
export type WorldState = {
  seed: string;
  worldVersion: number;
  accessState: AccessState;
  authorizationVersion: number;
  observations: Observation[];
  pendingAction: PendingAction | null;
  committedEffects: Effect[];
  actionAttempts: ActionAttempt[];
  eventLog: WorldEvent[];
};

export type Outcome = ActionResult | "PENDING";

export class KernelError extends Error {
  constructor(
    public readonly code:
      | "TICK_REGRESSION"
      | "NO_OBSERVATION"
      | "PREPARE_WITHOUT_GRANT"
      | "ACTION_ALREADY_PENDING"
      | "NO_PENDING_ACTION"
      | "ALREADY_REVOKED"
      | "UNKNOWN_WITNESS"
      | "INVALID_PAYLOAD",
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "KernelError";
  }
}
