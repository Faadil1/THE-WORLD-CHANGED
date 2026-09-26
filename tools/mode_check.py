"""
Mode identity check in a real browser (LIVE-PROOF-GATE "UI distinction").

Deterministic: the exact deterministic label is visible before, during and after a full
gesture-driven run, and no live label ever appears.
Live: /?mode=live shows the exact live label; no scripted/deterministic wording appears; with no
recorded run it shows no world at all; with a recorded genuine run it shows that run's outcome.

Usage: npm run build && npx vite preview --port 4173 --strictPort &  ;  python3 tools/mode_check.py [out_dir]
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://localhost:4173/"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "evidence/screenshots/live-proof-v0")
OUT.mkdir(parents=True, exist_ok=True)
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
DET = "DETERMINISTIC SANDBOX · SCRIPTED AGENT — NOT A LIVE MODEL"
LIVE = "LIVE MODEL · CLAUDE OPUS 5.5 · SANDBOX TOOLS ONLY"
LIVE_RECEIPTS = sorted(Path("evidence/runs/live").glob("*.json"))


def label(page):
    loc = page.locator("#mode-label")
    assert loc.is_visible(), "mode label must be visible"
    return loc.inner_text()


def center(page, sel):
    b = page.locator(sel).bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def deterministic(browser):
    page = browser.new_page(viewport={"width": 1180, "height": 1000})
    page.goto(URL)
    seen = [label(page)]  # before
    x, y = center(page, "#act")
    page.mouse.move(x, y); page.mouse.down()
    for i in range(1, 11):
        page.mouse.move(x + 42 * i, y)
    page.mouse.up(); page.wait_for_timeout(300)
    seen.append(label(page))
    tx, ty = center(page, "#token")
    ib = page.locator("#interval").bounding_box()
    page.mouse.move(tx, ty); page.mouse.down()
    for i in range(1, 16):
        page.mouse.move(tx + (ib["x"] + ib["width"] * 0.5 - tx) * i / 15, ty + (ib["y"] + 28 - ty) * i / 15)
    page.mouse.up(); page.wait_for_timeout(600)
    seen.append(label(page))
    rx, ry = center(page, ".latch__ring")
    page.mouse.move(rx, ry); page.mouse.down()
    for i in range(1, 11):
        page.mouse.move(rx, ry + 5 * i)
    seen.append(label(page))  # during commit sweep
    page.mouse.up()
    page.wait_for_selector('#bench[data-phase="RESOLVED"]', timeout=5000)
    page.wait_for_timeout(500)
    seen.append(label(page))  # after
    body = page.inner_text("body")
    page.screenshot(path=str(OUT / "mode-deterministic-after-run.png"), full_page=True)
    page.close()
    assert all(s == DET for s in seen), seen
    assert LIVE not in body and "LIVE MODEL ·" not in body
    return {"labels_before_during_after": seen, "outcome": "resolved", "live_label_absent": True}


def live(browser, run=None):
    page = browser.new_page(viewport={"width": 1180, "height": 1000})
    page.goto(URL + "?mode=live" + (f"&run={run}" if run else ""))
    page.wait_for_selector("#mode-label")
    lab = label(page)
    body = page.inner_text("body")
    mode = page.eval_on_selector("#bench", "e => e.dataset.mode")
    stamp = page.inner_text("#stamp")
    name = f"mode-live-{run.split('.')[0] if run else 'empty'}.png"
    page.screenshot(path=str(OUT / name), full_page=True)
    plates_visible = page.locator(".plates").is_visible()
    page.close()
    for word in ("SCRIPTED", "DETERMINISTIC", "NOT A LIVE"):
        assert word not in body.upper(), (word, body[:300])
    return {"run": run, "mode": mode, "label": lab, "stamp": stamp, "plates_visible": plates_visible, "screenshot": name}


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME)
    det = deterministic(browser)
    empty = live(browser)
    runs = [live(browser, r.name) for r in LIVE_RECEIPTS]
    browser.close()

if not LIVE_RECEIPTS:
    assert empty["label"] == LIVE and empty["mode"] == "live" and empty["stamp"] == "NO LIVE RUN RECORDED YET" and not empty["plates_visible"], empty
for r in runs:
    rec = json.loads((Path("evidence/runs/live") / r["run"]).read_text())
    assert r["label"] == LIVE and r["mode"] == "live", r
    assert r["stamp"] == rec["outcome"].replace("_", " "), (r["stamp"], rec["outcome"])

summary = {"deterministic": det, "live_default": empty, "live_runs": runs}
(OUT / "mode-check.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
