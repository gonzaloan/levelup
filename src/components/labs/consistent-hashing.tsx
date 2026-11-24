"use client";
// Consistent hashing, measured: 10,000 synthetic keys and N×V vnode tokens hashed onto a 32-bit
// ring. Changing N re-maps the same keys on the ring and with hash % N, so the ~1/(N+1) vs
// ~N/(N+1) rule from the concept comes out of real lookups, not out of a drawing. The two live
// panels replay each change on a sample of the same keys: on the ring the few keys that change
// owner glide to their new vnode; with hash % N most keys jump to another bucket.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Locale } from "@/lib/types";
import { hashString } from "@/lib/practice/rng";
import { Bar, Insight, LabGrid, LogRange, Range, Stat } from "./ui";
import { Ticker, useReducedMotion } from "./motion";
import s from "./consistent-hashing.module.css";

const KEYS = 10_000, SAMPLE = 60, SPACE = 2 ** 32, MAX_N = 12;
const C = 130, RAD = 104; // ring centre and radius, in SVG units

// FNV-1a alone spreads short, similar strings ("node-3#17") poorly; murmur3's finalizer fixes it.
function h32(s: string): number {
  let x = hashString(s);
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}
let keyCache: Uint32Array | null = null;
const keyHashes = () => (keyCache ??= Uint32Array.from({ length: KEYS }, (_, i) => h32(`key:${i}`)));

type Ring = { tok: number[]; own: number[] };
function buildRing(n: number, v: number): Ring {
  const pts: [number, number][] = [];
  for (let k = 0; k < n; k++) for (let i = 0; i < v; i++) pts.push([h32(`node-${k}#${i}`), k]);
  pts.sort((a, b) => a[0] - b[0]);
  return { tok: pts.map((p) => p[0]), own: pts.map((p) => p[1]) };
}
/** Index of the first token clockwise from x (a binary search), wrapping past the top of the ring. */
function slot({ tok }: Ring, x: number): number {
  let lo = 0, hi = tok.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (tok[m] < x) lo = m + 1; else hi = m; }
  return lo % tok.length;
}
const owner = (ring: Ring, x: number) => ring.own[slot(ring, x)];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const hue = (k: number) => `oklch(var(--dc-l) var(--dc-c) ${(200 + k * 150) % 360})`;
// Each node gets its own hue at the theme's lightness and chroma (--dc-l, --dc-c).
const tint = (k: number, prop: "fill" | "stroke" | "background"): CSSProperties => ({ [prop]: hue(k) });
// Rounded: Node and the browser disagree in the last digit of Math.cos, which breaks hydration.
const r1 = (x: number) => Math.round(x * 10) / 10;
function polar(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180 - Math.PI / 2;
  return [r1(C + r * Math.cos(a)), r1(C + r * Math.sin(a))];
}
const deg = (x: number) => (x / SPACE) * 360;
function arc(a: number, b: number): string {
  const [x1, y1] = polar(deg(a), RAD), [x2, y2] = polar(deg(b), RAD);
  return `M${x1} ${y1}A${RAD} ${RAD} 0 ${b - a > SPACE / 2 ? 1 : 0} 1 ${x2} ${y2}`;
}

/* ------------------------------------------------------------------ where the sample keys sit */
type Polar = { a: number; r: number };
type Pt = { x: number; y: number };
/** Ring: each key parks at the vnode token that owns it. Keys of one token pile up in rows of 4
 *  going inward and counter-clockwise (toward where their hashes are), so V = 1 shows big piles. */
function piles(ring: Ring, kh: Uint32Array): Polar[] {
  const sl = Array.from({ length: SAMPLE }, (_, i) => slot(ring, kh[i]));
  const dist = (i: number) => (ring.tok[sl[i]] - kh[i] + SPACE) % SPACE;
  const order = Array.from({ length: SAMPLE }, (_, i) => i).sort((p, q) => sl[p] - sl[q] || dist(p) - dist(q));
  const out: Polar[] = new Array(SAMPLE);
  let rank = 0;
  order.forEach((i, j) => {
    rank = j > 0 && sl[order[j - 1]] === sl[i] ? rank + 1 : 0;
    const r = RAD - 16 - (rank % 4) * 8;
    out[i] = { a: deg(ring.tok[sl[i]]) - (Math.floor(rank / 4) * 8 * 180) / (Math.PI * r), r };
  });
  return out;
}
const MW = 260, MH = 152, FLOOR = 126, PITCH = 9;
/** hash % N: one column per node; keys stack in rows from the floor up, in key order. */
function buckets(n: number, kh: Uint32Array): Pt[] {
  const colW = (MW - 12) / n, per = Math.max(1, Math.floor((colW - 2) / PITCH));
  const rank = new Array<number>(n).fill(0);
  return Array.from({ length: SAMPLE }, (_, i) => {
    const b = kh[i] % n, k = rank[b]++;
    return { x: 6 + b * colW + (colW - per * PITCH) / 2 + ((k % per) + 0.5) * PITCH, y: FLOOR - 6 - Math.floor(k / per) * PITCH };
  });
}

