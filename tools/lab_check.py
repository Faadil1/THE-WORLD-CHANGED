"""
PRODUCT_EXPANSION_V0 browser validation: front door -> Lab -> Challenge -> Replay -> Live.

Drives real gestures in three variants and asserts the receipt-driven DOM state at each step:
  desktop         1440x900, mouse drag
  mobile          390x844, touch (tap-to-arm / tap-to-drop, thumb button)
  reduced-motion  1440x900, prefers-reduced-motion + keyboard only

Writes JPEG evidence + contact sheets + lab-check.json (no giant PNG regression sets).

Usage: npm run build && npx vite preview --port 4173 --strictPort &
       python3 tools/lab_check.py [out_dir]
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173/"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "evidence/screenshots/agent-lab-v0")
OUT.mkdir(parents=True, exist_ok=True)
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
results = {}


class Run:
    def __init__(self, browser, name, viewport, touch=False, reduced=False, keyboard=False):
        self.name, self.touch, self.keyboard = name, touch, keyboard
        self.ctx = browser.new_context(viewport=viewport, has_touch=touch, is_mobile=touch, device_scale_factor=1,
                                       reduced_motion="reduce" if reduced else "no-preference")
        self.page = self.ctx.new_page()
        self.errors = []
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        self.page.on("console", lambda m: m.type == "error" and self.errors.append(m.text))
        self.shots = []
        self.checks = {}

    def shot(self, label, full=False):
        path = OUT / self.name / f"{len(self.shots):02d}-{label}.jpg"
        path.parent.mkdir(parents=True, exist_ok=True)
        self.page.screenshot(path=str(path), full_page=full, type="jpeg", quality=72)
        self.shots.append((label, path))

    def attr(self, sel, name):
        return self.page.get_attribute(sel, name)

    def center(self, sel):
        # Plain scrollIntoView: Playwright's own scrolling waits for the element to stop moving,
        # which never happens for the pulsing CHANGE IT NOW sticker during travel.
        loc = self.page.locator(sel).first
        loc.evaluate("e => { const r = e.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) e.scrollIntoView({block: 'center'}); }")
        b = loc.bounding_box()
        return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2

    def drag(self, sel_from, to_xy, steps=14):
        x, y = self.center(sel_from)
        self.page.mouse.move(x, y)
        self.page.mouse.down()
        tx, ty = to_xy(x, y) if callable(to_xy) else self.at(to_xy) if isinstance(to_xy, tuple) and isinstance(to_xy[0], str) else to_xy
        for i in range(1, steps + 1):
            self.page.mouse.move(x + (tx - x) * i / steps, y + (ty - y) * i / steps)
        self.page.mouse.up()

    def at(self, target):
        """(selector, fx, fy): a point inside an element, measured AFTER any scrolling."""
        sel, fx, fy = target
        b = self.page.locator(sel).first.bounding_box()
        return b["x"] + b["width"] * fx, b["y"] + b["height"] * fy

    def tap(self, sel=None, xy=None):
        if sel:
            self.page.touchscreen.tap(*self.center(sel))
        else:
            self.page.touchscreen.tap(*xy)

    def press_on(self, sel, *keys):
        self.page.locator(sel).first.focus()
        for k in keys:
            self.page.keyboard.press(k)

    def activate(self, sel):
        if self.keyboard:
            self.press_on(sel, "Enter")
        elif self.touch:
            self.tap(sel)
        else:
            self.page.locator(sel).first.click()


def hero_to_lab(r):
    p = r.page
    p.goto(BASE)
    p.wait_for_selector("#mode-label")
    assert p.get_attribute("#proof", "open") is None
    assert not p.locator("#door").is_visible(), "door must not show before an outcome"
    r.shot("front-door-initial")
    # pull the gap, revoke, check again, release (keyboard path in reduced/keyboard variant)
    if r.keyboard:
        r.press_on("#interval", *["ArrowRight"] * 8)
        r.press_on("#token", "Enter", "ArrowLeft", "Enter")
    else:
        x, y = r.center("#act")
        p.mouse.move(x, y); p.mouse.down()
        for i in range(1, 12):
            p.mouse.move(x + (180 if r.touch else 520) * i / 11, y)
        p.mouse.up()
        p.wait_for_timeout(300)
        if r.touch:
            r.tap("#token")
            ib = p.locator("#interval").bounding_box()
            r.tap(xy=(ib["x"] + ib["width"] * 0.5, ib["y"] + ib["height"] / 2))
        else:
            r.drag("#token", ("#interval", 0.55, 0.5))
    p.wait_for_timeout(900)
    assert p.eval_on_selector("#bench", "e => e.dataset.misregistered") == "true"
    p.evaluate("window.scrollTo(0,0)")
    r.shot("front-door-stale")
    r.activate("#guard")
    if r.keyboard:
        r.press_on("#latch", "Enter")
    elif r.touch:
        r.tap(".latch__ring")
    else:
        r.page.locator("#latch").click()
    p.wait_for_selector('#bench[data-phase="RESOLVED"]', timeout=6000)
    p.wait_for_timeout(700)
    assert p.eval_on_selector("#bench", "e => e.dataset.outcome") == "BLOCKED"
    assert p.locator("#door").is_visible(), "door appears after an outcome"
    p.evaluate("window.scrollTo(0,0)")
    r.shot("front-door-guarded", full=True)
    r.activate("#door")
    p.wait_for_selector("#lab:not([hidden])", timeout=4000)
    p.wait_for_timeout(500)
    assert p.evaluate("location.hash") == "#lab"
    assert not p.locator("#bench").is_visible()
    r.checks["front_door"] = "hero outcome BLOCKED -> door -> #lab"


def lab_access(r):
    p = r.page
    assert p.locator(".table__pick").count() == 3
    r.shot("lab-world-selector", full=True)
    r.activate('.table__item--access .table__pick')
    p.wait_for_selector(".lab-exp--access")
    wo = ".lab-exp .wo"
    # gap only: never divergence
    if r.keyboard:
        r.press_on(".lab-exp .ticket__strip", *["ArrowRight"] * 10)
    else:
        r.drag(".lab-exp .ticket__stub--act", lambda x, y: (x + (120 if r.touch else 380), y))
    p.wait_for_timeout(350)
    assert r.attr(wo, "data-divergent") == "false", "gap alone must not diverge"
    assert r.attr(wo, "data-changed") == "false"
    r.shot("lab-experiment-active")
    # the world changes (drag / tap-arm + tap-drop / keyboard)
    if r.keyboard:
        r.press_on(".lab-exp .sticker", "Enter", "ArrowRight", "ArrowRight", "Enter")
    elif r.touch:
        r.tap(".lab-exp .sticker")
        sb = p.locator(".lab-exp .ticket__strip").bounding_box()
        r.tap(xy=(sb["x"] + sb["width"] * 0.6, sb["y"] + sb["height"] / 2))
    else:
        r.drag(".lab-exp .sticker", (".lab-exp .ticket__strip", 0.55, 0.5))
    p.wait_for_timeout(700)
    assert r.attr(wo, "data-divergent") == "true", "mutation must create divergence"
    assert p.inner_text(".lab-exp .lab-headline__text") == "NOT ANYMORE."
    p.evaluate("window.scrollTo(0,0)")
    r.shot("lab-mutation")
    r.activate(".lab-exp .gate")
    assert r.attr(".lab-exp .gate", "aria-checked") == "true"
    r.activate(".lab-exp .pulltab")
    p.wait_for_selector('.lab-exp[data-phase="DONE"]', timeout=6000)
    p.wait_for_timeout(500)
    assert r.attr(".lab-exp", "data-outcome") == "STOPPED"
    assert p.inner_text(".lab-exp .lab-stamp") == "RE-CHECKED · STOPPED"
    assert r.attr(wo, "data-divergent") == "false", "re-check re-registers"
    assert p.get_attribute(".lab-exp .lab-proof", "open") is None
    p.evaluate("window.scrollTo(0,0)")
    r.shot("lab-outcome", full=True)
    r.checks["lab_access"] = "gap-only no divergence; mutation diverges; CHECK AGAIN -> STOPPED"


def same_world(r):
    p = r.page
    r.activate(".lab-exp .lab-next__primary")
    p.wait_for_selector(".lab-same")
    p.wait_for_timeout(500)
    r.press_on(".split__seam", "ArrowLeft", "ArrowLeft")
    assert int(r.attr(".split__seam", "aria-valuenow")) == 30
    left = p.inner_text(".path--l")
    right = p.inner_text(".path--r")
    assert "OUTDATED PASS USED" in left and "STOPPED" in right, (left, right)
    r.press_on(".split__seam", "ArrowRight", "ArrowRight")
    p.evaluate("window.scrollTo(0,0)")
    r.shot("lab-same-world", full=True)
    r.checks["same_world"] = "seam keyboard works; left stale / right stopped"


def calendar_unguarded(r):
    p = r.page
    p.evaluate("location.hash = '#lab/calendar'")
    p.wait_for_selector(".lab-exp--calendar")
    if r.keyboard:
        r.press_on(".lab-exp .sticker", "Enter", "Enter")
    elif r.touch:
        r.tap(".lab-exp .sticker")
        sb = p.locator(".lab-exp .ticket__strip").bounding_box()
        r.tap(xy=(sb["x"] + sb["width"] * 0.6, sb["y"] + sb["height"] / 2))
    else:
        r.drag(".lab-exp .sticker", (".lab-exp .ticket__strip", 0.6, 0.5))
    p.wait_for_timeout(500)
    r.activate(".lab-exp .pulltab")
    p.wait_for_selector('.lab-exp[data-phase="DONE"]', timeout=6000)
    p.wait_for_timeout(400)
    assert r.attr(".lab-exp", "data-outcome") == "ACTED_ON_STALE"
    assert "SIMULATED" in p.inner_text(".lab-exp .simtag")
    p.evaluate("window.scrollTo(0,0)")
    r.shot("lab-calendar-unchecked", full=True)
    r.checks["calendar"] = "unchecked -> DOUBLE-BOOKED + INVITE SENT · SIMULATED"


def challenge(r, guarded, press):
    p = r.page
    p.evaluate("location.hash = '#challenge/document'")
    p.wait_for_selector(".lab-chal--document")
    if guarded:
        r.activate(".lab-chal .gate")
    p.evaluate("window.scrollTo(0,0)")
    r.shot("challenge-start")
    r.activate(".lab-chal .lab-next__primary")
    p.wait_for_selector('.lab-chal[data-phase="TRAVEL"]', timeout=4000)
    p.wait_for_timeout(900)
    if press == "drag":
        r.drag(".change-now", (".lab-chal .ticket__strip", 0.5, 0.5), steps=6)
    elif press == "tap":
        r.tap(".change-now")
    elif press == "key":
        p.keyboard.press("Space")
    p.wait_for_timeout(250)
    if press:
        assert r.attr(".lab-chal", "data-changed") == "true", "the change landed during travel"
    r.shot("challenge-mutation-window")
    p.wait_for_selector('.lab-chal[data-phase="DONE"]', timeout=12000)
    p.wait_for_timeout(500)
    timing = r.attr(".lab-chal", "data-timing")
    outcome = r.attr(".lab-chal", "data-outcome")
    assert timing == ("IN_TIME" if press else "NONE"), timing
    assert outcome == ("STOPPED" if guarded and press else "ACTED_ON_STALE" if press else "ACTED_VALID"), outcome
    p.evaluate("window.scrollTo(0,0)")
    r.shot("challenge-result", full=True)
    r.checks["challenge"] = f"{press or 'no press'} -> {timing} / {outcome}"


def replay(r):
    p = r.page
    p.evaluate("location.hash = '#replay/canonical-unchecked'")
    p.wait_for_selector(".lab-replay")
    p.wait_for_timeout(400)
    assert "WHAT THE AGENT SAW" in p.inner_text(".replay-cap")
    assert r.attr(".lab-replay", "data-divergent") == "false"
    r.shot("replay-observed")
    if r.keyboard:
        r.press_on(".scrub", "ArrowRight", "ArrowRight")
    elif r.touch:
        r.tap(".scrub-btn:last-of-type"); r.tap(".scrub-btn:last-of-type")
    else:
        p.locator(".frame").nth(2).click()
    p.wait_for_timeout(500)
    assert "WHAT THE WORLD BECAME" in p.inner_text(".replay-cap")
    assert r.attr(".lab-replay", "data-divergent") == "true"
    r.shot("replay-world-changed")
    if r.keyboard:
        r.press_on(".scrub", "End")
    else:
        r.activate(".scrub-btn:last-of-type")
    p.wait_for_timeout(500)
    assert p.inner_text(".lab-replay .lab-headline__text") == "OUTDATED PASS USED"
    p.evaluate("window.scrollTo(0,0)")
    r.shot("replay-final", full=True)
    r.checks["replay"] = "t0 observed -> t5 world changed (diverged) -> final OUTDATED PASS USED"


def live(r):
    p = r.page
    p.evaluate("location.hash = '#live'")
    p.wait_for_selector(".lab-live .specimen")
    p.wait_for_timeout(500)
    chip = p.inner_text("#lab-chip")
    assert chip.startswith("RECORDED GENUINE RUN"), chip
    assert p.inner_text(".specimen__label") == "RE-VERIFIED · STOPPED BEFORE COMMIT"
    assert p.locator(".runlive__btn").is_disabled()
    primary = p.evaluate("() => { const v = document.querySelector('.lab-live').cloneNode(true); v.querySelectorAll('details').forEach(d => d.remove()); return v.innerText; }")
    assert "REFUSED" not in primary, "raw REFUSED must stay inside PROOF"
    assert "LIVE EXECUTION · UNAVAILABLE" in primary
    proof = ".lab-live > .lab-proof"
    assert p.get_attribute(proof, "open") is None
    r.shot("live-specimen")
    p.locator(proof).scroll_into_view_if_needed()
    r.shot("live-proof-collapsed")
    r.activate(proof + " summary")
    p.wait_for_timeout(200)
    assert "REFUSED" in p.inner_text(proof)
    r.shot("live-proof-expanded", full=True)
    r.checks["live"] = "RECORDED chip; behavior label; RUN LIVE disabled; REFUSED only in PROOF"


def contact_sheet(name, shots):
    from PIL import Image, ImageDraw

    th = 360
    imgs = []
    for label, path in shots:
        im = Image.open(path)
        im = im.crop((0, 0, im.width, min(im.height, int(im.width * 1.25)))) if im.height > im.width * 1.25 else im
        imgs.append((label, im.resize((int(im.width * th / im.height), th))))
    cols = 6
    rows = [imgs[i:i + cols] for i in range(0, len(imgs), cols)]
    pad, cap = 14, 24
    W = max(sum(im.width for _, im in row) + pad * (len(row) + 1) for row in rows)
    H = len(rows) * (th + cap + pad) + pad
    sheet = Image.new("RGB", (W, H), (245, 236, 217))
    d = ImageDraw.Draw(sheet)
    y = pad
    for row in rows:
        x = pad
        for label, im in row:
            d.text((x, y + 4), label.upper(), fill=(29, 20, 66))
            sheet.paste(im, (x, y + cap))
            d.rectangle([x - 1, y + cap - 1, x + im.width, y + cap + th], outline=(29, 20, 66))
            x += im.width + pad
        y += th + cap + pad
    out = OUT / f"contact-sheet-{name}.jpg"
    sheet.save(out, quality=80)
    return out.name


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME)
    variants = [
        ("desktop", dict(viewport={"width": 1440, "height": 900}), dict(guarded=False, press="drag")),
        ("mobile", dict(viewport={"width": 390, "height": 844}, touch=True), dict(guarded=True, press="tap")),
        ("reduced-motion", dict(viewport={"width": 1440, "height": 900}, reduced=True, keyboard=True), dict(guarded=True, press="key")),
    ]
    for name, ctx, chal in variants:
        r = Run(browser, name, **ctx)
        hero_to_lab(r)
        lab_access(r)
        same_world(r)
        calendar_unguarded(r)
        challenge(r, **chal)
        replay(r)
        live(r)
        assert r.errors == [], r.errors
        results[name] = {"checks": r.checks, "shots": [str(p.relative_to(OUT)) for _, p in r.shots], "contact_sheet": contact_sheet(name, r.shots), "console_errors": r.errors}
        r.ctx.close()
    browser.close()

(OUT / "lab-check.json").write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({k: v["checks"] for k, v in results.items()}, indent=2, ensure_ascii=False))
