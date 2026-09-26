# HUMAN COMPREHENSION — FIRST-IMPRESSION TEST PROTOCOL

**Branch:** `build/comprehension-v0`  
**Status:** READY FOR REAL HUMAN TESTING  
**Participants:** 5 first-time viewers minimum  
**Purpose:** determine whether the current hero communicates the causal mechanism without prior explanation.

## What this test is NOT

Do not use:
- Claude, ChatGPT, Gemini, Grok, Kimi, Perplexity, or any other LLM as a substitute participant;
- people who have already seen THE WORLD CHANGED;
- collaborators who know the stale-authority concept in advance;
- leading explanations, TOCTOU terminology, or hints.

This is a first-impression comprehension test, not a usability interview.

## Participant profile

Aim for a mixed set of 5:
- at least 2 non-specialists;
- at least 1 software/technical person;
- at least 1 person who uses AI tools but does not build agents;
- avoid having all 5 come from the same professional context.

Do not record names. Use anonymous ids P01–P05.

## Test conditions

PROOF stays collapsed.

The participant gets no concept briefing.

Use either:

### Interactive test — preferred

Show the current branch hero.

Host instruction only:

> “Try this once. Tell me when you think you understand what happened.”

Do not explain PULL THE GAP, BELIEF, REALITY, CHECK AT COMMIT, or the expected result.

Allow one full interaction.

### Silent-clip test — secondary

Show the 15-second clip once, sound off.

Do not pause or replay before asking the four questions.

Use the same participant only once: do not test both interactive and video versions on the same person unless the first response has already been recorded.

## Four questions — ask verbatim, in this order

1. **What changed?**
2. **What did the agent know before the change?**
3. **Why did the two outcomes differ?**
4. **What do you think CHECK AT COMMIT does?**

Do not paraphrase a weak answer into a better one.

Do not ask follow-up questions until the first answer to all four has been recorded verbatim.

## Core concepts

Score the participant only after recording the answers.

### A — Correct initial observation

Participant communicates that the agent initially saw/understood an access state that was valid at that moment.

Examples that count:
- “It saw access was granted.”
- “At first it had permission.”
- “Its first information was correct.”

Does not count:
- “The AI hallucinated GRANTED.”
- “It misunderstood access from the beginning.”

### B — World changed after observation

Participant communicates that access/reality changed after the agent observed it.

Examples that count:
- “Someone revoked access after it checked.”
- “The permission changed while it was waiting.”
- “The world changed between seeing and acting.”

### C — Previous observation became stale

Participant understands that the earlier observation was no longer safe/current after the change.

They do not need the word “stale.”

Examples that count:
- “It was working from old information.”
- “What it knew wasn’t current anymore.”
- “The permission it saw earlier no longer applied.”

### D — Re-check changes the outcome

Participant understands that checking the current state before commit prevents the stale action.

Examples that count:
- “With the check on it looks again and stops.”
- “It verifies the permission before exporting.”
- “The second outcome changes because it re-checks.”

## Participant pass rule

A participant passes if:

- B, C, and D are all understood; and
- they do not claim that the initial observation was wrong from the beginning.

A may be implicit, but an explicit inversion of A is a failure.

## Group promotion rule

Promote `HUMAN_COMPREHENSION = PROVEN` only if:

- at least **4 of 5** participants pass;
- no more than one participant interprets the initial observation as a model hallucination/error;
- no repeated confusion appears in 2+ participants around the same mechanism.

A repeated confusion in 2+ people is a design signal even if the numerical threshold passes.

## Failure taxonomy

Use these codes only after the interview:

- `F-INITIAL-WRONG` — thinks GRANTED was wrong from the start
- `F-NO-TEMPORAL-ORDER` — misses that the world changed after observation
- `F-NO-STALENESS` — sees two states but not that the earlier one became outdated
- `F-NO-RECHECK-CAUSALITY` — cannot explain why CHECK AT COMMIT changes outcome
- `F-COLOR-ONLY` — understands only “green/red” or “granted/revoked” without the causal sequence
- `F-UI-CONFUSION` — interaction mechanics obscure the idea
- `F-MODE-CONFUSION` — thinks deterministic/live modes are the causal comparison
- `F-OTHER` — describe explicitly

## Moderator rules

Do:
- record exact words;
- record whether the participant used interactive or silent clip;
- note the first moment they appeared confused;
- capture one short quote that best represents their mental model.

Do not:
- coach;
- correct during the test;
- explain version numbers;
- say “stale,” “TOCTOU,” “authority witness,” or “revalidation” before answers are complete;
- reveal the other participant results.

## After all five

Do not average away a repeated misunderstanding.

First inspect:
1. which concepts fail;
2. whether failures cluster at the same visual beat;
3. whether failures are interaction problems or explanation problems.

Only then decide:
- PASS → promote the gate and start final polish;
- PATCH → make the smallest visual correction and repeat with fresh participants;
- FAIL → reopen interaction design.

## Evidence

Store anonymized results under:

`evidence/human-comprehension/`

Do not store participant names or identifying information.
