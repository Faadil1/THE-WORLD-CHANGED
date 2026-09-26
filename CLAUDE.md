# CLAUDE.md — THE WORLD CHANGED

## Mission

Build a precise interactive experiment, not a generic AI demo.

Core premise:

> A live AI agent sees the world correctly. The user changes the world before it acts.

Core interaction:

> PULL THE GAP.

## Canonical build order

1. Deterministic simulation kernel
2. Tests proving guarded and unguarded paths
3. PULL THE GAP interaction
4. Authority-expiry hero scenario
5. Replay + run receipt
6. Visual refinement
7. Real Claude Opus 5.5 integration
8. Additional scenarios only after 1–7 pass

Do not reorder these steps for convenience.

## Product invariants

- THE GAP is the protagonist.
- The visitor is the changing world.
- BELIEF means the last relevant state actually observed by the agent.
- REALITY means current sandbox world state.
- Never imply access to private chain-of-thought.
- Never present a scripted model failure as a live model run.
- Same deterministic seed + same event sequence must replay identically.
- World mutations increment `world_version`.
- Observations must record the version witnessed.
- Irreversible actions must be able to prove whether their authority witness is current.

## Hero scenario

AUTHORITY EXPIRED:

1. `access = GRANTED`
2. agent observes world version N
3. agent prepares export
4. user opens THE GAP
5. user injects `ADMIN_REVOKES_ACCESS`
6. world becomes N+1 and `access = REVOKED`
7. gap snaps shut
8. unguarded path exposes `STALE_AUTHORITY`
9. guarded path re-verifies and blocks the action

## Motion law

Motion must have a job.

- gap width -> elapsed vulnerability interval
- plate separation -> disagreement
- print-style misregistration -> stale observation
- snap-to-register -> successful refresh
- commit impact -> attempted irreversible effect

No decorative motion by default.

## Visual exclusions

Do not build:

- dark-blue AI SaaS dashboard
- cyberpunk console aesthetic
- node graph as primary interface
- trace waterfall as primary interface
- miniature agent office
- generic 3D city
- gratuitous particles
- fake technical readouts that do not map to simulation state

Target:

scientific instrument + precision test bench + editorial diagram + misregistered print plates.

## Architecture boundaries

```
/simulation
  state machine
  event reducer
  seed/replay
  tests

/experience
  pull-the-gap
  belief layer
  reality layer
  event token
  commit/verify animation

/proof
  run receipt schema
  world diffs
  observable agent/tool events
```

Simulation logic must remain independent from rendering.

## Live agent rule

The deterministic simulator must work before any model API is connected.

When live mode is added:

- use sandbox/mock tools only;
- no destructive external side effects;
- record observable tool calls and state changes;
- accept that the model may verify, ask, refuse, or proceed;
- report what happened rather than forcing a failure;
- calculate any displayed rates from actual runs.

## Stop conditions

Do not add PAYMENT, MEMORY, multiplayer, branching timelines, THE FAN, or additional experiments until the hero scenario is visually understandable without explanatory prose and the deterministic kernel/replay tests pass.
