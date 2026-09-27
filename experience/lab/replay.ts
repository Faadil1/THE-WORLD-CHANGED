/**
 * REPLAY — an evidence strip, not a trace viewer.
 * Every frame is rebuilt from the receipt alone (steps). Scrub with the strip, the range,
 * PREV/NEXT, or arrow keys. PROOF stays collapsed until asked for.
 */
import { ACCESS_COPY, labReceiptFromKernel } from "../scenarios/access";
import { scenario } from "../scenarios";
import { frameCaption, labReceiptFromLive } from "../scenarios/receipt";
import type { LabReceipt } from "../scenarios/types";
import type { DeterministicReceipt } from "../../simulation/src";
import type { LiveReceipt } from "../../live/receipt";
import unchecked from "../../evidence/runs/deterministic/authority-expired.A-unguarded.json";
import checked from "../../evidence/runs/deterministic/authority-expired.B-guarded.json";
import { store } from "./store";
import { createWorldObject, objectStateAt } from "./world-object";
import { esc, go, h, headline, proofDrawer } from "./ui";

const LIVE_FILES = import.meta.glob("../../evidence/runs/live/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

export function genuineLiveReceipt(): LiveReceipt | null {
  const key = Object.keys(LIVE_FILES).sort().find((k) => k.includes("twc-live-0001"));
  return key ? (LIVE_FILES[key] as LiveReceipt) : null;
}

export type ReplaySource = "last" | "canonical-unchecked" | "canonical-checked" | "opus";

export function replaySource(src: string): { receipt: LabReceipt; raw: unknown; title: string } | null {
  switch (src as ReplaySource) {
    case "last":
      return store.lastRun ? { receipt: store.lastRun, raw: store.lastRun, title: "YOUR LAST RUN" } : null;
    case "canonical-unchecked":
      return { receipt: labReceiptFromKernel(unchecked as unknown as DeterministicReceipt, "LAB", null, null), raw: unchecked, title: "CANONICAL · NO CHECK" };
    case "canonical-checked":
      return { receipt: labReceiptFromKernel(checked as unknown as DeterministicReceipt, "LAB", null, null), raw: checked, title: "CANONICAL · CHECKED" };
    case "opus": {
      const live = genuineLiveReceipt();
      return live ? { receipt: labReceiptFromLive(live, ACCESS_COPY), raw: live, title: "REAL AGENT RUN · OPUS 5.5" } : null;
    }
  }
  return null;
}

function frameHeadline(r: LabReceipt, i: number): [string, "true" | "changed" | "final" | "neutral"] {
  const copy = scenario(r.scenario).copy;
  const s = r.steps[i]!;
  if (s.kind === "ACT" || (i === r.steps.length - 1 && r.outcome.kind !== "NO_ACTION")) return [r.outcome.label, "final"];
  if (s.kind === "VERIFY") return ["CHECKED AGAIN.", "final"];
  if (s.divergent) return [copy.changedHeadline, "changed"];
  return [copy.trueHeadline, "true"];
}

export function renderReplay(root: HTMLElement, src: string, opts: { embedded?: boolean } = {}): () => void {
  const found = replaySource(src) ?? replaySource("canonical-checked")!;
  const { receipt: r, raw } = found;
  const def = scenario(r.scenario);
  const view = h("section", `lab-replay lab-replay--${r.provenance.toLowerCase()}`);
  const hl = headline();
  hl.el.classList.add("lab-headline--frame");
  const obj = createWorldObject(def, "full");
  const cap = h("p", "replay-cap");
  const strip = h("ol", "evidence-strip");
  strip.setAttribute("aria-label", "Evidence strip: one frame per observable step");
  const minis = r.steps.map((s, i) => {
    const li = h("li");
    const b = h("button", "frame");
    b.type = "button";
    const mini = createWorldObject(def, "mini");
    mini.update(objectStateAt(r, i));
    b.append(mini.el);
    b.insertAdjacentHTML("beforeend", `<span class="frame__t">t${s.tick}</span><span class="frame__cap">${frameCaption(s)}</span>${s.tool ? `<code class="frame__tool">${esc(s.tool)}</code>` : ""}`);
    b.setAttribute("aria-label", `Frame ${i + 1}: t${s.tick}, ${frameCaption(s)}${s.divergent ? ", diverged" : ""}`);
    b.addEventListener("click", () => select(i));
    li.append(b);
    strip.append(li);
    return b;
  });
  const range = h("input", "scrub") as HTMLInputElement;
  range.type = "range";
  range.min = "0";
  range.max = String(r.steps.length - 1);
  range.setAttribute("aria-label", "Scrub through the run");
  const prev = h("button", "scrub-btn", "← PREV");
  const next = h("button", "scrub-btn", "NEXT →");
  prev.type = next.type = "button";
  const controls = h("div", "scrub-row");
  controls.append(prev, range, next);

  if (!opts.embedded) {
    // Entrance: the proposition first, then the evidence controls.
    view.append(
      h(
        "header",
        "replay-intro",
        `<h2 class="replay-intro__title">REPLAY WHAT THE AGENT SAW.</h2>
         <p class="replay-intro__sub">Move through the run. Watch what the agent knew and what the world became.</p>
         <ol class="replay-intro__beats" aria-label="What each frame shows">
           <li>WHAT THE AGENT SAW</li><li>WHAT IT PREPARED</li><li>WHAT THE WORLD BECAME</li><li>WHAT IT CHECKED / DID</li>
         </ol>`,
      ),
    );
    const sources = h("div", "sources");
    const list: Array<[ReplaySource, string]> = [
      ["last", "YOUR LAST RUN"],
      ["canonical-unchecked", "CANONICAL · NO CHECK"],
      ["canonical-checked", "CANONICAL · CHECKED"],
      ["opus", "REAL AGENT RUN"],
    ];
    for (const [id, label] of list) {
      if (id === "last" && !store.lastRun) continue;
      const b = h("button", "source", esc(label));
      b.type = "button";
      if ((src === id) || (!replaySource(src) && id === "canonical-checked")) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => go(`#replay/${id}`));
      sources.append(b);
    }
    view.append(sources);
  }
  const stage = h("div", "lab-replay__stage");
  stage.append(obj.el);
  view.append(hl.el, cap, stage, controls, strip);
  if (!opts.embedded) view.append(proofDrawer(r, [["source", found.title]], raw));
  root.append(view);

  function select(i: number): void {
    const n = Math.max(0, Math.min(r.steps.length - 1, i));
    const s = r.steps[n]!;
    obj.update(objectStateAt(r, n));
    const [t, tone] = frameHeadline(r, n);
    hl.set(t, tone);
    cap.innerHTML = `<b>t${s.tick} · ${frameCaption(s)}</b> <span>AGENT SAW ${s.belief_value ? `${esc(s.belief_value)} v${s.belief_version}` : "—"}</span> <span>WORLD NOW ${esc(s.world_value)} v${s.world_version_after}</span>${s.divergent ? ` <em>DIVERGED</em>` : ""}`;
    range.value = String(n);
    range.setAttribute("aria-valuetext", `t${s.tick}, ${frameCaption(s)}${s.divergent ? ", diverged" : ""}`);
    minis.forEach((m, k) => m.setAttribute("aria-current", String(k === n)));
    view.dataset.divergent = String(s.divergent);
    view.dataset.frame = String(n);
    prev.disabled = n === 0;
    next.disabled = n === r.steps.length - 1;
  }
  range.addEventListener("input", () => select(Number(range.value)));
  prev.addEventListener("click", () => select(Number(range.value) - 1));
  next.addEventListener("click", () => select(Number(range.value) + 1));
  select(0);
  return () => {};
}
