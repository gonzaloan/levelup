"use client";
// Consistent hashing, measured: 10,000 synthetic keys and N×V vnode tokens hashed onto a 32-bit
// ring. Changing N re-maps the same keys on the ring and with hash % N, so the ~1/(N+1) vs
// ~N/(N+1) rule from the concept comes out of real lookups, not out of a drawing.
import { useMemo, useState, type CSSProperties } from "react";
import type { Locale } from "@/lib/types";
import { hashString } from "@/lib/practice/rng";
import { Bar, Insight, LabGrid, LogRange, Range, Stat } from "./ui";

const KEYS = 10_000, SAMPLE = 90, SPACE = 2 ** 32, MAX_N = 12;
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
/** The first token clockwise from x (a binary search), wrapping past the top of the ring. */
function owner({ tok, own }: Ring, x: number): number {
  let lo = 0, hi = tok.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (tok[m] < x) lo = m + 1; else hi = m; }
  return own[lo % tok.length];
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
// A stable hue per node (150° steps visit 12 distinct slots) on the theme's --dc lightness and
// chroma. --dc resolves its hue at :root, so the hue is swapped with relative color syntax; where
// that is unsupported, fill/stroke fall back to the muted color their <g> passes down.
const tint = (k: number, prop: "fill" | "stroke" | "background"): CSSProperties => ({ [prop]: `oklch(from var(--dc) l c ${(200 + k * 150) % 360})` });
function point(x: number, r: number): [number, number] {
  const a = (x / SPACE) * 2 * Math.PI - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}
function arc(a: number, b: number): string {
  const [x1, y1] = point(a, RAD), [x2, y2] = point(b, RAD);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${RAD} ${RAD} 0 ${b - a > SPACE / 2 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
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
    aria: (n: number, v: number) => `Hash ring with ${n} nodes of ${v} virtual nodes each, and a sample of keys colored by owner`,
    formula: "owner(key) = first vnode token clockwise from hash(key) · N → N+1 moves ~1/(N+1) on a ring, ~N/(N+1) with hash % N",
    insight: (a: number, b: number, ring: string, mod: string) => `Going ${a} → ${b} nodes moved ${ring} of the keys on the ring and ${mod} with hash % N: one cache cluster stays warm, the other goes cold.`,
    many: " Virtual nodes buy balance: spread ≈ 1/√V, so 100 vnodes ≈ 10%.",
    few: (hot: string) => ` With so few points per node the arcs are uneven (hottest node ${hot} the average), and how much moves is luck: raise V, spread ≈ 1/√V.`,
    note: "Keys \"key:0…9999\" and tokens \"node-k#i\" are hashed (FNV-1a + murmur3 finalizer) onto a 32-bit ring; every percentage is measured on these keys. Dots: 90 sample keys colored by owner; outlined dots moved on the last change. Rules of thumb from the consistent hashing concept.",
  },
  es: {
    nodes: "Nodos (N)", add: "+ Agregar nodo", remove: "− Quitar nodo",
    vnodes: "Nodos virtuales por nodo (V)", vHint: "Default de Cassandra: 256 antes de la 4.0, 16 desde la 4.0.",
    last: (a: number, b: number) => `Último cambio: ${a} → ${b} nodos, sobre las mismas 10.000 claves.`,
    ring: "Movidas · anillo", mod: "Movidas · hash % N", expected: (p: string) => `esperado ≈ ${p}`,
    hot: "Nodo más cargado ÷ promedio", hotSub: "tope de ejemplo con carga acotada: 1.25×",
    sd: "Desviación de la carga", rule: (p: string) => `regla ≈ 1/√V = ${p}`,
    share: "Porcentaje de claves por nodo",
    aria: (n: number, v: number) => `Anillo de hash con ${n} nodos de ${v} nodos virtuales cada uno y una muestra de claves con el color de su dueño`,
    formula: "dueño(clave) = primer token de vnode en sentido horario desde hash(clave) · N → N+1 mueve ~1/(N+1) en un anillo y ~N/(N+1) con hash % N",
    insight: (a: number, b: number, ring: string, mod: string) => `Pasar de ${a} a ${b} nodos movió ${ring} de las claves en el anillo y ${mod} con hash % N: un clúster de cache sigue caliente y el otro queda frío.`,
    many: " Los nodos virtuales compran balance: dispersión ≈ 1/√V; con 100 vnodes, ≈ 10%.",
    few: (hot: string) => ` Con tan pocos puntos por nodo los arcos quedan desiguales (el nodo más cargado tiene ${hot} el promedio) y cuánto se mueve es suerte: sube V, dispersión ≈ 1/√V.`,
    note: "Las claves \"key:0…9999\" y los tokens \"node-k#i\" pasan por un hash (FNV-1a + finalizador de murmur3) a un anillo de 32 bits; cada porcentaje se mide sobre estas claves. Puntos: 90 claves de muestra con el color de su dueño; las que tienen borde se movieron en el último cambio. Reglas prácticas del concepto de consistent hashing.",
  },
};

