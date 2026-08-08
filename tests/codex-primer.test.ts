// The cluster primer: data invariants, and the WIRING the merge gate cannot see.
//
// `merge-codex.cjs --check` already validates the authored shape of every primer.
// This file covers the two things it structurally cannot:
//
//   1. Properties of the SHIPPED data read through `src/lib/codex.ts` — the same
//      module the app renders from. The merge script reads the JSON directly, so a
//      primer that is valid on disk and invisible through the lib would pass it.
//   2. The RENDER WIRING. A primer that no component reads is 11 clusters of dead
//      content that every gate reports as green. This project has shipped that
//      exact class of defect before (widget ids that rendered nothing, a missing
//      hero image, an OG card whose absence 404'd), which is why `check-refs.cjs`
//      exists — and why a new field gets a wiring assertion on day one.
//
// The wiring assertions read SOURCE, not a render: vitest here is node-only by
// design (no jsdom, see CLAUDE.md). That limit is real — this proves the component
// is imported and the field is passed, not that a glyph is on screen. Playwright
// covers the rendered side.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CLUSTERS } from "../src/lib/codex";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const VIEW = read("src/components/CodexView.tsx");
const PRIMER = read("src/components/CodexPrimer.tsx");

describe("every shipped cluster has a primer", () => {
  // The state this field was created to fix: 11 of 11 clusters oriented the
  // reader with one line of tagline before handing over up to 18 sibling
  // techniques. A primer that is merely OPTIONAL in the type must still be
  // PRESENT on every shipped cluster, or the descent has holes in it.
  it.each(CLUSTERS.map((c) => c.slug))("%s has one", (slug) => {
    const cluster = CLUSTERS.find((c) => c.slug === slug)!;
    expect(cluster.primer, `${slug} ships without a primer`).toBeTruthy();
  });

  it("covers all 11, so no cluster is a flat list", () => {
    expect(CLUSTERS.filter((c) => c.primer).length).toBe(CLUSTERS.length);
  });
});

describe("the families are a TOTAL partition of the cluster", () => {
  // The load-bearing property, asserted here as well as in the merge gate
  // because it is the one that fails SILENTLY: a families list that drops an
  // entry still renders, and every family in it still looks complete. It
  // re-creates the orphan defect one level above the one we just organized.
  it.each(CLUSTERS.map((c) => c.slug))("%s: every entry in exactly one family", (slug) => {
    const cluster = CLUSTERS.find((c) => c.slug === slug)!;
    const own = cluster.entries.map((e) => e.slug);
    const claimed = (cluster.primer?.families ?? []).flatMap((f) => f.entries);

    // No duplicates: an entry in two families makes the grouping meaningless.
    expect(new Set(claimed).size, `${slug}: an entry is claimed twice`).toBe(claimed.length);
    // Total: named explicitly, because "counts differ" sends someone hunting.
    const missing = own.filter((s) => !claimed.includes(s));
    expect(missing, `${slug}: entries in no family`).toEqual([]);
    const foreign = claimed.filter((s) => !own.includes(s));
    expect(foreign, `${slug}: families name entries from another cluster`).toEqual([]);
  });
});

describe("a primer's family chips can always be navigated to", () => {
  // Each chip is an in-page `#e-<slug>` anchor, and `CodexEntryCard` renders
  // `id={`e-${entry.slug}`}`. Since the partition is per-cluster and browse mode
  // renders the selected cluster's entries, every chip's target is on the page.
  // Asserted rather than assumed: the 87%-broken deep links this module already
  // shipped were exactly this — a link that worked and a destination that did not.
  it("every chip slug names an entry that renders an anchor in the same cluster", () => {
    for (const c of CLUSTERS) {
      const own = new Set(c.entries.map((e) => e.slug));
      for (const f of c.primer?.families ?? []) {
        for (const slug of f.entries) {
          expect(own.has(slug), `${c.slug}: chip #e-${slug} has no anchor in this cluster`).toBe(true);
        }
      }
    }
  });
});

