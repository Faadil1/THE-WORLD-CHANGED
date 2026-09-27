"""
Social covers from the REAL product object kit (tools/packaging/capture_objects.py).
  python3 tools/packaging/covers.py <work_dir> <out_dir>
Three directions x three ratios. Visual universe = the product's own tokens, fonts, grain and objects.
  A  NOT ANYMORE.        (primary / default launch thumbnail)
  B  IT WAS TRUE.
  C  THE WORLD CHANGED.
"""
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from look import CHROME, page  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
WORK = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/twc-packaging")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else ROOT / "evidence/packaging/final-v0/covers")
OUT.mkdir(parents=True, exist_ok=True)
OBJ = WORK / "objects"

RATIOS = {"16x9": (1920, 1080), "1x1": (1080, 1080), "4x5": (1080, 1350)}


def extend_lanyard(name):
    """The isolated pass is clipped just above the pass; extend the lanyard strip upward so it can leave the frame."""
    src = OBJ / name
    dst = OBJ / name.replace(".png", "-lanyard.png")
    im = Image.open(src).convert("RGBA")
    ext = EXT
    top = im.crop((0, 0, im.width, 1))
    out = Image.new("RGBA", (im.width, im.height + ext), (0, 0, 0, 0))
    for y in range(ext):
        out.paste(top, (0, y))
    out.paste(im, (0, ext))
    out.save(dst)
    return dst.name, ext / out.height  # fraction of the image that is lanyard extension


BODY = {"top": 496, "left": 502, "h": 2054, "w": 1500}  # opaque pass body inside the isolated @3x capture
EXT = 2400


def place(body_h, left, top, rot):
    """CSS placing a lanyard-extended pass image so its BODY is body_h tall at (left, top), rotated about its centre."""
    s = body_h / BODY["h"]
    L = left - BODY["left"] * s
    T = top - (EXT + BODY["top"]) * s
    ox = BODY["left"] * s + BODY["w"] * s / 2
    oy = (EXT + BODY["top"]) * s + body_h / 2
    return f".pass {{ height: auto; width: {2124 * s:.1f}px; left: {L:.1f}px; top: {T:.1f}px; transform: rotate({rot}deg); transform-origin: {ox:.1f}px {oy:.1f}px; }}"


def img(name):
    return f"file://{OBJ / name}"


def cover_A(ratio, w, h):
    passes, _ = extend_lanyard("passes-stale.png")
    top = '<header class="top"><span class="title">THE WORLD CHANGED</span><span class="chip">AN INTERACTIVE LAB</span></header>'
    hl = '<h1 class="hl"><span class="ghost">NOT<br>ANYMORE.</span><span>NOT</span><span>ANYMORE.</span></h1>'
    body = top + hl + f"""
      <img class="obj pass" src="{img(passes)}">
      <img class="obj token" src="{img('token.png')}">
      <span class="hand hand--coral changed">← world changed here</span>
      <p class="hook">The agent saw the truth.<br><b>Then you changed the world.</b></p>"""
    L = {
        "16x9": """
          .hl { left: calc(var(--g) - 0.06em); top: 250px; font-size: 318px; color: var(--coral); }
          """ + place(1000, 1120, 150, 5) + """
          .token { width: 500px; left: 70px; top: 840px; transform: rotate(-6deg); }
          .changed { left: 590px; top: 858px; font-size: 40px; transform: rotate(-6deg); }
          .hook { left: var(--g); top: 132px; font-size: 42px; }
        """,
        "1x1": """
          .hl { left: calc(var(--g) - 0.06em); top: 200px; font-size: 238px; color: var(--coral); }
          """ + place(640, 500, 585, 6) + """
          .token { width: 420px; left: 30px; top: 745px; transform: rotate(-7deg); }
          .changed { left: 70px; top: 880px; font-size: 32px; transform: rotate(-6deg); }
          .hook { left: var(--g); top: 118px; font-size: 32px; }
        """,
        "4x5": """
          .hl { left: calc(var(--g) - 0.06em); top: 200px; font-size: 238px; color: var(--coral); }
          """ + place(820, 400, 650, 5) + """
          .token { width: 440px; left: 26px; top: 820px; transform: rotate(-7deg); }
          .changed { left: 70px; top: 962px; font-size: 34px; transform: rotate(-6deg); }
          .hook { left: var(--g); top: 118px; font-size: 32px; }
        """,
    }[ratio]
    return page(w, h, body, L)


