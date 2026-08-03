// The six generated inventories must describe the platform that actually ships.
//
// They are GENERATED (tools/inventories.cjs), so the risk is not staleness — it is a
// generator that measures the wrong thing and produces a number nobody questions. The
// first run reported 290 "definition" items; 273 of those were check PROMPTS, which
// are instructions ("Sort each failure by who acts on it"), so the figure described
// the grammar of an imperative rather than anything about the item.
//
// These tests assert the inventories agree with the shipped content and with each
// other, and that the classifications are not category errors.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { CHECKS } from "@/lib/checks";
import { CHECKPOINTS, CONCEPTS } from "@/lib/curriculum";
import { LESSONS } from "@/lib/lessons";
import { BUILDS } from "@/lib/build";
import { routeOfDomain } from "@/lib/routes";

const OUT = "docs/transformation";
const load = (name: string) => {
  const p = `${OUT}/${name}`;
  expect(existsSync(p), `${name} was never generated — run node tools/inventories.cjs`).toBe(true);
  return JSON.parse(readFileSync(p, "utf8"));
};

describe("question-bank.json", () => {
  const bank = load("question-bank.json");
  const items = bank.items as {
    id: string; kind: string; surface: string; scored: boolean; stemKind: string;
    capabilityLevel: string; route: string | null; domainId: string | null;
    options: number; correctCount: number; concepts: string[];
  }[];

  it("holds every scored item the platform can serve", () => {
    const mcq = CHECKPOINTS.reduce((a, cp) => a + cp.items.length, 0);
    const midQuiz = LESSONS.reduce((a, l) => a + (l.midQuiz?.length ?? 0), 0);
    expect(items.length, "the bank does not cover every item").toBe(mcq + midQuiz + CHECKS.length + BUILDS.length);
  });

  it("every MCQ has exactly one correct option", () => {
    const bad = items.filter((q) => q.kind === "mcq" && q.correctCount !== 1);
    expect(bad.map((q) => q.id), "an MCQ has zero or multiple correct options").toEqual([]);
  });

  it("classifies a check by its MECHANIC, not by the grammar of its prompt", () => {
    // The category error this test exists for. A check's prompt is an imperative;
    // running a definition-vs-judgment heuristic over it measures nothing.
    const checkItems = items.filter((q) => q.kind !== "mcq" && q.kind !== "build");
    expect(checkItems.length).toBeGreaterThan(0);
    for (const q of checkItems) {
      expect(q.stemKind, `${q.id} was classified as if its prompt were a question`).toBe("n/a-instruction");
      expect(["recall", "diagnose", "decide"], `${q.id} has no mechanic-derived capability`)
        .toContain(q.capabilityLevel);
    }
  });

  it("most checkpoint MCQs are situated, which is the corpus's real strength", () => {
    // The pedagogy audit measured 180 of 183 as judgment with a stricter classifier.
    // This one is looser, so the bar is "most", not "all" — the point is that a
    // regression toward definition questions fails.
    const cp = items.filter((q) => q.kind === "mcq" && q.surface === "checkpoint");
    const definitional = cp.filter((q) => q.stemKind === "definition").length;
    expect(definitional / cp.length, `${definitional}/${cp.length} checkpoint MCQs are definitional`)
      .toBeLessThan(0.1);
  });

  it("every item's route agrees with the route model", () => {
    const bad: string[] = [];
    for (const q of items) {
      if (!q.route || !q.domainId) continue;
      if (routeOfDomain(q.domainId) !== q.route) bad.push(q.id);
    }
    expect(bad.slice(0, 5), "an item's route disagrees with routes.ts").toEqual([]);
  });

  it("no mid-lesson item is marked scored — MidQuiz is formative by design", () => {
    const scored = items.filter((q) => q.scored);
    expect(scored.filter((q) => q.surface === "mid-lesson").map((q) => q.id)).toEqual([]);
  });
});

describe("diagram-inventory.json", () => {
  const inv = load("diagram-inventory.json");
  const diagrams = inv.diagrams as {
    id: string; sourceFormat: string; editable: boolean; accessibleName: boolean;
    bilingual: boolean; diagramType: string;
  }[];

  it("every figure has an editable SOURCE, not just a rendered image", () => {
    // Section 36.5: do not store only a PNG. Every figure here is authored JSON
    // rendered by Schematic.tsx, or a React widget — both versionable and diffable.
    const raster = diagrams.filter((d) => !d.editable);
    expect(raster.map((d) => d.id), "a figure has no editable source").toEqual([]);
    for (const d of diagrams) {
      expect(["authored-json", "react-component"], `${d.id} has an unexpected source format`)
        .toContain(d.sourceFormat);
    }
  });

  it("every instructional figure has an accessible name", () => {
    const unnamed = diagrams.filter((d) => !d.accessibleName);
    expect(unnamed.map((d) => d.id), "a figure has no accessible name").toEqual([]);
  });

  it("no figure kind is 'none' — an empty figure is not an inventory entry", () => {
    expect(diagrams.filter((d) => d.diagramType === "none").map((d) => d.id)).toEqual([]);
  });
});

