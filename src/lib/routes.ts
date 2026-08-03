// Routes — two independent progressions, and a shared layer that is not a ladder.
//
// WHY THIS MODULE EXISTS
// `curriculum.json` uses ONE axis, L3→L7, across seven domains that mean different
// things by it. For `ai-engineering`, L5 means depth in AI systems. For
// `leveling-scope` and `direction-influence`, L5 means organizational scope. And
// `climb.ts` gates ascent on clearing 4 of 7 domain checkpoints at a level — so a
// learner cannot reach "L6 AI" without also demonstrating L5-band *influence*, and
// cannot progress in influence without L5-band storage engines.
//
// A person can be a Staff Engineer and a beginner at RAG. A person can design
// excellent AI systems without Principal scope. The single-ladder model asserts
// those move together and the ascent gate enforces it. This module separates them.
//
// THE INVARIANT THIS MODULE EXISTS TO HOLD
// A learner's position on one route is INDEPENDENT of their position on the other.
// Clearing every AI checkpoint must not move the Staff stage, and vice versa. That
// is asserted directly in `tests/routes.test.ts`, because it is the whole point and
// it is easy to lose by accident.
//
// SHARED FOUNDATIONS IS NOT A THIRD ROUTE. It has depth TIERS, and no gate. You are
// pulled into it by a module's prerequisites, not marched up it — you can be at F3
// for reliability and F1 for data. Making foundations a ladder would reintroduce the
// single-axis mistake one level down.
import { LEVELS, type Level, type AxisId } from "./axes";
import { ORDERED_DOMAINS, checkpointsAfter, conceptsOf, CONCEPT_BY_SLUG } from "./curriculum";
import type { Progress } from "./store";
import type { I18nText } from "@/i18n/config";
import type { Checkpoint } from "./types";

export type RouteId = "ai-architect" | "staff-engineer" | "shared-foundations";

/**
 * Which route owns each domain.
 *
 * THIS IS THE SOURCE OF TRUTH, and `tools/inventory.cjs` carries a copy for the
 * build-time audit (a .cjs script cannot import TypeScript). `tests/routes.test.ts`
 * asserts the two agree, so the copy cannot drift — the alternative was one of them
 * silently becoming wrong, which is the exact failure mode that made adding a 7th
 * domain break five places.
 *
 * A domain missing from this map is a THROW, not a default. The project's rule is
 * "never hardcode a domain id or a count"; the corollary is that a new domain must
 * be placed deliberately rather than landing wherever a fallback puts it.
 */
export const ROUTE_OF_DOMAIN: Record<string, RouteId> = {
  "ai-engineering": "ai-architect",
  "cloud-platform": "shared-foundations",
  "systems-architecture": "shared-foundations",
  "technical-depth": "shared-foundations",
  "execution-delivery": "staff-engineer",
  "direction-influence": "staff-engineer",
  "leveling-scope": "staff-engineer",
};

export function routeOfDomain(domainId: string): RouteId {
  const r = ROUTE_OF_DOMAIN[domainId];
  if (!r) {
    throw new Error(
      `domain "${domainId}" has no route. Add it to ROUTE_OF_DOMAIN in src/lib/routes.ts ` +
      `(and to the copy in tools/inventory.cjs) rather than letting a default decide.`,
    );
  }
  return r;
}

/**
 * Route-local stage ids per spine level.
 *
 * AI Architect stages are CAPABILITY bands. Staff Engineer stages are SCOPE bands.
 * Shared Foundations collapses five levels into three tiers, because the difference
 * between an L3 and an L4 treatment of Big-O is depth, and three tiers is as fine as
 * that distinction can honestly be drawn.
 */
export const STAGE_OF: Record<RouteId, Record<Level, string>> = {
  "ai-architect": { L3: "A1", L4: "A2", L5: "A3", L6: "A4", L7: "A5" },
  "staff-engineer": { L3: "S1", L4: "S2", L5: "S3", L6: "S4", L7: "S5" },
  "shared-foundations": { L3: "F1", L4: "F1", L5: "F2", L6: "F3", L7: "F3" },
};

