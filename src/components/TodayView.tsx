"use client";
// The Daily Brief — the app's habit surface and its default front door.
//
// One screen, one obvious action: today's concept, today's checks, and whatever
// spaced review fell due. It is deliberately SHORT (a fresh concept + up to two
// checks + up to three reviews ≈ 10-15 min) because a daily ritual that doesn't
// fit in a coffee break gets abandoned, and an abandoned ritual teaches nothing.
//
// Everything the brief decides is computed by the pure engines (daily.ts,
// review.ts) from (day key, progress). This component only renders and records.
import { useEffect, useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { AXIS_BY_ID, AXIS_COLOR } from "@/lib/axes";
import { buildDaily, streakSummary, type DailyBrief } from "@/lib/daily";
import { reviewForecast } from "@/lib/review";
import { climbSummary } from "@/lib/climb";
import type { ConceptCtx } from "@/lib/curriculum";
import { getLesson } from "@/lib/lessons";
import { practiceChecksForConcept } from "@/lib/checks";
import {
  load, todayKey, markConceptRead, enrollReview, recordReview, completeDaily,
  skipConcept, awardSignal, type Progress,
} from "@/lib/store";
import type { Grade } from "@/lib/review";
import type { ConceptLesson, CheckItem } from "@/lib/types";
import { ConceptPane } from "./lesson/ConceptPane";
import { CheckHost } from "./checks/CheckHost";
import { StreakRibbon } from "./StreakRibbon";
import { DailyShare } from "./DailyShare";
import { ResourceList } from "./ResourceList";
import { PageHeroArt } from "./PageHeroArt";
import { resourcesForConcept } from "@/lib/resources";
import { fireReward } from "./Reward";

type Stage = "brief" | "learn" | "check" | "review" | "done";

export function TodayView({ locale }: { locale: Locale }) {
  // Progress + the day key are BROWSER facts. During SSG there is no learner and
  // no local date, so we render a neutral skeleton and hydrate on mount. This
  // keeps the static export honest (no server-guessed "today") and avoids a
  // hydration mismatch on the streak numbers.
  const [progress, setProgress] = useState<Progress | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("brief");
  const [checkIdx, setCheckIdx] = useState(0);
  const [checkResults, setCheckResults] = useState<boolean[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewsDone, setReviewsDone] = useState(0);
  /**
   * The day's assignment, SNAPSHOT once per day.
   *
   * `buildDaily` is a pure function of progress, and the flow mutates progress as
   * it goes — marking the concept read, advancing review schedules. Recomputing
   * the brief on every render therefore made it drift mid-session: the fresh
   * concept silently became a different one after `finishLearn`, and the review
   * queue SHRANK under a live index, skipping items and reporting "Review 2 of 2"
   * for a 3-item queue. Snapshotting is the fix: today's brief is decided once.
   */
  const [brief, setBrief] = useState<DailyBrief | null>(null);

  useEffect(() => {
    const p = load();
    const d = todayKey();
    setProgress(p);
    setDay(d);
    setBrief(
      buildDaily({
        day: d,
        conceptsRead: p.conceptsRead,
        reviews: p.reviews,
        unlockedThrough: climbSummary(p).currentLevel,
        excluded: p.skipped,
      })
    );
  }, []);

  if (!progress || !day || !brief) return <TodaySkeleton locale={locale} />;
  // Narrowed aliases. The early return proves these are set, but TypeScript can't
  // carry that narrowing into the event handlers below (they capture the mutable
  // state variables), so bind them once here instead of asserting at each use.
  const today: string = day;
  const todayBrief: DailyBrief = brief;
  const streak = streakSummary(progress.streak, day);
  const forecast = reviewForecast(progress.reviews, day, 7);
  const record = progress.dailyLog[day];

  // The fresh concept's authored lesson content (explanation, widget, pitfalls).
  const freshLesson: ConceptLesson | undefined = todayBrief.fresh
    ? getLesson(todayBrief.fresh.domainId, todayBrief.fresh.level)?.concepts.find(
        (c) => c.slug === todayBrief.fresh!.concept.slug
      )
    : undefined;
  // Today's knowledge checks: the PRACTICE pool for the fresh concept, capped at
  // two so the brief stays a brief.
  //
  // Must be the practice pool, not the raw array. Serving `checksForConcept(...)`
  // here handed back every one of the 70 held-out graded checkpoint checks, undoing
  // the pool split entirely from a surface that had never heard of it.
  const checks: CheckItem[] = todayBrief.fresh ? practiceChecksForConcept(todayBrief.fresh.concept.slug).slice(0, 2) : [];
  const reviewQueue = todayBrief.reviews;
  const resources = todayBrief.fresh ? resourcesForConcept(todayBrief.fresh.concept.slug) : [];

  function refresh() { setProgress(load()); }

  function startLearn() {
    setStage("learn");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Reviews-only day: no fresh concept to read, straight into the queue. */
  function startReviews() {
    setStage("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Finished reading the fresh concept: mark read + enroll it into review. */
  function finishLearn() {
    if (todayBrief.fresh) {
      markConceptRead(todayBrief.fresh.concept.slug);
      enrollReview(todayBrief.fresh.concept.slug, today);
    }
    refresh();
    setStage(checks.length ? "check" : reviewQueue.length ? "review" : "done");
    if (!checks.length && !reviewQueue.length) finalize(true, undefined, 0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onCheckResult(correct: boolean) {
    const results = [...checkResults, correct];
    setCheckResults(results);
    // Signal for demonstrated work only — a passed check, not participation.
    if (correct) awardSignal(5);
    const next = checkIdx + 1;
    if (next < checks.length) {
      setCheckIdx(next);
    } else {
      setStage(reviewQueue.length ? "review" : "done");
      if (!reviewQueue.length) finalize(true, results.every(Boolean), 0);
    }
    refresh();
  }

  function onReviewGrade(grade: Grade) {
    const slug = reviewQueue[reviewIdx].concept.slug;
    recordReview(slug, grade, today);
    const done = reviewsDone + 1;
    setReviewsDone(done);
    const next = reviewIdx + 1;
    if (next < reviewQueue.length) {
      setReviewIdx(next);
    } else {
      setStage("done");
      finalize(true, checkResults.length ? checkResults.every(Boolean) : undefined, done);
    }
    refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Write the day's record once, and fire the (informational) reward. */
  function finalize(learned: boolean, checkPassed: boolean | undefined, reviews: number) {
    const { newlyCompleted } = completeDaily(
      {
        conceptSlug: todayBrief.fresh?.concept.slug,
        domainId: todayBrief.domainId,
        learned,
        checkPassed,
        reviewsDone: reviews,
      },
      today
    );
    refresh();
    if (newlyCompleted) {
      fireReward({
        kind: "daily",
        title: m("today.rewardTitle", locale),
        body: m("today.rewardBody", locale),
        track,
        signal: 10,
      });
    }
  }

  /**
   * "Not this one" is the ONE action that should re-decide the day: the learner
   * asked for a different concept, so we set the current one aside and rebuild
   * the brief from the updated progress. Every other transition keeps the
   * snapshot, which is what stops the assignment drifting mid-flow.
   */
  function onSkip() {
    if (!todayBrief.fresh) return;
    const next = skipConcept(todayBrief.fresh.concept.slug);
    setProgress(next);
    setBrief(
      buildDaily({
        day: today,
        conceptsRead: next.conceptsRead,
        reviews: next.reviews,
        unlockedThrough: climbSummary(next).currentLevel,
        excluded: next.skipped,
      })
    );
    setStage("brief");
  }

  const axis = todayBrief.fresh ? AXIS_BY_ID[todayBrief.fresh.axisId] : null;
  const track = todayBrief.domainId === "ai-engineering" ? "ai" : "general";

  return (
    <div className="wrap today-wrap" data-track={track} style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)" }}>
      <div className="hero-band hero-band--slim">
        <PageHeroArt src="/hero/today.webp" />
        <div className="ws-head" style={{ marginBottom: "var(--s-4)" }}>
          <h1 className="ws-title">
            <span className="code">{m("today.eyebrow", locale)}</span>
            {m("today.title", locale)}
          </h1>
        </div>
      </div>

      <StreakRibbon locale={locale} streak={streak} forecast={forecast} />

      {/* ── Stage: the brief itself ─────────────────────────────────────── */}
      {stage === "brief" && (
        <>
          {/* "You're current" is only true when there is ALSO nothing to review.
              Keying it off `curriculumComplete` alone claimed the learner was up
              to date while due reviews sat unreachable behind it — the brief must
              still be startable whenever the review queue is non-empty. */}
          {todayBrief.curriculumComplete && reviewQueue.length === 0 ? (
            <section className="card today-card">
              <p className="eyebrow">{m("today.allCaughtUp", locale)}</p>
              <p className="prose">{m("today.allCaughtUpBody", locale)}</p>
              <Link className="btn btn-primary" href={`/${locale}/practice`}>{m("today.goPractice", locale)}</Link>
            </section>
          ) : todayBrief.curriculumComplete ? (
            /* Reviews only: every unlocked concept is read, but some are due. */
            <section className="card today-card today-fresh">
              <div className="today-meta">
                <span className="eyebrow">{m("today.reviewOnly", locale)}</span>
                {record && <span className="today-donepill">{m("today.doneToday", locale)}</span>}
              </div>
              <h2 className="today-conceptTitle">{m("today.reviewOnlyTitle", locale)}</h2>
              <p className="prose today-why">{m("today.reviewOnlyBody", locale)}</p>
              <div className="today-actions">
                <button className="btn btn-primary" onClick={startReviews}>
                  {m("today.startReviews", locale).replace("{n}", String(reviewQueue.length))}
                </button>
                <Link className="btn" href={`/${locale}/practice`}>{m("today.goPractice", locale)}</Link>
              </div>
            </section>
          ) : (
            <section className="card today-card today-fresh">
              <div className="today-meta">
                <span className="eyebrow" style={{ color: AXIS_COLOR[todayBrief.fresh!.axisId] }}>
                  {axis ? t(axis.short, locale) : ""} · {todayBrief.fresh!.level}
                </span>
                {record && <span className="today-donepill">{m("today.doneToday", locale)}</span>}
              </div>
              <h2 className="today-conceptTitle">{t(todayBrief.fresh!.concept.title, locale)}</h2>
              <p className="prose today-why">{t(todayBrief.fresh!.concept.why, locale)}</p>

              <div className="today-plan">
                <p className="eyebrow">{m("today.plan", locale)}</p>
                <ol className="today-planList">
                  <li>{m("today.planLearn", locale)}</li>
                  {checks.length > 0 && (
                    <li>{m("today.planCheck", locale).replace("{n}", String(checks.length))}</li>
                  )}
                  {reviewQueue.length > 0 && (
                    <li>{m("today.planReview", locale).replace("{n}", String(reviewQueue.length))}</li>
                  )}
                </ol>
              </div>

              <div className="today-actions">
                <button className="btn btn-primary" onClick={startLearn}>{m("today.begin", locale)}</button>
                <button className="btn" onClick={onSkip}>{m("today.notToday", locale)}</button>
              </div>
              <p className="today-note">{m("today.rotationNote", locale)}</p>
            </section>
          )}

          {reviewQueue.length > 0 && !todayBrief.curriculumComplete && stage === "brief" && (
            <section className="card today-card">
              <p className="eyebrow">{m("today.dueNow", locale)}</p>
              <ul className="today-reviewList">
                {reviewQueue.map((r) => (
                  <li key={r.concept.slug}>
                    <span aria-hidden="true" style={{ color: AXIS_COLOR[r.axisId] }}>●</span> {t(r.concept.title, locale)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* ── Stage: learn the fresh concept (the real lesson pane) ────────── */}
      {stage === "learn" && todayBrief.fresh && (
        <>
          {freshLesson ? (
            <ConceptPane
              locale={locale}
              lessonConcept={freshLesson}
              meta={todayBrief.fresh.concept}
              index={0}
              total={1}
              track={track}
              onNext={finishLearn}
            />
          ) : (
            // A spine concept whose deep lesson content isn't authored yet: we
            // still teach the judgment + source rather than showing an empty pane.
            <section className="card lesson-content">
              <h2 style={{ fontSize: "var(--t-h3)" }}>{t(todayBrief.fresh.concept.title, locale)}</h2>
              <p className="prose">{t(todayBrief.fresh.concept.why, locale)}</p>
              <p className="lesson-source">{m("lesson.source", locale)}: {todayBrief.fresh.concept.source}</p>
              <button className="btn btn-primary" onClick={finishLearn}>{m("lesson.markReadNext", locale)}</button>
            </section>
          )}
          {resources.length > 0 && (
            <ResourceList locale={locale} resources={resources} heading={m("today.goDeeper", locale)} />
          )}
        </>
      )}

      {/* ── Stage: today's knowledge check ──────────────────────────────── */}
      {stage === "check" && checks[checkIdx] && (
        <section className="card today-card">
          <p className="eyebrow">
            {m("today.check", locale)} {checkIdx + 1} {m("lesson.of", locale)} {checks.length}
          </p>
          <CheckHost
            key={checks[checkIdx].id}
            item={checks[checkIdx]}
            locale={locale}
            mode="graded"
            // Scored (it awards Signal), but the per-element feedback stays: the
            // brief serves a different concept every day and never re-offers the
            // same item, so there is no feedback-vector attack to defend against,
            // and hiding which blank was wrong would remove real teaching.
            showDetail
            onResult={onCheckResult}
          />
        </section>
      )}

      {/* ── Stage: spaced review ─────────────────────────────────────────── */}
      {stage === "review" && reviewQueue[reviewIdx] && (
        <ReviewCard
          locale={locale}
          ctx={reviewQueue[reviewIdx]}
          index={reviewIdx}
          total={reviewQueue.length}
          onGrade={onReviewGrade}
        />
      )}

      {/* ── Stage: done — the shareable record ───────────────────────────── */}
      {stage === "done" && (
        <section className="card today-card today-done">
          <p className="eyebrow">{m("today.completeEyebrow", locale)}</p>
          <h2 className="today-conceptTitle">{m("today.completeTitle", locale)}</h2>
          <p className="prose">{m("today.completeBody", locale)}</p>
          <ul className="today-summary">
            {todayBrief.fresh && <li>{t(todayBrief.fresh.concept.title, locale)}</li>}
            {checkResults.length > 0 && (
              <li>
                {m("today.checksPassed", locale)
                  .replace("{n}", String(checkResults.filter(Boolean).length))
                  .replace("{t}", String(checkResults.length))}
              </li>
            )}
            {reviewsDone > 0 && <li>{m("today.reviewsDone", locale).replace("{n}", String(reviewsDone))}</li>}
          </ul>
          <DailyShare
            locale={locale}
            day={day}
            concept={todayBrief.fresh?.concept}
            axisId={todayBrief.fresh?.axisId}
            streak={streak}
            checkResults={checkResults}
          />
          <div className="today-actions">
            <Link className="btn btn-primary" href={`/${locale}/learn`}>{m("today.keepClimbing", locale)}</Link>
            {todayBrief.fresh && (
              <Link className="btn" href={`/${locale}/lesson/${todayBrief.fresh.domainId}-${todayBrief.fresh.level.toLowerCase()}`}>
                {m("today.wholeLesson", locale)}
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * A spaced review. Not a flashcard: we re-pose the concept's JUDGMENT question
 * and ask the learner to answer it in their head before revealing the authored
 * answer, then self-grade. Self-grading is the honest option here — a scenario
 * answer isn't machine-checkable, and Bjork's work on judgments of learning says
 * the retrieval attempt is what does the work, not the score.
 */
function ReviewCard({
  locale, ctx, index, total, onGrade,
}: {
  locale: Locale;
  // Reuse the engine's own type rather than restating its shape — a local
  // structural copy silently rots the moment the spine gains an axis.
  ctx: ConceptCtx;
  index: number;
  total: number;
  onGrade: (g: Grade) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { setRevealed(false); }, [ctx.concept.slug]);

  return (
    <section className="card today-card today-review">
      <p className="eyebrow">
        {m("today.reviewStep", locale)} {index + 1} {m("lesson.of", locale)} {total}
      </p>
      <h2 className="today-conceptTitle">{t(ctx.concept.title, locale)}</h2>
      <p className="prose today-recallPrompt">{m("today.recallPrompt", locale)}</p>

      {!revealed ? (
        <button className="btn btn-primary" onClick={() => setRevealed(true)}>
          {m("today.reveal", locale)}
        </button>
      ) : (
        <>
          <div className="today-revealPanel">
            <p className="eyebrow">{m("today.theJudgment", locale)}</p>
            <p className="prose">{t(ctx.concept.why, locale)}</p>
            <p className="lesson-source">{m("lesson.source", locale)}: {ctx.concept.source}</p>
          </div>
          <p className="eyebrow" style={{ marginTop: "var(--s-4)" }}>{m("today.howDid", locale)}</p>
          <div className="today-grades">
            {(["again", "hard", "good", "easy"] as Grade[]).map((g) => (
              <button key={g} className="btn today-grade" data-grade={g} onClick={() => onGrade(g)}>
                {m(`today.grade.${g}` as never, locale)}
              </button>
            ))}
          </div>
          <p className="today-note">{m("today.gradeNote", locale)}</p>
        </>
      )}
    </section>
  );
}

/** Pre-hydration placeholder. Same shape as the real card so nothing jumps. */
function TodaySkeleton({ locale }: { locale: Locale }) {
  return (
    <div className="wrap today-wrap" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)" }}>
      <div className="ws-head" style={{ marginBottom: "var(--s-4)" }}>
        <h1 className="ws-title">
          <span className="code">{m("today.eyebrow", locale)}</span>
          {m("today.title", locale)}
        </h1>
      </div>
      <section className="card today-card">
        <p className="prose">{m("today.loading", locale)}</p>
        <noscript>
          <p className="prose">{m("today.noscript", locale)}</p>
        </noscript>
      </section>
    </div>
  );
}
