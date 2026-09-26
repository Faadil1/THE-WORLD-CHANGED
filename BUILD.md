# BUILD — kernel-v0

Branch: `build/kernel-v0` · Phase: TECHNICAL REALITY CHECK

## Commands

```bash
npm install
npm test               # 54 kernel / receipt / controller / boundary tests
npm run typecheck
npm run receipts       # regenerate evidence/runs/deterministic/*.json (tests fail if they drift)
npm run dev            # PULL THE GAP hero at http://localhost:5173
npm run build && npx vite preview --port 4173 &
npm run verify:visual  # headless Chromium, real pointer/touch/keyboard gestures -> evidence/screenshots/kernel-v0/
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
```

## Kernel semantics (decisions made inside canon)

- **World mutation** = change to external world facts: `ADMIN_REVOKES_ACCESS` and a committed
  `EXPORT` effect. Each bumps `worldVersion` by exactly 1. Observations, prepared actions,
  verifications and rejected/blocked attempts are agent-side and never bump it.
  Every event (mutating or not) is logged with `worldVersionBefore/After`.
- **Initial version N = 1.** Revocation moves the world to 2.
- **Authority witness** = the observation a commit relies on. `commit_export(witness_version)`
  resolves the observation at that world version; the witness is stale when its
  `authorizationVersion` ≠ current `authorizationVersion`.
- **Scenario A (unguarded):** commit carries witness v1 into world v2 → sandbox commit gate
  rejects → `STALE_AUTHORITY`, `witness_stale: true`, **no effect committed**.
- **Scenario B (guarded):** `verify_access()` at commit time records a new observation
  (v2, REVOKED), pending action → `INELIGIBLE`, commit → `BLOCKED`, no effect.
- **Controls:** with no revocation both policies → `COMMITTED` (effect recorded, world → v2).
  Outcomes are computed from state, never scripted.
- **Ticks** are a logical clock. Gap width → `gapTicks` (commit at `t = 1 + gapTicks`);
  drop position → revocation tick strictly inside the gap. Both are recorded and replayed.
- **Seed** derives the export `record_count`. Same seed + same ordered events = byte-identical receipt.
