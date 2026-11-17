"use client";
// Latency ladder: the classic "numbers every programmer should know" on one log axis, with a
// "human scale" switch (1 ns → 1 s) and a baseline you pick to read every row as "N× slower".
// Values are Colin Scott's interactive model at 2020 (the last year on its slider); see the note.
import { useState, type CSSProperties } from "react";
import type { Locale } from "@/lib/types";
import { Insight, LabGrid, Seg, Stat, fmtDuration, fmtNum, fmtTime } from "./ui";

type Tier = "cpu" | "mem" | "disk" | "net";
type Op = { id: string; ns: number; tier: Tier; en: string; es: string };
// Model outputs rounded to 2 significant figures (L1 = 3 cycles at 3 GHz, and so on).
const OPS: Op[] = [
  { id: "l1", ns: 1, tier: "cpu", en: "L1 cache reference", es: "Lectura de caché L1" },
  { id: "branch", ns: 3.3, tier: "cpu", en: "Branch mispredict", es: "Fallo de predicción de branch" },
  { id: "l2", ns: 4.3, tier: "cpu", en: "L2 cache reference", es: "Lectura de caché L2" },
  { id: "mutex", ns: 17, tier: "cpu", en: "Mutex lock/unlock", es: "Lock/unlock de un mutex" },
  { id: "mem", ns: 100, tier: "mem", en: "Main memory reference", es: "Lectura de memoria principal" },
  { id: "zip", ns: 2_000, tier: "mem", en: "Compress 1 KB (Snappy)", es: "Comprimir 1 KB (Snappy)" },
  { id: "mbMem", ns: 3_000, tier: "mem", en: "Read 1 MB sequentially from memory", es: "Leer 1 MB secuencial de memoria" },
  { id: "ssd", ns: 16_000, tier: "disk", en: "SSD random read", es: "Lectura aleatoria en SSD" },
  { id: "mbSsd", ns: 49_000, tier: "disk", en: "Read 1 MB sequentially from SSD", es: "Leer 1 MB secuencial de SSD" },
  { id: "dc", ns: 500_000, tier: "net", en: "Round trip in the same datacenter", es: "Round trip en el mismo datacenter" },
  { id: "mbDisk", ns: 820_000, tier: "disk", en: "Read 1 MB sequentially from disk", es: "Leer 1 MB secuencial de disco" },
  { id: "seek", ns: 2_500_000, tier: "disk", en: "Disk seek", es: "Seek de disco" },
  { id: "wan", ns: 150_000_000, tier: "net", en: "Round trip California ↔ Netherlands", es: "Round trip California ↔ Países Bajos" },
];
const BY = Object.fromEntries(OPS.map((o) => [o.id, o])) as Record<string, Op>;
const TIER: Record<Tier, string> = { cpu: "var(--good)", mem: "var(--accent)", disk: "var(--text-2)", net: "var(--bad)" };

// Axis: 0.1 ns → 1 s, ten decades, so each decade is 10% of the track.
const pct = (ns: number) => Math.max(1, Math.min(100, (Math.log10(ns) + 1) * 10));
const GRID = "repeating-linear-gradient(to right, var(--border) 0 calc(10% - 1px), var(--border-2) calc(10% - 1px) 10%)";
const TICKS = [1, 1e3, 1e6, 1e9];
const mono: CSSProperties = { font: "650 13px ui-monospace, Menlo, monospace", color: "var(--text)", whiteSpace: "nowrap" };

const T = {
  en: {
    scale: "Scale", real: "Real time", human: "If 1 ns were 1 s", base: "Compare against", tap: "Or tap any row.",
    tiers: { cpu: "CPU", mem: "Memory", disk: "Storage", net: "Network" } as Record<Tier, string>,
    memL1: "Memory ÷ L1", ssdMem: "SSD read ÷ memory", wanDc: "Cross-continent ÷ same DC",
    caption: (b: string, t: string) => `Log scale, one gridline per 10×. Ratios against: ${b} (${t}).`,
    formula: "latency ≈ Σ hops on the critical path · memory ≈ 100× L1 · SSD ≈ 100–1,000× memory · cross-continent ≈ 300× same-DC round trip",
    insight: "Memory is ~100× L1, and leaving the machine is another world: one California ↔ Netherlands round trip costs as much as ~150 million L1 reads. Design around round trips: cache near the reader (a CDN), batch calls, keep the critical path inside one datacenter.",
    note: "Values: Colin Scott's interactive \"Latency Numbers Every Programmer Should Know\" model at year 2020, the last on its slider (checked Nov 2026). It extrapolates hardware trends from Norvig's ~2002 table, so read orders of magnitude, not benchmarks. The disk rows are the most extrapolated: the classic tables list ~8–10 ms per seek (Norvig, Jeff Dean) and ~20 ms to read 1 MB from disk (Norvig).",
  },
  es: {
    scale: "Escala", real: "Tiempo real", human: "Si 1 ns fuera 1 s", base: "Comparar contra", tap: "O toca cualquier fila.",
    tiers: { cpu: "CPU", mem: "Memoria", disk: "Almacenamiento", net: "Red" } as Record<Tier, string>,
    memL1: "Memoria ÷ L1", ssdMem: "Lectura SSD ÷ memoria", wanDc: "Entre continentes ÷ mismo DC",
    caption: (b: string, t: string) => `Escala logarítmica, una línea por cada 10×. Comparado contra: ${b} (${t}).`,
    formula: "latencia ≈ Σ saltos en el camino crítico · memoria ≈ 100× L1 · SSD ≈ 100–1,000× memoria · entre continentes ≈ 300× un round trip en el mismo DC",
    insight: "La memoria es ~100× más lenta que L1, y salir de la máquina es otro mundo: un round trip California ↔ Países Bajos cuesta lo mismo que ~150 millones de lecturas de L1. Diseña alrededor de los round trips: cachea cerca del lector (un CDN), agrupa llamadas y mantén el camino crítico dentro de un datacenter.",
    note: "Valores: el modelo interactivo \"Latency Numbers Every Programmer Should Know\" de Colin Scott en el año 2020, el último de su slider (revisado en nov. 2026). Extrapola tendencias de hardware desde la tabla de Norvig de ~2002, así que lee órdenes de magnitud, no benchmarks. Las filas de disco son las más extrapoladas: las tablas clásicas dan ~8–10 ms por seek (Norvig, Jeff Dean) y ~20 ms para leer 1 MB de disco (Norvig).",
  },
};

