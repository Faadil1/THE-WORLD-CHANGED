import { describe, expect, it } from "vitest";
import {
  KernelError,
  applyEvent,
  belief,
  createWorld,
  isMisregistered,
  reduce,
  replayReceipt,
  runScenario,
  type WorldEventInput,
} from "../src";

const SEED = "twc-hero-0001";
const N = 1; // INITIAL_WORLD_VERSION

describe("Scenario A — stale authority WITHOUT commit-time revalidation", () => {
  const run = runScenario({ seed: SEED, policy: "UNGUARDED", revoke: true });
  const { final, receipt } = run;

  it("1-3: starts GRANTED at N, observes at N, prepares export on witness N", () => {
    expect(run.initial.accessState).toBe("GRANTED");
    expect(run.initial.worldVersion).toBe(N);
    const obs = final.observations[0]!;
    expect(obs.kind).toBe("OBSERVE");
    expect(obs.witnessedWorldVersion).toBe(N);
    expect(obs.accessState).toBe("GRANTED");
    expect(final.eventLog[1]!.type).toBe("PREPARE_EXPORT");
    expect(final.pendingAction!.id).toBe("act-2");
  });

  it("4-5: revocation is a world mutation that moves the world to N+1", () => {
    const revoke = final.eventLog.find((e) => e.type === "ADMIN_REVOKES_ACCESS")!;
    expect(revoke.actor).toBe("WORLD");
    expect(revoke.mutation).toBe(true);
    expect(revoke.worldVersionBefore).toBe(N);
    expect(revoke.worldVersionAfter).toBe(N + 1);
    expect(final.accessState).toBe("REVOKED");
  });

  it("6-7: commit uses witness N and produces explicit STALE_AUTHORITY evidence", () => {
    expect(final.actionAttempts).toHaveLength(1);
    const a = final.actionAttempts[0]!;
    expect(a.policy).toBe("UNGUARDED");
    expect(a.witnessWorldVersion).toBe(N);
    expect(a.currentWorldVersion).toBe(N + 1);
    expect(a.witnessStale).toBe(true);
    expect(a.result).toBe("STALE_AUTHORITY");
    expect(receipt.outcome).toBe("STALE_AUTHORITY");
    expect(receipt.stale_authority).toEqual({
      attempt_id: a.id,
      witness_world_version: N,
      world_version_at_commit: N + 1,
      witness_authorization_version: 1,
      authorization_version_at_commit: 2,
      versions_behind: 1,
      mutations_between: [{ seq: 3, type: "ADMIN_REVOKES_ACCESS" }],
    });
  });

  it("agent never re-observed: BELIEF is still the stale witness", () => {
    expect(final.observations).toHaveLength(1);
    expect(belief(final)!.witnessedWorldVersion).toBe(N);
    expect(isMisregistered(final)).toBe(true);
  });

  it("sandbox rejected the stale commit: no irreversible effect, world version unchanged", () => {
    expect(final.committedEffects).toEqual([]);
    expect(final.worldVersion).toBe(N + 1);
    expect(final.actionAttempts[0]!.effectId).toBeNull();
  });

  it("event log proves mutation ordering: observe < prepare < revoke < commit", () => {
    expect(final.eventLog.map((e) => e.type)).toEqual([
      "OBSERVE_ACCESS",
      "PREPARE_EXPORT",
      "ADMIN_REVOKES_ACCESS",
      "COMMIT_EXPORT",
    ]);
    expect(final.eventLog.map((e) => e.seq)).toEqual([1, 2, 3, 4]);
    const ticks = final.eventLog.map((e) => e.tick);
    expect([...ticks].sort((x, y) => x - y)).toEqual(ticks);
  });

  it("replay reproduces the exact result", () => {
    const r = replayReceipt(receipt);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.receipt.replay_hash).toBe(receipt.replay_hash);
  });
});

