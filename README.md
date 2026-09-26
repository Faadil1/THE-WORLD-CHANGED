# THE WORLD CHANGED

> A live AI agent sees the world correctly. You change the world before it acts.

**30 Days of Real Business Problems — Day XX**

THE WORLD CHANGED is an interactive experiment about the gap between an AI agent's observation of the world and the state of the world when its action reaches commit time.

This project does **not** claim that stale state, TOCTOU, revalidation, fault injection, or agent replay are new problems. The novelty target is the interaction and experience:

**live agent + user world manipulation + physical observation→action gap + belief/reality misregistration + reproducible proof**

## Core interaction

### PULL THE GAP

```
OBSERVE ●────────────● ACT
          ↑        ↑
        PULL THIS OPEN
```

The visitor becomes the changing world.

1. The agent observes a valid state.
2. The visitor physically opens the interval between observation and action.
3. The visitor injects a real world-state change.
4. BELIEF and REALITY fall out of registration.
5. The interval snaps shut and the action reaches commit time.
6. A commit-time verification can refresh state and prevent an invalid effect.

## Hero experiment

### AUTHORITY EXPIRED

Initial observation:

```
ACCESS = GRANTED
WORLD VERSION = N
```

The agent prepares an export.

The visitor opens THE GAP and injects:

```
ADMIN REVOKES ACCESS
WORLD VERSION = N + 1
```

The original observation is now stale.

The experience compares:

- an unguarded action using the stale witness;
- a guarded action that re-verifies current authority at commit time.

## Semantic rule

**BELIEF does not mean private chain-of-thought.**

In this project, BELIEF means:

> the latest relevant world state actually observed by the agent.

Only observable artifacts may be represented as evidence:

- world state;
- world version;
- observations;
- tool calls;
- state mutations;
- verification;
- action attempts;
- state diffs;
- outcomes.

## Visual law

When BELIEF = REALITY, both layers are perfectly registered and appear as one.

When BELIEF != REALITY, the layers physically separate and misregister.

Motion must have a causal job:

- gap width = elapsed vulnerability window;
- plate separation = disagreement;
- misregistration = stale state;
- snap-to-register = successful refresh;
- commit impact = attempted external effect.

## Build order

1. Deterministic simulation kernel
2. Automated tests
3. PULL THE GAP interaction
4. Authority-expiry hero scenario
5. Deterministic rewind/replay + run receipt
6. Visual refinement
7. Real Claude Opus 5.5 execution against mock tools
8. Additional experiments only after the hero passes

## Hard exclusions

Do not drift into:

- agent dashboards;
- trace waterfalls;
- generic node graphs;
- isometric agent offices;
- decorative 3D worlds;
- fake model outcomes presented as real;
- private chain-of-thought visualization.

## Proof standard

The public experience has two modes:

**EXPERIENCE MODE** — deterministic and replayable.

**LIVE PROOF MODE** — real model executions against sandboxed mock services only.

If outcome rates are shown, they must be calculated from actual runs. No invented percentages.

## Status

Concept: **LOCKED**

Current phase: **TECHNICAL REALITY CHECK**

See `state/CURRENT.yaml` for canonical execution state.
