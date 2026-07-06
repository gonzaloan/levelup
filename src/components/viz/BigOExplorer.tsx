"use client";
// BigOExplorer — drag the input size n and watch each complexity class grow.
// The point: "when my input gets 10× bigger, what happens to the work?" Each
// curve is labelled with the algorithm that has that shape (binary search =
// O(log n), linear scan = O(n), mergesort = O(n log n), nested loop = O(n²)).
// Reduced-motion: bars render at their computed height with no transition.
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import type { WidgetProps } from "@/lib/viz";

type Row = { key: string; label: string; algo: { en: string; es: string }; f: (n: number) => number };

const ROWS: Row[] = [
  { key: "o1", label: "O(1)", algo: { en: "hash lookup", es: "búsqueda hash" }, f: () => 1 },
  { key: "olog", label: "O(log n)", algo: { en: "binary search", es: "búsqueda binaria" }, f: (n) => Math.log2(n) },
  { key: "on", label: "O(n)", algo: { en: "linear scan", es: "recorrido lineal" }, f: (n) => n },
  { key: "onlog", label: "O(n log n)", algo: { en: "mergesort", es: "mergesort" }, f: (n) => n * Math.log2(n) },
  { key: "on2", label: "O(n²)", algo: { en: "nested loop", es: "bucle anidado" }, f: (n) => n * n },
];

export function BigOExplorer({ locale, params }: WidgetProps) {
  const [n, setN] = useState(typeof params?.n === "number" ? (params.n as number) : 16);
  const es = locale === "es";
  // Normalize each bar to the O(n²) value so the explosion is legible.
  const max = ROWS[ROWS.length - 1].f(n) || 1;
  const label = es ? "tamaño de entrada n" : "input size n";
  return (
    <VizFrame
      title={es ? "¿Cómo crece el trabajo?" : "How does the work grow?"}
      ariaLabel={es ? "Explorador de Big-O" : "Big-O explorer"}
      caption={es
        ? "Duplica n y mira: O(log n) apenas se mueve; O(n²) se dispara."
        : "Double n and watch: O(log n) barely moves; O(n²) explodes."}
      controls={
        <label className="viz-control">
          <span className="mono">n = {n.toLocaleString(locale)}</span>
          <input type="range" min={2} max={1024} step={1} value={n}
            onChange={(e) => setN(Number(e.target.value))}
            aria-label={label} />
        </label>
      }
    >
      <div className="viz-bars" role="img"
        aria-label={`${label} ${n}: ` + ROWS.map((r) => `${r.label} ≈ ${Math.round(r.f(n))}`).join(", ")}>
        {ROWS.map((r) => {
          const v = r.f(n);
          const pct = Math.max(2, Math.min(100, (v / max) * 100));
          return (
            <div key={r.key} className="viz-bar-row">
              <span className="viz-bar-key mono">{r.label}</span>
              <span className="viz-bar-track">
                <span className="viz-bar-fill" style={{ width: `${pct}%` }} data-cls={r.key} />
              </span>
              <span className="viz-bar-algo dim">{es ? r.algo.es : r.algo.en} · {Math.round(v).toLocaleString(locale)}</span>
            </div>
          );
        })}
      </div>
    </VizFrame>
  );
}

export default BigOExplorer;
