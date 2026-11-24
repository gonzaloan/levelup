// The interview plan: day kinds, pace, scope per role and what is prioritized when time is short.
import { describe, expect, it } from "vitest";
import { buildPlan, dayKinds, daysBetween, inScope, schedule, type PlanConcept } from "@/lib/plan";
import { pickTwo } from "@/lib/practice/mock";

const mk = (n: number, domain: string, level = "core"): PlanConcept[] => Array.from({ length: n }, (_, i) => ({ id: `${domain}-${level}-${i}`, domain, level }));
const none = () => false;

describe("dayKinds", () => {
  it("has no days when the interview is today or past", () => {
    expect(dayKinds(0)).toEqual([]);
    expect(dayKinds(-3)).toEqual([]);
  });
  it("one day left is a learning day; two keep the eve for rehearsal", () => {
    expect(dayKinds(1)).toEqual(["learn"]);
    expect(dayKinds(2)).toEqual(["learn", "eve"]);
  });
  it("reserves about a fifth of the days (2 to 7) for rehearsal, the last one being the eve", () => {
    const k = dayKinds(30);
    expect(k.filter((x) => x === "final" || x === "eve")).toHaveLength(6);
    expect(k.at(-1)).toBe("eve");
    expect(dayKinds(100).filter((x) => x === "final" || x === "eve")).toHaveLength(7);
  });
  it("makes days 6 and 7 of each week practice days once the study stretch is a week or longer", () => {
    const k = dayKinds(30);
    expect(k.slice(0, 7)).toEqual(["learn", "learn", "learn", "learn", "learn", "practice", "practice"]);
    expect(dayKinds(6).includes("practice")).toBe(false);
  });
});

describe("buildPlan", () => {
  it("spreads the work evenly in path order when it fits", () => {
    const concepts = [...mk(6, "coding"), ...mk(4, "systems", "staff")];
    const p = buildPlan({ daysLeft: 7, role: "swe", minutes: 60, concepts, studied: none });
    expect(p.fits).toBe(true);
    expect(p.learnDays).toBe(5);
    expect(p.perDay).toBe(2);
    expect(p.queue).toEqual(concepts.map((c) => c.id));
    expect(p.later).toEqual([]);
    const s = schedule(p);
    expect(s).toHaveLength(7);
    expect(s.flat()).toEqual(p.queue);
    expect(s.slice(5).flat()).toEqual([]);
  });
  it("puts essentials first, then cases, and leaves the rest out when it does not fit", () => {
    const concepts = [...mk(3, "systems", "staff"), ...mk(2, "sysdesign", "advanced"), ...mk(3, "coding", "core"), ...mk(2, "systems", "advanced")];
    const p = buildPlan({ daysLeft: 3, role: "swe", minutes: 30, concepts, studied: none });
    expect(p.capacity).toBe(1);
    expect(p.fits).toBe(false);
    expect(p.learnDays).toBe(2);
    expect(p.queue).toEqual(["coding-core-0", "coding-core-1"]);
    expect(p.later.slice(0, 3)).toEqual(["coding-core-2", "sysdesign-advanced-0", "sysdesign-advanced-1"]);
    expect(p.queue.length + p.later.length).toBe(p.remaining);
  });
  it("only counts what the role is asked about and skips what is already studied", () => {
    const concepts = [...mk(4, "coding"), ...mk(4, "rag"), ...mk(2, "leadership")];
    const swe = buildPlan({ daysLeft: 10, role: "swe", minutes: 60, concepts, studied: (id) => id === "coding-core-0" });
    expect(swe.scope).toBe(6);
    expect(swe.remaining).toBe(5);
    expect(buildPlan({ daysLeft: 10, role: "ai", minutes: 60, concepts, studied: none }).scope).toBe(6);
    expect(buildPlan({ daysLeft: 10, role: "both", minutes: 60, concepts, studied: none }).scope).toBe(10);
  });
  it("gives the design method to both roles", () => {
    expect(inScope("swe", { id: "design-framework", domain: "design", level: "core" })).toBe(true);
    expect(inScope("swe", { id: "case-support-agent", domain: "design", level: "staff" })).toBe(false);
  });
});

describe("daysBetween", () => {
  it("counts calendar days, ignoring the time of day", () => {
    expect(daysBetween(new Date(2026, 10, 23, 23, 50), new Date(2026, 10, 24, 0, 5))).toBe(1);
    expect(daysBetween(new Date(2026, 10, 23), new Date(2026, 11, 7))).toBe(14);
    expect(daysBetween(new Date(2026, 10, 23), new Date(2026, 10, 20))).toBe(-3);
  });
});

describe("pickTwo (mock coding interview)", () => {
  const P = (id: string, c: string, d: "easy" | "medium" | "hard") => ({ id, c, ct: c, d, t: id, prompt: "", fn: "f", starter: "", tests: [], compare: "exact" });
  const all = [P("a", "x", "easy"), P("b", "x", "hard"), P("c", "y", "medium"), P("d", "y", "hard"), P("e", "z", "medium")];
  it("pairs an easier problem with a harder one from another pattern", () => {
    for (let i = 0; i < 50; i++) {
      const [one, two] = pickTwo(all, {}, Math.random);
      expect(one.d).not.toBe("hard");
      expect(two.d).not.toBe("easy");
      expect(two.c).not.toBe(one.c);
    }
  });
  it("prefers problems not solved yet", () => {
    const [one, two] = pickTwo(all, { a: 1, c: 1, b: 1 }, Math.random);
    expect(one.id).toBe("e");
    expect(two.id).toBe("d");
  });
});
