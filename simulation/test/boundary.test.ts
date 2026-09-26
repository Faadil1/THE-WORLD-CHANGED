import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Canon: "Simulation must not depend on UI timing, DOM state, animation frame rate, or rendering."
 * Static guard over simulation/src.
 */
const SRC = join(__dirname, "..", "src");
const FORBIDDEN: Array<[RegExp, string]> = [
  [/\bdocument\b/, "DOM"],
  [/\bwindow\b/, "DOM"],
  [/requestAnimationFrame/, "frame timing"],
  [/\bperformance\./, "wall-clock timing"],
  [/Date\.now|new Date\(/, "wall-clock time"],
  [/Math\.random/, "unseeded randomness"],
  [/setTimeout|setInterval/, "UI timing"],
  [/from\s+["'][^"']*experience/, "import from rendering layer"],
  [/from\s+["']node:/, "platform-specific import"],
];

describe("simulation is independent of rendering", () => {
  for (const file of readdirSync(SRC).filter((f) => f.endsWith(".ts"))) {
    it(`${file} has no rendering/timing/randomness dependency`, () => {
      const code = readFileSync(join(SRC, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      for (const [re, why] of FORBIDDEN) {
        expect(re.test(code), `${file}: ${why} (${re})`).toBe(false);
      }
    });
  }
});
