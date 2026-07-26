import { describe, it, expect } from "vitest";
import {
  RESOURCES, RESOURCE_BY_ID, resourcesForConcept, resourcesForConcepts,
  resourcesForDomain, resourcesForLevel, resourceStats, KIND_LABEL, KIND_ORDER,
} from "@/lib/resources";
import { CONCEPT_BY_SLUG, DOMAINS } from "@/lib/curriculum";
import { LEVELS } from "@/lib/axes";

// Derived from the spine, never hardcoded: a literal list turned this assertion
// into a false failure the moment a 7th domain (cloud-platform) was added.
const DOMAIN_IDS = new Set(DOMAINS.map((d) => d.id));

describe("resource data integrity", () => {
  it("has resources", () => {
    expect(RESOURCES.length).toBeGreaterThan(0);
  });

  it("every id is unique", () => {
    expect(RESOURCE_BY_ID.size).toBe(RESOURCES.length);
  });

  it("every url is unique and https", () => {
    const urls = new Set<string>();
    for (const r of RESOURCES) {
      expect(r.url, r.id).toMatch(/^https:\/\//);
      const key = r.url.replace(/\/+$/, "").toLowerCase();
      expect(urls.has(key), `duplicate url on ${r.id}`).toBe(false);
      urls.add(key);
    }
  });

  it("every resource is verified", () => {
    // The library's whole claim is "these links work". An unverified entry is a
    // broken promise, so the shipped file must contain none.
    expect(RESOURCES.filter((r) => !r.verified).map((r) => r.id)).toEqual([]);
  });

  it("every why is bilingual and actually translated", () => {
    for (const r of RESOURCES) {
      expect(r.why.en.trim().length, r.id).toBeGreaterThan(10);
      expect(r.why.es.trim().length, r.id).toBeGreaterThan(10);
      expect(r.why.es.trim(), r.id).not.toBe(r.why.en.trim());
    }
  });

  it("has no Spanish calques we've banned", () => {
    // The project's ES voice rules (CLAUDE.md): no librería/robusto/correctitud.
    const banned = /\blibrer[íi]as?\b|\brobust[oa]s?\b|\brobustez\b|\bcorrectitud\b/i;
    const offenders = RESOURCES.filter((r) => banned.test(r.why.es)).map((r) => r.id);
    expect(offenders).toEqual([]);
  });

  it("every kind is a known kind and has a label", () => {
    for (const r of RESOURCES) {
      expect(KIND_ORDER, r.id).toContain(r.kind);
      expect(KIND_LABEL[r.kind]).toBeDefined();
    }
  });

  it("every domainId is a real domain", () => {
    for (const r of RESOURCES) expect(DOMAIN_IDS.has(r.domainId), `${r.id}: ${r.domainId}`).toBe(true);
  });

  it("every level is a real ladder level and the list is non-empty", () => {
    for (const r of RESOURCES) {
      expect(r.levels.length, r.id).toBeGreaterThan(0);
      for (const l of r.levels) expect(LEVELS, r.id).toContain(l);
    }
  });

  it("every mapped concept slug exists in the curriculum", () => {
    for (const r of RESOURCES) {
      for (const slug of r.concepts) {
        expect(CONCEPT_BY_SLUG.has(slug), `${r.id} → unknown slug "${slug}"`).toBe(true);
      }
    }
  });

  it("caps resources per concept so a lesson never drowns in links", () => {
    const count = new Map<string, number>();
    for (const r of RESOURCES) for (const s of r.concepts) count.set(s, (count.get(s) ?? 0) + 1);
    for (const [slug, n] of count) expect(n, slug).toBeLessThanOrEqual(5);
  });

  it("caps concepts per resource", () => {
    for (const r of RESOURCES) expect(r.concepts.length, r.id).toBeLessThanOrEqual(4);
  });
});

describe("lookups", () => {
  it("returns essentials first for a concept", () => {
    const withEssential = RESOURCES.find((r) => r.essential && r.concepts.length > 0);
    if (!withEssential) return; // nothing to assert on an unmapped library
    const list = resourcesForConcept(withEssential.concepts[0]);
    expect(list[0].essential).toBe(true);
  });

  it("dedupes across several concepts", () => {
    const slugs = RESOURCES.flatMap((r) => r.concepts).slice(0, 12);
    const list = resourcesForConcepts(slugs);
    expect(new Set(list.map((r) => r.id)).size).toBe(list.length);
  });

  it("returns [] for an unknown concept", () => {
    expect(resourcesForConcept("no-such-concept-slug")).toEqual([]);
  });

  it("filters by domain and level", () => {
    for (const r of resourcesForDomain("ai-engineering")) expect(r.domainId).toBe("ai-engineering");
    for (const r of resourcesForLevel("L5")) expect(r.levels).toContain("L5");
  });

  it("stats agree with the array", () => {
    const s = resourceStats();
    expect(s.total).toBe(RESOURCES.length);
    expect(s.verified).toBe(RESOURCES.filter((r) => r.verified).length);
    expect([...s.byKind.values()].reduce((a, b) => a + b, 0)).toBe(RESOURCES.length);
  });
});
