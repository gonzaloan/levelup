// Gym progress in this browser (localStorage `fg.gym.v1`): one entry per day, a moving average per
// skill (the "fitness" you see), and the run in progress so a reload resumes it.
import type { Rep, Skill } from "./types";

export const GYM_KEY = "fg.gym.v1";
export const ALPHA = 0.3;
const HIST_DAYS = 60;

export interface RepResult { skill: Skill; score: number; ms: number }
export interface DayRec { score: number; reps: number; ms: number; done: boolean; /** each rep's score, for sharing */ r?: number[] }
export interface SkillRec { ema: number; n: number; hist: { d: string; s: number; k: number }[] }
export interface GymState { v: 1; days: Record<string, DayRec>; skills: Partial<Record<Skill, SkillRec>>; run?: { date: string; reps: Rep[]; results: RepResult[] } }

export const emptyGym = (): GymState => ({ v: 1, days: {}, skills: {} });

export function loadGym(): GymState {
  try {
    const s = JSON.parse(localStorage.getItem(GYM_KEY) ?? "null");
    if (s?.v === 1 && s.days && s.skills) return s as GymState;
  } catch { /* ignore */ }
  return emptyGym();
}
export function saveGym(s: GymState) { try { localStorage.setItem(GYM_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

/** Fold one scored rep into its skill: EMA for fitness, and the day's running mean for the trend. */
export function recordRep(s: GymState, date: string, r: RepResult): GymState {
  const prev = s.skills[r.skill] ?? { ema: r.score, n: 0, hist: [] };
  const ema = prev.n === 0 ? r.score : prev.ema + ALPHA * (r.score - prev.ema);
  const hist = [...prev.hist];
  const last = hist[hist.length - 1];
  if (last?.d === date) hist[hist.length - 1] = { d: date, k: last.k + 1, s: (last.s * last.k + r.score) / (last.k + 1) };
  else hist.push({ d: date, s: r.score, k: 1 });
  return { ...s, skills: { ...s.skills, [r.skill]: { ema, n: prev.n + 1, hist: hist.slice(-HIST_DAYS) } } };
}

/** Close the day's workout: its mean score, reps and time. */
export function finishDay(s: GymState, date: string, results: RepResult[]): GymState {
  const score = results.length ? results.reduce((a, b) => a + b.score, 0) / results.length : 0;
  const r = results.map((x) => Math.round(x.score * 100) / 100);
  return { ...s, days: { ...s.days, [date]: { score, reps: results.length, ms: results.reduce((a, b) => a + b.ms, 0), done: true, r } }, run: undefined };
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const today = (now = new Date()) => dayKey(now);

/** Consecutive finished days ending today (or yesterday, if today is not done yet). */
export function gymStreak(s: GymState, now = new Date()): number {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!s.days[dayKey(d)]?.done) d.setDate(d.getDate() - 1);
  let n = 0;
  while (s.days[dayKey(d)]?.done) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** Union of two devices' gym progress (for sync): every day and skill from both, the fuller
 *  record wins on conflicts, so syncing never loses a finished day or a trained skill. */
export function mergeGym(a: GymState, b: GymState): GymState {
  const days: Record<string, DayRec> = { ...a.days };
  for (const [d, y] of Object.entries(b.days)) {
    const x = days[d];
    days[d] = !x ? y : (y.done && !x.done) || (y.done === x.done && y.reps > x.reps) ? y : x;
  }
  const skills: GymState["skills"] = { ...a.skills };
  for (const [k, y] of Object.entries(b.skills) as [Skill, SkillRec][]) {
    const x = skills[k];
    if (!x) { skills[k] = y; continue; }
    const byDay = new Map(x.hist.map((h) => [h.d, h]));
    for (const h of y.hist) { const o = byDay.get(h.d); if (!o || h.k > o.k) byDay.set(h.d, h); }
    const hist = [...byDay.values()].sort((p, q) => p.d.localeCompare(q.d)).slice(-HIST_DAYS);
    const lead = y.n > x.n ? y : x;
    skills[k] = { ema: lead.ema, n: Math.max(x.n, y.n), hist };
  }
  return { v: 1, days, skills, run: a.run };
}
