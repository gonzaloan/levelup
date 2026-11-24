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

export function dailyWorkout(date: string, pools: Pools): Rep[] {
  return WORKOUT.map((s, i) => makeRep(s, `day:${date}:${i}:${s}`, pools));
}
export const dailyBonus = (date: string, pools: Pools): Rep => makeRep("blank", `day:${date}:bonus`, pools);

/** The n-th rep of an endless drill of one skill; `start` makes each drill session different. */
export const drillRep = (skill: Skill, start: string, n: number, pools: Pools): Rep => makeRep(skill, `drill:${skill}:${start}:${n}`, pools);
