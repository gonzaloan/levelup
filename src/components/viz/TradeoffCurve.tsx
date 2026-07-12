"use client";
// TradeoffCurve — a generic, PARAMETERIZED curve widget for "there's a sweet
// spot / diminishing returns / U-shaped cost" concepts (over-vs-under indexing,
// chunk size in RAG, batch size, redundancy vs cost…). The author supplies the
// axis labels, the curve shape, and where the sweet spot sits; the learner drags
// an input and sees the output move along the authored curve. No keyword-fitting.
// Reads concept.visual.params:
//   { xAxis:{en,es}, yAxis:{en,es}, shape:"u"|"diminishing"|"linear-up",
//     sweetSpot?: number(0..100), lowNote:{en,es}, highNote:{en,es}, sweetNote?:{en,es} }
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import type { WidgetProps } from "@/lib/viz";
import type { I18nText } from "@/i18n/config";

type Shape = "u" | "diminishing" | "linear-up";
interface Params {
  xAxis: I18nText; yAxis: I18nText; shape: Shape;
  sweetSpot?: number;
  lowNote: I18nText; highNote: I18nText; sweetNote?: I18nText;
}
const FALLBACK: Params = {
  xAxis: { en: "Investment", es: "Inversión" }, yAxis: { en: "Value", es: "Valor" },
  shape: "diminishing", sweetSpot: 55,
  lowNote: { en: "Too little: you leave value on the table.", es: "Muy poco: dejas valor sobre la mesa." },
  highNote: { en: "Too much: diminishing returns, wasted effort.", es: "Demasiado: rendimientos decrecientes, esfuerzo desperdiciado." },
  sweetNote: { en: "The sweet spot: most value per unit of effort.", es: "El punto justo: más valor por unidad de esfuerzo." },
};

// y (0..1) for x (0..1) per shape.
function curveY(shape: Shape, x: number): number {
  switch (shape) {
    case "u": return 1 - 4 * (x - 0.5) * (x - 0.5); // inverted-U peak at 0.5 -> use 1-... for cost-U we invert display
    case "diminishing": return 1 - Math.pow(1 - x, 2);
    case "linear-up": return x;
  }
}

export function TradeoffCurve({ locale, params }: WidgetProps) {
  const es = locale === "es";
  const p = { ...FALLBACK, ...(params as Partial<Params> | undefined) } as Params;
  const [x, setX] = useState(p.sweetSpot ?? 50);
  const T = (v: I18nText) => (es ? v.es : v.en);

  const sweet = p.sweetSpot ?? 55;
  const region = x < sweet - 12 ? "low" : x > sweet + 12 ? "high" : "sweet";

  // Build the path (60 samples) in a 100×60 viewBox.
  const pts = Array.from({ length: 61 }, (_, i) => {
    const xf = i / 60;
    const yf = curveY(p.shape, xf);
    return `${xf * 100},${60 - yf * 54 - 3}`;
  }).join(" ");
  const curX = x / 100;
  const curY = 60 - curveY(p.shape, curX) * 54 - 3;

  return (
    <VizFrame
      ariaLabel={`${T(p.xAxis)} / ${T(p.yAxis)}`}
      caption={es
        ? "Arrastra la entrada y observa la curva: el punto justo no está en ningún extremo."
        : "Drag the input and watch the curve: the sweet spot is at neither extreme."}
      controls={
        <label className="viz-control" style={{ width: "100%" }}>
          <span className="mono">{T(p.xAxis)} = {x}</span>
          <input type="range" min={0} max={100} value={x} onChange={(e) => setX(Number(e.target.value))}
            aria-label={T(p.xAxis)} />
        </label>
      }
    >
      <div className="tcurve">
        <svg viewBox="0 0 100 60" className="tcurve-svg" preserveAspectRatio="none" aria-hidden="true">
          {/* sweet-spot band */}
          <rect x={sweet - 12} y={0} width={24} height={60} fill="var(--gen-glow)" opacity={0.5} />
          <polyline points={pts} fill="none" stroke="var(--gen)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          <circle cx={curX * 100} cy={curY} r={2.4} fill="var(--amber)" />
          <line x1={curX * 100} y1={curY} x2={curX * 100} y2={60} stroke="var(--amber)" strokeWidth={0.5} strokeDasharray="1 1" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="tcurve-axes">
          <span className="tcurve-y mono">{T(p.yAxis)} ↑</span>
          <span className="tcurve-x mono">{T(p.xAxis)} →</span>
        </div>
        <p className="tcurve-note" data-region={region}>
          {region === "low" ? T(p.lowNote) : region === "high" ? T(p.highNote) : T(p.sweetNote ?? p.lowNote)}
        </p>
      </div>
    </VizFrame>
  );
}

export default TradeoffCurve;
