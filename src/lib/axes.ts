// The five competency axes — the assessment spine. Fixed order (radar area
// distorts if reordered). Each axis carries behavioral anchors keyed to the
// public L3–L7 ladder (Dropbox / levels.fyi), with Dreyfus mechanics as the
// internal scaffold only. See research/04-brief-amendments-v2.md §A2.
import type { I18nText } from "@/i18n/config";

export type AxisId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Axis {
  id: AxisId;
  key: string;
  name: I18nText;
  short: I18nText;      // abbreviated label for tight radar geometry (ES-safe)
  measures: I18nText;
}

export const AXES: Axis[] = [
  {
    id: 1,
    key: "technical-depth",
    name: { en: "Technical Depth", es: "Profundidad Técnica" },
    short: { en: "Depth", es: "Profundidad" },
    measures: {
      en: "Command of the primitives as tradeoff judgment, not trivia.",
      es: "Dominio de los fundamentos como juicio de compromisos, no trivia.",
    },
  },
  {
    id: 2,
    key: "systems-architecture",
    name: { en: "Systems & Architecture Judgment", es: "Juicio de Sistemas y Arquitectura" },
    short: { en: "Architecture", es: "Arquitectura" },
    measures: {
      en: "Choosing the simplest sufficient design; knowing when NOT to use a pattern.",
      es: "Elegir el diseño más simple suficiente; saber cuándo NO usar un patrón.",
    },
  },
  {
    id: 3,
    key: "execution-delivery",
    name: { en: "Execution & Delivery Craft", es: "Ejecución y Oficio de Entrega" },
    short: { en: "Delivery", es: "Entrega" },
    measures: {
      en: "Shipping reliably: SLOs, testing, review as craft, operational ownership.",
      es: "Entregar con fiabilidad: SLOs, pruebas, revisión como oficio, dueño operacional.",
    },
  },
  {
    id: 4,
    key: "direction-influence",
    name: { en: "Direction & Influence", es: "Dirección e Influencia" },
    short: { en: "Influence", es: "Influencia" },
    measures: {
      en: "Setting technical direction, writing strategy, influence without authority.",
      es: "Fijar dirección técnica, escribir estrategia, influir sin autoridad.",
    },
  },
  {
    id: 5,
    key: "leveling-scope",
    name: { en: "Leveling Up Others & Scope", es: "Desarrollo de Otros y Alcance" },
    short: { en: "Scope", es: "Alcance" },
    measures: {
      en: "Sponsorship over mentorship, strategic glue, growing the org's capability.",
      es: "Padrinazgo sobre mentoría, pegamento estratégico, crecer la capacidad del equipo.",
    },
  },
  {
    // The flagship axis. Restored per spec §A (design.md:38-39) and pinned to the
    // 70/30 thesis: as agents write the routine 70%, judgment over the hard 30% —
    // evals, retrieval, agent design, LLM security, unit economics — is the axis
    // that increasingly separates Staff-level engineers. A clean hexagon vertex.
    id: 6,
    key: "ai-engineering",
    name: { en: "Real World AI Engineering", es: "IA en el Mundo Real" },
    short: { en: "AI Eng", es: "IA" },
    measures: {
      en: "Evals as engineering, retrieval and agent design, LLM security, and owning cost-per-successful-task in production.",
      es: "Evals como ingeniería, diseño de recuperación y agentes, seguridad de LLM, y ser dueño del costo por tarea exitosa en producción.",
    },
  },
  {
    // The second specialist axis. Distributed-systems theory (axis 1) and design
    // judgment (axis 2) tell you what SHOULD happen; this axis is about owning it
    // on a real cloud, where the constraints are a provider's actual primitives,
    // its actual failure domains, and a bill. Kept separate from architecture
    // because "can you draw a cell-based design" and "do you know what AZ-
    // independence costs you in this account structure" are different skills, and
    // Staff+ cloud work lives in the second one.
    id: 7,
    key: "cloud-platform",
    name: { en: "Cloud & Platform Engineering", es: "Ingeniería de Nube y Plataforma" },
    short: { en: "Cloud", es: "Nube" },
    measures: {
      en: "Owning a cloud footprint end to end: isolation and failure domains, multi-account governance, cost as a design constraint, and the paved roads other teams build on.",
      es: "Ser dueño de una huella de nube de punta a punta: dominios de aislamiento y de falla, gobierno multi-cuenta, el costo como restricción de diseño, y los caminos pavimentados sobre los que construyen otros equipos.",
    },
  },
];

// The one place axis→colour lives. Each axis gets a distinguishable accent from
// the existing token palette (no new hues invented): the two track colours plus
// the instrument accents. Consumers reference this instead of re-declaring a
// local map, so a palette change lands everywhere at once.
export const AXIS_COLOR: Record<AxisId, string> = {
  1: "var(--gen)",
  2: "var(--gen-accent)",
  3: "var(--ai-signal)",
  4: "var(--star)",
  5: "var(--amber-accent)",
  6: "var(--ai)",
  7: "var(--amber)",
};

export const AXIS_BY_ID: Record<AxisId, Axis> = AXES.reduce(
  (acc, a) => ((acc[a.id] = a), acc),
  {} as Record<AxisId, Axis>
);

// Native ladder levels shown to users (Dreyfus is internal only).
export type Level = "L3" | "L4" | "L5" | "L6" | "L7";
export const LEVELS: Level[] = ["L3", "L4", "L5", "L6", "L7"];
export const LEVEL_LABEL: Record<Level, I18nText> = {
  L3: { en: "L3 · Developing", es: "L3 · En desarrollo" },
  L4: { en: "L4 · Senior", es: "L4 · Senior" },
  L5: { en: "L5 · Staff Threshold", es: "L5 · Umbral Staff" },
  L6: { en: "L6 · Staff", es: "L6 · Staff" },
  L7: { en: "L7 · Principal", es: "L7 · Principal" },
};

// Three honest confidence bands (amendments §B1). A band maps to a level RANGE,
// never a false-precise single stage.
export type Band = "developing" | "solid" | "strong";
export const BAND_RANGE: Record<Band, { levels: [Level, Level]; label: I18nText }> = {
  developing: { levels: ["L3", "L4"], label: { en: "Developing", es: "En desarrollo" } },
  solid:      { levels: ["L4", "L5"], label: { en: "Solid", es: "Sólido" } },
  strong:     { levels: ["L5", "L6"], label: { en: "Strong", es: "Fuerte" } },
};
