"use client";
// EvalHarness — why you evaluate an LLM feature on a SET, not on vibes. Flip
// between "one lucky demo" and "a graded eval set" and watch the confidence
// interval collapse as n grows. The judgment: ship on measured pass-rate with
// a CI, not on a single impressive output.
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import type { WidgetProps } from "@/lib/viz";

export function EvalHarness({ locale }: WidgetProps) {
  const es = locale === "es";
  const [n, setN] = useState(50);
  const passRate = 0.82;
  // Wald-ish 95% CI half-width for a proportion.
  const half = 1.96 * Math.sqrt((passRate * (1 - passRate)) / n);
  const lo = Math.max(0, passRate - half) * 100;
  const hi = Math.min(1, passRate + half) * 100;
  return (
    <VizFrame
      title={es ? "Banco de evaluación" : "Eval harness"}
      ariaLabel={es ? "Tasa de aprobación con intervalo de confianza" : "Pass rate with confidence interval"}
      caption={es
        ? "Un demo con suerte no es una medida. Con más casos, el intervalo se cierra y puedes decidir."
        : "One lucky demo is not a measurement. With more cases the interval tightens and you can decide."}
      controls={
        <label className="viz-control">
          <span className="mono">{es ? "casos de eval" : "eval cases"}: n = {n}</span>
          <input type="range" min={1} max={1000} value={n} onChange={(e) => setN(Number(e.target.value))}
            aria-label={es ? "número de casos de evaluación" : "number of eval cases"} />
        </label>
      }
    >
      <div className="viz-ci" aria-hidden="true">
        <div className="viz-ci-track">
          <span className="viz-ci-band" style={{ left: `${lo}%`, right: `${100 - hi}%` }} />
          <span className="viz-ci-point" style={{ left: `${passRate * 100}%` }} />
        </div>
        <div className="viz-ci-scale mono dim"><span>0%</span><span>100%</span></div>
      </div>
      <p className="viz-phase mono">
        {(passRate * 100).toFixed(0)}% <span className="dim">[{lo.toFixed(1)}–{hi.toFixed(1)}%] 95% CI</span>
      </p>
    </VizFrame>
  );
}

export default EvalHarness;
