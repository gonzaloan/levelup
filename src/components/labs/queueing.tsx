"use client";
// Utilization vs latency in the textbook M/M/c queue: Poisson arrivals, exponential service, c
// servers sharing one FIFO queue. Mean time in system comes from Erlang C, in-flight work from
// Little's law. The model is a stated simplification: it gives the shape of the knee, not real ms.
// On top, the same M/M/c runs live in slow motion: dots arrive, wait in a FIFO queue, get served
// and leave, and the measured mean time in system lands next to the formula's value on the chart.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/types";
import { mulberry32 } from "@/lib/practice/rng";
import { Insight, LabGrid, LogRange, Plot, Range, Stat, fmtNum, fmtTime, type PlotLabel } from "./ui";
import { Ticker, useReducedMotion } from "./motion";
import css from "./queueing.module.css";

/** Erlang C: the probability an arrival has to wait, via the stable Erlang B recursion. */
function erlangC(c: number, rho: number): number {
  const a = c * rho;
  let b = 1;
  for (let k = 1; k <= c; k++) b = (a * b) / (k + a * b);
  return b / (1 - rho * (1 - b));
}
/** Mean time in system ÷ S: 1 + C ÷ (c·(1 − ρ)); for c = 1 that is 1 ÷ (1 − ρ). */
const wRatio = (c: number, rho: number) => (rho >= 1 ? Infinity : 1 + erlangC(c, rho) / (c * (1 - rho)));
/** Highest utilization whose W stays within `ratio` × S (W only grows with ρ, so bisect). */
function maxRho(c: number, ratio: number): number {
  if (ratio <= 1) return 0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (wRatio(c, mid) <= ratio) lo = mid; else hi = mid; }
  return lo;
}
/** Fewest servers that keep W within budget at offered load a = λ·S. */
function serversFor(a: number, ratio: number): number | null {
  if (ratio <= 1) return null;
  for (let c = Math.floor(a) + 1; c <= 1000; c++) if (wRatio(c, a / c) <= ratio) return c;
  return null;
}

const ms = (x: number) => (Number.isFinite(x) ? fmtTime(x * 1e6) : "∞");
const pct = (r: number) => (r >= 0.99 && r < 1 ? `${(Math.floor(r * 1000) / 10).toFixed(1)}%` : `${Math.round(r * 100)}%`);
const times = (x: number) => (Number.isFinite(x) ? `${x < 10 ? x.toFixed(1) : Math.round(x)}×` : "∞");
const Sw = ({ c, dash }: { c: string; dash?: string }) => <i aria-hidden style={{ display: "inline-block", width: 14, height: 0, borderTop: `2px ${dash ?? "solid"} ${c}`, margin: "0 5px 3px 0" }} />;

