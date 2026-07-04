"use client";
// Authored SVG figures in the observatory/blueprint language. Keyed by id so
// content-as-data can reference a diagram from a topic. These break up the
// wall-of-prose in module Read views and give each module a visual anchor.
//
// Some are EXPLORABLE (direct-manipulation): a single React state value drives
// the SVG geometry via a pure function (the Ciechanowski/Wattenberger mold).
// They always render a meaningful state and degrade to it under no-JS.
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";

export function Diagram({ id, locale }: { id: string; locale: Locale }) {
  const D = DIAGRAMS[id];
  if (!D) return null;
  return (
    <figure className="card blueprint" style={{ padding: "var(--s-6)", margin: "var(--s-2) 0" }}>
      <D locale={locale} />
    </figure>
  );
}

type Fig = ({ locale }: { locale: Locale }) => React.ReactElement;

// The consistency lattice: recency (vertical) vs isolation (horizontal) as two
// independent axes, with strict serializability as the top-right conjunction.
const ConsistencyLattice: Fig = ({ locale }) => (
  <svg viewBox="0 0 520 315" width="100%" role="img"
    aria-label={t({ en: "Consistency lattice: recency and isolation are separate axes", es: "Retículo de consistencia: recencia y aislamiento son ejes separados" }, locale)}>
    {/* axes */}
    <line x1="70" y1="250" x2="470" y2="250" stroke="var(--hairline-2)" strokeWidth="1" />
    <line x1="70" y1="250" x2="70" y2="30" stroke="var(--hairline-2)" strokeWidth="1" />
    <text x="270" y="300" textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--text-3)" letterSpacing="0.08em">
      {t({ en: "TRANSACTION ISOLATION →", es: "AISLAMIENTO DE TRANSACCIONES →" }, locale)}
    </text>
    <text x="30" y="140" textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--text-3)" letterSpacing="0.08em" transform="rotate(-90 30 140)">
      {t({ en: "← SINGLE-OBJECT RECENCY", es: "← RECENCIA DE UN OBJETO" }, locale)}
    </text>
    {/* recency rungs (vertical) — labels sit left of the axis to avoid the
        horizontal rung labels near the origin. */}
    {[["Eventual", 210], ["Causal", 170], ["Sequential", 130], ["Linearizable", 80]].map(([lbl, y]) => (
      <g key={lbl as string}>
        <circle cx="70" cy={y as number} r="3" fill="var(--gen)" />
        <text x="82" y={(y as number) + 4} fontSize="11" fill="var(--text-2)" fontFamily="var(--font-body)">{lbl}</text>
      </g>
    ))}
    {/* isolation rungs (horizontal) — labels below the axis so they never
        collide with the recency labels. */}
    {[["Read committed", 155], ["Snapshot", 275], ["Serializable", 385]].map(([lbl, x]) => (
      <g key={lbl as string}>
        <circle cx={x as number} cy="250" r="3" fill="var(--ai-signal)" />
        <text x={x as number} y="268" fontSize="11" fill="var(--text-2)" fontFamily="var(--font-body)" textAnchor="middle">{lbl}</text>
      </g>
    ))}
    {/* strict serializability = the conjunction (top-right star) */}
    <g transform="translate(400,80)">
      <circle r="6" fill="var(--star)" />
      <path d="M0,-11 L0,11 M-11,0 L11,0" stroke="var(--star)" strokeWidth="0.75" opacity="0.6" />
      <text x="0" y="-16" textAnchor="middle" fontSize="11" fontFamily="var(--font-head)" fontWeight="600" fill="var(--star)">
        {t({ en: "Strict serializable", es: "Serializable estricto" }, locale)}
      </text>
      <text x="0" y="26" textAnchor="middle" fontSize="10" fill="var(--text-3)" fontFamily="var(--font-mono)">
        = linearizable ∧ serializable
      </text>
    </g>
    {/* dotted guides to the conjunction */}
    <line x1="70" y1="80" x2="400" y2="80" stroke="var(--gen-deep)" strokeWidth="1" strokeDasharray="2 5" opacity="0.6" />
    <line x1="400" y1="250" x2="400" y2="80" stroke="var(--ai-dim)" strokeWidth="1" strokeDasharray="2 5" opacity="0.6" />
  </svg>
);

