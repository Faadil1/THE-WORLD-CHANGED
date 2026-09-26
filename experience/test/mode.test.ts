import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runAgentLoop } from "../../live/agent-loop";
import { buildLiveReceipt } from "../../live/receipt";
import { SandboxSession } from "../../live/tools";
import { scriptCommitOnFirstWitness } from "../../live/test/doubles";
import { DETERMINISTIC_LABEL, LIVE_LABEL, UNVERIFIED_LABEL, deterministicIdentity, liveIdentity } from "../mode";

const SCRIPTED_WORDS = /SCRIPTED|DETERMINISTIC|NOT A LIVE/i;

describe("mode labels are exactly the canon strings", () => {
  it("deterministic", () => expect(DETERMINISTIC_LABEL).toBe("DETERMINISTIC SANDBOX · SCRIPTED AGENT — NOT A LIVE MODEL"));
  it("live", () => expect(LIVE_LABEL).toBe("LIVE MODEL · CLAUDE OPUS 5.5 · SANDBOX TOOLS ONLY"));
});

describe("a deterministic run is never labeled LIVE", () => {
  it("deterministic identity uses the deterministic label for any seed", () => {
    for (const seed of ["twc-hero-0001", "LIVE", "claude-opus-5-5", "x"]) {
      const id = deterministicIdentity(seed);
      expect(id.mode).toBe("deterministic");
      expect(id.label).toBe(DETERMINISTIC_LABEL);
      expect(id.label).not.toBe(LIVE_LABEL);
      expect(id.label.startsWith("LIVE")).toBe(false);
    }
  });

  it("deterministic kernel receipts are rejected as live receipts", () => {
    const dir = join(__dirname, "..", "..", "evidence", "runs", "deterministic");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const id = liveIdentity(JSON.parse(readFileSync(join(dir, f), "utf8")));
      expect(id.mode, f).toBe("unverified");
      expect(id.label).toBe(UNVERIFIED_LABEL);
    }
  });

  it("scripted test-double 'live' receipts are not shown as LIVE", async () => {
    const r = buildLiveReceipt(await runAgentLoop(scriptCommitOnFirstWitness(), new SandboxSession("m")), new Date(0), new Date(1));
    const id = liveIdentity(r);
    expect(id.mode).toBe("unverified");
    expect(id.label).not.toBe(LIVE_LABEL);
  });
});

describe("a live run is never labeled scripted/deterministic", () => {
  it("live identity (with or without a run) carries no scripted/deterministic wording", async () => {
    const r = buildLiveReceipt(await runAgentLoop(scriptCommitOnFirstWitness(), new SandboxSession("m2")), new Date(0), new Date(1));
    // in-memory provenance-shaped fixture, never written to disk
    const genuineShaped = { ...r, transport: "anthropic-api" as const, model: "claude-opus-5-5", model_reported_by_api: ["claude-opus-5-5"] };
    for (const id of [liveIdentity(null), liveIdentity(genuineShaped)]) {
      expect(id.mode).toBe("live");
      expect(id.label).toBe(LIVE_LABEL);
      expect(id.label).not.toMatch(SCRIPTED_WORDS);
      expect(id.sub).not.toMatch(SCRIPTED_WORDS);
    }
  });

  it("a live-claimed receipt with the wrong model or failed kernel replay is not labeled LIVE", async () => {
    const r = buildLiveReceipt(await runAgentLoop(scriptCommitOnFirstWitness(), new SandboxSession("m3")), new Date(0), new Date(1));
    const base = { ...r, transport: "anthropic-api" as const, model: "claude-opus-5-5", model_reported_by_api: ["claude-opus-5-5"] };
    expect(liveIdentity({ ...base, model_reported_by_api: ["claude-sonnet-5"] }).mode).toBe("unverified");
    expect(liveIdentity({ ...base, model_reported_by_api: [] }).mode).toBe("unverified");
    expect(liveIdentity({ ...base, kernel_replay: { ok: false, replay_hash: "" } }).mode).toBe("unverified");
  });
});

describe("renderer wiring", () => {
  const main = readFileSync(join(__dirname, "..", "main.ts"), "utf8");
  it("scripted controller output is rendered only in deterministic mode", () => {
    expect(main).toMatch(/function render\(s: HeroSnapshot\): void \{\s*if \(identity\.mode !== "deterministic"\) return;/);
    expect(main).toMatch(/if \(identity\.mode === "deterministic"\) \{\s*ctl\.subscribe\(render\);/);
  });
  it("the mode label is set once from identity, not from run state", () => {
    expect(main.match(/\$\("mode-label"\)\.textContent =/g)).toHaveLength(1);
  });
});
