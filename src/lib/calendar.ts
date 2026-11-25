// The study plan as a calendar file (.ics, RFC 5545): a daily study block from the first day until
// the day before the interview, plus the interview day itself. Any calendar app imports it, and
// its alarm is the reminder: no server, no push service, no email. Pure, so it is unit-tested.

export interface CalendarInput {
  /** First study day (local) and the interview day (local), as YYYY-MM-DD. */
  from: string; interview: string;
  /** Local start time of the daily block, HH:MM. */
  at: string; minutes: number;
  locale: "en" | "es"; origin: string;
  /** For DTSTAMP; injectable so tests are deterministic. */
  now?: Date;
}

const compact = (ymd: string) => ymd.replaceAll("-", "");
const hhmm = (at: string) => at.replace(":", "").padEnd(4, "0");
const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** The day before a YYYY-MM-DD date, computed in UTC so DST can't shift it. */
export function dayBefore(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/** TEXT values escape backslash, semicolon, comma and newline (RFC 5545 §3.3.11). */
export const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 octets continue on the next line after CRLF + space (§3.1). */
export function fold(line: string): string {
  const bytes = new TextEncoder();
  const out: string[] = [];
  let cur = "", size = 0;
  for (const ch of line) {
    const n = bytes.encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; size = 0; }
    cur += ch; size += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function studyCalendar(c: CalendarInput): string {
  const es = c.locale === "es";
  const host = c.origin.replace(/^https?:\/\//, "") || "levelup";
  const stamp = utcStamp(c.now ?? new Date());
  const last = dayBefore(c.interview);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//levelup//study plan//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  // Floating local time (no TZID): the block stays at the same wall-clock hour wherever you are.
  if (c.from <= last) lines.push(
    "BEGIN:VEVENT",
    `UID:levelup-plan-study@${host}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${compact(c.from)}T${hhmm(c.at)}00`,
    `DURATION:PT${c.minutes}M`,
    `RRULE:FREQ=DAILY;UNTIL=${compact(last)}T235959`,
    `SUMMARY:${escapeText(es ? `levelup: estudio (${c.minutes} min)` : `levelup: study (${c.minutes} min)`)}`,
    `DESCRIPTION:${escapeText(es
      ? `Lo de hoy, en orden: Gimnasio (~12 min), repaso del día y los conceptos nuevos.\n${c.origin}/es/plan/`
      : `Today, in order: the Gym (~12 min), today's review and the new concepts.\n${c.origin}/en/plan/`)}`,
    `URL:${c.origin}/${c.locale}/plan/`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT0M", `DESCRIPTION:${escapeText(es ? "Hora de estudiar" : "Time to study")}`, "END:VALARM",
    "END:VEVENT",
  );
  lines.push(
    "BEGIN:VEVENT",
    `UID:levelup-plan-interview@${host}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(c.interview)}`,
    `SUMMARY:${escapeText(es ? "Entrevista 🎯" : "Interview 🎯")}`,
    `DESCRIPTION:${escapeText(es
      ? `Sin material nuevo: el cheatsheet y tus historias.\n${c.origin}/es/cheatsheet/\n${c.origin}/es/interview/stories/`
      : `No new material: your cheatsheet and your stories.\n${c.origin}/en/cheatsheet/\n${c.origin}/en/interview/stories/`)}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  );
  return lines.map(fold).join("\r\n") + "\r\n";
}
