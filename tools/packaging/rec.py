"""
Slow-clock screen recorder for packaging footage (THE WORLD CHANGED).

Headless Chromium screencast is DIP-only (ignores device scale) and a 2x captureScreenshot costs ~220 ms.
To get smooth, sharp footage from the REAL product without touching product code, the page clock is slowed
by SLOW (e.g. 0.08):
  * CSS animations / transitions / WAAPI  -> CDP Animation.setPlaybackRate(SLOW)
  * performance.now / Date.now / rAF timestamps / setTimeout / setInterval -> init-script time shim
Gestures are performed 1/SLOW times slower in real time. Frames are captured back-to-back with
CDP Page.captureScreenshot at `scale` (device px), timestamped in product time, and consumed by compose.py.

Product logic, kernel state and receipts are untouched: only the wall clock the page observes is scaled.
"""
import base64
import shutil
import subprocess
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
BASE = "http://localhost:4173/"

SHIM = """
(() => {
  const R = __SLOW__;
  const pn = performance.now.bind(performance), dn = Date.now, T0 = pn(), D0 = dn();
  performance.now = () => T0 + (pn() - T0) * R;
  Date.now = () => D0 + (dn() - D0) * R;
  const st = window.setTimeout.bind(window), si = window.setInterval.bind(window);
  window.setTimeout = (f, ms = 0, ...a) => st(f, (ms || 0) / R, ...a);
  window.setInterval = (f, ms = 0, ...a) => si(f, (ms || 0) / R, ...a);
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((ts) => cb(T0 + (ts - T0) * R));
})();
"""


