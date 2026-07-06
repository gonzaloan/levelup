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
          <button className="concept-nav-item" data-state={idx === -1 ? "current" : "done"} onClick={() => onJump(-1)}>
            <span className="concept-nav-dot" aria-hidden="true" />
            <span className="concept-nav-label">{m("lesson.overview", locale)}</span>
          </button>
        </li>
        {concepts.map((c, i) => {
          const state = i < idx ? "done" : i === idx ? "current" : "todo";
          const title = meta.get(c.slug) ? t(meta.get(c.slug)!.title, locale) : c.slug;
          return (
            <li key={c.slug}>
              <button className="concept-nav-item" data-state={state}
                aria-current={i === idx ? "step" : undefined} onClick={() => onJump(i)}>
                <span className="concept-nav-n mono">{i + 1}</span>
                <span className="concept-nav-label">{title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default ConceptNav;
