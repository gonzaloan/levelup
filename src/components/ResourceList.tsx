"use client";
// A compact list of primary sources. Used inline in the daily brief ("go
// deeper") and in lessons. Each row states the KIND up front so a learner can
// triage by budget: a 40-minute paper and a 5-minute doc page shouldn't look
// identical. External links are marked and open in a new tab with rel=noopener.
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { KIND_LABEL, type Resource } from "@/lib/resources";

export function ResourceList({
  locale, resources, heading, compact = false,
}: {
  locale: Locale;
  resources: Resource[];
  /** Omit inside a section that already has its own header (e.g. a domain group);
   *  passing `null` suppresses the eyebrow rather than repeating "Primary sources". */
  heading?: string | null;
  compact?: boolean;
}) {
  if (resources.length === 0) return null;
  const label = heading === null ? null : (heading ?? m("res.heading", locale));
  return (
    <section className={compact ? "reslist reslist-compact" : "card reslist"}>
      {label && <p className="eyebrow">{label}</p>}
      <ul className="reslist-items">
        {resources.map((r) => (
          <li key={r.id} className="reslist-item">
            <a className="reslist-link" href={r.url} target="_blank" rel="noopener noreferrer">
              <span className="reslist-kind" data-kind={r.kind}>{t(KIND_LABEL[r.kind], locale)}</span>
              <span className="reslist-title">{r.title}</span>
              {r.essential && <span className="reslist-star" title={m("res.essential", locale)}>★</span>}
              <span className="reslist-ext" aria-hidden="true">↗</span>
            </a>
            <p className="reslist-why">{t(r.why, locale)}</p>
            {(r.author || r.year) && (
              <p className="reslist-meta">
                {[r.author, r.year].filter(Boolean).join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
