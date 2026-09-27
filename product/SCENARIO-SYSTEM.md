# SCENARIO SYSTEM

`experience/scenarios/` — pure, DOM-free, deterministic.

```ts
ScenarioDefinition { id, title, provenance, visual: { object, accent }, copy, run(input) → LabReceipt }
ExperimentInput    { seed, gapTicks, mutationTick | null, policy: UNGUARDED | GUARDED, mode }
```

Ticks: observe t0, prepare t1, act t(1 + gap). `mutationTiming()` — a change must be > t1; `< act` is IN TIME,
`≥ act` is TOO LATE (applied after the act), `null` is NONE.

| World | Engine | Valid → changed | Prepared action | Unchecked | Checked |
|---|---|---|---|---|---|
| ACCESS PASS | **canonical kernel** via `access.ts` (runScenario / applyEvent; wrap, not modify) | GRANTED → REVOKED (ADMIN REVOKES ACCESS) | export customer records | OUTDATED PASS USED · EXPORT SENT · SIMULATED (`UNAUTHORIZED_COMMIT`) | RE-CHECKED · STOPPED (`BLOCKED`) |
| CALENDAR SLOT | sandbox engine (`sandbox-engine.ts`) | AVAILABLE → BOOKED (SOMEONE ELSE BOOKS IT) | confirm meeting | DOUBLE-BOOKED · INVITE SENT · SIMULATED (`STALE_COMMIT`) | RE-CHECKED · STOPPED |
| DOCUMENT | sandbox engine | CURRENT → SUPERSEDED (NEW VERSION REPLACES IT) | send this version | OUTDATED VERSION SENT · OLD DRAFT SENT · SIMULATED | RE-CHECKED · STOPPED |

The sandbox engine mirrors the kernel's observable semantics (observe, prepare, one mutation, optional
commit-time verify, commit; an effect bumps the world version) and is a separate module: the canonical kernel
is not modified (`simulation/` has no diff on this branch). ACCESS receipts reproduce the committed canonical
receipts' `replay_hash` exactly (tested).

## LabReceipt (observable only)
`scenario, provenance, mode, seed, realm: SANDBOX, simulated: true, policy, initial_world, prepared_action,
mutation, timing {act_tick, mutation_tick, mutation_in_time}, steps[] {seq, tick, kind, actor, tool,
world_version_before/after, world_value, belief_value, belief_version, divergent, act_result}, outcome {kind,
label, raw_result, effect}, private_reasoning: NOT_RECORDED`.

`divergent` = belief ≠ reality after the step; only a MUTATE step can introduce it (asserted by `verifyReplay`).

## Adding a world
Write a `ScenarioCopy`, pick/extend a visual face in `lab/world-object.ts`, register in `scenarios/index.ts`. If
it needs different mechanics, give it its own engine — never change the canonical kernel. No scenario may
perform or imply a real external effect.
