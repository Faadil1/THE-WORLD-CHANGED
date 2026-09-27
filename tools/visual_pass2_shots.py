"""
Visual pass 2 screenshot set ("ACCESS PASS / REALITY TEAR"), driven by real gestures.

  desktop (1440x900):          initial, gap-open, world-changed, stale, unguarded-outcome, guarded-outcome
  mobile (390x844, touch):     initial, world-changed, guarded-outcome
  reduced-motion (1440x900):   initial, stale, guarded-outcome

"world-changed" is captured while the cancellation sticker lands (~180 ms after the drop);
"stale" once the cyan ghost has settled out of register. Both are the same kernel state.
Each shot asserts the kernel-driven DOM state it claims to show.

Usage: npm run build && npx vite preview --port 4173 --strictPort &
       python3 tools/visual_pass2_shots.py [out_dir]
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://localhost:4173/?seed=twc-hero-0001"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "evidence/screenshots/visual-pass-2")
OUT.mkdir(parents=True, exist_ok=True)
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
log = {}


def data(page, key):
    return page.eval_on_selector("#bench", f"e => e.dataset.{key} ?? ''")


def center(page, sel):
    page.locator(sel).scroll_into_view_if_needed()
    b = page.locator(sel).bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def pull_gap(page, dx):
    x, y = center(page, "#act")
    page.mouse.move(x, y)
    page.mouse.down()
    for i in range(1, 13):
        page.mouse.move(x + dx * i / 12, y)
    page.mouse.up()
    page.wait_for_timeout(350)


def drop_token(page, frac=0.55):
    page.locator("#gapline").scroll_into_view_if_needed()
    tx, ty = center(page, "#token")
    ib = page.locator("#interval").bounding_box()
    gx, gy = ib["x"] + ib["width"] * frac, ib["y"] + ib["height"] / 2
    page.mouse.move(tx, ty)
    page.mouse.down()
    for i in range(1, 13):
        page.mouse.move(tx + (gx - tx) * i / 12, ty + (gy - ty) * i / 12)
    page.mouse.up()


def pull_tab(page):
    x, y = center(page, ".latch__ring")
    page.mouse.move(x, y)
    page.mouse.down()
    for i in range(1, 11):
        page.mouse.move(x, y + 5 * i)
    page.mouse.up()
    page.wait_for_selector('#bench[data-phase="RESOLVED"]', timeout=5000)
    page.wait_for_timeout(700)


def shot(page, name, full=False, **state):
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=full)
    got = {k: data(page, k) for k in state}
    assert all(got[k] == v for k, v in state.items()), (name, got, state)
    got["headline_text"] = page.inner_text("#headline-text")
    assert page.get_attribute("#proof", "open") is None, "PROOF must stay collapsed"
    log[name] = got


def flow(browser, prefix, viewport, reduced=False, guarded_only=False, names=None):
    ctx = browser.new_context(viewport=viewport, reduced_motion="reduce" if reduced else "no-preference")
    page = ctx.new_page()
    page.goto(URL)
    page.wait_for_selector("#mode-label")
    page.wait_for_timeout(500)
    want = names or {"initial", "gap-open", "world-changed", "stale", "guarded-outcome"}
    if "initial" in want:
        shot(page, f"{prefix}-initial", misregistered="false", headline="true")
    pull_gap(page, viewport["width"] * (0.45 if viewport["width"] > 600 else 0.5))
    if "gap-open" in want:
        page.evaluate("window.scrollTo(0, 0)")
        shot(page, f"{prefix}-gap-open", phase="OPEN", misregistered="false", headline="true")
    drop_token(page)
    if "world-changed" in want:
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(180)
        shot(page, f"{prefix}-world-changed", changed="true", headline="notanymore")
    page.wait_for_timeout(1000)
    if "stale" in want:
        page.evaluate("window.scrollTo(0, 0)")
        shot(page, f"{prefix}-stale", misregistered="true", stale="true", headline="notanymore")
    page.locator("#guard").click()
    pull_tab(page)
    page.evaluate("window.scrollTo(0, 0)")
    shot(page, f"{prefix}-guarded-outcome", full=True, outcome="BLOCKED", stopped="true", effect="false", headline="changed")
    ctx.close()


def unguarded(browser):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(URL)
    page.wait_for_selector("#mode-label")
    pull_gap(page, 640)
    drop_token(page)
    page.wait_for_timeout(900)
    pull_tab(page)
    page.evaluate("window.scrollTo(0, 0)")
    shot(page, "desktop-unguarded-outcome", full=True, outcome="UNAUTHORIZED_COMMIT", effect="true", misregistered="true", headline="changed")
    assert "SIMULATED" in page.inner_text("#sim")
    ctx.close()


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME)
    flow(b, "desktop", {"width": 1440, "height": 900})
    unguarded(b)
    flow(b, "mobile", {"width": 390, "height": 844}, names={"initial", "world-changed", "guarded-outcome"})
    flow(b, "reduced-motion", {"width": 1440, "height": 900}, reduced=True, names={"initial", "stale", "guarded-outcome"})
    b.close()

(OUT / "shots.json").write_text(json.dumps(log, indent=2) + "\n")
print(json.dumps(sorted(log), indent=1))
