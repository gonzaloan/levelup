// Are the two routes actually independent?
//
// This is the transformation's central claim, and the one that is easy to lose by
// accident. `climb.ts` gates ascent on a QUORUM across all seven domains — 4 of 7 —
// so a learner could not reach "L6 AI" without also demonstrating L5-band influence.
// A person can be a Staff Engineer and a beginner at RAG.
//
// The first assertion below is therefore the important one: clearing EVERY AI
// checkpoint must not move the Staff position by a single stage, and vice versa. If
// that ever fails, the routes are cosmetic.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ROUTES, ROUTE_OF_DOMAIN, STAGE_OF, STAGES, STAGE_BY_ID,
  routeOfDomain, domainsOfRoute, buildRoute, routeSummary, foundationsFor, stageIdFor,
  type RouteId,
} from "@/lib/routes";
import { CHECKPOINTS, ORDERED_DOMAINS, CONCEPTS } from "@/lib/curriculum";
import { LEVELS } from "@/lib/axes";
import type { Progress } from "@/lib/store";

/** A Progress with a given set of checkpoints cleared and nothing else. */
function progressWith(checkpointIds: string[]): Progress {
  return {
    responseLog: [], mastered: [], moduleScores: {}, fieldWork: {}, roomsCleared: {},
    gauntlets: {}, conceptsRead: [], checkpointsCleared: checkpointIds,
    checkpointScores: Object.fromEntries(checkpointIds.map((id) => [id, 1])),
    checkpointAttempts: {}, signal: 0, cadence: { enabled: false, weeks: [] },
    reviews: {}, streak: { days: [] }, dailyLog: {}, skipped: [], codexRead: [],
  } as unknown as Progress;
}

const checkpointsOfRoute = (route: RouteId) =>
  CHECKPOINTS.filter((cp) => routeOfDomain(cp.domainId) === route).map((cp) => cp.id);

describe("the two routes are independent", () => {
  it("clearing every AI checkpoint does not advance the Staff route", () => {
    const empty = routeSummary("staff-engineer", progressWith([]));
    const allAi = routeSummary("staff-engineer", progressWith(checkpointsOfRoute("ai-architect")));
    expect(allAi.currentStageId, "AI progress moved the Staff stage").toBe(empty.currentStageId);
    expect(allAi.checkpointsCleared, "AI checkpoints counted toward Staff").toBe(0);
    expect(allAi.pct).toBe(0);
  });

  it("clearing every Staff checkpoint does not advance the AI route", () => {
    const empty = routeSummary("ai-architect", progressWith([]));
    const allStaff = routeSummary("ai-architect", progressWith(checkpointsOfRoute("staff-engineer")));
    expect(allStaff.currentStageId, "Staff progress moved the AI stage").toBe(empty.currentStageId);
    expect(allStaff.checkpointsCleared).toBe(0);
  });

  it("a learner can be at the TOP of one route and the BOTTOM of the other", () => {
    // The scenario the old model made unreachable, and the reason this exists.
    const p = progressWith(checkpointsOfRoute("ai-architect"));
    const ai = routeSummary("ai-architect", p);
    const staff = routeSummary("staff-engineer", p);
    expect(ai.stages.every((s) => s.status === "complete"),
      "clearing every AI checkpoint should complete the AI route").toBe(true);
    expect(staff.currentIndex, "the Staff route should be untouched at stage 0").toBe(0);
    expect(staff.stages[0].status).toBe("current");
  });

  it("a route's gate only ever reads checkpoints it owns", () => {
    // Structural, not behavioural: every cell in a route's stages must belong to a
    // domain that route owns. This is what makes the two independent, so it is worth
    // asserting directly rather than inferring from the summaries above.
    for (const r of ROUTES) {
      for (const stage of buildRoute(r.id, null)) {
        for (const cell of stage.cells) {
          expect(routeOfDomain(cell.domainId), `${r.id} stage ${stage.id} includes a foreign domain`)
            .toBe(r.id);
        }
      }
    }
  });
});

