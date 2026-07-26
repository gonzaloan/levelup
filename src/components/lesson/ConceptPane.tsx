"use client";
// One focused concept pane.
//
// ORDER IS THE DESIGN. The first version read: three paragraphs of prose, then an
// analogy, then the diagram, then optional depth, then pitfalls. Measured on a
// 390px phone that meant scrolling 1,510px — nearly two full screens — before the
// first visual, with paragraphs up to 117 words. Correct content, unreadable shape.
//
// The order now front-loads what makes a concept click and defers what only some
// readers want:
//   1. the ONE judgment this trains (the concept's `why`, one line, unmissable)
//   2. the analogy — the cheapest handle on a new idea
//   3. the VISUAL: interactive widget, else code, else the schematic. Within the
//      first screen on a phone, always.
//   4. the explanation, chunked, with anything past the first two paragraphs
//      behind "Read the full explanation" — the same words, not fewer, just not
//      all at once
//   5. the worked example, collapsed (concrete, but long)
//   6. pitfalls, sub-cards, mnemonic, source
//
// Nothing was deleted. `depth`, `example` and the tail of `explanation` are all
// still here, one tap away. Less on screen, same material available.
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { Schematic } from "../Schematic";
import { FigureZoom } from "../FigureZoom";
import { getWidget } from "../viz";
import { CodeView } from "./CodeView";
import { para } from "./util";
import type { Concept, ConceptLesson } from "@/lib/types";

/** How many paragraphs of the main explanation show before the fold. */
const LEAD_PARAGRAPHS = 2;

