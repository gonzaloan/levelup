// Re-solving problems from memory, spaced out: a problem you solved comes back after 3 days, then
// 7, 16, 35 and 75 if you keep solving it cold; forgetting it brings it back tomorrow and restarts
// the ladder. Coding is a skill, not a fact: fixed, widening gaps (a Leitner ladder) are enough here,
// and they keep "when is it due" predictable for the reader. Pure, so it is unit-tested.

export const RESOLVE_DAYS = [3, 7, 16, 35, 75];
const DAY = 86_400_000;

/** n = re-solves in a row so far; due = when it comes back (ms). */
export interface ResolveRec { due: number; n: number }
export type Reviews = Record<string, ResolveRec>;

/** First time solved: back in RESOLVE_DAYS[0] days. */
export const afterSolve = (now: number): ResolveRec => ({ due: now + RESOLVE_DAYS[0] * DAY, n: 0 });

/** A re-solve attempt: solved cold climbs the ladder; forgotten comes back tomorrow from the start. */
export function afterReview(rec: ResolveRec, ok: boolean, now: number): ResolveRec {
  if (!ok) return { due: now + DAY, n: 0 };
  const n = rec.n + 1;
  return { due: now + RESOLVE_DAYS[Math.min(n, RESOLVE_DAYS.length - 1)] * DAY, n };
}

/** A problem's schedule. Problems solved before reviews existed start from their solve time. */
export const recOf = (id: string, solved: Record<string, number>, reviews: Reviews): ResolveRec | null =>
  reviews[id] ?? (solved[id] ? { due: solved[id] + RESOLVE_DAYS[0] * DAY, n: 0 } : null);

/** Solved problems due now, the most overdue first. */
export function dueProblems(solved: Record<string, number>, reviews: Reviews, now: number): string[] {
  return Object.keys(solved)
    .map((id) => [id, recOf(id, solved, reviews)!] as const)
    .filter(([, r]) => r.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id);
}

/** When the next one comes back (ms), or null when nothing is scheduled. */
export function nextDue(solved: Record<string, number>, reviews: Reviews): number | null {
  const ds = Object.keys(solved).map((id) => recOf(id, solved, reviews)!.due);
  return ds.length ? Math.min(...ds) : null;
}

/** Two devices' coding progress (for sync): every solved problem keeps its first solve; each
 *  schedule keeps the further-along record (more cold re-solves, then the later due date). */
export function mergeCode(a: { solved: Record<string, number>; reviews: Reviews }, b: { solved: Record<string, number>; reviews: Reviews }) {
  const solved = { ...a.solved };
  for (const [id, t] of Object.entries(b.solved)) solved[id] = solved[id] ? Math.min(solved[id], t) : t;
  const reviews: Reviews = { ...a.reviews };
  for (const [id, r] of Object.entries(b.reviews)) {
    const x = reviews[id];
    if (!x || r.n > x.n || (r.n === x.n && r.due > x.due)) reviews[id] = r;
  }
  return { solved, reviews };
}
