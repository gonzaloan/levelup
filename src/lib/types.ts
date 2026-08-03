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
  /**
   * Shared-Foundations concepts this one leans on, ACROSS domains.
   *
   * Deliberately separate from `prerequisites`, which is a HARD gate: `daily.ts:87`
   * will not serve a concept until every prerequisite is read, and `merge-domain.cjs`
   * requires them to resolve within the same domain so the brief cannot deadlock.
   *
   * A cross-route dependency is advisory, not gating. An AI Architect designing an
   * inference queue benefits from `backpressure-flow-control` and should be told so
   * at the moment it matters — but making it a gate would force every AI learner
   * through the systems domain, which is the coupling the route split exists to
   * remove. This is the section 5.3 mechanism: one canonical definition, surfaced
   * from the modules that need it.
   */
  leansOn?: string[];
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
// A code sample with optional per-line annotations — the "show the code" layer.
export interface ConceptCode {
  lang: string;                // e.g. "python", "ts", "go", "sql", "text"
  snippet: string;             // raw source (NOT i18n — code is code)
  caption?: I18nText;
  annotations?: { line: number; note: I18nText }[];
}
// A defined term surfaced in the context rail as a keyword chip.
export interface ConceptKeyword { term: I18nText; def: I18nText; }
// A worked example: a concrete scenario + its walkthrough.
export interface ConceptExample { scenario: I18nText; walkthrough: I18nText; }
// Reference to an interactive widget from the viz kit (src/components/viz).
export interface ConceptVisual { widgetId: string; params?: Record<string, unknown>; }

// A scannable sub-concept card (get-certified's `children`) — one facet of the
// concept broken out with its own micro-explanation.
export interface ConceptChild { label: I18nText; detail: I18nText; }

/**
 * A commitment the learner makes BEFORE the concept explains itself.
 *
 * WHY THIS EXISTS
 * The pedagogy audit found Predict missing platform-wide: `grep -rn predict src/`
 * returned two unrelated hits. The concept pane opens by naming the judgment, then
 * shows the figure, then explains — so the learner is told the answer before ever
 * committing to one. No commitment means no generation effect and no productive
 * failure: they never find out they were wrong before being told.
 *
 * Deliberately NOT scored and NOT gated. The value is the commitment itself, and
 * attaching a score to a guess made before the teaching would punish the learner
 * for not yet knowing — which is the entire point of asking.
 *
 * `resolution` is what the learner reads after committing: not "correct/incorrect"
 * but why the answer is what it is, so a wrong prediction is the most useful
 * outcome rather than a penalty.
 */
export interface ConceptPredict {
  /** The question, phrased so a reasoned guess is possible from prior knowledge. */
  prompt: I18nText;
  /** 2–4 options. Wrong ones must be real mistakes, not obvious throwaways. */
  options: { text: I18nText; correct: boolean; why: I18nText }[];
  /** Shown once a choice is made — the mechanism, not a verdict. */
  resolution: I18nText;
}

export interface ConceptLesson {
  slug: string;
  explanation: I18nText;       // authored prose, \n\n-separated paragraphs
  keyPoints: I18nText[];
  diagram: Schematic;
  // ── enriched layer — all optional, additive; old renderers ignore these ──
  depth?: I18nText;            // extended "read more" prose (second layer)
  keywords?: ConceptKeyword[]; // key terms for the context rail
  code?: ConceptCode;          // a real code sample, when code clarifies
  example?: ConceptExample;    // a worked concrete example
  architecture?: Schematic;    // a richer/animated schematic (system view)
  visual?: ConceptVisual;      // an interactive widget from the viz kit
  pitfalls?: I18nText[];       // common traps / "how this goes wrong"
  analogy?: I18nText;          // a plain-language analogy that makes it click
  source?: string;             // checkable citation for enriched claims
  children?: ConceptChild[];   // scannable sub-concept cards
  predict?: ConceptPredict;    // commit a guess BEFORE the figure and the prose
  mnemonic?: I18nText;         // a memory hook
  flashcards?: { front: I18nText; back: I18nText }[]; // recall step (self-graded)
}

// A structured quick-reference / cheat sheet section for a level.
export interface CheatSection {
  heading: I18nText;
  rows: { term: I18nText; note: I18nText }[];
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
  cheatSheet?: CheatSection[]; // optional quick-reference for this level
}

// ── Novel knowledge-check mechanics (beyond multiple-choice) ─────────────
// Four game-like check types that work as formative practice in lessons and as
// graded boolean items in checkpoints. All learner-facing strings are I18nText.
export type CheckKind = "cloze" | "order" | "match" | "categorize";

export interface CheckBase {
  id: string;
  concept: string;             // concept slug this check trains
  kind: CheckKind;
  prompt: I18nText;            // the instruction / question
  explain: I18nText;           // shown on reveal — why the answer is right
  track: Track;
}
// Complete-the-sentence: `segments` are the n+1 text pieces around n blanks;
// the learner fills each blank from `bank`. `answers[i]` is the bank index for blank i.
export interface ClozeCheck extends CheckBase {
  kind: "cloze";
  segments: I18nText[];
  bank: I18nText[];
  answers: number[];
}
// Sequence: `items` in the correct order; shown shuffled, learner reorders.
export interface OrderCheck extends CheckBase {
  kind: "order";
  items: I18nText[];
}
// Connect pairs across two columns. `pairs` are [leftIndex, rightIndex].
export interface MatchCheck extends CheckBase {
  kind: "match";
  left: I18nText[];
  right: I18nText[];
  pairs: [number, number][];
}
// Drag each item into its correct bucket (by bucket index).
export interface CategorizeCheck extends CheckBase {
  kind: "categorize";
  buckets: I18nText[];
  items: { label: I18nText; bucket: number }[];
}
export type CheckItem = ClozeCheck | OrderCheck | MatchCheck | CategorizeCheck;

