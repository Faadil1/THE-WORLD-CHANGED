/** Small shared UI pieces for the Lab. DOM only; no outcome logic. */
import type { LabReceipt } from "../scenarios/types";

export const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, reducedMotion() ? Math.min(ms, 60) : ms));

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
}

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The state headline, in the same misprinted poster type as the hero. */
export function headline(): { el: HTMLElement; set(text: string, tone: "true" | "changed" | "final" | "neutral"): void } {
  const el = h("h2", "lab-headline", `<span class="lab-headline__ghost" aria-hidden="true"></span><span class="lab-headline__text"></span>`);
  el.setAttribute("aria-live", "polite");
  return {
    el,
    set(text, tone) {
      if (el.dataset.text === text && el.dataset.tone === tone) return;
      el.dataset.text = text;
      el.dataset.tone = tone;
      el.dataset.len = text.length > 20 ? "long" : "short";
      el.querySelector(".lab-headline__text")!.textContent = text;
      el.querySelector(".lab-headline__ghost")!.textContent = text;
      el.classList.remove("is-in");
      void el.offsetWidth; // restart the wipe
      el.classList.add("is-in");
    },
  };
}

/** CHECK AGAIN gate (keeps the protocol's CHECK AT COMMIT phrase as its sub-label). */
export function checkGate(initial: boolean, onChange: (on: boolean) => void): { el: HTMLButtonElement; set(on: boolean): void; disable(d: boolean): void } {
  const el = h("button", "gate", `<span class="gate__posts" aria-hidden="true"><i></i></span><span class="gate__label">CHECK AGAIN<small>CHECK AT COMMIT</small></span><span class="gate__track"><span class="gate__knob"></span></span><span class="gate__state"></span>`);
  el.type = "button";
  el.setAttribute("role", "switch");
  const set = (on: boolean) => {
    el.setAttribute("aria-checked", String(on));
    el.querySelector(".gate__state")!.textContent = on ? "ON" : "OFF";
  };
  set(initial);
  el.addEventListener("click", () => {
    const on = el.getAttribute("aria-checked") !== "true";
    set(on);
    onChange(on);
  });
  return { el, set, disable: (d) => (el.disabled = d) };
}

/** PROOF drawer: collapsed by default; technical evidence lives only here. */
export function proofDrawer(r: LabReceipt, extra: Array<[string, string]> = [], source: unknown = r): HTMLDetailsElement {
  const d = h("details", "lab-proof");
  const rows: Array<[string, string]> = [
    ["provenance", r.provenance],
    ["realm", `${r.realm} · simulated=${r.simulated}`],
    ["scenario / seed", `${r.scenario} · ${r.seed}`],
    ["policy", r.policy],
    ["raw result", r.outcome.raw_result],
    ["private reasoning", r.private_reasoning],
    ...extra,
  ];
  d.innerHTML =
    `<summary>PROOF <span>receipt · steps · raw result</span></summary>` +
    `<dl class="lab-proof__facts">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` +
    `<ol class="lab-proof__steps">${r.steps
      .map((s) => `<li><b>${String(s.seq).padStart(2, "0")}</b> t${s.tick} ${s.actor} ${s.tool ?? s.kind} · world v${s.world_version_before}→v${s.world_version_after} ${esc(s.world_value)} · belief ${s.belief_value ? `${esc(s.belief_value)} v${s.belief_version}` : "—"}${s.divergent ? " · DIVERGED" : ""}${s.act_result ? ` · ${esc(s.act_result)}` : ""}</li>`)
      .join("")}</ol>` +
    `<a class="lab-link" download="receipt.${r.scenario}.${r.seed}.json">RECEIPT.JSON</a>`;
  const a = d.querySelector("a")!;
  a.href = URL.createObjectURL(new Blob([JSON.stringify(source, null, 2)], { type: "application/json" }));
  return d;
}

export function go(hash: string): void {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = hash;
}