// PACELC decision — EXPLORABLE. Toggle the network state (Partition / Healthy)
// and watch the live branch light up. The whole point of PACELC is that the
// "else" (healthy) branch is where you live every day — so it defaults to
// Healthy, and flipping to Partition shows the rarer CAP tradeoff.
const Pacelc: Fig = ({ locale }) => {
  const [partition, setPartition] = useState(false);
  const activeCol = partition ? "var(--bad)" : "var(--gen)";
  return (
    <div>
      <div style={{ display: "flex", gap: "var(--s-2)", marginBottom: "var(--s-4)", alignItems: "center", flexWrap: "wrap" }}>
        <span className="eyebrow">{t({ en: "Network state", es: "Estado de la red" }, locale)}</span>
        <div style={{ display: "inline-flex", border: "1px solid var(--hairline-2)", borderRadius: "var(--r-pill)", overflow: "hidden" }}>
          <button
            onClick={() => setPartition(false)}
            aria-pressed={!partition}
            style={{ padding: "4px 12px", fontSize: "var(--t-xs)", fontFamily: "var(--font-mono)", cursor: "pointer",
              background: !partition ? "var(--gen)" : "transparent", color: !partition ? "var(--text-inv)" : "var(--text-2)", border: "none" }}
          >
            {t({ en: "Healthy", es: "Sana" }, locale)}
          </button>
          <button
            onClick={() => setPartition(true)}
            aria-pressed={partition}
            style={{ padding: "4px 12px", fontSize: "var(--t-xs)", fontFamily: "var(--font-mono)", cursor: "pointer",
              background: partition ? "var(--bad)" : "transparent", color: partition ? "#fff" : "var(--text-2)", border: "none" }}
          >
            {t({ en: "Partition", es: "Partición" }, locale)}
          </button>
        </div>
      </div>
      <svg viewBox="0 0 520 200" width="100%" role="img"
        aria-label={t({ en: "PACELC decision diagram", es: "Diagrama de decisión PACELC" }, locale)}>
        <g fontFamily="var(--font-body)" fontSize="12" fill="var(--text)">
          <rect x="200" y="16" width="120" height="34" rx="6" fill="var(--surface-2)" stroke={activeCol} strokeWidth="1.25" />
          <text x="260" y="38" textAnchor="middle" fill="var(--text)">
            {t({ en: "Partition?", es: "¿Partición?" }, locale)}
          </text>
          {/* branches — the inactive one dims */}
          <line x1="230" y1="50" x2="120" y2="96" stroke="var(--bad)" strokeWidth={partition ? 2 : 1} opacity={partition ? 1 : 0.28} />
          <line x1="290" y1="50" x2="400" y2="96" stroke="var(--gen)" strokeWidth={partition ? 1 : 2} opacity={partition ? 0.28 : 1} />
          <text x="150" y="76" fill="var(--bad)" fontFamily="var(--font-mono)" fontSize="11" opacity={partition ? 1 : 0.4}>{t({ en: "if P", es: "si P" }, locale)}</text>
          <text x="350" y="76" fill="var(--gen)" fontFamily="var(--font-mono)" fontSize="11" opacity={partition ? 0.4 : 1}>{t({ en: "else", es: "si no" }, locale)}</text>
          {/* leaves */}
          <rect x="45" y="96" width="160" height="38" rx="6" fill="var(--bad-bg)" stroke="var(--bad)" opacity={partition ? 1 : 0.3} />
          <text x="125" y="119" textAnchor="middle" opacity={partition ? 1 : 0.5}>{t({ en: "Availability vs Consistency", es: "Disponibilidad vs Consistencia" }, locale)}</text>
          <rect x="315" y="96" width="160" height="38" rx="6" fill="var(--ok-bg)" stroke="var(--gen)" opacity={partition ? 0.3 : 1} />
          <text x="395" y="119" textAnchor="middle" opacity={partition ? 0.5 : 1}>{t({ en: "Latency vs Consistency", es: "Latencia vs Consistencia" }, locale)}</text>
          <text x="260" y="172" textAnchor="middle" fill={activeCol} fontSize="11" fontFamily="var(--font-mono)">
            {partition
              ? t({ en: "Rare. This is the CAP tradeoff everyone quotes.", es: "Raro. Este es el compromiso CAP que todos citan." }, locale)
              : t({ en: "Every day. Latency IS a consistency decision.", es: "Todos los días. La latencia ES una decisión de consistencia." }, locale)}
          </text>
        </g>
      </svg>
    </div>
  );
};

