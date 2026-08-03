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
  item, locale, mode, onResult, attempt = 0, showDetail,
}: {
  item: CheckItem;
  locale: Locale;
  mode: CheckMode;
  onResult?: (correct: boolean) => void;   // graded: fired once on commit
  /** Which attempt this is, folded into the display order so a retry re-lays out. */
  attempt?: number;
  /**
   * Override the per-element ok/bad marking.
   *
   * `mode` answers "is this scored"; this answers "may the learner see WHICH
   * elements were wrong". They are not the same question, and conflating them was
   * the first version of this fix. The checkpoint must hide the detail, because a
   * learner can re-enter the same item until the feedback vector solves it. The
   * Daily Brief also scores its check, but serves a different concept every day and
   * offers no retry of the same item, so hiding the detail there would remove real
   * teaching to defend against an attack that does not exist.
   */
  showDetail?: boolean;
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

  // In GRADED mode the players must not mark elements individually.
  //
  // A per-element ok/bad vector against a fixed layout is a Mastermind board: an
  // exact consistency-filter solver clears categorize in 2-3 attempts, order in
  // 3-4, match in 1-5, cloze in 3-7, and retries are unlimited — so every one of
  // the 35 checkpoints fell with probability 1.0 by attempt 4. Formative mode keeps
  // the per-element feedback, because there the whole point is to show your work.
  //
  // `showDetail` is what the players key their per-element `data-state` off; the
  // all-or-nothing verdict still renders in the panel below.
  // One decision, used by the players AND by the reveal panel below: may this
  // surface show WHICH parts were wrong?
  const detailed = showDetail ?? mode === "formative";
  const common = {
    item, locale, revealed, attempt,
    // Default: formative shows the detail, graded does not. An explicit prop wins,
    // for surfaces like the Daily Brief that score without offering a retry.
    showDetail: detailed,
    onChange: setResponse,
  } as const;

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
            {/* The partial score is per-element feedback in aggregate form: "2/4
                right" narrows the response space almost as fast as knowing WHICH
                two. Shown only where the detail is shown. */}
            {correct ? `✓ ${m("check.correct", locale)}`
              : detailed ? `${m("check.notYet", locale)} · ${score.right}/${score.total}`
              : m("check.notYet", locale)}
          </p>
          {/* `explain` is the teaching, and for 50 of the 80 cloze checks it names
              every one of its own answer tokens — which is good writing and a leak
              on a graded item the learner can re-enter. Shown when the detail is
              shown, or once they are right. */}
          {(detailed || correct) && (
            <p style={{ fontSize: "var(--t-sm)", color: "var(--text)" }}>{t(item.explain, locale)}</p>
          )}
          {!detailed && !correct && (
            <p style={{ fontSize: "var(--t-sm)", color: "var(--text-2)" }}>{m("check.gradedMiss", locale)}</p>
          )}
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