// ── Architecture Builder (constructive check — "build it, don't pick it") ─────
// The learner assembles a system by placing typed components from a palette and
// connecting them (directed edges). Graded deterministically against a target
// topology: required components present, required connections present, and known
// anti-pattern connections ABSENT. Partial credit + per-criterion feedback.
// Input is drag OR tap-to-place OR keyboard — grading is on the resulting graph,
// so it satisfies both the "drag to build" ask and the tap/keyboard a11y bar.
export interface BuildPaletteItem {
  type: string;                // stable id, e.g. "client", "lb", "cache", "db"
  label: I18nText;             // display name
  glyph?: string;              // optional short symbol/emoji-free tag for the node
  hint?: I18nText;             // what this component is for
}
export interface BuildRequiredNode {
  type: string;                // palette type that must appear
  min?: number;                // at least this many (default 1)
  note?: I18nText;             // why it's needed (shown in feedback)
}
export interface BuildEdgeRule {
  from: string;                // palette type
  to: string;                  // palette type
  note: I18nText;              // why this connection matters / why it's wrong
}
export interface BuildChallenge {
  id: string;
  concept: string;             // concept slug this trains
  track: Track;
  title: I18nText;
  prompt: I18nText;            // the scenario: "assemble a read-heavy web tier…"
  palette: BuildPaletteItem[];
  requiredNodes: BuildRequiredNode[];
  requiredEdges: BuildEdgeRule[];   // directed connections that MUST exist
  forbiddenEdges?: BuildEdgeRule[]; // anti-pattern connections that must NOT exist
  explain: I18nText;           // shown on reveal — the reference architecture rationale
}
// What a builder emits: placed node instances (id + type) and directed edges.
export interface BuildNodeInstance { id: string; type: string; }
export interface BuildResponse {
  nodes: BuildNodeInstance[];
  edges: { from: string; to: string }[]; // by node instance id
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

// ── The Codex (AI-Architect reference) ──────────────────────────────────
// A REFERENCE, deliberately not a lesson. The spine teaches judgment over 178
// concepts on a prerequisite DAG; the Codex answers "what is X, when do I reach
// for it, and what does it cost me" for the vocabulary an AI architect is
// expected to already have — chunking strategies, index families, agent
// patterns, serving mechanics.
//
// Every entry carries the same six-part anatomy, because a reference whose
// entries have different shapes cannot be scanned. `cost` is a bound or a
// number, never an adjective; `cheaperFirst` names the option to rule out first.
// Those two fields ARE the editorial position — an entry that cannot state them
// is an entry we do not understand well enough to ship.
export interface CodexEntry {
  slug: string;
  term: I18nText;
  definition: I18nText;        // what it IS, plain words, ≤30 words
  howItWorks: I18nText;        // the mechanism, concrete
  whenToUse: I18nText;         // the trigger, as a condition you could check
  cost: I18nText;              // a bound or a figure — never "more reliable"
  cheaperFirst: I18nText;      // the cheaper option, and what would make it win
  failureMode: I18nText;       // how this breaks in practice
  numbers?: I18nText;          // verified figures with units
  source: string;              // the URL that was actually fetched
  diagram?: Schematic;         // authored SVG via the existing Schematic renderer
  /** Entries that must be understood first — the Codex's own DAG. */
  prerequisites: string[];
  /** Cross-links INTO the 178-concept spine, so the two surfaces reinforce. */
  relatedConcepts: string[];
  /** Optional interactive widget from the viz kit. */
  visual?: ConceptVisual;
}

export interface CodexCluster {
  slug: string;
  title: I18nText;
  tagline: I18nText;           // one line: what this cluster lets you decide
  entries: CodexEntry[];
}

// A real reference architecture, redrawn from vendor documentation. Never
// invented and never idealized: `source` is the doc that was fetched, and the
// tradeoffs are the ones the doc states.
export interface CodexArchitecture {
  slug: string;
  name: I18nText;
  problem: I18nText;
  whenThisShape: I18nText;
  components: { label: I18nText; role: I18nText }[];
  flow: I18nText[];            // ordered steps
  tradeoffs: I18nText[];
  failureModes: I18nText[];
  source: string;
  vendor: string;              // aws | gcp | azure | anthropic | other
  diagram: Schematic;
}

export interface Codex {
  clusters: CodexCluster[];
  architectures: CodexArchitecture[];
}

/**
 * A step on a reading path through the Codex.
 *
 * The path exists because a reference with 90 entries and no route through it is
 * a glossary, and the owner asked for a way to LEARN it, not just look things up.
 * Derived from the entry DAG at build time — never hand-ordered, so it cannot
 * drift from the prerequisites.
 */
export interface CodexPathStep {
  entrySlug: string;
  clusterSlug: string;
  depth: number;               // longest prerequisite chain reaching it
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
