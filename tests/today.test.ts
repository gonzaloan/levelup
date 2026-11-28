import { describe, expect, it } from "vitest";
import { missionOf, isToday, REVIEW_SESSION } from "@/lib/today";

const base = { learnedToday: false, canReview: false, due: 0, reviewedToday: 0, gymDone: false };

describe("today's mission", () => {
  it("a brand-new reader: learn first, review is locked, the gym is open", () => {
    const m = missionOf(base);
    expect(m.tasks.map((t) => t.state)).toEqual(["todo", "locked", "todo"]);
    expect(m.next).toBe("learn");
    expect(m.done).toBe(0);
  });
  it("cards due point to review once today's concept is learned", () => {
    const m = missionOf({ ...base, learnedToday: true, canReview: true, due: 7 });
    expect(m.next).toBe("review");
    expect(m.done).toBe(1);
  });
  it("nothing due after reviewing today counts as done; the gym is next", () => {
    const m = missionOf({ ...base, learnedToday: true, canReview: true, due: 0, reviewedToday: 3 });
    expect(m.tasks[1].state).toBe("done");
    expect(m.next).toBe("gym");
  });
  it("nothing due but nothing done today is not a free tick", () => {
    expect(missionOf({ ...base, canReview: true, due: 0 }).tasks[1].state).toBe("todo");
  });
  it("one full session counts even when more cards are still due", () => {
    expect(missionOf({ ...base, canReview: true, due: 80, reviewedToday: REVIEW_SESSION - 1 }).tasks[1].state).toBe("todo");
    expect(missionOf({ ...base, canReview: true, due: 80, reviewedToday: REVIEW_SESSION }).tasks[1].state).toBe("done");
  });
  it("learning the first concept unlocks review the same day", () => {
    const m = missionOf({ ...base, learnedToday: true, canReview: true });
    expect(m.tasks[1].state).toBe("todo");
    expect(m.next).toBe("review");
  });
  it("all three done: no next task", () => {
    const m = missionOf({ learnedToday: true, canReview: true, due: 0, reviewedToday: 3, gymDone: true });
    expect(m.next).toBeNull();
    expect(m.done).toBe(3);
  });
  it("isToday compares local calendar days", () => {
    const now = new Date(2026, 10, 28, 9);
    expect(isToday(new Date(2026, 10, 28, 0, 5).getTime(), now)).toBe(true);
    expect(isToday(new Date(2026, 10, 27, 23, 55).toISOString(), now)).toBe(false);
    expect(isToday(undefined, now)).toBe(false);
  });
});
