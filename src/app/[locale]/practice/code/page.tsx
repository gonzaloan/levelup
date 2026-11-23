import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { DIFF, t } from "@/lib/i18n";
import { getConcept, getProblems } from "@/lib/content";
import { Emoji, Illustration } from "@/components/Visual";
import { Icon } from "@/components/Icon";
import { SolvedMark } from "@/components/practice/SolvedMark";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/practice/code/", locale === "es" ? "Coding en Python" : "Python coding", locale === "es" ? "Problemas de entrevista por patrón: escribe la función y córrela contra tests en tu navegador." : "Interview problems by pattern: write the function and run it against tests in your browser.");
}

export default async function CodeIndex({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  const problems = getProblems();
  const byConcept = new Map<string, typeof problems>();
  for (const p of problems) byConcept.set(p.concept, [...(byConcept.get(p.concept) ?? []), p]);
  return (
    <main className="page code-page">
      <header className="page-head plain">
        <div>
          <h1>{es ? "Coding en Python" : "Python coding"}</h1>
          <p className="page-sub">{es
            ? `${problems.length} problemas de entrevista ordenados por patrón. Escribe la función y córrela contra los tests aquí mismo: Python corre en tu navegador.`
            : `${problems.length} interview problems by pattern. Write the function and run it against the tests right here: Python runs in your browser.`}</p>
        </div>
      </header>
      <Link href={`/${locale}/practice/code/mock/`} className="lab-promo-card code-mock-promo">
        <Emoji name="stopwatch" size={34} />
        <span>
          <small>{es ? "Simulacro" : "Mock interview"}</small>
          <strong>{es ? "Dos problemas en 45 minutos, sin pistas" : "Two problems in 45 minutes, no hints"}</strong>
          <span>{es ? "Como una ronda real: un problema más fácil y uno más difícil, de patrones distintos." : "Like a real round: an easier and a harder problem, from different patterns."}</span>
        </span>
        <Icon name="right" size={18} />
      </Link>
      {[...byConcept.entries()].map(([cid, list]) => {
        const c = getConcept(cid);
        return (
          <section key={cid} className="code-group">
            <h2><Illustration id={cid} size={26} /> <Link href={`/${locale}/c/${cid}/`}>{t(c?.title, locale)}</Link></h2>
            <ul className="code-list">
              {list.map((p) => (
                <li key={p.id}>
                  <Link href={`/${locale}/practice/code/${p.id}/`}>
                    <span className="cl-title">{t(p.title, locale)}</span>
                    <span className={`diff diff-${p.difficulty}`}>{DIFF[p.difficulty][locale]}</span>
                    <SolvedMark id={p.id} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
