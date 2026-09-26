# COLLISION RESEARCH

## Purpose

This file records what is already known to exist so the project does not accidentally claim novelty for established ideas.

## High-relevance precedents

### Oddity (2018)

Interactive distributed-systems debugger with direct manipulation of execution/failure ordering and time-travel-like exploration.

Implication:

Interactive perturbation of a live/simulated distributed system is prior art.

We must not claim to have invented:
- interactive failure injection;
- timeline manipulation;
- alternate execution exploration.

### Agent replay / checkpoint tools

Modern agent tooling supports forms of:
- session replay;
- checkpoint rewind;
- state inspection;
- state override;
- branch/replay.

Implication:

Replay and time-travel debugging are not novelty claims.

### Commit-time revalidation

Recent agent-safety/reliability work formalizes re-checking authority/freshness near irreversible effects.

Implication:

"verify before commit" is not the invention.

### Explorable explanations

Interactive explanatory work from Nicky Case, Bartosz Ciechanowski, and related creators establishes the broader genre of making invisible mechanisms manipulable.

Implication:

The project participates in an established interaction tradition.

## Collision boundary

The current novelty hypothesis is therefore intentionally narrow:

> A public-facing, highly compressed experience in which the visitor physically opens the observation-to-action interval of an AI-agent workflow, mutates the world inside that interval, and sees last-observed state fall out of registration with current reality.

This is a hypothesis, not a "first" claim.

## Specific design collision avoidances

Do not converge on:
- 3D offices with agent avatars;
- waterfalls/spans as the hero visualization;
- conventional state-machine diagrams;
- generic two-column diff dashboards;
- animated node graphs;
- post-hoc replay as the primary interaction;
- generic sliders labeled "latency" or "delay."

The primary interaction must remain:

`PULL THE GAP -> INSERT EVENT -> RELEASE`

## Payment collision

The timeout/double-payment scenario is heavily used in retry/idempotency explainers.

Therefore PAYMENT must not be the hero claim.

If later added, its purpose is to teach:

> a timeout creates an UNKNOWN outcome, not proof of failure.

## Novelty wording

Preferred:
- "an interactive experiment";
- "a physical interaction for an invisible agent failure";
- "a lab where you change the world between observation and action."

Avoid:
- "first";
- "never done before";
- "new safety primitive";
- "new TOCTOU solution";
- "new observability technique."
