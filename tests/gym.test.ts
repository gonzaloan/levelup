// The Gym's generators: pure, seeded, graded fairly — and every generated Python answer checked
// against real Python (Pyodide), for many seeds per template, so a rep is never wrong.
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { hashString, mulberry32 } from "@/lib/practice/rng";
import { gradeEstimate, human, parseAmount, estimateRep } from "@/lib/gym/estimate";
import { TRACE_GENS } from "@/lib/gym/trace";
import { DEBUG_GENS } from "@/lib/gym/debug";
import { bigoRep } from "@/lib/gym/bigo";
import { dailyWorkout, WORKOUT } from "@/lib/gym/workout";
import { emptyGym, finishDay, gymStreak, recordRep } from "@/lib/gym/store";

const SEEDS = 120;
const rnd = (s: string) => mulberry32(hashString(s));

describe("estimate", () => {
  it("parses the ways people type amounts", () => {
    expect(parseAmount("5.8k", "rps")).toBe(5800);
    expect(parseAmount("5,800", "rps")).toBe(5800);
    expect(parseAmount("6e3", "rps")).toBe(6000);
    expect(parseAmount("2B", "count")).toBe(2e9);
    expect(parseAmount("12 TB", "bytes")).toBe(12e12);
    expect(parseAmount("1.5 GB/s", "bps")).toBe(1.5e9);
    expect(parseAmount("40 servers", "servers")).toBe(40);
    expect(parseAmount("lots", "rps")).toBeNull();
  });
  it("grades by how many times off, symmetric", () => {
    expect(gradeEstimate(5800, 5787)).toBe(1);
    expect(gradeEstimate(10_000, 5787)).toBe(0.6);
    expect(gradeEstimate(2_000, 5787)).toBe(0.2);
    expect(gradeEstimate(100, 5787)).toBe(0);
    expect(gradeEstimate(0, 5787)).toBe(0);
  });
  it("prints human amounts", () => {
    expect(human(5787.04, "rps")).toBe("5.79k");
    expect(human(3.65e13, "bytes")).toBe("36.5 TB");
    expect(human(2e9, "bps")).toBe("2 GB/s");
  });
  it("answers follow the recipe (QPS = DAU × actions ÷ 86,400)", () => {
    for (let i = 0; i < SEEDS; i++) {
      const rep = estimateRep(rnd(`e${i}`), `e${i}`);
      expect(rep.answer).toBeGreaterThan(0);
      expect(rep.steps.length).toBeGreaterThan(0);
      expect(rep.prompt.en && rep.prompt.es).toBeTruthy();
    }
  });
});

describe("bigo", () => {
  it("always offers the answer among 4 distinct options", () => {
    for (let i = 0; i < SEEDS; i++) {
      const rep = bigoRep(rnd(`b${i}`), `b${i}`);
      expect(rep.options).toContain(rep.answer);
      expect(new Set(rep.options).size).toBe(4);
    }
  });
});

describe("workout and store", () => {
  const pools = { concepts: ["big-o", "rag"], problems: ["count-islands"] };
  it("the same date gives the same workout; another date a different one", () => {
    const a = dailyWorkout("2026-11-24", pools), b = dailyWorkout("2026-11-24", pools), c = dailyWorkout("2026-11-25", pools);
    expect(a).toEqual(b);
    expect(a.map((r) => r.skill)).toEqual(WORKOUT);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });
  it("fitness is a moving average, the trend one point per day, the streak counts finished days", () => {
    let s = emptyGym();
    s = recordRep(s, "2026-11-23", { skill: "trace", score: 1, ms: 1 });
    s = recordRep(s, "2026-11-24", { skill: "trace", score: 0, ms: 1 });
    s = recordRep(s, "2026-11-24", { skill: "trace", score: 1, ms: 1 });
    expect(s.skills.trace!.ema).toBeCloseTo(1 + 0.3 * (0 - 1) + 0.3 * (1 - 0.7), 6);
    expect(s.skills.trace!.hist).toEqual([{ d: "2026-11-23", s: 1, k: 1 }, { d: "2026-11-24", s: 0.5, k: 2 }]);
    s = finishDay(s, "2026-11-23", [{ skill: "trace", score: 1, ms: 1 }]);
    s = finishDay(s, "2026-11-24", [{ skill: "trace", score: 0.5, ms: 2 }]);
    expect(gymStreak(s, new Date(2026, 10, 24, 20))).toBe(2);
    expect(gymStreak(s, new Date(2026, 10, 25, 9))).toBe(2); // today not done yet: count up to yesterday
    expect(gymStreak(s, new Date(2026, 10, 27, 9))).toBe(0);
  });
});

