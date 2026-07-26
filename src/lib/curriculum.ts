// The curriculum spine: the ordered L3→L7 plan to learn everything.
//
// Structure (grounded in the research fleet's learning-science synthesis —
// Gagné learning hierarchies, Bruner spiral, Bloom mastery, Rohrer interleaving,
// Roediger & Karpicke retrieval practice):
//   • Each domain is a within-domain prerequisite DAG of concepts.
//   • The five ladder levels (L3→L7) are spiral depth bands across every domain.
//   • Concepts chunk into per-(domain × level) clusters (~4-6, Miller/Cowan chunk).
//   • Each cluster ends in a CHECKPOINT quiz gated at mastery before advancing.
//   • The recommended PATH interleaves by level band — you build the L3 foundations
//     across all domains (then their checkpoints) before climbing to L4, and so on.
//     Interleaving > blocking for durable transfer (Rohrer & Taylor 2007).
import curriculumData from "@/content/data/curriculum.json";
import { LEVELS, type AxisId, type Level } from "./axes";
import type {
  Curriculum, CurriculumDomain, Checkpoint, Concept, PathStep,
} from "./types";

const DATA = curriculumData as unknown as Curriculum;

export const DOMAINS: CurriculumDomain[] = DATA.domains;
export const CHECKPOINTS: Checkpoint[] = DATA.checkpoints;

export const DOMAIN_BY_ID = new Map(DOMAINS.map((d) => [d.id, d]));
export const CHECKPOINT_BY_ID = new Map(CHECKPOINTS.map((c) => [c.id, c]));

// Fixed domain display order = the axis order (radar geometry). The two
// specialist tracks sit last: AI Engineering then Cloud & Platform.
//
// Sorting by `indexOf` alone put any UNLISTED domain first (-1 < 0), which is how
// Cloud & Platform silently jumped to the head of the Climb the day it was added.
// Unknown ids now sort to the end, and the axis order is the tiebreaker — so a
// future domain lands somewhere sensible whether or not this list is updated.
const DOMAIN_ORDER = [
  "technical-depth", "systems-architecture", "execution-delivery",
  "direction-influence", "leveling-scope", "ai-engineering", "cloud-platform",
];
const orderIndex = (id: string) => {
  const i = DOMAIN_ORDER.indexOf(id);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
};
export const ORDERED_DOMAINS: CurriculumDomain[] = [...DOMAINS].sort(
  (a, b) => orderIndex(a.id) - orderIndex(b.id) || a.axisId - b.axisId
);

// All concepts, flattened, with their domain/level context — for lookups.
export interface ConceptCtx { concept: Concept; domainId: string; axisId: AxisId; level: Level; }
export const CONCEPTS: ConceptCtx[] = DOMAINS.flatMap((d) =>
  d.levels.flatMap((lv) =>
    lv.concepts.map((c) => ({ concept: c, domainId: d.id, axisId: d.axisId, level: lv.level }))
  )
);
export const CONCEPT_BY_SLUG = new Map(CONCEPTS.map((c) => [c.concept.slug, c]));

export function totalConcepts(): number { return CONCEPTS.length; }

export function checkpointsAfter(domainId: string, level: Level): Checkpoint | undefined {
  return CHECKPOINTS.find((c) => c.domainId === domainId && c.afterLevel === level);
}

export function conceptsOf(domainId: string, level: Level): Concept[] {
  const dom = DOMAIN_BY_ID.get(domainId);
  return dom?.levels.find((l) => l.level === level)?.concepts ?? [];
}

export function levelIntent(domainId: string, level: Level) {
  const dom = DOMAIN_BY_ID.get(domainId);
  return dom?.levels.find((l) => l.level === level)?.intent;
}

/**
 * The definitive recommended learning path: interleaved by level band.
 * For each level L3→L7, walk every domain (in fixed order), emitting that
 * domain's concepts for the band, then that band's checkpoint. This produces the
 * single ordered "learn everything" sequence the platform recommends.
 */
export function learningPath(): PathStep[] {
  const steps: PathStep[] = [];
  for (const level of LEVELS) {
    for (const dom of ORDERED_DOMAINS) {
      const lvl = dom.levels.find((l) => l.level === level);
      if (!lvl || lvl.concepts.length === 0) continue;
      for (const c of lvl.concepts) {
        steps.push({
          kind: "concept", level, domainId: dom.id, axisId: dom.axisId,
          ref: c.slug, title: c.title, moduleId: c.moduleId,
        });
      }
      const chk = checkpointsAfter(dom.id, level);
      if (chk) {
        steps.push({
          kind: "checkpoint", level, domainId: dom.id, axisId: dom.axisId,
          ref: chk.id,
          title: {
            en: `Checkpoint · ${dom.id} · ${level}`,
            es: `Punto de control · ${dom.id} · ${level}`,
          },
        });
      }
    }
  }
  return steps;
}

// Per-level concept counts across all domains — used by the Path view header.
export function levelSpread(): Record<Level, number> {
  const out = {} as Record<Level, number>;
  for (const lv of LEVELS) {
    out[lv] = CONCEPTS.filter((c) => c.level === lv).length;
  }
  return out;
}
