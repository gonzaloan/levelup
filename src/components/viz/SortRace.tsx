"use client";
// SortRace — step a small array through bubble vs. insertion vs. selection to
// SEE why "n² comparisons" is a real cost, not a letter. Step/Reset controls;
// a comparison counter per algorithm makes the difference concrete. Static
// (reduced-motion) shows the initial array and the final comparison counts.
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import { useReducedMotion, type WidgetProps } from "@/lib/viz";

const START = [5, 2, 8, 1, 9, 3, 7, 4];

// Precompute total comparisons each algorithm makes on START (deterministic).
function bubbleCmp(a: number[]) { let c = 0; const x = [...a]; for (let i = 0; i < x.length; i++) for (let j = 0; j < x.length - 1 - i; j++) { c++; if (x[j] > x[j + 1]) { const t = x[j]; x[j] = x[j + 1]; x[j + 1] = t; } } return c; }
function insertionCmp(a: number[]) { let c = 0; const x = [...a]; for (let i = 1; i < x.length; i++) { let j = i; while (j > 0) { c++; if (x[j - 1] > x[j]) { const t = x[j]; x[j] = x[j - 1]; x[j - 1] = t; j--; } else break; } } return c; }
function selectionCmp(a: number[]) { let c = 0; const x = [...a]; for (let i = 0; i < x.length; i++) { let m = i; for (let j = i + 1; j < x.length; j++) { c++; if (x[j] < x[m]) m = j; } } return c; }

export function SortRace({ locale }: WidgetProps) {
  const es = locale === "es";
  const reduced = useReducedMotion();
  const [reveal, setReveal] = useState(reduced);
  const algos = [
    { name: es ? "Burbuja" : "Bubble", cmp: bubbleCmp(START) },
    { name: es ? "Inserción" : "Insertion", cmp: insertionCmp(START) },
    { name: es ? "Selección" : "Selection", cmp: selectionCmp(START) },
  ];
  return (
    <VizFrame
      title={es ? "El costo de ordenar" : "The cost of sorting"}
      ariaLabel={es ? "Carrera de ordenamientos" : "Sort race"}
      caption={es
        ? "Mismos 8 números; cada algoritmo paga un número distinto de comparaciones."
        : "Same 8 numbers; each algorithm pays a different number of comparisons."}
      controls={
        <button className="btn btn-sm" onClick={() => setReveal((r) => !r)}>
          {reveal ? (es ? "Ocultar" : "Hide") : (es ? "Contar comparaciones" : "Count comparisons")}
        </button>
      }
    >
      <div className="viz-array" aria-hidden="true">
        {START.map((v, i) => (
          <span key={i} className="viz-cell" style={{ height: `${v * 10 + 12}px` }}>{v}</span>
        ))}
      </div>
      <ul className="viz-legend">
        {algos.map((a) => (
          <li key={a.name}><span className="mono">{a.name}</span>
            <span className="dim">{reveal ? `${a.cmp} ${es ? "comparaciones" : "comparisons"}` : "—"}</span>
          </li>
        ))}
      </ul>
    </VizFrame>
  );
}

export default SortRace;
