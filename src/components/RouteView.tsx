"use client";
// The route surface: pick a progression, then walk it.
//
// WHY THIS REPLACES A SINGLE LADDER
// `ClimbView` shows one L3→L7 ladder gated on clearing 4 of 7 domain checkpoints per
// band. That makes AI depth and organizational scope the same axis, so a learner
// cannot rise in one without the other. This view shows the two as what they are:
// separate progressions a learner can be at opposite ends of.
//
// SHARED FOUNDATIONS APPEARS, BUT NOT AS A THIRD CHOICE. It has no gate and no
// ranking — it is what both routes are pulled into. Presenting it beside the other
// two as a peer option would ask the learner to pick a layer over a path.
//
// Behind a flag (`LearnShell`): `/learn` keeps the Climb until the flag flips, so
// this ships reviewable without moving anyone's floor.
import { useEffect, useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { AXIS_BY_ID } from "@/lib/axes";
import { load, chooseRoute, type Progress } from "@/lib/store";
import {
  ROUTES, ROUTE_BY_ID, STAGE_BY_ID, buildRoute, routeSummary, domainsOfRoute,
  type RouteId, type RouteStage,
} from "@/lib/routes";

export function RouteView({ locale }: { locale: Locale }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    setProgress(load());
    const onChange = () => setProgress(load());
    window.addEventListener("levelup:progress", onChange);
    return () => window.removeEventListener("levelup:progress", onChange);
  }, []);

  const chosen = progress?.route as RouteId | undefined;
  const laddered = ROUTES.filter((r) => r.laddered);

  function pick(id: RouteId) {
    chooseRoute(id);
    setProgress(load());
  }

  // Unchosen is a real state, not a default. Picking for the learner would
  // reproduce the single-ladder problem with extra steps.
  if (!chosen) {
    return (
      <div className="route-pick">
        <p className="route-pick-lede">
          {t({
            en: "Two progressions, measured differently. You can walk both, and where you stand on one says nothing about the other.",
            es: "Dos progresiones, medidas distinto. Puedes recorrer las dos, y dónde estás en una no dice nada de la otra.",
          }, locale)}
        </p>
        <div className="route-pick-grid">
          {laddered.map((r) => (
            <button key={r.id} type="button" className="route-card" data-route={r.id} onClick={() => pick(r.id)}>
              <span className="route-card-name display">{t(r.name, locale)}</span>
              <span className="route-card-measures">{t(r.measures, locale)}</span>
              <span className="route-card-for">{t(r.forWhom, locale)}</span>
              <span className="route-card-cta eyebrow">
                {t({ en: "Start here →", es: "Empieza aquí →" }, locale)}
              </span>
            </button>
          ))}
        </div>
        <SharedFoundationsNote locale={locale} />
      </div>
    );
  }

  const meta = ROUTE_BY_ID.get(chosen);
  const summary = routeSummary(chosen, progress);
  const other = laddered.find((r) => r.id !== chosen);

  return (
    <div className="route-view" data-route={chosen}>
      <header className="route-head">
        <p className="eyebrow" style={{ color: "var(--track)" }}>{t(meta!.name, locale)}</p>
        <p className="route-measures">{t(meta!.measures, locale)}</p>
        <p className="route-standing">
          {t({
            en: `You are at ${summary.currentStageId} · ${t(STAGE_BY_ID.get(summary.currentStageId)!.name, "en")}`,
            es: `Estás en ${summary.currentStageId} · ${t(STAGE_BY_ID.get(summary.currentStageId)!.name, "es")}`,
          }, locale)}
          {summary.checkpointsToAscend > 0 && (
            <span className="dim">
              {" · "}
              {t({
                en: `${summary.checkpointsToAscend} checkpoint${summary.checkpointsToAscend === 1 ? "" : "s"} to the next stage`,
                es: `${summary.checkpointsToAscend} punto${summary.checkpointsToAscend === 1 ? "" : "s"} de control para la siguiente etapa`,
              }, locale)}
            </span>
          )}
        </p>
        {other && (
          // Switching is free, and saying so is the point: a learner who fears losing
          // progress will not explore, and there is nothing to lose.
          <button type="button" className="btn btn-sm route-switch" onClick={() => pick(other.id)}>
            {t({
              en: `Switch to ${t(other.name, "en")} — your progress here is kept`,
              es: `Cambiar a ${t(other.name, "es")} — tu progreso aquí se conserva`,
            }, locale)}
          </button>
        )}
      </header>

      <ol className="route-stages">
        {summary.stages.map((st) => (
          <StageRow key={st.id} stage={st} locale={locale} />
        ))}
      </ol>

      <SharedFoundationsNote locale={locale} />
    </div>
  );
}

function StageRow({ stage, locale }: { stage: RouteStage; locale: Locale }) {
  const meta = STAGE_BY_ID.get(stage.id)!;
  const locked = stage.status === "locked";
  return (
    <li className="route-stage" data-status={stage.status}>
      <div className="route-stage-head">
        <span className="route-stage-id mono">{stage.id}</span>
        <span className="route-stage-name">{t(meta.name, locale)}</span>
        {stage.required > 0 && (
          <span className="route-stage-gate eyebrow">
            {stage.checkpointsCleared}/{stage.required}
          </span>
        )}
      </div>
      {/* The stage's BAR, always visible — including when locked. A locked rung whose
          requirement is hidden is a wall; one that states its bar is a target. */}
      <p className="route-stage-defines">{t(meta.defines, locale)}</p>
      {!locked && (
        <ul className="route-stage-cells">
          {stage.cells.map((cell) => {
            const axis = AXIS_BY_ID[cell.axisId];
            return (
              <li key={cell.lessonId}>
                <Link href={`/${locale}/lesson/${cell.lessonId}`} className="route-cell"
                  data-cleared={cell.checkpointCleared ? "true" : "false"}>
                  <span className="route-cell-axis">{t(axis.short, locale)}</span>
                  <span className="route-cell-level mono">{cell.level}</span>
                  <span className="route-cell-progress dim">
                    {cell.conceptsRead}/{cell.concepts}
                  </span>
                  {cell.checkpointCleared && (
                    <span className="route-cell-mark" aria-label={m("chk.passed", locale)}>✓</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function SharedFoundationsNote({ locale }: { locale: Locale }) {
  const shared = ROUTE_BY_ID.get("shared-foundations")!;
  const stages = buildRoute("shared-foundations", null);
  const domains = domainsOfRoute("shared-foundations");
  return (
    <section className="route-shared">
      <p className="eyebrow">{t(shared.name, locale)}</p>
      <p className="route-shared-lede">{t(shared.measures, locale)}</p>
      <ul className="route-shared-tiers">
        {stages.map((st) => {
          const meta = STAGE_BY_ID.get(st.id)!;
          return (
            <li key={st.id}>
              <span className="mono">{st.id}</span> {t(meta.name, locale)}
              <span className="dim"> — {t(meta.defines, locale)}</span>
            </li>
          );
        })}
      </ul>
      <p className="route-shared-domains dim text-sm">
        {t({
          en: `Drawn from ${domains.map((d) => t(AXIS_BY_ID[d.axisId].short, "en")).join(", ")}. No gate: a module names the foundations it needs.`,
          es: `Tomado de ${domains.map((d) => t(AXIS_BY_ID[d.axisId].short, "es")).join(", ")}. Sin barrera: cada módulo nombra los fundamentos que necesita.`,
        }, locale)}
      </p>
    </section>
  );
}

export default RouteView;
