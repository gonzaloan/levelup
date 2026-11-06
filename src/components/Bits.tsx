import Link from "next/link";
import type { Concept, Level, Locale } from "@/lib/types";
import { m, t } from "@/lib/i18n";
import { hueFor } from "@/lib/hue";
import { domainIndex, getDomain } from "@/lib/content";
import { MasteredDot } from "./Mastered";

export function LevelBadge({ level, locale }: { level: Level; locale: Locale }) {
  return <span className={`lvl lvl-${level}`}>{m(`level_${level}`, locale)}</span>;
}

export function DomainChip({ id, locale, link = true }: { id: string; locale: Locale; link?: boolean }) {
  const d = getDomain(id);
  if (!d) return null;
  const style = { ["--h" as string]: hueFor(domainIndex(id)) };
  return link
    ? <Link href={`/${locale}/d/${id}/`} className="chip" style={style}>{t(d.title, locale)}</Link>
    : <span className="chip" style={style}>{t(d.title, locale)}</span>;
}

/** A concept as a compact card: title, level, one-liner. */
export function ConceptCard({ c, locale, n, showDomain }: { c: Concept; locale: Locale; n?: number; showDomain?: boolean }) {
  return (
    <Link href={`/${locale}/c/${c.id}/`} className="concept-card" style={{ ["--h" as string]: hueFor(domainIndex(c.domain)) }}>
      <div className="cc-top">
        {n != null && <span className="cc-n">{String(n).padStart(2, "0")}</span>}
        <span className="cc-title">{t(c.title, locale)}</span>
        <MasteredDot id={c.id} />
      </div>
      <p className="cc-tldr">{t(c.tldr, locale)}</p>
      <div className="cc-foot">
        <LevelBadge level={c.level} locale={locale} />
        {showDomain && <DomainChip id={c.domain} locale={locale} link={false} />}
        {c.diagram && <span className="cc-has">◇ {m("diagram", locale)}</span>}
        {c.code && <span className="cc-has">{"</>"} {m("code", locale)}</span>}
      </div>
    </Link>
  );
}
