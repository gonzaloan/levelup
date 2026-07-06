"use client";
// LatencyBudget — why tail latency (p99), not the mean, decides user pain. Add
// fan-out calls and watch: the mean stays calm while p99 climbs, because a
// request waits for its SLOWEST dependency. The classic "p99 of one is p50 of
// a hundred" lesson, made draggable.
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import type { WidgetProps } from "@/lib/viz";

export function LatencyBudget({ locale }: WidgetProps) {
  const es = locale === "es";
  const [fanout, setFanout] = useState(10);
  // If each dependency is independently p99=1%, the chance ALL are fast is
  // 0.99^fanout; effective tail probability rises fast with fanout.
  const allFast = Math.pow(0.99, fanout);
  const tailHit = Math.round((1 - allFast) * 100);
  const mean = 40;                         // stays ~flat
  const p99 = 40 + Math.round(fanout * 9); // climbs with fanout
  const Row = ({ label, val, danger }: { label: string; val: string; danger?: boolean }) => (
    <div className="viz-bar-row">
      <span className="viz-bar-key">{label}</span>
      <span className="viz-bar-algo mono" style={danger ? { color: "var(--bad)" } : undefined}>{val}</span>
    </div>
  );
  return (
    <VizFrame
      title={es ? "Presupuesto de latencia" : "Latency budget"}
      ariaLabel={es ? "Latencia de cola y fan-out" : "Tail latency and fan-out"}
      caption={es
        ? "Una petición espera a su dependencia MÁS lenta: más fan-out, peor la cola p99."
        : "A request waits for its SLOWEST dependency: more fan-out, worse the p99 tail."}
      controls={
        <label className="viz-control">
          <span className="mono">fan-out = {fanout}</span>
          <input type="range" min={1} max={100} value={fanout} onChange={(e) => setFanout(Number(e.target.value))}
            aria-label={es ? "número de dependencias" : "number of dependencies"} />
        </label>
      }
    >
      <div className="viz-bars">
        <Row label={es ? "Media" : "Mean"} val={`${mean} ms`} />
        <Row label="p99" val={`${p99} ms`} danger={p99 > 400} />
        <Row label={es ? "Prob. de tocar la cola lenta" : "Chance of hitting the slow tail"} val={`${tailHit}%`} danger={tailHit > 50} />
      </div>
    </VizFrame>
  );
}

export default LatencyBudget;
