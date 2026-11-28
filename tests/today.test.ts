import { describe, expect, it } from "vitest";
import { missionOf, isToday } from "@/lib/today";

const base = { learnedToday: false, hasCards: false, due: 0, reviewedToday: false, gymDone: false };

describe("today's mission", () => {
  it("a brand-new reader: learn first, review is locked, the gym is open", () => {
    const m = missionOf(base);
    expect(m.tasks.map((t) => t.state)).toEqual(["todo", "locked", "todo"]);
    expect(m.next).toBe("learn");
    expect(m.done).toBe(0);
  });
  it("cards due point to review once today's concept is learned", () => {
    const m = missionOf({ ...base, learnedToday: true, hasCards: true, due: 7 });
    expect(m.next).toBe("review");
    expect(m.done).toBe(1);
  });
  it("nothing due after reviewing today counts as done; the gym is next", () => {
    const m = missionOf({ ...base, learnedToday: true, hasCards: true, due: 0, reviewedToday: true });
    expect(m.tasks[1].state).toBe("done");
    expect(m.next).toBe("gym");
  });
  it("nothing due but nothing done today is not a free tick", () => {
    expect(missionOf({ ...base, hasCards: true, due: 0 }).tasks[1].state).toBe("todo");
  });
  it("all three done: no next task", () => {
    const m = missionOf({ learnedToday: true, hasCards: true, due: 0, reviewedToday: true, gymDone: true });
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
