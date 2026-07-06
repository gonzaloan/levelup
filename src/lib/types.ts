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

// ── Curriculum spine (the ordered L3→L7 learning structure) ──────────────
// Authored + fact-checked by the research fleet (research/ + curriculum.json).
// The spine is the "plan to learn everything": every domain is a prerequisite
// DAG; levels are spiral depth bands across it; concepts chunk into clusters;
// each cluster ends in a checkpoint quiz gated by mastery before advancing.
export interface Concept {
  slug: string;
  title: I18nText;
  why: I18nText;              // the ONE judgment this concept trains
  prerequisites: string[];    // concept slugs, within-domain
  source: string;             // the real, checkable source that grounds it
  moduleId?: string;          // deep authored module, when one exists for this concept
}

export interface CurriculumLevel {
  level: Level;
  intent: I18nText;           // what mastering this level in this domain means
  concepts: Concept[];
}

export interface CurriculumDomain {
  id: string;                 // axis key (technical-depth, ai-engineering, …)
  axisId: AxisId;
  levels: CurriculumLevel[];
}

export interface CheckpointItemOption {
  text: I18nText;
  correct: boolean;
  rationale: I18nText;
}
export interface CheckpointItem {
  concept: string;            // concept slug this item checks
  stem: I18nText;
  options: CheckpointItemOption[];
}
export interface Checkpoint {
  id: string;
  domainId: string;
  axisId: AxisId;
  afterLevel: Level;          // sits at the end of this level's cluster
  coversConcepts: string[];   // concept slugs
  items: CheckpointItem[];    // judgment questions (authored by the fleet)
}

export interface Curriculum {
  domains: CurriculumDomain[];
  checkpoints: Checkpoint[];
}

// ── Lesson content (the teachable layer over the spine) ─────────────────
// A Lesson is one domain×level cluster, presenting the full learning flow:
// overview → each concept (explanation + optional schematic + key points) →
// a mid-lesson formative quiz. The end-of-level checkpoint is the final test.
export interface DiagramNode { label: I18nText; note?: I18nText; }
export interface DiagramColumn { title: I18nText; points: I18nText[]; }
export interface Schematic {
  kind: "flow" | "compare" | "stack" | "axes" | "none";
  caption: I18nText;
  nodes?: DiagramNode[];       // flow / stack
  left?: DiagramColumn;        // compare
  right?: DiagramColumn;       // compare
  xAxis?: I18nText;            // axes
  yAxis?: I18nText;            // axes
}
export interface ConceptLesson {
  slug: string;
  explanation: I18nText;       // authored prose, \n\n-separated paragraphs
  keyPoints: I18nText[];
  diagram: Schematic;
}
export interface QuizItem {
  stem: I18nText;
  options: { text: I18nText; correct: boolean; rationale: I18nText }[];
}
export interface Lesson {
  lessonId: string;            // `${domainId}-${level.toLowerCase()}`
  overview: I18nText;          // the general concept, read first
  concepts: ConceptLesson[];
  midQuiz: QuizItem[];
}

// A single step in the recommended cross-domain learning path.
export interface PathStep {
  kind: "concept" | "checkpoint";
  level: Level;
  domainId: string;
  axisId: AxisId;
  ref: string;                // concept slug or checkpoint id
  title: I18nText;
  moduleId?: string;          // if a deep module backs this concept
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
