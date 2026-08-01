import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  CLUSTERS, ENTRIES, ENTRY_BY_SLUG, CLUSTER_OF, ARCHITECTURES,
  codexPath, codexLayers, searchCodex, fold, codexEntriesForConcept,
} from "../src/lib/codex";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The spine's concept slugs — a Codex cross-link that names a missing one
 *  promises depth that isn't there, so it must be provably impossible. */
function spineSlugs(): Set<string> {
  const spine = JSON.parse(
    readFileSync(path.join(ROOT, "src/content/data/curriculum.json"), "utf8")
  );
  const out = new Set<string>();
  for (const d of spine.domains) for (const b of d.levels) for (const c of b.concepts) out.add(c.slug);
  return out;
}

describe("the Codex reading path", () => {
  it("is a topological order — nothing appears before its prerequisite", () => {
    const path_ = codexPath();
    const seen = new Set<string>();
    for (const step of path_) {
      const e = ENTRY_BY_SLUG.get(step.entrySlug)!;
      for (const p of e.prerequisites ?? []) {
        // Only entries that actually exist constrain the order; an unresolvable
        // prerequisite is the merge validator's problem, not the renderer's.
        if (!ENTRY_BY_SLUG.has(p)) continue;
        expect(seen.has(p), `${step.entrySlug} appears before its prerequisite ${p}`).toBe(true);
      }
      seen.add(step.entrySlug);
    }
    expect(path_.length).toBe(ENTRIES.length);
  });

  it("gives an entry a depth strictly greater than every prerequisite", () => {
    // This is what makes the layered drawing honest: an edge may never run
    // sideways or backwards, or "read bottom to top" stops being true.
    const depth = new Map(codexPath().map((s) => [s.entrySlug, s.depth]));
    for (const e of ENTRIES) {
      for (const p of e.prerequisites ?? []) {
        if (!ENTRY_BY_SLUG.has(p)) continue;
        expect(
          depth.get(e.slug)! > depth.get(p)!,
          `${e.slug} (depth ${depth.get(e.slug)}) must sit above ${p} (depth ${depth.get(p)})`
        ).toBe(true);
      }
    }
  });

  it("uses the LONGEST prerequisite chain, not the shortest", () => {
    // With prerequisites of depth 1 and 4, an entry belongs at 5: you cannot read
    // it until the deeper branch is done. Shortest-path layering would place it at
    // 2 and draw an edge running backwards.
    for (const e of ENTRIES) {
      const known = (e.prerequisites ?? []).filter((p) => ENTRY_BY_SLUG.has(p));
      if (known.length < 2) continue;
      const depth = new Map(codexPath().map((s) => [s.entrySlug, s.depth]));
      const max = Math.max(...known.map((p) => depth.get(p)!));
      expect(depth.get(e.slug)).toBe(max + 1);
    }
  });

  it("is deterministic — the same input yields the identical order", () => {
    // SSR and the client must agree. A path that reordered between the two would
    // hydrate into a different picture, which is the project's determinism rule.
    const a = codexPath().map((s) => s.entrySlug);
    const b = codexPath().map((s) => s.entrySlug);
    expect(a).toEqual(b);
  });

  it("layers contain every entry exactly once, with no gaps", () => {
    const layers = codexLayers();
    const flat = layers.flat();
    expect(flat.length).toBe(ENTRIES.length);
    expect(new Set(flat.map((s) => s.entrySlug)).size).toBe(ENTRIES.length);
    // A hole in the array would crash the renderer's .map — the band for every
    // depth from 0 to the deepest must exist, even if empty.
    for (const [i, l] of layers.entries()) {
      expect(Array.isArray(l), `layer ${i} is not an array`).toBe(true);
    }
  });
});

