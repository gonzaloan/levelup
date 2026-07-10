// Named XP rank ladder — the learner's current rank rendered as an instrument
// panel with a ticked .meter (the house progress token) climbing toward the
// next rank, plus a compact horizontal ladder of every rank with the current
// one lit. Pure props, no hooks/events → safe as a server component (it is also
// rendered inside the "use client" MeView, which is fine). Deterministic, so
// SSR/hydration match. Content is visible by default (no opacity:0 gate).
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { RANKS, rankFor } from "@/lib/ranks";

export function RankLadder({ signal, locale }: { signal: number; locale: Locale }) {
  const { current, next, toNext, index, pct } = rankFor(signal);
  const atTop = next === null;
  // At the top rank the meter reads full; otherwise it reads progress in-band.
  const meterVal = atTop ? 100 : pct;

  return (
    <section className="rank-ladder" aria-label={m("rank.title", locale)}>
      <div className="rank-head">
        <div className="rank-current">
          <p className="eyebrow rank-current-label">{m("rank.current", locale)}</p>
          <p className="rank-current-name">{t(current.name, locale)}</p>
        </div>
        <span className="rank-badge mono" aria-hidden="true">
          {current.level.toString().padStart(2, "0")}
        </span>
      </div>

      <div
        className="meter rank-meter"
        style={{
          ["--meter-val" as string]: String(meterVal),
          ["--meter-accent" as string]: "var(--track-accent, var(--gen-accent))",
        }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={meterVal}
        aria-label={
          atTop
            ? m("rank.max", locale)
            : `${t(current.name, locale)} → ${t(next.name, locale)}`
        }
      />

      <div className="rank-meter-foot">
        {atTop ? (
          <span className="rank-max eyebrow">{m("rank.max", locale)}</span>
        ) : (
          <>
            <span className="rank-tonext">
              <strong className="mono">{toNext}</strong> {m("rank.toNext", locale)}
            </span>
            <span className="rank-next dim">
              {m("rank.next", locale)}: {t(next.name, locale)}
            </span>
          </>
        )}
      </div>

      {/* Compact horizontal ladder — every rank as a rung; the held one lit,
          cleared ones filled, future ones dimmed. Decorative overview, so the
          rung markers are aria-hidden (the meter above carries the a11y value). */}
      <ol className="rank-rungs" aria-hidden="true">
        {RANKS.map((r, i) => (
          <li
            key={r.level}
            className="rank-rung"
            data-state={i < index ? "cleared" : i === index ? "current" : "future"}
            title={t(r.name, locale)}
          >
            <span className="rank-rung-dot" />
            <span className="rank-rung-name">{t(r.name, locale)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
