"use client";
// Boss presentation for checkpoints & the gauntlet. Turns a dry "begin the
// quiz" screen into a game-style boss encounter: a themed boss card with a name
// + title and an HP bar that drains as the learner answers. Pixel theme shows a
// chunky authored SVG boss sprite; Studio theme shows a restrained instrument
// variant (no cartoon), keeping the observatory tone. Victory is celebrated by
// the existing Reward system (fired by the host). Reduced-motion: no drain
// animation, the bar just reflects the current value.
import { bossFor } from "@/lib/assets";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";

// A chunky authored boss glyph (CC0 — our own art) tinted by the domain accent.
// Distinct silhouettes per domain keep bosses from feeling samey.
function BossGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 32 32" width="72" height="72" className="pixel boss-glyph" aria-hidden="true"
      style={{ imageRendering: "pixelated" }}>
      <g fill={accent}>
        <rect x="10" y="4" width="12" height="4" />
        <rect x="8" y="8" width="16" height="12" />
        <rect x="6" y="12" width="2" height="6" />
        <rect x="24" y="12" width="2" height="6" />
        <rect x="10" y="20" width="12" height="6" />
        <rect x="11" y="26" width="3" height="3" />
        <rect x="18" y="26" width="3" height="3" />
      </g>
      {/* eyes */}
      <rect x="12" y="12" width="3" height="3" fill="#140c1c" />
      <rect x="17" y="12" width="3" height="3" fill="#140c1c" />
      {/* mouth */}
      <rect x="12" y="17" width="8" height="2" fill="#140c1c" />
    </svg>
  );
}

export function BossHealth({ remaining, total, locale }: { remaining: number; total: number; locale: Locale }) {
  const pct = total > 0 ? Math.max(0, Math.round((remaining / total) * 100)) : 0;
  return (
    <div className="boss-health" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={remaining}
      aria-label={m("boss.hp", locale)}>
      <span className="boss-health-label mono">{m("boss.hp", locale)}</span>
      <span className="boss-health-track"><span className="boss-health-fill" style={{ width: `${pct}%` }} /></span>
      <span className="boss-health-num mono">{remaining}/{total}</span>
    </div>
  );
}

export function BossIntro({
  locale, domainId, total, track, onEngage, children,
}: {
  locale: Locale;
  domainId: string;
  total: number;
  track: "general" | "ai";
  onEngage: () => void;
  children?: React.ReactNode; // e.g. the "covers these concepts" card
}) {
  const boss = bossFor(domainId);
  return (
    <div className="boss-card" data-track={track} style={{ ["--boss-accent" as string]: boss.accent }}>
      <div className="boss-head">
        <span className="boss-sprite"><BossGlyph accent={boss.accent} /></span>
        <div>
          <p className="eyebrow boss-eyebrow">{m("boss.label", locale)}</p>
          <h2 className="boss-name">{t(boss.name, locale)}</h2>
          <p className="boss-title dim">{t(boss.title, locale)}</p>
        </div>
      </div>
      <BossHealth remaining={total} total={total} locale={locale} />
      {children}
      <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} onClick={onEngage}>
        {m("boss.engage", locale)} →
      </button>
    </div>
  );
}

export default BossIntro;
