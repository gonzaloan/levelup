// Loader + grader for the novel knowledge-check mechanics (cloze/order/match/
// categorize). Authored + reviewed by the check-authoring fleet (checks.json).
// gradeCheck is a PURE boolean grader shared by both modes: formative practice
// in lessons and graded items in checkpoints. It never touches the scoring
// engine — a graded check is boolean, exactly like an MCQ.
import checksData from "@/content/data/checks.json";
import type { CheckItem } from "./types";
import { LESSONS } from "./lessons";

const DATA = checksData as unknown as { checks: CheckItem[] };

export const CHECKS: CheckItem[] = DATA.checks;
const BY_CONCEPT = new Map<string, CheckItem[]>();
for (const c of CHECKS) {
  const list = BY_CONCEPT.get(c.concept) ?? [];
  list.push(c);
  BY_CONCEPT.set(c.concept, list);
}
export const CHECK_BY_ID = new Map(CHECKS.map((c) => [c.id, c]));

export function checksForConcept(slug: string): CheckItem[] {
  return BY_CONCEPT.get(slug) ?? [];
}

/** All checks whose concept belongs to a given lesson (by the lesson's concept slugs). */
export function checksForLesson(lessonId: string): CheckItem[] {
  const lesson = LESSONS.find((l) => l.lessonId === lessonId);
  if (!lesson) return [];
  const slugs = new Set(lesson.concepts.map((c) => c.slug));
  return CHECKS.filter((c) => slugs.has(c.concept));
}

// ── Practice pool vs graded pool ─────────────────────────────────────────────
//
// THE DEFECT THIS SPLIT FIXES
// The lesson's practice stage took `checksForLesson(id).slice(0, 2)` and the
// checkpoint took `coversConcepts.flatMap(checksForConcept).slice(0, 2)`. Both
// walk the same concept order over the same array, so they landed on the same
// items: 66 of the 70 graded checkpoint checks (94%) were byte-identical to the
// two the learner had just played formatively, minutes earlier, with unlimited
// free retry AND the explanation printed. 32 of 35 checkpoints had every graded
// check pre-seen. The graded portion of the gate was a replay of a solved puzzle.
//
// A second consequence: because both selectors took only the first two, just 74
// of 368 authored checks (20%) were reachable by any learner on any surface. 294
// were authored and never served.
//
// THE SPLIT
// Per concept, checks alternate: even authored positions are practice, odd are
// held out for grading. That guarantees disjoint pools wherever a concept has 2+
// checks (which is nearly all of them), and it is a pure function of authored
// order, so it needs no state and cannot drift between the two call sites.
//
// A concept with exactly ONE check gives it to practice, not to the gate: an
// unseen graded item is the goal, but a concept whose only check is withheld
// would give the learner no formative rep at all, which is worse.
function poolFor(slug: string, want: "practice" | "graded"): CheckItem[] {
  const all = checksForConcept(slug);
  if (all.length <= 1) return want === "practice" ? all : [];
  return all.filter((_, i) => (i % 2 === 0) === (want === "practice"));
}

/**
 * Formative checks for ONE concept — the Daily Brief's surface.
 *
 * This exists because the split failed at a call site I did not audit. `TodayView`
 * served `checksForConcept(slug).slice(0, 2)` — the RAW authored array — which for
 * a concept with 2 or 3 checks always contains authored index 1, i.e. the graded
 * one. Result: 70 of 70 graded checkpoint checks were reachable at /today, and all
 * 35 checkpoints had every graded check pre-seeable. `poolFor` was correct; the
 * property it promises is global, and a private helper cannot enforce a global
 * property.
 *
 * `tests/check-integrity.test.ts` now asserts that no NON-checkpoint surface can
 * serve a graded item, enumerated by grepping the call sites rather than by naming
 * the ones I remembered.
 */
export function practiceChecksForConcept(slug: string): CheckItem[] {
  return poolFor(slug, "practice");
}

/** Formative checks for a lesson — the pool the learner may retry freely. */
export function practiceChecksForLesson(lessonId: string): CheckItem[] {
  const lesson = LESSONS.find((l) => l.lessonId === lessonId);
  if (!lesson) return [];
  return lesson.concepts.flatMap((c) => poolFor(c.slug, "practice"));
}

/**
 * Graded checks for a checkpoint — held out, so clearing the gate is evidence.
 * Never returns an item `practiceChecksForLesson` can serve for the same concept.
 */
export function gradedChecksForConcepts(slugs: readonly string[]): CheckItem[] {
  return slugs.flatMap((s) => poolFor(s, "graded"));
}

// ── Response shapes (what a player emits) ────────────────────────────────
export type ClozeResponse = number[];              // bank index chosen per blank
export type OrderResponse = number[];              // the item indices in the learner's order
export type MatchResponse = [number, number][];    // [leftIndex, rightIndex] connections made
export type CategorizeResponse = number[];         // bucket index chosen per item (item order)
export type CheckResponse = ClozeResponse | OrderResponse | MatchResponse | CategorizeResponse;

function sameNums(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Pure, all-or-nothing correctness. Used identically by formative and graded modes. */
export function gradeCheck(item: CheckItem, response: CheckResponse): boolean {
  switch (item.kind) {
    case "cloze":
      return sameNums(response as number[], item.answers);
    case "order":
      // correct order is the array order 0..n-1; response is the item indices as arranged
      return sameNums(response as number[], item.items.map((_, i) => i));
    case "match": {
      const want = new Set(item.pairs.map(([l, r]) => `${l}:${r}`));
      const got = response as [number, number][];
      return got.length === want.size && got.every(([l, r]) => want.has(`${l}:${r}`));
    }
    case "categorize":
      return sameNums(response as number[], item.items.map((it) => it.bucket));
  }
}

/** Partial score 0..1 for formative feedback ("3/4 right"). Not used for gating. */
export function partialScore(item: CheckItem, response: CheckResponse): { right: number; total: number } {
  switch (item.kind) {
    case "cloze": {
      const r = response as number[];
      return { right: item.answers.filter((a, i) => r[i] === a).length, total: item.answers.length };
    }
    case "order": {
      const r = response as number[];
      return { right: r.filter((v, i) => v === i).length, total: item.items.length };
    }
    case "match": {
      const want = new Set(item.pairs.map(([l, r]) => `${l}:${r}`));
      const got = response as [number, number][];
      return { right: got.filter(([l, r]) => want.has(`${l}:${r}`)).length, total: item.pairs.length };
    }
    case "categorize": {
      const r = response as number[];
      return { right: item.items.filter((it, i) => r[i] === it.bucket).length, total: item.items.length };
    }
  }
}
