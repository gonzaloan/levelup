import { describe, expect, it } from "vitest";
import { afterReview, afterSolve, dueProblems, nextDue, recOf, RESOLVE_DAYS } from "@/lib/practice/resolve";

const DAY = 86_400_000;
const t0 = Date.UTC(2026, 10, 26);

describe("re-solve ladder", () => {
  it("first solve comes back in 3 days; each cold re-solve widens the gap; the top step repeats", () => {
    let r = afterSolve(t0);
    expect(r).toEqual({ due: t0 + 3 * DAY, n: 0 });
    const gaps: number[] = [];
    for (let k = 0; k < RESOLVE_DAYS.length + 1; k++) { const before = r.due; r = afterReview(r, true, before); gaps.push((r.due - before) / DAY); }
    expect(gaps).toEqual([7, 16, 35, 75, 75, 75]);
  });
  it("forgetting brings it back tomorrow and restarts the ladder", () => {
    expect(afterReview({ due: t0, n: 3 }, false, t0)).toEqual({ due: t0 + DAY, n: 0 });
  });
  it("problems solved before reviews existed are due 3 days after solving", () => {
    expect(recOf("a", { a: t0 }, {})).toEqual({ due: t0 + 3 * DAY, n: 0 });
    expect(recOf("b", { a: t0 }, {})).toBeNull();
  });
  it("lists what is due now, most overdue first, and when the next one comes", () => {
    const solved = { a: t0, b: t0 - 10 * DAY, c: t0 };
    const reviews = { c: { due: t0 + 40 * DAY, n: 3 } };
    expect(dueProblems(solved, reviews, t0 - 8 * DAY)).toEqual([]);
    expect(dueProblems(solved, reviews, t0)).toEqual(["b"]);
    expect(dueProblems(solved, reviews, t0 + 3 * DAY)).toEqual(["b", "a"]);
    expect(nextDue(solved, reviews)).toBe(t0 - 7 * DAY);
    expect(nextDue({}, {})).toBeNull();
  });
});
