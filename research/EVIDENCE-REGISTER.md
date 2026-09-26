# EVIDENCE REGISTER

**Purpose:** preserve the difference between verified evidence, useful precedent, and claims we must not repeat without stronger sourcing.

## Evidence classes

### A — Strong primary/research evidence

1. **Commit-Time Authorization for LLM Agents**  
   Mechanism: authority valid earlier may be stale at irreversible commit time.  
   Role in project: primary evidence for the hero AUTHORITY EXPIRED scenario.  
   URL: https://arxiv.org/abs/2607.10487

2. **The Missing Boundary**  
   Mechanism: loss/degradation of control constraints can produce unsafe goal pursuit; restoring the boundary changes outcomes in the evaluated environment.  
   Role: preserves FENCE AMNESIA as a separate future Day candidate.  
   URL: https://arxiv.org/abs/2609.11024

3. **STALE benchmark**  
   Mechanism: agents may fail to adapt behavior after relevant state/memory updates.  
   Role: evidence for a possible future stale-memory experiment, not the hero case.  
   URL: https://arxiv.org/abs/2605.06527

4. **Oddity — interactive debugging for distributed systems**  
   Mechanism: interactive control over distributed-system execution/failure ordering and time-travel style exploration.  
   Role: important prior art that prevents false novelty claims around interactive fault injection.  
   URL: https://arxiv.org/abs/1806.05300

## B — Useful adjacent evidence / precedent

- agent replay and checkpoint-rewind systems;
- LangGraph/agent observability tooling;
- idempotency/retry engineering literature;
- explorable explanations from Nicky Case / Bartosz Ciechanowski;
- visual state-divergence and distributed-systems teaching tools.

These validate the genre or adjacent mechanics, but they do not establish novelty.

## C — Claims requiring stronger primary confirmation before public use

Do not use as headline evidence unless independently verified from a primary source:

- broad universal failure-rate percentages derived from vendor datasets;
- anonymous "six-figure stale wiki" incidents;
- generalized claims that most agent failures come from one mechanism;
- claims that cache expiration necessarily means context loss;
- exact production incident counts repeated through secondary blogs.

## Public claim rules

Safe:

- stale authority / TOCTOU-like failures are established problems;
- interactive fault injection and replay have prior art;
- our novelty target is the interaction/experience combination;
- our displayed live-run rates, if any, come from our own recorded runs.

Unsafe without additional evidence:

- "first";
- "nobody has done this";
- "Claude does this in production";
- "agents are broken";
- "a timeout means failure";
- "prompt cache expiry means memory eviction";
- invented or extrapolated incident rates.

## Research principle

A compelling metaphor does not upgrade weak evidence.

The project may simplify presentation, but it must not collapse distinct mechanisms:
- stale authority;
- ambiguous completion / UNKNOWN;
- stale memory;
- context boundary loss.

They are related but causally different.
