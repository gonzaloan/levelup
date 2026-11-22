import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { LOCALES, t } from "@/lib/i18n";
import { getConcept, getProblem, getProblems, labsFor } from "@/lib/content";
import { Icon } from "@/components/Icon";
import { Markdown } from "@/components/Markdown";
import { CodeBlock } from "@/components/CodeBlock";
import { Illustration } from "@/components/Visual";
import { CodeRunner } from "@/components/practice/CodeRunner";
import { DIFF } from "../page";

type P = { params: Promise<{ locale: Locale; id: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.flatMap((locale) => getProblems().map((p) => ({ locale, id: p.id })));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, id } = await params;
  const p = getProblem(id);
  return p ? { title: t(p.title, locale), description: t(p.prompt, locale).slice(0, 150) } : {};
}

export default async function ProblemPage({ params }: P) {
  const { locale, id } = await params;
  const p = getProblem(id);
  if (!p) notFound();
  const es = locale === "es";
  const c = getConcept(p.concept)!;
  const all = getProblems();
  const next = all[all.findIndex((x) => x.id === p.id) + 1];
  const examples = p.tests.filter((x) => x.visible);
  const lab = labsFor(p.concept)[0];
  return (
    <main className="page problem-page">
      <p className="crumbs-line"><Link href={`/${locale}/practice/code/`}><Icon name="left" size={14} /> {es ? "Coding en Python" : "Python coding"}</Link></p>
      <div className="problem-grid">
        <article className="problem-text">
          <header>
            <div className="crumbs">
              <Link className="chip" href={`/${locale}/c/${c.id}/`}><Illustration id={c.id} size={16} /> {t(c.title, locale)}</Link>
              <span className={`diff diff-${p.difficulty}`}>{DIFF[p.difficulty][locale]}</span>
            </div>
            <h1>{t(p.title, locale)}</h1>
          </header>
          <Markdown src={t(p.prompt, locale)} locale={locale} />
          <h2 className="section-label">{es ? "Ejemplos" : "Examples"}</h2>
          <ul className="examples">
            {examples.map((x, i) => <li key={i}><code>{p.fn}({x.args.map((a) => JSON.stringify(a)).join(", ")})</code> → <code>{JSON.stringify(x.expected)}</code></li>)}
          </ul>
          <div className="problem-folds">
            {p.hints.map((h, i) => (
              <details key={i} className="fold-mini"><summary>{es ? "Pista" : "Hint"} {i + 1}</summary><Markdown src={t(h, locale)} locale={locale} /></details>
            ))}
            <details className="fold-mini">
              <summary>{es ? "Solución y por qué funciona" : "Solution and why it works"}</summary>
              <CodeBlock code={p.solution} lang="python" title={`${p.complexity.time} · ${p.complexity.space}`} copyLabel={es ? "Copiar" : "Copy"} copiedLabel={es ? "Copiado" : "Copied"} />
              <Markdown src={t(p.explain, locale)} locale={locale} />
            </details>
          </div>
          {lab && <p className="problem-lab"><Link href={`/${locale}/labs/${lab.id}/`}>{es ? "Lab relacionado" : "Related lab"}: {t(lab.title, locale)} →</Link></p>}
        </article>
        <section className="problem-code" aria-label={es ? "Tu solución" : "Your solution"}>
          <CodeRunner id={p.id} fn={p.fn} starter={p.starter} tests={p.tests} compare={p.compare ?? "exact"} concept={p.concept} nextId={next?.id} locale={locale} />
        </section>
      </div>
    </main>
  );
}