describe("Codex data integrity", () => {
  it("has no duplicate entry slugs across clusters", () => {
    // A reused slug would make ENTRY_BY_SLUG silently lose one, and every
    // #anchor for it would land on the wrong entry.
    const seen = new Map<string, string>();
    for (const c of CLUSTERS) {
      for (const e of c.entries) {
        expect(seen.has(e.slug), `${e.slug} is in both ${seen.get(e.slug)} and ${c.slug}`).toBe(false);
        seen.set(e.slug, c.slug);
      }
    }
  });

  it("maps every entry to its cluster", () => {
    for (const e of ENTRIES) {
      expect(CLUSTER_OF.get(e.slug), `${e.slug} has no cluster`).toBeTruthy();
    }
  });

  it("never cross-links a concept slug that is not in the spine", () => {
    const spine = spineSlugs();
    for (const e of ENTRIES) {
      for (const slug of e.relatedConcepts ?? []) {
        expect(spine.has(slug), `${e.slug} links to unknown concept "${slug}"`).toBe(true);
      }
    }
  });

  it("states a cost that is a bound or a figure, never an adjective", () => {
    // The editorial position of the whole module. An entry that cannot state its
    // price as something checkable is one we do not understand well enough.
    const concrete = /(\d|1\/N|per |per-|latency|throughput|capacity|memory|storage|bytes?|tokens?|dimensions?|recall|precision|coverage|requests?|seconds?|minutes?|hours?|days?|\$|%|x\b|ms\b|GB\b|reversib|migration|operational surface|engineer|quota|trad(e|ing) \w+ for|in exchange for|at the cost of)/i;
    for (const e of ENTRIES) {
      expect(concrete.test(e.cost.en), `${e.slug}.cost is not concrete: "${e.cost.en}"`).toBe(true);
    }
  });

  it("keeps every learner-facing string bilingual and translated", () => {
    for (const e of ENTRIES) {
      for (const f of ["term", "definition", "howItWorks", "whenToUse", "cost", "cheaperFirst", "failureMode"] as const) {
        const v = e[f];
        expect(v?.en?.trim(), `${e.slug}.${f}.en empty`).toBeTruthy();
        expect(v?.es?.trim(), `${e.slug}.${f}.es empty`).toBeTruthy();
        // `term` is exempt: a technical term is often correctly identical.
        if (f !== "term") {
          expect(v.en.trim(), `${e.slug}.${f} is untranslated`).not.toBe(v.es.trim());
        }
      }
    }
  });

  it("gives every entry and architecture a checkable source URL", () => {
    for (const e of ENTRIES) {
      expect(e.source, `${e.slug} has no source`).toMatch(/^https?:\/\/\S+\.\S+/);
    }
    for (const a of ARCHITECTURES) {
      expect(a.source, `${a.slug} has no source`).toMatch(/^https?:\/\/\S+\.\S+/);
    }
  });

  it("only ships diagram shapes the renderer can draw", () => {
    // A shape that does not match its `kind` renders EMPTY — the most expensive
    // silent defect in this codebase's history, so it gets a test as well as a
    // merge-time check.
    const check = (d: unknown, where: string) => {
      if (!d) return;
      const s = d as { kind: string; caption?: unknown; nodes?: unknown[]; left?: { points?: unknown[] }; right?: { points?: unknown[] } };
      expect(["flow", "compare", "stack", "axes", "none"]).toContain(s.kind);
      if (s.kind === "none") return;
      expect(s.caption, `${where}: a diagram must assert something — caption missing`).toBeTruthy();
      if (s.kind === "flow" || s.kind === "stack") {
        expect(s.nodes?.length ?? 0, `${where}: ${s.kind} needs nodes`).toBeGreaterThanOrEqual(3);
        expect(s.left ?? null, `${where}: ${s.kind} must not carry left`).toBeNull();
      }
      if (s.kind === "compare") {
        const L = s.left?.points?.length ?? 0;
        const R = s.right?.points?.length ?? 0;
        expect(L, `${where}: compare needs left points`).toBeGreaterThanOrEqual(2);
        // Asymmetric sides read as a tradeoff and teach nothing.
        expect(L, `${where}: compare sides asymmetric (${L} vs ${R})`).toBe(R);
      }
    };
    for (const e of ENTRIES) check(e.diagram, `${e.slug}.diagram`);
    for (const a of ARCHITECTURES) check(a.diagram, `${a.slug}.diagram`);
  });
});

describe("Codex search", () => {
  it("folds diacritics so an unaccented query finds accented text", () => {
    // Half the content is Spanish. A learner typing "compensacion" must find
    // "compensación" — this is a correctness requirement, not a nicety.
    expect(fold("compensación")).toBe("compensacion");
    expect(fold("ÍNDICE")).toBe("indice");
  });

  it("ignores a query too short to mean anything", () => {
    expect(searchCodex("")).toEqual([]);
    expect(searchCodex("a")).toEqual([]);
  });

  it("ranks an exact term match above a body mention", () => {
    if (ENTRIES.length === 0) return;
    const target = ENTRIES[0];
    const hits = searchCodex(target.term.en);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].entry.slug).toBe(target.slug);
  });

  it("is order-stable for equal scores", () => {
    // Ties break on slug, so two runs cannot disagree.
    const a = searchCodex("a".repeat(2)).map((h) => h.entry.slug);
    const b = searchCodex("a".repeat(2)).map((h) => h.entry.slug);
    expect(a).toEqual(b);
  });
});

describe("the Codex and the spine reinforce rather than duplicate", () => {
  it("resolves a concept's Codex entries only through real cross-links", () => {
    for (const e of ENTRIES) {
      for (const slug of e.relatedConcepts ?? []) {
        expect(
          codexEntriesForConcept(slug).some((x) => x.slug === e.slug),
          `${e.slug} claims ${slug} but the reverse index misses it`
        ).toBe(true);
      }
    }
  });

  it("returns nothing for a concept no entry claims", () => {
    expect(codexEntriesForConcept("definitely-not-a-real-concept-slug")).toEqual([]);
  });
});
