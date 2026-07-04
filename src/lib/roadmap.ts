// Deterministic roadmap generator (no LLM required to COMPUTE it; an LLM may
// narrate later). Leads with the weakest 1–2 axes framed as highest-leverage.
// The differentiated hero (§A5): for each weak axis, name the ONE behavioral
// delta to the next level — not a spider shape, not a grade.
import type { AxisId, Band } from "./axes";
import { AXIS_BY_ID } from "./axes";
import type { AssessmentResult, Item, Module } from "./types";
import type { I18nText } from "@/i18n/config";

export interface RoadmapStep {
  axis: AxisId;
  band: Band;
  headline: I18nText;         // "The one behavior between you and L5"
  behavioralDelta: I18nText;  // the concrete next-level behavior
  misconceptions: { slug: string; rationale: I18nText; resource?: string }[];
  modules: string[];          // module ids to study, in order
  leverage: "highest" | "high" | "maintain";
}

export interface Roadmap {
  steps: RoadmapStep[];
  summary: I18nText;
}

/**
 * The single behavioral delta per axis+band — the honest, actionable insight.
 * Keyed to the amendments' behavioral anchors. Authored, bilingual.
 */
const BEHAVIORAL_DELTA: Record<AxisId, Partial<Record<Band, I18nText>>> = {
  1: {
    developing: { en: "You apply named patterns, but not yet by cost. Start choosing the weakest consistency model that still holds your invariant, and be able to say why.", es: "Aplicas patrones con nombre, pero aún no por su costo. Empieza a elegir el modelo de consistencia más débil que aún sostiene tu invariante, y sabe explicar por qué." },
    solid: { en: "You reason about tradeoffs deliberately. The next move is to design the failure behavior first (thundering herd, dual-write, cache addiction), not the happy path.", es: "Razonas sobre compromisos deliberadamente. El siguiente paso es diseñar primero el comportamiento ante fallos (estampida, doble escritura, adicción a caché), no el camino feliz." },
    strong: { en: "Your depth is real. The way you compound it now is to become the person others escalate their hardest failure-surface problems to, and to write down the reasoning so it scales past you.", es: "Tu profundidad es real. La forma de multiplicarla ahora es volverte la persona a quien otros escalan sus problemas de fallo más difíciles, y dejar el razonamiento escrito para que escale más allá de ti." },
  },
  2: {
    developing: { en: "You can build to spec. The next move is to surface the alternatives and the non-goals before you design; the Microservice Premium is a choice, not a default.", es: "Puedes construir según especificación. El siguiente paso es exponer las alternativas y los no-objetivos antes de diseñar; el 'Microservice Premium' es una elección, no un default." },
    solid: { en: "You weigh alternatives. The next move is to frame architecture as reversible-decision economics and refuse patterns when contraindicated, like CQRS outside a bounded context.", es: "Sopesas alternativas. El siguiente paso es encuadrar la arquitectura como economía de decisiones reversibles y rechazar patrones cuando están contraindicados, como CQRS fuera de un contexto acotado." },
    strong: { en: "Your judgment holds under pressure. Consolidate it by setting the reference designs a domain reuses, so your restraint becomes the team's default instead of a lucky exception.", es: "Tu criterio se sostiene bajo presión. Consolídalo fijando los diseños de referencia que reutiliza un dominio, para que tu contención sea el default del equipo y no una excepción con suerte." },
  },
  3: {
    developing: { en: "You ship when asked. The next move is to write SLOs backward from a real user journey, in percentiles, and treat code review as design rather than typo-hunting.", es: "Entregas cuando te lo piden. El siguiente paso es escribir SLOs hacia atrás desde un recorrido de usuario real, en percentiles, y tratar la revisión de código como diseño, no como cacería de erratas." },
    solid: { en: "You practice trunk-based delivery. The next move is to run the error-budget loop as the release throttle, and harden the 30% AI can't judge: the security hole, the p99 cliff.", es: "Practicas entrega trunk-based. El siguiente paso es usar el presupuesto de error como acelerador de releases, y endurecer el 30% que la IA no puede juzgar: el hueco de seguridad, el acantilado p99." },
    strong: { en: "Your delivery is solid. Push it outward: set the reliability standards and review bar that move the whole org's DORA outcomes, not just your own team's.", es: "Tu entrega es sólida. Llévala hacia afuera: fija los estándares de fiabilidad y el listón de revisión que mueven los resultados DORA de toda la organización, no solo los de tu equipo." },
  },
  4: {
    developing: { en: "Your opinions live in chat. The next move is to write the design doc with a real Alternatives-Considered and Non-Goals section, and disagree-and-commit in the open.", es: "Tus opiniones viven en el chat. El siguiente paso es escribir el design doc con una sección real de Alternativas-Consideradas y No-Objetivos, y disentir-y-comprometerte en público." },
    solid: { en: "You write docs when required. The next move is influence without authority: 'yes, if' instead of a gate-keeping 'no', earning your way into the room by favoring understanding over winning.", es: "Escribes docs cuando se requiere. El siguiente paso es influir sin autoridad: 'sí, si' en vez de un 'no' que bloquea, ganándote la entrada a la sala por priorizar entender sobre ganar." },
    strong: { en: "You already shape decisions. Consolidate it by setting multi-team technical direction and holding an unpopular call when the evidence is on your side.", es: "Ya das forma a las decisiones. Consolídalo fijando dirección técnica entre varios equipos y sosteniendo una decisión impopular cuando la evidencia está de tu lado." },
  },
  5: {
    developing: { en: "You mentor reactively. The next move is to do glue work strategically and keep it visible, and to start sponsoring, not just advising, one person.", es: "Mentoras de forma reactiva. El siguiente paso es hacer el trabajo de pegamento estratégicamente y mantenerlo visible, y empezar a apadrinar, no solo aconsejar, a una persona." },
    solid: { en: "You mentor deliberately. The next move is to sponsor: spend your own capital. Hand off the stretch work, amplify others in rooms they're not in, and cite their work to the groups that decide.", es: "Mentoras deliberadamente. El siguiente paso es apadrinar: gasta tu propio capital. Delega el trabajo de crecimiento, amplifica a otros en salas donde no están, y cita su trabajo ante los grupos que deciden." },
    strong: { en: "You grow the people around you. Scale it: make talent development a primary output, so the team's capability outlasts any single project you touch.", es: "Haces crecer a la gente a tu alrededor. Escálalo: haz del desarrollo de talento un resultado primario, para que la capacidad del equipo sobreviva a cualquier proyecto que toques." },
  },
  6: {
    developing: { en: "You call the model APIs, but you trust the output on vibes. The next move is to make evals the spine: turn real failure traces into a golden set, gate deploys on it, and treat 'it looks good' as the smell it is.", es: "Llamas a las APIs del modelo, pero confías en la salida por intuición. El siguiente paso es hacer de los evals la columna: convierte trazas de fallo reales en un golden set, condiciona los deploys a él, y trata el 'se ve bien' por lo que es: un olor a problema." },
    solid: { en: "You build evals and ship AI features. The next move is to own the hard parts: indirect prompt injection across your tool surface, cost-per-successful-task as a real budget, and choosing the least agency the problem needs instead of reaching for multi-agent.", es: "Construyes evals y entregas features de IA. El siguiente paso es adueñarte de lo difícil: inyección de prompts indirecta en tu superficie de herramientas, el costo por tarea exitosa como presupuesto real, y elegir la mínima autonomía que el problema necesita en vez de saltar a multi-agente." },
    strong: { en: "Your production AI judgment is real. Scale it: set the eval-as-migration-contract standard and the LLM threat model the whole org builds against, so safe shipping stops depending on you being in the review.", es: "Tu criterio de IA en producción es real. Escálalo: fija el estándar de eval-como-contrato-de-migración y el modelo de amenazas de LLM contra el que construye toda la organización, para que entregar de forma segura deje de depender de que estés en la revisión." },
  },
};

