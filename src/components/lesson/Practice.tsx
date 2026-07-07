"use client";
// Formative practice ("practice" stage): play through the lesson's novel checks
// one at a time, no score, free retry (CheckHost owns retry). Continue advances;
// Skip is always available.
import { useState } from "react";
import { type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { CheckHost } from "../checks/CheckHost";
import type { CheckItem } from "@/lib/types";

export function Practice({ locale, checks, track, onDone }: { locale: Locale; checks: CheckItem[]; track: string; onDone: () => void }) {
  const [i, setI] = useState(0);
  const item = checks[i];
  if (!item) { onDone(); return null; }
  function next() { if (i + 1 < checks.length) setI(i + 1); else onDone(); }
  return (
    <div className="stack" style={{ gap: "var(--s-4)", marginTop: "var(--s-6)", maxWidth: 720 }}>
      <div>
        <p className="eyebrow" style={{ color: "var(--track-accent)" }}>{m("check.practice", locale)} · {i + 1}/{checks.length}</p>
        <p className="dim text-sm" style={{ marginTop: 4 }}>{m("check.practiceIntro", locale)}</p>
      </div>
      <div className="card">
        <CheckHost key={item.id} item={item} locale={locale} mode="formative" />
        <div style={{ display: "flex", gap: "var(--s-3)", marginTop: "var(--s-5)" }}>
          <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} onClick={next}>
            {i + 1 < checks.length ? m("assess.next", locale) : m("cta.continue", locale)}
          </button>
          <button className="btn" onClick={next}>{m("check.skip", locale)}</button>
        </div>
      </div>
    </div>
  );
}
