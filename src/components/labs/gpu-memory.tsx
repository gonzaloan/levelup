"use client";
// GPU memory sizing: weights are a fixed cost, the KV cache fills what is left and that leftover
// sets concurrency. Model shapes come from the Llama 3 paper (Table 3); GPU sizes and the 0.9
// utilization from the gpu-memory-math concept. Activations and engine overhead are left out on
// purpose, so every result is a ceiling, and the note says so.
import { useState } from "react";
import type { Locale } from "@/lib/types";
import { Insight, LabGrid, LabMore, Range, Seg, Stat, fmtBytes } from "./ui";

const UTIL = 0.9; // vLLM's default gpu_memory_utilization
const GB = 1e9;

type Model = "l8" | "l70";
// Same shape in Llama 3 and 3.1; head_dim = model dim ÷ attention heads (4096÷32 = 8192÷64 = 128).
const MODELS: Record<Model, { name: string; params: number; layers: number; kvHeads: number; headDim: number }> = {
  l8: { name: "Llama 3 8B", params: 8e9, layers: 32, kvHeads: 8, headDim: 128 },
  l70: { name: "Llama 3 70B", params: 70e9, layers: 80, kvHeads: 8, headDim: 128 },
};
type Gpu = "a100" | "h100" | "h200";
const GPUS: Record<Gpu, { name: string; gb: number }> = {
  a100: { name: "A100 80 GB", gb: 80 }, h100: { name: "H100 80 GB", gb: 80 }, h200: { name: "H200 141 GB", gb: 141 },
};
const W_BYTES = { fp16: 2, fp8: 1, int4: 0.5 } as const;
const KV_BYTES = { fp16: 2, fp8: 1 } as const;
const PREC = { fp16: "FP16", fp8: "FP8", int4: "INT4" } as const;
type WP = keyof typeof W_BYTES;
type KP = keyof typeof KV_BYTES;

const ctxLabel = (exp: number) => `${2 ** (exp - 10)}k`;

const T = {
  en: {
    model: "Model", wPrec: "Weight precision", kvPrec: "KV cache precision", ctx: "Context length (tokens)",
    ctxHint: "Llama 3 shipped with 8k; Llama 3.1 (same shape) goes to 128k.", batch: "Concurrent sequences",
    gpu: "GPU", n: "GPU count", weights: "Weights", kv: "KV cache", usable: "Usable memory", verdict: "Verdict",
    fits: "Fits", noFit: "Doesn't fit", maxBatch: "Max batch at this context", perSeq: "per sequence",
    ofUsable: "of usable", short: "short by", hbm: "HBM", usableAt: "usable (90%)",
    layers: "layers", bytes: "bytes", maxB: "max batch",
    noWeights: "The weights alone exceed usable memory: quantize them or add GPUs before you count a single user.",
    insight: (free: string, n: number, ctx: string) => `Weights are a fixed cost; the KV pool is what you sell: ${free} left → ${n} sequences of ${ctx} tokens. Halve the context or store KV in FP8 and that number ≈ doubles.`,
    note: "Shapes: Llama 3 paper, Table 3: 32 / 80 layers, 8 KV heads, head_dim = 4096 ÷ 32 = 8192 ÷ 64 = 128 (arXiv 2407.21783, checked 2026-11-17). Nominal 8B / 70B parameters, decimal GB. Ignores activations, CUDA graphs, fragmentation and quantization scales (a few GB per GPU in practice; the concept's worked example assumes 4 GB), so treat every result as a ceiling. A100 and H100 hold the same 80 GB: they differ in bandwidth (~2 vs ~3.35 TB/s on H100 SXM), not in what fits.",
  },
  es: {
    model: "Modelo", wPrec: "Precisión de los pesos", kvPrec: "Precisión del KV cache", ctx: "Longitud de contexto (tokens)",
    ctxHint: "Llama 3 salió con 8k; Llama 3.1 (misma forma) llega a 128k.", batch: "Secuencias concurrentes",
    gpu: "GPU", n: "Cantidad de GPUs", weights: "Pesos", kv: "KV cache", usable: "Memoria usable", verdict: "Veredicto",
    fits: "Cabe", noFit: "No cabe", maxBatch: "Batch máximo con este contexto", perSeq: "por secuencia",
    ofUsable: "de lo usable", short: "faltan", hbm: "HBM", usableAt: "usable (90%)",
    layers: "capas", bytes: "bytes", maxB: "batch máx.",
    noWeights: "Solo los pesos ya superan la memoria usable: cuantízalos o agrega GPUs antes de contar un solo usuario.",
    insight: (free: string, n: number, ctx: string) => `Los pesos son un costo fijo; el pool de KV es lo que vendes: quedan ${free} → ${n} secuencias de ${ctx} tokens. Reduce el contexto a la mitad o guarda el KV en FP8 y ese número ≈ se duplica.`,
    note: "Formas: paper de Llama 3, tabla 3: 32 / 80 capas, 8 KV heads, head_dim = 4096 ÷ 32 = 8192 ÷ 64 = 128 (arXiv 2407.21783, revisado el 2026-11-17). Parámetros nominales de 8B / 70B, GB decimales. Ignora activaciones, CUDA graphs, fragmentación y las escalas de cuantización (unos pocos GB por GPU en la práctica; el ejemplo del concepto supone 4 GB), así que toma cada resultado como un techo. La A100 y la H100 tienen los mismos 80 GB: difieren en ancho de banda (~2 vs ~3.35 TB/s en la H100 SXM), no en lo que cabe.",
  },
};

