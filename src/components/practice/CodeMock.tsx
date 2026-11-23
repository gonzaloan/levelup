"use client";
// A mock coding interview: two problems from different patterns, 45 minutes, no hints. The
// problems come from a lazily loaded index (statement, starter and tests only), each one runs in
// the shared Python worker, and the attempt is kept in this browser.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { addActivity, loadState, saveState } from "@/lib/practice/store";
import { inlineMd } from "@/lib/practice/md";
import { loadCode, saveCode } from "@/lib/practice/code-store";
import { CodeRunner } from "./CodeRunner";

interface Prob { id: string; c: string; ct: string; d: "easy" | "medium" | "hard"; t: string; prompt: string; fn: string; starter: string; tests: { args: unknown[]; expected: unknown; visible?: boolean }[]; compare: string }
interface Attempt { at: number; minutes: number; results: { id: string; t: string; passed: number; total: number }[] }

const MINUTES = 45;
const HIST = "fg.codemock.v1";
const CUR = "fg.codemock.cur";
const LOADERS = {
  en: () => import("@/generated/problems-en.json"),
  es: () => import("@/generated/problems-es.json"),
};
const read = <T,>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) ?? "null"); return v ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const mmss = (s: number) => `${s < 0 ? "-" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

const T = {
  en: { intro: `Two problems from different patterns, ${MINUTES} minutes, no hints: the shape of a real coding round. Talk through your approach out loud before you type.`,
    rules: ["Problem 1 is easy or medium; problem 2 is medium or hard.", "Unsolved problems come first.", "Hidden tests decide. You can run them as often as you like."],
    start: "Start the mock", loading: "Loading…", left: "left", over: "over time", finish: "Finish", problem: "Problem", examples: "Examples",
    done: "Mock finished · +30 XP", solved: "solved", partial: (a: number, b: number) => `${a}/${b} tests`, notRun: "not run", review: "Review the solution", again: "Another mock", history: "Your mocks", time: "Time", all: "All problems" },
  es: { intro: `Dos problemas de patrones distintos, ${MINUTES} minutos, sin pistas: la forma de una ronda de coding real. Explica tu enfoque en voz alta antes de escribir.`,
    rules: ["El problema 1 es fácil o medio; el 2 es medio o difícil.", "Primero salen los que no has resuelto.", "Deciden los tests ocultos. Puedes ejecutarlos las veces que quieras."],
    start: "Empezar el simulacro", loading: "Cargando…", left: "restantes", over: "pasado del tiempo", finish: "Terminar", problem: "Problema", examples: "Ejemplos",
    done: "Simulacro terminado · +30 XP", solved: "resuelto", partial: (a: number, b: number) => `${a}/${b} tests`, notRun: "sin ejecutar", review: "Ver la solución", again: "Otro simulacro", history: "Tus simulacros", time: "Tiempo", all: "Todos los problemas" },
};

/** Two problems: an easier and a harder one, different patterns, unsolved first, random among equals. */
export function pickTwo(all: Prob[], solved: Record<string, number>, rand: () => number): Prob[] {
  const order = (xs: Prob[]) => xs.map((p) => ({ p, k: (solved[p.id] ? 1 : 0) + rand() })).sort((a, b) => a.k - b.k).map((x) => x.p);
  const first = order(all.filter((p) => p.d !== "hard"))[0];
  if (!first) return all.slice(0, 2);
  const second = order(all.filter((p) => p.d !== "easy" && p.c !== first.c && p.id !== first.id))[0] ?? all.find((p) => p.id !== first.id);
  return second ? [first, second] : [first];
}

export function CodeMock({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [stage, setStage] = useState<"intro" | "loading" | "run" | "done">("intro");
  const [probs, setProbs] = useState<Prob[]>([]);
  const [tab, setTab] = useState(0);
  const [now, setNow] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [last, setLast] = useState<Attempt | null>(null);
  const startedAt = useRef(0);
  const best = useRef<Record<string, { passed: number; total: number }>>({});

  const begin = async (ids?: string[], at?: number, kept?: Record<string, { passed: number; total: number }>) => {
    setStage("loading");
    const all = (await LOADERS[locale]()).default as Prob[];
    const chosen = ids ? ids.map((id) => all.find((p) => p.id === id)).filter((p): p is Prob => !!p) : pickTwo(all, loadCode().solved, Math.random);
    if (chosen.length < 2) { setStage("intro"); return; }
    if (!ids) {
      // A fresh mock starts from the starter code, never from an earlier draft.
      const saved = loadCode();
      for (const p of chosen) delete saved.drafts[`mock:${p.id}`];
      saveCode(saved);
    }
    startedAt.current = at ?? Date.now();
    best.current = kept ?? {};
    write(CUR, { ids: chosen.map((p) => p.id), at: startedAt.current, best: best.current });
    setProbs(chosen); setTab(0); setNow(Date.now()); setStage("run");
  };

  useEffect(() => {
    setHistory(read<Attempt[]>(HIST, []));
    // A reload mid-mock resumes it (the clock kept running), unless it is hours old.
    const cur = read<{ ids: string[]; at: number; best?: Record<string, { passed: number; total: number }> } | null>(CUR, null);
    if (cur && Date.now() - cur.at < 3 * 3600_000) void begin(cur.ids, cur.at, cur.best); else write(CUR, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (stage !== "run") return;
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, [stage]);

  const record = (id: string, passed: number, total: number) => {
    const b = best.current[id];
    if (b && passed < b.passed) return;
    best.current[id] = { passed, total };
    write(CUR, { ids: probs.map((p) => p.id), at: startedAt.current, best: best.current });
  };

  const finish = () => {
    const a: Attempt = {
      at: Date.now(), minutes: Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)),
      results: probs.map((p) => ({ id: p.id, t: p.t, passed: best.current[p.id]?.passed ?? 0, total: best.current[p.id]?.total ?? 0 })),
    };
    const all = [...read<Attempt[]>(HIST, []), a].slice(-50);
    write(HIST, all); write(CUR, null);
    const st = loadState(); addActivity(st, new Date(), 30, true); saveState(st);
    setHistory(all); setLast(a); setStage("done");
  };

  if (stage === "intro" || stage === "loading") return (
    <div className="dr">
      <p className="dr-intro">{t.intro}</p>
      <ul className="dr-prompts">{t.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      <div><button type="button" className="btn btn-primary" disabled={stage === "loading"} onClick={() => void begin()}>{stage === "loading" ? t.loading : t.start}</button></div>
      {history.length > 0 && <MockHistory history={history} t={t} locale={locale} />}
    </div>
  );

  if (stage === "run") {
    const left = MINUTES * 60 - Math.floor((now - startedAt.current) / 1000);
    return (
      <div className="cm">
        <div className="dr-bar cm-bar" role="timer" aria-live="off">
          <div className="sb-tabs" role="tablist">
            {probs.map((p, i) => <button key={p.id} type="button" role="tab" aria-selected={tab === i} className={tab === i ? "on" : undefined} onClick={() => setTab(i)}>{t.problem} {i + 1}</button>)}
          </div>
          <span className={`dr-clock${left < 0 ? " over" : ""}`}>{mmss(left)}</span>
          <span className="dr-total">{left < 0 ? t.over : t.left}</span>
          <button type="button" className="btn" onClick={finish}>{t.finish}</button>
        </div>
        {probs.map((p, i) => (
          <div key={p.id} className="problem-grid" hidden={tab !== i}>
            <article className="problem-text">
              <h2 className="cm-title">{p.t}</h2>
              <div className="md" dangerouslySetInnerHTML={{ __html: inlineMd(p.prompt) }} />
              <h3 className="section-label">{t.examples}</h3>
              <ul className="examples">
                {p.tests.filter((x) => x.visible).map((x, k) => <li key={k}><code>{p.fn}({x.args.map((a) => JSON.stringify(a)).join(", ")})</code> → <code>{JSON.stringify(x.expected)}</code></li>)}
              </ul>
            </article>
            <section className="problem-code">
              <CodeRunner id={p.id} draftId={`mock:${p.id}`} fn={p.fn} starter={p.starter} tests={p.tests} compare={p.compare} concept={p.c} locale={locale}
                onResult={(passed, total) => record(p.id, passed, total)} />
            </section>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dr">
      <p className="cr-notice">{t.done}</p>
      {last && (
        <ul className="cm-results">
          {last.results.map((r) => (
            <li key={r.id} className={r.total && r.passed === r.total ? "ok" : "bad"}>
              <strong>{r.t}</strong>
              <span>{!r.total ? t.notRun : r.passed === r.total ? `✓ ${t.solved}` : t.partial(r.passed, r.total)}</span>
              <Link href={`/${locale}/practice/code/${r.id}/`}>{t.review} →</Link>
            </li>
          ))}
          <li><strong>{t.time}</strong><span>{last.minutes} min / {MINUTES}</span><span /></li>
        </ul>
      )}
      <MockHistory history={history} t={t} locale={locale} />
      <div className="sb-bar">
        <button type="button" className="btn btn-primary" onClick={() => void begin()}>{t.again}</button>
        <Link className="btn" href={`/${locale}/practice/code/`}>{t.all} →</Link>
      </div>
    </div>
  );
}

function MockHistory({ history, t, locale }: { history: Attempt[]; t: (typeof T)["en"]; locale: Locale }) {
  return (
    <div className="dr-history">
      <h3 className="section-label">{t.history}</h3>
      <table>
        <tbody>
          {history.slice(-6).reverse().map((h) => (
            <tr key={h.at}>
              <td>{new Date(h.at).toLocaleDateString(locale)} · {h.minutes} min</td>
              {h.results.map((r) => <td key={r.id} className={r.total && r.passed === r.total ? "lv lv-4" : "lv lv-2"} title={r.t}>{r.total ? `${r.passed}/${r.total}` : "–"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
