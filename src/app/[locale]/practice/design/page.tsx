import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { t } from "@/lib/i18n";
import { conceptsOf, getDomain } from "@/lib/content";
import { DESIGN_DOMAINS, TOTAL_MINUTES } from "@/lib/design-round";
import { Illustration } from "@/components/Visual";
import { LevelBadge } from "@/components/Bits";
import { BestScore } from "@/components/practice/DesignRound";
import { RandomCase } from "@/components/practice/RandomCase";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/practice/design/", locale === "es" ? "Ronda de system design" : "System design round", locale === "es" ? "Simulacro cronometrado con rúbrica sobre casos reales de entrevista." : "A timed mock with a rubric on real interview cases.");
}


export default async function DesignIndex({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  const groups = DESIGN_DOMAINS.map((d) => ({ d: getDomain(d)!, cases: conceptsOf(d).filter((c) => c.id.startsWith("case-")) }));
  return (
    <main className="page design-page">
      <header className="page-head plain">
        <div>
          <h1>{es ? "Ronda de system design" : "System design round"}</h1>
          <p className="page-sub">{es
            ? `Un simulacro de ${TOTAL_MINUTES} minutos: requisitos, estimaciones, API y datos, arquitectura, deep dives y cierre. Al final te evalúas con una rúbrica y ves tu punto más débil. Mejor aún con un amigo: cada caso trae una hoja para quien entrevista.`
            : `A ${TOTAL_MINUTES}-minute mock: requirements, estimates, API and data, architecture, deep dives and wrap-up. Then a rubric shows your weakest dimension. Better with a friend: every case has a sheet for the interviewer.`}</p>
          <RandomCase ids={groups.flatMap((g) => g.cases.map((c) => c.id))} locale={locale} label={es ? "Caso al azar" : "Random case"} />
        </div>
      </header>
      {groups.map(({ d, cases }) => (
        <section key={d.id} className="code-group">
          <h2>{t(d.title, locale)}</h2>
          <ul className="code-list">
            {cases.map((c) => (
              <li key={c.id}>
                <Link href={`/${locale}/practice/design/${c.id}/`}>
                  <Illustration id={c.id} size={22} />
                  <span className="cl-title">{t(c.title, locale)}</span>
                  <LevelBadge level={c.level} locale={locale} />
                  <BestScore caseId={c.id} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
