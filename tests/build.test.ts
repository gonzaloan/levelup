// The Architecture Builder grades a learner-assembled graph deterministically:
// required nodes present, required directed edges present, forbidden edges absent.
// Full satisfaction => correct (checkpoint-boolean); partial => score for feedback.
import { describe, it, expect } from "vitest";
import { BUILDS, gradeBuild, buildsForConcept } from "@/lib/build";
import { CONCEPT_BY_SLUG } from "@/lib/curriculum";
import type { BuildResponse } from "@/lib/types";

// A perfect response for a challenge: one node per required type (respecting min)
// plus enough nodes to satisfy every required edge, and exactly the required edges.
function perfectResponse(id: string): BuildResponse {
  const ch = BUILDS.find((b) => b.id === id)!;
  const nodes: BuildResponse["nodes"] = [];
  const idOfType = new Map<string, string>();
  const need = new Map<string, number>();
  for (const rn of ch.requiredNodes) need.set(rn.type, Math.max(need.get(rn.type) ?? 0, rn.min ?? 1));
  // ensure every type referenced by edges exists too
  for (const e of ch.requiredEdges) { need.set(e.from, Math.max(need.get(e.from) ?? 0, 1)); need.set(e.to, Math.max(need.get(e.to) ?? 0, 1)); }
  let k = 0;
  for (const [type, count] of need) {
    for (let i = 0; i < count; i++) {
      const nid = `n${k++}`;
      nodes.push({ id: nid, type });
      if (!idOfType.has(type)) idOfType.set(type, nid);
    }
  }
  const edges = ch.requiredEdges.map((e) => ({ from: idOfType.get(e.from)!, to: idOfType.get(e.to)! }));
  return { nodes, edges };
}

describe("build content integrity", () => {
  it("has challenges and unique ids", () => {
    expect(BUILDS.length).toBeGreaterThanOrEqual(5);
    const ids = BUILDS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every build.concept is a real curriculum concept slug", () => {
    for (const b of BUILDS) {
      expect(CONCEPT_BY_SLUG.has(b.concept), `unknown concept ${b.concept} in ${b.id}`).toBe(true);
    }
  });

  it("every required/forbidden edge references a palette type", () => {
    for (const b of BUILDS) {
      const types = new Set(b.palette.map((p) => p.type));
      for (const e of [...b.requiredEdges, ...(b.forbiddenEdges ?? [])]) {
        expect(types.has(e.from), `${b.id}: edge from ${e.from}`).toBe(true);
        expect(types.has(e.to), `${b.id}: edge to ${e.to}`).toBe(true);
      }
      for (const n of b.requiredNodes) expect(types.has(n.type), `${b.id}: node ${n.type}`).toBe(true);
    }
  });

  it("bilingual strings present on title/prompt/explain", () => {
    for (const b of BUILDS) {
      for (const f of [b.title, b.prompt, b.explain]) {
        expect(f.en.length).toBeGreaterThan(0);
        expect(f.es.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("gradeBuild", () => {
  it("a perfect response scores 1 and is correct for every challenge", () => {
    for (const b of BUILDS) {
      const g = gradeBuild(b, perfectResponse(b.id));
      expect(g.score, `${b.id} score`).toBe(1);
      expect(g.correct, `${b.id} correct`).toBe(true);
    }
  });

  it("empty response fails and is not correct", () => {
    const b = BUILDS[0];
    const g = gradeBuild(b, { nodes: [], edges: [] });
    expect(g.correct).toBe(false);
    expect(g.score).toBeLessThan(1);
  });

  it("a forbidden anti-pattern edge fails its criterion", () => {
    const b = BUILDS.find((x) => (x.forbiddenEdges?.length ?? 0) > 0)!;
    const forbidden = b.forbiddenEdges![0];
    const good = perfectResponse(b.id);
    // add nodes for the forbidden types if missing, then the forbidden edge
    const typeId = new Map(good.nodes.map((n) => [n.type, n.id]));
    const ensure = (type: string) => {
      if (!typeId.has(type)) { const nid = `x-${type}`; good.nodes.push({ id: nid, type }); typeId.set(type, nid); }
      return typeId.get(type)!;
    };
    good.edges.push({ from: ensure(forbidden.from), to: ensure(forbidden.to) });
    const g = gradeBuild(b, good);
    const forbiddenCrit = g.criteria.find((c) => c.kind === "forbidden");
    expect(forbiddenCrit!.ok).toBe(false);
    expect(g.correct).toBe(false);
  });

  it("missing one required edge gives partial (not full) credit", () => {
    const b = BUILDS[0];
    const res = perfectResponse(b.id);
    res.edges.pop(); // drop one required edge
    const g = gradeBuild(b, res);
    expect(g.score).toBeLessThan(1);
    expect(g.score).toBeGreaterThan(0);
    expect(g.correct).toBe(false);
  });

  it("buildsForConcept returns challenges by slug", () => {
    const b = BUILDS[0];
    expect(buildsForConcept(b.concept).map((x) => x.id)).toContain(b.id);
  });
});