const T = {
  en: {
    s: "Service time S (mean)", c: "Servers c", cHint: "All of them pull from one shared queue.",
    lam: "Arrival rate λ", cap: (x: string) => `capacity = c ÷ S = ${x}/s`, budget: "Latency budget", bShort: "Budget", budgetHint: "Mean time in system you can afford per request.",
    rho: "Utilization", rhoSub: (l: string, c: string) => `ρ = λ ÷ capacity = ${l}/s ÷ ${c}/s`,
    w: "Mean time in system", wSub: (x: string, q: string) => `W = ${x} S · waiting ${q}`,
    l: "In flight", lSub: (q: string) => `L = λ·W (Little) · queued ${q}`, wait: "Requests that wait", waitSub: "probability of queueing (Erlang C)",
    max: "Max load within budget", maxSub: (l: string) => `λ ≤ ${l}/s`, need: "Servers needed", needSub: "at this λ, W within budget", never: "budget < S",
    aria: (c: number) => `Mean time in system against utilization for ${c} servers sharing one queue, with the current load marked`,
    shared: (c: number) => `${c} server${c > 1 ? "s" : ""}, one queue`, split: (c: number) => `${c} queues, random routing (M/M/1 each)`,
    zone: "over budget", axis: "x: utilization ρ · y: mean time in system",
    formula: "ρ = λ·S ÷ c · W = S + Wq, Wq = C(c, λS)·S ÷ (c·(1 − ρ)); c = 1: W = S ÷ (1 − ρ) · L = λ·W (Little's law)",
    insight: (r: string, x: string, w: string, x90: string, x99: string) => `At ${r} utilization a request spends ${x} its service time in the system (${w}); at 90% it would be ${x90}, at 99% ${x99}. Throughput still looks fine there: latency breaks first, so plan capacity for headroom.`,
    allows: (r: string, l: string) => ` This budget allows up to ${r} utilization (λ ≤ ${l}/s).`,
    pool: (c: number) => ` ${c} servers sharing one queue keep the knee further right than ${c} separate queues with random routing (dotted line): that is why load-aware balancing beats random.`,
    over: (r: string, n: number | null) => `Arrivals exceed capacity (ρ = ${r}): the queue grows without bound and each request waits longer than the last. Add servers${n ? ` (${n} would meet the budget)` : ""} or shed load with 429s.`,
    note: "Model (a simplifying assumption): M/M/c, meaning Poisson arrivals, exponential service times with mean S, c identical servers pulling from one FIFO queue, steady state; W from the Erlang C formula (e.g. Harchol-Balter, Performance Modeling and Design of Computer Systems, 2013). Dotted line: c separate queues with random routing, each one an M/M/1. Burstier arrivals or more variable service times lengthen queues and steadier ones shorten them, so read the shape, not the exact milliseconds. Little's law holds for any stable system (queues-streams concept).",
    live: "Live queue (simulated)", play: "Play", pause: "Pause", restart: "Restart", step: "Step", speed: "Speed",
    queue: "queue (FIFO)", servers: (c: number) => `${c} server${c > 1 ? "s" : ""}`,
    waiting: "Waiting", busy: "Busy", measured: "Measured W", model: (w: string) => `M/M/c: ${w}`, count: (n: number) => `${n.toLocaleString("en")} request${n === 1 ? "" : "s"} done`,
    within: "Within budget", withinSub: "SLI = good ÷ all",
    simAria: (q: number, b: number, c: number) => `Simulated queue: ${q} waiting, ${b} of ${c} servers busy`,
    ring: "simulated, measured so far",
    simNote: (sec: string) => `Illustrative: a random M/M/c run in slow motion (1 S ≈ ${sec} on screen). The measured mean wanders around the formula and settles as more requests finish; near 100% utilization it needs far more of them. A change of λ or c jumps to a typical state for the new load, then runs from there. Waiting dots redden; finished ones leave green within the latency budget and red over it.`,
  },
  es: {
    s: "Tiempo de servicio S (promedio)", c: "Servidores c", cHint: "Todos toman trabajo de una sola cola compartida.",
    lam: "Tasa de llegada λ", cap: (x: string) => `capacidad = c ÷ S = ${x}/s`, budget: "Presupuesto de latencia", bShort: "Presupuesto", budgetHint: "Tiempo medio en el sistema que puedes pagar por request.",
    rho: "Utilización", rhoSub: (l: string, c: string) => `ρ = λ ÷ capacidad = ${l}/s ÷ ${c}/s`,
    w: "Tiempo medio en el sistema", wSub: (x: string, q: string) => `W = ${x} S · esperando ${q}`,
    l: "En vuelo", lSub: (q: string) => `L = λ·W (Little) · en cola ${q}`, wait: "Requests que esperan", waitSub: "probabilidad de hacer cola (Erlang C)",
    max: "Carga máxima en presupuesto", maxSub: (l: string) => `λ ≤ ${l}/s`, need: "Servidores necesarios", needSub: "con este λ, W en presupuesto", never: "presupuesto < S",
    aria: (c: number) => `Tiempo medio en el sistema según la utilización, con ${c} servidores que comparten una cola y la carga actual marcada`,
    shared: (c: number) => `${c} servidor${c > 1 ? "es" : ""}, una cola`, split: (c: number) => `${c} colas, ruteo aleatorio (M/M/1 cada una)`,
    zone: "fuera de presupuesto", axis: "x: utilización ρ · y: tiempo medio en el sistema",
    formula: "ρ = λ·S ÷ c · W = S + Wq, Wq = C(c, λS)·S ÷ (c·(1 − ρ)); c = 1: W = S ÷ (1 − ρ) · L = λ·W (ley de Little)",
    insight: (r: string, x: string, w: string, x90: string, x99: string) => `Con ${r} de utilización, una request pasa ${x} su tiempo de servicio en el sistema (${w}); al 90% serían ${x90} y al 99%, ${x99}. El throughput todavía se ve bien ahí: la latencia se rompe primero, así que planifica capacidad con margen.`,
    allows: (r: string, l: string) => ` Este presupuesto permite hasta ${r} de utilización (λ ≤ ${l}/s).`,
    pool: (c: number) => ` ${c} servidores con una cola compartida empujan el codo más a la derecha que ${c} colas separadas con ruteo aleatorio (línea punteada): por eso el balanceo que mira la carga le gana al aleatorio.`,
    over: (r: string, n: number | null) => `Las llegadas superan la capacidad (ρ = ${r}): la cola crece sin límite y cada request espera más que la anterior. Agrega servidores${n ? ` (${n} cumplirían el presupuesto)` : ""} o descarta carga con 429.`,
    note: "Modelo (un supuesto simplificador): M/M/c, es decir, llegadas de Poisson, tiempos de servicio exponenciales con media S, c servidores idénticos que toman de una sola cola FIFO, en estado estable; W sale de la fórmula de Erlang C (p. ej. Harchol-Balter, Performance Modeling and Design of Computer Systems, 2013). Línea punteada: c colas separadas con ruteo aleatorio, cada una un M/M/1. Llegadas más en ráfagas o tiempos de servicio más variables alargan las colas y los más estables las acortan: lee la forma, no los milisegundos exactos. La ley de Little vale para cualquier sistema estable (concepto de colas y streams).",
    live: "Cola en vivo (simulada)", play: "Reproducir", pause: "Pausar", restart: "Reiniciar", step: "Paso", speed: "Velocidad",
    queue: "cola (FIFO)", servers: (c: number) => `${c} servidor${c > 1 ? "es" : ""}`,
    waiting: "Esperando", busy: "Ocupados", measured: "W medido", model: (w: string) => `M/M/c: ${w}`, count: (n: number) => `${n.toLocaleString("es")} request${n === 1 ? "" : "s"} terminada${n === 1 ? "" : "s"}`,
    within: "En presupuesto", withinSub: "SLI = buenas ÷ todas",
    simAria: (q: number, b: number, c: number) => `Cola simulada: ${q} esperando, ${b} de ${c} servidores ocupados`,
    ring: "simulado, medido hasta ahora",
    simNote: (sec: string) => `Ilustrativo: una corrida aleatoria de M/M/c en cámara lenta (1 S ≈ ${sec} en pantalla). El promedio medido oscila alrededor de la fórmula y se asienta a medida que terminan más requests; cerca del 100% de utilización necesita muchísimas más. Un cambio de λ o c salta a un estado típico para la nueva carga y sigue corriendo desde ahí. Los puntos que esperan se enrojecen; los que terminan salen verdes si cumplen el presupuesto de latencia y rojos si no.`,
  },
};

