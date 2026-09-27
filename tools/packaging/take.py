"""Random access into a recorded take by product time."""
import bisect
import json
from functools import lru_cache
from pathlib import Path

from PIL import Image


class Take:
    def __init__(self, d):
        self.d = Path(d)
        m = json.loads((self.d / "index.json").read_text())
        self.t, self.duration, self.marks = m["t"], m["duration"], m["marks"]
        self.vp, self.scale, self.pointer = m["viewport"], m.get("scale", 1), m.get("pointer", [])
        self.name = self.d.name

    @lru_cache(maxsize=6)
    def _load(self, i):
        return Image.open(self.d / f"{i:05d}.jpg").convert("RGB")

    def frame(self, t):
        i = max(0, bisect.bisect_right(self.t, t) - 1)
        return self._load(i)

    def size(self):
        return self._load(0).size

    def pointer_at(self, t, fade=0.18):
        """(x, y, down, age) in frame px for a pointer press active at t (or releasing within `fade`)."""
        prev = None
        for (pt, x, y, down) in self.pointer:
            if pt > t:
                break
            prev = (pt, x, y, down)
        if not prev:
            return None
        pt, x, y, down = prev
        if not down and t - pt > fade:
            return None
        return x * self.scale, y * self.scale, down, t - pt

    def m(self, k):
        return self.marks[k]
