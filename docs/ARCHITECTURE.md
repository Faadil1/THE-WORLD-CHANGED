# Architecture

THE WORLD CHANGED separates interaction, deterministic state, and live-model execution so the visual story never has to invent evidence.

## 1. Experience layer

`experience/` contains the front-door interaction and Lab:

- physical LOOK → ACT gap;
- world mutation controls;
- Access / Calendar / Document scenarios;
- Same World comparison;
- Challenge mode;
- receipt-driven Replay;
- recorded genuine-run presentation.

The browser only renders observable state. It never receives or displays private reasoning.

## 2. Deterministic kernel

`simulation/` is the source of truth for the canonical Access scenario.

The kernel owns:

- world version;
- access state;
- authorization version;
- observations;
- pending actions;
- commit attempts;
- simulated effects;
- deterministic receipts.

Opening the visual gap alone changes no world state. Divergence appears only after an actual mutation.

## 3. Scenario adapters

Access wraps the canonical kernel.

Calendar and Document use a separate deterministic sandbox engine with the same interaction grammar. They are product simulations, not model-evidence claims.

## 4. Live runner

`live/` provides an optional local runner for Claude Opus 5.5 through the Claude Agent SDK.

The model is restricted to four sandbox tools:

- `observe_access`
- `prepare_export`
- `verify_access`
- `commit_export`

The hosted static site does not hold credentials and does not execute the model. It replays the recorded public specimen instead.

## 5. Receipts and Replay

Deterministic and live runs produce observable receipts.

Replay derives its frames from receipt state rather than from a separate animation script, allowing the interface to show:

WHAT THE AGENT SAW → WHAT IT PREPARED → WHAT THE WORLD BECAME → WHAT IT CHECKED / DID.

## Verification

`npm test` covers the kernel, scenario adapters, replay reconstruction, isolation rules, live receipt validation and UI logic.

`npm run typecheck` validates the TypeScript surface.

`npm run build` produces the static Vite application in `dist/`.
