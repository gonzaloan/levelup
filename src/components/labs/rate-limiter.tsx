"use client";
// One request stream, three limiters side by side. Each limiter is the textbook algorithm run on
// the same timestamps, so the fixed window's 2× at a boundary is a measured count, not a claim.
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import { mulberry32 } from "@/lib/practice/rng";
import { Insight, LabGrid, Range, Seg, Stat } from "./ui";

const SPAN = 60_000, WIN = 10_000, SECS = 60, H = 64; // ms; H = bar height in SVG units
const KINDS = ["bucket", "fixed", "sliding"] as const;
type Kind = (typeof KINDS)[number];
type Pattern = "steady" | "bursty" | "boundary";

/** Request timestamps in whole ms (float sums would put 29.999… s inside a 10 s span). Seeded:
 *  the same controls always give the same stream. */
function stream(p: Pattern, rps: number, limit: number, bursts: number): number[] {
  const out: number[] = [];
  const spread = (from: number, count: number, r?: () => number) => {
    for (let i = 0; i < count; i++) out.push(from + Math.floor((r ? r() : (i + 0.5) / count) * 1000));
  };
  for (let i = 0; p === "steady" && i < (SPAN / 1000) * rps; i++) out.push(Math.round(((i + 0.5) * 1000) / rps));
  if (p === "bursty") { const r = mulberry32(42); for (let s = 0; s < SECS; s++) if (r() < 0.2) spread(s * 1000, Math.round(rps * 5), r); }
  if (p === "boundary") { spread(3 * WIN - 1000, limit); spread(3 * WIN, limit); }
  const rb = mulberry32(7); // each "send burst" lands on the next seeded second; earlier ones stay put
  for (let b = 0; b < bursts; b++) spread(Math.floor(rb() * (SECS - 1)) * 1000, limit);
  return out.sort((a, b) => a - b);
}

/** true = admitted. Every limiter allows L per window W; the bucket refills at r = L ÷ W. */
function admit(kind: Kind, ts: number[], limit: number, cap: number): boolean[] {
  const rate = limit / WIN; // tokens per ms
  let tokens = cap, last = 0, win = -1, used = 0, head = 0;
  const log: number[] = []; // sliding log: timestamps of admitted requests
  return ts.map((t) => {
    if (kind === "bucket") {
      tokens = Math.min(cap, tokens + (t - last) * rate);
      last = t;
      if (tokens < 1) return false;
      tokens -= 1;
      return true;
    }
    if (kind === "fixed") {
      if (Math.floor(t / WIN) !== win) { win = Math.floor(t / WIN); used = 0; }
      if (used >= limit) return false;
      used++;
      return true;
    }
    while (head < log.length && log[head] <= t - WIN) head++;
    if (log.length - head >= limit) return false;
    log.push(t);
    return true;
  });
}

/** Most admitted requests in any W-long span, and where that span starts. */
function peak(acc: number[]): { max: number; at: number } {
  let max = 0, at = 0, i = 0;
  for (let j = 0; j < acc.length; j++) {
    while (acc[j] - acc[i] >= WIN) i++;
    if (j - i + 1 > max) { max = j - i + 1; at = acc[i]; }
  }
  return { max, at };
}

const T = {
  en: {
    pattern: "Traffic pattern", steady: "Steady", bursty: "Bursty", boundary: "Burst at the boundary",
    rps: "Offered rate (requests/s, average)", limit: "Limit L per 10 s window", cap: "Bucket capacity B",
    capHint: "The largest burst you accept.", burst: (l: number) => `Send a burst (+${l} in 1 s)`, clear: (b: number) => `Clear bursts (${b})`,
    bucket: "Token bucket", fixed: "Fixed window", sliding: "Sliding window log",
    offered: "Requests sent", offeredSub: "over 60 s", peakSub: (l: number) => `most admitted in any 10 s (L = ${l})`,
    counts: (ok: number, rej: number) => `${ok} ok · ${rej} × 429`,
    accepted: "admitted", busiest: "busiest 10 s", axis: "dashed lines: window boundaries · time 0 → 60 s",
    formula: (l: number, b: number) => `r = L ÷ W = ${l / 10}/s · most admitted in any W: sliding log ≤ L = ${l}, token bucket ≤ B + r·W = ${b + l}, fixed window ≤ 2L = ${2 * l}`,
    over: (x: number, l: number) => `The fixed window admitted ${x} requests in one 10 s span with L = ${l}: two windows' quotas meet at the boundary (up to 2×).`,
    held: (x: number) => `Here the fixed window held (peak ${x}); pick "Burst at the boundary" to see it admit up to 2× the limit.`,
    tail: " The sliding log is exact but stores a timestamp per request; the token bucket allows bursts up to B and averages r, which is why it's the default. Answer the rest with 429 + Retry-After.",
    note: "Simulated in your browser: one client, one limiter instance (with many gateway replicas, keep counters in Redis). W = 10 s, the bucket starts full, the sliding log keeps admitted timestamps only; streams are seeded, so they repeat. Rules from the rate limiting concept; 429 is defined in RFC 6585.",
  },
  es: {
    pattern: "Patrón de tráfico", steady: "Constante", bursty: "En ráfagas", boundary: "Ráfaga en el borde",
    rps: "Tasa ofrecida (requests/s, promedio)", limit: "Límite L por ventana de 10 s", cap: "Capacidad del bucket B",
    capHint: "La ráfaga más grande que aceptas.", burst: (l: number) => `Enviar ráfaga (+${l} en 1 s)`, clear: (b: number) => `Quitar ráfagas (${b})`,
    bucket: "Token bucket", fixed: "Ventana fija", sliding: "Sliding window log",
    offered: "Requests enviadas", offeredSub: "en 60 s", peakSub: (l: number) => `máximo admitido en 10 s (L = ${l})`,
    counts: (ok: number, rej: number) => `${ok} ok · ${rej} × 429`,
    accepted: "admitidas", busiest: "los 10 s más cargados", axis: "líneas punteadas: bordes de ventana · tiempo 0 → 60 s",
    formula: (l: number, b: number) => `r = L ÷ W = ${l / 10}/s · máximo admitido en cualquier W: sliding log ≤ L = ${l}, token bucket ≤ B + r·W = ${b + l}, ventana fija ≤ 2L = ${2 * l}`,
    over: (x: number, l: number) => `La ventana fija admitió ${x} requests en un tramo de 10 s con L = ${l}: las cuotas de dos ventanas se juntan en el borde (hasta 2×).`,
    held: (x: number) => `Aquí la ventana fija aguantó (pico ${x}); elige "Ráfaga en el borde" para verla admitir hasta 2× el límite.`,
    tail: " El sliding log es exacto pero guarda un timestamp por request; el token bucket permite ráfagas de hasta B y promedia r, por eso es la opción por defecto. Responde el resto con 429 + Retry-After.",
    note: "Simulado en tu navegador: un cliente y una sola instancia del limitador (con muchas réplicas del gateway, guarda los contadores en Redis). W = 10 s, el bucket empieza lleno y el sliding log guarda solo los timestamps admitidos; los flujos usan semilla, así que se repiten. Reglas del concepto de rate limiting; el 429 está definido en el RFC 6585.",
  },
};