describe("Shared Foundations is a layer, not a ladder", () => {
  it("has no gate: every tier is available with zero progress", () => {
    const stages = buildRoute("shared-foundations", progressWith([]));
    expect(stages.length).toBeGreaterThan(0);
    for (const st of stages) {
      expect(st.status, `tier ${st.id} is gated`).toBe("available");
      expect(st.required, `tier ${st.id} requires checkpoints to enter`).toBe(0);
      expect(st.ascended).toBe(true);
    }
  });

  it("folds five spine levels into three tiers", () => {
    const ids = [...new Set(LEVELS.map((l) => STAGE_OF["shared-foundations"][l]))];
    expect(ids).toEqual(["F1", "F2", "F3"]);
    // And each tier carries the levels it folds, so nothing is lost.
    const stages = buildRoute("shared-foundations", null);
    const covered = stages.flatMap((s) => s.levels);
    expect([...covered].sort()).toEqual([...LEVELS].sort());
  });

  it("names the foundations a module depends on, through the full closure", () => {
    // The mechanism that replaces climbing: a module NAMES what it needs. Uses the
    // existing prerequisite DAG, so a prerequisite of a prerequisite counts.
    const aiSlugs = CONCEPTS.filter((c) => c.domainId === "ai-engineering").map((c) => c.concept.slug);
    const found = foundationsFor(aiSlugs);
    for (const slug of found) {
      const ctx = CONCEPTS.find((c) => c.concept.slug === slug);
      expect(ctx, `${slug} is not a spine concept`).toBeTruthy();
      expect(routeOfDomain(ctx!.domainId), `${slug} is not a shared foundation`).toBe("shared-foundations");
    }
    // This assertion used to accept an empty result, with a comment explaining that
    // the spine authors prerequisites per domain. That was true and it made the test
    // vacuous — the layer WAS decorative and the test said so approvingly. The edges
    // are now authored (`leansOn`), so the count is real and asserted.
    expect(found.length, "the AI route leans on no foundation at all").toBeGreaterThan(4);
  });
});

describe("every domain is placed deliberately", () => {
  it("maps all 7 spine domains, with no default", () => {
    for (const d of ORDERED_DOMAINS) {
      expect(ROUTE_OF_DOMAIN[d.id], `${d.id} has no route`).toBeTruthy();
    }
    // And an unknown domain THROWS rather than landing somewhere by fallback. A
    // silent `?? 1` fallback is what made every Cloud lesson render as "Technical
    // Depth" when the 7th domain was added.
    expect(() => routeOfDomain("domain-that-does-not-exist")).toThrow(/no route/);
  });

  it("the map has no entry for a domain the spine does not have", () => {
    const spine = new Set(ORDERED_DOMAINS.map((d) => d.id));
    const stale = Object.keys(ROUTE_OF_DOMAIN).filter((id) => !spine.has(id));
    expect(stale, "ROUTE_OF_DOMAIN names a domain that no longer exists").toEqual([]);
  });

  it("the build-time copy in tools/inventory.cjs agrees with this module", () => {
    // The audit script is .cjs and cannot import TypeScript, so it carries a copy.
    // A copy that can drift silently is the defect; this makes drift a test failure.
    const src = readFileSync("tools/inventory.cjs", "utf8");
    const block = src.slice(src.indexOf("const ROUTE_OF_DOMAIN"), src.indexOf("};", src.indexOf("const ROUTE_OF_DOMAIN")));
    const copy: Record<string, string> = {};
    for (const m of block.matchAll(/"([a-z-]+)":\s*"([a-z-]+)"/g)) copy[m[1]] = m[2];
    expect(copy, "tools/inventory.cjs disagrees with src/lib/routes.ts").toEqual(ROUTE_OF_DOMAIN);
  });

  it("every route owns at least one domain", () => {
    for (const r of ROUTES) {
      expect(domainsOfRoute(r.id).length, `${r.id} owns no domains`).toBeGreaterThan(0);
    }
  });
});

describe("stages are complete and bilingual", () => {
  it("every (route, level) pair resolves to a stage that exists", () => {
    for (const r of ROUTES) {
      for (const level of LEVELS) {
        const id = STAGE_OF[r.id][level];
        expect(STAGE_BY_ID.get(id), `${r.id}/${level} names stage ${id}, which has no metadata`).toBeTruthy();
      }
    }
  });

  it("stageIdFor agrees with the route and level maps", () => {
    for (const d of ORDERED_DOMAINS) {
      for (const level of LEVELS) {
        expect(stageIdFor(d.id, level)).toBe(STAGE_OF[routeOfDomain(d.id)][level]);
      }
    }
  });

  it("every stage and route carries real Spanish, not a copy of the English", () => {
    const bad: string[] = [];
    const check = (label: string, v: { en: string; es: string }) => {
      if (!v.en?.trim() || !v.es?.trim()) bad.push(`${label} empty`);
      // A stage NAME may legitimately match ("AI Platform" is used in Spanish too),
      // so only the long-form fields are held to being translated.
      if (label.endsWith("defines") || label.endsWith("measures") || label.endsWith("forWhom")) {
        if (v.en.trim() === v.es.trim()) bad.push(`${label} untranslated`);
      }
    };
    for (const r of ROUTES) {
      check(`${r.id}.name`, r.name);
      check(`${r.id}.measures`, r.measures);
      check(`${r.id}.forWhom`, r.forWhom);
    }
    for (const s of STAGES) {
      check(`${s.id}.name`, s.name);
      check(`${s.id}.defines`, s.defines);
    }
    expect(bad).toEqual([]);
  });

  it("no stage promises content the spine does not have", () => {
    // A stage with no cells is a rung a learner can see and cannot walk.
    for (const r of ROUTES) {
      for (const st of buildRoute(r.id, null)) {
        expect(st.cells.length, `${r.id} stage ${st.id} has no lessons`).toBeGreaterThan(0);
      }
    }
  });
});

