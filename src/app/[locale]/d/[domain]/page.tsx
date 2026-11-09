import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { LOCALES, t } from "@/lib/i18n";
import { conceptsOf, getDomain, getDomains, domainIndex } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { Icon } from "@/components/Icon";
import { ConceptCard } from "@/components/Bits";
import { ProgressMeter } from "@/components/Mastered";

type P = { params: Promise<{ locale: Locale; domain: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.flatMap((locale) => getDomains().map((d) => ({ locale, domain: d.id })));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, domain } = await params;
  const d = getDomain(domain);
  return d ? { title: t(d.title, locale), description: t(d.tagline, locale) } : {};
}

export default async function DomainPage({ params }: P) {
  const { locale, domain } = await params;
  const d = getDomain(domain);
  if (!d) notFound();
  const all = getDomains();
  const i = domainIndex(d.id);
  const prev = all[i - 1], next = all[i + 1];
  const concepts = conceptsOf(d.id);
  return (
    <main className="page domain-page" style={{ ["--h" as string]: hueFor(i) }}>
      <header className="page-head">
        <div className="dc-icon big"><Icon name={d.icon} size={28} /></div>
        <div>
          <p className="eyebrow">{String(i + 1).padStart(2, "0")} / {String(all.length).padStart(2, "0")}</p>
          <h1>{t(d.title, locale)}</h1>
          <p className="page-sub">{t(d.tagline, locale)}</p>
          <ProgressMeter ids={d.concepts} label={locale === "es" ? "estudiados" : "studied"} />
        </div>
      </header>
      <div className="concept-grid">
        {concepts.map((c, n) => <ConceptCard key={c.id} c={c} locale={locale} n={n + 1} />)}
      </div>
      <nav className="pager">
        {prev ? <Link href={`/${locale}/d/${prev.id}/`}><Icon name="left" size={16} /> {t(prev.title, locale)}</Link> : <span />}
        {next ? <Link href={`/${locale}/d/${next.id}/`}>{t(next.title, locale)} <Icon name="right" size={16} /></Link> : <span />}
      </nav>
    </main>
  );
}
