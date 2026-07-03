// The five competency axes — the assessment spine. Fixed order (radar area
// distorts if reordered). Each axis carries behavioral anchors keyed to the
// public L3–L7 ladder (Dropbox / levels.fyi), with Dreyfus mechanics as the
// internal scaffold only. See research/04-brief-amendments-v2.md §A2.
import type { I18nText } from "@/i18n/config";

export type AxisId = 1 | 2 | 3 | 4 | 5;

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
];

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
