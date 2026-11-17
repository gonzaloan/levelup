"use client";
// Cache hit ratio, measured: 200,000 seeded requests over K keys with Zipf-like popularity, run
// through an LRU cache. One pass computes each request's LRU stack distance (Mattson et al., 1970):
// a request hits a cache of size C exactly when its distance is ≤ C, so the whole curve is a count.
import { useDeferredValue, useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import { mulberry32 } from "@/lib/practice/rng";
import { Bar, Insight, LabGrid, LogRange, Plot, Range, Seg, Stat, fmtNum, fmtTime, type PlotLabel } from "./ui";

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
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.hit} value={pct(m.hit)} sub={t.hitSub} tone="good" />
        <Stat label={t.avg} value={ms(avg)} sub={t.avgSub(ms(originMs))} />
        <Stat label={t.origin} value={pct(miss)} sub={t.originSub(miss > 0.1 ? (1 / miss).toFixed(1) : fmtNum(1 / Math.max(miss, 1e-5)))} />
        <Stat label={t.top} value={pct(skewed.top1)} sub={t.topSub} />
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
          <circle cx={x(c)} cy={y(m.uni)} r={4} style={{ fill: "var(--muted)" }} />
          <circle cx={x(c)} cy={y(m.hit)} r={5.5} style={{ fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }} />
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
