"use client";
// Dispatches a CheckItem to the right player and owns the shared shell: the
// prompt, the reveal/feedback panel, and the Commit/Retry controls. Two modes:
//  - formative: instant partial feedback, free Retry, not scored.
//  - graded:   one Commit, all-or-nothing boolean via gradeCheck, no retry;
//              reports the result up (checkpoint counts it like an MCQ).
// The interaction model is tap/click-to-place (mouse, touch, keyboard all work
// the same way) — accessible by default, no drag dependency.
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { gradeCheck, partialScore, type CheckResponse } from "@/lib/checks";
import type { CheckItem } from "@/lib/types";
import { ClozePlayer } from "./ClozePlayer";
import { OrderPlayer } from "./OrderPlayer";
import { MatchPlayer } from "./MatchPlayer";
import { CategorizePlayer } from "./CategorizePlayer";

export type CheckMode = "formative" | "graded";

export function CheckHost({
  item, locale, mode, onResult,
}: {
  item: CheckItem;
  locale: Locale;
  mode: CheckMode;
  onResult?: (correct: boolean) => void;   // graded: fired once on commit
}) {
  const [response, setResponse] = useState<CheckResponse | null>(null);
  const [revealed, setRevealed] = useState(false);
  const track = item.track;

  const ready = response !== null;
  const correct = ready ? gradeCheck(item, response!) : false;
  const score = ready ? partialScore(item, response!) : { right: 0, total: 0 };

  function commit() {
    if (!ready) return;
    setRevealed(true);
    if (mode === "graded") onResult?.(correct);
  }
  function retry() {
    setRevealed(false);
    setResponse(null);
  }

  const common = { item, locale, revealed, onChange: setResponse } as const;

  return (
    <div className="check" data-track={track} data-kind={item.kind}>
      <p className="check-prompt">{t(item.prompt, locale)}</p>

      {item.kind === "cloze" && <ClozePlayer {...common} item={item} />}
      {item.kind === "order" && <OrderPlayer {...common} item={item} />}
      {item.kind === "match" && <MatchPlayer {...common} item={item} />}
      {item.kind === "categorize" && <CategorizePlayer {...common} item={item} />}

      {!revealed && (
        <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} disabled={!ready}
          style={{ marginTop: "var(--s-4)" }} onClick={commit}>
          {m("check.commit", locale)}
        </button>
      )}

      {revealed && (
        <div className="check-reveal" data-correct={correct}
          style={{ marginTop: "var(--s-4)", padding: "var(--s-4)", borderRadius: "var(--r-sm)",
            background: correct ? "var(--ok-bg)" : "var(--bad-bg)" }}>
          <p className="eyebrow" style={{ color: correct ? "var(--ok)" : "var(--bad)", marginBottom: 6 }}>
            {correct ? `✓ ${m("check.correct", locale)}`
              : `${m("check.notYet", locale)} · ${score.right}/${score.total}`}
          </p>
          <p style={{ fontSize: "var(--t-sm)", color: "var(--text)" }}>{t(item.explain, locale)}</p>
          {mode === "formative" && !correct && (
            <button className="btn btn-sm" style={{ marginTop: "var(--s-3)" }} onClick={retry}>
              {m("check.retry", locale)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CheckHost;
