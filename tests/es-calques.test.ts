import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// A standing check for the Spanish calques review has flagged, over the whole
// content corpus.
//
// This exists because a one-shot fix script does not hold. `tools/fix-es-r3.cjs`
// replaced "La complicación es por qué…" with "explica por qué…" — and one commit
// later, rewriting that same artifact for an unrelated reason, I typed the calque
// straight back in. The script could not catch it: it is a list of exact-match
// replacements that runs once. This is the same failure the traceability gate was
// built for, in the Spanish lane, so it gets the same treatment: a rule the tests
// enforce rather than a fix someone remembers to reapply.
//
// Scope is deliberately narrow — only forms confirmed as defects by review, with
// the legitimate uses excluded by pattern. Checking all 61 occurrences of
// "abortos" (transaction aborts) or "páginas" (B-tree pages) would fail on
// correct content, and a rule that fires on correct content trains people to
// bypass it.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = readFileSync(path.join(ROOT, "src/content/data/lessons.json"), "utf8");

/** Each entry: the calque, why it's wrong, and what to write instead. */
const CALQUES: { pattern: RegExp; why: string; instead: string }[] = [
  {
    // English "X is why Y" carried over literally. In Spanish a copula plus a
    // bare interrogative reads as an unfinished indirect question.
    //
    // Keyed on what FOLLOWS, not on the subject. The first version listed the
    // three subject nouns already found ("complicación|demanda correlacionada|
    // razón"), so it could only catch those three — and my own regression came
    // from rewriting an artifact, which is exactly when the subject changes. Four
    // plausible rephrasings all slipped past it. An article after "es por qué" is
    // the calque shape; the corpus's legitimate predicative uses are all followed
    // by a verb ("el arreglo es por qué sigue muriendo", "es por qué ganan"), so
    // this form excludes every one of them — and it immediately found a real
    // calque the subject-keyed version had missed.
    pattern: /\bes por qu[ée]\s+(?:el|la|los|las|un|una|esto|eso)\b/gi,
    why: 'English "is why" carried over literally',
    instead: '"es la razón por la que" / "explica por qué"',
  },
  {
    // Only where the subject is an ACT of speech or writing — "decir esto es cómo
    // una revisión…". The corpus's other uses are predicative and correct
    // ("equivocarse ahí es cómo las organizaciones terminan con…", where the
    // sentence really does predicate a manner), so they're excluded.
    pattern: /\b(?:decir|escribir|nombrar|afirmar)\s+\w+(?:\s+\w+)?\s+es cómo\b/gi,
    why: 'English "is how" carried over literally',
    instead: '"es lo que evita/logra…" / "así es como…"',
  },
  {
    // "triar" is not a Spanish verb in any conjugation; the noun is "triaje".
    pattern: /\btri(?:ar|é|ó|amos|aron|a|as)\b(?!je)/gi,
    why: '"triar" is not a Spanish verb',
    instead: '"hacer triaje" / "revisar" / "filtrar"',
  },
  {
    // Only the chaos-engineering sense, where "interrupción" is the right word.
    // "un aborto que atrapas y reintentas" (a transaction abort) and "interruptor
    // de aborto" are this corpus's own established vocabulary — 4 places written
    // before this rule, all correct, all excluded. A rule that fires on correct
    // content teaches people to bypass the validator.
    pattern: /\baborto\s+autom[áa]tico\b/gi,
    why: '"aborto" reads as abortion; a stop condition is an "interrupción"',
    instead: '"interrupción automática"',
  },
  {
    // "page" as an on-call verb. In Spanish "paginar" means to number pages.
    pattern: /\b(?:pagina|paginar)\s+(?:a\s+)?(?:un|el|alguien|humano)/gi,
    why: '"paginar" means to number pages, not to alert',
    instead: '"alertar" / "una alerta"',
  },
  {
    // The concept's own example says "declaración"; the artifact said
    // "atestación", about the same document, on the same pane.
    pattern: /\batestaci[óo]n\b/gi,
    why: 'inconsistent with the corpus\'s own "declaración"',
    instead: '"declaración"',
  },
];

describe("Spanish content has no known calques", () => {
  for (const { pattern, why, instead } of CALQUES) {
    it(`avoids ${pattern.source.slice(0, 44)}`, () => {
      const hits = [...CORPUS.matchAll(pattern)].map((m) => {
        const at = m.index ?? 0;
        return CORPUS.slice(Math.max(0, at - 60), at + 60).replace(/\\n/g, " ");
      });
      expect(hits, `${why} — write ${instead}`).toEqual([]);
    });
  }
});
