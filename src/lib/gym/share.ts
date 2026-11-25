// Share a finished workout the way Wordle shares a game: a numbered day, a row of colored squares
// (one per rep, no answers revealed) and a link that challenges a friend to beat it. Everything
// rides in the link, so there is no server and no account: a challenge is a claim, not a record.
import type { RepResult } from "./store";

/** Day #1 of the Gym. */
export const GYM_EPOCH = "2026-11-24";
const utcDay = (d: string) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd) / 86_400_000; };
export const gymNumber = (date: string) => utcDay(date) - utcDay(GYM_EPOCH) + 1;

export const square = (score: number) => (score >= 1 ? "🟩" : score > 0 ? "🟨" : "🟥");

export interface Challenge { date: string; pct: number; secs: number }

/** "20261125.88.581": date, score % and seconds, short enough to read in a URL. */
export const encodeChallenge = (c: Challenge) => `${c.date.replaceAll("-", "")}.${c.pct}.${c.secs}`;
export function parseChallenge(code: string | null | undefined): Challenge | null {
  const m = /^(\d{4})(\d{2})(\d{2})\.(\d{1,3})\.(\d{1,5})$/.exec(code ?? "");
  if (!m) return null;
  const pct = Number(m[4]), secs = Number(m[5]);
  if (pct > 100 || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31) return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, pct, secs };
}

export const summaryOf = (date: string, results: RepResult[]): Challenge => ({
  date,
  pct: results.length ? Math.round((100 * results.reduce((a, b) => a + b.score, 0)) / results.length) : 0,
  secs: Math.round(results.reduce((a, b) => a + b.ms, 0) / 1000),
});

export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

/** Who won: a higher score, then a faster time. */
export const beats = (a: Challenge, b: Challenge) => a.pct > b.pct || (a.pct === b.pct && a.secs < b.secs);

/** The text to paste in a chat: header, one square per rep, streak, challenge link. */
export function shareText(c: Challenge, scores: number[], streak: number, link: string, locale: "en" | "es"): string {
  const head = `levelup Gym #${gymNumber(c.date)} · ${c.pct}% · ${clock(c.secs)}`;
  const fire = streak > 1 ? `\n🔥 ${streak} ${locale === "es" ? "días seguidos" : "days in a row"}` : "";
  const dare = locale === "es" ? "¿Me ganas? Sin IA, sin calculadora:" : "Can you beat it? No AI, no calculator:";
  return `${head}\n${scores.map(square).join("")}${fire}\n${dare} ${link}?vs=${encodeChallenge(c)}`;
}
