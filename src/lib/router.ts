// "Barely adaptive" Multistage Testing router (NOT true CAT — we have no
// pretested item bank at launch, §3/§B). Per axis: start mid-tier, branch up
// after a correct+confident answer, down after wrong/low-confidence. Fixed
// length so the run is bounded and can't exhaust the bank.
import type { AxisId } from "./axes";
import type { Item, Response, Confidence, Difficulty } from "./types";

export const ITEMS_PER_AXIS = 7;

/** Pick the next item difficulty tier given the running responses on an axis. */
export function nextTier(responses: Response[]): Difficulty {
  if (responses.length === 0) return 0; // start mid
  const last = responses[responses.length - 1];
  if (last.correct && (last.confidence === "high" || last.confidence === "mid")) {
    return clampTier(lastTier(responses) + 1);
  }
  if (!last.correct || last.confidence === "low") {
    return clampTier(lastTier(responses) - 1);
  }
  return lastTier(responses);
}

function lastTier(responses: Response[]): Difficulty {
  return responses[responses.length - 1].difficulty;
}
function clampTier(n: number): Difficulty {
  return (n < -1 ? -1 : n > 1 ? 1 : n) as Difficulty;
}

/**
 * Select the next unseen item for an axis, preferring the target tier and
 * degrading gracefully to the nearest available tier.
 */
export function selectNextItem(
  pool: Item[],
  seen: Set<string>,
  targetTier: Difficulty
): Item | null {
  const available = pool.filter((i) => !seen.has(i.id));
  if (available.length === 0) return null;
  const byDistance = [...available].sort(
    (a, b) => Math.abs(a.difficulty - targetTier) - Math.abs(b.difficulty - targetTier)
  );
  return byDistance[0];
}

/** Build the ordered plan for one axis: which items, adapting as we go. */
export function runAxisPlan(
  pool: Item[],
  answer: (item: Item) => { optionId: string; correct: boolean; confidence: Confidence }
): Response[] {
  const responses: Response[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < ITEMS_PER_AXIS; i++) {
    const tier = nextTier(responses);
    const item = selectNextItem(pool, seen, tier);
    if (!item) break;
    seen.add(item.id);
    const a = answer(item);
    responses.push({
      itemId: item.id,
      optionId: a.optionId,
      correct: a.correct,
      confidence: a.confidence,
      axis: item.axis,
      difficulty: item.difficulty,
      ts: 0,
    });
  }
  return responses;
}

export function groupByAxis<T extends { axis: AxisId }>(xs: T[]): Map<AxisId, T[]> {
  const m = new Map<AxisId, T[]>();
  for (const x of xs) {
    const arr = m.get(x.axis) ?? [];
    arr.push(x);
    m.set(x.axis, arr);
  }
  return m;
}
