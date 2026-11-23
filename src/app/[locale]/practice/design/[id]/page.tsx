import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { LOCALES, t } from "@/lib/i18n";
import { conceptsOf, getConcept } from "@/lib/content";
import { DESIGN_DOMAINS, PHASES, RUBRIC } from "@/lib/design-round";
import { Icon } from "@/components/Icon";
import { Markdown } from "@/components/Markdown";
import { CodeBlock } from "@/components/CodeBlock";
import { Diagram } from "@/components/Diagram";
import { Illustration } from "@/components/Visual";
import { DesignRound, type PhaseView } from "@/components/practice/DesignRound";

type P = { params: Promise<{ locale: Locale; id: string }> };
export const dynamicParams = false;
const cases = () => DESIGN_DOMAINS.flatMap((d) => conceptsOf(d)).filter((c) => c.id.startsWith("case-"));
export const generateStaticParams = () => LOCALES.flatMap((locale) => cases().map((c) => ({ locale, id: c.id })));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, id } = await params;
  const c = getConcept(id);
  return c ? pageMeta(locale, `/practice/design/${id}/`, `${locale === "es" ? "Ronda" : "Round"}: ${t(c.title, locale)}`, t(c.tldr, locale)) : {};
}

export default async function DesignCasePage({ params }: P) {
  const { locale, id } = await params;
  const c = getConcept(id);
  if (!c || !cases().some((x) => x.id === id)) notFound();
  const es = locale === "es";
  const kp = (i: number) => c.keyPoints?.[i] && <p className="dr-kp"><Markdown inline src={t(c.keyPoints[i], locale)} locale={locale} /></p>;
  const list = (items?: { en: string; es: string }[]) => items?.length ? <ul>{items.map((x, i) => <li key={i}><Markdown inline src={t(x, locale)} locale={locale} /></li>)}</ul> : null;
  // What a strong answer covers, phase by phase, taken from the case's own (fact-checked) file.
  const reference: Record<string, React.ReactNode> = {
    req: <>{kp(0)}<p><strong>{es ? "La idea en una frase" : "The idea in one sentence"}:</strong> {t(c.tldr, locale)}</p></>,
    est: <>{list(c.numbers) ?? <p>—</p>}<p><Link href={`/${locale}/labs/capacity/`}>{es ? "Calculadora back-of-the-envelope" : "Back-of-the-envelope calculator"} →</Link></p></>,
    api: <>{kp(1)}{c.code && <CodeBlock code={c.code.source} lang={c.code.lang} title={t(c.code.title, locale)} copyLabel={es ? "Copiar" : "Copy"} copiedLabel={es ? "Copiado" : "Copied"} />}</>,
    hld: <>{kp(2)}{c.diagram && <Diagram id={c.id} caption={t(c.diagram.caption, locale)} zoomLabel={es ? "Ampliar" : "Expand"} closeLabel={es ? "Cerrar" : "Close"} />}</>,
    deep: <>{kp(3)}{c.deepDive?.map((d, i) => <div key={i} className="dr-deep"><h4>{t(d.title, locale)}</h4><Markdown src={t(d.body, locale)} locale={locale} /></div>)}</>,
    wrap: <>{kp(4)}<h4>{es ? "Errores comunes" : "Common pitfalls"}</h4>{list(c.pitfalls)}<h4>{es ? "Lo que pagas" : "What you pay"}</h4>{list(c.cons)}</>,
  };
  const followFor: Record<string, number> = { hld: 1, deep: 0, wrap: 2 };
  const phases: PhaseView[] = PHASES.map((p) => {
    const q = c.interview[followFor[p.id] ?? -1];
    return {
      id: p.id, minutes: p.minutes, title: t(p.title, locale), prompts: p.prompts.map((x) => t(x, locale)), reference: reference[p.id],
      followUp: q ? { q: t(q.q, locale), a: <Markdown src={t(q.a, locale)} locale={locale} /> } : undefined,
    };
  });
  const rubric = RUBRIC.map((d) => ({ id: d.id, title: t(d.title, locale), levels: d.levels.map((l) => t(l, locale)), study: d.study.map((s) => ({ id: s, title: t(getConcept(s)?.title, locale) })) }));
  return (
    <main className="page round-page">
      <p className="crumbs-line"><Link href={`/${locale}/practice/design/`}><Icon name="left" size={14} /> {es ? "Ronda de system design" : "System design round"}</Link></p>
      <header className="lab-head">
        <Illustration id={c.id} size={52} className="head-ill" />
        <div>
          <p className="eyebrow">{es ? "Tu pregunta de entrevista" : "Your interview question"}</p>
          <h1>{t(c.title, locale)}</h1>
          <p className="page-sub">{es ? "Empieza preguntando: nadie te dará los requisitos completos." : "Start by asking: nobody hands you the full requirements."}</p>
        </div>
      </header>
      <DesignRound caseId={c.id} title={t(c.title, locale)} phases={phases} rubric={rubric} locale={locale} />
    </main>
  );
}
