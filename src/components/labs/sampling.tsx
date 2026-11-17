"use client";
// Sampling playground: one toy next-token distribution, reshaped step by step the way decoding
// does it (temperature → softmax → top-k → top-p → min-p → renormalize → sample). The logits are
// made up and labelled so; the ranges and the step order come from the sampling concept and the
// sources dated in the note. Draws use a seeded PRNG, so a given seed always gives the same picks.
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import { mulberry32 } from "@/lib/practice/rng";
import { Insight, LabGrid, Range, Seg, Stat } from "./ui";

// Illustrative logits, sorted from most to least likely, so index 0 is always the argmax and
// every truncation step can walk the tokens in index order.
const TOKENS = [
  { text: "Paris", logit: 5.0 }, { text: "a", logit: 3.2 }, { text: "the", logit: 2.9 }, { text: "located", logit: 2.4 },
  { text: "known", logit: 1.8 }, { text: "Lyon", logit: 0.8 }, { text: "not", logit: 0.4 }, { text: "pizza", logit: -1.5 },
];
const N = TOKENS.length;
const DRAWS = 20;
const ALIVE = Infinity; // cutAt value for a token no step removed
const CUT_BY = ["greedy", "top-k", "top-p", "min-p"];

function softmax(temp: number): number[] {
  if (temp === 0) return TOKENS.map((_, i) => (i === 0 ? 1 : 0));
  const z = TOKENS.map((x) => x.logit / temp), m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

/** dists[s] = the distribution after step s (renormalized); cutAt[i] = the step that removed token i. */
function decode(temp: number, k: number, topP: number, minP: number) {
  const p0 = softmax(temp);
  const cutAt = p0.map((p) => (p === 0 ? 0 : ALIVE));
  const norm = (step: number) => {
    const kept = p0.map((p, i) => (cutAt[i] > step ? p : 0)), s = kept.reduce((a, b) => a + b, 0);
    return kept.map((p) => p / s);
  };
  if (k > 0) for (let i = k; i < N; i++) if (cutAt[i] === ALIVE) cutAt[i] = 1;
  const d1 = norm(1);
  if (topP < 1) { // keep the smallest prefix whose mass reaches top_p
    let cum = 0;
    for (let i = 0; i < N; i++) if (cutAt[i] === ALIVE) { if (cum >= topP) cutAt[i] = 2; else cum += d1[i]; }
  }
  const d2 = norm(2);
  if (minP > 0) { const top = Math.max(...d2); for (let i = 0; i < N; i++) if (cutAt[i] === ALIVE && d2[i] < minP * top) cutAt[i] = 3; }
  const dists = [p0, d1, d2, norm(3)];
  const tail = p0.reduce((a, p, i) => a + (cutAt[i] >= 1 && cutAt[i] <= 3 ? p : 0), 0);
  return { dists, cutAt, tail };
}

const entropy = (d: number[]) => -d.reduce((a, p) => a + (p > 0 ? p * Math.log2(p) : 0), 0);
const pct = (v: number) => `${(v * 100).toFixed(v > 0 && v < 0.1 ? 1 : 0)}%`;

function sample(dist: number[], seed: number): number[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: DRAWS }, () => {
    let u = rnd();
    for (let i = 0; i < N; i++) { u -= dist[i]; if (u < 0) return i; }
    return dist.findIndex((p) => p > 0); // float rounding left a sliver: fall back to the top token
  });
}

