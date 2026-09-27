# FINAL DEMO SCRIPT — 60–90 s

Presenter version of `FINAL-DEMO-PATH.md`. Lines in **bold** are the only things you say.
Everything else is what your hands do. Don't explain mechanics unless someone asks.

## Before you start (30 s of setup, off-camera)

- [ ] Open https://the-world-changed.pages.dev/ in a fresh tab (clean state; PROOF collapsed).
- [ ] Second tab: https://the-world-changed-lab.pages.dev/#live (fallback if the door is slow).
- [ ] Browser full-screen, zoom 100 %, no bookmarks bar. Desktop, 1280 px wide or more.
- [ ] Check the mode chip reads `DETERMINISTIC SANDBOX · SCRIPTED AGENT — NOT A LIVE MODEL`.
- [ ] Sound off. Nothing in the demo relies on audio.

## Script

| Time | Do | Say |
|---|---|---|
| 0–8 s | Hero loads. Point at the pass: ACCESS **GRANTED**, VALID. | **"The agent saw something that was true."** |
| 8–12 s | Drag **ACT** to the right. The ticket tears open. | *(nothing: let the tear land)* |
| 12–20 s | Drag **ADMIN REVOKES ACCESS** into the tear. Sticker slams; cyan ghost lifts off. | **"Then the world changed before it acted."** |
| 20–30 s | Make sure **CHECK AGAIN** is ON. Pull the pin. Scanner → **STOPPED**. | **"The difference is whether it checks the world again before acting."** |
| 30–38 s | Click **CHANGE THE WORLD AGAIN · ENTER THE LAB →**. PICK A WORLD appears. | **"And it isn't just access."** |
| 38–45 s | Pick **CALENDAR SLOT**. Drag **SOMEONE ELSE BOOKS IT** into the gap: **NOT ANYMORE.** | *(point at the ghost calendar)* |
| 45–55 s | Tab **CHANGE IT** → START. When **CHANGE IT NOW** appears, hit it. | **"Here you try to change the world before the agent reaches ACT."** |
| 55–68 s | Tab **REPLAY**. Click the four frames left to right. | **"Replay comes entirely from the recorded receipt: what it saw, what the world became, what it did."** |
| 68–82 s | Tab **LIVE**. Hold on REAL AGENT RUN · CLAUDE OPUS 5.5 · RECORDED GENUINE RUN · NOT RUNNING NOW. | **"This is a genuine Opus run against the same sandbox. It re-checked on its own after the world changed and stopped before commit. We're replaying it, not running it."** |
| 82–90 s | Back to the title. | **"The agent saw the truth. Then you changed the world."** |

## If something goes sideways

- **Missed the Challenge window:** say nothing, press START again. It's a 5-second round.
- **Door slow / not visible:** switch to the second tab (`#live`) and go straight to the specimen, or open `#lab`.
- **Someone asks "is it running Opus now?"** No. Public live execution is disabled on the static site because there's
  nowhere secure to hold the credentials. The specimen is a replay of one recorded run.
- **Someone asks how often Opus does this:** we have one run. It's a specimen, not a rate.

## Only if asked for technical proof

Open **PROOF** under the specimen (collapsed by default): provenance, transport, exact tool set, tool sequence,
kernel replay hash, raw receipt download. Deeper reading: `product/PROOF-APPENDIX.md`.
Do not open raw JSON unprompted.

## Never say

- that people "get it instantly" or that it was "user tested" (no human results are recorded yet);
- that the calendar or document worlds involve a model (they are simulated);
- that the replay is live.
