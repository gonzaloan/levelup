"use client";
// A mock system design round: one case, six timed phases, your notes, then a self-assessment.
// The case-specific "what a strong answer covers" is server-rendered and passed in per phase, so
// it costs no client JS; the timer, notes and history are local to this browser.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { addActivity, loadState, saveState } from "@/lib/practice/store";

export interface PhaseView { id: string; minutes: number; title: string; prompts: string[]; reference: ReactNode; followUp?: { q: string; a: ReactNode } }
export interface DimView { id: string; title: string; levels: string[]; study: { id: string; title: string }[] }
export interface Attempt { caseId: string; at: number; minutes: number; scores: Record<string, number> }

const KEY = "fg.design.v1";
export function loadAttempts(): Attempt[] {
  try { const a = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(a) ? a : []; } catch { return []; }
}
function saveAttempts(a: Attempt[]) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-100))); } catch { /* ignore */ } }
const NOTES = (id: string) => `fg.design.notes.${id}`;

const T = {
  en: { start: "Start the round", pause: "Pause", resume: "Resume", next: "Next phase", finish: "Finish and assess", phase: "Phase", left: "left", over: "over time",
    notes: "Your notes (stay in this browser)", reveal: "What a strong answer covers", followUp: "The interviewer pushes back", showA: "Show a strong answer",
    assess: "Assess yourself honestly", save: "Save attempt", saved: "Saved · +30 XP", history: "Your attempts", weakest: "Weakest dimension", study: "Study", again: "Try another case",
    intro: (m: number) => `${m} minutes, like a real round. Talk out loud or write notes; reveal the reference only after each phase.`, total: "Total" },
  es: { start: "Empezar la ronda", pause: "Pausar", resume: "Seguir", next: "Siguiente fase", finish: "Terminar y evaluar", phase: "Fase", left: "restantes", over: "pasado del tiempo",
    notes: "Tus notas (quedan en este navegador)", reveal: "Qué cubriría una respuesta fuerte", followUp: "El entrevistador te presiona", showA: "Ver una respuesta fuerte",
    assess: "Evalúate con honestidad", save: "Guardar intento", saved: "Guardado · +30 XP", history: "Tus intentos", weakest: "Dimensión más débil", study: "Repasa", again: "Probar otro caso",
    intro: (m: number) => `${m} minutos, como una ronda real. Habla en voz alta o escribe notas; abre la referencia solo al terminar cada fase.`, total: "Total" },
};

