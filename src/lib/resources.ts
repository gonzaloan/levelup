// The Resource Library — curated primary sources, not a link farm.
//
// Editorial rules (enforced by tools/validate-resources.mjs, not just by taste):
//   • Every resource is a REAL, verified URL to a PRIMARY source: the paper, the
//     official doc, the engineering-blog post from the team that built it, the
//     talk by the person who did the work. No SEO listicles, no "top 10" posts,
//     no aggregator that just links elsewhere.
//   • Every resource carries `why` (bilingual) — one honest line on what reading
//     it buys you. If we can't say why it's worth an engineer's hour, it's out.
//   • Resources attach to CONCEPTS (many-to-many). A concept shows its own
//     resources in the lesson and in the daily brief's "go deeper" slot.
//   • `levels` marks the altitude the resource actually serves, so an L3 learner
//     isn't handed a Principal-altitude strategy essay as their first read.
import resourcesData from "@/content/data/resources.json";
import type { I18nText } from "@/i18n/config";
import type { Level } from "./axes";

export type ResourceKind = "paper" | "blog" | "book" | "talk" | "doc" | "repo" | "newsletter" | "course";

export interface Resource {
  id: string;
  title: string;              // NOT i18n — a title is a proper noun
  url: string;
  kind: ResourceKind;
  author?: string;
  year?: number;
  why: I18nText;              // why it's worth the time
  levels: Level[];            // altitudes it serves
  domainId: string;           // the domain it belongs to
  concepts: string[];         // concept slugs it deepens
  /** True when the URL was fetched and confirmed to resolve at authoring time. */
  verified: boolean;
  /** Marks the handful of "if you read one thing" entries per domain. */
  essential?: boolean;
}

const DATA = resourcesData as unknown as { resources: Resource[] };

export const RESOURCES: Resource[] = DATA.resources;
export const RESOURCE_BY_ID = new Map(RESOURCES.map((r) => [r.id, r]));

const BY_CONCEPT = new Map<string, Resource[]>();
for (const r of RESOURCES) {
  for (const slug of r.concepts) {
    const list = BY_CONCEPT.get(slug) ?? [];
    list.push(r);
    BY_CONCEPT.set(slug, list);
  }
}

/** Resources that deepen a concept, essentials first. */
export function resourcesForConcept(slug: string): Resource[] {
  const list = BY_CONCEPT.get(slug) ?? [];
  return [...list].sort((a, b) => Number(!!b.essential) - Number(!!a.essential) || a.title.localeCompare(b.title));
}

export function resourcesForDomain(domainId: string): Resource[] {
  return RESOURCES.filter((r) => r.domainId === domainId);
}

export function resourcesForLevel(level: Level): Resource[] {
  return RESOURCES.filter((r) => r.levels.includes(level));
}

/** Every resource attached to any of a lesson's concept slugs, deduped. */
export function resourcesForConcepts(slugs: string[]): Resource[] {
  const seen = new Set<string>();
  const out: Resource[] = [];
  for (const slug of slugs) {
    for (const r of resourcesForConcept(slug)) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
}

export const KIND_LABEL: Record<ResourceKind, I18nText> = {
  paper:      { en: "Paper",      es: "Paper" },
  blog:       { en: "Article",    es: "Artículo" },
  book:       { en: "Book",       es: "Libro" },
  talk:       { en: "Talk",       es: "Charla" },
  doc:        { en: "Docs",       es: "Documentación" },
  repo:       { en: "Code",       es: "Código" },
  newsletter: { en: "Newsletter", es: "Boletín" },
  course:     { en: "Course",     es: "Curso" },
};

/** Distinct kinds present in the library, in a stable display order. */
export const KIND_ORDER: ResourceKind[] = ["paper", "doc", "blog", "talk", "book", "repo", "course", "newsletter"];

export function resourceStats() {
  const byKind = new Map<ResourceKind, number>();
  for (const r of RESOURCES) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
  return {
    total: RESOURCES.length,
    verified: RESOURCES.filter((r) => r.verified).length,
    essential: RESOURCES.filter((r) => r.essential).length,
    byKind,
  };
}
