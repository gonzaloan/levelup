// Boss-sprite manifest + license ledger (see src/assets/README.md).
// CC0-ONLY: every third-party art asset must be CC0 / public domain. Until the
// research fleet (Task 9, Phase A) sources curated CC0 sprites into
// src/assets/bosses/, each domain uses an AUTHORED inline-SVG boss placeholder
// (our own art → CC0), so the build is green and bosses render today.
import type { I18nText } from "@/i18n/config";

export interface BossAsset {
  /** Public path OR "" when using the authored inline-SVG fallback. */
  file: string;
  /** Boss name shown on the intro card. */
  name: I18nText;
  /** Boss title / role framing. */
  title: I18nText;
  /** License string — MUST contain "CC0" or "public domain". */
  license: string;
  /** Where the asset came from (URL or "level-up authored"). */
  source: string;
  /** Accent color (DawnBringer) for the boss card. */
  accent: string;
}

// Each domain gets a themed boss. Names are evocative, not cutesy — a Staff-bar
// "final test" framing. Placeholders are authored (CC0); real CC0 sprites land
// via the research fleet, which will set `file` + real `license`/`source`.
export const BOSS_BY_DOMAIN: Record<string, BossAsset> = {
  "technical-depth": {
    file: "/bosses/technical-depth.webp",
    name: { en: "The Complexity Golem", es: "El Gólem de la Complejidad" },
    title: { en: "Guardian of the Deep Stack", es: "Guardián del Stack Profundo" },
    license: "locally generated (Stable Diffusion, project-owned)",
    source: "level-up — dreamshaperXL Lightning",
    accent: "#6dc2ca",
  },
  "systems-architecture": {
    file: "/bosses/systems-architecture.webp",
    name: { en: "The Consistency Hydra", es: "La Hidra de la Consistencia" },
    title: { en: "Keeper of Distributed Truth", es: "Guardiana de la Verdad Distribuida" },
    license: "locally generated (Stable Diffusion, project-owned)",
    source: "level-up — dreamshaperXL Lightning",
    accent: "#597dce",
  },
  "execution-delivery": {
    file: "/bosses/execution-delivery.webp",
    name: { en: "The Deadline Leviathan", es: "El Leviatán del Plazo" },
    title: { en: "Devourer of Slipping Plans", es: "Devorador de Planes que Resbalan" },
    license: "locally generated (Stable Diffusion, project-owned)",
    source: "level-up — dreamshaperXL Lightning",
    accent: "#6daa2c",
  },
  "direction-influence": {
    file: "/bosses/direction-influence.webp",
    name: { en: "The Alignment Sphinx", es: "La Esfinge del Alineamiento" },
    title: { en: "Riddler of Competing Goals", es: "Enigma de Metas en Conflicto" },
    license: "locally generated (Stable Diffusion, project-owned)",
    source: "level-up — dreamshaperXL Lightning",
    accent: "#dad45e",
  },
  "leveling-scope": {
    file: "/bosses/leveling-scope.webp",
    name: { en: "The Scope Wraith", es: "El Espectro del Alcance" },
    title: { en: "Warden of the Ladder", es: "Custodio de la Escalera" },
    license: "locally generated (Stable Diffusion, project-owned)",
    source: "level-up — dreamshaperXL Lightning",
    accent: "#d2aa99",
  },
  "ai-engineering": {
    file: "/bosses/ai-engineering.webp",
    name: { en: "The Hallucination Djinn", es: "El Genio de la Alucinación" },
    title: { en: "Trickster of the Model", es: "Embaucador del Modelo" },
    license: "locally generated (Stable Diffusion, project-owned)",
    source: "level-up — dreamshaperXL Lightning",
    accent: "#d98a5b",
  },
};

const FALLBACK: BossAsset = {
  file: "",
  name: { en: "The Gatekeeper", es: "El Guardián" },
  title: { en: "Final Test", es: "Prueba Final" },
  license: "CC0 (authored placeholder)",
  source: "level-up authored",
  accent: "#dad45e",
};

/** The boss for a domain id, always defined (falls back for unknown ids). */
export function bossFor(domainId: string): BossAsset {
  return BOSS_BY_DOMAIN[domainId] ?? FALLBACK;
}