// ── Authored route and stage copy ────────────────────────────────────────────

export interface RouteMeta {
  id: RouteId;
  name: I18nText;
  /** What the progression MEASURES. The sentence that keeps the axes separate. */
  measures: I18nText;
  /** Who should walk it, in one line a reader can self-select against. */
  forWhom: I18nText;
  /** True for a ladder you climb; false for a layer you are pulled into. */
  laddered: boolean;
}

export const ROUTES: RouteMeta[] = [
  {
    id: "ai-architect",
    name: { en: "AI Architect", es: "Arquitecto de IA" },
    measures: {
      en: "What you can build and diagnose. Nothing about headcount, scope or title.",
      es: "Lo que puedes construir y diagnosticar. Nada sobre headcount, alcance ni cargo.",
    },
    forWhom: {
      en: "You ship features on top of models and want to be the person who can say why one broke.",
      es: "Entregas funcionalidades sobre modelos y quieres ser quien pueda explicar por qué una falló.",
    },
    laddered: true,
  },
  {
    id: "staff-engineer",
    name: { en: "Staff Engineer", es: "Ingeniero Staff" },
    measures: {
      en: "How far your effect reaches. Nothing about which technologies you know.",
      es: "Hasta dónde llega tu efecto. Nada sobre qué tecnologías conoces.",
    },
    forWhom: {
      en: "Your code is not the constraint any more; the decisions around it are.",
      es: "Tu código ya no es la restricción; las decisiones a su alrededor lo son.",
    },
    laddered: true,
  },
  {
    id: "shared-foundations",
    name: { en: "Shared Foundations", es: "Fundamentos Compartidos" },
    measures: {
      en: "Depth in the mechanics both routes stand on. Pulled from, not climbed.",
      es: "Profundidad en los fundamentos sobre los que se apoyan ambas rutas. Se consulta, no se escala.",
    },
    forWhom: {
      en: "Every learner, at whatever depth the module they are in actually requires.",
      es: "Toda persona, a la profundidad que exija de verdad el módulo en que está.",
    },
    laddered: false,
  },
];

export const ROUTE_BY_ID = new Map(ROUTES.map((r) => [r.id, r]));

export interface StageMeta {
  id: string;
  route: RouteId;
  level: Level;
  name: I18nText;
  /** The capability or scope that DEFINES this stage — the observable bar. */
  defines: I18nText;
}

/**
 * Stage names and bars.
 *
 * The AI names come from the transformation spec's section 5.2. The Staff names
 * reuse `LEVEL_MANDATE` in `climb.ts`, which already carries authored, reviewed copy
 * for exactly these five rungs — duplicating it would guarantee the two drift.
 */
