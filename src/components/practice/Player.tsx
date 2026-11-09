"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import type { Confidence, PItem, Response } from "@/lib/practice/types";
import { grade } from "@/lib/practice/grade";
import { addActivity, review, toRating, xpFor, levelOf, totalXp, streakOf } from "@/lib/practice/store";
import { buildSession, type Mode } from "@/lib/practice/session";
import { inlineMd } from "@/lib/practice/md";
import { m, type UIKey } from "@/lib/i18n";
import { usePracticeData, useStudyState } from "./usePractice";
import { ChoiceView, MatchView, MultiView, NumericView, OrderView, type ViewProps } from "./ItemViews";
import { DiagramView } from "./DiagramView";
import { Icon } from "../Icon";

interface Outcome { item: PItem; score: number; correct: boolean; xp: number }
const MOCK_MS = 15 * 60_000;

export function Player({ locale, mode, id }: { locale: Locale; mode: Mode; id?: string }) {
  const L = useCallback((k: string) => m(k as UIKey, locale), [locale]);
  const data = usePracticeData(locale);
  const [state, update] = useStudyState();
  const [queue, setQueue] = useState<PItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [seed, setSeed] = useState("");
  const [response, setResponse] = useState<Response | null>(null);
  const [current, setCurrent] = useState<Outcome | null>(null);
  const [log, setLog] = useState<Outcome[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const exam = mode === "mock";
  const top = useRef<HTMLDivElement>(null);

  // Build the queue once, from the state at the start of the session.
  useEffect(() => {
    if (!data || !state || queue) return;
    const q = buildSession(data, state, { mode, id, seed: `${new Date().toDateString()}:${Object.keys(state.cards).length}` }, new Date());
    setQueue(q);
    if (exam) setDeadline(Date.now() + MOCK_MS);
  }, [data, state, queue, mode, id, exam]);

  const item = queue?.[idx];
  // Freeze the display seed per item: it must not change while feedback is on screen.
  useEffect(() => {
    if (item && state) setSeed(`${item.id}:${state.cards[item.id]?.reps ?? 0}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  useEffect(() => {
    if (!exam || !deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [exam, deadline]);

  const finished = !!queue && (idx >= queue.length || (exam && deadline > 0 && now >= deadline));

  // Practicing a whole concept counts as having studied it: it joins the daily review.
  useEffect(() => {
    if (finished && mode === "concept" && id) update((s) => { if (!s.read[id]) s.read[id] = Date.now(); });
  }, [finished, mode, id, update]);

  const record = useCallback((it: PItem, score: number, correct: boolean, rating: 1 | 2 | 3 | 4, xp: number) => {
    const at = new Date();
    update((s) => { review(s, it.id, rating, at); addActivity(s, at, xp, correct); });
    const o = { item: it, score, correct, xp };
    setLog((l) => [...l, o]);
    return o;
  }, [update]);

  const next = useCallback(() => {
    setIdx((i) => i + 1);
    setResponse(null); setCurrent(null); setRevealed(false);
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  const submit = useCallback((conf: Confidence) => {
    if (!item || !response || current) return;
    const r = grade(item, response);
    const o = record(item, r.score, r.correct, toRating(r.score, conf), xpFor(r.score, conf, false));
    if (exam) next(); else setCurrent(o);
  }, [item, response, current, record, exam, next]);

  const rate = useCallback((self: 1 | 2 | 3 | 4) => {
    if (!item || current) return;
    const r = grade(item, { type: "recall", self });
    setCurrent(record(item, r.score, r.correct, self, xpFor(r.score, 1, true)));
  }, [item, current, record]);

  // Keyboard: Enter checks (as "think so") or moves on; Space reveals a flashcard; 1-4 rate it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === "SELECT" || (t?.tagName === "INPUT" && e.key !== "Enter")) return;
      if (!item || finished) return;
      if (item.type === "recall") {
        if (!revealed && (e.key === " " || e.key === "Enter")) { e.preventDefault(); setRevealed(true); }
        else if (revealed && !current && ["1", "2", "3", "4"].includes(e.key)) rate(Number(e.key) as 1 | 2 | 3 | 4);
        else if (current && e.key === "Enter") next();
        return;
      }
      if (e.key === "Enter") { e.preventDefault(); if (current) next(); else if (response) submit(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, finished, revealed, current, response, rate, next, submit]);

  if (!data || !state || !queue) return <div className="p-card skeleton">{L("pLoading")}</div>;
  if (!queue.length) return (
    <div className="p-card p-empty">
      <p>{mode === "daily" ? L("pAllDone") : L("pEmpty")}</p>
      <Link className="btn" href={`/${locale}/practice/`}><Icon name="left" size={16} /> {L("pBackHub")}</Link>
    </div>
  );
  if (finished) return <Summary locale={locale} log={log} total={queue.length} L={L} mode={mode} id={id} />;

  const meta = data.meta[item!.c];
  const props: ViewProps = { item: item!, seed, done: !!current, response, setResponse, label: L };
  const left = exam ? Math.max(0, deadline - now) : 0;
  return (
    <div className="p-player" ref={top}>
      <div className="p-top">
        <div className="p-progress"><span style={{ width: `${(100 * idx) / queue.length}%` }} /></div>
        <span className="p-count">{idx + 1} / {queue.length}</span>
        {exam && <span className="p-timer">{Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")} {L("pTimeLeft")}</span>}
      </div>
      <article className={`p-card${current ? (current.correct ? " is-ok" : current.score > 0 ? " is-partial" : " is-bad") : ""}`}>
        <div className="p-meta">
          <span className="chip">{meta?.t}</span>
          <span className="p-type">{typeLabel(item!.type, locale)}</span>
        </div>
        <div className="p-prompt" dangerouslySetInnerHTML={{ __html: inlineMd(item!.prompt) }} />

        {item!.type === "recall" ? (
          <RecallView item={item!} revealed={revealed} onReveal={() => setRevealed(true)} rated={!!current} onRate={rate} L={L} />
        ) : item!.type === "multi" ? <MultiView {...props} />
          : item!.type === "order" ? <OrderView {...props} />
          : item!.type === "match" ? <MatchView {...props} />
          : item!.type === "numeric" ? <NumericView {...props} />
          : item!.type === "diagram" ? <DiagramView {...props} />
          : <ChoiceView {...props} />}

        {current && item!.type !== "recall" && (
          <div className="p-feedback" role="status">
            <strong className="p-verdict">{current.correct ? `✓ ${L("pCorrect")}` : current.score > 0 ? `◐ ${L("pPartial")}` : `✗ ${L("pIncorrect")}`}</strong>
            <span className="p-xp">+{current.xp} XP</span>
            {item!.explain && <div className="p-explain" dangerouslySetInnerHTML={{ __html: inlineMd(item!.explain) }} />}
            <Link href={`/${locale}/c/${item!.c}/`} className="p-concept-link" target="_blank">{L("pOpenConcept")} ↗</Link>
          </div>
        )}

        <div className="p-actions">
          {item!.type === "recall" ? (
            current && <button type="button" className="btn btn-primary" onClick={next}>{idx + 1 < queue.length ? L("pNext") : L("pFinish")} <kbd>Enter</kbd></button>
          ) : current ? (
            <button type="button" className="btn btn-primary" onClick={next}>{idx + 1 < queue.length ? L("pNext") : L("pFinish")} <kbd>Enter</kbd></button>
          ) : (
            <>
              <span className="p-sure">{L("pHowSure")}</span>
              <button type="button" className="btn" disabled={!response} onClick={() => submit(0)}>{L("pGuess")}</button>
              <button type="button" className="btn btn-primary" disabled={!response} onClick={() => submit(1)}>{L("pThink")} <kbd>Enter</kbd></button>
              <button type="button" className="btn" disabled={!response} onClick={() => submit(2)}>{L("pSure")}</button>
              <button type="button" className="link-btn p-skip" onClick={next}>{L("pSkip")}</button>
            </>
          )}
        </div>
      </article>
    </div>
  );
}

function RecallView({ item, revealed, onReveal, rated, onRate, L }: {
  item: PItem; revealed: boolean; onReveal: () => void; rated: boolean; onRate: (n: 1 | 2 | 3 | 4) => void; L: (k: string) => string;
}) {
  if (!revealed) return (
    <div className="p-recall">
      <p className="p-hint">{L("pSayIt")}</p>
      <button type="button" className="btn btn-primary" onClick={onReveal}>{L("pReveal")} <kbd>Space</kbd></button>
    </div>
  );
  return (
    <div className="p-recall">
      <div className="p-answer" dangerouslySetInnerHTML={{ __html: inlineMd(String(item.answer ?? "")) }} />
      {!rated && (
        <div className="p-rate">
          {(["pAgain", "pHard", "pGood", "pEasy"] as const).map((k, i) => (
            <button key={k} type="button" className={`btn rate-${i + 1}`} onClick={() => onRate((i + 1) as 1 | 2 | 3 | 4)}><kbd>{i + 1}</kbd> {L(k)}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Summary({ locale, log, total, L, mode, id }: { locale: Locale; log: Outcome[]; total: number; L: (k: string) => string; mode: Mode; id?: string }) {
  const [state] = useStudyState();
  const ok = log.filter((o) => o.correct).length;
  const xp = log.reduce((n, o) => n + o.xp, 0);
  const missed = [...new Map(log.filter((o) => !o.correct).map((o) => [o.item.c, o])).values()];
  const lvl = state ? levelOf(totalXp(state)) : null;
  const streak = state ? streakOf(state, new Date()) : null;
  const again = `/${locale}/practice/play/?mode=${mode}${id ? `&id=${id}` : ""}`;
  const data = usePracticeData(locale);
  return (
    <div className="p-card p-summary">
      <h2>{L("pResults")}</h2>
      <div className="p-stats">
        <div><strong>{log.length ? Math.round((100 * ok) / log.length) : 0}%</strong><span>{L("pAccuracy")} ({ok}/{log.length || total})</span></div>
        <div><strong>+{xp}</strong><span>{L("pXpEarned")}</span></div>
        {streak && <div><strong>🔥 {streak.days}</strong><span>{L("pStreak")}</span></div>}
        {lvl && <div><strong>{locale === "es" ? lvl.es : lvl.en}</strong><span>{L("pLevel")}</span></div>}
      </div>
      {missed.length > 0 && (
        <>
          <h3>{L("pMissed")}</h3>
          <ul className="p-missed">
            {missed.map((o) => <li key={o.item.c}><Link href={`/${locale}/c/${o.item.c}/`}>{data?.meta[o.item.c]?.t ?? o.item.c}</Link></li>)}
          </ul>
        </>
      )}
      <div className="p-actions">
        <a className="btn btn-primary" href={again}>{L("pAnother")}</a>
        <Link className="btn" href={`/${locale}/practice/`}>{L("pBackHub")}</Link>
      </div>
    </div>
  );
}

const TYPE_LABELS: Record<string, [string, string]> = {
  mcq: ["Choose one", "Elige una"], multi: ["Select all", "Marca todas"], order: ["Put in order", "Ordena"],
  match: ["Match", "Empareja"], numeric: ["Estimate", "Estima"], code: ["Complete the code", "Completa el código"],
  diagram: ["Rebuild the diagram", "Reconstruye el diagrama"], recall: ["Interview question", "Pregunta de entrevista"],
};
export const typeLabel = (t: string, l: Locale) => (TYPE_LABELS[t] ?? [t, t])[l === "es" ? 1 : 0];

export function usePlayerParams() {
  return useMemo(() => {
    if (typeof window === "undefined") return { mode: "daily" as Mode, id: undefined };
    const p = new URLSearchParams(window.location.search);
    return { mode: (p.get("mode") as Mode) || "daily", id: p.get("id") || undefined };
  }, []);
}
