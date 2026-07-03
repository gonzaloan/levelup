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
    developing: { en: "You apply named patterns, but not yet by cost. Start choosing the weakest consistency model that still holds your invariant — and be able to say why.", es: "Aplicas patrones con nombre, pero aún no por su costo. Empieza a elegir el modelo de consistencia más débil que aún sostiene tu invariante — y sabe explicar por qué." },
    solid: { en: "You reason about tradeoffs deliberately. The L5 move: design the failure behavior first (thundering herd, dual-write, cache addiction), not the happy path.", es: "Razonas sobre compromisos deliberadamente. El salto a L5: diseña primero el comportamiento ante fallos (estampida, doble escritura, adicción a caché), no el camino feliz." },
  },
  2: {
    developing: { en: "You can build to spec. The next behavior: surface the alternatives and the non-goals before you design — the Microservice Premium is a choice, not a default.", es: "Puedes construir según especificación. El siguiente comportamiento: expón las alternativas y los no-objetivos antes de diseñar — el 'Microservice Premium' es una elección, no un default." },
    solid: { en: "You weigh alternatives. The L5 move: frame architecture as reversible-decision economics and refuse patterns when contraindicated — CQRS outside a bounded context, for instance.", es: "Sopesas alternativas. El salto a L5: encuadra la arquitectura como economía de decisiones reversibles y rechaza patrones cuando están contraindicados — CQRS fuera de un contexto acotado, por ejemplo." },
  },
  3: {
    developing: { en: "You ship when asked. The next behavior: write SLOs backward from a real user journey, in percentiles, and treat code review as design — not typos.", es: "Entregas cuando te lo piden. El siguiente comportamiento: escribe SLOs hacia atrás desde un recorrido de usuario real, en percentiles, y trata la revisión de código como diseño — no como ortografía." },
    solid: { en: "You practice trunk-based delivery. The L5 move: run the error-budget control loop as the release throttle, and harden the 30% AI can't judge — the security hole, the p99 cliff.", es: "Practicas entrega trunk-based. El salto a L5: usa el presupuesto de error como acelerador de releases, y endurece el 30% que la IA no puede juzgar — el hueco de seguridad, el acantilado p99." },
  },
  4: {
    developing: { en: "Your opinions live in Slack. The next behavior: write the design doc with a real Alternatives-Considered and Non-Goals section, and disagree-and-commit in the open.", es: "Tus opiniones viven en Slack. El siguiente comportamiento: escribe el design doc con una sección real de Alternativas-Consideradas y No-Objetivos, y disiente-y-comprométete en público." },
    solid: { en: "You write docs when required. The L5 move: influence without authority — 'yes, if' instead of gate-keeping 'no', and get pulled into the room by being the person who favors understanding over winning.", es: "Escribes docs cuando se requiere. El salto a L5: influye sin autoridad — 'sí, si' en vez de un 'no' que bloquea, y te llaman a la sala por ser quien prioriza entender sobre ganar." },
  },
  5: {
    developing: { en: "You mentor reactively. The next behavior: do glue work strategically and keep it visible — and start sponsoring, not just advising, one person.", es: "Mentoras de forma reactiva. El siguiente comportamiento: haz el trabajo de pegamento estratégicamente y mantenlo visible — y empieza a apadrinar, no solo aconsejar, a una persona." },
    solid: { en: "You mentor deliberately. The L5 move: sponsor — spend your own capital. Hand off the stretch work, amplify others in rooms they're not in, and cite their work to the groups that decide.", es: "Mentoras deliberadamente. El salto a L5: apadrina — gasta tu propio capital. Delega el trabajo de crecimiento, amplifica a otros en salas donde no están, y cita su trabajo ante los grupos que deciden." },
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
    const leverage: RoadmapStep["leverage"] = weakestIds.has(ar.axis)
      ? "highest"
      : ar.band === "strong"
        ? "maintain"
        : "high";
    const delta =
      BEHAVIORAL_DELTA[ar.axis][ar.band] ??
      BEHAVIORAL_DELTA[ar.axis].solid ??
      { en: "Keep compounding this axis.", es: "Sigue acumulando en este eje." };

    const axisName = AXIS_BY_ID[ar.axis].name;
    const lvl = nextLevelLabel(ar.band);
    const headline: I18nText = {
      en: `${axisName.en}: the one behavior between you and ${lvl}`,
      es: `${axisName.es}: el único comportamiento entre tú y ${lvl}`,
    };

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
