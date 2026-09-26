# CONCEPT LOCK — THE WORLD CHANGED

**Status:** LOCKED  
**Date:** 2026-09-26

## One-line premise

> A live AI agent sees the world correctly. You change the world before it acts.

## Why this exists

The problem is not novel: stale state, TOCTOU, stale authority, retries, revalidation, replay, and fault injection all have substantial prior art.

The project therefore makes no novelty claim about those mechanisms.

The opportunity is experiential:

> make the observation-to-action interval into a physical object that a visitor can manipulate while a live or deterministic agent workflow is in flight.

## Canon

### Title

THE WORLD CHANGED

### Core object

THE GAP

```
OBSERVE ●────────────● ACT
          ↑        ↑
        PULL THIS OPEN
```

### Signature interaction

PULL THE GAP

`press -> pull -> insert world event -> release`

### Visitor role

YOU ARE THE WORLD.

The visitor is not primarily a debugger, evaluator, or observer. The visitor represents an external reality that can continue changing after an agent has observed it.

### Hero scenario

AUTHORITY EXPIRED AFTER OBSERVATION.

Initial world:

```
access = GRANTED
world_version = N
```

Agent observes correctly and prepares an export.

Visitor injects:

```
ADMIN_REVOKES_ACCESS
world_version = N+1
access = REVOKED
```

The original witness is stale.

### Hero comparison

**UNGUARDED**

Action reaches commit time using stale authority -> `STALE_AUTHORITY`.

**GUARDED**

Action re-verifies current state -> observation refreshes -> `BLOCKED`.

## Narrative law

The primary story is:

> The agent saw the truth. Then you changed it.

Secondary line:

> The prompt never changed. The world did.

## Semantic precision

BELIEF is not hidden reasoning.

BELIEF = latest relevant external state actually observed by the agent.

REALITY = current sandbox state.

The public experience may show only inspectable evidence such as observations, tool calls, world versions, mutations, receipts, and outcomes.

## Scope

Phase 1 contains one experiment only.

Future candidate experiments are explicitly out of scope until the hero passes:

- ambiguous completion / UNKNOWN;
- stale memory;
- THE FAN repeated live runs;
- multiplayer adversarial mode.

## Success criterion

Without reading an explanation, a visitor should infer:

1. the agent observed one valid state;
2. something changed afterward;
3. the agent's observation became stale;
4. checking again immediately before an irreversible action changes the outcome.
