"""
Minimal editorial compositor for packaging video: real product takes + camera + type cards -> H.264.

A timeline is a list of shots, played back to back (hard cuts: motion-matched, no dissolves):
  Take shot  - frames from a recorded take (take.py) between product times [a, b], retimed to `dur`,
               framed by an eased camera: keyframes (u, cx, cy, zoom) with u in [0, 1] over the shot,
               cx/cy normalised to the take frame, zoom 1 = the widest crop of the output aspect.
  Card shot  - a full-frame typographic card rendered from HTML in the product's own look (look.py).
Overlays (type plates rendered from HTML with alpha) can be pinned to either kind of shot.
Presses recorded in the take are drawn as a small ink ring (lime while held) so a silent viewer
sees that something is being pulled / tapped, without showing long cursor travel.

Nothing here alters product state: takes are pixels recorded from the real build.
"""
import math
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from look import CHROME, page  # noqa: E402
from take import Take  # noqa: E402

INK = (29, 20, 66)
LIME = (198, 244, 50)


def ease(u):
    u = min(1.0, max(0.0, u))
    return 4 * u * u * u if u < 0.5 else 1 - (-2 * u + 2) ** 3 / 2


def ease_out(u):
    u = min(1.0, max(0.0, u))
    return 1 - (1 - u) ** 3


@dataclass
class Overlay:
    png: str            # rendered plate (RGBA) path
    t_in: float         # seconds, relative to the shot
    t_out: float
    x: int              # top-left in output px
    y: int
    anim: str = "slam"  # slam | none


@dataclass
class Shot:
    dur: float
    take: Take = None
    a: float = 0.0
    b: float = None
    cam: list = field(default_factory=lambda: [(0, 0.5, 0.5, 1.0), (1, 0.5, 0.5, 1.0)])
    card: str = None
    card_push: float = 0.0  # slow scale-in of a card (0 = static)
    overlays: list = field(default_factory=list)
    ring: bool = True
    name: str = ""


class Compositor:
    def __init__(self, w, h, fps=30):
        self.w, self.h, self.fps = w, h, fps
        self._cache = {}

    def _png(self, path):
        if path not in self._cache:
            self._cache[path] = Image.open(path).convert("RGBA")
        return self._cache[path]

    def camera(self, shot, u):
        ks = shot.cam
        if u <= ks[0][0]:
            k = ks[0][1:]
        elif u >= ks[-1][0]:
            k = ks[-1][1:]
        else:
            for (u0, *k0), (u1, *k1) in zip(ks, ks[1:]):
                if u0 <= u <= u1:
                    e = ease((u - u0) / (u1 - u0) if u1 > u0 else 1)
                    k = [a + (b - a) * e for a, b in zip(k0, k1)]
                    break
        return k  # cx, cy, zoom

    def crop_box(self, fw, fh, cx, cy, z):
        ar = self.w / self.h
        if fw / fh > ar:
            bh = fh / z
            bw = bh * ar
        else:
            bw = fw / z
            bh = bw / ar
        x0 = min(max(0, cx * fw - bw / 2), fw - bw)
        y0 = min(max(0, cy * fh - bh / 2), fh - bh)
        return x0, y0, bw, bh

    def render_take(self, shot, t):
        u = t / shot.dur if shot.dur else 0
        b = shot.b if shot.b is not None else shot.a + shot.dur
        tt = shot.a + (b - shot.a) * u
        fr = shot.take.frame(tt)
        cx, cy, z = self.camera(shot, u)
        x0, y0, bw, bh = self.crop_box(fr.width, fr.height, cx, cy, z)
        out = fr.resize((self.w, self.h), Image.LANCZOS, box=(x0, y0, x0 + bw, y0 + bh))
        if shot.ring:
            p = shot.take.pointer_at(tt)
            if p:
                px, py, down, age = p
                sx, sy = (px - x0) * self.w / bw, (py - y0) * self.h / bh
                k = self.w / 1920
                r = 30 * k * (1.0 if down else 1 + 0.6 * age / 0.18)
                alpha = 255 if down else int(255 * max(0, 1 - age / 0.18))
                lay = Image.new("RGBA", out.size, (0, 0, 0, 0))
                d = ImageDraw.Draw(lay)
                if down:
                    d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=LIME + (95,))
                d.ellipse([sx - r, sy - r, sx + r, sy + r], outline=INK + (alpha,), width=max(3, int(5 * k)))
                out = Image.alpha_composite(out.convert("RGBA"), lay).convert("RGB")
        return out

    def render_card(self, shot, t):
        im = self._png(shot.card).convert("RGB")
        if shot.card_push:
            z = 1 + shot.card_push * ease_out(t / shot.dur)
            bw, bh = self.w / z, self.h / z
            x0, y0 = (self.w - bw) / 2, (self.h - bh) / 2
            im = im.resize((self.w, self.h), Image.LANCZOS, box=(x0, y0, x0 + bw, y0 + bh))
        return im

    def overlay(self, frame, ov, t):
        if not (ov.t_in <= t < ov.t_out):
            return frame
        im = self._png(ov.png)
        age = t - ov.t_in
        x, y = ov.x, ov.y
        if ov.anim == "slam" and age < 0.16:
            s = 1.12 - 0.12 * ease_out(age / 0.16)
            im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
            x -= (im.width - self._png(ov.png).width) // 2
            y -= (im.height - self._png(ov.png).height) // 2
        base = frame.convert("RGBA")
        base.alpha_composite(im, (max(0, x), max(0, y)), (max(0, -x), max(0, -y)))
        return base.convert("RGB")

    def render(self, shots, out_mp4, crf=21):
        total = sum(s.dur for s in shots)
        n = int(round(total * self.fps))
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{self.w}x{self.h}",
               "-r", str(self.fps), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
               "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(out_mp4)]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        starts, acc = [], 0.0
        for s in shots:
            starts.append(acc)
            acc += s.dur
        log = []
        si = 0
        for i in range(n):
            T = i / self.fps
            while si + 1 < len(shots) and T >= starts[si + 1] - 1e-9:
                si += 1
            s = shots[si]
            t = T - starts[si]
            fr = self.render_take(s, t) if s.take else self.render_card(s, t)
            for ov in s.overlays:
                fr = self.overlay(fr, ov, t)
            proc.stdin.write(fr.tobytes())
            if i == 0 or si != log[-1][1]:
                log.append((round(T, 3), si, s.name))
        proc.stdin.close()
        proc.wait()
        dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                             "-of", "csv=p=0", str(out_mp4)]))
        return dur, [{"t": t, "shot": name} for t, _, name in log]


def render_plates(specs, out_dir):
    """specs: {name: (w, h, body_html, css, transparent)} -> PNG per name, rendered with the product look."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = {}
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path=CHROME, args=["--allow-file-access-from-files"])
        for name, (w, h, body, css, transparent) in specs.items():
            f = out_dir / f"{name}.html"
            f.write_text(page(w, h, body, css, transparent=transparent))
            pg = br.new_page(viewport={"width": w, "height": h})
            pg.goto(f"file://{f}")
            pg.evaluate("document.fonts.ready")
            pg.wait_for_timeout(150)
            p = out_dir / f"{name}.png"
            if transparent and pg.locator("#plate").count():
                pg.locator("#plate").screenshot(path=str(p), omit_background=True)
            else:
                pg.screenshot(path=str(p), omit_background=transparent)
            pg.close()
            paths[name] = str(p)
        br.close()
    return paths
