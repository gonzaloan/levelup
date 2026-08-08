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

/**
 * A cluster whose PRIMER matches the query — a different kind of answer.
 *
 * Why this exists as its own function and its own type rather than more rows in
 * `searchCodex`: the two answer different questions. An entry hit says "here is the
 * technique you named"; a cluster hit says "here is the family you named, what it
 * is, and the axis you are choosing along". Merging them into one ranked list would
 * put a 250-word orientation section in a row shaped for a technique, and the
 * reader could not tell which kind of thing they were looking at.
 *
 * It exists at all because the primers shipped INVISIBLE to the search box, which
 * is the same defect one level up from the one they were written to fix. Measured
 * on the shipped data before this: "context engineering", "agent pattern" and
 * "vector index" each returned ZERO results, because `searchCodex` indexes only
 * `term`, `definition` and `whenToUse` of entries — so typing a cluster's own name
 * got "Nothing matches that yet" from a reference that had just defined it. And the
 * search box sits ABOVE the mode switch precisely because "I already know the word
 * I want" is the most common arrival.
 */
export interface CodexClusterHit { cluster: CodexCluster; score: number; }

export function searchClusters(query: string): CodexClusterHit[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];
  const hits: CodexClusterHit[] = [];
  for (const c of CLUSTERS) {
    /**
     * Each title scored SEPARATELY, not as one concatenated string.
     *
     * The first version folded `${title.en} ${title.es}` into a single haystack,
     * which had two consequences an adversarial pass measured: the `=== q` tier was
     * unreachable (you would have had to type both languages at once — "vector
     * indexes indices vectoriales"), and the Spanish title was systematically
     * demoted, because it sits mid-string so it could only ever reach the `includes`
     * tier. Measured: "Vector indexes" scored 80, "Índices vectoriales" scored 60,
     * for 9 of 11 clusters. In a product where Spanish is authored rather than
     * translated, ranking it below English is a defect, not a detail.
     */
    const titles = [fold(c.title.en), fold(c.title.es)];
    // The primer's two orienting fields. `whatItIs` names the umbrella, and
    // `axisOfChoice` names the dimension — between them they hold the vocabulary a
    // reader who does not know the term would actually type. The families' labels
    // come along because a reader may know a family name and not the cluster's.
    const p = c.primer;
    const primer = p
      ? fold([
          p.whatItIs.en, p.whatItIs.es,
          p.axisOfChoice.en, p.axisOfChoice.es,
          ...p.families.flatMap((f) => [f.label.en, f.label.es]),
        ].join(" "))
      : "";
    // Also the tagline, which is what the cluster said before primers existed.
    const tagline = fold(`${c.tagline.en} ${c.tagline.es}`);

    // Best tier any single title reaches, so EN and ES are ranked identically.
    let score = 0;
    for (const title of titles) {
      if (title === q) score = Math.max(score, 100);
      else if (title.startsWith(q)) score = Math.max(score, 80);
      else if (title.includes(q)) score = Math.max(score, 60);
    }
    if (score === 0 && primer.includes(q)) score = 40;
    else if (score === 0 && tagline.includes(q)) score = 20;
    if (score > 0) hits.push({ cluster: c, score });
  }

  /**
   * A body match that hits MOST of the reference is not an answer.
   *
   * Measured: "the", "and" and "de" each matched all 11 primers, so the whole table
   * of contents rendered as "cluster hits" above the entry results — a search that
   * answers everything is as useless as one that answers nothing, and here it also
   * buried the entry hits the reader probably wanted. Title matches are exempt: if
   * every cluster were literally called the query, that IS the answer.
   *
   * Two thirds rather than a stopword list, because a stopword list is a second
   * thing to maintain per locale and would still miss the next common word. The
   * threshold describes the defect directly: a term this widespread is vocabulary,
   * not a topic.
   *
   * THE EXEMPTION IS A WHOLE WORD OF A TITLE, and getting there took two wrong
   * versions, both of which failed by locale rather than by logic:
   *
   *   1. Any title match (`score >= 60`) exempted too much: "de" is a substring of
   *      five Spanish titles ("ingeniería DE contexto") and "and" of four English
   *      ones, so the very queries the rule exists to stop stayed exempt.
   *   2. A strong match (`>= 80`, i.e. the title equals the query or starts with it)
   *      exempted too little, and asymmetrically. 10 of 11 Spanish titles open with a
   *      different word than their English pair — "Model strategy" is "Estrategia de
   *      modelos", "Vector indexes" is "Índices vectoriales" — because Spanish leads
   *      with the generic noun. So a Spanish content word almost never reaches
   *      `startsWith`. Measured: `searchClusters("modelo")` returned NOTHING while
   *      "model" returned its cluster. That is the original defect — a cluster's own
   *      name does not find it — reintroduced for one locale only, in the same breath
   *      as fixing the EN/ES ranking asymmetry above.
   *
   * A word-boundary test on the title handles both: "modelo" and "modelos" are words
   * of "estrategia de modelos" and stay exempt, while "to", "se", "con", "de" and
   * "and" are sub-words of the titles they appear in and are refused. It asks the
   * question the rule means — does this query NAME a cluster — instead of a proxy for
   * it that happens to be English-shaped.
   */
  const namesACluster = hits.some(({ cluster }) =>
    [cluster.title.en, cluster.title.es].some((title) =>
      // A STEM match against the title's words, so a Spanish singular finds its
      // plural title: "modelo" must reach "Estrategia de modelos" the way "model"
      // reaches "Model strategy".
      //
      // ONE direction, `w.startsWith(q)`. The reverse (`q.startsWith(w)`, a query
      // longer than the title word) was here first and was DEAD CODE: a mutation
      // deleting it survived every assertion, and searching for a query that needed
      // it found none — every candidate either has too few hits for the bound to fire
      // at all, or is already exempt in the forward direction. Kept the branch out
      // rather than writing a test for a case the data cannot produce, since a test
      // whose fixture cannot occur is the vacuous kind this pass already found once.
      //
      // ONE floor, on the query, at 4 characters. It is what stops a short function
      // word from exempting itself: "and" and "de" are whole words of real titles
      // ("Retrieval and ranking", "Estrategia de modelos") and "to"/"se"/"con" are
      // prefixes of "tools"/"serving"/"context", so without it fourteen of them
      // returned all 11 clusters. A second floor on the title words was redundant —
      // the only title words under 4 characters are "and", "y", "de" and "e", every
      // one of which this floor already rejects — and a redundant guard reads as a
      // guard that is doing something.
      q.length >= 4 &&
      fold(title)
        .split(/[^a-z0-9]+/)
        .some((w) => w.startsWith(q))
    )
  );
  if (!namesACluster && hits.length > (CLUSTERS.length * 2) / 3) return [];
  // Ties break by the editorial cluster order, never alphabetically: CLUSTERS is
  // the reference's table of contents and it should survive into the results.
  const rank = new Map(CLUSTERS.map((c, i) => [c.slug, i]));
  return hits.sort(
    (a, b) => b.score - a.score ||
      (rank.get(a.cluster.slug) ?? 999) - (rank.get(b.cluster.slug) ?? 999)
  );
}