export function ConceptPane({ locale, lessonConcept, meta, index, total, track, onNext }: {
  locale: Locale; lessonConcept: ConceptLesson; meta?: Concept; index: number; total: number; track: string; onNext: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const Widget = lessonConcept.visual ? getWidget(lessonConcept.visual.widgetId) : null;

  const paragraphs = para(t(lessonConcept.explanation, locale));
  const lead = paragraphs.slice(0, LEAD_PARAGRAPHS);
  const rest = paragraphs.slice(LEAD_PARAGRAPHS);
  const depthParas = lessonConcept.depth ? para(t(lessonConcept.depth, locale)) : [];
  // One control reveals both the rest of the explanation and the deeper read —
  // two separate "read more" buttons on one pane is noise.
  const hasMore = rest.length > 0 || depthParas.length > 0;
  const hasDiagram = !!lessonConcept.diagram && lessonConcept.diagram.kind !== "none";

  return (
    <section className="card lesson-content">
      <div className="cp-head">
        <span className="eyebrow">{m("lesson.step", locale)} {index + 1} {m("lesson.of", locale)} {total}</span>
      </div>
      <h2 className="cp-title">{meta ? t(meta.title, locale) : lessonConcept.slug}</h2>

      {/* 1. The judgment this concept trains. The single most useful sentence on
             the pane, so it leads instead of being buried in the spine. */}
      {meta?.why && <p className="cp-why">{t(meta.why, locale)}</p>}

      {/* 2. The analogy — a handle before the detail. */}
      {lessonConcept.analogy && (
        <p className="lesson-analogy">
          <span className="eyebrow">{m("lesson.analogy", locale)}</span> {t(lessonConcept.analogy, locale)}
        </p>
      )}

      {/* 3. The visual, above the prose. Widget > code > schematic: a thing you can
             manipulate teaches more than a thing you read, and real code more than
             a boxes-and-labels drawing. */}
      {Widget ? (
        <div className="cp-figure">
          <FigureZoom locale={locale} label={meta ? meta.title : undefined}>
            <Widget locale={locale} track={track as "general" | "ai"} params={lessonConcept.visual!.params} />
          </FigureZoom>
        </div>
      ) : lessonConcept.code ? (
        <div className="cp-figure">
          <CodeView code={lessonConcept.code} locale={locale} track={track as "general" | "ai"} />
        </div>
      ) : hasDiagram ? (
        <div className="cp-figure">
          <FigureZoom locale={locale} label={lessonConcept.diagram.caption ?? (meta ? meta.title : undefined)}>
            <Schematic spec={lessonConcept.diagram} locale={locale} />
          </FigureZoom>
        </div>
      ) : null}

      {/* 4. The explanation: two paragraphs, then the rest on request. */}
      {lead.map((p, i) => (
        <p key={i} className="prose cp-para">{p}</p>
      ))}

      {hasMore && (
        <div className="cp-more">
          <button className="btn btn-sm" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
            {expanded ? m("lesson.readLess", locale) : m("lesson.readFull", locale)}
          </button>
          {expanded && (
            <div className="cp-morebody">
              {rest.map((p, i) => <p key={`r${i}`} className="prose cp-para">{p}</p>)}
              {depthParas.length > 0 && (
                <>
                  <p className="eyebrow cp-deeplabel">{m("lesson.readMore", locale)}</p>
                  {depthParas.map((p, i) => <p key={`d${i}`} className="prose cp-para">{p}</p>)}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* If a widget or code took the figure slot, the schematic is still worth
          offering — but folded, so it never becomes a second wall. */}
      {(Widget || lessonConcept.code) && hasDiagram && (
        <details className="cp-fold">
          <summary>{m("lesson.showDiagram", locale)}</summary>
          <div className="cp-figure">
            <FigureZoom locale={locale} label={lessonConcept.diagram.caption ?? undefined}>
              <Schematic spec={lessonConcept.diagram} locale={locale} />
            </FigureZoom>
          </div>
        </details>
      )}

      {/* Code stays available even when a widget won the figure slot. */}
      {Widget && lessonConcept.code && (
        <details className="cp-fold">
          <summary>{m("lesson.showCode", locale)}</summary>
          <div className="cp-figure">
            <CodeView code={lessonConcept.code} locale={locale} track={track as "general" | "ai"} />
          </div>
        </details>
      )}

      {/* 5. The worked example: concrete and long, so collapsed by default. */}
      {lessonConcept.example && (
        <div className="cp-example">
          <button className="btn btn-sm" aria-expanded={showExample} onClick={() => setShowExample((v) => !v)}>
            {showExample ? m("lesson.hideExample", locale) : m("lesson.showExample", locale)}
          </button>
          {showExample && (
            <div className="cp-examplebody">
              <p className="cp-scenario">{t(lessonConcept.example.scenario, locale)}</p>
              {para(t(lessonConcept.example.walkthrough, locale)).map((p, i) => (
                <p key={i} className="prose cp-para">{p}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Pitfalls — short, scannable, high-value. Stays open. */}
      {lessonConcept.pitfalls?.length ? (
        <div className="lesson-pitfalls">
          <p className="eyebrow">{m("lesson.pitfalls", locale)}</p>
          <ul className="lesson-keypoints">
            {lessonConcept.pitfalls.map((p, i) => <li key={i}>{t(p, locale)}</li>)}
          </ul>
        </div>
      ) : null}

      {lessonConcept.children?.length ? (
        <div className="subcards">
          {lessonConcept.children.map((c, i) => (
            <div key={i} className="subcard">
              <p className="subcard-label">{t(c.label, locale)}</p>
              <p className="subcard-detail">{t(c.detail, locale)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {lessonConcept.mnemonic && (
        <div className="mnemonic-callout">
          <span className="eyebrow">{t({ en: "Remember this", es: "Recuerda esto" }, locale)}</span>
          <p className="mnemonic-text">{t(lessonConcept.mnemonic, locale)}</p>
        </div>
      )}

      {(lessonConcept.source || meta?.source) && (
        <p className="cp-source eyebrow">
          {m("lesson.source", locale)}: {lessonConcept.source ?? meta?.source}
        </p>
      )}

      <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""} cp-next`} onClick={onNext}>
        {index + 1 < total ? m("lesson.markReadNext", locale) : m("lesson.startCheck", locale)} →
      </button>
    </section>
  );
}
