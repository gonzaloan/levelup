"use client";
// The Star Chart — the signature centerpiece (§A4/§D2). An observatory star map
// of a career, NOT generic nodes-and-lines:
//  - celestial-chart geometry (declination arcs, catalog ticks, an ecliptic curve)
//  - hand-plotted, irregular star positions from AUTHORED coords (never runtime-random)
//  - star magnitude encodes mastery (bright/large = mastered, dim pinpoint = locked)
//  - catalog edges draw on via stroke-dashoffset as prerequisites clear
//  - reduced-motion → final lit state instantly
import { useEffect, useMemo, useRef, useState } from "react";
import { t, type Locale } from "@/i18n/config";

export type NodeState = "locked" | "available" | "mastered" | "current";

export interface ChartNode {
  id: string;
  x: number; // 0..1 authored
  y: number; // 0..1 authored
  magnitude: 1 | 2 | 3;
  title: string;
  level: string;
  constellation: string;
  track: "general" | "ai";
  state: NodeState;
  prerequisites: string[];
}

const W = 900;
const H = 560;

// Keep chart labels short so they don't collide. Uses the first 2-3 words.
function shortLabel(title: string): string {
  const words = title.split(/\s+/);
  const s = words.slice(0, 3).join(" ");
  return s.length > 22 ? s.slice(0, 20) + "…" : s;
}

// The vertical axis is the climb. Each L-band sits at a fixed y so we can draw a
// glowing "you are here" horizon at the learner's current altitude.
const LEVEL_Y: Record<string, number> = { L7: 0.16, L6: 0.34, L5: 0.54, L4: 0.72, L3: 0.9 };
const LEVEL_ORDER = ["L3", "L4", "L5", "L6", "L7"];

