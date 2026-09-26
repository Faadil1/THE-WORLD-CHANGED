/**
 * PULL THE GAP — renderer + gesture layer.
 * Reads HeroController snapshots (which come from the kernel) and draws them.
 * It never decides outcomes; it only converts gestures into kernel inputs via the controller.
 */
import { HeroController, MAX_GAP_TICKS, PREPARE_TICK, type HeroSnapshot } from "./controller";
import {
  belief,
  createWorld,
  inputFromReceiptEvent,
  isMisregistered,
  outcomeOf,
  reduce,
  type WorldEvent,
  type WorldState,
} from "../simulation/src";
import type { LiveReceipt } from "../live/receipt";
import { deterministicIdentity, liveIdentity, transportLabel, type ModeIdentity } from "./mode";
import { OUTCOME_LABELS, beliefTag, causalSteps, liveBehaviorLabel, sameWorldOutcomes } from "./causal";

const params = new URLSearchParams(location.search);
const SEED = params.get("seed") || "twc-hero-0001";
const ctl = new HeroController(SEED);

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const bench = $("bench");
const interval = $("interval");
const act = $<HTMLButtonElement>("act");
const token = $<HTMLButtonElement>("token");
const guard = $<HTMLButtonElement>("guard");
const latch = $<HTMLButtonElement>("latch");
const replayOther = $<HTMLButtonElement>("replay-other");
const resetBtn = $<HTMLButtonElement>("reset");
const receiptLink = $<HTMLAnchorElement>("receipt");

