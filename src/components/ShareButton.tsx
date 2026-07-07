"use client";
// Share an earned achievement to LinkedIn. Compact variant = a single icon
// button (on a badge tile); full variant = labelled. Opens the share-offsite
// popup pointed at the achievement's static OG page.
import { type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { ACHIEVEMENT_BY_ID } from "@/lib/badges";
import { linkedInShareUrl, openShare } from "@/lib/share";

export function ShareButton({
  locale, achievementId, origin, compact = false,
}: {
  locale: Locale; achievementId: string; origin?: string; compact?: boolean;
}) {
  const a = ACHIEVEMENT_BY_ID.get(achievementId);
  if (!a) return null;
  function share() { openShare(linkedInShareUrl(achievementId, origin)); }
  return (
    <button
      type="button"
      className={compact ? "share-btn share-btn-compact" : "btn share-btn"}
      onClick={share}
      aria-label={m("share.linkedin", locale)}
      title={m("share.linkedin", locale)}
    >
      <span aria-hidden="true" className="share-in">in</span>
      {!compact && <span>{m("share.linkedin", locale)}</span>}
    </button>
  );
}
