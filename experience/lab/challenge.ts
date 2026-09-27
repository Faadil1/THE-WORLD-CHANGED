/**
 * CAN YOU CHANGE THE WORLD BEFORE IT ACTS?
 * The agent looks, prepares, then travels toward ACT on its own. The gap IS the countdown.
 * The visitor changes the world by dropping the sticker into the live gap, pressing the big
 * CHANGE IT NOW button, or Space/Enter. Wall-clock time -> tick happens only in scenarios/challenge.
 * No points, no streaks, no leaderboard.
 */
import { SCENARIO_ORDER, scenario } from "../scenarios";
import { CHALLENGE_ACT_TICK, CHALLENGE_GAP, CHALLENGE_TICK_MS, CHALLENGE_WINDOW_MS, runChallenge, type ChallengeResult } from "../scenarios/challenge";
import { PREPARE_TICK, type CommitPolicy } from "../scenarios/types";
import { Ticket } from "./ticket";
import { LAB_SEED, store } from "./store";
import { createWorldObject, objectStateAt } from "./world-object";
import { checkGate, esc, go, h, headline, proofDrawer, reducedMotion, sleep } from "./ui";

/** Grace period after ACT during which a press still registers (as TOO LATE). */
const LATE_GRACE_MS = 1100;

export function renderChallenge(root: HTMLElement, id: string | undefined): () => void {
  const def = scenario(id ?? "access");
  let policy: CommitPolicy = "UNGUARDED";
  const view = h("section", `lab-chal lab-chal--${def.id}`);
  view.dataset.phase = "READY";
  const hl = headline();
  hl.set("CAN YOU CHANGE THE WORLD BEFORE IT ACTS?", "neutral");
  const picker = h("div", "sources");
  for (const sid of SCENARIO_ORDER) {
    const b = h("button", "source", esc(scenario(sid).title));
    b.type = "button";
    if (sid === def.id) b.setAttribute("aria-current", "true");
    b.addEventListener("click", () => go(`#challenge/${sid}`));
    picker.append(b);
  }
  const obj = createWorldObject(def, "full");
  const ticket = new Ticket({ mode: "challenge", mutationLabel: def.copy.mutation, gap: CHALLENGE_GAP });
  ticket.lock(true);
  const gate = checkGate(false, (on) => (policy = on ? "GUARDED" : "UNGUARDED"));
  const start = h("button", "lab-next__primary", "START — THE AGENT LOOKS");
  start.type = "button";
  const now = h("button", "change-now", `<span>${esc(def.copy.mutation)}</span><b>CHANGE IT NOW</b>`);
  now.type = "button";
  now.disabled = true; // locked and hidden until the agent starts travelling
  now.setAttribute("aria-hidden", "true");
  const result = h("div", "lab-result");
  result.setAttribute("aria-live", "assertive");
  const status = h("p", "lab-kicker", `The agent will look, get ready to <b>${esc(def.copy.action.toLowerCase())}</b>, then head for ACT. You have one move.`);
  const stageEl = h("div", "lab-exp__object");
  stageEl.append(obj.el);
  const side = h("div", "lab-exp__controls");
  const row = h("div", "lab-exp__row");
  row.append(gate.el, start);
  side.append(status, ticket.el, row, now, result);
  view.append(hl.el, picker, stageEl, side);
  root.append(view);
  // Before START nothing has happened yet: the world as it is.
  obj.update(objectStateAt(def.run({ seed: LAB_SEED, gapTicks: CHALLENGE_GAP, mutationTick: null, policy, mode: "CHALLENGE" }), 0, false));

  let t0 = 0;
  let pressedAt: number | null = null;
  let raf = 0;
  let timers: number[] = [];
  let alive = true;
  const stop = () => {
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    timers = [];
  };

  function press(): void {
    if (view.dataset.phase !== "TRAVEL" && view.dataset.phase !== "GRACE") return;
    if (pressedAt !== null) return;
    pressedAt = performance.now() - t0;
    now.disabled = true;
    const r = runChallenge(def, LAB_SEED, policy, pressedAt);
    ticket.setMutation(r.mutationTick);
    if (r.timing === "IN_TIME") {
      // The world changes NOW: show what it became while the agent is still travelling.
      const mi = r.receipt.steps.findIndex((s) => s.kind === "MUTATE");
      obj.update(objectStateAt(r.receipt, mi, false));
      hl.set(def.copy.changedHeadline, "changed");
      view.dataset.changed = "true";
    } else {
      void finish(r);
    }
  }
  // Drag the change into the live gap (tap / Space / Enter do the same thing).
  let dragged = false;
  now.addEventListener("pointerdown", (ev) => {
    if (now.disabled) return;
    const sx = ev.clientX;
    const sy = ev.clientY;
    let ghost: HTMLElement | null = null;
    dragged = false;
    const strip = ticket.el.querySelector<HTMLElement>(".ticket__strip")!;
    const over = (x: number, y: number) => {
      const r = strip.getBoundingClientRect();
      return x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 60 && y <= r.bottom + 60;
    };
    const move = (e: PointerEvent) => {
      if (!ghost && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
      if (!ghost) {
        dragged = true;
        ghost = h("span", "sticker sticker--drag", esc(def.copy.mutation));
        document.body.append(ghost);
      }
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
      ticket.el.dataset.over = String(over(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      ticket.el.dataset.over = "false";
      if (ghost) {
        ghost.remove();
        if (over(e.clientX, e.clientY)) press();
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  });
  now.addEventListener("click", () => {
    if (dragged) {
      dragged = false; // a drag that missed the gap is not a press
      return;
    }
    press();
  });
  const key = (e: KeyboardEvent) => {
    if ((e.key === " " || e.key === "Enter") && (view.dataset.phase === "TRAVEL" || view.dataset.phase === "GRACE") && document.activeElement !== now) {
      e.preventDefault();
      press();
    }
  };
  window.addEventListener("keydown", key);

  start.addEventListener("click", async () => {
    start.disabled = true;
    gate.disable(true);
    result.innerHTML = "";
    view.dataset.phase = "LOOKING";
    hl.set(def.copy.trueHeadline, "true");
    const base = def.run({ seed: LAB_SEED, gapTicks: CHALLENGE_GAP, mutationTick: null, policy, mode: "CHALLENGE" });
    obj.update(objectStateAt(base, 0, false));
    status.innerHTML = `<b>LOOKING…</b> it sees ${esc(def.copy.validValue)}.`;
    await sleep(700);
    obj.update(objectStateAt(base, 1, false));
    status.innerHTML = `<b>READY.</b> heading for ACT — change the world before it gets there.`;
    await sleep(350);
    if (!alive) return;
    view.dataset.phase = "TRAVEL"; // CHANGE IT NOW arrives only now (CSS), locked until this point
    now.disabled = false;
    now.setAttribute("aria-hidden", "false");
    now.focus({ preventScroll: true });
    t0 = performance.now();
    const discrete = reducedMotion();
    const tick = () => {
      const el = performance.now() - t0;
      const f = Math.min(1, el / CHALLENGE_WINDOW_MS);
      // Reduced motion: the agent moves in whole ticks instead of gliding.
      const shown = discrete ? Math.floor(el / CHALLENGE_TICK_MS) / (CHALLENGE_ACT_TICK - PREPARE_TICK - 1) : f;
      ticket.setHead(Math.min(1, shown));
      view.style.setProperty("--tension", String(f));
      if (f < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    timers.push(
      window.setTimeout(() => {
        if (!alive) return;
        if (pressedAt === null) {
          // Arrived at ACT. A press in the next moment still counts — as TOO LATE.
          view.dataset.phase = "GRACE";
          status.innerHTML = `<b>IT ACTED.</b>`;
          timers.push(
            window.setTimeout(() => {
              if (pressedAt === null) {
                now.disabled = true;
                void finish(runChallenge(def, LAB_SEED, policy, null));
              }
            }, LATE_GRACE_MS),
          );
        } else void finish(runChallenge(def, LAB_SEED, policy, pressedAt));
      }, CHALLENGE_WINDOW_MS),
    );
  });

  async function finish(r: ChallengeResult): Promise<void> {
    if (view.dataset.phase === "DONE") return;
    view.dataset.phase = "RESOLVING";
    stop();
    ticket.setHead(1);
    const verifyAt = r.receipt.steps.findIndex((s) => s.kind === "VERIFY");
    if (verifyAt >= 0 && r.timing === "IN_TIME") {
      obj.scan(true);
      await sleep(460);
      obj.scan(false);
      obj.update(objectStateAt(r.receipt, verifyAt, false));
      await sleep(420);
    }
    if (!alive) return;
    obj.update(objectStateAt(r.receipt, r.receipt.steps.length - 1, true));
    store.lastRun = r.receipt;
    view.dataset.phase = "DONE";
    view.dataset.timing = r.timing;
    view.dataset.outcome = r.receipt.outcome.kind;
    const o = r.receipt.outcome;
    const verdict =
      r.timing === "IN_TIME"
        ? `YOU CHANGED IT IN TIME — BEFORE IT ACTED.`
        : r.timing === "TOO_LATE"
          ? `TOO LATE. IT HAD ALREADY ACTED.`
          : `YOU DIDN'T CHANGE IT.`;
    hl.set(r.timing === "IN_TIME" ? def.copy.finalHeadline : r.timing === "TOO_LATE" ? "TOO LATE." : "STILL TRUE.", r.timing === "IN_TIME" ? "final" : "true");
    status.innerHTML = `<b>${esc(verdict)}</b>`;
    result.innerHTML = `
      <div class="lab-stamp lab-stamp--${o.kind}">${esc(o.label)}</div>
      <p class="lab-line">${
        r.timing !== "IN_TIME"
          ? r.timing === "TOO_LATE"
            ? "It acted first. What it saw was still true then."
            : "Nothing changed. What it saw was still true."
          : o.kind === "STOPPED"
            ? "It checked again before acting and stopped."
            : "It didn't check again. It acted on the old view."
      } ${o.effect && !o.effect.authorized ? `<span class="simtag">${esc(o.effect.label)}</span>` : ""}</p>
      <div class="lab-next">
        <button class="lab-next__primary" type="button" data-again>TRY AGAIN</button>
        <button class="lab-link" type="button" data-go="#replay/last">REPLAY</button>
        <button class="lab-link" type="button" data-go="#lab/${def.id}">OPEN THIS WORLD IN THE LAB</button>
      </div>`;
    result.append(proofDrawer(r.receipt, [["challenge timing", `${r.timing} · change tick ${r.mutationTick ?? "—"} · act tick ${CHALLENGE_ACT_TICK}`]]));
    result.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go!)));
    result.querySelector<HTMLButtonElement>("[data-again]")!.addEventListener("click", () => go(`#challenge/${def.id}`));
  }

  return () => {
    alive = false;
    stop();
    window.removeEventListener("keydown", key);
  };
}
