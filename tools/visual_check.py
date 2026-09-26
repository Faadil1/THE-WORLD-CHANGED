"""
Gesture-driven visual verification for the PULL THE GAP hero (kernel-v0, gate-review pass).

Drives REAL pointer / touch / keyboard gestures in headless Chromium and asserts the DOM
reflects kernel state at every step. Captures the canonical states.

Usage:
  npm run build && npx vite preview --port 4173 --strictPort &
  python3 tools/visual_check.py [out_dir]
"""
import json
import shutil
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://localhost:4173/"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "evidence/screenshots/kernel-v0")
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"


def center(page, sel):
    b = page.locator(sel).bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def data(page, key):
    return page.eval_on_selector("#bench", f"e => e.dataset.{key} ?? ''")


def plates_registered(page):
    """Geometric check: BELIEF and REALITY value glyphs occupy the same box."""
    r = page.locator("#reality-access").bounding_box()
    b = page.locator("#belief-access").bounding_box()
    return abs(r["x"] - b["x"]) < 0.5 and abs(r["y"] - b["y"]) < 0.5


def assert_proof_collapsed(page):
    assert page.get_attribute("#proof", "open") is None, "PROOF must be collapsed by default"
    assert not page.locator("#ledger").is_visible(), "ledger must not be in the primary viewport"


def pull_gap(page, dx):
    x, y = center(page, "#act")
    page.mouse.move(x, y)
    page.mouse.down()
    for i in range(1, 11):
        page.mouse.move(x + dx * i / 10, y)
    page.mouse.up()
    page.wait_for_timeout(350)


def drag_token_into_gap(page, frac):
    tx, ty = center(page, "#token")
    ib = page.locator("#interval").bounding_box()
    gx, gy = ib["x"] + ib["width"] * frac, ib["y"] + ib["height"] / 2
    page.mouse.move(tx, ty)
    page.mouse.down()
    for i in range(1, 16):
        page.mouse.move(tx + (gx - tx) * i / 15, ty + (gy - ty) * i / 15)
    page.mouse.up()
    page.wait_for_timeout(750)


def pull_pin(page, shot_mid=None):
    """Release: grab the latch ring and pull it down out of the catch."""
    x, y = center(page, ".latch__ring")
    page.mouse.move(x, y)
    page.mouse.down()
    for i in range(1, 6):
        page.mouse.move(x, y + 5 * i)  # 25px: under tension, not yet released
    if shot_mid:
        shot_mid()
    assert data(page, "phase") in ("OPEN", "INSERTED"), "pin must not release before travel threshold"
    for i in range(6, 11):
        page.mouse.move(x, y + 5 * i)
    page.mouse.up()


def desktop_run(browser, guarded):
    tag = "B-guarded" if guarded else "A-unguarded"
    page = browser.new_page(viewport={"width": 1180, "height": 1000})
    page.goto(URL)
    page.wait_for_selector("#bench")

    def shot(name):
        page.screenshot(path=str(OUT / f"desktop-{name}.png"), full_page=True)

    assert data(page, "misregistered") == "false" and plates_registered(page)
    assert page.locator("#release").count() == 0, "form-style RELEASE button must be gone"
    assert not page.locator("#latch").is_visible() or data(page, "latched") == "false"
    assert_proof_collapsed(page)
    if not guarded:
        shot("0-registered")

    # PULL, let go: gap latched open, world unchanged, plates still registered.
    pull_gap(page, 420)
    assert data(page, "phase") == "OPEN"
    assert data(page, "latched") == "true"
    assert data(page, "misregistered") == "false", "gap width alone must not create divergence"
    assert plates_registered(page), "plates must stay registered while only time passes"
    assert page.inner_text("#reality-version") == "1" and page.inner_text("#belief-version") == "1"
    if not guarded:
        shot("1-gap-open-world-unchanged")

    # INSERT
    drag_token_into_gap(page, 0.55)
    assert data(page, "phase") == "INSERTED"
    assert data(page, "misregistered") == "true"
    assert not plates_registered(page)
    assert page.inner_text("#reality-access") == "REVOKED"
    assert page.inner_text("#belief-access") == "GRANTED"
    assert page.inner_text("#reality-version") == "2" and page.inner_text("#belief-version") == "1"
    if not guarded:
        shot("2-event-injected-misregistered")

    if guarded:
        page.click("#guard")
        assert page.get_attribute("#guard", "aria-checked") == "true"

    # RELEASE via the latch
    pull_pin(page, shot_mid=(lambda: shot("3-pin-under-tension")) if not guarded else None)
    if guarded:
        page.wait_for_timeout(760)
        shot("4-B-reverify-snap")
    page.wait_for_selector('#bench[data-phase="RESOLVED"]', timeout=5000)
    page.wait_for_timeout(700)
    assert_proof_collapsed(page)

    outcome = data(page, "outcome")
    receipt = page.evaluate("() => window.__twc.ctl.receipt()")
    if guarded:
        assert outcome == "BLOCKED", outcome
        assert data(page, "effect") == "false"
        assert data(page, "misregistered") == "false"
        assert not page.locator("#sim").is_visible()
        shot("5-B-guarded-BLOCKED")
    else:
        assert outcome == "UNAUTHORIZED_COMMIT", outcome
        assert data(page, "effect") == "true"
        assert page.locator("#effect").is_visible()
        assert page.locator("#sim").is_visible() and "SIMULATED" in page.inner_text("#sim")
        assert data(page, "misregistered") == "true"
        shot("5-A-unguarded-UNAUTHORIZED_COMMIT")
        page.click("#proof summary")
        page.wait_for_timeout(150)
        assert page.locator("#ledger").is_visible() and page.locator("#receipt").is_visible()
        shot("6-A-proof-expanded")
    page.close()
    return receipt


