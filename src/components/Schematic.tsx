"use client";
// Authored schematic diagrams — hand-rendered inline SVG in the observatory /
// blueprint language. No raster. The content fleet emits a constrained,
// declarative spec (flow / compare / stack / axes) and this renders it in the
// track accent. Diagrams are here to clarify one idea, not to decorate.
import { useEffect, useRef, useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import type { Schematic as SchematicSpec } from "@/lib/types";

export function Schematic({ spec, locale, animate = true }: { spec: SchematicSpec; locale: Locale; animate?: boolean }) {
  const figRef = useRef<HTMLElement>(null);
  // `armed` drives the CSS reveal. It is FALSE by default → content is fully
  // visible with no motion (no-JS / SSR / reduced-motion safe). We only arm it
  // once the figure scrolls into view (IntersectionObserver), and the CSS is
  // itself double-gated on prefers-reduced-motion, so motion never hides
  // below-fold content.
  const [armed, setArmed] = useState(false);
  // flow/stack reveal their nodes in sequence; a replay control re-triggers it.
  const staged = spec && (spec.kind === "flow" || spec.kind === "stack");

  useEffect(() => {
    if (!animate || !staged) return;
    const reduce =
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // leave everything static + visible
    const el = figRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setArmed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setArmed(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animate, staged]);

  // Replay: drop the armed attribute, then re-add it next frame so the CSS
  // animation restarts from the top.
  const replay = () => {
    setArmed(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true)));
  };

  if (!spec || spec.kind === "none") return null;
  return (
    <figure ref={figRef} className="schematic blueprint" data-armed={armed ? "true" : undefined} style={{ margin: 0 }}>
      <div className="schematic-body">
        {spec.kind === "flow" && <Flow spec={spec} locale={locale} />}
        {spec.kind === "stack" && <Stack spec={spec} locale={locale} />}
        {spec.kind === "compare" && <Compare spec={spec} locale={locale} />}
        {spec.kind === "axes" && <Axes spec={spec} locale={locale} />}
      </div>
      <div className="schematic-foot">
        {spec.caption && (
          <figcaption className="eyebrow" style={{ textTransform: "none", letterSpacing: 0, color: "var(--text-3)" }}>
            {t(spec.caption, locale)}
          </figcaption>
        )}
        {animate && staged && (
          <button type="button" className="schematic-replay" onClick={replay} aria-label={m("schematic.replay", locale)}>
            <span aria-hidden="true">↻</span> {m("schematic.replay", locale)}
          </button>
        )}
      </div>
    </figure>
  );
}

