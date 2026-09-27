# PRODUCT EXPANSION V0 — THE WORLD CHANGED LAB

**Gate:** `PRODUCT_EXPANSION_V0` · **State:** `PREVIEW_READY_POLISH_1` (not PROVEN)
**Branch:** `build/agent-lab-v0` (from `build/comprehension-v0` @ `dab1878`) · production stimulus untouched

## North Star

> THE WORLD CHANGED is an interactive lab where you change reality after an AI agent has observed it —
> then see whether the agent notices before it acts.

Journey: **SEE IT → BREAK REALITY → UNDERSTAND → EXPERIMENT → PROVE**

## Five connected layers

| Layer | Where | What the visitor does |
|---|---|---|
| 1. FRONT DOOR | `/` (unchanged ACCESS PASS / REALITY TEAR hero) | the canonical experiment; after an outcome a lime ticket **CHANGE THE WORLD AGAIN · ENTER THE LAB →** appears; the pass slides off the table and the Lab is underneath |
| 2. WORLD PLAYGROUND | `#lab`, `#lab/<world>` | pick a world object; set the gap; decide **when** the world changes; CHECK AGAIN; PULL TO ACT |
| 3. CHALLENGE | `#challenge[/<world>]` | the agent travels to ACT on its own; change the world in time (drag, tap, Space/Enter) |
| 4. REPLAY | `#replay/<source>` + SAME WORLD `#lab/<world>/same` | scrub an evidence strip rebuilt from the receipt; split one object between the two policies |
| 5. LIVE AGENT LAB | `#live` | the recorded genuine Opus 5.5 run as SPECIMEN 001, replayed; RUN LIVE honestly unavailable |

Progressive discovery: the hero never shows the Lab until the visitor completes an outcome. Inside the Lab,
four paper index tabs (WORLD · CHANGE IT · REPLAY · LIVE) are the only navigation.

## Canon preserved

THE GAP, PULL THE GAP, YOU ARE THE WORLD, AUTHORITY EXPIRED hero, BELIEF/REALITY semantics, gap-only ≠
divergence (tested for every world), commit-time verification changes the outcome, deterministic
UNAUTHORIZED_COMMIT / BLOCKED (adapter reproduces the committed receipts' replay hashes), real Opus proof and
receipt untouched, raw REFUSED only in PROOF, label **RE-VERIFIED · STOPPED BEFORE COMMIT**, no private
reasoning anywhere, no fake live run, no external effect (everything `realm: SANDBOX`, `simulated: true`).

## What is proven vs simulated

- **ACCESS** runs on the canonical kernel (provenance `CANONICAL_KERNEL`).
- **CALENDAR** and **DOCUMENT** are `SANDBOX_SIMULATION` product scenarios. They are not model claims.
- The only genuine model evidence is the one recorded Opus 5.5 receipt (`RECORDED_GENUINE_RUN`).

## Specs

`product/LAB-INTERACTION-SPEC.md` · `product/SCENARIO-SYSTEM.md` · `product/REPLAY-SPEC.md` · `product/LIVE-AGENT-LAB.md`

## Gate states

`DESIGNING` → `MACHINE_VALIDATED` → `PREVIEW_READY` → **`PREVIEW_READY_POLISH_1`** (this build) → `HUMAN_TEST_READY` → `PROVEN` (humans only).

## Open product risks

1. The Lab's value has not been tested with people; the hero's own comprehension gate is also still open.
2. The Challenge window (≈5 s) is a guess; it may be too easy or too hard.
3. SAME WORLD split shows two cropped stamps at 50%; people may need to drag before it reads.
4. Calendar/document are simulations. Visitors could still over-generalise the single Opus specimen.
5. Four index tabs are the first navigation this product has had. Watch that it doesn't turn into "an app".

## Polish pass 1 (from the real 2m16 public walkthrough)

1. **Route scroll reset.** Every top-level route (WORLD · CHANGE IT · REPLAY · LIVE, in-content links, back/forward)
   opens at its own top: `history.scrollRestoration = "manual"`, `overflow-anchor: none`, reset re-asserted for
   two frames unless the visitor scrolls first. In-mode controls (scrub, gap, seam) never re-render, so never reset.
2. **Challenge staging.** READY and LOOKING: CHANGE IT NOW is hidden and locked (`aria-hidden`, disabled); START is
   the only move. TRAVEL: it slams in (large, coral, thumb-sticky on mobile) and the spent START disappears.
3. **Plain copy.** No-change: "Nothing changed. What it saw was still true." Too late: "It acted first. What it
   saw was still true then." Verdicts stay object-specific (STILL VALID · SENT / STILL FREE · CONFIRMED / STILL
   LATEST · SENT). Tick numbers and "canonical sandbox kernel" left the primary copy (still in PROOF / provenance tag).
4. **Replay entrance.** REPLAY WHAT THE AGENT SAW. + one line + the four beats, before sources, object, scrubber, strip.
5. **Live entrance.** REAL AGENT RUN. → CLAUDE OPUS 5.5 → RECORDED GENUINE RUN / NOT RUNNING NOW → RE-VERIFIED ·
   STOPPED BEFORE COMMIT → the replay, all in the first screen. RUN LIVE still disabled; REFUSED only in PROOF.
