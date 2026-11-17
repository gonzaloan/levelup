"use client";
// Bloom filter sizing with the concept's formulas (m = −n·ln p ÷ (ln 2)², k = (m/n)·ln 2), the
// standard false-positive estimate for x inserted items, and a 96-bit toy filter that runs the real
// algorithm, so a false positive is an actual collision you can click, not a drawing.
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import { hashString } from "@/lib/practice/rng";
import { Insight, LabGrid, LogRange, Plot, Range, Seg, Stat, fmtBytes, fmtNum, type PlotLabel } from "./ui";

const BITS = 96, COLS = 16, CELL = 22, TESTS = 1000, SHOWN = 12, EXACT_B = 100;
/** (1 − e^(−k·x/m))^k with x/m written as fill ÷ bits-per-key. */
const fpAt = (k: number, bpk: number, fill: number) => (1 - Math.exp((-k * fill) / bpk)) ** k;
const pc = (x: number) => (x < 1e-6 ? "< 0.0001%" : `${Number((x * 100).toPrecision(x < 0.01 ? 2 : 3))}%`);

function h32(s: string): number { // FNV-1a spreads similar short keys poorly; murmur3's finalizer fixes it
  let x = hashString(s);
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}
/** The key's k bit positions, one seeded hash each. (Double hashing, h1 + i·h2, is the usual
 *  shortcut, but on a 96-bit array its strides cluster and it undershoots the formula by ~2×.) */
const positions = (key: string, k: number) => Array.from({ length: k }, (_, i) => h32(`${key}#${i}`) % BITS);
const allSet = (bits: Uint8Array, pos: number[]) => pos.every((p) => bits[p]);