const T = {
  en: {
    nodes: "Nodes (N)", add: "+ Add node", remove: "− Remove node",
    vnodes: "Virtual nodes per node (V)", vHint: "Cassandra's default: 256 before 4.0, 16 since 4.0.",
    last: (a: number, b: number) => `Last change: ${a} → ${b} nodes, on the same 10,000 keys.`,
    ring: "Moved · ring", mod: "Moved · hash % N", expected: (p: string) => `expected ≈ ${p}`,
    hot: "Hottest node ÷ average", hotSub: "bounded-load cap example: 1.25×",
    sd: "Load std dev", rule: (p: string) => `rule ≈ 1/√V = ${p}`,
    share: "Share of the keys per node",
    aria: (n: number, v: number) => `Hash ring with ${n} nodes of ${v} virtual nodes each, and a sample of keys parked at their owners`,
    onRing: "On the ring", onMod: "With hash % N", movedTail: "keys moved",
    modAria: (n: number) => `${SAMPLE} sample keys in ${n} buckets chosen by hash % N, colored by node`,
    formula: "owner(key) = first vnode token clockwise from hash(key) · N → N+1 moves ~1/(N+1) on a ring, ~N/(N+1) with hash % N",
    insight: (a: number, b: number, ring: string, mod: string) => `Going ${a} → ${b} nodes moved ${ring} of the keys on the ring and ${mod} with hash % N: one cache cluster stays warm, the other goes cold.`,
    many: " Virtual nodes buy balance: spread ≈ 1/√V, so 100 vnodes ≈ 10%.",
    few: (hot: string) => ` With so few points per node the arcs are uneven (hottest node ${hot} the average), and how much moves is luck: raise V, spread ≈ 1/√V.`,
    note: "Keys \"key:0…9999\" and tokens \"node-k#i\" are hashed (FNV-1a + murmur3 finalizer) onto a 32-bit ring; every percentage is measured on these keys. Ticks outside the ring: vnode tokens (up to 400 drawn). Dots: 60 sample keys colored by owner, each parked at the token that owns it (the first clockwise from its hash); outlined dots moved on the last change. Rules of thumb from the consistent hashing concept.",
  },
  es: {
    nodes: "Nodos (N)", add: "+ Agregar nodo", remove: "− Quitar nodo",
    vnodes: "Nodos virtuales por nodo (V)", vHint: "Default de Cassandra: 256 antes de la 4.0, 16 desde la 4.0.",
    last: (a: number, b: number) => `Último cambio: ${a} → ${b} nodos, sobre las mismas 10.000 claves.`,
    ring: "Movidas · anillo", mod: "Movidas · hash % N", expected: (p: string) => `esperado ≈ ${p}`,
    hot: "Nodo más cargado ÷ promedio", hotSub: "tope de ejemplo con carga acotada: 1.25×",
    sd: "Desviación de la carga", rule: (p: string) => `regla ≈ 1/√V = ${p}`,
    share: "Porcentaje de claves por nodo",
    aria: (n: number, v: number) => `Anillo de hash con ${n} nodos de ${v} nodos virtuales cada uno y una muestra de claves junto a su dueño`,
    onRing: "En el anillo", onMod: "Con hash % N", movedTail: "claves movidas",
    modAria: (n: number) => `${SAMPLE} claves de muestra en ${n} cubetas elegidas con hash % N, con el color de su nodo`,
    formula: "dueño(clave) = primer token de vnode en sentido horario desde hash(clave) · N → N+1 mueve ~1/(N+1) en un anillo y ~N/(N+1) con hash % N",
    insight: (a: number, b: number, ring: string, mod: string) => `Pasar de ${a} a ${b} nodos movió ${ring} de las claves en el anillo y ${mod} con hash % N: un clúster de cache sigue caliente y el otro queda frío.`,
    many: " Los nodos virtuales compran balance: dispersión ≈ 1/√V; con 100 vnodes, ≈ 10%.",
    few: (hot: string) => ` Con tan pocos puntos por nodo los arcos quedan desiguales (el nodo más cargado tiene ${hot} el promedio) y cuánto se mueve es suerte: sube V, dispersión ≈ 1/√V.`,
    note: "Las claves \"key:0…9999\" y los tokens \"node-k#i\" pasan por un hash (FNV-1a + finalizador de murmur3) a un anillo de 32 bits; cada porcentaje se mide sobre estas claves. Marcas fuera del anillo: tokens de vnodes (hasta 400). Puntos: 60 claves de muestra con el color de su dueño, cada una junto al token que la posee (el primero en sentido horario desde su hash); las que tienen borde se movieron en el último cambio. Reglas prácticas del concepto de consistent hashing.",
  },
};
type Tx = (typeof T)["en"];

