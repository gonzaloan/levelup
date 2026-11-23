// Interview plan: from a date, a target role and the minutes you have per day, what to study each
// day. Pure and unit-tested. The time model is a stated assumption, not a measurement: about
// MIN_PER_CONCEPT minutes for a new concept (key points, diagram, inline check) and REVIEW_SHARE
// of each study day for spaced review.

export type Role = "swe" | "ai" | "both";
export type DayKind = "learn" | "practice" | "final" | "eve";

export const MIN_PER_CONCEPT = 12;
export const REVIEW_SHARE = 0.3;
export const MINUTE_OPTIONS = [30, 45, 60, 90, 120] as const;

/** Topics each role is asked about. `null` = everything. Leadership counts for every role. */
export const ROLE_DOMAINS: Record<Role, string[] | null> = {
  swe: ["coding", "systems", "sysdesign", "leadership"],
  ai: ["foundations", "prompting", "rag", "agents", "evals", "training", "inference", "security", "architecture", "design", "ml", "mlops", "leadership"],
  both: null,
};
/** Concepts outside a role's topics that the role still needs (the design-round method). */
const ROLE_EXTRA: Record<Role, string[]> = { swe: ["design-framework"], ai: ["back-of-envelope"], both: [] };
const CASE_DOMAINS = new Set(["sysdesign", "design"]);

export interface PlanConcept { id: string; domain: string; level: string }
export interface PlanInput { daysLeft: number; role: Role; minutes: number; concepts: PlanConcept[]; studied: (id: string) => boolean }
export interface Plan {
  daysLeft: number;
  /** One entry per day from today (index 0) to the day before the interview. */
  days: DayKind[];
  learnDays: number;
  scope: number;
  remaining: number;
  /** New concepts per learning day that fit in the minutes given. */
  capacity: number;
  /** New concepts per learning day in this plan. */
  perDay: number;
  fits: boolean;
  /** Concepts the plan reaches before the interview, in study order; `later` is what is left out. */
  queue: string[];
  later: string[];
}

export const inScope = (role: Role, c: PlanConcept) => {
  const d = ROLE_DOMAINS[role];
  return !d || d.includes(c.domain) || ROLE_EXTRA[role].includes(c.id);
};

/** When time is short: essentials of every topic, then the design cases, then the rest. */
const tier = (c: PlanConcept) => (c.level === "core" ? 0 : CASE_DOMAINS.has(c.domain) ? 1 : c.level === "advanced" ? 2 : 3);

/** What each day is for. The last days are rehearsal (no new material); weekends of a long plan are practice days. */
export function dayKinds(daysLeft: number): DayKind[] {
  if (daysLeft <= 0) return [];
  const finalDays = daysLeft >= 5 ? Math.min(7, Math.max(2, Math.round(daysLeft * 0.2))) : daysLeft >= 2 ? 1 : 0;
  const study = daysLeft - finalDays;
  return Array.from({ length: daysLeft }, (_, i): DayKind => {
    if (i === daysLeft - 1 && finalDays > 0) return "eve";
    if (i >= study) return "final";
    return study >= 7 && i % 7 >= 5 ? "practice" : "learn";
  });
}

export function buildPlan({ daysLeft, role, minutes, concepts, studied }: PlanInput): Plan {
  const scoped = concepts.filter((c) => inScope(role, c));
  const todo = scoped.filter((c) => !studied(c.id));
  const days = dayKinds(daysLeft);
  const learnDays = days.filter((k) => k === "learn").length;
  const capacity = Math.max(1, Math.floor((minutes * (1 - REVIEW_SHARE)) / MIN_PER_CONCEPT));
  const needed = learnDays ? Math.ceil(todo.length / learnDays) : todo.length;
  const fits = learnDays > 0 && needed <= capacity;
  const perDay = fits ? Math.max(1, needed) : capacity;
  // Everything fits → the path's own order (the best order to learn it). Otherwise essentials first.
  const ordered = fits ? todo : [...todo].sort((a, b) => tier(a) - tier(b));
  const reach = fits ? ordered.length : Math.min(ordered.length, perDay * learnDays);
  return {
    daysLeft, days, learnDays, scope: scoped.length, remaining: todo.length, capacity, perDay, fits,
    queue: ordered.slice(0, reach).map((c) => c.id), later: ordered.slice(reach).map((c) => c.id),
  };
}

/** The plan's concepts split by learning day: `out[i]` belongs to day index `i` (empty on non-learning days). */
export function schedule(plan: Plan): string[][] {
  let at = 0;
  return plan.days.map((k) => (k === "learn" ? plan.queue.slice(at, (at += plan.perDay)) : []));
}

/** Whole days from `today` to `date` (local calendar days). Negative when the date has passed. */
export function daysBetween(today: Date, date: Date): number {
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}
