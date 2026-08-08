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
import { CLUSTERS, searchCodex, searchClusters } from "../src/lib/codex";

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

describe("a family chip never points at an anchor that is not there", () => {
  /**
   * `CodexPrimer` renders each chip as an in-page `#e-<slug>` anchor, which is only
   * real where that cluster's entries are rendered. Putting the primer into SEARCH
   * results broke that silently: measured 0 targets on the page for
   * `#e-context-window-as-budget`. It is the same defect this module shipped once
   * before — 80 of 92 cross-links pointed at absent anchors, the link "worked" and
   * the destination did not.
   *
   * The structural fix is that `onChipClick` is a REQUIRED prop: a caller that
   * cannot guarantee the anchor exists must say what happens instead, so forgetting
   * is a type error rather than a dead link. These assertions guard that the seam
   * stays required and that both call sites keep answering — vitest is node-only
   * here, so this reads source; Playwright drives the actual click.
   */
  const PRIMER_SRC = read("src/components/CodexPrimer.tsx");

  it("the chip behaviour is a required prop, not an optional one", () => {
    // `onChipClick?:` would let a future call site fall back to the dead anchor.
    expect(PRIMER_SRC).toMatch(/onChipClick:\s*\(slug: string\)\s*=>/);
    expect(PRIMER_SRC, "an optional prop reinstates the defect").not.toMatch(/onChipClick\?:/);
  });

  it("prevents the native jump unless the caller asks for it", () => {
    expect(PRIMER_SRC).toMatch(/onChipClick\(slug\)\s*!==\s*"anchor"[\s\S]{0,40}preventDefault/);
  });

  it("every call site passes it, and the search one does not claim the anchor", () => {
    const sites = [...VIEW.matchAll(/<CodexPrimer[\s\S]*?\/>/g)].map((m) => m[0]);
    expect(sites.length, "expected the browse and search call sites").toBe(2);
    for (const s of sites) expect(s, `a call site omits onChipClick:\n${s}`).toMatch(/onChipClick=/);
    // Exactly one may return "anchor" — browse, which renders the entries. The other
    // must navigate instead, which is what setMode/setOpenCluster do.
    const anchoring = sites.filter((s) => /"anchor"/.test(s));
    expect(anchoring.length, "only browse mode may use the in-page anchor").toBe(1);
    // The search site must NAVIGATE. Asserted as "it calls the shared navigation
    // helper", not as a list of the state setters: the first version of this matched
    // `setOpenCluster` inline and broke when the fix correctly moved that into
    // `goToEntry` — a test coupled to the implementation it was meant to outlive.
    const navigating = sites.find((s) => !/"anchor"/.test(s))!;
    expect(navigating, "the search call site must navigate to the entry").toMatch(/goToEntry\(/);
    // And the scroll must not depend on a hashchange event, because assigning a hash
    // its current value emits none.
    //
    /**
     * Asserted WITHOUT a character window, because two windows in a row were wrong.
     *
     * First a proximity match to `goToEntry` broke when the scroll correctly moved into
     * an effect. Then the replacement's negative assertion — "no
     * `requestAnimationFrame` within 200 characters of `scrollIntoView`" — was measured
     * BLIND: reinstating the rAF leaves 513 characters between them, so the defect it
     * existed to prohibit passed with the gate green. A hand-picked distance is a
     * fixture, and it was the wrong fixture twice.
     *
     * The decision now lives in `src/lib/scrollTarget.ts` and is unit-tested there
     * without a DOM (tests/scroll-target.test.ts). What is left to assert in source is
     * only the WIRING, which needs no window: the component consumes the seam, and the
     * whole file contains no rAF at all — a flat `not.toContain`, which cannot have a
     * blind spot the way a windowed match can.
     */
    expect(VIEW, "the component must consume the scroll seam").toMatch(/scrollPlan\(/);
    expect(VIEW, "the scroll must live in an effect").toMatch(/useEffect\([\s\S]*?scrollIntoView/);
    // Comments stripped first: the file explains the rAF race in prose, and the third
    // version of this assertion failed on its own history lesson. Same shape as the
    // no-fold assertion above, and as the `analytics` gate that counted the word
    // "plausible" in a comment as a tracking call — in this repo, a code assertion has
    // to say it means CODE.
    const code = VIEW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code, "no requestAnimationFrame in code: it is what lost the race")
      .not.toContain("requestAnimationFrame");
    expect(navigating, "the hash is a record, written without re-entering the listener")
      .toMatch(/history\.replaceState/);
    expect(navigating, "assigning location.hash reinstates the missed-event defect")
      .not.toMatch(/location\.hash\s*=/);
  });
});

describe("a cluster's own name finds it in the Codex's own search", () => {
  /**
   * The defect this guards is the primer layer repeating, one level up, the very
   * failure it was built to fix.
   *
   * `searchCodex` indexes `term`, `definition` and `whenToUse` of ENTRIES. So the
   * primers — 11 sections whose whole job is to define the umbrella term — shipped
   * INVISIBLE to the search box. Measured on the shipped data before `searchClusters`
   * existed: "context engineering", "agent pattern" and "vector index" each returned
   * ZERO results. A reader typed a cluster's own name and the reference that had just
   * defined it answered "Nothing matches that yet".
   *
   * That is worse than it sounds, because `CodexView` puts the search box ABOVE the
   * mode switch on the stated grounds that "I already know the word I want" is the
   * most common arrival. The orientation went into the one place the most common
   * arrival could not reach.
   */
  it.each(CLUSTERS.map((c) => [c.slug, c.title.en, c.title.es] as const))(
    "%s is findable by its own title",
    (slug, en, es) => {
      for (const [locale, title] of [["en", en], ["es", es]] as const) {
        const hits = searchClusters(title);
        expect(
          hits.map((h) => h.cluster.slug),
          `searching the ${locale} title "${title}" must surface ${slug}`
        ).toContain(slug);
      }
    }
  );

  it("finds a cluster by a term only its PRIMER contains", () => {
    // The point of indexing the primer rather than just the title. Each probe is a
    // phrase that appears in a primer's whatItIs/axisOfChoice and is NOT the title,
    // so a title-only index would fail every one of them.
    const PROBES: [string, string][] = [
      ["retrieval-augmented generation", "evaluation"],
      ["tools and credentials", "security"],
    ];
    for (const [q, slug] of PROBES) {
      // Assert the probe actually tests what it claims. The first version of this
      // used "untrusted content", which lives in an ENTRY rather than in the
      // security primer — so it was testing the entry index while claiming to test
      // the primer one, and failed for the right reason on a wrong fixture.
      const cluster = CLUSTERS.find((c) => c.slug === slug)!;
      const p = cluster.primer!;
      const inPrimer = [p.whatItIs.en, p.axisOfChoice.en].join(" ").toLowerCase().includes(q.toLowerCase());
      expect(inPrimer, `"${q}" is not in ${slug}'s primer — the probe is wrong, not the code`).toBe(true);
      const inTitle = CLUSTERS.some((c) => `${c.title.en} ${c.title.es}`.toLowerCase().includes(q.toLowerCase()));
      expect(inTitle, `"${q}" is in a title, so it does not test the primer index`).toBe(false);
      expect(
        searchClusters(q).map((h) => h.cluster.slug),
        `"${q}" appears in ${slug}'s primer and must find it`
      ).toContain(slug);
    }
  });

  it("ranks a title match above a primer mention", () => {
    /**
     * The fixture must be a query where the tiers genuinely COMPETE.
     *
     * The first version used "chunking", which returns exactly ONE hit — no other
     * cluster's primer contains the word. With one hit, `hits[0]` is the answer
     * whatever the scores are, so the assertion was vacuous: an adversarial pass
     * showed it survived every ranking mutation, including ranking titles BELOW
     * primer mentions and flattening all five tiers to the same number. It was
     * proving a property of its own arithmetic, which is the exact class CLAUDE.md
     * records as having shipped here before.
     *
     * "agent" is a live fixture: `agent-patterns` matches on title, and three other
     * clusters match on their primers only.
     */
    const hits = searchClusters("agent");
    expect(hits.length, "the fixture must have competitors or it proves nothing")
      .toBeGreaterThan(1);
    expect(hits[0].cluster.slug, "the cluster TITLED agent-patterns must rank first")
      .toBe("agent-patterns");
    // And the ordering is by score, not incidental: every later hit scores strictly
    // lower than the title match, and the list is non-increasing throughout.
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].score, `hits are not sorted by score at index ${i}`)
        .toBeGreaterThanOrEqual(hits[i].score);
    }
  });

  it("ranks EN and ES titles identically", () => {
    // Spanish is authored here, not translated, so ranking it below English is a
    // defect. It was one: the index concatenated `title.en + title.es` into a single
    // haystack, which made the exact-match tier unreachable (you would have had to
    // type both languages) and capped the ES title at the `includes` tier because it
    // sits mid-string. Measured before the fix: "Vector indexes" 80, "Índices
    // vectoriales" 60, for 9 of 11 clusters.
    for (const c of CLUSTERS) {
      const en = searchClusters(c.title.en);
      const es = searchClusters(c.title.es);
      expect(en[0]?.cluster.slug, `EN title of ${c.slug} must find it`).toBe(c.slug);
      expect(es[0]?.cluster.slug, `ES title of ${c.slug} must find it`).toBe(c.slug);
      expect(es[0].score, `${c.slug}: ES title scores below EN`).toBe(en[0].score);
      // A full title typed exactly is the strongest possible signal.
      expect(en[0].score, `${c.slug}: an exact title should reach the top tier`).toBe(100);
    }
  });

  it("breaks ties by editorial cluster order, never alphabetically", () => {
    // `searchClusters` documents this, and the claim was unguarded: an adversarial
    // pass reversed the tie-break, swapped it for localeCompare, and deleted the
    // .sort() outright — all three survived. CLUSTERS is the reference's table of
    // contents and that order must survive into the results.
    const hits = searchClusters("model");
    const tied = hits.filter((h) => h.score === hits[hits.length - 1].score);
    expect(tied.length, "need several hits at one score to observe a tie").toBeGreaterThan(2);
    const order = new Map(CLUSTERS.map((c, i) => [c.slug, i]));
    const positions = tied.map((h) => order.get(h.cluster.slug)!);
    expect(positions, "tied hits must follow the authored cluster order")
      .toEqual([...positions].sort((a, b) => a - b));
    // And prove it is NOT alphabetical, or the assertion above could pass by luck.
    const alpha = [...tied].map((h) => h.cluster.slug).sort();
    expect(tied.map((h) => h.cluster.slug), "the tie-break happens to be alphabetical — pick a better fixture")
      .not.toEqual(alpha);
  });

  it("stays quiet on a query that matches nothing", () => {
    expect(searchClusters("zzzznotathing")).toEqual([]);
    expect(searchClusters("a"), "under 2 chars returns nothing, like searchCodex").toEqual([]);
  });

  it("refuses a query that matches most of the reference", () => {
    // The complementary bound, and the one that was missing: a search answering
    // everything is as useless as one answering nothing. Measured before the fix,
    // "the", "and" and "de" each returned ALL 11 clusters, rendering the whole table
    // of contents above the entry results the reader probably wanted.
    //
    // The English and Spanish function words are listed together on purpose: two
    // earlier versions of this rule each blocked one language's and let the other's
    // through ("and"/"de" are whole words of real titles; "to"/"se"/"con" are
    // prefixes of them).
    for (const q of ["the", "and", "de", "of", "la", "to", "in", "es", "se", "con", "que", "para", "una", "del"]) {
      expect(searchClusters(q), `"${q}" matches most primers and must be refused`).toEqual([]);
    }
    // The rule must not be a blanket cap: a real term that legitimately hits many
    // clusters still answers, because it NAMES one of them.
    const many = searchClusters("model");
    expect(many.length, "a real topic may match many clusters and must survive").toBeGreaterThan(3);
    expect(many[0].cluster.slug).toBe("model-strategy");
  });

  it("the over-match bound is symmetric across locales", () => {
    /**
     * The defect this guards was introduced BY the bound above, and it reintroduced
     * the original complaint for one language only: `searchClusters("modelo")`
     * returned NOTHING while "model" returned its cluster.
     *
     * Cause: the exemption was "a title equals the query or starts with it", and 10
     * of 11 Spanish titles open with a different word than their English pair —
     * "Model strategy" is "Estrategia de modelos" — because Spanish leads with the
     * generic noun. So a Spanish content word almost never reached that tier. The
     * exemption is now a content-word stem match, which is locale-shaped rather than
     * English-shaped.
     *
     * Derived from the shipped titles rather than a hardcoded list, so a new cluster
     * is covered the day it lands.
     */
    for (const c of CLUSTERS) {
      const words = (s: string) =>
        s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
          .split(/[^a-z0-9]+/).filter((w) => w.length >= 5);
      for (const [locale, title] of [["en", c.title.en], ["es", c.title.es]] as const) {
        for (const w of words(title)) {
          expect(
            searchClusters(w).length,
            `${c.slug}: the ${locale} title word "${w}" returns nothing — the bound is not symmetric`
          ).toBeGreaterThan(0);
          // And the singular of a plural title word must work too, which is the exact
          // case that failed: "modelo" against "modelos".
          if (w.endsWith("s")) {
            expect(
              searchClusters(w.slice(0, -1)).length,
              `${c.slug}: "${w.slice(0, -1)}" (singular of "${w}") returns nothing`
            ).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("scores a title PREFIX above a title substring", () => {
    /**
     * The prefix tier, asserted on the SCORE rather than on an ordering.
     *
     * A mutation dropping tier 80 to 10 survived every ordering assertion, and the
     * reason is structural: both of a cluster's titles feed one `Math.max`, so a
     * query that prefixes the EN title almost always also appears inside the ES one
     * ("agent" prefixes "Agent patterns" and sits inside "patrones de agentes").
     * Demoting the prefix tier therefore just falls through to `includes`, and the
     * cluster keeps its position. The tier is real and useful — it is what puts a
     * cluster you named ahead of one that merely contains the word — but it is only
     * observable as a value, so that is what this checks.
     */
    /**
     * The fixture must be a query that prefixes ONE of a cluster's titles and sits
     * mid-string in the OTHER, because that is the only shape that observes the
     * `Math.max` across the two titles.
     *
     * "retrieval" was the first choice and does not: it appears only in
     * `retrieval-ranking`'s English title, so replacing `Math.max` with a plain
     * assignment left the score at 80 and the mutation survived. "agent" is one of
     * exactly four queries that do — it prefixes "Agent patterns" and sits inside
     * "patrones de agentes", so a last-wins assignment silently demotes it 80 → 60.
     * (The others are model, context and vector.) Fourth time this session that a
     * correctly-written assertion had a fixture which could not exercise its branch.
     */
    const prefix = searchClusters("agent").find((h) => h.cluster.slug === "agent-patterns")!;
    const substring = searchClusters("patterns").find((h) => h.cluster.slug === "agent-patterns")!;
    expect(prefix, "fixture gone: agent-patterns must match 'agent'").toBeTruthy();
    expect(substring, "fixture gone: agent-patterns must match 'patterns'").toBeTruthy();
    expect(prefix.score, "a title the query PREFIXES must outscore one that merely contains it")
      .toBeGreaterThan(substring.score);
    // And an exact title beats both, which the tier ladder promises.
    const exact = searchClusters("Agent patterns")[0];
    expect(exact.cluster.slug).toBe("agent-patterns");
    expect(exact.score).toBeGreaterThan(prefix.score);
  });

  it("sorts by score before breaking ties", () => {
    // Deleting the `b.score - a.score` clause survived the tie-break assertions,
    // because those only inspect hits that are already tied. This pins the primary
    // key: a lower-scoring hit must never precede a higher-scoring one.
    for (const q of ["agent", "model", "retrieval", "context"]) {
      const scores = searchClusters(q).map((h) => h.score);
      expect(scores.length, `"${q}" needs several hits to observe the ordering`).toBeGreaterThan(1);
      expect(scores, `"${q}" is not ordered by score`).toEqual([...scores].sort((a, b) => b - a));
      // And the set genuinely contains more than one score, or the check is vacuous.
      expect(new Set(scores).size, `"${q}" is a single-tier fixture and proves nothing`)
        .toBeGreaterThan(1);
    }
  });

  /**
   * DELETED: "exempts a query LONGER than the title word, not just shorter".
   *
   * It described a branch the code does not have. The stem match ran both directions
   * at one point; measuring showed the reverse (`q.startsWith(w)`) was not merely
   * dead but actively wrong — its only reachable effect was exempting function words
   * via the 1-2 character title words "de", "e" and "y", which is the defect the
   * over-match bound exists to stop. The branch was removed; the test outlived it.
   *
   * Its fixtures could not fail either way ("vectores" 2 hits, "agentes" 1 hit, both
   * far under the 7.33 threshold, so the exemption was never consulted) — the same
   * vacuity its own comment warned about for "contextos". A test that cannot fail and
   * documents a branch that does not exist is worse than no test: it reports coverage
   * of both.
   */

  it("derives the over-match threshold from the cluster count", () => {
    // CLAUDE.md: "derive counts from the spine, never hardcode them." An adversarial
    // pass found that replacing `(CLUSTERS.length * 2) / 3` with the literal 7.34
    // broke no test, so the derivation had no guard.
    const src = read("src/lib/codex.ts");
    expect(src, "the bound must scale with the cluster count").toMatch(
      /hits\.length\s*>\s*\(CLUSTERS\.length\s*\*\s*2\)\s*\/\s*3/
    );
  });

  it("does not replace entry search — both surfaces still answer", () => {
    // `searchClusters` is additive. An entry-level query must still reach entries,
    // or fixing the cluster gap would have broken the case that already worked.
    const entryHits = searchCodex("hnsw");
    expect(entryHits.map((h) => h.entry.slug)).toContain("hnsw-index");
  });
});

describe("an enumerated taxonomy has an entry per member", () => {
  /**
   * A KNOWN GAP, recorded as a failing-if-it-worsens ratchet rather than papered over.
   *
   * `rag-failure-taxonomy.howItWorks` names seven failure points (FP1..FP7) and the
   * cluster ships six entries — FP7 "incomplete" has none. Both adversarial reviewers
   * found this independently, and both concluded it is a CONTENT gap rather than a
   * primer defect: the primer claims nothing false (its rule says "each of these",
   * not "the seven"), and no primer can manufacture a missing entry. Weakening the
   * primer to hide it would be the wrong repair.
   *
   * So the assertion is on the COUNT, pinned at what ships. It documents the hole at
   * the place someone will next touch this cluster, and it fails if a seventh member
   * gets enumerated without an entry — while turning green the moment
   * `rag-incomplete-answer` is authored, at which point KNOWN_MISSING drops to 0.
   *
   * A plain "every FP has an entry" test would fail today and get skipped, which
   * teaches nothing. A ratchet is the shape this repo already uses for prose and
   * trace baselines: it can only shrink.
   */
  const KNOWN_MISSING = 1;   // FP7 incomplete — drop to 0 when its entry lands

  it("the RAG failure taxonomy is short exactly the entries we know about", () => {
    const entries = CLUSTERS.flatMap((c) => c.entries);
    const taxonomy = entries.find((e) => e.slug === "rag-failure-taxonomy");
    expect(taxonomy, "rag-failure-taxonomy is gone — this ratchet needs rewriting").toBeTruthy();

    // Count the FPn labels the taxonomy itself enumerates, rather than hardcoding 7:
    // if the source it summarizes adds a failure point, the denominator moves with it.
    const enumerated = new Set(
      [...taxonomy!.howItWorks.en.matchAll(/\bFP(\d+)\b/g)].map((m) => m[1])
    );
    const authored = entries.filter((e) => /^rag-(missing|missed|not-|wrong|incorrect)/.test(e.slug));

    expect(enumerated.size, "the taxonomy should enumerate its members as FP1..FPn").toBeGreaterThan(1);
    expect(
      enumerated.size - authored.length,
      `${enumerated.size} failure points enumerated, ${authored.length} with entries — ` +
      `expected exactly ${KNOWN_MISSING} missing (FP7 incomplete). If this grew, an ` +
      `enumerated failure point shipped without an entry; if it shrank, lower KNOWN_MISSING.`
    ).toBe(KNOWN_MISSING);
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
