import { describe, it, expect } from "vitest";
import { seededPermutation, shuffleOptions, seedFrom, itemKey } from "@/lib/shuffle";
import { CHECKPOINTS } from "@/lib/curriculum";
import { LESSONS } from "@/lib/lessons";

describe("seededPermutation", () => {
  it("is a true permutation of 0..n-1", () => {
    for (const n of [2, 3, 4, 5, 8]) {
      const p = seededPermutation(n, `k${n}`);
      expect([...p].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  });

  it("is deterministic for the same key", () => {
    expect(seededPermutation(5, "same")).toEqual(seededPermutation(5, "same"));
  });

  it("differs across keys", () => {
    // Not a guarantee for any single pair, but over many keys the orders must vary.
    const orders = new Set(Array.from({ length: 40 }, (_, i) => seededPermutation(4, `key-${i}`).join(",")));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("handles degenerate sizes", () => {
    expect(seededPermutation(0, "k")).toEqual([]);
    expect(seededPermutation(1, "k")).toEqual([0]);
  });

  it("seedFrom is stable and non-trivial", () => {
    expect(seedFrom("abc")).toBe(seedFrom("abc"));
    expect(seedFrom("abc")).not.toBe(seedFrom("abd"));
  });
});

describe("shuffleOptions", () => {
  const opts = ["a", "b", "c", "d"];

  it("preserves every option exactly once, with its original index", () => {
    const out = shuffleOptions(opts, "k");
    expect(out.length).toBe(4);
    expect(out.map((o) => o.option).sort()).toEqual(["a", "b", "c", "d"]);
    for (const { option, originalIndex } of out) expect(opts[originalIndex]).toBe(option);
  });

  it("is stable across repeated calls (no reshuffle on re-render)", () => {
    const a = shuffleOptions(opts, "stable").map((o) => o.originalIndex);
    const b = shuffleOptions(opts, "stable").map((o) => o.originalIndex);
    expect(a).toEqual(b);
  });
});

describe("position-bias neutralization on real content", () => {
  // The regression this guards: authored JSON puts the correct answer at index 0
  // in the overwhelming majority of items, so an un-shuffled render let a learner
  // clear every gate by always clicking the first option.
  function keyPositions(items: { stem: { en: string }; options: { correct: boolean }[] }[], scope: string) {
    return items.map((it, i) => {
      const shown = shuffleOptions(it.options, itemKey(scope, i, it.stem.en));
      return shown.findIndex((s) => (s.option as { correct: boolean }).correct);
    });
  }

  it("checkpoint keys are no longer concentrated at the first slot", () => {
    const all: number[] = [];
    for (const cp of CHECKPOINTS) all.push(...keyPositions(cp.items, cp.id));
    const atZero = all.filter((p) => p === 0).length;
    // Authored: ~97% at index 0. Shuffled: should land near 1/optionCount (~25%).
    expect(all.length).toBeGreaterThan(100);
    expect(atZero / all.length).toBeLessThan(0.45);
  });

  it("mid-lesson quiz keys are no longer concentrated at the first slot", () => {
    const all: number[] = [];
    for (const l of LESSONS) if (l.midQuiz?.length) all.push(...keyPositions(l.midQuiz, l.lessonId));
    const atZero = all.filter((p) => p === 0).length;
    expect(all.length).toBeGreaterThan(50);
    expect(atZero / all.length).toBeLessThan(0.45);
  });

  it("every checkpoint item still has exactly one correct option after shuffling", () => {
    for (const cp of CHECKPOINTS) {
      for (const [i, it] of cp.items.entries()) {
        const shown = shuffleOptions(it.options, itemKey(cp.id, i, it.stem.en));
        const n = shown.filter((s) => s.option.correct).length;
        expect(n, `${cp.id}#${i + 1}`).toBe(1);
      }
    }
  });

  it("the exam scope produces a different order than the formative scope", () => {
    const lesson = LESSONS.find((l) => (l.midQuiz?.length ?? 0) >= 2)!;
    const formative = keyPositions(lesson.midQuiz, lesson.lessonId);
    const exam = keyPositions(lesson.midQuiz, `${lesson.lessonId}:exam`);
    expect(formative).not.toEqual(exam);
  });
});
