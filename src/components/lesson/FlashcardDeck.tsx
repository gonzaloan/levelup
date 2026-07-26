"use client";
// Optional formative recall step: flip-cards, self-graded, no score. Shows the
// front (a prompt/term); the learner tries to recall, then flips to reveal the
// back and self-grades "I knew it" / "Missed it". Advances card to card and
// ends on a small tally. Motion is a transform:rotateY flip, double-gated on
// prefers-reduced-motion (which falls back to a cross-fade). Fully keyboard +
// tap operable; the card itself is a button, so Enter/Space flip it.
import { useState } from "react";
import { t, type Locale, type I18nText } from "@/i18n/config";
import { m } from "@/i18n/messages";

export function FlashcardDeck({ locale, cards, track, onDone }: {
  locale: Locale;
  cards: { front: I18nText; back: I18nText }[];
  track: string;
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [recalled, setRecalled] = useState(0);

  const card = cards[i];
  if (!card) { onDone(); return null; }
  const last = i + 1 >= cards.length;

  function grade(knew: boolean) {
    const nextRecalled = recalled + (knew ? 1 : 0);
    if (last) { setRecalled(nextRecalled); onDone(); return; }
    setRecalled(nextRecalled);
    setI(i + 1);
    setFlipped(false);
  }

  return (
    <div className="stack" style={{ gap: "var(--s-4)", marginTop: "var(--s-6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--s-4)", flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow" style={{ color: "var(--track-accent)" }}>
            {m("flash.title", locale)} · {i + 1}/{cards.length}
          </p>
          <p className="dim text-sm" style={{ marginTop: 4, color: "var(--text-3)" }}>{m("flash.intro", locale)}</p>
        </div>
        {/* The deck is OPTIONAL recall practice, but it had no exit: a lesson with
            24 cards meant 24 taps before the graded check was reachable, with no
            way to say "not now". Recall is worth offering, not worth trapping
            someone in. */}
        <button className="btn btn-sm" onClick={onDone}>{m("flash.skip", locale)}</button>
      </div>

      <button
        type="button"
        className="flashcard"
        data-flipped={flipped ? "true" : "false"}
        aria-pressed={flipped}
        aria-label={flipped ? m("flash.flip", locale) : m("flash.tapToFlip", locale)}
        onClick={() => !flipped && setFlipped(true)}
      >
        <span className="flashcard-inner">
          <span className="flashcard-face flashcard-front">
            <span className="flashcard-text">{t(card.front, locale)}</span>
            {!flipped && <span className="flashcard-hint eyebrow">{m("flash.tapToFlip", locale)}</span>}
          </span>
          <span className="flashcard-face flashcard-back">
            <span className="flashcard-text">{t(card.back, locale)}</span>
          </span>
        </span>
      </button>

      {!flipped ? (
        <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} onClick={() => setFlipped(true)}>
          {m("flash.flip", locale)}
        </button>
      ) : (
        <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <button className="btn flashcard-grade" data-grade="got" onClick={() => grade(true)}>
            ✓ {m("flash.gotIt", locale)}
          </button>
          <button className="btn flashcard-grade" data-grade="missed" onClick={() => grade(false)}>
            ✗ {m("flash.missed", locale)}
          </button>
          <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} style={{ marginLeft: "auto" }} onClick={() => grade(true)}>
            {last ? m("flash.done", locale) : m("flash.next", locale)} →
          </button>
        </div>
      )}
    </div>
  );
}
