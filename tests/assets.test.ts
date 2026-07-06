// Every boss asset must be CC0 / public domain and carry a source. This test
// is the license guardrail: it fails the build if any domain's boss lacks a
// CC0/public-domain license or a source, so a non-CC0 asset can't sneak in.
import { describe, it, expect } from "vitest";
import { bossFor, BOSS_BY_DOMAIN } from "@/lib/assets";

const DOMAINS = [
  "technical-depth", "systems-architecture", "execution-delivery",
  "direction-influence", "leveling-scope", "ai-engineering",
];

describe("boss asset manifest", () => {
  it("has a boss for every domain", () => {
    for (const d of DOMAINS) expect(BOSS_BY_DOMAIN[d]).toBeDefined();
  });

  it("every boss is CC0 / public domain with a source", () => {
    for (const d of DOMAINS) {
      const b = bossFor(d);
      const lic = b.license.toLowerCase();
      expect(lic.includes("cc0") || lic.includes("public domain")).toBe(true);
      expect(b.source.length).toBeGreaterThan(0);
      expect(b.name.en.length).toBeGreaterThan(0);
      expect(b.name.es.length).toBeGreaterThan(0);
    }
  });

  it("falls back for an unknown domain", () => {
    const b = bossFor("nope");
    expect(b.name.en.length).toBeGreaterThan(0);
  });
});