function nextLevelLabel(band: Band): string {
  return band === "developing" ? "L5" : band === "solid" ? "L5" : "L6";
}

export function generateRoadmap(
  result: AssessmentResult,
  itemsById: Map<string, Item>,
  modules: Module[]
): Roadmap {
  const sorted = [...result.axes].sort((a, b) => a.composite - b.composite);
  const weakestIds = new Set(result.weakest);

  const steps: RoadmapStep[] = sorted.map((ar) => {
    // A "Strong" axis is never highest-leverage growth — it's a maintain/scale.
    // Highest leverage = one of the weakest axes AND not already Strong.
    const leverage: RoadmapStep["leverage"] =
      ar.band === "strong"
        ? "maintain"
        : weakestIds.has(ar.axis)
          ? "highest"
          : "high";
    const delta =
      BEHAVIORAL_DELTA[ar.axis][ar.band] ??
      BEHAVIORAL_DELTA[ar.axis].solid ??
      { en: "Keep compounding this axis.", es: "Sigue acumulando en este eje." };

    const axisName = AXIS_BY_ID[ar.axis].name;
    const lvl = nextLevelLabel(ar.band);
    // Headline framing depends on band: growth for developing/solid, scale for strong.
    const headline: I18nText =
      ar.band === "strong"
        ? { en: `${axisName.en}: strong — now make it scale`, es: `${axisName.es}: fuerte — ahora hazlo escalar` }
        : { en: `${axisName.en}: the one behavior between you and ${lvl}`, es: `${axisName.es}: el comportamiento que te separa de ${lvl}` };

    // Misconceptions first (confident-wrong = highest signal), then modules.
    const misconceptions = ar.topMisconceptions.map((slug) => {
      const item = [...itemsById.values()].find((i) =>
        i.options.some((o) => o.misconception === slug)
      );
      const opt = item?.options.find((o) => o.misconception === slug);
      return {
        slug,
        rationale: opt?.rationale ?? { en: "", es: "" },
        resource: opt?.resource,
      };
    });

    const mods = modules
      .filter((mo) => mo.axis.primary === ar.axis || mo.axis.secondary === ar.axis)
      .sort((a, b) => a.order - b.order)
      .map((mo) => mo.id);

    return {
      axis: ar.axis,
      band: ar.band,
      headline,
      behavioralDelta: delta,
      misconceptions,
      modules: mods,
      leverage,
    };
  });

  const weakNames = result.weakest.map((id) => AXIS_BY_ID[id].name);
  const summary: I18nText = {
    en: `Start with ${weakNames.map((n) => n.en).join(" and ")}. That's where the next level is decided — not where you're already strong.`,
    es: `Empieza por ${weakNames.map((n) => n.es).join(" y ")}. Ahí se decide el siguiente nivel — no donde ya eres fuerte.`,
  };

  return { steps, summary };
}
