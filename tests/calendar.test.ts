import { describe, expect, it } from "vitest";
import { dayBefore, escapeText, fold, studyCalendar } from "@/lib/calendar";

const base = { from: "2026-11-25", interview: "2027-01-10", at: "19:30", minutes: 60, locale: "es" as const, origin: "https://levelup.example", now: new Date("2026-11-25T12:00:00Z") };

describe("study plan calendar (.ics)", () => {
  it("a daily block until the day before the interview, plus the interview day", () => {
    const ics = studyCalendar(base);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/); // CRLF only
    const flat = ics.replace(/\r\n /g, "");
    expect(flat).toContain("DTSTART:20261125T193000");
    expect(flat).toContain("DURATION:PT60M");
    expect(flat).toContain("RRULE:FREQ=DAILY;UNTIL=20270109T235959");
    expect(flat).toContain("DTSTART;VALUE=DATE:20270110");
    expect(flat).toContain("DTSTAMP:20261125T120000Z");
    expect(flat).toContain("URL:https://levelup.example/es/plan/");
    expect(flat.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(flat).toContain("BEGIN:VALARM");
  });
  it("interview tomorrow: one study block today; interview today: only the interview day", () => {
    expect(studyCalendar({ ...base, interview: "2026-11-26" }).replace(/\r\n /g, "")).toContain("UNTIL=20261125T235959");
    expect(studyCalendar({ ...base, interview: "2026-11-25" }).match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
  it("folds long lines at 75 octets and escapes text", () => {
    for (const l of studyCalendar(base).split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(fold("x".repeat(80))).toBe("x".repeat(75) + "\r\n " + "x".repeat(5));
    expect(escapeText("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
  });
  it("day before crosses months, years and DST", () => {
    expect(dayBefore("2027-01-01")).toBe("2026-12-31");
    expect(dayBefore("2027-03-01")).toBe("2027-02-28");
    expect(dayBefore("2026-11-02")).toBe("2026-11-01");
  });
});