export default function ConsistentHashingLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [n, setN] = useState(11);
  const [prev, setPrev] = useState(10);
  const [v, setV] = useState(100);
  const [intro, setIntro] = useState(true); // the opening 10 → 11 plays once the ring is on screen
  const resize = (next: number) => { setIntro(false); if (next !== n && next >= 2 && next <= MAX_N) { setPrev(n); setN(next); } };

  const m = useMemo(() => {
    const kh = keyHashes(), now = buildRing(n, v), before = buildRing(prev, v);
    const load = new Array<number>(n).fill(0);
    let moved = 0, modMoved = 0;
    for (let i = 0; i < KEYS; i++) {
      const x = kh[i], k = owner(now, x);
      load[k]++;
      if (k !== owner(before, x)) moved++;
      if (x % n !== x % prev) modMoved++;
    }
    const avg = KEYS / n;
    const sd = Math.sqrt(load.reduce((s, c) => s + (c - avg) ** 2, 0) / n) / avg;
    return { load, avg, sd, hot: Math.max(...load) / avg, moved: moved / KEYS, modMoved: modMoved / KEYS };
  }, [n, prev, v]);

  const lo = Math.min(n, prev), hi = Math.max(n, prev);
  const expRing = (hi - lo) / hi, expMod = 1 - lo / ((lo * hi) / gcd(lo, hi)); // unmoved under % N: min ÷ lcm
  const maxLoad = Math.max(...m.load);
  const pctTick = (x: number) => <Ticker value={x * 100} format={(y) => `${y.toFixed(1)}%`} ms={700} />;

  return (
    <LabGrid
      controls={
        <>
          <Range label={t.nodes} value={n} min={2} max={MAX_N} onChange={resize} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={() => resize(n + 1)} disabled={n >= MAX_N}>{t.add}</button>
            <button type="button" className="btn" onClick={() => resize(n - 1)} disabled={n <= 2}>{t.remove}</button>
          </div>
          <LogRange label={t.vnodes} value={v} min={1} max={200} onChange={(x) => { setIntro(false); setV(x); }} hint={t.vHint} />
        </>
      }
    >
      <p className="lab-note">{t.last(prev, n)}</p>
      <Live n={n} prev={prev} v={v} intro={intro} setIntro={setIntro} t={t} />
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.ring} value={pctTick(m.moved)} sub={t.expected(pct(expRing))} tone={m.moved <= m.modMoved ? "good" : undefined} />
        <Stat label={t.mod} value={pctTick(m.modMoved)} sub={t.expected(pct(expMod))} tone={m.modMoved > m.moved ? "bad" : undefined} />
        <Stat label={t.hot} value={`${m.hot.toFixed(2)}×`} sub={t.hotSub} tone={m.hot > 1.25 ? "bad" : undefined} />
        <Stat label={t.sd} value={pct(m.sd)} sub={t.rule(pct(1 / Math.sqrt(v)))} />
      </div>
      <div className="lab-bars">
        <p className="lab-note">{t.share}</p>
        {m.load.map((c, k) => (
          <Bar key={k} value={c} max={maxLoad} text={pct(c / KEYS)} tone={c > 1.25 * m.avg ? "bad" : undefined}
            label={<><i aria-hidden style={{ ...tint(k, "background"), display: "inline-block", width: 10, height: 10, borderRadius: 3, marginRight: 6 }} />node-{k}</>} />
        ))}
      </div>
      <p className="lab-formula">{t.formula}</p>
      <Insight>{t.insight(prev, n, pct(m.moved), pct(m.modMoved)) + (v < 20 ? t.few(`${m.hot.toFixed(1)}×`) : t.many)}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}

/* ------------------------------------------------------------------ the live panels */
const DUR = 950; // ms per key glide
/** A spring: fast start, ~8% overshoot, settled at 1. */
const spring = (p: number) => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(7.5 * p));

