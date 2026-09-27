"""
Portfolio screenshot set (max 7) from the REAL product + 4:5 portfolio cards + selected mobile.
  npm run build && npx vite preview --port 4173 --strictPort &
  python3 tools/packaging/screenshots.py <work_dir> <out_dir>

01 IT WAS TRUE.                 hero, CHECK AGAIN on
02 NOT ANYMORE.                 hero after PULL THE GAP + ADMIN REVOKES ACCESS (stale, misregistered)
03 PICK A WORLD.                #lab
04 CHANGE IT.                   #challenge/document, agent travelling, CHANGE IT NOW live
05 SAME WORLD, TWO OUTCOMES.    #lab/access/same
06 REPLAY WHAT THE AGENT SAW.   #replay/canonical-unchecked at WHAT THE WORLD BECAME
07 REAL AGENT RUN.              #live (recorded genuine Opus 5.5 run, replayed)
Mobile (390x844 @3x) only where the phone layout tells the story better: 01, 02, 04.
Each state is asserted against kernel/receipt-driven DOM before capture.
"""
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from look import CHROME, page  # noqa: E402
from states import c, drag, hero, pull_gap, revoke  # noqa: E402

BASE = "http://localhost:4173/"
WORK = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/twc-packaging")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "evidence/packaging/final-v0/screenshots")
RAW = WORK / "shots-raw"
for d in (RAW, OUT / "desktop", OUT / "portfolio-4x5", OUT / "mobile"):
    d.mkdir(parents=True, exist_ok=True)

SHOTS = [
    ("01-it-was-true", "IT WAS<br>TRUE.", "cobalt", "The agent checks the pass. It is valid."),
    ("02-not-anymore", "NOT<br>ANYMORE.", "coral", "Access is revoked after it looked. What it saw lifts out of register."),
    ("03-pick-a-world", "PICK A<br>WORLD.", "ink", "The same gap on an access pass, a calendar slot, a document."),
    ("04-change-it", "CHANGE<br>IT.", "coral", "The agent heads for ACT on its own. You get one move."),
    ("05-same-world-two-outcomes", "SAME WORLD,<br>TWO OUTCOMES.", "magenta", "One change. Without a final check the old pass is used. With it, the action stops."),
    ("06-replay-what-the-agent-saw", "REPLAY WHAT<br>THE AGENT SAW.", "ink", "Every run rebuilt from its receipt, beat by beat."),
    ("07-real-agent-run", "REAL AGENT<br>RUN.", "violet", "A recorded Claude Opus 5.5 run. It re-checked and stopped before commit. Replayed, not live."),
]


def a(cond, msg):
    if not cond:
        raise AssertionError(msg)


def top(pg):
    pg.evaluate("window.scrollTo(0, 0)")
    pg.wait_for_timeout(250)


def scroll_to(pg, sel, y):
    """Scroll so that `sel`'s top sits at viewport y."""
    pg.evaluate(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); window.scrollBy(0, r.top - {y}); }})()")
    pg.wait_for_timeout(350)