const VW = 400, VH = 200, PAD = 6, TOP = 20, BOT = 24;
const BLUE = "oklch(0.72 0.15 250)";
type Measured = { n: number; meanS: number } | null;

export default function QueueingLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [s, setS] = useState(20);
  const [c, setC] = useState(1);
  const [lamIn, setLam] = useState(35);
  const [budget, setBudget] = useState(100);
  const [measured, setMeasured] = useState<Measured>(null);

  const cap = (c * 1000) / s, lamMax = cap * 1.2, step = 10 ** Math.floor(Math.log10(cap / 50));
  const lam = Math.min(lamIn, lamMax), rho = lam / cap, ratio = budget / s;
  const w = wRatio(c, rho) * s, wq = w - s, pWait = rho >= 1 ? 1 : erlangC(c, rho);
  const rMax = maxRho(c, ratio), need = serversFor((lam * s) / 1000, ratio);

  const g = useMemo(() => {
    const ymax = Math.min(Math.max(budget * 1.6, s * 4), s * 30);
    const x = (r: number) => PAD + r * (VW - 2 * PAD);
    const y = (v: number) => TOP + (1 - v / ymax) * (VH - TOP - BOT);
    const pt = (r: number, v: number) => `${x(r).toFixed(1)},${y(v).toFixed(1)}`;
    const curve = (servers: number) => {
      const out = [pt(0, s)];
      for (let i = 1; i < 100; i++) {
        const r = i / 100, v = wRatio(servers, r) * s;
        if (v > ymax) { const r0 = r - 0.01, v0 = wRatio(servers, r0) * s; out.push(pt(r0 + (0.01 * (ymax - v0)) / (v - v0), ymax)); break; }
        out.push(pt(r, v));
      }
      return out.join(" ");
    };
    return { ymax, x, y, shared: curve(c), split: c > 1 ? curve(1) : "" };
  }, [s, c, budget]);

  const mx = g.x(Math.min(rho, 1)), my = g.y(Math.min(w, g.ymax));
  const simW = measured && measured.n >= 30 ? measured.meanS * s : null;
  const tail = c > 1 ? t.pool(c) : "";
  const insight = rho >= 1
    ? t.over(pct(rho), need)
    : t.insight(pct(rho), times(w / s), ms(w), times(wRatio(c, 0.9)), times(wRatio(c, 0.99))) + (ratio > 1 ? t.allows(pct(rMax), fmtNum(rMax * cap)) : "") + tail;
  // Infinity cannot be tweened: show ∞ as text, and a fresh Ticker counts again once it is finite.
  const tick = (v: number, f: (x: number) => string) => (Number.isFinite(v) ? <Ticker value={v} format={f} /> : "∞");

  return (
    <LabGrid
      controls={
        <>
          <LogRange label={t.s} value={s} min={1} max={1000} onChange={setS} format={ms} />
          <Range label={t.c} value={c} min={1} max={32} onChange={setC} hint={t.cHint} />
          <Range label={t.lam} value={lam} min={0} max={lamMax} step={step} onChange={setLam} format={(v) => `${fmtNum(v)}/s`} hint={t.cap(fmtNum(cap))} />
          <LogRange label={t.budget} value={budget} min={2} max={5000} onChange={setBudget} format={ms} hint={t.budgetHint} />
        </>
      }
    >
      <LiveQueue c={c} rho={rho} s={s} budget={budget} w={w} t={t} onMeasure={setMeasured} />
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.rho} value={<Ticker value={rho} format={pct} />} sub={t.rhoSub(fmtNum(lam), fmtNum(cap))} tone={rho >= 1 ? "bad" : undefined} />
        <Stat label={t.w} value={tick(w, ms)} sub={t.wSub(times(w / s), ms(wq))} tone={w <= budget ? "good" : "bad"} />
        <Stat label={t.l} value={tick((lam * w) / 1000, fmtNum)} sub={t.lSub(Number.isFinite(wq) ? fmtNum((lam * wq) / 1000) : "∞")} />
        <Stat label={t.wait} value={<Ticker value={pWait} format={pct} />} sub={t.waitSub} />
        <Stat label={t.max} value={ratio > 1 ? pct(rMax) : "—"} sub={ratio > 1 ? t.maxSub(fmtNum(rMax * cap)) : t.never} />
        <Stat label={t.need} value={need ?? "—"} sub={ratio > 1 ? t.needSub : t.never} tone={need !== null && need > c ? "warn" : undefined} />
      </div>
      <div>
        <Plot w={VW} h={VH} label={t.aria(c)} labels={[
          { x: PAD, y: TOP, text: ms(g.ymax), dy: -9 }, { x: VW - PAD, y: g.y(s), text: `S = ${ms(s)}`, anchor: "end", dy: 9 },
          ...(budget < g.ymax ? [{ x: PAD, y: g.y(budget), text: `${t.bShort} ${ms(budget)}`, dy: -9, color: "var(--bad)" }] : []),
          ...[0, 0.2, 0.4, 0.6, 0.8, 1].map((r): PlotLabel => ({ x: g.x(r), y: VH - BOT / 2, text: `${r * 100}%`, anchor: r === 0 ? "start" : r === 1 ? "end" : "middle" })),
        ]}>
          {ratio > 1 && <rect x={g.x(rMax)} y={TOP} width={g.x(1) - g.x(rMax)} height={VH - TOP - BOT} style={{ fill: "var(--bad)", fillOpacity: 0.09 }} />}
          {[0, s, g.ymax].map((v) => <line key={v} x1={PAD} x2={VW - PAD} y1={g.y(v)} y2={g.y(v)} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--border)" }} />)}
          {budget < g.ymax && <line x1={PAD} x2={VW - PAD} y1={g.y(budget)} y2={g.y(budget)} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--bad)", strokeDasharray: "5 4" }} />}
          {g.split && <polyline points={g.split} vectorEffect="non-scaling-stroke" style={{ fill: "none", stroke: "var(--muted)", strokeWidth: 2, strokeDasharray: "2 3" }} />}
          <polyline points={g.shared} vectorEffect="non-scaling-stroke" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2.5 }} />
          <line x1={mx} x2={mx} y1={TOP} y2={VH - BOT} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--text-2)", strokeDasharray: "2 3" }} />
          <circle className={css.mark} cx={mx} cy={my} r={5.5} style={{ fill: rho >= 1 ? "var(--bad)" : "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }} />
          {simW !== null && <circle className={css.ring} cx={mx} cy={g.y(Math.min(simW, g.ymax))} r={8} vectorEffect="non-scaling-stroke" style={{ fill: "none", stroke: BLUE, strokeWidth: 2.5 }} />}
        </Plot>
        <p className="lab-note"><Sw c="var(--accent)" />{t.shared(c)}{c > 1 && <> · <Sw c="var(--muted)" dash="dotted" />{t.split(c)}</>} · <Sw c="var(--bad)" dash="dashed" />{t.bShort}{ratio > 1 && <> · <i aria-hidden style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "color-mix(in srgb, var(--bad) 18%, transparent)", margin: "0 5px -1px 0" }} />{t.zone}</>}{simW !== null && <> · <i aria-hidden className={css.ringKey} />{t.ring}</>} · {t.axis}</p>
      </div>
      <p className="lab-formula">{t.formula}</p>
      <Insight>{insight}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}