describe("the primer is actually RENDERED", () => {
  // Without these three, a valid primer on every cluster and a passing gate are
  // compatible with the reader seeing nothing at all.
  it("CodexView imports the component", () => {
    expect(VIEW).toMatch(/import\s*\{\s*CodexPrimer\s*\}\s*from\s*"\.\/CodexPrimer"/);
  });

  it("CodexView passes the cluster's own primer to it", () => {
    // The prop must come from `c.primer` — the cluster being rendered. An earlier
    // version of this assertion only checked that `<CodexPrimer` appeared, which
    // would pass on a component handed the wrong cluster's primer.
    expect(VIEW).toMatch(/<CodexPrimer[^>]*primer=\{c\.primer\}/s);
  });

  it("renders above the entry list, which is the whole point of a descent", () => {
    const at = VIEW.indexOf("<CodexPrimer");
    const entries = VIEW.indexOf('className="cx-entries"');
    expect(at).toBeGreaterThan(-1);
    expect(entries).toBeGreaterThan(-1);
    expect(at, "the primer must precede the entries it orients").toBeLessThan(entries);
  });
});

describe("the primer renders all five parts of the descent", () => {
  // The order IS the teaching: umbrella, forcing problem, axis, families, choice.
  // A component that quietly stopped rendering `axisOfChoice` would leave the
  // single most useful sentence in the module invisible with every gate green.
  it.each(["whatItIs", "whyItExists", "axisOfChoice", "families", "howToChoose"])(
    "reads primer.%s",
    (field) => {
      expect(PRIMER).toContain(`primer.${field}`);
    }
  );

  it("keeps them in the general-to-specific order the field exists for", () => {
    const order = ["whatItIs", "whyItExists", "axisOfChoice", "families", "howToChoose"]
      .map((f) => PRIMER.indexOf(`primer.${f}`));
    expect(order.every((i) => i > -1)).toBe(true);
    for (let i = 1; i < order.length; i++) {
      expect(order[i], `primer.${["whatItIs", "whyItExists", "axisOfChoice", "families", "howToChoose"][i]} is out of order`)
        .toBeGreaterThan(order[i - 1]);
    }
  });

  it("nothing in the primer hides behind a fold", () => {
    // Deliberate, and the opposite of the entry card's choice: an entry is
    // CONSULTED so folding its mechanism is right, but a primer is what a lost
    // reader needs and a fold is what a lost reader does not open.
    //
    // Comments are stripped first. The first version matched raw source and failed
    // on the word "cx-fold" inside the very comment explaining why there is no
    // fold — a test asserting a property of its own prose rather than of the JSX.
    const code = PRIMER
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/<details|className="[^"]*cx-fold/);
  });
});

describe("the primer is bilingual through the same helper as everything else", () => {
  it("renders every field through t(), never a raw .en", () => {
    // A raw `.en` would ship English into the Spanish locale silently.
    expect(PRIMER).not.toMatch(/primer\.\w+\.en\b/);
    expect(PRIMER).toMatch(/\bt\(primer\.whatItIs, locale\)/);
  });

  it("has both locales on every authored field of every cluster", () => {
    for (const c of CLUSTERS) {
      const p = c.primer!;
      const fields: { en: string; es: string }[] = [
        p.whatItIs, p.whyItExists, p.axisOfChoice,
        ...p.families.flatMap((f) => [f.label, f.rule]),
        ...p.howToChoose,
      ];
      for (const f of fields) {
        expect(typeof f.en === "string" && f.en.trim().length > 0, `${c.slug}: empty en`).toBe(true);
        expect(typeof f.es === "string" && f.es.trim().length > 0, `${c.slug}: empty es`).toBe(true);
        expect(f.es, `${c.slug}: es is untranslated`).not.toBe(f.en);
      }
    }
  });
});

