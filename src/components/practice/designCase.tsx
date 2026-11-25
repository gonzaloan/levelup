// The round for one design case, built at build time (server only) and shared by the candidate's
// page and the interviewer's sheet: generic phases + rubric (src/lib/design-round.ts), with the
// case-specific reference taken from the case's own fact-checked concept file.
import Link from "next/link";
import type { Concept, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { conceptsOf, getConcept } from "@/lib/content";
import { DESIGN_DOMAINS, PHASES, RUBRIC } from "@/lib/design-round";
import { Markdown } from "@/components/Markdown";
import { CodeBlock } from "@/components/CodeBlock";
import { Diagram } from "@/components/Diagram";
import type { DimView, PhaseView } from "./DesignRound";

export const designCases = () => DESIGN_DOMAINS.flatMap((d) => conceptsOf(d)).filter((c) => c.id.startsWith("case-"));

export function buildRound(c: Concept, locale: Locale): { phases: PhaseView[]; rubric: DimView[] } {
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
  return { phases, rubric };
}
