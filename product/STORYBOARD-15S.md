# 15-SECOND SILENT STORYBOARD — THE WORLD CHANGED

**Status:** VISUAL PASS 2: STORYBOARDED + MACHINE-VALIDATED (not yet human-validated)
**Source:** the existing hero, driven by real pointer gestures — `tools/storyboard.py`
**Mode shown:** `DETERMINISTIC SANDBOX · SCRIPTED AGENT — NOT A LIVE MODEL` (visible in every frame, including the end card)
**Sound:** none

Evidence: `evidence/storyboard/visual-pass-2/` (pass 1: `evidence/storyboard/comprehension-v0/`) — `clip-15s.mp4` + one frame per beat for
`desktop` (1080×1350, 4:5), `mobile` (390×844) and `desktop-reduced-motion`; contact sheets; `storyboard.json`
with the DOM/kernel assertions checked at each beat.

| Time | Beat | On screen (all kernel-driven) | Motion's job |
|---|---|---|---|
| 0–3s | IT WAS TRUE. | Huge cobalt headline **IT WAS TRUE.**; the access pass hangs from its lanyard: ACCESS **GRANTED**, lime **VALID** sticker, `WORLD NOW · v1`; *agent saw this*. CHECK AGAIN is on. | none |
| 3–6s | Pull the gap | ACT stub dragged right; the perforated ticket tears open, thins and shows its fibres; PULL tab drops. The pass does **not** change. | tension = time in which the world could change |
| 6–8s | NOT ANYMORE. | Coral **ADMIN REVOKES ACCESS** sticker dropped into the tear (*world changed here*); **NO LONGER VALID** slams onto the pass; band turns magenta; headline **NOT ANYMORE.** | slam = the world changed |
| 8–11s | Old observation | Cyan ghost pass lifted out of register over the magenta one: `AGENT SAW · v1 · OLD` / GRANTED vs `WORLD NOW · v2 · CHANGED` / REVOKED. Punch row: **PASS IS OLD**. | offset = the agent's pass is now old |
| 11–14s | Check again, stop | PULL tab; lime scanner reads the current pass; ghost snaps into register; violet **STOPPED** stamp; ACT hole turns square; headline **THE WORLD CHANGED.**; verdict **RE-CHECKED · STOPPED**; SAME WORLD, TWICE rows. | scan = the check reads now; snap = refreshed; stamp = no effect |
| 14–15s | THE WORLD CHANGED. | Full-frame misprinted title (cyan contour over magenta) + mode chip. Storyboard-only overlay. | none |

On the phone variant the "camera" scrolls between the pass and the ticket (the pass is the hero; the ticket is below it).

## What a silent viewer should be able to say

> It had a valid pass. While it waited, the pass was cancelled. It was still holding the old one.
> It checked again, saw it was revoked, and stopped. Without the check it would have used the old pass.

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