// ---------- mode identity: decided once at boot, visible before/during/after ----------
const LIVE_RECEIPTS = import.meta.glob("../evidence/runs/live/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
function pickLiveReceipt(): unknown | null {
  const names = Object.keys(LIVE_RECEIPTS).sort();
  const want = params.get("run");
  const key = want ? names.find((n) => n.endsWith(`/${want}`)) : names.at(-1);
  return key ? LIVE_RECEIPTS[key]! : null;
}
const identity: ModeIdentity = params.get("mode") === "live" ? liveIdentity(pickLiveReceipt()) : deterministicIdentity(SEED);
bench.dataset.mode = identity.mode;
$("mode-label").textContent = identity.label;
$("mode-sub").textContent = identity.sub;

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const wait = (ms: number) => new Promise((r) => setTimeout(r, reducedMotion.matches ? Math.min(ms, 140) : ms));

// ---------- geometry (pixels live only here) ----------
let pxPerTick = 28;
let dragWidthPx: number | null = null;

function measure(): void {
  const gl = $("gapline").getBoundingClientRect().width;
  const nodes = 2 * (act.getBoundingClientRect().width || 64);
  // interval spans ticks [0, commitTick]; max commitTick = PREPARE_TICK + MAX_GAP_TICKS
  pxPerTick = Math.max(10, (gl - nodes + 40) / (PREPARE_TICK + MAX_GAP_TICKS));
  bench.style.setProperty("--px-per-tick", `${pxPerTick}px`);
}

function fractionAt(clientX: number): number {
  const r = interval.getBoundingClientRect();
  return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
}

function insideInterval(x: number, y: number): boolean {
  const r = interval.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top - 48 && y <= r.bottom + 48;
}

// ---------- render ----------
const fmt = (n: number) => n.toLocaleString("en-US");

/** Deterministic renders come only from the scripted controller, and only in deterministic mode. */
function render(s: HeroSnapshot): void {
  if (identity.mode !== "deterministic") return;
  draw(s);
}

function draw(s: HeroSnapshot): void {
  const w = s.world;
  bench.dataset.phase = s.phase;
  bench.dataset.policy = s.policy;
  bench.dataset.misregistered = String(s.misregistered);
  bench.dataset.outcome = s.phase === "RESOLVED" ? s.outcome : "";
  bench.dataset.placed = String(s.revokeTick !== null);
  bench.dataset.ghost = String(s.armedTick !== null);

  // Plates: REALITY = current world, BELIEF = latest observation actually made.
  const b = belief(w);
  $("reality-access").textContent = w.accessState;
  $("reality-version").textContent = String(w.worldVersion);
  $("belief-access").textContent = b?.accessState ?? "—";
  $("belief-version").textContent = String(b?.witnessedWorldVersion ?? "—");
  const bt = beliefTag(w);
  $("belief-verb").textContent = bt.rechecked ? "agent re-checked" : "agent saw";
  bench.dataset.stale = String(bt.stale);
  bench.dataset.rechecked = String(bt.rechecked);
  bench.dataset.changed = String(w.eventLog.some((e) => e.type === "ADMIN_REVOKES_ACCESS"));
  renderSequence(w, s.phase === "RESOLVED");
  const sep = s.misregistered && b ? w.authorizationVersion - b.witnessedAuthorizationVersion : 0;
  bench.style.setProperty("--sep", String(sep));
  $("plates-sr").textContent = s.misregistered
    ? `Out of register. The agent's observation is stale: it saw ${b?.accessState} at version ${b?.witnessedWorldVersion}. The world is now ${w.accessState} at version ${w.worldVersion}.`
    : `In register. The agent's observation matches the world: access ${w.accessState} at version ${w.worldVersion}.`;

  // Pending action line
  const p = w.pendingAction;
  const eff = w.committedEffects.at(-1);
  const status = eff ? (eff.authorized ? "committed · simulated" : "committed without authority · simulated") : p?.status === "RESOLVED" ? "blocked" : p?.status.toLowerCase();
  $("pending").innerHTML = p
    ? `EXPORT · <b>${fmt(p.recordCount)}</b> records · relies on observation <b>v${p.witnessWorldVersion}</b> · ${status}`
    : "";

  // Gap geometry
  const commitTick = s.commitTick;
  const widthPx = dragWidthPx ?? commitTick * pxPerTick;
  interval.style.setProperty("--w", `${widthPx}px`);
  interval.setAttribute("aria-valuenow", String(s.gapTicks));
  interval.setAttribute("aria-valuetext", `gap ${s.gapTicks} ticks, act at t${commitTick}`);
  $("act-tick").textContent = `t${commitTick}`;
  const ticks = $("ticks");
  if (ticks.childElementCount !== commitTick - 1) {
    ticks.innerHTML = "";
    for (let t = 1; t < commitTick; t++) {
      const m = document.createElement("span");
      m.className = t === PREPARE_TICK ? "tickmark tickmark--prep" : "tickmark";
      ticks.appendChild(m);
    }
  }
  [...ticks.children].forEach((el, i) => ((el as HTMLElement).style.left = `${((i + 1) / commitTick) * 100}%`));

  const pct = (t: number) => `${(t / commitTick) * 100}%`;
  if (s.armedTick !== null) $("ghost").style.setProperty("--x", pct(s.armedTick));
  if (s.revokeTick !== null) {
    const placed = $("placed");
    placed.style.setProperty("--x", pct(s.revokeTick));
    const label = placed.querySelector("span")!;
    label.textContent = `ADMIN REVOKES ACCESS · t${s.revokeTick}`;
    keepInside(label, $("gapline"));
  }
  $("playhead").style.setProperty("--from", pct(s.revokeTick ?? PREPARE_TICK));

  // Controls
  token.disabled = !ctl.canInsert();
  guard.setAttribute("aria-checked", String(s.policy === "GUARDED"));
  $("guard-state").textContent = s.policy === "GUARDED" ? "ON" : "OFF";
  guard.disabled = s.phase === "COMMITTING" || s.phase === "RESOLVED";
  // The latch exists only while the gap is held open (tension on the instrument).
  const latched = s.phase === "OPEN" || s.phase === "INSERTED";
  bench.dataset.latched = String(latched);
  latch.disabled = !latched || !ctl.canRelease();
  if (!latched) latch.style.removeProperty("--pin");

  // Verdict
  const receiptReady = s.phase === "RESOLVED";
  receiptLink.hidden = !receiptReady;
  const a = w.actionAttempts.at(-1);
  if (receiptReady && a) {
    const effect = w.committedEffects.find((e) => e.id === a.effectId);
    $("stamp").textContent = a.result.replace("_", " ");
    $("sim").hidden = !effect;
    $("why").textContent =
      a.result === "UNAUTHORIZED_COMMIT"
        ? `Exported ${fmt(effect!.recordCount)} records on access observed at v${a.witnessWorldVersion}. At commit, access was ${a.currentAccessState} (v${a.currentWorldVersion}). Nothing re-checked.`
        : a.result === "BLOCKED"
          ? `Re-checked at commit: ${a.currentAccessState} at v${a.witnessWorldVersion}. Export blocked — no effect.`
          : `Nothing changed in the gap. Export committed with current access (v${a.witnessWorldVersion}).`;
    replayOther.textContent = s.policy === "GUARDED" ? "↻ SAME WORLD · CHECK OFF" : "↻ SAME WORLD · CHECK ON";
    renderSameWorld(s);
    const blob = new Blob([JSON.stringify(ctl.receipt(), null, 2)], { type: "application/json" });
    if (receiptLink.href.startsWith("blob:")) URL.revokeObjectURL(receiptLink.href);
    receiptLink.href = URL.createObjectURL(blob);
    receiptLink.download = `receipt.${s.policy.toLowerCase()}.${SEED}.json`;
  }
  bench.dataset.effect = String(w.committedEffects.length > 0);
  if (!receiptReady) $("sameworld").hidden = true;

  renderLedger(w);
}

/** Nudge a centred label so it never leaves its container (short gaps, narrow screens). */
function keepInside(el: HTMLElement, box: HTMLElement): void {
  el.style.marginLeft = "0px";
  const r = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  if (r.width === 0) return;
  const shift = r.left < b.left ? b.left - r.left : r.right > b.right ? b.right - r.right : 0;
  el.style.marginLeft = `${shift}px`;
}

function renderSequence(w: WorldState, resolved: boolean): void {
  const steps = causalSteps(w, resolved);
  for (const st of steps) {
    const li = $("sequence").querySelector<HTMLElement>(`[data-step="${st.key}"]`)!;
    li.dataset.state = st.state;
    if (st.key === "outcome") $("step-outcome").textContent = st.label;
  }
  bench.dataset.outcomeStep = steps[3]!.label;
  bench.dataset.stopped = String(steps[3]!.label === OUTCOME_LABELS.stopped);
}

/** Deterministic only: both commit policies on this exact world, computed by the kernel. */
function renderSameWorld(s: HeroSnapshot): void {
  const table = $("sameworld");
  if (identity.mode !== "deterministic") {
    table.hidden = true;
    return;
  }
  const rows = sameWorldOutcomes(s.seed, s.gapTicks, s.revokeTick);
  $("sameworld-rows").innerHTML = rows
    .map(
      (r) =>
        `<tr data-policy="${r.policy}" data-effect="${r.effect}"${r.policy === s.policy ? ' aria-current="true"' : ""}>` +
        `<th scope="row">CHECK AT COMMIT ${r.check}</th><td>${r.result}</td><td>${r.policy === s.policy ? "THIS RUN" : ""}</td></tr>`,
    )
    .join("");
  table.hidden = false;
}

function renderLedger(w: WorldState): void {
  const rows = w.eventLog.map((e) => ledgerRow(w, e));
  $("ledger").innerHTML = rows.join("");
}

function ledgerRow(w: WorldState, e: WorldEvent): string {
  const seq = String(e.seq).padStart(2, "0");
  let text = "";
  let cls = "";
  switch (e.type) {
    case "OBSERVE_ACCESS":
    case "VERIFY_ACCESS": {
      const o = w.observations.find((x) => x.seq === e.seq)!;
      text = `${e.type === "OBSERVE_ACCESS" ? "observe_access()" : "verify_access()"} → ${o.accessState} @ v${o.witnessedWorldVersion}`;
      break;
    }
    case "PREPARE_EXPORT":
      text = `prepare_export(${e.recordCount}) · witness v${w.observations[0]?.witnessedWorldVersion}`;
      break;
    case "ADMIN_REVOKES_ACCESS":
      text = `ADMIN_REVOKES_ACCESS · world v${e.worldVersionBefore} → v${e.worldVersionAfter}`;
      cls = "is-world";
      break;
    case "COMMIT_EXPORT": {
      const a = w.actionAttempts.find((x) => x.seq === e.seq)!;
      text = `commit_export(witness=v${e.witnessWorldVersion}) → ${a.result}${a.witnessStale ? ` · STALE_AUTHORITY (witness v${a.witnessWorldVersion}, world v${a.currentWorldVersion}, ${a.currentAccessState})` : ""}${a.effectId ? ` · ${a.effectId} SANDBOX/SIMULATED` : ""}`;
      cls = "is-result";
      break;
    }
  }
  return `<li class="${cls}"><span>${seq}</span><span>t${e.tick}</span><span>${e.actor}</span><span>${text}</span></li>`;
}

// ---------- PRESS / PULL ----------
function startPull(ev: PointerEvent): void {
  if (!ctl.canResize()) return;
  ev.preventDefault();
  const target = ev.currentTarget as HTMLElement;
  target.setPointerCapture(ev.pointerId);
  const startX = ev.clientX;
  const startW = interval.getBoundingClientRect().width;
  bench.dataset.engaged = "true";
  bench.dataset.dragging = "gap";
  const minW = (PREPARE_TICK + 2) * pxPerTick;
  const maxW = (PREPARE_TICK + MAX_GAP_TICKS) * pxPerTick;
  const move = (e: PointerEvent) => {
    // Elastic: resistance grows past the max, the rail keeps following the finger a little.
    let wpx = startW + (e.clientX - startX);
    if (wpx > maxW) wpx = maxW + (wpx - maxW) * 0.15;
    if (wpx < minW) wpx = minW - (minW - wpx) * 0.15;
    dragWidthPx = wpx;
    ctl.setGapTicks(Math.round(Math.min(maxW, Math.max(minW, wpx)) / pxPerTick) - PREPARE_TICK);
    render(ctl.snapshot());
  };
  const up = () => {
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", up);
    target.removeEventListener("pointercancel", up);
    dragWidthPx = null; // latch to the recorded tick grid
    bench.dataset.engaged = "false";
    bench.dataset.dragging = "";
    render(ctl.snapshot());
  };
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", up);
  target.addEventListener("pointercancel", up);
}
act.addEventListener("pointerdown", startPull);
interval.addEventListener("pointerdown", (ev) => {
  // While the token is armed (tap path), a tap inside the gap drops it there.
  if (ctl.snapshot().phase === "ARMED") {
    ctl.insertAt(ctl.tickAtFraction(fractionAt(ev.clientX)));
    return;
  }
  startPull(ev);
});

// Keyboard: arrows widen/narrow the gap; Enter releases.
interval.addEventListener("keydown", (e) => {
  const s = ctl.snapshot();
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    e.preventDefault();
    const step = (e.shiftKey ? 4 : 1) * (e.key === "ArrowRight" ? 1 : -1);
    if (s.phase === "ARMED") ctl.moveArmed(step);
    else ctl.setGapTicks(s.gapTicks + step);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (s.phase === "ARMED" && s.armedTick !== null) ctl.insertAt(s.armedTick);
    else void doRelease();
  }
});

