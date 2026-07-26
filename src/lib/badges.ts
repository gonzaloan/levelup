// Achievement / badge system. Badges are DERIVED from Progress by a pure
// function (no new persistence needed) — SDT-safe: they mark real competence
// milestones (clearing checkpoints, mastering a domain, an honest gauntlet
// cold-read), never a quota or a login streak. Each Achievement maps 1:1 to a
// real milestone and carries an Open-Badges-3.0-shaped export (unsigned — a
// static app holds no signing key, so we never claim cryptographic verifiability).
import type { Progress } from "./store";
import type { I18nText } from "@/i18n/config";
import { CHECKPOINTS, ORDERED_DOMAINS } from "./curriculum";
import { AXIS_BY_ID, LEVELS, type Level } from "./axes";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";
export type BadgeCategory = "milestone" | "domain" | "level" | "track";

export interface Achievement {
  id: string;
  category: BadgeCategory;
  name: I18nText;
  description: I18nText;   // what it recognizes
  criteria: I18nText;      // how it's earned (the OB "criteria.narrative")
  tier: BadgeTier;
  accent: string;         // DawnBringer-ish accent for the art frame
  /** public art path once generated; falls back to an authored SVG emblem. */
  art?: string;
  /** pure predicate over progress */
  earned: (p: Progress) => boolean;
}

export interface EarnedBadge {
  achievement: Achievement;
  earned: boolean;
}

const DOMAIN_ACCENT: Record<string, string> = {
  "technical-depth": "#6dc2ca", "systems-architecture": "#597dce",
  "execution-delivery": "#6daa2c", "direction-influence": "#dad45e",
  "leveling-scope": "#d2aa99", "ai-engineering": "#d98a5b",
  "cloud-platform": "#e8a33d",
};

// helper predicates over the curriculum
function domainCheckpointIds(domainId: string): string[] {
  return CHECKPOINTS.filter((c) => c.domainId === domainId).map((c) => c.id);
}
function levelCheckpointIds(level: Level): string[] {
  return CHECKPOINTS.filter((c) => c.afterLevel === level).map((c) => c.id);
}
function clearedAll(p: Progress, ids: string[]): boolean {
  const done = new Set(p.checkpointsCleared);
  return ids.length > 0 && ids.every((id) => done.has(id));
}

