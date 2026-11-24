"use client";
// Cache hit ratio, measured: 200,000 seeded requests over K keys with Zipf-like popularity, run
// through an LRU cache. One pass computes each request's LRU stack distance (Mattson et al., 1970):
// a request hits a cache of size C exactly when its distance is ≤ C, so the whole curve is a count.
// On top, a toy request stream plays through a small LRU: hits bounce back from the cache, misses
// travel on to the origin and get inserted at the front, and the least recent key fades out.
import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Locale } from "@/lib/types";
import { mulberry32 } from "@/lib/practice/rng";
import { Bar, Insight, LabGrid, LogRange, Plot, Range, Seg, Stat, fmtNum, fmtTime, type PlotLabel } from "./ui";
import { PlayerBar, Ticker, usePlayer, useReducedMotion, type Player } from "./motion";
import css from "./cache-sim.module.css";

const R = 200_000, FROM = R / 2, RATE = 1000; // requests, warm-up, assumed requests per second
const TTLS = [0, 60, 10, 1] as const; // seconds; 0 = no TTL
const NEVER = 0x7fffffff;

let U: Float64Array | null = null;
const uniforms = () => (U ??= Float64Array.from({ length: R }, mulberry32(42)));

/** The key of each request: rank i (0-based) has weight 1/(i+1)^s, drawn by inverse CDF. */
function stream(k: number, s: number) {
  const cdf = new Float64Array(k);
  let acc = 0;
  for (let i = 0; i < k; i++) cdf[i] = acc += (i + 1) ** -s;
  const u = uniforms(), keys = new Int32Array(R);
  for (let j = 0; j < R; j++) {
    const x = u[j] * acc;
    let lo = 0, hi = k - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < x) lo = m + 1; else hi = m; }
    keys[j] = lo;
  }
  return { keys, dist: stackDistances(keys, k), top1: cdf[Math.max(0, Math.ceil(k / 100) - 1)] / acc };
}

/** Distinct keys touched since this key's last request, + 1 (a Fenwick tree marks latest uses). */
function stackDistances(keys: Int32Array, k: number): Int32Array {
  const bit = new Int32Array(R + 1), last = new Int32Array(k).fill(-1), d = new Int32Array(R);
  const add = (i: number, v: number) => { for (i++; i <= R; i += i & -i) bit[i] += v; };
  const upTo = (i: number) => { let s = 0; for (i++; i > 0; i -= i & -i) s += bit[i]; return s; };
  for (let i = 0; i < R; i++) {
    const p = last[keys[i]];
    if (p < 0) d[i] = NEVER;
    else { d[i] = upTo(i - 1) - upTo(p) + 1; add(p, -1); }
    add(i, 1);
    last[keys[i]] = i;
  }
  return d;
}

/** Hit ratio after warm-up. With a TTL a hit also needs a copy younger than the TTL; the copy's
 *  age counts from the miss that filled it, and an expired copy keeps its LRU slot. `fill` needs no
 *  reset: a key's first request in a pass is a miss (distance NEVER), which overwrites it. */
function hitRatio(keys: Int32Array, d: Int32Array, c: number, ttl: number, fill: Int32Array): number {
  let h = 0;
  if (!ttl) { for (let i = FROM; i < R; i++) if (d[i] <= c) h++; return h / (R - FROM); }
  for (let i = 0; i < R; i++) {
    if (d[i] <= c && i - fill[keys[i]] < ttl) { if (i >= FROM) h++; } else fill[keys[i]] = i;
  }
  return h / (R - FROM);
}

const pct = (x: number) => `${(x * 100).toFixed((x >= 0.995 && x < 1) || x < 0.1 ? 1 : 0)}%`;
const ms = (x: number) => fmtTime(x * 1e6);
const Sw = ({ c, dash }: { c: string; dash?: boolean }) => <i aria-hidden style={{ display: "inline-block", width: 14, height: 0, borderTop: `2px ${dash ? "dashed" : "solid"} ${c}`, margin: "0 5px 3px 0" }} />;

