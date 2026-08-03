// Does the glossary describe the platform that actually ships?
//
// `tools/check-glossary.cjs` enforces the glossary against the content and
// `tools/selftest-glossary.cjs` attacks that enforcement. This file covers the third
// question: does the glossary agree with the SOURCE — the terms the app renders, the
// fields the content model defines, the policy document's claims.
//
// The interesting assertions are the ones about the decisions rather than the shape.
// A glossary can be perfectly well-formed and still be wrong about its own corpus.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";

type Term = {
  term: string;
  canonical: string;
  spanish_usage: string;
  translate: boolean;
  first_use_explanation: string;
  aliases: string[];
  avoid: string[];
  note?: string;
  usage: { en: number; esCanonical: number; englishFormInSpanish: number; ratio: number; verdict: string };
};
type Glossary = { sourceLanguage: string; language: string; reviewState: string; terms: Term[] };

const load = (lang: "en" | "es"): Glossary => {
  const p = `content/glossary.${lang}.json`;
  expect(existsSync(p), `${p} was never generated — run node tools/gen-glossary.cjs`).toBe(true);
  return JSON.parse(readFileSync(p, "utf8"));
};

const EN = load("en");
const ES = load("es");
const byTerm = new Map(EN.terms.map((t) => [t.term, t]));

describe("the glossary's shape is what section 13 requires", () => {
  it("declares English as the source language in both files", () => {
    // The owner's standing instruction: English is the master language, Spanish is a
    // first-class option. A glossary that named `es` as the source would invert it.
    for (const g of [EN, ES]) expect(g.sourceLanguage).toBe("en");
  });

  it("carries every term in both files, with the same decisions", () => {
    expect(EN.terms.length).toBe(ES.terms.length);
    expect(EN.terms.length).toBeGreaterThan(100);
    for (let i = 0; i < EN.terms.length; i++) {
      const a = EN.terms[i], b = ES.terms[i];
      expect(a.term).toBe(b.term);
      expect(a.translate, `${a.term}.translate differs between files`).toBe(b.translate);
      expect(a.spanish_usage).toBe(b.spanish_usage);
      expect(a.avoid).toEqual(b.avoid);
    }
  });

  it("localizes first_use_explanation and nothing else", () => {
    for (let i = 0; i < EN.terms.length; i++) {
      expect(
        EN.terms[i].first_use_explanation,
        `${EN.terms[i].term} has the same explanation in both files — the es one is untranslated`
      ).not.toBe(ES.terms[i].first_use_explanation);
    }
  });

  it("has no duplicate term or alias", () => {
    const seen = new Map<string, string>();
    for (const t of EN.terms) {
      for (const k of [t.term, ...t.aliases].map((s) => s.toLowerCase())) {
        expect(seen.get(k) ?? t.term, `"${k}" is claimed twice`).toBe(t.term);
        seen.set(k, t.term);
      }
    }
  });
});

describe("the translate flag agrees with the corpus", () => {
  it("a term kept in English has spanish_usage equal to its canonical form", () => {
    for (const t of EN.terms) {
      if (!t.translate) expect(t.spanish_usage.toLowerCase()).toBe(t.canonical.toLowerCase());
      else expect(t.spanish_usage.toLowerCase()).not.toBe(t.canonical.toLowerCase());
    }
  });

  it("every decision that contradicts the measurement carries a written note", () => {
    // This is the assertion that keeps the glossary honest. The ratio is measured, so a
    // `translate` flag disagreeing with it is a judgment call — and an unexplained
    // judgment call is indistinguishable from a mistake.
    const unexplained: string[] = [];
    for (const t of EN.terms) {
      const { verdict } = t.usage;
      const contradicts =
        (!t.translate && verdict === "localized") ||
        (t.translate && verdict === "kept") ||
        verdict === "inconsistent";
      if (contradicts && !t.note) unexplained.push(`${t.term} (${verdict}, translate=${t.translate})`);
    }
    expect(unexplained, "a decision contradicts its own measurement with no explanation").toEqual([]);
  });

  it("no term bans its own canonical or Spanish form", () => {
    for (const t of EN.terms) {
      for (const bad of t.avoid) {
        expect(bad.toLowerCase()).not.toBe(t.canonical.toLowerCase());
        expect(bad.toLowerCase()).not.toBe(t.spanish_usage.toLowerCase());
      }
    }
  });

  it("never bans an acronym's own expansion", () => {
    // Section 13 asks for a first_use_explanation, and "objetivo de nivel de servicio
    // (SLO)" IS that explanation. The first draft banned the expansions of SLO, SLI,
    // SLA, ADR, DLQ, MCP, LLM and RAG — forbidding the exact practice the glossary
    // exists to encourage.
    const violations: string[] = [];
    for (const t of EN.terms) {
      const isAcronym = /^[A-Z][A-Z0-9]{1,6}$/.test(t.term);
      if (!isAcronym) continue;
      for (const bad of t.avoid) {
        // An expansion is a multi-word phrase; a calque of an acronym is not.
        if (bad.trim().split(/\s+/).length >= 3) violations.push(`${t.term} bans "${bad}"`);
      }
    }
    expect(violations, "an acronym expansion is banned").toEqual([]);
  });

  it("excludes `principal`, which measures as kept but is a false friend", () => {
    // ratio 2.09 — on paper the most strongly kept term in the corpus, and actually the
    // ordinary Spanish adjective for "main". Recorded as a test so it cannot be added
    // back by a future pass over the same measurement.
    expect(byTerm.has("principal"), "`principal` is a false friend, not a glossary term").toBe(false);
  });
});

