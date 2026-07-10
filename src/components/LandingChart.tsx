"use client";
// A small, self-contained observatory miniature for the hero right column.
// Static authored geometry (no data dependency) — a "career star map" motif
// with one bright current star and an instrument readout. Reduced-motion safe.
// Content is visible by default; JS only arms the draw-on reveal.
import { useEffect, useState } from "react";
import { type Locale } from "@/i18n/config";

const STARS: [number, number, 1 | 2 | 3, boolean][] = [
  // x, y (0..1), magnitude, mastered
  [0.18, 0.72, 2, true], [0.34, 0.58, 3, true], [0.28, 0.34, 2, true],
  [0.52, 0.44, 3, false], [0.62, 0.66, 2, false], [0.74, 0.28, 1, false],
  [0.82, 0.52, 2, false], [0.46, 0.80, 1, true], [0.68, 0.14, 1, false],
];
const EDGES: [number, number][] = [[0, 1], [1, 2], [1, 3], [3, 4], [3, 6], [2, 8]];
const CURRENT = 3; // index of the frontier star

export function LandingChart({ locale }: { locale: Locale }) {
  const [on, setOn] = useState(false);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduce(r);
    if (r) return setOn(true);
    const id = setTimeout(() => setOn(true), 120);
    return () => clearTimeout(id);
  }, []);
  const W = 460, H = 420;
  const px = (x: number) => 20 + x * (W - 40);
  const py = (y: number) => 20 + y * (H - 40);

  // Instrument framing: L-shaped corner ticks (drawn, not raster).
  const corner = (cx: number, cy: number, sx: number, sy: number) =>
    `M ${cx + sx * 14} ${cy} L ${cx} ${cy} L ${cx} ${cy + sy * 14}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={locale === "es" ? "Carta estelar de una carrera de ingeniería" : "A star chart of an engineering career"}
      style={{ display: "block", overflow: "visible" }}>
      <defs>
        <radialGradient id="lg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--star)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--star)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lg-cur" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--gen-accent)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--gen-accent)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lg-vignette" cx="62%" cy="30%" r="80%">
          <stop offset="0%" stopColor="var(--gen)" stopOpacity="0.10" />
          <stop offset="55%" stopColor="var(--gen)" stopOpacity="0.02" />
          <stop offset="100%" stopColor="var(--gen)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ambient depth wash behind the chart */}
      <rect x={0} y={0} width={W} height={H} fill="url(#lg-vignette)" />

      {/* instrument corner ticks — frame the field like a viewport */}
      <g stroke="var(--hairline-2)" strokeWidth={1} fill="none" opacity={0.7}>
        <path d={corner(14, 14, 1, 1)} />
        <path d={corner(W - 14, 14, -1, 1)} />
        <path d={corner(14, H - 14, 1, -1)} />
        <path d={corner(W - 14, H - 14, -1, -1)} />
      </g>

      {/* declination arcs */}
      {[0.3, 0.55, 0.8].map((r, i) => (
        <path key={i} d={`M ${px(-0.02)} ${py(r)} Q ${W / 2} ${py(r - 0.12)} ${px(1.02)} ${py(r)}`}
          fill="none" stroke="var(--arc-line)" strokeWidth={0.75} />
      ))}

      {/* the L4→L5 threshold line, dotted (the frontier) */}
      <line x1={px(0)} y1={py(0.48)} x2={px(1)} y2={py(0.42)} stroke="var(--gen)" strokeWidth={1} strokeDasharray="3 5" opacity={0.5} />
      <text x={px(0.02)} y={py(0.46) - 6} fontSize={9} fontFamily="var(--font-mono)" fill="var(--gen)" letterSpacing="0.14em" opacity={0.85}>L5 · FRONTIER →</text>

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
            style={{ transition: reduce ? undefined : `stroke-dashoffset 800ms cubic-bezier(.16,1,.3,1) ${i * 60}ms` }} />
        );
      })}

      {/* leader line from the current star to the readout, so the eye lands on "you are here" */}
      <line x1={px(STARS[CURRENT][0])} y1={py(STARS[CURRENT][1])} x2={px(0.66)} y2={py(0.885)}
        stroke="var(--gen-accent)" strokeWidth={0.75} strokeDasharray="2 4" opacity={on ? 0.5 : 0} strokeLinecap="round"
        style={{ transition: reduce ? undefined : "opacity 600ms ease 700ms" }} />

      {/* stars sit on top with stronger presence */}
      {STARS.map(([x, y, mag, mastered], i) => {
        const r = mag === 3 ? 8 : mag === 2 ? 6 : 4;
        const isCurrent = i === CURRENT; // the frontier star
        const col = mastered ? "var(--gen)" : isCurrent ? "var(--gen-accent)" : "var(--gen-deep)";
        return (
          <g key={i} transform={`translate(${px(x)},${py(y)})`}>
            {(mastered || isCurrent) && (
              <circle r={r * (isCurrent ? 4.6 : 3.4)} fill={isCurrent ? "url(#lg-cur)" : "url(#lg-glow)"} opacity={isCurrent ? 1 : 0.55} />
            )}
            {/* current star wears the sextant reticle — echoes the nav brand mark */}
            {isCurrent && (
              <g stroke={col} fill="none" opacity={0.75}>
                <path d={`M0,${-r - 7} L0,${-r - 2} M0,${r + 2} L0,${r + 7} M${-r - 7},0 L${-r - 2},0 M${r + 2},0 L${r + 7},0`} strokeWidth={0.9} />
                {!reduce ? (
                  <circle r={r + 5} strokeWidth={1}>
                    <animate attributeName="r" values={`${r + 3};${r + 9};${r + 3}`} dur="2.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.12;0.8" dur="2.8s" repeatCount="indefinite" />
                  </circle>
                ) : (
                  <circle r={r + 5} strokeWidth={1} opacity={0.5} />
                )}
              </g>
            )}
            <circle r={on ? r : 0} fill={mastered || isCurrent ? col : "var(--surface)"} stroke={col}
              strokeWidth={mastered || isCurrent ? 0 : 1.25}
              opacity={mastered || isCurrent ? 1 : 0.85}
              style={{ transition: reduce ? undefined : `r 500ms cubic-bezier(.2,1.4,.4,1) ${i * 50}ms` }} />
            {/* magnitude rays on the brightest catalog stars */}
            {mag === 3 && <path d={`M0,${-r - 5} L0,${r + 5} M${-r - 5},0 L${r + 5},0`} stroke={col} strokeWidth={0.75} opacity={0.6} />}
          </g>
        );
      })}

      {/* instrument readout, bottom-right — a bordered panel, not floating text */}
      <g transform={`translate(${px(0.6)}, ${py(0.86)})`}>
        <rect x={-8} y={-14} width={168} height={44} rx={6}
          fill="var(--surface)" stroke="var(--hairline-2)" strokeWidth={1} opacity={0.92} />
        <circle cx={2} cy={-2} r={2.5} fill="var(--gen-accent)" />
        <text x={12} fontSize={8.5} fontFamily="var(--font-mono)" fill="var(--text-3)" letterSpacing="0.16em">
          {locale === "es" ? "POSICIÓN ACTUAL" : "CURRENT POSITION"}
        </text>
        <text x={12} y={17} fontSize={15} fontFamily="var(--font-mono)" fontWeight={700} fill="var(--gen-accent)">L4 · SENIOR</text>
      </g>
    </svg>
  );
}