interface Tween {
  ringFrom: Polar[]; ringTo: Polar[]; modFrom: Pt[]; modTo: Pt[];
  ringK: [number, number][]; modK: [number, number][]; // owner before → after, per key
  movedRing: boolean[]; movedMod: boolean[]; delayRing: number[]; delayMod: number[]; end: number;
}
function at(tw: Tween, el: number) {
  const p = (d: number) => Math.max(0, Math.min(1, (el - d) / DUR));
  return {
    // A moving key lifts off its pile, glides along the ring and settles on its new owner's pile.
    ring: tw.ringTo.map((to, i) => {
      const q = p(tw.delayRing[i]), e = spring(q), f = tw.ringFrom[i];
      return { a: f.a + (to.a - f.a) * e, r: f.r + (to.r - f.r) * e + (tw.movedRing[i] ? 14 * Math.sin(Math.PI * q) : 0) };
    }),
    mod: tw.modTo.map((to, i) => {
      const q = p(tw.delayMod[i]), e = spring(q), f = tw.modFrom[i];
      return { x: f.x + (to.x - f.x) * e, y: f.y + (to.y - f.y) * e - (tw.movedMod[i] ? 26 * Math.sin(Math.PI * q) : 0) };
    }),
  };
}
/** Stagger the keys that change owner, so they land one after another and the counter ticks. */
function stagger(moved: boolean[]): number[] {
  const count = moved.filter(Boolean).length, step = Math.min(90, 760 / Math.max(1, count));
  let k = 0;
  return moved.map((mv) => (mv ? step * k++ : 0));
}

