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

  const items = checkpoint.items;
  const item: CheckpointItem | undefined = items[idx];
  const clear = clearThreshold(items.length);
  // Human-facing gate: "miss at most one" reads truer than a percent at n≤5.
  const gateLabel = { en: "one miss allowed", es: "se permite un error" };

  function choose(oi: number) {
    if (picked !== null) return;
    setPicked(oi);
    if (item!.options[oi].correct) setCorrectCount((c) => c + 1);
  }

  function next() {
    if (picked === null) return;
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setPicked(null);
    } else {
      const score = correctCount / items.length;
      setFinalScore(score);
      const outcome = recordCheckpoint(checkpoint.id, score, clear);
      if (outcome.newlyCleared) {
        fireReward({
          kind: "mastery",
          track,
          signal: 30,
          title: `${t(axis.short, locale).toUpperCase()} · ${checkpoint.afterLevel} · ${t({ en: "CHECKPOINT CLEARED", es: "PUNTO DE CONTROL SUPERADO" }, locale)}`,
          body: t({
            en: `You cleared the ${t(axis.name, "en")} checkpoint at ${checkpoint.afterLevel}. The band above opens — keep climbing.`,
            es: `Superaste el punto de control de ${t(axis.name, "es")} en ${checkpoint.afterLevel}. La banda superior se abre — sigue subiendo.`,
          }, locale),
        });
      }
      setDone(true);
    }
  }

  function retry() {
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
          <BossIntro locale={locale} domainId={checkpoint.domainId} total={items.length} track={track} onEngage={() => setStarted(true)}>
            <div className="card" style={{ background: "var(--film-1)" }}>
              <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>{m("chk.covers", locale)}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}>
                {[...new Set(items.map((it) => it.concept))].map((c) => (
                  <span key={c} className="mono" style={{ fontSize: "var(--t-xs)", padding: "3px 8px", borderRadius: "var(--r-xs)", border: "1px solid var(--hairline-2)", color: "var(--text-3)" }}>
                    {c}
                  </span>
                ))}
              </div>
              <span className="eyebrow" style={{ display: "block", marginTop: "var(--s-3)" }}>{items.length} · {t(gateLabel, locale)}</span>
            </div>
          </BossIntro>
          <Link href={`/${locale}/path`} className="eyebrow">← {m("chk.backToPath", locale)}</Link>
        </div>
      )}

      {started && !done && item && (
        <div className="stack" style={{ gap: "var(--s-4)" }}>
          <span className="eyebrow">{m("chk.eyebrow", locale)} · {idx + 1}/{items.length}</span>
          {/* boss HP drains as you clear questions correctly */}
          <BossHealth remaining={items.length - correctCount} total={items.length} locale={locale} />
          <div className="meter" style={{ ["--meter-val" as string]: String(Math.round((idx / items.length) * 100)), ["--meter-accent" as string]: "var(--track)" }} />
          <div className="card">
            <p style={{ color: "var(--text)", marginBottom: "var(--s-5)", fontSize: "1.0625rem" }}>{t(item.stem, locale)}</p>
            <div className="stack">
              {item.options.map((o, oi) => {
                const isPicked = picked === oi;
                const revealed = picked !== null;
                const border = revealed
                  ? (o.correct ? "var(--ok)" : isPicked ? "var(--bad)" : "var(--hairline)")
                  : "var(--hairline)";
                return (
                  <button key={oi} className="btn" disabled={revealed} onClick={() => choose(oi)}
                    style={{ textAlign: "left", justifyContent: "flex-start", borderColor: border, background: "var(--surface-2)", alignItems: "flex-start", lineHeight: 1.45 }}>
                    {t(o.text, locale)}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div style={{ marginTop: "var(--s-4)", padding: "var(--s-4)", background: item.options[picked].correct ? "var(--ok-bg)" : "var(--bad-bg)", borderRadius: "var(--r-sm)" }}>
                <p style={{ fontSize: "var(--t-sm)", color: "var(--text)" }}>{t(item.options[picked].rationale, locale)}</p>
              </div>
            )}
            {picked !== null && (
              <div style={{ marginTop: "var(--s-4)" }}>
                <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} onClick={next}>
                  {idx + 1 < items.length ? m("assess.next", locale) : m("cta.continue", locale)}
                </button>
              </div>
            )}
          </div>
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
            <p className="dim" style={{ fontSize: "var(--t-sm)" }}>
              {m("chk.score", locale)}: {correctCount}/{items.length} · {t(gateLabel, locale)}
            </p>
          </div>
          <div style={{ display: "flex", gap: "var(--s-4)", flexWrap: "wrap" }}>
            {finalScore < clear && (
              <button className="btn" onClick={retry}>{m("chk.retry", locale)}</button>
            )}
            <Link href={`/${locale}/path`} className={`btn${finalScore >= clear ? ` btn-primary${track === "ai" ? " btn-ai" : ""}` : ""}`}>
              {m("chk.backToPath", locale)} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
