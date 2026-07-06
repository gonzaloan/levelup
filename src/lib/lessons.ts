// Lesson content loader. A Lesson is one domain×level cluster (30 total),
// authored + fact-checked by the content fleet (see src/content/data/lessons.json).
// It carries the teachable layer over the spine: overview → per-concept
// explanation + schematic + key points → a mid-lesson formative quiz. The
// end-of-level checkpoint (curriculum.ts) is the summative final test.
import lessonsData from "@/content/data/lessons.json";
import type { Lesson } from "./types";
import type { Level } from "./axes";

const DATA = lessonsData as unknown as { lessons: Lesson[] };

export const LESSONS: Lesson[] = DATA.lessons;
export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.lessonId, l]));

export function lessonId(domainId: string, level: Level): string {
  return `${domainId}-${level.toLowerCase()}`;
}

export function getLesson(domainId: string, level: Level): Lesson | undefined {
  return LESSON_BY_ID.get(lessonId(domainId, level));
}