def desktop(br):
    ctx = br.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    shots = {}

    def snap(name):
        p = RAW / f"desktop-{name}.png"
        pg.screenshot(path=str(p))
        shots[name] = p

    hero(pg, BASE)
    a(pg.inner_text("#headline-text") == "IT WAS TRUE.", "01 headline")
    snap("01-it-was-true")
    pull_gap(pg)
    revoke(pg)
    top(pg)
    a(pg.inner_text("#belief-access") == "GRANTED" and pg.inner_text("#reality-access") == "REVOKED", "02 belief/reality")
    snap("02-not-anymore")

    pg.goto(BASE + "#lab")
    pg.wait_for_selector(".lab-worlds")
    pg.wait_for_timeout(700)
    a(pg.locator(".table__pick").count() == 3, "03 three worlds")
    snap("03-pick-a-world")

    pg.goto(BASE + "#challenge/document")
    pg.wait_for_selector(".lab-chal--document")
    pg.click(".lab-chal .gate")
    top(pg)
    pg.locator(".lab-chal .lab-next__primary").click()
    pg.wait_for_selector('.lab-chal[data-phase="TRAVEL"]', timeout=6000)
    pg.wait_for_timeout(1300)
    a(pg.locator(".change-now").is_visible() and pg.locator(".change-now").is_enabled(), "04 CHANGE IT NOW live")
    snap("04-change-it")

    pg.goto(BASE + "#lab/access/same")
    pg.wait_for_selector(".lab-same")
    pg.wait_for_timeout(700)
    left, right = pg.inner_text(".path--l"), pg.inner_text(".path--r")
    a("OUTDATED PASS USED" in left and "STOPPED" in right, "05 split")
    top(pg)
    snap("05-same-world-two-outcomes")

    pg.goto(BASE + "#replay/canonical-unchecked")
    pg.wait_for_selector(".lab-replay")
    pg.wait_for_timeout(500)
    pg.locator(".lab-replay .frame").nth(2).click()
    pg.wait_for_timeout(900)
    a("WHAT THE WORLD BECAME" in pg.inner_text(".replay-cap"), "06 beat")
    a(pg.get_attribute(".lab-replay", "data-divergent") == "true", "06 divergent")
    top(pg)
    snap("06-replay-what-the-agent-saw")

    pg.goto(BASE + "#live")
    pg.wait_for_selector(".lab-live .specimen")
    pg.wait_for_timeout(700)
    a(pg.inner_text(".specimen__model") == "CLAUDE OPUS 5.5", "07 model")
    a(pg.inner_text(".specimen__label") == "RE-VERIFIED · STOPPED BEFORE COMMIT", "07 label")
    a(pg.locator(".runlive__btn").is_disabled(), "07 RUN LIVE disabled")
    top(pg)
    snap("07-real-agent-run")
    # full live page for the README proof image
    pg.locator(".lab-live .frame").nth(3).click()
    pg.wait_for_timeout(900)
    top(pg)
    pg.screenshot(path=str(RAW / "desktop-07-live-full.png"), full_page=True)
    # full same-world + replay pages for 4:5 crops
    for route, name, sel in [("#lab/access/same", "05-full", ".lab-same"), ("#replay/canonical-unchecked", "06-full", ".lab-replay")]:
        pg.goto(BASE + route)
        pg.wait_for_selector(sel)
        pg.wait_for_timeout(600)
        if name == "06-full":
            pg.locator(".lab-replay .frame").nth(2).click()
            pg.wait_for_timeout(900)
        top(pg)
        pg.screenshot(path=str(RAW / f"desktop-{name}.png"), full_page=True)
    a(errs == [], errs)
    ctx.close()
    return shots


def mtap(pg, sel):
    loc = pg.locator(sel).first
    loc.evaluate("e => { const r = e.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) e.scrollIntoView({block: 'center'}); }")
    pg.wait_for_timeout(150)
    pg.touchscreen.tap(*c(pg, sel))


def mobile(br):
    ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, has_touch=True, is_mobile=True)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    out = {}
    hero(pg, BASE)
    top(pg)
    pg.screenshot(path=str(RAW / "mobile-01-it-was-true.png"))
    out["01-it-was-true"] = RAW / "mobile-01-it-was-true.png"
    # phone path: tap-to-arm / tap-to-drop, like tools/lab_check.py
    pg.locator("#gapline").evaluate("e => e.scrollIntoView({block: 'center'})")
    pg.wait_for_timeout(300)
    x, y = c(pg, "#act")
    drag(pg, "#act", x + 195, y, 20)
    pg.wait_for_timeout(500)
    mtap(pg, "#token")
    ib = pg.locator("#interval").bounding_box()
    pg.touchscreen.tap(ib["x"] + ib["width"] * 0.5, ib["y"] + ib["height"] / 2)
    pg.wait_for_timeout(1400)
    a(pg.eval_on_selector("#bench", "e => e.dataset.misregistered") == "true", "m02 misregistered")
    top(pg)
    pg.screenshot(path=str(RAW / "mobile-02-not-anymore.png"))
    out["02-not-anymore"] = RAW / "mobile-02-not-anymore.png"
    pg.goto(BASE + "#challenge/document")
    pg.wait_for_selector(".lab-chal--document")
    mtap(pg, ".lab-chal .gate")
    mtap(pg, ".lab-chal .lab-next__primary")
    pg.wait_for_selector('.lab-chal[data-phase="TRAVEL"]', timeout=6000)
    pg.wait_for_timeout(1300)
    a(pg.locator(".change-now").is_visible(), "m04 CHANGE IT NOW")
    pg.screenshot(path=str(RAW / "mobile-04-change-it.png"))
    out["04-change-it"] = RAW / "mobile-04-change-it.png"
    a(errs == [], errs)
    ctx.close()
    return out


