// The learner's study state: FSRS cards, daily activity, read concepts. Local-first (localStorage),
// shaped so two devices can be merged without losing work (see `merge`). Pure functions except
// load/save, which guard every storage access.
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from "ts-fsrs";
import type { Confidence } from "./types";

export const STUDY_KEY = "fg.study.v1";
export const STUDY_EVENT = "fg-study";

export interface CardRec {
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
  state: number;
  last_review?: string;
}
export interface DayRec { xp: number; n: number; ok: number }
export interface StudyState {
  v: 1;
  cards: Record<string, CardRec>;
  days: Record<string, DayRec>; // local yyyy-mm-dd
  read: Record<string, number>; // concept id → first read (ms)
  goal: number; // daily XP goal
  updatedAt: number;
}

export const emptyState = (): StudyState => ({ v: 1, cards: {}, days: {}, read: {}, goal: 60, updatedAt: 0 });

const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: false, maximum_interval: 365 }));

/* ------------------------------------------------------------------ storage */
export function loadState(): StudyState {
  try {
    const raw = localStorage.getItem(STUDY_KEY);
    if (raw) {
      const s = JSON.parse(raw) as StudyState;
      if (s && s.v === 1) return { ...emptyState(), ...s };
    }
    // One-time import of the old "mastered" toggles as read concepts.
    const old = localStorage.getItem("fg.mastered.v1");
    if (old) {
      const s = emptyState();
      for (const id of Object.keys(JSON.parse(old) ?? {})) s.read[id] = Date.now();
      return s;
    }
  } catch { /* private mode / corrupt → start fresh */ }
  return emptyState();
}

/** `fromSync` marks a save made by the sync itself, so the sync agent doesn't push it back (loop). */
export function saveState(s: StudyState, opts?: { silent?: boolean }) {
  s.updatedAt = Date.now();
  try { localStorage.setItem(STUDY_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(STUDY_EVENT, { detail: { fromSync: !!opts?.silent } })); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ dates */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/* ------------------------------------------------------------------ FSRS */
const toCard = (r: CardRec): Card => ({ ...r, due: new Date(r.due), last_review: r.last_review ? new Date(r.last_review) : undefined } as Card);
const fromCard = (c: Card): CardRec => ({
  due: c.due.toISOString(), stability: c.stability, difficulty: c.difficulty, scheduled_days: c.scheduled_days,
  reps: c.reps, lapses: c.lapses, learning_steps: c.learning_steps, state: c.state,
  last_review: c.last_review ? new Date(c.last_review).toISOString() : undefined,
});

/** Map an outcome to an FSRS grade. Confidence makes a lucky guess count as "Hard", not "Good". */
export function toRating(score: number, confidence: Confidence): Grade {
  if (score < 0.5) return Rating.Again;
  if (score < 1) return Rating.Hard;
  if (confidence === 0) return Rating.Hard;
  return confidence === 2 ? Rating.Easy : Rating.Good;
}

export function review(s: StudyState, itemId: string, rating: Grade, now: Date): CardRec {
  const prev = s.cards[itemId] ? toCard(s.cards[itemId]) : createEmptyCard(now);
  const next = fromCard(scheduler.next(prev, now, rating).card);
  s.cards[itemId] = next;
  return next;
}

export function retrievability(r: CardRec, now: Date): number {
  if (r.state === State.New) return 0;
  return scheduler.retrievability(toCard(r), now);
}

export const isDue = (r: CardRec | undefined, now: Date) => !!r && new Date(r.due).getTime() <= now.getTime();

/* ------------------------------------------------------------------ XP, levels, streak */
export function xpFor(score: number, confidence: Confidence, isRecall: boolean): number {
  if (isRecall) return [0, 2, 6, 10, 12][Math.round(score * 3) + 1] ?? 4;
  if (score >= 1) return confidence === 2 ? 15 : 10;
  return score >= 0.5 ? 5 : 2; // effort still counts
}

export function addActivity(s: StudyState, now: Date, xp: number, ok: boolean) {
  const k = dayKey(now);
  const d = s.days[k] ?? { xp: 0, n: 0, ok: 0 };
  s.days[k] = { xp: d.xp + xp, n: d.n + 1, ok: d.ok + (ok ? 1 : 0) };
}

export const totalXp = (s: StudyState) => Object.values(s.days).reduce((n, d) => n + d.xp, 0);

/** Career-ladder levels: you level up the way you'd like to in real life. */
export const LEVELS = [
  { xp: 0, en: "Intern", es: "Practicante" },
  { xp: 150, en: "Junior", es: "Junior" },
  { xp: 500, en: "Mid-level", es: "Semi senior" },
  { xp: 1200, en: "Senior", es: "Senior" },
  { xp: 2500, en: "Staff", es: "Staff" },
  { xp: 4500, en: "Senior Staff", es: "Senior Staff" },
  { xp: 7500, en: "Principal", es: "Principal" },
  { xp: 12000, en: "Distinguished", es: "Distinguished" },
  { xp: 18000, en: "Fellow", es: "Fellow" },
];
export function levelOf(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i], next = LEVELS[i + 1];
  return { index: i, ...cur, next, progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}

/**
 * Consecutive active days ending today (or yesterday, if today isn't done yet). One missed day per
 * rolling week is forgiven automatically: a streak that punishes a single bad day teaches people to
 * quit, not to study.
 */
export function streakOf(s: StudyState, now: Date): { days: number; activeToday: boolean; freezeUsed: boolean } {
  const active = (d: Date) => (s.days[dayKey(d)]?.xp ?? 0) > 0;
  const activeToday = active(now);
  let cursor = activeToday ? now : addDays(now, -1);
  let days = 0, lastFreeze = -Infinity, freezeUsed = false;
  for (let i = 0; i < 3650; i++) {
    if (active(cursor)) days++;
    else if (days > 0 && i - lastFreeze >= 7 && active(addDays(cursor, -1))) { lastFreeze = i; freezeUsed = true; }
    else break;
    cursor = addDays(cursor, -1);
  }
  return { days, activeToday, freezeUsed };
}

/* ------------------------------------------------------------------ sync merge */
/** Union of two states (e.g. this device + the server): nothing studied on either side is lost. */
export function merge(a: StudyState, b: StudyState): StudyState {
  const out = emptyState();
  const later = (x?: CardRec, y?: CardRec) => {
    if (!x) return y!; if (!y) return x;
    const tx = x.last_review ? Date.parse(x.last_review) : 0, ty = y.last_review ? Date.parse(y.last_review) : 0;
    return ty > tx || (ty === tx && y.reps > x.reps) ? y : x;
  };
  for (const k of new Set([...Object.keys(a.cards), ...Object.keys(b.cards)])) out.cards[k] = later(a.cards[k], b.cards[k]);
  for (const k of new Set([...Object.keys(a.days), ...Object.keys(b.days)])) {
    const x = a.days[k], y = b.days[k];
    out.days[k] = !x ? y : !y ? x : { xp: Math.max(x.xp, y.xp), n: Math.max(x.n, y.n), ok: Math.max(x.ok, y.ok) };
  }
  for (const k of new Set([...Object.keys(a.read), ...Object.keys(b.read)])) {
    out.read[k] = Math.min(a.read[k] ?? Infinity, b.read[k] ?? Infinity);
  }
  out.goal = (b.updatedAt > a.updatedAt ? b : a).goal;
  out.updatedAt = Math.max(a.updatedAt, b.updatedAt);
  return out;
}
