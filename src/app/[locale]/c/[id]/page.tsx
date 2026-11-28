import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { DIFF, LOCALES, m, t } from "@/lib/i18n";
import { allConcepts, checkItemsFor, conceptsOf, domainIndex, getConcept, getDomain, labsFor, neighbors, pathPosition, problemsFor } from "@/lib/content";
import type { Concept } from "@/lib/types";
import { hueFor } from "@/lib/hue";
import { Icon } from "@/components/Icon";
import { Markdown } from "@/components/Markdown";
import { CodeBlock } from "@/components/CodeBlock";
import { Diagram } from "@/components/Diagram";
import { DomainChip, LevelBadge } from "@/components/Bits";
import { ConceptEnd, MasteredDot } from "@/components/Mastered";
import { Toc } from "@/components/Toc";
import { KeyNav } from "@/components/KeyNav";
import { QuickCheck } from "@/components/practice/QuickCheck";
import { SolvedMark } from "@/components/practice/SolvedMark";
import { Emoji, Illustration, StackRow } from "@/components/Visual";

type P = { params: Promise<{ locale: Locale; id: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.flatMap((locale) => allConcepts().map((c) => ({ locale, id: c.id })));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, id } = await params;
  const c = getConcept(id);
  return c ? pageMeta(locale, `/c/${id}/`, t(c.title, locale), t(c.tldr, locale), { article: true }) : {};
}

