"""
15-second silent storyboard, driven through the REAL hero (deterministic sandbox, CHECK AGAIN on).
Visual pass 2: "ACCESS PASS / REALITY TEAR".

Beats (seconds):
  0-3   IT WAS TRUE.             huge VALID access pass, headline IT WAS TRUE.
  3-6   pull the gap             the perforated ticket is torn open; the pass does not change
  6-8   NOT ANYMORE.             ADMIN REVOKES ACCESS dropped in; NO LONGER VALID slams onto the pass
  8-11  old observation          cyan ghost pass (GRANTED v1, OLD) vs magenta current pass (REVOKED v2)
  11-14 check again, stop        pull tab; scanner reads the current pass; ghost snaps back; STOPPED
  14-15 THE WORLD CHANGED.       full-frame end card (storyboard-only overlay; mode label stays visible)

On short (phone) viewports the "camera" scrolls between the pass and the ticket.

For every variant it records video, trims it to exactly 15 s, captures one frame per beat and
asserts the DOM reflects kernel state at each beat. Sound is never used.

Usage:
  npm run build && npx vite preview --port 4173 --strictPort &
  python3 tools/storyboard.py [out_dir]
"""
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://localhost:4173/?seed=twc-hero-0001"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "evidence/storyboard/visual-pass-2")
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
DET = "DETERMINISTIC SANDBOX · SCRIPTED AGENT — NOT A LIVE MODEL"

VARIANTS = [
    {"name": "desktop", "viewport": {"width": 1080, "height": 1350}, "reduced": False},
    {"name": "mobile", "viewport": {"width": 390, "height": 844}, "reduced": False},
    {"name": "desktop-reduced-motion", "viewport": {"width": 1080, "height": 1350}, "reduced": True},
]

BEATS = [
    (0.0, 3.0, "it-was-true"),
    (3.0, 6.0, "pull-gap"),
    (6.0, 8.0, "not-anymore"),
    (8.0, 11.0, "old-observation"),
    (11.0, 14.0, "check-again-stopped"),
    (14.0, 15.0, "the-world-changed"),
]

END_CARD = """
(() => {
  const d = document.createElement('div');
  d.id = 'storyboard-endcard';
  d.innerHTML = `
    <div class="sb-title"><span class="sb-c">THE WORLD CHANGED.</span><span class="sb-m">THE WORLD CHANGED.</span></div>
    <div class="sb-chip">__DET__</div>`;
  const s = document.createElement('style');
  s.textContent = `
    #storyboard-endcard { position: fixed; inset: 0; z-index: 99; background: var(--paper) var(--grain);
      display: grid; align-content: center; gap: 28px; padding: 0 4vw; overflow: hidden; }
    .sb-title { position: relative; font-family: var(--display); font-weight: 800; font-stretch: 75%;
      font-size: 19vw; line-height: 0.8; letter-spacing: -0.035em; }
    .sb-title span { display: block; }
    .sb-c { position: absolute; inset: 0; color: transparent; -webkit-text-stroke: 2px var(--cyan); transform: translate(-0.05em, -0.06em); mix-blend-mode: multiply; }
    .sb-m { color: var(--magenta); }
    .sb-chip { justify-self: start; font: 700 11px var(--mono); letter-spacing: 0.06em; border: 1.5px solid var(--ink); background: var(--paper); padding: 3px 7px; max-width: calc(100vw - 32px); }`;
  document.head.appendChild(s);
  document.body.appendChild(d);
})();
""".replace("__DET__", DET)


def center(page, sel):
    b = page.locator(sel).bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def data(page, key):
    return page.eval_on_selector("#bench", f"e => e.dataset.{key} ?? ''")


def step_states(page):
    return page.eval_on_selector_all("#sequence li", "els => els.map(e => [e.dataset.step, e.dataset.state || 'pending', e.innerText.trim()])")


