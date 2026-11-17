"use client";
// Small, shared building blocks for the labs: every lab is "controls on the left, live result on
// the right", so a learner can change one thing and watch what moves. No chart library: plain
// elements and inline SVG, themed by the same tokens as the rest of the site.
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ formatting */
const UNITS = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "k"]] as const;
/** 1234 → "1.2k", 3_400_000 → "3.4M". Small numbers keep up to 2 decimals. */
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  const a = Math.abs(n);
  for (const [v, u] of UNITS) if (a >= v) return `${trim(n / v)}${u}`;
  return a >= 100 ? Math.round(n).toString() : trim(n);
}
const trim = (x: number) => (Math.abs(x) >= 100 ? Math.round(x).toString() : Math.abs(x) >= 10 ? x.toFixed(1).replace(/\.0$/, "") : x.toFixed(2).replace(/\.?0+$/, ""));

const BYTES = [[1e15, "PB"], [1e12, "TB"], [1e9, "GB"], [1e6, "MB"], [1e3, "KB"]] as const;
/** Decimal units (10³), the way back-of-the-envelope math is done in interviews. */
export function fmtBytes(b: number): string {
  for (const [v, u] of BYTES) if (b >= v) return `${trim(b / v)} ${u}`;
  return `${Math.round(b)} B`;
}

export function fmtTime(ns: number): string {
  if (ns >= 1e9) return `${trim(ns / 1e9)} s`;
  if (ns >= 1e6) return `${trim(ns / 1e6)} ms`;
  if (ns >= 1e3) return `${trim(ns / 1e3)} µs`;
  return `${trim(ns)} ns`;
}

/* ------------------------------------------------------------------ controls */
export function Range({ label, value, min, max, step = 1, onChange, format = String, hint }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; hint?: string;
}) {
  return (
    <label className="lab-range">
      <span className="lr-top"><span>{label}</span><output>{format(value)}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

/** A slider on a log scale: for values that span orders of magnitude (users, bytes, QPS). */
export function LogRange({ label, value, min, max, onChange, format = fmtNum, hint }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; format?: (v: number) => string; hint?: string;
}) {
  const lo = Math.log10(min), hi = Math.log10(max);
  const pos = ((Math.log10(value) - lo) / (hi - lo)) * 1000;
  const snap = (v: number) => { const p = 10 ** Math.floor(Math.log10(v)); return Math.round(v / p) * p; };
  return (
    <label className="lab-range">
      <span className="lr-top"><span>{label}</span><output>{format(value)}</output></span>
      <input type="range" min={0} max={1000} value={pos} onChange={(e) => onChange(snap(10 ** (lo + (Number(e.target.value) / 1000) * (hi - lo))))} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Seg<T extends string | number>({ label, options, value, onChange }: {
  label?: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="lab-seg" role="group" aria-label={label}>
      {label && <span className="ls-label">{label}</span>}
      <div className="ls-opts">
        {options.map((o) => (
          <button key={String(o.value)} type="button" className={o.value === value ? "on" : undefined} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ output */
export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "bad" | "warn" }) {
  return (
    <div className={`lab-stat${tone ? ` ${tone}` : ""}`}>
      <span className="st-label">{label}</span>
      <strong className="st-value">{value}</strong>
      {sub && <span className="st-sub">{sub}</span>}
    </div>
  );
}

/** Horizontal bar: `value` relative to `max`, optional log scale for values across magnitudes. */
export function Bar({ label, value, max, text, log, tone }: { label: ReactNode; value: number; max: number; text?: string; log?: boolean; tone?: "good" | "bad" | "warn" }) {
  const pct = log ? (Math.log10(Math.max(value, 1)) / Math.log10(Math.max(max, 10))) * 100 : (value / max) * 100;
  return (
    <div className={`lab-bar${tone ? ` ${tone}` : ""}`}>
      <span className="lb-label">{label}</span>
      <span className="lb-track"><span style={{ width: `${Math.max(0.5, Math.min(100, pct))}%` }} /></span>
      <span className="lb-text">{text ?? fmtNum(value)}</span>
    </div>
  );
}

export function LabGrid({ controls, children }: { controls: ReactNode; children: ReactNode }) {
  return (
    <div className="lab-grid">
      <div className="lab-controls">{controls}</div>
      <div className="lab-output">{children}</div>
    </div>
  );
}

/** The takeaway under a lab: one or two sentences, the thing to remember in an interview. */
export const Insight = ({ children }: { children: ReactNode }) => <p className="lab-insight">{children}</p>;
