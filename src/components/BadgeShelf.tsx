"use client";
// The trophy shelf on /me. Earned badges show in full color with their art;
// locked badges show as a dimmed silhouette with the unlock criteria (SDT:
// informational, shows the path forward — not a taunt). A share affordance sits
// on each earned badge. Both themes; reduced-motion safe (no essential motion).
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { evaluateBadges, badgeArt, type EarnedBadge } from "@/lib/badges";
import type { Progress } from "@/lib/store";
import { ShareButton } from "./ShareButton";

export function BadgeShelf({ locale, progress, origin }: { locale: Locale; progress: Progress; origin?: string }) {
  const badges = evaluateBadges(progress);
  const earnedCount = badges.filter((b) => b.earned).length;
  return (
    <section className="badge-shelf">
      <div className="badge-shelf-head">
        <p className="eyebrow" style={{ color: "var(--track-accent, var(--gen-accent))" }}>{m("badge.shelf", locale)}</p>
        <span className="eyebrow badge-shelf-count mono">{earnedCount}/{badges.length}</span>
      </div>
      <div className="badge-grid">
        {badges.map((b) => <BadgeTile key={b.achievement.id} b={b} locale={locale} origin={origin} />)}
      </div>
    </section>
  );
}

function BadgeTile({ b, locale, origin }: { b: EarnedBadge; locale: Locale; origin?: string }) {
  const { achievement: a, earned } = b;
  return (
    <figure className="badge-tile" data-earned={earned} data-tier={a.tier} style={{ ["--badge-accent" as string]: a.accent }}>
      <div className="badge-art-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="badge-art" src={badgeArt(a.id)} alt="" width={256} height={256} loading="lazy" decoding="async" />
        {!earned && <span className="badge-lock" aria-hidden="true">🔒</span>}
      </div>
      <figcaption>
        <p className="badge-name">{t(a.name, locale)}</p>
        <p className="badge-crit dim">{earned ? t(a.description, locale) : t(a.criteria, locale)}</p>
        {earned && <ShareButton locale={locale} achievementId={a.id} origin={origin} compact />}
      </figcaption>
    </figure>
  );
}