export const STAGES: StageMeta[] = [
  {
    id: "A1", route: "ai-architect", level: "L3",
    name: { en: "Foundations", es: "Fundamentos" },
    defines: {
      en: "Model behaviour is probabilistic; you can write prompts and structured outputs, recognise context limits, and state success criteria.",
      es: "El comportamiento del modelo es probabilístico; sabes escribir prompts y salidas estructuradas, reconocer límites de contexto y enunciar criterios de éxito.",
    },
  },
  {
    id: "A2", route: "ai-architect", level: "L4",
    name: { en: "Production AI", es: "IA en Producción" },
    defines: {
      en: "You can run eval-driven development, design a RAG system, use tool calling, and operate a live AI feature against cost and latency budgets.",
      es: "Puedes hacer desarrollo guiado por evaluaciones, diseñar un sistema RAG, usar tool calling y operar una funcionalidad de IA en vivo contra presupuestos de costo y latencia.",
    },
  },
  {
    id: "A3", route: "ai-architect", level: "L5",
    name: { en: "AI Systems", es: "Sistemas de IA" },
    defines: {
      en: "You can design agent loops and tool orchestration, decide about fine-tuning, and make a multi-step system reliable.",
      es: "Puedes diseñar ciclos de agente y orquestación de tools, decidir sobre fine-tuning y hacer confiable un sistema de varios pasos.",
    },
  },
  {
    id: "A4", route: "ai-architect", level: "L6",
    name: { en: "AI Platform", es: "Plataforma de IA" },
    defines: {
      en: "You can build shared AI services others depend on: gateways, routing, eval infrastructure, governance, and unit economics.",
      es: "Puedes construir servicios de IA compartidos de los que otros dependen: gateways, routing, infraestructura de evaluación, gobernanza y economía unitaria.",
    },
  },
  {
    id: "A5", route: "ai-architect", level: "L7",
    name: { en: "AI Strategy", es: "Estrategia de IA" },
    defines: {
      en: "You can set model portfolio strategy, decide build versus buy, and hold a capability roadmap against a moving frontier.",
      es: "Puedes fijar la estrategia de portafolio de modelos, decidir construir o comprar y sostener un roadmap de capacidades contra una frontera en movimiento.",
    },
  },
  {
    id: "S1", route: "staff-engineer", level: "L3",
    name: { en: "Developing Engineer", es: "Ingeniero en Desarrollo" },
    defines: {
      en: "Local ownership and reliable execution: a well-scoped task, done correctly, communicated inside the team.",
      es: "Propiedad local y ejecución confiable: una tarea bien acotada, hecha bien y comunicada dentro del equipo.",
    },
  },
  {
    id: "S2", route: "staff-engineer", level: "L4",
    name: { en: "Senior Engineer", es: "Ingeniero Senior" },
    defines: {
      en: "You own a feature or system end to end, state its tradeoffs, and mentor inside your team.",
      es: "Eres dueño de una funcionalidad o sistema de extremo a extremo, enuncias sus compensaciones y haces mentoría dentro de tu equipo.",
    },
  },
  {
    id: "S3", route: "staff-engineer", level: "L5",
    name: { en: "Staff Threshold", es: "Umbral Staff" },
    defines: {
      en: "You take on ambiguous problems and move decisions across team lines — direction without authority.",
      es: "Tomas problemas ambiguos y mueves decisiones entre equipos: dirección sin autoridad.",
    },
  },
  {
    id: "S4", route: "staff-engineer", level: "L6",
    name: { en: "Staff Engineer", es: "Ingeniero Staff" },
    defines: {
      en: "Multi-team scope: you set technical strategy, remove organizational bottlenecks, and multiply other people.",
      es: "Alcance multi-equipo: fijas estrategia técnica, quitas cuellos de botella organizacionales y multiplicas a otras personas.",
    },
  },
  {
    id: "S5", route: "staff-engineer", level: "L7",
    name: { en: "Principal Engineer", es: "Ingeniero Principal" },
    defines: {
      en: "Organizational direction: portfolio thinking, long-term architecture, and the standards everyone inherits.",
      es: "Dirección organizacional: pensar en portafolio, arquitectura de largo plazo y los estándares que todos heredan.",
    },
  },
  {
    id: "F1", route: "shared-foundations", level: "L3",
    name: { en: "Mechanics", es: "Mecánica" },
    defines: {
      en: "How the primitives behave: complexity, memory, transactions, indexes, the shape of a request.",
      es: "Cómo se comportan los fundamentos: complejidad, memoria, transacciones, índices, la forma de un request.",
    },
  },
  {
    id: "F2", route: "shared-foundations", level: "L5",
    name: { en: "Systems", es: "Sistemas" },
    defines: {
      en: "How the primitives compose and fail together: consistency, queues, backpressure, blast radius.",
      es: "Cómo se componen y fallan juntos: consistencia, colas, backpressure, radio de impacto.",
    },
  },
  {
    id: "F3", route: "shared-foundations", level: "L7",
    name: { en: "Organizational consequence", es: "Consecuencia organizacional" },
    defines: {
      en: "What these mechanics cost an organization, and which of them become standards.",
      es: "Qué le cuestan estos fundamentos a una organización y cuáles se vuelven estándares.",
    },
  },
];

