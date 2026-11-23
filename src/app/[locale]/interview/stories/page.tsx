import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { t } from "@/lib/i18n";
import { getConcept } from "@/lib/content";
import { LPS_SOURCE } from "@/lib/stories";
import { StoryBank } from "@/components/StoryBank";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/interview/stories/", locale === "es" ? "Banco de historias STAR" : "STAR story bank", locale === "es" ? "Tus historias conductuales, etiquetadas por competencia, con cobertura y práctica cronometrada." : "Your behavioral stories, tagged by competency, with coverage and a timed drill.");
}

export default async function StoriesPage({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  const star = getConcept("behavioral-star");
  return (
    <main className="page stories-page">
      <header className="page-head plain">
        <div>
          <h1>{es ? "Banco de historias STAR" : "STAR story bank"}</h1>
          <p className="page-sub">{es
            ? "En la ronda conductual se repiten las mismas competencias. Escribe 6–8 historias fuertes, etiquétalas y practica contarlas en dos minutos."
            : "Behavioral rounds probe the same competencies again and again. Write 6–8 strong stories, tag them and practice telling them in two minutes."}</p>
          {star && <p><Link href={`/${locale}/c/${star.id}/`}>{t(star.title, locale)} →</Link></p>}
        </div>
      </header>
      <StoryBank locale={locale} />
      <p className="lab-note">{es ? "Leadership Principles: los 16 oficiales de Amazon" : "Leadership Principles: Amazon's official 16"} (<a href={LPS_SOURCE.url} target="_blank" rel="noopener noreferrer">{es ? "fuente" : "source"}</a>, {es ? "revisado" : "checked"} {LPS_SOURCE.checked}). {es ? "Las preguntas son ilustrativas." : "Questions are illustrative."}</p>
    </main>
  );
}