describe("the thin stages the IA document warns about", () => {
  it("records where each route is thinnest, so the gap stays visible", () => {
    // The target-IA doc states that AI Architect is thin at A1 and A5. If that
    // changes because someone authored more, this number moves and the doc should be
    // updated with it — recorded rather than asserted as a target.
    const ai = buildRoute("ai-architect", null);
    const byStage = Object.fromEntries(ai.map((s) => [s.id, s.conceptsTotal]));
    expect(byStage.A1).toBeGreaterThan(0);
    expect(byStage.A5).toBeGreaterThan(0);
    // The thinnest stage should still be walkable: at least 3 concepts.
    const thinnest = Math.min(...ai.map((s) => s.conceptsTotal));
    expect(thinnest, `a route stage has only ${thinnest} concepts`).toBeGreaterThanOrEqual(3);
  });
});

describe("the shared layer is actually wired", () => {
  // It was not. The spine authors prerequisites PER DOMAIN — 212 within-domain edges,
  // 0 cross-domain — so `foundationsFor()` returned empty for every route and Shared
  // Foundations was decorative: a band on the page naming three tiers that nothing
  // pointed at. Section 5.3 requires one canonical definition surfaced from the
  // modules that need it, and without an edge there is nothing to surface.
  it("both laddered routes name real cross-route dependencies", () => {
    for (const route of ["ai-architect", "staff-engineer"] as RouteId[]) {
      const slugs = CONCEPTS.filter((c) => routeOfDomain(c.domainId) === route).map((c) => c.concept.slug);
      const found = foundationsFor(slugs);
      expect(found.length, `${route} leans on no shared foundation — the layer is decorative`).toBeGreaterThan(0);
      for (const slug of found) {
        const ctx = CONCEPTS.find((c) => c.concept.slug === slug)!;
        expect(routeOfDomain(ctx.domainId), `${slug} is not a shared foundation`).toBe("shared-foundations");
      }
    }
  });

  it("every leansOn target is a real shared foundation, and no foundation leans on the layer it is in", () => {
    const bad: string[] = [];
    for (const c of CONCEPTS) {
      const route = routeOfDomain(c.domainId);
      for (const lean of c.concept.leansOn ?? []) {
        const target = CONCEPTS.find((x) => x.concept.slug === lean);
        if (!target) { bad.push(`${c.concept.slug} -> ${lean} (not a spine concept)`); continue; }
        if (routeOfDomain(target.domainId) !== "shared-foundations") {
          bad.push(`${c.concept.slug} -> ${lean} (in ${target.domainId}, not a foundation)`);
        }
        if (route === "shared-foundations") {
          bad.push(`${c.concept.slug} is a foundation and cannot lean on the layer it is in`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("leansOn is ADVISORY — it never gates the daily brief", () => {
    // `prerequisites` is a hard gate (daily.ts will not serve a concept until each is
    // read). If a cross-route edge ever landed there, every AI learner would be
    // forced through the systems domain, which is the coupling the routes remove.
    const crossPrereq: string[] = [];
    for (const c of CONCEPTS) {
      for (const pre of c.concept.prerequisites ?? []) {
        const target = CONCEPTS.find((x) => x.concept.slug === pre);
        if (target && target.domainId !== c.domainId) {
          crossPrereq.push(`${c.concept.slug} -> ${pre} (${c.domainId} -> ${target.domainId})`);
        }
      }
    }
    expect(crossPrereq, "a cross-domain PREREQUISITE would gate the brief across routes").toEqual([]);
  });

  it("the AI route leans on foundations its own prose actually reasons about", () => {
    // Spot-check the edges that carry the argument, so a future edit that guts them
    // fails rather than quietly making the layer decorative again.
    const rag = CONCEPTS.find((c) => c.concept.slug === "rag-as-system")!;
    expect(rag.concept.leansOn, "RAG-as-a-system reasons about saturation").toContain("backpressure-flow-control");
    const agents = CONCEPTS.find((c) => c.concept.slug === "agency-spectrum")!;
    expect(agents.concept.leansOn, "an agent loop retries tool calls").toContain("delivery-semantics-idempotency");
  });
});