export function StarChart({
  nodes,
  locale,
  onSelect,
  climb,
  ignitedId,
}: {
  nodes: ChartNode[];
  locale: Locale;
  onSelect?: (id: string) => void;
  /** Progression through the current band: {level, fraction 0..1 toward next}. */
  climb?: { level: string; fraction: number } | null;
  ignitedId?: string | null;
}) {
  const reduce = useReducedMotion();
  const [drawn, setDrawn] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  // Track rendered width so SVG label text stays legible on phones: the 900px
  // viewBox downscales ~0.4x on a 360px screen, turning 10px text into ~4px.
  // We counter-scale label font sizes up as the container shrinks.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [renderW, setRenderW] = useState(W);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setRenderW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Font size in viewBox units that renders at ~= targetPx on screen.
  const labelPx = (targetPx: number) => {
    const scale = renderW > 0 ? W / renderW : 1; // viewBox units per screen px
    return Math.round(targetPx * scale * 10) / 10;
  };
  const nodeFont = Math.min(20, Math.max(10, labelPx(11)));
  const axisFont = Math.min(18, Math.max(9, labelPx(10)));
  useEffect(() => {
    if (reduce) return setDrawn(true);
    const id = setTimeout(() => setDrawn(true), 60);
    return () => clearTimeout(id);
  }, [reduce]);

  const px = (x: number) => 40 + x * (W - 80);
  const py = (y: number) => 40 + y * (H - 80);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Edges: from each prerequisite to the node. Lit when the prereq is mastered.
  const edges = nodes.flatMap((n) =>
    n.prerequisites
      .map((pre) => byId.get(pre))
      .filter((p): p is ChartNode => Boolean(p))
      .map((p) => ({ from: p, to: n, lit: p.state === "mastered" }))
  );

  const accent = (track: string) => (track === "ai" ? "var(--ai)" : "var(--gen)");
  const magR = (m: number) => (m === 3 ? 8 : m === 2 ? 6 : 4);

  // Learner altitude — a horizon that RISES with within-band progress. Since all
  // current modules sit at L5, the line starts at the L5 band and climbs toward
  // L6 as the fraction of mastered modules grows, so it never freezes.
  let altitudeY: number | null = null;
  let altitudeLabel = "";
  if (climb && LEVEL_Y[climb.level] != null) {
    const idx = LEVEL_ORDER.indexOf(climb.level);
    const nextLevel = LEVEL_ORDER[Math.min(idx + 1, LEVEL_ORDER.length - 1)];
    const yHere = LEVEL_Y[climb.level];
    const yNext = LEVEL_Y[nextLevel] ?? yHere;
    altitudeY = yHere + (yNext - yHere) * Math.min(1, Math.max(0, climb.fraction));
    altitudeLabel = climb.fraction >= 1 ? nextLevel : `${climb.level}→${nextLevel}`;
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
        aria-label={t({ en: "Star chart of the curriculum", es: "Carta estelar del temario" }, locale)}
        style={{ display: "block" }}>
        <defs>
          <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--star)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--star)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* faint starfield behind (deterministic scatter, not random at runtime) */}
        {FIELD.map((s, i) => (
          <circle key={i} cx={px(s[0])} cy={py(s[1])} r={s[2]} fill="var(--star)" opacity={0.10} />
        ))}

        {/* celestial declination arcs — the observatory signature */}
        {[0.22, 0.42, 0.62, 0.82].map((r, i) => (
          <path
            key={i}
            d={`M ${px(-0.05)} ${py(r)} Q ${W / 2} ${py(r - 0.10)} ${px(1.05)} ${py(r)}`}
            fill="none"
            stroke="var(--arc-line)"
            strokeWidth={0.75}
          />
        ))}
        {/* ecliptic curve */}
        <path d={`M ${px(0)} ${py(0.86)} Q ${W * 0.4} ${py(0.30)} ${px(1)} ${py(0.5)}`}
          fill="none" stroke="var(--arc-line)" strokeWidth={1} strokeDasharray="1 6" />
        {/* catalog tick marks along the bottom axis */}
        {Array.from({ length: 24 }).map((_, i) => (
          <line key={i} x1={40 + (i * (W - 80)) / 23} y1={H - 30} x2={40 + (i * (W - 80)) / 23}
            y2={H - (i % 4 === 0 ? 22 : 26)} stroke="var(--arc-line)" strokeWidth={0.75} />
        ))}

        {/* constellation edges (catalog lines) — visible even when unlit so the
            shape of the constellation reads before anything is earned. */}
        {edges.map((e, i) => {
          const x1 = px(e.from.x), y1 = py(e.from.y), x2 = px(e.to.x), y2 = py(e.to.y);
          const len = Math.hypot(x2 - x1, y2 - y1);
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={e.lit ? accent(e.to.track) : (e.to.track === "ai" ? "var(--ai-dim)" : "var(--gen-deep)")}
              strokeWidth={e.lit ? 1.5 : 1}
              strokeDasharray={len}
              strokeDashoffset={drawn ? 0 : len}
              opacity={e.lit ? 0.85 : 0.5}
              style={{ transition: reduce ? undefined : `stroke-dashoffset 700ms cubic-bezier(.16,1,.3,1) ${i * 40}ms` }}
            />
          );
        })}

        {/* "You are here" altitude horizon — a soft glowing line at the learner's
            current L-band, so every visit answers "how far up am I". */}
        {altitudeY !== null && (
          <g>
            <defs>
              <linearGradient id="altitude-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--gen)" stopOpacity="0" />
                <stop offset="50%" stopColor="var(--gen)" stopOpacity="0.55" />
                <stop offset="100%" stopColor="var(--gen)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line
              x1={px(0)} y1={py(altitudeY)} x2={px(1)} y2={py(altitudeY)}
              stroke="url(#altitude-grad)" strokeWidth={1.25}
              strokeDasharray={drawn ? "0" : "1400"}
              strokeDashoffset={drawn ? 0 : 1400}
              style={{ transition: reduce ? undefined : "stroke-dashoffset 900ms cubic-bezier(.16,1,.3,1)" }}
            />
            <text x={px(1)} y={py(altitudeY) - 6} textAnchor="end" fontSize={axisFont}
              fontFamily="var(--font-mono)" fill="var(--gen-accent)" letterSpacing="0.12em" opacity={drawn ? 0.9 : 0}
              style={{ transition: reduce ? undefined : "opacity 600ms ease 600ms" }}>
              {t({ en: "YOU ARE HERE", es: "ESTÁS AQUÍ" }, locale)} · {altitudeLabel}
            </text>
          </g>
        )}

        {/* L-band labels along the left margin — the vertical axis is the climb */}
        {[
          { lvl: "L7", y: 0.16 }, { lvl: "L6", y: 0.34 }, { lvl: "L5", y: 0.54 },
          { lvl: "L4", y: 0.72 }, { lvl: "L3", y: 0.9 },
        ].map((b) => (
          <text key={b.lvl} x={12} y={py(b.y)} fontSize={axisFont} fontFamily="var(--font-mono)"
            fill="var(--text-3)" letterSpacing="0.1em" dominantBaseline="middle">{b.lvl}</text>
        ))}

        {/* stars (nodes) */}
        {nodes.map((n) => {
          const cx = px(n.x), cy = py(n.y);
          const r = magR(n.magnitude);
          const isLocked = n.state === "locked";
          const isCurrent = n.state === "current";
          const isMastered = n.state === "mastered";
          const isIgnited = ignitedId != null && n.id === ignitedId;
          // Locked stars stay dim but keep a hint of their track hue so the
          // flagship clay constellation reads as clay, not generic violet.
          const col = isLocked
            ? (n.track === "ai" ? "var(--ai-dim)" : "var(--locked)")
            : accent(n.track);
          return (
            <g key={n.id}
              transform={`translate(${cx},${cy})`}
              style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
              tabIndex={isLocked ? -1 : 0}
              role="button"
              aria-label={`${n.title} — ${n.level}${isLocked ? " (locked)" : ""}`}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => { setHover(n.id); setFocused(n.id); }}
              onBlur={() => { setHover(null); setFocused(null); }}
              onClick={() => !isLocked && onSelect?.(n.id)}
              onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isLocked) { e.preventDefault(); onSelect?.(n.id); } }}
            >
              {/* Transparent padded hit target so the star is tappable on phones
                  (visible circle is only ~4-8px; scaled down that's far under the
                  44px minimum). This circle carries the pointer/tap area. */}
              {!isLocked && <circle r={22} fill="transparent" style={{ pointerEvents: "all" }} />}
              {/* Explicit in-SVG focus ring (CSS :focus-visible outline on <g> is
                  unreliable across Safari/Firefox). */}
              {focused === n.id && (
                <circle r={r + 7} fill="none" stroke="var(--ai-signal)" strokeWidth={2} strokeDasharray="3 3" />
              )}
              {(isMastered || isCurrent) && (
                <circle r={r * 3.2} fill="url(#star-glow)"
                  opacity={isCurrent ? 0.9 : 0.5} />
              )}
              {/* One-shot ignition bloom on the node just earned (arrived via
                  ?ignited=). Mirrors the reward-toast IgniteGlyph ring exactly. */}
              {isIgnited && !reduce && (
                <>
                  <circle r={r} fill="none" stroke={accent(n.track)} strokeWidth={1.5}>
                    <animate attributeName="r" values={`${r};${r * 6}`} dur="1100ms" fill="freeze" />
                    <animate attributeName="opacity" values="1;0" dur="1100ms" fill="freeze" />
                  </circle>
                  <circle r={r * 3.2} fill="url(#star-glow)" opacity="0">
                    <animate attributeName="opacity" values="0;0.9;0.5" dur="1100ms" fill="freeze" />
                  </circle>
                </>
              )}
              {isCurrent && !reduce && (
                <circle r={r + 5} fill="none" stroke={col} strokeWidth={1}>
                  <animate attributeName="r" values={`${r + 3};${r + 9};${r + 3}`} dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2.6s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                r={drawn ? r : 0}
                fill={isLocked ? "var(--surface)" : col}
                stroke={col}
                strokeWidth={isLocked ? 1.25 : 0}
                opacity={isLocked ? 0.75 : 1}
                style={{ transition: reduce ? undefined : "r 500ms cubic-bezier(.2,1.4,.4,1)" }}
              />
              {/* magnitude-3 stars get a subtle 4-point diffraction spike */}
              {n.magnitude === 3 && !isLocked && (
                <path d={`M0,${-r - 5} L0,${r + 5} M${-r - 5},0 L${r + 5},0`} stroke={col} strokeWidth={0.75} opacity={0.5} />
              )}
              {/* persistent short label so the chart reads as a map, not dots */}
              <text
                x={0} y={r + nodeFont + 4}
                textAnchor="middle"
                fontSize={nodeFont}
                fontFamily="var(--font-head)"
                fill={isLocked ? "var(--text-3)" : "var(--text-2)"}
                style={{ pointerEvents: "none" }}
              >
                {shortLabel(n.title)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Custom tooltip — instrument label */}
      {hover && byId.get(hover) && (
        <Tooltip node={byId.get(hover)!} px={px} py={py} />
      )}
    </div>
  );
}