// ── Context Rot — EXPLORABLE (AI track). Drag the context length; watch a
// hand-plotted accuracy curve degrade. Demonstrates Chroma's 2025 finding
// firsthand: accuracy declines as the window fills, beyond "lost in the middle".
const ContextRot: Fig = ({ locale }) => {
  const [len, setLen] = useState(32); // in k tokens, 4..200
  const W = 520, H = 260, padL = 48, padB = 40, padT = 20, padR = 20;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  // Accuracy model: high & flat while small, then a sinking curve as the window
  // fills with distractors. Authored shape, not real data — labeled as illustrative.
  const acc = (k: number) => {
    const x = Math.min(1, k / 200);
    return Math.max(0.28, 0.98 - 0.62 * Math.pow(x, 0.7) - 0.06 * Math.sin(x * 9) * x);
  };
  const xOf = (k: number) => padL + (Math.min(k, 200) / 200) * plotW;
  const yOf = (a: number) => padT + (1 - a) * plotH;
  const pts = Array.from({ length: 41 }, (_, i) => {
    const k = 4 + (i / 40) * 196;
    return `${xOf(k).toFixed(1)},${yOf(acc(k)).toFixed(1)}`;
  }).join(" ");
  const curAcc = acc(len);
  return (
    <div>
      <div style={{ display: "flex", gap: "var(--s-4)", marginBottom: "var(--s-4)", alignItems: "center", flexWrap: "wrap" }}>
        <span className="eyebrow">{t({ en: "Context length", es: "Longitud de contexto" }, locale)}</span>
        <input type="range" min={4} max={200} value={len} onChange={(e) => setLen(Number(e.target.value))}
          aria-label={t({ en: "Context length in thousands of tokens", es: "Longitud de contexto en miles de tokens" }, locale)}
          style={{ flex: 1, minWidth: 140, accentColor: "var(--ai)" }} />
        <span className="mono" style={{ fontSize: "var(--t-sm)", color: "var(--ai-accent)", minWidth: 64 }}>{len}k tok</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
        aria-label={t({ en: "Accuracy versus context length curve", es: "Curva de precisión frente a longitud de contexto" }, locale)}>
        {/* axes */}
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--hairline-2)" strokeWidth="1" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--hairline-2)" strokeWidth="1" />
        {[0.4, 0.6, 0.8, 1].map((a) => (
          <g key={a}>
            <line x1={padL} y1={yOf(a)} x2={W - padR} y2={yOf(a)} stroke="var(--grid-line)" strokeWidth="1" />
            <text x={padL - 8} y={yOf(a) + 3} textAnchor="end" fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-4)">{Math.round(a * 100)}%</text>
          </g>
        ))}
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-3)" letterSpacing="0.08em">
          {t({ en: "TOKENS IN CONTEXT →", es: "TOKENS EN CONTEXTO →" }, locale)}
        </text>
        {/* curve */}
        <polyline points={pts} fill="none" stroke="var(--ai)" strokeWidth="2" />
        {/* current marker */}
        <line x1={xOf(len)} y1={padT} x2={xOf(len)} y2={H - padB} stroke="var(--ai-signal)" strokeWidth="1" strokeDasharray="2 4" opacity="0.7" />
        <circle cx={xOf(len)} cy={yOf(curAcc)} r="5" fill="var(--ai-signal)" />
        <text x={xOf(len)} y={yOf(curAcc) - 12} textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" fontWeight="600" fill="var(--ai-signal)">
          {Math.round(curAcc * 100)}%
        </text>
      </svg>
      <p className="dim" style={{ fontSize: "var(--t-xs)", marginTop: "var(--s-2)" }}>
        {t({ en: "Illustrative shape (Chroma 2025, \"Context Rot\"). More context ≠ more accuracy — relevance and order beat volume.", es: "Forma ilustrativa (Chroma 2025, \"Context Rot\"). Más contexto ≠ más precisión — la relevancia y el orden ganan al volumen." }, locale)}
      </p>
    </div>
  );
};