describe("the primer cites figures the cluster can support", () => {
  // Contract rule 3. Checked here against the SHIPPED entries rather than the
  // authoring fact sheet, so it keeps holding after an entry is edited: a primer
  // is a summary of what is below it, and a number that appears nowhere below is
  // a claim the reference cannot back.
  it.each(CLUSTERS.map((c) => c.slug))("%s: whyItExists states a number", (slug) => {
    const c = CLUSTERS.find((x) => x.slug === slug)!;
    expect(/\d/.test(c.primer!.whyItExists.en), `${slug}: no figure in whyItExists`).toBe(true);
    expect(/\d/.test(c.primer!.whyItExists.es), `${slug}: no figure in Spanish whyItExists`).toBe(true);
  });
});

describe("the families are a grouping, not a rename of the entry list", () => {
  // Contract rule 6, measured as INFLATION (most families are singletons) rather
  // than as "no singleton family". The stricter version fired on correct content:
  // the honest carve of `vector-indexes` is exhaustive / in-memory-approximate /
  // out-of-core, and two of those three really do have one member, because that is
  // how the index families divide. An outlier is not a defect; one group per entry
  // is, because it adds no structure the entry list did not already have.
  it.each(CLUSTERS.map((c) => c.slug))("%s", (slug) => {
    const c = CLUSTERS.find((x) => x.slug === slug)!;
    const fams = c.primer!.families;
    expect(fams.length, `${slug}: needs >=2 families`).toBeGreaterThanOrEqual(2);
    if (c.entries.length >= 4) {
      const singles = fams.filter((f) => f.entries.length === 1);
      expect(
        singles.length,
        `${slug}: ${singles.length} of ${fams.length} families have one entry — that is a rename`
      ).toBeLessThanOrEqual(fams.length / 2);
    }
  });
});

describe("every howToChoose step is a question in both locales", () => {
  // Contract rule 5. A step the reader cannot check about their own situation is
  // not a step, and the mechanical proxy for "checkable" is that it asks.
  it.each(CLUSTERS.map((c) => c.slug))("%s", (slug) => {
    const c = CLUSTERS.find((x) => x.slug === slug)!;
    const steps = c.primer!.howToChoose;
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps.length).toBeLessThanOrEqual(5);
    for (const s of steps) {
      expect(s.en, `${slug}: EN step is not a question`).toMatch(/\?/);
      expect(s.es, `${slug}: ES step is not a question`).toMatch(/\?/);
    }
  });
});

describe("an acronym the Codex leans on is expanded somewhere in it", () => {
  // The contract's HEADLINE example, and it survived the first primer pass: "RAG"
  // appeared 126 times across codex.json, six entry slugs start with `rag-`, and
  // the phrase "retrieval-augmented generation" appeared ZERO times in codex.json
  // OR lessons.json. A reader who does not already own the vocabulary met the
  // acronym as a bare label 126 times and was never told what it stands for.
  //
  // Asserted against the whole Codex rather than one field, because WHERE it is
  // expanded is an editorial choice (it landed in the evaluation cluster's
  // `Named failure points` family rule, next to the six `rag-` entries) while
  // WHETHER it is expanded is not.
  const ACRONYMS: [string, RegExp, RegExp][] = [
    ["RAG", /\bRAG\b/, /retrieval-augmented generation/i],
  ];

  const blob = JSON.stringify(
    JSON.parse(readFileSync(path.join(ROOT, "src/content/data/codex.json"), "utf8"))
  );

  it.each(ACRONYMS)("%s is expanded at least once", (name, short, long) => {
    // Only require the expansion if the Codex actually uses the acronym — a rule
    // that fires on an acronym nobody wrote would be firing on nothing.
    if (!short.test(blob)) return;
    expect(long.test(blob), `${name} is used but never expanded anywhere in the Codex`).toBe(true);
  });

  it("expands RAG in Spanish too, not only in English", () => {
    // An expansion that exists only in `en` leaves the Spanish reader exactly
    // where the English one was — which is the defect, not half of it.
    const es = /generaci[óo]n aumentada por recuperaci[óo]n/i;
    expect(es.test(blob), "RAG is expanded only in English").toBe(true);
  });
});

