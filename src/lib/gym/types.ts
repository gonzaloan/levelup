// The Gym's reps: each one asks you to produce something by hand, then shows the truth.
// Generated reps are pure data (no JSX), seeded, so the same seed is the same rep everywhere.
import type { I18n } from "../types";

export type Skill = "estimate" | "trace" | "debug" | "bigo" | "explain" | "blank";
export const SKILLS: Skill[] = ["estimate", "trace", "debug", "bigo", "explain", "blank"];

/** Units an estimate answer is typed in. `count` takes k/M/B/T; `bytes` takes KB/MB/GB/TB/PB. */
export type Unit = "count" | "rps" | "bytes" | "bps" | "servers";

export interface EstimateRep {
  skill: "estimate"; seed: string;
  prompt: I18n; unit: Unit; answer: number;
  /** The worked solution, one line per step. */
  steps: I18n[];
}
export interface TraceRep { skill: "trace"; seed: string; code: string[]; answer: string; why: I18n }
export interface DebugRep {
  skill: "debug"; seed: string;
  task: I18n; code: string[]; bugLine: number; fixed: string;
  call: string; expected: string; got: string; why: I18n;
  /** The correct full function, for the integrity check (Python). */
  correct: string[];
}
export interface BigORep { skill: "bigo"; seed: string; code: string[]; options: string[]; answer: string; why: I18n }
export interface ExplainRep { skill: "explain"; seed: string; concept: string }
export interface BlankRep { skill: "blank"; seed: string; problem: string }

export type Rep = EstimateRep | TraceRep | DebugRep | BigORep | ExplainRep | BlankRep;

/** A random source: () => [0, 1). */
export type Rand = () => number;
export const pick = <T,>(r: Rand, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
export const int = (r: Rand, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
