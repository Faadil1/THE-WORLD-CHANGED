/**
 * WORLD OBJECTS — the stars of the Lab. One component, three faces:
 *   pass (ACCESS) · calendar sheet (CALENDAR) · stacked paper (DOCUMENT)
 *
 * Every object has two print layers: REALITY (solid) and what the agent saw (cyan ghost).
 * The ghost is invisible while it matches the world and lifts out of register only when a
 * world mutation made them differ. All state comes from a receipt step (objectStateAt).
 */
import type { LabReceipt, ObservableStep, ScenarioDefinition } from "../scenarios/types";

export type ObjectState = {
  reality: string;
  realityVersion: number;
  belief: string | null;
  beliefVersion: number | null;
  divergent: boolean;
  changed: boolean;
  rechecked: boolean;
  stamp: string | null;
  stampKind: "stale" | "stopped" | "valid" | null;
  effect: string | null;
};

/** Object state at a scrub position (index into receipt.steps; -1 = before anything happened). */
export function objectStateAt(r: LabReceipt, index: number, withOutcome = index >= r.steps.length - 1): ObjectState {
  const s: ObservableStep | undefined = r.steps[Math.min(index, r.steps.length - 1)];
  if (!s || index < 0) {
    return { reality: r.initial_world.value, realityVersion: r.initial_world.version, belief: null, beliefVersion: null, divergent: false, changed: false, rechecked: false, stamp: null, stampKind: null, effect: null };
  }
  const changed = r.steps.slice(0, index + 1).some((x) => x.kind === "MUTATE");
  const rechecked = r.steps.slice(0, index + 1).some((x) => x.kind === "VERIFY");
  const k = r.outcome.kind;
  const showOutcome = withOutcome && (s.kind === "ACT" || s.kind === "VERIFY" || index === r.steps.length - 1) && k !== "NO_ACTION";
  // An outcome that happened before a late mutation is still shown on the final frame.
  return {
    reality: s.world_value,
    realityVersion: s.world_version_after,
    belief: s.belief_value,
    beliefVersion: s.belief_version,
    divergent: s.divergent,
    changed,
    rechecked,
    stamp: showOutcome ? (k === "STOPPED" ? "STOPPED" : k === "ACTED_VALID" ? "SENT" : r.outcome.label) : null,
    stampKind: showOutcome ? (k === "STOPPED" ? "stopped" : k === "ACTED_VALID" ? "valid" : "stale") : null,
    effect: showOutcome && r.outcome.effect && !r.outcome.effect.authorized ? r.outcome.effect.label : null,
  };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function face(def: ScenarioDefinition, role: "reality" | "belief"): string {
  const tag =
    role === "reality"
      ? `<span class="wo__tag">WORLD NOW · <b data-slot="version"></b><em class="wo__flag wo__flag--changed">CHANGED</em></span>`
      : `<span class="wo__tag"><span data-slot="verb">AGENT SAW</span> · <b data-slot="version"></b><em class="wo__flag wo__flag--old">OLD</em></span>`;
  switch (def.visual.object) {
    case "pass":
      return `
        <span class="pass2__hole"></span>
        <span class="pass2__band"><span>ACCESS PASS</span><span>CUSTOMER DATA</span></span>
        <span class="pass2__id"><span class="glyph2"><i></i><i></i><i></i></span><span class="pass2__meta">HOLDER AGENT<br />TASK EXPORT</span></span>
        <span class="wo__field">ACCESS</span>
        <span class="wo__value" data-slot="value"></span>
        <span class="pass2__valid">VALID</span>
        ${tag}
        <span class="pass2__stub"><span class="barcode2"></span></span>`;
    case "calendar":
      return `
        <span class="cal__rings"><i></i><i></i><i></i><i></i></span>
        <span class="cal__month">OCTOBER · TUESDAY</span>
        <span class="cal__day">14</span>
        <span class="cal__slot"><span class="cal__time">15:00–16:00</span><span class="wo__value cal__status" data-slot="value"></span></span>
        <span class="cal__meet">MEETING · Q4 REVIEW</span>
        <span class="cal__grid" aria-hidden="true"></span>
        ${tag}
        <span class="cal__tear"></span>`;
    case "document":
      return `
        <span class="doc__tab" data-slot="tab"></span>
        <span class="doc__head">BOARD MEMO · Q3</span>
        <span class="doc__lines"></span>
        <span class="doc__mark"></span>
        <span class="wo__field">THIS DRAFT IS</span>
        <span class="wo__value" data-slot="value"></span>
        <span class="doc__lines doc__lines--short"></span>
        <span class="doc__sign" aria-hidden="true"><i></i>approved for sending</span>
        ${tag}`;
  }
}

export type WorldObject = { el: HTMLElement; update(s: ObjectState): void; scan(on: boolean): void };

export function createWorldObject(def: ScenarioDefinition, size: "full" | "mini" = "full"): WorldObject {
  const el = document.createElement("div");
  el.className = `wo wo--${def.visual.object} wo--${size}`;
  el.dataset.scenario = def.id;
  el.innerHTML = `
    ${def.visual.object === "pass" && size === "full" ? `<span class="wo__lanyard" aria-hidden="true"></span>` : ""}
    ${def.visual.object === "document" ? `<span class="doc__sheet doc__sheet--3"></span><span class="doc__sheet doc__sheet--2"></span>` : ""}
    <div class="wo__layer wo__layer--reality">${face(def, "reality")}</div>
    <div class="wo__layer wo__layer--belief" aria-hidden="true">${face(def, "belief")}</div>
    <span class="wo__cancel" aria-hidden="true">${esc(def.copy.cancel)}</span>
    <span class="wo__scanner" aria-hidden="true"></span>
    <span class="wo__stamp" aria-hidden="true"></span>
    <span class="wo__effect" aria-hidden="true"></span>
    ${size === "full" ? `<span class="wo__note" aria-hidden="true">${esc(def.copy.sawNote)}</span>` : ""}
    <p class="sr-only" aria-live="polite"></p>`;
  const R = el.querySelector<HTMLElement>(".wo__layer--reality")!;
  const B = el.querySelector<HTMLElement>(".wo__layer--belief")!;
  const set = (layer: HTMLElement, slot: string, text: string) => layer.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`).forEach((n) => (n.textContent = text));
  const sr = el.querySelector<HTMLElement>(".sr-only")!;
  return {
    el,
    update(s) {
      set(R, "value", s.reality);
      set(R, "version", `v${s.realityVersion}`);
      set(R, "tab", s.reality === def.copy.validValue ? `v${s.realityVersion} · CURRENT` : `v${s.realityVersion} · NEWER`);
      set(B, "value", s.belief ?? s.reality);
      set(B, "version", `v${s.beliefVersion ?? s.realityVersion}`);
      set(B, "tab", `v${s.beliefVersion ?? s.realityVersion} · ${s.belief ?? s.reality}`);
      set(B, "verb", s.rechecked ? "CHECKED AGAIN" : "AGENT SAW");
      el.dataset.valid = String(s.reality === def.copy.validValue);
      el.dataset.divergent = String(s.divergent);
      el.dataset.changed = String(s.changed);
      el.dataset.stamp = s.stampKind ?? "";
      el.querySelector(".wo__stamp")!.textContent = s.stamp ?? "";
      el.querySelector(".wo__effect")!.textContent = s.effect ?? "";
      sr.textContent = s.divergent
        ? `${def.copy.object}: the agent saw ${s.belief} (v${s.beliefVersion}); the world is now ${s.reality} (v${s.realityVersion}). What it knew is old.`
        : `${def.copy.object}: ${s.reality} (v${s.realityVersion}). ${s.belief ? "What the agent knows matches the world." : ""}${s.stamp ? ` Outcome: ${s.stamp}.` : ""}`;
    },
    scan(on) {
      el.dataset.scan = on ? "go" : "";
    },
  };
}