describe("the terms are the ones the corpus actually teaches", () => {
  it("covers the RAG and reliability vocabulary the routes are built on", () => {
    // A spot-check that would fail if the glossary were seeded from a generic word list
    // rather than from this corpus.
    for (const t of ["chunking", "retrieval", "reranking", "embedding", "SLO", "backpressure", "idempotency", "toil"]) {
      expect(byTerm.has(t), `${t} is core vocabulary and has no glossary entry`).toBe(true);
    }
  });

  it("every entry has real evidence behind it", () => {
    // A term nobody uses should not be in the glossary; it makes the list look thorough
    // and teaches nothing.
    const unused = EN.terms.filter((t) => t.usage.en + t.usage.esCanonical < 4);
    expect(unused.map((t) => t.term), "a glossary term barely appears in the content").toEqual([]);
  });

  it("explanations are sentences, not labels", () => {
    for (const t of EN.terms) {
      expect(t.first_use_explanation.length, `${t.term}'s explanation is too short`).toBeGreaterThan(24);
      expect(t.first_use_explanation, `${t.term}'s explanation does not end as a sentence`).toMatch(/[.!?]$/);
    }
    for (const t of ES.terms) {
      expect(t.first_use_explanation.length).toBeGreaterThan(24);
    }
  });

  it("the Spanish explanations are actually Spanish", () => {
    // Two Spanish regressions were introduced during this transformation, so an
    // untranslated field is a real failure mode rather than a theoretical one.
    //
    // The comparison is EN-vs-ES function words, not "does it contain Spanish". A
    // one-sided list flagged two perfectly good sentences — "Cuántos resultados
    // recuperados se pasan adelante" and "Correr recuperación léxica y vectorial
    // juntas" — because short Spanish can be written with few articles. What actually
    // distinguishes the two languages is which set dominates, and English prose of this
    // length cannot avoid `the`/`and`/`of`/`to`.
    const ES_FUNCTION =
      /(?<![A-Za-zÀ-ÿ])(que|de|la|el|los|las|un|una|unos|unas|con|para|por|se|su|sus|al|del|es|son|no|más|menos|cuando|donde|cada|sin|sobre|entre|desde|hasta|y|o|lo|le|ya|si|así|pero|como|cuántos|cuánto|cuánta)(?![A-Za-zÀ-ÿ])/gi;
    const EN_FUNCTION =
      /(?<![A-Za-zÀ-ÿ])(the|and|of|to|in|is|are|that|which|with|for|from|it|its|as|by|on|at|be|has|have|you|your|not|but|than|when|where|each|without|about|between|how|much|many)(?![A-Za-zÀ-ÿ])/gi;
    const wrong: string[] = [];
    for (const t of ES.terms) {
      const s = t.first_use_explanation;
      const es = (s.match(ES_FUNCTION) || []).length;
      const en = (s.match(EN_FUNCTION) || []).length;
      if (es <= en) wrong.push(`${t.term} (es:${es} en:${en}) — ${s.slice(0, 60)}`);
    }
    expect(wrong, "a Spanish explanation reads as English").toEqual([]);
  });
});

