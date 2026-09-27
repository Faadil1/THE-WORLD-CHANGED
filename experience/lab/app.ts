/**
 * THE LAB — progressive discovery behind the hero.
 *
 *   (hero) ─ outcome ─> CHANGE THE WORLD AGAIN ─> #lab
 *   #lab                 PICK A WORLD
 *   #lab/<world>         experiment          #lab/<world>/same   SAME WORLD, TWO OUTCOMES
 *   #challenge[/<world>] CAN YOU CHANGE THE WORLD BEFORE IT ACTS?
 *   #replay[/<source>]   evidence strip      #live               REAL AGENT RUN (recorded)
 *
 * Hash routing only; the hero at "/" is untouched until the visitor finishes an outcome.
 */
import "./lab.css";
import { renderChallenge } from "./challenge";
import { renderExperiment } from "./experiment";
import { RECORDED_CHIP, renderLive } from "./live";
import { renderReplay, replaySource } from "./replay";
import { renderSameWorld } from "./sameworld";
import { reducedMotion } from "./ui";
import { renderWorlds } from "./worlds";
import { route } from "./route";
import { SCENARIOS } from "../scenarios";

export const SANDBOX_CHIP = "DETERMINISTIC SANDBOX · SIMULATED WORLDS — NOT A LIVE MODEL";

const shell = document.createElement("div");
shell.id = "lab";
shell.className = "lab";
shell.hidden = true;
shell.innerHTML = `
  <header class="lab__top">
    <a class="lab__title" href="#">THE WORLD CHANGED</a>
    <span class="lab__chip" id="lab-chip"></span>
    <nav class="lab__tabs" aria-label="Lab">
      <a href="#lab" data-tab="world">WORLD</a>
      <a href="#challenge" data-tab="challenge">CHANGE IT</a>
      <a href="#replay" data-tab="replay">REPLAY</a>
      <a href="#live" data-tab="live">LIVE</a>
    </nav>
  </header>
  <main class="lab__view" id="lab-view" tabindex="-1"></main>`;
document.body.append(shell);
const viewEl = shell.querySelector<HTMLElement>("#lab-view")!;
const chip = shell.querySelector<HTMLElement>("#lab-chip")!;
let cleanup: (() => void) | null = null;

function render(): void {
  const r = route(location.hash);
  if ((r.view === "experiment" || r.view === "same" || (r.view === "challenge" && r.arg)) && !((r as { arg: string }).arg in SCENARIOS)) {
    location.hash = "#lab"; // unknown world: back to the table
    return;
  }
  cleanup?.();
  cleanup = null;
  if (r.view === "hero") {
    document.body.dataset.view = "hero";
    shell.hidden = true;
    return;
  }
  document.body.dataset.view = "lab";
  shell.hidden = false;
  shell.dataset.view = r.view;
  viewEl.innerHTML = "";
  const tab = r.view === "challenge" ? "challenge" : r.view === "replay" ? "replay" : r.view === "live" ? "live" : "world";
  shell.querySelectorAll<HTMLAnchorElement>(".lab__tabs a").forEach((a) => a.setAttribute("aria-current", String(a.dataset.tab === tab)));
  const recorded = r.view === "live" || (r.view === "replay" && replaySource(r.arg)?.receipt.provenance === "RECORDED_GENUINE_RUN");
  chip.textContent = recorded ? RECORDED_CHIP : SANDBOX_CHIP;
  shell.dataset.provenance = recorded ? "recorded" : "sandbox";
  switch (r.view) {
    case "worlds":
      cleanup = renderWorlds(viewEl);
      break;
    case "experiment":
      cleanup = renderExperiment(viewEl, r.arg);
      break;
    case "same":
      cleanup = renderSameWorld(viewEl, r.arg);
      break;
    case "challenge":
      cleanup = renderChallenge(viewEl, r.arg);
      break;
    case "replay":
      cleanup = renderReplay(viewEl, r.arg);
      break;
    case "live":
      cleanup = renderLive(viewEl);
      break;
  }
  window.scrollTo(0, 0);
  viewEl.focus({ preventScroll: true });
}

addEventListener("hashchange", render);
render();

/**
 * The door: after a hero outcome, the finished pass slides off the table and the Lab is
 * underneath. Reduced motion: no slide, straight in.
 */
const door = document.getElementById("door");
door?.addEventListener("click", async (e) => {
  e.preventDefault();
  const pass = document.querySelector<HTMLElement>(".passes");
  const bench = document.getElementById("bench");
  if (pass && !reducedMotion()) {
    bench?.setAttribute("data-leaving", "true");
    await pass.animate(
      [
        { transform: "rotate(-4deg)", opacity: 1 },
        { transform: "translate(18vw, -6vh) rotate(14deg)", opacity: 1, offset: 0.55 },
        { transform: "translate(70vw, 30vh) rotate(38deg)", opacity: 0 },
      ],
      { duration: 620, easing: "cubic-bezier(0.55, 0, 0.85, 0.3)", fill: "forwards" },
    ).finished;
  }
  location.hash = "#lab";
  // Reset the hero's pass for when the visitor comes back.
  requestAnimationFrame(() => {
    pass?.getAnimations().forEach((a) => a.cancel());
    bench?.removeAttribute("data-leaving");
  });
});
