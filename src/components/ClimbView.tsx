"use client";
// The Climb — the level-first primary learning experience.
//
// Answers the learner's real question: "what do I do next, and what does it take
// to level up?" It renders the L3→L7 ladder as a gated ascent. Each stage opens
// with a role mandate (what you're trusted to do at that rung), then the domain
// lessons for that band as a grid of cells, each showing checkpoint status. You
// ASCEND by clearing a breadth quorum of the stage's checkpoints — the gate is
// visible ("clear 4 of 6 to unlock L4"), so the prerequisite structure is legible.
// A sticky "You are here" header gives the single best next action.
//
// Domain-first browsing still exists (LearnHub, reachable via the toggle) for
// people who'd rather drill one axis — but the DEFAULT is the climb.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { AXIS_BY_ID } from "@/lib/axes";
import {
  buildClimb, climbSummary, LEVEL_MANDATE, type Stage, type StageDomainCell,
} from "@/lib/climb";
import { load, type Progress } from "@/lib/store";

const AXIS_COLOR: Record<number, string> = {
  1: "var(--gen)", 2: "var(--gen-accent)", 3: "var(--ai-signal)",
  4: "var(--star)", 5: "var(--gen-accent)", 6: "var(--ai)",
};

export function ClimbView({ locale }: { locale: Locale }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    setProgress(load());
    const on = () => setProgress(load());
    window.addEventListener("levelup:progress", on);
    return () => window.removeEventListener("levelup:progress", on);
  }, []);

  const stages = useMemo(() => buildClimb(progress), [progress]);
  const summary = useMemo(() => climbSummary(progress), [progress]);

  return (
    <div className="climb">
      <ClimbHeader locale={locale} summary={summary} />
      <ol className="climb-track">
        {stages.map((s) => (
          <StageCard key={s.level} stage={s} locale={locale} />
        ))}
      </ol>
    </div>
  );
}

function ClimbHeader({ locale, summary }: { locale: Locale; summary: ReturnType<typeof climbSummary> }) {
  const mandate = LEVEL_MANDATE[summary.currentLevel];
  const next = summary.nextLevel;
  return (
    <div className="climb-head card">
      <div className="climb-head-main">
        <p className="eyebrow">{t({ en: "You are here", es: "Estás aquí" }, locale)}</p>
        <h2 className="climb-head-level">
          {summary.currentLevel} · <span className="dim">{t(mandate.title, locale)}</span>
        </h2>
        <p className="prose" style={{ marginTop: "var(--s-2)", fontSize: "1.0625rem" }}>{t(mandate.mandate, locale)}</p>
        {next && summary.checkpointsToAscend > 0 && (
          <p className="climb-gate" style={{ marginTop: "var(--s-3)" }}>
            {t({
              en: `Clear ${summary.checkpointsToAscend} more checkpoint${summary.checkpointsToAscend === 1 ? "" : "s"} in this stage to unlock ${next}.`,
              es: `Supera ${summary.checkpointsToAscend} punto${summary.checkpointsToAscend === 1 ? "" : "s"} de control más en esta etapa para desbloquear ${next}.`,
            }, locale)}
          </p>
        )}
        {!next && (
          <p className="climb-gate" style={{ marginTop: "var(--s-3)" }}>
            {t({ en: "You're at the top of the ladder — Principal. Keep any stage sharp in Practice.", es: "Estás en la cima de la escalera — Principal. Mantén cualquier etapa afilada en Práctica." }, locale)}
          </p>
        )}
      </div>
      <div className="climb-head-side">
        <ClimbGauge pct={summary.overallPct} label={t({ en: "overall", es: "global" }, locale)} />
        <span className="dim text-sm" style={{ textAlign: "center" }}>
          {summary.totalCheckpointsCleared}/{summary.totalCheckpoints} {t({ en: "checkpoints", es: "puntos de control" }, locale)}
        </span>
      </div>
    </div>
  );
}

