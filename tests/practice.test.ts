import { describe, expect, it } from "vitest";
import { grade, parseNumber } from "@/lib/practice/grade";
import { derange, shuffle } from "@/lib/practice/rng";
import { emptyState, merge, review, streakOf, toRating, levelOf, addActivity, dayKey, isDue } from "@/lib/practice/store";
import { buildSession, conceptStatus, interleave } from "@/lib/practice/session";
import type { PItem, PracticeData } from "@/lib/practice/types";

const mcq: PItem = { id: "x.a1", c: "x", type: "mcq", prompt: "?", options: [{ text: "a" }, { text: "b" }, { text: "c" }], answer: 0 };

describe("graders work on original indexes", () => {
  it("mcq", () => {
    expect(grade(mcq, { type: "mcq", choice: 0 }).correct).toBe(true);
    expect(grade(mcq, { type: "mcq", choice: 2 }).correct).toBe(false);
  });
  it("multi needs the exact set; extras cost credit", () => {
    const it2: PItem = { ...mcq, type: "multi", answers: [0, 2], options: [{ text: "a" }, { text: "b" }, { text: "c" }, { text: "d" }] };
    expect(grade(it2, { type: "multi", choices: [2, 0] }).correct).toBe(true);
    const partial = grade(it2, { type: "multi", choices: [0, 1] });
    expect(partial.correct).toBe(false);
    expect(partial.score).toBe(0);
    expect(grade(it2, { type: "multi", choices: [0] }).score).toBe(0.5);
  });
  it("order gives partial credit for correctly chained neighbours", () => {
    const o: PItem = { ...mcq, type: "order", steps: ["1", "2", "3", "4"] };
    expect(grade(o, { type: "order", order: [0, 1, 2, 3] }).correct).toBe(true);
    expect(grade(o, { type: "order", order: [0, 1, 3, 2] }).score).toBeCloseTo(1 / 3);
  });
  it("numeric uses relative tolerance and half credit within 2×", () => {
    const n: PItem = { ...mcq, type: "numeric", answer: 116, tolerance: 0.15 };
    expect(grade(n, { type: "numeric", value: 120 }).correct).toBe(true);
    expect(grade(n, { type: "numeric", value: 145 }).score).toBe(0.5);
    expect(grade(n, { type: "numeric", value: 1160 }).score).toBe(0);
  });
  it("diagram grades each blank", () => {
    const d: PItem = { ...mcq, type: "diagram", blanks: [{ node: "A", label: "Cache" }, { node: "B", label: "DB" }] };
    expect(grade(d, { type: "diagram", fill: { A: "Cache", B: "DB" } }).correct).toBe(true);
    expect(grade(d, { type: "diagram", fill: { A: "DB", B: "DB" } }).score).toBe(0.5);
  });
  it("parses human numbers", () => {
    expect(parseNumber("1,200")).toBe(1200);
    expect(parseNumber("1.5k")).toBe(1500);
    expect(parseNumber("3e5")).toBe(300000);
    expect(parseNumber(" 42 QPS")).toBe(42);
  });
});

describe("seeded shuffles", () => {
  it("are reproducible and vary with the seed", () => {
    expect(shuffle([1, 2, 3, 4, 5], "a")).toEqual(shuffle([1, 2, 3, 4, 5], "a"));
    expect(new Set([...Array(8)].map((_, i) => shuffle([1, 2, 3, 4, 5], `s${i}`).join())).size).toBeGreaterThan(1);
  });
  it("derange never returns the identity (the authored order is the answer)", () => {
    for (let i = 0; i < 50; i++) expect(derange(4, `k${i}`).some((v, j) => v !== j)).toBe(true);
  });
});

