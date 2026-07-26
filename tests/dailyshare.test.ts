import { describe, it, expect } from "vitest";
import {
  dailyShareText, insightShareText, marksLine, dailyShareLinkedInUrl,
  MARK_PASS, MARK_MISS, MARK_NONE, SHARE_URL,
} from "@/lib/dailyshare";

const concept = { en: "Static stability", es: "Estabilidad estática" };
const why = {
  en: "Trains the judgment of designing for the failure you can't control.",
  es: "Entrena el criterio de diseñar para la falla que no puedes controlar.",
};

describe("marksLine", () => {
  it("renders one glyph per check", () => {
    expect(marksLine([true, false, true])).toBe(`${MARK_PASS} ${MARK_MISS} ${MARK_PASS}`);
  });
  it("renders a neutral dot when there were no checks", () => {
    expect(marksLine([])).toBe(MARK_NONE);
  });
});

describe("dailyShareText", () => {
  const base = {
    day: "2026-07-25",
    conceptTitle: concept,
    domainName: { en: "Systems & Architecture", es: "Sistemas y Arquitectura" },
    level: "L5",
    why,
    checkResults: [true, true],
    streakTotal: 12,
    locale: "en" as const,
  };

  it("leads with the ritual line and includes the concept, judgment and marks", () => {
    const out = dailyShareText(base);
    const lines = out.split("\n");
    expect(lines[0]).toContain("2026-07-25");
    expect(out).toContain("Static stability");
    expect(out).toContain(why.en);
    expect(out).toContain(`${MARK_PASS} ${MARK_PASS}`);
    expect(out).toContain("Day 12");
  });

  it("never leaks a score or a percentage", () => {
    const out = dailyShareText({ ...base, checkResults: [true, false] });
    expect(out).not.toMatch(/\d+\s*\/\s*\d+/);
    expect(out).not.toContain("%");
  });

  it("uses authored Spanish, not the English strings", () => {
    const out = dailyShareText({ ...base, locale: "es" });
    expect(out).toContain("Informe del día");
    expect(out).toContain("Estabilidad estática");
    expect(out).toContain(why.es);
    expect(out).toContain("Día 12");
    expect(out).not.toContain("Daily brief");
  });

  it("stays short enough to avoid LinkedIn's fold", () => {
    expect(dailyShareText(base).length).toBeLessThan(450);
  });

  it("degrades gracefully with no concept and no checks", () => {
    const out = dailyShareText({ day: "2026-07-25", checkResults: [], streakTotal: 1, locale: "en" });
    expect(out).toContain("2026-07-25");
    expect(out).toContain(MARK_NONE);
    expect(out).toContain("Day 1");
  });

  it("points at the production domain", () => {
    expect(dailyShareText(base)).toContain("levelup.skillrealm.dev");
    expect(SHARE_URL).toBe("https://levelup.skillrealm.dev");
  });
});

describe("dailyShareLinkedInUrl", () => {
  it("builds a share-offsite url with the target encoded", () => {
    const u = dailyShareLinkedInUrl("https://levelup.skillrealm.dev/en/today/");
    expect(u).toContain("linkedin.com/sharing/share-offsite/?url=");
    expect(u).toContain(encodeURIComponent("https://levelup.skillrealm.dev/en/today/"));
  });
});

describe("insightShareText", () => {
  it("credits the source and never claims personal experience", () => {
    const out = insightShareText({ title: concept, why, source: "Amazon Builders' Library", locale: "en" });
    expect(out).toContain("Amazon Builders' Library");
    expect(out).toContain("Static stability");
    // No first-person experience claims — the content rule.
    expect(out).not.toMatch(/\bI \b|\bmy \b|\bwe shipped\b/i);
  });
  it("localizes the source label", () => {
    expect(insightShareText({ title: concept, why, source: "X", locale: "es" })).toContain("Fuente:");
  });
});
