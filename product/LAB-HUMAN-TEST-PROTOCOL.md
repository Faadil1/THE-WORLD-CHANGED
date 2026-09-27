# LAB HUMAN TEST PROTOCOL — PRODUCT_EXPANSION_V0

**Status:** READY TO RUN — NOT PROVEN  
**Stimulus build:** `6d376fec05877624d01d0d009e3ea084b90aba81`  
**Immutable URL:** https://c4d1195e.the-world-changed-lab.pages.dev/  
**Lab route:** https://c4d1195e.the-world-changed-lab.pages.dev/#lab

## Purpose

Test whether a first-time human can understand the expanded product without a tutorial:

> You can change the world after an agent has observed it, choose when the change happens, see whether checking again changes the outcome, replay what happened, and inspect a genuine recorded agent run.

This is a **product-comprehension / discoverability test**, not a visual-preference survey.

Do not use LLMs as participants.

## Participants

Minimum: **5 first-time humans**.

Suggested mix:
- at least 2 non-technical participants;
- at least 1 person who uses AI tools but does not build agents;
- at least 1 software / technical participant;
- at least 1 product, design, operations, or business participant.

Do not recruit five people from the same professional context.

Use anonymous IDs only: P01–P05.

## Test setup

Use the immutable build above so all participants see the same product.

Preferred device mix across the five:
- at least 3 desktop/laptop;
- at least 2 mobile/touch if practical.

Do not explain:
- stale state;
- TOCTOU;
- commit-time verification;
- receipts;
- why the product exists;
- what REPLAY or LIVE means.

Keep PROOF collapsed unless the participant opens it themselves.

### Natural-entry rule

Start each participant at the root URL.

Say only:

> **« Explore le produit comme si tu venais de tomber dessus. Dis-moi quand tu penses avoir compris ce que tu peux faire ici. »**

Let them complete the front-door experiment and enter the Lab naturally.

If they cannot reach the Lab after **3 minutes**, record `F-ENTRY-DISCOVERY`, then send them directly to the Lab route. Continue the Lab test; do not terminate the session.

The Human Comprehension Gate for the hero remains a separate gate. Do not count this session as hero-gate evidence unless its own protocol was followed exactly.

---

# PHASE 1 — UNPROMPTED EXPLORATION

Once the participant reaches the Lab, say nothing else.

Allow up to **5 minutes** of free exploration.

Record:
- first Lab action;
- route order visited;
- first world selected;
- whether they complete one experiment;
- whether they use CHECK AGAIN;
- whether they discover CHANGE IT;
- whether they discover REPLAY;
- whether they discover LIVE;
- where they visibly hesitate or backtrack.

Do not coach.

When they say they understand, or at 5 minutes, stop exploration and ask the questions below **before giving any task instructions**.

## First mental-model questions — verbatim, in order

1. **« À ton avis, qu’est-ce que ce Lab te permet de faire ? »**
2. **« Qu’est-ce que “changer le monde” veut dire ici ? »**
3. **« Qu’est-ce que CHECK AGAIN change dans le résultat ? »**
4. **« Qu’est-ce que REPLAY te montre ? »**
5. **« Quand tu vois REAL AGENT RUN / LIVE, qu’est-ce que tu penses que tu regardes ? Est-ce que l’agent tourne maintenant ? »**

Record answers word for word.

No follow-up or correction until all five answers are captured.

---

# PHASE 2 — TASK DISCOVERABILITY

Only after Phase 1 answers are recorded, ask these tasks one at a time.

Do not tell the participant which tab to use.

### Task A — Another world

> **« Essaie un autre monde et fais une expérience où quelque chose change après que l’agent a regardé. »**

Observe whether they can:
- choose CALENDAR or DOCUMENT;
- create the change;
- reach an outcome.

### Task B — Verification

> **« Maintenant, fais en sorte que l’agent vérifie à nouveau avant d’agir. »**

Observe whether they discover/use CHECK AGAIN and understand its effect.

### Task C — Beat the agent

> **« Trouve l’expérience où tu dois changer le monde avant que l’agent agisse, puis essaie-la. »**

Observe whether they find CHANGE IT / Challenge and understand the timing window.

### Task D — Reconstruct the run