def keyboard_run(browser):
    page = browser.new_page(viewport={"width": 1180, "height": 1000})
    page.emulate_media(reduced_motion="reduce")
    page.goto(URL)
    page.focus("#interval")
    for _ in range(8):
        page.keyboard.press("ArrowRight")
    page.focus("#token")
    page.keyboard.press("Enter")  # arm
    page.keyboard.press("ArrowLeft")
    page.keyboard.press("Enter")  # drop
    assert data(page, "phase") == "INSERTED"
    page.focus("#guard")
    page.keyboard.press("Space")
    page.focus("#latch")
    page.keyboard.press("Enter")  # release latch
    page.wait_for_selector('#bench[data-phase="RESOLVED"]', timeout=5000)
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / "keyboard-reduced-motion-BLOCKED.png"), full_page=True)
    out = data(page, "outcome")
    page.close()
    return out


def mobile_run(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.goto(URL)

    def shot(name):
        page.screenshot(path=str(OUT / f"mobile-{name}.png"), full_page=True)

    assert_proof_collapsed(page)
    shot("0-registered")
    # One-thumb: drag ACT, let go (latched)
    x, y = center(page, "#act")
    page.mouse.move(x, y)
    page.mouse.down()
    for i in range(1, 11):
        page.mouse.move(x + 200 * i / 10, y)
    page.mouse.up()
    page.wait_for_timeout(300)
    assert data(page, "latched") == "true" and data(page, "misregistered") == "false" and plates_registered(page)
    shot("1-gap-open-world-unchanged")
    # Tap token to arm, tap inside gap to drop
    page.locator("#token").tap()
    assert data(page, "phase") == "ARMED"
    ib = page.locator("#interval").bounding_box()
    page.touchscreen.tap(ib["x"] + ib["width"] * 0.5, ib["y"] + ib["height"] / 2)
    page.wait_for_timeout(750)
    assert data(page, "phase") == "INSERTED" and data(page, "misregistered") == "true"
    shot("2-event-injected-misregistered")
    # Tap the pin (one-thumb release)
    rx, ry = center(page, ".latch__ring")
    page.touchscreen.tap(rx, ry)
    page.wait_for_selector('#bench[data-phase="RESOLVED"]', timeout=5000)
    page.wait_for_timeout(600)
    assert data(page, "outcome") == "UNAUTHORIZED_COMMIT"
    shot("3-A-unguarded-UNAUTHORIZED_COMMIT")
    # Same world, check ON
    page.locator("#replay-other").tap()
    page.wait_for_selector('#bench[data-phase="RESOLVED"][data-policy="GUARDED"]', timeout=6000)
    page.wait_for_timeout(700)
    out = data(page, "outcome")
    assert out == "BLOCKED", out
    shot("4-B-guarded-BLOCKED")
    ctx.close()
    return out


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME)
    a = desktop_run(browser, guarded=False)
    b = desktop_run(browser, guarded=True)
    kb = keyboard_run(browser)
    mob = mobile_run(browser)
    browser.close()

summary = {
    "desktop_A_outcome": a["outcome"],
    "desktop_A_stale_authority": a["stale_authority"],
    "desktop_A_effects": a["final_state"]["committed_effects"],
    "desktop_B_outcome": b["outcome"],
    "desktop_B_effects": b["final_state"]["committed_effects"],
    "keyboard_reduced_motion_outcome": kb,
    "mobile_final_outcome": mob,
    "screenshots": sorted(x.name for x in OUT.glob("*.png")),
}
(OUT / "visual-check.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
