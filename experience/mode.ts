/**
 * Mode identity. Pure, DOM-free, so it can be tested exhaustively.
 * A run is labeled LIVE only when a receipt passes validation AND provenance checks.
 */
import { isGenuineLiveRun, validateLiveReceipt, type LiveReceipt } from "../live/receipt";

export const DETERMINISTIC_LABEL = "DETERMINISTIC SANDBOX · SCRIPTED AGENT — NOT A LIVE MODEL";
export const LIVE_LABEL = "LIVE MODEL · CLAUDE OPUS 5.5 · SANDBOX TOOLS ONLY";
export const UNVERIFIED_LABEL = "UNVERIFIED RECEIPT — NOT SHOWN AS LIVE";

export type ModeIdentity =
  | { mode: "deterministic"; label: typeof DETERMINISTIC_LABEL; sub: string }
  | { mode: "live"; label: typeof LIVE_LABEL; sub: string; receipt: LiveReceipt | null }
  | { mode: "unverified"; label: typeof UNVERIFIED_LABEL; sub: string };

export function deterministicIdentity(seed: string): ModeIdentity {
  return { mode: "deterministic", label: DETERMINISTIC_LABEL, sub: `seed ${seed}` };
}

/** `receipt === null` means live mode with no recorded run yet. */
export function liveIdentity(receipt: unknown | null): ModeIdentity {
  if (receipt === null) return { mode: "live", label: LIVE_LABEL, sub: "no live run recorded yet", receipt: null };
  const v = validateLiveReceipt(receipt);
  if (!v.ok) return { mode: "unverified", label: UNVERIFIED_LABEL, sub: v.reason };
  if (!isGenuineLiveRun(v.receipt)) {
    return { mode: "unverified", label: UNVERIFIED_LABEL, sub: `transport ${v.receipt.transport} · model ${v.receipt.model}` };
  }
  return {
    mode: "live",
    label: LIVE_LABEL,
    sub: `recorded run ${v.receipt.started_at} · ${v.receipt.model_reported_by_api.join(", ")} · seed ${v.receipt.seed}`,
    receipt: v.receipt,
  };
}
