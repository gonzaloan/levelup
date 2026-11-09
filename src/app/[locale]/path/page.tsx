import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { domainIndex, getConcept, getPath } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { Icon } from "@/components/Icon";
import { LevelBadge } from "@/components/Bits";
import { MasteredDot, ProgressMeter } from "@/components/Mastered";
import { ContinueCard } from "@/components/Continue";

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
  const phases = getPath();
  let n = 0;
  const order = phases.flatMap((p) => p.modules.flatMap((m) => m.concepts.map((id) => ({ id, t: t(getConcept(id)!.title, locale), m: t(m.title, locale) }))));
  return (
    <main className="page path-page">
      <header className="page-head plain">
        <div>
          <p className="eyebrow">{es ? "Empieza aquí" : "Start here"}</p>
          <h1>{es ? "Ruta de estudio" : "Study path"}</h1>
          <p className="page-sub">
            {es
              ? "Todo el temario en el orden en que conviene aprenderlo. Por cada concepto: léelo (5 minutos), practícalo y deja que el repaso espaciado lo traiga de vuelta antes de que lo olvides."
              : "The whole syllabus in the order worth learning it. For each concept: read it (5 minutes), practice it, and let spaced repetition bring it back before you forget."}
          </p>
        </div>
      </header>
      <ContinueCard order={order} locale={locale} />
      <ol className="path-how">
        <li><Icon name="book" size={18} /><span><strong>{es ? "Lee" : "Read"}</strong> {es ? "el concepto: la frase clave, el diagrama, el ejemplo." : "the concept: one-liner, diagram, example."}</span></li>
        <li><Icon name="cards" size={18} /><span><strong>{es ? "Practica" : "Practice"}</strong> {es ? "sus ejercicios: decisiones, diagramas, código y estimaciones." : "its exercises: judgment calls, diagrams, code and estimates."}</span></li>
        <li><Icon name="cycle" size={18} /><span><strong>{es ? "Repasa" : "Review"}</strong> {es ? "a diario: la sesión de hoy mezcla lo que está por olvidarse." : "daily: today's session mixes what you're about to forget."}</span></li>
      </ol>
      {phases.map((p) => (
        <section key={p.id} className="path-phase">
          <div className="phase-head">
            <h2>{t(p.title, locale)}</h2>
            <p>{t(p.goal, locale)}</p>
          </div>
          <div className="module-grid">
            {p.modules.map((mod) => (
              <article key={mod.id} className="module-card">
                <header>
                  <h3>{t(mod.title, locale)}</h3>
                  <ProgressMeter ids={mod.concepts} label={es ? "estudiados" : "studied"} />
                </header>
                <ol className="module-list">
                  {mod.concepts.map((id) => {
                    const c = getConcept(id)!;
                    n++;
                    return (
                      <li key={id} style={{ ["--h" as string]: hueFor(domainIndex(c.domain)) }}>
                        <Link href={`/${locale}/c/${id}/`}>
                          <span className="ml-n">{n}</span>
                          <MasteredDot id={id} />
                          <span className="ml-t">{t(c.title, locale)}</span>
                          {c.level === "staff" && <LevelBadge level={c.level} locale={locale} />}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
                <a className="btn module-practice" href={`/${locale}/practice/play/?mode=module&id=${mod.id}`}><Icon name="cards" size={15} /> {es ? "Practicar módulo" : "Practice module"}</a>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
