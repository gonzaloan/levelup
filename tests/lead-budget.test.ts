import { describe, it, expect } from "vitest";
import lessons from "@/content/data/lessons.json";

// A content guard, not a component test. The concept pane shows a ~110-word lead
// and folds the rest, which only works if no SINGLE authored paragraph is itself
// a wall — the fold can't break mid-paragraph. Measuring the corpus found 96 of
// 178 concepts with a paragraph over 100 words and one at 198, so five were split
// at sentence boundaries (tools/split-paragraph.cjs).
//
// This test fails when new content reintroduces the problem, in either language.

const LEAD_WORD_BUDGET = 110;
// The ceiling on what a reader can be shown before the fold. Above the budget
// because the first paragraph is always shown whole; well below the 198 that
// prompted the work.
const VISIBLE_CEILING = 140;

const paras = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Mirrors ConceptPane's splitLead: always ≥1 paragraph, then stop at the budget. */
function leadWords(paragraphs: string[]): number {
  let words = 0;
  let taken = 0;
  for (const p of paragraphs) {
    const n = wordCount(p);
    if (taken > 0 && words + n > LEAD_WORD_BUDGET) break;
    words += n;
    taken++;
  }
  return words;
}

type Lesson = { lessonId: string; concepts: { slug: string; explanation: { en: string; es: string } }[] };
const all = (lessons as { lessons: Lesson[] }).lessons;

describe("visible lead stays readable", () => {
  it("no concept shows more than the ceiling before the fold, in either locale", () => {
    const over: string[] = [];
    for (const lesson of all) {
      for (const c of lesson.concepts) {
        for (const loc of ["en", "es"] as const) {
          const w = leadWords(paras(c.explanation[loc]));
          if (w > VISIBLE_CEILING) over.push(`${lesson.lessonId}/${c.slug}.${loc}: ${w}w`);
        }
      }
    }
    expect(over, "split the first paragraph at a sentence boundary").toEqual([]);
  });

  it("every explanation has at least two paragraphs, so there is something to fold", () => {
    const single: string[] = [];
    for (const lesson of all) {
      for (const c of lesson.concepts) {
        for (const loc of ["en", "es"] as const) {
          if (paras(c.explanation[loc]).length < 2) single.push(`${lesson.lessonId}/${c.slug}.${loc}`);
        }
      }
    }
    expect(single).toEqual([]);
  });

  it("en and es have the same paragraph structure", () => {
    // A split applied to one language and not the other is a real defect: the
    // two locales would fold at different points and teach different shapes.
    const mismatched: string[] = [];
    for (const lesson of all) {
      for (const c of lesson.concepts) {
        const en = paras(c.explanation.en).length;
        const es = paras(c.explanation.es).length;
        if (en !== es) mismatched.push(`${lesson.lessonId}/${c.slug}: en=${en} es=${es}`);
      }
    }
    expect(mismatched).toEqual([]);
  });
});