describe("one model's documented limit has one value across the Codex", () => {
  // Found by attacking the primers' figures and landing on a defect in the ENTRIES:
  // `fixed-size-chunking` cited text-embedding-3-small's input limit as 8,191 tokens
  // and `embedding-vector-geometry` said 8192, in three of its own fields. Each entry
  // was internally consistent and each cluster's primer agreed with its own cluster,
  // so every existing gate passed — the disagreement only existed BETWEEN clusters,
  // which is precisely where nothing was looking. OpenAI documents 8191, which is
  // also what that entry's own `source` page states, so 8192 was simply wrong.
  //
  // Scoped to a figure that is a NAMED MODEL'S DOCUMENTED CONSTANT, because those are
  // the only ones that must agree everywhere. A number that legitimately differs by
  // context (a chunk size, a latency, an engine's default) would make this rule fire
  // on correct content — 8192 still appears three times in the Codex for jina-v2's
  // window, Bedrock's maxTokens ceiling and vLLM's max_num_batched_tokens, and all
  // three are right.
  const CONSTANTS: { model: RegExp; wrong: RegExp; right: string }[] = [
    { model: /text-embedding-3/, wrong: /8192/, right: "8,191 / 8.191" },
  ];

  const entries = CLUSTERS.flatMap((c) => c.entries.map((e) => ({ cluster: c.slug, e })));

  /**
   * Every authored string inside a value, at any depth.
   *
   * The first version of this helper searched `JSON.stringify(entry)` with a
   * `[^"]{0,80}` window around the figure, and it was BLIND — it passed with the
   * real defect restored. A quote-excluding window cannot cross the `"` that
   * separates two JSON fields, so the model name (in one field) and the wrong
   * figure (in another field of the same entry) never landed in one run: 0 of 14
   * candidate runs contained both. The regex also required `\d{4}`, which does not
   * match the CORRECT form `8,191` at all, so the pattern was wrong twice over.
   *
   * Walking the object and testing each leaf string keeps the unit the same as the
   * unit an author writes in: one field, one claim.
   */
  function strings(value: unknown, out: string[] = []): string[] {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) for (const v of value) strings(v, out);
    else if (value && typeof value === "object") for (const v of Object.values(value)) strings(v, out);
    return out;
  }

  it.each(CONSTANTS.map((c) => [c.model.source, c] as const))(
    "%s states one input limit everywhere",
    (_name, spec) => {
      const offenders = entries
        .flatMap(({ cluster, e }) =>
          strings(e)
            // A field only makes the claim if it names the model AND states the
            // wrong figure. Both in one field, which is the unit of an assertion.
            .filter((s) => spec.model.test(s) && spec.wrong.test(s))
            .map(() => `${cluster}/${e.slug}`)
        );
      expect([...new Set(offenders)], `should read ${spec.right}`).toEqual([]);
    }
  );
});

describe("the primer does not restate an entry", () => {
  // Contract rule 8, as the mechanically checkable half: a primer field that
  // duplicates an entry's definition verbatim is the level below wearing the
  // level above's label. Judgment about near-paraphrase stays with reviewers.
  it("shares no long verbatim run with any entry definition in its cluster", () => {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    for (const c of CLUSTERS) {
      const p = c.primer!;
      const primerText = norm([p.whatItIs.en, p.whyItExists.en, p.axisOfChoice.en].join(" "));
      for (const e of c.entries) {
        const def = norm(e.definition.en);
        // A 12-word run is long enough that shared phrasing is copying rather
        // than two authors reaching for the same short idiom.
        const words = def.split(" ");
        for (let i = 0; i + 12 <= words.length; i++) {
          const run = words.slice(i, i + 12).join(" ");
          expect(primerText.includes(run), `${c.slug}: primer repeats ${e.slug}'s definition verbatim ("${run}")`).toBe(false);
        }
      }
    }
  });
});
