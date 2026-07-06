"use client";
// Authored schematic diagrams — hand-rendered inline SVG in the observatory /
// blueprint language. No raster. The content fleet emits a constrained,
// declarative spec (flow / compare / stack / axes) and this renders it in the
// track accent. Diagrams are here to clarify one idea, not to decorate.
import { t, type Locale } from "@/i18n/config";
import type { Schematic as SchematicSpec } from "@/lib/types";

export function Schematic({ spec, locale }: { spec: SchematicSpec; locale: Locale }) {
  if (!spec || spec.kind === "none") return null;
  return (
    <figure className="schematic blueprint" style={{ margin: 0 }}>
      <div className="schematic-body">
        {spec.kind === "flow" && <Flow spec={spec} locale={locale} />}
        {spec.kind === "stack" && <Stack spec={spec} locale={locale} />}
        {spec.kind === "compare" && <Compare spec={spec} locale={locale} />}
        {spec.kind === "axes" && <Axes spec={spec} locale={locale} />}
      </div>
      {spec.caption && (
        <figcaption className="eyebrow" style={{ marginTop: "var(--s-3)", textTransform: "none", letterSpacing: 0, color: "var(--text-3)" }}>
          {t(spec.caption, locale)}
        </figcaption>
      )}
    </figure>
  );
}

// flow: ordered steps left→right (wraps on mobile via CSS), arrows between.
function Flow({ spec, locale }: { spec: SchematicSpec; locale: Locale }) {
  const nodes = spec.nodes ?? [];
  return (
    <div className="schematic-flow">
      {nodes.map((n, i) => (
        <div key={i} className="schematic-flow-cell">
          <div className="schematic-box">
            <span className="schematic-box-label">{t(n.label, locale)}</span>
            {n.note && <span className="schematic-box-note">{t(n.note, locale)}</span>}
          </div>
          {i < nodes.length - 1 && <span className="schematic-arrow" aria-hidden="true">→</span>}
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
        <div key={i} className="schematic-box schematic-stack-row">
          <span className="schematic-box-label">{t(n.label, locale)}</span>
          {n.note && <span className="schematic-box-note">{t(n.note, locale)}</span>}
        </div>
      ))}
    </div>
  );
}

// compare: two labeled columns of points (a contrast).
function Compare({ spec, locale }: { spec: SchematicSpec; locale: Locale }) {
  const cols = [spec.left, spec.right].filter(Boolean) as NonNullable<SchematicSpec["left"]>[];
  return (
    <div className="schematic-compare">
      {cols.map((c, i) => (
        <div key={i} className="schematic-col">
          <div className="schematic-col-title mono">{t(c.title, locale)}</div>
          <ul className="schematic-col-list">
            {c.points.map((p, j) => (
              <li key={j}>{t(p, locale)}</li>
            ))}
          </ul>
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
