"""
Record raw takes from the REAL product for the 15 s cut and the trailer (slow-clock screencast, see rec.py).
  npm run build && npx vite preview --port 4173 --strictPort &
  python3 tools/packaging/takes.py <work_dir> [take,...]
Each take -> <work_dir>/takes/<name>/{00000.jpg..., index.json(t, marks, pointer)}.
Every take asserts the kernel-driven DOM state it depends on, exactly like tools/lab_check.py.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rec import BASE, Recorder  # noqa: E402

WORK = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/twc-packaging")
SLOW = 0.08
SLOW_TALL = 0.06


def a(cond, msg):
    if not cond:
        raise AssertionError(msg)


def hero(vp, name, scale=2, to_lab=True):
    r = Recorder(vp, slow=SLOW, scale=scale, url=BASE + "?seed=twc-hero-0001")
    p = r.page
    p.wait_for_selector("#mode-label")
    p.click("#guard")  # CHECK AGAIN on from frame 0 (same pre-roll as tools/storyboard.py)
    p.evaluate("window.scrollTo(0,0)")
    r.sleep(0.4)
    short = vp["height"] < 1000
    r.start()
    r.mark("true")
    r.sleep(2.6)
    # pull the gap
    r.mark("pull")
    x, y = r.center("#act")
    dx = vp["width"] * (0.40 if vp["width"] > 1200 else 0.50)
    r.glide(x, y, x + dx, y, 1.5, down=True, up=True)
    r.mark("pulled")
    a(r.data("misregistered") == "false", "gap alone must not misregister")
    r.sleep(0.7)
    # the world changes
    r.mark("drop")
    tx, ty = r.center("#token")
    ib = p.locator("#interval").bounding_box()
    r.glide(tx, ty, ib["x"] + ib["width"] * 0.55, ib["y"] + ib["height"] / 2, 0.55, down=True, up=True)
    r.mark("dropped")
    r.sleep(0.9)
    a(p.inner_text("#headline-text") == "NOT ANYMORE.", "NOT ANYMORE.")
    a(r.data("misregistered") == "true" and r.data("stale") == "true", "stale + misregistered")
    a(p.inner_text("#belief-access") == "GRANTED" and p.inner_text("#reality-access") == "REVOKED", "belief/reality")
    r.sleep(2.6)
    # check again: pull the pin
    r.mark("latch")
    r.tap("#latch", 0.15)
    r.until('#bench[data-phase="RESOLVED"]')
    r.mark("resolved")
    a(r.data("outcome") == "BLOCKED", "guarded outcome BLOCKED")
    r.sleep(2.8)
    if to_lab:
        r.mark("door")
        p.locator("#door").evaluate("e => e.scrollIntoView({block: 'center'})")
        r.sleep(1.2)
        r.tap("#door", 0.12)
        r.until("#lab:not([hidden])")
        r.mark("lab")
        r.sleep(3.2)
        a(p.evaluate("location.hash") == "#lab", "door -> #lab")
    r.stop()
    d = r.save_take(WORK / "takes" / name)
    r.close()
    return d, r.marks


def calendar(name="calendar16"):
    r = Recorder({"width": 1440, "height": 810}, slow=SLOW, scale=2, url=BASE + "#lab/calendar")
    p = r.page
    p.wait_for_selector(".lab-exp--calendar")
    r.sleep(0.5)
    r.start()
    r.mark("start")
    r.sleep(1.2)
    x, y = r.center(".lab-exp .ticket__stub--act")
    r.glide(x, y, x + 400, y, 1.2, down=True, up=True)
    a(p.get_attribute(".lab-exp .wo", "data-divergent") == "false", "gap alone never diverges")
    r.sleep(0.4)
    r.mark("drop")
    sx, sy = r.center(".lab-exp .sticker")
    b = p.locator(".lab-exp .ticket__strip").bounding_box()
    r.glide(sx, sy, b["x"] + b["width"] * 0.55, b["y"] + b["height"] / 2, 0.55, down=True, up=True)
    r.mark("dropped")
    r.sleep(1.0)
    a(p.get_attribute(".lab-exp .wo", "data-divergent") == "true", "mutation diverges")
    a(p.inner_text(".lab-exp .lab-headline__text") == "NOT ANYMORE.", "calendar NOT ANYMORE.")
    r.sleep(1.6)
    r.mark("gate")
    r.tap(".lab-exp .gate")
    r.sleep(0.5)
    r.mark("act")
    r.tap(".lab-exp .pulltab")
    r.until('.lab-exp[data-phase="DONE"]')
    r.mark("done")
    a(p.get_attribute(".lab-exp", "data-outcome") == "STOPPED", "calendar checked -> STOPPED")
    r.sleep(2.4)
    r.stop()
    d = r.save_take(WORK / "takes" / name)
    r.close()
    return d, r.marks


def challenge(name="challenge16"):
    r = Recorder({"width": 1440, "height": 900}, slow=SLOW, scale=2, url=BASE + "#challenge/document")
    p = r.page
    p.wait_for_selector(".lab-chal--document")
    p.click(".lab-chal .gate")  # CHECK AGAIN on (pre-roll)
    p.evaluate("window.scrollTo(0,0)")
    r.sleep(0.5)
    r.start()
    r.mark("ready")
    r.sleep(1.4)
    r.mark("start")
    r.tap(".lab-chal .lab-next__primary")
    r.until('.lab-chal[data-phase="TRAVEL"]')
    r.mark("travel")
    r.sleep(1.1)
    r.mark("press")
    r.tap(".change-now", 0.12)
    r.sleep(0.2)
    a(p.get_attribute(".lab-chal", "data-changed") == "true", "change landed during travel")
    r.until('.lab-chal[data-phase="DONE"]')
    r.mark("done")
    a(p.get_attribute(".lab-chal", "data-timing") == "IN_TIME", "IN_TIME")
    a(p.get_attribute(".lab-chal", "data-outcome") == "STOPPED", "STOPPED")
    p.evaluate("window.scrollTo(0,0)")
    r.sleep(2.4)
    r.stop()
    d = r.save_take(WORK / "takes" / name)
    r.close()
    return d, r.marks


def same(name="same16"):
    r = Recorder({"width": 1440, "height": 1300}, slow=SLOW, scale=2, url=BASE + "#lab/access/same")
    p = r.page
    p.wait_for_selector(".lab-same")
    r.sleep(0.6)
    r.start()
    r.mark("start")
    r.sleep(1.0)
    b = p.locator(".split__seam").bounding_box()
    sx, sy = b["x"] + b["width"] / 2, b["y"] + b["height"] / 2
    r.mark("left")
    r.glide(sx, sy, sx - 230, sy, 1.0, down=True)
    r.sleep(0.8)
    r.mark("right")
    r.glide(sx - 230, sy, sx + 230, sy, 1.4)
    r.sleep(0.8)
    r.glide(sx + 230, sy, sx, sy, 0.8, up=True)
    left, right = p.inner_text(".path--l"), p.inner_text(".path--r")
    a("OUTDATED PASS USED" in left and "STOPPED" in right, (left, right))
    r.sleep(1.4)
    r.stop()
    d = r.save_take(WORK / "takes" / name)
    r.close()
    return d, r.marks


def replay(name="replay16"):
    r = Recorder({"width": 1440, "height": 1800}, slow=SLOW_TALL, scale=1.6, url=BASE + "#replay/canonical-unchecked")
    p = r.page
    p.wait_for_selector(".lab-replay")
    r.sleep(0.6)
    r.start()
    for i, lab in enumerate(["f0", "f1", "f2", "f3"]):
        if i:
            r.tap(f".lab-replay .frame >> nth={i}")
        r.mark(lab)
        r.sleep(1.9)
    a("OUTDATED PASS USED" == p.inner_text(".lab-replay .lab-headline__text"), "replay final")
    r.stop()
    d = r.save_take(WORK / "takes" / name)
    r.close()
    return d, r.marks


def live(name="live16"):
    r = Recorder({"width": 1440, "height": 1800}, slow=SLOW_TALL, scale=1.6, url=BASE + "#live")
    p = r.page
    p.wait_for_selector(".lab-live .specimen")
    r.sleep(0.6)
    a(p.inner_text(".specimen__model") == "CLAUDE OPUS 5.5", "model")
    a(p.inner_text(".specimen__label") == "RE-VERIFIED · STOPPED BEFORE COMMIT", "label")
    a(p.locator(".runlive__btn").is_disabled(), "RUN LIVE disabled")
    r.start()
    for i, lab in enumerate(["f0", "f1", "f2", "f3"]):
        if i:
            r.tap(f".lab-live .frame >> nth={i}")
        r.mark(lab)
        r.sleep(1.9)
    r.stop()
    d = r.save_take(WORK / "takes" / name)
    r.close()
    return d, r.marks


def door(name="door16"):
    """Front door -> Lab: reach the guarded outcome off-camera, then record the door and the pass sliding away."""
    r = Recorder({"width": 1440, "height": 810}, slow=SLOW, scale=2, url=BASE + "?seed=twc-hero-0001")
    p = r.page
    p.wait_for_selector("#mode-label")
    p.click("#guard")
    # pre-roll (not recorded) on the slowed page clock: waits are in product time
    x, y = r.center("#act")
    r.glide(x, y, x + 576, y, 0.6, down=True, up=True)
    r.sleep(0.4)
    tx, ty = r.center("#token")
    ib = p.locator("#interval").bounding_box()
    r.glide(tx, ty, ib["x"] + ib["width"] * 0.55, ib["y"] + ib["height"] / 2, 0.3, down=True, up=True)
    r.sleep(1.2)
    a(p.inner_text("#headline-text") == "NOT ANYMORE.", "NOT ANYMORE.")
    r.tap("#latch")
    r.until('#bench[data-phase="RESOLVED"]')
    r.sleep(1.5)
    a(r.data("outcome") == "BLOCKED", "guarded outcome BLOCKED")
    p.evaluate("window.scrollTo(0, 0)")
    r.sleep(0.3)
    r.start()
    r.mark("stopped")
    r.sleep(0.8)
    r.mark("scroll")
    p.evaluate("window.scrollTo({top: document.querySelector('#door').getBoundingClientRect().top + scrollY - innerHeight * 0.55, behavior: 'smooth'})")
    r.sleep(1.4)
    r.mark("tap")
    r.tap("#door", 0.12)
    r.until("#lab:not([hidden])")
    r.mark("lab")
    r.sleep(3.0)
    a(p.evaluate("location.hash") == "#lab", "door -> #lab")
    r.stop()
    d = r.save_take(WORK / "takes" / name)
    r.close()
    return d, r.marks


TAKES = {
    "door16": door,
    "hero16": lambda: hero({"width": 1440, "height": 810}, "hero16"),
    "hero45": lambda: hero({"width": 720, "height": 1520}, "hero45", scale=1.5, to_lab=False),
    "calendar16": calendar,
    "challenge16": challenge,
    "same16": same,
    "replay16": replay,
    "live16": live,
}

if __name__ == "__main__":
    only = sys.argv[2].split(",") if len(sys.argv) > 2 else list(TAKES)
    for n in only:
        d, marks = TAKES[n]()
        print(n, d, marks, flush=True)