/* ------------------------------------------------------------------ live simulation */
// An event-driven M/M/c in units of S (mean service = 1): Poisson arrivals at a = λ·S = c·ρ per S,
// exponential service, one FIFO queue. Each dot moves on a small spring toward its place. The
// strip is drawn 1 unit = 1 px at its measured width; only the first QN queued dots are drawn,
// so at most ~60 nodes ever animate.
const DOT = 4;
const SPEEDS = [1, 2, 4, 8] as const;
type Speed = (typeof SPEEDS)[number];
/** Seconds on screen per S: slower with many servers, so arrivals stay countable (~3–4/s at 80%). */
const secPerS = (c: number) => 0.5 * Math.max(1, c / 2.5);

type Box = { x: number; y: number; w: number; h: number };
interface Geo { W: number; H: number; MID: number; SRC: number; QX0: number; QS: number; QN: number; QEND: number; SX0: number; SX1: number; EXIT: number; bx: Box[] }
/** Layout for a strip `W` px wide: source | queue | servers (up to 8 per column) | exit. */
function geo(W: number, c: number): Geo {
  const cols = Math.ceil(c / 8), rows = Math.ceil(c / cols), gap = 4;
  const H = Math.max(76, rows * 15 + 22), MID = H / 2;
  const SX1 = W - 28, SX0 = SX1 - Math.min(110, Math.max(64, W * 0.2)), QX0 = SX0 - 16;
  const QS = Math.min(13, Math.max(10, (QX0 - 44) / 39)), QN = Math.max(6, Math.min(40, Math.floor((QX0 - 44) / QS) + 1)), QEND = QX0 - (QN - 1) * QS;
  const w = (SX1 - SX0 - (cols - 1) * gap) / cols, h = Math.min(34, (H - 16 - (rows - 1) * gap) / rows);
  const top = (H - (rows * h + (rows - 1) * gap)) / 2;
  const bx = Array.from({ length: c }, (_, i) => ({ x: SX0 + Math.floor(i / rows) * (w + gap), y: top + (i % rows) * (h + gap), w, h }));
  return { W, H, MID, SRC: 14, QX0, QS, QN, QEND, SX0, SX1, EXIT: W - 2, bx };
}

