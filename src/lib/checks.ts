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
