import { describe, expect, it } from "vitest";
import fs from "node:fs";
// @ts-expect-error — plain ESM tooling module without types
import { loadDomains, listConceptFiles, validateConcept } from "../tools/content-lib.mjs";

const domains = loadDomains();
const gold = JSON.parse(fs.readFileSync("content/concepts/rag/reranking.json", "utf8"));
const file = "content/concepts/rag/reranking.json";
const errs = (c: unknown) => validateConcept(c, file, domains).errors as string[];

describe("concept validator", () => {
  it("accepts the gold-standard concept", () => {
    expect(errs(gold)).toEqual([]);
  });
  it("rejects a dangling [[link]]", () => {
    const c = structuredClone(gold);
    c.explain.en += " See [[not-a-concept]].";
    expect(errs(c).join()).toMatch(/not-a-concept/);
  });
  it("rejects an untranslated Spanish field", () => {
    const c = structuredClone(gold);
    c.example.es = c.example.en;
    expect(errs(c).join()).toMatch(/example/);
  });
  it("rejects a related id that does not exist", () => {
    const c = structuredClone(gold);
    c.related = ["hybrid-search", "nope"];
    expect(errs(c).join()).toMatch(/nope/);
  });
  it("rejects styling in diagrams", () => {
    const c = structuredClone(gold);
    c.diagram.code += "\n  style Q fill:#f00";
    expect(errs(c).join()).toMatch(/style/);
  });
  it("rejects unknown fields (typos)", () => {
    const c = structuredClone(gold);
    c.exmaple = c.example;
    expect(errs(c).join()).toMatch(/unknown field/);
  });
});

describe("shipped content", () => {
  it("every concept file passes the validator", () => {
    const bad: string[] = [];
    for (const f of listConceptFiles()) {
      const c = JSON.parse(fs.readFileSync(f, "utf8"));
      for (const e of validateConcept(c, f, domains).errors) bad.push(`${c.id}: ${e}`);
    }
    expect(bad).toEqual([]);
  });
  it("concept ids are unique across domains", () => {
    const all = domains.flatMap((d: { concepts: string[] }) => d.concepts);
    expect(new Set(all).size).toBe(all.length);
  });
});
