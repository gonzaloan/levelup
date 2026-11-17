import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { LOCALES, t } from "@/lib/i18n";
import { domainIndex, getConcept, getLab, getLabs } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { Icon } from "@/components/Icon";
import { Emoji } from "@/components/Visual";
import { LabView } from "@/components/labs/registry";

type P = { params: Promise<{ locale: Locale; id: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.flatMap((locale) => getLabs().map((l) => ({ locale, id: l.id })));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, id } = await params;
  const l = getLab(id);
  return l ? { title: t(l.title, locale), description: t(l.blurb, locale) } : {};
}

export default async function LabPage({ params }: P) {
  const { locale, id } = await params;
  const lab = getLab(id);
  if (!lab) notFound();
  const es = locale === "es";
  const concepts = lab.concepts.map(getConcept).filter((c): c is NonNullable<typeof c> => !!c);
  return (
    <main className="page lab-page">
      <p className="crumbs-line"><Link href={`/${locale}/labs/`}><Icon name="left" size={14} /> Labs</Link></p>
      <header className="lab-head">
        <Emoji name={lab.art} size={52} className="head-ill" />
        <div>
          <h1>{t(lab.title, locale)}</h1>
          <p className="page-sub">{t(lab.blurb, locale)}</p>
        </div>
      </header>
      <section className="lab" aria-label={t(lab.title, locale)}>
        <LabView id={lab.id} locale={locale} />
      </section>
      <section className="lab-learn">
        <h2 className="section-label">{es ? "Conceptos detrás de este lab" : "Concepts behind this lab"}</h2>
        <div className="related-chips">
          {concepts.map((c) => <Link key={c.id} href={`/${locale}/c/${c.id}/`} className="related-chip" title={t(c.tldr, locale)} style={{ ["--h" as string]: hueFor(domainIndex(c.domain)) }}>{t(c.title, locale)}</Link>)}
        </div>
      </section>
    </main>
  );
}