export default function ConsistentHashingLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [n, setN] = useState(11);
  const [prev, setPrev] = useState(10);
  const [v, setV] = useState(100);
  const resize = (next: number) => { if (next !== n && next >= 2 && next <= MAX_N) { setPrev(n); setN(next); } };

  const m = useMemo(() => {
    const kh = keyHashes(), now = buildRing(n, v), before = buildRing(prev, v);
    const load = new Array<number>(n).fill(0), sample: { x: number; k: number; moved: boolean }[] = [];
    let moved = 0, modMoved = 0;
    for (let i = 0; i < KEYS; i++) {
      const x = kh[i], k = owner(now, x), mv = k !== owner(before, x);
      load[k]++;
      if (mv) moved++;
      if (x % n !== x % prev) modMoved++;
      if (i < SAMPLE) sample.push({ x, k, moved: mv });
    }
    // Each token owns the arc that ends at it; runs of one node merge. One path per node (its arcs
    // as subpaths) keeps the SVG at N elements even with 12 × 200 vnodes.
    const arcs = Array.from({ length: n }, () => [] as string[]);
    let from = now.tok[now.tok.length - 1] - SPACE;
    now.tok.forEach((b, j) => {
      const k = now.own[j];
      if (now.own[j + 1] !== k) { arcs[k].push(arc(from, b)); from = b; }
    });
    const avg = KEYS / n;
    const sd = Math.sqrt(load.reduce((s, c) => s + (c - avg) ** 2, 0) / n) / avg;
    return { load, avg, sd, hot: Math.max(...load) / avg, moved: moved / KEYS, modMoved: modMoved / KEYS, sample, arcs };
  }, [n, prev, v]);

  const lo = Math.min(n, prev), hi = Math.max(n, prev);
  const expRing = (hi - lo) / hi, expMod = 1 - lo / ((lo * hi) / gcd(lo, hi)); // unmoved under % N: min ÷ lcm
  const maxLoad = Math.max(...m.load);

  return (
    <LabGrid
      controls={
        <>
          <Range label={t.nodes} value={n} min={2} max={MAX_N} onChange={resize} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={() => resize(n + 1)} disabled={n >= MAX_N}>{t.add}</button>
            <button type="button" className="btn" onClick={() => resize(n - 1)} disabled={n <= 2}>{t.remove}</button>
          </div>
          <LogRange label={t.vnodes} value={v} min={1} max={200} onChange={setV} hint={t.vHint} />
        </>
      }
    >
      <p className="lab-note">{t.last(prev, n)}</p>
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.ring} value={pct(m.moved)} sub={t.expected(pct(expRing))} tone={m.moved <= m.modMoved ? "good" : undefined} />
        <Stat label={t.mod} value={pct(m.modMoved)} sub={t.expected(pct(expMod))} tone={m.modMoved > m.moved ? "bad" : undefined} />
        <Stat label={t.hot} value={`${m.hot.toFixed(2)}×`} sub={t.hotSub} tone={m.hot > 1.25 ? "bad" : undefined} />
        <Stat label={t.sd} value={pct(m.sd)} sub={t.rule(pct(1 / Math.sqrt(v)))} />
      </div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", alignItems: "center" }}>
        <svg className="lab-svg" viewBox="0 0 260 260" role="img" aria-label={t.aria(n, v)}>
          <circle cx={C} cy={C} r={RAD} style={{ fill: "none", stroke: "var(--border)", strokeWidth: 16 }} />
          <g style={{ stroke: "var(--muted)", fill: "none", strokeWidth: 16 }}>
            {m.arcs.map((d, k) => <path key={k} d={d.join("")} style={tint(k, "stroke")} />)}
          </g>
          <g style={{ fill: "var(--muted)" }}>
            {m.sample.map((s, i) => {
              const [x, y] = point(s.x, RAD - (i % 2 ? 24 : 34));
              return <circle key={i} cx={x} cy={y} r={s.moved ? 4.5 : 3} style={{ ...tint(s.k, "fill"), stroke: s.moved ? "var(--text)" : "none", strokeWidth: 1.5 }} />;
            })}
          </g>
          <text x={C} y={C - 4} textAnchor="middle">N = {n}</text>
          <text x={C} y={C + 14} textAnchor="middle">V = {v}</text>
        </svg>
        <div className="lab-bars">
          <p className="lab-note">{t.share}</p>
          {m.load.map((c, k) => (
            <Bar key={k} value={c} max={maxLoad} text={pct(c / KEYS)} tone={c > 1.25 * m.avg ? "bad" : undefined}
              label={<><i aria-hidden style={{ ...tint(k, "background"), display: "inline-block", width: 10, height: 10, borderRadius: 3, marginRight: 6 }} />node-{k}</>} />
          ))}
        </div>
      </div>
      <p className="lab-formula">{t.formula}</p>
      <Insight>{t.insight(prev, n, pct(m.moved), pct(m.modMoved)) + (v < 20 ? t.few(`${m.hot.toFixed(1)}×`) : t.many)}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}
