"use client";
// Motion for the labs: a step player (play / pause / step / speed / scrub), a number that counts
// to its value, code with a sliding highlight, and array cells with pointers that glide. No
// animation library: CSS transitions on transform/opacity plus one requestAnimationFrame loop.
// Everything honours prefers-reduced-motion: no autoplay, no tweening, the final state at once.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* ------------------------------------------------------------------ reduced motion */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ step player */
export const SPEEDS = [0.5, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

export interface Player {
  i: number; playing: boolean; speed: Speed; done: boolean;
  play: () => void; pause: () => void; toggle: () => void; step: (d?: number) => void; reset: () => void; seek: (i: number) => void; setSpeed: (s: Speed) => void;
}

/** Walks an index from 0 to `count - 1`. `baseMs` is the time per step at 1×. Restarting after the
 *  end rewinds. A new `key` (other input, other algorithm) rewinds and stops. */
export function usePlayer(count: number, { baseMs = 650, key = "" }: { baseMs?: number; key?: string } = {}): Player {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const last = count - 1;
  useEffect(() => { setI(0); setPlaying(false); }, [key, count]);
  useEffect(() => {
    if (!playing) return;
    if (i >= last) { setPlaying(false); return; }
    const h = setTimeout(() => setI((v) => Math.min(last, v + 1)), baseMs / speed);
    return () => clearTimeout(h);
  }, [playing, i, last, baseMs, speed]);
  const step = useCallback((d = 1) => { setPlaying(false); setI((v) => Math.max(0, Math.min(last, v + d))); }, [last]);
  const seek = useCallback((v: number) => { setPlaying(false); setI(Math.max(0, Math.min(last, v))); }, [last]);
  return {
    i, playing, speed, done: i >= last,
    play: () => { if (i >= last) setI(0); setPlaying(true); },
    pause: () => setPlaying(false),
    toggle: () => { if (playing) { setPlaying(false); return; } if (i >= last) setI(0); setPlaying(true); },
    step, reset: () => { setPlaying(false); setI(0); }, seek, setSpeed,
  };
}

const PT = {
  en: { play: "Play", pause: "Pause", back: "Step back", fwd: "Step", reset: "Restart", speed: "Speed", pos: "Step" },
  es: { play: "Reproducir", pause: "Pausar", back: "Paso atrás", fwd: "Paso", reset: "Reiniciar", speed: "Velocidad", pos: "Paso" },
};

/** Transport bar for a Player: ⟲ ‹ ▶/❚❚ › , a scrubber and the speed. Keyboard: the buttons. */
export function PlayerBar({ p, count, locale }: { p: Player; count: number; locale: "en" | "es" }) {
  const t = PT[locale];
  return (
    <div className="mo-player">
      <div className="mo-buttons">
        <button type="button" className="mo-btn" onClick={p.reset} aria-label={t.reset} title={t.reset}><Glyph d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></button>
        <button type="button" className="mo-btn" onClick={() => p.step(-1)} disabled={p.i === 0} aria-label={t.back} title={t.back}><Glyph d="M15 6l-6 6 6 6" /></button>
        <button type="button" className="mo-btn mo-main" onClick={p.toggle} aria-label={p.playing ? t.pause : t.play} title={p.playing ? t.pause : t.play}>
          {p.playing ? <Glyph d="M9 6v12M15 6v12" /> : <Glyph d="M8 5.5v13l10-6.5z" fill />}
        </button>
        <button type="button" className="mo-btn" onClick={() => p.step(1)} disabled={p.done} aria-label={t.fwd} title={t.fwd}><Glyph d="M9 6l6 6-6 6" /></button>
      </div>
      <input className="mo-scrub" type="range" min={0} max={Math.max(0, count - 1)} value={p.i} onChange={(e) => p.seek(Number(e.target.value))}
        aria-label={t.pos} aria-valuetext={`${p.i + 1} / ${count}`} style={{ ["--pct" as string]: `${count > 1 ? (100 * p.i) / (count - 1) : 0}%` }} />
      <span className="mo-count">{p.i + 1}/{count}</span>
      <div className="mo-speed" role="group" aria-label={t.speed}>
        {SPEEDS.map((s) => <button key={s} type="button" className={s === p.speed ? "on" : undefined} aria-pressed={s === p.speed} onClick={() => p.setSpeed(s)}>{s}×</button>)}
      </div>
    </div>
  );
}

function Glyph({ d, fill }: { d: string; fill?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* ------------------------------------------------------------------ a sweeping clock */
/** A value that sweeps from `from` to `to` in `ms` with requestAnimationFrame (a race clock, a
 *  time axis). `null` until started. Reduced motion jumps to the end. `key` resets it. */
export function useSweep(from: number, to: number, ms: number, key = ""): { value: number | null; start: () => void; running: boolean } {
  const reduced = useReducedMotion();
  const [value, setValue] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const raf = useRef(0);
  useEffect(() => { cancelAnimationFrame(raf.current); setValue(null); setRunning(false); }, [key]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const start = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (reduced) { setValue(to); return; }
    const t0 = performance.now();
    setRunning(true);
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setValue(from + (to - from) * k);
      if (k < 1) raf.current = requestAnimationFrame(tick); else setRunning(false);
    };
    raf.current = requestAnimationFrame(tick);
  }, [from, to, ms, reduced]);
  return { value, start, running };
}

/* ------------------------------------------------------------------ counting number */
/** Counts from the last shown value to `value` with an ease-out, so a jump reads as motion. */
export function Ticker({ value, format = (v: number) => Math.round(v).toLocaleString(), ms = 450 }: { value: number; format?: (v: number) => string; ms?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced || !Number.isFinite(value)) { setShown(value); from.current = value; return; }
    const start = performance.now(), a = from.current, b = value;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      const v = a + (b - a) * (1 - (1 - k) ** 3);
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, reduced]);
  return <span className="mo-ticker">{format(shown)}</span>;
}