// flow: ordered steps left→right (wraps on mobile via CSS), arrows between.
function Flow({ spec, locale }: { spec: SchematicSpec; locale: Locale }) {
  const nodes = spec.nodes ?? [];
  return (
    <div className="schematic-flow">
      {nodes.map((n, i) => (
        <div key={i} className="schematic-flow-cell" style={{ ["--i" as string]: String(i) }}>
          <div className="schematic-box">
            <span className="schematic-box-label">{t(n.label, locale)}</span>
            {n.note && <span className="schematic-box-note">{t(n.note, locale)}</span>}
          </div>
          {i < nodes.length - 1 && (
            <span className="schematic-arrow" aria-hidden="true" style={{ ["--i" as string]: String(i) }}>
              <span className="schematic-track-line" />
              <span className="schematic-arrowhead">→</span>
              <span className="schematic-token" />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// stack: layered boxes top→bottom (a system stack / hierarchy).
function Stack({ spec, locale }: { spec: SchematicSpec; locale: Locale }) {
  const nodes = spec.nodes ?? [];
  return (
    <div className="schematic-stack">
      {nodes.map((n, i) => (
        <div key={i} className="schematic-box schematic-stack-row" style={{ ["--i" as string]: String(i) }}>
          <span className="schematic-box-label">{t(n.label, locale)}</span>
          {n.note && <span className="schematic-box-note">{t(n.note, locale)}</span>}
        </div>
      ))}
    </div>
  );
}

// compare: two sides of a tradeoff, set against each other.
//
// This is the most common diagram kind in the corpus (76 concepts), and as two
// plain bullet lists it was the single biggest contributor to the wall-of-text
// feeling — a "diagram" that was really more prose. It now reads as a comparison:
// the two sides face each other across a labelled divider, each row is paired
// with its counterpart on the other side, and the side headers carry opposing
// accents so the eye can tell them apart before reading a word.
//
// Pairing matters: authors write left.points[i] and right.points[i] as the same
// question answered two ways, so rendering them as ROWS makes that structure
// visible instead of leaving the reader to align two lists themselves.
function Compare({ spec, locale }: { spec: SchematicSpec; locale: Locale }) {
  const left = spec.left;
  const right = spec.right;
  if (!left || !right) {
    // A one-sided compare is malformed content; render what exists rather than
    // dropping it, and don't pretend to a comparison.
    const only = left ?? right;
    if (!only) return null;
    return (
      <div className="schematic-compare schematic-compare--single">
        <div className="schematic-col">
          <div className="schematic-col-title mono">{t(only.title, locale)}</div>
          <ul className="schematic-col-list">
            {only.points.map((p, j) => <li key={j}>{t(p, locale)}</li>)}
          </ul>
        </div>
      </div>
    );
  }

  const rows = Math.max(left.points.length, right.points.length);
  return (
    <div className="schematic-vs" role="table" aria-label={spec.caption ? t(spec.caption, locale) : undefined}>
      <div className="schematic-vs-head" role="row">
        <div className="schematic-vs-h schematic-vs-h--a" role="columnheader">{t(left.title, locale)}</div>
        <div className="schematic-vs-mid" aria-hidden="true">vs</div>
        <div className="schematic-vs-h schematic-vs-h--b" role="columnheader">{t(right.title, locale)}</div>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div className="schematic-vs-row" role="row" key={i} style={{ ["--i" as string]: String(i) }}>
          {/* data-side-* feeds the stacked mobile layout, where the paired
              headers collapse and each cell has to name its own side. */}
          <div className="schematic-vs-cell schematic-vs-cell--a" role="cell" data-side-a={t(left.title, locale)}>
            {left.points[i] ? t(left.points[i], locale) : ""}
          </div>
          <div className="schematic-vs-spine" aria-hidden="true" />
          <div className="schematic-vs-cell schematic-vs-cell--b" role="cell" data-side-b={t(right.title, locale)}>
            {right.points[i] ? t(right.points[i], locale) : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

// axes: a 2-axis quadrant with labeled axes and any plotted nodes as points.
function Axes({ spec, locale }: { spec: SchematicSpec; locale: Locale }) {
  const nodes = spec.nodes ?? [];
  // Deterministic placement: spread nodes along the diagonal; the point is the
  // labeled axes and the items sitting in the space, not precise coordinates.
  return (
    <svg viewBox="0 0 320 220" className="schematic-axes" role="img"
      aria-label={spec.caption ? t(spec.caption, locale) : "diagram"}>
      {/* axes */}
      <line x1="40" y1="180" x2="300" y2="180" stroke="var(--track, var(--gen))" strokeWidth="1" opacity="0.7" />
      <line x1="40" y1="180" x2="40" y2="20" stroke="var(--track, var(--gen))" strokeWidth="1" opacity="0.7" />
      <polygon points="300,180 293,176 293,184" fill="var(--track, var(--gen))" opacity="0.7" />
      <polygon points="40,20 36,27 44,27" fill="var(--track, var(--gen))" opacity="0.7" />
      {spec.xAxis && <text x="170" y="205" textAnchor="middle" className="schematic-axis-label">{t(spec.xAxis, locale)}</text>}
      {spec.yAxis && <text x="16" y="100" textAnchor="middle" className="schematic-axis-label" transform="rotate(-90 16 100)">{t(spec.yAxis, locale)}</text>}
      {nodes.map((n, i) => {
        const frac = nodes.length > 1 ? i / (nodes.length - 1) : 0.5;
        const x = 70 + frac * 200;
        const y = 160 - frac * 130;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill="var(--track, var(--gen))" />
            <text x={x + 8} y={y + 4} className="schematic-axis-label" style={{ fontSize: 10 }}>{t(n.label, locale)}</text>
          </g>
        );
      })}
    </svg>
  );
}