def cover_B(ratio, w, h):
    p, _ = extend_lanyard("pass-granted.png")
    top = '<header class="top"><span class="title">THE WORLD CHANGED</span><span class="chip">AN INTERACTIVE LAB</span></header>'
    hl = '<h1 class="hl"><span>IT WAS</span><span>TRUE.</span></h1>'
    body = top + hl + f"""
      <img class="obj pass" src="{img(p)}">
      <p class="hook">The agent saw the truth.<br><b>Then you changed the world.</b></p>"""
    L = {
        "16x9": """
          .hl { left: calc(var(--g) - 0.06em); top: 262px; font-size: 372px; color: var(--cobalt); }
          """ + place(1130, 1010, 120, -4) + """
          .hook { left: var(--g); top: 132px; font-size: 42px; }
        """,
        "1x1": """
          .hl { left: calc(var(--g) - 0.06em); top: 200px; font-size: 250px; color: var(--cobalt); }
          """ + place(760, 470, 470, -5) + """
          .hook { left: var(--g); top: 118px; font-size: 32px; }
        """,
        "4x5": """
          .hl { left: calc(var(--g) - 0.06em); top: 200px; font-size: 290px; color: var(--cobalt); }
          """ + place(900, 380, 640, -5) + """
          .hook { left: var(--g); top: 118px; font-size: 32px; }
        """,
    }[ratio]
    return page(w, h, body, L)


def cover_C(ratio, w, h):
    p, _ = extend_lanyard("passes-stopped.png")
    top = '<header class="top"><span class="title">THE WORLD CHANGED</span><span class="chip">AN INTERACTIVE LAB</span></header>'
    hl = '<h1 class="hl"><span class="ghost">THE WORLD<br>CHANGED.</span><span>THE WORLD</span><span>CHANGED.</span></h1>'
    body = top + hl + f"""
      <img class="obj pass" src="{img(p)}">
      <img class="obj stamp" src="{img('stamp-stopped.png')}">
      <span class="hand hand--violet checked">""" + ("checked again ↘" if ratio == "16x9" else "checked again →") + """</span>
      <p class="hook">The agent saw the truth.<br><b>Then you changed the world.</b></p>"""
    L = {
        "16x9": """
          .hl { left: calc(var(--g) - 0.06em); top: 262px; font-size: 262px; color: var(--magenta); }
          """ + place(980, 1170, 150, 4) + """
          .stamp { width: 640px; left: 60px; top: 800px; transform: rotate(-4deg); }
          .checked { left: 90px; top: 745px; font-size: 40px; transform: rotate(-4deg); }
          .hook { left: var(--g); top: 132px; font-size: 42px; }
        """,
        "1x1": """
          .hl { left: calc(var(--g) - 0.06em); top: 200px; font-size: 186px; color: var(--magenta); }
          """ + place(660, 400, 560, 5) + """
          .stamp { display: none; }
          .checked { left: 70px; top: 900px; font-size: 34px; transform: rotate(-6deg); }
          .hook { left: var(--g); top: 118px; font-size: 32px; }
        """,
        "4x5": """
          .hl { left: calc(var(--g) - 0.06em); top: 200px; font-size: 200px; color: var(--magenta); }
          """ + place(830, 330, 640, 5) + """
          .stamp { display: none; }
          .checked { left: 50px; top: 1150px; font-size: 34px; transform: rotate(-6deg); }
          .hook { left: var(--g); top: 118px; font-size: 32px; }
        """,
    }[ratio]
    return page(w, h, body, L)


DIRS = {"A-not-anymore": cover_A, "B-it-was-true": cover_B, "C-the-world-changed": cover_C}

if __name__ == "__main__":
    only = sys.argv[3].split(",") if len(sys.argv) > 3 else list(DIRS)
    tmp = WORK / "cover-html"
    tmp.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path=CHROME, args=["--allow-file-access-from-files"])
        for d in only:
            for ratio, (w, h) in RATIOS.items():
                html = DIRS[d](ratio, w, h)
                f = tmp / f"{d}-{ratio}.html"
                f.write_text(html)
                pg = br.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
                pg.goto(f"file://{f}")
                pg.wait_for_load_state("networkidle")
                pg.evaluate("document.fonts.ready")
                pg.wait_for_timeout(250)
                out = OUT / f"twc-cover-{d}-{ratio}.png"
                pg.screenshot(path=str(out))
                pg.close()
                print(out.name)
        br.close()
