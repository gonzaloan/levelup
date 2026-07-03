"use client";
// A small, self-contained observatory miniature for the hero right column.
// Static authored geometry (no data dependency) — a "career star map" motif
// with one bright current star and an instrument readout. Reduced-motion safe.
import { useEffect, useState } from "react";
import { type Locale } from "@/i18n/config";

const STARS: [number, number, 1 | 2 | 3, boolean][] = [
  // x, y (0..1), magnitude, mastered
  [0.18, 0.72, 2, true], [0.34, 0.58, 3, true], [0.28, 0.34, 2, true],
  [0.52, 0.44, 3, false], [0.62, 0.66, 2, false], [0.74, 0.28, 1, false],
  [0.82, 0.52, 2, false], [0.46, 0.80, 1, true], [0.68, 0.14, 1, false],
];
const EDGES: [number, number][] = [[0, 1], [1, 2], [1, 3], [3, 4], [3, 6], [2, 8]];

export function LandingChart({ locale }: { locale: Locale }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return setOn(true);
    const id = setTimeout(() => setOn(true), 120);
    return () => clearTimeout(id);
  }, []);
  const W = 460, H = 420;
  const px = (x: number) => 20 + x * (W - 40);
  const py = (y: number) => 20 + y * (H - 40);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={locale === "es" ? "Carta estelar de una carrera" : "A star chart of a career"}
      style={{ display: "block", overflow: "visible" }}>
      <defs>
        <radialGradient id="lg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--star)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--star)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* declination arcs */}
      {[0.3, 0.55, 0.8].map((r, i) => (
        <path key={i} d={`M ${px(-0.02)} ${py(r)} Q ${W / 2} ${py(r - 0.12)} ${px(1.02)} ${py(r)}`}
          fill="none" stroke="var(--arc-line)" strokeWidth={0.75} />
      ))}
      {/* the L4→L5 threshold line, dotted (the frontier) */}
      <line x1={px(0)} y1={py(0.48)} x2={px(1)} y2={py(0.42)} stroke="var(--gen)" strokeWidth={1} strokeDasharray="3 5" opacity={0.5} />
      <text x={px(0.02)} y={py(0.46) - 6} fontSize={9} fontFamily="var(--font-mono)" fill="var(--gen)" opacity={0.8}>L5 →</text>

      {/* edges */}
      {EDGES.map(([a, b], i) => {
        const A = STARS[a], B = STARS[b];
        const lit = A[3] && B[3];
        const x1 = px(A[0]), y1 = py(A[1]), x2 = px(B[0]), y2 = py(B[1]);
        const len = Math.hypot(x2 - x1, y2 - y1);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={lit ? "var(--gen)" : "var(--hairline)"} strokeWidth={lit ? 1.25 : 0.75}
            opacity={lit ? 0.8 : 0.4}
            strokeDasharray={len} strokeDashoffset={on ? 0 : len}
            style={{ transition: `stroke-dashoffset 800ms cubic-bezier(.16,1,.3,1) ${i * 60}ms` }} />
        );
      })}
      {/* stars */}
      {STARS.map(([x, y, mag, mastered], i) => {
        const r = mag === 3 ? 7 : mag === 2 ? 5 : 3.5;
        const isCurrent = i === 3; // the frontier star
        const col = mastered ? "var(--gen)" : isCurrent ? "var(--gen-accent)" : "var(--text-3)";
        return (
          <g key={i} transform={`translate(${px(x)},${py(y)})`}>
            {(mastered || isCurrent) && <circle r={r * 3} fill="url(#lg-glow)" opacity={isCurrent ? 0.8 : 0.4} />}
            <circle r={on ? r : 0} fill={mastered || isCurrent ? col : "none"} stroke={col} strokeWidth={mastered || isCurrent ? 0 : 1}
              opacity={mastered || isCurrent ? 1 : 0.6}
              style={{ transition: `r 500ms cubic-bezier(.2,1.4,.4,1) ${i * 50}ms` }} />
            {mag === 3 && <path d={`M0,${-r - 4} L0,${r + 4} M${-r - 4},0 L${r + 4},0`} stroke={col} strokeWidth={0.6} opacity={0.5} />}
          </g>
        );
      })}
      {/* instrument readout, bottom-right */}
      <g transform={`translate(${px(0.62)}, ${py(0.9)})`}>
        <text fontSize={9} fontFamily="var(--font-mono)" fill="var(--text-3)" letterSpacing="0.12em">CURRENT</text>
        <text y={16} fontSize={15} fontFamily="var(--font-mono)" fontWeight={600} fill="var(--gen-accent)">L4 · SENIOR</text>
      </g>
    </svg>
  );
}
