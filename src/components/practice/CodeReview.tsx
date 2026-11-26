"use client";
// Re-solve from memory: the solved problems that are due (src/lib/practice/resolve.ts), one at a
// time, from the bare starter and with pasting off, so it is recall, not copy. Solved cold climbs
// the ladder; "I don't remember it" brings it back tomorrow and opens the worked solution.
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { addActivity, loadState, saveState } from "@/lib/practice/store";
import { inlineMd } from "@/lib/practice/md";
import { loadCode, saveCode } from "@/lib/practice/code-store";
import { afterReview, dueProblems, nextDue, recOf } from "@/lib/practice/resolve";
import type { MockProblem as Prob } from "@/lib/practice/mock";
import { CodeRunner } from "./CodeRunner";

const LOADERS = { en: () => import("@/generated/problems-en.json"), es: () => import("@/generated/problems-es.json") };
const DAY = 86_400_000;

const T = {
  en: { loading: "Loading…", none: "Nothing to re-solve today.", nextOn: (d: string) => `The next one comes back on ${d}.`, noSolved: "Solve a problem first: it comes back here 3 days later.",
    browse: "Browse problems", of: (k: number, n: number) => `${k} of ${n} due`, examples: "Examples", forgot: "I don't remember it",
    okBack: (d: number) => `✓ Solved from memory · back in ${d} days · +15 XP`, forgotBack: "It comes back tomorrow. Study the solution, then try it again.",
    solution: "See the solution", next: "Next problem", done: "All done for today.", manual: "From memory: no pasting, starter code only." },
  es: { loading: "Cargando…", none: "Nada que re-resolver hoy.", nextOn: (d: string) => `El próximo vuelve el ${d}.`, noSolved: "Primero resuelve un problema: vuelve aquí 3 días después.",
    browse: "Ver problemas", of: (k: number, n: number) => `${k} de ${n} pendientes`, examples: "Ejemplos", forgot: "No me acuerdo",
    okBack: (d: number) => `✓ Resuelto de memoria · vuelve en ${d} días · +15 XP`, forgotBack: "Vuelve mañana. Estudia la solución y después inténtalo de nuevo.",
    solution: "Ver la solución", next: "Siguiente problema", done: "Listo por hoy.", manual: "De memoria: sin pegar, solo con el código inicial." },
};

export function CodeReview({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [all, setAll] = useState<Prob[] | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [verdict, setVerdict] = useState<{ ok: boolean; days: number } | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [hasSolved, setHasSolved] = useState(false);

  useEffect(() => {
    void LOADERS[locale]().then((m) => {
      const probs = m.default as Prob[];
      const s = loadCode(), now = Date.now();
      setAll(probs);
      setQueue(dueProblems(s.solved, s.reviews, now).filter((id) => probs.some((p) => p.id === id)));
      setNext(nextDue(s.solved, s.reviews));
      setHasSolved(Object.keys(s.solved).length > 0);
    });
  }, [locale]);

  if (!all) return <p className="plan-msg">{t.loading}</p>;
  const fmt = (ms: number) => new Date(ms).toLocaleDateString(locale, { day: "numeric", month: "long" });

  if (i >= queue.length) return (
    <div className="dr">
      <p className="dr-intro">{queue.length ? t.done : !hasSolved ? t.noSolved : t.none}{next && next > Date.now() ? ` ${t.nextOn(fmt(next))}` : ""}</p>
      <Link className="btn" href={`/${locale}/practice/code/`}>{t.browse} →</Link>
    </div>
  );

  const p = all.find((x) => x.id === queue[i])!;
  const grade = (ok: boolean) => {
    if (verdict) return;
    const s = loadCode(), now = Date.now();
    const rec = afterReview(recOf(p.id, s.solved, s.reviews)!, ok, now);
    s.reviews[p.id] = rec; saveCode(s);
    if (ok) { const st = loadState(); addActivity(st, new Date(), 15, true); saveState(st); }
    setVerdict({ ok, days: Math.round((rec.due - now) / DAY) });
  };
  const rec = recOf(p.id, loadCode().solved, loadCode().reviews);

  return (
    <div className="problem-grid">
      <article className="problem-text">
        <p className="eyebrow">{t.of(i + 1, queue.length)}</p>
        <h2 className="cm-title">{p.t}</h2>
        <div className="md" dangerouslySetInnerHTML={{ __html: inlineMd(p.prompt) }} />
        <h3 className="section-label">{t.examples}</h3>
        <ul className="examples">
          {p.tests.filter((x) => x.visible).map((x, k) => <li key={k}><code>{p.fn}({x.args.map((a) => JSON.stringify(a)).join(", ")})</code> → <code>{JSON.stringify(x.expected)}</code></li>)}
        </ul>
        <p className="lab-note">{t.manual}</p>
        {verdict ? (
          <div className={`cr-review ${verdict.ok ? "ok" : "bad"}`}>
            <strong>{verdict.ok ? t.okBack(verdict.days) : t.forgotBack}</strong>
            <div className="dr-actions">
              {!verdict.ok && <Link className="btn" href={`/${locale}/practice/code/${p.id}/`}>{t.solution} →</Link>}
              <button type="button" className="btn btn-primary" onClick={() => { setVerdict(null); setI(i + 1); }}>{t.next} →</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => grade(false)}>{t.forgot}</button>
        )}
      </article>
      <section className="problem-code">
        {/* A fresh draft per attempt: the earlier solution is never pre-filled. */}
        <CodeRunner key={p.id} id={p.id} draftId={`review:${p.id}:${rec?.n ?? 0}:${rec?.due ?? 0}`} fn={p.fn} starter={p.starter} tests={p.tests} compare={p.compare} concept={p.c} locale={locale} perf={p.perf} noPaste
          onResult={(passed, total) => { if (total && passed === total) grade(true); }} />
      </section>
    </div>
  );
}