type Body = { x: number; y: number; vx: number; vy: number };
type Job = Body & { id: number; t0: number; tc: number; far: boolean };
type Seat = { job: Job; start: number; end: number } | null;
type Out = Body & { id: number; ty: number; age: number; ok: boolean | null };
interface Sim {
  c: number; rho: number; u: number; t: number; next: number; queue: Job[]; seats: Seat[]; out: Out[]; rnd: () => number; id: number; pulses: number;
  meas: number[]; memo: { n: number; s: number; budget: number; meanS: number; share: number };
}
interface View {
  q: { id: number; x: number; y: number; heat: number }[]; more: number; fly: { id: number; x: number; y: number }[];
  out: { id: number; x: number; y: number; op: number; ok: boolean | null }[]; seats: number[]; waiting: number; busy: number; pulses: number;
  n: number; meanS: number; share: number;
}

const expo = (rnd: () => number) => -Math.log(1 - rnd());
/** Stationary P(N = n) of the M/M/c birth–death chain, for ρ < 1. */
function pmf(c: number, rho: number): (n: number) => number {
  const a = c * rho, head: number[] = [];
  let term = 1, sum = 0;
  for (let n = 0; n < c; n++) { head.push(term); sum += term; term = (term * a) / (n + 1); }
  const p0 = 1 / (sum + term / (1 - rho));
  return (n) => (n < c ? head[n] : term * rho ** (n - c)) * p0;
}
const quantile = (p: (n: number) => number, u: number) => { let acc = 0; for (let n = 0; n < 20_000; n++) { acc += p(n); if (acc >= u) return n; } return 20_000; };
const inSystem = (sim: Sim) => sim.queue.length + sim.seats.filter(Boolean).length;

