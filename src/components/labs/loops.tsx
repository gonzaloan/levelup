"use client";
// Loops in motion: five classic loops run step by step on a small array. Every counted operation
// becomes one square, laid out so the SHAPE of the work is the complexity: a row (n), a triangle
// (n²/2), a short column (log n), a rectangle of log n rows (n log n). A dot climbs the growth chart
// and lands on its curve. Runs are precomputed as snapshots; the player only moves an index.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Locale } from "@/lib/types";
import { Insight, LabGrid, Plot, Range, Seg, Stat } from "./ui";
import { Cells, CodeView, PlayerBar, Ticker, usePlayer, useReducedMotion, type CellTone, type Pointer } from "./motion";

type Alg = "linear" | "pairs" | "halving" | "twoptr" | "merge";
type Snap = { line: number[]; vals: number[]; tones: CellTone[]; ptr: Pointer[]; ops: number; msg: [string, string] };
interface Run { snaps: Snap[]; rows: number; cols: number; work: [number, number][]; shape: "row" | "tri" | "few" | "rect" }

const C = { i: "var(--accent)", j: "oklch(0.72 0.15 250)", k: "oklch(0.74 0.16 150)" };

/** Small, deterministic arrays (same n → same data), values 1–99. */
function data(n: number, sorted: boolean): number[] {
  let x = 7 + n * 31;
  const a: number[] = [];
  const seen = new Set<number>();
  while (a.length < n) {
    x = (x * 1103515245 + 12345) % 2147483648;
    const v = 1 + (x % 99);
    if (sorted && seen.has(v)) continue;
    seen.add(v);
    a.push(v);
  }
  return sorted ? a.sort((p, q) => p - q) : a;
}
const fill = (n: number, f: (k: number) => CellTone) => Array.from({ length: n }, (_, k) => f(k));

const CODE: Record<Alg, string[]> = {
  linear: ["best = a[0]", "for i in range(n):", "    if a[i] > best:", "        best = a[i]", "return best"],
  pairs: ["count = 0", "for i in range(n):", "    for j in range(i + 1, n):", "        if a[i] + a[j] == target:", "            count += 1", "return count"],
  halving: ["lo, hi = 0, n - 1", "while lo <= hi:", "    mid = (lo + hi) // 2", "    if a[mid] == target: return mid", "    if a[mid] < target: lo = mid + 1", "    else: hi = mid - 1", "return -1"],
  twoptr: ["l, r = 0, n - 1", "while l < r:", "    s = a[l] + a[r]", "    if s == target: return l, r", "    if s < target: l += 1", "    else: r -= 1", "return None"],
  merge: ["width = 1", "while width < n:", "    for lo in range(0, n, 2 * width):", "        merge(a, lo, lo + width, lo + 2 * width)", "    width *= 2"],
};