describe("scheduling", () => {
  it("a lucky guess counts as Hard, a confident correct answer as Easy", () => {
    expect(toRating(1, 0)).toBe(2);
    expect(toRating(1, 2)).toBe(4);
    expect(toRating(0, 2)).toBe(1);
  });
  it("Good pushes the next review further than Again", () => {
    const now = new Date("2026-11-09T10:00:00Z");
    const a = emptyState(), b = emptyState();
    review(a, "x.a1", toRating(1, 1), now);
    review(b, "x.a1", toRating(0, 1), now);
    expect(Date.parse(a.cards["x.a1"].due)).toBeGreaterThanOrEqual(Date.parse(b.cards["x.a1"].due));
    expect(isDue(b.cards["x.a1"], new Date("2026-11-10T10:00:00Z"))).toBe(true);
  });
});

describe("streak and levels", () => {
  const at = (s: string) => new Date(`${s}T12:00:00`);
  it("counts consecutive days and forgives one gap per week", () => {
    const s = emptyState();
    for (const d of ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-05", "2026-11-06"]) addActivity(s, at(d), 10, true);
    const st = streakOf(s, at("2026-11-06"));
    expect(st.days).toBe(5);
    expect(st.freezeUsed).toBe(true);
  });
  it("two missed days in a row break it", () => {
    const s = emptyState();
    for (const d of ["2026-11-01", "2026-11-02", "2026-11-05"]) addActivity(s, at(d), 10, true);
    expect(streakOf(s, at("2026-11-05")).days).toBe(1);
  });
  it("levels follow the career ladder", () => {
    expect(levelOf(0).en).toBe("Intern");
    expect(levelOf(2600).en).toBe("Staff");
  });
});

describe("merge (sync between devices)", () => {
  it("keeps the most recent review per card and the max per day", () => {
    const a = emptyState(), b = emptyState();
    review(a, "x.a1", toRating(1, 1), new Date("2026-11-01T10:00:00Z"));
    review(b, "x.a1", toRating(0, 1), new Date("2026-11-03T10:00:00Z"));
    review(b, "y.a1", toRating(1, 1), new Date("2026-11-03T10:00:00Z"));
    a.days["2026-11-01"] = { xp: 30, n: 3, ok: 3 }; b.days["2026-11-01"] = { xp: 10, n: 1, ok: 1 };
    a.read.x = 5; b.read.x = 3; b.read.y = 9;
    const m = merge(a, b);
    expect(m.cards["x.a1"].last_review).toBe(b.cards["x.a1"].last_review);
    expect(Object.keys(m.cards).sort()).toEqual(["x.a1", "y.a1"]);
    expect(m.days["2026-11-01"].xp).toBe(30);
    expect(m.read).toEqual({ x: 3, y: 9 });
  });
});

describe("sessions", () => {
  const items: PItem[] = ["a", "b", "c"].flatMap((c) => [
    { id: `${c}.def`, c, type: "mcq" as const, prompt: "", options: [{ text: "1" }, { text: "2" }, { text: "3" }], answer: 0 },
    { id: `${c}.a1`, c, type: "mcq" as const, prompt: "", options: [{ text: "1" }, { text: "2" }, { text: "3" }], answer: 0 },
    { id: `${c}.iq0`, c, type: "recall" as const, prompt: "", answer: "" },
  ]);
  const data: PracticeData = {
    meta: { a: { d: "t", t: "A", l: "core" }, b: { d: "t", t: "B", l: "core" }, c: { d: "t", t: "C", l: "core" } },
    phases: [{ id: "p", t: "P", g: "", modules: [{ id: "m", t: "M", c: ["a", "b", "c"] }] }],
    items,
  };
  const now = new Date("2026-11-09T10:00:00Z");
  it("a first daily session pretests the next concepts in the path", () => {
    const q = buildSession(data, emptyState(), { mode: "daily" }, now);
    expect(q.map((i) => i.c)).toEqual(["a", "b", "a", "b"]);
  });
  it("interleaves concepts", () => {
    expect(interleave(items.slice(0, 6)).map((i) => i.c)).toEqual(["a", "b", "a", "b", "a", "b"]);
  });
  it("concept status moves from new to learning", () => {
    const s = emptyState();
    expect(conceptStatus(data, s, "a")).toBe("new");
    review(s, "a.def", toRating(1, 1), now);
    expect(conceptStatus(data, s, "a")).toBe("learning");
  });
  it("day keys are local dates", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
