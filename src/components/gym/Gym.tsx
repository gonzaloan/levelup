"use client";
// The Gym: today's workout (the same for everyone on a date), six skill meters with their trend,
// and endless drills per skill. Everything is local: the reps are generated in the browser, the
// progress lives in localStorage (src/lib/gym/store.ts).
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/types";
import type { Rep, Skill } from "@/lib/gym/types";
import { SKILLS } from "@/lib/gym/types";
import { dailyBonus, dailyWorkout, drillRep, type Pools } from "@/lib/gym/workout";
import { finishDay, gymStreak, loadGym, recordRep, saveGym, today, type GymState, type RepResult } from "@/lib/gym/store";
import { shuffle } from "@/lib/practice/rng";
import { addActivity, loadState, saveState } from "@/lib/practice/store";
import { loadCode } from "@/lib/practice/code-store";
import type { MockProblem } from "@/lib/practice/mock";
import { useStudyState } from "../practice/usePractice";
import { statusOf } from "../Mastered";
import { Icon } from "../Icon";
import { BigOCard, BlankCard, DebugCard, EstimateCard, ExplainCard, TraceCard } from "./Reps";
import s from "./gym.module.css";

type GymConcept = { id: string; t: string; kp: string[] };
const GYM = { en: () => import("@/generated/gym-en.json"), es: () => import("@/generated/gym-es.json") };
const PROBS = { en: () => import("@/generated/problems-en.json"), es: () => import("@/generated/problems-es.json") };

const ICON: Record<Skill, string> = { estimate: "gauge", trace: "search", debug: "zap", bigo: "chart", explain: "message", blank: "code" };
const T = {
  en: {
    skills: { estimate: "Estimate by hand", trace: "Trace code", debug: "Spot the bug", bigo: "Big-O by eye", explain: "Explain it cold", blank: "From a blank page" } as Record<Skill, string>,
    blurbs: { estimate: "QPS, storage, servers: no calculator.", trace: "Predict the output without running it.", debug: "Find the broken line by reading.", bigo: "Name the complexity at a glance.", explain: "A concept in your own words.", blank: "Re-solve a problem with no hints." } as Record<Skill, string>,
    today: "Today's workout", reps: "8 reps · ~12 min", start: "Start", resume: (n: number) => `Resume (${n}/8)`, doneToday: (p: number) => `Done today · ${p}%`, again: "Do it again",
    bonus: "Bonus: from a blank page", drill: "10 reps", fitness: "fitness", noData: "not trained yet", streak: (n: number) => `${n}-day gym streak`, noStreak: "No gym streak yet",
    rules: ["No AI", "No calculator", "Don't run the code"], close: "Leave", time: "time", score: "Score", summary: "Workout done", drillDone: "Drill done", back: "Back to the gym",
    xp: (n: number) => `+${n} XP`, loading: "Loading…", one: "1 problem",
  },
  es: {
    skills: { estimate: "Estimar a mano", trace: "Leer código", debug: "Encontrar el bug", bigo: "Big-O a ojo", explain: "Explicar sin mirar", blank: "Código desde cero" } as Record<Skill, string>,
    blurbs: { estimate: "QPS, almacenamiento, servidores: sin calculadora.", trace: "Predice la salida sin correrlo.", debug: "Encuentra la línea rota leyendo.", bigo: "Nombra la complejidad de un vistazo.", explain: "Un concepto con tus palabras.", blank: "Resuelve de nuevo un problema sin pistas." } as Record<Skill, string>,
    today: "Entrenamiento de hoy", reps: "8 ejercicios · ~12 min", start: "Empezar", resume: (n: number) => `Seguir (${n}/8)`, doneToday: (p: number) => `Hecho hoy · ${p}%`, again: "Hacerlo otra vez",
    bonus: "Bonus: código desde cero", drill: "10 seguidos", fitness: "estado", noData: "sin entrenar todavía", streak: (n: number) => `Racha de ${n} día${n === 1 ? "" : "s"} en el gimnasio`, noStreak: "Aún sin racha en el gimnasio",
    rules: ["Sin IA", "Sin calculadora", "Sin correr el código"], close: "Salir", time: "tiempo", score: "Puntaje", summary: "Entrenamiento terminado", drillDone: "Serie terminada", back: "Volver al gimnasio",
    xp: (n: number) => `+${n} XP`, loading: "Cargando…", one: "1 problema",
  },
};

type Mode = { kind: "day" } | { kind: "drill"; skill: Skill; reps: Rep[] } | { kind: "bonus"; reps: Rep[] };
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