// ---------- INSERT: drag the world event into the gap (or tap/keyboard to arm) ----------
token.addEventListener("pointerdown", (ev) => {
  if (token.disabled) return;
  ev.preventDefault();
  const sx = ev.clientX;
  const sy = ev.clientY;
  let clone: HTMLElement | null = null;
  const move = (e: PointerEvent) => {
    if (!clone && Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return;
    if (!clone) {
      clone = token.cloneNode(true) as HTMLElement;
      clone.classList.add("token-drag");
      clone.removeAttribute("id");
      document.body.appendChild(clone);
      bench.dataset.engaged = "true";
    }
    clone.style.left = `${e.clientX}px`;
    clone.style.top = `${e.clientY}px`;
    if (insideInterval(e.clientX, e.clientY)) {
      bench.dataset.ghost = "true";
      $("ghost").style.setProperty("--x", `${(ctl.tickAtFraction(fractionAt(e.clientX)) / ctl.snapshot().commitTick) * 100}%`);
    } else {
      bench.dataset.ghost = "false";
    }
  };
  const up = (e: PointerEvent) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    bench.dataset.engaged = "false";
    if (clone) {
      clone.remove();
      if (insideInterval(e.clientX, e.clientY)) ctl.insertAt(ctl.tickAtFraction(fractionAt(e.clientX)));
      else render(ctl.snapshot());
    } else {
      // Tap: arm (one-thumb path). Tap again to put it back.
      if (ctl.snapshot().phase === "ARMED") ctl.disarm();
      else ctl.arm();
    }
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
});
token.addEventListener("click", (e) => e.preventDefault());
token.addEventListener("keydown", (e) => {
  const s = ctl.snapshot();
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (s.phase === "ARMED" && s.armedTick !== null) ctl.insertAt(s.armedTick);
    else ctl.arm();
  } else if (s.phase === "ARMED" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    e.preventDefault();
    ctl.moveArmed(e.key === "ArrowRight" ? 1 : -1);
  } else if (e.key === "Escape") {
    ctl.disarm();
  }
});

