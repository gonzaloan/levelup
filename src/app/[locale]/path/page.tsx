import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { domainIndex, getConcept, getPath } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { PathView, type PathPhaseView } from "@/components/PathView";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Ruta de estudio" : "Study path",
    description: locale === "es" ? "Por dónde empezar y en qué orden: 3 fases, de los fundamentos al nivel Staff." : "Where to start and in what order: 3 phases, from foundations to Staff level.",
  };
}

export default async function PathPage({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  const phases: PathPhaseView[] = getPath().map((p) => ({
    id: p.id, t: t(p.title, locale), goal: t(p.goal, locale),
    modules: p.modules.map((m) => ({
      id: m.id, t: t(m.title, locale),
      concepts: m.concepts.map((id) => { const c = getConcept(id)!; return { id, t: t(c.title, locale), h: hueFor(domainIndex(c.domain)) }; }),
    })),
  }));
  return (
    <main className="page path-page">
      <header className="page-head plain">
        <div>
          <h1>{es ? "Ruta de estudio" : "Study path"}</h1>
          <p className="page-sub">{es ? "Todo el temario en el orden en que conviene aprenderlo, de los fundamentos al nivel Staff." : "The whole syllabus in the order worth learning it, from foundations to Staff level."}</p>
        </div>
      </header>
      <PathView phases={phases} locale={locale} />
    </main>
  );
}