# ---- 4:5 portfolio cards --------------------------------------------------------------------------
# crop windows in CSS px of the 1440-wide desktop captures (x, y, w, h); None = whole first screen
CROPS = {
    "01-it-was-true": ("desktop-01-it-was-true", None),
    "02-not-anymore": ("desktop-02-not-anymore", None),
    "03-pick-a-world": ("desktop-03-pick-a-world", None),
    "04-change-it": ("desktop-04-change-it", None),
    "05-same-world-two-outcomes": ("desktop-05-full", None),
    "06-replay-what-the-agent-saw": ("desktop-06-full", None),
    "07-real-agent-run": ("desktop-07-live-full", None),
}

CARD_CSS = """
.idx { position: absolute; left: 96px; top: 92px; font: 700 26px/1 ui-monospace, Menlo, monospace; letter-spacing: .08em; }
.brand { position: absolute; right: 96px; top: 92px; font-weight: 800; font-stretch: 80%; letter-spacing: .14em; font-size: 24px; }
.rule { position: absolute; left: 96px; right: 96px; top: 140px; border-top: 4px solid var(--ink); }
.t { position: absolute; left: 88px; right: 60px; top: 200px; white-space: nowrap; font-weight: 800; font-stretch: 75%; line-height: .84; letter-spacing: -.035em; }
.cap { position: absolute; left: 96px; right: 160px; font-weight: 600; font-stretch: 90%; font-size: 40px; line-height: 1.12; color: var(--ink); }
.sheet { position: absolute; left: 96px; right: 96px; border: 4px solid var(--ink); background: var(--paper);
  box-shadow: 14px 14px 0 var(--ink); overflow: hidden; }
.sheet img { display: block; width: 100%; height: 100%; }
.cobalt { color: var(--cobalt); } .coral { color: var(--coral); } .ink { color: var(--ink); } .magenta { color: var(--magenta); } .violet { color: var(--violet); }
"""


def portfolio_cards(br):
    W, H, M = 1600, 2000, 96
    inner = W - 2 * M
    for i, (slug, title, color, cap) in enumerate(SHOTS):
        src, _ = CROPS[slug]
        im = Image.open(RAW / f"{src}.png").convert("RGB")
        # show the capture at full width, never side-cropped; tall pages get a taller window
        win_h = 900 if im.height <= 1800 else 1120  # CSS px (captures are @2x)
        crop = im.crop((0, 0, im.width, min(im.height, win_h * 2)))
        cp = WORK / f"crop-{slug}.png"
        crop.save(cp)
        sheet_h = inner * crop.height / crop.width
        sheet_top = H - M - sheet_h
        cap_h = 2 * 45
        avail = (sheet_top - 64 - cap_h - 36) - 200
        size = avail / (2 * 0.84)
        body = f"""<span class="idx">{i + 1:02d} / 07</span><span class="brand">THE WORLD CHANGED</span><div class="rule"></div>
          <h1 class="t {color}" style="font-size:{size}px">{title}</h1>
          <p class="cap" style="bottom:{H - sheet_top + 64:.0f}px">{cap}</p>
          <div class="sheet" style="top:{sheet_top:.0f}px; height:{sheet_h:.0f}px"><img src="file://{cp}"></div>"""
        html = page(W, H, body, CARD_CSS)
        f = WORK / f"card-{slug}.html"
        f.write_text(html)
        pg = br.new_page(viewport={"width": W, "height": H})
        pg.goto(f"file://{f}")
        pg.evaluate("document.fonts.ready")
        pg.evaluate("""() => { const t = document.querySelector('.t'); let s = parseFloat(t.style.fontSize);
            t.style.right = 'auto'; while (t.getBoundingClientRect().width > 1600 - 88 - 80 && s > 60) { s -= 2; t.style.fontSize = s + 'px'; } }""")
        pg.wait_for_timeout(200)
        p = WORK / f"card-{slug}.png"
        pg.screenshot(path=str(p))
        pg.close()
        Image.open(p).convert("RGB").save(OUT / "portfolio-4x5" / f"twc-{slug}-4x5.jpg", quality=90, optimize=True)


if __name__ == "__main__":
    only = sys.argv[3].split(",") if len(sys.argv) > 3 else ["desktop", "mobile", "cards"]
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path=CHROME, args=["--allow-file-access-from-files"])
        d = desktop(br) if "desktop" in only else {}
        for name, p in d.items():
            Image.open(p).convert("RGB").save(OUT / "desktop" / f"twc-{name}.jpg", quality=90, optimize=True)
        m = mobile(br) if "mobile" in only else {}
        for name, p in m.items():
            Image.open(p).convert("RGB").save(OUT / "mobile" / f"twc-{name}-mobile.jpg", quality=90, optimize=True)
        if "cards" in only:
            portfolio_cards(br)
        br.close()
    print("ok")
