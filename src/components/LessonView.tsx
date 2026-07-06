"use client";
// A Lesson — one clean, ordered learning flow for a domain×level cluster.
// Stage 1 "learn": overview, then each concept one focused pane at a time
// (explanation → schematic → key takeaways), a progress rail across concepts.
// Stage 2 "check": the mid-lesson formative quiz. Stage 3 "done": the final
// test (checkpoint) + the next lesson. This replaces the dense card grid with
// a single obvious path: read → check → prove → continue.
import { useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { AXIS_BY_ID, type Level } from "@/lib/axes";
import { Schematic } from "./Schematic";
import { markConceptsRead } from "@/lib/store";
import type { Lesson, Concept, QuizItem } from "@/lib/types";

type Stage = "learn" | "check" | "done";

export function LessonView({
  locale, lesson, concepts, checkpointId, nextLesson,
}: {
  locale: Locale;
  lesson: Lesson;
  concepts: Concept[];      // spine concepts (title + source), aligned to lesson.concepts by slug
  checkpointId: string | null;
  nextLesson: { id: string; domainId: string; level: Level; title: string } | null;
}) {
  const axis = AXIS_BY_ID[lessonAxisId(lesson.lessonId)];
  const level = lessonLevel(lesson.lessonId);
  const track = lesson.lessonId.startsWith("ai-engineering") ? "ai" : "general";
  const conceptMeta = new Map(concepts.map((c) => [c.slug, c]));

  const [stage, setStage] = useState<Stage>("learn");
  // -1 = overview pane, then 0..n-1 concept panes
  const [idx, setIdx] = useState(-1);

  const total = lesson.concepts.length;

  function advance() {
    if (idx + 1 < total) {
      setIdx(idx + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // finished reading — mark all concepts read, go to check
      markConceptsRead(lesson.concepts.map((c) => c.slug));
      setStage("check");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="wrap" data-track={track} style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)", maxWidth: 780 }}>
      {/* header */}
      <div style={{ display: "flex", gap: "var(--s-3)", alignItems: "center", marginBottom: "var(--s-3)", flexWrap: "wrap" }}>
        <span className="level-tag">{level}</span>
        <span className="eyebrow">{t(axis.name, locale)}</span>
      </div>
      <h1 className="display" style={{ fontSize: "var(--t-h1)", marginBottom: "var(--s-5)" }}>
        {t(axis.name, locale)} · {level}
      </h1>

      {/* progress rail: overview + one dot per concept + check + test */}
      <LessonRail stage={stage} idx={idx} total={total} locale={locale} />

      {stage === "learn" && (
        <div className="stack" style={{ gap: "var(--s-6)", marginTop: "var(--s-6)" }}>
          {idx === -1 ? (
            <section className="card lesson-overview">
              <p className="eyebrow" style={{ color: "var(--track-accent)" }}>{m("lesson.overview", locale)}</p>
              {para(t(lesson.overview, locale)).map((p, i) => (
                <p key={i} className="prose" style={{ fontSize: "1.0625rem", marginTop: i ? "var(--s-3)" : "var(--s-3)" }}>{p}</p>
              ))}
              <div style={{ marginTop: "var(--s-5)", borderTop: "1px solid var(--hairline)", paddingTop: "var(--s-4)" }}>
                <p className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>{m("lesson.whatYouLearn", locale)}</p>
                <ol className="lesson-toc">
                  {lesson.concepts.map((c, i) => (
                    <li key={c.slug}>
                      <span className="mono lesson-toc-n">{i + 1}</span>
                      {conceptMeta.get(c.slug) ? t(conceptMeta.get(c.slug)!.title, locale) : c.slug}
                    </li>
                  ))}
                </ol>
              </div>
              <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} style={{ marginTop: "var(--s-6)" }} onClick={advance}>
                {m("assess.start", locale)} →
              </button>
            </section>
          ) : (
            <ConceptPane
              locale={locale}
              lessonConcept={lesson.concepts[idx]}
              meta={conceptMeta.get(lesson.concepts[idx].slug)}
              index={idx}
              total={total}
              track={track}
              onNext={advance}
            />
          )}
        </div>
      )}

      {stage === "check" && (
        <Check locale={locale} items={lesson.midQuiz} track={track} onDone={() => { setStage("done"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      )}

      {stage === "done" && (
        <div className="stack" style={{ gap: "var(--s-5)", marginTop: "var(--s-6)" }}>
          <div className="card" style={{ borderColor: "var(--track)" }}>
            <p className="eyebrow" style={{ color: "var(--track-accent)" }}>◆ {m("lesson.finalTest", locale)}</p>
            <p className="prose" style={{ marginTop: "var(--s-3)" }}>{m("lesson.finalTestSub", locale)}</p>
            {checkpointId && (
              <Link href={`/${locale}/checkpoint/${checkpointId}`} className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} style={{ marginTop: "var(--s-5)" }}>
                {m("lesson.finalTest", locale)} →
              </Link>
            )}
          </div>
          {nextLesson && (
            <Link href={`/${locale}/lesson/${nextLesson.id}`} className="card card-interactive" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--s-4)" }}>
              <div>
                <span className="eyebrow">{m("lesson.next", locale)}</span>
                <div style={{ fontFamily: "var(--font-head)", fontWeight: 600, marginTop: 4 }}>{nextLesson.title}</div>
              </div>
              <span aria-hidden="true" style={{ color: "var(--track)", fontSize: "1.4rem" }}>→</span>
            </Link>
          )}
          <Link href={`/${locale}/path`} className="eyebrow">← {m("chk.backToPath", locale)}</Link>
        </div>
      )}
    </div>
  );
}

function ConceptPane({ locale, lessonConcept, meta, index, total, track, onNext }: {
  locale: Locale; lessonConcept: Lesson["concepts"][number]; meta?: Concept; index: number; total: number; track: string; onNext: () => void;
}) {
  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--s-3)", marginBottom: "var(--s-3)" }}>
        <span className="eyebrow">{m("lesson.step", locale)} {index + 1} {m("lesson.of", locale)} {total}</span>
      </div>
      <h2 style={{ fontSize: "var(--t-h3)", marginBottom: "var(--s-4)" }}>
        {meta ? t(meta.title, locale) : lessonConcept.slug}
      </h2>
      {para(t(lessonConcept.explanation, locale)).map((p, i) => (
        <p key={i} className="prose" style={{ marginBottom: "var(--s-3)" }}>{p}</p>
      ))}

      {lessonConcept.diagram && lessonConcept.diagram.kind !== "none" && (
        <div style={{ margin: "var(--s-5) 0" }}>
          <Schematic spec={lessonConcept.diagram} locale={locale} />
        </div>
      )}

      {lessonConcept.keyPoints?.length > 0 && (
        <div style={{ marginTop: "var(--s-5)", borderTop: "1px solid var(--hairline)", paddingTop: "var(--s-4)" }}>
          <p className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>{m("lesson.keyPoints", locale)}</p>
          <ul className="lesson-keypoints">
            {lessonConcept.keyPoints.map((kp, i) => (
              <li key={i}>{t(kp, locale)}</li>
            ))}
          </ul>
        </div>
      )}

      {meta?.source && (
        <p className="eyebrow" style={{ marginTop: "var(--s-4)", fontSize: "0.625rem", color: "var(--text-4)", letterSpacing: "0.08em" }}>
          {m("lesson.source", locale)}: {meta.source}
        </p>
      )}

      <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} style={{ marginTop: "var(--s-6)" }} onClick={onNext}>
        {index + 1 < total ? m("lesson.markReadNext", locale) : m("lesson.startCheck", locale)} →
      </button>
    </section>
  );
}

