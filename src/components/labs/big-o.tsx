"use client";
// Big-O growth: one slider for n, one bar per complexity class, a 1 s budget line. Everything is
// computed in log10 space, so 2ⁿ at n = 10⁹ never overflows. The speed (10⁸ simple ops/s) is a
// labelled assumption at the low end of the concept's "some hundreds of millions".
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Locale } from "@/lib/types";
import { Insight, LabGrid, LogRange, Seg, Stat, YEAR_S, fmtDuration, fmtNum, fmtTime } from "./ui";
import { useReducedMotion } from "./motion";

const LG_OPS = 8; // log10 of the assumed 10⁸ simple operations per second
const AXIS = 16; // the track spans 10⁰ … 10¹⁶ steps; the 1 s budget (10⁸ steps) sits at 50%
const CLASSES: { label: string; lg: (n: number) => number }[] = [
  { label: "O(1)", lg: () => 0 },
  { label: "O(log n)", lg: (n) => Math.log10(Math.log2(n)) },
  { label: "O(n)", lg: (n) => Math.log10(n) },
  { label: "O(n log n)", lg: (n) => Math.log10(n * Math.log2(n)) },
  { label: "O(n²)", lg: (n) => 2 * Math.log10(n) },
  { label: "O(n³)", lg: (n) => 3 * Math.log10(n) },
  { label: "O(2ⁿ)", lg: (n) => n * Math.log10(2) },
];
const LIMITS = [20, 500, 5_000, 1e6]; // the CPH ~1 s table's boundaries

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** 10^lg as "4.6×10³⁰", for numbers far past Number.MAX_VALUE. */
const sci = (lg: number) => {
  let k = Math.floor(lg), m = Number((10 ** (lg - k)).toFixed(1));
  if (m >= 10) { m = 1; k += 1; }
  return `${m.toFixed(1)}×10${[...String(k)].map((d) => SUP[Number(d)]).join("")}`;
};
const TONE = { good: "var(--good)", warn: "var(--accent)", bad: "var(--bad)" } as const;
const GRID = "repeating-linear-gradient(to right, var(--border) 0 calc(12.5% - 1px), var(--border-2) calc(12.5% - 1px) 12.5%)";
const mono: CSSProperties = { font: "650 13px ui-monospace, Menlo, monospace", whiteSpace: "nowrap" };

const T = {
  en: {
    n: "Input size n", jump: "CPH limits (~1 s)", step: "step", steps: "steps", years: "years",
    cph: "CPH rule for this n", or: "or", logn: "log₂ n", cheap: "a log factor is cheap",
    fits: "Slowest that fits 1 s", at: "at 10⁸ ops/s",
    race: "Race them at this n", again: "Race again", clock: "Clock", raceTitle: "The race: one clock for every class (log scale)", never: "still running after 30 years", budget: "1 s",
    formula: "time ≈ steps ÷ 10⁸ simple ops/s  ·  1 s budget ≈ 10⁸ steps  ·  vertical line = 1 s",
    insight: (n: string, fit: string, over?: string, time?: string) => over
      ? `At n = ${n}, ${fit} still fits in ~1 s, but ${over} already takes ${time}. Read the limit on n first: it tells you which algorithm the problem expects.`
      : `At n = ${n} every class fits in ~1 s: at small n the constants matter more than the Big-O.`,
    note: "Assumption: 10⁸ simple operations per second, the low end of the concept's \"some hundreds of millions\"; orange rows (1–10 s) are borderline, since a faster machine or a smaller constant can make them fit. Constants are dropped and log means log₂. Budget table: Laaksonen, Competitive Programmer's Handbook.",
  },
  es: {
    n: "Tamaño de la entrada n", jump: "Límites del CPH (~1 s)", step: "paso", steps: "pasos", years: "años",
    cph: "Regla del CPH para este n", or: "o", logn: "log₂ n", cheap: "un factor log es barato",
    fits: "Lo más lento que cabe en 1 s", at: "a 10⁸ ops/s",
    race: "Hazlas correr con este n", again: "Correr de nuevo", clock: "Reloj", raceTitle: "La carrera: un mismo reloj para todas las clases (escala log)", never: "sigue corriendo tras 30 años", budget: "1 s",
    formula: "tiempo ≈ pasos ÷ 10⁸ operaciones simples/s  ·  presupuesto de 1 s ≈ 10⁸ pasos  ·  línea vertical = 1 s",
    insight: (n: string, fit: string, over?: string, time?: string) => over
      ? `Con n = ${n}, ${fit} todavía cabe en ~1 s, pero ${over} ya tarda ${time}. Lee primero el límite de n: te dice qué algoritmo espera el problema.`
      : `Con n = ${n} todas las clases caben en ~1 s: con n chico pesan más las constantes que la Big-O.`,
    note: "Supuesto: 10⁸ operaciones simples por segundo, el extremo bajo de los \"unos cientos de millones\" del concepto; las filas naranjas (1–10 s) están al límite, porque una máquina más rápida o una constante menor puede hacerlas caber. Se omiten las constantes y log es log₂. Tabla de presupuesto: Laaksonen, Competitive Programmer's Handbook.",
  },
};