class Recorder:
    def __init__(self, viewport, slow=0.25, scale=1, reduced=False, touch=False, url=BASE):
        self.slow = slow
        self.scale = scale
        self.vp = viewport
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch(executable_path=CHROME)
        self.ctx = self.browser.new_context(viewport=viewport, device_scale_factor=1, has_touch=touch,
                                            is_mobile=touch, reduced_motion="reduce" if reduced else "no-preference")
        self.ctx.add_init_script(SHIM.replace("__SLOW__", str(slow)))
        self.page = self.ctx.new_page()
        self.errors = []
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        self.cdp = self.ctx.new_cdp_session(self.page)
        self.cdp.send("Animation.enable")
        self.frames = []
        self.marks = {}
        self.pointer = []  # (product_t, x, y, down) in CSS px
        self._rec = False
        self.page.goto(url)
        self.cdp.send("Animation.setPlaybackRate", {"playbackRate": slow})

    # ---- clock ----------------------------------------------------------------------------------
    def sleep(self, product_seconds):
        """Wait an amount of PRODUCT time (real time = product / slow), capturing frames while recording."""
        end = time.monotonic() + product_seconds / self.slow
        if not self._rec:
            time.sleep(max(0.0, end - time.monotonic()))
            return
        while time.monotonic() < end:
            self.grab()

    def until(self, sel, product_timeout=15.0):
        """Wait (in product time) for a selector to be visible, capturing frames the whole time."""
        end = time.monotonic() + product_timeout / self.slow
        while time.monotonic() < end:
            if self._rec:
                self.grab()
            else:
                time.sleep(0.05)
            if self.page.locator(sel).first.is_visible():
                return
        raise AssertionError(f"timeout waiting for {sel}")

    def grab(self):
        """One device-pixel frame (screencast ignores DPR, captureScreenshot honours it)."""
        ts = time.monotonic()
        sx, sy = self.cdp.send("Runtime.evaluate", {"expression": "[scrollX, scrollY]", "returnByValue": True})["result"]["value"]
        clip = {"x": sx, "y": sy, "width": self.vp["width"], "height": self.vp["height"], "scale": self.scale}  # clip is in document px
        r = self.cdp.send("Page.captureScreenshot", {"format": "jpeg", "quality": 92, "optimizeForSpeed": True, "clip": clip})
        self.frames.append(((ts + time.monotonic()) / 2, r["data"]))

    def t(self):
        """Product-time seconds since recording started."""
        return (time.monotonic() - self.t0) * self.slow

    def mark(self, name):
        self.marks[name] = round(self.t(), 3)

    # ---- capture --------------------------------------------------------------------------------
    def start(self):
        self.page.mouse.move(self.vp["width"] - 2, self.vp["height"] - 2)
        self.t0 = time.monotonic()
        self._rec = True
        self.grab()

    def stop(self):
        self.grab()
        self._rec = False
        self.t_end = time.monotonic()

    def write(self, out_mp4, fps=30, size=None, crf=16):
        """Re-time frames by SLOW and resample to constant fps. Returns duration (s)."""
        tmp = Path(str(out_mp4) + ".frames")
        shutil.rmtree(tmp, ignore_errors=True)
        tmp.mkdir(parents=True)
        lines = []
        fr = self.frames
        for i, (ts, data) in enumerate(fr):
            p = tmp / f"{i:05d}.jpg"
            p.write_bytes(base64.b64decode(data))
            nxt = fr[i + 1][0] if i + 1 < len(fr) else self.t_end
            start = self.t0 if i == 0 else max(ts, self.t0)
            dur = max(0.001, (nxt - start) * self.slow)
            lines.append(f"file '{p.name}'\nduration {dur:.5f}")
        lines.append(f"file '{tmp.name}/{len(fr) - 1:05d}.jpg'".replace(f"{tmp.name}/", ""))
        (tmp / "list.txt").write_text("\n".join(lines) + "\n")
        vf = [f"fps={fps}"]
        if size:
            vf.append(f"scale={size[0]}:{size[1]}:flags=lanczos")
        vf.append("format=yuv420p")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"),
                        "-vf", ",".join(vf), "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-an",
                        "-movflags", "+faststart", str(out_mp4)], check=True)
        shutil.rmtree(tmp)
        return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out_mp4)]))

    def save_take(self, out_dir):
        """Keep raw screencast frames + product-time index (no re-encode) for the compositor."""
        import json
        out = Path(out_dir)
        shutil.rmtree(out, ignore_errors=True)
        out.mkdir(parents=True)
        idx = []
        for i, (ts, data) in enumerate(self.frames):
            (out / f"{i:05d}.jpg").write_bytes(base64.b64decode(data))
            idx.append(round(max(0.0, (ts - self.t0) * self.slow), 4))
        dur = round((self.t_end - self.t0) * self.slow, 3)
        (out / "index.json").write_text(json.dumps({"t": idx, "duration": dur, "marks": self.marks,
                                                     "viewport": self.vp, "slow": self.slow, "errors": self.errors,
                                                     "scale": self.scale, "pointer": self.pointer}))
        return dur

    def close(self):
        self.ctx.close()
        self.browser.close()
        self.pw.stop()

    # ---- gestures (all in product time) ---------------------------------------------------------
    def center(self, sel):
        b = self.page.locator(sel).first.bounding_box()
        return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2

    def _log(self, x, y, down):
        if self._rec:
            self.pointer.append((round(self.t(), 4), round(x, 1), round(y, 1), down))

    def glide(self, x0, y0, x1, y1, secs, ease=True, down=False, up=False):
        m = self.page.mouse
        m.move(x0, y0)
        if down:
            m.down()
            self._log(x0, y0, True)
        n = max(6, int(secs * 60))
        for i in range(1, n + 1):
            u = i / n
            if ease:
                u = u * u * (3 - 2 * u)
            m.move(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u)
            self._log(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, down)
            self.sleep(secs / n)
        if up:
            m.up()
            self._log(x1, y1, False)

    def tap(self, sel, hold=0.12):
        x, y = self.center(sel)
        m = self.page.mouse
        m.move(x, y)
        m.down()
        self._log(x, y, True)
        self.sleep(hold)
        m.up()
        self._log(x, y, False)

    def drag(self, sel, to, secs=0.8):
        x, y = self.center(sel)
        tx, ty = to(x, y) if callable(to) else to
        self.glide(x, y, tx, ty, secs, down=True, up=True)

    def point_in(self, sel, fx, fy):
        b = self.page.locator(sel).first.bounding_box()
        return b["x"] + b["width"] * fx, b["y"] + b["height"] * fy

    def data(self, key, sel="#bench"):
        return self.page.eval_on_selector(sel, f"e => e.dataset.{key} ?? ''")