> **« Sans relancer l’expérience, montre-moi ce que l’agent avait vu, ce que le monde est devenu, puis ce qu’il a fait. »**

Observe whether they find and use REPLAY rather than simply retelling from memory.

### Task E — Genuine agent evidence

> **« Trouve le vrai run d’agent et explique-moi ce qui s’est réellement passé. »**

Observe whether they find LIVE and distinguish:
- genuine recorded run;
- Claude Opus 5.5;
- not executing now;
- re-verified and stopped before commit.

Do not require them to use the words “Opus”, “receipt”, “stale”, or “commit”.

---

# SCORING MODEL

Score only after verbatim answers and task behavior are captured.

## Core concepts

### A — PRODUCT PURPOSE
PASS if they understand that the user changes external state after an agent has observed it, then sees what happens.

### B — TEMPORAL CAUSALITY
PASS if they understand that the world can change **between observation and action**.

### C — RE-VERIFICATION
PASS if they understand that CHECK AGAIN reads the current world before acting and can change/stop the outcome.

### D — REPLAY
PASS if they understand Replay reconstructs a completed run through observable states/events, including what the agent saw versus what the world became.

### E — LIVE PROVENANCE
PASS if they understand the displayed Opus specimen is a **genuine recorded run** and **not running now**.

### F — PRODUCT NAVIGATION
PASS if they can complete Tasks A–E with no more than one neutral moderator rescue total.

## Participant pass

Participant passes if:
- A = PASS
- B = PASS
- C = PASS
- D = PASS
- E = PASS
- F = PASS

Also require that they do **not** make either critical provenance error:
- say the recorded genuine run is executing live now;
- say CALENDAR or DOCUMENT is proven Opus behavior rather than a simulated product scenario.

---

# FAILURE TAXONOMY

Use one or more codes:

- `F-ENTRY-DISCOVERY` — cannot discover how to enter the Lab from the hero
- `F-PURPOSE` — cannot explain what the Lab is for
- `F-NO-TEMPORAL-ORDER` — misses observation → change → action ordering
- `F-NO-RECHECK-CAUSALITY` — does not understand what CHECK AGAIN changes
- `F-WORLD-SELECTOR` — cannot understand/select another world
- `F-CHALLENGE-DISCOVERY` — cannot find or understand CHANGE IT
- `F-REPLAY-DISCOVERY` — cannot find Replay
- `F-REPLAY-MENTAL-MODEL` — sees Replay as decorative/history rather than reconstruction of the run
- `F-LIVE-DISCOVERY` — cannot find genuine agent specimen
- `F-LIVE-NOW-CONFUSION` — thinks recorded genuine run is executing now
- `F-PROVENANCE-OVERGENERALIZATION` — treats simulated scenarios as genuine model evidence
- `F-NAVIGATION` — loses orientation between WORLD / CHANGE IT / REPLAY / LIVE
- `F-COPY` — wording creates the misunderstanding
- `F-INTERACTION` — interaction itself blocks completion
- `F-MOBILE` — mobile-specific blockage
- `F-OTHER`

---

# GROUP PROMOTION RULE

Promote `PRODUCT_EXPANSION_V0` from `HUMAN_TEST_READY` only when:

- **at least 4/5 participants pass**;
- no more than **1/5** produces `F-LIVE-NOW-CONFUSION`;
- no more than **1/5** produces `F-PROVENANCE-OVERGENERALIZATION`;
- no single core failure (A–F) appears in **2 or more participants**.

Repeated confusion in 2+ people is a product signal even if the numeric pass threshold is met.

## Decision

- **PASS** → product-expansion comprehension is proven enough for bounded final polish / promotion decision.
- **PATCH** → apply the smallest specific correction supported by the repeated evidence; retest with fresh participants.
- **FAIL** → reopen the affected product flow; do not solve by adding explanatory text everywhere.

Do not promote because participants say the design is “cool” or “beautiful”. The gate is comprehension and discoverability.

---

# Moderator rules

- Never teach before first answers are captured.
- Never paraphrase a participant’s answer into a better answer.
- Preserve exact wording.
- Record observable behavior separately from interpretation.
- Do not reveal success criteria during the session.
- Do not count yourself, Claude, ChatGPT, or any other model as a participant.
- Do not combine two participants into one record.
