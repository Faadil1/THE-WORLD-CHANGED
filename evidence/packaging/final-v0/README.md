# FINAL PACKAGING V0: asset set

Branch `packaging/final-v0`. Every pixel of product footage and every screenshot is captured from the real build
(`experience/`, deterministic seed `twc-hero-0001`, recorded live receipt). Nothing is mocked, re-drawn or
composited into a device. Kernel, receipts, scenarios and product code are unchanged (same bundle hashes).

## Covers (`covers/`, PNG)

| Direction | 16:9 · 1920×1080 | 1:1 · 1080×1080 | 4:5 · 1080×1350 |
|---|---|---|---|
| **A · NOT ANYMORE.** (default launch thumbnail) | `twc-cover-A-not-anymore-16x9.png` | `…-1x1.png` | `…-4x5.png` |
| B · IT WAS TRUE. | `twc-cover-B-it-was-true-16x9.png` | `…-1x1.png` | `…-4x5.png` |
| C · THE WORLD CHANGED. | `twc-cover-C-the-world-changed-16x9.png` | `…-1x1.png` | `…-4x5.png` |

A is the default: current REVOKED pass, cyan AGENT SAW · v1 · OLD ghost lifted out of register, coral
NO LONGER VALID sticker, and ADMIN REVOKES ACCESS slapped in the corner. The objects are isolated product
elements captured at 3× (`tools/packaging/capture_objects.py`), not illustrations.

## Video (`trailer/`, H.264, 30 fps, no audio track)

| File | Size | Duration | Story |
|---|---|---|---|
| `twc-cut-15s-16x9.mp4` | 1920×1080 | **15.00 s** | IT WAS TRUE. → PULL THE GAP. → ADMIN REVOKES ACCESS / NOT ANYMORE. → old pass vs current world → CHECK AGAIN. / STOPPED → THE WORLD CHANGED. |
| `twc-cut-15s-4x5.mp4` | 1080×1350 | **15.00 s** | same beats, stacked phone layout, camera pans pass ↔ ticket |
| `twc-trailer-16x9.mp4` | 1920×1080 | **40.00 s** | hook → ACCESS outcome → ENTER THE LAB → PICK A WORLD. → CALENDAR → CHANGE IT → REPLAY → REAL AGENT RUN · CLAUDE OPUS 5.5 → THE WORLD CHANGED. + URL |

`trailer/edits.json` lists every shot with its start time. Silent by design: every beat is carried by
product headlines, stickers, stamps and three short type tags (PULL THE GAP. · CHECK AGAIN. · CHANGE IT.).
The only technical copy is provenance: the 15 s end card carries `DETERMINISTIC SANDBOX · SCRIPTED AGENT — NOT A
LIVE MODEL`; the trailer's live section keeps `RECORDED GENUINE RUN · … · NOT RUNNING NOW` on screen throughout.
Deterministic footage and the Opus specimen are separate sections, never cut together as one run.

A small ink ring (lime while pressed) marks recorded pointer presses so a silent viewer can see what was pulled
or tapped. There is no cursor travel.

## Screenshots (`screenshots/`, JPEG q90)

| # | Beat | desktop 2880×1800 | portfolio 4:5 1600×2000 | mobile 1170×2532 |
|---|---|---|---|---|
| 01 | IT WAS TRUE. | ✓ | ✓ | ✓ |
| 02 | NOT ANYMORE. | ✓ | ✓ | ✓ |
| 03 | PICK A WORLD. | ✓ | ✓ | |
| 04 | CHANGE IT. | ✓ | ✓ | ✓ (thumb-sized CHANGE IT NOW) |
| 05 | SAME WORLD, TWO OUTCOMES. | ✓ | ✓ | |
| 06 | REPLAY WHAT THE AGENT SAW. | ✓ | ✓ | |
| 07 | REAL AGENT RUN. | ✓ | ✓ | |

Mobile only where the phone layout tells the story better: on a phone the pass *is* the hero, and CHANGE IT NOW
becomes a thumb button.

## README visuals (`readme/`)

`twc-readme-hero.jpg` (cover A) · `twc-readme-loop.gif` (15 s cut, 640 px, 10 fps, grain denoised for GIF size) ·
`twc-readme-lab.jpg` (WORLD / CHANGE IT / REPLAY / LIVE) · `twc-readme-proof.jpg` (SPECIMEN 001 at t3: re-verified, stopped).

## Contact sheets (`contact-sheets/`)

`covers.jpg` · `screenshots-desktop.jpg` · `screenshots-portfolio-mobile.jpg` · `cut15-16x9.jpg` · `cut15-4x5.jpg` · `trailer-16x9.jpg`

## Copy (`social/`)

`linkedin.md` · `x.md` (main post, proof reply, short alt; each under 280 with URL counted at 23) ·
`portfolio-intro.md` · `github-description.txt` (191 chars) · `github-topics.txt`.
Canonical source remains `product/PACKAGING-COPY.md`. Long-form: `product/FINAL-CASE-STUDY.md`,
`product/PROOF-APPENDIX.md`, `product/FINAL-DEMO-SCRIPT.md`.

## Reproduce

```bash
npm ci && npm run build && npx vite preview --port 4173 --strictPort &
W=/tmp/twc-packaging
python3 tools/packaging/capture_objects.py $W                    # 3x isolated product objects + stills
python3 tools/packaging/covers.py $W evidence/packaging/final-v0/covers
python3 tools/packaging/takes.py $W                              # real-product takes (asserts kernel state)
python3 tools/packaging/edits.py $W evidence/packaging/final-v0/trailer
python3 tools/packaging/screenshots.py $W evidence/packaging/final-v0/screenshots
python3 tools/packaging/sheets.py evidence/packaging/final-v0 $W
```

`takes.py` slows the page's clock (CSS/WAAPI playback rate + a time shim for timers) so Chromium can capture 2×
frames smoothly. It changes only the wall clock the page sees, never product state, and it asserts the same
kernel/receipt-driven DOM states as `tools/lab_check.py` and `tools/storyboard.py`.

## Intentionally not committed

- raw takes (≈1.1 GB of 2× JPEG frames) and 3× object PNGs: regenerate with the commands above;
- a lossless/high-bitrate trailer master (CRF 17 ≈ 18 MB); the committed trailer is CRF 25 (≈10 MB);
- an animated-WebP loop (no smaller than the GIF at equal quality).

## References

No reference sites were browsed for this pass. The established TRACE direction (Thonik typography-as-composition,
Are.na pass/ticket/print artifacts, Annual Report Gallery proof hierarchy, 60FPS/Transitions.dev motion craft) was
applied from the existing visual system. It was not re-sourced.

## Claims

No asset states or implies human validation. P01–P05 sheets are empty (`product/PROOF-APPENDIX.md` §9).