const mmss = (s: number) => `${s < 0 ? "-" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

export function DesignRound({ caseId, title, phases, rubric, locale }: { caseId: string; title: string; phases: PhaseView[]; rubric: DimView[]; locale: Locale }) {
  const t = T[locale];
  const total = phases.reduce((n, p) => n + p.minutes, 0) * 60;
  const [stage, setStage] = useState<"intro" | "run" | "assess" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number[]>(() => phases.map(() => 0));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<Attempt[]>([]);

  useEffect(() => {
    setHistory(loadAttempts());
    try { setNotes(JSON.parse(localStorage.getItem(NOTES(caseId)) ?? "{}")); } catch { /* ignore */ }
  }, [caseId]);
  useEffect(() => {
    if (!running) return;
    const h = setInterval(() => setElapsed((e) => e.map((v, i) => (i === idx ? v + 1 : v))), 1000);
    return () => clearInterval(h);
  }, [running, idx]);

  const writeNote = (pid: string, v: string) => {
    const n = { ...notes, [pid]: v };
    setNotes(n);
    try { localStorage.setItem(NOTES(caseId), JSON.stringify(n)); } catch { /* ignore */ }
  };
  const used = elapsed.reduce((n, v) => n + v, 0);
  const p = phases[idx];
  const left = p.minutes * 60 - elapsed[idx];

  const save = () => {
    const a: Attempt = { caseId, at: Date.now(), minutes: Math.round(used / 60), scores };
    const all = [...loadAttempts(), a];
    saveAttempts(all);
    setHistory(all);
    const st = loadState(); addActivity(st, new Date(), 30, true); st.read[caseId] ??= Date.now(); saveState(st);
    setStage("done");
  };

  // Averages per dimension over all saved attempts: the weakest one points to what to study.
  const avg = useMemo(() => Object.fromEntries(rubric.map((d) => {
    const xs = history.map((h) => h.scores[d.id]).filter((x): x is number => typeof x === "number");
    return [d.id, xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN];
  })), [history, rubric]);
  const weakest = rubric.filter((d) => !Number.isNaN(avg[d.id])).sort((a, b) => avg[a.id] - avg[b.id])[0];

  if (stage === "intro") return (
    <div className="dr">
      <p className="dr-intro">{t.intro(total / 60)}</p>
      <ol className="dr-plan">{phases.map((ph) => <li key={ph.id}><strong>{ph.title}</strong><span>{ph.minutes} min</span></li>)}</ol>
      <button type="button" className="btn btn-primary" onClick={() => { setStage("run"); setRunning(true); }}>{t.start}</button>
      {history.filter((h) => h.caseId === caseId).length > 0 && <History history={history.filter((h) => h.caseId === caseId)} rubric={rubric} t={t} locale={locale} />}
    </div>
  );

  if (stage === "run") return (
    <div className="dr">
      <div className="dr-bar" role="timer" aria-live="off">
        <span className="dr-step">{t.phase} {idx + 1}/{phases.length}</span>
        <span className={`dr-clock${left < 0 ? " over" : ""}`}>{mmss(left)} {left < 0 ? t.over : t.left}</span>
        <span className="dr-total">{t.total} {mmss(used)} / {mmss(total)}</span>
        <button type="button" className="btn" onClick={() => setRunning(!running)}>{running ? t.pause : t.resume}</button>
      </div>
      <div className="dr-progress">{phases.map((ph, i) => <span key={ph.id} className={i < idx ? "past" : i === idx ? "now" : ""} style={{ flex: ph.minutes }} />)}</div>
      <section className="dr-phase">
        <h2>{p.title}</h2>
        <ul className="dr-prompts">{p.prompts.map((q, i) => <li key={i}>{q}</li>)}</ul>
        <label className="dr-notes"><span>{t.notes}</span>
          <textarea value={notes[p.id] ?? ""} onChange={(e) => writeNote(p.id, e.target.value)} rows={8} />
        </label>
        {p.followUp && (
          <details className="fold-mini dr-follow"><summary>🎤 {t.followUp}: {p.followUp.q}</summary><div>{p.followUp.a}</div></details>
        )}
        <details className="fold-mini dr-ref"><summary>{t.reveal}</summary><div>{p.reference}</div></details>
      </section>
      <div className="dr-actions">
        {idx + 1 < phases.length
          ? <button type="button" className="btn btn-primary" onClick={() => setIdx(idx + 1)}>{t.next} →</button>
          : <button type="button" className="btn btn-primary" onClick={() => { setRunning(false); setStage("assess"); }}>{t.finish}</button>}
      </div>
    </div>
  );

  if (stage === "assess") return (
    <div className="dr">
      <h2>{t.assess}</h2>
      <div className="dr-rubric">
        {rubric.map((d) => (
          <fieldset key={d.id}>
            <legend>{d.title}</legend>
            <div className="dr-levels">
              {d.levels.map((lv, i) => (
                <button key={i} type="button" className={scores[d.id] === i + 1 ? "on" : undefined} aria-pressed={scores[d.id] === i + 1}
                  onClick={() => setScores({ ...scores, [d.id]: i + 1 })}><b>{i + 1}</b> {lv}</button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <button type="button" className="btn btn-primary" disabled={Object.keys(scores).length < rubric.length} onClick={save}>{t.save}</button>
    </div>
  );

  return (
    <div className="dr">
      <p className="cr-notice">{t.saved}</p>
      {weakest && (
        <div className="dr-weak">
          <strong>{t.weakest}: {weakest.title} ({avg[weakest.id].toFixed(1)}/4)</strong>
          <span>{t.study}: {weakest.study.map((s, i) => <span key={s.id}>{i ? " · " : ""}<Link href={`/${locale}/c/${s.id}/`}>{s.title}</Link></span>)}</span>
        </div>
      )}
      <History history={history} rubric={rubric} t={t} locale={locale} />
      <Link className="btn" href={`/${locale}/practice/design/`}>{t.again} →</Link>
      <span className="sr">{title}</span>
    </div>
  );
}

function History({ history, rubric, t, locale }: { history: Attempt[]; rubric: DimView[]; t: (typeof T)["en"]; locale: Locale }) {
  return (
    <div className="dr-history">
      <h3 className="section-label">{t.history}</h3>
      <table>
        <thead><tr><th />{rubric.map((d) => <th key={d.id} title={d.title}>{d.title.split(" ")[0]}</th>)}</tr></thead>
        <tbody>
          {history.slice(-8).reverse().map((h) => (
            <tr key={h.at}><td>{new Date(h.at).toLocaleDateString(locale)} · {h.caseId.replace(/^case-/, "")}</td>{rubric.map((d) => <td key={d.id} className={`lv lv-${h.scores[d.id] ?? 0}`}>{h.scores[d.id] ?? "–"}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Best average score for a case, for the case list. */
export function BestScore({ caseId }: { caseId: string }) {
  const [best, setBest] = useState<number | null>(null);
  useEffect(() => {
    const xs = loadAttempts().filter((a) => a.caseId === caseId).map((a) => Object.values(a.scores).reduce((s, v) => s + v, 0) / Math.max(1, Object.values(a.scores).length));
    setBest(xs.length ? Math.max(...xs) : null);
  }, [caseId]);
  return best === null ? null : <span className="dr-best">{best.toFixed(1)}/4</span>;
}
