// The daily workout and the free drills: which reps, in what order, from which seed. Seeded by the
// local date, so everyone gets the same workout on the same day and a reload resumes it.
import { hashString, mulberry32 } from "../practice/rng";
import type { Rep, Skill } from "./types";
import { estimateRep } from "./estimate";
import { traceRep } from "./trace";
import { debugRep } from "./debug";
import { bigoRep } from "./bigo";

/** 8 reps, interleaved so no two of the same skill sit together; explain closes the set. */
export const WORKOUT: Skill[] = ["estimate", "trace", "bigo", "debug", "estimate", "trace", "bigo", "explain"];

export interface Pools {
  /** Concepts to explain, best first (studied ones). */
  concepts: string[];
  /** Coding problems for the bonus, best first (solved ones: re-solving from memory). */
  problems: string[];
}

/** One rep of a generated skill (or a pick from the pools) for a seed string. */
export function makeRep(skill: Skill, seed: string, pools: Pools): Rep {
  const r = mulberry32(hashString(seed));
  switch (skill) {
    case "estimate": return estimateRep(r, seed);
    case "trace": return traceRep(r, seed);
    case "debug": return debugRep(r, seed);
    case "bigo": return bigoRep(r, seed);
    case "explain": return { skill, seed, concept: pickFrom(pools.concepts, r) };
    case "blank": return { skill, seed, problem: pickFrom(pools.problems, r) };
  }
}

// The first few of a "best first" list, at random: variety without losing the preference.
const pickFrom = (xs: string[], r: () => number) => xs[Math.floor(r() * Math.min(xs.length, 5))] ?? xs[0];

/** Generated skills the workout can lean on; explain and blank are picked, not scored by machine. */
const ADAPTIVE: Skill[] = ["estimate", "trace", "bigo", "debug"];
/** Below this fitness, after a few reps, a skill becomes the day's focus. */
export const WEAK = 0.7;

/** The weakest generated skill worth extra reps, if any: trained ≥ 3 times and under WEAK. */
export function focusSkill(fit: Partial<Record<Skill, { ema: number; n: number }>>): Skill | undefined {
  let best: Skill | undefined;
  for (const k of ADAPTIVE) {
    const f = fit[k];
    if (f && f.n >= 3 && f.ema < WEAK && (!best || f.ema < fit[best]!.ema)) best = k;
  }
  return best;
}

/** The day's skills with one extra rep of the focus, taken from the most frequent other skill,
 *  re-interleaved (most remaining first, never the same skill twice in a row); explain still closes. */
export function workoutPlan(focus?: Skill): Skill[] {
  if (!focus || !ADAPTIVE.includes(focus)) return WORKOUT;
  const count = new Map<Skill, number>();
  for (const k of WORKOUT.slice(0, -1)) count.set(k, (count.get(k) ?? 0) + 1);
  const donor = ADAPTIVE.filter((k) => k !== focus && count.get(k)! > 1).sort((a, b) => count.get(b)! - count.get(a)!)[0];
  count.set(focus, count.get(focus)! + 1);
  count.set(donor, count.get(donor)! - 1);
  const plan: Skill[] = [];
  for (let i = 0; i < WORKOUT.length - 1; i++) {
    const next = ADAPTIVE.filter((k) => count.get(k)! > 0 && k !== plan[i - 1]).sort((a, b) => count.get(b)! - count.get(a)!)[0];
    plan.push(next); count.set(next, count.get(next)! - 1);
  }
  return [...plan, "explain"];
}

export function dailyWorkout(date: string, pools: Pools, focus?: Skill): Rep[] {
  return workoutPlan(focus).map((s, i) => makeRep(s, `day:${date}:${i}:${s}`, pools));
}
export const dailyBonus = (date: string, pools: Pools): Rep => makeRep("blank", `day:${date}:bonus`, pools);

/** The n-th rep of an endless drill of one skill; `start` makes each drill session different. */
export const drillRep = (skill: Skill, start: string, n: number, pools: Pools): Rep => makeRep(skill, `drill:${skill}:${start}:${n}`, pools);
