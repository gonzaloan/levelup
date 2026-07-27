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

  // Rows are PAIRS, so a ragged compare (3 points vs 4) must not emit a row with
  // one empty cell: on mobile each cell prints its own side label via a ::before,
  // so an empty cell rendered as a heading with nothing under it. Five concepts
  // have ragged sides. Paired rows first, then any leftovers as single-sided rows
  // that say which side they belong to.
  const paired = Math.min(left.points.length, right.points.length);
  const extraSide: "a" | "b" | null =
    left.points.length > paired ? "a" : right.points.length > paired ? "b" : null;
  const extras = extraSide === "a"
    ? left.points.slice(paired)
    : extraSide === "b" ? right.points.slice(paired) : [];
  return (
    <div className="schematic-vs" role="table" aria-label={spec.caption ? t(spec.caption, locale) : undefined}>
      <div className="schematic-vs-head" role="row">
        <div className="schematic-vs-h schematic-vs-h--a" role="columnheader">{t(left.title, locale)}</div>
        <div className="schematic-vs-mid" aria-hidden="true">vs</div>
        <div className="schematic-vs-h schematic-vs-h--b" role="columnheader">{t(right.title, locale)}</div>
      </div>
      {Array.from({ length: paired }, (_, i) => (
        // data-first, not a CSS :first-* selector: the row is not the
        // container's first child (the header is), so both :first-child and
        // :first-of-type silently match nothing.
        <div className="schematic-vs-row" role="row" key={i} data-first={i === 0 ? "" : undefined}>
          {/* data-side-* feeds the stacked mobile layout, where the paired
              headers collapse and each cell has to name its own side. */}
          <div className="schematic-vs-cell schematic-vs-cell--a" role="cell" data-side-a={t(left.title, locale)}>
            {t(left.points[i], locale)}
          </div>
          <div className="schematic-vs-spine" aria-hidden="true" />
          <div className="schematic-vs-cell schematic-vs-cell--b" role="cell" data-side-b={t(right.title, locale)}>
            {t(right.points[i], locale)}
          </div>
        </div>
      ))}
      {/* Leftovers from the longer side: a point with no counterpart is still
          worth showing, but as a single-sided row rather than as half of a pair
          with an empty, labelled cell opposite it. */}
      {extras.map((p, i) => (
        <div className="schematic-vs-row schematic-vs-row--single" role="row" key={`x${i}`} data-side={extraSide!}>
          <div
            className={`schematic-vs-cell schematic-vs-cell--${extraSide}`}
            role="cell"
            data-side-a={extraSide === "a" ? t(left.title, locale) : undefined}
            data-side-b={extraSide === "b" ? t(right.title, locale) : undefined}
          >
            {t(p, locale)}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * axes: a 2-axis quadrant, with the plotted items listed BESIDE the chart.
 *
 * The labels used to be `<text>` inside the SVG. An SVG has a fixed viewBox and
 * cannot wrap text, so a label longer than the box was simply clipped — measured
 * up to 301px cut off across 20 concepts, with quadrant labels truncated
 * mid-word ("High impact, low visibility: quiet real⌐") and a y-axis title
 * losing its first three letters. A quadrant diagram whose quadrant labels are
 * unreadable teaches nothing.
 *
 * So the SVG keeps only what is geometric — the axes and the plotted points, each
 * numbered — and the labels move out into an HTML legend that wraps. The number
 * ties the two together, which also makes the diagram work for a screen reader.
 */
function Axes({ spec, locale }: { spec: SchematicSpec; locale: Locale }) {
  const nodes = spec.nodes ?? [];
  // Deterministic placement: spread nodes along the diagonal; the point is the
  // labeled axes and the items sitting in the space, not precise coordinates.
  return (
    <div className="schematic-quad">
      <svg viewBox="0 0 320 220" className="schematic-axes" role="img"
        aria-label={spec.caption ? t(spec.caption, locale) : "diagram"}>
        {/* axes */}
        <line x1="40" y1="180" x2="300" y2="180" stroke="var(--track, var(--gen))" strokeWidth="1" opacity="0.7" />
        <line x1="40" y1="180" x2="40" y2="20" stroke="var(--track, var(--gen))" strokeWidth="1" opacity="0.7" />
        <polygon points="300,180 293,176 293,184" fill="var(--track, var(--gen))" opacity="0.7" />
        <polygon points="40,20 36,27 44,27" fill="var(--track, var(--gen))" opacity="0.7" />
        {nodes.map((n, i) => {
          // Diagonal placement, and the numbered legend is what makes it honest.
          //
          // I tried inferring each node's quadrant from its label, because the
          // diagonal put "Pushover (low dissent, high support)" at bottom-left,
          // contradicting its own text. But the corpus's axes specs are mostly
          // ORDERED SCALES, not quadrants — "Isolation: none → read committed →
          // snapshot → serializable", "Tier C → Tier B → Tier A" — where a
          // monotonic diagonal is exactly right, and a high/low parse resolved 0
          // of 176 nodes. So the diagonal stays for what it models correctly, and
          // the numbers tie each point to its full label in the legend rather than
          // asking the position to carry a meaning it can't.
          const frac = nodes.length > 1 ? i / (nodes.length - 1) : 0.5;
          const x = 70 + frac * 200;
          const y = 160 - frac * 130;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="7" fill="var(--track, var(--gen))" opacity="0.25" />
              <circle cx={x} cy={y} r="4" fill="var(--track, var(--gen))" />
              <text x={x} y={y + 3.5} textAnchor="middle" className="schematic-quad-n">{i + 1}</text>
            </g>
          );
        })}
      </svg>
      {/* Axis names and item labels as HTML, so they wrap instead of clipping. */}
      <div className="schematic-quad-legend">
        {spec.xAxis && (
          <p className="schematic-quad-axis"><span className="mono">→</span> {t(spec.xAxis, locale)}</p>
        )}
        {spec.yAxis && (
          <p className="schematic-quad-axis"><span className="mono">↑</span> {t(spec.yAxis, locale)}</p>
        )}
        {nodes.length > 0 && (
          <ol className="schematic-quad-items">
            {nodes.map((n, i) => (
              <li key={i}><span className="schematic-quad-badge mono">{i + 1}</span> {t(n.label, locale)}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
