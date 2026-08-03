"use client";
// The Build gallery: a showcase of the Architecture Builder challenges. Pick a
// scenario, assemble the system, get graded. Formative here (free retry, no
// gating); the same builder appears graded inside checkpoints.
//
// ALL SIX builds are also graded steps at a checkpoint, so this page is practice
// for material the gate later grades. A pool split — the fix used for checks —
// would empty this page, so instead the disclosure is asymmetric: graded mode shows
// only "N of M criteria met" and withholds both the criterion labels (which state
// the target topology in words) and the reference rationale. Practising here builds
// judgment; it no longer hands over a spec to recite.
//
// The honest end state is more builds than gates, so the two can be disjoint. Six
// challenges over 178 concepts is the real gap, and it is recorded in
// tools/coverage-baseline.json.
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { BUILDS } from "@/lib/build";
import { AXIS_BY_ID } from "@/lib/axes";
import { CONCEPT_BY_SLUG } from "@/lib/curriculum";
import { ArchitectBuilder } from "./checks/ArchitectBuilder";

export function BuildGallery({ locale }: { locale: Locale }) {
  const [activeId, setActiveId] = useState<string>(BUILDS[0]?.id ?? "");
  const active = BUILDS.find((b) => b.id === activeId) ?? BUILDS[0];
  if (!active) return null;

  return (
    <div className="build-layout">
      <aside className="build-picker" aria-label={t({ en: "Scenarios", es: "Escenarios" }, locale)}>
        {BUILDS.map((b) => {
          const ctx = CONCEPT_BY_SLUG.get(b.concept);
          const axis = ctx ? AXIS_BY_ID[ctx.axisId] : null;
          return (
            <button key={b.id} className="build-pick" data-active={b.id === active.id ? "true" : "false"}
              data-track={b.track} onClick={() => setActiveId(b.id)}>
              <span className="build-pick-title">{t(b.title, locale)}</span>
              {axis && <span className="build-pick-sub">{t(axis.short, locale)} · {ctx!.level}</span>}
            </button>
          );
        })}
      </aside>
      <div className="build-stage card" style={{ padding: "var(--s-5)" }}>
        {/* key remounts the builder cleanly when switching scenarios */}
        <ArchitectBuilder key={active.id} challenge={active} locale={locale} mode="formative" />
      </div>
    </div>
  );
}
