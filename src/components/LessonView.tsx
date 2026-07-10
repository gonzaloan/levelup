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
import { checksForLesson } from "@/lib/checks";
import { ConceptPane } from "./lesson/ConceptPane";
import { MidQuiz } from "./lesson/MidQuiz";
import { Practice } from "./lesson/Practice";
import { FlashcardDeck } from "./lesson/FlashcardDeck";
import { CheatSheet } from "./lesson/CheatSheet";
import { ExamRunner } from "./lesson/ExamRunner";
import { para, lessonLevel, lessonAxisId } from "./lesson/util";
import type { Lesson, Concept } from "@/lib/types";

type Stage = "learn" | "recall" | "check" | "practice" | "done";

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
  // Optional lesson-flow features surfaced from the done/summary stage.
  const [showCheat, setShowCheat] = useState(false);
  const [showExam, setShowExam] = useState(false);

  const total = lesson.concepts.length;
  // All authored flashcards across the lesson's concepts — one optional recall
  // deck. If no concept has any, the recall step simply never appears.
  const flashcards = lesson.concepts.flatMap((c) => c.flashcards ?? []);
  const hasCheat = !!lesson.cheatSheet && lesson.cheatSheet.length > 0;
  const hasExam = lesson.midQuiz.length > 0;
  // Up to 2 formative checks for this lesson (instant feedback, no score).
  const practiceChecks = checksForLesson(lesson.lessonId).slice(0, 2);
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
    <div className="wrap lesson-wrap" data-track={track} style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)" }}>
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
          <div style={{ display: "flex", gap: "var(--s-3)", alignItems: "center", marginBottom: "var(--s-3)", flexWrap: "wrap" }}>
            <span className="level-tag">{level}</span>
            <span className="eyebrow">{t(axis.name, locale)}</span>
          </div>
          <h1 className="display" style={{ fontSize: "var(--t-h1)" }}>
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
        <MidQuiz locale={locale} items={lesson.midQuiz} track={track} onDone={afterCheck} />
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
            <ExamRunner locale={locale} items={lesson.midQuiz} track={track} onExit={() => setShowExam(false)} />
          )}
          {showCheat && hasCheat && (
            <CheatSheet locale={locale} sections={lesson.cheatSheet} track={track} />
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