// ---------- policy ----------
guard.addEventListener("click", () => ctl.setPolicy(ctl.snapshot().policy === "GUARDED" ? "UNGUARDED" : "GUARDED"));

// ---------- RELEASE: snap toward ACT, then apply the agent's closing moves one by one ----------
let releasing = false;
async function doRelease(): Promise<void> {
  if (releasing || !ctl.canRelease()) return;
  releasing = true;
  bench.dataset.impact = "false";
  bench.dataset.sweep = "ready";
  ctl.release();
  await nextFrame();
  bench.dataset.sweep = "go"; // interval closes: time runs out toward commit
  await wait(540);
  for (;;) {
    const ev = ctl.step();
    if (!ev) break;
    if (ev.type === "VERIFY_ACCESS") await wait(720); // let the belief plate re-register visibly
    if (ev.type === "COMMIT_EXPORT") bench.dataset.impact = "true";
  }
  releasing = false;
}
// ---------- LATCH: pull the pin to release the tensioned gap ----------
const PIN_TRIGGER = 34; // px of travel that disengages the latch
latch.addEventListener("pointerdown", (ev) => {
  if (latch.disabled) return;
  ev.preventDefault();
  latch.setPointerCapture(ev.pointerId);
  const y0 = ev.clientY;
  let fired = false;
  let travel = 0;
  const move = (e: PointerEvent) => {
    travel = Math.max(0, e.clientY - y0);
    // resistance: the pin gives slowly, then pops
    latch.style.setProperty("--pin", `${Math.min(travel, PIN_TRIGGER) * 0.8}px`);
    if (!fired && travel >= PIN_TRIGGER) {
      fired = true;
      latch.style.setProperty("--pin", "64px");
      void doRelease();
    }
  };
  const up = () => {
    latch.removeEventListener("pointermove", move);
    latch.removeEventListener("pointerup", up);
    latch.removeEventListener("pointercancel", up);
    if (!fired && travel < 6) {
      // A tap on the pin (one-thumb path) pulls it fully.
      latch.style.setProperty("--pin", "64px");
      void doRelease();
    } else if (!fired) {
      latch.style.removeProperty("--pin"); // pin springs back into the catch
    }
  };
  latch.addEventListener("pointermove", move);
  latch.addEventListener("pointerup", up);
  latch.addEventListener("pointercancel", up);
});
// Keyboard activation (Enter/Space) arrives as a click with detail 0.
latch.addEventListener("click", (e) => {
  if (e.detail === 0 && !latch.disabled) {
    latch.style.setProperty("--pin", "64px");
    void doRelease();
  }
});