const T = {
  en: {
    skew: "Popularity skew s", skewHint: "Zipf-like: the i-th most popular key gets a share ∝ 1/iˢ. Illustrative values.",
    keys: "Distinct keys (catalog)", size: "Cache size (keys, LRU)", sizeHint: (p: string) => `${p} of the catalog`,
    ttl: "TTL", none: "none", cacheMs: "Cache latency", originMs: "Origin latency",
    hit: "Hit ratio", hitSub: "measured, after warm-up", avg: "Average latency", avgSub: (o: string) => `no cache: ${o}`,
    origin: "Origin load", originSub: (x: string) => `of requests · ${x}× less than no cache`, top: "Top 1% of keys", topSub: "share of all requests",
    aria: (s: string) => `Hit ratio against cache size, for popularity skew ${s} and for uniform popularity`,
    skewed: (s: string) => `skewed, s = ${s}`, uniform: "uniform (s = 0)", axis: "x: cache size (keys, log) · y: hit ratio",
    split: "Where the average latency comes from", fromHits: "hits × cache", fromMisses: "misses × origin",
    formula: (h: string, m: string, c: string, o: string, a: string) => `avg = hit × cache + miss × origin = ${h} × ${c} + ${m} × ${o} = ${a} · origin load = requests × (1 − hit)`,
    insight: (share: string, hit: string, uni: string, l90: string, l99: string) => `A cache holding ${share} of the keys serves ${hit} of the reads; with uniform traffic the same cache would serve ${uni}. Skew is what lets a small cache work. Past 90% every point counts: 90% → 99% hits cuts origin traffic 10×${l90 === l99 ? "" : ` and the average latency from ${l90} to ${l99}`}.`,
    ttlCost: (h: string) => ` The TTL costs you here: without it the hit ratio would be ${h}, because rarely read keys expire before their next read.`,
    note: "Simulated in your browser: 200,000 seeded requests at an assumed 1,000/s (200 s); the first 100,000 warm the cache and the hit ratio is measured on the rest. LRU eviction; a TTL counts from the miss that filled the key (cache-aside), hits don't extend it, and an expired copy keeps its slot until evicted. A key's first request is always a miss, so with a huge catalog even an infinite cache stays below 100%. Formulas from the caching and CDN concepts.",
    stream: "Request stream through an LRU cache", app: "App", cache: "Cache (LRU)", mru: "newest", lru: "oldest",
    originBox: "Origin (database)", next: "next", ready: (n: number) => `A warm cache with ${n} slots. Press play: each step is one request for one key.`,
    hitMsg: (k: number, at: number) => `#${k}: hit at position ${at} → served from the cache and moved to the front (most recent).`,
    missMsg: (k: number, ev: number | null) => `#${k}: miss → read from the origin, inserted at the front${ev ? `; #${ev}, the least recent, is evicted` : ""}.`,
    toyHit: "This stream", toyHitSub: (h: number, n: number) => `${h} hit${h === 1 ? "" : "s"} of ${n}`, simHit: "Measured above", simHitSub: "200,000 requests",
    toyNote: (k: string) => `Toy stream (illustrative): 8 slots and a ${k}-key catalog, so the same cache share and skew as your settings; warmed up first, no TTL, durations not to scale. #r is the r-th most popular key: watch the hot ones stay. The red-edged slot is the least recent one, the next to be evicted.`,
  },
  es: {
    skew: "Sesgo de popularidad s", skewHint: "Tipo Zipf: la i-ésima clave más popular recibe una fracción ∝ 1/iˢ. Valores ilustrativos.",
    keys: "Claves distintas (catálogo)", size: "Tamaño de la caché (claves, LRU)", sizeHint: (p: string) => `${p} del catálogo`,
    ttl: "TTL", none: "sin TTL", cacheMs: "Latencia de la caché", originMs: "Latencia del origen",
    hit: "Hit ratio", hitSub: "medido, tras calentar", avg: "Latencia promedio", avgSub: (o: string) => `sin caché: ${o}`,
    origin: "Carga del origen", originSub: (x: string) => `de las requests · ${x}× menos que sin caché`, top: "Top 1% de claves", topSub: "fracción de todas las requests",
    aria: (s: string) => `Hit ratio según el tamaño de la caché, con sesgo de popularidad ${s} y con popularidad uniforme`,
    skewed: (s: string) => `sesgado, s = ${s}`, uniform: "uniforme (s = 0)", axis: "x: tamaño de la caché (claves, log) · y: hit ratio",
    split: "De dónde sale la latencia promedio", fromHits: "hits × caché", fromMisses: "misses × origen",
    formula: (h: string, m: string, c: string, o: string, a: string) => `promedio = hit × caché + miss × origen = ${h} × ${c} + ${m} × ${o} = ${a} · carga del origen = requests × (1 − hit)`,
    insight: (share: string, hit: string, uni: string, l90: string, l99: string) => `Una caché con ${share} de las claves atiende ${hit} de las lecturas; con tráfico uniforme, la misma caché atendería ${uni}. El sesgo es lo que hace funcionar una caché chica. Pasado el 90%, cada punto cuenta: de 90% a 99% de hits, el tráfico al origen baja 10×${l90 === l99 ? "" : ` y la latencia promedio pasa de ${l90} a ${l99}`}.`,
    ttlCost: (h: string) => ` Aquí el TTL te cuesta: sin él, el hit ratio sería ${h}, porque las claves que se leen poco expiran antes de su siguiente lectura.`,
    note: "Simulado en tu navegador: 200.000 requests con semilla a una tasa supuesta de 1.000/s (200 s); las primeras 100.000 calientan la caché y el hit ratio se mide sobre el resto. Desalojo LRU; el TTL corre desde el miss que llenó la clave (cache-aside), los hits no lo extienden y una copia expirada conserva su lugar hasta que se desaloja. La primera request de cada clave siempre es miss, así que con un catálogo enorme ni una caché infinita llega al 100%. Fórmulas de los conceptos de caching y CDN.",
    stream: "Flujo de requests por una caché LRU", app: "App", cache: "Caché (LRU)", mru: "reciente", lru: "antigua",
    originBox: "Origen (base de datos)", next: "siguen", ready: (n: number) => `Una caché caliente con ${n} espacios. Dale play: cada paso es una request por una clave.`,
    hitMsg: (k: number, at: number) => `#${k}: hit en la posición ${at} → se sirve desde la caché y pasa al frente (la más reciente).`,
    missMsg: (k: number, ev: number | null) => `#${k}: miss → se lee del origen y se inserta al frente${ev ? `; #${ev}, la menos reciente, se desaloja` : ""}.`,
    toyHit: "Este flujo", toyHitSub: (h: number, n: number) => `${h} hit${h === 1 ? "" : "s"} de ${n}`, simHit: "Medido arriba", simHitSub: "200.000 requests",
    toyNote: (k: string) => `Flujo de juguete (ilustrativo): 8 espacios y un catálogo de ${k} claves, o sea, la misma fracción de caché y el mismo sesgo que tu configuración; se calienta primero, sin TTL y con duraciones fuera de escala. #r es la r-ésima clave más popular: mira cómo las calientes se quedan. El espacio con borde rojo es la menos reciente, la próxima en desalojarse.`,
  },
};

