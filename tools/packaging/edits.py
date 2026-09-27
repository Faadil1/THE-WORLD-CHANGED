"""
Edit decision lists for the packaging videos. Every frame of footage is the REAL product (takes.py).
  python3 tools/packaging/edits.py <work_dir> <out_dir> [cut15-16x9,cut15-4x5,trailer-16x9]
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from compose import Compositor, Overlay, Shot, render_plates  # noqa: E402
from take import Take  # noqa: E402

WORK = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/twc-packaging")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "evidence/packaging/final-v0/trailer")
OUT.mkdir(parents=True, exist_ok=True)
TK = WORK / "takes"
DET = "DETERMINISTIC SANDBOX · SCRIPTED AGENT — NOT A LIVE MODEL"

PLATE_CSS = """
body { background: transparent !important; background-image: none !important; }
#plate { position: absolute; left: 0; top: 0; padding: 12px 30px 34px 12px; }
.tag { display: inline-block; background: var(--paper) var(--grain); border: calc(var(--u) * 5) solid var(--ink);
  box-shadow: calc(var(--u) * 12) calc(var(--u) * 12) 0 var(--ink); padding: calc(var(--u) * 10) calc(var(--u) * 26) calc(var(--u) * 4);
  font-weight: 800; font-stretch: 75%; letter-spacing: -0.03em; line-height: 0.9; white-space: nowrap; transform: rotate(-2deg); }
.tag--lime { background: var(--lime); }
"""

CARD_CSS = """
.wrap { position: absolute; left: var(--g); right: var(--g); top: 0; bottom: 0; display: grid; align-content: center; }
.big { position: relative; font-weight: 800; font-stretch: 75%; line-height: 0.8; letter-spacing: -0.035em; }
.big span { display: block; }
.big .ghost { position: absolute; inset: 0; color: transparent; -webkit-text-stroke: calc(var(--u) * 4) var(--cyan); transform: translate(-0.045em, -0.055em); }
.big .fill { position: relative; }
.chip { position: absolute; left: var(--g); bottom: var(--g); font: 700 calc(var(--u) * 17px / 1px * 1px)/1 ui-monospace, Menlo, monospace; }
.foot { position: absolute; left: var(--g); right: var(--g); bottom: var(--g); display: flex; justify-content: space-between; align-items: end; gap: 20px; }
.chipbox { font: 700 calc(var(--u) * 16) ui-monospace, Menlo, monospace; letter-spacing: 0.06em; border: calc(var(--u) * 2.5) solid var(--ink);
  padding: calc(var(--u) * 6) calc(var(--u) * 10); background: var(--paper); }
