/**
 * LIVE AGENT LAB — the first authentic specimen.
 *
 * Shows the RECORDED GENUINE RUN of Claude Opus 5.5 (Claude Code SDK, four sandbox tools) and
 * replays its observable steps. It is never re-executed here and never labelled LIVE EXECUTION.
 * The raw classifier outcome (REFUSED) appears only inside PROOF.
 *
 * Live execution needs the operator's local Claude Code login (live/run-live.ts). A static
 * public site has no secure executor, so RUN LIVE is shown as unavailable — honestly.
 */
import { isGenuineLiveRun, type LiveReceipt } from "../../live/receipt";
import { liveBehaviorLabel } from "../causal";
import { transportLabel } from "../mode";
import { genuineLiveReceipt, renderReplay } from "./replay";
import { esc, h } from "./ui";

export const RECORDED_CHIP = "RECORDED GENUINE RUN · CLAUDE OPUS 5.5 · NOT RUNNING NOW";

/** Where live execution stands for this build. The browser build never has an executor. */
export function liveAvailability(): { available: false; reason: string } {
  return {
    available: false,
    reason:
      "Live runs use the operator's own Claude Code login through a local runner. This public, static build has no secure way to hold that login, so it replays the recorded run instead.",
  };
}

export function renderLive(root: HTMLElement): () => void {
  const live: LiveReceipt | null = genuineLiveReceipt();
  const view = h("section", "lab-live");
  if (!live || !isGenuineLiveRun(live)) {
    view.innerHTML = `<h2 class="lab-headline"><span class="lab-headline__text">NO GENUINE RUN RECORDED.</span></h2>`;
    root.append(view);
    return () => {};
  }
  const init = live.claude_code_sdk?.init;
  view.innerHTML = `
    <header class="specimen">
      <p class="specimen__kicker">SPECIMEN 001</p>
      <h2 class="specimen__title"><span>REAL AGENT RUN.</span></h2>
      <div class="specimen__id">
        <p class="specimen__model">CLAUDE OPUS 5.5</p>
        <p class="specimen__recorded"><b>RECORDED GENUINE RUN</b><b>NOT RUNNING NOW</b></p>
      </div>
      <p class="specimen__label">${esc(labelOf(live))}</p>
      <p class="specimen__meta">${esc(transportLabel(live.transport))} <i>·</i> 4 SANDBOX TOOLS <i>·</i> ${esc(live.started_at.slice(0, 10))} <i>·</i> replayed from the stored receipt</p>
    </header>`;
  const replayHost = h("div", "specimen__replay");
  view.append(replayHost);
  root.append(view);
  const cleanup = renderReplay(replayHost, "opus", { embedded: true });

  const avail = liveAvailability();
  const run = h("div", "runlive");
  run.innerHTML = `
    <button class="runlive__btn" type="button" disabled aria-describedby="runlive-why">RUN LIVE</button>
    <p class="runlive__state"><b>LIVE EXECUTION · UNAVAILABLE ON THIS BUILD</b></p>
    <p class="runlive__why" id="runlive-why">${esc(avail.reason)} Operator route: <code>npm run live -- &lt;seed&gt;</code>.</p>`;
  view.append(run);

  const proof = h("details", "lab-proof");
  const tools = (live.observable_tool_calls ?? []).map((c) => c.name).join(" → ");
  const facts: Array<[string, string]> = [
    ["provenance", "RECORDED_GENUINE_RUN (replayed from the stored receipt; not re-executed)"],
    ["raw receipt outcome", `${live.outcome} · ${live.outcome_basis}`],
    ["presentation label", labelOf(live)],
    ["transport", transportLabel(live.transport)],
    ["model requested", live.model],
    ["model reported", live.model_reported_by_api.join(", ")],
    ["init tools", (init?.tools ?? []).join(", ")],
    ["tool sequence", tools],
    ["permission denials", String(live.claude_code_sdk?.permission_denials.length ?? 0)],
    ["kernel replay", `${live.kernel_replay.ok ? "ok" : "FAILED"} · ${live.kernel_replay.replay_hash}`],
    ["private reasoning", live.private_reasoning],
  ];
  proof.innerHTML =
    `<summary>PROOF <span>raw receipt · tool calls · world events</span></summary>` +
    `<dl class="lab-proof__facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` +
    `<pre class="lab-proof__json">${esc(JSON.stringify({ world_events: live.world_events, observable_tool_calls: live.observable_tool_calls, tool_results: live.tool_results, outcome: live.outcome }, null, 2))}</pre>` +
    `<a class="lab-link" download="live-receipt.${esc(live.seed)}.json">FULL RECEIPT.JSON</a>`;
  proof.querySelector("a")!.href = URL.createObjectURL(new Blob([JSON.stringify(live, null, 2)], { type: "application/json" }));
  view.append(proof);
  return cleanup;
}

function labelOf(live: LiveReceipt): string {
  return liveBehaviorLabel(live); // behavior-derived, never the raw classifier outcome
}