export const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

/** The stage id a (domain, level) pair belongs to. */
export function stageIdFor(domainId: string, level: Level): string {
  return STAGE_OF[routeOfDomain(domainId)][level];
}

/** Domains owned by a route, in the spine's own order. */
export function domainsOfRoute(route: RouteId): typeof ORDERED_DOMAINS {
  return ORDERED_DOMAINS.filter((d) => routeOfDomain(d.id) === route);
}

// ── Route progress ───────────────────────────────────────────────────────────

export interface RouteStageCell {
  domainId: string;
  axisId: AxisId;
  level: Level;
  lessonId: string;
  concepts: number;
  conceptsRead: number;
  checkpoint?: Checkpoint;
  checkpointCleared: boolean;
  checkpointScore?: number;
}

export interface RouteStage {
  id: string;
  route: RouteId;
  /** Spine levels folded into this stage. Always one for a ladder; up to two for a tier. */
  levels: Level[];
  index: number;
  status: "complete" | "current" | "available" | "locked";
  cells: RouteStageCell[];
  checkpointsTotal: number;
  checkpointsCleared: number;
  /** Checkpoints needed to ascend. 0 for an unladdered route — a tier has no gate. */
  required: number;
  ascended: boolean;
  conceptsTotal: number;
  conceptsRead: number;
  pct: number;
}

const lessonIdOf = (domainId: string, level: Level) => `${domainId}-${level.toLowerCase()}`;

/**
 * Build one route's progression from Progress.
 *
 * THE ASCENT RULE, and why it differs from `climb.ts`:
 *
 * `climb.ts` requires a QUORUM across domains — 4 of 7 — which is what couples the
 * two ladders. Here a stage requires EVERY checkpoint the route owns at that stage,
 * because a route owns two or three domains rather than seven, so "all of them" is a
 * comparable bar to "4 of 7" and it needs no magic number. It also means the gate
 * only ever reads checkpoints from ONE route, which is what makes the two positions
 * independent.
 *
 * Shared Foundations has `required: 0` and every tier `available`: it is pulled from
 * by a module's prerequisites, not climbed.
 */
export function buildRoute(route: RouteId, progress: Progress | null): RouteStage[] {
  const cleared = new Set(progress?.checkpointsCleared ?? []);
  const read = new Set(progress?.conceptsRead ?? []);
  const scores = progress?.checkpointScores ?? {};
  const laddered = ROUTE_BY_ID.get(route)?.laddered ?? true;
  const domains = domainsOfRoute(route);

  // Stage ids in ladder order, deduped — a tier can fold two levels.
  const order: string[] = [];
  for (const level of LEVELS) {
    const id = STAGE_OF[route][level];
    if (!order.includes(id)) order.push(id);
  }

  const stages: RouteStage[] = order.map((id, index) => {
    const levels = LEVELS.filter((l) => STAGE_OF[route][l] === id);
    const cells: RouteStageCell[] = [];
    for (const level of levels) {
      for (const dom of domains) {
        const concepts = conceptsOf(dom.id, level);
        if (concepts.length === 0) continue;
        const chk = checkpointsAfter(dom.id, level);
        cells.push({
          domainId: dom.id,
          axisId: dom.axisId,
          level,
          lessonId: lessonIdOf(dom.id, level),
          concepts: concepts.length,
          conceptsRead: concepts.filter((c) => read.has(c.slug)).length,
          checkpoint: chk,
          checkpointCleared: chk ? cleared.has(chk.id) : false,
          checkpointScore: chk ? scores[chk.id] : undefined,
        });
      }
    }
    const checkpointsTotal = cells.filter((c) => c.checkpoint).length;
    const checkpointsCleared = cells.filter((c) => c.checkpointCleared).length;
    const required = laddered ? checkpointsTotal : 0;
    const ascended = laddered ? checkpointsTotal > 0 && checkpointsCleared >= required : true;
    const conceptsTotal = cells.reduce((a, c) => a + c.concepts, 0);
    const conceptsRead = cells.reduce((a, c) => a + c.conceptsRead, 0);
    return {
      id, route, levels, index,
      status: "locked" as RouteStage["status"],
      cells, checkpointsTotal, checkpointsCleared, required, ascended,
      conceptsTotal, conceptsRead,
      pct: checkpointsTotal ? Math.round((checkpointsCleared / checkpointsTotal) * 100) : 0,
    };
  });

  if (!laddered) {
    // A tier is never locked. There is nothing to ascend, so nothing to gate.
    for (const st of stages) st.status = "available";
    return stages;
  }

  let unlocked = true;
  for (const st of stages) {
    if (!unlocked) { st.status = "locked"; continue; }
    if (st.ascended) { st.status = "complete"; }
    else { st.status = "current"; unlocked = false; }
  }
  return stages;
}

