"""
Visual verification for the PULL THE GAP hero (kernel-v0).

Drives REAL pointer gestures (not controller shortcuts) in headless Chromium and captures
each canonical state. Asserts the DOM reflects kernel state at each step.

Usage:
  npm run build && npx vite preview --port 4173 &
  python3 tools/visual_check.py [out_dir]
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://localhost:4173/"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "evidence/screenshots/kernel-v0")
OUT.mkdir(parents=True, exist_ok=True)
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"


def center(page, sel):
    b = page.locator(sel).bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def data(page, key):
    return page.eval_on_selector("#bench", f"e => e.dataset.{key}")


def pull_gap(page, dx):
    x, y = center(page, "#act")
    page.mouse.move(x, y)
    page.mouse.down()
    for i in range(1, 11):
        page.mouse.move(x + dx * i / 10, y)
    return x, y


def drag_token_into_gap(page, frac):
    tx, ty = center(page, "#token")
    ib = page.locator("#interval").bounding_box()
    gx, gy = ib["x"] + ib["width"] * frac, ib["y"] + ib["height"] / 2
    page.mouse.move(tx, ty)
    page.mouse.down()
    for i in range(1, 16):
        page.mouse.move(tx + (gx - tx) * i / 15, ty + (gy - ty) * i / 15)
    return gx, gy


def desktop_run(browser, guarded):
    tag = "B-guarded" if guarded else "A-unguarded"
    page = browser.new_page(viewport={"width": 1180, "height": 980}, device_scale_factor=1)
    page.goto(URL)
    page.wait_for_selector("#bench")
    shots = []

    def shot(name):
        p = OUT / f"desktop-{tag}-{name}.png"
        page.screenshot(path=str(p), full_page=True)
        shots.append(p.name)

    if not guarded:
        shot("0-default-registered")
    assert data(page, "misregistered") == "false"

    # PRESS + PULL (held)
    pull_gap(page, 420)
    if not guarded:
        shot("1-pull-held")
    assert data(page, "phase") == "OPEN", data(page, "phase")
    assert data(page, "misregistered") == "false", "pulling alone must not change the world"
    page.mouse.up()
    page.wait_for_timeout(350)

    # INSERT (drag, hover before drop)
    gx, gy = drag_token_into_gap(page, 0.55)
    if not guarded:
        shot("2-insert-hover")
    page.mouse.up()
    page.wait_for_timeout(750)
    assert data(page, "phase") == "INSERTED"
    assert data(page, "misregistered") == "true"
    assert page.inner_text("#reality-access") == "REVOKED"
    assert page.inner_text("#belief-access") == "GRANTED"
    assert page.inner_text("#reality-version") == "2" and page.inner_text("#belief-version") == "1"
    if not guarded:
        shot("3-misregistered")

    if guarded:
        page.click("#guard")
        assert page.get_attribute("#guard", "aria-checked") == "true"
        shot("3-misregistered-check-on")

    page.click("#release")
    if guarded:
        page.wait_for_timeout(700)  # after sweep + VERIFY, during re-register
        shot("4-reverify-snap")
    page.wait_for_selector('#bench[data-phase="RESOLVED"]', timeout=5000)
    page.wait_for_timeout(700)
    shot("5-outcome")
    outcome = data(page, "outcome")
    expected = "BLOCKED" if guarded else "STALE_AUTHORITY"
    assert outcome == expected, (outcome, expected)
    assert data(page, "misregistered") == ("false" if guarded else "true")
    ctl_receipt = page.evaluate("() => window.__twc.ctl.receipt()")
    page.close()
    return shots, ctl_receipt


def keyboard_run(browser):
    page = browser.new_page(viewport={"width": 1180, "height": 980})
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
    page.focus("#interval")
    page.keyboard.press("Enter")  # release
    page.wait_for_selector('#bench[data-phase="RESOLVED"]', timeout=5000)
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / "keyboard-reduced-motion-outcome.png"), full_page=True)
    out = data(page, "outcome")
    page.close()
    return out


def mobile_run(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.goto(URL)
    page.screenshot(path=str(OUT / "mobile-0-default.png"), full_page=True)
    # One-thumb path: drag ACT with the mouse-equivalent pointer, tap token to arm, tap inside gap.
    x, y = center(page, "#act")
    page.mouse.move(x, y)
    page.mouse.down()
    for i in range(1, 11):
        page.mouse.move(x + 200 * i / 10, y)
    page.mouse.up()
    page.wait_for_timeout(300)
    page.locator("#token").tap()
    assert data(page, "phase") == "ARMED", data(page, "phase")
    ib = page.locator("#interval").bounding_box()
    page.touchscreen.tap(ib["x"] + ib["width"] * 0.5, ib["y"] + ib["height"] / 2)
    page.wait_for_timeout(750)
    assert data(page, "phase") == "INSERTED", data(page, "phase")
    page.screenshot(path=str(OUT / "mobile-1-misregistered.png"), full_page=True)
    page.locator("#release").tap()
    page.wait_for_selector('#bench[data-phase="RESOLVED"]', timeout=5000)
    page.wait_for_timeout(600)
    page.screenshot(path=str(OUT / "mobile-2-outcome-unguarded.png"), full_page=True)
    page.locator("#replay-other").tap()
    page.wait_for_timeout(3200)
    page.screenshot(path=str(OUT / "mobile-3-replay-guarded.png"), full_page=True)
    out = data(page, "outcome")
    ctx.close()
    return out


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME)
    errors = []
    a_shots, a_receipt = desktop_run(browser, guarded=False)
    b_shots, b_receipt = desktop_run(browser, guarded=True)
    kb = keyboard_run(browser)
    mob = mobile_run(browser)
    browser.close()

summary = {
    "desktop_unguarded_outcome": a_receipt["outcome"],
    "desktop_unguarded_stale_authority": a_receipt["stale_authority"],
    "desktop_guarded_outcome": b_receipt["outcome"],
    "keyboard_reduced_motion_outcome": kb,
    "mobile_replay_outcome": mob,
    "screenshots": sorted(x.name for x in OUT.glob("*.png")),
}
(OUT / "visual-check.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
