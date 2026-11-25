"use client";
// A mock system design round: one case, six timed phases, your notes, then a self-assessment.
// With role="interviewer" the same round is the sheet a friend uses to interview you (peer mock):
// the reference and the push-back questions are open, the notes are about the candidate, and the
// rubric ends in a write-up to send them (feedbackText in src/lib/design-round.ts).
// The case-specific "what a strong answer covers" is server-rendered and passed in per phase, so
// it costs no client JS; the timer, notes and history are local to this browser.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { addActivity, loadState, saveState } from "@/lib/practice/store";
import { feedbackText } from "@/lib/design-round";
import { CopyButton } from "../CopyButton";

export interface PhaseView { id: string; minutes: number; title: string; prompts: string[]; reference: ReactNode; followUp?: { q: string; a: ReactNode } }
export interface DimView { id: string; title: string; levels: string[]; study: { id: string; title: string }[] }
export interface Attempt { caseId: string; at: number; minutes: number; scores: Record<string, number> }

const KEY = "fg.design.v1";
export function loadAttempts(): Attempt[] {
  try { const a = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(a) ? a : []; } catch { return []; }
}
function saveAttempts(a: Attempt[]) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-100))); } catch { /* ignore */ } }
const NOTES = (id: string, role: Role) => `fg.design.${role === "interviewer" ? "inotes" : "notes"}.${id}`;
export type Role = "self" | "interviewer";

const T = {
  en: { start: "Start the round", pause: "Pause", resume: "Resume", next: "Next phase", finish: "Finish and assess", phase: "Phase", left: "left", over: "over time",
    notes: "Your notes (stay in this browser)", reveal: "What a strong answer covers", followUp: "The interviewer pushes back", showA: "Show a strong answer",
    assess: "Assess yourself honestly", save: "Save attempt", saved: "Saved · +30 XP", history: "Your attempts", weakest: "Weakest dimension", study: "Study", again: "Try another case",
    intro: (m: number) => `${m} minutes, like a real round. Talk out loud or write notes; reveal the reference only after each phase.`, total: "Total",
    friend: "Practice with a friend", friendHow: "Call a friend (Meet, Zoom), send them this interviewer sheet and open this page yourself. They read the question, push back and score you.", copyLink: "Copy link", copied: "Copied",
    iIntro: (m: number) => `You are the interviewer: ${m} minutes. Read the question aloud and then mostly listen: let the candidate drive. Each phase shows what to listen for, one question to push back with and what a strong answer covers.`,
    iCandidate: "The candidate opens", iListen: "Listen for", iAsk: "Ask", iRef: "What a strong answer covers", iNotes: "Your notes on the candidate (stay in this browser)",
    iAssess: "Score the candidate", iWrite: "Write the feedback", iDone: "Send this to the candidate", iCopy: "Copy feedback", iAgain: "Interview another case",
    iSay: (q: string) => `Say: "Today's question: ${q}." Then wait.` },
  es: { start: "Empezar la ronda", pause: "Pausar", resume: "Seguir", next: "Siguiente fase", finish: "Terminar y evaluar", phase: "Fase", left: "restantes", over: "pasado del tiempo",
    notes: "Tus notas (quedan en este navegador)", reveal: "Qué cubriría una respuesta fuerte", followUp: "El entrevistador te presiona", showA: "Ver una respuesta fuerte",
    assess: "Evalúate con honestidad", save: "Guardar intento", saved: "Guardado · +30 XP", history: "Tus intentos", weakest: "Dimensión más débil", study: "Repasa", again: "Probar otro caso",
    intro: (m: number) => `${m} minutos, como una ronda real. Habla en voz alta o escribe notas; abre la referencia solo al terminar cada fase.`, total: "Total",
    friend: "Practica con un amigo", friendHow: "Llama a un amigo (Meet, Zoom), mándale esta hoja de entrevistador y abre tú esta página. Él lee la pregunta, te presiona y te evalúa.", copyLink: "Copiar link", copied: "Copiado",
    iIntro: (m: number) => `Tú entrevistas: ${m} minutos. Lee la pregunta en voz alta y después escucha: deja que el candidato conduzca. Cada fase muestra qué escuchar, una pregunta para presionar y qué cubriría una respuesta fuerte.`,
    iCandidate: "El candidato abre", iListen: "Escucha si cubre", iAsk: "Pregunta", iRef: "Qué cubriría una respuesta fuerte", iNotes: "Tus notas sobre el candidato (quedan en este navegador)",
    iAssess: "Evalúa al candidato", iWrite: "Escribir el feedback", iDone: "Mándale esto al candidato", iCopy: "Copiar feedback", iAgain: "Entrevistar otro caso",
    iSay: (q: string) => `Di: "La pregunta de hoy: ${q}." Y espera.` },
};

