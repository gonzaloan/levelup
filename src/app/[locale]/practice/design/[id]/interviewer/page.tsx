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

// The interviewer's sheet for a peer mock: the same round as the candidate's page, seen from the
// other chair (reference open, push-back questions, a rubric that ends in written feedback).
type P = { params: Promise<{ locale: Locale; id: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.flatMap((locale) => designCases().map((c) => ({ locale, id: c.id })));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, id } = await params;
  const c = getConcept(id);
  const es = locale === "es";
  return c ? pageMeta(locale, `/practice/design/${id}/interviewer/`, `${es ? "Entrevista a un amigo" : "Interview a friend"}: ${t(c.title, locale)}`,
    es ? "Hoja de entrevistador para un mock de system design entre pares: qué escuchar, qué preguntar y una rúbrica." : "Interviewer sheet for a peer system design mock: what to listen for, what to ask, and a rubric.") : {};
}

export default async function InterviewerPage({ params }: P) {
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
          <p className="eyebrow">{es ? "Hoja del entrevistador" : "Interviewer sheet"}</p>
          <h1>{t(c.title, locale)}</h1>
          <p className="page-sub">{es ? "Tú haces de entrevistador. No le muestres esta página al candidato." : "You play the interviewer. Don't show this page to the candidate."}</p>
        </div>
      </header>
      <DesignRound caseId={c.id} title={t(c.title, locale)} phases={phases} rubric={rubric} locale={locale} role="interviewer" />
    </main>
  );
}