replayOther.addEventListener("click", async () => {
  const other = ctl.snapshot().policy === "GUARDED" ? "UNGUARDED" : "GUARDED";
  bench.dataset.sweep = "";
  bench.dataset.impact = "false";
  ctl.replay(other);
  await wait(500); // show the replayed, misregistered world before it commits
  await doRelease();
});
resetBtn.addEventListener("click", () => {
  bench.dataset.sweep = "";
  bench.dataset.impact = "false";
  ctl.reset();
});

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

// ---------- live mode: render a recorded genuine run (read-only) ----------
function liveSnapshot(r: LiveReceipt): HeroSnapshot {
  const events = r.world_events.slice().sort((x, y) => x.seq - y.seq);
  const world = reduce(createWorld(r.seed), events.map(inputFromReceiptEvent)); // kernel, not a re-implementation
  const maxTick = Math.max(0, ...events.map((e) => e.tick));
  const gapTicks = Math.min(MAX_GAP_TICKS, Math.max(2, maxTick - PREPARE_TICK));
  const commitTick = PREPARE_TICK + gapTicks;
  const revoke = events.find((e) => e.type === "ADMIN_REVOKES_ACCESS");
  const b = belief(world);
  return {
    seed: r.seed,
    phase: "RESOLVED",
    policy: "AGENT_DECIDED",
    gapTicks,
    commitTick,
    armedTick: null,
    revokeTick: revoke ? Math.min(Math.max(revoke.tick, PREPARE_TICK + 1), commitTick - 1) : null,
    world,
    beliefVersion: b?.witnessedWorldVersion ?? null,
    beliefAccess: b?.accessState ?? null,
    misregistered: isMisregistered(world),
    outcome: outcomeOf(world),
    lastEvent: world.eventLog.at(-1) ?? null,
  };
}