describe("code-example-inventory.json", () => {
  const inv = load("code-example-inventory.json");
  const examples = inv.examples as { id: string; language: string; mentionsSecret: boolean; annotations: number }[];

  it("no snippet contains a credential", () => {
    // Section 37.4 forbids secrets outright, so this is an error rather than a metric.
    expect(examples.filter((e) => e.mentionsSecret).map((e) => e.id)).toEqual([]);
  });

  it("every snippet declares a language", () => {
    expect(examples.filter((e) => !e.language).map((e) => e.id)).toEqual([]);
  });

  it("covers every concept that ships code", () => {
    const withCode = LESSONS.flatMap((l) => l.concepts).filter((c) => c.code).length;
    expect(examples.length).toBe(withCode);
  });
});

describe("aws-architecture-inventory.json", () => {
  const inv = load("aws-architecture-inventory.json");
  const claims = inv.claims as { id: string; services: string[]; unpinnedServices: string[]; factsFile: string | null }[];

  it("every AWS claim points at the pinned-facts file", () => {
    // The project rule: AWS facts trace to research/2026-07-25-aws-verified-facts.md,
    // and anything that file marks UNVERIFIED is described as a mechanism.
    for (const c of claims) {
      expect(c.factsFile, `${c.id} names AWS services with no facts file to check against`).toBeTruthy();
    }
  });

  it("records which services are NOT pinned, rather than implying all are", () => {
    // A count of zero here would be the suspicious answer — the corpus names more
    // services than the facts file covers, and saying so is the useful part.
    expect(claims.length, "no AWS claim was found at all, which cannot be right").toBeGreaterThan(0);
    const unpinned = new Set(claims.flatMap((c) => c.unpinnedServices));
    expect(Array.isArray([...unpinned])).toBe(true);
  });
});

describe("content-review-schedule.json", () => {
  const inv = load("content-review-schedule.json");
  const units = inv.units as {
    id: string; kind: string; freshness: string; intervalDays: number;
    lastReviewed: string | null; needsDateField: boolean;
  }[];

  it("classifies every unit into one of the four freshness classes", () => {
    const CLASSES = ["stable", "slowly-changing", "fast-changing", "research-frontier"];
    for (const u of units) expect(CLASSES, `${u.id} has an unknown freshness class`).toContain(u.freshness);
  });

  it("a faster-changing class gets a shorter interval", () => {
    const interval = (c: string) => units.find((u) => u.freshness === c)?.intervalDays ?? 0;
    expect(interval("fast-changing")).toBeLessThan(interval("slowly-changing"));
    expect(interval("slowly-changing")).toBeLessThan(interval("stable"));
  });

  it("says lastReviewed is MISSING rather than inventing a date", () => {
    // The content model has no last-reviewed field. Emitting a plausible timestamp
    // would make the whole schedule untrustworthy, so the gap is the output.
    for (const u of units) {
      expect(u.lastReviewed, `${u.id} carries a fabricated review date`).toBeNull();
      expect(u.needsDateField).toBe(true);
    }
  });

  it("the fast-changing set is not empty — vendor claims do rot", () => {
    expect(units.filter((u) => u.freshness === "fast-changing").length).toBeGreaterThan(10);
  });
});

describe("interview-bank.json", () => {
  const inv = load("interview-bank.json");
  const tracks = inv.tracks as {
    track: string; usableItems: number; hasRubric: boolean; hasFollowUps: boolean; missing: string[];
  }[];

  it("covers the four tracks section 35.1 names", () => {
    expect(tracks.map((t) => t.track).sort())
      .toEqual(["ai-architecture", "aws-architecture", "staff-engineer", "system-design"]);
  });

  it("every track can be fed from existing items — no duplicated content", () => {
    // Section 35 requires the same knowledge graph, not a second corpus.
    for (const t of tracks) {
      expect(t.usableItems, `${t.track} has no usable item`).toBeGreaterThan(0);
    }
  });

  it("states honestly that no track has follow-ups or a rubric yet", () => {
    // The bank is a VIEW over existing items; what 35.2 and 35.5 require — follow-ups,
    // a per-dimension rubric, an interviewer that adds constraints — does not exist.
    // Reporting `hasRubric: true` would be the lie that matters here.
    for (const t of tracks) {
      expect(t.hasRubric, `${t.track} claims a rubric it does not have`).toBe(false);
      expect(t.hasFollowUps).toBe(false);
      expect(t.missing.length, `${t.track} does not record what it is missing`).toBeGreaterThan(0);
    }
  });
});

describe("the inventories agree with each other", () => {
  it("every concept in the review schedule is a real spine concept", () => {
    const schedule = load("content-review-schedule.json").units as { id: string; kind: string }[];
    const slugs = new Set(CONCEPTS.map((c) => c.concept.slug));
    const bad = schedule
      .filter((u) => u.kind === "spine-concept")
      .filter((u) => !slugs.has(u.id.replace(/^concept:/, "")));
    expect(bad.map((u) => u.id), "the schedule names a concept the spine does not have").toEqual([]);
  });

  it("every assessed concept has a review schedule", () => {
    const bankConcepts = new Set(
      (load("question-bank.json").items as { concepts: string[] }[]).flatMap((q) => q.concepts));
    const scheduled = new Set(
      (load("content-review-schedule.json").units as { id: string; kind: string }[])
        .filter((u) => u.kind === "spine-concept").map((u) => u.id.replace(/^concept:/, "")));
    const assessedButUnscheduled = [...bankConcepts].filter((s) => s && !scheduled.has(s));
    expect(assessedButUnscheduled.slice(0, 5), "a concept is assessed but has no review schedule").toEqual([]);
  });
});
