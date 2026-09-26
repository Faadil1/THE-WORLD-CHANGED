# INTERACTION SPEC — PULL THE GAP

**Status:** CANONICAL V0.1 (gate-review correction, 2026-09-26)  
**Primary device:** desktop pointer / touch drag  
**Mobile requirement:** one-thumb fallback must preserve the same causal meaning.

## Interaction objective

Turn an invisible temporal race into a physical gesture.

The visitor should not manipulate an abstract parameter called "delay." They should physically open the interval in which the world can change.

## Default state

BELIEF and REALITY are perfectly registered.

The visitor sees:

```
ACCESS: GRANTED

OBSERVE ●────────────● ACT
```

The two plates occupy the same coordinates and therefore read as one surface.

## Gesture sequence

### 1. PRESS

Pointer/touch lands on the interval between OBSERVE and ACT.

Feedback:
- subtle mechanical engagement;
- registration marks appear;
- no decorative particles.

### 2. PULL

The visitor drags horizontally to open the interval.

Effects tied to gap width:
- elapsed vulnerability interval increases;
- temporal scale stretches;
- the interval carries visible tension (the instrument is under load);
- event tray becomes actionable.

Pulling alone does **not** separate BELIEF and REALITY. Gap width is only the elapsed
vulnerability interval — time in which the world *could* change. While nothing has changed,
the plates stay perfectly registered.

The gap must feel elastic, not like a range slider.

On letting go, the gap stays **mechanically latched open** at the width pulled. A latch at
ACT holds the tension. (A single pointer cannot hold the gap and carry an event at once.)

### 3. INSERT

The visitor drags `ADMIN REVOKES ACCESS` into the open interval.

On drop:
- event receives a deterministic position/time in the event log;
- REALITY mutates to `REVOKED`;
- `world_version` increments;
- BELIEF remains on its prior witnessed version.

### 4. MISREGISTER

Misregistration begins only when a world mutation actually causes BELIEF ≠ REALITY —
never from gap width, time passing, or gesture state alone.

Once state differs:
- duplicated contours become visible;
- typography offsets;
- registration marks no longer align;
- REALITY carries the newer world version;
- BELIEF carries the older witness version.

Do not rely only on red/green.

### 5. RELEASE

The visitor releases THE GAP by disengaging the latch that holds it open — a spatial,
mechanical affordance attached to the ACT end of the interval (e.g. pulling a pin), not a
form-style submit button. Keyboard/tap activation of the same latch must remain available.

The interval snaps toward ACT.

The visual energy should communicate inevitability: the prepared action is now reaching commit time.

### 6A. UNGUARDED OUTCOME

The system performs no commit-time revalidation. The action commits using the stale witness.

In the deterministic sandbox this commits a **simulated** export effect:

- the receipt records the stale witness (`reason: STALE_AUTHORITY`, `witness_stale: true`);
- the receipt records that current authority was `REVOKED` at commit;
- the outcome is `UNAUTHORIZED_COMMIT`;
- the effect is marked `realm: SANDBOX`, `simulated: true`, `authorized: false`.

The experience must show the effect as SIMULATED and must never imply that real data left
the sandbox or that a live system performed the action.

### 6B. GUARDED OUTCOME

A commit-time check reads current world state.

Observation refreshes to the current world version.

BELIEF re-registers with REALITY.

The action resolves to:

`BLOCKED`

## Motion mapping

| Motion | Meaning |
|---|---|
| gap width | elapsed vulnerability interval (never disagreement) |
| plate separation | disagreement magnitude — only after a world mutation |
| print misregistration | stale observed state |
| elastic tension | action pending while time passes |
| latch disengage | tension released by the visitor |
| snap | interval closes / commit approached |
| magnetic re-register | fresh verification |
| stopped action | blocked irreversible effect |

## Visual target

Scientific instrument + precision mechanical test bench + editorial print registration.

The primary viewport communicates the causal chain. Technical evidence (tool/event ledger,
receipt JSON) sits behind a secondary PROOF affordance, collapsed by default.

Avoid:
- generic cards;
- glossy SaaS panels;
- dark cyberpunk surfaces;
- 3D spectacle detached from causality;
- faux code rain;
- excessive explanatory copy.

## Sound

Sound is optional and never required for comprehension.

Potential jobs:
- engagement tick on OBSERVE;
- low detuning as plates diverge;
- tension tone proportional to gap width;
- magnetic click on re-registration;
- muted impact at commit boundary.

The 15-second social cut must work sound-off.

## Accessibility

- full causal chain must remain legible without color;
- reduced-motion mode replaces elastic motion with discrete state transitions while preserving registration/diff states;
- keyboard path must support open gap, move event, release latch, replay;
- touch targets must remain practical on mobile.

## Failure criterion

If a first-time visitor cannot infer the sequence

`observed -> world changed -> observation stale -> recheck fixes outcome`

without reading a paragraph, the interaction is not ready for expansion.