const T = {
  en: {
    temp: "Temperature", greedy: "greedy", topK: "Top-k", topP: "Top-p (nucleus)", minP: "Min-p", off: "off",
    tempHint: "OpenAI API: 0–2. 0 = always the top token.", minHint: "Open engines (e.g. transformers); common 0.05–0.1.",
    prompt: "Prompt", view: "Show the distribution after", steps: ["softmax(T)", "top-k", "top-p", "min-p"],
    ghost: "Faint bar: before this step (step 1: the model's own T = 1).",
    entropy: "Entropy", maxH: (h: string) => `max ${h} bits for ${N} tokens`, kept: "Tokens kept", top: "P(“Paris”)",
    tail: "Tail cut", tailSub: "mass removed by truncation", sample: `Sample ${DRAWS} times`, again: `Sample ${DRAWS} again`, seed: "seed",
    formula: "p = softmax(logits ÷ T) → top-k: keep the k best → top-p: smallest set with Σp ≥ top_p → min-p: keep p ≥ min_p × p_max → renormalize → draw",
    greedyInsight: "T = 0 is greedy: the same token on every draw. Deterministic in theory, repetitive on open-ended text.",
    insight: (tail: string) => `Low T → the top token wins almost every draw (repetitive, safe); high T → more variety, and more off-path picks. Truncation cut ${tail} of the mass here: the long tail where tokens like “pizza” live.`,
    note: "Illustrative: 8 hand-picked tokens with made-up logits; a real model scores its whole vocabulary (~128k tokens for Llama 3). Step order as in Hugging Face transformers (checked 2026-11-17). Common settings: top_p 0.9–0.95, min_p 0.05–0.1. OpenAI's API takes temperature 0–2, default 1 (openai-openapi spec, checked 2026-11-17). Anthropic's took 0–1, default 1, but newer Claude models (Opus 4.7+, Sonnet 5) return a 400 for non-default temperature, top_p or top_k (Claude API release notes, checked 2026-11-17).",
  },
  es: {
    temp: "Temperatura", greedy: "greedy", topK: "Top-k", topP: "Top-p (nucleus)", minP: "Min-p", off: "off",
    tempHint: "API de OpenAI: 0–2. 0 = siempre el token principal.", minHint: "Motores abiertos (p. ej., transformers); lo común es 0.05–0.1.",
    prompt: "Prompt (en inglés)", view: "Muestra la distribución después de", steps: ["softmax(T)", "top-k", "top-p", "min-p"],
    ghost: "Barra tenue: antes de este paso (paso 1: la del propio modelo, T = 1).",
    entropy: "Entropía", maxH: (h: string) => `máx. ${h} bits con ${N} tokens`, kept: "Tokens que quedan", top: "P(“Paris”)",
    tail: "Cola cortada", tailSub: "masa que quitó el truncamiento", sample: `Muestrear ${DRAWS} veces`, again: `Muestrear ${DRAWS} otra vez`, seed: "semilla",
    formula: "p = softmax(logits ÷ T) → top-k: quedan los k mejores → top-p: el menor conjunto con Σp ≥ top_p → min-p: quedan p ≥ min_p × p_max → renormalizar → elegir",
    greedyInsight: "T = 0 es greedy: el mismo token en cada muestra. Determinista en teoría, repetitivo en texto abierto.",
    insight: (tail: string) => `T baja → el token principal gana casi siempre (repetitivo, seguro); T alta → más variedad y más elecciones fuera de rumbo. Aquí el truncamiento cortó ${tail} de la masa: la cola larga donde viven tokens como “pizza”.`,
    note: "Ilustrativo: 8 tokens elegidos a mano con logits inventados; un modelo real puntúa todo su vocabulario (~128k tokens en Llama 3). Orden de los pasos como en Hugging Face transformers (revisado el 2026-11-17). Valores comunes: top_p 0.9–0.95, min_p 0.05–0.1. La API de OpenAI acepta temperatura 0–2, default 1 (spec openai-openapi, revisada el 2026-11-17). La de Anthropic aceptaba 0–1, default 1, pero los modelos Claude más nuevos (Opus 4.7+, Sonnet 5) devuelven un 400 si temperature, top_p o top_k no tienen su valor por defecto (release notes de la API de Claude, revisadas el 2026-11-17).",
  },
};

