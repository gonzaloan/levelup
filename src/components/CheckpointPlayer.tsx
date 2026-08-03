"use client";
// Checkpoint quiz — the intermediate gate that confirms a learner understood a
// level band's cluster before advancing. Judgment items (one best answer +
// misconception distractors); every option teaches via its rationale. The gate
// is mastery-oriented (Bloom): you may miss at most one item. At the 4–5 item
// cluster sizes here that lands near the ~85% band without silently demanding a
// perfect 100%. Honest: the reasoning is graded, and falling short sends you
// back to the concepts, not through.
import { useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { AXIS_BY_ID } from "@/lib/axes";
import { recordCheckpoint } from "@/lib/store";
import { fireReward } from "./Reward";
import { BossIntro, BossHealth } from "./BossIntro";
import { gradedChecksForConcepts } from "@/lib/checks";
import { shuffleOptions, checkpointItemKey } from "@/lib/shuffle";
import { buildsForConcept } from "@/lib/build";
import { CheckHost } from "./checks/CheckHost";
import { ArchitectBuilder } from "./checks/ArchitectBuilder";
import { load } from "@/lib/store";
import { earnedBadges } from "@/lib/badges";
import type { Checkpoint, CheckpointItem } from "@/lib/types";

// Mastery gate: you may miss at most one item. Expressed as a score threshold
// derived from the item count so the store (which records a 0..1 score) stays
// simple: clearing needs (n-1)/n correct. At the 4–5 item clusters here that is
// 0.75–0.8 — mastery-oriented and honest, not a silent perfect-100% demand.
function clearThreshold(n: number): number {
  return n <= 1 ? 1 : (n - 1) / n;
}

export function CheckpointPlayer({ locale, checkpoint }: { locale: Locale; checkpoint: Checkpoint }) {
  const axis = AXIS_BY_ID[checkpoint.axisId];
  const track = checkpoint.domainId === "ai-engineering" ? "ai" : "general";
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  // Which attempt this is. It seeds the option shuffle, so retrying re-orders
  // every item instead of replaying a memorised sequence. See `retry()`.
  const [attempt, setAttempt] = useState(0);

  const items = checkpoint.items;
  // Graded novel-mechanic checks for this checkpoint's concepts (up to 2),
  // appended after the MCQ items. They count toward the same gate as booleans.
  //
  // Drawn from the HELD-OUT pool. This used to be `checksForConcept(...).slice(0,2)`,
  // which walked the same array the lesson's practice stage walks — so 66 of 70
  // graded checks were the same items the learner had just solved formatively with
  // free retry and the answer printed. See `poolFor` in lib/checks.ts.
  const gradedChecks = gradedChecksForConcepts(checkpoint.coversConcepts).slice(0, 2);
  // At most one graded Architecture Build for a covered concept, appended last —
  // a constructive item worth the same single boolean as any other step.
  const gradedBuild = checkpoint.coversConcepts
    .flatMap((slug) => buildsForConcept(slug))
    .slice(0, 1)[0];
  const checksStart = items.length;
  const buildStart = items.length + gradedChecks.length;
  const totalSteps = items.length + gradedChecks.length + (gradedBuild ? 1 : 0);
  const inMcq = idx < items.length;
  const item: CheckpointItem | undefined = inMcq ? items[idx] : undefined;
  const gradedCheck = idx >= checksStart && idx < buildStart ? gradedChecks[idx - checksStart] : undefined;
  const buildStep = gradedBuild && idx >= buildStart ? gradedBuild : undefined;
  const clear = clearThreshold(totalSteps);
  // Display order for the current MCQ's options, stable per item.
  // The attempt number is part of the key: without it, `itemKey` is a pure
  // function of stable inputs, so every retry presented all 183 items in an
  // identical order. Combined with the full answer reveal below, that made the
  // whole 35-checkpoint gate memorisable in two passes.
  const displayOptions = item
    ? shuffleOptions(item.options, checkpointItemKey(checkpoint.id, attempt, idx, item.stem.en))
    : [];
  // Human-facing gate: "miss at most one" reads truer than a percent at n≤5.
  const gateLabel = { en: "one miss allowed", es: "se permite un error" };

  function choose(oi: number) {
    if (picked !== null) return;
    setPicked(oi);
    if (item!.options[oi].correct) setCorrectCount((c) => c + 1);
  }

  // A graded check reports a single boolean, exactly like an MCQ item.
  function onCheckResult(correct: boolean) {
    if (correct) setCorrectCount((c) => c + 1);
    // advance after a beat so the learner sees the reveal
    setTimeout(() => {
      if (idx + 1 < totalSteps) setIdx(idx + 1);
      else finish(correctCount + (correct ? 1 : 0));
    }, 900);
  }

  function finish(finalCorrect: number) {
    const score = finalCorrect / totalSteps;
    setFinalScore(score);
    const before = new Set(earnedBadges(load()).map((b) => b.id));
    const outcome = recordCheckpoint(checkpoint.id, score, clear);
    if (outcome.newlyCleared) {
      fireReward({
        kind: "mastery", track, signal: 30,
        title: `${t(axis.short, locale).toUpperCase()} · ${checkpoint.afterLevel} · ${t({ en: "CHECKPOINT CLEARED", es: "PUNTO DE CONTROL SUPERADO" }, locale)}`,
        body: t({
          en: `You cleared the ${t(axis.name, "en")} checkpoint at ${checkpoint.afterLevel}. The band above opens — keep climbing.`,
          es: `Superaste el punto de control de ${t(axis.name, "es")} en ${checkpoint.afterLevel}. La banda superior se abre — sigue subiendo.`,
        }, locale),
      });
      // Badge threshold-crossing: fire an informational reward for any badge this
      // clear just unlocked (SDT: competence signal, not a celebration).
      const after = earnedBadges(load());
      for (const b of after) {
        if (before.has(b.id)) continue;
        fireReward({
          kind: "mastery", track,
          title: `★ ${t({ en: "BADGE UNLOCKED", es: "INSIGNIA DESBLOQUEADA" }, locale)} · ${t(b.name, locale)}`,
          body: t(b.description, locale),
        });
      }
    }
    setDone(true);
  }

  function next() {
    if (picked === null) return;
    if (idx + 1 < totalSteps) {
      setIdx(idx + 1);
      setPicked(null);
    } else {
      finish(correctCount);
    }
  }

  function retry() {
    // Advancing `attempt` reshuffles every item's options, so a second run is a
    // different exam rather than a recital of the first.
    setAttempt((a) => a + 1);
    setStarted(true); setIdx(0); setPicked(null); setCorrectCount(0); setDone(false); setFinalScore(0);
  }

  return (
    <div className="wrap" data-track={track} style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)", maxWidth: 780 }}>
      <div style={{ display: "flex", gap: "var(--s-3)", alignItems: "center", marginBottom: "var(--s-3)" }}>
        <span className="level-tag">{checkpoint.afterLevel}</span>
        <span className="eyebrow">{t(axis.name, locale)}</span>
        <span className="eyebrow" style={{ color: "var(--track)" }}>◆ {m("chk.eyebrow", locale)}</span>
      </div>
      <h1 className="display" style={{ fontSize: "var(--t-h1)", marginBottom: "var(--s-3)" }}>
        {t(axis.name, locale)} · {checkpoint.afterLevel}
      </h1>

      {!started && !done && (
        <div className="stack" style={{ gap: "var(--s-5)" }}>
          <p className="prose" style={{ fontSize: "1.0625rem" }}>{m("chk.intro", locale)}</p>
          <BossIntro locale={locale} domainId={checkpoint.domainId} total={totalSteps} track={track} onEngage={() => setStarted(true)}>
            <div className="card" style={{ background: "var(--film-1)" }}>
              <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>{m("chk.covers", locale)}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}>
                {[...new Set(items.map((it) => it.concept))].map((c) => (
                  <span key={c} className="mono" style={{ fontSize: "var(--t-xs)", padding: "3px 8px", borderRadius: "var(--r-xs)", border: "1px solid var(--hairline-2)", color: "var(--text-3)" }}>
                    {c}
                  </span>
                ))}
              </div>
              <span className="eyebrow" style={{ display: "block", marginTop: "var(--s-3)" }}>{totalSteps} · {t(gateLabel, locale)}</span>
            </div>
          </BossIntro>
          <Link href={`/${locale}/learn`} className="eyebrow">← {m("chk.backToPath", locale)}</Link>
        </div>
      )}

      {started && !done && (
        <div className="stack" style={{ gap: "var(--s-4)" }}>
          <span className="eyebrow">{m("chk.eyebrow", locale)} · {idx + 1}/{totalSteps}</span>
          {/* boss HP drains as you clear steps correctly */}
          <BossHealth remaining={totalSteps - correctCount} total={totalSteps} locale={locale} />
          <div className="meter" style={{ ["--meter-val" as string]: String(Math.round((idx / totalSteps) * 100)), ["--meter-accent" as string]: "var(--track)" }} />

          {item && (
            <div className="card">
              <p style={{ color: "var(--text)", marginBottom: "var(--s-5)", fontSize: "1.0625rem" }}>{t(item.stem, locale)}</p>
              <div className="stack">
                {/* Options are rendered in a deterministic shuffled order (see
                    lib/shuffle.ts): the authored JSON puts the correct answer
                    first almost everywhere, which made the gate clickable
                    without reading. `originalIndex` is what grading, `picked`
                    and the rationale key off — never the display position. */}
                {displayOptions.map(({ option: o, originalIndex: oi }) => {
                  const isPicked = picked === oi;
                  const revealed = picked !== null;
                  // On a WRONG answer, show only that the pick was wrong — not
                  // which option was right.
                  //
                  // This surface used to paint the correct option green on every
                  // reveal, so a failed attempt handed over 100% of the answer key,
                  // and `retry()` replayed the same items in a provably identical
                  // order. Two passes cleared any checkpoint. A learner who answers
                  // correctly still gets the full confirmation; a learner who does
                  // not gets their own rationale (which explains the misconception)
                  // and another attempt with a different presentation.
                  const showKey = isPicked && o.correct;
                  const border = !revealed
                    ? "var(--hairline)"
                    : showKey ? "var(--ok)" : isPicked ? "var(--bad)" : "var(--hairline)";
                  const mark = !revealed ? null : showKey ? "✓" : isPicked ? "✗" : null;
                  return (
                    <button key={oi} className="btn" disabled={revealed} onClick={() => choose(oi)}
                      style={{ textAlign: "left", justifyContent: "flex-start", borderColor: border, background: "var(--surface-2)", alignItems: "flex-start", lineHeight: 1.45 }}>
                      {mark && (
                        <span aria-hidden="true" className="mono"
                          style={{ color: showKey ? "var(--ok)" : "var(--bad)", marginRight: "var(--s-2)", fontWeight: 700 }}>
                          {mark}
                        </span>
                      )}
                      {t(o.text, locale)}
                      {mark && (
                        <span className="sr-only">
                          {` — ${showKey ? m("lesson.correct", locale) : m("lesson.notQuite", locale)}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {picked !== null && (
                // role="status" so the verdict is announced when it appears —
                // otherwise a screen-reader learner has to go hunting for what
                // changed after every answer.
                <div role="status" style={{ marginTop: "var(--s-4)", padding: "var(--s-4)", background: item.options[picked].correct ? "var(--ok-bg)" : "var(--bad-bg)", borderRadius: "var(--r-sm)" }}>
                  <p className="eyebrow" style={{ color: item.options[picked].correct ? "var(--ok)" : "var(--bad)", marginBottom: 6 }}>
                    {item.options[picked].correct
                      ? `✓ ${m("lesson.correct", locale)}`
                      : `✗ ${m("lesson.notQuite", locale)}`}
                  </p>
                  <p style={{ fontSize: "var(--t-sm)", color: "var(--text)" }}>{t(item.options[picked].rationale, locale)}</p>
                </div>
              )}
              {picked !== null && (
                <div style={{ marginTop: "var(--s-4)" }}>
                  <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} onClick={next}>
                    {idx + 1 < totalSteps ? m("assess.next", locale) : m("cta.continue", locale)}
                  </button>
                </div>
              )}
            </div>
          )}

          {gradedCheck && (
            <div className="card">
              <CheckHost key={gradedCheck.id} item={gradedCheck} locale={locale} mode="graded" onResult={onCheckResult} />
            </div>
          )}

          {buildStep && (
            <div className="card">
              <ArchitectBuilder key={buildStep.id} challenge={buildStep} locale={locale} mode="graded" onResult={onCheckResult} />
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="stack" style={{ gap: "var(--s-5)" }}>
          <div className="card" style={{ borderColor: finalScore >= clear ? "var(--ok)" : "var(--warn)" }}>
            <div className="eyebrow" style={{ color: finalScore >= clear ? "var(--ok)" : "var(--warn)" }}>
              {finalScore >= clear ? `◆ ${m("chk.passed", locale)}` : m("chk.failed", locale)}
            </div>
            <div className="display" style={{ fontSize: "var(--t-h1)", margin: "var(--s-2) 0" }}>
              <span className="stat">{Math.round(finalScore * 100)}%</span>
            </div>
            <p className="dim text-sm">
              {m("chk.score", locale)}: {correctCount}/{totalSteps} · {t(gateLabel, locale)}
            </p>
          </div>
          <div style={{ display: "flex", gap: "var(--s-4)", flexWrap: "wrap" }}>
            {finalScore < clear && (
              <button className="btn" onClick={retry}>{m("chk.retry", locale)}</button>
            )}
            <Link href={`/${locale}/learn`} className={`btn${finalScore >= clear ? ` btn-primary${track === "ai" ? " btn-ai" : ""}` : ""}`}>
              {m("chk.backToPath", locale)} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
