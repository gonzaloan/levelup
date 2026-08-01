"use client";
/**
 * One Codex entry.
 *
 * The anatomy is FIXED and identical for every entry in the reference, in this
 * order. That uniformity is the feature: a reference whose entries have different
 * shapes cannot be scanned, and the reader learns the layout once and then reads
 * by position rather than by hunting.
 *
 *   1. term                 the thing being named
 *   2. definition           what it IS, plain words — always visible, never folded
 *   3. diagram              the authored figure, right after the words it illustrates
 *   4. when / cost          the two lines a design review actually needs, side by side
 *   5. cheaper first        the option to rule out before reaching for this
 *   6. how it works         the mechanism — behind a fold, because a reference is
 *                           consulted more often than it is read
 *   7. failure mode         how it breaks
 *   8. numbers + source     the checkable part
 *
 * Two disclosure levels, never more: everything through (5) is visible, (6)-(7)
 * sit behind ONE native <details>. Deeper hierarchies measure badly, and a
 * reference is the surface where a reader is least willing to click twice.
 *
 * The `cost` line gets the accent rule rather than the definition, because `cost`
 * is what makes this a reference with an opinion instead of a glossary. A cost
 * stated as a bound is the editorial position of the whole module.
 */
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { AXIS_BY_ID } from "@/lib/axes";
import { CONCEPT_BY_SLUG } from "@/lib/curriculum";
import { Schematic } from "./Schematic";
import { getWidget } from "./viz";
import { FigureZoom } from "./FigureZoom";
import type { CodexEntry } from "@/lib/types";

const LABEL = {
  when: { en: "When to reach for it", es: "Cuándo recurrir a esto" },
  cost: { en: "What it costs", es: "Qué cuesta" },
  cheaper: { en: "Try this first", es: "Prueba esto primero" },
  how: { en: "How it works, and how it breaks", es: "Cómo funciona y cómo se rompe" },
  fails: { en: "Failure mode", es: "Cómo falla" },
  numbers: { en: "Figures", es: "Cifras" },
  taughtIn: { en: "Taught in the ladder", es: "Se enseña en la escalera" },
  needs: { en: "Read first", es: "Leer antes" },
  source: { en: "Source", es: "Fuente" },
} as const;

export function CodexEntryCard({
  locale, entry, resolveTerm, headingLevel = 3,
}: {
  locale: Locale;
  entry: CodexEntry;
  /** Renders a prerequisite slug as its human term — the parent owns the index. */
  resolveTerm: (slug: string) => string;
  headingLevel?: 2 | 3;
}) {
  const Widget = entry.visual ? getWidget(entry.visual.widgetId) : null;
  const hasDiagram = !!entry.diagram && entry.diagram.kind !== "none";
  const Heading = headingLevel === 2 ? "h2" : "h3";

  // Spine concepts this entry deepens. Resolved here rather than authored, so a
  // renamed concept can't leave a dead link in the content.
  const taughtIn = (entry.relatedConcepts ?? [])
    .map((slug) => {
      const ctx = CONCEPT_BY_SLUG.get(slug);
      return ctx ? { slug, ctx } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <article className="cx-entry" id={`e-${entry.slug}`}>
      <div className="cx-entry-head">
        <Heading className="cx-term">{t(entry.term, locale)}</Heading>
        {entry.prerequisites?.length > 0 && (
          <p className="cx-prereq">
            <span className="eyebrow">{t(LABEL.needs, locale)}</span>
            {entry.prerequisites.map((p) => (
              <a key={p} href={`#e-${p}`} className="cx-prereq-chip">{resolveTerm(p)}</a>
            ))}
          </p>
        )}
      </div>

      {/* The definition. Always visible — it is the reason the entry exists. */}
      <p className="cx-def">{t(entry.definition, locale)}</p>

      {/* The figure, immediately after the words it illustrates. A widget beats a
          static schematic (you can manipulate it), so it wins when both exist. */}
      {Widget ? (
        <div className="cx-figure">
          <FigureZoom locale={locale} label={entry.term}>
            {/* The Codex is AI-track material throughout, so the widget always
                gets the AI accent rather than inheriting an ambient track. */}
            <Widget locale={locale} track="ai" params={entry.visual?.params} />
          </FigureZoom>
        </div>
      ) : hasDiagram ? (
        <div className="cx-figure">
          <FigureZoom locale={locale} label={entry.term}>
            <Schematic spec={entry.diagram!} locale={locale} />
          </FigureZoom>
        </div>
      ) : null}

      {/* The two lines a design review needs. Paired deliberately: a trigger
          without its price is how a pattern gets adopted for the wrong reason. */}
      <dl className="cx-pair">
        <div>
          <dt className="eyebrow">{t(LABEL.when, locale)}</dt>
          <dd>{t(entry.whenToUse, locale)}</dd>
        </div>
        <div className="cx-pair-cost">
          <dt className="eyebrow">{t(LABEL.cost, locale)}</dt>
          <dd>{t(entry.cost, locale)}</dd>
        </div>
      </dl>

      {/* The cheaper option, in its own frame. This is the line most likely to
          save a reader a quarter of work, so it does not hide behind a fold. */}
      <p className="cx-cheaper">
        <span className="eyebrow">{t(LABEL.cheaper, locale)}</span>
        {t(entry.cheaperFirst, locale)}
      </p>

      {/* One fold, one level deep. The mechanism and the failure mode: needed when
          you are implementing, noise when you are only checking what a term means. */}
      <details className="cx-fold">
        <summary>{t(LABEL.how, locale)}</summary>
        <div className="cx-foldbody">
          <p className="prose">{t(entry.howItWorks, locale)}</p>
          <p className="cx-failure">
            <span className="eyebrow">{t(LABEL.fails, locale)}</span>
            {t(entry.failureMode, locale)}
          </p>
          {entry.numbers && t(entry.numbers, locale).trim() && (
            <p className="cx-numbers">
              <span className="eyebrow">{t(LABEL.numbers, locale)}</span>
              <span className="mono">{t(entry.numbers, locale)}</span>
            </p>
          )}
        </div>
      </details>

      {/* Cross-links INTO the ladder. This is what keeps the Codex from becoming a
          second copy of the curriculum: it points at where a concept is actually
          taught rather than teaching it again. */}
      {taughtIn.length > 0 && (
        <p className="cx-taught">
          <span className="eyebrow">{t(LABEL.taughtIn, locale)}</span>
          {taughtIn.map(({ slug, ctx }) => (
            <Link
              key={slug}
              href={`/${locale}/lesson/${ctx.domainId}-${ctx.level.toLowerCase()}`}
              className="cx-taught-link"
            >
              {t(ctx.concept.title, locale)}
              <span className="cx-taught-meta mono">
                {t(AXIS_BY_ID[ctx.axisId].short, locale)} · {ctx.level}
              </span>
            </Link>
          ))}
        </p>
      )}

      {/* Every entry is checkable. A reference that cannot be verified is a
          reference that will quietly rot. */}
      <p className="cx-source">
        <a href={entry.source} target="_blank" rel="noreferrer noopener">
          {t(LABEL.source, locale)} ↗
        </a>
      </p>
    </article>
  );
}

export default CodexEntryCard;