const Sw = ({ c }: { c: string }) => <i aria-hidden style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: c, margin: "0 4px 0 0" }} />;

export default function RateLimiterLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [pattern, setPattern] = useState<Pattern>("boundary");
  const [rps, setRps] = useState(3);
  const [limit, setLimit] = useState(20);
  const [cap, setCap] = useState(10);
  const [bursts, setBursts] = useState(0);

  const sim = useMemo(() => {
    const ts = stream(pattern, rps, limit, bursts);
    const rows = KINDS.map((kind) => {
      const ok = admit(kind, ts, limit, cap);
      const bins = Array.from({ length: SECS }, () => [0, 0]);
      ts.forEach((x, i) => { bins[Math.min(SECS - 1, Math.floor(x / 1000))][ok[i] ? 0 : 1]++; });
      const acc = ts.filter((_, i) => ok[i]);
      return { kind, ok: acc.length, rej: ts.length - acc.length, bins, ...peak(acc) };
    });
    return { total: ts.length, rows, top: Math.max(1, ...rows[0].bins.map(([a, r]) => a + r)) };
  }, [pattern, rps, limit, cap, bursts]);
  const fixed = sim.rows[1];

  return (
    <LabGrid
      controls={
        <>
          <Seg label={t.pattern} value={pattern} onChange={setPattern} options={(["steady", "bursty", "boundary"] as const).map((p) => ({ value: p, label: t[p] }))} />
          {pattern !== "boundary" && <Range label={t.rps} value={rps} min={1} max={20} onChange={setRps} />}
          <Range label={t.limit} value={limit} min={5} max={100} step={5} onChange={setLimit} />
          <Range label={t.cap} value={cap} min={1} max={100} onChange={setCap} hint={t.capHint} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={() => setBursts((b) => b + 1)}>{t.burst(limit)}</button>
            <button type="button" className="btn" onClick={() => setBursts(0)} disabled={!bursts}>{t.clear(bursts)}</button>
          </div>
        </>
      }
    >
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.offered} value={sim.total} sub={t.offeredSub} />
        {sim.rows.map((row) => <Stat key={row.kind} label={t[row.kind]} value={row.max} sub={t.peakSub(limit)} tone={row.max <= limit ? "good" : row.kind === "bucket" ? "warn" : "bad"} />)}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {sim.rows.map((row) => (
          <div key={row.kind}>
            <div className="lr-top"><span>{t[row.kind]}</span><output>{t.counts(row.ok, row.rej)}</output></div>
            <svg className="lab-svg" viewBox={`0 0 600 ${H + 4}`} aria-hidden="true">
              {row.max > 0 && <rect x={row.at / 100} y={0} width={WIN / 100} height={H + 2} style={{ fill: "var(--accent)", fillOpacity: 0.12, stroke: "var(--accent)" }} />}
              {Array.from({ length: SPAN / WIN - 1 }, (_, k) => (k + 1) * (WIN / 100)).map((x) => <line key={x} x1={x} x2={x} y1={0} y2={H + 2} style={{ stroke: "var(--border-2)", strokeDasharray: "3 3" }} />)}
              {row.bins.map(([a, r], s) => {
                const ha = a && Math.max(1.5, (a / sim.top) * H), hr = r && Math.max(1.5, (r / sim.top) * H);
                return (
                  <g key={s}>
                    {a > 0 && <rect x={s * 10 + 1} y={H + 2 - ha} width={8} height={ha} style={{ fill: "var(--good)" }} />}
                    {r > 0 && <rect x={s * 10 + 1} y={H + 2 - ha - hr} width={8} height={hr} style={{ fill: "var(--bad)" }} />}
                  </g>
                );
              })}
              <line x1={0} x2={600} y1={H + 2} y2={H + 2} style={{ stroke: "var(--border)" }} />
            </svg>
          </div>
        ))}
        <p className="lab-note"><Sw c="var(--good)" />{t.accepted} · <Sw c="var(--bad)" />429 · <Sw c="var(--accent)" />{t.busiest} · {t.axis}</p>
      </div>
      <p className="lab-formula">{t.formula(limit, cap)}</p>
      <Insight>{(fixed.max > limit ? t.over(fixed.max, limit) : t.held(fixed.max)) + t.tail}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}
