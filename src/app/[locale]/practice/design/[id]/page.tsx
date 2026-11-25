import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { LOCALES, t } from "@/lib/i18n";
import { getConcept } from "@/lib/content";
import { Icon } from "@/components/Icon";
import { Illustration } from "@/components/Visual";
import { DesignRound } from "@/components/practice/DesignRound";
import { buildRound, designCases } from "@/components/practice/designCase";

type P = { params: Promise<{ locale: Locale; id: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.flatMap((locale) => designCases().map((c) => ({ locale, id: c.id })));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, id } = await params;
  const c = getConcept(id);
  return c ? pageMeta(locale, `/practice/design/${id}/`, `${locale === "es" ? "Ronda" : "Round"}: ${t(c.title, locale)}`, t(c.tldr, locale)) : {};
}

export default async function DesignCasePage({ params }: P) {
  const { locale, id } = await params;
  const c = getConcept(id);
  if (!c || !designCases().some((x) => x.id === id)) notFound();
  const es = locale === "es";
  const { phases, rubric } = buildRound(c, locale);
  return (
    <main className="page round-page">
      <p className="crumbs-line"><Link href={`/${locale}/practice/design/`}><Icon name="left" size={14} /> {es ? "Ronda de system design" : "System design round"}</Link></p>
      <header className="lab-head">
        <Illustration id={c.id} size={52} className="head-ill" />
        <div>
          <p className="eyebrow">{es ? "Tu pregunta de entrevista" : "Your interview question"}</p>
          <h1>{t(c.title, locale)}</h1>
          <p className="page-sub">{es ? "Empieza preguntando: nadie te dará los requisitos completos." : "Start by asking: nobody hands you the full requirements."}</p>
        </div>
      </header>
      <DesignRound caseId={c.id} title={t(c.title, locale)} phases={phases} rubric={rubric} locale={locale} />
    </main>
  );
}