/* ------------------------------------------------------------------ code with a moving highlight */
const KW = /\b(for|in|range|while|if|else|return|def|and|or|not)\b/g;
function paint(line: string) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(KW)) {
    if (m.index! > last) parts.push(line.slice(last, m.index));
    parts.push(<b key={m.index} className="mo-kw">{m[0]}</b>);
    last = m.index! + m[0].length;
  }
  parts.push(line.slice(last));
  return parts;
}

/** Python-ish code; the highlight glides to `active` (one line, or the first of several). */
export function CodeView({ lines, active, label }: { lines: string[]; active: number[]; label: string }) {
  const first = active.length ? Math.min(...active) : -1;
  return (
    <pre className="mo-code" aria-label={label}>
      <span className="mo-hl" aria-hidden style={{ transform: `translateY(${Math.max(0, first) * 100}%)`, opacity: first < 0 ? 0 : 1 }} />
      {lines.map((l, k) => (
        <span key={k} className={`mo-line${active.includes(k) ? " on" : ""}`}><i aria-hidden>{k + 1}</i>{paint(l)}{"\n"}</span>
      ))}
    </pre>
  );
}

/* ------------------------------------------------------------------ array cells and pointers */
export type CellTone = "on" | "dim" | "hit" | "done" | "";
export interface Pointer { name: string; at: number; color: string }

/** A row of cells; pointers glide between them (CSS transform on one element per pointer). */
export function Cells({ values, tones = [], pointers = [], label, span }: {
  values: (string | number)[]; tones?: CellTone[]; pointers?: Pointer[]; label: string;
  /** A window [from, to] (inclusive) drawn as a frame that glides and stretches over the cells. */
  span?: [number, number] | null;
}) {
  const n = values.length;
  // Pointers on the same cell stack instead of covering each other.
  const stack = new Map<number, number>();
  return (
    <div className="mo-cells" role="img" aria-label={label} style={{ ["--n" as string]: n } as CSSProperties}>
      {span && span[1] >= span[0] && (
        <span className="mo-span" aria-hidden style={{ left: `calc(${span[0]} * (100% + 4px) / var(--n) - 3px)`, width: `calc(${span[1] - span[0] + 1} * (100% + 4px) / var(--n) + 2px)` }} />
      )}
      <div className="mo-row">
        {values.map((v, k) => <span key={k} className={`mo-cell ${tones[k] ?? ""}`}><span>{v}</span><small>{k}</small></span>)}
      </div>
      <div className="mo-ptrs" aria-hidden>
        {pointers.filter((p) => p.at >= 0 && p.at < n).map((p) => {
          const level = stack.get(p.at) ?? 0;
          stack.set(p.at, level + 1);
          return (
            <span key={p.name} className="mo-ptr" style={{ transform: `translateX(calc(${p.at} * (100% + 4px)))`, ["--c" as string]: p.color, ["--lv" as string]: level } as CSSProperties}>
              <span>▲ {p.name}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