const VW = 400, VH = 200, PAD = 6, TOP = 20, BOT = 24, POINTS = 21;

export default function CacheSimLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [s, setS] = useState(1);
  const [k, setK] = useState(100_000);
  const [cSize, setC] = useState(5_000);
  const [ttlS, setTtl] = useState<(typeof TTLS)[number]>(0);
  const [cacheMs, setCacheMs] = useState(1);
  const [originMs, setOriginMs] = useState(50);
  const dk = useDeferredValue(k), ds = useDeferredValue(s); // keep sliders smooth while K or s re-simulates
  const c = Math.min(cSize, dk);

  const skewed = useMemo(() => stream(dk, ds), [dk, ds]);
  const uniform = useMemo(() => stream(dk, 0), [dk]);
  const m = useMemo(() => {
    const fill = new Int32Array(dk), ttl = ttlS * RATE, lg = Math.log10(dk);
    const sizes = Array.from({ length: POINTS }, (_, j) => Math.round(10 ** (1 + (j * (lg - 1)) / (POINTS - 1))));
    return {
      sizes, lg,
      curve: sizes.map((x) => hitRatio(skewed.keys, skewed.dist, x, ttl, fill)),
      flat: sizes.map((x) => hitRatio(uniform.keys, uniform.dist, x, ttl, fill)),
      hit: hitRatio(skewed.keys, skewed.dist, c, ttl, fill),
      noTtl: hitRatio(skewed.keys, skewed.dist, c, 0, fill),
      uni: hitRatio(uniform.keys, uniform.dist, c, ttl, fill),
    };
  }, [skewed, uniform, dk, c, ttlS]);

  const miss = 1 - m.hit, avg = m.hit * cacheMs + miss * originMs;
  const at = (h: number) => ms(h * cacheMs + (1 - h) * originMs);
  const x = (v: number) => PAD + ((Math.log10(v) - 1) / (m.lg - 1)) * (VW - 2 * PAD);
  const y = (h: number) => TOP + (1 - h) * (VH - TOP - BOT);
  const pts = (hs: number[]) => m.sizes.map((v, i) => `${x(v).toFixed(1)},${y(hs[i]).toFixed(1)}`).join(" ");
  const ticks = [10, 100, 1e3, 1e4, 1e5, 1e6].filter((v) => v <= dk);
  const toyK = Math.min(TOY_MAX, Math.max(SLOTS, Math.round((SLOTS * dk) / c)));

  return (
    <LabGrid
      controls={
        <>
          <Range label={t.skew} value={s} min={0.6} max={1.4} step={0.1} onChange={setS} format={(v) => v.toFixed(1)} hint={t.skewHint} />
          <LogRange label={t.keys} value={k} min={1000} max={1e6} onChange={setK} />
          <LogRange label={t.size} value={c} min={10} max={dk} onChange={setC} hint={t.sizeHint(pct(c / dk))} />
          <Seg label={t.ttl} value={ttlS} onChange={setTtl} options={TTLS.map((v) => ({ value: v, label: v ? `${v} s` : t.none }))} />
          <Range label={t.cacheMs} value={cacheMs} min={0.1} max={5} step={0.1} onChange={setCacheMs} format={(v) => ms(v)} />
          <LogRange label={t.originMs} value={originMs} min={5} max={1000} onChange={setOriginMs} format={(v) => ms(v)} />
        </>
      }
    >
      <CacheStream k={toyK} skew={ds} hit={m.hit} originMs={originMs} cacheMs={cacheMs} locale={locale} />
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.hit} value={<Ticker value={m.hit} format={pct} />} sub={t.hitSub} tone="good" />
        <Stat label={t.avg} value={<Ticker value={avg} format={ms} />} sub={t.avgSub(ms(originMs))} />
        <Stat label={t.origin} value={<Ticker value={miss} format={pct} />} sub={t.originSub(miss > 0.1 ? (1 / miss).toFixed(1) : fmtNum(1 / Math.max(miss, 1e-5)))} />
        <Stat label={t.top} value={<Ticker value={skewed.top1} format={pct} />} sub={t.topSub} />
      </div>
      <div>
        <Plot w={VW} h={VH} label={t.aria(ds.toFixed(1))} labels={[
          { x: PAD, y: y(1), text: "100%", dy: -9 }, { x: PAD, y: y(0.9), text: "90%", dy: 9 }, { x: PAD, y: y(0.5), text: "50%", dy: -9 },
          ...ticks.map((v): PlotLabel => ({ x: x(v), y: VH - BOT / 2, text: fmtNum(v), anchor: v === 10 ? "start" : v === dk ? "end" : "middle" })),
        ]}>
          {[0, 0.5, 0.9, 1].map((h) => <line key={h} x1={PAD} x2={VW - PAD} y1={y(h)} y2={y(h)} vectorEffect="non-scaling-stroke" style={{ stroke: h === 0.9 ? "var(--border-2)" : "var(--border)", strokeDasharray: h === 0.9 ? "4 4" : undefined }} />)}
          <polyline points={pts(m.flat)} vectorEffect="non-scaling-stroke" style={{ fill: "none", stroke: "var(--muted)", strokeWidth: 2, strokeDasharray: "5 4" }} />
          <polyline points={pts(m.curve)} vectorEffect="non-scaling-stroke" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2.5 }} />
          <line x1={x(c)} x2={x(c)} y1={TOP} y2={VH - BOT} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--text-2)", strokeDasharray: "2 3" }} />
          <circle className={css.mark} cx={x(c)} cy={y(m.uni)} r={4} style={{ fill: "var(--muted)" }} />
          <circle className={css.mark} cx={x(c)} cy={y(m.hit)} r={5.5} style={{ fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }} />
        </Plot>
        <p className="lab-note"><Sw c="var(--accent)" />{t.skewed(ds.toFixed(1))} · <Sw c="var(--muted)" dash />{t.uniform} · {t.axis}</p>
      </div>
      <div className="lab-bars">
        <p className="lab-note">{t.split}</p>
        <Bar label={t.fromHits} value={m.hit * cacheMs} max={avg} text={ms(m.hit * cacheMs)} tone="good" />
        <Bar label={t.fromMisses} value={miss * originMs} max={avg} text={ms(miss * originMs)} tone="bad" />
      </div>
      <p className="lab-formula">{t.formula(m.hit.toFixed(3), miss.toFixed(3), ms(cacheMs), ms(originMs), ms(avg))}</p>
      <Insight>{t.insight(pct(c / dk), pct(m.hit), pct(m.uni), at(0.9), at(0.99)) + (ttlS && m.noTtl - m.hit > 0.02 ? t.ttlCost(pct(m.noTtl)) : "")}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}

