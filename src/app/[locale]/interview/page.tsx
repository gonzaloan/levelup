import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { m, t } from "@/lib/i18n";
import { conceptsOf, getConcept, getDomains } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { norm } from "@/lib/search";
import { Markdown } from "@/components/Markdown";
import { Diagram } from "@/components/Diagram";
import { Filter } from "@/components/Filter";
import { Icon } from "@/components/Icon";
import { ConceptCard } from "@/components/Bits";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return { title: m("interviewTitle", locale), description: m("interviewSub", locale) };
}

export default async function Interview({ params }: P) {
  const { locale } = await params;
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  const domains = getDomains();
  const fw = getConcept("design-framework");
  const cases = conceptsOf("design").filter((c) => c.id !== "design-framework");
  const behavioral = ["behavioral-star", "staff-role", "influence", "tradeoff-communication", "ai-assisted-engineering", "one-way-doors"].map(getConcept).filter((c): c is NonNullable<typeof c> => !!c);
  const totalQ = domains.reduce((n, d) => n + conceptsOf(d.id).reduce((k, c) => k + c.interview.length, 0), 0);

  return (
    <main className="page interview">
      <header className="page-head plain">
        <div>
          <h1>{L("interviewTitle")}</h1>
          <p className="page-sub">{L("interviewSub")}</p>
          <div className="hero-ctas">
            <Link className="btn btn-primary" href={`/${locale}/practice/`}><Icon name="cards" size={16} /> {L("practiceQuestions")}</Link>
            <Link className="btn" href={`/${locale}/questions/`}><Icon name="list" size={16} /> {L("questionBank")} ({totalQ})</Link>
          </div>
        </div>
      </header>

      {fw && (
        <section className="framework">
          <h2>{L("framework")}</h2>
          <p className="tldr-text">{t(fw.tldr, locale)}</p>
          <Markdown src={t(fw.explain, locale)} locale={locale} />
          {fw.diagram && <Diagram id={fw.id} caption={t(fw.diagram.caption, locale)} zoomLabel="Expand" closeLabel="Close" />}
          {fw.deepDive && (
            <div className="deep-grid">
              {fw.deepDive.map((x, i) => (
                <div key={i} className="deep-item"><h3>{t(x.title, locale)}</h3><Markdown src={t(x.body, locale)} locale={locale} /></div>
              ))}
            </div>
          )}
          <p><Link href={`/${locale}/c/${fw.id}/`}>{L("openConcept")} →</Link></p>
        </section>
      )}

      <section>
        <h2>{L("cases")}</h2>
        <div className="concept-grid">{cases.map((c) => <ConceptCard key={c.id} c={c} locale={locale} />)}</div>
      </section>

      {behavioral.length > 0 && (
        <section>
          <h2>{locale === "es" ? "Liderazgo y conductual" : "Leadership & behavioral"}</h2>
          <div className="concept-grid">{behavioral.map((c) => <ConceptCard key={c.id} c={c} locale={locale} showDomain />)}</div>
        </section>
      )}

      <section>
        <h2>{L("numbersBank")}</h2>
        <Filter scope="numbers" placeholder={L("filter")} allLabel={L("all")}
          domains={domains.map((d, i) => ({ id: d.id, title: t(d.title, locale), hue: hueFor(i) }))} />
        <div id="numbers" className="numbers-bank">
          {domains.map((d, i) => (
            <div key={d.id} data-section className="nb-domain" style={{ ["--h" as string]: hueFor(i) }}>
              <h3>{t(d.title, locale)}</h3>
              <ul>
                {conceptsOf(d.id).flatMap((c) => (c.numbers ?? []).map((x, j) => (
                  <li key={`${c.id}-${j}`} data-domain={d.id} data-filter={norm(t(x, locale) + " " + t(c.title, locale))}>
                    <Markdown inline src={t(x, locale)} locale={locale} />{" "}
                    <Link href={`/${locale}/c/${c.id}/`} className="nb-src">{t(c.title, locale)}</Link>
                  </li>
                )))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
