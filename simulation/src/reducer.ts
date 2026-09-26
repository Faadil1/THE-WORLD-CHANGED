/**
 * Event reducer. The ONLY way world state changes.
 *
 * Mutation rule (canon: "Every world mutation increments worldVersion"):
 *   A *world mutation* is a change to world facts — access/authorization state or a
 *   committed (sandbox-simulated) irreversible effect. Those events bump worldVersion.
 *   Agent-side bookkeeping (observations, a prepared-but-uncommitted action,
 *   rejected/blocked attempts) does not change the external world and does not bump it.
 *   Every event, mutating or not, is appended to eventLog with before/after versions,
 *   so the log proves mutation ordering.
 */
import {
  KernelError,
  type ActionAttempt,
  type Actor,
  type Observation,
  type WorldEvent,
  type WorldEventInput,
  type WorldState,
} from "./types";

export const KERNEL_VERSION = "kernel-v0";
export const INITIAL_WORLD_VERSION = 1;

export function createWorld(seed: string): WorldState {
  return {
    seed,
    worldVersion: INITIAL_WORLD_VERSION,
    accessState: "GRANTED",
    authorizationVersion: 1,
    observations: [],
    pendingAction: null,
    committedEffects: [],
    actionAttempts: [],
    eventLog: [],
  };
}

const ACTOR: Record<WorldEventInput["type"], Actor> = {
  OBSERVE_ACCESS: "AGENT",
  PREPARE_EXPORT: "AGENT",
  ADMIN_REVOKES_ACCESS: "WORLD",
  VERIFY_ACCESS: "AGENT",
  COMMIT_EXPORT: "AGENT",
};

export function actorOf(type: WorldEventInput["type"]): Actor {
  return ACTOR[type];
}

/** Pure: returns a new state; never mutates `prev`. Throws KernelError on illegal transitions. */
export function applyEvent(prev: WorldState, input: WorldEventInput): WorldState {
  validateInput(input);
  const lastTick = prev.eventLog.at(-1)?.tick ?? -Infinity;
  if (input.tick < lastTick) {
    throw new KernelError("TICK_REGRESSION", `tick ${input.tick} < last tick ${lastTick}`);
  }

  const seq = prev.eventLog.length + 1;
  const s: WorldState = {
    ...prev,
    observations: prev.observations.slice(),
    committedEffects: prev.committedEffects.slice(),
    actionAttempts: prev.actionAttempts.slice(),
    pendingAction: prev.pendingAction ? { ...prev.pendingAction } : null,
    eventLog: prev.eventLog.slice(),
  };
  const before = s.worldVersion;
  let mutation = false;

  switch (input.type) {
    case "OBSERVE_ACCESS": {
      s.observations.push(observe(s, seq, input.tick, "OBSERVE"));
      break;
    }

    case "PREPARE_EXPORT": {
      const obs = s.observations.at(-1);
      if (!obs) throw new KernelError("NO_OBSERVATION", "prepare_export requires a prior observation");
      if (obs.accessState !== "GRANTED") {
        throw new KernelError("PREPARE_WITHOUT_GRANT", "latest observation does not grant access");
      }
      if (s.pendingAction && s.pendingAction.status === "PENDING") {
        throw new KernelError("ACTION_ALREADY_PENDING", s.pendingAction.id);
      }
      s.pendingAction = {
        id: `act-${seq}`,
        kind: "EXPORT",
        recordCount: input.recordCount,
        preparedAtSeq: seq,
        preparedAtTick: input.tick,
        witnessObservationId: obs.id,
        witnessWorldVersion: obs.witnessedWorldVersion,
        witnessAuthorizationVersion: obs.witnessedAuthorizationVersion,
        status: "PENDING",
        ineligibleReason: null,
      };
      break;
    }

    case "ADMIN_REVOKES_ACCESS": {
      if (s.accessState === "REVOKED") throw new KernelError("ALREADY_REVOKED", "access already revoked");
      s.accessState = "REVOKED";
      s.authorizationVersion += 1;
      s.worldVersion += 1;
      mutation = true;
      break;
    }

    case "VERIFY_ACCESS": {
      const obs = observe(s, seq, input.tick, "VERIFY");
      s.observations.push(obs);
      const p = s.pendingAction;
      if (p && p.status === "PENDING") {
        // The action now relies on the refreshed witness.
        p.witnessObservationId = obs.id;
        p.witnessWorldVersion = obs.witnessedWorldVersion;
        p.witnessAuthorizationVersion = obs.witnessedAuthorizationVersion;
        if (obs.accessState === "REVOKED") {
          p.status = "INELIGIBLE";
          p.ineligibleReason = "ACCESS_REVOKED";
        }
      }
      break;
    }

    case "COMMIT_EXPORT": {
      const p = s.pendingAction;
      if (!p || p.status === "RESOLVED") throw new KernelError("NO_PENDING_ACTION", "nothing to commit");
      // commit_export(witness_version): resolve which observation the caller is relying on.
      const witness = findLast(s.observations, (o) => o.witnessedWorldVersion === input.witnessWorldVersion);
      if (!witness) {
        throw new KernelError("UNKNOWN_WITNESS", `no observation at world version ${input.witnessWorldVersion}`);
      }
      const witnessStale = witness.witnessedAuthorizationVersion !== s.authorizationVersion;

      let result: ActionAttempt["result"];
      let reason: ActionAttempt["reason"];
      let effectId: string | null = null;

      if (p.status === "INELIGIBLE") {
        // GUARDED: commit-time verification already saw REVOKED. The effect is never reached.
        result = "BLOCKED";
        reason = "ACCESS_REVOKED_AT_VERIFY";
      } else {
        // No revalidation happened at commit time. This sandbox models a system that trusts
        // the witness it is handed: the (simulated) effect commits either way. Whether that
        // commit was authorized is recorded as evidence, not used as a hidden gate.
        const authorized = !witnessStale && s.accessState === "GRANTED";
        result = authorized ? "COMMITTED" : "UNAUTHORIZED_COMMIT";
        reason = witnessStale ? "STALE_AUTHORITY" : "WITNESS_CURRENT";
        s.worldVersion += 1;
        mutation = true;
        effectId = `eff-${seq}`;
        s.committedEffects.push({
          id: effectId,
          kind: "EXPORT",
          realm: "SANDBOX",
          simulated: true,
          authorized,
          accessStateAtCommit: s.accessState,
          recordCount: p.recordCount,
          seq,
          worldVersion: s.worldVersion,
          authorizationVersion: s.authorizationVersion,
        });
      }

      s.actionAttempts.push({
        id: `att-${seq}`,
        seq,
        tick: input.tick,
        actionId: p.id,
        policy: input.policy,
        witnessWorldVersion: witness.witnessedWorldVersion,
        witnessAuthorizationVersion: witness.witnessedAuthorizationVersion,
        witnessObservationTick: witness.tick,
        currentWorldVersion: before,
        currentAuthorizationVersion: s.authorizationVersion,
        currentAccessState: s.accessState,
        witnessStale,
        intervalTicks: input.tick - witness.tick,
        result,
        reason,
        effectId,
      });
      p.status = "RESOLVED";
      break;
    }
  }

  const logged: WorldEvent = {
    ...input,
    seq,
    actor: ACTOR[input.type],
    mutation,
    worldVersionBefore: before,
    worldVersionAfter: s.worldVersion,
  };
  s.eventLog.push(logged);
  return s;
}

