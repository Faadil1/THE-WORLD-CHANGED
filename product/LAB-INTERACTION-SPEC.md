# LAB INTERACTION SPEC

All states are frames of an observable receipt; the UI never decides an outcome.

## Door (hero → Lab)
After a deterministic hero outcome, `#door` (lime ticket stub, `CHANGE THE WORLD AGAIN / ENTER THE LAB →`)
appears in the verdict. Activating it slides the finished pass off the table (WAAPI, 620 ms) and routes to
`#lab`. Reduced motion: no slide. Hidden in live/unverified hero modes.

## PICK A WORLD (`#lab`)
Three objects on the table (pass, calendar sheet, document stack), each a button labelled with its provenance
(`canonical sandbox` / `simulated world`). Two branches below: **CAN YOU CHANGE THE WORLD BEFORE IT ACTS?** and
**REAL AGENT RUN**.

## Experiment (`#lab/<world>`)
Headline = state (`IT WAS TRUE.` / `IT WAS FREE.` / `IT WAS THE LATEST.` → `NOT ANYMORE.` → `THE WORLD CHANGED.`,
or `STILL TRUE.` when nothing changed).

| Control | Pointer | Touch | Keyboard |
|---|---|---|---|
| gap (ticket) | drag ACT stub | drag ACT stub | focus strip, ←/→ (Shift ×4) |
| when the world changes | drag sticker into the tear | tap sticker, tap inside the tear | Enter on sticker, ←/→, Enter |
| CHECK AGAIN | click gate | tap | Space/Enter (role=switch) |
| act | PULL TO ACT | tap | Enter |

Gap-only never shows the ghost. A change lands strictly between prepare (t1) and act; the ticket clamps it.
On act: playhead travels (620 ms); if CHECK AGAIN, a lime scanner reads the current object, the ghost snaps
back into register, then the stamp lands. Result: stamp, one line, SIMULATED tag if an effect happened, one
primary next step (**SAME WORLD, TWO OUTCOMES →**) and three links (REPLAY · CHANGE THE WORLD AGAIN · TRY TO
BEAT THE AGENT). PROOF collapsed.

## Challenge (`#challenge/<world>`)
CHECK AGAIN is chosen before START. START: the agent looks (0.7 s), prepares, then travels LOOK→ACT over
`CHALLENGE_WINDOW_MS` (9 ticks × 560 ms = 5.04 s). The visitor's one move: drag the coral CHANGE IT NOW
sticker into the live gap, tap it, or press Space/Enter. Wall-clock → tick happens only in
`scenarios/challenge.ts`. A change at tick < 11 is IN TIME (ghost appears immediately, `NOT ANYMORE.`); a press in
the 1.1 s grace after ACT is recorded as TOO LATE (`ACTED_VALID`, `TOO LATE.`); no press → `STILL TRUE.`. No points,
no streaks. Reduced motion: the agent moves in whole ticks; timing identical. Mobile: the sticker becomes
sticky at the thumb while travelling.

## SAME WORLD, TWO OUTCOMES (`#lab/<world>/same`)
One object split by a seam: left = DIDN'T CHECK AGAIN (kernel/engine UNGUARDED receipt), right = CHECKED AGAIN
(GUARDED receipt) — same seed, gap, mutation, prepared action. Drag anywhere on the object, ←/→ (10 %), Home/End
on the seam (role=slider), or FLIP. Paths under the object: `DIDN'T CHECK AGAIN ↓ <stale outcome> ↓ <effect>` /
`CHECKED AGAIN ↓ CURRENT WORLD READ ↓ STOPPED · NO EFFECT`.

## Accessibility
Every control ≥ 44 px (primary 56–76 px); focus rings violet 3 px; objects expose a polite live description
("the agent saw GRANTED (v1); the world is now REVOKED (v2). What it knew is old."); meaning is never colour-only
(ghost = outline print + offset + OLD flag; change = sticker + CHANGED; stop = double-ruled stamp).
