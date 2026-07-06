"use client";
// The Ladder — a roadmap.sh-style vertical explainer of the five levels
// (L3→L7). Replaces the Star Chart with a clear "here's the whole journey and
// what each level means" diagram. Each band: the level token + name, one plain
// sentence of what it means, the per-domain intents at that level, and a
// "you are here" marker driven by checkpoints cleared. Pixel theme reuses the
// overworld. Mobile: a single vertical climb, bottom (L3) to top (L7).
import { useEffect, useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { LEVELS, LEVEL_LABEL, AXIS_BY_ID, type Level } from "@/lib/axes";
import { ORDERED_DOMAINS, checkpointsAfter } from "@/lib/curriculum";
import { load, type Progress } from "@/lib/store";
import { PixelOverworld } from "./PixelOverworld";

const LEVEL_MEANING: Record<Level, { en: string; es: string }> = {
  L3: { en: "Developing. You build well-scoped work correctly and learn to reason about what a choice costs — on one machine, one service.", es: "En desarrollo. Construyes trabajo bien acotado correctamente y aprendes a razonar cuánto cuesta una decisión — en una máquina, un servicio." },
  L4: { en: "Senior. You own the design of your area, resolve technical risk before it bites, and ship reliably without being told how.", es: "Senior. Eres dueño del diseño de tu área, resuelves el riesgo técnico antes de que muerda y entregas con fiabilidad sin que te digan cómo." },
  L5: { en: "The Staff threshold. You stop being handed the plan and start setting the technical approach across a team, on problems nobody has framed yet.", es: "El umbral Staff. Dejan de darte el plan y empiezas a fijar el enfoque técnico de un equipo, en problemas que nadie ha enmarcado aún." },
  L6: { en: "Staff. You set multi-team, multi-quarter direction and optimize for the wider org over the locally optimal call.", es: "Staff. Fijas dirección multi-equipo y multi-trimestre y optimizas para la organización por encima de la decisión localmente óptima." },
  L7: { en: "Principal. You own org- and industry-level technical direction and make the high-consequence calls that have no clearly correct answer.", es: "Principal. Eres dueño de la dirección técnica a nivel de organización e industria y tomas las decisiones de alto impacto sin respuesta claramente correcta." },
};

export function LadderView({ locale }: { locale: Locale }) {
  const [pixel, setPixel] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    const check = () => setPixel(document.documentElement.getAttribute("data-theme") === "pixel");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    setProgress(load());
    const on = () => setProgress(load());
    window.addEventListener("levelup:progress", on);
    return () => { obs.disconnect(); window.removeEventListener("levelup:progress", on); };
  }, []);

  if (pixel) return <PixelOverworld locale={locale} />;

  // "you are here" = the lowest level with an uncleared checkpoint anywhere.
  const cleared = new Set(progress?.checkpointsCleared ?? []);
  const here = LEVELS.find((lv) =>
    ORDERED_DOMAINS.some((d) => { const c = checkpointsAfter(d.id, lv); return c && !cleared.has(c.id); })
  ) ?? "L3";

  // Render top→bottom L7..L3 so the "climb" reads upward (L3 at the bottom).
  const bands = [...LEVELS].reverse();

  return (
    <div className="wrap" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)", maxWidth: 900 }}>
      <p className="eyebrow">{m("nav.ladder", locale)}</p>
      <h1 className="display" style={{ fontSize: "var(--t-h1)", margin: "var(--s-2) 0 var(--s-4)" }}>
        {t({ en: "The whole climb, and what each level means.", es: "Toda la subida, y qué significa cada nivel." }, locale)}
      </h1>
      <p className="prose" style={{ marginBottom: "var(--s-8)" }}>
        {t({ en: "Five levels, from Developing to Principal. This is the map: where you are, what's next, and what changes at every step. Clear a level's Final Boss to open the next.", es: "Cinco niveles, de En desarrollo a Principal. Este es el mapa: dónde estás, qué sigue y qué cambia en cada paso. Supera el jefe final de un nivel para abrir el siguiente." }, locale)}
      </p>

      <div className="ladder-spine">
        {bands.map((level, i) => {
          const isHere = level === here;
          const domCheckpoints = ORDERED_DOMAINS.map((d) => checkpointsAfter(d.id, level)).filter(Boolean);
          const clearedN = domCheckpoints.filter((c) => cleared.has(c!.id)).length;
          const done = domCheckpoints.length > 0 && clearedN === domCheckpoints.length;
          return (
            <div key={level} className="ladder-band" data-here={isHere ? "true" : "false"} data-done={done ? "true" : "false"}>
              <div className="ladder-rail" aria-hidden="true">
                <span className="ladder-node">{done ? "✓" : level.replace("L", "")}</span>
                {i < bands.length - 1 && <span className="ladder-line" />}
              </div>
              <div className="ladder-card">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", flexWrap: "wrap" }}>
                  <span className={`gc-concept-tag lchip lchip-${level}`} style={{ fontSize: 12 }}>
                    {t(LEVEL_LABEL[level], locale)}
                  </span>
                  {isHere && <span className="ladder-here">{t({ en: "You are here", es: "Estás aquí" }, locale)}</span>}
                  <span className="eyebrow" style={{ marginLeft: "auto" }}>{clearedN}/{domCheckpoints.length} ★</span>
                </div>
                <p className="prose" style={{ margin: "var(--s-3) 0", fontSize: "1.0625rem" }}>{t(LEVEL_MEANING[level], locale)}</p>
                <div className="ladder-domains">
                  {ORDERED_DOMAINS.map((d) => {
                    const lvl = d.levels.find((l) => l.level === level);
                    if (!lvl || !lvl.concepts.length) return null;
                    return (
                      <Link key={d.id} href={`/${locale}/lesson/${d.id}-${level.toLowerCase()}`} className="ladder-lane">
                        <span className="ladder-lane-dot" style={{ background: AXIS_COLOR[d.axisId] }} />
                        <span className="ladder-lane-name">{t(AXIS_BY_ID[d.axisId].short, locale)}</span>
                        <span className="ladder-lane-n">{lvl.concepts.length}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const AXIS_COLOR: Record<number, string> = {
  1: "#4c9fff", 2: "#42a5f5", 3: "#2fd0c8", 4: "#e8b53a", 5: "#6daa2c", 6: "#d97757",
};