/* ------------------------------------------------------------------ the request stream */
// A toy LRU with SLOTS keys, fed a seeded Zipf stream over a catalog scaled to the same cache share
// as the controls (SLOTS ÷ catalog ≈ cache ÷ keys) and the same skew. Precomputed, one snapshot
// per request; the player only moves an index, and CSS does the flying (paths in cqw / px).
const SLOTS = 8, STEPS = 48, WARM = 400, TOY_MAX = 5000, STEP_MS = 1300;
const SPAD = 3, SLOT_W = (100 - 2 * SPAD) / SLOTS; // % of the stage width
const Y = { app: 22, cache: 86, db: 152 }; // px, centers of the three rows
const slotX = (i: number) => SPAD + SLOT_W * (i + 0.5);

type Req = { key: number; hit: boolean; from: number; order: number[]; evicted: number | null; hits: number; n: number };
function toyStream(k: number, s: number): Req[] {
  const cdf = new Float64Array(k);
  let acc = 0;
  for (let i = 0; i < k; i++) cdf[i] = acc += (i + 1) ** -s;
  const rnd = mulberry32(k * 131 + Math.round(s * 100));
  const draw = () => {
    const x = rnd() * acc;
    let lo = 0, hi = k - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < x) lo = m + 1; else hi = m; }
    return lo + 1;
  };
  let order: number[] = [];
  const touch = (key: number) => {
    const from = order.indexOf(key);
    let evicted: number | null = null;
    if (from >= 0) order = [key, ...order.slice(0, from), ...order.slice(from + 1)];
    else { order = [key, ...order]; if (order.length > SLOTS) evicted = order.pop()!; }
    return { from, evicted };
  };
  for (let i = 0; i < WARM; i++) touch(draw());
  const out: Req[] = [{ key: 0, hit: false, from: -1, order, evicted: null, hits: 0, n: 0 }];
  let hits = 0;
  for (let n = 1; n <= STEPS; n++) {
    const key = draw(), { from, evicted } = touch(key);
    if (from >= 0) hits++;
    out.push({ key, hit: from >= 0, from, order, evicted, hits, n });
  }
  return out;
}

