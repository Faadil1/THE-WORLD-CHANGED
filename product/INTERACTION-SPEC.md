# INTERACTION SPEC — PULL THE GAP

**Status:** CANONICAL V0  
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
- BELIEF and REALITY begin to separate;
- temporal scale stretches;
- event tray becomes actionable.

The gap must feel elastic, not like a range slider.

### 3. INSERT

The visitor drags `ADMIN REVOKES ACCESS` into the open interval.

On drop:
- event receives a deterministic position/time in the event log;
- REALITY mutates to `REVOKED`;
- `world_version` increments;
- BELIEF remains on its prior witnessed version.

### 4. MISREGISTER

Once state differs:
- duplicated contours become visible;
- typography offsets;
- registration marks no longer align;
- REALITY carries the newer world version;
- BELIEF carries the older witness version.

Do not rely only on red/green.

### 5. RELEASE

The visitor releases THE GAP.

The interval snaps toward ACT.

The visual energy should communicate inevitability: the prepared action is now reaching commit time.

### 6A. UNGUARDED OUTCOME

The action attempts to commit using the stale witness.

The simulator returns:

`STALE_AUTHORITY`

The experience must not imply that an unsafe external action actually occurred if the sandbox rejected it.

### 6B. GUARDED OUTCOME

A commit-time check reads current world state.

Observation refreshes to the current world version.

BELIEF re-registers with REALITY.

The action resolves to:

`BLOCKED`

## Motion mapping

| Motion | Meaning |
|---|---|
| gap width | elapsed vulnerability interval |
| plate separation | disagreement magnitude |
| print misregistration | stale observed state |
| elastic tension | action pending while time passes |
| snap | interval closes / commit approached |
| magnetic re-register | fresh verification |
| stopped action | blocked irreversible effect |

## Visual target

Scientific instrument + precision mechanical test bench + editorial print registration.

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
- keyboard path must support open gap, move event, commit/replay;
- touch targets must remain practical on mobile.

## Failure criterion

If a first-time visitor cannot infer the sequence

`observed -> world changed -> observation stale -> recheck fixes outcome`

without reading a paragraph, the interaction is not ready for expansion.
