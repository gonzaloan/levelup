"use client";
// Sliding window, step by step: "longest substring without repeating characters" with the
// concept's own template (a count map, `while` to shrink, record after shrinking). The whole run
// is precomputed as snapshots, one per pointer move, so Step / Play only move an index.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Locale } from "@/lib/types";
import { Insight, LabGrid, Seg, Stat } from "./ui";

const MAX = 24;
const EXAMPLES = ["abcabcbb", "bbbbb", "pwwkew"];
const CODE = [
  "for right, ch in enumerate(s):",
  "  count[ch] += 1",
  "  while count[ch] > 1:",
  "    count[s[left]] -= 1; left += 1",
  "  best = max(best, right - left + 1)",
];
type Kind = "start" | "add" | "dup" | "shrink" | "fixed" | "done";
type Snap = { kind: Kind; left: number; right: number; ch: string; gone: string; counts: [string, number][]; best: number; bestL: number; lMoves: number; lines: number[] };

function trace(s: string[]): Snap[] {
  const count = new Map<string, number>();
  const out: Snap[] = [];
  let left = 0, best = 0, bestL = 0, lMoves = 0;
  const record = (right: number) => { if (right - left + 1 > best) { best = right - left + 1; bestL = left; } };
  const push = (kind: Kind, right: number, gone: string, lines: number[]) =>
    out.push({ kind, left, right, ch: s[right] ?? "", gone, counts: [...count], best, bestL, lMoves, lines });
  push("start", -1, "", []);
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    count.set(ch, (count.get(ch) ?? 0) + 1);
    if ((count.get(ch) ?? 0) > 1) push("dup", right, "", [0, 1, 2]);
    else { record(right); push("add", right, "", [0, 1, 4]); }
    while ((count.get(ch) ?? 0) > 1) {
      const gone = s[left];
      count.set(gone, (count.get(gone) ?? 0) - 1);
      left++; lMoves++;
      if ((count.get(ch) ?? 0) > 1) push("shrink", right, gone, [3]);
      else { record(right); push("fixed", right, gone, [3, 4]); }
    }
  }
  push("done", s.length - 1, "", []);
  return out;
}

const T = {
  en: {
    input: `String (up to ${MAX} characters)`, examples: "Examples", step: "Step", play: "Play", pause: "Pause", reset: "Reset",
    window: "Window", len: "length", best: "Best", moves: "Pointer moves", empty: "(empty)", count: "count (the window's state)",
    msg: (p: Snap, bestStr: string) => ({
      start: "Start: left = 0, empty window, best = 0.",
      add: `right → ${p.right}: add '${p.ch}'. No repeats, so best = max(best, ${p.right - p.left + 1}) = ${p.best}.`,
      dup: `right → ${p.right}: add '${p.ch}', now count['${p.ch}'] = 2. Invalid window: shrink from the left.`,
      shrink: `left → ${p.left}: remove '${p.gone}'. '${p.ch}' still repeats, keep shrinking.`,
      fixed: `left → ${p.left}: remove '${p.gone}'. Valid again, so best = ${p.best}.`,
      done: `Done: best = ${p.best} ("${bestStr}").`,
    })[p.kind],
    formula: "moves = right (n) + left (≤ n) ≤ 2n  →  O(n) time · O(k) space for the counts (k = distinct characters)",
    insight: (n: number) => `Each pointer only moves forward: right ${n} times, left at most ${n}, so at most ${2 * n} moves instead of checking all ${(n * (n + 1)) / 2} substrings. That is why the scan is O(n).`,
    note: "Same algorithm as the concept's code template. The example strings are illustrative.",
  },
  es: {
    input: `String (hasta ${MAX} caracteres)`, examples: "Ejemplos", step: "Paso", play: "Reproducir", pause: "Pausa", reset: "Reiniciar",
    window: "Ventana", len: "largo", best: "Mejor", moves: "Movimientos de punteros", empty: "(vacía)", count: "count (el estado de la ventana)",
    msg: (p: Snap, bestStr: string) => ({
      start: "Inicio: left = 0, ventana vacía, best = 0.",
      add: `right → ${p.right}: entra '${p.ch}'. Sin repetidos, así que best = max(best, ${p.right - p.left + 1}) = ${p.best}.`,
      dup: `right → ${p.right}: entra '${p.ch}', ahora count['${p.ch}'] = 2. Ventana inválida: achica por la izquierda.`,
      shrink: `left → ${p.left}: sale '${p.gone}'. '${p.ch}' sigue repetido, sigue achicando.`,
      fixed: `left → ${p.left}: sale '${p.gone}'. Válida otra vez, así que best = ${p.best}.`,
      done: `Listo: best = ${p.best} ("${bestStr}").`,
    })[p.kind],
    formula: "movimientos = right (n) + left (≤ n) ≤ 2n  →  O(n) en tiempo · O(k) en espacio para los conteos (k = caracteres distintos)",
    insight: (n: number) => `Cada puntero solo avanza: right ${n} veces y left como máximo ${n}, así que son a lo más ${2 * n} movimientos en vez de revisar los ${(n * (n + 1)) / 2} substrings. Por eso el recorrido es O(n).`,
    note: "Mismo algoritmo que la plantilla de código del concepto. Los strings de ejemplo son ilustrativos.",
  },
};

