"use client";
// Human landing for a shared achievement link: the badge, what it recognizes,
// how it's earned, the two LinkedIn actions, and copyable credential details.
import { useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { ACHIEVEMENT_BY_ID, badgeCredential } from "@/lib/badges";
import { linkedInShareUrl, linkedInAddToProfileUrl, openShare, siteOrigin } from "@/lib/share";

export function AchievementView({ locale, achievementId, art }: { locale: Locale; achievementId: string; art: string }) {
  const a = ACHIEVEMENT_BY_ID.get(achievementId)!;
  const [copied, setCopied] = useState(false);

  function copyDetails() {
    const cred = badgeCredential(a, { origin: siteOrigin(), validFrom: new Date().toISOString().slice(0, 10) + "T00:00:00Z", locale: locale as "en" | "es" });
    navigator.clipboard?.writeText(JSON.stringify(cred, null, 2)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  }

  return (
    <div className="wrap" data-track="general" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)", maxWidth: 640 }}>
      <div className="achievement-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="achievement-art" src={art} alt="" width={256} height={256} style={{ ["--badge-accent" as string]: a.accent }} />
        <p className="eyebrow" style={{ color: a.accent, marginTop: "var(--s-4)" }}>{m("badge.earned", locale)}</p>
        <h1 className="display" style={{ fontSize: "var(--t-h1)", margin: "var(--s-2) 0" }}>{t(a.name, locale)}</h1>
        <p className="prose">{t(a.description, locale)}</p>
      </div>

      <div className="card" style={{ marginTop: "var(--s-6)" }}>
        <p className="eyebrow">{m("ach.howEarned", locale)}</p>
        <p className="prose text-sm" style={{ marginTop: "var(--s-2)" }}>{t(a.criteria, locale)}</p>
      </div>

      <div className="stack" style={{ gap: "var(--s-3)", marginTop: "var(--s-6)" }}>
        <p className="eyebrow">{m("share.title", locale)}</p>
        <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <button className="btn btn-primary share-btn" onClick={() => openShare(linkedInShareUrl(achievementId))}>
            <span aria-hidden="true" className="share-in">in</span> {m("share.linkedin", locale)}
          </button>
          <button className="btn" onClick={() => openShare(linkedInAddToProfileUrl(a, locale))}>{m("share.addProfile", locale)}</button>
          <button className="btn" onClick={copyDetails}>{copied ? `✓ ${m("share.copied", locale)}` : m("share.copy", locale)}</button>
        </div>
      </div>

      <Link href={`/${locale}/me`} className="eyebrow" style={{ display: "inline-block", marginTop: "var(--s-8)" }}>← {m("ach.backToProgress", locale)}</Link>
    </div>
  );
}
