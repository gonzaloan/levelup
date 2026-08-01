// The Codex — the AI-Architect reference layer.
//
// What it is NOT: a lesson. The 178-concept spine (curriculum.ts) teaches
// judgment along a prerequisite DAG, one concept per pane, gated by checkpoints.
// The Codex answers a different question — "what is X, when do I reach for it,
// and what does it cost me" — for the vocabulary an AI architect is assumed to
// already own. Chunking strategies, index families, agent patterns, serving
// mechanics: the things you look up mid-design-review, not the things you sit
// down to learn for a quarter.
//
// Two access patterns, both first-class:
//   • BROWSE — clusters, each a scannable list of entries. This is the reference.
//   • PATH — a derived reading order over the entry DAG, so the Codex can be
//     learned front-to-back rather than only sampled. `codexPath()` computes it
//     from the prerequisites, so the route can never drift from the data.
//
// Every entry carries the same six-part anatomy (definition, mechanism, trigger,
// cost, cheaper-first, failure mode). That uniformity is the whole point: a
// reference whose entries have different shapes cannot be scanned, and NN/g's
// finding on comparison content is that the defect is almost always the content's
// asymmetry rather than its styling.
import codexData from "@/content/data/codex.json";
import type {
  Codex, CodexCluster, CodexEntry, CodexArchitecture, CodexPathStep,
} from "./types";

const DATA = codexData as unknown as Codex;

export const CLUSTERS: CodexCluster[] = DATA.clusters ?? [];
export const ARCHITECTURES: CodexArchitecture[] = DATA.architectures ?? [];

export const ENTRIES: CodexEntry[] = CLUSTERS.flatMap((c) => c.entries);
export const ENTRY_BY_SLUG = new Map(ENTRIES.map((e) => [e.slug, e]));
export const CLUSTER_BY_SLUG = new Map(CLUSTERS.map((c) => [c.slug, c]));
export const ARCH_BY_SLUG = new Map(ARCHITECTURES.map((a) => [a.slug, a]));

/** Which cluster an entry lives in — the reverse index the entry doesn't carry. */
export const CLUSTER_OF = new Map<string, string>(
  CLUSTERS.flatMap((c) => c.entries.map((e) => [e.slug, c.slug] as [string, string]))
);

export function totalEntries(): number { return ENTRIES.length; }

export function entriesOf(clusterSlug: string): CodexEntry[] {
  return CLUSTER_BY_SLUG.get(clusterSlug)?.entries ?? [];
}

/**
 * Spine concept slug → the Codex entries that deepen it, and the reverse.
 *
 * Cross-linking both ways is what keeps the two surfaces from becoming
 * duplicates of each other: a lesson concept offers "look this up in the Codex",
 * and a Codex entry offers "here is where this is taught in the ladder".
 */
const ENTRIES_BY_CONCEPT = new Map<string, CodexEntry[]>();
for (const e of ENTRIES) {
  for (const slug of e.relatedConcepts ?? []) {
    const list = ENTRIES_BY_CONCEPT.get(slug) ?? [];
    list.push(e);
    ENTRIES_BY_CONCEPT.set(slug, list);
  }
}

export function codexEntriesForConcept(conceptSlug: string): CodexEntry[] {
  return ENTRIES_BY_CONCEPT.get(conceptSlug) ?? [];
}

/**
 * The reading path: a deterministic topological order over the entry DAG.
 *
 * `depth` is the LONGEST prerequisite chain reaching an entry, not the shortest.
 * Using the longest is what makes the layering honest — an entry whose two
 * prerequisites are 1 and 4 steps deep belongs at 5, because you cannot read it
 * until the deeper branch is done. Shortest-path layering would put it at 2 and
 * draw an edge running backwards.
 *
 * Ties break by (cluster order, entry order) — never by anything time- or
 * random-derived, so the path is identical on the server and the client. That is
 * the project's determinism rule, and a path that reordered itself between SSR
 * and hydration would fail it visibly.
 *
 * A prerequisite naming an entry that does not exist is IGNORED rather than
 * fatal: the merge validator rejects those at author time, and a renderer that
 * throws on bad data takes the whole page down. A cycle is likewise survivable —
 * anything still unresolved is appended in authored order, so the worst case is a
 * suboptimal order rather than a blank screen.
 */
export function codexPath(): CodexPathStep[] {
  const order = new Map<string, number>();
  ENTRIES.forEach((e, i) => order.set(e.slug, i));

  const depth = new Map<string, number>();
  const visiting = new Set<string>();

  const resolve = (slug: string): number => {
    const cached = depth.get(slug);
    if (cached !== undefined) return cached;
    // A cycle would recurse forever. Treat the back-edge as depth 0 and let the
    // validator be the thing that complains about it.
    if (visiting.has(slug)) return 0;
    const entry = ENTRY_BY_SLUG.get(slug);
    if (!entry) return 0;
    visiting.add(slug);
    let d = 0;
    for (const p of entry.prerequisites ?? []) {
      if (!ENTRY_BY_SLUG.has(p)) continue;   // unknown prereq: not this layer's problem
      d = Math.max(d, resolve(p) + 1);
    }
    visiting.delete(slug);
    depth.set(slug, d);
    return d;
  };

  for (const e of ENTRIES) resolve(e.slug);

  return ENTRIES
    .map((e) => ({
      entrySlug: e.slug,
      clusterSlug: CLUSTER_OF.get(e.slug) ?? "",
      depth: depth.get(e.slug) ?? 0,
    }))
    .sort((a, b) =>
      a.depth - b.depth ||
      (order.get(a.entrySlug) ?? 0) - (order.get(b.entrySlug) ?? 0)
    );
}

/** The path grouped into layers, which is what the spine visual draws. */
export function codexLayers(): CodexPathStep[][] {
  const layers: CodexPathStep[][] = [];
  for (const step of codexPath()) {
    (layers[step.depth] ??= []).push(step);
  }
  // A missing layer would leave a hole in the array and crash a .map — fill any
  // gap with an empty band rather than trusting the depths to be contiguous.
  return layers.map((l) => l ?? []);
}

/**
 * Search over the Codex, folded for diacritics.
 *
 * Diacritic folding is not a nicety here: half the content is Spanish, and a
 * learner typing "compensacion" without the accent must find "compensación".
 * Plain substring matching over a few hundred short strings — deliberately no
 * fuzzy-search dependency, because the index is three orders of magnitude
 * smaller than the point where one starts to pay for itself.
 */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export interface CodexHit { entry: CodexEntry; clusterSlug: string; score: number; }

export function searchCodex(query: string): CodexHit[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];
  const hits: CodexHit[] = [];
  for (const e of ENTRIES) {
    const term = fold(`${e.term.en} ${e.term.es}`);
    const body = fold(`${e.definition.en} ${e.definition.es} ${e.whenToUse.en}`);
    // Rank by WHERE the match landed, not by how many times it occurs: an exact
    // term match is a different kind of answer from a mention in the body.
    let score = 0;
    if (term === q) score = 100;
    else if (term.startsWith(q)) score = 80;
    else if (term.includes(q)) score = 60;
    else if (body.includes(q)) score = 30;
    if (score > 0) hits.push({ entry: e, clusterSlug: CLUSTER_OF.get(e.slug) ?? "", score });
  }
  return hits.sort((a, b) => b.score - a.score || a.entry.slug.localeCompare(b.entry.slug));
}