export default function LatencyLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [scale, setScale] = useState<"real" | "human">("real");
  const [base, setBase] = useState("l1");
  // On the human scale 1 ns reads as 1 s, so the nanosecond count becomes a count of seconds.
  const show = (ns: number) => (scale === "human" ? fmtDuration(ns, locale) : fmtTime(ns));
  const b = BY[base];
  const ratio = (ns: number) => {
    const r = ns / b.ns;
    return r >= 1 ? `×${fmtNum(Math.round(r * 10) / 10)}` : `÷${fmtNum(Math.round(10 / r) / 10)}`;
  };
  const vs = (a: string, c: string) => `${show(BY[a].ns)} vs ${show(BY[c].ns)}`;
  const times = (a: string, c: string) => `~${fmtNum(BY[a].ns / BY[c].ns)}×`;

  return (
    <LabGrid
      controls={
        <>
          <Seg label={t.scale} value={scale} onChange={setScale} options={[{ value: "real", label: t.real }, { value: "human", label: t.human }]} />
          <label className="lab-range">
            <span className="lr-top"><span>{t.base}</span></span>
            <select value={base} onChange={(e) => setBase(e.target.value)} style={{ padding: "7px 9px", borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--bg-2)", color: "var(--text)", font: "inherit", fontSize: 14 }}>
              {OPS.map((o) => <option key={o.id} value={o.id}>{o[locale]}</option>)}
            </select>
            <small>{t.tap}</small>
          </label>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 13, color: "var(--text-2)" }}>
            {(Object.keys(TIER) as Tier[]).map((k) => (
              <li key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span aria-hidden style={{ width: 12, height: 8, borderRadius: 99, background: TIER[k] }} />{t.tiers[k]}
              </li>
            ))}
          </ul>
        </>
      }
    >
      <div className="lab-stats">
        <Stat label={t.memL1} value={times("mem", "l1")} sub={vs("mem", "l1")} />
        <Stat label={t.ssdMem} value={times("ssd", "mem")} sub={vs("ssd", "mem")} />
        <Stat label={t.wanDc} value={times("wan", "dc")} sub={vs("wan", "dc")} />
      </div>
      <p className="lab-note" aria-live="polite">{t.caption(b[locale], show(b.ns))}</p>
      <div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
          {OPS.map((o) => {
            const on = o.id === base;
            return (
              <li key={o.id}>
                <button type="button" aria-pressed={on} onClick={() => setBase(o.id)}
                  style={{ display: "grid", gap: 5, width: "100%", padding: "6px 8px", borderRadius: 10, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit", border: `1px solid ${on ? "var(--accent)" : "transparent"}`, background: on ? "var(--bg-2)" : "transparent" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5 }}>
                    <span style={{ color: "var(--text-2)" }}>{o[locale]}</span>
                    <span style={mono}>~{show(o.ns)} <span style={{ color: on ? "var(--accent)" : "var(--muted)" }}>{on ? "=" : ratio(o.ns)}</span></span>
                  </span>
                  <span className="lb-track" style={{ display: "block", background: GRID }}>
                    <span style={{ width: `${pct(o.ns)}%`, background: TIER[o.tier] }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div aria-hidden style={{ position: "relative", height: 18, margin: "4px 9px 0", fontSize: 11.5, color: "var(--muted)" }}>
          {TICKS.map((ns, i) => (
            <span key={ns} style={{ position: "absolute", left: `${pct(ns)}%`, transform: i === TICKS.length - 1 ? "translateX(-100%)" : "translateX(-50%)", whiteSpace: "nowrap" }}>{show(ns)}</span>
          ))}
        </div>
      </div>
      <p className="lab-formula">{t.formula}</p>
      <Insight>{t.insight}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}