export default function GpuMemoryLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [model, setModel] = useState<Model>("l70");
  const [wp, setWp] = useState<WP>("fp8");
  const [kp, setKp] = useState<KP>("fp16");
  const [ctxExp, setCtxExp] = useState(13); // 2^13 = 8k tokens
  const [batchExp, setBatchExp] = useState(4); // 16 sequences
  const [gpu, setGpu] = useState<Gpu>("h100");
  const [n, setN] = useState(2);

  const m = MODELS[model];
  const ctx = 2 ** ctxExp, batch = 2 ** batchExp;
  const kvPerTok = 2 * m.layers * m.kvHeads * m.headDim * KV_BYTES[kp];
  const weights = m.params * W_BYTES[wp];
  const perSeq = kvPerTok * ctx;
  const kv = perSeq * batch;
  const hbm = n * GPUS[gpu].gb * GB;
  const usable = hbm * UTIL;
  const free = usable - weights;
  const fits = weights + kv <= usable;
  const maxBatch = Math.max(0, Math.floor(free / perSeq));

  return (
    <LabGrid
      controls={
        <>
          <Seg label={t.model} value={model} onChange={setModel} options={(["l8", "l70"] as const).map((k) => ({ value: k, label: MODELS[k].name }))} />
          <Seg label={t.wPrec} value={wp} onChange={setWp} options={(["fp16", "fp8", "int4"] as const).map((k) => ({ value: k, label: PREC[k] }))} />
          <Seg label={t.kvPrec} value={kp} onChange={setKp} options={(["fp16", "fp8"] as const).map((k) => ({ value: k, label: PREC[k] }))} />
          <Range label={t.ctx} value={ctxExp} min={10} max={17} onChange={setCtxExp} format={ctxLabel} hint={t.ctxHint} />
          <Range label={t.batch} value={batchExp} min={0} max={8} onChange={setBatchExp} format={(e) => String(2 ** e)} />
          <Seg label={t.gpu} value={gpu} onChange={setGpu} options={(["a100", "h100", "h200"] as const).map((k) => ({ value: k, label: GPUS[k].name }))} />
          <Range label={t.n} value={n} min={1} max={8} onChange={setN} format={(v) => `${v} × ${GPUS[gpu].gb} GB`} />
        </>
      }
    >
      <MemBar weights={weights} kv={kv} usable={usable} hbm={hbm} fits={fits} t={t} />
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.weights} value={fmtBytes(weights)} sub={`${m.params / GB}B × ${W_BYTES[wp]} B (${PREC[wp]})`} />
        <Stat label={t.kv} value={fmtBytes(kv)} sub={`${kvPerTok / 1024} KiB × ${ctxLabel(ctxExp)} × ${batch}`} />
        <Stat label={t.usable} value={fmtBytes(usable)} sub={`${n} × ${GPUS[gpu].gb} GB × ${UTIL}`} />
        <Stat label={t.verdict} value={fits ? t.fits : t.noFit} tone={fits ? "good" : "bad"}
          sub={fits ? `${Math.round(((weights + kv) / usable) * 100)}% ${t.ofUsable}` : `${t.short} ${fmtBytes(weights + kv - usable)}`} />
        <Stat label={t.maxBatch} value={maxBatch} tone={maxBatch === 0 ? "bad" : undefined} sub={`${fmtBytes(perSeq)} ${t.perSeq}`} />
      </div>
      <Insight>{free <= 0 ? t.noWeights : t.insight(fmtBytes(free), maxBatch, ctxLabel(ctxExp))}</Insight>
      <LabMore locale={locale} formula={<>
        KV/token = 2 × {t.layers} × kv_heads × head_dim × {t.bytes} = 2 × {m.layers} × {m.kvHeads} × {m.headDim} × {KV_BYTES[kp]} B = {kvPerTok / 1024} KiB
        <br />
        {t.maxB} = ⌊({t.usable.toLowerCase()} − {t.weights.toLowerCase()}) ÷ (KV/token × {ctxLabel(ctxExp)})⌋ = {maxBatch}
      </>}>
        <p className="lab-note">{t.note}</p>
      </LabMore>
    </LabGrid>
  );
}