describe("Scenario B — commit-time revalidation BLOCKS the action", () => {
  const run = runScenario({ seed: SEED, policy: "GUARDED", revoke: true });
  const { final, receipt } = run;
  const unguarded = runScenario({ seed: SEED, policy: "UNGUARDED", revoke: true });

  it("steps 1-5 are identical to scenario A", () => {
    expect(final.eventLog.slice(0, 3)).toEqual(unguarded.final.eventLog.slice(0, 3));
  });

  it("6-7: verification records a new observation at N+1 / REVOKED", () => {
    expect(final.observations).toHaveLength(2);
    const v = final.observations[1]!;
    expect(v.kind).toBe("VERIFY");
    expect(v.witnessedWorldVersion).toBe(N + 1);
    expect(v.accessState).toBe("REVOKED");
    expect(receipt.observations[1]).toMatchObject({
      kind: "VERIFY",
      witnessed_world_version: N + 1,
      access_state: "REVOKED",
    });
  });

  it("verification is not a world mutation", () => {
    const verify = final.eventLog.find((e) => e.type === "VERIFY_ACCESS")!;
    expect(verify.mutation).toBe(false);
    expect(verify.worldVersionAfter).toBe(verify.worldVersionBefore);
  });

  it("8-9: pending action becomes ineligible and the attempt is BLOCKED", () => {
    expect(final.pendingAction!.ineligibleReason).toBe("ACCESS_REVOKED");
    const a = final.actionAttempts[0]!;
    expect(a.policy).toBe("GUARDED");
    expect(a.witnessWorldVersion).toBe(N + 1); // refreshed witness
    expect(a.witnessStale).toBe(false);
    expect(a.result).toBe("BLOCKED");
    expect(a.reason).toBe("ACCESS_REVOKED_AT_VERIFY");
    expect(receipt.outcome).toBe("BLOCKED");
    expect(receipt.stale_authority).toBeNull();
  });

  it("no committed irreversible effect", () => {
    expect(final.committedEffects).toEqual([]);
    expect(receipt.final_state.committed_effects).toEqual([]);
  });

  it("BELIEF re-registers with REALITY after the refresh", () => {
    expect(isMisregistered(final)).toBe(false);
  });

  it("replay reproduces the exact result", () => {
    const r = replayReceipt(receipt);
    expect(r.ok).toBe(true);
  });
});

describe("Controls — outcomes come from world state, not from a script", () => {
  it("no world change: unguarded commit succeeds and is a world mutation", () => {
    const { final, receipt } = runScenario({ seed: SEED, policy: "UNGUARDED", revoke: false });
    expect(receipt.outcome).toBe("COMMITTED");
    expect(final.committedEffects).toHaveLength(1);
    const commit = final.eventLog.at(-1)!;
    expect(commit.mutation).toBe(true);
    expect(commit.worldVersionAfter).toBe(N + 1);
    expect(receipt.stale_authority).toBeNull();
  });

  it("no world change: guarded commit re-verifies at N and succeeds", () => {
    const { final, receipt } = runScenario({ seed: SEED, policy: "GUARDED", revoke: false });
    expect(receipt.outcome).toBe("COMMITTED");
    expect(final.observations[1]!.witnessedWorldVersion).toBe(N);
    expect(final.committedEffects).toHaveLength(1);
  });

  it("every mutation increments worldVersion by exactly one; non-mutations never do", () => {
    for (const policy of ["GUARDED", "UNGUARDED"] as const) {
      for (const revoke of [true, false]) {
        const { final } = runScenario({ seed: SEED, policy, revoke });
        for (const e of final.eventLog) {
          expect(e.worldVersionAfter - e.worldVersionBefore).toBe(e.mutation ? 1 : 0);
        }
        const mutations = final.eventLog.filter((e) => e.mutation).length;
        expect(final.worldVersion).toBe(N + mutations);
      }
    }
  });

  it("every observation records the world version it witnessed", () => {
    const { final } = runScenario({ seed: SEED, policy: "GUARDED", revoke: true });
    for (const o of final.observations) {
      const ev = final.eventLog.find((e) => e.seq === o.seq)!;
      expect(o.witnessedWorldVersion).toBe(ev.worldVersionBefore);
    }
  });
});