function newJob(sim: Sim, x: number, y: number, measured: boolean): Job {
  return { id: sim.id++, t0: measured ? sim.t : NaN, tc: sim.t, x, y, vx: 0, vy: 0, far: true };
}
function admit(sim: Sim, job: Job) {
  const free = sim.seats.indexOf(null);
  if (free >= 0) sim.seats[free] = { job, start: sim.t, end: sim.t + expo(sim.rnd) };
  else sim.queue.push(job);
}
/** Sets the number in system to n: extra jobs join at the back of the queue, surplus ones vanish. */
function setCount(sim: Sim, n: number, g: Geo) {
  let have = inSystem(sim);
  while (have > n && sim.queue.length) { sim.queue.pop(); have--; }
  for (let i = sim.seats.length - 1; i >= 0 && have > n; i--) if (sim.seats[i]) { sim.seats[i] = null; have--; }
  for (; have < n; have++) admit(sim, newJob(sim, g.QEND - g.QS, g.MID, false));
}
/** A fresh run already in a typical state for this load (a draw from the stationary distribution). */
function makeSim(c: number, rho: number, seed: number, g: Geo): Sim {
  const rnd = mulberry32(seed);
  const sim: Sim = { c, rho, u: 0.3 + 0.5 * rnd(), t: 0, next: Infinity, queue: [], seats: Array<Seat>(c).fill(null), out: [], rnd, id: 0, pulses: 0, meas: [], memo: { n: -1, s: 0, budget: 0, meanS: 0, share: 0 } };
  setCount(sim, rho < 1 ? quantile(pmf(c, rho), sim.u) : c, g);
  sim.next = rho > 0 ? expo(rnd) / (c * rho) : Infinity;
  return sim;
}
/** New λ: keep the run but move it to the run's own percentile of the new steady state (the same
 *  percentile every time, so dragging λ grows or shrinks the queue smoothly), and measure afresh. */
function retune(sim: Sim, rho: number, g: Geo) {
  if (rho < 1) setCount(sim, quantile(pmf(sim.c, rho), sim.u), g);
  else setCount(sim, Math.max(inSystem(sim), sim.c), g); // overload: every server busy, and it only grows
  sim.rho = rho;
  sim.meas = [];
  sim.next = rho > 0 ? sim.t + expo(sim.rnd) / (sim.c * rho) : Infinity;
}
/** Runs events up to sim time `until`. `ok(w)`: is a time in system w (in S) within the budget? */
function advance(sim: Sim, until: number, ok: (w: number) => boolean, g: Geo) {
  for (;;) {
    let j = -1, tn = sim.next;
    for (let i = 0; i < sim.seats.length; i++) { const v = sim.seats[i]; if (v && v.end < tn) { tn = v.end; j = i; } }
    if (tn > until) break;
    sim.t = tn;
    if (j < 0) {
      admit(sim, newJob(sim, g.SRC, g.MID, true));
      sim.pulses++;
      sim.next = sim.t + expo(sim.rnd) / (sim.c * sim.rho);
    } else {
      const { job } = sim.seats[j]!, w = sim.t - job.t0, measured = Number.isFinite(w);
      if (measured) { sim.meas.push(w); if (sim.meas.length > 20_000) sim.meas.splice(0, 10_000); }
      if (sim.out.length < 12) sim.out.push({ id: job.id, x: job.x, y: job.y, vx: job.vx, vy: job.vy, ty: job.y, age: 0, ok: measured ? ok(w) : null });
      const nx = sim.queue.shift();
      sim.seats[j] = nx ? { job: nx, start: sim.t, end: sim.t + expo(sim.rnd) } : null;
    }
  }
  sim.t = until;
}
/** Springs every drawn dot toward its place; `snap` puts them there at once (reduced motion). */
function move(sim: Sim, dt: number, g: Geo, snap: boolean) {
  const go = (b: Body, tx: number, ty: number) => {
    if (snap) { b.x = tx; b.y = ty; b.vx = b.vy = 0; return; }
    for (let left = dt; left > 0; left -= 1 / 60) {
      const h = Math.min(left, 1 / 60);
      b.vx += (260 * (tx - b.x) - 26 * b.vx) * h; b.vy += (260 * (ty - b.y) - 26 * b.vy) * h;
      b.x += b.vx * h; b.y += b.vy * h;
    }
  };
  sim.queue.forEach((job, i) => { if (i < g.QN) go(job, g.QX0 - i * g.QS, g.MID); else { job.x = g.QEND - g.QS; job.y = g.MID; job.vx = job.vy = 0; } });
  sim.seats.forEach((v, i) => {
    const b = g.bx[i];
    if (!v || !b) return;
    const tx = b.x + b.w / 2, ty = b.y + b.h / 2;
    go(v.job, tx, ty);
    v.job.far = Math.hypot(tx - v.job.x, ty - v.job.y) > 1.5; // arrived: it merges into the glowing server
  });
  for (const o of sim.out) { o.age += dt; go(o, g.EXIT, o.ty); }
  sim.out = snap ? [] : sim.out.filter((o) => o.age < 0.6);
}
function view(sim: Sim, s: number, budget: number, g: Geo): View {
  const n = sim.meas.length, m = sim.memo;
  if (m.n !== n || m.s !== s || m.budget !== budget) {
    let sum = 0, good = 0;
    for (const w of sim.meas) { sum += w; if (w * s <= budget) good++; }
    sim.memo = { n, s, budget, meanS: n ? sum / n : 0, share: n ? good / n : 0 };
  }
  return {
    q: sim.queue.slice(0, g.QN).map((j) => ({ id: j.id, x: j.x, y: j.y, heat: Math.min(1, (sim.t - j.tc) / 3) })),
    more: Math.max(0, sim.queue.length - g.QN),
    fly: sim.seats.flatMap((v) => (v?.job.far ? [{ id: v.job.id, x: v.job.x, y: v.job.y }] : [])),
    out: sim.out.map((o) => ({ id: o.id, x: o.x, y: o.y, op: Math.max(0, 1 - o.age / 0.6), ok: o.ok })),
    seats: sim.seats.map((v) => (v ? Math.min(1, (sim.t - v.start) / (v.end - v.start)) : -1)),
    waiting: sim.queue.length, busy: sim.seats.filter(Boolean).length, pulses: sim.pulses, n, meanS: sim.memo.meanS, share: sim.memo.share,
  };
}

