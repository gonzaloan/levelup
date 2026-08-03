"use client";
// A Lesson — one clean, ordered learning flow for a domain×level cluster.
// Stage "learn": overview, then each concept one focused pane at a time
// (ConceptPane). Stage "check": the mid-lesson formative quiz (MidQuiz). Stage
// "practice": the novel hands-on checks (Practice). Stage "done": the final
// test (checkpoint) + the next lesson. A single obvious path: read → check →
// practice → prove → continue. Subcomponents live in ./lesson/.
import { useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { AXIS_BY_ID, type Level } from "@/lib/axes";
import { SceneryBackground } from "./SceneryBackground";
import { ConceptNav } from "./ConceptNav";
import { ContextRail } from "./ContextRail";
import { markConceptsRead } from "@/lib/store";
import { practiceChecksForLesson } from "@/lib/checks";
import { resourcesForConcepts } from "@/lib/resources";
import { ResourceList } from "./ResourceList";
import { ConceptPane } from "./lesson/ConceptPane";
import { MidQuiz } from "./lesson/MidQuiz";
import { Practice } from "./lesson/Practice";
import { FlashcardDeck } from "./lesson/FlashcardDeck";
import { CheatSheet } from "./lesson/CheatSheet";
import { ExamRunner } from "./lesson/ExamRunner";
import { para, leadAndRest, lessonLevel, lessonAxisId } from "./lesson/util";
import type { Lesson, Concept } from "@/lib/types";

type Stage = "learn" | "recall" | "check" | "practice" | "done";

// The overview fold's label. Inline {en,es} per the build contract for new
// chrome — the shared catalog is for strings the whole fleet uses.
const MORE_CONTEXT = { en: "More on why this band matters", es: "Más sobre por qué importa este nivel" } as const;

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
  // A short lead up front, the remaining framing behind a fold. The first
  // paragraph is itself split at a sentence boundary, because several of them
  // open with a single 50-90 word sentence.
  const overviewParas = para(t(lesson.overview, locale));
  const [overviewLead, leadTail] = leadAndRest(overviewParas[0] ?? "");
  const overviewRest = [leadTail, ...overviewParas.slice(1)].filter(Boolean);

  const [stage, setStage] = useState<Stage>("learn");
  // -1 = overview pane, then 0..n-1 concept panes
  const [idx, setIdx] = useState(-1);
  // Optional lesson-flow features surfaced from the done/summary stage.
  const [showCheat, setShowCheat] = useState(false);
  const [showExam, setShowExam] = useState(false);

  const total = lesson.concepts.length;
  // All authored flashcards across the lesson's concepts — one optional recall
  // deck. If no concept has any, the recall step simply never appears.
  const flashcards = lesson.concepts.flatMap((c) => c.flashcards ?? []);
  const hasCheat = !!lesson.cheatSheet && lesson.cheatSheet.length > 0;
  const hasExam = lesson.midQuiz.length > 0;
  // Formative checks for this lesson (instant feedback, no score, free retry).
  // Drawn from the PRACTICE pool only — the checkpoint's graded items are held
  // out, so clearing the gate is not a replay of a puzzle already solved here.
  // The cap was 2, which left 294 of 368 authored checks unreachable by anyone.
  const practiceChecks = practiceChecksForLesson(lesson.lessonId).slice(0, 4);
  // Primary sources attached to any concept in this lesson (deduped, essentials
  // first). Empty for lessons whose concepts have no mapped resources yet —
  // ResourceList renders nothing at all in that case.
  const lessonResources = resourcesForConcepts(lesson.concepts.map((c) => c.slug));
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const afterCheck = () => { setStage(practiceChecks.length ? "practice" : "done"); scrollTop(); };

  function advance() {
    if (idx + 1 < total) {
      setIdx(idx + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // finished reading — mark all concepts read, then optionally recall,
      // otherwise straight to the check.
      markConceptsRead(lesson.concepts.map((c) => c.slug));
      setStage(flashcards.length ? "recall" : "check");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function jump(i: number) {
    setStage("learn");
    setIdx(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    /* Top padding is a clamp rather than a fixed --s-10: on a 390px phone the
       lesson's chrome (hero + read rail + concept strip) spent ~380px before the
       concept pane started, which pushed the pane's figure past the fold. These
       are inline styles, so no stylesheet rule can compress them — the responsive
       value has to live here. */
    <div className="wrap lesson-wrap" data-track={track}
      style={{ paddingTop: "clamp(var(--s-5), 4vw, var(--s-10))", paddingBottom: "var(--s-16)" }}>
      <SceneryBackground track={track as "general" | "ai"} />
      {/* header — the domain's world splash (public/worlds/<axis.key>.webp) rides
          behind the title as a masked, aria-hidden decorative layer, exactly like
          the landing hero. axis.key matches the filename 1:1; if the file is
          absent the authored SceneryBackground shows through underneath, so the
          header always reads as intentional whether or not the art exists. */}
      <div style={{ position: "relative", overflow: "clip", marginBottom: "var(--s-5)" }}>
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(90deg, var(--bg), transparent 55%), url(/worlds/${axis.key}.webp)`,
          backgroundRepeat: "no-repeat, no-repeat",
          backgroundPosition: "center, right center",
          backgroundSize: "cover, min(52%, 420px) auto",
          opacity: 0.45,
          maskImage: "linear-gradient(90deg, transparent 0, #000 42%, #000 82%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 42%, #000 82%, transparent 100%)",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", gap: "var(--s-3)", alignItems: "center", marginBottom: "var(--s-2)", flexWrap: "wrap" }}>
            <span className="level-tag">{level}</span>
            {/* The domain name is in the h1 directly below, so on a phone this
                eyebrow is the same words twice — hidden there, kept on wider
                screens where it reads as a category label rather than a repeat. */}
            <span className="eyebrow lesson-eyebrow">{t(axis.name, locale)}</span>
          </div>
          {/* Its own clamp, not --t-h1: that token floors at 2rem, which wraps
              "Cloud & Platform Engineering · L7" onto two lines and costs 70px of
              a phone's first screen.

              The clamp lives in a CSS class now, not an inline style. As an inline
              style it beat every stylesheet rule, so the phone rule that shrinks
              this heading once the reader is inside a concept pane could not take
              effect — the heading stayed at 26px and the code artifact stayed
              below the fold. See `.lesson-h1` in 24-concept-pane.css. */}
          <h1 className="display lesson-h1">
            {t(axis.name, locale)} · {level}
          </h1>
        </div>
      </div>

      {/* progress rail: overview + one dot per concept + check + test */}
      <LessonRail stage={stage} idx={idx} total={total} locale={locale} />

      {stage === "learn" && idx === -1 && (
        <div className="stack" style={{ gap: "var(--s-6)", marginTop: "var(--s-6)", maxWidth: 780 }}>
          <section className="card lesson-overview">
            <p className="eyebrow" style={{ color: "var(--track-accent)" }}>{m("lesson.overview", locale)}</p>
            {/* Overviews run 78-268 words across 2-3 paragraphs. All of that
                before the table of contents meant a phone reader scrolled two
                screens of prose before learning what the lesson even contains.
                The first paragraph frames the band; the contents list is the
                concrete thing; the rest of the framing waits behind a fold. */}
            <p className="cp-para" style={{ fontSize: "1.0625rem", marginTop: "var(--s-3)" }}>{overviewLead}</p>
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
            {overviewRest.length > 0 && (
              <details className="cp-fold" style={{ marginTop: "var(--s-5)", marginBottom: 0 }}>
                <summary>{t(MORE_CONTEXT, locale)}</summary>
                <div className="cp-morebody">
                  {overviewRest.map((p, i) => (
                    <p key={i} className="cp-para" style={{ fontSize: "1.0625rem" }}>{p}</p>
                  ))}
                </div>
              </details>
            )}
          </section>
        </div>
      )}

      {stage === "learn" && idx >= 0 && (
        <div className="lesson-grid" style={{ marginTop: "var(--s-6)" }}>
          <ConceptNav locale={locale} concepts={lesson.concepts} meta={conceptMeta} idx={idx} onJump={jump} />
          <ConceptPane
            locale={locale}
            lessonConcept={lesson.concepts[idx]}
            meta={conceptMeta.get(lesson.concepts[idx].slug)}
            index={idx}
            total={total}
            track={track}
            onNext={advance}
          />
          <ContextRail locale={locale} concept={lesson.concepts[idx]} track={track as "general" | "ai"} />
        </div>
      )}

      {stage === "recall" && (
        <FlashcardDeck locale={locale} cards={flashcards} track={track}
          onDone={() => { setStage("check"); scrollTop(); }} />
      )}

      {stage === "check" && (
        <MidQuiz locale={locale} items={lesson.midQuiz} track={track} onDone={afterCheck} scope={lesson.lessonId} />
      )}

      {stage === "practice" && (
        <Practice locale={locale} checks={practiceChecks} track={track}
          onDone={() => { setStage("done"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
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
          {/* Optional lesson-flow extras: a timed run over the check items and
              the printable quick-reference sheet. Both feature-detected. */}
          {(hasExam || hasCheat) && (
            <div className="lesson-extras" style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
              {hasExam && (
                <button className="btn" aria-expanded={showExam} onClick={() => setShowExam((v) => !v)}>
                  ◇ {m("exam.title", locale)}
                </button>
              )}
              {hasCheat && (
                <button className="btn" aria-expanded={showCheat} onClick={() => setShowCheat((v) => !v)}>
                  ▤ {m("cheat.open", locale)}
                </button>
              )}
            </div>
          )}
          {showExam && hasExam && (
            <ExamRunner locale={locale} items={lesson.midQuiz} track={track} onExit={() => setShowExam(false)} scope={lesson.lessonId} />
          )}
          {showCheat && hasCheat && (
            <CheatSheet locale={locale} sections={lesson.cheatSheet} track={track} />
          )}
          {/* Primary sources for everything this lesson covered. Placed at the
              end deliberately: the reading list is what you take AWAY, not a
              detour that competes with the lesson you're still inside. */}
          <ResourceList locale={locale} resources={lessonResources} />
          {lessonResources.length > 0 && (
            <Link href={`/${locale}/resources`} className="eyebrow">{m("res.openAll", locale)} →</Link>
          )}
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

// The compact progress rail across the lesson stages. Small + tightly coupled to
// the stage machine, so it stays with the view.
function LessonRail({ stage, idx, total, locale }: { stage: Stage; idx: number; total: number; locale: Locale }) {
  const readCount = stage === "learn" ? Math.max(0, idx + 1) : total;
  const pct = stage === "done" ? 100 : stage === "practice" ? 95 : stage === "check" ? 90 : stage === "recall" ? 85 : Math.round(((idx + 1) / (total + 1)) * 80);
  return (
    <div>
      <div className="meter" style={{ ["--meter-val" as string]: String(pct), ["--meter-accent" as string]: "var(--track)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span className="eyebrow">{readCount}/{total} {m("lesson.progress", locale)}</span>
        <span className="eyebrow">
          {stage === "learn" ? m("lesson.read", locale) : stage === "recall" ? m("flash.title", locale) : stage === "check" ? m("lesson.check", locale) : m("lesson.finalTest", locale)}
        </span>
      </div>
    </div>
  );
}