export default async function ConceptPage({ params }: P) {
  const { locale, id } = await params;
  const c = getConcept(id);
  if (!c) notFound();
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  const d = getDomain(c.domain)!;
  const { prev, next } = neighbors(id);
  const pos = pathPosition(id);
  // The rail lists the path module you're in (the same order as Hoy, Ruta and the next button).
  const siblings = pos ? pos.module.concepts.map(getConcept).filter((x): x is Concept => !!x) : conceptsOf(d.id);
  const related = c.related.map(getConcept).filter((x): x is NonNullable<typeof x> => !!x);
  const hue = hueFor(domainIndex(d.id));
  const checks = checkItemsFor(id, locale);
  const labs = labsFor(id);
  const problems = problemsFor(id);
  // Design cases lead with the building blocks they use (their related concepts), like a course.
  const isCase = c.domain === "design" || c.domain === "sysdesign";

  // Essentials first (one idea, one picture, how it works, a check); the rest is folded, one tap away.
  const toc = [
    { id: "tldr", label: L("tldr") },
    c.diagram && { id: "diagram", label: L("diagram") },
    { id: "how", label: L("howItWorks") },
    checks.length && { id: "check", label: L("checkTitle") },
    problems.length && { id: "problems", label: L("solveIt") },
    c.keyPoints?.length && { id: "full", label: L("fullExplanation") },
    c.code && { id: "code", label: L("code") },
    { id: "example", label: L("example") },
    { id: "tradeoffs", label: L("tradeoffs") },
    c.numbers?.length && { id: "numbers", label: L("numbers") },
    { id: "pitfalls", label: L("pitfalls") },
    { id: "interview", label: L("interview") },
    c.deepDive?.length && { id: "deep", label: L("deepDive") },
    { id: "related", label: L("related") },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <main className="concept-layout" style={{ ["--h" as string]: hue }}>
      <aside className="rail rail-left" aria-label={pos ? (locale === "es" ? "En este módulo" : "In this module") : L("conceptsInDomain")}>
        {pos
          ? <Link href={`/${locale}/path/`} className="rail-title rail-domain"><Icon name="compass" size={16} /> {locale === "es" ? "Módulo" : "Module"} {String(pos.moduleNo).padStart(2, "0")} · {t(pos.module.title, locale)}</Link>
          : <Link href={`/${locale}/d/${d.id}/`} className="rail-title rail-domain"><Icon name={d.icon} size={16} /> {t(d.title, locale)}</Link>}
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
          <div className="crumbs">
            <DomainChip id={d.id} locale={locale} /><LevelBadge level={c.level} locale={locale} />
            {pos && <Link className="path-pos" href={`/${locale}/path/`}>{locale === "es" ? "Módulo" : "Module"} {String(pos.moduleNo).padStart(2, "0")} · {pos.index}/{pos.size}</Link>}
          </div>
          <div className="title-row">
            <Illustration id={c.id} size={60} className="head-ill" />
            <h1>{t(c.title, locale)}</h1>
          </div>
        </header>

        <section id="tldr" className="tldr">
          <div className="tldr-label">{L("tldr")}</div>
          <p className="tldr-text">{t(c.tldr, locale)}</p>
          {c.analogy && <p className="analogy"><span>{L("analogy")}:</span> {t(c.analogy, locale)}</p>}
        </section>

        {isCase && related.length > 0 && (
          <section className="fundamentals" aria-label={locale === "es" ? "Fundamentos que vas a usar" : "Fundamentals you'll use"}>
            <h2 className="section-label">{locale === "es" ? "Fundamentos que vas a usar" : "Fundamentals you'll use"}</h2>
            <div className="fund-list">
              {related.map((r) => (
                <Link key={r.id} href={`/${locale}/c/${r.id}/`} className="fund-item">
                  <Illustration id={r.id} size={26} />
                  <span>{t(r.title, locale)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {c.diagram && (
          <section id="diagram" className="diagram-top">
            <Diagram id={c.id} caption={t(c.diagram.caption, locale)} zoomLabel={locale === "es" ? "Ampliar" : "Expand"} closeLabel={locale === "es" ? "Cerrar" : "Close"} walk={locale} />
          </section>
        )}

        <section id="how">
          <h2>{L("howItWorks")}</h2>
          {c.keyPoints?.length
            ? <ul className="keypoints">{c.keyPoints.map((p, i) => <li key={i}><Markdown inline src={t(p, locale)} locale={locale} /></li>)}</ul>
            : <Markdown src={t(c.explain, locale)} locale={locale} />}
        </section>

        {checks.length > 0 && (
          <section id="check" className="check">
            <h2>{L("checkTitle")}</h2>
            <p className="hint">{L("checkHint")}</p>
            <QuickCheck items={checks} conceptId={c.id} locale={locale} />
          </section>
        )}

        <section className="deeper" aria-label={L("goDeeper")}>
          <h2>{L("goDeeper")}</h2>
          <p className="hint">{L("goDeeperHint")}</p>

          {labs.map((l) => (
            <Link key={l.id} href={`/${locale}/labs/${l.id}/`} className="fold fold-link">
              <Emoji name={l.art} size={22} /><span>{t(l.title, locale)} <small>{L("tryLab")}</small></span><Icon name="right" size={18} />
            </Link>
          ))}
          {(isCase || id === "behavioral-star") && (
            <Link href={isCase ? `/${locale}/practice/design/${id}/` : `/${locale}/interview/stories/`} className="fold fold-link">
              <Emoji name={isCase ? "stopwatch" : "open-book"} size={22} />
              <span>{isCase ? (locale === "es" ? "Haz esta ronda en 45 minutos" : "Do this round in 45 minutes") : (locale === "es" ? "Escribe y practica tus historias" : "Write and practice your stories")} <small>{isCase ? L("pDesign") : L("pStories")}</small></span>
              <Icon name="right" size={18} />
            </Link>
          )}
          {problems.length > 0 && (
            <details id="problems" className="fold">
              <summary>{L("solveIt")} <small>{problems.length}</small></summary>
              <ul className="code-list">
                {problems.map((p) => (
                  <li key={p.id}>
                    <Link href={`/${locale}/practice/code/${p.id}/`}>
                      <span className="cl-title">{t(p.title, locale)}</span>
                      <span className={`diff diff-${p.difficulty}`}>{DIFF[p.difficulty][locale]}</span>
                      <SolvedMark id={p.id} />
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {!!c.keyPoints?.length && (
            <details id="full" className="fold">
              <summary>{L("fullExplanation")}</summary>
              <Markdown src={t(c.explain, locale)} locale={locale} />
            </details>
          )}

          {c.code && (
            <details id="code" className="fold">
              <summary>{L("code")} <small>{t(c.code.title, locale)}</small></summary>
              <CodeBlock code={c.code.source} lang={c.code.lang} title={t(c.code.title, locale)} copyLabel={L("copy")} copiedLabel={L("copied")} />
            </details>
          )}

          <details id="example" className="fold">
            <summary>{L("example")}</summary>
            <div className="example-box"><Markdown src={t(c.example, locale)} locale={locale} /></div>
          </details>

          <details id="tradeoffs" className="fold">
            <summary>{L("tradeoffs")} <small>+{c.pros.length} · −{c.cons.length}</small></summary>
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
          </details>

          {c.numbers && c.numbers.length > 0 && (
            <details id="numbers" className="fold">
              <summary>{L("numbers")} <small>{c.numbers.length}</small></summary>
              <ul className="numbers">{c.numbers.map((x, i) => <li key={i}><Markdown inline src={t(x, locale)} locale={locale} /></li>)}</ul>
            </details>
          )}

          <details id="pitfalls" className="fold">
            <summary>{L("pitfalls")} <small>{c.pitfalls.length}</small></summary>
            <ul className="pitfalls">{c.pitfalls.map((x, i) => <li key={i}><Markdown inline src={t(x, locale)} locale={locale} /></li>)}</ul>
          </details>

          <details id="interview" className="fold">
            <summary>{L("interview")} <small>{c.interview.length}</small></summary>
            <p className="hint">{L("interviewHint")}</p>
            <div className="qa-list">
              {c.interview.map((x, i) => (
                <details key={i} className="qa">
                  <summary><span className="qa-q">{t(x.q, locale)}</span><span className="qa-reveal">{L("showAnswer")}</span></summary>
                  <Markdown src={t(x.a, locale)} locale={locale} className="qa-a" />
                </details>
              ))}
            </div>
          </details>

          {c.deepDive && c.deepDive.length > 0 && (
            <details id="deep" className="fold">
              <summary>{L("deepDive")} <small>{c.deepDive.length}</small></summary>
              <div className="deep-grid">
                {c.deepDive.map((x, i) => (
                  <div key={i} className="deep-item">
                    <h3>{t(x.title, locale)}</h3>
                    <Markdown src={t(x.body, locale)} locale={locale} />
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        <section id="related">
          <h2>{L("related")}</h2>
          <div className="related-chips">
            {related.map((r) => (
              <Link key={r.id} href={`/${locale}/c/${r.id}/`} className="related-chip" title={t(r.tldr, locale)} style={{ ["--h" as string]: hueFor(domainIndex(r.domain)) }}>
                {t(r.title, locale)}
              </Link>
            ))}
          </div>
          <StackRow concept={c} locale={locale} />
          <h3 className="sources-title">{L("sources")}</h3>
          <ul className="sources">
            {c.sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} <Icon name="external" size={13} /></a></li>
            ))}
          </ul>
        </section>

        <ConceptEnd id={c.id} locale={locale} next={next ? { id: next.id, title: t(next.title, locale) } : null} />
      </article>

      <KeyNav self={`/${locale}/c/${id}/`} prev={prev ? `/${locale}/c/${prev.id}/` : undefined} next={next ? `/${locale}/c/${next.id}/` : undefined} />
      <aside className="rail rail-right">
        <Toc items={toc} title={L("onThisPage")} />
      </aside>
    </main>
  );
}
