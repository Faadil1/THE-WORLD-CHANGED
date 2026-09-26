# 15-SECOND SILENT STORYBOARD — THE WORLD CHANGED

**Status:** STORYBOARDED + MACHINE-VALIDATED (not yet human-validated)
**Source:** the existing hero, driven by real pointer gestures — `tools/storyboard.py`
**Mode shown:** `DETERMINISTIC SANDBOX · SCRIPTED AGENT — NOT A LIVE MODEL` (visible in every frame, including the end card)
**Sound:** none

Evidence: `evidence/storyboard/comprehension-v0/` — `clip-15s.mp4` + one frame per beat for
`desktop` (1080×1350, 4:5), `mobile` (390×844) and `desktop-reduced-motion`; contact sheets; `storyboard.json`
with the DOM/kernel assertions checked at each beat.

| Time | Beat | On screen (all kernel-driven) | Motion's job |
|---|---|---|---|
| 0–3s | Correct observation | BELIEF and REALITY in register: one `GRANTED` surface. `BELIEF · agent saw v1` / `REALITY · world now v1`. Register step 1 `OBSERVED CORRECTLY` lit. `CHECK AT COMMIT ON`. | none (still) |
| 3–6s | Pull the gap | ACT handle dragged right; the interval stretches under tension; pull-pin appears. Plates **stay registered**. | gap width = time in which the world *could* change |
| 6–8s | Revoke access | `ADMIN REVOKES ACCESS` dragged into the gap and dropped. REALITY becomes `REVOKED`, world v2. | event placement = when the world changed |
| 8–11s | Divergence | Plates split: hollow cyan `GRANTED` (BELIEF, flagged **STALE**) over solid magenta `REVOKED` (REALITY, flagged **CHANGED**). Steps 2–3 `WORLD CHANGED → OBSERVATION STALE` lit. | plate separation = disagreement caused by the mutation |
| 11–14s | Verify and stop | Pin pulled; the interval snaps to ACT; commit-time re-check snaps BELIEF back into register (`agent re-checked v2`); ACT becomes a square stop mark; stamp `BLOCKED`; step 4 `RE-CHECKED → STOPPED`; SAME WORLD rows: `CHECK OFF → EXPORTED ON STALE ACCESS · SIMULATED` / `CHECK ON → STOPPED · NO EFFECT · THIS RUN`. | snap-to-register = successful refresh; stop mark = blocked irreversible effect |
| 14–15s | THE WORLD CHANGED | End card: misregistered title (cyan contour over magenta), registration marks, mode chip. Storyboard-only overlay, not part of the product. | none |

## What a silent viewer should be able to say

> It saw GRANTED. Someone revoked access while it was waiting. What it saw went stale.
> Because it re-checked, it stopped — without the check it would have exported anyway.

## Rules held

- Pulling the gap alone never misregisters (asserted at 5.4s in every variant).
- The same-world contrast is computed by the kernel for this exact world, never hard-coded.
- The live Opus run is **not** used in this clip, so deterministic and live footage are never mixed.
  A live cut must use `?mode=live`, whose primary label is `RE-VERIFIED · STOPPED BEFORE COMMIT`.
- Reduced motion: discrete state changes; every beat still reads, since state is carried by text and
  stroke/fill, not by motion or colour.

## Not yet validated

Machine checks prove the frames carry the right state at the right time. They do not prove a first-time
viewer understands it. That requires the first-impression test in `product/HUMAN-COMPREHENSION-GATE.md`.