function ClimbGauge({ pct, label }: { pct: number; label: string }) {
  const deg = Math.round((pct / 100) * 360);
  return (
    <span className="climb-gauge" style={{ background: `conic-gradient(var(--amber) ${deg}deg, var(--hairline-2) ${deg}deg)` }}>
      <span className="climb-gauge-inner">
        <span className="climb-gauge-pct">{pct}%</span>
        <span className="climb-gauge-label eyebrow">{label}</span>
      </span>
    </span>
  );
}

function StageCard({ stage, locale }: { stage: Stage; locale: Locale }) {
  const mandate = LEVEL_MANDATE[stage.level];
  const locked = stage.status === "locked";
  return (
    <li className="stage" data-status={stage.status}>
      <div className="stage-rail" aria-hidden="true">
        <span className="stage-dot" data-status={stage.status}>
          {stage.status === "complete" ? "✓" : locked ? "🔒" : "●"}
        </span>
      </div>
      <div className="stage-body card">
        <div className="stage-head">
          <div>
            <span className="level-tag">{stage.level}</span>
            <span className="stage-role">{t(mandate.title, locale)}</span>
          </div>
          <span className="stage-status-chip" data-status={stage.status}>
            {stage.status === "complete"
              ? t({ en: "Ascended", es: "Superada" }, locale)
              : stage.status === "current"
                ? t({ en: "In progress", es: "En curso" }, locale)
                : t({ en: "Locked", es: "Bloqueada" }, locale)}
          </span>
        </div>

        <p className="stage-mandate">{t(mandate.mandate, locale)}</p>

        {locked ? (
          <p className="stage-locked-note">
            {t({
              en: `Unlocks when you clear ${stage.quorum > 0 ? stage.quorum : "the"} checkpoints of the stage below. Scope here: ${""}`,
              es: `Se desbloquea al superar ${stage.quorum > 0 ? stage.quorum : "los"} puntos de control de la etapa anterior. Alcance aquí: ${""}`,
            }, locale)}
            <em>{t(mandate.scope, locale)}</em>
          </p>
        ) : (
          <>
            <div className="stage-gatebar">
              <span className="stage-gatebar-track">
                <span className="stage-gatebar-fill" style={{ width: `${stage.checkpointsTotal ? (stage.checkpointsCleared / stage.checkpointsTotal) * 100 : 0}%` }} />
              </span>
              <span className="eyebrow">
                {stage.checkpointsCleared}/{stage.checkpointsTotal} · {t({ en: "clear", es: "supera" }, locale)} {stage.quorum} {t({ en: "to ascend", es: "para subir" }, locale)}
              </span>
            </div>
            <div className="stage-grid">
              {stage.cells.map((c) => (
                <StageCell key={c.domainId} cell={c} locale={locale} />
              ))}
            </div>
          </>
        )}
      </div>
    </li>
  );
}

function StageCell({ cell, locale }: { cell: StageDomainCell; locale: Locale }) {
  const axis = AXIS_BY_ID[cell.axisId];
  const href = `/${locale}/lesson/${cell.lessonId}`;
  return (
    <Link href={href} className="stage-cell card card-interactive"
      data-track={cell.domainId === "ai-engineering" ? "ai" : "general"}
      data-cleared={cell.checkpointCleared ? "true" : "false"}>
      <div className="stage-cell-head">
        <span className="stage-cell-dot" style={{ background: AXIS_COLOR[cell.axisId] }} />
        <span className="stage-cell-axis">{t(axis.short, locale)}</span>
        {cell.checkpointCleared && <span className="stage-cell-check" aria-hidden="true">✓</span>}
      </div>
      <div className="stage-cell-progress">
        <span className="stage-cell-count">{cell.conceptsRead}/{cell.concepts}</span>
        <span className="dim text-sm">{t({ en: "concepts", es: "conceptos" }, locale)}</span>
      </div>
      <span className="stage-cell-cta">
        {cell.checkpointCleared
          ? t({ en: "Review →", es: "Repasar →" }, locale)
          : cell.conceptsRead > 0
            ? t({ en: "Continue →", es: "Continuar →" }, locale)
            : t({ en: "Start →", es: "Empezar →" }, locale)}
      </span>
    </Link>
  );
}
