"use client";
// Optional timed run over the lesson's midQuiz items. Higher-stakes than the
// formative check: one visible countdown that does NOT stop, auto-submit at 0,
// and a scored pass/fail at the end. Reuses the QuizItem shape and the same
// option-rendering pattern as MidQuiz (but graded, not instant-feedback).
//
// DETERMINISM (contract §2): the countdown is driven by elapsed wall-clock time
// captured at mount inside useEffect — never Date.now() during render. SSR and
// the first client render show the full initial time; the timer only starts
// ticking after mount, so there is no hydration mismatch. No Math.random.
import { useEffect, useRef, useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import type { QuizItem } from "@/lib/types";

const PASS_RATIO = 0.7;          // 70% to pass
const SECONDS_PER_ITEM = 45;     // deterministic budget per question

function fmt(secs: number): string {
  const s = Math.max(0, Math.ceil(secs));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function ExamRunner({ locale, items, track, onExit }: {
  locale: Locale;
  items: QuizItem[];
  track: string;
  onExit?: () => void;
}) {
  const totalSecs = Math.max(60, items.length * SECONDS_PER_ITEM);
  const [phase, setPhase] = useState<"intro" | "running" | "result">("intro");
  const [answers, setAnswers] = useState<(number | null)[]>(() => items.map(() => null));
  const [cur, setCur] = useState(0);
  // Remaining seconds. Initialised to the full budget so SSR + first paint are
  // deterministic; the effect below drives it down from wall-clock elapsed.
  const [remaining, setRemaining] = useState(totalSecs);
  const startRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setPhase("result");
  }

  // Timer: capture the start instant on mount (client-only), then tick from
  // elapsed real time so it can't drift or be paused by a slow frame.
  useEffect(() => {
    if (phase !== "running") return;
    startRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = (performance.now() - (startRef.current ?? 0)) / 1000;
      const left = totalSecs - elapsed;
      setRemaining(left);
      if (left <= 0) { submit(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, totalSecs]);

  if (items.length === 0) return null;

  // ── Intro ──────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <section className="card exam" data-track={track}>
        <p className="eyebrow" style={{ color: "var(--track-accent)" }}>◇ {m("exam.title", locale)}</p>
        <p className="prose" style={{ marginTop: "var(--s-3)" }}>{m("exam.intro", locale)}</p>
        <p className="mono text-sm" style={{ marginTop: "var(--s-3)", color: "var(--text-3)" }}>
          {items.length} · {m("exam.timeLeft", locale)} {fmt(totalSecs)}
        </p>
        <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap", marginTop: "var(--s-5)" }}>
          <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} onClick={() => setPhase("running")}>
            {m("exam.begin", locale)} →
          </button>
          {onExit && <button className="btn" onClick={onExit}>{m("cta.continue", locale)}</button>}
        </div>
      </section>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────
  if (phase === "result") {
    const correct = items.reduce((n, it, qi) => {
      const a = answers[qi];
      return n + (a !== null && it.options[a]?.correct ? 1 : 0);
    }, 0);
    const pct = Math.round((correct / items.length) * 100);
    const passed = correct / items.length >= PASS_RATIO;
    const timedOut = remaining <= 0;
    return (
      <section className="card exam" data-track={track}>
        <p className="eyebrow" style={{ color: passed ? "var(--ok)" : "var(--bad)" }}>
          {passed ? `✓ ${m("exam.passed", locale)}` : `✗ ${m("exam.failed", locale)}`}
        </p>
        {timedOut && <p className="text-sm" style={{ color: "var(--warn)", marginTop: 6 }}>{m("exam.timeUp", locale)}</p>}
        <p className="stat" style={{ fontSize: "var(--t-h2)", marginTop: "var(--s-3)", color: "var(--text)" }}>
          {m("exam.score", locale)}: {correct}/{items.length} · {pct}%
        </p>
        <div className="exam-review stack" style={{ gap: "var(--s-3)", marginTop: "var(--s-5)" }}>
          {items.map((it, qi) => {
            const a = answers[qi];
            const right = a !== null && it.options[a]?.correct;
            const correctOpt = it.options.find((o) => o.correct);
            return (
              <div key={qi} className="exam-review-row" data-correct={right ? "true" : "false"}>
                <p className="text-sm" style={{ color: "var(--text)" }}>
                  <span className="mono" style={{ color: right ? "var(--ok)" : "var(--bad)" }}>{right ? "✓" : "✗"}</span>{" "}
                  {t(it.stem, locale)}
                </p>
                {!right && correctOpt && (
                  <p className="text-sm" style={{ color: "var(--text-3)", marginTop: 4 }}>{t(correctOpt.rationale, locale)}</p>
                )}
              </div>
            );
          })}
        </div>
        {onExit && (
          <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} style={{ marginTop: "var(--s-5)" }} onClick={onExit}>
            {m("cta.continue", locale)}
          </button>
        )}
      </section>
    );
  }

  // ── Running ────────────────────────────────────────────────────────────
  const item = items[cur];
  const picked = answers[cur];
  const low = remaining <= 15;
  const last = cur + 1 >= items.length;

  function pick(oi: number) {
    setAnswers((prev) => { const next = [...prev]; next[cur] = oi; return next; });
  }
  function next() {
    if (last) submit();
    else setCur(cur + 1);
  }

  return (
    <section className="card exam" data-track={track}>
      <div className="exam-bar">
        <span className="eyebrow">{m("exam.question", locale)} {cur + 1}/{items.length}</span>
        <span className="exam-clock mono" data-low={low ? "true" : "false"} role="timer" aria-live="off">
          <span className="eyebrow" style={{ letterSpacing: "0.12em" }}>{m("exam.timeLeft", locale)}</span> {fmt(remaining)}
        </span>
      </div>

      <p style={{ color: "var(--text)", margin: "var(--s-5) 0", fontSize: "1.0625rem" }}>{t(item.stem, locale)}</p>
      <div className="stack">
        {item.options.map((o, oi) => {
          const isPicked = picked === oi;
          return (
            <button key={oi} className="btn" aria-pressed={isPicked} onClick={() => pick(oi)}
              style={{ textAlign: "left", justifyContent: "flex-start", alignItems: "flex-start", lineHeight: 1.45,
                borderColor: isPicked ? "var(--track)" : "var(--hairline)",
                background: isPicked ? "var(--surface-3)" : "var(--surface-2)" }}>
              {t(o.text, locale)}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap", marginTop: "var(--s-5)" }}>
        {cur > 0 && (
          <button className="btn" aria-label={m("a11y.back", locale)} onClick={() => setCur(cur - 1)}>
            <span aria-hidden="true">←</span>
          </button>
        )}
        <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} style={{ marginLeft: "auto" }} onClick={next}>
          {last ? m("exam.submit", locale) : m("assess.next", locale)} →
        </button>
      </div>
    </section>
  );
}
