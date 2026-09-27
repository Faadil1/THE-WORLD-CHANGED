/** PICK A WORLD — three physical objects on the table, then two branches. */
import { SCENARIO_ORDER, scenario } from "../scenarios";
import { LAB_SEED } from "./store";
import { createWorldObject, objectStateAt } from "./world-object";
import { esc, go, h, headline } from "./ui";

export function renderWorlds(root: HTMLElement): () => void {
  const view = h("section", "lab-worlds");
  const hl = headline();
  hl.set("PICK A WORLD.", "neutral");
  const sub = h("p", "lab-kicker", "The agent looks at it first. <b>Then you change it.</b>");
  const table = h("ul", "table");
  table.setAttribute("aria-label", "Worlds");
  for (const id of SCENARIO_ORDER) {
    const def = scenario(id);
    const li = h("li", `table__item table__item--${id}`);
    const b = h("button", "table__pick");
    b.type = "button";
    const obj = createWorldObject(def, "mini");
    obj.update(objectStateAt(def.run({ seed: LAB_SEED, gapTicks: 8, mutationTick: null, policy: "UNGUARDED", mode: "LAB" }), 0, false));
    b.append(obj.el);
    b.insertAdjacentHTML(
      "beforeend",
      `<span class="table__name">${esc(def.title)}</span><span class="table__prov">${def.provenance === "CANONICAL_KERNEL" ? "canonical sandbox" : "simulated world"}</span>`,
    );
    b.setAttribute("aria-label", `${def.title}: ${def.copy.validValue}. ${def.provenance === "CANONICAL_KERNEL" ? "Canonical sandbox kernel." : "Simulated sandbox world."}`);
    b.addEventListener("click", () => go(`#lab/${id}`));
    li.append(b);
    table.append(li);
  }
  const branches = h(
    "div",
    "branches",
    `<button class="branch branch--challenge" type="button" data-go="#challenge"><b>CAN YOU CHANGE THE WORLD BEFORE IT ACTS?</b><span>TRY TO BEAT THE AGENT →</span></button>
     <button class="branch branch--live" type="button" data-go="#live"><b>REAL AGENT RUN</b><span>CLAUDE OPUS 5.5 · RECORDED →</span></button>`,
  );
  branches.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go!)));
  view.append(hl.el, sub, table, branches);
  root.append(view);
  return () => {};
}
