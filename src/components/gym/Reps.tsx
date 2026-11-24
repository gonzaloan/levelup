"use client";
// One card per kind of rep. Each asks for one thing you produce by hand, then shows the truth and
// calls onDone(score 0–1). Paste is blocked in every answer field: the Gym is manual by design.
import { useEffect, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import type { Locale } from "@/lib/types";
import type { BigORep, DebugRep, EstimateRep, TraceRep } from "@/lib/gym/types";
import { gradeEstimate, human, parseAmount } from "@/lib/gym/estimate";
import type { MockProblem } from "@/lib/practice/mock";
import { inlineMd } from "@/lib/practice/md";
import { CodeRunner } from "../practice/CodeRunner";
import s from "./gym.module.css";

export type Done = (score: number) => void;
type Lang = { locale: Locale };

const T = {
  en: {
    check: "Check", next: "Next", answer: "Your answer", truth: "Answer", typeIt: "Type it, no calculator", unit: { count: "", rps: "requests/s (e.g. 5.8k)", bytes: "bytes (e.g. 12 TB)", bps: "bytes/s (e.g. 300 MB/s)", servers: "servers" },
    grade: (x: number) => (x === 1 ? "Spot on" : x >= 0.6 ? "Close: within 2×" : x > 0 ? "Right order of magnitude" : "Off by more than 10×"),
    off: (r: string) => `${r} off`, prints: "What does it print?", printsPh: "Exactly what Python prints", right: "Right", wrong: "Not quite",
    tapLine: "Tap the line with the bug.", should: "should return", returns: "but returns", again: "Not that one. One more try.", fix: "The fix",
    pickO: "Its time complexity?", cold: "Explain it in 2–4 sentences, without looking.", coldPh: "In your own words: what it is, how it works, when you'd use it.",
    compare: "Compare with the key points", covered: "Tick what your explanation covered (be honest)", done: "Done",
    blankHelp: "Write it from the signature. No hints, no paste. Run the tests when you're ready.", finish: "Finish", giveUp: "Skip",
    noPaste: "Manual mode: type it yourself.", needMore: "Write a little more first.",
  },
  es: {
    check: "Revisar", next: "Siguiente", answer: "Tu respuesta", truth: "Respuesta", typeIt: "Escríbelo, sin calculadora", unit: { count: "", rps: "requests/s (ej: 5.8k)", bytes: "bytes (ej: 12 TB)", bps: "bytes/s (ej: 300 MB/s)", servers: "servidores" },
    grade: (x: number) => (x === 1 ? "Clavado" : x >= 0.6 ? "Cerca: dentro de 2×" : x > 0 ? "Orden de magnitud correcto" : "Lejos: más de 10×"),
    off: (r: string) => `${r} de diferencia`, prints: "¿Qué imprime?", printsPh: "Exactamente lo que imprime Python", right: "Correcto", wrong: "No exactamente",
    tapLine: "Toca la línea con el bug.", should: "debería devolver", returns: "pero devuelve", again: "Esa no. Un intento más.", fix: "La corrección",
    pickO: "¿Su complejidad de tiempo?", cold: "Explícalo en 2–4 frases, sin mirar.", coldPh: "Con tus palabras: qué es, cómo funciona, cuándo lo usarías.",
    compare: "Comparar con los puntos clave", covered: "Marca lo que tu explicación cubrió (con honestidad)", done: "Listo",
    blankHelp: "Escríbelo desde la firma. Sin pistas, sin pegar. Corre los tests cuando estés listo.", finish: "Terminar", giveUp: "Saltar",
    noPaste: "Modo manual: escríbelo tú.", needMore: "Escribe un poco más primero.",
  },
};

/** Blocks paste and shows why, once. */
function useNoPaste(locale: Locale) {
  const [note, setNote] = useState(false);
  return { note: note ? T[locale].noPaste : null, onPaste: (e: ClipboardEvent) => { e.preventDefault(); setNote(true); } };
}

function Code({ lines, onLine, marks }: { lines: string[]; onLine?: (i: number) => void; marks?: Record<number, "bad" | "good"> }) {
  return (
    <pre className={s.code}>
      {lines.map((l, i) => {
        const body = <><i aria-hidden>{i + 1}</i>{l || " "}</>;
        return onLine
          ? <button key={i} type="button" className={`${s.line} ${s.tap} ${marks?.[i] ? s[marks[i]] : ""}`} onClick={() => onLine(i)} aria-label={`${i + 1}: ${l}`}>{body}</button>
          : <span key={i} className={s.line}>{body}</span>;
      })}
    </pre>
  );
}

function Result({ ok, title, children }: { ok: "good" | "mid" | "bad"; title: string; children?: ReactNode }) {
  return <div className={`${s.result} ${s[ok]}`} role="status"><strong>{title}</strong>{children}</div>;
}

function NextBtn({ onClick, locale }: { onClick: () => void; locale: Locale }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <button ref={ref} type="button" className={`btn btn-primary ${s.go}`} onClick={onClick}>{T[locale].next} →</button>;
}

/* ------------------------------------------------------------------ estimate */
export function EstimateCard({ rep, onDone, locale }: { rep: EstimateRep; onDone: Done } & Lang) {
  const t = T[locale];
  const [v, setV] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const np = useNoPaste(locale);
  const guess = parseAmount(v, rep.unit);
  const check = () => { if (guess !== null) setScore(gradeEstimate(guess, rep.answer)); };
  const ratio = guess ? Math.max(guess / rep.answer, rep.answer / guess) : 0;
  return (
    <div className={s.rep}>
      <p className={s.prompt}>{rep.prompt[locale]}</p>
      <form className={s.answer} onSubmit={(e) => { e.preventDefault(); if (score === null) check(); }}>
        <label><span>{t.answer} <small>{t.unit[rep.unit]}</small></span>
          <input value={v} onChange={(e) => setV(e.target.value)} onPaste={np.onPaste} inputMode="text" autoComplete="off" spellCheck={false} disabled={score !== null} placeholder={t.typeIt} aria-invalid={v !== "" && guess === null} />
        </label>
        {score === null && <button type="submit" className="btn btn-primary" disabled={guess === null}>{t.check}</button>}
      </form>
      {np.note && <p className={s.note}>{np.note}</p>}
      {score !== null && (
        <>
          <Result ok={score === 1 ? "good" : score > 0 ? "mid" : "bad"} title={t.grade(score)}>
            <span>{t.truth}: <b>≈ {human(rep.answer, rep.unit)}</b> · {t.off(`${ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}×`)}</span>
          </Result>
          <ol className={s.steps}>{rep.steps.map((x, i) => <li key={i}>{x[locale]}</li>)}</ol>
          <NextBtn onClick={() => onDone(score)} locale={locale} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ trace */
/** Whitespace and wrapping quotes don't count: "[1,2]" equals "[1, 2]", 'abc' equals abc. */
export const sameOutput = (a: string, b: string) => {
  const norm = (x: string) => x.trim().replace(/^(['"])([\s\S]*)\1$/, "$2").replace(/\s+/g, "");
  return norm(a) === norm(b);
};

export function TraceCard({ rep, onDone, locale }: { rep: TraceRep; onDone: Done } & Lang) {
  const t = T[locale];
  const [v, setV] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);
  const np = useNoPaste(locale);
  return (
    <div className={s.rep}>
      <p className={s.prompt}>{t.prints}</p>
      <Code lines={rep.code} />
      <form className={s.answer} onSubmit={(e) => { e.preventDefault(); if (ok === null && v.trim()) setOk(sameOutput(v, rep.answer)); }}>
        <label><span>{t.answer}</span>
          <input className={s.mono} value={v} onChange={(e) => setV(e.target.value)} onPaste={np.onPaste} autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={ok !== null} placeholder={t.printsPh} />
        </label>
        {ok === null && <button type="submit" className="btn btn-primary" disabled={!v.trim()}>{t.check}</button>}
      </form>
      {np.note && <p className={s.note}>{np.note}</p>}
      {ok !== null && (
        <>
          <Result ok={ok ? "good" : "bad"} title={ok ? t.right : t.wrong}><span>{t.truth}: <code>{rep.answer}</code></span></Result>
          <p className={s.why}>{rep.why[locale]}</p>
          <NextBtn onClick={() => onDone(ok ? 1 : 0)} locale={locale} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ debug */
export function DebugCard({ rep, onDone, locale }: { rep: DebugRep; onDone: Done } & Lang) {
  const t = T[locale];
  const [tries, setTries] = useState<number[]>([]);
  const found = tries.includes(rep.bugLine);
  const over = found || tries.length >= 2;
  const marks: Record<number, "bad" | "good"> = Object.fromEntries(tries.map((i) => [i, i === rep.bugLine ? "good" : "bad"]));
  if (over) marks[rep.bugLine] = "good";
  const score = found ? (tries.length === 1 ? 1 : 0.5) : 0;
  return (
    <div className={s.rep}>
      <p className={s.prompt}>{rep.task[locale]}</p>
      <p className={s.call}><code>{rep.call}</code> {t.should} <code>{rep.expected}</code> {t.returns} <code className={s.badText}>{rep.got}</code>.</p>
      <p className={s.hint}>{over ? "" : tries.length ? t.again : t.tapLine}</p>
      <Code lines={rep.code} marks={marks} onLine={over ? undefined : (i) => setTries((x) => (x.includes(i) ? x : [...x, i]))} />
      {over && (
        <>
          <Result ok={score === 1 ? "good" : score > 0 ? "mid" : "bad"} title={found ? t.right : t.wrong}>
            <span>{t.fix}: <code>{rep.fixed.trim()}</code></span>
          </Result>
          <p className={s.why}>{rep.why[locale]}</p>
          <NextBtn onClick={() => onDone(score)} locale={locale} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ big-O */
export function BigOCard({ rep, onDone, locale }: { rep: BigORep; onDone: Done } & Lang) {
  const t = T[locale];
  const [pick, setPick] = useState<string | null>(null);
  return (
    <div className={s.rep}>
      <p className={s.prompt}>{t.pickO}</p>
      <Code lines={rep.code} />
      <div className={s.options} role="group" aria-label={t.pickO}>
        {rep.options.map((o) => (
          <button key={o} type="button" disabled={pick !== null} onClick={() => setPick(o)}
            className={pick === null ? undefined : o === rep.answer ? s.good : o === pick ? s.bad : s.dim}>{o}</button>
        ))}
      </div>
      {pick !== null && (
        <>
          <Result ok={pick === rep.answer ? "good" : "bad"} title={pick === rep.answer ? t.right : `${t.wrong}: ${rep.answer}`} />
          <p className={s.why}>{rep.why[locale]}</p>
          <NextBtn onClick={() => onDone(pick === rep.answer ? 1 : 0)} locale={locale} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ explain */
export function ExplainCard({ title, points, onDone, locale }: { title: string; points: string[]; onDone: Done } & Lang) {
  const t = T[locale];
  const [v, setV] = useState("");
  const [stage, setStage] = useState<"write" | "check">("write");
  const [ticked, setTicked] = useState<boolean[]>(() => points.map(() => false));
  const np = useNoPaste(locale);
  const enough = v.trim().split(/\s+/).length >= 12;
  return (
    <div className={s.rep}>
      <p className={s.eyebrow}>{t.cold}</p>
      <p className={s.concept}>{title}</p>
      <textarea className={s.essay} value={v} onChange={(e) => setV(e.target.value)} onPaste={np.onPaste} rows={5} placeholder={t.coldPh} readOnly={stage === "check"} />
      {np.note && <p className={s.note}>{np.note}</p>}
      {stage === "write"
        ? <button type="button" className="btn btn-primary" disabled={!enough} onClick={() => setStage("check")} title={enough ? undefined : t.needMore}>{t.compare}</button>
        : (
          <>
            <p className={s.hint}>{t.covered}</p>
            <ul className={s.points}>
              {points.map((p, i) => (
                <li key={i}><label><input type="checkbox" checked={ticked[i]} onChange={() => setTicked((x) => x.map((y, k) => (k === i ? !y : y)))} /><span dangerouslySetInnerHTML={{ __html: inlineMd(p) }} /></label></li>
              ))}
            </ul>
            <button type="button" className={`btn btn-primary ${s.go}`} onClick={() => onDone(points.length ? ticked.filter(Boolean).length / points.length : 0)}>{t.done} →</button>
          </>
        )}
    </div>
  );
}

/* ------------------------------------------------------------------ blank page */
export function BlankCard({ prob, seed, onDone, locale }: { prob: MockProblem; seed: string; onDone: Done } & Lang) {
  const t = T[locale];
  const best = useRef<{ p: number; n: number } | null>(null);
  return (
    <div className={s.rep}>
      <p className={s.eyebrow}>{t.blankHelp}</p>
      <p className={s.concept}>{prob.t}</p>
      <div className={s.md} dangerouslySetInnerHTML={{ __html: inlineMd(prob.prompt) }} />
      <CodeRunner id={prob.id} draftId={`gym:${seed}`} fn={prob.fn} starter={prob.starter} tests={prob.tests} compare={prob.compare} concept={prob.c} locale={locale} noPaste
        onResult={(p, n) => { if (!best.current || p >= best.current.p) best.current = { p, n }; }} />
      <div className={s.row}>
        <button type="button" className="btn btn-primary" onClick={() => onDone(best.current ? best.current.p / best.current.n : 0)}>{t.finish} →</button>
        <button type="button" className="link-btn" onClick={() => onDone(0)}>{t.giveUp}</button>
      </div>
    </div>
  );
}
