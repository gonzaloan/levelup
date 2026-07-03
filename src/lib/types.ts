// Content-as-data schema. Every learner-facing string is an I18nText ({en,es}).
// This is the contract the seed-content fleet must conform to.
import type { I18nText } from "@/i18n/config";
import type { AxisId, Level, Band } from "./axes";

export type Track = "general" | "ai";
export type Difficulty = -1 | 0 | 1; // author-assigned b (provisional, §B9)
export type Confidence = "low" | "mid" | "high"; // CBM

// ── Objective / CBM item ────────────────────────────────────────────────
export interface ItemOption {
  id: string;
  text: I18nText;
  correct: boolean;
  rationale: I18nText;        // why right / why wrong — this IS roadmap content
  misconception?: string;     // slug; a confident-wrong here spawns a roadmap item
  resource?: string;          // moduleId#topic to study
}

export interface Item {
  id: string;
  axis: AxisId;
  track: Track;
  difficulty: Difficulty;
  stem: I18nText;
  options: ItemOption[];
  confidence: boolean;        // CBM enabled
}

// ── Situational Judgment item ("The Room") — graded key, senior-reviewed ─
export interface SjtResponse {
  id: string;
  text: I18nText;
  score: number;              // 3 best · 1 defensible-suboptimal · 0 · -2 harmful
  verdict: "best" | "defensible" | "weak" | "harmful";
  rationale: I18nText;
  downstream?: string;        // next scenario id if this path is taken
}

export interface Sjt {
  id: string;
  axes: AxisId[];
  track: Track;
  scenario: I18nText;
  responses: SjtResponse[];
  requiresRationaleInput: boolean;
  reviewers: number;          // n senior reviewers who keyed it (honesty, §B7)
}

// ── Field Work (proof-of-work) ──────────────────────────────────────────
export interface RubricCriterion {
  id: string;
  criterion: I18nText;
  weight: number;
  hint?: I18nText;
}

export interface FieldWork {
  id: string;
  axis: AxisId;
  track: Track;
  kind: "design-doc" | "harden-code" | "predict-output";
  title: I18nText;
  prompt: I18nText;
  workedExampleFirst: boolean;
  starter?: I18nText;         // e.g. AI-generated code to harden (the 30% Gauntlet)
  rubric: RubricCriterion[];
}

// ── Module ──────────────────────────────────────────────────────────────
export interface Topic {
  id: string;
  title: I18nText;
  body: I18nText;             // authored markdown-ish prose
  diagram?: string;           // key into the SVG diagram registry
}

export interface Module {
  id: string;
  track: Track;
  level: Level;
  order: number;
  axis: { primary: AxisId; secondary?: AxisId };
  title: I18nText;
  tagline: I18nText;
  topics: Topic[];
  retrieval: string[];        // item ids — a recognition check after reading
  fieldWork?: string;         // FieldWork id
  room?: string;              // Sjt id (the module's Room)
  prerequisites: string[];    // module ids — mastery gate (~90%)
  // Star-chart authored coordinates (§D4) — deterministic, never runtime-random
  chart: { x: number; y: number; magnitude: 1 | 2 | 3; constellation: string };
}

// ── Assessment run/result shapes ────────────────────────────────────────
export interface Response {
  itemId: string;
  optionId: string;
  correct: boolean;
  confidence: Confidence;
  axis: AxisId;
  difficulty: Difficulty;
  ts: number;
}

export interface AxisResult {
  axis: AxisId;
  theta: number;              // continuous ability (MAP estimate)
  sem: number;                // standard error of measurement
  band: Band;
  composite: number;          // 0..1 fused score
  provisional: boolean;       // true when SEM is high
  calibrationGap?: {
    self: number;             // self-rated 0..1
    measured: number;         // composite
    direction: "over" | "under";
  };
  topMisconceptions: string[];
}

export interface AssessmentResult {
  axes: AxisResult[];
  weakest: AxisId[];          // 1–2 highest-leverage axes
  archetype?: string;
  completedAt: number;
}
