"use client";
// The streak instrument. Reads as a gauge, not a slot machine.
//
// Deliberate choices, all anti-dark-pattern:
//   • The BIG number is "days learned" (total, monotonic). A streak that resets
//     to 0 after a vacation is the classic guilt mechanic; the headline metric
//     here can only ever go up.
//   • The current run is shown, but a run surviving on its grace day says so
//     ("rest day used") instead of silently pretending the chain is unbroken.
//   • The 7-day forecast is the honest workload preview — a learner can see that
//     Thursday has 4 reviews queued and plan around it. No hidden pileup.
import { m } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import type { StreakSummary } from "@/lib/daily";

export function StreakRibbon({
  locale, streak, forecast,
}: {
  locale: Locale;
  streak: StreakSummary;
  forecast: { day: string; count: number }[];
}) {
  const max = Math.max(1, ...forecast.map((f) => f.count));
  // Weekday initials for the forecast axis, derived from the day key so the
  // labels are correct in any month. Locale-aware, no external data.
  const weekday = (dayKey: string) =>
    new Date(`${dayKey}T12:00:00Z`)
      .toLocaleDateString(locale === "es" ? "es-ES" : "en-US", { weekday: "narrow", timeZone: "UTC" })
      .toUpperCase();

  return (
    <section className="streak" aria-label={m("today.streakLabel", locale)}>
      <div className="streak-stats">
        <div className="streak-stat streak-stat--lead">
          <span className="streak-num">{streak.total}</span>
          <span className="streak-cap">{m("today.daysLearned", locale)}</span>
        </div>
        <div className="streak-stat">
          <span className="streak-num">{streak.current}</span>
          <span className="streak-cap">{m("today.currentRun", locale)}</span>
        </div>
        <div className="streak-stat">
          <span className="streak-num">{streak.longest}</span>
          <span className="streak-cap">{m("today.longestRun", locale)}</span>
        </div>
        <div className="streak-stat">
          <span className="streak-num">{streak.thisMonth}</span>
          <span className="streak-cap">{m("today.thisMonth", locale)}</span>
        </div>
      </div>

      {/* Review workload for the coming week. Bars are CSS-height only — no
          chart library, no canvas, and it degrades to readable numbers. */}
      <div className="streak-forecast">
        <span className="eyebrow">{m("today.reviewForecast", locale)}</span>
        <ul className="streak-bars">
          {forecast.map((f, i) => (
            <li
              key={f.day}
              className="streak-bar"
              data-today={i === 0 ? "true" : undefined}
              // An empty day must not render as a coloured stub — that reads as
              // "one review queued". data-empty desaturates it to a baseline rule.
              data-empty={f.count === 0 ? "true" : undefined}
            >
              <span
                className="streak-barFill"
                style={{ height: f.count === 0 ? "2px" : `${Math.round((f.count / max) * 100)}%` }}
                aria-hidden="true"
              />
              <span className="streak-barNum">{f.count || "·"}</span>
              <span className="streak-barDay">{weekday(f.day)}</span>
              <span className="sr-only">{`${f.day}: ${f.count}`}</span>
            </li>
          ))}
        </ul>
      </div>

      {streak.usedGrace && <p className="streak-grace">{m("today.restDayUsed", locale)}</p>}
    </section>
  );
}
