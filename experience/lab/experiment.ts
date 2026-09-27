/**
 * WORLD PLAYGROUND — one world on the table.
 * The agent has looked (t0) and prepared (t1). The visitor sets the gap, decides WHEN the world
 * changes, sets CHECK AGAIN, and pulls to ACT. Every visible state is a frame of the receipt.
 */
import { scenario } from "../scenarios";
import type { LabReceipt, ScenarioDefinition } from "../scenarios/types";
import { Ticket } from "./ticket";
import { LAB_SEED, setupFor, store } from "./store";
import { createWorldObject, objectStateAt } from "./world-object";
import { checkGate, esc, go, h, headline, proofDrawer, sleep } from "./ui";

/** The frame the visitor sees before ACT: everything that has happened up to the agent acting. */
export function preActIndex(r: LabReceipt): number {
  const i = r.steps.findIndex((s) => s.kind === "VERIFY" || s.kind === "ACT");
  return (i < 0 ? r.steps.length : i) - 1;
}

export function renderExperiment(root: HTMLElement, id: string): () => void {
  const def: ScenarioDefinition = scenario(id);
  const setup = { ...setupFor(def.id) };
  const view = h("section", `lab-exp lab-exp--${def.id}`);
  view.dataset.phase = "SETUP";
  const hl = headline();
  const obj = createWorldObject(def, "full");
  const ticket = new Ticket({
    mode: "lab",
    mutationLabel: def.copy.mutation,
    gap: setup.gap,
    onGap: (g) => {
      setup.gap = g;
      refresh();
    },
    onMutation: (t) => {
      setup.mutationTick = t;
      refresh();
    },
  });
  if (setup.mutationTick !== null) ticket.setMutation(setup.mutationTick);
  const gate = checkGate(setup.policy === "GUARDED", (on) => {
    setup.policy = on ? "GUARDED" : "UNGUARDED";
    refresh();
  });
  const actBtn = h("button", "pulltab", `<span class="pulltab__ring" aria-hidden="true"></span><span>PULL TO ACT</span>`);
  actBtn.type = "button";
  const result = h("div", "lab-result");
  result.setAttribute("aria-live", "assertive");

  const side = h("div", "lab-exp__controls");
  const kicker = h(
    "p",
    "lab-kicker",
    `<b>${esc(def.title)}</b> · the agent looked, then got ready to <b>${esc(def.copy.action.toLowerCase())}</b>. <span class="lab-prov">${def.provenance === "CANONICAL_KERNEL" ? "sandbox" : "simulated world"}</span>`,
  );
  const row = h("div", "lab-exp__row");
  row.append(gate.el, actBtn);
  side.append(kicker, ticket.el, row, result);
  const stageEl = h("div", "lab-exp__object");
  stageEl.append(obj.el);
  view.append(hl.el, stageEl, side);
  root.append(view);

  let receipt: LabReceipt = def.run(input());
  function input() {
    return { seed: LAB_SEED, gapTicks: setup.gap, mutationTick: setup.mutationTick, policy: setup.policy, mode: "LAB" as const };
  }
  function refresh(): void {
    store.setups[def.id] = { ...setup };
    receipt = def.run(input());
    const i = preActIndex(receipt);
    const st = objectStateAt(receipt, i, false);
    obj.update(st);
    hl.set(st.changed ? def.copy.changedHeadline : def.copy.trueHeadline, st.changed ? "changed" : "true");
    view.dataset.changed = String(st.changed);
  }

  let alive = true;
  actBtn.addEventListener("click", async () => {
    if (view.dataset.phase !== "SETUP") return;
    view.dataset.phase = "ACTING";
    ticket.lock(true);
    gate.disable(true);
    actBtn.disabled = true;
    // The agent travels to ACT.
    ticket.setHead(0);
    await sleep(30);
    ticket.setHead(1);
    await sleep(640);
    const verifyAt = receipt.steps.findIndex((s) => s.kind === "VERIFY");
    if (verifyAt >= 0) {
      obj.scan(true); // the check reads the CURRENT world before acting
      await sleep(480);
      obj.scan(false);
      obj.update(objectStateAt(receipt, verifyAt, false));
      await sleep(520);
    }
    if (!alive) return;
    const last = receipt.steps.length - 1;
    const st = objectStateAt(receipt, last, true);
    obj.update(st);
    hl.set(st.changed ? def.copy.finalHeadline : "STILL TRUE.", st.changed ? "final" : "true");
    view.dataset.phase = "DONE";
    view.dataset.outcome = receipt.outcome.kind;
    store.lastRun = receipt;
    showResult();
  });

  function showResult(): void {
    const o = receipt.outcome;
    const line =
      o.kind === "ACTED_ON_STALE"
        ? `It acted on what it saw earlier. The world had already changed.`
        : o.kind === "STOPPED"
          ? `It checked again, saw ${esc(def.copy.changedValue)}, and stopped. Nothing was sent.`
          : receipt.timing.mutation_in_time === false
            ? `It acted first. What it saw was still true then.`
            : `Nothing changed. What it saw was still true.`;
    result.innerHTML = `
      <div class="lab-stamp lab-stamp--${o.kind}">${esc(o.label)}</div>
      <p class="lab-line">${line} ${o.effect ? `<span class="simtag">${esc(o.effect.label)}</span>` : ""}</p>
      <div class="lab-next">
        <button class="lab-next__primary" type="button" data-go="#lab/${def.id}/same">SAME WORLD, TWO OUTCOMES →</button>
        <button class="lab-link" type="button" data-go="#replay/last">REPLAY THIS RUN</button>
        <button class="lab-link" type="button" data-again>CHANGE THE WORLD AGAIN</button>
        <button class="lab-link" type="button" data-go="#challenge/${def.id}">TRY TO BEAT THE AGENT</button>
      </div>`;
    result.append(proofDrawer(receipt));
    result.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go!)));
    result.querySelector<HTMLButtonElement>("[data-again]")!.addEventListener("click", () => {
      store.setups[def.id] = { ...setup, mutationTick: null };
      go(`#lab/${def.id}`);
    });
  }

  refresh();
  return () => {
    alive = false;
  };
}
