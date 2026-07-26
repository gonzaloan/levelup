// Shareable daily result — the "Wordle grid" property, adapted honestly.
//
// Why Wordle's share worked: the grid proved you played, revealed nothing that
// spoiled the puzzle, was pure copy-pasteable text (no image pipeline, renders
// everywhere), and everyone had the SAME puzzle that day, so posting it was an
// invitation rather than a boast.
//
// What that means here, and where we deliberately DIVERGE:
//   • KEEP: same-day-same-concept determinism (see daily.ts) so two engineers
//     comparing notes are comparing the same thing; plain-text output; no spoiler.
//   • KEEP: a compact glyph line that encodes the shape of the day.
//   • DROP: score bragging. A senior-engineer audience reads "I got 5/5!" as
//     noise. So the share leads with the CONCEPT and the judgment it trains —
//     the part a peer might actually find useful — and the streak is a small tail.
//   • The check result is shown as marks, never as a percentage or rank.
//
// PURE module: no DOM, no clipboard, no Date. Fully unit-tested.
import type { I18nText, Locale } from "@/i18n/config";
import { t } from "@/i18n/config";

export const SHARE_URL = "https://levelup.skillrealm.dev";

/** Marks: filled = passed first try, hollow = missed. Kept to two glyphs so the
 *  line survives every font stack on LinkedIn, Slack and X. */
export const MARK_PASS = "◆";
export const MARK_MISS = "◇";
export const MARK_NONE = "·";

export interface DailyShareInput {
  day: string;                 // YYYY-MM-DD
  conceptTitle?: I18nText;
  domainName?: I18nText;
  level?: string;              // L3..L7
  why?: I18nText;              // the judgment this concept trains
  checkResults: boolean[];
  streakTotal: number;
  locale: Locale;
}

/** The glyph line for the day's checks. Empty checks → a single neutral dot. */
export function marksLine(results: boolean[]): string {
  if (results.length === 0) return MARK_NONE;
  return results.map((r) => (r ? MARK_PASS : MARK_MISS)).join(" ");
}

/**
 * The share text. Structure (kept under ~450 chars so LinkedIn shows it all
 * without a "see more" fold, which is where most engagement dies):
 *
 *   Level Up · <day>            ← the ritual line, comparable across people
 *   <Domain> · <Level>
 *   "<Concept title>"
 *   <the judgment, one line>    ← the part with actual value to a reader
 *   ◆ ◆                          ← proof you did the work, no score
 *   Day N · levelup.skillrealm.dev
 */
export function dailyShareText(input: DailyShareInput): string {
  const L = input.locale;
  const head = L === "es" ? "Level Up · Informe del día" : "Level Up · Daily brief";
  const lines: string[] = [`${head} ${input.day}`];

  const ctx = [input.domainName ? t(input.domainName, L) : null, input.level ?? null]
    .filter(Boolean)
    .join(" · ");
  if (ctx) lines.push(ctx);

  if (input.conceptTitle) lines.push(`“${t(input.conceptTitle, L)}”`);
  if (input.why) lines.push(t(input.why, L));

  lines.push(marksLine(input.checkResults));

  const dayWord = L === "es" ? "Día" : "Day";
  lines.push(`${dayWord} ${input.streakTotal} · ${SHARE_URL.replace("https://", "")}`);

  return lines.join("\n");
}

/**
 * LinkedIn share-offsite only honors `url` — the post preview comes from the
 * target page's OG tags, and prefilled text was removed from the API. So the
 * flow is: copy the text (clipboard), then open the composer at a page whose OG
 * card matches. We link the concept's own static page when there is one.
 */
export function dailyShareLinkedInUrl(url: string = SHARE_URL): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

/**
 * An "insight share" for a specific concept — used from any lesson, not just the
 * daily. Leads with the idea, credits the source, and never claims the reader's
 * own experience. (Content rule: we never fabricate first-person experience.)
 */
export function insightShareText(input: {
  title: I18nText;
  why: I18nText;
  source?: string;
  level?: string;
  locale: Locale;
  url?: string;
}): string {
  const L = input.locale;
  const lines = [t(input.title, L), "", t(input.why, L)];
  if (input.source) lines.push("", (L === "es" ? "Fuente: " : "Source: ") + input.source);
  const tail = L === "es" ? "Del temario Staff/Principal en" : "From the Staff/Principal curriculum at";
  lines.push("", `${tail} ${(input.url ?? SHARE_URL).replace("https://", "")}`);
  return lines.join("\n");
}
