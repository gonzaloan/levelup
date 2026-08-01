"use client";
/**
 * A real reference architecture, redrawn.
 *
 * The rule that makes this worth shipping: every one comes from a vendor doc that
 * was actually fetched, and the tradeoffs are the ones the doc states rather than
 * the ones that would make the shape look good. `source` is therefore not a
 * footnote — it is the claim, and it renders as a link the reader can check.
 *
 * The diagram is authored inline SVG through the existing Schematic renderer.
 * Diffusion art is never used here: a generated "architecture diagram" would be
 * confidently wrong in the details, which is the one thing a reference cannot be.
 *
 * Anatomy, fixed for every architecture:
 *   problem -> when this shape -> the drawing -> components -> flow -> tradeoffs
 *   -> failure modes -> source
 * Components and flow are visible because they are the shape. Tradeoffs and
 * failure modes sit behind one fold: needed when you are choosing, noise when you
 * are only recognizing.
 */
import { t, type Locale } from "@/i18n/config";
import { Schematic } from "./Schematic";
import { FigureZoom } from "./FigureZoom";
import type { CodexArchitecture } from "@/lib/types";

const LABEL = {
  problem: { en: "The problem it solves", es: "El problema que resuelve" },
  when: { en: "When you would reach for this shape", es: "Cuándo recurrir a esta forma" },
  parts: { en: "Components", es: "Componentes" },
  flow: { en: "How the request moves", es: "Cómo se mueve la solicitud" },
  weigh: { en: "Tradeoffs and how it fails", es: "Compensaciones y cómo falla" },
  tradeoffs: { en: "What you trade", es: "Qué cedes" },
  fails: { en: "Failure modes", es: "Modos de falla" },
  source: { en: "Redrawn from", es: "Redibujada desde" },
} as const;

/** The vendor whose doc this came from. A label, not a badge — no logos. */
const VENDOR: Record<string, string> = {
  aws: "AWS", gcp: "Google Cloud", azure: "Azure", anthropic: "Anthropic", other: "—",
};

export function CodexArchitectureCard({ locale, arch }: { locale: Locale; arch: CodexArchitecture }) {
  return (
    <article className="cx-arch" id={`a-${arch.slug}`}>
      <div className="cx-arch-head">
        <h2 className="cx-arch-name">{t(arch.name, locale)}</h2>
        <span className="cx-vendor mono">{VENDOR[arch.vendor] ?? arch.vendor}</span>
      </div>

      <p className="cx-def">{t(arch.problem, locale)}</p>

      <p className="cx-cheaper">
        <span className="eyebrow">{t(LABEL.when, locale)}</span>
        {t(arch.whenThisShape, locale)}
      </p>

      <div className="cx-figure">
        <FigureZoom locale={locale} label={arch.name}>
          <Schematic spec={arch.diagram} locale={locale} />
        </FigureZoom>
      </div>

      <div className="cx-arch-grid">
        <div>
          <p className="eyebrow">{t(LABEL.parts, locale)}</p>
          <dl className="cx-parts">
            {arch.components.map((c, i) => (
              <div key={i} className="cx-part">
                <dt className="mono">{t(c.label, locale)}</dt>
                <dd>{t(c.role, locale)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <p className="eyebrow">{t(LABEL.flow, locale)}</p>
          <ol className="cx-flow">
            {arch.flow.map((f, i) => (
              <li key={i}>{t(f, locale)}</li>
            ))}
          </ol>
        </div>
      </div>

      <details className="cx-fold">
        <summary>{t(LABEL.weigh, locale)}</summary>
        <div className="cx-foldbody">
          <p className="eyebrow">{t(LABEL.tradeoffs, locale)}</p>
          <ul className="cp-list">
            {arch.tradeoffs.map((x, i) => <li key={i}>{t(x, locale)}</li>)}
          </ul>
          <p className="eyebrow" style={{ marginTop: "var(--s-4)" }}>{t(LABEL.fails, locale)}</p>
          <ul className="cp-list">
            {arch.failureModes.map((x, i) => <li key={i}>{t(x, locale)}</li>)}
          </ul>
        </div>
      </details>

      <p className="cx-source">
        <a href={arch.source} target="_blank" rel="noreferrer noopener">
          {t(LABEL.source, locale)} ↗
        </a>
      </p>
    </article>
  );
}

export default CodexArchitectureCard;
