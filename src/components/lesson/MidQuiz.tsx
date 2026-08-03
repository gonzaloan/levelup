"use client";
// The mid-lesson formative quiz ("check" stage): one MCQ at a time with an
// instant teaching rationale on reveal. Not scored — a comprehension check
// before the graded checkpoint.
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import type { QuizItem } from "@/lib/types";
import { shuffleOptions, itemKey } from "@/lib/shuffle";

export function MidQuiz({
  locale, items, track, onDone, scope = "midquiz",
}: {
  locale: Locale; items: QuizItem[]; track: string; onDone: () => void;
  /** Seeds the deterministic option shuffle; pass the lessonId so each lesson's
   *  ordering is stable and distinct. See lib/shuffle.ts for why we shuffle. */
  scope?: string;
}) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const item = items[i];
  if (!item) { onDone(); return null; }
  const revealed = picked !== null;
  const displayOptions = shuffleOptions(item.options, itemKey(scope, i, item.stem.en));
  function next() {
    if (i + 1 < items.length) { setI(i + 1); setPicked(null); }
    else onDone();
  }
  return (
    <div className="stack" style={{ gap: "var(--s-4)", marginTop: "var(--s-6)" }}>
      <div>
        <p className="eyebrow" style={{ color: "var(--track-accent)" }}>{m("lesson.check", locale)} · {i + 1}/{items.length}</p>
        <p className="dim text-sm" style={{ marginTop: 4 }}>{m("lesson.checkIntro", locale)}</p>
      </div>
      <div className="card">
        <p style={{ color: "var(--text)", marginBottom: "var(--s-5)", fontSize: "1.0625rem" }}>{t(item.stem, locale)}</p>
        <div className="stack">
          {/* Shuffled display order; `originalIndex` drives state + rationale. */}
          {displayOptions.map(({ option: o, originalIndex: oi }) => {
            const isPicked = picked === oi;
            const border = revealed ? (o.correct ? "var(--ok)" : isPicked ? "var(--bad)" : "var(--hairline)") : "var(--hairline)";
            return (
              <button key={oi} className="btn" disabled={revealed} onClick={() => !revealed && setPicked(oi)}
                style={{ textAlign: "left", justifyContent: "flex-start", borderColor: border, background: "var(--surface-2)", alignItems: "flex-start", lineHeight: 1.45 }}>
                {t(o.text, locale)}
              </button>
            );
          })}
        </div>
        {revealed && (
          // role="status" so the verdict is announced when it appears, matching
          // CheckpointPlayer and ModuleView. The glyph was already here; the
          // announcement was not.
          <div role="status" style={{ marginTop: "var(--s-4)", padding: "var(--s-4)", background: item.options[picked!].correct ? "var(--ok-bg)" : "var(--bad-bg)", borderRadius: "var(--r-sm)" }}>
            <p className="eyebrow" style={{ color: item.options[picked!].correct ? "var(--ok)" : "var(--bad)", marginBottom: 6 }}>
              {item.options[picked!].correct ? `✓ ${m("lesson.correct", locale)}` : `✗ ${m("lesson.notQuite", locale)}`}
            </p>
            <p className="text-sm" style={{ color: "var(--text)" }}>{t(item.options[picked!].rationale, locale)}</p>
          </div>
        )}
        {revealed && (
          <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} style={{ marginTop: "var(--s-4)" }} onClick={next}>
            {i + 1 < items.length ? m("assess.next", locale) : m("cta.continue", locale)}
          </button>
        )}
      </div>
    </div>
  );
}
