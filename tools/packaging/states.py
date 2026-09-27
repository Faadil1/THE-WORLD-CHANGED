"""Drive the REAL hero / Lab into named states (same gestures as tools/lab_check.py). No product changes."""
import time

HERO = "?seed=twc-hero-0001"


def c(page, sel):
    b = page.locator(sel).first.bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def drag(page, sel, tx, ty, steps=16):
    x, y = c(page, sel)
    page.mouse.move(x, y)
    page.mouse.down()
    for i in range(1, steps + 1):
        page.mouse.move(x + (tx - x) * i / steps, y + (ty - y) * i / steps)
    page.mouse.up()


def hero(page, base, guard=True):
    page.goto(base + HERO)
    page.wait_for_selector("#mode-label")
    if guard:
        page.click("#guard")
    page.mouse.move(2, 2)
    page.wait_for_timeout(500)


def pull_gap(page, frac=0.42):
    x, y = c(page, "#act")
    w = page.viewport_size["width"]
    drag(page, "#act", x + w * frac, y, 30)
    page.wait_for_timeout(600)
    assert page.eval_on_selector("#bench", "e => e.dataset.misregistered") == "false"


def revoke(page):
    b = page.locator("#interval").bounding_box()
    drag(page, "#token", b["x"] + b["width"] * 0.55, b["y"] + b["height"] / 2)
    page.wait_for_timeout(1400)
    assert page.eval_on_selector("#bench", "e => e.dataset.misregistered") == "true"
    assert page.inner_text("#headline-text") == "NOT ANYMORE."


def check_again(page):
    page.locator("#latch").click()
    page.wait_for_selector('#bench[data-phase="RESOLVED"]', timeout=8000)
    page.wait_for_timeout(1600)
    assert page.eval_on_selector("#bench", "e => e.dataset.outcome") == "BLOCKED"


ISOLATE = """
(sel) => {
  const keep = document.querySelector(sel);
  const s = document.createElement('style');
  s.id = 'pkg-isolate';
  s.textContent = `html, body, .bench, .stage, .lab, #lab { background: transparent !important; background-image: none !important; }`;
  document.head.appendChild(s);
  // hide every visible branch that does not contain the kept element
  const hide = (root) => { for (const ch of root.children) { if (ch === keep) continue; if (ch.contains(keep)) hide(ch); else ch.style.visibility = 'hidden'; } };
  hide(document.body);
}
"""


def isolate_shot(page, sel, path, pad=40):
    page.evaluate(ISOLATE, sel)
    page.wait_for_timeout(100)
    b = page.locator(sel).first.bounding_box()
    clip = {"x": max(0, b["x"] - pad), "y": max(0, b["y"] - pad), "width": b["width"] + 2 * pad, "height": b["height"] + 2 * pad}
    page.screenshot(path=str(path), clip=clip, omit_background=True, full_page=True)
    page.evaluate("document.getElementById('pkg-isolate').remove(); document.querySelectorAll('[style*=visibility]').forEach(e => e.style.visibility = '')")