const T = {
  en: {
    mode: "Size by", byP: "False-positive target", byBits: "Bits per key", n: "Expected items n", p: "Target false-positive rate p",
    bpk: "Bits per key (m/n)", fill: "Items actually inserted", fillHint: (x: string) => `= ${x} items (100% = as planned)`,
    mem: "Memory", memSub: (b: string, e: string) => `${b} bits/key · exact set ≈ ${e}`, k: "Hash functions",
    design: "FP rate as planned", designSub: (n: string) => `at n = ${n} items`, now: "FP rate now", nowSub: (x: string, s: string) => `${x} items · ${s} of bits set`,
    aria: "False-positive rate against fill, on a log scale, with the target and the current fill marked",
    axis: "x: items inserted ÷ n · y: false-positive rate (log)", target: "target", fpLine: "FP rate",
    toy: (k: number, n: number) => `Toy filter: ${BITS} bits, k = ${k}, planned for ${n} keys`, inserted: (n: number) => `Inserted (${n})`, more: (n: number) => `+${n} more`,
    queries: "Never inserted: pick one to see its bits", probe: "Test a key", insert: "Insert it", reset: "Reset inserts",
    absent: (z: number, k: number) => `Definitely not in the set: ${z} of its ${k} bits are 0.`,
    member: (k: number) => `In the set: all ${k} bits are 1 (a Bloom filter has no false negatives).`,
    fp: (k: number) => `False positive: all ${k} bits are 1, set by other keys, though it was never inserted.`,
    measured: (f: number, p: string, pred: string) => `Of 1,000 never-inserted keys, ${f} (${p}) come back "maybe"; the formula predicts ${pred}.`,
    formula: "m = −n·ln p ÷ (ln 2)² · k = (m/n)·ln 2 · FP(x) ≈ (1 − e^(−k·x/m))^k",
    insight: (p: string, b: string, k: number, n: string, m: string, e: string) => `${p} false positives costs ${b} bits and ${k} hash${k > 1 ? "es" : ""} per key: ${n} keys fit in ${m}, against ~${e} for an exact set. A "no" is certain, a "yes" means maybe, so check the real store when a wrong yes matters.`,
    under: (p: string) => ` Size for the peak: at 2× the planned items the same filter answers ${p} of new keys wrong.`,
    over: (f: string, p: string) => ` Overfilled to ${f} of plan, it already answers ${p} of new keys wrong: size for the peak.`,
    note: "Sizing formulas and the 1% → ~9.6 bits/key, 7 hashes figures are from the probabilistic-structures concept; FP(x) is the standard estimate for independent, uniform hashes (Broder & Mitzenmacher, Network Applications of Bloom Filters: A Survey, 2004). k is rounded to a whole number, so the rate at n can differ slightly from the target. ~100 B per key for an exact set is the concept's web-crawler assumption. Toy filter: same bits per key, k seeded hashes (FNV-1a with a murmur3 finalizer); keys are fixed strings, so it repeats.",
  },
  es: {
    mode: "Dimensionar por", byP: "Falsos positivos objetivo", byBits: "Bits por clave", n: "Elementos esperados n", p: "Tasa objetivo de falsos positivos p",
    bpk: "Bits por clave (m/n)", fill: "Elementos insertados de verdad", fillHint: (x: string) => `= ${x} elementos (100% = lo planeado)`,
    mem: "Memoria", memSub: (b: string, e: string) => `${b} bits/clave · set exacto ≈ ${e}`, k: "Funciones de hash",
    design: "Tasa de FP planeada", designSub: (n: string) => `con n = ${n} elementos`, now: "Tasa de FP ahora", nowSub: (x: string, s: string) => `${x} elementos · ${s} de bits en 1`,
    aria: "Tasa de falsos positivos según el llenado, en escala logarítmica, con el objetivo y el llenado actual marcados",
    axis: "x: elementos insertados ÷ n · y: tasa de falsos positivos (log)", target: "objetivo", fpLine: "tasa de FP",
    toy: (k: number, n: number) => `Filtro de juguete: ${BITS} bits, k = ${k}, planeado para ${n} claves`, inserted: (n: number) => `Insertadas (${n})`, more: (n: number) => `+${n} más`,
    queries: "Nunca insertadas: elige una para ver sus bits", probe: "Prueba una clave", insert: "Insertarla", reset: "Quitar inserciones",
    absent: (z: number, k: number) => `Seguro que no está: ${z} de sus ${k} bits están en 0.`,
    member: (k: number) => `Está en el set: sus ${k} bits están en 1 (un filtro de Bloom no tiene falsos negativos).`,
    fp: (k: number) => `Falso positivo: sus ${k} bits están en 1 por otras claves, aunque nunca se insertó.`,
    measured: (f: number, p: string, pred: string) => `De 1.000 claves nunca insertadas, ${f} (${p}) responden "quizás"; la fórmula predice ${pred}.`,
    formula: "m = −n·ln p ÷ (ln 2)² · k = (m/n)·ln 2 · FP(x) ≈ (1 − e^(−k·x/m))^k",
    insight: (p: string, b: string, k: number, n: string, m: string, e: string) => `${p} de falsos positivos cuesta ${b} bits y ${k} hash${k > 1 ? "es" : ""} por clave: ${n} claves caben en ${m}, contra ~${e} de un set exacto. Un "no" es seguro y un "sí" significa quizás, así que confirma en el almacenamiento real cuando un sí equivocado importa.`,
    under: (p: string) => ` Dimensiona para el pico: con 2× los elementos planeados, el mismo filtro responde mal a ${p} de las claves nuevas.`,
    over: (f: string, p: string) => ` Sobrellenado al ${f} de lo planeado, ya responde mal a ${p} de las claves nuevas: dimensiona para el pico.`,
    note: "Las fórmulas de dimensionamiento y las cifras 1% → ~9.6 bits/clave y 7 hashes son del concepto de estructuras probabilísticas; FP(x) es la estimación estándar con hashes independientes y uniformes (Broder y Mitzenmacher, Network Applications of Bloom Filters: A Survey, 2004). k se redondea a un entero, así que la tasa en n puede diferir un poco del objetivo. ~100 B por clave para un set exacto es el supuesto del concepto del web crawler. Filtro de juguete: mismos bits por clave, k hashes con semilla (FNV-1a con el finalizador de murmur3); las claves son strings fijos, así que se repite.",
  },
};

const VW = 400, VH = 170, PAD = 6, TOP = 8, BOT = 24, LO = -6; // y axis: 10⁻⁶ … 10⁰