function Live({ n, prev, v, intro, setIntro, t }: { n: number; prev: number; v: number; intro: boolean; setIntro: (on: boolean) => void; t: Tx }) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const shownN = intro ? prev : n;
  const kh = keyHashes();
  const ring = useMemo(() => buildRing(shownN, v), [shownN, v]);
  const target = useMemo(() => ({ n: shownN, v, ring: piles(ring, kh), mod: buckets(shownN, kh), own: Array.from({ length: SAMPLE }, (_, i) => owner(ring, kh[i])) }), [ring, shownN, v, kh]);

  // The opening change plays when the panels scroll into view (at once with reduced motion).
  useEffect(() => {
    const el = box.current;
    if (!intro || !el) return;
    if (reduced) { setIntro(false); return; }
    let h = 0;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !h) h = window.setTimeout(() => setIntro(false), 450); });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(h); };
  }, [intro, reduced, setIntro]);

  const last = useRef(target);
  const [tw, setTw] = useState<Tween>(() => {
    const own = target.own.map((k) => [k, k] as [number, number]);
    const still = new Array<boolean>(SAMPLE).fill(false), zero = new Array<number>(SAMPLE).fill(0);
    return { ringFrom: target.ring, ringTo: target.ring, modFrom: target.mod, modTo: target.mod, ringK: own, modK: own, movedRing: still, movedMod: still, delayRing: zero, delayMod: zero, end: 0 };
  });
  const [el, setEl] = useState(Infinity);
  const elRef = useRef(Infinity), twRef = useRef(tw);

  useEffect(() => {
    const before = last.current;
    if (before === target) return;
    last.current = target;
    const cur = at(twRef.current, elRef.current); // start from where the dots are now, even mid-glide
    const nodeChange = before.n !== target.n, grew = target.n > before.n;
    const movedRing = target.own.map((k, i) => nodeChange && k !== before.own[i]);
    const movedMod = target.mod.map((_, i) => nodeChange && kh[i] % target.n !== kh[i] % before.n);
    // Angles unwrap so a key travels the way the ring sends it: a new node's token sits between a
    // key and its old owner (glide back, counter-clockwise); a removed node's keys walk clockwise.
    const ringTo = target.ring.map((to, i) => {
      const from = cur.ring[i], cw = (((to.a - from.a) % 360) + 360) % 360, short = cw > 180 ? cw - 360 : cw;
      const d = !movedRing[i] || Math.abs(short) < 20 ? short : grew ? cw - 360 : cw;
      return { a: from.a + d, r: to.r };
    });
    const next: Tween = {
      ringFrom: cur.ring, ringTo, modFrom: cur.mod, modTo: target.mod,
      ringK: target.own.map((k, i) => [before.own[i], k]), modK: target.mod.map((_, i) => [kh[i] % before.n, kh[i] % target.n]),
      movedRing, movedMod, delayRing: stagger(movedRing), delayMod: stagger(movedMod), end: 0,
    };
    next.end = Math.max(...next.delayRing, ...next.delayMod) + DUR;
    twRef.current = next;
    setTw(next);
    if (reduced) { elRef.current = Infinity; setEl(Infinity); return; }
    elRef.current = 0;
    setEl(0);
    const t0 = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const e = now - t0;
      elRef.current = e;
      setEl(e);
      if (e < next.end) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, kh]);

  const pos = at(tw, el);
  const landed = (moved: boolean[], delay: number[]) => moved.filter((mv, i) => mv && el >= delay[i] + DUR * 0.55).length;
  const half = (i: number, delay: number[]) => el >= delay[i] + DUR * 0.4;

  // Each token owns the arc that ends at it; runs of one node merge. One path per node (its arcs
  // as subpaths) keeps the SVG at N elements even with 12 × 200 vnodes; the same for the ticks.
  const { arcs, ticks } = useMemo(() => {
    const arcs = Array.from({ length: shownN }, () => [] as string[]), ticks = Array.from({ length: shownN }, () => [] as string[]);
    let from = ring.tok[ring.tok.length - 1] - SPACE;
    ring.tok.forEach((b, j) => {
      const k = ring.own[j];
      if (ring.own[j + 1] !== k) { arcs[k].push(arc(from, b)); from = b; }
      if (ring.tok.length > 400) return; // past ~400 tokens the ticks are a solid band: the arcs say it
      const [x1, y1] = polar(deg(b), RAD + 10), [x2, y2] = polar(deg(b), RAD + 17);
      ticks[k].push(`M${x1} ${y1}L${x2} ${y2}`);
    });
    return { arcs: arcs.map((a) => a.join("")), ticks: ticks.map((a) => a.join("")) };
  }, [ring, shownN]);

  return (
    <div className={s.live} ref={box}>
      <figure className={s.panel}>
        <figcaption><strong>{t.onRing}</strong><span><output className={s.good}><Ticker value={landed(tw.movedRing, tw.delayRing)} ms={200} /> / {SAMPLE}</output> {t.movedTail}</span></figcaption>
        <svg className="lab-svg" viewBox="0 0 260 260" role="img" aria-label={t.aria(shownN, v)}>
          <circle cx={C} cy={C} r={RAD} className={s.track} />
          <g className={s.arcs}>{arcs.map((d, k) => <path key={k} d={d} className={s.fresh} style={tint(k, "stroke")} />)}</g>
          <g className={s.ticks}>{ticks.map((d, k) => <path key={k} d={d} className={s.fresh} style={tint(k, "stroke")} />)}</g>
          {pos.ring.map((p, i) => {
            const [x, y] = polar(p.a, p.r), mv = tw.movedRing[i], k = tw.ringK[i][half(i, tw.delayRing) ? 1 : 0];
            const moving = mv && el > tw.delayRing[i] && el < tw.delayRing[i] + DUR;
            return <circle key={i} cx={x} cy={y} r={mv ? 4.6 : 3.4} className={`${s.key}${mv ? ` ${s.moved}` : ""}${moving ? ` ${s.moving}` : ""}`} style={tint(k, "fill")} />;
          })}
          <text x={C} y={C - 4} textAnchor="middle">N = {shownN}</text>
          <text x={C} y={C + 14} textAnchor="middle">V = {v}</text>
        </svg>
      </figure>
      <figure className={s.panel}>
        <figcaption><strong>{t.onMod}</strong><span><output className={s.bad}><Ticker value={landed(tw.movedMod, tw.delayMod)} ms={200} /> / {SAMPLE}</output> {t.movedTail}</span></figcaption>
        <svg className="lab-svg" viewBox={`0 0 ${MW} ${MH}`} role="img" aria-label={t.modAria(shownN)}>
          {Array.from({ length: shownN }, (_, b) => {
            const colW = (MW - 12) / shownN, x = 6 + b * colW;
            return (
              <g key={b}>
                <rect x={r1(x + 1)} y={8} width={r1(colW - 2)} height={FLOOR - 8} rx={4} className={s.col} />
                <line x1={r1(x + 2)} x2={r1(x + colW - 2)} y1={FLOOR} y2={FLOOR} className={s.floor} style={tint(b, "stroke")} />
                <text x={r1(x + colW / 2)} y={FLOOR + 14} textAnchor="middle" className={s.colNum}>{b}</text>
              </g>
            );
          })}
          {pos.mod.map((p, i) => {
            const mv = tw.movedMod[i], k = tw.modK[i][half(i, tw.delayMod) ? 1 : 0];
            return <circle key={i} cx={r1(p.x)} cy={r1(p.y)} r={3.6} className={`${s.key}${mv ? ` ${s.moved}` : ""}`} style={tint(k, "fill")} />;
          })}
        </svg>
      </figure>
    </div>
  );
}
