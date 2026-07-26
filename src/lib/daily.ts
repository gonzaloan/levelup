// The Daily Brief — one deterministic, prerequisite-respecting challenge per day.
//
// The engagement problem this solves: a 152-concept curriculum invites either
// bingeing one domain (blocked practice, poor transfer) or paralysis ("which of
// 152?"). A daily brief removes the choice and enforces the two things the
// learning-science literature actually agrees on:
//   • INTERLEAVING — consecutive days rotate DOMAIN, so you never grind one axis
//     (Rohrer & Taylor 2007: interleaved practice hurts same-session performance
//     and helps retention, which is exactly the trade a career-length curriculum
//     should take).
//   • SPACED RETRIEVAL — anything already learned re-enters the brief when its
//     review falls due (see review.ts), instead of being seen once and lost.
//
// Design constraints, all deliberate:
//   • DETERMINISTIC per (day, learner-state). No Math.random / no Date inside —
//     the day key is passed in. Two devices on the same day with the same
//     progress get the same brief, which is what makes the shared result
//     comparable ("everyone got the same problem today", the Wordle property).
//   • RESPECTS THE DAG. A concept is only eligible when its within-domain
//     prerequisites are already read, and its level band is unlocked by the
//     Climb. The brief never hands an L3 learner an L7 concept.
//   • NO LOSS AVERSION. Missing a day loses nothing but the streak count; there
//     is no decay, no expiry, no lost progress. Self-determination-theory-safe:
//     the reward is informational (you learned a thing), never coercive.
import { CONCEPTS, ORDERED_DOMAINS, type ConceptCtx } from "./curriculum";
import { LEVELS, type Level } from "./axes";
import { dueConcepts, type ReviewState } from "./review";

/** A single day's assignment. Everything the /today view needs. */
export interface DailyBrief {
  /** Day key, YYYY-MM-DD. */
  day: string;
  /** The day's new concept to learn. Undefined only if the whole curriculum is read. */
  fresh?: ConceptCtx;
  /** Up to REVIEW_CAP concepts whose spaced review fell due. */
  reviews: ConceptCtx[];
  /** Which domain the fresh concept came from (for the rotation UI). */
  domainId?: string;
  /** True when every eligible concept has been read — the "you're current" state. */
  curriculumComplete: boolean;
}

/**
 * At most this many reviews per brief. A brief must stay finishable in one
 * sitting (~10-15 min) or the habit dies; overdue items simply wait a day
 * rather than piling into an unclearable backlog (the Anki failure mode).
 */
export const REVIEW_CAP = 3;

export interface DailyInput {
  day: string;                            // YYYY-MM-DD
  conceptsRead: string[];
  reviews: Record<string, ReviewState>;
  /** Highest level band the learner has unlocked via the Climb (inclusive). */
  unlockedThrough: Level;
  /** Concept slugs to never serve as fresh (e.g. skipped). */
  excluded?: string[];
}

/**
 * A stable, seeded hash of a string → uint32. FNV-1a. Used to break ties
 * deterministically so the brief is stable per day but not visibly ordered.
 */
export function hashKey(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Days since the 1970 epoch for a day key — the rotation counter. */
export function dayIndex(dayKey: string): number {
  return Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86_400_000);
}

const levelIndex = (l: Level) => LEVELS.indexOf(l);

/**
 * Is this concept servable today? Requires (a) not already read, (b) its band
 * unlocked, (c) every within-domain prerequisite already read.
 */
function isEligible(c: ConceptCtx, read: Set<string>, unlockedThrough: Level): boolean {
  if (read.has(c.concept.slug)) return false;
  if (levelIndex(c.level) > levelIndex(unlockedThrough)) return false;
  return c.concept.prerequisites.every((p) => read.has(p));
}

