"use client";
// Back-of-the-envelope calculator: users and actions in, QPS, storage and bandwidth out. The
// formulas are the ones the back-of-envelope concept teaches (1 day ≈ 10⁵ s); presets are
// labelled assumptions, not real company numbers.
import { useState } from "react";
import type { Locale } from "@/lib/types";
import { Bar, Insight, LabGrid, LogRange, Range, Seg, Stat, fmtBytes, fmtNum } from "./ui";

const DAY = 86_400;

type Preset = "url" | "chat" | "photos";
const PRESETS: Record<Preset, { dau: number; writes: number; ratio: number; size: number; years: number }> = {
  url: { dau: 100e6, writes: 0.1, ratio: 100, size: 500, years: 5 },
  chat: { dau: 100e6, writes: 40, ratio: 1, size: 200, years: 5 },
  photos: { dau: 50e6, writes: 2, ratio: 50, size: 2e6, years: 10 },
};

const T = {
  en: {
    preset: "Assumed scenario", url: "URL shortener", chat: "Chat", photos: "Photo sharing",
    dau: "Daily active users", writes: "Writes per user per day", ratio: "Reads per write", size: "Bytes per write",
    peak: "Peak ÷ average", years: "Keep for (years)", repl: "Replicas",
    wqps: "Write QPS", rqps: "Read QPS", avg: "average", peakL: "peak",
    perDay: "New data per day", total: "Total storage", withRepl: "with replicas",
    bwIn: "Ingress", bwOut: "Egress", formula: "QPS = users × actions ÷ 86,400 (≈ 10⁵ s per day)",
    note: "Presets are illustrative assumptions, not any company's real numbers.",
    insight: (w: string, r: string) => `Reads (${r}/s) vs writes (${w}/s) decide the design: read-heavy → cache and replicas; write-heavy → partitioning and queues.`,
  },
  es: {
    preset: "Escenario supuesto", url: "Acortador de URLs", chat: "Chat", photos: "Fotos",
    dau: "Usuarios activos por día", writes: "Escrituras por usuario al día", ratio: "Lecturas por escritura", size: "Bytes por escritura",
    peak: "Pico ÷ promedio", years: "Guardar por (años)", repl: "Réplicas",
    wqps: "QPS de escritura", rqps: "QPS de lectura", avg: "promedio", peakL: "pico",
    perDay: "Datos nuevos por día", total: "Almacenamiento total", withRepl: "con réplicas",
    bwIn: "Entrada", bwOut: "Salida", formula: "QPS = usuarios × acciones ÷ 86.400 (≈ 10⁵ s por día)",
    note: "Los escenarios son supuestos ilustrativos, no cifras reales de ninguna empresa.",
    insight: (w: string, r: string) => `Lecturas (${r}/s) vs escrituras (${w}/s) deciden el diseño: muchas lecturas → cache y réplicas; muchas escrituras → particionar y colas.`,
  },
};

export default function CapacityLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [preset, setPreset] = useState<Preset>("url");
  const [s, setS] = useState(PRESETS.url);
  const [peak, setPeak] = useState(3);
  const [repl, setRepl] = useState(3);
  const set = (k: keyof typeof s) => (v: number) => setS((x) => ({ ...x, [k]: v }));
  const pick = (p: Preset) => { setPreset(p); setS(PRESETS[p]); };

  const writesDay = s.dau * s.writes;
  const wqps = writesDay / DAY, rqps = wqps * s.ratio;
  const perDay = writesDay * s.size;
  const total = perDay * 365 * s.years;
  const maxQps = Math.max(rqps, wqps) * peak;

  return (
    <>
      <LabGrid
        controls={
          <>
            <Seg label={t.preset} value={preset} onChange={pick} options={(["url", "chat", "photos"] as const).map((p) => ({ value: p, label: t[p] }))} />
            <LogRange label={t.dau} value={s.dau} min={1e4} max={2e9} onChange={set("dau")} />
            <LogRange label={t.writes} value={s.writes} min={0.01} max={1000} onChange={set("writes")} />
            <LogRange label={t.ratio} value={s.ratio} min={0.1} max={1000} onChange={set("ratio")} />
            <LogRange label={t.size} value={s.size} min={10} max={1e8} onChange={set("size")} format={fmtBytes} />
            <Range label={t.peak} value={peak} min={1} max={10} onChange={setPeak} format={(v) => `${v}×`} />
            <Range label={t.years} value={s.years} min={1} max={20} onChange={set("years")} />
            <Range label={t.repl} value={repl} min={1} max={5} onChange={setRepl} />
          </>
        }
      >
        <div className="lab-stats">
          <Stat label={t.wqps} value={fmtNum(wqps)} sub={`${t.peakL}: ${fmtNum(wqps * peak)}`} />
          <Stat label={t.rqps} value={fmtNum(rqps)} sub={`${t.peakL}: ${fmtNum(rqps * peak)}`} />
          <Stat label={t.perDay} value={fmtBytes(perDay)} />
          <Stat label={t.total} value={fmtBytes(total * repl)} sub={`${fmtBytes(total)} × ${repl} ${t.withRepl}`} />
          <Stat label={t.bwIn} value={`${fmtBytes(wqps * s.size)}/s`} />
          <Stat label={t.bwOut} value={`${fmtBytes(rqps * s.size)}/s`} />
        </div>
        <div className="lab-bars">
          <Bar label={`${t.wqps} · ${t.peakL}`} value={wqps * peak} max={maxQps} />
          <Bar label={`${t.rqps} · ${t.peakL}`} value={rqps * peak} max={maxQps} />
        </div>
        <p className="lab-formula">{t.formula}</p>
        <Insight>{t.insight(fmtNum(wqps), fmtNum(rqps))}</Insight>
        <p className="lab-note">{t.note}</p>
      </LabGrid>
    </>
  );
}