export default function BloomLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [mode, setMode] = useState<"p" | "bits">("p");
  const [n, setN] = useState(1e9);
  const [p, setP] = useState(0.01);
  const [bpkIn, setBpk] = useState(9.6);
  const [fillPct, setFill] = useState(100);
  const [probe, setProbe] = useState("/new/1");
  const [extra, setExtra] = useState<string[]>([]);

  const bpk = mode === "p" ? -Math.log(p) / Math.LN2 ** 2 : bpkIn;
  const k = Math.max(1, Math.round(bpk * Math.LN2)), f = fillPct / 100;
  const m = bpk * n, fpN = fpAt(k, bpk, 1), fpNow = fpAt(k, bpk, f), fp2 = fpAt(k, bpk, 2);
  const pick = (v: "p" | "bits") => { if (v === "bits") setBpk(Math.round(bpk * 10) / 10); else setP(Math.min(0.1, Math.max(1e-4, Number(fpN.toPrecision(1))))); setMode(v); };

  const toy = useMemo(() => {
    const planned = Math.max(1, Math.round(BITS / bpk)), count = Math.max(1, Math.round(planned * f));
    const keys = [...new Set([...extra, ...Array.from({ length: count }, (_, i) => `/post/${i + 1}`)])];
    const bits = new Uint8Array(BITS);
    for (const key of keys) for (const q of positions(key, k)) bits[q] = 1;
    let fps = 0;
    for (let i = 0; i < TESTS; i++) if (allSet(bits, positions(`/test/${i}`, k))) fps++;
    return { planned, keys, set: new Set(keys), bits, fps, pred: (1 - Math.exp((-k * keys.length) / BITS)) ** k };
  }, [bpk, k, f, extra]);

  const key = probe.trim(), pos = key ? [...new Set(positions(key, k))] : [], zeros = pos.filter((q) => !toy.bits[q]).length;
  const verdict = !key ? "" : toy.set.has(key) ? t.member(pos.length) : zeros ? t.absent(zeros, pos.length) : t.fp(pos.length);
  const tone = !key || toy.set.has(key) ? "var(--text)" : zeros ? "var(--good)" : "var(--bad)";
  const x = (fill: number) => PAD + (fill / 4) * (VW - 2 * PAD);
  const y = (fp: number) => TOP + (Math.max(LO, Math.log10(Math.max(fp, 1e-12))) / LO) * (VH - TOP - BOT);
  const curve = Array.from({ length: 81 }, (_, i) => `${x(i / 20).toFixed(1)},${y(fpAt(k, bpk, i / 20)).toFixed(1)}`).join(" ");

  return (
    <LabGrid
      controls={
        <>
          <Seg label={t.mode} value={mode} onChange={pick} options={[{ value: "p", label: t.byP }, { value: "bits", label: t.byBits }]} />
          <LogRange label={t.n} value={n} min={1e3} max={1e10} onChange={setN} />
          {mode === "p"
            ? <LogRange label={t.p} value={p} min={1e-4} max={0.1} onChange={setP} format={pc} />
            : <Range label={t.bpk} value={bpkIn} min={3} max={24} step={0.1} onChange={setBpk} format={(v) => v.toFixed(1)} />}
          <Range label={t.fill} value={fillPct} min={10} max={400} step={10} onChange={setFill} format={(v) => `${v}%`} hint={t.fillHint(fmtNum(n * f))} />
          <label className="lab-range">
            <span className="lr-top"><span>{t.probe}</span></span>
            <input type="text" value={probe} maxLength={40} spellCheck={false} autoComplete="off" onChange={(e) => setProbe(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--bg-2)", color: "var(--text)", font: "600 15px ui-monospace, Menlo, monospace" }} />
          </label>
          <div className="ls-opts">
            <button type="button" onClick={() => setExtra((xs) => (xs.includes(key) ? xs : [...xs, key]))} disabled={!key || toy.set.has(key)}>{t.insert}</button>
            <button type="button" onClick={() => setExtra([])} disabled={!extra.length}>{t.reset}</button>
          </div>
        </>
      }
    >
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.mem} value={fmtBytes(m / 8)} sub={t.memSub(bpk.toFixed(1), fmtBytes(n * EXACT_B))} />
        <Stat label={t.k} value={k} sub={`k = (m/n)·ln 2 = ${(bpk * Math.LN2).toFixed(2)}`} />
        <Stat label={t.design} value={pc(fpN)} sub={t.designSub(fmtNum(n))} />
        <Stat label={t.now} value={pc(fpNow)} sub={t.nowSub(fmtNum(n * f), `${Math.round((1 - Math.exp((-k * f) / bpk)) * 100)}%`)} tone={f > 1 ? "bad" : "good"} />
      </div>
      <div>
        <Plot w={VW} h={VH} label={t.aria} labels={[
          ...[0, -2, -4].map((e): PlotLabel => ({ x: PAD, y: y(10 ** e), text: pc(10 ** e), dy: 9 })),
          { x: VW - PAD, y: y(fpN), text: `${t.target} ${pc(fpN)}`, anchor: "end", dy: -9 },
          ...[0, 1, 2, 3, 4].map((v): PlotLabel => ({ x: x(v), y: VH - BOT / 2, text: `${v * 100}%`, anchor: v === 0 ? "start" : v === 4 ? "end" : "middle" })),
        ]}>
          {[0, -2, -4, -6].map((e) => <line key={e} x1={PAD} x2={VW - PAD} y1={y(10 ** e)} y2={y(10 ** e)} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--border)" }} />)}
          <line x1={x(1)} x2={x(1)} y1={TOP} y2={VH - BOT} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--border-2)", strokeDasharray: "4 4" }} />
          <line x1={PAD} x2={VW - PAD} y1={y(fpN)} y2={y(fpN)} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--text-2)", strokeDasharray: "2 3" }} />
          <polyline points={curve} vectorEffect="non-scaling-stroke" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2.5 }} />
          <circle cx={x(f)} cy={y(fpNow)} r={5.5} style={{ fill: f > 1 ? "var(--bad)" : "var(--good)", stroke: "var(--surface)", strokeWidth: 2 }} />
        </Plot>
        <p className="lab-note">{t.axis}</p>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <p className="lab-note">{t.toy(k, toy.planned)}</p>
        <svg className="lab-svg" viewBox={`0 0 ${COLS * CELL} ${(BITS / COLS) * CELL}`} aria-hidden="true">
          {Array.from(toy.bits, (b, i) => {
            const hit = pos.includes(i);
            return (
              <rect key={i} x={(i % COLS) * CELL + 2} y={Math.floor(i / COLS) * CELL + 2} width={CELL - 4} height={CELL - 4} rx={4}
                style={{ fill: b ? "var(--accent)" : "var(--bg-2)", stroke: hit ? tone : "var(--border-2)", strokeWidth: hit ? 3 : 1 }} />
            );
          })}
        </svg>
        <p aria-live="polite" style={{ margin: 0, fontSize: 14.5, color: tone }}><code>{key}</code> {verdict}</p>
        <div className="chips">
          <span className="lab-note">{t.inserted(toy.keys.length)}:</span>
          {toy.keys.slice(0, 6).map((s) => <button key={s} type="button" className="chip-btn" onClick={() => setProbe(s)} style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{s}</button>)}
          {toy.keys.length > 6 && <span className="lab-note">{t.more(toy.keys.length - 6)}</span>}
        </div>
        <p className="lab-note">{t.queries}</p>
        <div className="chips">
          {Array.from({ length: SHOWN }, (_, i) => `/new/${i + 1}`).map((s) => {
            const fp = allSet(toy.bits, positions(s, k)) && !toy.set.has(s);
            return (
              <button key={s} type="button" className="chip-btn" aria-pressed={key === s} onClick={() => setProbe(s)}
                style={{ fontFamily: "ui-monospace, Menlo, monospace", color: fp ? "var(--bad)" : undefined, borderColor: fp ? "var(--bad)" : undefined, boxShadow: key === s ? "0 0 0 2px var(--accent)" : undefined }}>{s}</button>
            );
          })}
        </div>
        <p className="lab-note">{t.measured(toy.fps, pc(toy.fps / TESTS), pc(toy.pred))}</p>
      </div>
      <p className="lab-formula">{t.formula}</p>
      <Insight>{t.insight(pc(fpN), bpk.toFixed(1), k, fmtNum(n), fmtBytes(m / 8), fmtBytes(n * EXACT_B)) + (f > 1 ? t.over(`${fillPct}%`, pc(fpNow)) : t.under(pc(fp2)))}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}
