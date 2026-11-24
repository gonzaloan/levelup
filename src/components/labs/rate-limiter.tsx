"use client";
// One request stream, three limiters side by side. Each limiter is the textbook algorithm run on
// the same timestamps, so the fixed window's 2× at a boundary is a measured count, not a claim.
// The live replay on top is a pure function of one simulated clock: every particle, token and
// window fill is read off the same decisions the counts come from, so pausing or scrubbing shows
// exactly the state the limiter was in at that instant.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { Locale } from "@/lib/types";
import { mulberry32 } from "@/lib/practice/rng";
import { Insight, LabGrid, Plot, Range, Seg, Stat, type PlotLabel } from "./ui";
import { Ticker, useReducedMotion } from "./motion";
import s from "./rate-limiter.module.css";

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

/** true = admitted. Every limiter allows L per window W; the bucket refills at r = L ÷ W.
 *  `level`, if given, receives the bucket's tokens right after each decision (for the replay). */
function admit(kind: Kind, ts: number[], limit: number, cap: number, level?: number[]): boolean[] {
  const rate = limit / WIN; // tokens per ms
  let tokens = cap, last = 0, win = -1, used = 0, head = 0;
  const log: number[] = []; // sliding log: timestamps of admitted requests
  return ts.map((t) => {
    if (kind === "bucket") {
      tokens = Math.min(cap, tokens + (t - last) * rate);
      last = t;
      const ok = tokens >= 1;
      if (ok) tokens -= 1;
      level?.push(tokens);
      return ok;
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

/** Number of sorted values ≤ x. */
function upto(a: ArrayLike<number>, x: number): number {
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= x) lo = m + 1; else hi = m; }
  return lo;
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
    live: "Live replay of the same 60 s", play: "Play", pause: "Pause", restart: "Restart", speed: "Speed", time: "Replay time",
    ff: "Fast-forward: no requests right now", client: "client", api: "API", refill: (r: number) => `refill r = ${r}/s`,
    tokens: (x: string, b: number) => `${x} / ${b} tokens`,
    full: "full: refill waits", empty: "< 1 token → 429", okN: (n: number) => `${n} ok`, rejN: (n: number) => `${n} × 429`,
    fixedNow: (a: number, b: number, u: number, l: number) => `window ${a}–${b} s: ${u} / ${l} used`,
    slidingNow: (a: string, b: string, u: number, l: number) => `(${a}, ${b}] s: ${u} / ${l} in the log`,
    reset: "reset to 0", fullTag: "full → 429",
    bucketAria: "Token bucket: requests fly from the client to the limiter; each one takes a token or bounces with 429",
    fixedAria: "Fixed windows of 10 s fill up with admitted requests and reset at each boundary",
    slidingAria: "A 10 s window slides with the clock; admitted timestamps inside it count against L",
    legend: "Dots: requests (green admitted, red 429) · amber: tokens · in the windows, the fill is the count against L",
    thin: (k: number) => ` · one dot per ${k} requests while many are in flight`, warp: (x: number) => ` · quiet stretches play ${x}× faster (⏩)`,
    zoom: " · on a phone the windows show 30 s at a time",
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
    live: "Repetición en vivo de los mismos 60 s", play: "Reproducir", pause: "Pausar", restart: "Reiniciar", speed: "Velocidad", time: "Tiempo de la repetición",
    ff: "Avance rápido: no hay requests ahora", client: "cliente", api: "API", refill: (r: number) => `recarga r = ${r}/s`,
    tokens: (x: string, b: number) => `${x} / ${b} tokens`,
    full: "lleno: la recarga espera", empty: "< 1 token → 429", okN: (n: number) => `${n} ok`, rejN: (n: number) => `${n} × 429`,
    fixedNow: (a: number, b: number, u: number, l: number) => `ventana ${a}–${b} s: ${u} / ${l} usadas`,
    slidingNow: (a: string, b: string, u: number, l: number) => `(${a}, ${b}] s: ${u} / ${l} en el log`,
    reset: "vuelve a 0", fullTag: "llena → 429",
    bucketAria: "Token bucket: las requests viajan del cliente al limitador; cada una toma un token o rebota con 429",
    fixedAria: "Ventanas fijas de 10 s que se llenan con las requests admitidas y se reinician en cada borde",
    slidingAria: "Una ventana de 10 s se desliza con el reloj; los timestamps admitidos dentro de ella cuentan contra L",
    legend: "Puntos: requests (verde admitida, rojo 429) · ámbar: tokens · en las ventanas, el relleno es lo que cuenta contra L",
    thin: (k: number) => ` · un punto cada ${k} requests cuando hay muchas en vuelo`, warp: (x: number) => ` · los tramos sin tráfico van ${x}× más rápido (⏩)`,
    zoom: " · en el teléfono las ventanas muestran 30 s a la vez",
  },
};
type Tx = (typeof T)["en"];

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
    const level: number[] = [];
    const rows = KINDS.map((kind) => {
      const ok = admit(kind, ts, limit, cap, kind === "bucket" ? level : undefined);
      const bins = Array.from({ length: SECS }, () => [0, 0]);
      ts.forEach((x, i) => { bins[Math.min(SECS - 1, Math.floor(x / 1000))][ok[i] ? 0 : 1]++; });
      const acc = ts.filter((_, i) => ok[i]);
      return { kind, okMask: ok, acc, ok: acc.length, rej: ts.length - acc.length, bins, ...peak(acc) };
    });
    return { ts, level, total: ts.length, rows, top: Math.max(1, ...rows[0].bins.map(([a, r]) => a + r)) };
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
      <Replay sim={sim} limit={limit} cap={cap} t={t} />
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.offered} value={<Ticker value={sim.total} />} sub={t.offeredSub} />
        {sim.rows.map((row) => <Stat key={row.kind} label={t[row.kind]} value={<Ticker value={row.max} />} sub={t.peakSub(limit)} tone={row.max <= limit ? "good" : row.kind === "bucket" ? "warn" : "bad"} />)}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {sim.rows.map((row) => (
          <div key={row.kind}>
            <div className="lr-top"><span>{t[row.kind]}</span><output>{t.counts(row.ok, row.rej)}</output></div>
            <svg className={`lab-svg ${s.bars}`} viewBox={`0 0 600 ${H + 4}`} aria-hidden="true">
              {row.max > 0 && <rect className={s.busiest} x={row.at / 100} y={0} width={WIN / 100} height={H + 2} style={{ fill: "var(--accent)", fillOpacity: 0.12, stroke: "var(--accent)" }} />}
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

/* ------------------------------------------------------------------ the live replay */
// Simulated ms a request spends flying to the limiter, after it, falling into a window, and how
// long the coin (token) takes to drop from the bucket to the gate. Quiet stretches play WARP× faster.
const PRE = 900, POST = 700, FALL = 600, COIN = 220, DRIP = 380, WARP = 8, MAX_DOTS = 36;
const SPEEDS = [0.5, 1, 2, 4] as const;
type Sim = { ts: number[]; level: number[]; rows: { kind: Kind; okMask: boolean[]; acc: number[] }[] };

/** One requestAnimationFrame loop while `on`; it sleeps while the tab is hidden or the element is
 *  off-screen, and stops on unmount. `tick` gets the real ms since the previous frame. */
function useFrames(ref: RefObject<HTMLElement | null>, on: boolean, tick: (dt: number) => void) {
  const cb = useRef(tick);
  useEffect(() => { cb.current = tick; });
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    let raf = 0, last = 0, seen = false;
    const frame = (now: number) => { const dt = last ? Math.min(50, now - last) : 0; last = now; cb.current(dt); if (raf) raf = requestAnimationFrame(frame); };
    const sync = () => {
      const run = seen && document.visibilityState === "visible";
      if (run && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", sync); cancelAnimationFrame(raf); raf = 0; };
  }, [on, ref]);
}

/** Most requests inside any `span` ms: sets how many requests one dot stands for. */
function busiest(ts: number[], span: number): number {
  let best = 0, i = 0;
  for (let j = 0; j < ts.length; j++) { while (ts[j] - ts[i] > span) i++; best = Math.max(best, j - i + 1); }
  return best;
}

const sec = (ms: number) => (ms / 1000).toFixed(1);

/** True on phone-width screens, where the drawings switch to a taller, zoomed-in layout. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 560px)");
    const on = () => setNarrow(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return narrow;
}

function Replay({ sim, limit, cap, t }: { sim: Sim; limit: number; cap: number; t: Tx }) {
  const reduced = useReducedMotion();
  const narrow = useNarrow();
  const box = useRef<HTMLElement>(null);
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const clock = useRef(0); // the frame loop reads the clock here, not from a render's closure
  const seek = (x: number) => { clock.current = x; setNow(x); };
  const { ts } = sim;
  // Reduced motion: no autoplay; open just after the last request (the busiest picture the run
  // ends on), and the scrubber shows any other moment.
  useEffect(() => {
    if (!reduced) return;
    const x = ts.length ? Math.min(SPAN, ts[ts.length - 1] + 300) : SPAN;
    setPlaying(false); clock.current = x; setNow(x);
  }, [reduced, ts]);
  const stride = useMemo(() => Math.max(1, Math.ceil(busiest(ts, PRE + POST) / MAX_DOTS)), [ts]);
  const idleAt = (x: number) => {
    const i = upto(ts, x);
    return (i >= ts.length || ts[i] - x > PRE + 300) && (i === 0 || x - ts[i - 1] > POST + 100);
  };
  useFrames(box, playing && !reduced, (dt) => {
    const x = clock.current, next = Math.min(SPAN, x + dt * speed * (idleAt(x) ? WARP : 1));
    seek(next);
    if (next >= SPAN) setPlaying(false);
  });
  const toggle = () => { if (playing) { setPlaying(false); return; } if (now >= SPAN) seek(0); setPlaying(true); };
  const warping = playing && !reduced && now < SPAN && idleAt(now);
  const lane = { sim, now, limit, stride, narrow, t };

  return (
    <section className={s.live} ref={box} aria-label={t.live}>
      <div className={s.transport}>
        {!reduced && (
          <>
            <button type="button" className={s.tbtn} onClick={() => { seek(0); setPlaying(true); }} aria-label={t.restart} title={t.restart}><Glyph d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></button>
            <button type="button" className={`${s.tbtn} ${s.main}`} onClick={toggle} aria-label={playing ? t.pause : t.play} title={playing ? t.pause : t.play}>
              {playing ? <Glyph d="M9 6v12M15 6v12" /> : <Glyph d="M8 5.5v13l10-6.5z" fill />}
            </button>
          </>
        )}
        <input className={s.scrub} type="range" min={0} max={SPAN / 100} value={Math.round(now / 100)} aria-label={t.time} aria-valuetext={`${sec(now)} s`}
          onChange={(e) => { setPlaying(false); seek(Number(e.target.value) * 100); }} style={{ ["--pct" as string]: `${(100 * now) / SPAN}%` } as CSSProperties} />
        <span className={s.clock}>{sec(now)} s<i className={`${s.ff}${warping ? ` ${s.ffOn}` : ""}`} title={t.ff} aria-hidden>⏩ {WARP}×</i></span>
        {!reduced && (
          <div className={s.speed} role="group" aria-label={t.speed}>
            {SPEEDS.map((v) => <button key={v} type="button" className={v === speed ? s.on : undefined} aria-pressed={v === speed} onClick={() => setSpeed(v)}>{v}×</button>)}
          </div>
        )}
      </div>
      <BucketScene {...lane} cap={cap} />
      <WindowLane kind="fixed" {...lane} />
      <WindowLane kind="sliding" {...lane} />
      <p className="lab-note">{t.legend}{stride > 1 ? t.thin(stride) : ""}{t.warp(WARP)}{narrow ? t.zoom : ""}</p>
    </section>
  );
}

function Glyph({ d, fill }: { d: string; fill?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function LaneHead({ title, now, tag, ok, rej, t }: { title: string; now: ReactNode; tag?: ReactNode; ok: number; rej: number; t: Tx }) {
  return (
    <div className={s.head}>
      <strong>{title}</strong>
      <span className={s.meter}>{now}</span>
      {tag}
      <output className={s.sofar}><b className={s.okc}>{t.okN(ok)}</b> · <b className={s.rejc}>{t.rejN(rej)}</b></output>
    </div>
  );
}

type LaneProps = { sim: Sim; now: number; limit: number; stride: number; narrow: boolean; t: Tx };

/* Token bucket: client → gate (with the bucket above it) → API, in viewBox units. Phones get a
   narrower, taller scene so the bucket and the particles stay big enough to follow. */
const WIDE = { w: 600, h: 150, track: 112, client: 78, gate: 300, api: 522, top: 20, bot: 78, r: 7 };
const SLIM = { w: 360, h: 176, track: 138, client: 70, gate: 180, api: 290, top: 26, bot: 98, r: 8 };

function BucketScene({ sim, now, limit, cap, stride, narrow, t }: LaneProps & { cap: number }) {
  const G = narrow ? SLIM : WIDE, B_IN = G.bot - G.top - 4;
  const { ts, level } = sim, ok = sim.rows[0].okMask;
  const rate = limit / WIN; // tokens per ms
  const tokensAt = (x: number) => { const j = upto(ts, x) - 1; return j < 0 ? cap : Math.min(cap, level[j] + (x - ts[j]) * rate); };
  const surfaceOf = (tok: number) => G.bot - 2 - B_IN * (tok / cap);
  const tokens = tokensAt(now), surface = surfaceOf(tokens);
  const done = upto(ts, now), admitted = upto(sim.rows[0].acc, now);
  const dots: ReactNode[] = [], coins: ReactNode[] = [], drops: ReactNode[] = [];
  let flash: "ok" | "bad" | "" = "";
  for (let i = upto(ts, now - POST); i < ts.length && ts[i] <= now + PRE; i++) {
    const d = now - ts[i];
    if (d >= 0 && d < 260) flash = ok[i] ? (flash || "ok") : "bad";
    if (i % stride) continue;
    if (ok[i] && d >= -COIN && d < 0) {
      const k = 1 + d / COIN; // the token drops from the bucket to meet its request at the gate
      coins.push(<circle key={`c${i}`} className={s.coin} cx={G.gate} cy={G.bot + 2 + (G.track - G.bot - 2) * k} r={G.r - 2} />);
    }
    if (d < 0) {
      const k = 1 + d / PRE; // 0 at the client, 1 at the gate
      dots.push(<circle key={i} className={s.req} cx={G.client + 8 + (G.gate - 14 - G.client) * k} cy={G.track} r={G.r} />);
    } else if (ok[i]) {
      const k = d / POST;
      dots.push(<circle key={i} className={s.pass} cx={G.gate + 8 + (G.api - G.gate - 8) * k} cy={G.track} r={G.r} style={{ opacity: k > 0.85 ? (1 - k) / 0.15 : 1 }} />);
    } else {
      const k = d / POST; // bounced off the gate: back and down, fading out
      dots.push(<circle key={i} className={s.bounce} cx={G.gate - 12 - (G.gate - G.client) * 0.6 * k} cy={G.track - 30 * Math.sin(Math.PI * k) + 34 * k * k} r={G.r} style={{ opacity: 1 - k * k }} />);
    }
  }
  // A drop is one token landing; while the bucket is full the refill has nowhere to go.
  const every = 1 / rate;
  for (let k = Math.ceil(now / every); k * every <= now + DRIP; k++) {
    const land = k * every;
    if (land <= 0 || tokensAt(land) >= cap - 1e-6) continue;
    const p = 1 - (land - now) / DRIP, y = 12 + (surfaceOf(tokensAt(land)) - 12) * p * p;
    drops.push(<circle key={`d${k}`} className={s.drop} cx={G.gate} cy={y} r={3.5} />);
  }
  const labels: PlotLabel[] = [
    { x: (8 + G.client) / 2, y: G.track, text: t.client, anchor: "middle" },
    { x: (G.api + G.w - 8) / 2, y: G.track, text: t.api, anchor: "middle" },
    { x: G.gate + 60, y: 7, text: t.refill(limit / 10), color: "var(--muted)" },
    { x: G.gate + 46, y: (G.top + G.bot) / 2, text: <b className={s.tok}>{t.tokens(tokens.toFixed(1), cap)}</b> },
  ];
  if (flash === "bad") labels.push({ x: G.gate, y: G.track + 28, text: <b className={s.flash429}>429</b>, anchor: "middle" });
  const full = tokens >= cap - 1e-6, empty = tokens < 1;
  const tag = empty ? <span className={`${s.tag} ${s.tagBad}`}>{t.empty}</span> : full ? <span className={s.tag}>{t.full}</span> : null;
  const bx = G.gate - 38;
  return (
    <div className={s.lane}>
      <LaneHead title={t.bucket} now={`B = ${cap}`} tag={tag} ok={admitted} rej={done - admitted} t={t} />
      <Plot w={G.w} h={G.h} label={t.bucketAria} labels={labels}>
        <rect x={8} y={G.track - 20} width={G.client - 8} height={40} rx={10} className={s.boxShape} />
        <rect x={G.api} y={G.track - 20} width={G.w - 8 - G.api} height={40} rx={10} className={s.boxShape} />
        <line x1={G.client} x2={G.api} y1={G.track} y2={G.track} className={s.track} />
        <path d={`M${G.gate + 52} 6H${G.gate}V12`} className={s.tap} />
        <rect x={bx + 2} y={surface} width={72} height={G.bot - 2 - surface} rx={3} className={s.liquid} />
        <path d={`M${bx} ${G.top}V${G.bot - 6}Q${bx} ${G.bot} ${bx + 6} ${G.bot}H${bx + 70}Q${bx + 76} ${G.bot} ${bx + 76} ${G.bot - 6}V${G.top}`} className={s.bucket} />
        <line x1={G.gate} x2={G.gate} y1={G.bot} y2={G.track - 18} className={s.spout} />
        {drops}
        <rect x={G.gate - 4} y={G.track - 18} width={8} height={36} rx={4} className={`${s.gate}${flash ? ` ${flash === "ok" ? s.gateOk : s.gateBad}` : ""}`} />
        {coins}
        {dots}
      </Plot>
    </div>
  );
}

/* Fixed and sliding windows on a timeline. Wide screens see all 60 s; phones see 30 s that pan
   with the playhead, so a 10 s window stays wide enough to read. */
const LANE_WIDE = { view: SPAN, h: 96, top: 16, base: 76, r: 4.5 };
const LANE_SLIM = { view: SPAN / 2, h: 132, top: 22, base: 106, r: 6 };

function WindowLane({ kind, sim, now, limit, stride, narrow, t }: LaneProps & { kind: "fixed" | "sliding" }) {
  const uid = `rl-${kind}-`; // one lane of each kind per page (useId differs across the lazy-loaded boundary)
  const G = narrow ? LANE_SLIM : LANE_WIDE, CH = G.base - G.top;
  const k = 600 / G.view; // viewBox units per ms
  const off = Math.max(0, Math.min(SPAN - G.view, now - 0.65 * G.view)) * k; // camera pan, in units
  const X = (ms: number) => ms * k;
  const row = sim.rows[kind === "fixed" ? 1 : 2], { ts } = sim, { okMask, acc } = row;
  // Every admitted / rejected request as a tick (one per half unit: more would overlap anyway);
  // clip rects reveal them as the clock passes.
  const ticks = useMemo(() => {
    const ok = new Set<number>(), bad = new Set<number>();
    ts.forEach((x, i) => (okMask[i] ? ok : bad).add(Math.round(x * k * 2) / 2));
    const path = (xs: Set<number>, y: number, dy: number) => [...xs].map((x) => `M${x} ${y}v${dy}`).join("");
    return { ok: path(ok, G.base - 1, -8), bad: path(bad, G.base + 4, 8) };
  }, [ts, okMask, k, G.base]);
  const done = upto(ts, now), admitted = upto(acc, now);
  const cur = Math.min(SPAN / WIN - 1, Math.floor(now / WIN));
  const used = (w: number) => upto(acc, Math.min(now, (w + 1) * WIN - 1)) - upto(acc, w * WIN - 1);
  const inLog = upto(acc, now) - upto(acc, now - WIN);
  const level = (n: number) => CH * Math.min(1, n / limit);
  const curUsed = kind === "fixed" ? used(cur) : inLog, full = curUsed >= limit;
  const surfaceAt = (x: number, okd: boolean) => {
    if (!okd) return G.top; // a full window: the request bounces off the lid
    const n = kind === "fixed" ? upto(acc, x - 1) - upto(acc, Math.floor(x / WIN) * WIN - 1) : upto(acc, x - 1) - upto(acc, x - WIN);
    return G.base - level(n);
  };
  const dots: ReactNode[] = [];
  for (let i = upto(ts, now - 500); i < ts.length && ts[i] <= now + FALL; i++) {
    if (i % stride) continue;
    const d = now - ts[i], x = X(ts[i]);
    if (d < 0) {
      const p = 1 + d / FALL;
      dots.push(<circle key={i} className={s.req} cx={x} cy={2 + (surfaceAt(ts[i], okMask[i]) - G.r - 2) * p * p} r={G.r} />);
    } else if (!okMask[i]) {
      const p = d / 500;
      dots.push(<circle key={i} className={s.bounce} cx={x + 14 * p} cy={G.top - G.r - 12 * Math.sin(Math.PI * p)} r={G.r} style={{ opacity: 1 - p }} />);
    }
  }
  const [a, b] = kind === "fixed" ? [cur * WIN, (cur + 1) * WIN] : [Math.max(0, now - WIN), now];
  const labels: PlotLabel[] = [];
  const label = (x: number, text: ReactNode, color?: string) => { if (x - off > 20 && x - off < 580) labels.push({ x: x - off, y: G.top + 11, text, anchor: "middle", color }); };
  if (kind === "fixed") for (let w = 0; w <= cur; w++) label(X(w * WIN + WIN / 2), w === cur ? `${used(w)}/${limit}` : used(w), w === cur ? "var(--text)" : undefined);
  else if (now > 0) label((X(a) + X(b)) / 2, `${inLog}/${limit}`, "var(--text)");
  const tag = full ? <span className={`${s.tag} ${s.tagBad}`}>{t.fullTag}</span>
    : kind === "fixed" && cur > 0 && now - cur * WIN < 1200 ? <span key={cur} className={`${s.tag} ${s.tagReset}`}>{t.reset}</span> : null;
  const W = X(WIN);
  return (
    <div className={s.lane}>
      <LaneHead title={t[kind]} now={kind === "fixed" ? t.fixedNow(a / 1000, b / 1000, curUsed, limit) : t.slidingNow(sec(a), sec(b), curUsed, limit)} tag={tag} ok={admitted} rej={done - admitted} t={t} />
      <Plot w={600} h={G.h} label={kind === "fixed" ? t.fixedAria : t.slidingAria} labels={labels}>
        <defs>
          <clipPath id={`${uid}p`}><rect x={0} y={0} width={X(now) + 0.5} height={G.h} /></clipPath>
          <clipPath id={`${uid}w`}><rect x={X(a)} y={0} width={Math.max(0, X(b) - X(a)) + 0.5} height={G.h} /></clipPath>
        </defs>
        <g transform={`translate(${(-off).toFixed(1)} 0)`}>
          {kind === "fixed"
            ? Array.from({ length: SPAN / WIN }, (_, w) => {
                const u = w <= cur ? used(w) : 0, state = w < cur ? s.past : w === cur ? s.cur : s.future;
                return (
                  <g key={w} className={state}>
                    <rect x={w * W + 2} y={G.top} width={W - 4} height={CH} rx={6} className={s.win} />
                    {u > 0 && <rect x={w * W + 4} y={G.base - level(u)} width={W - 8} height={level(u)} rx={3} className={`${s.wfill}${u >= limit ? ` ${s.wfull}` : ""}`} />}
                    {w === cur && now > 0 && <rect key={cur} x={w * W + 2} y={G.top} width={W - 4} height={CH} rx={6} className={s.resetFlash} />}
                  </g>
                );
              })
            : now > 0 && (
                <g className={s.cur}>
                  <rect x={X(a)} y={G.top} width={X(b) - X(a)} height={CH} rx={6} className={s.win} />
                  <rect x={X(a) + 2} y={G.base - level(inLog)} width={Math.max(0, X(b) - X(a) - 4)} height={level(inLog)} rx={3} className={`${s.wfill}${full ? ` ${s.wfull}` : ""}`} />
                </g>
              )}
          <line x1={0} x2={X(SPAN)} y1={G.base} y2={G.base} className={s.base} />
          <path d={ticks.ok} clipPath={`url(#${uid}p)`} className={kind === "sliding" ? s.tickOld : s.tickOk} />
          {kind === "sliding" && <path d={ticks.ok} clipPath={`url(#${uid}w)`} className={s.tickOk} />}
          <path d={ticks.bad} clipPath={`url(#${uid}p)`} className={s.tickBad} />
          <line x1={X(now)} x2={X(now)} y1={2} y2={G.h - 4} className={s.playhead} />
          {dots}
        </g>
      </Plot>
    </div>
  );
}
