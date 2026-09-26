# BUILD — kernel-v0

Branch: `build/kernel-v0` · Phase: TECHNICAL REALITY CHECK

## Commands

```bash
npm install
npm test               # 56 kernel / receipt / controller / boundary tests
npm run typecheck
npm run receipts       # regenerate evidence/runs/deterministic/*.json (tests fail if they drift)
npm run dev            # PULL THE GAP hero at http://localhost:5173
npm run build && npx vite preview --port 4173 &
npm run verify:visual  # headless Chromium, real pointer/touch/keyboard gestures -> evidence/screenshots/kernel-v0/
npm run verify:mode    # browser check of DETERMINISTIC vs LIVE labels -> evidence/screenshots/live-proof-v0/
npm run test:isolation # live sandbox isolation suite
npm run live -- [seed] # gated genuine Opus 5.5 run (needs ANTHROPIC_API_KEY) -> evidence/runs/live/
```

## Layout

```
simulation/src/        deterministic kernel — no DOM, clock, timers, or unseeded randomness
  types.ts             WorldState (TECHNICAL-REALITY-GATE.md) + events, observations, attempts
  reducer.ts           applyEvent / reduce — the only way state changes
  agent.ts             deterministic scripted agent (NOT a model) + scenario builder
  receipt.ts           RUN-RECEIPT-SCHEMA deterministic receipt + exact replay
  rng.ts               seeded PRNG (mulberry32), FNV-1a stable hash, canonical JSON
simulation/test/       kernel, receipts, controller, render-independence tests
proof/receipts.ts      canonical receipt set; proof/generate-receipts.ts writes them
experience/            PULL THE GAP hero (vanilla TS + CSS, no framework)
  controller.ts        gestures -> kernel inputs; no DOM, no outcome logic
  main.ts              renderer + pointer/touch/keyboard gestures
tools/visual_check.py  gesture-driven visual verification
tools/mode_check.py    mode-identity verification (deterministic vs live)
live/                  sandbox-only live model path — see live/README.md
```

## Kernel semantics (decisions made inside canon)

- **World mutation** = change to sandbox world facts: `ADMIN_REVOKES_ACCESS` and a committed
  `EXPORT` effect. Each bumps `worldVersion` by exactly 1. Observations, prepared actions,
  verifications and blocked attempts are agent-side and never bump it.
  Every event (mutating or not) is logged with `worldVersionBefore/After`.
- **Initial version N = 1.** Revocation moves the world to 2.
- **Authority witness** = the observation a commit relies on. `commit_export(witness_version)`
  resolves the observation at that world version; the witness is stale when its
  `authorizationVersion` ≠ current `authorizationVersion`.
- **Scenario A (UNGUARDED):** models a system with *no* commit-time revalidation. The commit
  carries witness v1 into world v2 (REVOKED) and a **simulated** export effect commits
  (`realm: SANDBOX`, `simulated: true`, `authorized: false`) → outcome `UNAUTHORIZED_COMMIT`,
  `reason: STALE_AUTHORITY`, world → v3. The receipt's `stale_authority` block records the
  stale witness, `access_state_at_commit: REVOKED`, `revalidated_at_commit: false` and the effect id.
  There is no hidden sandbox gate.
- **Scenario B (GUARDED):** `verify_access()` at commit time records a new observation
  (v2, REVOKED), pending action → `INELIGIBLE`, commit → `BLOCKED`, no effect, world stays v2.
- **Controls:** with no revocation both policies → `COMMITTED` with an authorized
  (still sandbox-simulated) effect. Outcomes are computed from state, never scripted.
- **Visual law:** gap width = elapsed vulnerability interval only. Plates misregister only when a
  world mutation makes BELIEF ≠ REALITY (asserted geometrically in `tools/visual_check.py`).
- **Release** = pulling the pin latch at ACT (drag down past threshold, tap, or Enter/Space).
  Technical evidence (ledger, receipt JSON) lives behind the collapsed PROOF drawer.
- **Ticks** are a logical clock. Gap width → `gapTicks` (commit at `t = 1 + gapTicks`);
  drop position → revocation tick strictly inside the gap. Both are recorded and replayed.
- **Seed** derives the export `record_count`. Same seed + same ordered events = byte-identical receipt.