const mmss = (s: number) => `${s < 0 ? "-" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

export function DesignRound({ caseId, title, phases, rubric, locale, role = "self" }: { caseId: string; title: string; phases: PhaseView[]; rubric: DimView[]; locale: Locale; role?: Role }) {
  const t = T[locale];
  const iv = role === "interviewer";
  // Absolute links to copy into a chat; the origin is only known in the browser.
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const candidateUrl = `${origin}/${locale}/practice/design/${caseId}/`;
  const interviewerUrl = `${candidateUrl}interviewer/`;
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
    try { setNotes(JSON.parse(localStorage.getItem(NOTES(caseId, role)) ?? "{}")); } catch { /* ignore */ }
  }, [caseId, role]);
  useEffect(() => {
    if (!running) return;
    const h = setInterval(() => setElapsed((e) => e.map((v, i) => (i === idx ? v + 1 : v))), 1000);
    return () => clearInterval(h);
  }, [running, idx]);

  const writeNote = (pid: string, v: string) => {
    const n = { ...notes, [pid]: v };
    setNotes(n);
    try { localStorage.setItem(NOTES(caseId, role), JSON.stringify(n)); } catch { /* ignore */ }
  };
  const used = elapsed.reduce((n, v) => n + v, 0);
  const p = phases[idx];
  const left = p.minutes * 60 - elapsed[idx];

  const save = () => {
    if (iv) {
      // Interviewing a friend is practice too (it counts for the streak), but the scores are theirs.
      const st = loadState(); addActivity(st, new Date(), 20, true); saveState(st);
      setStage("done");
      return;
    }
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
      <p className="dr-intro">{iv ? t.iIntro(total / 60) : t.intro(total / 60)}</p>
      {iv && <p className="dr-say">🎤 {t.iSay(title.replace(/^(Design|Diseño)\s*:\s*/i, ""))}</p>}
      <ol className="dr-plan">{phases.map((ph) => <li key={ph.id}><strong>{ph.title}</strong><span>{ph.minutes} min</span></li>)}</ol>
      <button type="button" className="btn btn-primary" onClick={() => { setStage("run"); setRunning(true); }}>{t.start}</button>
      {origin && (
        <div className="dr-peer">
          <strong>👥 {iv ? t.iCandidate : t.friend}</strong>
          {!iv && <span>{t.friendHow}</span>}
          <span className="dr-link"><code>{iv ? candidateUrl : interviewerUrl}</code><CopyButton text={iv ? candidateUrl : interviewerUrl} label={t.copyLink} done={t.copied} /></span>
        </div>
      )}
      {!iv && history.filter((h) => h.caseId === caseId).length > 0 && <History history={history.filter((h) => h.caseId === caseId)} rubric={rubric} t={t} locale={locale} />}
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
        {iv && <p className="section-label">{t.iListen}</p>}
        <ul className={iv ? "dr-prompts dr-listen" : "dr-prompts"}>{p.prompts.map((q, i) => <li key={i}>{q}</li>)}</ul>
        <label className="dr-notes"><span>{iv ? t.iNotes : t.notes}</span>
          <textarea value={notes[p.id] ?? ""} onChange={(e) => writeNote(p.id, e.target.value)} rows={iv ? 4 : 8} />
        </label>
        {p.followUp && (
          <details key={`f-${p.id}`} className="fold-mini dr-follow" open={iv}><summary>🎤 {iv ? t.iAsk : t.followUp}: {p.followUp.q}</summary><div>{p.followUp.a}</div></details>
        )}
        <details key={`r-${p.id}`} className="fold-mini dr-ref" open={iv}><summary>{iv ? t.iRef : t.reveal}</summary><div>{p.reference}</div></details>
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
      <h2>{iv ? t.iAssess : t.assess}</h2>
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
      <button type="button" className="btn btn-primary" disabled={Object.keys(scores).length < rubric.length} onClick={save}>{iv ? t.iWrite : t.save}</button>
    </div>
  );

  if (iv) {
    const text = feedbackText({ title, minutes: Math.round(used / 60), locale, origin, rubric, scores, phases, notes });
    return (
      <div className="dr">
        <h2>{t.iDone}</h2>
        <pre className="dr-feedback">{text}</pre>
        <div className="dr-actions">
          <CopyButton text={text} label={t.iCopy} done={t.copied} />
          <Link className="btn" href={`/${locale}/practice/design/`}>{t.iAgain} →</Link>
        </div>
      </div>
    );
  }

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
