"""Shared print look for packaging renders: the product's own tokens, fonts, grain (experience/style.css)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / "node_modules"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

BASE_CSS = """
@font-face { font-family: 'BG'; font-weight: 200 800; font-stretch: 75% 100%;
  src: url('file://__F__/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2') format('woff2-variations'); }
@font-face { font-family: 'SB'; src: url('file://__F__/@fontsource/schoolbell/files/schoolbell-latin-400-normal.woff2') format('woff2'); }
:root { --paper:#f5ecd9; --ink:#1d1442; --ink-2:#5b527a; --cobalt:#2335f5; --lime:#c6f432; --coral:#ff4b2b;
  --cyan:#00aee8; --magenta:#e4007c; --violet:#4a1fb8;
  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .11 0 0 0 0 .08 0 0 0 0 .26 0 0 0 .11 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
* { box-sizing: border-box; margin: 0; }
html, body { width: __W__px; height: __H__px; overflow: hidden; background: var(--paper); }
body { position: relative; background-image: var(--grain); color: var(--ink); font-family: 'BG', sans-serif; }
.top { position: absolute; left: var(--g); right: var(--g); top: calc(var(--g) * 0.55); display: flex; justify-content: space-between; align-items: center;
  border-bottom: calc(var(--u) * 3) solid var(--ink); padding-bottom: calc(var(--u) * 10); z-index: 6; }
.title { font-weight: 800; font-stretch: 80%; letter-spacing: 0.14em; font-size: calc(var(--u) * 19); background: var(--paper); padding: 0 6px; margin-left: -6px; }
.chip { font: 700 calc(var(--u) * 13)/1 ui-monospace, Menlo, monospace; letter-spacing: 0.06em; border: calc(var(--u) * 2) solid var(--ink);
  padding: calc(var(--u) * 5) calc(var(--u) * 9); background: var(--paper); }
.hl { position: absolute; z-index: 4 !important; font-weight: 800; font-stretch: 75%; line-height: 0.8; letter-spacing: -0.035em; white-space: nowrap; z-index: 1; }
.hl span { display: block; }
.hl span:not(.ghost) { position: relative; z-index: 1; }
.hl .ghost { position: absolute; inset: 0; z-index: 0; color: transparent; -webkit-text-stroke: calc(var(--u) * 3.5) var(--cyan); transform: translate(-0.045em, -0.055em); }
.obj { position: absolute; z-index: 3; filter: drop-shadow(0 calc(var(--u)*6) 0 rgba(29,20,66,0.0)); }
.hook { position: absolute; z-index: 5; font-weight: 700; font-stretch: 85%; letter-spacing: -0.01em; line-height: 1.02; }
.hook b { font-weight: 800; }
.hand { position: absolute; z-index: 5; font-family: 'SB', cursive; line-height: 1; white-space: nowrap; }
.hand--coral { color: var(--coral); } .hand--cyan { color: var(--cyan); } .hand--violet { color: var(--violet); }
"""


def page(w, h, body, css, transparent=False):
    u = min(w, h) / 1080
    g = 64 * u if w > h else 56 * u
    base = BASE_CSS.replace("__F__", str(FONTS)).replace("__W__", str(w)).replace("__H__", str(h))
    if transparent:
        css += " html, body { background: transparent !important; background-image: none !important; }"
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{base}
    :root {{ --u: {u:.4f}px; --g: {g:.1f}px; }} {css}</style></head><body>{body}</body></html>"""