export default function BigOLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [n, setN] = useState(1e5);
  const rows = useMemo(() => CLASSES.map((c) => {
    const lg = c.lg(n), lgSec = lg - LG_OPS;
    const tone: keyof typeof TONE = lgSec <= 0 ? "good" : lgSec <= 1 ? "warn" : "bad";
    const steps = lg < 12 ? fmtNum(Math.round(10 ** lg)) : sci(lg);
    const time = lgSec <= 13 ? fmtDuration(10 ** lgSec, locale) : `${sci(lgSec - Math.log10(YEAR_S))} ${t.years}`;
    return { label: c.label, lg, lgSec, tone, steps, time };
  }), [n, locale, t.years]);

  const [rule, alt] = n <= 20 ? ["O(2ⁿ)"] : n <= 500 ? ["O(n³)"] : n <= 5_000 ? ["O(n²)"] : n <= 1e6 ? ["O(n log n)", "O(n)"] : ["O(log n)", "O(1)"];
  const fit = [...rows].reverse().find((r) => r.lgSec <= 0) ?? rows[0];
  const over = rows.find((r) => r.lgSec > 0);
  const ticks = [0, 4, 8, 12, 16].map((lg) => ({ lg, text: fmtDuration(10 ** (lg - LG_OPS), locale) }));

  return (
    <LabGrid
      controls={
        <>
          <LogRange label={t.n} value={n} min={10} max={1e9} onChange={setN} />
          <Seg label={t.jump} value={n} onChange={setN} options={LIMITS.map((v) => ({ value: v, label: `n = ${fmtNum(v)}` }))} />
        </>
      }
    >
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.cph} value={rule} sub={alt ? `${t.or} ${alt}` : undefined} />
        <Stat label={t.logn} value={`≈ ${Math.round(Math.log2(n))}`} sub={t.cheap} />
        <Stat label={t.fits} value={fit.label} sub={`${fit.time} ${t.at}`} tone="good" />
      </div>
      <div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {rows.map((r) => (
            <li key={r.label} style={{ display: "grid", gap: 5 }}>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5 }}>
                <strong style={{ ...mono, color: "var(--text)" }}>{r.label}</strong>
                <span style={{ ...mono, color: r.tone === "good" ? "var(--text-2)" : TONE[r.tone], whiteSpace: "normal", textAlign: "right", overflowWrap: "anywhere", minWidth: 0 }}>
                  {r.steps} {r.steps === "1" ? t.step : t.steps} · {r.time}
                </span>
              </span>
              <span className="lb-track" style={{ display: "block", position: "relative", background: GRID }}>
                <span style={{ width: `${Math.max(1, Math.min(100, (r.lg / AXIS) * 100))}%`, background: TONE[r.tone] }} />
                <span aria-hidden style={{ position: "absolute", top: 0, left: "50%", width: 2, background: "var(--text)" }} />
              </span>
            </li>
          ))}
        </ul>
        <div aria-hidden style={{ position: "relative", height: 18, marginTop: 6, fontSize: 11.5, color: "var(--muted)" }}>
          {ticks.map(({ lg, text }) => (
            <span key={lg} style={{ position: "absolute", left: `${(lg / AXIS) * 100}%`, whiteSpace: "nowrap", transform: lg === 0 ? "none" : lg === AXIS ? "translateX(-100%)" : "translateX(-50%)", color: lg === LG_OPS ? "var(--text)" : undefined, fontWeight: lg === LG_OPS ? 700 : undefined }}>{text}</span>
          ))}
        </div>
      </div>
      <Race rows={rows} n={n} locale={locale} t={t} />
      <p className="lab-formula">{t.formula}</p>
      <Insight>{t.insight(fmtNum(n), fit.label, over?.label, over?.time)}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}