function CacheStream({ k, skew, hit, originMs, cacheMs, locale }: { k: number; skew: number; hit: number; originMs: number; cacheMs: number; locale: Locale }) {
  const t = T[locale];
  const reduced = useReducedMotion();
  const run = useMemo(() => toyStream(k, skew), [k, skew]);
  const p = usePlayer(run.length, { baseMs: STEP_MS, key: `${k}:${skew}` });
  const cur = run[p.i];

  // Autoplay while on screen and the tab is visible, until the reader takes the controls.
  const root = useRef<HTMLElement>(null);
  const [auto, setAuto] = useState(true);
  const [seen, setSeen] = useState(false);
  const [tabOn, setTabOn] = useState(true);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    const vis = () => setTabOn(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);
  const { play, pause, playing, done, seek } = p;
  useEffect(() => {
    if (reduced) return;
    const want = auto && seen && tabOn && !done;
    if (want && !playing) play();
    else if (!want && playing) pause();
  }, [auto, seen, tabOn, done, playing, reduced, play, pause]);
  // Reduced motion: no autoplay; open on the last request instead.
  useEffect(() => { if (reduced) seek(run.length - 1); }, [reduced, run, seek]);
  const bar: Player = {
    ...p,
    toggle: () => { setAuto(!p.playing); p.toggle(); },
    step: (d) => { setAuto(false); p.step(d); },
    seek: (i) => { setAuto(false); p.seek(i); },
    reset: () => { setAuto(false); p.reset(); },
  };

  // Timing of one request (ms): a hit is a short round trip, a miss goes on to the origin and back.
  const step = STEP_MS / p.speed, dur = (cur.hit ? 0.55 : 0.95) * step;
  const at = (f: number) => (reduced ? 0 : Math.round(f * dur));
  const delay = cur.n === 0 ? 0 : cur.hit ? at(0.5) : at(0.8);
  const slots = cur.order.map((key, i) => ({ key, i, fresh: !cur.hit && i === 0 && cur.n > 0, gone: false }));
  if (cur.evicted !== null && cur.n > 0) slots.push({ key: cur.evicted, i: SLOTS, fresh: false, gone: true });
  const upcoming = run.slice(p.i + 1, p.i + 4).map((r) => r.key);
  const msg = cur.n === 0 ? t.ready(SLOTS) : cur.hit ? t.hitMsg(cur.key, cur.from + 1) : t.missMsg(cur.key, cur.evicted);
  const v = (o: Record<string, string | number>) => o as CSSProperties;

  return (
    <figure className={css.flow} ref={root}>
      <figcaption className="section-label">{t.stream}</figcaption>
      <PlayerBar p={bar} count={run.length} locale={locale} />
      <div className={css.stage} style={v({ "--sw": SLOT_W, "--pad": SPAD, "--delay": `${delay}ms`, "--dur": `${dur}ms` })} aria-hidden>
        {upcoming.length > 0 && <span className={css.next}>{t.next}: {upcoming.map((key, j) => <b key={`${p.i + j}`}>#{key}</b>)}</span>}
        <span className={css.app} style={v({ top: `${Y.app}px` })}>{t.app}</span>
        <span className={css.rowLabel} style={v({ top: `${Y.cache - 34}px` })}><b>{t.cache} · {ms(cacheMs)}</b><span>{t.mru} → {t.lru}</span></span>
        <span className={css.rail} style={v({ top: `${Y.cache}px` })}>
          {cur.n > 0 && !cur.hit && <i key={p.i} className={css.missFlash} style={v({ animationDelay: `${at(0.22)}ms` })} />}
        </span>
        {slots.map((x) => (
          <span key={x.key} className={`${css.slot}${x.i === SLOTS - 1 ? ` ${css.last}` : ""}${x.fresh ? ` ${css.fresh}` : ""}${x.gone ? ` ${css.gone}` : ""}${cur.n > 0 && x.key === cur.key ? ` ${cur.hit ? css.hit : css.now}` : ""}`}
            style={v({ "--i": x.i, "--age": x.i / (SLOTS - 1), top: `${Y.cache}px` })}>
            #{x.key}
            {cur.n > 0 && cur.hit && x.key === cur.key && <i key={p.i} className={css.hitFlash} style={v({ animationDelay: `${at(0.42)}ms` })} />}
          </span>
        ))}
        <span className={css.db} style={v({ top: `${Y.db}px` })}>
          {t.originBox} · {ms(originMs)}
          {cur.n > 0 && !cur.hit && <i key={p.i} className={css.dbPulse} style={v({ animationDelay: `${at(0.5)}ms` })} />}
        </span>
        {cur.n > 0 && !reduced && (
          <span key={p.i} className={`${css.chip} ${cur.hit ? css.hitPath : css.missPath}`}
            style={v({ "--ax": 50, "--ay": `${Y.app}px`, "--hx": slotX(Math.max(0, cur.from)), "--hy": `${Y.cache}px`, "--dx": 50, "--dy": `${Y.db - 24}px`, "--sx": slotX(0) })}>#{cur.key}</span>
        )}
      </div>
      <p className="mo-msg" aria-live="polite">{msg}</p>
      <div className={css.read}>
        <span className={css.chipStat}><small>{t.toyHit}</small><b>{cur.n ? <Ticker value={cur.hits / cur.n} format={pct} /> : "—"}</b><em>{t.toyHitSub(cur.hits, cur.n)}</em></span>
        <span className={css.chipStat}><small>{t.simHit}</small><b>{pct(hit)}</b><em>{t.simHitSub}</em></span>
      </div>
      <p className="lab-note">{t.toyNote(fmtNum(k))}</p>
    </figure>
  );
}
