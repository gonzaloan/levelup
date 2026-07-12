// The Climb — the level-first progression spine.
//
// The platform's content is a 6-domain × 5-level (L3→L7) matrix. Learners kept
// reading it as a flat topic list ("which domain do I click?") with no felt sense
// of *ascent*: what it takes to rise a level, what's locked, where you are.
//
// This module reframes the same content as a laddered climb. Each ladder level
// is a STAGE with a role mandate (what an engineer at that level is trusted to
// do). A stage bundles the domain×level lessons for that band. You ASCEND to the
// next stage by clearing a QUORUM of that stage's domain checkpoints — you must
// demonstrate breadth across areas, not grind one domain to the top. This makes
// the prerequisite structure legible: "to reach L4 · Senior, clear 4 of 6 L3
// checkpoints." Nothing here is random; it's a pure function of Progress.
//
// Pedagogy: this is Bloom mastery-gating (clear before you climb) layered over
// the existing interleaved spiral (curriculum.ts). It does not replace the
// per-lesson flow — it sits above it as the map/orchestration layer.
import { LEVELS, type Level, type AxisId } from "./axes";
import {
  ORDERED_DOMAINS, checkpointsAfter, conceptsOf,
} from "./curriculum";
import type { Progress } from "./store";
import type { I18nText } from "@/i18n/config";
import type { Checkpoint } from "./types";

// How many of a stage's domain checkpoints must be cleared to ascend. Breadth
// gate: prove competence across most areas, but one weak domain shouldn't wall
// you out forever (that's what the diagnostic + targeted practice are for).
export const ASCENT_QUORUM = 4; // of up to 6 domains per band

export type StageStatus = "complete" | "current" | "available" | "locked";

export interface StageDomainCell {
  domainId: string;
  axisId: AxisId;
  level: Level;
  lessonId: string;              // `${domainId}-${level.toLowerCase()}`
  concepts: number;
  conceptsRead: number;
  checkpoint?: Checkpoint;
  checkpointCleared: boolean;
  checkpointScore?: number;      // best 0..1 if attempted
}

export interface Stage {
  level: Level;
  index: number;                 // 0..4
  status: StageStatus;
  cells: StageDomainCell[];      // one per domain that has content at this level
  checkpointsTotal: number;      // domains with a checkpoint at this band
  checkpointsCleared: number;
  quorum: number;                // needed to ascend
  ascended: boolean;             // quorum met → next stage unlocked
  conceptsTotal: number;
  conceptsRead: number;
  pct: number;                   // 0..100, by checkpoints cleared (the real gate)
}

// ── Per-level role mandate (the narrative spine) ───────────────────────────
// What an engineer operating at this level is trusted to do — the "why this
// stage exists" that frames every lesson under it. Authored, bilingual.
export interface LevelMandate {
  level: Level;
  title: I18nText;               // the role name at this rung
  mandate: I18nText;             // the one sentence: what you're trusted to do
  scope: I18nText;              // blast radius of your decisions
  proof: I18nText;              // what clearing this stage proves
}

