"use client";
// Share the day's brief. Two affordances, both explicit:
//   • Copy — puts the plain-text card on the clipboard (works into LinkedIn,
//     Slack, X, a commit message, anywhere). Shows the exact text first, so the
//     learner sees what they're about to post. Nothing is ever posted for them.
//   • Open LinkedIn — opens the composer pointed at the site, with the text
//     already copied. (LinkedIn's share-offsite endpoint honors only `url`;
//     prefilled body text was removed from their API, so pretending otherwise
//     would just silently drop the content.)
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { AXIS_BY_ID, type AxisId } from "@/lib/axes";
import { dailyShareText, dailyShareLinkedInUrl } from "@/lib/dailyshare";
import { openShare } from "@/lib/share";
import type { StreakSummary } from "@/lib/daily";
import type { Concept } from "@/lib/types";

export function DailyShare({
  locale, day, concept, axisId, streak, checkResults,
}: {
  locale: Locale;
  day: string;
  concept?: Concept;
  axisId?: AxisId;
  streak: StreakSummary;
  checkResults: boolean[];
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const text = dailyShareText({
    day,
    conceptTitle: concept?.title,
    domainName: axisId ? AXIS_BY_ID[axisId].name : undefined,
    why: concept?.why,
    checkResults,
    streakTotal: streak.total,
    locale,
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard denied (permissions, http, older browser): reveal the text so
      // the learner can select it manually. Never fail silently.
      setOpen(true);
    }
  }

  return (
    <div className="dshare">
      <button className="btn btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? m("share.hidePreview", locale) : m("share.preview", locale)}
      </button>
      {open && <pre className="dshare-pre">{text}</pre>}
      <div className="dshare-actions">
        <button className="btn" onClick={copy}>
          {copied ? m("share.copied", locale) : m("share.copy", locale)}
        </button>
        <button
          className="btn share-btn"
          onClick={async () => { await copy(); openShare(dailyShareLinkedInUrl()); }}
        >
          <span aria-hidden="true" className="share-in">in</span>
          <span>{m("share.linkedin", locale)}</span>
        </button>
      </div>
      <p className="today-note">{m("share.linkedinNote", locale)}</p>
      {concept && <p className="sr-only">{t(concept.title, locale)}</p>}
    </div>
  );
}