export function Gym({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [g, setG] = useState<GymState | null>(null);
  const [study] = useStudyState();
  const [mode, setMode] = useState<Mode | null>(null);
  const [data, setData] = useState<{ concepts: GymConcept[]; probs: MockProblem[] } | null>(null);
  const date = useMemo(() => today(), []);
  useEffect(() => { setG(loadGym()); }, []);
  useEffect(() => {
    void Promise.all([GYM[locale](), PROBS[locale]()]).then(([a, b]) => setData({ concepts: a.default as GymConcept[], probs: b.default as MockProblem[] }));
  }, [locale]);

  // What to explain and re-solve: things you have studied or solved, shuffled by date, best first.
  const pools: Pools | null = useMemo(() => {
    if (!data) return null;
    const studied = data.concepts.filter((c) => statusOf(study, c.id) !== "none").map((c) => c.id);
    const rest = data.concepts.map((c) => c.id).filter((id) => !studied.includes(id));
    const solved = Object.keys(loadCode().solved).filter((id) => data.probs.some((p) => p.id === id));
    const easy = data.probs.filter((p) => p.d === "easy").map((p) => p.id);
    return { concepts: [...shuffle(studied, date), ...rest], problems: [...shuffle(solved, date), ...shuffle(easy, date), ...data.probs.map((p) => p.id)] };
  }, [data, study, date]);

  // While a session runs the page is just the rep: the page title and the footnote step aside.
  useEffect(() => {
    const el = document.documentElement;
    if (mode) el.dataset.gym = "on"; else delete el.dataset.gym;
    return () => { delete el.dataset.gym; };
  }, [mode]);

  const update = (fn: (x: GymState) => GymState) => setG((prev) => { const next = fn(prev ?? loadGym()); saveGym(next); return next; });

  if (!g || !pools || !data) return <p className={s.loading}>{t.loading}</p>;

  const day = g.days[date];
  const run = g.run?.date === date ? g.run : undefined;
  const startDay = () => {
    if (!run) update((x) => ({ ...x, run: { date, reps: dailyWorkout(date, pools), results: [] } }));
    setMode({ kind: "day" });
  };
  const xpFor = (score: number) => 2 + Math.round(10 * score);
  const onRep = (rep: Rep, score: number, ms: number) => {
    const r: RepResult = { skill: rep.skill, score, ms };
    update((x) => {
      let next = recordRep(x, date, r);
      if (mode?.kind === "day" && next.run) next = { ...next, run: { ...next.run, results: [...next.run.results, r] } };
      return next;
    });
    const st = loadState(); addActivity(st, new Date(), xpFor(score), score >= 0.6); saveState(st);
  };

  if (mode) {
    const reps = mode.kind === "day" ? (run?.reps ?? dailyWorkout(date, pools)) : mode.reps;
    const startAt = mode.kind === "day" ? (run?.results.length ?? 0) : 0;
    return (
      <Session key={mode.kind === "drill" ? mode.reps[0].seed : mode.kind} reps={reps} startAt={startAt} prior={mode.kind === "day" ? run?.results ?? [] : []} data={data} locale={locale}
        title={mode.kind === "day" ? t.today : mode.kind === "drill" ? t.skills[mode.skill] : t.bonus}
        onRep={onRep}
        onFinish={(results) => { if (mode.kind === "day") update((x) => finishDay(x, date, x.run?.results ?? results)); }}
        onClose={() => setMode(null)}
        streak={gymStreak(g)} doneLabel={mode.kind === "day" ? t.summary : t.drillDone} />
    );
  }

  const streak = gymStreak(g);
  return (
    <div className={s.home}>
      <ul className={s.rules}>{t.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      <section className={s.today}>
        <div>
          <span className={s.eyebrow}>{t.today}</span>
          <strong className={s.todayTitle}>{day?.done ? t.doneToday(Math.round(day.score * 100)) : t.reps}</strong>
          <span className={s.streak}>{streak ? `🔥 ${t.streak(streak)}` : t.noStreak}</span>
        </div>
        <div className={s.todayActions}>
          {!day?.done && <button type="button" className={`btn btn-primary ${s.big}`} onClick={startDay}>{run?.results.length ? t.resume(run.results.length) : t.start} →</button>}
          {day?.done && <button type="button" className={`btn btn-primary ${s.big}`} onClick={() => setMode({ kind: "bonus", reps: [dailyBonus(date, pools)] })}>{t.bonus} →</button>}
        </div>
        <Week g={g} date={date} />
      </section>
      <section className={s.skills}>
        {SKILLS.map((sk) => {
          const rec = g.skills[sk];
          return (
            <article key={sk} className={s.skill}>
              <header><Icon name={ICON[sk]} size={20} /><strong>{t.skills[sk]}</strong></header>
              <p>{t.blurbs[sk]}</p>
              <div className={s.meter}>
                <span className={s.bar}><span style={{ width: `${Math.round((rec?.ema ?? 0) * 100)}%` }} /></span>
                <small>{rec ? `${Math.round(rec.ema * 100)} ${t.fitness}` : t.noData}</small>
              </div>
              <Spark hist={rec?.hist ?? []} />
              <button type="button" className="btn" onClick={() => {
                const start = String(Date.now());
                setMode({ kind: "drill", skill: sk, reps: Array.from({ length: sk === "blank" ? 1 : 10 }, (_, n) => drillRep(sk, start, n, pools)) });
              }}>{sk === "blank" ? t.one : t.drill} →</button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

/** The last 14 days: a dot per day, filled when the workout was done. */
function Week({ g, date }: { g: GymState; date: string }) {
  const days = Array.from({ length: 14 }, (_, k) => {
    const [y, m, d] = date.split("-").map(Number);
    const x = new Date(y, m - 1, d - 13 + k);
    const key = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    return { key, rec: g.days[key] };
  });
  return (
    <ol className={s.week} aria-label="14 days">
      {days.map(({ key, rec }) => <li key={key} title={key} className={rec?.done ? s.on : key === date ? s.now : undefined} style={rec?.done ? { opacity: 0.45 + 0.55 * rec.score } : undefined} />)}
    </ol>
  );
}

function Spark({ hist }: { hist: { d: string; s: number }[] }) {
  const pts = hist.slice(-14);
  if (pts.length < 2) return <svg className={s.spark} viewBox="0 0 100 24" aria-hidden />;
  const x = (i: number) => (i / (pts.length - 1)) * 96 + 2;
  const y = (v: number) => 21 - v * 18;
  return (
    <svg className={s.spark} viewBox="0 0 100 24" aria-hidden>
      <polyline points={pts.map((p, i) => `${x(i)},${y(p.s)}`).join(" ")} />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].s)} r={2.4} />
    </svg>
  );
}

/* ------------------------------------------------------------------ a session of reps */
function Session({ reps, startAt, prior, data, locale, title, onRep, onFinish, onClose, streak, doneLabel }: {
  reps: Rep[]; startAt: number; prior: RepResult[]; data: { concepts: GymConcept[]; probs: MockProblem[] }; locale: Locale; title: string;
  onRep: (rep: Rep, score: number, ms: number) => void; onFinish: (results: RepResult[]) => void; onClose: () => void; streak: number; doneLabel: string;
}) {
  const t = T[locale];
  const [i, setI] = useState(startAt);
  // A resumed workout starts with the reps already done today, so the summary covers the whole day.
  const [results, setResults] = useState<RepResult[]>(prior);
  const [now, setNow] = useState(Date.now());
  const t0 = useRef(Date.now());
  const repStart = useRef(Date.now());
  useEffect(() => { const h = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(h); }, []);
  useEffect(() => { repStart.current = Date.now(); window.scrollTo({ top: 0, behavior: "smooth" }); }, [i]);

  const done = (score: number) => {
    const rep = reps[i], ms = Date.now() - repStart.current;
    onRep(rep, score, ms);
    const next = [...results, { skill: rep.skill, score, ms }];
    setResults(next);
    if (i + 1 >= reps.length) onFinish(next);
    setI(i + 1);
  };

  if (i >= reps.length) {
    const mean = results.length ? results.reduce((a, b) => a + b.score, 0) / results.length : 0;
    const xp = results.reduce((a, b) => a + 2 + Math.round(10 * b.score), 0);
    return (
      <div className={s.summary}>
        <span className={s.eyebrow}>{doneLabel}</span>
        <strong className={s.big}>{Math.round(mean * 100)}%</strong>
        <p>{mmss(results.reduce((a, b) => a + b.ms, 0))} {t.time} · {t.xp(xp)}{streak ? ` · 🔥 ${t.streak(streak)}` : ""}</p>
        <ul className={s.recap}>
          {results.map((r, k) => (
            <li key={k}><Icon name={ICON[r.skill]} size={16} /><span>{t.skills[r.skill]}</span><b className={r.score === 1 ? s.goodText : r.score > 0 ? s.midText : s.badText}>{Math.round(r.score * 100)}%</b></li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary" onClick={onClose}>{t.back} →</button>
      </div>
    );
  }

  const rep = reps[i];
  const concept = rep.skill === "explain" ? data.concepts.find((c) => c.id === rep.concept) : undefined;
  const prob = rep.skill === "blank" ? data.probs.find((p) => p.id === rep.problem) : undefined;
  return (
    <div className={s.session}>
      <div className={s.bar2}>
        <button type="button" className={s.close} onClick={onClose} aria-label={t.close} title={t.close}><Icon name="close" size={18} /></button>
        <span className={s.sTitle}>{title}</span>
        <ol className={s.dots} aria-label={`${i + 1}/${reps.length}`}>
          {reps.map((r, k) => <li key={k} className={k < i ? s.past : k === i ? s.cur : undefined} title={t.skills[r.skill]} />)}
        </ol>
        <span className={s.clock}>{mmss(now - t0.current)}</span>
      </div>
      <div className={s.repHead}><Icon name={ICON[rep.skill]} size={18} /><span>{t.skills[rep.skill]}</span></div>
      <div key={rep.seed} className={s.enter}>
        {rep.skill === "estimate" && <EstimateCard rep={rep} onDone={done} locale={locale} />}
        {rep.skill === "trace" && <TraceCard rep={rep} onDone={done} locale={locale} />}
        {rep.skill === "debug" && <DebugCard rep={rep} onDone={done} locale={locale} />}
        {rep.skill === "bigo" && <BigOCard rep={rep} onDone={done} locale={locale} />}
        {rep.skill === "explain" && concept && <ExplainCard title={concept.t} points={concept.kp} onDone={done} locale={locale} />}
        {rep.skill === "blank" && prob && <BlankCard prob={prob} seed={rep.seed} onDone={done} locale={locale} />}
      </div>
    </div>
  );
}
