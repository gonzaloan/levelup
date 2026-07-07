"use client";
// Complete-the-sentence. Text segments with blanks between them; a word bank
// below. Tap a blank to select it, then tap a bank word to fill it (tap a
// filled blank to clear it). Fully keyboard/mouse/touch — no drag needed.
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import type { ClozeCheck } from "@/lib/types";

export function ClozePlayer({
  item, locale, revealed, onChange,
}: {
  item: ClozeCheck; locale: Locale; revealed: boolean; onChange: (r: number[]) => void;
}) {
  const nBlanks = item.answers.length;
  const [fill, setFill] = useState<(number | null)[]>(Array(nBlanks).fill(null));
  const [active, setActive] = useState(0);   // which blank is selected

  function emit(next: (number | null)[]) {
    setFill(next);
    onChange(next.map((v) => (v == null ? -1 : v)));
  }
  function place(bankIdx: number) {
    if (revealed) return;
    const next = [...fill];
    next[active] = bankIdx;
    emit(next);
    const nextEmpty = next.findIndex((v) => v == null);
    if (nextEmpty >= 0) setActive(nextEmpty);
  }
  function clear(blank: number) {
    if (revealed) return;
    const next = [...fill]; next[blank] = null; emit(next); setActive(blank);
  }
  const used = new Set(fill.filter((v) => v != null) as number[]);

  return (
    <div className="cloze">
      <p className="cloze-text">
        {item.segments.map((seg, i) => (
          <span key={i}>
            {t(seg, locale)}
            {i < nBlanks && (() => {
              const val = fill[i];
              const ok = revealed && val === item.answers[i];
              return (
                <button type="button" className="cloze-blank"
                  data-active={active === i} data-filled={val != null}
                  data-state={revealed ? (ok ? "ok" : "bad") : undefined}
                  aria-label={`blank ${i + 1}`}
                  onClick={() => (val != null ? clear(i) : setActive(i))}>
                  {val != null ? t(item.bank[val], locale) : "_____"}
                </button>
              );
            })()}
          </span>
        ))}
      </p>
      <div className="cloze-bank" role="group" aria-label="word bank">
        {item.bank.map((w, bi) => (
          <button key={bi} type="button" className="cloze-token" disabled={revealed || used.has(bi)}
            onClick={() => place(bi)}>
            {t(w, locale)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ClozePlayer;