type TT = (typeof T)["en"];
function LiveQueue({ c, rho, s, budget, w, t, onMeasure }: { c: number; rho: number; s: number; budget: number; w: number; t: TT; onMeasure: (m: Measured) => void }) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const sim = useRef<Sim | null>(null);
  const seed = useRef(1);
  const [width, setWidth] = useState(400);
  const g = useMemo(() => geo(width, c), [width, c]);
  const live = useRef({ s, budget, speed: 1 as Speed, g });
  const lastN = useRef(-1);
  const [v, setV] = useState<View | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>(1);
  const [onScreen, setOnScreen] = useState(false);
  const [tabOn, setTabOn] = useState(true);

  const draw = useCallback(() => {
    const sm = sim.current, L = live.current;
    if (!sm) return;
    const next = view(sm, L.s, L.budget, L.g);
    setV(next);
    if (next.n !== lastN.current) { lastN.current = next.n; onMeasure(next.n ? { n: next.n, meanS: next.meanS } : null); }
  }, [onMeasure]);

  // A new c rebuilds the servers; a new λ keeps the run and retunes it.
  useEffect(() => {
    const sm = sim.current;
    live.current.g = g;
    if (!sm || sm.c !== c) sim.current = makeSim(c, rho, seed.current, g);
    else if (sm.rho !== rho) retune(sm, rho, g);
    move(sim.current!, 0, g, sm?.c !== c || reduced);
    draw();
  }, [c, rho, g, reduced, draw]);
  useEffect(() => {
    live.current = { s, budget, speed, g };
    if (sim.current && (reduced || !playing)) { move(sim.current, 0, g, true); draw(); }
  }, [s, budget, speed, g, reduced, playing, draw]);

  useEffect(() => {
    const el = root.current, st = stage.current;
    if (!el || !st) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(st);
    const vis = () => setTabOn(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const running = playing && onScreen && tabOn && !reduced;
  useEffect(() => {
    if (!running) return;
    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000), sm = sim.current!, L = live.current;
      last = now;
      advance(sm, sm.t + (dt * L.speed) / secPerS(sm.c), (x) => x * L.s <= L.budget, L.g);
      move(sm, dt * Math.min(L.speed, 4), L.g, false);
      draw();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, draw]);

  const restart = () => { seed.current++; sim.current = makeSim(c, rho, seed.current, g); move(sim.current, 0, g, true); draw(); };
  const stepOnce = () => { const sm = sim.current!; advance(sm, sm.t + 1, (x) => x * s <= budget, g); move(sm, 0, g, true); draw(); };

  const pct0 = (x: number) => `${Math.round(x * 100)}%`;
  const sec = `${Number(secPerS(c).toFixed(1))} s`;
  const zone = (a: number, b: number) => ({ left: `${a}px`, width: `${b - a}px` });
  return (
    <figure className={css.sim} ref={root} aria-label={t.live}>
      <div className={css.head}>
        <figcaption className="section-label">{t.live}</figcaption>
        <div className={css.ctrls}>
          {reduced
            ? <button type="button" className={`${css.btn} ${css.main}`} onClick={stepOnce}>{t.step} ›</button>
            : <button type="button" className={`${css.btn} ${css.main}`} onClick={() => setPlaying((x) => !x)} aria-label={playing ? t.pause : t.play} title={playing ? t.pause : t.play}>
                <Glyph d={playing ? "M9 6v12M15 6v12" : "M8 5.5v13l10-6.5z"} fill={!playing} />
              </button>}
          <button type="button" className={css.btn} onClick={restart} aria-label={t.restart} title={t.restart}><Glyph d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></button>
          {!reduced && (
            <div className={css.speed} role="group" aria-label={t.speed}>
              {SPEEDS.map((x) => <button key={x} type="button" aria-pressed={x === speed} onClick={() => setSpeed(x)}>{x}×</button>)}
            </div>
          )}
        </div>
      </div>
      <div className={css.stage} ref={stage}>
        <svg className={css.svg} viewBox={`0 0 ${g.W} ${g.H}`} role="img" aria-label={v ? t.simAria(v.waiting, v.busy, c) : t.live}>
          <rect className={css.lane} x={g.QEND - 9} y={g.MID - 10} width={g.QX0 - g.QEND + 18} height={20} rx={10} />
          <path className={css.feed} d={`M${g.SRC + 10} ${g.MID}H${g.QEND - 12}M${g.QX0 + 11} ${g.MID}H${g.SX0 - 3}`} />
          <circle className={css.src} cx={g.SRC} cy={g.MID} r={7} />
          {v && v.pulses > 0 && <circle key={`p${v.pulses}`} className={css.pulse} cx={g.SRC} cy={g.MID} r={7} />}
          {g.bx.map((b, i) => {
            const p = v?.seats[i] ?? -1;
            return (
              <g key={`s${i}`} className={p >= 0 ? css.busy : undefined}>
                <rect className={css.box} x={b.x} y={b.y} width={b.w} height={b.h} rx={Math.min(7, b.h / 3)} />
                {p >= 0 && <>
                  <rect className={css.prog} x={b.x + 3} y={b.y + b.h - 4} width={Math.max(0, (b.w - 6) * p)} height={2} rx={1} />
                  <circle className={css.seat} cx={b.x + b.w / 2} cy={b.y + (b.h - 3) / 2} r={Math.min(DOT, b.h / 3.4)} />
                </>}
              </g>
            );
          })}
          {v?.q.map((d) => <circle key={`j${d.id}`} cx={d.x} cy={d.y} r={DOT} style={{ fill: `color-mix(in oklch, ${BLUE}, var(--bad) ${Math.round(d.heat * 100)}%)` }} />)}
          {v?.fly.map((d) => <circle key={`j${d.id}`} className={css.seat} cx={d.x} cy={d.y} r={DOT} />)}
          {v?.out.map((d) => <circle key={`o${d.id}`} cx={d.x} cy={d.y} r={DOT} style={{ opacity: d.op, fill: d.ok === null ? BLUE : d.ok ? "var(--good)" : "var(--bad)" }} />)}
        </svg>
        {v && v.more > 0 && <span className={css.more} style={{ left: `${g.QEND - 9}px`, top: `${g.MID - 13}px` }}>+{v.more.toLocaleString()}</span>}
      </div>
      <div className={css.zones} aria-hidden>
        <span style={zone(0, 28)}>λ</span><span style={zone(g.QEND - 9, g.QX0 + 9)}>{t.queue}</span><span style={zone(g.SX0 - 6, g.SX1 + 6)}>{t.servers(c)}</span>
      </div>
      <div className={css.read}>
        <span className={css.chip}><small>{t.waiting}</small><b><Ticker value={v?.waiting ?? 0} ms={250} /></b></span>
        <span className={css.chip}><small>{t.busy}</small><b>{v?.busy ?? 0}/{c}</b></span>
        <span className={css.chip}><small>{t.within}</small><b>{v && v.n ? pct0(v.share) : "—"}</b><em className={css.vs}>{t.withinSub}</em></span>
        <span className={css.chip}>
          <small>{t.measured}</small>
          <b>{v && v.n ? <Ticker value={v.meanS * s} format={ms} /> : "—"} <em className={css.vs}>{t.model(ms(w))}</em></b>
          <em className={css.vs}>{t.count(v?.n ?? 0)}</em>
        </span>
      </div>
      <p className="lab-note">{t.simNote(sec)}</p>
    </figure>
  );
}

function Glyph({ d, fill }: { d: string; fill?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