function trace(alg: Alg, n: number): Run {
  const s: Snap[] = [];
  const work: [number, number][] = [];
  let ops = 0;
  const op = (r: number, c: number) => { ops++; work.push([r, c]); };
  if (alg === "linear") {
    const a = data(n, false);
    let best = a[0];
    s.push({ line: [0], vals: a, tones: fill(n, () => ""), ptr: [], ops, msg: [`best = a[0] = ${best}`, `best = a[0] = ${best}`] });
    for (let i = 0; i < n; i++) {
      op(0, i);
      const bigger = a[i] > best;
      if (bigger) best = a[i];
      s.push({ line: bigger ? [2, 3] : [1, 2], vals: a, tones: fill(n, (k) => (k < i ? "done" : k === i ? "hit" : "")), ptr: [{ name: "i", at: i, color: C.i }], ops,
        msg: [`i = ${i}: a[${i}] = ${a[i]}${bigger ? ` > best → best = ${best}` : ` ≤ best (${best})`}`, `i = ${i}: a[${i}] = ${a[i]}${bigger ? ` > best → best = ${best}` : ` ≤ best (${best})`}`] });
    }
    s.push({ line: [4], vals: a, tones: fill(n, () => "done"), ptr: [], ops, msg: [`Done: ${ops} comparisons for n = ${n}.`, `Listo: ${ops} comparaciones para n = ${n}.`] });
    return { snaps: s, rows: 1, cols: n, work, shape: "row" };
  }
  if (alg === "pairs") {
    const a = data(n, false), target = a[0] + a[n - 1];
    let count = 0;
    s.push({ line: [0], vals: a, tones: fill(n, () => ""), ptr: [], ops, msg: [`target = ${target}. Check every pair i < j.`, `target = ${target}. Revisa cada par i < j.`] });
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      op(i, j - 1);
      const hit = a[i] + a[j] === target;
      if (hit) count++;
      s.push({ line: hit ? [3, 4] : [2, 3], vals: a, tones: fill(n, (k) => (k === i || k === j ? (hit ? "hit" : "on") : k < i ? "done" : "")), ops,
        ptr: [{ name: "i", at: i, color: C.i }, { name: "j", at: j, color: C.j }],
        msg: [`(${i}, ${j}): ${a[i]} + ${a[j]} = ${a[i] + a[j]}${hit ? " ✓" : ""}`, `(${i}, ${j}): ${a[i]} + ${a[j]} = ${a[i] + a[j]}${hit ? " ✓" : ""}`] });
    }
    s.push({ line: [5], vals: a, tones: fill(n, () => "done"), ptr: [], ops, msg: [`Done: ${ops} checks = n(n−1)/2 for n = ${n}; ${count} pair(s) hit the target.`, `Listo: ${ops} revisiones = n(n−1)/2 para n = ${n}; ${count} par(es) suman el target.`] });
    return { snaps: s, rows: n - 1, cols: n - 1, work, shape: "tri" };
  }
  if (alg === "halving") {
    const a = data(n, true);
    const target = a[n - 1] + 1; // absent and larger than all: the worst case, every probe moves lo
    let lo = 0, hi = n - 1;
    s.push({ line: [0], vals: a, tones: fill(n, () => ""), ptr: [{ name: "lo", at: lo, color: C.i }, { name: "hi", at: hi, color: C.j }], ops,
      msg: [`target = ${target} (not in the list: the worst case).`, `target = ${target} (no está en la lista: el peor caso).`] });
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      op(0, ops);
      const inside = (k: number) => k >= lo && k <= hi;
      const goRight = a[mid] < target;
      const left = goRight ? hi - mid : mid - lo;
      s.push({ line: goRight ? [2, 4] : [2, 5], vals: a, tones: fill(n, (k) => (k === mid ? "hit" : inside(k) ? "on" : "dim")), ops,
        ptr: [{ name: "lo", at: lo, color: C.i }, { name: "mid", at: mid, color: C.k }, { name: "hi", at: hi, color: C.j }],
        msg: goRight
          ? [`Probe mid = ${mid}: a[${mid}] = ${a[mid]} < ${target}, drop the left half (${hi - lo + 1} → ${left} left).`, `Prueba mid = ${mid}: a[${mid}] = ${a[mid]} < ${target}, descarta la mitad izquierda (${hi - lo + 1} → quedan ${left}).`]
          : [`Probe mid = ${mid}: a[${mid}] = ${a[mid]} > ${target}, drop the right half (${hi - lo + 1} → ${left} left).`, `Prueba mid = ${mid}: a[${mid}] = ${a[mid]} > ${target}, descarta la mitad derecha (${hi - lo + 1} → quedan ${left}).`] });
      if (goRight) lo = mid + 1; else hi = mid - 1;
    }
    s.push({ line: [6], vals: a, tones: fill(n, () => "dim"), ptr: [], ops, msg: [`Done: ${ops} probes for n = ${n} (⌊log₂ n⌋ + 1).`, `Listo: ${ops} pruebas para n = ${n} (⌊log₂ n⌋ + 1).`] });
    return { snaps: s, rows: 1, cols: n, work, shape: "few" };
  }
  if (alg === "twoptr") {
    const a = data(n, true);
    const target = a[0] + a[n - 1] + 1000; // unreachable: l walks all the way to r, the worst case
    let l = 0, r = n - 1;
    s.push({ line: [0], vals: a, tones: fill(n, () => ""), ptr: [{ name: "l", at: l, color: C.i }, { name: "r", at: r, color: C.j }], ops,
      msg: [`Sorted list, target = ${target}: too big to reach, the worst case.`, `Lista ordenada, target = ${target}: imposible de alcanzar, el peor caso.`] });
    while (l < r) {
      op(0, ops);
      const sum = a[l] + a[r];
      const up = sum < target;
      s.push({ line: up ? [2, 4] : [2, 5], vals: a, tones: fill(n, (k) => (k === l || k === r ? "hit" : k > l && k < r ? "on" : "dim")), ops,
        ptr: [{ name: "l", at: l, color: C.i }, { name: "r", at: r, color: C.j }],
        msg: up
          ? [`${a[l]} + ${a[r]} = ${sum} < target → l moves right. Each step drops one candidate.`, `${a[l]} + ${a[r]} = ${sum} < target → l avanza. Cada paso descarta un candidato.`]
          : [`${a[l]} + ${a[r]} = ${sum} > target → r moves left.`, `${a[l]} + ${a[r]} = ${sum} > target → r retrocede.`] });
      if (up) l++; else r--;
    }
    s.push({ line: [6], vals: a, tones: fill(n, () => "dim"), ptr: [], ops, msg: [`Done: ${ops} steps = n − 1 for n = ${n}.`, `Listo: ${ops} pasos = n − 1 para n = ${n}.`] });
    return { snaps: s, rows: 1, cols: n, work, shape: "row" };
  }
  // merge: bottom-up merge sort; one counted op per element written, n per level, ⌈log₂ n⌉ levels.
  const a = data(n, false);
  s.push({ line: [0], vals: [...a], tones: fill(n, () => ""), ptr: [], ops, msg: [`Runs of width 1 are already sorted.`, `Los tramos de ancho 1 ya están ordenados.`] });
  let level = 0;
  for (let w = 1; w < n; w *= 2, level++) {
    for (let lo = 0; lo < n; lo += 2 * w) {
      const mid = Math.min(lo + w, n), hi = Math.min(lo + 2 * w, n);
      const merged = [...a.slice(lo, mid), ...a.slice(mid, hi)].sort((p, q) => p - q);
      for (let k = lo; k < hi; k++) {
        a[k] = merged[k - lo];
        op(level, k);
        s.push({ line: [3], vals: [...a], tones: fill(n, (x) => (x === k ? "hit" : x >= lo && x < hi ? "on" : x < lo ? "done" : "")), ops,
          ptr: [{ name: "k", at: k, color: C.k }],
          msg: [`Width ${w}: merge [${lo}, ${hi}) → write a[${k}] = ${a[k]}.`, `Ancho ${w}: mezcla [${lo}, ${hi}) → escribe a[${k}] = ${a[k]}.`] });
      }
    }
  }
  s.push({ line: [4], vals: [...a], tones: fill(n, () => "done"), ptr: [], ops, msg: [`Done: ${level} levels × ${n} writes = ${ops} for n = ${n}.`, `Listo: ${level} niveles × ${n} escrituras = ${ops} para n = ${n}.`] });
  return { snaps: s, rows: level, cols: n, work, shape: "rect" };
}

