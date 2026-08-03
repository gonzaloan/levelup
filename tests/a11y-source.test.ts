// Source-level accessibility invariants.
//
// These are the rules that are cheap to state, expensive to notice by eye, and
// easy to reintroduce in a new component. Each one was a real defect found by an
// audit of the shipped code, not a hypothetical.
//
// This test reads SOURCE rather than rendering, because the project's vitest
// environment is node-only (no jsdom, by design — see CLAUDE.md). That is a real
// limitation: it can prove a glyph is present in the JSX, not that it is visible.
// The Playwright suite covers the rendered side; this covers the whole tree at
// once, which is what stops a NEW component from shipping the same defect.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name)) out.push(p);
  }
  return out;
}
const FILES = walk(SRC).map((p) => ({ path: p.replace(process.cwd(), "").replace(/\\/g, "/"), src: readFileSync(p, "utf8") }));

describe("correctness is never signalled by colour alone (WCAG 1.4.1)", () => {
  // The mastery gate shipped with a green-or-red border and nothing else: no
  // glyph, no text, no live region. `MidQuiz` had solved it already, which is
  // what made it a miss rather than an oversight.
  const GRADING_SURFACES = [
    "/src/components/CheckpointPlayer.tsx",
    "/src/components/ModuleView.tsx",
    "/src/components/lesson/MidQuiz.tsx",
  ];

  for (const surface of GRADING_SURFACES) {
    it(`${surface} pairs its --ok/--bad colours with a non-colour cue`, () => {
      const file = FILES.find((f) => f.path === surface);
      expect(file, `${surface} not found — did it move?`).toBeTruthy();
      if (!file) return;

      // It uses the correctness colours...
      expect(file.src, "expected this surface to signal correctness at all").toMatch(/var\(--(ok|bad)\)/);
      // ...so it must ALSO carry a check/cross glyph...
      const hasGlyph = /[✓✗]/.test(file.src);
      expect(hasGlyph, "no ✓/✗ glyph — correctness is colour-only").toBe(true);
      // ...and a text label a screen reader can read.
      const hasLabel = /lesson\.(correct|notQuite)/.test(file.src);
      expect(hasLabel, "no correct/notQuite text label alongside the colour").toBe(true);
    });
  }

  it("every graded reveal announces itself", () => {
    // A verdict that appears silently makes a screen-reader learner hunt for
    // what changed after each answer.
    for (const surface of GRADING_SURFACES) {
      const file = FILES.find((f) => f.path === surface);
      if (!file) continue;
      expect(/role="status"|aria-live=/.test(file.src),
        `${surface}: the reveal panel is not a live region`).toBe(true);
    }
  });
});

describe("no decorative graphic is left unnamed in the accessibility tree", () => {
  it("every inline <svg> is either hidden or named", () => {
    const offenders: string[] = [];
    for (const { path, src } of FILES) {
      // Find each <svg …> open tag and inspect its attributes plus what follows,
      // since a <title> child is a valid accessible name.
      for (const m of src.matchAll(/<svg\b([^>]*)>/g)) {
        const attrs = m[1];
        const after = src.slice(m.index! + m[0].length, m.index! + m[0].length + 400);
        const named = /aria-label=|aria-labelledby=|role="img"/.test(attrs) || /<title[\s>]/.test(after);
        const hidden = /aria-hidden=/.test(attrs);
        if (named || hidden) continue;
        // A parent may hide it, and the parent is often in a DIFFERENT component
        // — `<div className="method-glyph" aria-hidden="true"><MethodGlyph/></div>`
        // hides five SVGs defined in a helper further down the same file. A
        // 300-character look-back reported all five as unnamed; the rule, not the
        // code, was wrong.
        //
        // So: an SVG counts as hidden if it is inside a component whose every
        // call site is aria-hidden, which we approximate by asking whether the
        // enclosing function's name is only ever rendered under aria-hidden.
        const before = src.slice(Math.max(0, m.index! - 400), m.index!);
        if (/aria-hidden="true"[^>]*>\s*(?:\{[^}]*\}\s*)?$/.test(before)) continue;

        // Find the function this <svg> is declared in, then check its call sites.
        const head = src.slice(0, m.index!);
        const fnMatch = [...head.matchAll(/(?:function|const)\s+([A-Z][\w$]*)\s*[=(]/g)].pop();
        if (fnMatch) {
          const comp = fnMatch[1];
          const callSites = [...src.matchAll(new RegExp(`<${comp}\\b[^>]*/?>`, "g"))];
          const everyCallHidden = callSites.length > 0 && callSites.every((cs) => {
            const ctx = src.slice(Math.max(0, cs.index! - 200), cs.index!);
            return /aria-hidden="true"/.test(ctx);
          });
          if (everyCallHidden) continue;
        }
        const line = src.slice(0, m.index!).split("\n").length;
        offenders.push(`${path}:${line}`);
      }
    }
    expect(offenders, `unnamed, unhidden <svg>: ${offenders.join(", ")}`).toEqual([]);
  });

  it("every <img> has an alt attribute, even if empty", () => {
    // An `alt=""` is a claim ("this is decorative"); a MISSING alt makes a screen
    // reader read the filename.
    const offenders: string[] = [];
    for (const { path, src } of FILES) {
      // Two bugs to avoid, both of which this rule hit:
      //  1. `[^>]*` cannot see past a newline, and JSX wraps long tags — that
      //     reported BossIntro's `<img … alt="" …>` as missing its alt.
      //  2. Scanning raw source matches `<img>` written inside a COMMENT. The
      //     comment I added while fixing (1) mentioned the tag, so the rule then
      //     flagged its own documentation.
      // Strip comments first, then match across lines.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
        .replace(/(^|[^:])\/\/[^\n]*/g, (mm, p1) => p1 + " ".repeat(mm.length - p1.length));
      for (const m of code.matchAll(/<img\b([^<]*?)\/?>/gs)) {
        if (!/\balt=/.test(m[1])) {
          offenders.push(`${path}:${code.slice(0, m.index!).split("\n").length}`);
        }
      }
    }
    expect(offenders, `<img> with no alt: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("tap targets and motion", () => {
  it("no component sets a tap target below 44px (WCAG 2.5.8/2.5.5)", () => {
    // A reorder control once shipped at 14px. Catching literal pixel sizes in
    // inline styles is narrow but it is exactly where that one lived.
    const offenders: string[] = [];
    for (const { path, src } of FILES) {
      for (const m of src.matchAll(/\b(?:minWidth|minHeight|width|height):\s*(\d+)\b/g)) {
        const px = Number(m[1]);
        // Only flag values on something that looks interactive nearby.
        const around = src.slice(Math.max(0, m.index! - 240), m.index! + 120);
        const interactive = /<button|role="button"|onClick=/.test(around);
        if (interactive && px > 0 && px < 44 && !/viewBox|<svg|strokeWidth|\br=/.test(around)) {
          offenders.push(`${path}:${src.slice(0, m.index!).split("\n").length} (${px}px)`);
        }
      }
    }
    expect(offenders, `sub-44px interactive size: ${offenders.join(", ")}`).toEqual([]);
  });
});