.url { font: 700 calc(var(--u) * 30) ui-monospace, Menlo, monospace; letter-spacing: 0.02em; }
.lead { font-weight: 800; font-stretch: 80%; letter-spacing: 0.14em; font-size: calc(var(--u) * 22); margin-bottom: calc(var(--u) * 36); }
"""


def tag(text, color, size, lime=False):
    return f'<div id="plate"><span class="tag{" tag--lime" if lime else ""}" style="color: var(--{color}); font-size: {size}px">{text}</span></div>'


def end_card(lines, color, size, foot):
    ghost = "<br>".join(lines)
    fill = "".join(f"<span>{l}</span>" for l in lines)
    return f'<div class="wrap"><div class="big" style="font-size:{size}px; color: var(--{color})"><span class="ghost">{ghost}</span><span class="fill">{fill}</span></div></div>{foot}'


def plates(w, h, extra=None):
    u = min(w, h) / 1080
    k = w / 1920 if w > h else w / 1080
    specs = {
        "tag-pull": (1400, 400, tag("PULL THE GAP.", "cobalt", int((150 if w > h else 104) * k)), PLATE_CSS, True),
        "tag-check": (1400, 400, tag("CHECK AGAIN.", "ink", int((150 if w > h else 104) * k), lime=True), PLATE_CSS, True),
        "end-15": (w, h, end_card(["THE WORLD", "CHANGED."], "magenta", int((300 if w > h else 250) * (w / 1920 if w > h else 1)),
                                  f'<div class="foot"><span class="chipbox">{DET}</span></div>'), CARD_CSS, False),
    }
    specs.update(extra or {})
    return render_plates(specs, WORK / f"plates-{w}x{h}")


def cut15_16x9():
    T = Take(TK / "hero16")
    m = T.m
    P = plates(1920, 1080)
    shots = [
        Shot(3.0, T, 0.10, 2.50, [(0, .50, .50, 1.00), (1, .47, .47, 1.07)], name="0-3 IT WAS TRUE."),
        Shot(3.0, T, m("pull") - 0.15, m("pulled") + 0.55, [(0, .30, .64, 1.50), (1, .34, .62, 1.58)],
             overlays=[Overlay(P["tag-pull"], 0.15, 3.0, 1080, 800)], name="3-6 PULL THE GAP"),
        Shot(2.0, T, m("drop") - 0.05, m("dropped") + 0.80, [(0, .50, .50, 1.00), (1, .50, .50, 1.04)],
             name="6-8 ADMIN REVOKES ACCESS / NOT ANYMORE."),
        Shot(3.0, T, m("dropped") + 0.05, m("dropped") + 2.90, [(0, .79, .68, 1.60), (1, .79, .74, 1.85)],
             name="8-11 old observation separates"),
        Shot(3.0, T, m("latch") - 0.30, m("resolved") + 0.95, [(0, .62, .62, 1.30), (0.55, .50, .50, 1.00), (1, .50, .50, 1.02)],
             overlays=[Overlay(P["tag-check"], 0.0, 1.35, 80, 800)], name="11-14 CHECK AGAIN / STOPPED"),
        Shot(1.0, card=P["end-15"], card_push=0.03, name="14-15 THE WORLD CHANGED."),
    ]
    return Compositor(1920, 1080), shots


def cut15_4x5():
    """Portrait: the stacked 720-px layout recorded full height (1080x2280); the 4:5 window pans pass <-> ticket."""
    T = Take(TK / "hero45")
    m = T.m
    P = plates(1080, 1350)
    TOP, TICKET = 0.296, 0.54
    shots = [
        Shot(3.0, T, 0.10, 2.50, [(0, .5, TOP, 1.00), (1, .5, TOP + 0.01, 1.05)], name="0-3 IT WAS TRUE."),
        Shot(3.0, T, m("pull") - 0.15, m("pulled") + 0.55, [(0, .5, TOP + 0.04, 1.00), (0.28, .5, TICKET, 1.00), (1, .5, TICKET, 1.02)],
             overlays=[Overlay(P["tag-pull"], 0.55, 3.0, 30, 1200)], name="3-6 PULL THE GAP"),
        Shot(0.8, T, m("drop") - 0.05, m("dropped") + 0.02, [(0, .5, TICKET, 1.00), (1, .5, TICKET, 1.04)],
             name="6-6.8 ADMIN REVOKES ACCESS"),
        Shot(1.2, T, m("dropped") + 0.02, m("dropped") + 1.10, [(0, .5, TOP, 1.00), (1, .5, TOP, 1.03)],
             name="6.8-8 NOT ANYMORE."),
        Shot(3.0, T, m("dropped") + 1.10, m("dropped") + 3.30, [(0, .52, 0.45, 1.45), (1, .52, 0.47, 1.60)],
             name="8-11 old observation vs current world"),
        Shot(3.0, T, m("latch") - 0.30, m("resolved") + 0.95, [(0, .5, TICKET, 1.00), (0.42, .5, TOP, 1.00), (1, .5, TOP, 1.03)],
             overlays=[Overlay(P["tag-check"], 0.0, 1.25, 30, 1200)], name="11-14 CHECK AGAIN / STOPPED"),
        Shot(1.0, card=P["end-15"], card_push=0.03, name="14-15 THE WORLD CHANGED."),
    ]
    return Compositor(1080, 1350), shots


def hook_card(l1, l2, c1, c2):
    return f"""<div class="wrap"><div class="lead">THE WORLD CHANGED</div>
      <div class="big" style="font-size:250px"><span class="fill" style="color: var(--{c1})">{l1}</span><span class="fill" style="color: var(--{c2})">{l2}</span></div></div>"""


def trailer_16x9():
    H, D, C = Take(TK / "hero16"), Take(TK / "door16"), Take(TK / "calendar16")
    X, R, L = Take(TK / "challenge16"), Take(TK / "replay16"), Take(TK / "live16")
    h, d, c, x, r, l = H.m, D.m, C.m, X.m, R.m, L.m
    P = plates(1920, 1080, {
        "hook-saw": (1920, 1080, hook_card("THE AGENT SAW", "THE TRUTH.", "ink", "cobalt"), CARD_CSS, False),
        "hook-then": (1920, 1080, hook_card("THEN YOU CHANGED", "THE WORLD.", "ink", "coral"), CARD_CSS, False),
        "tag-change": (1400, 400, tag("CHANGE IT.", "coral", 150), PLATE_CSS, True),
        "chip-live": (1600, 200, '<div id="plate"><span class="chipbox" style="display:inline-block; font-size:22px; line-height:1.5; background: var(--ink); color: var(--paper)">'
                      'RECORDED GENUINE RUN · CLAUDE OPUS 5.5<br>REPLAYED FROM RECEIPT · NOT RUNNING NOW</span></div>', PLATE_CSS + CARD_CSS, True),
        "end-trailer": (1920, 1080, end_card(["THE WORLD", "CHANGED."], "magenta", 300,
                         '<div class="foot"><span class="url">the-world-changed-lab.pages.dev</span>'
                         '<span class="chipbox">CHANGE THE WORLD · ENTER THE LAB →</span></div>'), CARD_CSS, False),
    })
    W = (0, .5, .5, 1.0)
    shots = [
        # hook
        Shot(1.5, card=P["hook-saw"], card_push=0.025, name="hook: THE AGENT SAW THE TRUTH."),
        Shot(1.5, H, 0.30, 1.80, [W, (1, .48, .46, 1.07)], name="hero: IT WAS TRUE."),
        Shot(1.3, card=P["hook-then"], card_push=0.025, name="hook: THEN YOU CHANGED THE WORLD."),
        # ACCESS outcome
        Shot(2.0, H, h("pull") - 0.10, h("pulled") + 0.20, [(0, .31, .62, 1.50), (1, .34, .61, 1.56)], name="access: PULL THE GAP"),
        Shot(1.8, H, h("drop") - 0.05, h("dropped") + 0.80, [W, (1, .5, .5, 1.03)], name="access: ADMIN REVOKES ACCESS / NOT ANYMORE."),
        Shot(1.8, H, h("dropped") + 0.10, h("dropped") + 2.20, [(0, .79, .68, 1.60), (1, .79, .73, 1.80)], name="access: old pass vs current world"),
        Shot(2.6, H, h("latch") - 0.20, h("resolved") + 0.80, [(0, .62, .62, 1.30), (0.55, .5, .5, 1.0), (1, .5, .5, 1.02)],
             overlays=[Overlay(P["tag-check"], 0.0, 1.1, 80, 800)], name="access: CHECK AGAIN / STOPPED"),
        # into the Lab
        Shot(2.3, D, d("tap") - 0.55, d("lab") + 0.60, [(0, .24, .55, 1.55), (0.52, .22, .56, 1.65), (0.66, .5, .5, 1.0), (1, .5, .5, 1.0)],
             name="door: ENTER THE LAB"),
        Shot(1.4, D, d("lab") + 0.60, d("lab") + 2.40, [W, (1, .5, .52, 1.06)], name="lab: PICK A WORLD."),
        # alternate world
        Shot(1.0, C, 0.40, 1.40, [W, (1, .5, .5, 1.03)], name="calendar: IT WAS FREE."),
        Shot(1.8, C, c("drop") - 0.05, c("dropped") + 1.30, [(0, .50, .50, 1.00), (1, .515, .50, 1.035)], name="calendar: SOMEONE ELSE BOOKS IT / NOT ANYMORE."),
        Shot(1.6, C, c("act") - 0.10, c("done") + 1.00, [W, (1, .5, .5, 1.03)], name="calendar: CHECK AGAIN / STOPPED"),
        # challenge
        Shot(1.2, X, 0.10, 1.30, [W, (1, .5, .5, 1.03)], name="challenge: CAN YOU CHANGE THE WORLD BEFORE IT ACTS?"),
        Shot(1.9, X, x("start") - 0.05, x("press") + 0.50, [(0, .42, .45, 1.18), (1, .45, .46, 1.22)],
             overlays=[Overlay(P["tag-change"], 1.9 * (x("press") - x("start") + 0.05) / (x("press") + 0.55 - x("start")), 1.9, 1180, 120)],
             name="challenge: CHANGE IT NOW"),
        Shot(1.9, X, x("done") - 0.20, x("done") + 1.60, [W, (1, .5, .5, 1.03)], name="challenge: IN TIME / STOPPED"),
        # replay
        Shot(1.5, R, r("f0") + 0.05, r("f1") - 0.10, [(0, .5, .225, 1.0), (1, .5, .225, 1.04)], name="replay: REPLAY WHAT THE AGENT SAW."),
        Shot(3.9, R, r("f1") - 0.10, r("f3") + 1.50, [(0, .5, .40, 1.0), (0.35, .5, .60, 1.0), (1, .5, .62, 1.03)], name="replay: saw -> became -> did"),
        # genuine run
        Shot(2.8, L, l("f0") + 0.05, l("f1") - 0.10, [(0, .5, .225, 1.0), (1, .42, .19, 1.20)], name="live: REAL AGENT RUN. CLAUDE OPUS 5.5 · RECORDED · NOT RUNNING NOW"),
        Shot(3.2, L, l("f1") - 0.10, l("f3") + 1.20, [(0, .5, .45, 1.0), (0.35, .5, .62, 1.0), (1, .5, .64, 1.03)],
             overlays=[Overlay(P["chip-live"], 0.0, 3.2, 48, 40, anim="none")], name="live: observe -> prepare -> WORLD CHANGED -> verify -> STOP"),
        # end
        Shot(3.0, card=P["end-trailer"], card_push=0.03, name="end: THE WORLD CHANGED."),
    ]
    return Compositor(1920, 1080), shots


# name -> (file, edit, crf). Grain is expensive; these CRFs keep type crisp and files repo-sized.
EDITS = {"trailer-16x9": ("twc-trailer-16x9.mp4", trailer_16x9, 25),
         "cut15-16x9": ("twc-cut-15s-16x9.mp4", cut15_16x9, 22),
         "cut15-4x5": ("twc-cut-15s-4x5.mp4", cut15_4x5, 22)}

if __name__ == "__main__":
    only = sys.argv[3].split(",") if len(sys.argv) > 3 else list(EDITS)
    report = {}
    rp = OUT / "edits.json"
    if rp.exists():
        report = json.loads(rp.read_text())
    for name in only:
        fname, fn, crf = EDITS[name]
        comp, shots = fn()
        dur, log = comp.render(shots, OUT / fname, crf=crf)
        report[name] = {"file": fname, "size": [comp.w, comp.h], "fps": comp.fps, "duration_s": round(dur, 3), "crf": crf,
                        "audio": None, "shots": log}
        print(name, fname, dur)
    rp.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
