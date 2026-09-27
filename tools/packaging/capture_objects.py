"""
Capture the packaging object kit from the REAL product (transparent PNG @3x) + full-frame state stills.
  python3 tools/packaging/capture_objects.py <work_dir>
Objects (hero, deterministic sandbox, seed twc-hero-0001, CHECK AGAIN on):
  pass-granted.png   initial pass: ACCESS GRANTED + VALID
  token.png          the coral ADMIN REVOKES ACCESS sticker (armed, gap open)
  ticket-closed.png  LOOK / ACT ticket, gap closed
  ticket-open.png    gap pulled open (world unchanged)
  passes-stale.png   cyan AGENT SAW v1 ghost over magenta REVOKED v2 + NO LONGER VALID
  ticket-stale.png   torn gap with ADMIN REVOKES ACCESS dropped in
  passes-stopped.png re-checked pass with STOPPED stamp
  stamp-stopped.png  RE-CHECKED · STOPPED verdict stamp
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from states import check_again, hero, isolate_shot, pull_gap, revoke  # noqa: E402

BASE = "http://localhost:4173/"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/twc-packaging")
(OUT / "objects").mkdir(parents=True, exist_ok=True)
(OUT / "stills").mkdir(parents=True, exist_ok=True)


def passes(page, name):
    # include the whole lanyard: clip from the top of the document
    page.evaluate("window.scrollTo(0,0)")
    b = page.locator(".passes").bounding_box()
    isolate_shot(page, ".passes", OUT / "objects" / name, pad=160)


with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CHROME)
    ctx = br.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=3)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    hero(pg, BASE)
    pg.screenshot(path=str(OUT / "stills/hero-1-true.png"))
    passes(pg, "pass-granted.png")
    isolate_shot(pg, "#gapline", OUT / "objects/ticket-closed.png", pad=40)
    pull_gap(pg)
    pg.screenshot(path=str(OUT / "stills/hero-2-gap.png"))
    isolate_shot(pg, "#gapline", OUT / "objects/ticket-open.png", pad=40)
    isolate_shot(pg, "#token", OUT / "objects/token.png", pad=30)
    revoke(pg)
    pg.evaluate("window.scrollTo(0,0)")
    pg.screenshot(path=str(OUT / "stills/hero-3-notanymore.png"))
    passes(pg, "passes-stale.png")
    isolate_shot(pg, "#gapline", OUT / "objects/ticket-stale.png", pad=60)
    check_again(pg)
    pg.evaluate("window.scrollTo(0,0)")
    pg.screenshot(path=str(OUT / "stills/hero-4-stopped.png"))
    pg.screenshot(path=str(OUT / "stills/hero-4-stopped-full.png"), full_page=True)
    passes(pg, "passes-stopped.png")
    isolate_shot(pg, "#stamp", OUT / "objects/stamp-stopped.png", pad=30)
    assert errors == [], errors
    br.close()
print("ok", sorted(x.name for x in (OUT / "objects").iterdir()))