export const LEVEL_MANDATE: Record<Level, LevelMandate> = {
  L3: {
    level: "L3",
    title: { en: "Developing Engineer", es: "Ingeniero en Desarrollo" },
    mandate: {
      en: "Deliver well-scoped tasks correctly on one system, reasoning about cost and correctness as you go.",
      es: "Entregar tareas bien acotadas de forma correcta en un solo sistema, razonando sobre costo y corrección sobre la marcha.",
    },
    scope: { en: "A task, a service you don't yet own.", es: "Una tarea, un servicio que aún no es tuyo." },
    proof: {
      en: "You can be handed a problem and return a correct, reasonable solution without hand-holding.",
      es: "Te pueden dar un problema y devuelves una solución correcta y razonable sin supervisión constante.",
    },
  },
  L4: {
    level: "L4",
    title: { en: "Senior Engineer", es: "Ingeniero Senior" },
    mandate: {
      en: "Own an area end-to-end: make the design calls, ship reliably, and be the person the team trusts on it.",
      es: "Ser dueño de un área de extremo a extremo: tomar las decisiones de diseño, entregar con fiabilidad y ser la persona en quien el equipo confía para ello.",
    },
    scope: { en: "A component or feature area, and its on-call.", es: "Un componente o área de features, y su on-call." },
    proof: {
      en: "You turn ambiguity into a design and a shipped, operable system others build on.",
      es: "Conviertes la ambigüedad en un diseño y en un sistema operable y entregado sobre el que otros construyen.",
    },
  },
  L5: {
    level: "L5",
    title: { en: "Staff Threshold", es: "Umbral Staff" },
    mandate: {
      en: "Set the technical approach for a team and de-risk the hard calls before they become incidents.",
      es: "Fijar el enfoque técnico de un equipo y mitigar las decisiones difíciles antes de que se vuelvan incidentes.",
    },
    scope: { en: "A team's roadmap and its riskiest bets.", es: "El roadmap de un equipo y sus apuestas más riesgosas." },
    proof: {
      en: "Your judgment shapes what a team builds, not just how your own code works.",
      es: "Tu criterio moldea lo que un equipo construye, no solo cómo funciona tu propio código.",
    },
  },
  L6: {
    level: "L6",
    title: { en: "Staff Engineer", es: "Ingeniero Staff" },
    mandate: {
      en: "Set multi-team, multi-quarter direction and make the org's hardest technical bets legible and safe.",
      es: "Fijar dirección multi-equipo y multi-trimestre, y hacer legibles y seguras las apuestas técnicas más difíciles de la organización.",
    },
    scope: { en: "Several teams, a quarter-to-year horizon.", es: "Varios equipos, un horizonte de trimestre a año." },
    proof: {
      en: "You align independent teams on a technical strategy that survives contact with reality.",
      es: "Alineas equipos independientes en una estrategia técnica que sobrevive el contacto con la realidad.",
    },
  },
  L7: {
    level: "L7",
    title: { en: "Principal Engineer", es: "Ingeniero Principal" },
    mandate: {
      en: "Shape org-wide technical strategy and change what the whole engineering organization is capable of.",
      es: "Moldear la estrategia técnica de toda la organización y cambiar lo que toda la ingeniería es capaz de hacer.",
    },
    scope: { en: "The organization; a multi-year arc.", es: "La organización; un arco de varios años." },
    proof: {
      en: "Your work raises the ceiling for everyone, not just delivers one more system.",
      es: "Tu trabajo eleva el techo para todos, no solo entrega un sistema más.",
    },
  },
};

function lessonId(domainId: string, level: Level): string {
  return `${domainId}-${level.toLowerCase()}`;
}

