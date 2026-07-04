"use client";
// Bespoke competency radar (driven by AXES — 6 axes incl. the flagship AI one).
// NOT a Chart.js default.
// - fixed axis order (area distorts if reordered)
// - dotted target-level overlay
// - spring draw-on, reduced-motion → final state instantly
// - ALWAYS paired with a bar breakdown (§A5/§3) to counter area misreading
import { useEffect, useState } from "react";
import { AXES } from "@/lib/axes";
import type { AxisResult } from "@/lib/types";
import { t, type Locale } from "@/i18n/config";

const SIZE = 320;
const C = SIZE / 2;
const R = 118;
const TARGET = 0.7; // the L5 target ring

function point(i: number, n: number, radius: number) {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  return { x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle) };
}

export function Radar({
  axes,
  locale,
  accent = "var(--gen)",
}: {
  axes: AxisResult[];
  locale: Locale;
  accent?: string;
}) {
  const n = AXES.length;
  const [drawn, setDrawn] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return setDrawn(true);
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [reduce]);

  const byId = new Map(axes.map((a) => [a.axis, a]));
  const values = AXES.map((a) => byId.get(a.id)?.composite ?? 0);

  const shape = AXES.map((a, i) => point(i, n, R * (drawn ? values[i] : 0)));
  const targetShape = AXES.map((_, i) => point(i, n, R * TARGET));
  const poly = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        role="img"
        aria-label={t({ en: `Competency radar across ${AXES.length} axes`, es: `Radar de competencias en ${AXES.length} ejes` }, locale)}
        style={{ maxWidth: SIZE, overflow: "visible" }}
      >
        {/* concentric rings — instrument gauge, not decoration */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <circle key={r} cx={C} cy={C} r={R * r} fill="none" stroke="var(--hairline)" strokeWidth={0.75} />
        ))}
        {/* spokes */}
        {AXES.map((_, i) => {
          const p = point(i, n, R);
          return <line key={i} x1={C} y1={C} x2={p.x} y2={p.y} stroke="var(--hairline)" strokeWidth={0.5} />;
        })}
        {/* dotted target overlay (the L5 line) */}
        <polygon
          points={poly(targetShape)}
          fill="none"
          stroke="var(--star-dim)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        {/* current profile shape */}
        <polygon
          points={poly(shape)}
          fill={accent}
          fillOpacity={0.16}
          stroke={accent}
          strokeWidth={1.75}
          style={{ transition: reduce ? undefined : "all 900ms cubic-bezier(.2,1.4,.4,1)" }}
        />
        {/* vertices */}
        {shape.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={accent} stroke="var(--bg)" strokeWidth={1.5}
            style={{ transition: reduce ? undefined : "all 900ms cubic-bezier(.2,1.4,.4,1)" }} />
        ))}
        {/* axis labels (short form — ES-safe). The flagship AI axis is tinted clay
            so the radar itself signals which vertex is the flagship. */}
        {AXES.map((a, i) => {
          const p = point(i, n, R + 26);
          const anchor = Math.abs(p.x - C) < 6 ? "middle" : p.x > C ? "start" : "end";
          const isAi = a.id === 6;
          return (
            <text
              key={a.id}
              x={p.x}
              y={p.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11}
              fontFamily="var(--font-mono)"
              fill={isAi ? "var(--ai)" : "var(--text-2)"}
              fontWeight={isAi ? 600 : 400}
            >
              {t(a.short, locale)}
            </text>
          );
        })}
      </svg>

      {/* Paired bar breakdown — accessibility + counters area-distortion misreading */}
      <div style={{ marginTop: "var(--s-6)" }}>
        {AXES.map((a) => {
          const val = Math.round((byId.get(a.id)?.composite ?? 0) * 100);
          return (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--s-2)", alignItems: "center", marginBottom: "var(--s-2)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "var(--t-sm)", marginBottom: 2 }}>{t(a.name, locale)}</div>
                <div className="meter" style={{ ["--meter-val" as string]: String(val), ["--meter-accent" as string]: accent }} />
              </div>
              <span className="mono tnum" style={{ fontSize: "var(--t-sm)", color: "var(--text-2)", minWidth: 40, textAlign: "right" }}>{val}%</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

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
