import { describe, expect, it } from "vitest";
import { HeroController } from "../../experience/controller";
import { runScenario, replayReceipt } from "../src";

/** The hero interaction must drive the same kernel history as the canonical scenarios. */
function drive(policy: "GUARDED" | "UNGUARDED", revoke: boolean, gapTicks = 8, revokeAtTick = 5) {
  const c = new HeroController("twc-hero-0001");
  c.setGapTicks(gapTicks); // PULL
  if (revoke) {
    c.arm(); // keyboard/tap path
    c.moveArmed(revokeAtTick - c.snapshot().armedTick!);
    c.insertAt(c.snapshot().armedTick!); // INSERT
  }
  c.setPolicy(policy);
  c.release(); // RELEASE
  while (c.step()) {
    /* apply queued closing moves */
  }
  return c;
}

describe("hero controller consumes the kernel, never invents outcomes", () => {
  for (const policy of ["UNGUARDED", "GUARDED"] as const) {
    for (const revoke of [true, false]) {
      it(`${policy} revoke=${revoke}: receipt identical to runScenario`, () => {
        const c = drive(policy, revoke);
        const expected = runScenario({ seed: "twc-hero-0001", policy, revoke, gapTicks: 8, revokeAtTick: 5 }).receipt;
        expect(c.receipt()).toEqual(expected);
        expect(replayReceipt(c.receipt()).ok).toBe(true);
      });
    }
  }

  it("misregistration appears only after the world changes, and clears only on re-verify", () => {
    const c = new HeroController("twc-hero-0001");
    c.setGapTicks(10);
    expect(c.snapshot().misregistered).toBe(false); // pulling alone does not change the world
    c.insertAt(4);
    expect(c.snapshot().misregistered).toBe(true);
    expect(c.snapshot().beliefVersion).toBe(1);
    expect(c.snapshot().world.worldVersion).toBe(2);
    c.setPolicy("GUARDED");
    c.release();
    c.step(); // VERIFY
    expect(c.snapshot().misregistered).toBe(false);
    c.step(); // COMMIT
    expect(c.snapshot().outcome).toBe("BLOCKED");
  });

  it("tray is inert until the gap is open; gap locks once the world changed", () => {
    const c = new HeroController("s");
    expect(c.canInsert()).toBe(false);
    c.insertAt(2);
    expect(c.snapshot().revokeTick).toBeNull();
    c.setGapTicks(6);
    c.insertAt(3);
    c.setGapTicks(20);
    expect(c.snapshot().gapTicks).toBe(6);
  });

  it("replay with the other policy reuses the same world events", () => {
    const c = drive("UNGUARDED", true);
    expect(c.snapshot().outcome).toBe("UNAUTHORIZED_COMMIT");
    c.replay("GUARDED");
    c.release();
    while (c.step()) {
      /* */
    }
    expect(c.snapshot().outcome).toBe("BLOCKED");
    expect(c.snapshot().world.eventLog[2]).toMatchObject({ type: "ADMIN_REVOKES_ACCESS", tick: 5 });
  });
});