def run_variant(p, v):
    out = OUT / v["name"]
    out.mkdir(parents=True, exist_ok=True)
    raw_dir = out / "_raw"
    browser = p.chromium.launch(executable_path=CHROME)
    ctx = browser.new_context(
        viewport=v["viewport"],
        reduced_motion="reduce" if v["reduced"] else "no-preference",
        record_video_dir=str(raw_dir),
        record_video_size=v["viewport"],
    )
    rec_start = time.monotonic()
    page = ctx.new_page()
    page.goto(URL)
    page.wait_for_selector("#mode-label")
    page.click("#guard")  # pre-roll: CHECK AT COMMIT on; visible from frame 0
    page.evaluate("window.scrollTo(0, 0)")
    page.mouse.move(-10, -10)
    page.wait_for_timeout(600)
    t0 = time.monotonic()
    at = lambda s: max(0.0, t0 + s - time.monotonic())
    wait_until = lambda s: time.sleep(at(s))
    checks = {}
    frames = {}

    short = v["viewport"]["height"] < 1000

    def show(sel, block="center"):
        """Camera move on short viewports only (desktop poster keeps everything in frame)."""
        if short:
            page.evaluate(f"document.querySelector('{sel}').scrollIntoView({{block: '{block}'}})")
            time.sleep(0.12)

    def headline():
        return page.inner_text("#headline-text")

    def frame(label, s):
        wait_until(s)
        path = out / f"{int(s * 10):03d}-{label}.jpg"  # grain texture makes PNG frames ~0.8 MB each
        page.screenshot(path=str(path), type="jpeg", quality=86)
        frames[label] = path.name

    # 0-3 correct observation
    frame("it-was-true", 1.5)
    checks["it-was-true"] = {
        "headline": headline(),
        "misregistered": data(page, "misregistered"),
        "steps": step_states(page),
        "mode_label": page.inner_text("#mode-label"),
    }
    assert checks["it-was-true"]["headline"] == "IT WAS TRUE."
    assert checks["it-was-true"]["misregistered"] == "false"
    assert step_states(page)[0][1] == "current"

    # 3-6 pull the gap (smooth drag of the ACT handle)
    wait_until(3.0)
    show("#gapline")
    wait_until(3.2)
    x, y = center(page, "#act")
    dx = v["viewport"]["width"] * (0.5 if v["viewport"]["width"] < 600 else 0.42)
    page.mouse.move(x, y)
    page.mouse.down()
    n = 40
    for i in range(1, n + 1):
        page.mouse.move(x + dx * i / n, y)
        time.sleep(1.6 / n)
    page.mouse.up()
    frame("pull-gap", 5.4)
    checks["pull-gap"] = {"phase": data(page, "phase"), "misregistered": data(page, "misregistered"), "headline": headline()}
    assert checks["pull-gap"]["headline"] == "IT WAS TRUE."
    assert checks["pull-gap"]["phase"] == "OPEN"
    assert checks["pull-gap"]["misregistered"] == "false", "pulling alone must not misregister"

    # 6-8 revoke access (drag the world event into the gap)
    wait_until(6.0)
    tx, ty = center(page, "#token")
    ib = page.locator("#interval").bounding_box()
    gx, gy = ib["x"] + ib["width"] * 0.55, ib["y"] + ib["height"] / 2
    page.mouse.move(tx, ty)
    page.mouse.down()
    for i in range(1, 13):  # few steps: the drop must land early in its beat
        page.mouse.move(tx + (gx - tx) * i / 12, ty + (gy - ty) * i / 12)
        time.sleep(0.03)
    page.mouse.up()
    show(".topline", "start")
    frame("not-anymore", 7.8)
    assert headline() == "NOT ANYMORE."

    # 8-11 old observation vs current world
    frame("old-observation", 9.5)
    checks["old-observation"] = {
        "headline": headline(),
        "misregistered": data(page, "misregistered"),
        "stale": data(page, "stale"),
        "changed": data(page, "changed"),
        "steps": step_states(page),
        "belief": page.inner_text(".pass__tag--belief"),
        "reality": page.inner_text(".pass__tag--reality"),
        "belief_access": page.inner_text("#belief-access"),
        "reality_access": page.inner_text("#reality-access"),
    }
    c = checks["old-observation"]
    assert c["misregistered"] == "true" and c["stale"] == "true" and c["changed"] == "true"
    assert c["belief_access"] == "GRANTED" and c["reality_access"] == "REVOKED"
    assert [s[1] for s in c["steps"]] == ["reached", "reached", "current", "pending"]

    # 11-14 check again and stop (pull the tab)
    wait_until(10.9)
    show("#gapline")
    wait_until(11.1)
    lx, ly = center(page, "#latch")
    page.mouse.move(lx, ly)
    page.mouse.down()
    for i in range(1, 11):
        page.mouse.move(lx, ly + 5 * i)
        time.sleep(0.02)
    page.mouse.up()
    time.sleep(0.25)
    show(".passes")
    page.wait_for_function("document.getElementById('bench').dataset.phase === 'RESOLVED'", timeout=4000)
    frame("check-again-stopped", 13.5)
    checks["check-again-stopped"] = {
        "headline": headline(),
        "passmark": page.inner_text("#passmark"),
        "outcome": data(page, "outcome"),
        "stopped": data(page, "stopped"),
        "stamp": page.inner_text("#stamp"),
        "steps": step_states(page),
        "same_world": page.eval_on_selector_all("#sameworld-rows tr", "rs => rs.map(r => r.innerText.replace(/\\s+/g, ' ').trim())"),
    }
    c = checks["check-again-stopped"]
    assert c["outcome"] == "BLOCKED" and c["stopped"] == "true"
    assert c["stamp"] == "RE-CHECKED · STOPPED" and c["passmark"] == "STOPPED"
    assert c["steps"][3][2] == "CHECKED AGAIN → STOPPED"

    # 14-15 end card
    wait_until(14.0)
    page.evaluate(END_CARD)
    frame("the-world-changed", 14.6)
    checks["the-world-changed"] = {"mode_label_on_card": page.inner_text(".sb-chip")}
    assert checks["the-world-changed"]["mode_label_on_card"] == DET
    wait_until(15.2)

    offset = t0 - rec_start
    video = page.video.path()
    ctx.close()
    browser.close()
    clip = out / "clip-15s.mp4"
    ff = ffmpeg()
    subprocess.run(
        [ff, "-y", "-loglevel", "error", "-ss", f"{offset:.3f}", "-i", video, "-t", "15", "-an",
         "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "28", str(clip)],
        check=True,
    )
    shutil.rmtree(raw_dir, ignore_errors=True)
    dur = probe_duration(ff, clip)
    assert 14.8 <= dur <= 15.2, dur
    return {"variant": v["name"], "viewport": v["viewport"], "reduced_motion": v["reduced"], "clip": clip.name, "clip_seconds": dur, "audio": False, "frames": frames, "checks": checks}


def ffmpeg():
    import imageio_ffmpeg  # bundled static ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def probe_duration(ff, path):
    r = subprocess.run([ff, "-i", str(path)], capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if "Duration:" in line:
            h, m, s = line.split("Duration:")[1].split(",")[0].strip().split(":")
            return round(int(h) * 3600 + int(m) * 60 + float(s), 2)
    return -1


def contact_sheet(results):
    from PIL import Image, ImageDraw

    for r in results:
        d = OUT / r["variant"]
        imgs = [Image.open(d / r["frames"][label]) for _, _, label in BEATS]
        th = 520
        imgs = [im.resize((int(im.width * th / im.height), th)) for im in imgs]
        pad, cap = 16, 30
        W = sum(im.width for im in imgs) + pad * (len(imgs) + 1)
        sheet = Image.new("RGB", (W, th + cap + pad * 2), (242, 238, 227))
        dr = ImageDraw.Draw(sheet)
        x = pad
        for (a, b, label), im in zip(BEATS, imgs):
            sheet.paste(im, (x, pad + cap))
            dr.rectangle([x - 1, pad + cap - 1, x + im.width, pad + cap + th], outline=(22, 21, 20))
            dr.text((x, pad + 6), f"{a:g}-{b:g}s  {label.upper()}", fill=(22, 21, 20))
            x += im.width + pad
        sheet.save(OUT / f"contact-sheet-{r['variant']}.png")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        results = [run_variant(p, v) for v in VARIANTS]
    contact_sheet(results)
    summary = {"beats": [{"from": a, "to": b, "beat": l} for a, b, l in BEATS], "variants": results}
    (OUT / "storyboard.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({r["variant"]: {"clip_seconds": r["clip_seconds"], "frames": len(r["frames"])} for r in results}, indent=2))
