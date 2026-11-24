"use client";
// Sliding window, step by step: "longest substring without repeating characters" with the
// concept's own template (a count map, `while` to shrink, record after shrinking). The whole run
// is precomputed as snapshots, one per pointer move, so Step / Play only move an index.
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import { Insight, LabGrid, LabMore, Seg, Stat } from "./ui";
import { Cells, CodeView, PlayerBar, Ticker, usePlayer, type CellTone } from "./motion";

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
    input: `String (up to ${MAX} characters)`, examples: "Examples",
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
    input: `String (hasta ${MAX} caracteres)`, examples: "Ejemplos",
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

export default function SlidingWindowLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [s, setS] = useState("abcabcbb");
  // Code points, like Python indexes a str: an emoji is one character, not two UTF-16 units.
  const chars = useMemo(() => [...s], [s]);
  const steps = useMemo(() => trace(chars), [chars]);
  const pl = usePlayer(steps.length, { key: s, baseMs: 750 });
  const p = steps[Math.min(pl.i, steps.length - 1)];

  const load = (v: string) => setS(v.slice(0, MAX));
  const n = chars.length, rMoves = p.right + 1, conflict = p.kind === "dup" || p.kind === "shrink";
  const win = chars.slice(p.left, p.right + 1).join(""), bestStr = chars.slice(p.bestL, p.bestL + p.best).join("");
  const tones: CellTone[] = chars.map((c, k) => {
    const inWin = k >= p.left && k <= p.right;
    if (conflict && inWin && c === p.ch) return "hit";
    if (inWin) return "on";
    return k < p.left ? "dim" : "";
  });

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
          <CodeView lines={CODE} active={p.lines} label="Python" />
        </>
      }
    >
      <div className="lab-hero">
        <PlayerBar p={pl} count={steps.length} locale={locale} />
        <Cells values={chars.map((c) => (c === " " ? "␣" : c))} tones={tones} label={s}
          span={p.right >= p.left ? [p.left, p.right] : null}
          pointers={[{ name: "L", at: p.left, color: "var(--accent)" }, { name: "R", at: p.right, color: "oklch(0.72 0.15 250)" }]} />
        <p className="mo-msg" aria-live="polite">{t.msg(p, bestStr)}</p>
      </div>
      <div className="lab-stats">
        <Stat label={t.window} value={win ? `"${win}"` : t.empty} sub={`${t.len} ${win.length}`} tone={conflict ? "bad" : undefined} />
        <Stat label={t.best} value={<Ticker value={p.best} />} sub={`"${bestStr}"`} tone="good" />
        <Stat label={t.moves} value={<><Ticker value={rMoves + p.lMoves} /> / ≤ {2 * n}</>} sub={`right ${rMoves}/${n} · left ${p.lMoves}`} />
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{t.count}</span>
        <ul className="sw-counts">
          {p.counts.map(([k, v]) => (
            <li key={k} className={v > 1 ? "bad" : v === 0 ? "zero" : undefined}>{k === " " ? "␣" : k}: {v}</li>
          ))}
        </ul>
      </div>
      <Insight>{t.insight(n)}</Insight>
      <LabMore locale={locale} formula={t.formula}><p className="lab-note">{t.note}</p></LabMore>
    </LabGrid>
  );
}
