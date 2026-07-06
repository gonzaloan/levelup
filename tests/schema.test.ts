// Validates the lesson content-as-data against the (additive) enriched schema.
// Runs in node env: pure data assertions, no React. The enriched fields are all
// optional, so this locks the CONTRACT (shape when present) without requiring
// any concept to be enriched yet.
import { describe, it, expect } from "vitest";
import lessonsData from "@/content/data/lessons.json";
import type { Lesson, ConceptLesson } from "@/lib/types";

const DATA = lessonsData as unknown as { lessons: Lesson[] };

function isI18n(x: unknown): x is { en: string; es: string } {
  return !!x && typeof x === "object" && typeof (x as { en?: unknown }).en === "string" && typeof (x as { es?: unknown }).es === "string";
}

describe("lessons.json base shape", () => {
  it("has lessons, each with an id and concepts", () => {
    expect(Array.isArray(DATA.lessons)).toBe(true);
    expect(DATA.lessons.length).toBeGreaterThan(0);
    for (const l of DATA.lessons) {
      expect(typeof l.lessonId).toBe("string");
      expect(Array.isArray(l.concepts)).toBe(true);
      expect(isI18n(l.overview)).toBe(true);
    }
  });
});

describe("enriched concept contract (when a field is present, its shape is valid)", () => {
  const concepts: ConceptLesson[] = DATA.lessons.flatMap((l) => l.concepts);

  it("every concept keeps the required base fields", () => {
    for (const c of concepts) {
      expect(typeof c.slug).toBe("string");
      expect(isI18n(c.explanation)).toBe(true);
      expect(Array.isArray(c.keyPoints)).toBe(true);
    }
  });

  it("code, when present, has string lang + snippet and well-formed annotations", () => {
    for (const c of concepts) {
      if (!c.code) continue;
      expect(typeof c.code.lang).toBe("string");
      expect(typeof c.code.snippet).toBe("string");
      expect(c.code.snippet.length).toBeGreaterThan(0);
      for (const a of c.code.annotations ?? []) {
        expect(typeof a.line).toBe("number");
        expect(isI18n(a.note)).toBe(true);
      }
    }
  });

  it("keywords/example/pitfalls/analogy/depth, when present, are i18n-shaped", () => {
    for (const c of concepts) {
      for (const k of c.keywords ?? []) {
        expect(isI18n(k.term)).toBe(true);
        expect(isI18n(k.def)).toBe(true);
      }
      if (c.example) {
        expect(isI18n(c.example.scenario)).toBe(true);
        expect(isI18n(c.example.walkthrough)).toBe(true);
      }
      for (const p of c.pitfalls ?? []) expect(isI18n(p)).toBe(true);
      if (c.analogy) expect(isI18n(c.analogy)).toBe(true);
      if (c.depth) expect(isI18n(c.depth)).toBe(true);
    }
  });

  it("visual, when present, references a widget id string", () => {
    for (const c of concepts) {
      if (!c.visual) continue;
      expect(typeof c.visual.widgetId).toBe("string");
      expect(c.visual.widgetId.length).toBeGreaterThan(0);
    }
  });
});
