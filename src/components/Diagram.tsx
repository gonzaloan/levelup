"use client";
// Authored SVG figures in the observatory/blueprint language. Keyed by id so
// content-as-data can reference a diagram from a topic. These break up the
// wall-of-prose in module Read views and give each module a visual anchor.
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

// PACELC decision: partition? → A vs C, else → L vs C.
const Pacelc: Fig = ({ locale }) => (
  <svg viewBox="0 0 520 220" width="100%" role="img"
    aria-label={t({ en: "PACELC decision diagram", es: "Diagrama de decisión PACELC" }, locale)}>
    <g fontFamily="var(--font-body)" fontSize="12" fill="var(--text)">
      {/* root */}
      <rect x="200" y="20" width="120" height="34" rx="6" fill="var(--surface-2)" stroke="var(--hairline-2)" />
      <text x="260" y="42" textAnchor="middle" fill="var(--text)">
        {t({ en: "Partition?", es: "¿Partición?" }, locale)}
      </text>
      {/* branches */}
      <line x1="230" y1="54" x2="120" y2="100" stroke="var(--bad)" strokeWidth="1" />
      <line x1="290" y1="54" x2="400" y2="100" stroke="var(--gen)" strokeWidth="1" />
      <text x="150" y="80" fill="var(--bad)" fontFamily="var(--font-mono)" fontSize="11">{t({ en: "if P", es: "si P" }, locale)}</text>
      <text x="350" y="80" fill="var(--gen)" fontFamily="var(--font-mono)" fontSize="11">{t({ en: "else (healthy)", es: "si no (sana)" }, locale)}</text>
      {/* leaves */}
      <rect x="50" y="100" width="150" height="34" rx="6" fill="var(--bad-bg)" stroke="var(--bad)" />
      <text x="125" y="122" textAnchor="middle">{t({ en: "Availability vs Consistency", es: "Disponibilidad vs Consistencia" }, locale)}</text>
      <rect x="320" y="100" width="150" height="34" rx="6" fill="var(--ok-bg)" stroke="var(--gen)" />
      <text x="395" y="122" textAnchor="middle">{t({ en: "Latency vs Consistency", es: "Latencia vs Consistencia" }, locale)}</text>
      <text x="260" y="180" textAnchor="middle" fill="var(--text-3)" fontSize="11">
        {t({ en: "The \"else\" branch is where you live every day.", es: "La rama \"si no\" es donde vives todos los días." }, locale)}
      </text>
    </g>
  </svg>
);

const DIAGRAMS: Record<string, Fig> = {
  "consistency-lattice": ConsistencyLattice,
  pacelc: Pacelc,
};

export const DIAGRAM_IDS = Object.keys(DIAGRAMS);