// Build the full climb from Progress. Pure + deterministic.
export function buildClimb(progress: Progress | null): Stage[] {
  const cleared = new Set(progress?.checkpointsCleared ?? []);
  const read = new Set(progress?.conceptsRead ?? []);
  const scores = progress?.checkpointScores ?? {};

  const stages: Stage[] = LEVELS.map((level, index) => {
    const cells: StageDomainCell[] = [];
    for (const dom of ORDERED_DOMAINS) {
      const concepts = conceptsOf(dom.id, level);
      if (concepts.length === 0) continue;
      const chk = checkpointsAfter(dom.id, level);
      cells.push({
        domainId: dom.id,
        axisId: dom.axisId,
        level,
        lessonId: lessonId(dom.id, level),
        concepts: concepts.length,
        conceptsRead: concepts.filter((c) => read.has(c.slug)).length,
        checkpoint: chk,
        checkpointCleared: chk ? cleared.has(chk.id) : false,
        checkpointScore: chk ? scores[chk.id] : undefined,
      });
    }
    const checkpointsTotal = cells.filter((c) => c.checkpoint).length;
    const checkpointsCleared = cells.filter((c) => c.checkpointCleared).length;
    const quorum = Math.min(ASCENT_QUORUM, checkpointsTotal);
    const ascended = checkpointsCleared >= quorum && quorum > 0;
    const conceptsTotal = cells.reduce((a, c) => a + c.concepts, 0);
    const conceptsRead = cells.reduce((a, c) => a + c.conceptsRead, 0);
    const pct = checkpointsTotal ? Math.round((checkpointsCleared / checkpointsTotal) * 100) : 0;
    return {
      level, index, status: "locked" as StageStatus,
      cells, checkpointsTotal, checkpointsCleared, quorum, ascended,
      conceptsTotal, conceptsRead, pct,
    };
  });

  // Status pass: a stage is unlocked once the PRIOR stage has ascended (quorum
  // met). The lowest unlocked, not-yet-ascended stage is "current". Ascended
  // stages are "complete". Everything after the first locked stage is "locked".
  let unlocked = true; // L3 always open
  for (const st of stages) {
    if (!unlocked) { st.status = "locked"; continue; }
    if (st.ascended) { st.status = "complete"; }
    else { st.status = "current"; unlocked = false; } // first non-ascended open stage
  }
  // If every stage ascended, the last one is "complete" and there's no current —
  // mark the top as current-complete is fine; leave as complete.
  // Ensure at least the first non-complete stage is current (handled above).
  return stages;
}

export interface ClimbSummary {
  stages: Stage[];
  currentLevel: Level;
  currentIndex: number;
  nextLevel: Level | null;
  checkpointsToAscend: number;   // how many MORE checkpoints to clear to rise
  totalCheckpointsCleared: number;
  totalCheckpoints: number;
  overallPct: number;
}

export function climbSummary(progress: Progress | null): ClimbSummary {
  const stages = buildClimb(progress);
  const current = stages.find((s) => s.status === "current") ?? stages[stages.length - 1];
  const nextIndex = current.index + 1;
  const nextLevel = nextIndex < LEVELS.length ? LEVELS[nextIndex] : null;
  const checkpointsToAscend = Math.max(0, current.quorum - current.checkpointsCleared);
  const totalCheckpointsCleared = stages.reduce((a, s) => a + s.checkpointsCleared, 0);
  const totalCheckpoints = stages.reduce((a, s) => a + s.checkpointsTotal, 0);
  const overallPct = totalCheckpoints ? Math.round((totalCheckpointsCleared / totalCheckpoints) * 100) : 0;
  return {
    stages,
    currentLevel: current.level,
    currentIndex: current.index,
    nextLevel,
    checkpointsToAscend,
    totalCheckpointsCleared,
    totalCheckpoints,
    overallPct,
  };
}

// The single best next action: the first not-cleared checkpoint's lesson in the
// current stage (prefer a domain the learner has already started), else the
// first lesson of the current stage. Returns a lessonId + context.
export interface NextAction {
  lessonId: string;
  domainId: string;
  axisId: AxisId;
  level: Level;
  reason: "resume" | "start-stage" | "checkpoint" | "done";
}

export function nextAction(progress: Progress | null): NextAction | null {
  const { stages, currentIndex } = climbSummary(progress);
  const stage = stages[currentIndex];
  if (!stage) return null;
  // Prefer an in-progress cell (some concepts read, checkpoint not cleared).
  const started = stage.cells.find((c) => !c.checkpointCleared && c.conceptsRead > 0);
  const firstOpen = stage.cells.find((c) => !c.checkpointCleared);
  const cell = started ?? firstOpen ?? stage.cells[0];
  if (!cell) return null;
  return {
    lessonId: cell.lessonId,
    domainId: cell.domainId,
    axisId: cell.axisId,
    level: cell.level,
    reason: started ? "resume" : "start-stage",
  };
}
