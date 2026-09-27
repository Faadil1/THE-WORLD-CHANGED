import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACCESS, ACCESS_COPY } from "../scenarios/access";
import { SCENARIO_ORDER, SCENARIOS } from "../scenarios";
import { labReceiptFromLive } from "../scenarios/receipt";
import { route } from "../lab/route";
import { objectStateAt } from "../lab/world-object";
import { preActIndex } from "../lab/experiment";
import { LIVE_LABEL } from "../mode";
import { importGraph, MODEL_PATH_ENTRIES } from "../../live/isolation-audit";
import { executorFromDriver } from "../../live/executor";
import { isGenuineLiveRun, type LiveReceipt } from "../../live/receipt";
import { sdkCommitOnFirstWitness } from "../../live/test/doubles";

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const input = { seed: "twc-hero-0001", gapTicks: 8, mutationTick: 5, policy: "UNGUARDED" as const, mode: "LAB" as const };

describe("lab routes (progressive discovery; hero at /)", () => {
  it("parses every route", () => {
    expect(route("")).toEqual({ view: "hero" });
    expect(route("#")).toEqual({ view: "hero" });
    expect(route("#lab")).toEqual({ view: "worlds" });
    expect(route("#lab/calendar")).toEqual({ view: "experiment", arg: "calendar" });
    expect(route("#lab/document/same")).toEqual({ view: "same", arg: "document" });
    expect(route("#challenge")).toEqual({ view: "challenge" });
    expect(route("#challenge/access")).toEqual({ view: "challenge", arg: "access" });
    expect(route("#replay")).toEqual({ view: "replay", arg: "last" });
    expect(route("#replay/opus")).toEqual({ view: "replay", arg: "opus" });
    expect(route("#live")).toEqual({ view: "live" });
    expect(route("#nonsense")).toEqual({ view: "hero" });
  });
});

describe("object frames are a faithful projection of the receipt", () => {
  for (const id of SCENARIO_ORDER) {
    it(`${id}: before ACT the visitor sees exactly the pre-act frame; gap-only never shows a ghost`, () => {
      const none = SCENARIOS[id].run({ ...input, mutationTick: null });
      for (let i = -1; i < none.steps.length; i++) expect(objectStateAt(none, i).divergent).toBe(false);
      const r = SCENARIOS[id].run(input);
      const pre = objectStateAt(r, preActIndex(r), false);
      expect(pre).toMatchObject({ divergent: true, changed: true, stamp: null, belief: SCENARIOS[id].copy.validValue, reality: SCENARIOS[id].copy.changedValue });
    });
    it(`${id}: final frames stamp the outcome; only an unauthorized simulated effect is shown as an effect`, () => {
      const stale = SCENARIOS[id].run(input);
      expect(objectStateAt(stale, stale.steps.length - 1)).toMatchObject({ stampKind: "stale", effect: SCENARIOS[id].copy.staleEffect });
      const stopped = SCENARIOS[id].run({ ...input, policy: "GUARDED" });
      expect(objectStateAt(stopped, stopped.steps.length - 1)).toMatchObject({ stampKind: "stopped", stamp: "STOPPED", effect: null, divergent: false, rechecked: true });
    });
  }
  it("the recorded Opus run ends on STOPPED, re-checked, with no effect", () => {
    const dir = join(ROOT, "evidence/runs/live");
    const live = JSON.parse(readFileSync(join(dir, readdirSync(dir).find((f) => f.endsWith(".json"))!), "utf8")) as LiveReceipt;
    const lab = labReceiptFromLive(live, ACCESS_COPY);
    expect(objectStateAt(lab, lab.steps.length - 1)).toMatchObject({ stamp: "STOPPED", effect: null, rechecked: true, divergent: false });
  });
});

describe("no fake LIVE label; recorded runs are never presented as live execution", () => {
  const liveSrc = read("experience/lab/live.ts");
  const appSrc = read("experience/lab/app.ts");
  it("the Lab never uses the hero's LIVE MODEL label and marks the specimen RECORDED", () => {
    for (const f of readdirSync(join(ROOT, "experience/lab")).filter((x) => x.endsWith(".ts"))) {
      expect(read(`experience/lab/${f}`), f).not.toContain(LIVE_LABEL);
      expect(read(`experience/lab/${f}`), f).not.toMatch(/LIVE_LABEL/);
    }
    expect(liveSrc).toMatch(/RECORDED GENUINE RUN · CLAUDE OPUS 5\.5 · NOT RUNNING NOW/);
    expect(appSrc).toMatch(/recorded \? RECORDED_CHIP : SANDBOX_CHIP/);
  });
  it("RUN LIVE is rendered disabled; the browser build has no executor or model client", () => {
    expect(liveSrc).toMatch(/runlive__btn" type="button" disabled/);
    for (const f of readdirSync(join(ROOT, "experience/lab")).filter((x) => x.endsWith(".ts"))) {
      const src = read(`experience/lab/${f}`);
      expect(src, f).not.toMatch(/from\s+["'][^"']*(claude-agent-sdk|@anthropic-ai\/sdk|executor|claude-code-transport|anthropic-transport)["']/);
      expect(src, f).not.toMatch(/\bfetch\(|XMLHttpRequest|new WebSocket/);
    }
  });
  it("simulated worlds never carry genuine-run provenance", () => {
    for (const id of ["calendar", "document"] as const) {
      const r = SCENARIOS[id].run(input);
      expect(r.provenance).toBe("SANDBOX_SIMULATION");
      expect(JSON.stringify(r)).not.toMatch(/opus|claude|RECORDED_GENUINE/i);
    }
  });
});

describe("live executor interface", () => {
  it("composes the proven pipeline; a test double is never genuine", async () => {
    const ex = executorFromDriver(sdkCommitOnFirstWitness(), null);
    expect(ex.transport).toBe("test-double");
    const run = await ex.execute({ scenario: "authority-expired", seed: "exec-0001" });
    expect(run.receipt.transport).toBe("test-double");
    expect(isGenuineLiveRun(run.receipt)).toBe(false);
    expect(run.receipt.world_events.map((e) => e.type)).toEqual(["OBSERVE_ACCESS", "PREPARE_EXPORT", "ADMIN_REVOKES_ACCESS", "COMMIT_EXPORT"]);
  });
  it("is outside the audited model path and never imported by the browser build", () => {
    expect(importGraph(MODEL_PATH_ENTRIES)).not.toContain("live/executor.ts");
    for (const f of ["experience/main.ts", "experience/lab/app.ts", "experience/lab/live.ts", "experience/lab/replay.ts"]) {
      expect(read(f)).not.toMatch(/from\s+["'][^"']*(executor|claude-code-transport|anthropic-transport)["']/);
    }
  });
});

describe("canonical kernel is untouched by the scenario system", () => {
  it("no experience module is imported by the kernel, and the ACCESS adapter only calls public kernel functions", () => {
    for (const f of readdirSync(join(ROOT, "simulation/src"))) expect(read(`simulation/src/${f}`), f).not.toMatch(/experience\//);
    expect(read("experience/scenarios/access.ts")).toMatch(/from "\.\.\/\.\.\/simulation\/src"/);
    expect(ACCESS.provenance).toBe("CANONICAL_KERNEL");
  });
});