/**
 * Choose the day's FRESH concept.
 *
 * Rotation: `dayIndex % domainCount` picks the day's preferred domain, so a week
 * walks across the six axes instead of drilling one. If that domain has nothing
 * eligible (all read, or gated behind unread prerequisites), we walk the
 * remaining domains in rotation order — the learner always gets a brief.
 *
 * Within the chosen domain we prefer the LOWEST unlocked level band (finish the
 * foundation before climbing), then break ties with a day-seeded hash so the
 * pick is stable for the day yet not always the alphabetically-first concept.
 */
export function pickFresh(input: DailyInput): ConceptCtx | undefined {
  const read = new Set(input.conceptsRead);
  const excluded = new Set(input.excluded ?? []);
  const eligible = CONCEPTS.filter(
    (c) => !excluded.has(c.concept.slug) && isEligible(c, read, input.unlockedThrough)
  );
  if (eligible.length === 0) return undefined;

  const order = ORDERED_DOMAINS.map((d) => d.id);
  const start = dayIndex(input.day) % order.length;

  for (let i = 0; i < order.length; i++) {
    const domainId = order[(start + i) % order.length];
    const pool = eligible.filter((c) => c.domainId === domainId);
    if (pool.length === 0) continue;
    const minLevel = Math.min(...pool.map((c) => levelIndex(c.level)));
    const band = pool.filter((c) => levelIndex(c.level) === minLevel);
    return band
      .slice()
      .sort(
        (a, b) =>
          hashKey(input.day + a.concept.slug) - hashKey(input.day + b.concept.slug) ||
          a.concept.slug.localeCompare(b.concept.slug)
      )[0];
  }
  return undefined;
}

/** Build today's complete brief. Pure function of (day, progress). */
export function buildDaily(input: DailyInput): DailyBrief {
  const bySlug = new Map(CONCEPTS.map((c) => [c.concept.slug, c]));
  const reviews = dueConcepts(input.reviews, input.day)
    .map((slug) => bySlug.get(slug))
    .filter((c): c is ConceptCtx => !!c)
    .slice(0, REVIEW_CAP);

  const fresh = pickFresh(input);
  return {
    day: input.day,
    fresh,
    reviews,
    domainId: fresh?.domainId,
    curriculumComplete: !fresh,
  };
}

// ── Streak ────────────────────────────────────────────────────────────────
// Forgiving by design. The literature on streaks is clear that loss aversion
// drives short-term engagement and long-term churn + guilt, so:
//   • The streak counts days you completed a brief. A SINGLE missed day never
//     breaks it — a rest day is normal, not a failure. No purchase, no currency.
//   • TWO CONSECUTIVE missed days end the run. Nothing else is lost.
//   • We also surface "days learned this month", a non-fragile metric that keeps
//     rising even when the streak breaks — so the honest headline number never
//     goes to zero because of a vacation.
//
// WHY NOT a per-week cap on skips. Three attempts at "one free skip a week" all
// produced a metric that is NON-MONOTONE in its own input — adding an earlier
// completed day could LOWER the reported streak, because the extra day let an
// early gap consume an allowance that a later gap then needed. All three anchored
// the allowance to a TIME WINDOW (a per-run span, a span measured to the end of
// the data, a rolling 7 days), and that is the property that breaks: a window's
// contents change when history is added, so a verdict about one gap depends on
// gaps the learner cannot see.
//
// To be precise, since this comment will outlive the decision: a cap is not
// inherently non-monotone. A per-run TOTAL budget consumed by a backwards walk
// from each candidate day is monotone, and would let us keep a cap. It was not
// chosen because a cap buys nothing a learner wants here — the number it would
// hold down (`current`) sits beside `total`, which is exact and unmissable, so a
// generous run does not overstate anything. We took the rule that can be stated
// in one sentence with no asterisk: any single missed day is forgiven, two in a
// row is not. An every-other-day learner does keep a long run, and that is
// honest — they ARE practising every other day.
export interface StreakState {
  /** Every day key on which a brief was completed, ascending, deduped. */
  days: string[];
}

