// gradeCheck is the boolean contract the checkpoint gate depends on, so it gets
// real teeth: correct + several wrong responses per kind, plus partial scoring.
import { describe, it, expect } from "vitest";
import { gradeCheck, partialScore } from "@/lib/checks";
import type { ClozeCheck, OrderCheck, MatchCheck, CategorizeCheck } from "@/lib/types";

const i18n = (s: string) => ({ en: s, es: s });

const cloze: ClozeCheck = {
  id: "c1", concept: "x", kind: "cloze", track: "general",
  prompt: i18n("fill"), explain: i18n("why"),
  segments: [i18n("The WAL is the "), i18n(" of truth; recovery "), i18n(" it.")],
  bank: [i18n("source"), i18n("replays"), i18n("deletes")],
  answers: [0, 1],
};
const order: OrderCheck = {
  id: "o1", concept: "x", kind: "order", track: "general",
  prompt: i18n("order"), explain: i18n("why"),
  items: [i18n("Query"), i18n("Retrieve"), i18n("Rerank"), i18n("Generate")],
};
const match: MatchCheck = {
  id: "m1", concept: "x", kind: "match", track: "general",
  prompt: i18n("match"), explain: i18n("why"),
  left: [i18n("O(log n)"), i18n("O(n^2)")], right: [i18n("binary search"), i18n("nested loop")],
  pairs: [[0, 0], [1, 1]],
};
const categorize: CategorizeCheck = {
  id: "cat1", concept: "x", kind: "categorize", track: "general",
  prompt: i18n("sort"), explain: i18n("why"),
  buckets: [i18n("Deterministic"), i18n("Needs a model")],
  items: [{ label: i18n("sum a column"), bucket: 0 }, { label: i18n("summarize a review"), bucket: 1 }],
};

describe("gradeCheck — cloze", () => {
  it("true only for the exact answer sequence", () => {
    expect(gradeCheck(cloze, [0, 1])).toBe(true);
    expect(gradeCheck(cloze, [1, 0])).toBe(false);
    expect(gradeCheck(cloze, [0, 2])).toBe(false);
    expect(gradeCheck(cloze, [0])).toBe(false);
  });
});

describe("gradeCheck — order", () => {
  it("true only when arranged in the canonical order", () => {
    expect(gradeCheck(order, [0, 1, 2, 3])).toBe(true);
    expect(gradeCheck(order, [1, 0, 2, 3])).toBe(false);
    expect(gradeCheck(order, [3, 2, 1, 0])).toBe(false);
  });
});

describe("gradeCheck — match", () => {
  it("true regardless of pair order, false on any wrong link", () => {
    expect(gradeCheck(match, [[0, 0], [1, 1]])).toBe(true);
    expect(gradeCheck(match, [[1, 1], [0, 0]])).toBe(true);
    expect(gradeCheck(match, [[0, 1], [1, 0]])).toBe(false);
    expect(gradeCheck(match, [[0, 0]])).toBe(false); // incomplete
  });
});

describe("gradeCheck — categorize", () => {
  it("true only when every item lands in its bucket", () => {
    expect(gradeCheck(categorize, [0, 1])).toBe(true);
    expect(gradeCheck(categorize, [1, 1])).toBe(false);
    expect(gradeCheck(categorize, [0, 0])).toBe(false);
  });
});

describe("partialScore", () => {
  it("counts correct slots for formative feedback", () => {
    expect(partialScore(cloze, [0, 2])).toEqual({ right: 1, total: 2 });
    expect(partialScore(order, [0, 1, 3, 2])).toEqual({ right: 2, total: 4 });
    expect(partialScore(categorize, [0, 0])).toEqual({ right: 1, total: 2 });
    expect(partialScore(match, [[0, 0], [1, 0]])).toEqual({ right: 1, total: 2 });
  });
});