function Tooltip({ node, px, py }: { node: ChartNode; px: (x: number) => number; py: (y: number) => number }) {
  const leftPct = (px(node.x) / W) * 100;
  const topPct = (py(node.y) / H) * 100;
  return (
    <div
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: "translate(-50%, -140%)",
        pointerEvents: "none",
        background: "var(--surface-3)",
        border: "1px solid var(--hairline-2)",
        borderRadius: "var(--r-sm)",
        boxShadow: "var(--edge-hi)",
        padding: "6px 10px",
        whiteSpace: "nowrap",
        zIndex: 5,
      }}
    >
      <div style={{ fontSize: "var(--t-sm)", fontFamily: "var(--font-head)", fontWeight: 600 }}>{node.title}</div>
      <div className="eyebrow" style={{ marginTop: 2 }}>{node.level} · {node.state}</div>
    </div>
  );
}

// Deterministic background starfield [x, y, r] in 0..1 space.
const FIELD: [number, number, number][] = [
  [0.05, 0.12, 0.6], [0.14, 0.63, 0.9], [0.22, 0.28, 0.5], [0.31, 0.85, 0.7],
  [0.42, 0.10, 0.8], [0.49, 0.52, 0.5], [0.57, 0.78, 0.6], [0.63, 0.20, 0.9],
  [0.71, 0.60, 0.5], [0.78, 0.35, 0.7], [0.85, 0.72, 0.6], [0.92, 0.18, 0.8],
  [0.11, 0.44, 0.5], [0.36, 0.66, 0.6], [0.68, 0.90, 0.7], [0.95, 0.55, 0.5],
  [0.27, 0.05, 0.6], [0.52, 0.92, 0.5], [0.82, 0.08, 0.7], [0.08, 0.82, 0.6],
];

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduce;
}
