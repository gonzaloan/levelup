"use client";
// SpectrumSlider — a generic, PARAMETERIZED widget for "X vs Y" tradeoff concepts
// (monolith↔microservices, strong↔eventual consistency, prompt↔fine-tune, …).
// The content author supplies the two poles and 2-4 dimensions that shift as you
// slide between them, so one widget serves many concepts WITHOUT keyword-fitting:
// it only teaches what the author wrote. Reads concept.visual.params:
//   { leftPole:{en,es}, rightPole:{en,es},
//     dimensions:[{label:{en,es}, left:{en,es}, right:{en,es}}],
//     leftNote?:{en,es}, rightNote?:{en,es} }
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import type { WidgetProps } from "@/lib/viz";
import type { I18nText } from "@/i18n/config";

interface Dim { label: I18nText; left: I18nText; right: I18nText; }
interface Params {
  leftPole: I18nText; rightPole: I18nText;
  dimensions: Dim[];
  leftNote?: I18nText; rightNote?: I18nText;
}

const FALLBACK: Params = {
  leftPole: { en: "Simple", es: "Simple" },
  rightPole: { en: "Scalable", es: "Escalable" },
  dimensions: [
    { label: { en: "Operational cost", es: "Costo operativo" }, left: { en: "low", es: "bajo" }, right: { en: "high", es: "alto" } },
    { label: { en: "Flexibility", es: "Flexibilidad" }, left: { en: "limited", es: "limitada" }, right: { en: "high", es: "alta" } },
  ],
};

export function SpectrumSlider({ locale, params }: WidgetProps) {
  const es = locale === "es";
  const p = { ...FALLBACK, ...(params as Partial<Params> | undefined) } as Params;
  const [v, setV] = useState(50); // 0 = full left, 100 = full right
  const side = v < 40 ? "left" : v > 60 ? "right" : "mid";
  const T = (x: I18nText) => (es ? x.es : x.en);

  return (
    <VizFrame
      ariaLabel={`${T(p.leftPole)} — ${T(p.rightPole)}`}
      caption={es
        ? "Desliza entre los dos extremos y observa qué cambia en cada dimensión."
        : "Slide between the two poles and watch what each dimension trades."}
      controls={
        <label className="viz-control" style={{ width: "100%" }}>
          <span className="mono">{T(p.leftPole)} ⟷ {T(p.rightPole)}</span>
          <input type="range" min={0} max={100} value={v} onChange={(e) => setV(Number(e.target.value))}
            aria-label={es ? "posición en el espectro" : "position on the spectrum"} />
        </label>
      }
    >
      <div className="spectrum">
        <div className="spectrum-poles">
          <span className="spectrum-pole" data-active={side === "left" ? "true" : "false"}>{T(p.leftPole)}</span>
          <span className="spectrum-pole" data-active={side === "right" ? "true" : "false"} style={{ textAlign: "right" }}>{T(p.rightPole)}</span>
        </div>
        <div className="spectrum-dims">
          {p.dimensions.map((d, i) => {
            // linear interpolation label: show the pole's value, blended at the middle
            const val = side === "left" ? T(d.left) : side === "right" ? T(d.right) : `${T(d.left)} → ${T(d.right)}`;
            return (
              <div key={i} className="spectrum-dim">
                <span className="spectrum-dim-label">{T(d.label)}</span>
                <span className="spectrum-dim-val mono" data-side={side}>{val}</span>
              </div>
            );
          })}
        </div>
        {side === "left" && p.leftNote && <p className="spectrum-note">{T(p.leftNote)}</p>}
        {side === "right" && p.rightNote && <p className="spectrum-note">{T(p.rightNote)}</p>}
      </div>
    </VizFrame>
  );
}

export default SpectrumSlider;
