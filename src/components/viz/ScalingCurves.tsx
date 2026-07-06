"use client";
// ScalingCurves — Amdahl's law made draggable. Add cores and watch speedup
// flatten because the SERIAL fraction caps you. The Staff lesson: parallelism
// buys less than you think once a few % of work is serial.
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import type { WidgetProps } from "@/lib/viz";

export function ScalingCurves({ locale }: WidgetProps) {
  const es = locale === "es";
  const [serialPct, setSerialPct] = useState(10); // % of work that is serial
  const s = serialPct / 100;
  const speedupAt = (cores: number) => 1 / (s + (1 - s) / cores);
  const maxSpeedup = 1 / s; // the ceiling as cores → ∞
  const cores = [1, 2, 4, 8, 16, 64, 256];
  const max = speedupAt(256);
  return (
    <VizFrame
      title={es ? "Ley de Amdahl" : "Amdahl's law"}
      ariaLabel={es ? "Curvas de escalado" : "Scaling curves"}
      caption={es
        ? `Con ${serialPct}% serial, el techo es ×${maxSpeedup.toFixed(1)} por muchos núcleos que agregues.`
        : `With ${serialPct}% serial, the ceiling is ×${maxSpeedup.toFixed(1)} no matter how many cores you add.`}
      controls={
        <label className="viz-control">
          <span className="mono">{es ? "fracción serial" : "serial fraction"}: {serialPct}%</span>
          <input type="range" min={1} max={50} value={serialPct} onChange={(e) => setSerialPct(Number(e.target.value))}
            aria-label={es ? "porcentaje de trabajo serial" : "percent serial work"} />
        </label>
      }
    >
      <div className="viz-bars">
        {cores.map((c) => {
          const sp = speedupAt(c);
          return (
            <div key={c} className="viz-bar-row">
              <span className="viz-bar-key mono">{c} {es ? "núcleos" : "cores"}</span>
              <span className="viz-bar-track"><span className="viz-bar-fill" style={{ width: `${(sp / max) * 100}%` }} /></span>
              <span className="viz-bar-algo mono">×{sp.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </VizFrame>
  );
}

export default ScalingCurves;