// ── The catalog ──────────────────────────────────────────────────────────
export const ACHIEVEMENTS: Achievement[] = [
  // Milestones
  {
    id: "first-checkpoint", category: "milestone", tier: "bronze", accent: "#dad45e",
    name: { en: "First Checkpoint", es: "Primer Punto de Control" },
    description: { en: "Cleared your first checkpoint at the mastery gate.", es: "Superaste tu primer punto de control en el umbral de dominio." },
    criteria: { en: "Clear any one checkpoint at the mastery gate.", es: "Supera cualquier punto de control en el umbral de dominio." },
    earned: (p) => p.checkpointsCleared.length >= 1,
  },
  {
    id: "gauntlet-coldread", category: "milestone", tier: "gold", accent: "#d04648",
    name: { en: "Red Team", es: "Equipo Rojo" },
    description: { en: "Passed the 30% Gauntlet on a cold read.", es: "Pasaste el Desafío 30% a ciegas." },
    criteria: { en: "Score ≥ 70% on your first (cold-read) Gauntlet attempt.", es: "Obtén ≥ 70% en tu primer intento (a ciegas) del Desafío." },
    earned: (p) => Object.values(p.gauntlets).some((g) => (g.firstScore ?? 0) >= 0.7),
  },
  {
    id: "ten-concepts", category: "milestone", tier: "bronze", accent: "#6dc2ca",
    name: { en: "Ten Concepts Studied", es: "Diez Conceptos Estudiados" },
    description: { en: "Worked through ten curriculum concepts — a study habit taking hold.", es: "Recorriste diez conceptos del temario — un hábito de estudio que se afianza." },
    criteria: { en: "Read ten curriculum concepts. (Study progress, not a mastery gate.)", es: "Lee diez conceptos del temario. (Progreso de estudio, no un umbral de dominio.)" },
    earned: (p) => p.conceptsRead.length >= 10,
  },
  {
    id: "half-climb", category: "milestone", tier: "silver", accent: "#597dce",
    name: { en: "Halfway Up", es: "A Mitad de Camino" },
    description: { en: "Cleared half of all checkpoints.", es: "Superaste la mitad de los puntos de control." },
    criteria: { en: `Clear at least half of the ${CHECKPOINTS.length} checkpoints.`, es: `Supera al menos la mitad de los ${CHECKPOINTS.length} puntos de control.` },
    // Derived: the spine grows, so a literal "15 of 30" would drift out of truth.
    earned: (p) => p.checkpointsCleared.length >= Math.ceil(CHECKPOINTS.length / 2),
  },
  {
    id: "full-climb", category: "milestone", tier: "platinum", accent: "#e9e59a",
    name: { en: "The Summit", es: "La Cumbre" },
    description: { en: "Cleared every checkpoint. Principal-grade.", es: "Superaste todos los puntos de control. Nivel Principal." },
    criteria: { en: `Clear all ${CHECKPOINTS.length} checkpoints across every domain and level.`, es: `Supera los ${CHECKPOINTS.length} puntos de control de todos los dominios y niveles.` },
    earned: (p) => clearedAll(p, CHECKPOINTS.map((c) => c.id)),
  },
  // Per-domain mastery (6)
  ...ORDERED_DOMAINS.map((dom): Achievement => {
    const axis = AXIS_BY_ID[dom.axisId];
    return {
      id: `domain-${dom.id}`, category: "domain", tier: "gold", accent: DOMAIN_ACCENT[dom.id] ?? "#dad45e",
      name: { en: `${axis.name.en} — Mastered`, es: `${axis.name.es} — Dominado` },
      description: { en: `Cleared every checkpoint in ${axis.name.en}.`, es: `Superaste cada punto de control de ${axis.name.es}.` },
      criteria: { en: `Clear all ${axis.name.en} checkpoints (L3→L7).`, es: `Supera todos los puntos de control de ${axis.name.es} (L3→L7).` },
      earned: (p) => clearedAll(p, domainCheckpointIds(dom.id)),
    };
  }),
  // Per-level ascension (5)
  ...LEVELS.map((lv): Achievement => ({
    id: `level-${lv.toLowerCase()}`, category: "level", tier: "silver", accent: "#9ecbff",
    name: { en: `${lv} Complete`, es: `${lv} Completo` },
    description: { en: `Cleared every domain's ${lv} checkpoint.`, es: `Superaste el punto de control ${lv} de cada dominio.` },
    // Count derived from the spine so a new domain doesn't make the criteria lie.
    criteria: { en: `Clear all ${ORDERED_DOMAINS.length} ${lv} checkpoints.`, es: `Supera los ${ORDERED_DOMAINS.length} puntos de control ${lv}.` },
    earned: (p) => clearedAll(p, levelCheckpointIds(lv)),
  })),
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Evaluate the whole catalog against progress. Ordered earned-first for display. */
export function evaluateBadges(p: Progress): EarnedBadge[] {
  const list = ACHIEVEMENTS.map((a) => ({ achievement: a, earned: a.earned(p) }));
  return list.sort((x, y) => Number(y.earned) - Number(x.earned));
}

export function earnedBadges(p: Progress): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.earned(p));
}

/** Public art path for a badge (generated WebP), or "" to use the authored SVG fallback. */
export function badgeArt(id: string): string {
  return `/badges/${id}.webp`;
}

// ── Open Badges 3.0-shaped export (UNSIGNED) ───────────────────────────────
// Shaped as a VC 2.0 envelope + OpenBadgeCredential per 1EdTech OB 3.0, but we
// attach NO `proof` (a static app holds no signing key) — so this is a portable,
// re-importable badge, NOT a cryptographically-verifiable credential. We never
// claim conformance. `origin` lets the caller stamp absolute HTTPS URLs.
export interface OpenBadgeCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: { id: string; type: "Profile"; name: string; url?: string };
  validFrom: string;
  credentialSubject: {
    type: "AchievementSubject";
    achievement: {
      id: string; type: "Achievement"; name: string; description: string;
      criteria: { narrative: string }; image: { id: string; type: "Image" };
    };
  };
}

export function badgeCredential(
  a: Achievement,
  opts: { origin: string; validFrom: string; locale?: "en" | "es" },
): OpenBadgeCredential {
  const loc = opts.locale ?? "en";
  const pick = (t: I18nText) => t[loc] || t.en;
  const base = opts.origin.replace(/\/$/, "");
  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: `${base}/achievement/${a.id}`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: { id: `${base}`, type: "Profile", name: "level-up", url: base },
    validFrom: opts.validFrom,
    credentialSubject: {
      type: "AchievementSubject",
      achievement: {
        id: `${base}/achievement/${a.id}`,
        type: "Achievement",
        name: pick(a.name),
        description: pick(a.description),
        criteria: { narrative: pick(a.criteria) },
        image: { id: `${base}${badgeArt(a.id)}`, type: "Image" },
      },
    },
  };
}