const cell: CSSProperties = { width: 30, height: 34, display: "grid", placeItems: "center", borderRadius: 8, font: "700 16px ui-monospace, Menlo, monospace" };
const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

export default function SlidingWindowLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [s, setS] = useState("abcabcbb");
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(false);
  // Code points, like Python indexes a str: an emoji is one character, not two UTF-16 units.
  const chars = useMemo(() => [...s], [s]);
  const steps = useMemo(() => trace(chars), [chars]);
  const last = steps.length - 1;
  const p = steps[Math.min(i, last)];
  const playing = play && i < last;

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setI((x) => x + 1), 700);
    return () => clearTimeout(id);
  }, [playing, i]);

  const load = (v: string) => { setS(v.slice(0, MAX)); setI(0); setPlay(false); };
  const toggle = () => { if (playing) setPlay(false); else { if (i >= last) setI(0); setPlay(true); } };
  const n = chars.length, rMoves = p.right + 1, conflict = p.kind === "dup" || p.kind === "shrink";
  const win = chars.slice(p.left, p.right + 1).join(""), bestStr = chars.slice(p.bestL, p.bestL + p.best).join("");

  return (
    <LabGrid
      controls={
        <>
          <label className="lab-range">
            <span className="lr-top"><span>{t.input}</span><output>{n}/{MAX}</output></span>
            <input type="text" value={s} maxLength={MAX} spellCheck={false} autoComplete="off" onChange={(e) => load(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--bg-2)", color: "var(--text)", font: "600 15px ui-monospace, Menlo, monospace" }} />
          </label>
          <Seg label={t.examples} value={s} onChange={load} options={EXAMPLES.map((v) => ({ value: v, label: v }))} />
          <div className="ls-opts">
            <button type="button" onClick={() => { setPlay(false); setI((x) => Math.min(last, x + 1)); }} disabled={i >= last} style={{ opacity: i >= last ? 0.5 : 1 }}>{t.step}</button>
            <button type="button" onClick={toggle} className={playing ? "on" : undefined} aria-pressed={playing}>{playing ? t.pause : t.play}</button>
            <button type="button" onClick={() => { setPlay(false); setI(0); }}>{t.reset}</button>
          </div>
        </>
      }
    >
      <div className="lab-stats">
        <Stat label={t.window} value={win ? `"${win}"` : t.empty} sub={`${t.len} ${win.length}`} tone={conflict ? "bad" : undefined} />
        <Stat label={t.best} value={p.best} sub={`"${bestStr}"`} tone="good" />
        <Stat label={t.moves} value={`${rMoves + p.lMoves} / ≤ ${2 * n}`} sub={`right ${rMoves}/${n} · left ${p.lMoves}`} />
      </div>
      <p aria-live="polite" style={{ margin: 0, minHeight: "3em", fontSize: 14.5, lineHeight: 1.5 }}>
        <span style={{ color: "var(--muted)", fontFamily: "ui-monospace, Menlo, monospace" }}>{t.step} {Math.min(i, last)}/{last} · </span>{t.msg(p, bestStr)}
      </p>
      <ol aria-label={s} style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: "8px 4px" }}>
        {chars.map((c, k) => {
          const inWin = k >= p.left && k <= p.right, hot = conflict && inWin && c === p.ch;
          const color = hot ? "var(--bad)" : inWin ? "var(--accent)" : k < p.left ? "var(--border)" : "var(--border-2)";
          return (
            <li key={k} style={{ display: "grid", justifyItems: "center", gap: 3, opacity: k < p.left ? 0.5 : 1 }}>
              <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{k}</span>
              <span style={{ ...cell, border: `1.5px solid ${color}`, background: hot ? tint("var(--bad)", 14) : inWin ? tint("var(--accent)", 16) : "transparent", color: k > p.right ? "var(--text-2)" : "var(--text)" }}>{c === " " ? "␣" : c}</span>
              <span style={{ height: 14, font: "700 11px ui-monospace, Menlo, monospace", color: "var(--accent)" }}>{k === p.left ? "L" : ""}{k === p.right ? "R" : ""}</span>
            </li>
          );
        })}
      </ol>
      <div style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{t.count}</span>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6, minHeight: 28 }}>
          {p.counts.map(([k, v]) => (
            <li key={k} style={{ padding: "3px 8px", borderRadius: 8, font: "650 13px ui-monospace, Menlo, monospace", border: `1px solid ${v > 1 ? "var(--bad)" : "var(--border-2)"}`, color: v > 1 ? "var(--bad)" : v === 0 ? "var(--muted)" : "var(--text)" }}>{k === " " ? "␣" : k}: {v}</li>
          ))}
        </ul>
      </div>
      <pre style={{ margin: 0, padding: "10px 0", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)", font: "13px ui-monospace, Menlo, monospace", overflowX: "auto" }}>
        {CODE.map((line, k) => (
          <span key={k} style={{ display: "block", padding: "1px 12px", color: p.lines.includes(k) ? "var(--text)" : "var(--muted)", background: p.lines.includes(k) ? tint("var(--accent)", 18) : undefined }}>{line}</span>
        ))}
      </pre>
      <p className="lab-formula">{t.formula}</p>
      <Insight>{t.insight(n)}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}
