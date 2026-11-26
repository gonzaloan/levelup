// Back-of-the-envelope reps with fresh numbers every time. The recipe is the back-of-envelope
// concept's own: QPS = DAU × actions ÷ 86,400 s, peak = 2–5× average, storage = items × bytes ×
// days × replication, bandwidth = QPS × payload; and its uses: a hot set's cache size, nodes =
// ⌈data ÷ node size⌉ shards × replicas, throughput = bytes ÷ window (× 8 for bits). The scenario
// numbers are toy values. Graded by how many times off you are, because the power of ten is what
// decides a design.
import type { EstimateRep, Rand, Unit } from "./types";
import { int, pick } from "./types";

const DAY = 86_400;
const DAU = [2e6, 5e6, 10e6, 20e6, 50e6, 100e6, 200e6, 500e6, 1e9];
const ACTIONS = [2, 3, 5, 10, 20, 50];
const PAYLOAD = [200, 500, 1_000, 2_000, 5_000, 20_000, 100_000, 500_000];
const PER_SERVER = [500, 1_000, 2_000, 5_000, 10_000];

const COUNT_UNITS: [number, string][] = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "k"]];
const BYTE_UNITS: [number, string][] = [[1e15, "PB"], [1e12, "TB"], [1e9, "GB"], [1e6, "MB"], [1e3, "KB"]];

/** 3 significant figures at most, no trailing zeros: 5787.04 → "5.79k". */
export function human(v: number, unit: Unit): string {
  const units = unit === "bytes" || unit === "bps" ? BYTE_UNITS : COUNT_UNITS;
  for (const [f, s] of units) if (v >= f) return `${sig(v / f)}${unit === "bytes" || unit === "bps" ? " " : ""}${s}${unit === "bps" ? "/s" : ""}`;
  return `${sig(v)}${unit === "bytes" ? " B" : unit === "bps" ? " B/s" : ""}`;
}
const sig = (x: number) => Number(x.toPrecision(3)).toString();
const comma = (x: number) => Math.round(x).toLocaleString("en-US");

