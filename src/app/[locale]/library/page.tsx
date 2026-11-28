import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { m, t } from "@/lib/i18n";
import { allConcepts, getDomains, getLabs } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { Icon } from "@/components/Icon";
import { ProgressMeter } from "@/components/Mastered";

// The syllabus in three tracks. A topic missing here lands in the last one, so a new domain
// still shows up.
const TRACKS: { id: string; en: string; es: string; domains: string[] }[] = [
  { id: "swe", en: "Staff software engineering", es: "Ingeniería de software Staff", domains: ["coding", "systems", "sysdesign", "leadership"] },
  { id: "ai", en: "AI systems", es: "Sistemas de IA", domains: ["foundations", "prompting", "rag", "agents", "evals", "training", "inference", "security", "architecture", "design"] },
  { id: "ml", en: "Machine learning", es: "Machine learning", domains: ["ml", "mlops"] },
];

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return locale === "es"
    ? pageMeta(locale, "/library/", "Biblioteca", "Todos los temas, el mapa de arquitectura, el cheatsheet, las preguntas, los labs y el grafo de conceptos.")
    : pageMeta(locale, "/library/", "Library", "Every topic, the architecture map, the cheatsheet, the questions, the labs and the concept graph.");
}

export default async function Library({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  const domains = getDomains();
  const concepts = allConcepts();
  const stats = [
    [concepts.length, L("concepts")],
    [concepts.filter((c) => c.diagram).length, locale === "es" ? "diagramas" : "diagrams"],
    [concepts.filter((c) => c.code).length, locale === "es" ? "ejemplos de código" : "code samples"],
    [concepts.reduce((n, c) => n + c.interview.length, 0), L("questions")],
  ] as const;

  return (
    <main className="page library">
      <header className="page-head plain">
        <div>
          <h1>{locale === "es" ? "Biblioteca" : "Library"}</h1>
          <p className="page-sub">{locale === "es" ? `Todo el temario por tema (${concepts.length} conceptos) y las herramientas de consulta.` : `The whole syllabus by topic (${concepts.length} concepts) and the reference tools.`}</p>
        </div>
      </header>
      <nav className="lib-tools" aria-label={locale === "es" ? "Herramientas" : "Tools"}>
        {[
          ["map", "map", locale === "es" ? "Mapa de arquitectura" : "Architecture map"],
          ["cheatsheet", "list", "Cheatsheet"],
          ["questions", "message", locale === "es" ? `Preguntas (${stats[3][0]})` : `Questions (${stats[3][0]})`],
          ["labs", "sliders", `Labs (${getLabs().length})`],
          ["numbers", "chart", locale === "es" ? "Números para saber" : "Numbers to know"],
          ["graph", "network", locale === "es" ? "Grafo de conceptos" : "Concept graph"],
        ].map(([href, icon, label]) => (
          <Link key={href} href={`/${locale}/${href}/`} className="lib-tool"><Icon name={icon} size={20} /><span>{label}</span><Icon name="right" size={14} /></Link>
        ))}
      </nav>

      {TRACKS.map((tr, ti) => {
        const ids = new Set(TRACKS.flatMap((x) => x.domains));
        const list = domains.filter((d) => tr.domains.includes(d.id) || (ti === TRACKS.length - 1 && !ids.has(d.id)));
        return (
          <section key={tr.id} className="track">
            <h2 className="section-label">{locale === "es" ? tr.es : tr.en}</h2>
            <div className="track-list">
              {list.map((d) => {
                const i = domains.indexOf(d);
                return (
                  <Link key={d.id} href={`/${locale}/d/${d.id}/`} className="domain-card" style={{ ["--h" as string]: hueFor(i) }}>
                    <span className="dc-icon"><Icon name={d.icon} size={20} /></span>
                    <span className="dr-text"><strong>{t(d.title, locale)}</strong><small>{t(d.tagline, locale)}</small></span>
                    <ProgressMeter ids={d.concepts} label={locale === "es" ? "estudiados" : "studied"} />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
