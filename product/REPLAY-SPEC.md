# REPLAY SPEC

Replay is an **evidence strip**, not a trace viewer. Source of truth: the receipt's `steps` only.

## Sources (`#replay/<source>`)
- `last` — the visitor's last Lab/Challenge run (in memory)
- `canonical-unchecked` / `canonical-checked` — `evidence/runs/deterministic/authority-expired.{A-unguarded,B-guarded}.json`, via the same kernel-receipt adapter
- `opus` — the recorded genuine receipt, via `labReceiptFromLive` (file never modified)

## Frames
One frame per observable step, captioned `t<tick> · WHAT THE AGENT SAW / WHAT IT PREPARED / WHAT THE WORLD
BECAME / WHAT IT CHECKED / WHAT IT DID`; recorded runs also show the tool name (`observe_access`…). Each frame
renders the world object from `objectStateAt(receipt, i)`: AGENT SAW (cyan ghost) vs WORLD NOW (solid), a
DIVERGED marker only when `divergent`, the outcome stamp only on the final frame.

## Controls
Contact-sheet frame buttons; a film-strip range (←/→/Home/End); PREV/NEXT (48 px). Swipe scrolls the strip on
mobile, and buttons always exist. PROOF (collapsed) holds provenance, raw result, the step list and the receipt JSON.

## Guarantees (tested)
`verifyReplay`: version chain continuous; divergence only after a mutation; divergence flag consistent;
outcome follows from steps; `private_reasoning: NOT_RECORDED`. Canonical receipts replay to their recorded
outcome and kernel state. The Opus replay reads `observe_access → prepare_export → WORLD CHANGED → verify_access →
STOP` with label `RE-VERIFIED · STOPPED BEFORE COMMIT`; raw `REFUSED` only in PROOF.