export default function SamplingLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [temp, setTemp] = useState(1);
  const [k, setK] = useState(0);
  const [topP, setTopP] = useState(0.9);
  const [minP, setMinP] = useState(0);
  const [step, setStep] = useState(3);
  const [draw, setDraw] = useState(0); // 0 = not sampled yet; otherwise the seed

  const { dists, cutAt, tail } = useMemo(() => decode(temp, k, topP, minP), [temp, k, topP, minP]);
  const base = useMemo(() => softmax(1), []);
  const final = dists[3];
  const picks = useMemo(() => (draw ? sample(final, draw) : null), [final, draw]);
  const counts = picks ? TOKENS.map((_, i) => picks.filter((p) => p === i).length) : null;
  const dist = dists[step], ghost = step === 0 ? base : dists[step - 1];
  const keptAt = (s: number) => cutAt.filter((c) => c > s).length;
  const off = (v: string) => `${v} (${t.off})`;
  const bar = (v: number) => ({ position: "absolute", left: 0, top: 0, bottom: 0, width: `${v * 100}%` }) as const;

  return (
    <LabGrid
      controls={
        <>
          <Range label={t.temp} value={temp} min={0} max={2} step={0.05} onChange={setTemp} format={(v) => (v === 0 ? `0 (${t.greedy})` : v.toFixed(2))} hint={t.tempHint} />
          <Range label={t.topK} value={k} min={0} max={N} onChange={setK} format={(v) => (v === 0 ? t.off : String(v))} />
          <Range label={t.topP} value={topP} min={0.1} max={1} step={0.05} onChange={setTopP} format={(v) => (v >= 1 ? off("1") : v.toFixed(2))} />
          <Range label={t.minP} value={minP} min={0} max={0.3} step={0.01} onChange={setMinP} format={(v) => (v === 0 ? t.off : v.toFixed(2))} hint={t.minHint} />
        </>
      }
    >
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.entropy} value={`${entropy(final).toFixed(2)} bits`} sub={t.maxH(Math.log2(N).toFixed(0))} />
        <Stat label={t.kept} value={`${keptAt(3)} / ${N}`} />
        <Stat label={t.top} value={pct(final[0])} />
        <Stat label={t.tail} value={pct(tail)} sub={t.tailSub} tone={tail > 0 ? "warn" : undefined} />
      </div>
      <p className="lab-note" style={{ font: "14px ui-monospace, Menlo, monospace", color: "var(--text)" }}>{t.prompt}: “The capital of France is …”</p>
      <Seg label={t.view} value={step} onChange={setStep} options={t.steps.map((s, i) => ({ value: i, label: `${i + 1} · ${s} (${keptAt(i)})` }))} />
      <div className="lab-bars">
        {TOKENS.map((tok, i) => {
          const gone = cutAt[i] <= step, now = cutAt[i] === step;
          return (
            <div key={tok.text} className={`lab-bar${now ? " bad" : ""}`}>
              <span className="lb-label" style={gone ? { textDecoration: "line-through", color: "var(--muted)" } : undefined}>
                “{tok.text}” <small style={{ color: "var(--muted)" }}>{tok.logit.toFixed(1)}</small>
              </span>
              <span className="lb-track" style={{ position: "relative" }}>
                <span style={{ ...bar(ghost[i]), opacity: 0.3 }} />
                <span style={bar(dist[i])} />
              </span>
              <span className="lb-text" style={gone ? { color: now ? "var(--bad)" : "var(--muted)" } : undefined}>
                {gone ? `✕ ${CUT_BY[cutAt[i]]}` : pct(dist[i])}
              </span>
            </div>
          );
        })}
      </div>
      <p className="lab-note">{t.ghost}</p>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button type="button" className="btn" onClick={() => setDraw((d) => d + 1)}>{draw ? t.again : t.sample}</button>
          {picks && <span className="lab-note">{t.seed} {draw}</span>}
        </div>
        {picks && counts && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {picks.map((p, j) => (
                <span key={j} style={{ padding: "2px 7px", borderRadius: 7, font: "12.5px ui-monospace, Menlo, monospace", background: "var(--bg-2)", border: `1px solid ${p === 0 ? "var(--border-2)" : "var(--accent)"}` }}>{TOKENS[p].text}</span>
              ))}
            </div>
            <p className="lab-note" aria-live="polite">
              {TOKENS.map((tok, i) => ({ tok, c: counts[i] })).filter((x) => x.c > 0).sort((a, b) => b.c - a.c).map((x) => `${x.tok.text} ×${x.c}`).join(" · ")}
            </p>
          </>
        )}
      </div>
      <p className="lab-formula">{t.formula}</p>
      <Insight>{temp === 0 ? t.greedyInsight : t.insight(pct(tail))}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}
