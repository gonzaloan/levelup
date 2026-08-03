"use client";
// Commit a guess before the concept explains itself.
//
// WHY THIS EXISTS
// The pedagogy audit found the Predict stage missing across the whole platform:
// the concept pane opens by naming the judgment, shows the figure, then explains —
// so the learner is handed the answer before ever committing to one. Without a
// commitment there is no generation effect and no productive failure; they never
// discover they were wrong before being told.
//
// DESIGN CONSTRAINTS, all deliberate:
//   • Not scored, not gated, not stored. The value is the commitment. Scoring a
//     guess made before the teaching would punish a learner for not yet knowing,
//     which is the reason for asking in the first place.
//   • The options shuffle (`shuffleOptions`), because authored content puts the
//     correct answer first and a prediction you can win positionally is not a
//     prediction.
//   • Skippable. A learner revisiting a concept for reference should not be made
//     to re-guess, and a forced interstitial on a reference lookup would train
//     people to stop opening concepts.
//   • The resolution explains the MECHANISM rather than announcing a verdict, so a
//     wrong prediction is the most useful outcome available.
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { shuffleOptions } from "@/lib/shuffle";
import type { ConceptPredict } from "@/lib/types";

export function Predict({
  spec, slug, locale, track, onDone,
}: {
  spec: ConceptPredict;
  slug: string;
  locale: Locale;
  track: "general" | "ai";
  onDone: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const options = shuffleOptions(spec.options, `predict:${slug}`);
  const committed = picked !== null;
  const chosen = committed ? spec.options[picked] : undefined;

  return (
    <section className="cp-predict" data-track={track} aria-labelledby={`predict-${slug}`}>
      <p className="eyebrow cp-predict-label" id={`predict-${slug}`}>
        {m("predict.label", locale)}
      </p>
      <p className="cp-predict-prompt">{t(spec.prompt, locale)}</p>

      <div className="stack cp-predict-options">
        {options.map(({ option: o, originalIndex: oi }) => {
          const isPicked = picked === oi;
          return (
            <button
              key={oi}
              type="button"
              className="btn cp-predict-option"
              disabled={committed}
              data-state={committed ? (isPicked ? (o.correct ? "ok" : "bad") : undefined) : undefined}
              onClick={() => setPicked(oi)}
            >
              {/* Correctness is never colour-only: the glyph and the screen-reader
                  text carry it too. Only the learner's OWN pick is marked, for the
                  same reason the checkpoint withholds the key — the point here is
                  the commitment, not a lookup. */}
              {isPicked && (
                <span aria-hidden="true" className="mono cp-predict-mark">
                  {o.correct ? "✓" : "✗"}
                </span>
              )}
              {t(o.text, locale)}
              {isPicked && (
                <span className="sr-only">
                  {` — ${o.correct ? m("lesson.correct", locale) : m("lesson.notQuite", locale)}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {committed ? (
        <div role="status" className="cp-predict-resolution">
          <p className="eyebrow" style={{ color: chosen!.correct ? "var(--ok)" : "var(--bad)" }}>
            {chosen!.correct ? `✓ ${m("predict.right", locale)}` : `✗ ${m("predict.wrong", locale)}`}
          </p>
          <p className="text-sm">{t(chosen!.why, locale)}</p>
          <p className="text-sm cp-predict-mechanism">{t(spec.resolution, locale)}</p>
          <button type="button" className="btn btn-sm" onClick={onDone}>
            {m("predict.continue", locale)}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-sm cp-predict-skip" onClick={onDone}>
          {m("predict.skip", locale)}
        </button>
      )}
    </section>
  );
}

export default Predict;
