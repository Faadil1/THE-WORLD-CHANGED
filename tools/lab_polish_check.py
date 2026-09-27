"""
PRODUCT POLISH PASS 1 browser regression (build/agent-lab-v0).

For desktop (mouse), mobile (touch) and reduced motion (keyboard only):
  1. every top-level Lab route opens at its own top — via tab, in-content link, and back/forward —
     and within-mode controls (replay scrubbing) never reset the scroll;
  2. CHALLENGE: CHANGE IT NOW is hidden + locked at READY, arrives enabled once the agent travels;
  3. copy: no-change outcome reads "Nothing changed. What it saw was still true.";
  4. REPLAY entrance: proposition + beats before the evidence controls;
  5. LIVE entrance: REAL AGENT RUN. → CLAUDE OPUS 5.5 → RECORDED GENUINE RUN / NOT RUNNING NOW →
     RE-VERIFIED · STOPPED BEFORE COMMIT, above the replay; RUN LIVE disabled; REFUSED only in PROOF.

Evidence: 5 shots per variant (WORLD, CHALLENGE ready, CHALLENGE active, REPLAY entrance, LIVE entrance)
+ one contact sheet per variant + polish-check.json.

Usage: npm run build && npx vite preview --port 4173 --strictPort &
       python3 tools/lab_polish_check.py [out_dir]
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from lab_check import BASE, CHROME, Run, contact_sheet  # noqa: E402

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "evidence/screenshots/agent-lab-v0-polish-1")
OUT.mkdir(parents=True, exist_ok=True)
TABS = ["world", "challenge", "replay", "live"]


def scroll_y(p):
    return p.evaluate("Math.round(scrollY)")


def go_tab(r, tab):
    sel = f'.lab__tabs a[data-tab="{tab}"]'
    if r.keyboard:
        r.press_on(sel, "Enter")
    elif r.touch:
        r.tap(sel)
    else:
        r.page.locator(sel).click()
    r.page.wait_for_timeout(450)


def route_tops(r):
    p = r.page
    p.goto(BASE + "#lab/access")
    p.wait_for_selector(".lab-exp")
    for tab in TABS:
        p.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
        p.wait_for_timeout(120)
        assert scroll_y(p) > 0
        go_tab(r, tab)
        assert scroll_y(p) == 0, (tab, scroll_y(p))
        top = p.evaluate("document.getElementById('lab-view').getBoundingClientRect().top")
        assert 0 <= top < 260, (tab, top)
    # in-content navigation (a link inside the view) also opens at the top
    p.evaluate("location.hash = '#lab'")
    p.wait_for_selector(".lab-worlds")
    p.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
    r.activate(".branch--live")
    p.wait_for_selector(".lab-live")
    p.wait_for_timeout(400)
    assert scroll_y(p) == 0, ("branch live", scroll_y(p))
    # back / forward restore the route top, not an old scroll offset
    p.evaluate("window.scrollTo(0, 900)")
    p.go_back()
    p.wait_for_timeout(500)
    assert scroll_y(p) == 0, ("back", scroll_y(p))
    p.go_forward()
    p.wait_for_timeout(500)
    assert scroll_y(p) == 0, ("forward", scroll_y(p))
    # within-mode control: scrubbing replay keeps the visitor's scroll position
    p.evaluate("location.hash = '#replay/canonical-checked'")
    p.wait_for_selector(".lab-replay")
    p.wait_for_timeout(400)
    p.locator(".scrub").evaluate("e => e.scrollIntoView({block: 'center'})")
    p.wait_for_timeout(150)
    before = scroll_y(p)
    assert before > 0
    if r.keyboard:
        r.press_on(".scrub", "ArrowRight", "ArrowRight")
    elif r.touch:
        r.tap(".scrub-btn:last-of-type")
    else:
        p.locator(".frame").nth(2).click()
    p.wait_for_timeout(400)
    assert abs(scroll_y(p) - before) < 40, ("scrub moved the page", before, scroll_y(p))
    r.checks["route_tops"] = "tabs, in-content link, back/forward open at top; scrub keeps position"


def world_shot(r):
    p = r.page
    p.evaluate("location.hash = '#lab'")
    p.wait_for_selector(".lab-worlds")
    p.wait_for_timeout(500)
    r.shot("world")


def challenge_staging(r):
    p = r.page
    go_tab(r, "challenge")
    p.wait_for_selector('.lab-chal[data-phase="READY"]')
    p.wait_for_timeout(500)
    now = p.locator(".change-now")
    assert not now.is_visible() and now.is_disabled(), "CHANGE IT NOW locked + hidden at READY"
    assert p.get_attribute(".change-now", "aria-hidden") == "true"
    assert p.locator(".lab-chal .lab-next__primary").is_visible()
    r.shot("challenge-ready")
    r.activate(".lab-chal .lab-next__primary")
    p.wait_for_selector('.lab-chal[data-phase="LOOKING"]', timeout=3000)
    assert not now.is_visible(), "still locked while the agent looks"
    p.wait_for_selector('.lab-chal[data-phase="TRAVEL"]', timeout=4000)
    p.wait_for_timeout(700)  # let the arrival land before measuring / capturing
    assert now.is_visible() and now.is_enabled() and p.get_attribute(".change-now", "aria-hidden") == "false"
    assert not p.locator(".lab-chal .lab-next__primary").is_visible(), "spent START gives way to CHANGE IT NOW"
    box = now.bounding_box()
    assert box["y"] + box["height"] <= p.viewport_size["height"] + 1 and box["y"] >= 0, ("CHANGE IT NOW on screen", box)
    assert box["height"] >= 76 and box["width"] >= min(300, p.viewport_size["width"] - 40), box
    r.shot("challenge-active")
    # let it run out with no change: plain no-change copy
    p.wait_for_selector('.lab-chal[data-phase="DONE"]', timeout=12000)
    p.wait_for_timeout(300)
    line = p.inner_text(".lab-chal .lab-line")
    assert line.startswith("Nothing changed. What it saw was still true."), line
    assert "still true when it acted" not in p.inner_text(".lab-chal")
    stamp = p.inner_text(".lab-chal .lab-stamp")
    assert stamp == "STILL VALID · SENT", stamp
    r.checks["challenge"] = "CTA hidden+locked at READY and LOOKING; arrives enabled in TRAVEL; no-change copy plain"


def replay_entrance(r):
    p = r.page
    go_tab(r, "replay")
    p.wait_for_selector(".replay-intro")
    p.wait_for_timeout(500)
    assert p.inner_text(".replay-intro__title") == "REPLAY WHAT THE AGENT SAW."
    assert p.inner_text(".replay-intro__sub") == "Move through the run. Watch what the agent knew and what the world became."
    beats = p.eval_on_selector_all(".replay-intro__beats li", "ls => ls.map(l => l.innerText)")
    assert beats == ["WHAT THE AGENT SAW", "WHAT IT PREPARED", "WHAT THE WORLD BECAME", "WHAT IT CHECKED / DID"], beats
    order = p.evaluate("""() => ['.replay-intro', '.sources', '.lab-replay__stage', '.scrub-row', '.evidence-strip']
        .map(s => document.querySelector(s).getBoundingClientRect().top)""")
    assert order == sorted(order), ("entrance must come before the evidence controls", order)
    assert p.locator(".replay-intro__title").is_visible()
    assert p.get_attribute(".lab-replay > .lab-proof", "open") is None
    r.shot("replay-entrance")
    r.checks["replay_entrance"] = "proposition + beats above sources, object, scrubber, strip; PROOF collapsed"


def live_entrance(r):
    p = r.page
    go_tab(r, "live")
    p.wait_for_selector(".specimen")
    p.wait_for_timeout(600)
    seq = [".specimen__title", ".specimen__model", ".specimen__recorded", ".specimen__label", ".specimen__replay"]
    tops = p.evaluate(f"() => {json.dumps(seq)}.map(s => document.querySelector(s).getBoundingClientRect().top)")
    assert tops == sorted(tops), ("live entrance order", tops)
    assert p.inner_text(".specimen__title") == "REAL AGENT RUN."
    assert p.inner_text(".specimen__model") == "CLAUDE OPUS 5.5"
    assert p.inner_text(".specimen__recorded").split() == "RECORDED GENUINE RUN NOT RUNNING NOW".split()
    assert p.inner_text(".specimen__label") == "RE-VERIFIED · STOPPED BEFORE COMMIT"
    for s in [".specimen__title", ".specimen__model", ".specimen__recorded", ".specimen__label"]:
        b = p.locator(s).bounding_box()
        assert b["y"] >= 0, (s, "cropped above the viewport", b)
    assert p.evaluate("document.querySelector('.specimen__label').getBoundingClientRect().bottom") <= p.viewport_size["height"], "entrance fits the first screen"
    assert p.locator(".runlive__btn").is_disabled()
    primary = p.evaluate("() => { const v = document.querySelector('.lab-live').cloneNode(true); v.querySelectorAll('details').forEach(d => d.remove()); return v.innerText; }")
    assert "REFUSED" not in primary
    assert "LIVE EXECUTION · UNAVAILABLE" in primary
    r.shot("live-entrance")
    r.checks["live_entrance"] = "REAL AGENT RUN. > CLAUDE OPUS 5.5 > RECORDED/NOT RUNNING > label > replay; in first screen; RUN LIVE disabled"


if __name__ == "__main__":
    results = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME)
        for name, kw in [
            ("desktop", dict(viewport={"width": 1440, "height": 900})),
            ("mobile", dict(viewport={"width": 390, "height": 844}, touch=True)),
            ("reduced-motion", dict(viewport={"width": 1440, "height": 900}, reduced=True, keyboard=True)),
        ]:
            r = Run(browser, name, out=OUT, **kw)
            route_tops(r)
            world_shot(r)
            challenge_staging(r)
            replay_entrance(r)
            live_entrance(r)
            assert r.errors == [], r.errors
            results[name] = {"checks": r.checks, "shots": [str(p.relative_to(OUT)) for _, p in r.shots], "contact_sheet": contact_sheet(name, r.shots, OUT)}
            r.ctx.close()
        browser.close()
    (OUT / "polish-check.json").write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({k: v["checks"] for k, v in results.items()}, indent=2, ensure_ascii=False))