// ── Lethal Trifecta (AI track) — the three capabilities that, combined, make an
// agent exfiltratable (Simon Willison). Static but signature-clear.
const LethalTrifecta: Fig = ({ locale }) => {
  const nodes = [
    { x: 260, y: 60, en: "Untrusted input", es: "Entrada no confiable" },
    { x: 150, y: 210, en: "Access to private data", es: "Acceso a datos privados" },
    { x: 370, y: 210, en: "Exfiltration path", es: "Vía de exfiltración" },
  ];
  return (
    <svg viewBox="0 0 520 280" width="100%" role="img"
      aria-label={t({ en: "The lethal trifecta", es: "La trifecta letal" }, locale)}>
      <polygon points="260,60 150,210 370,210" fill="var(--bad-bg)" stroke="var(--bad)" strokeWidth="1" opacity="0.5" />
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r="8" fill="var(--bad)" />
          <text x={n.x} y={n.y + (i === 0 ? -16 : 26)} textAnchor="middle" fontSize="12" fontFamily="var(--font-head)" fontWeight="600" fill="var(--text)">
            {t({ en: n.en, es: n.es }, locale)}
          </text>
        </g>
      ))}
      <text x="260" y="150" textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--bad)">
        {t({ en: "all three = game over", es: "las tres = fin del juego" }, locale)}
      </text>
    </svg>
  );
};

// ── Agent autonomy spectrum (AI track) — least-agency-first, left to right.
const AgentSpectrum: Fig = ({ locale }) => {
  const steps = [
    { en: "Fixed workflow", es: "Flujo fijo" },
    { en: "ReAct loop", es: "Bucle ReAct" },
    { en: "Plan-execute", es: "Plan-ejecuta" },
    { en: "Multi-agent", es: "Multi-agente" },
  ];
  return (
    <svg viewBox="0 0 520 180" width="100%" role="img"
      aria-label={t({ en: "Agent autonomy spectrum", es: "Espectro de autonomía de agentes" }, locale)}>
      <defs>
        <linearGradient id="spectrum-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--ok)" />
          <stop offset="100%" stopColor="var(--bad)" />
        </linearGradient>
      </defs>
      <line x1="40" y1="70" x2="480" y2="70" stroke="url(#spectrum-grad)" strokeWidth="2" />
      {steps.map((s, i) => {
        const x = 60 + i * 135;
        return (
          <g key={i}>
            <circle cx={x} cy="70" r="6" fill="var(--surface)" stroke="var(--text-2)" strokeWidth="1.5" />
            <text x={x} y="50" textAnchor="middle" fontSize="11" fontFamily="var(--font-head)" fontWeight="600" fill="var(--text)">{t(s, locale)}</text>
          </g>
        );
      })}
      <text x="40" y="120" fontSize="10" fontFamily="var(--font-mono)" fill="var(--ok)">{t({ en: "← more reliable / cheaper", es: "← más fiable / barato" }, locale)}</text>
      <text x="480" y="120" textAnchor="end" fontSize="10" fontFamily="var(--font-mono)" fill="var(--bad)">{t({ en: "more autonomy / ~15× tokens →", es: "más autonomía / ~15× tokens →" }, locale)}</text>
      <text x="260" y="150" textAnchor="middle" fontSize="11" fill="var(--text-3)">{t({ en: "Exhaust the left before reaching right.", es: "Agota la izquierda antes de llegar a la derecha." }, locale)}</text>
    </svg>
  );
};

const DIAGRAMS: Record<string, Fig> = {
  "consistency-lattice": ConsistencyLattice,
  pacelc: Pacelc,
  "context-rot": ContextRot,
  "lethal-trifecta": LethalTrifecta,
  "agent-spectrum": AgentSpectrum,
};

export const DIAGRAM_IDS = Object.keys(DIAGRAMS);