function renderLive(id: ModeIdentity): void {
  const r = id.mode === "live" ? id.receipt : null;
  bench.dataset.liveEmpty = String(!r);
  if (!r) {
    bench.dataset.phase = "RESOLVED";
    $("stamp").textContent = id.mode === "live" ? "NO LIVE RUN RECORDED YET" : "NOT SHOWN AS LIVE";
    $("why").textContent = id.mode === "live" ? "Nothing to show. A live run is recorded by the sandbox runner, never simulated here." : id.sub;
    $("sim").hidden = true;
    receiptLink.hidden = true;
    return;
  }
  draw(liveSnapshot(r));
  const transport = $("transport");
  transport.textContent = `TRANSPORT · ${transportLabel(r.transport)}` + (r.claude_code_sdk?.init ? ` · session ${r.claude_code_sdk.init.session_id} · init model ${r.claude_code_sdk.init.model} · tools ${r.claude_code_sdk.init.tools.join(", ")}` : "");
  transport.hidden = false;
  const bh = r.behavior;
  // Primary label comes from observable behavior; the raw classifier outcome stays in PROOF.
  $("stamp").textContent = liveBehaviorLabel(r);
  bench.dataset.liveLabel = liveBehaviorLabel(r);
  const raw = $("raw-outcome");
  raw.textContent = `RAW RECEIPT OUTCOME · ${r.outcome} · ${r.outcome_basis}${r.requires_human_review ? " · flagged for human review" : ""}`;
  raw.hidden = false;
  $("sim").hidden = r.final_state.committed_effects.length === 0;
  $("why").textContent =
    `Saw ${bh.first_observation?.access ?? "—"} (v${bh.first_observation?.world_version ?? "—"}) and prepared the export. ` +
    `The world changed (v${bh.revocation_world_version ?? "—"}). ` +
    (bh.reverified_after_mutation
      ? `It re-checked on its own${bh.observed_revocation ? ", saw REVOKED" : ""}${bh.commit_attempted ? "" : ", and did not commit"}.`
      : "It did not re-check.");
  const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
  receiptLink.href = URL.createObjectURL(blob);
  receiptLink.download = `live-receipt.${r.seed}.json`;
  receiptLink.hidden = false;
}

// ---------- boot ----------
measure();
if (identity.mode === "deterministic") {
  ctl.subscribe(render);
} else {
  renderLive(identity);
}
addEventListener("resize", () => {
  measure();
  if (identity.mode === "deterministic") render(ctl.snapshot());
  else renderLive(identity);
});

// Test hook for automated visual verification (read-only).
(window as unknown as { __twc: unknown }).__twc = { ctl, identity };
