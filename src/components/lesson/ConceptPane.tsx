"use client";
// One focused concept pane in the lesson's "learn" stage: prose → analogy →
// interactive widget or diagram → optional deeper read → pitfalls → source.
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { Schematic } from "../Schematic";
import { getWidget } from "../viz";
import { para } from "./util";
import type { Concept, ConceptLesson } from "@/lib/types";

export function ConceptPane({ locale, lessonConcept, meta, index, total, track, onNext }: {
  locale: Locale; lessonConcept: ConceptLesson; meta?: Concept; index: number; total: number; track: string; onNext: () => void;
}) {
  const [deep, setDeep] = useState(false);
  const Widget = lessonConcept.visual ? getWidget(lessonConcept.visual.widgetId) : null;
  return (
    <section className="card lesson-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--s-3)", marginBottom: "var(--s-3)" }}>
        <span className="eyebrow">{m("lesson.step", locale)} {index + 1} {m("lesson.of", locale)} {total}</span>
      </div>
      <h2 style={{ fontSize: "var(--t-h3)", marginBottom: "var(--s-4)" }}>
        {meta ? t(meta.title, locale) : lessonConcept.slug}
      </h2>
      {para(t(lessonConcept.explanation, locale)).map((p, i) => (
        <p key={i} className="prose" style={{ marginBottom: "var(--s-3)" }}>{p}</p>
      ))}

      {/* Analogy callout — a plain-language handle on the idea. */}
      {lessonConcept.analogy && (
        <p className="lesson-analogy">
          <span className="eyebrow">{m("lesson.analogy", locale)}</span> {t(lessonConcept.analogy, locale)}
        </p>
      )}

      {/* Interactive widget takes priority; else the inline diagram. */}
      {Widget ? (
        <div style={{ margin: "var(--s-5) 0" }}>
          <Widget locale={locale} track={track as "general" | "ai"} params={lessonConcept.visual!.params} />
        </div>
      ) : lessonConcept.diagram && lessonConcept.diagram.kind !== "none" ? (
        <div style={{ margin: "var(--s-5) 0" }}>
          <Schematic spec={lessonConcept.diagram} locale={locale} />
        </div>
      ) : null}

      {/* Optional deeper read layer. */}
      {lessonConcept.depth && (
        <div style={{ marginTop: "var(--s-4)" }}>
          <button className="btn btn-sm" aria-expanded={deep} onClick={() => setDeep((d) => !d)}>
            {deep ? m("lesson.readLess", locale) : m("lesson.readMore", locale)}
          </button>
          {deep && para(t(lessonConcept.depth, locale)).map((p, i) => (
            <p key={i} className="prose" style={{ marginTop: "var(--s-3)" }}>{p}</p>
          ))}
        </div>
      )}

      {/* Pitfalls callout. */}
      {lessonConcept.pitfalls?.length ? (
        <div className="lesson-pitfalls">
          <p className="eyebrow">{m("lesson.pitfalls", locale)}</p>
          <ul className="lesson-keypoints">
            {lessonConcept.pitfalls.map((p, i) => <li key={i}>{t(p, locale)}</li>)}
          </ul>
        </div>
      ) : null}

      {(lessonConcept.source || meta?.source) && (
        <p className="eyebrow" style={{ marginTop: "var(--s-4)", fontSize: "0.625rem", color: "var(--text-4)", letterSpacing: "0.08em" }}>
          {m("lesson.source", locale)}: {lessonConcept.source ?? meta?.source}
        </p>
      )}

      <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} style={{ marginTop: "var(--s-6)" }} onClick={onNext}>
        {index + 1 < total ? m("lesson.markReadNext", locale) : m("lesson.startCheck", locale)} →
      </button>
    </section>
  );
}
