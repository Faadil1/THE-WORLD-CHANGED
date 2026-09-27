"""
Contact sheets + README visuals from the finished packaging assets.
  python3 tools/packaging/sheets.py <pkg_dir>   (default evidence/packaging/final-v0)
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PKG = Path(sys.argv[1] if len(sys.argv) > 1 else "evidence/packaging/final-v0")
CS = PKG / "contact-sheets"
RM = PKG / "readme"
CS.mkdir(parents=True, exist_ok=True)
RM.mkdir(parents=True, exist_ok=True)
PAPER, INK = (245, 236, 217), (29, 20, 66)


def font(size):
    for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def sheet(items, out, th=360, cols=4, title=None):
    """items: [(label, PIL.Image)] -> labelled grid on paper."""
    thumbs = [(lab, im.convert("RGB").resize((int(im.width * th / im.height), th), Image.LANCZOS)) for lab, im in items]
    rows = [thumbs[i:i + cols] for i in range(0, len(thumbs), cols)]
    pad, cap, head = 24, 34, (70 if title else 0)
    W = max(sum(t.width for _, t in r) + pad * (len(r) + 1) for r in rows)
    H = head + len(rows) * (th + cap + pad) + pad
    S = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(S)
    if title:
        d.text((pad, 22), title, fill=INK, font=font(26))
        d.line([(pad, 60), (W - pad, 60)], fill=INK, width=3)
    y = head + pad
    for r in rows:
        x = pad
        for lab, t in r:
            d.text((x, y), lab, fill=INK, font=font(17))
            S.paste(t, (x, y + cap))
            d.rectangle([x - 1, y + cap - 1, x + t.width, y + cap + th], outline=INK, width=2)
            x += t.width + pad
        y += th + cap + pad
    S.save(out, quality=85, optimize=True)
    return out


def frame_at(mp4, t):
    with tempfile.NamedTemporaryFile(suffix=".png") as f:
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{t:.3f}", "-i", str(mp4), "-frames:v", "1", f.name], check=True)
        return Image.open(f.name).copy()


def video_sheet(key, cols):
    e = json.loads((PKG / "trailer" / "edits.json").read_text())[key]
    mp4 = PKG / "trailer" / e["file"]
    shots = e["shots"] + [{"t": e["duration_s"], "shot": "_end"}]
    items = []
    for a, b in zip(shots, shots[1:]):
        t = a["t"] + (b["t"] - a["t"]) * 0.7
        items.append((f"{a['t']:05.2f}s  {a['shot']}"[:44], frame_at(mp4, t)))
    return sheet(items, CS / f"{key}.jpg", th=300 if e["size"][0] > e["size"][1] else 420, cols=cols,
                 title=f"{e['file']} · {e['size'][0]}x{e['size'][1]} · {e['duration_s']:.2f}s · {e['fps']} fps · silent")


if __name__ == "__main__":
    # covers
    cov = sorted((PKG / "covers").glob("*.png"))
    sheet([(p.stem.replace("twc-cover-", ""), Image.open(p)) for p in cov], CS / "covers.jpg", th=360, cols=3,
          title="COVERS · A NOT ANYMORE. (default launch thumbnail) · B IT WAS TRUE. · C THE WORLD CHANGED.")
    # screenshots
    sh = PKG / "screenshots"
    items = [(p.stem.replace("twc-", "") + " · desktop", Image.open(p)) for p in sorted((sh / "desktop").glob("*.jpg"))]
    sheet(items, CS / "screenshots-desktop.jpg", th=330, cols=4, title="SCREENSHOTS · desktop 2880x1800")
    items = [(p.stem.replace("twc-", ""), Image.open(p)) for p in sorted((sh / "portfolio-4x5").glob("*.jpg"))]
    items += [(p.stem.replace("twc-", ""), Image.open(p)) for p in sorted((sh / "mobile").glob("*.jpg"))]
    sheet(items, CS / "screenshots-portfolio-mobile.jpg", th=520, cols=5, title="SCREENSHOTS · 4:5 portfolio 1600x2000 + mobile 1170x2532")
    # video
    video_sheet("cut15-16x9", 4)
    video_sheet("cut15-4x5", 7)
    video_sheet("trailer-16x9", 5)

    # ---- README visuals ----------------------------------------------------------------------------
    Image.open(PKG / "covers" / "twc-cover-A-not-anymore-16x9.png").convert("RGB").resize((1600, 900), Image.LANCZOS) \
        .save(RM / "twc-readme-hero.jpg", quality=88, optimize=True)
    # compact product loop: the 15 s silent cut as an animated GIF (GitHub renders it inline).
    # Paper grain defeats GIF compression, so the preview is denoised (the MP4s keep the grain).
    src = PKG / "trailer" / "twc-cut-15s-16x9.mp4"
    pal = RM / "_pal.png"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-vf",
                    "fps=10,scale=640:-1:flags=lanczos,hqdn3d=6:6:8:8,palettegen=max_colors=48:stats_mode=diff", str(pal)], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-i", str(pal), "-lavfi",
                    "fps=10,scale=640:-1:flags=lanczos,hqdn3d=6:6:8:8[x];[x][1:v]paletteuse=dither=none:diff_mode=rectangle",
                    str(RM / "twc-readme-loop.gif")], check=True)
    pal.unlink()
    # Lab overview: the four Lab layers as paper index cards (WORLD · CHANGE IT · REPLAY · LIVE)
    names = [("WORLD", "03-pick-a-world"), ("CHANGE IT", "04-change-it"), ("REPLAY", "06-replay-what-the-agent-saw"), ("LIVE", "07-real-agent-run")]
    tw, gap = 780, 40
    th_ = int(tw * 1800 / 2880)
    W, H = 2 * tw + 3 * gap, 2 * (th_ + 56) + 3 * gap
    S = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(S)
    for i, (lab, slug) in enumerate(names):
        x = gap + (i % 2) * (tw + gap)
        y = gap + (i // 2) * (th_ + 56 + gap)
        im = Image.open(sh / "desktop" / f"twc-{slug}.jpg").convert("RGB").resize((tw, th_), Image.LANCZOS)
        d.rectangle([x, y, x + 14 * len(lab) + 40, y + 44], fill=INK)
        d.text((x + 18, y + 10), lab, fill=PAPER, font=font(24))
        d.rectangle([x + 8, y + 56 + 8, x + tw + 8, y + 56 + th_ + 8], fill=INK)
        S.paste(im, (x, y + 56))
        d.rectangle([x - 2, y + 54, x + tw + 1, y + 56 + th_ + 1], outline=INK, width=3)
    S.save(RM / "twc-readme-lab.jpg", quality=86, optimize=True)
    # Proof image: the genuine Opus specimen, entrance + receipt strip (first ~1400 CSS px of #live @2x)
    live = Image.open(Path(sys.argv[2]) / "shots-raw" / "desktop-07-live-full.png") if len(sys.argv) > 2 else None
    if live:
        live.crop((0, 0, live.width, min(live.height, 2 * 1330))).convert("RGB").resize((1440, 1330), Image.LANCZOS) \
            .save(RM / "twc-readme-proof.jpg", quality=86, optimize=True)
    for p in sorted(RM.iterdir()):
        print(p.name, Image.open(p).size, p.stat().st_size)
