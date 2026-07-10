"use client";
// Quick-reference / revision sheet for a level. Renders lesson.cheatSheet
// (CheatSection[] = { heading, rows: { term, note }[] }) as a set of clean
// term/note tables grouped under collapsible headings. A print button hands off
// to window.print (the print stylesheet in 19-cheatsheet.css strips chrome so a
// single page comes out clean). Feature-detected by the caller: if there is no
// cheatSheet, this shows a small empty state instead.
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import type { CheatSection } from "@/lib/types";

export function CheatSheet({ locale, sections, track }: {
  locale: Locale;
  sections?: CheatSection[];
  track: string;
}) {
  // All sections open by default (revision sheet reads top-to-bottom); the
  // headings are toggles for focused review. Track which are collapsed.
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  if (!sections || sections.length === 0) {
    return (
      <section className="card cheatsheet">
        <p className="eyebrow" style={{ color: "var(--track-accent)" }}>{m("cheat.title", locale)}</p>
        <p className="prose" style={{ marginTop: "var(--s-3)" }}>{m("cheat.empty", locale)}</p>
      </section>
    );
  }

  return (
    <section className="card cheatsheet" data-track={track}>
      <div className="cheatsheet-head">
        <div>
          <p className="eyebrow" style={{ color: "var(--track-accent)" }}>{m("cheat.title", locale)}</p>
          <p className="prose text-sm" style={{ marginTop: "var(--s-2)", color: "var(--text-3)" }}>{m("cheat.intro", locale)}</p>
        </div>
        <button className="btn btn-sm cheatsheet-print" onClick={() => window.print()}>
          ⎙ {m("cheat.print", locale)}
        </button>
      </div>

      <div className="cheatsheet-sections">
        {sections.map((sec, si) => {
          const open = !collapsed[si];
          return (
            <div key={si} className="cheatsheet-section">
              <button
                type="button"
                className="cheatsheet-section-head"
                aria-expanded={open}
                onClick={() => setCollapsed((c) => ({ ...c, [si]: !!open }))}
              >
                <span className="cheatsheet-caret" aria-hidden="true" data-open={open ? "true" : "false"}>▸</span>
                <span>{t(sec.heading, locale)}</span>
              </button>
              {open && (
                <dl className="cheatsheet-rows">
                  {sec.rows.map((row, ri) => (
                    <div key={ri} className="cheatsheet-row">
                      <dt className="cheatsheet-term">{t(row.term, locale)}</dt>
                      <dd className="cheatsheet-note">{t(row.note, locale)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
