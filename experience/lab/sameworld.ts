/**
 * SAME WORLD, TWO OUTCOMES. One object, split down a seam:
 *   left  = DIDN'T CHECK AGAIN   (same change, same prepared action)
 *   right = CHECKED AGAIN
 * Drag the seam (or arrow keys on it, or FLIP) to move between the two outcomes.
 * Both halves are kernel/engine receipts computed from the identical setup.
 */
import { sameWorld, scenario } from "../scenarios";
import { LAB_SEED, setupFor } from "./store";
import { createWorldObject, objectStateAt } from "./world-object";
import { esc, go, h, headline, proofDrawer } from "./ui";

export function renderSameWorld(root: HTMLElement, id: string): () => void {
  const def = scenario(id);
  const s = setupFor(def.id);
  const mutationTick = s.mutationTick ?? Math.min(5, s.gap); // a world needs a change to compare
  const gap = s.mutationTick === null ? Math.max(s.gap, 8) : s.gap;
  const { unchecked, checked } = sameWorld(def, LAB_SEED, gap, mutationTick);

  const view = h("section", `lab-same lab-same--${def.id}`);
  const hl = headline();
  hl.set("SAME WORLD.", "final");
  const sub = h("p", "lab-kicker", `same change at t${mutationTick} · same prepared action · <b>only the check differs</b>`);

  const split = h("div", "split");
  split.style.setProperty("--split", "50%");
  const left = createWorldObject(def, "full");
  const right = createWorldObject(def, "full");
  left.update(objectStateAt(unchecked, unchecked.steps.length - 1, true));
  right.update(objectStateAt(checked, checked.steps.length - 1, true));
  left.el.classList.add("split__side", "split__side--left");
  right.el.classList.add("split__side", "split__side--right");
  const seam = h("div", "split__seam", `<span class="split__grip" aria-hidden="true">⟷</span>`);
  seam.setAttribute("role", "slider");
  seam.tabIndex = 0;
  seam.setAttribute("aria-label", "Move between the two outcomes");
  seam.setAttribute("aria-valuemin", "0");
  seam.setAttribute("aria-valuemax", "100");
  split.append(left.el, right.el, seam);

  const path = (side: "l" | "r") =>
    side === "l"
      ? `<ol class="path path--l"><li>DIDN'T CHECK AGAIN</li><li>${esc(unchecked.outcome.label)}</li><li>${esc(unchecked.outcome.effect?.label ?? "NO EFFECT")}</li></ol>`
      : `<ol class="path path--r"><li>CHECKED AGAIN</li><li>CURRENT WORLD READ</li><li>${esc(checked.outcome.kind === "STOPPED" ? "STOPPED · NO EFFECT" : checked.outcome.label)}</li></ol>`;
  const paths = h("div", "split__paths", path("l") + path("r"));
  const flip = h("button", "lab-next__primary", "FLIP ⟲");
  flip.type = "button";
  const next = h("div", "lab-next");
  next.append(flip);
  next.insertAdjacentHTML("beforeend", `<button class="lab-link" type="button" data-go="#lab/${def.id}">CHANGE THE WORLD AGAIN</button><button class="lab-link" type="button" data-go="#replay/last">REPLAY</button>`);
  next.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go!)));

  view.append(hl.el, sub, split, paths, next, proofDrawer(checked, [["compared with", `${unchecked.policy} → ${unchecked.outcome.raw_result}`]], { unchecked, checked }));
  root.append(view);

  const setSplit = (pct: number) => {
    const p = Math.max(0, Math.min(100, pct));
    split.style.setProperty("--split", `${p}%`);
    seam.setAttribute("aria-valuenow", String(Math.round(p)));
    seam.setAttribute("aria-valuetext", p < 35 ? "showing: checked again — stopped" : p > 65 ? "showing: didn't check again — outdated action" : "both outcomes side by side");
    view.dataset.lean = p < 35 ? "checked" : p > 65 ? "unchecked" : "both";
  };
  setSplit(50);
  split.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    split.setPointerCapture(e.pointerId);
    const r = split.getBoundingClientRect();
    const move = (ev: PointerEvent) => setSplit(((ev.clientX - r.left) / r.width) * 100);
    move(e);
    const up = () => {
      split.removeEventListener("pointermove", move);
      split.removeEventListener("pointerup", up);
      split.removeEventListener("pointercancel", up);
    };
    split.addEventListener("pointermove", move);
    split.addEventListener("pointerup", up);
    split.addEventListener("pointercancel", up);
  });
  seam.addEventListener("keydown", (e) => {
    const now = Number(seam.getAttribute("aria-valuenow"));
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setSplit(now + (e.key === "ArrowRight" ? 10 : -10));
    } else if (e.key === "Home") setSplit(0);
    else if (e.key === "End") setSplit(100);
  });
  flip.addEventListener("click", () => setSplit(Number(seam.getAttribute("aria-valuenow")) > 50 ? 0 : 100));
  return () => {};
}