/** Exact count of counted operations for n, the curve each dot lands on. */
const COUNT: Record<Alg, (n: number) => number> = {
  linear: (n) => n, pairs: (n) => (n * (n - 1)) / 2, halving: (n) => Math.floor(Math.log2(n)) + 1, twoptr: (n) => n - 1, merge: (n) => n * Math.ceil(Math.log2(n)),
};
const BIG: Record<Alg, string> = { linear: "O(n)", pairs: "O(n²)", halving: "O(log n)", twoptr: "O(n)", merge: "O(n log n)" };
const N_MIN = 4, N_MAX = 16;

const T = {
  en: {
    alg: "Loop", n: "n (array size)", steps: "Counted steps", end: "At the end", work: "The work, one square per step",
    names: { linear: "One loop", pairs: "Nested loops", halving: "Halving", twoptr: "Two pointers", merge: "Merge levels" } as Record<Alg, string>,
    chart: "Steps vs n: the dot lands on its curve", code: "Code",
    shape: { row: "A row of n squares: linear.", tri: "A triangle, half an n × n square: quadratic.", few: "Only ⌊log₂ n⌋ + 1 squares out of a row of n: each probe halves what is left.", rect: "log₂ n rows of n: n log n." } as Record<Run["shape"], string>,
    insight: (alg: Alg, n: number) => `${BIG[alg]}: at n = ${n} it is ${COUNT[alg](n)} steps. Double n and see: a row doubles, a triangle grows about 4×, the halving column grows by one.`,
    note: "Counted step = one comparison, probe or write. Small arrays so every step is visible; the shapes (and curves) are what scale.",
  },
  es: {
    alg: "Loop", n: "n (tamaño del arreglo)", steps: "Pasos contados", end: "Al final", work: "El trabajo, un cuadrito por paso",
    names: { linear: "Un loop", pairs: "Loops anidados", halving: "Mitades", twoptr: "Dos punteros", merge: "Niveles de merge" } as Record<Alg, string>,
    chart: "Pasos vs n: el punto cae sobre su curva", code: "Código",
    shape: { row: "Una fila de n cuadritos: lineal.", tri: "Un triángulo, medio cuadrado de n × n: cuadrático.", few: "Solo ⌊log₂ n⌋ + 1 cuadritos de una fila de n: cada prueba parte a la mitad lo que queda.", rect: "log₂ n filas de n: n log n." } as Record<Run["shape"], string>,
    insight: (alg: Alg, n: number) => `${BIG[alg]}: con n = ${n} son ${COUNT[alg](n)} pasos. Duplica n y mira: una fila se duplica, un triángulo crece ~4×, la columna de mitades crece en uno.`,
    note: "Paso contado = una comparación, prueba o escritura. Arreglos chicos para ver cada paso; lo que escala son las formas (y las curvas).",
  },
};

