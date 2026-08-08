"use client";
/**
 * The cluster primer — the level ABOVE the entries.
 *
 * WHY THIS COMPONENT EXISTS. The Codex shipped 107 individually well-formed
 * entries and was still hard to LEARN from: a cluster oriented the reader with one
 * line of tagline and then handed over up to 18 sibling techniques as a flat list.
 * "RAG" appeared 126 times in the data and was never defined. Twelve chunking
 * strategies shipped with nothing that said why a document must be cut at all.
 * Uniform excellence at the leaf does not compose into understanding at the root.
 *
 * So the primer is a general-to-specific DESCENT, and the reading order is the
 * teaching:
 *
 *   1. whatItIs      the umbrella term, defined. The reader may not have it yet.
 *   2. whyItExists   the forcing problem, with a figure. Motivation before method.
 *   3. axisOfChoice  the dimension every entry varies along — the single most
 *                    useful sentence, because it lets the reader classify a
 *                    technique they have never seen.
 *   4. families      the entries, sorted into named groups with a rule each.
 *   5. howToChoose   the ordered questions that land on one family.
 *
 * DISCLOSURE. Everything through the families is visible; `howToChoose` is visible
 * too. Nothing here folds. That is deliberate and it is the opposite of the entry
 * card's decision (which folds its mechanism behind a `<details>`): an entry is
 * CONSULTED, so hiding detail is right, while a primer is the thing a lost reader
 * needs, and a fold is exactly what a lost reader does not open. The whole primer
 * is capped at ~250 words of authored content by the contract, so it fits.
 *
 * The axis line gets the accent rule, mirroring how the entry card spends its one
 * unit of contrast on `cost`. Same reasoning: it marks the editorial position of
 * the level. An entry's position is "what does this cost"; a cluster's is "what
 * are you actually choosing between".
 *
 * Family entries render as ANCHOR CHIPS into the entry list below, so the primer
 * doubles as the cluster's table of contents — the grouping is not just told to
 * the reader, it is the navigation. The label resolution is passed in rather than
 * looked up here, because the parent already owns the index.
 */
import { t, type Locale } from "@/i18n/config";
import { ProseBlocks, blocksFrom } from "./lesson/Prose";
import type { CodexPrimer as Primer } from "@/lib/types";

const LABEL = {
  whatItIs: { en: "What it is", es: "Qué es" },
  whyItExists: { en: "Why it exists", es: "Por qué existe" },
  axis: { en: "What you are choosing between", es: "Entre qué estás eligiendo" },
  families: { en: "The families", es: "Las familias" },
  choose: { en: "How to choose", es: "Cómo elegir" },
} as const;

/**
 * Render one authored field through the shared prose renderer.
 *
 * Via `blocksFrom` rather than a bare `<p>` so the four authored marks
 * (`**bold**`, `` `code` ``, `- bullet`, `## label`) render here exactly as they
 * do in a lesson. A second, simpler renderer would drift from the first, and the
 * contract deliberately gives primer authors the same four marks and no others.
 */
function Field({ text, className }: { text: string; className?: string }) {
  return <ProseBlocks blocks={blocksFrom(text.split("\n"))} keyBase="pf" className={className} />;
}

export function CodexPrimer({
  locale, primer, resolveTerm,
}: {
  locale: Locale;
  primer: Primer;
  /** Slug → human term. The parent owns the index, so a rename can't dead-link. */
  resolveTerm: (slug: string) => string;
}) {
  return (
    <section className="cx-primer" aria-label={t(LABEL.whatItIs, locale)}>
      {/* 1 + 2. The definition and the forcing problem. Together they are the
          "from general" half of the descent, so they share one block and read as
          continuous prose rather than as two labelled cells. */}
      <div className="cx-primer-lead">
        <p className="eyebrow">{t(LABEL.whatItIs, locale)}</p>
        <Field text={t(primer.whatItIs, locale)} className="cx-primer-def" />
        <p className="eyebrow cx-primer-why-label">{t(LABEL.whyItExists, locale)}</p>
        <Field text={t(primer.whyItExists, locale)} className="cx-primer-why" />
      </div>

      {/* 3. The axis. Accented, because it is the sentence that turns a list of
             techniques into a decision the reader can make themselves. */}
      <div className="cx-primer-axis">
        <p className="eyebrow">{t(LABEL.axis, locale)}</p>
        <Field text={t(primer.axisOfChoice, locale)} />
      </div>

      {/* 4. The families. A total partition of the cluster (enforced by
             merge-codex.cjs), so this list IS the cluster's contents — every
             entry below appears in exactly one group. */}
      <div className="cx-primer-families">
        <p className="eyebrow">{t(LABEL.families, locale)}</p>
        <ul className="cx-famlist">
          {primer.families.map((f, i) => (
            <li key={i} className="cx-family">
              <p className="cx-family-label">{t(f.label, locale)}</p>
              <p className="cx-family-rule">{t(f.rule, locale)}</p>
              <p className="cx-family-entries">
                {f.entries.map((slug) => (
                  /* A plain <a> to the in-page anchor, matching the prerequisite
                     chips on an entry card. Next's <Link> would be a client-side
                     navigation to the same page, which does not move the reader. */
                  <a key={slug} href={`#e-${slug}`} className="cx-famchip">
                    {resolveTerm(slug)}
                  </a>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* 5. The decision procedure. An <ol>: these steps are ORDERED, and a
             reader who answers step 2 before step 1 has skipped the question that
             narrows the field. */}
      <div className="cx-primer-choose">
        <p className="eyebrow">{t(LABEL.choose, locale)}</p>
        <ol className="cx-choose">
          {primer.howToChoose.map((s, i) => (
            <li key={i}>{t(s, locale)}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