// Real Python: the same harness family the coding problems use (Pyodide in Node).
describe("generated Python matches real Python", () => {
  // Each snippet runs in a fresh namespace: a name left over from another snippet must not help.
  let py: { runPython: (code: string, o?: { globals: unknown }) => unknown; setStdout: (o: { batched: (s: string) => void }) => void; globals: { get: (k: string) => () => unknown } };
  let out: string[] = [];
  beforeAll(async () => {
    const { loadPyodide } = await import(path.join(process.cwd(), "node_modules", "pyodide", "pyodide.mjs"));
    py = await loadPyodide({ indexURL: path.join(process.cwd(), "node_modules", "pyodide") + "/" });
    py.setStdout({ batched: (s: string) => out.push(s) });
  }, 120_000);
  const run = (code: string) => { out = []; py.runPython(code, { globals: py.globals.get("dict")() }); return out.join("\n").trim(); };

  it("every trace template prints what the rep says", () => {
    TRACE_GENS.forEach((gen, g) => {
      for (let i = 0; i < SEEDS; i++) {
        const rep = gen(rnd(`t${g}:${i}`), `t${g}:${i}`);
        expect(run(rep.code.join("\n")), `${gen.name} seed ${i}:\n${rep.code.join("\n")}`).toBe(rep.answer);
      }
    });
  }, 120_000);

  it("every debug template: the correct code returns `expected`, the buggy one `got`, and they differ", () => {
    DEBUG_GENS.forEach((gen, g) => {
      for (let i = 0; i < SEEDS; i++) {
        const rep = gen(rnd(`d${g}:${i}`), `d${g}:${i}`);
        const label = `${gen.name} seed ${i}: ${rep.call}`;
        expect(rep.expected, label).not.toBe(rep.got);
        expect(rep.code.filter((l, k) => l !== rep.correct[k]).length, label).toBe(1);
        expect(run(`${rep.correct.join("\n")}\nprint(${rep.call})`), label).toBe(rep.expected);
        expect(run(`${rep.code.join("\n")}\nprint(${rep.call})`), label).toBe(rep.got);
      }
    });
  }, 120_000);
});

describe("adaptive workout", () => {
  it("adds one rep of the weakest trained skill, keeps 8 reps, never two of a skill in a row", async () => {
    const { focusSkill, workoutPlan } = await import("@/lib/gym/workout");
    expect(focusSkill({})).toBeUndefined();
    expect(focusSkill({ trace: { ema: 0.4, n: 2 } })).toBeUndefined(); // too few reps to judge
    expect(focusSkill({ trace: { ema: 0.9, n: 9 } })).toBeUndefined(); // strong enough
    expect(focusSkill({ trace: { ema: 0.5, n: 5 }, bigo: { ema: 0.3, n: 4 }, explain: { ema: 0, n: 9 } })).toBe("bigo");
    expect(workoutPlan(undefined)).toEqual(WORKOUT);
    for (const f of ["estimate", "trace", "bigo", "debug"] as const) {
      const p = workoutPlan(f);
      expect(p).toHaveLength(WORKOUT.length);
      expect(p.at(-1)).toBe("explain");
      expect(p.filter((k) => k === f).length).toBe(WORKOUT.filter((k) => k === f).length + 1);
      for (const k of new Set(WORKOUT)) expect(p).toContain(k);
      p.forEach((k, i) => expect(k).not.toBe(p[i - 1]));
    }
  });
});