export interface StreakSummary {
  current: number;      // consecutive-with-one-grace-per-week run ending recently
  longest: number;
  total: number;        // total days completed, ever (never decreases)
  thisMonth: number;
  /** True if today's brief is already done. */
  doneToday: boolean;
  /**
   * True only when a grace day is CURRENTLY holding the run — i.e. the most
   * recent gap is the one being forgiven. It is not sticky: a single skip at the
   * start of a 32-day run must not still claim "a rest day is holding your run"
   * a month later, because that statement would be false.
   */
  usedGrace: boolean;
}


const dayDiff = (a: string, b: string) => dayIndex(b) - dayIndex(a);

/**
 * Compute the streak. Walks the completed days backwards from the most recent,
 * allowing a single one-day gap ("grace") in the run. A two-day gap ends it.
 */
export function streakSummary(state: StreakState, today: string): StreakSummary {
  // Drop anything dated after `today`: a clock skewed forward, or a history merged
  // from a device in another timezone, would otherwise start a new run in the
  // future and reset `current` to 1.
  const days = [...new Set(state.days)].filter((d) => d <= today).sort();
  const total = days.length;
  const month = today.slice(0, 7);
  const thisMonth = days.filter((d) => d.startsWith(month)).length;
  const doneToday = days.includes(today);

  if (total === 0) {
    return { current: 0, longest: 0, total: 0, thisMonth: 0, doneToday: false, usedGrace: false };
  }

  // ONE forward pass segments the history into runs; `current` and `longest` are
  // then both read off the same segmentation.
  //
  // The first version walked forward for `longest` and backward for `current`,
  // each measuring the grace budget over a different span — so the backward walk
  // was systematically more permissive and could report a current run LONGER than
  // the longest run ever (e.g. days 4,6,8,9 → current 3, longest 2). Two numbers
  // shown side by side in the UI, one of them impossible. A single pass makes
  // `current <= longest` true by construction rather than by care.
  const runs = segmentRuns(days);
  const longest = Math.max(...runs.map((r) => r.length));

  // The last run is "current" only if it reaches today, yesterday, or two days
  // ago with a grace day still unspent in ITS budget.
  const lastRun = runs[runs.length - 1];
  const sinceLast = dayDiff(lastRun.end, today);
  // Same rule as the segmentation: one missed day is forgiven, two in a row is not.
  if (sinceLast > 2) {
    return { current: 0, longest, total, thisMonth, doneToday, usedGrace: false };
  }
  // usedGrace describes the CURRENT state, not the run's history: it is true only
  // when the run is alive on a forgiven gap right now (yesterday was missed).
  return { current: lastRun.length, longest, total, thisMonth, doneToday, usedGrace: sinceLast === 2 };
}

/** `graceSpent` is informational: how many single-day misses this run absorbed. */
interface Run { end: string; length: number; graceSpent: number; }

/**
 * Split the completed days into runs. A 1-day gap (practised on consecutive days)
 * and a 2-day gap (one day missed) both continue a run; a gap of 3+ breaks it.
 *
 * Each gap is judged ONLY on its own size, which is what makes the result monotone:
 * adding or trimming history elsewhere can never change a verdict here, so the
 * streak can never punish a learner for having practised more. See the note above
 * on why every capped-forgiveness variant failed that property.
 */
function segmentRuns(days: string[]): Run[] {
  const runs: Run[] = [{ end: days[0], length: 1, graceSpent: 0 }];
  for (let i = 1; i < days.length; i++) {
    const run = runs[runs.length - 1];
    const gap = dayDiff(days[i - 1], days[i]);
    if (gap <= 2) {
      run.end = days[i];
      run.length += 1;
      if (gap === 2) run.graceSpent += 1;
    } else {
      runs.push({ end: days[i], length: 1, graceSpent: 0 });
    }
  }
  return runs;
}


/** Record today's completion (idempotent, sorted). */
export function markDay(state: StreakState, day: string): StreakState {
  if (state.days.includes(day)) return state;
  return { days: [...state.days, day].sort() };
}
