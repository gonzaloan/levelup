// Architecture Builder — loader + PURE deterministic grader.
//
// The learner assembles a system (typed nodes + directed edges) against a target
// topology. Grading is a static graph check — no runtime LLM — giving partial
// credit and specific, localized feedback per criterion:
//   • each required node type present (with min count)
//   • each required directed edge present (by node type, not instance)
//   • each forbidden (anti-pattern) edge ABSENT
// The score is the fraction of satisfied criteria; the checkpoint gate treats a
// build item as "correct" only when it is FULLY satisfied (all criteria pass),
// so it stays boolean-compatible with the rest of the check pipeline.
import buildData from "@/content/data/builds.json";
import type {
  BuildChallenge, BuildResponse, BuildEdgeRule, BuildRequiredNode,
} from "./types";
import type { I18nText } from "@/i18n/config";
import { LESSONS } from "./lessons";

const DATA = buildData as unknown as { builds: BuildChallenge[] };

export const BUILDS: BuildChallenge[] = DATA.builds;
export const BUILD_BY_ID = new Map(BUILDS.map((b) => [b.id, b]));

const BY_CONCEPT = new Map<string, BuildChallenge[]>();
for (const b of BUILDS) {
  const list = BY_CONCEPT.get(b.concept) ?? [];
  list.push(b);
  BY_CONCEPT.set(b.concept, list);
}
export function buildsForConcept(slug: string): BuildChallenge[] {
  return BY_CONCEPT.get(slug) ?? [];
}
export function buildsForLesson(lessonId: string): BuildChallenge[] {
  const lesson = LESSONS.find((l) => l.lessonId === lessonId);
  if (!lesson) return [];
  const slugs = new Set(lesson.concepts.map((c) => c.slug));
  return BUILDS.filter((b) => slugs.has(b.concept));
}

export type CriterionKind = "node" | "edge" | "forbidden";
export interface Criterion {
  kind: CriterionKind;
  ok: boolean;
  label: I18nText;             // human-readable "what this checks"
  note: I18nText;              // why it matters (from the rule)
}
export interface BuildGrade {
  criteria: Criterion[];
  passed: number;
  total: number;
  score: number;               // 0..1
  correct: boolean;            // ALL criteria satisfied (checkpoint-boolean)
}

function typeCount(res: BuildResponse, type: string): number {
  return res.nodes.filter((n) => n.type === type).length;
}
// Does a directed edge of (fromType → toType) exist anywhere in the response?
function hasTypeEdge(res: BuildResponse, fromType: string, toType: string): boolean {
  const typeOf = new Map(res.nodes.map((n) => [n.id, n.type]));
  return res.edges.some(
    (e) => typeOf.get(e.from) === fromType && typeOf.get(e.to) === toType
  );
}

function nodeLabel(r: BuildRequiredNode): I18nText {
  const min = r.min ?? 1;
  return {
    en: `Include ${min > 1 ? `${min}× ` : ""}“${r.type}”`,
    es: `Incluir ${min > 1 ? `${min}× ` : ""}«${r.type}»`,
  };
}
function edgeLabel(r: BuildEdgeRule): I18nText {
  return { en: `Connect ${r.from} → ${r.to}`, es: `Conectar ${r.from} → ${r.to}` };
}
function forbiddenLabel(r: BuildEdgeRule): I18nText {
  return { en: `Avoid ${r.from} → ${r.to}`, es: `Evitar ${r.from} → ${r.to}` };
}

/** Pure grader. Deterministic; no side effects. */
export function gradeBuild(challenge: BuildChallenge, res: BuildResponse): BuildGrade {
  const criteria: Criterion[] = [];

  for (const r of challenge.requiredNodes) {
    const min = r.min ?? 1;
    criteria.push({
      kind: "node",
      ok: typeCount(res, r.type) >= min,
      label: nodeLabel(r),
      note: r.note ?? { en: "", es: "" },
    });
  }
  for (const r of challenge.requiredEdges) {
    criteria.push({
      kind: "edge",
      ok: hasTypeEdge(res, r.from, r.to),
      label: edgeLabel(r),
      note: r.note,
    });
  }
  for (const r of challenge.forbiddenEdges ?? []) {
    criteria.push({
      kind: "forbidden",
      ok: !hasTypeEdge(res, r.from, r.to), // ok == the anti-pattern is absent
      label: forbiddenLabel(r),
      note: r.note,
    });
  }

  const total = criteria.length;
  const passed = criteria.filter((c) => c.ok).length;
  const score = total ? passed / total : 0;
  return { criteria, passed, total, score, correct: total > 0 && passed === total };
}