describe("the scanner reads every file with learner-facing prose", () => {
  // The blind spot this exists for: `builds.json` was missing from glossary-scan.cjs's
  // FILES list, so the 6 Architecture Builder challenges were never checked. One of them
  // shipped "pipeline de trozeo y embebido" — `trozeo` being a calque of `chunking` — and
  // the gate reported 0 occurrences, which was true of the files it read and false of the
  // platform.
  //
  // A validator's file list is part of its claim, so it is asserted rather than trusted.
  it("scans every content data file, so no file is silently exempt", () => {
    const scanner = readFileSync("tools/glossary-scan.cjs", "utf8");
    // `[a-z-]+` missed `ai-l5.json` and `general-l5.json` because of the digit, so this
    // test reported them unscanned after they had been added. A detector that cannot see
    // a filename is indistinguishable from a file that is not listed — the same class of
    // error as the `\b` boundary and the `it(`-only test count.
    const listed = [...scanner.matchAll(/"([\w.-]+\.json)"/g)].map((m) => m[1]);
    const onDisk = readdirSync("src/content/data").filter((f) => f.endsWith(".json"));
    const unscanned = onDisk.filter((f) => !listed.includes(f));
    expect(unscanned, "a content file is not checked for banned terminology").toEqual([]);
  });

  it("the corpus it builds actually contains build-challenge prose", () => {
    // Asserting the FILES list is necessary and not sufficient — the walker could read
    // the file and drop its strings. This checks a string that exists ONLY in
    // builds.json reaches the scanned corpus.
    const { corpus } = require("../tools/glossary-scan.cjs");
    const es = (corpus().es as string[]).join("\n");
    const builds = JSON.parse(readFileSync("src/content/data/builds.json", "utf8"));
    const sample = (builds.builds ?? builds)[0].prompt.es as string;
    expect(es, "build-challenge Spanish is not in the scanned corpus").toContain(sample.slice(0, 40));
  });
});

describe("the policy document and the data agree", () => {
  const policy = readFileSync("docs/transformation/terminology-policy.md", "utf8");

  it("the policy exists and names English as the source of truth", () => {
    expect(policy).toMatch(/English is the master language/);
  });

  it("the term count in the policy matches the generated files", () => {
    // A document that states a number the data contradicts is the failure mode these
    // docs have. Deriving the assertion from the data rather than restating the number
    // is what makes this test worth having.
    const m = policy.match(/\*\*(\d+) terms\*\*/);
    expect(m, "the policy does not state a term count").toBeTruthy();
    expect(Number(m![1]), "the policy's term count is stale").toBe(EN.terms.length);
  });

  it("the kept/localized split in the policy matches the generated files", () => {
    const kept = EN.terms.filter((t) => !t.translate).length;
    const localized = EN.terms.length - kept;
    // Matched by regex rather than substring: the doc writes the sentence-ending period
    // inside the bold markers ("**82 kept in English, 46 localized.**"), and a literal
    // `toContain` failed on the punctuation while the numbers were already correct.
    // A gate that fails on formatting teaches the next person to stop trusting it.
    const m = policy.match(/\*\*(\d+) kept in English, (\d+) localized\.?\*\*/);
    expect(m, "the policy does not state a kept/localized split").toBeTruthy();
    expect([Number(m![1]), Number(m![2])], "the policy's kept/localized split is stale")
      .toEqual([kept, localized]);
  });

  it("the banned-rendering count in the policy matches the generated files", () => {
    const bans = EN.terms.reduce((a, t) => a + t.avoid.length, 0);
    expect(policy, `the policy's ban count is stale (should be ${bans})`)
      .toContain(`### \`avoid\` — ${bans} banned renderings`);
  });

  it("the baseline is documented and every line is a real term", () => {
    const lines = readFileSync("tools/glossary-baseline.txt", "utf8")
      .split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean);
    expect(lines.length, "the baseline is empty — did the debt really go to zero?").toBeGreaterThan(0);
    expect(policy, "the policy's baseline count is stale").toContain(`lists **${lines.length}** banned renderings`);
    for (const line of lines) {
      const [term, rendering] = line.split("|");
      const entry = byTerm.get(term);
      expect(entry, `the baseline names "${term}", which is not a glossary term`).toBeTruthy();
      expect(entry!.avoid, `the baseline excuses "${rendering}" for ${term}, but ${term} does not ban it`)
        .toContain(rendering);
    }
  });
});
