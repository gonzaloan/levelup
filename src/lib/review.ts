// Spaced review for JUDGMENT, not flashcards.
//
// Why a custom scheduler instead of shipping SM-2 or FSRS verbatim: those are
// tuned for atomic recall items (a word, a date) reviewed in seconds, where the
// grade is "did the fact surface". Here a "review" is a scenario or a
// constructive check about a tradeoff — expensive (1-3 min), and forgetting is
// not binary: you keep the vocabulary and lose the judgment. So we borrow the
// two mechanics that transfer (expanding intervals; difficulty as a per-item
// multiplier learned from your own history) and drop the rest (per-second
// timing, sub-day intervals, retrievability curves fitted to millions of cards
// we don't have).
//
// The schedule is a LADDER of authored intervals rather than a fitted formula:
// its behaviour is legible ("you'll see this again in 3 days"), it is trivially
// testable, and the ease multiplier still personalizes it. Base ladder is
// deliberately longer than a flashcard ladder — judgment decays slower than
// vocabulary, and a senior engineer re-reading the same tradeoff every day is
// exactly the monotony that kills the habit.
//
// PURE module: no Date, no randomness. The caller passes today's day key.

/** Learner's self/auto-assessed outcome for one review. */
export type Grade = "again" | "hard" | "good" | "easy";

export interface ReviewState {
  /** Day key (YYYY-MM-DD) this concept is next due. */
  due: string;
  /** Index into INTERVALS reached so far (the rung of the ladder). */
  step: number;
  /** Per-concept difficulty multiplier, 1.3 (hard for you) … 2.8 (easy). */
  ease: number;
  /** Total reviews recorded. */
  reps: number;
  /** Times you graded `again` after having graded it `good`+ before. */
  lapses: number;
  /** Day key of the last review (for display / audit). */
  last: string;
}

/**
 * The interval ladder in DAYS. Each rung is roughly 2.2× the previous — the
 * expanding-retrieval shape (Landauer & Bjork 1978) — starting at 1 day and
 * topping out near a semester, which is where "I still hold this judgment"
 * stops being a memory question and becomes a practice question.
 */
export const INTERVALS = [1, 3, 7, 16, 35, 75, 150] as const;

export const EASE_MIN = 1.3;
export const EASE_MAX = 2.8;
export const EASE_START = 2.0;

const clampEase = (e: number) => Math.min(EASE_MAX, Math.max(EASE_MIN, e));

/** Days between two day keys (b - a). Both must be YYYY-MM-DD. */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Add `days` to a day key, returning a day key. Pure (UTC arithmetic only). */
export function addDays(dayKey: string, days: number): string {
  const ms = Date.parse(`${dayKey}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** First-ever scheduling of a concept, at the moment it is learned. */
export function firstSchedule(today: string): ReviewState {
  return {
    due: addDays(today, INTERVALS[0]),
    step: 0,
    ease: EASE_START,
    reps: 0,
    lapses: 0,
    last: today,
  };
}

/**
 * Advance (or reset) a concept's schedule from a graded review.
 *
 * - `again` drops you to the bottom rung and lowers ease — you'll see it
 *   tomorrow. It is NOT a punishment mechanic: nothing else in the app changes.
 * - `hard` repeats the current rung with a shortened interval.
 * - `good` climbs one rung, scaled by ease.
 * - `easy` climbs one rung and raises ease, so this concept drifts out of your
 *   rotation faster and stops crowding out things you actually need.
 */
export function schedule(prev: ReviewState | undefined, grade: Grade, today: string): ReviewState {
  const s: ReviewState = prev ?? { ...firstSchedule(today), due: today };
  const lastRung = INTERVALS.length - 1;

  if (grade === "again") {
    return {
      due: addDays(today, 1),
      step: 0,
      ease: clampEase(s.ease - 0.2),
      reps: s.reps + 1,
      lapses: s.step > 0 ? s.lapses + 1 : s.lapses,
      last: today,
    };
  }

  const easeDelta = grade === "easy" ? 0.15 : grade === "hard" ? -0.15 : 0;
  const ease = clampEase(s.ease + easeDelta);
  const step = grade === "hard" ? s.step : Math.min(lastRung, s.step + 1);
  // `hard` keeps the rung but shortens it; the ladder value is the base.
  const factor = grade === "hard" ? 0.6 : grade === "easy" ? 1.3 : 1;
  const days = Math.max(1, Math.round(INTERVALS[step] * (ease / EASE_START) * factor));

  return { due: addDays(today, days), step, ease, reps: s.reps + 1, lapses: s.lapses, last: today };
}

/** Concept slugs due on or before `today`, most overdue first (stable). */
export function dueConcepts(reviews: Record<string, ReviewState>, today: string): string[] {
  return Object.entries(reviews)
    .filter(([, r]) => r.due <= today)
    .sort((a, b) => (a[1].due === b[1].due ? a[0].localeCompare(b[0]) : a[1].due.localeCompare(b[1].due)))
    .map(([slug]) => slug);
}

/** How the review queue looks over the next `horizon` days — for the /today UI. */
export function reviewForecast(
  reviews: Record<string, ReviewState>,
  today: string,
  horizon = 7
): { day: string; count: number }[] {
  const out: { day: string; count: number }[] = [];
  for (let i = 0; i < horizon; i++) {
    const day = addDays(today, i);
    const count = Object.values(reviews).filter((r) => (i === 0 ? r.due <= day : r.due === day)).length;
    out.push({ day, count });
  }
  return out;
}
