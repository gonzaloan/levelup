import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { LOCALES, m, t } from "@/lib/i18n";
import { allConcepts, conceptsOf, domainIndex, getConcept, getDomain, neighbors } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { Icon } from "@/components/Icon";
import { Markdown } from "@/components/Markdown";
import { CodeBlock } from "@/components/CodeBlock";
import { Diagram } from "@/components/Diagram";
import { DomainChip, LevelBadge } from "@/components/Bits";
import { MasteredDot, MasteredToggle } from "@/components/Mastered";
import { Toc } from "@/components/Toc";
import { KeyNav } from "@/components/KeyNav";

type P = { params: Promise<{ locale: Locale; id: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.flatMap((locale) => allConcepts().map((c) => ({ locale, id: c.id })));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, id } = await params;
  const c = getConcept(id);
  if (!c) return {};
  return {
    title: t(c.title, locale),
    description: t(c.tldr, locale),
    alternates: { languages: { en: `/en/c/${id}/`, es: `/es/c/${id}/` } },
  };
}

export default async function ConceptPage({ params }: P) {
  const { locale, id } = await params;
  const c = getConcept(id);
  if (!c) notFound();
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  const d = getDomain(c.domain)!;
  const { prev, next } = neighbors(id);
  const siblings = conceptsOf(d.id);
  const related = c.related.map(getConcept).filter((x): x is NonNullable<typeof x> => !!x);
  const hue = hueFor(domainIndex(d.id));

  const toc = [
    { id: "tldr", label: L("tldr") },
    { id: "how", label: L("howItWorks") },
    c.diagram && { id: "diagram", label: L("diagram") },
    c.code && { id: "code", label: L("code") },
    { id: "example", label: L("example") },
    c.deepDive?.length && { id: "deep", label: L("deepDive") },
    { id: "tradeoffs", label: L("tradeoffs") },
    c.numbers?.length && { id: "numbers", label: L("numbers") },
    { id: "pitfalls", label: L("pitfalls") },
    { id: "interview", label: L("interview") },
    { id: "related", label: L("related") },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <main className="concept-layout" style={{ ["--h" as string]: hue }}>
      <aside className="rail rail-left" aria-label={L("conceptsInDomain")}>
        <Link href={`/${locale}/d/${d.id}/`} className="rail-title rail-domain"><Icon name={d.icon} size={16} /> {t(d.title, locale)}</Link>
        <ol className="sibling-list">
          {siblings.map((s) => (
            <li key={s.id}>
              <Link href={`/${locale}/c/${s.id}/`} className={s.id === id ? "current" : ""} aria-current={s.id === id ? "page" : undefined}>
                <MasteredDot id={s.id} />{t(s.title, locale)}
              </Link>
            </li>
          ))}
        </ol>
      </aside>

      <article className="concept">
        <header className="concept-head">
          <div className="crumbs"><DomainChip id={d.id} locale={locale} /><LevelBadge level={c.level} locale={locale} /></div>
          <h1>{t(c.title, locale)}</h1>
          {c.aliases.length > 0 && <p className="aliases">{c.aliases.join(" · ")}</p>}
        </header>

        <details className="topic-nav only-narrow">
          <summary><Icon name={d.icon} size={16} /> {L("conceptsInDomain")}: {t(d.title, locale)} <span>({siblings.findIndex((s) => s.id === id) + 1}/{siblings.length})</span></summary>
          <ol className="sibling-list">
            {siblings.map((s) => (
              <li key={s.id}>
                <Link href={`/${locale}/c/${s.id}/`} className={s.id === id ? "current" : ""} aria-current={s.id === id ? "page" : undefined}>
                  <MasteredDot id={s.id} />{t(s.title, locale)}
                </Link>
              </li>
            ))}
          </ol>
        </details>

        <section id="tldr" className="tldr">
          <div className="tldr-label">{L("tldr")}</div>
          <p className="tldr-text">{t(c.tldr, locale)}</p>
          {c.analogy && <p className="analogy"><span>{L("analogy")}:</span> {t(c.analogy, locale)}</p>}
        </section>

        <section id="how">
          <h2>{L("howItWorks")}</h2>
          <Markdown src={t(c.explain, locale)} locale={locale} />
        </section>

        {c.diagram && (
          <section id="diagram">
            <h2>{L("diagram")}</h2>
            <Diagram id={c.id} caption={t(c.diagram.caption, locale)} zoomLabel={locale === "es" ? "Ampliar" : "Expand"} closeLabel={locale === "es" ? "Cerrar" : "Close"} />
          </section>
        )}

        {c.code && (
          <section id="code">
            <h2>{L("code")}</h2>
            <CodeBlock code={c.code.source} lang={c.code.lang} title={t(c.code.title, locale)} copyLabel={L("copy")} copiedLabel={L("copied")} />
          </section>
        )}

        <section id="example">
          <h2>{L("example")}</h2>
          <div className="example-box"><Markdown src={t(c.example, locale)} locale={locale} /></div>
        </section>

        {c.deepDive && c.deepDive.length > 0 && (
          <section id="deep">
            <h2>{L("deepDive")}</h2>
            <div className="deep-grid">
              {c.deepDive.map((x, i) => (
                <div key={i} className="deep-item">
                  <h3>{t(x.title, locale)}</h3>
                  <Markdown src={t(x.body, locale)} locale={locale} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="tradeoffs">
          <h2>{L("tradeoffs")}</h2>
          <div className="two-col">
            <div className="tcard pro">
              <h3><span className="sign">+</span> {L("pros")}</h3>
              <ul>{c.pros.map((x, i) => <li key={i}><Markdown inline src={t(x, locale)} locale={locale} /></li>)}</ul>
            </div>
            <div className="tcard con">
              <h3><span className="sign">−</span> {L("cons")}</h3>
              <ul>{c.cons.map((x, i) => <li key={i}><Markdown inline src={t(x, locale)} locale={locale} /></li>)}</ul>
            </div>
          </div>
          <div className="two-col when">
            <div className="tcard"><h3>{L("whenToUse")}</h3><p><Markdown inline src={t(c.whenToUse, locale)} locale={locale} /></p></div>
            <div className="tcard"><h3>{L("whenNotToUse")}</h3><p><Markdown inline src={t(c.whenNotToUse, locale)} locale={locale} /></p></div>
          </div>
        </section>

        {c.numbers && c.numbers.length > 0 && (
          <section id="numbers">
            <h2>{L("numbers")}</h2>
            <ul className="numbers">{c.numbers.map((x, i) => <li key={i}><Markdown inline src={t(x, locale)} locale={locale} /></li>)}</ul>
          </section>
        )}

        <section id="pitfalls">
          <h2>{L("pitfalls")}</h2>
          <ul className="pitfalls">{c.pitfalls.map((x, i) => <li key={i}><Markdown inline src={t(x, locale)} locale={locale} /></li>)}</ul>
        </section>

        <section id="interview">
          <h2>{L("interview")}</h2>
          <p className="hint">{L("interviewHint")}</p>
          <div className="qa-list">
            {c.interview.map((x, i) => (
              <details key={i} className="qa">
                <summary><span className="qa-q">{t(x.q, locale)}</span><span className="qa-reveal">{L("showAnswer")}</span></summary>
                <Markdown src={t(x.a, locale)} locale={locale} className="qa-a" />
              </details>
            ))}
          </div>
        </section>

        <section id="related">
          <h2>{L("related")}</h2>
          <div className="related-grid">
            {related.map((r) => (
              <Link key={r.id} href={`/${locale}/c/${r.id}/`} className="related-card" style={{ ["--h" as string]: hueFor(domainIndex(r.domain)) }}>
                <strong>{t(r.title, locale)}</strong>
                <span>{t(r.tldr, locale)}</span>
              </Link>
            ))}
          </div>
          <h3 className="sources-title">{L("sources")}</h3>
          <ul className="sources">
            {c.sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} <Icon name="external" size={13} /></a></li>
            ))}
          </ul>
        </section>

        <nav className="pager">
          {prev ? <Link href={`/${locale}/c/${prev.id}/`}><Icon name="left" size={16} /><span><small>{L("prev")}</small>{t(prev.title, locale)}</span></Link> : <span />}
          {next ? <Link href={`/${locale}/c/${next.id}/`} className="next"><span><small>{L("next")}</small>{t(next.title, locale)}</span><Icon name="right" size={16} /></Link> : <span />}
        </nav>
      </article>

      <KeyNav prev={prev ? `/${locale}/c/${prev.id}/` : undefined} next={next ? `/${locale}/c/${next.id}/` : undefined} />
      <aside className="rail rail-right">
        <MasteredToggle id={c.id} label={L("markKnown")} doneLabel={L("known")} />
        <Toc items={toc} title={L("onThisPage")} />
      </aside>
    </main>
  );
}
