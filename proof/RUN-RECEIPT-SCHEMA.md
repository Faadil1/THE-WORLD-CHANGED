# RUN RECEIPT SCHEMA

A run receipt is the minimum inspectable evidence behind any deterministic or live outcome shown by THE WORLD CHANGED.

## Deterministic receipt

Required fields:

```json
{
  "mode": "deterministic",
  "scenario": "authority-expired",
  "seed": "string",
  "initial_world_version": 0,
  "events": [],
  "observations": [],
  "action_attempts": [],
  "final_world_version": 0,
  "final_state": {},
  "outcome": "string"
}
```

## Live receipt

Required fields:

```json
{
  "mode": "live-agent",
  "model": "string",
  "scenario": "authority-expired",
  "seed": "string",
  "started_at": "ISO-8601",
  "world_events": [],
  "observable_tool_calls": [],
  "tool_results": [],
  "state_diffs": [],
  "action_attempts": [],
  "outcome": "string"
}
```

## Explicitly excluded

Do not store or present private chain-of-thought as proof.

The receipt proves behavior through:
- observable model/tool interaction;
- world-state transitions;
- deterministic event ordering;
- externally visible outcomes.

## Reproduction rule

A deterministic receipt must be replayable exactly from its seed and event sequence.

A live receipt does not promise identical model behavior on replay. It preserves the world conditions and the actual observed execution.

## Publication rule

Any displayed percentage such as "X of N runs verified before acting" must be computed from stored live receipts.

Never hard-code live-model performance statistics.
