"use client";
// Results: the differentiated hero is the calibration gap + the ONE behavioral
// delta per weak axis (§A5). The radar is the SUPPORTING visual, not the lead.
import { useEffect, useState } from "react";
import Link from "next/link";
import { load, type Progress } from "@/lib/store";
import { generateRoadmap } from "@/lib/roadmap";
import { AXIS_BY_ID, BAND_RANGE } from "@/lib/axes";
import { ITEMS_BY_ID, MODULES } from "@/content/registry";
import { Radar } from "./Radar";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";

export function ResultsView({ locale }: { locale: Locale }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => setProgress(load()), []);

  if (!progress) return <p className="dim">…</p>;
  const result = progress.assessment;
  if (!result) {
    return (
      <div className="stack">
        <h1 className="display" style={{ fontSize: "var(--t-h2)" }}>
          {t({ en: "You haven't been placed yet.", es: "Todavía no tienes diagnóstico." }, locale)}
        </h1>
        <div><Link href={`/${locale}/assess`} className="btn btn-primary">{m("landing.cta", locale)}</Link></div>
      </div>
    );
  }

  const roadmap = generateRoadmap(result, ITEMS_BY_ID, MODULES);
  // Hero shows highest-leverage growth axes; if everything is Strong, fall back
  // to the two lowest-scoring axes so the hero is never empty.
  const highest = roadmap.steps.filter((s) => s.leverage === "highest");
  const weakSteps = highest.length > 0 ? highest : roadmap.steps.slice(0, 2);

  return (
    <div className="stack" style={{ gap: "var(--s-12)" }}>
      {/* HERO — the honest gap + the one behavior. NOT the spider shape. */}
      <div>
        <p className="eyebrow">{m("results.title", locale)}</p>
        <h1 className="display" style={{ fontSize: "var(--t-h1)", marginTop: "var(--s-3)", marginBottom: "var(--s-6)" }}>
          {t(roadmap.summary, locale)}
        </h1>
        <div className="stack" style={{ gap: "var(--s-4)" }}>
          {weakSteps.map((step) => {
            const gap = result.axes.find((a) => a.axis === step.axis)?.calibrationGap;
            return (
              <article key={step.axis} className="card" data-track="general" style={{ borderLeft: "2px solid var(--gen)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--s-4)", flexWrap: "wrap", marginBottom: "var(--s-3)" }}>
                  <strong style={{ fontFamily: "var(--font-head)" }}>{t(step.headline, locale)}</strong>
                  <span className="eyebrow" style={{ color: "var(--gen)" }}>
                    {t({ en: "highest leverage", es: "mayor impacto" }, locale)}
                  </span>
                </div>
                <p style={{ color: "var(--text)" }}>{t(step.behavioralDelta, locale)}</p>
                {gap && (
                  <p className="dim" style={{ fontSize: "var(--t-sm)", marginTop: "var(--s-3)" }}>
                    {gap.direction === "over"
                      ? t({ en: "Your answers suggest you may be rating yourself a notch high here — worth a second look.", es: "Tus respuestas sugieren que quizás te calificas un punto alto aquí — vale una segunda mirada." }, locale)
                      : t({ en: "Your answers suggest you may be underrating yourself here.", es: "Tus respuestas sugieren que quizás te subestimas aquí." }, locale)}
                  </p>
                )}
                {step.modules.length > 0 && (
                  <div style={{ marginTop: "var(--s-4)" }}>
                    <Link href={`/${locale}/module/${step.modules[0]}`} className="btn">{m("cta.continue", locale)}</Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* SUPPORTING — the radar + bands, clearly labeled provisional */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: "var(--s-10)", alignItems: "start" }} className="results-grid">
        <div>
          <p className="eyebrow" style={{ marginBottom: "var(--s-4)" }}>{m("results.axes", locale)}</p>
          <Radar axes={result.axes} locale={locale} accent="var(--gen)" />
        </div>
        <div className="stack">
          {result.axes.map((ar) => {
            const range = BAND_RANGE[ar.band];
            return (
              <div key={ar.axis} className="card" style={{ padding: "var(--s-4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--s-3)" }}>
                  <strong style={{ fontFamily: "var(--font-head)", fontSize: "var(--t-sm)" }}>{t(AXIS_BY_ID[ar.axis].name, locale)}</strong>
                  <span className="mono" style={{ fontSize: "var(--t-sm)", color: "var(--gen-accent)" }}>
                    {t(range.label, locale)} · {range.levels[0]}–{range.levels[1]}
                  </span>
                </div>
                {ar.provisional && (
                  <div className="eyebrow" style={{ marginTop: 4, color: "var(--warn)" }}>
                    {t({ en: "provisional — few items on this axis", es: "provisional — pocos ítems en este eje" }, locale)}
                  </div>
                )}
              </div>
            );
          })}
          <Link href={`/${locale}/method`} className="eyebrow" style={{ marginTop: "var(--s-2)" }}>
            {m("results.provisional", locale)} →
          </Link>
        </div>
      </div>

      <div>
        <Link href={`/${locale}/map`} className="btn btn-primary">{m("nav.map", locale)} →</Link>
      </div>
    </div>
  );
}