/** One stacked bar: weights + KV against the usable line (90%) and the physical HBM. */
function MemBar({ weights, kv, usable, hbm, fits, t }: { weights: number; kv: number; usable: number; hbm: number; fits: boolean; t: (typeof T)["en"] }) {
  const scale = Math.max(hbm, weights + kv);
  const x = (v: number) => (v / scale) * 1000;
  const kvFill = fits ? "var(--good)" : "var(--bad)";
  const sw = (fill: string) => <span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, marginRight: 6, background: fill }} />;
  return (
    <figure style={{ margin: 0, display: "grid", gap: 8 }}>
      <svg className="lab-svg" viewBox="0 0 1000 44" preserveAspectRatio="none" style={{ height: 44 }} role="img"
        aria-label={`${t.weights} ${fmtBytes(weights)} + ${t.kv} ${fmtBytes(kv)} / ${t.usable} ${fmtBytes(usable)}`}>
        <rect x={0} y={4} width={x(hbm)} height={36} style={{ fill: "var(--bg-2)", stroke: "var(--border-2)" }} vectorEffect="non-scaling-stroke" />
        <rect x={x(usable)} y={4} width={x(hbm - usable)} height={36} style={{ fill: "var(--border)" }} />
        <rect x={0} y={9} width={x(weights)} height={26} style={{ fill: "var(--accent)" }} />
        <rect x={x(weights)} y={9} width={x(kv)} height={26} style={{ fill: kvFill }} />
        <line x1={x(usable)} x2={x(usable)} y1={0} y2={44} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" style={{ stroke: "var(--text)", strokeWidth: 2 }} />
        <line x1={x(hbm)} x2={x(hbm)} y1={0} y2={44} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--text-2)", strokeWidth: 2 }} />
      </svg>
      <figcaption style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 13, color: "var(--text-2)" }}>
        <span>{sw("var(--accent)")}{t.weights} {fmtBytes(weights)}</span>
        <span>{sw(kvFill)}{t.kv} {fmtBytes(kv)}</span>
        <span>┆ {t.usableAt} {fmtBytes(usable)}</span>
        <span>│ {t.hbm} {fmtBytes(hbm)}</span>
      </figcaption>
    </figure>
  );
}
