// Named XP rank ladder — a pure, React-free projection of the learner's existing
// "signal" (competence feedback, see store.ts) onto an ordered set of named ranks.
// It invents NO new score: it only *reads* the signal already awarded for
// demonstrated work (mastered modules, cleared checkpoints, honest gauntlets).
//
// Inspired by get-certified's ranks.json shape (lvl / xp / name), reinterpreted
// bilingually and themed to level-up's observatory/engineering identity, and
// scaled to level-up's signal economy (checkpoints ≈ 30 each, mastery ≈ 20,
// gauntlet cold-read ≈ 40 → a full climb lands in the low thousands).
//
// Deterministic: no Date.now / Math.random. Trivially unit-testable (rankFor).
import type { I18nText } from "@/i18n/config";

export interface Rank {
  /** 1-based ladder position, mirroring get-certified's `lvl`. */
  level: number;
  /** signal at or above which this rank is held (ascending, first is 0). */
  threshold: number;
  /** bilingual, authored name — observatory + engineering-ladder theme. */
  name: I18nText;
}

// Apprentice → Chief Navigator. The mid/upper rungs deliberately echo the real
// engineering ladder this platform climbs toward (Junior → Senior → Staff →
// Principal → Distinguished), dressed in the observatory metaphor.
export const RANKS: readonly Rank[] = [
  { level: 1,  threshold: 0,    name: { en: "Apprentice Observer",  es: "Observador Aprendiz" } },
  { level: 2,  threshold: 40,   name: { en: "Signal Reader",        es: "Lector de Señales" } },
  { level: 3,  threshold: 100,  name: { en: "Junior Navigator",     es: "Navegante Junior" } },
  { level: 4,  threshold: 200,  name: { en: "Instrument Engineer",  es: "Ingeniero de Instrumentos" } },
  { level: 5,  threshold: 350,  name: { en: "Systems Navigator",    es: "Navegante de Sistemas" } },
  { level: 6,  threshold: 550,  name: { en: "Senior Navigator",     es: "Navegante Sénior" } },
  { level: 7,  threshold: 800,  name: { en: "Staff Cartographer",   es: "Cartógrafo de Plantilla" } },
  { level: 8,  threshold: 1100, name: { en: "Principal Navigator",  es: "Navegante Principal" } },
  { level: 9,  threshold: 1500, name: { en: "Distinguished Observer", es: "Observador Distinguido" } },
  { level: 10, threshold: 2000, name: { en: "Chief Navigator",      es: "Navegante en Jefe" } },
] as const;

export interface RankStanding {
  /** the rank currently held. */
  current: Rank;
  /** the next rank up, or null if already at the top. */
  next: Rank | null;
  /** signal still needed to reach `next` (0 at the top rank). */
  toNext: number;
  /** 0-based index of `current` in RANKS. */
  index: number;
  /** progress toward `next` within the current band, 0..100 (100 at top). */
  pct: number;
}

/**
 * Project a signal value onto the ladder. Pure and deterministic.
 * Negative / NaN signal is clamped to 0 so callers can't produce a broken meter.
 */
export function rankFor(signal: number): RankStanding {
  const s = Number.isFinite(signal) && signal > 0 ? signal : 0;

  // Highest rank whose threshold the signal has reached. RANKS is ascending and
  // starts at 0, so index 0 is always a valid floor.
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (s >= RANKS[i].threshold) index = i;
    else break;
  }

  const current = RANKS[index];
  const next = index < RANKS.length - 1 ? RANKS[index + 1] : null;

  if (!next) {
    return { current, next: null, toNext: 0, index, pct: 100 };
  }

  const span = next.threshold - current.threshold; // > 0 by construction
  const gained = s - current.threshold;
  const toNext = Math.max(0, next.threshold - s);
  const pct = Math.max(0, Math.min(100, Math.round((gained / span) * 100)));
  return { current, next, toNext, index, pct };
}