/** "5.8k", "5800", "5,800", "6e3", "12 TB", "1.2 GB/s" → a number; null when unreadable. */
export function parseAmount(text: string, unit: Unit): number | null {
  const t = text.trim().replace(/,/g, "").replace(/\s+/g, "").replace(/\/s$/i, "").replace(/(req|rps|qps|servers?|servidores?)$/i, "");
  const m = t.match(/^([0-9]*\.?[0-9]+(?:e[+-]?[0-9]+)?)([a-z]*)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const suf = m[2].toLowerCase();
  if (!suf) return n;
  const bytes = unit === "bytes" || unit === "bps";
  const table: Record<string, number> = bytes
    ? { b: 1, kb: 1e3, k: 1e3, mb: 1e6, m: 1e6, gb: 1e9, g: 1e9, tb: 1e12, t: 1e12, pb: 1e15, p: 1e15 }
    : { k: 1e3, m: 1e6, mm: 1e6, b: 1e9, bn: 1e9, g: 1e9, t: 1e12 };
  return suf in table ? n * table[suf] : null;
}

/** 1 within 1.25×, 0.6 within 2×, 0.2 within 10× (the right order of magnitude), else 0. */
export function gradeEstimate(guess: number, truth: number): number {
  if (!(guess > 0) || !(truth > 0)) return 0;
  const r = Math.max(guess / truth, truth / guess);
  return r <= 1.25 ? 1 : r <= 2 ? 0.6 : r <= 10 ? 0.2 : 0;
}

type Gen = (r: Rand, seed: string) => EstimateRep;

const avgQps: Gen = (r, seed) => {
  const dau = pick(r, DAU), a = pick(r, ACTIONS), q = (dau * a) / DAY;
  return {
    skill: "estimate", seed, unit: "rps", answer: q,
    prompt: {
      en: `${human(dau, "count")} daily active users each make ${a} requests a day. Average requests per second?`,
      es: `${human(dau, "count")} usuarios activos al día hacen ${a} requests diarias cada uno. ¿Requests por segundo en promedio?`,
    },
    steps: [
      { en: `${human(dau, "count")} × ${a} = ${human(dau * a, "count")} requests a day`, es: `${human(dau, "count")} × ${a} = ${human(dau * a, "count")} requests al día` },
      { en: `÷ 86,400 s ≈ ÷ 10⁵ (the trick) → ≈ ${human(q, "count")}/s`, es: `÷ 86,400 s ≈ ÷ 10⁵ (el truco) → ≈ ${human(q, "count")}/s` },
    ],
  };
};

const peakQps: Gen = (r, seed) => {
  const dau = pick(r, DAU), a = pick(r, ACTIONS), k = pick(r, [2, 3, 5]), avg = (dau * a) / DAY, q = avg * k;
  return {
    skill: "estimate", seed, unit: "rps", answer: q,
    prompt: {
      en: `${human(dau, "count")} DAU, ${a} requests each per day, and the peak is ${k}× the average. Peak requests per second?`,
      es: `${human(dau, "count")} DAU, ${a} requests diarias cada uno, y el pico es ${k}× el promedio. ¿Requests por segundo en el pico?`,
    },
    steps: [
      { en: `Average: ${human(dau * a, "count")} ÷ 86,400 ≈ ${human(avg, "count")}/s`, es: `Promedio: ${human(dau * a, "count")} ÷ 86,400 ≈ ${human(avg, "count")}/s` },
      { en: `Peak: × ${k} ≈ ${human(q, "count")}/s`, es: `Pico: × ${k} ≈ ${human(q, "count")}/s` },
    ],
  };
};

const storage: Gen = (r, seed) => {
  const items = pick(r, [1e6, 5e6, 10e6, 50e6, 100e6, 500e6, 1e9]), size = pick(r, PAYLOAD), years = pick(r, [1, 3, 5]), rep = pick(r, [1, 3]);
  const b = items * size * 365 * years * rep;
  return {
    skill: "estimate", seed, unit: "bytes", answer: b,
    prompt: {
      en: `${human(items, "count")} new items a day, ${human(size, "bytes")} each, kept ${years} year${years > 1 ? "s" : ""}${rep > 1 ? `, ${rep} replicas` : ""}. Total storage?`,
      es: `${human(items, "count")} ítems nuevos al día, de ${human(size, "bytes")} cada uno, guardados ${years} año${years > 1 ? "s" : ""}${rep > 1 ? `, ${rep} réplicas` : ""}. ¿Almacenamiento total?`,
    },
    steps: [
      { en: `Per day: ${human(items, "count")} × ${human(size, "bytes")} = ${human(items * size, "bytes")}`, es: `Por día: ${human(items, "count")} × ${human(size, "bytes")} = ${human(items * size, "bytes")}` },
      { en: `× 365 × ${years}${rep > 1 ? ` × ${rep}` : ""} ≈ ${human(b, "bytes")}`, es: `× 365 × ${years}${rep > 1 ? ` × ${rep}` : ""} ≈ ${human(b, "bytes")}` },
    ],
  };
};

const bandwidth: Gen = (r, seed) => {
  const qps = pick(r, [500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000]), size = pick(r, PAYLOAD), bw = qps * size;
  return {
    skill: "estimate", seed, unit: "bps", answer: bw,
    prompt: {
      en: `${comma(qps)} requests per second, each response ${human(size, "bytes")}. Outgoing bandwidth?`,
      es: `${comma(qps)} requests por segundo, cada respuesta de ${human(size, "bytes")}. ¿Ancho de banda de salida?`,
    },
    steps: [{ en: `${comma(qps)}/s × ${human(size, "bytes")} = ${human(bw, "bps")}`, es: `${comma(qps)}/s × ${human(size, "bytes")} = ${human(bw, "bps")}` }],
  };
};

const servers: Gen = (r, seed) => {
  const dau = pick(r, DAU.slice(2)), a = pick(r, ACTIONS), k = pick(r, [2, 3, 5]), per = pick(r, PER_SERVER);
  const peak = ((dau * a) / DAY) * k, n = Math.max(1, Math.ceil(peak / per));
  return {
    skill: "estimate", seed, unit: "servers", answer: n,
    prompt: {
      en: `${human(dau, "count")} DAU × ${a} requests a day, peak ${k}× average, and one server handles ${comma(per)} requests/s. How many servers for the peak?`,
      es: `${human(dau, "count")} DAU × ${a} requests al día, pico ${k}× el promedio, y un servidor atiende ${comma(per)} requests/s. ¿Cuántos servidores para el pico?`,
    },
    steps: [
      { en: `Peak ≈ ${human(dau * a, "count")} ÷ 86,400 × ${k} ≈ ${human(peak, "count")}/s`, es: `Pico ≈ ${human(dau * a, "count")} ÷ 86,400 × ${k} ≈ ${human(peak, "count")}/s` },
      { en: `÷ ${comma(per)} per server → ${n} server${n > 1 ? "s" : ""} (before headroom)`, es: `÷ ${comma(per)} por servidor → ${n} servidor${n > 1 ? "es" : ""} (antes de dejar margen)` },
    ],
  };
};

const hotCache: Gen = (r, seed) => {
  const items = pick(r, [1e6, 10e6, 50e6, 100e6, 500e6, 1e9]), size = pick(r, [200, 500, 1_000, 2_000, 5_000]), pct = pick(r, [1, 5, 10, 20]);
  const hot = (items * pct) / 100, b = hot * size;
  return {
    skill: "estimate", seed, unit: "bytes", answer: b,
    prompt: {
      en: `A catalogue of ${human(items, "count")} items, ${human(size, "bytes")} each. You keep the hottest ${pct}% in an in-memory cache. Cache size?`,
      es: `Un catálogo de ${human(items, "count")} ítems, de ${human(size, "bytes")} cada uno. Guardas el ${pct}% más consultado en una caché en memoria. ¿Tamaño de la caché?`,
    },
    steps: [
      { en: `Hot items: ${human(items, "count")} × ${pct}% = ${human(hot, "count")}`, es: `Ítems calientes: ${human(items, "count")} × ${pct}% = ${human(hot, "count")}` },
      { en: `× ${human(size, "bytes")} = ${human(b, "bytes")} (before per-key overhead)`, es: `× ${human(size, "bytes")} = ${human(b, "bytes")} (sin contar el overhead por clave)` },
    ],
  };
};

const shards: Gen = (r, seed) => {
  const rows = pick(r, [1e9, 2e9, 5e9, 10e9, 20e9, 50e9]), size = pick(r, [500, 1_000, 2_000, 5_000]), cap = pick(r, [1e12, 2e12, 4e12, 8e12]), rep = pick(r, [2, 3]);
  const raw = rows * size, n = Math.max(1, Math.ceil(raw / cap)), nodes = n * rep;
  return {
    skill: "estimate", seed, unit: "servers", answer: nodes,
    prompt: {
      en: `${human(rows, "count")} rows of ${human(size, "bytes")} each. A node stores up to ${human(cap, "bytes")}, and every shard keeps ${rep} replicas on different nodes. How many nodes?`,
      es: `${human(rows, "count")} filas de ${human(size, "bytes")} cada una. Un nodo guarda hasta ${human(cap, "bytes")}, y cada shard tiene ${rep} réplicas en nodos distintos. ¿Cuántos nodos?`,
    },
    steps: [
      { en: `Data: ${human(rows, "count")} × ${human(size, "bytes")} = ${human(raw, "bytes")}`, es: `Datos: ${human(rows, "count")} × ${human(size, "bytes")} = ${human(raw, "bytes")}` },
      { en: `÷ ${human(cap, "bytes")} per node → ${n} shard${n > 1 ? "s" : ""} (round up)`, es: `÷ ${human(cap, "bytes")} por nodo → ${n} shard${n > 1 ? "s" : ""} (redondea hacia arriba)` },
      { en: `× ${rep} replicas → ${nodes} nodes (before headroom)`, es: `× ${rep} réplicas → ${nodes} nodos (antes de dejar margen)` },
    ],
  };
};

const JOBS: ((d: string) => { en: string; es: string })[] = [
  (d) => ({ en: `re-index ${d}`, es: `reindexar ${d}` }),
  (d) => ({ en: `back up ${d}`, es: `respaldar ${d}` }),
  (d) => ({ en: `copy ${d} to another region`, es: `copiar ${d} a otra región` }),
];
const transfer: Gen = (r, seed) => {
  const data = pick(r, [1e12, 5e12, 10e12, 50e12, 100e12, 500e12, 1e15]), hours = pick(r, [1, 2, 4, 8, 12, 24]), job = pick(r, JOBS)(human(data, "bytes"));
  const secs = hours * 3_600, bw = data / secs;
  // Links are sold in bits per second: the same rate, × 8.
  const bits = human(bw * 8, "bps").replace("B/s", "bit/s");
  return {
    skill: "estimate", seed, unit: "bps", answer: bw,
    prompt: {
      en: `You must ${job.en} within ${hours} hour${hours > 1 ? "s" : ""}. Sustained throughput needed?`,
      es: `Tienes que ${job.es} en ${hours} hora${hours > 1 ? "s" : ""}. ¿Qué throughput sostenido necesitas?`,
    },
    steps: [
      { en: `${hours} h × 3,600 s = ${comma(secs)} s`, es: `${hours} h × 3,600 s = ${comma(secs)} s` },
      { en: `${human(data, "bytes")} ÷ ${comma(secs)} s ≈ ${human(bw, "bps")}`, es: `${human(data, "bytes")} ÷ ${comma(secs)} s ≈ ${human(bw, "bps")}` },
      { en: `On the wire: × 8 bits ≈ ${bits}`, es: `En la red: × 8 bits ≈ ${bits}` },
    ],
  };
};

const GENS: Gen[] = [avgQps, peakQps, storage, bandwidth, servers, hotCache, shards, transfer];
/** Which recipe is picked from the seed's first draw, so every recipe shows up over a week. */
export const estimateRep = (r: Rand, seed: string): EstimateRep => GENS[int(r, 0, GENS.length - 1)](r, seed);