/* ------------------------------------------------------------------ the race */
// One simulated clock sweeps a log time axis from 1 ns to ~30 years in RACE_MS of real time; each
// lane fills until the clock reaches its finish time (steps ÷ 10⁸/s). Log time is the only way
// to show O(1) and O(2ⁿ) on one screen; the axis says so.
const T0 = -9, T1 = Math.log10(30 * YEAR_S), RACE_MS = 7000;
type Row = { label: string; lgSec: number; tone: keyof typeof TONE; time: string };

function Race({ rows, n, locale, t }: { rows: Row[]; n: number; locale: Locale; t: (typeof T)["en"] }) {
  const reduced = useReducedMotion();
  const [clock, setClock] = useState<number | null>(null);
  const raf = useRef(0);
  useEffect(() => { cancelAnimationFrame(raf.current); setClock(null); }, [n]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const start = () => {
    cancelAnimationFrame(raf.current);
    if (reduced) { setClock(T1); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / RACE_MS);
      setClock(T0 + (T1 - T0) * k);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const pos = (lg: number) => Math.max(0, Math.min(1, (lg - T0) / (T1 - T0))) * 100;
  const c = clock ?? T0;
  const clockText = c < 0 ? fmtTime(10 ** (c + 9)) : fmtDuration(10 ** c, locale);
  return (
    <section className="race" aria-label={t.raceTitle}>
      <div className="race-head">
        <h3 className="section-label">{t.raceTitle}</h3>
        <button type="button" className="btn btn-primary race-go" onClick={start}>{clock === null ? t.race : t.again} ▶</button>
      </div>
      <div className="race-clock" aria-live="off"><span>{t.clock}</span><strong className="mo-ticker">{clock === null ? "—" : clockText}</strong></div>
      <ul className="race-lanes">
        {rows.map((r) => {
          const done = clock !== null && r.lgSec <= c;
          const never = r.lgSec > T1;
          const fill = clock === null ? 0 : pos(Math.min(c, r.lgSec));
          return (
            <li key={r.label} className={`race-lane${done ? " done" : ""}`} style={{ ["--tone" as string]: TONE[r.tone] } as CSSProperties}>
              <strong>{r.label}</strong>
              <span className="race-track">
                <span className="race-fill" style={{ width: `${fill}%` }} />
                <span className="race-runner" style={{ left: `${fill}%` }} />
                <span className="race-budget" style={{ left: `${pos(0)}%` }} />
              </span>
              <span className="race-time">{done ? `✓ ${r.time}` : clock !== null && c >= T1 && never ? t.never : ""}</span>
            </li>
          );
        })}
      </ul>
      <div className="race-axis" aria-hidden>
        <span style={{ left: "0%" }}>1 ns</span><span style={{ left: `${pos(-3)}%` }}>1 ms</span><span className="b" style={{ left: `${pos(0)}%` }}>{t.budget}</span>
        <span style={{ left: `${pos(Math.log10(86_400))}%` }}>{fmtDuration(86_400, locale)}</span><span style={{ left: "100%" }}>{fmtDuration(30 * YEAR_S, locale)}</span>
      </div>
    </section>
  );
}
