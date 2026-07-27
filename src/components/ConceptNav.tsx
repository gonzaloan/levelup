"use client";
// Left column of the lesson workbench: a numbered concept navigator with
// read/current/todo dots and jump-to. Collapses to a horizontal progress strip
// on narrow screens (handled by CSS). Keyboard: each item is a real button.
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import type { Concept, ConceptLesson } from "@/lib/types";

export function ConceptNav({
  locale, concepts, meta, idx, onJump,
}: {
  locale: Locale;
  concepts: ConceptLesson[];
  meta: Map<string, Concept>;
  idx: number;                 // -1 = overview, 0..n-1 = concept
  onJump: (i: number) => void; // -1 jumps to overview
}) {
  return (
    <nav className="concept-nav" aria-label={m("lesson.concepts", locale)}>
      <p className="eyebrow concept-nav-head">{m("lesson.concepts", locale)}</p>
      <ol className="concept-nav-list">
        <li>
          {/* Same reason as below: the dot is aria-hidden and the label is
              display:none on mobile, so without this the button is nameless. */}
          <button className="concept-nav-item" data-state={idx === -1 ? "current" : "done"}
            aria-label={m("lesson.overview", locale)} onClick={() => onJump(-1)}>
            <span className="concept-nav-dot" aria-hidden="true" />
            <span className="concept-nav-label" aria-hidden="true">{m("lesson.overview", locale)}</span>
          </button>
        </li>
        {concepts.map((c, i) => {
          const state = i < idx ? "done" : i === idx ? "current" : "todo";
          const title = meta.get(c.slug) ? t(meta.get(c.slug)!.title, locale) : c.slug;
          return (
            <li key={c.slug}>
              {/* aria-label because below 1050px `.concept-nav-label` is hidden
                  and the number is the only remaining child — leaving the button
                  with no accessible name at all (axe wcag2a `button-name`,
                  critical, mobile-only). The label carries the number too, so a
                  screen-reader user hears position AND destination. */}
              <button className="concept-nav-item" data-state={state}
                aria-label={`${i + 1}. ${title}`}
                aria-current={i === idx ? "step" : undefined} onClick={() => onJump(i)}>
                <span className="concept-nav-n mono" aria-hidden="true">{i + 1}</span>
                <span className="concept-nav-label" aria-hidden="true">{title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default ConceptNav;