export interface RouteSummary {
  route: RouteId;
  stages: RouteStage[];
  currentStageId: string;
  currentIndex: number;
  nextStageId: string | null;
  checkpointsToAscend: number;
  checkpointsCleared: number;
  checkpointsTotal: number;
  pct: number;
}

export function routeSummary(route: RouteId, progress: Progress | null): RouteSummary {
  const stages = buildRoute(route, progress);
  const current = stages.find((s) => s.status === "current") ?? stages[stages.length - 1];
  const nextIndex = current.index + 1;
  const cleared = stages.reduce((a, s) => a + s.checkpointsCleared, 0);
  const total = stages.reduce((a, s) => a + s.checkpointsTotal, 0);
  return {
    route,
    stages,
    currentStageId: current.id,
    currentIndex: current.index,
    nextStageId: nextIndex < stages.length ? stages[nextIndex].id : null,
    checkpointsToAscend: Math.max(0, current.required - current.checkpointsCleared),
    checkpointsCleared: cleared,
    checkpointsTotal: total,
    pct: total ? Math.round((cleared / total) * 100) : 0,
  };
}

/**
 * Which Shared Foundations concepts a set of concepts leans on.
 *
 * This is what makes the shared layer a LAYER rather than a ladder: a module names
 * the foundations it needs and they are surfaced there, instead of the learner being
 * marched up a third ladder to reach them.
 *
 * Reads `leansOn`, not `prerequisites`. The spine authors prerequisites per domain
 * (212 within-domain edges, 0 cross-domain), and it has to: `daily.ts` will not serve
 * a concept until every prerequisite is read, so a cross-route prerequisite would
 * force every AI learner through the systems domain — the coupling the route split
 * removes. `leansOn` is advisory, and it walks the within-domain prerequisite closure
 * too, so a foundation named by a concept's own prerequisite still surfaces.
 */
export function foundationsFor(slugs: readonly string[]): string[] {
  const out = new Set<string>();
  const seen = new Set<string>();
  const queue = [...slugs];
  while (queue.length) {
    const slug = queue.pop()!;
    if (seen.has(slug)) continue;
    seen.add(slug);
    const ctx = CONCEPT_BY_SLUG.get(slug);
    if (!ctx) continue;
    // Advisory cross-route edges — the section 5.3 mechanism.
    for (const lean of ctx.concept.leansOn ?? []) {
      const lctx = CONCEPT_BY_SLUG.get(lean);
      if (lctx && routeOfDomain(lctx.domainId) === "shared-foundations") out.add(lean);
    }
    // Walk the within-domain closure as well: a prerequisite may itself lean out.
    for (const pre of ctx.concept.prerequisites ?? []) {
      queue.push(pre);
      const pctx = CONCEPT_BY_SLUG.get(pre);
      if (pctx && routeOfDomain(pctx.domainId) === "shared-foundations") out.add(pre);
    }
  }
  return [...out].sort();
}

/** The foundations one concept leans on, for surfacing on its lesson pane. */
export function foundationsForConcept(slug: string): string[] {
  return foundationsFor([slug]);
}