function Check({ locale, items, track, onDone }: { locale: Locale; items: QuizItem[]; track: string; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const item = items[i];
  if (!item) { onDone(); return null; }
  const revealed = picked !== null;
  function next() {
    if (i + 1 < items.length) { setI(i + 1); setPicked(null); }
    else onDone();
  }
  return (
    <div className="stack" style={{ gap: "var(--s-4)", marginTop: "var(--s-6)" }}>
      <div>
        <p className="eyebrow" style={{ color: "var(--track-accent)" }}>{m("lesson.check", locale)} · {i + 1}/{items.length}</p>
        <p className="dim" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>{m("lesson.checkIntro", locale)}</p>
      </div>
      <div className="card">
        <p style={{ color: "var(--text)", marginBottom: "var(--s-5)", fontSize: "1.0625rem" }}>{t(item.stem, locale)}</p>
        <div className="stack">
          {item.options.map((o, oi) => {
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
          <div style={{ marginTop: "var(--s-4)", padding: "var(--s-4)", background: item.options[picked!].correct ? "var(--ok-bg)" : "var(--bad-bg)", borderRadius: "var(--r-sm)" }}>
            <p className="eyebrow" style={{ color: item.options[picked!].correct ? "var(--ok)" : "var(--bad)", marginBottom: 6 }}>
              {item.options[picked!].correct ? `✓ ${m("lesson.correct", locale)}` : `✗ ${m("lesson.notQuite", locale)}`}
            </p>
            <p style={{ fontSize: "var(--t-sm)", color: "var(--text)" }}>{t(item.options[picked!].rationale, locale)}</p>
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

function LessonRail({ stage, idx, total, locale }: { stage: Stage; idx: number; total: number; locale: Locale }) {
  // Represent: overview • concept dots • check • test
  const readCount = stage === "learn" ? Math.max(0, idx + 1) : total;
  const pct = stage === "done" ? 100 : stage === "check" ? 90 : Math.round(((idx + 1) / (total + 1)) * 80);
  return (
    <div>
      <div className="meter" style={{ ["--meter-val" as string]: String(pct), ["--meter-accent" as string]: "var(--track)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span className="eyebrow">{readCount}/{total} {m("lesson.progress", locale)}</span>
        <span className="eyebrow">
          {stage === "learn" ? m("lesson.read", locale) : stage === "check" ? m("lesson.check", locale) : m("lesson.finalTest", locale)}
        </span>
      </div>
    </div>
  );
}

// helpers
function para(s: string): string[] { return s.split("\n").map((x) => x.trim()).filter(Boolean); }
function lessonLevel(id: string): Level { return id.split("-").pop()!.toUpperCase() as Level; }
function lessonAxisId(id: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const map: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
    "technical-depth": 1, "systems-architecture": 2, "execution-delivery": 3,
    "direction-influence": 4, "leveling-scope": 5, "ai-engineering": 6,
  };
  const domain = id.replace(/-l[3-7]$/, "");
  return map[domain] ?? 1;
}
