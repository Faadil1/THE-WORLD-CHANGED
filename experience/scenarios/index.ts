/**
 * Scenario registry. ACCESS runs on the canonical kernel; CALENDAR and DOCUMENT are
 * SIMULATED product scenarios on the sandbox engine (no real-model claim attached).
 */
import { ACCESS } from "./access";
import { runSandbox } from "./sandbox-engine";
import type { ScenarioCopy, ScenarioDefinition, ScenarioId } from "./types";

export const CALENDAR_COPY: ScenarioCopy = {
  object: "CALENDAR SLOT",
  field: "15:00 SLOT",
  validValue: "AVAILABLE",
  changedValue: "BOOKED",
  trueHeadline: "IT WAS FREE.",
  changedHeadline: "NOT ANYMORE.",
  finalHeadline: "THE WORLD CHANGED.",
  mutation: "SOMEONE ELSE BOOKS IT",
  cancel: "TAKEN",
  action: "CONFIRM MEETING",
  staleOutcome: "DOUBLE-BOOKED",
  staleEffect: "INVITE SENT · SIMULATED",
  stoppedOutcome: "RE-CHECKED · STOPPED",
  stoppedDetail: "SLOT TAKEN · REFRESH NEEDED",
  validOutcome: "STILL FREE · CONFIRMED",
  sawNote: "agent saw this",
};

export const DOCUMENT_COPY: ScenarioCopy = {
  object: "DOCUMENT",
  field: "VERSION",
  validValue: "CURRENT",
  changedValue: "SUPERSEDED",
  trueHeadline: "IT WAS THE LATEST.",
  changedHeadline: "NOT ANYMORE.",
  finalHeadline: "THE WORLD CHANGED.",
  mutation: "NEW VERSION REPLACES IT",
  cancel: "REPLACED",
  action: "SEND THIS VERSION",
  staleOutcome: "OUTDATED VERSION SENT",
  staleEffect: "OLD DRAFT SENT · SIMULATED",
  stoppedOutcome: "RE-CHECKED · STOPPED",
  stoppedDetail: "NEWER VERSION FOUND · REFRESH NEEDED",
  validOutcome: "STILL LATEST · SENT",
  sawNote: "agent saw this",
};

export const CALENDAR: ScenarioDefinition = {
  id: "calendar",
  title: "CALENDAR SLOT",
  provenance: "SANDBOX_SIMULATION",
  visual: { object: "calendar", accent: "var(--coral)" },
  copy: CALENDAR_COPY,
  run: (input) => runSandbox("calendar", CALENDAR_COPY, input),
};

export const DOCUMENT: ScenarioDefinition = {
  id: "document",
  title: "DOCUMENT",
  provenance: "SANDBOX_SIMULATION",
  visual: { object: "document", accent: "var(--violet)" },
  copy: DOCUMENT_COPY,
  run: (input) => runSandbox("document", DOCUMENT_COPY, input),
};

export const SCENARIOS: Readonly<Record<ScenarioId, ScenarioDefinition>> = Object.freeze({ access: ACCESS, calendar: CALENDAR, document: DOCUMENT });
export const SCENARIO_ORDER: ScenarioId[] = ["access", "calendar", "document"];

export function scenario(id: string): ScenarioDefinition {
  const s = (SCENARIOS as Record<string, ScenarioDefinition>)[id];
  if (!s) throw new Error(`unknown scenario ${id}`);
  return s;
}

/** SAME WORLD, TWO OUTCOMES: identical seed, gap and mutation; only the verification policy differs. */
export function sameWorld(def: ScenarioDefinition, seed: string, gapTicks: number, mutationTick: number | null) {
  const base = { seed, gapTicks, mutationTick, mode: "LAB" as const };
  return { unchecked: def.run({ ...base, policy: "UNGUARDED" }), checked: def.run({ ...base, policy: "GUARDED" }) };
}
