import { describe, it, expect } from "vitest";
import {
  addDays, daysBetween, firstSchedule, schedule, dueConcepts, reviewForecast,
  INTERVALS, EASE_MIN, EASE_MAX, EASE_START, type ReviewState,
} from "@/lib/review";

describe("day arithmetic", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
  });
  it("adds days across a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("is the inverse of daysBetween", () => {
    expect(daysBetween("2026-03-01", addDays("2026-03-01", 17))).toBe(17);
  });
});

describe("schedule", () => {
  it("first schedule lands on the first rung", () => {
    const s = firstSchedule("2026-07-25");
    expect(s.due).toBe(addDays("2026-07-25", INTERVALS[0]));
    expect(s.ease).toBe(EASE_START);
    expect(s.step).toBe(0);
  });

  it("good climbs the ladder with expanding intervals", () => {
    let s = firstSchedule("2026-07-25");
    let day = "2026-07-26";
    const gaps: number[] = [];
    for (let i = 0; i < 5; i++) {
      s = schedule(s, "good", day);
      gaps.push(daysBetween(day, s.due));
      day = s.due;
    }
    // strictly expanding
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
  });

  it("again resets to the bottom rung and lowers ease", () => {
    let s = firstSchedule("2026-07-25");
    s = schedule(s, "good", "2026-07-26");
    s = schedule(s, "good", "2026-07-30");
    const before = s.ease;
    s = schedule(s, "again", "2026-08-10");
    expect(s.step).toBe(0);
    expect(daysBetween("2026-08-10", s.due)).toBe(1);
    expect(s.ease).toBeLessThan(before);
    expect(s.lapses).toBe(1);
  });

  it("hard keeps the rung but shortens the interval vs good", () => {
    const base = schedule(firstSchedule("2026-07-25"), "good", "2026-07-26");
    const hard = schedule(base, "hard", "2026-07-30");
    const good = schedule(base, "good", "2026-07-30");
    expect(hard.step).toBe(base.step);
    expect(good.step).toBe(base.step + 1);
    expect(daysBetween("2026-07-30", hard.due)).toBeLessThan(daysBetween("2026-07-30", good.due));
  });

  it("clamps ease within bounds under repeated extremes", () => {
    let s = firstSchedule("2026-01-01");
    for (let i = 0; i < 40; i++) s = schedule(s, "easy", addDays("2026-01-01", i));
    expect(s.ease).toBeLessThanOrEqual(EASE_MAX);
    let h = firstSchedule("2026-01-01");
    for (let i = 0; i < 40; i++) h = schedule(h, "again", addDays("2026-01-01", i));
    expect(h.ease).toBeGreaterThanOrEqual(EASE_MIN);
  });

  it("never schedules in the past or same day", () => {
    let s = firstSchedule("2026-05-05");
    for (const g of ["good", "hard", "again", "easy", "hard", "good"] as const) {
      const day = "2026-05-10";
      s = schedule(s, g, day);
      expect(daysBetween(day, s.due)).toBeGreaterThanOrEqual(1);
    }
  });

  it("tops out at the last rung", () => {
    let s = firstSchedule("2026-01-01");
    for (let i = 0; i < 20; i++) s = schedule(s, "good", addDays("2026-01-01", i * 30));
    expect(s.step).toBe(INTERVALS.length - 1);
  });
});

describe("queue", () => {
  const R = (due: string): ReviewState => ({ due, step: 1, ease: 2, reps: 1, lapses: 0, last: "2026-07-01" });

  it("returns due and overdue, most overdue first", () => {
    const out = dueConcepts({ a: R("2026-07-25"), b: R("2026-07-20"), c: R("2026-08-01") }, "2026-07-25");
    expect(out).toEqual(["b", "a"]);
  });

  it("forecast counts overdue into today only", () => {
    const f = reviewForecast({ a: R("2026-07-20"), b: R("2026-07-27") }, "2026-07-25", 3);
    expect(f[0]).toEqual({ day: "2026-07-25", count: 1 });
    expect(f[2]).toEqual({ day: "2026-07-27", count: 1 });
  });
});
