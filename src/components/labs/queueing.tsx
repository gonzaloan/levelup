"use client";
// Utilization vs latency in the textbook M/M/c queue: Poisson arrivals, exponential service, c
// servers sharing one FIFO queue. Mean time in system comes from Erlang C, in-flight work from
// Little's law. The model is a stated simplification: it gives the shape of the knee, not real ms.
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import { Insight, LabGrid, LogRange, Plot, Range, Stat, fmtNum, fmtTime, type PlotLabel } from "./ui";

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
  },
};

const VW = 400, VH = 200, PAD = 6, TOP = 20, BOT = 24;

export default function QueueingLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [s, setS] = useState(20);
  const [c, setC] = useState(1);
  const [lamIn, setLam] = useState(35);
  const [budget, setBudget] = useState(100);

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
  const tail = c > 1 ? t.pool(c) : "";
  const insight = rho >= 1
    ? t.over(pct(rho), need)
    : t.insight(pct(rho), times(w / s), ms(w), times(wRatio(c, 0.9)), times(wRatio(c, 0.99))) + (ratio > 1 ? t.allows(pct(rMax), fmtNum(rMax * cap)) : "") + tail;

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
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.rho} value={pct(rho)} sub={t.rhoSub(fmtNum(lam), fmtNum(cap))} tone={rho >= 1 ? "bad" : undefined} />
        <Stat label={t.w} value={ms(w)} sub={t.wSub(times(w / s), ms(wq))} tone={w <= budget ? "good" : "bad"} />
        <Stat label={t.l} value={Number.isFinite(w) ? fmtNum((lam * w) / 1000) : "∞"} sub={t.lSub(Number.isFinite(wq) ? fmtNum((lam * wq) / 1000) : "∞")} />
        <Stat label={t.wait} value={pct(pWait)} sub={t.waitSub} />
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
          <circle cx={mx} cy={my} r={5.5} style={{ fill: rho >= 1 ? "var(--bad)" : "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }} />
        </Plot>
        <p className="lab-note"><Sw c="var(--accent)" />{t.shared(c)}{c > 1 && <> · <Sw c="var(--muted)" dash="dotted" />{t.split(c)}</>} · <Sw c="var(--bad)" dash="dashed" />{t.bShort}{ratio > 1 && <> · <i aria-hidden style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "color-mix(in srgb, var(--bad) 18%, transparent)", margin: "0 5px -1px 0" }} />{t.zone}</>} · {t.axis}</p>
      </div>
      <p className="lab-formula">{t.formula}</p>
      <Insight>{insight}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}