export default function LoopsLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const reduced = useReducedMotion();
  const [alg, setAlg] = useState<Alg>("pairs");
  const [n, setN] = useState(8);
  const run = useMemo(() => trace(alg, n), [alg, n]);
  const p = usePlayer(run.snaps.length, { key: `${alg}:${n}`, baseMs: alg === "pairs" || alg === "merge" ? 320 : 650 });
  const snap = run.snaps[p.i];
  // Finished runs leave their dot on the chart, so a few n values trace the curve.
  const [dots, setDots] = useState<Record<string, number[]>>({});
  useEffect(() => {
    if (p.done) setDots((d) => (d[alg]?.includes(n) ? d : { ...d, [alg]: [...(d[alg] ?? []), n] }));
  }, [p.done, alg, n]);
  // Reduced motion: no autoplay anywhere; the lab opens on the finished picture instead.
  const { seek } = p;
  useEffect(() => { if (reduced) seek(run.snaps.length - 1); }, [reduced, run, seek]);

  return (
    <LabGrid
      controls={
        <>
          <Seg label={t.alg} value={alg} onChange={setAlg} options={(Object.keys(CODE) as Alg[]).map((a) => ({ value: a, label: t.names[a] }))} />
          <Range label={t.n} value={n} min={N_MIN} max={N_MAX} onChange={setN} />
          <CodeView lines={CODE[alg]} active={snap.line} label={t.code} />
        </>
      }
    >
      <PlayerBar p={p} count={run.snaps.length} locale={locale} />
      <Cells values={snap.vals} tones={snap.tones} pointers={snap.ptr} label={snap.msg[locale === "es" ? 1 : 0]} />
      <p className="mo-msg" aria-live="polite">{snap.msg[locale === "es" ? 1 : 0]}</p>
      <div className="lab-stats">
        <Stat label={t.steps} value={<Ticker value={snap.ops} />} sub={BIG[alg]} />
        <Stat label={t.end} value={COUNT[alg](n)} sub={`n = ${n}`} tone={p.done ? "good" : undefined} />
      </div>
      <Work run={run} upto={snap.ops} label={t.work} caption={t.shape[run.shape]} />
      <Growth alg={alg} n={n} ops={snap.ops} dots={dots} label={t.chart} />
      <Insight>{t.insight(alg, n)}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}

