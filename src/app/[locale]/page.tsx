import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { m, t } from "@/lib/i18n";
import { allConcepts, getConcept, getDomains } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { Icon } from "@/components/Icon";
import { SearchButton } from "@/components/SearchButton";
import { ProgressMeter } from "@/components/Mastered";

const HOT = ["rag", "reranking", "agents-vs-workflows", "tool-calling", "mcp", "prompt-injection", "llm-as-judge", "kv-cache", "prompt-caching", "model-routing", "hallucinations", "design-framework"];

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: { absolute: m("brand", locale) }, description: m("heroSub", locale), alternates: { languages: { en: "/en/", es: "/es/" } } };
}

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  const domains = getDomains();
  const concepts = allConcepts();
  const first = domains[0]?.concepts[0];
  const stats = [
    [concepts.length, L("concepts")],
    [concepts.filter((c) => c.diagram).length, locale === "es" ? "diagramas" : "diagrams"],
    [concepts.filter((c) => c.code).length, locale === "es" ? "ejemplos de código" : "code samples"],
    [concepts.reduce((n, c) => n + c.interview.length, 0), L("questions")],
  ] as const;
  const hot = HOT.map(getConcept).filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <main className="home">
      <section className="hero">
        <p className="eyebrow">Staff · Principal · AI Architect</p>
        <h1>{L("heroTitle")}</h1>
        <p className="hero-sub">{L("heroSub")}</p>
        <SearchButton big label={L("search")} placeholder={L("searchPlaceholder")} />
        <div className="hero-ctas">
          {first && <Link className="btn btn-primary" href={`/${locale}/c/${first}/`}>{L("startHere")} <Icon name="right" size={16} /></Link>}
          <Link className="btn" href={`/${locale}/cheatsheet/`}><Icon name="list" size={16} /> {L("openCheatsheet")}</Link>
          <Link className="btn" href={`/${locale}/practice/`}><Icon name="cards" size={16} /> {L("practiceQuestions")}</Link>
        </div>
        <ul className="stats">
          {stats.map(([n, label]) => <li key={label}><strong>{n}</strong> {label}</li>)}
        </ul>
      </section>

      {hot.length > 0 && (
        <section className="hot">
          <h2 className="section-label">{locale === "es" ? "Lo más preguntado en entrevistas" : "Most asked in interviews"}</h2>
          <div className="hot-list">
            {hot.map((c) => <Link key={c.id} href={`/${locale}/c/${c.id}/`} className="hot-pill">{t(c.title, locale)}</Link>)}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-label">{locale === "es" ? "El temario, en orden de estudio" : "The syllabus, in study order"}</h2>
        <div className="domain-grid">
          {domains.map((d, i) => (
            <Link key={d.id} href={`/${locale}/d/${d.id}/`} className="domain-card" style={{ ["--h" as string]: hueFor(i) }}>
              <div className="dc-head">
                <span className="dc-icon"><Icon name={d.icon} size={22} /></span>
                <span className="dc-n">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3>{t(d.title, locale)}</h3>
              <p>{t(d.tagline, locale)}</p>
              <ProgressMeter ids={d.concepts} label={L("mastered")} />
            </Link>
          ))}
        </div>
        <p className="legend">{L("levelLegend")}</p>
      </section>
    </main>
  );
}
