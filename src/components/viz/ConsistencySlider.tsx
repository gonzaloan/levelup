"use client";
// ConsistencySlider — the CAP/PACELC tradeoff you can feel. Drag from "strong"
// to "eventual" and watch latency, availability-under-partition and staleness
// move in opposite directions. There is no free lunch; the slider is the point.
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import type { WidgetProps } from "@/lib/viz";

export function ConsistencySlider({ locale }: WidgetProps) {
  const es = locale === "es";
  const [v, setV] = useState(50); // 0 = strong, 100 = eventual
  const latency = Math.round(120 - v * 1.0);       // strong = slow (quorum)
  const availability = Math.round(90 + v * 0.09);  // eventual = more available
  const staleness = Math.round(v * 0.5);           // eventual = staler reads
  const mode = v < 33 ? (es ? "Fuerte" : "Strong") : v < 66 ? (es ? "Cuórum" : "Quorum") : (es ? "Eventual" : "Eventual");
  const Row = ({ label, val, unit }: { label: string; val: number; unit: string }) => (
    <div className="viz-bar-row">
      <span className="viz-bar-key">{label}</span>
      <span className="viz-bar-track"><span className="viz-bar-fill" style={{ width: `${Math.min(100, val)}%` }} /></span>
      <span className="viz-bar-algo mono">{val}{unit}</span>
    </div>
  );
  return (
    <VizFrame
      title={es ? "Consistencia ↔ disponibilidad" : "Consistency ↔ availability"}
      ariaLabel={es ? "Deslizador de consistencia" : "Consistency slider"}
      caption={es
        ? "PACELC: si hay partición, eliges C o A; si no, eliges latencia o consistencia."
        : "PACELC: on a partition you pick C or A; otherwise you pick latency or consistency."}
      controls={
        <label className="viz-control">
          <span className="mono">{mode}</span>
          <input type="range" min={0} max={100} value={v} onChange={(e) => setV(Number(e.target.value))}
            aria-label={es ? "de fuerte a eventual" : "strong to eventual"} />
        </label>
      }
    >
      <div className="viz-bars">
        <Row label={es ? "Latencia de escritura" : "Write latency"} val={latency} unit="ms" />
        <Row label={es ? "Disponibilidad" : "Availability"} val={availability} unit="%" />
        <Row label={es ? "Lecturas obsoletas" : "Stale reads"} val={staleness} unit="%" />
      </div>
    </VizFrame>
  );
}

export default ConsistencySlider;