export function reduce(initial: WorldState, inputs: readonly WorldEventInput[]): WorldState {
  return inputs.reduce(applyEvent, initial);
}

/** BELIEF = latest relevant external state actually observed by the agent. */
export function belief(s: WorldState): Observation | null {
  return s.observations.at(-1) ?? null;
}

/** true when the agent's latest observation no longer matches current reality. */
export function isMisregistered(s: WorldState): boolean {
  const b = belief(s);
  if (!b) return false;
  return b.accessState !== s.accessState || b.witnessedAuthorizationVersion !== s.authorizationVersion;
}

function observe(s: WorldState, seq: number, tick: number, kind: Observation["kind"]): Observation {
  return {
    id: `obs-${seq}`,
    seq,
    tick,
    kind,
    witnessedWorldVersion: s.worldVersion,
    witnessedAuthorizationVersion: s.authorizationVersion,
    accessState: s.accessState,
  };
}

function findLast<T>(xs: readonly T[], pred: (x: T) => boolean): T | undefined {
  for (let i = xs.length - 1; i >= 0; i--) {
    const x = xs[i] as T;
    if (pred(x)) return x;
  }
  return undefined;
}

function validateInput(input: WorldEventInput): void {
  if (!Number.isInteger(input.tick) || input.tick < 0) {
    throw new KernelError("INVALID_PAYLOAD", `tick must be a non-negative integer (got ${input.tick})`);
  }
  if (input.type === "PREPARE_EXPORT" && (!Number.isInteger(input.recordCount) || input.recordCount <= 0)) {
    throw new KernelError("INVALID_PAYLOAD", "recordCount must be a positive integer");
  }
  if (
    input.type === "COMMIT_EXPORT" &&
    input.policy !== "GUARDED" &&
    input.policy !== "UNGUARDED" &&
    input.policy !== "AGENT_DECIDED"
  ) {
    throw new KernelError("INVALID_PAYLOAD", "policy must be GUARDED, UNGUARDED or AGENT_DECIDED");
  }
  if (input.type === "COMMIT_EXPORT" && !Number.isInteger(input.witnessWorldVersion)) {
    throw new KernelError("INVALID_PAYLOAD", "witnessWorldVersion must be an integer");
  }
}
