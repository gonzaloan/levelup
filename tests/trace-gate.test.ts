import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// The traceability gate, run as part of the normal test suite.
//
// It exists because three review rounds found the same defect twelve times: an
// artifact whose figures were invented rather than taken from its concept's own
// authored example — and five of those reached the OPPOSITE conclusion to what
// the example teaches, so the two halves of one pane disagreed.
//
// The first version of the gate was worse than useless: it passed 8 of those 12,
// because `a * b === v` with `a = 1` (present in 56 of 111 snippets) proved every
// number from itself. So this file asserts BOTH directions — that the corpus is
// clean, and that the gate actually catches an invented figure. A gate nobody has
// tried to break is a green check that measures nothing.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LESSONS = path.join(ROOT, "src/content/data/lessons.json");

function runGate(): { ok: boolean; out: string } {
  try {
    return { ok: true, out: execFileSync("node", ["tools/check-trace.cjs"], { cwd: ROOT, encoding: "utf8", timeout: 900_000 }) };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

describe("artifact numbers trace to their concept", () => {
  it("no NEW artifact introduces a figure its concept never mentions", () => {
    const { ok, out } = runGate();
    // The gate's own output names each offending artifact and value.
    expect(ok, out).toBe(true);
    expect(out).toContain("no new artifact introduces an untraced figure");
  });

  it("the gate actually fails when a figure is invented", () => {
    const original = readFileSync(LESSONS, "utf8");
    try {
      const data = JSON.parse(original);
      let injected = false;
      for (const lesson of data.lessons) {
        for (const c of lesson.concepts) {
          // An artifact NOT in the baseline, so the failure is attributable.
          if (c.slug === "cell-based-architecture" && c.code) {
            c.code.annotations.push({
              line: 2,
              note: { en: "This costs $847,000 a year.", es: "Esto cuesta $847,000 al año." },
            });
            injected = true;
          }
        }
      }
      expect(injected, "test fixture concept not found").toBe(true);
      writeFileSync(LESSONS, JSON.stringify(data), "utf8");
      const { ok, out } = runGate();
      expect(ok, "gate passed an invented $847,000").toBe(false);
      expect(out).toContain("cell-based-architecture");
      expect(out).toContain("847000");
    } finally {
      writeFileSync(LESSONS, original, "utf8");
    }
  });

  it("the baseline contains no stale entries", () => {
    // A listed artifact that now passes must be removed, or the list stops being
    // a true statement about the corpus and the ratchet stops ratcheting.
    const { out } = runGate();
    expect(out).not.toContain("no longer fail");
  });
});