describe("Determinism and replay", () => {
  it("same seed + same options -> byte-identical receipt", () => {
    const a = runScenario({ seed: SEED, policy: "UNGUARDED", revoke: true }).receipt;
    const b = runScenario({ seed: SEED, policy: "UNGUARDED", revoke: true }).receipt;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("different seeds change seed-derived payload and hash, never the causal outcome", () => {
    const a = runScenario({ seed: "seed-a", policy: "UNGUARDED", revoke: true }).receipt;
    const b = runScenario({ seed: "seed-b", policy: "UNGUARDED", revoke: true }).receipt;
    expect(a.events[1]!.payload.record_count).not.toBe(b.events[1]!.payload.record_count);
    expect(a.replay_hash).not.toBe(b.replay_hash);
    expect(a.outcome).toBe(b.outcome);
  });

  it("gap width and injection position are recorded and replayed", () => {
    for (const gapTicks of [2, 5, 16, 24]) {
      for (let t = 2; t < 1 + gapTicks; t++) {
        const { receipt } = runScenario({ seed: SEED, policy: "UNGUARDED", revoke: true, gapTicks, revokeAtTick: t });
        expect(receipt.action_attempts[0]!.interval_ticks).toBe(1 + gapTicks);
        expect(receipt.events[2]!.tick).toBe(t);
        expect(replayReceipt(receipt).ok).toBe(true);
      }
    }
  });

  it("tampered receipts fail replay", () => {
    const { receipt } = runScenario({ seed: SEED, policy: "UNGUARDED", revoke: true });
    const forged = structuredClone(receipt);
    forged.outcome = "COMMITTED";
    expect(replayReceipt(forged).ok).toBe(false);

    const reordered = structuredClone(receipt);
    // Move the revocation after the commit: changes history, must not reproduce the receipt.
    reordered.events[2]!.seq = 5;
    reordered.events[2]!.tick = 99;
    expect(replayReceipt(reordered).ok).toBe(false);
  });

  it("reducer is pure: applying an event never mutates the previous state", () => {
    const s0 = createWorld(SEED);
    const frozen = JSON.stringify(s0);
    applyEvent(s0, { type: "OBSERVE_ACCESS", tick: 0 });
    expect(JSON.stringify(s0)).toBe(frozen);
  });
});

describe("Kernel rejects illegal histories", () => {
  const s0 = createWorld(SEED);
  const expectCode = (inputs: WorldEventInput[], code: KernelError["code"]) => {
    try {
      reduce(s0, inputs);
      throw new Error("expected KernelError");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe(code);
    }
  };

  it("prepare without observation", () =>
    expectCode([{ type: "PREPARE_EXPORT", tick: 0, recordCount: 10 }], "NO_OBSERVATION"));
  it("tick regression", () =>
    expectCode([{ type: "OBSERVE_ACCESS", tick: 5 }, { type: "OBSERVE_ACCESS", tick: 4 }], "TICK_REGRESSION"));
  it("double revocation", () =>
    expectCode([{ type: "ADMIN_REVOKES_ACCESS", tick: 0 }, { type: "ADMIN_REVOKES_ACCESS", tick: 1 }], "ALREADY_REVOKED"));
  it("commit with an unknown witness version", () =>
    expectCode(
      [
        { type: "OBSERVE_ACCESS", tick: 0 },
        { type: "PREPARE_EXPORT", tick: 1, recordCount: 10 },
        { type: "COMMIT_EXPORT", tick: 2, witnessWorldVersion: 7, policy: "UNGUARDED" },
      ],
      "UNKNOWN_WITNESS",
    ));
  it("revocation must land strictly inside the gap", () => {
    expect(() => runScenario({ seed: SEED, policy: "UNGUARDED", revoke: true, gapTicks: 4, revokeAtTick: 5 })).toThrow(
      KernelError,
    );
  });
});