/** One square per counted step, placed at its (row, col): the drawing's shape is the complexity. */
function Work({ run, upto, label, caption }: { run: Run; upto: number; label: string; caption: string }) {
  const { rows, cols, work } = run;
  return (
    <figure className="mo-work" aria-label={`${label}: ${upto}`}>
      <figcaption className="section-label">{label}</figcaption>
      <div className="mo-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, aspectRatio: `${cols} / ${Math.max(rows, 1)}`, maxWidth: run.shape === "tri" ? 340 : undefined } as CSSProperties}>
        {work.map(([r, c], k) => (
          <span key={`${r}:${c}`} className={k < upto ? (k === upto - 1 ? "on now" : "on") : ""} style={{ gridRow: r + 1, gridColumn: c + 1 }} />
        ))}
      </div>
      <p className="lab-note">{caption}</p>
    </figure>
  );
}

/** The five curves for n = 4…16 on one linear axis; the live dot rises with the step count. */
function Growth({ alg, n, ops, dots, label }: { alg: Alg; n: number; ops: number; dots: Record<string, number[]>; label: string }) {
  const W = 400, H = 220, L = 34, B = 24, R = 10, TOP = 10;
  const yMax = COUNT.pairs(N_MAX);
  const x = (v: number) => L + ((v - N_MIN) / (N_MAX - N_MIN)) * (W - L - R);
  const y = (v: number) => H - B - (v / yMax) * (H - B - TOP);
  const ns = Array.from({ length: N_MAX - N_MIN + 1 }, (_, k) => N_MIN + k);
  const algs = Object.keys(COUNT) as Alg[];
  const colors: Record<Alg, string> = { pairs: "var(--bad)", merge: "var(--accent)", linear: "oklch(0.72 0.15 250)", twoptr: "oklch(0.72 0.15 250)", halving: "var(--good)" };
  return (
    <figure className="mo-growth">
      <figcaption className="section-label">{label}</figcaption>
      <Plot w={W} h={H} label={label} labels={[
        { x: W - R, y: y(COUNT.pairs(N_MAX)), text: "n²/2", anchor: "end", dy: 10, color: colors.pairs },
        { x: W - R, y: y(COUNT.merge(N_MAX)), text: "n log n", anchor: "end", dy: -9, color: colors.merge },
        { x: W - R, y: y(COUNT.linear(N_MAX)), text: "n", anchor: "end", dy: -9, color: colors.linear },
        { x: W - R, y: y(COUNT.halving(N_MAX)), text: "log n", anchor: "end", dy: -9, color: colors.halving },
        { x: L, y: H - 6, text: `n = ${N_MIN}`, anchor: "start" }, { x: W - R, y: H - 6, text: `${N_MAX}`, anchor: "end" },
        { x: L - 4, y: y(yMax), text: String(yMax), anchor: "end" }, { x: L - 4, y: y(0), text: "0", anchor: "end" },
      ]}>
        <line x1={L} y1={y(0)} x2={W - R} y2={y(0)} stroke="var(--border-2)" />
        <line x1={L} y1={TOP} x2={L} y2={y(0)} stroke="var(--border-2)" />
        {algs.filter((a) => a !== "twoptr").map((a) => (
          <polyline key={a} className={`mo-curve${a === alg || (alg === "twoptr" && a === "linear") ? " on" : ""}`} fill="none" stroke={colors[a]}
            points={ns.map((v) => `${x(v)},${y(COUNT[a](v))}`).join(" ")} />
        ))}
        {(dots[alg] ?? []).map((v) => <circle key={v} cx={x(v)} cy={y(COUNT[alg](v))} r={3.5} fill={colors[alg]} opacity={0.75} />)}
        <line className="mo-drop" x1={x(n)} y1={y(0)} x2={x(n)} y2={y(ops)} stroke={colors[alg]} />
        <circle className="mo-dot" cx={x(n)} cy={y(ops)} r={6} fill={colors[alg]} />
      </Plot>
    </figure>
  );
}
