# VISUAL DIRECTION — PASS 2: "ACCESS PASS / REALITY TEAR"

**Status:** IMPLEMENTED · MACHINE-VALIDATED · READY FOR HUMAN TEST (not a comprehension promotion)
**Branch:** `build/comprehension-v0`
**Unchanged:** kernel (`simulation/`), live receipt, causal semantics (`experience/causal.ts`), scenarios,
PROOF contents, live primary label `RE-VERIFIED · STOPPED BEFORE COMMIT`, raw `REFUSED` in PROOF only.

## Concept

The hero object is a giant **access pass** hanging from a lanyard. The page headline *is* the state:

| Kernel state | Headline | The pass |
|---|---|---|
| observed, world unchanged | **IT WAS TRUE.** (cobalt) | one registered credential: ACCESS GRANTED, lime VALID sticker, `WORLD NOW · v1` |
| gap pulled open | IT WAS TRUE. | unchanged (pulling alone never misregisters) |
| `ADMIN_REVOKES_ACCESS` | **NOT ANYMORE.** (coral, cyan misprint) | coral **NO LONGER VALID** sticker slams on; band turns magenta; value REVOKED; `v2 · CHANGED` |
| stale (same state, settled) | NOT ANYMORE. | cyan **ghost pass** lifts out of register: `AGENT SAW · v1 · OLD`, still GRANTED, still VALID |
| check OFF → commit | **THE WORLD CHANGED.** (magenta) | ghost stays out of register; stub punched **OUTDATED PASS USED**; `EXPORT SENT · SIMULATED` ticket ejects from ACT |
| check ON → verify → blocked | **THE WORLD CHANGED.** | lime scanner reads the current pass; ghost snaps back into register; violet double stamp **STOPPED**; ACT hole becomes a square |

THE GAP is a perforated cobalt ticket between two stubs, **LOOK** and **ACT**. Dragging ACT tears it open:
the perforation spreads, the fibres show, the strip pinches in the middle (tension). The world's move is a
coral sticker, **ADMIN REVOKES ACCESS**, dropped into the tear. The release is a lime **PULL** tab.
CHECK AT COMMIT became a gate, **CHECK AGAIN**, which keeps the exact phrase `CHECK AT COMMIT` as its sub-label, because the test protocol asks about it.

## Palette (never colour alone)

cream stock `#f5ecd9` · cobalt `#2335f5` · lime `#c6f432` (VALID) · coral `#ff4b2b` (world change) ·
cyan `#00aee8` (what the agent saw) · magenta `#e4007c` (current reality) · violet `#4a1fb8` (stop/ink accent) ·
violet ink `#1d1442` in place of black.

Every state also changes **shape / label / position / texture**: ghost = outline-only print, offset and rotated;
reality = solid; changed = sticker + CHANGED flag; old = OLD flag; stopped = double-ruled stamp + square hole;
simulated effect = dashed SIMULATED tag.

## Type

- Display: **Bricolage Grotesque** (variable, `font-stretch: 75%`, 800), self-hosted via `@fontsource-variable`.
- Annotations: **Schoolbell**, three phrases only: *agent saw this*, *world changed here*, *check again*.
- Evidence: system mono (production-safe). No font CDN at runtime; both faces are bundled by Vite.

## Motion inventory: each has one job

| Motion | Job |
|---|---|
| ticket stretch + pinch + fibres | feedback: the interval is under tension |
| hint nudge (2×, then stops) | orientation: this is the thing to pull |
| sticker slam (340 ms) | attention / state change: the world changed |
| headline wipe-in | orientation: the sentence changes with the state |
| ghost lifts out of register (620 ms) | causality: the agent's pass is now old |
| scanner sweep (460 ms, guarded only) | causality: the check reads the current pass before anything is sent |
| ghost snaps back | state change: refreshed view |
| stamp / ticket eject | feedback: outcome |

`prefers-reduced-motion`: all animation and transition removed; every state is still carried by text,
position and shape.

## References: what was actually used

These were applied from prior familiarity with each source's principles. **No reference site was browsed,
and no component or asset was copied, in this pass.**

| Reference | Principle taken |
|---|---|
| Studio Thonik | typography as composition: the headline *is* the state and crosses under the object |
| Awwwards / Inspora | benchmark for a campaign-page first viewport: asymmetric grid, one hero object, deliberate crop |
| Cue Design / Rare UI | the signature gesture should be physically pleasurable before it is understood (tear, pull tab) |
| 60FPS / Transitions.dev / Motion Primitives | short, purposeful durations; overshoot only on "slam/snap" moments |
| Codrops | CSS-only material effects (clip-path pinch, gradient fibres, blend-mode misprint) instead of WebGL |
| Maxima Therapy | bold modular glyph (circle / arc / block) as the pass identity instead of a person or mascot |
| Backgrounds Supply | subtle SVG-turbulence paper grain, laminate sheen |
| Schoolbell | micro-annotation only |
| Are.na (print/ticket research) | perforation, lanyard, barcode, punched stub, cancellation sticker |
| Mobbin | mobile recomposed as a vertical poster; ≥56 px touch targets; tap-to-arm/tap-to-drop kept |

## Anti-slop audit (self-assessed; humans decide)

| Could it be mistaken for… | Assessment |
|---|---|
| an AI SaaS landing page | No: no gradient hero, no card grid, no CTA buttons, cream/cobalt/lime print palette |
| a developer observability tool | No: technical evidence is only inside PROOF; no timeline, graph or trace above the fold |
| a generic hackathon demo | Lower risk than pass 1; the pass + tear + misprint is specific to this idea |
| a shadcn template | No: no stock components, radii, shadows or neutral greys |
| a cyberpunk agent visualisation | No: no dark UI, glow or HUD |
| recognisable with title hidden | Likely: lanyard pass + cyan ghost misprint + coral sticker is a distinct silhouette |

## Remaining comprehension risks

1. **The register row and verdict still carry words.** They are short and state-driven, but a participant may
   read instead of watch.
2. **"STILL TRUE."** appears only in the no-revoke control; untested wording.
3. **The ghost's meaning depends on the note *agent saw this*.** Without it, cyan may read as decoration.
4. **The 4:5 desktop clip has empty lower space** in the first three beats; a social crop may want 1:1.
5. **"CHECK AGAIN" vs protocol question 4** ("What do you think CHECK AT COMMIT does?"): the phrase is still on
   screen, but smaller; the protocol may want updating to the primary wording.
6. **Pushing this branch** may redeploy the public preview (`the-world-changed.pages.dev`), replacing the stimulus
   recorded in `evidence/human-comprehension/DEPLOYMENT.md` (`ea8a267`). Record the new SHA before testing.
