import { describe, it, expect } from "vitest";
import { shuffleOptions, itemKey } from "@/lib/shuffle";
import { CHECKPOINTS } from "@/lib/curriculum";
import { LESSONS } from "@/lib/lessons";
import { ITEMS, MODULES, ITEMS_BY_ID } from "@/content/registry";

/**
 * Gate integrity — the property that every scored surface must hold.
 *
 * A reviewer found that `src/components/ModuleView.tsx` had been missed when the
 * shuffle was rolled out, and that the module mastery gate was therefore beatable
 * by clicking the first option every time: 6 of 14 modules mastered outright,
 * with a perfect CBM score (the calibration penalty never fires when the picks
 * are correct). These tests assert the exploit is closed for EVERY scored bank,
 * so the next surface that forgets to shuffle fails here instead of in production.
 */

/** The strategy under test: always click the first button on screen. */
function alwaysFirstIsCorrect(options: readonly { correct: boolean }[], key: string): boolean {
  return shuffleOptions(options, key)[0]?.option.correct === true;
}

describe("scored gates resist the always-click-option-1 strategy", () => {
  it("module retrieval quizzes: no module masters (gate is 0.8 correct)", () => {
    const beaten: string[] = [];
    let checked = 0;
    for (const mod of MODULES) {
      const items = (mod.retrieval ?? []).map((id) => ITEMS_BY_ID.get(id)).filter(Boolean);
      if (items.length === 0) continue;
      checked += 1;
      const right = items.filter((it) => alwaysFirstIsCorrect(it!.options, `retrieval:${it!.id}`)).length;
      if (right / items.length >= 0.8) beaten.push(`${mod.id} (${(right / items.length).toFixed(2)})`);
    }
    expect(checked).toBeGreaterThan(0);
    expect(beaten).toEqual([]);
  });

  it("checkpoints: no checkpoint clears (gate is 'miss at most one')", () => {
    const beaten: string[] = [];
    for (const cp of CHECKPOINTS) {
      const right = cp.items.filter((it, i) =>
        alwaysFirstIsCorrect(it.options, itemKey(cp.id, i, it.stem.en))
      ).length;
      const threshold = cp.items.length <= 1 ? 1 : (cp.items.length - 1) / cp.items.length;
      if (right / cp.items.length >= threshold) beaten.push(`${cp.id} (${right}/${cp.items.length})`);
    }
    expect(beaten).toEqual([]);
  });

  it("timed exams: the strategy performs no better than chance", () => {
    // Every midQuiz is 3 items of 4 options, and the exam passes at 70% — so
    // clearing it means 3/3, which chance alone achieves ~1.6% of the time
    // (0.25³). Across 35 lessons that's ~0.6 expected, so a hard "zero" would be
    // a flaky assertion about the seed, not about integrity. What we can assert
    // is that the strategy is reduced to chance: per-item accuracy near 1/n.
    //
    // NOTE (content, not code): a 3-item quiz at a 70% gate is intrinsically
    // guessable. The shuffle removes the systematic tell; only more items would
    // remove the residual luck.
    let right = 0, total = 0;
    for (const l of LESSONS) {
      if (!l.midQuiz?.length) continue;
      for (const [i, it] of l.midQuiz.entries()) {
        total += 1;
        if (alwaysFirstIsCorrect(it.options, itemKey(`${l.lessonId}:exam`, i, it.stem.en))) right += 1;
      }
    }
    expect(total).toBeGreaterThan(50);
    const rate = right / total;
    // Authored order puts the key first ~84% of the time here; chance is ~0.25.
    expect(rate).toBeLessThan(0.4);
  });

  it("the diagnostic bank is no longer answerable by position", () => {
    // Not a pass/fail gate, but placement drives the whole roadmap: an item bank
    // where the key is always first would place everyone at the top.
    const atFirst = ITEMS.filter((it) => alwaysFirstIsCorrect(it.options, `assess:${it.id}`)).length;
    expect(atFirst / ITEMS.length).toBeLessThan(0.5);
  });
});
