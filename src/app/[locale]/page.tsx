import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { m, t } from "@/lib/i18n";
import { allConcepts, getConcept, getDomains, getLabs } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { Icon } from "@/components/Icon";
import { SearchButton } from "@/components/SearchButton";
import { ProgressMeter } from "@/components/Mastered";
import { ContinueCard } from "@/components/Continue";
import { getPath } from "@/lib/content";
import { Emoji, Illustration } from "@/components/Visual";

// Asked again and again in Staff SWE and AI architect loops: a mix, not only AI.
const HOT = ["case-news-feed", "consistent-hashing", "rate-limiting", "case-chat-system", "sliding-window", "caching", "case-payment-system", "behavioral-star", "llm-reference-architecture", "rag", "agents-vs-workflows", "prompt-injection", "kv-cache", "design-framework"];

// The syllabus in three tracks. A topic missing here lands in the last one, so a new domain
// still shows up.
const TRACKS: { id: string; en: string; es: string; domains: string[] }[] = [
  { id: "swe", en: "Staff software engineering", es: "Ingeniería de software Staff", domains: ["coding", "systems", "sysdesign", "leadership"] },
  { id: "ai", en: "AI systems", es: "Sistemas de IA", domains: ["foundations", "prompting", "rag", "agents", "evals", "training", "inference", "security", "architecture", "design"] },
  { id: "ml", en: "Machine learning", es: "Machine learning", domains: ["ml", "mlops"] },
];

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/", m("brand", locale), m("heroSub", locale), { absolute: true });
}

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  const domains = getDomains();
  const concepts = allConcepts();
  const order = getPath().flatMap((p) => p.modules.flatMap((m) => m.concepts.map((id) => ({ id, t: t(getConcept(id)!.title, locale), m: t(m.title, locale) }))));
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
        <p className="eyebrow">Staff · Principal · Software Engineer · AI Architect</p>
        <h1>{L("heroTitle")}</h1>
        <p className="hero-sub">{L("heroSub")}</p>
        <SearchButton big label={L("search")} placeholder={L("searchPlaceholder")} />
        <div className="hero-ctas">
          <Link className="btn btn-primary" href={`/${locale}/path/`}>{L("startHere")} <Icon name="right" size={16} /></Link>
          <Link className="btn" href={`/${locale}/practice/`}><Icon name="cards" size={16} /> {L("practiceQuestions")}</Link>
          <Link className="btn" href={`/${locale}/plan/`}><Icon name="chart" size={16} /> {L("navPlan")}</Link>
        </div>
        <ul className="stats">
          {stats.map(([n, label]) => <li key={label}><strong>{n}</strong> {label}</li>)}
        </ul>
      </section>

      <ContinueCard order={order} locale={locale} />

      {hot.length > 0 && (
        <section className="hot">
          <h2 className="section-label">{locale === "es" ? "Lo más preguntado en entrevistas" : "Most asked in interviews"}</h2>
          <div className="hot-list">
            {hot.map((c) => <Link key={c.id} href={`/${locale}/c/${c.id}/`} className="hot-pill"><Illustration id={c.id} size={18} />{t(c.title, locale)}</Link>)}
          </div>
        </section>
      )}

      <section className="home-labs">
        <div className="hl-head">
          <h2 className="section-label">{locale === "es" ? "Labs: sistemas que puedes tocar" : "Labs: systems you can touch"}</h2>
          <Link href={`/${locale}/labs/`} className="hl-all">{locale === "es" ? `Ver los ${getLabs().length}` : `See all ${getLabs().length}`} <Icon name="right" size={14} /></Link>
        </div>
        <div className="hl-row">
          {getLabs().slice(0, 6).map((l) => (
            <Link key={l.id} href={`/${locale}/labs/${l.id}/`} className="hl-card">
              <Emoji name={l.art} size={30} />
              <span>{t(l.title, locale)}</span>
            </Link>
          ))}
        </div>
      </section>

      <Link href={`/${locale}/graph/`} className="graph-promo">
        <span><strong>{locale === "es" ? "Mapa del conocimiento" : "Knowledge map"}</strong>
          <small>{locale === "es" ? "Todos los conceptos como un territorio: temas y puentes entre ideas." : "Every concept as a territory: topics and the bridges between ideas."}</small></span>
        <Icon name="right" size={18} />
      </Link>

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
      <p className="legend">{L("levelLegend")}</p>
    </main>
  );
}
