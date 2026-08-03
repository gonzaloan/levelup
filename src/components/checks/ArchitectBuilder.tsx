"use client";
// Architecture Builder — the flagship constructive check. The learner assembles
// a system on a slot grid: place typed components from a palette, then connect
// them with directed edges, and commit to be graded against a target topology
// (src/lib/build.ts, a pure deterministic graph grader).
//
// Interaction is tap-to-place FIRST (WCAG 2.5.7 — a single-pointer path with no
// drag required) and fully keyboard operable; HTML5 drag is layered on as a
// progressive enhancement for mouse users. Grading is on the resulting graph, so
// all three input paths are equivalent.
//
//   • Place:   select a palette item (click / Enter) → click an empty slot.
//   • Connect: click a placed node ("connect from") → click another node.
//   • Remove:  click a placed node's ✕, or select it and press Delete.
//
// Deterministic: no Math.random / Date.now. Slot layout is a fixed grid.
import { useMemo, useRef, useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { gradeBuild } from "@/lib/build";
import type { BuildChallenge, BuildResponse } from "@/lib/types";

type Mode = "formative" | "graded";

interface Placed { slot: number; type: string; instId: string; }

// A fixed 4×3 slot grid (12 slots). Slots are addressed 0..11; positions are
// deterministic percentages so SVG edges can be drawn between slot centers.
const COLS = 4;
const ROWS = 3;
const SLOTS = COLS * ROWS;
function slotCenter(slot: number): { x: number; y: number } {
  const c = slot % COLS;
  const r = Math.floor(slot / COLS);
  return { x: ((c + 0.5) / COLS) * 100, y: ((r + 0.5) / ROWS) * 100 };
}

export function ArchitectBuilder({
  challenge, locale, mode = "formative", onResult,
}: {
  challenge: BuildChallenge;
  locale: Locale;
  mode?: Mode;
  onResult?: (correct: boolean) => void;
}) {
  const track = challenge.track;
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [edges, setEdges] = useState<{ from: string; to: string }[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const seq = useRef(0);

  const labelOf = useMemo(() => {
    const map = new Map(challenge.palette.map((p) => [p.type, p.label]));
    return (type: string) => map.get(type);
  }, [challenge.palette]);

  const response: BuildResponse = useMemo(
    () => ({ nodes: placed.map((p) => ({ id: p.instId, type: p.type })), edges }),
    [placed, edges]
  );
  const grade = useMemo(() => gradeBuild(challenge, response), [challenge, response]);
  const nodeBySlot = useMemo(() => new Map(placed.map((p) => [p.slot, p])), [placed]);
  const posOf = (instId: string) => {
    const p = placed.find((x) => x.instId === instId);
    return p ? slotCenter(p.slot) : { x: 0, y: 0 };
  };

  function reset() {
    setPlaced([]); setEdges([]); setSelectedPalette(null); setConnectFrom(null); setRevealed(false);
  }

  function placeAt(slot: number) {
    if (revealed || !selectedPalette || nodeBySlot.has(slot)) return;
    const instId = `i${seq.current++}`;
    setPlaced((prev) => [...prev, { slot, type: selectedPalette!, instId }]);
    setSelectedPalette(null);
  }

  function removeNode(instId: string) {
    if (revealed) return;
    setPlaced((prev) => prev.filter((p) => p.instId !== instId));
    setEdges((prev) => prev.filter((e) => e.from !== instId && e.to !== instId));
    if (connectFrom === instId) setConnectFrom(null);
  }

  // Clicking a placed node: if we're mid-connect, complete the edge; else start one.
  function tapNode(instId: string) {
    if (revealed) return;
    if (selectedPalette) return; // palette placement takes priority; ignore
    if (connectFrom === null) { setConnectFrom(instId); return; }
    if (connectFrom === instId) { setConnectFrom(null); return; } // tap self = cancel
    setEdges((prev) =>
      prev.some((e) => e.from === connectFrom && e.to === instId)
        ? prev.filter((e) => !(e.from === connectFrom && e.to === instId)) // toggle off
        : [...prev, { from: connectFrom!, to: instId }]
    );
    setConnectFrom(null);
  }

  function onSlotKey(e: React.KeyboardEvent, slot: number) {
    const node = nodeBySlot.get(slot);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (node) tapNode(node.instId);
      else placeAt(slot);
    } else if ((e.key === "Delete" || e.key === "Backspace") && node) {
      e.preventDefault();
      removeNode(node.instId);
    }
  }

  // HTML5 drag enhancement (mouse only; tap path already covers everyone).
  function onDropSlot(e: React.DragEvent, slot: number) {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/plain");
    if (!type || revealed || nodeBySlot.has(slot)) return;
    const instId = `i${seq.current++}`;
    setPlaced((prev) => [...prev, { slot, type, instId }]);
  }

  function commit() {
    setRevealed(true);
    if (mode === "graded") onResult?.(grade.correct);
  }

  const canCommit = placed.length > 0 && edges.length > 0;

  return (
    <div className="arch" data-track={track}>
      <p className="check-prompt">{t(challenge.prompt, locale)}</p>

      {/* status line: what to do next */}
      <p className="arch-hint" aria-live="polite">
        {selectedPalette
          ? t({ en: "Now tap an empty slot to place it.", es: "Ahora toca un espacio vacío para colocarlo." }, locale)
          : connectFrom
            ? t({ en: "Tap another component to connect to it (tap the same one to cancel).", es: "Toca otro componente para conectarlo (toca el mismo para cancelar)." }, locale)
            : t({ en: "Pick a component below, or tap a placed one to start a connection.", es: "Elige un componente abajo, o toca uno colocado para iniciar una conexión." }, locale)}
      </p>

      {/* palette */}
      <div className="arch-palette" role="listbox" aria-label={t({ en: "Components", es: "Componentes" }, locale)}>
        {challenge.palette.map((it) => (
          <button
            key={it.type}
            role="option"
            aria-selected={selectedPalette === it.type}
            className="arch-chip"
            data-selected={selectedPalette === it.type ? "true" : "false"}
            draggable={!revealed}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", it.type)}
            onClick={() => { if (!revealed) { setSelectedPalette(selectedPalette === it.type ? null : it.type); setConnectFrom(null); } }}
            disabled={revealed}
            title={it.hint ? t(it.hint, locale) : undefined}
          >
            {t(it.label, locale)}
          </button>
        ))}
      </div>

      {/* canvas */}
      <div className="arch-canvas" role="group" aria-label={t({ en: "Architecture canvas", es: "Lienzo de arquitectura" }, locale)}>
        {/* edges layer */}
        <svg className="arch-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="arch-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="var(--track, var(--gen))" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const a = posOf(e.from), b = posOf(e.to);
            // Per-edge correctness colouring is intentionally NOT attempted here
            // (the grader keys criteria by node TYPE, not instance edge); the
            // per-criterion verdict list below is the authoritative feedback.
            return (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="var(--track, var(--gen))" strokeWidth={0.6} strokeOpacity={0.85}
                markerEnd="url(#arch-arrow)" vectorEffect="non-scaling-stroke" />
            );
          })}
        </svg>

        {/* slot grid */}
        <div className="arch-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>
          {Array.from({ length: SLOTS }, (_, slot) => {
            const node = nodeBySlot.get(slot);
            const isConnectSource = node && connectFrom === node.instId;
            return (
              <div
                key={slot}
                className="arch-slot"
                data-filled={node ? "true" : "false"}
                data-source={isConnectSource ? "true" : "false"}
                tabIndex={0}
                role="button"
                aria-label={node ? `${t(labelOf(node.type)!, locale)}` : t({ en: "Empty slot", es: "Espacio vacío" }, locale)}
                onClick={() => (node ? tapNode(node.instId) : placeAt(slot))}
                onKeyDown={(e) => onSlotKey(e, slot)}
                onDragOver={(e) => { if (!node && !revealed) e.preventDefault(); }}
                onDrop={(e) => onDropSlot(e, slot)}
              >
                {node && (
                  <>
                    <span className="arch-node-label">{t(labelOf(node.type)!, locale)}</span>
                    {!revealed && (
                      <button className="arch-node-x" aria-label={t({ en: "Remove", es: "Quitar" }, locale)}
                        onClick={(ev) => { ev.stopPropagation(); removeNode(node.instId); }}>✕</button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* controls */}
      {!revealed && (
        <div style={{ display: "flex", gap: "var(--s-3)", marginTop: "var(--s-4)", flexWrap: "wrap" }}>
          <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""}`} disabled={!canCommit} onClick={commit}>
            {t({ en: "Grade my architecture", es: "Evaluar mi arquitectura" }, locale)}
          </button>
          <button className="btn btn-sm" onClick={reset} disabled={placed.length === 0}>
            {t({ en: "Clear", es: "Limpiar" }, locale)}
          </button>
        </div>
      )}

      {/* reveal: per-criterion feedback */}
      {revealed && (
        <div className="check-reveal arch-reveal" data-correct={grade.correct} role="status" aria-live="polite"
          style={{ marginTop: "var(--s-4)", padding: "var(--s-4)", borderRadius: "var(--r-sm)",
            background: grade.correct ? "var(--ok-bg)" : "var(--bad-bg)" }}>
          <p className="eyebrow" style={{ color: grade.correct ? "var(--ok)" : "var(--bad)", marginBottom: 8 }}>
            {grade.correct
              ? `✓ ${t({ en: "Sound architecture", es: "Arquitectura sólida" }, locale)}`
              : `${t({ en: "Not quite", es: "Casi" }, locale)} · ${grade.passed}/${grade.total}`}
          </p>
          {/* The criterion labels ARE the answer: gradeBuild builds them as
              `Include "cache"`, `Connect lb → api`, `Avoid client → db`. They used
              to render on every commit in both modes, and `canCommit` needs only
              one node and one edge — so a throwaway 2-node commit printed the whole
              target topology, and the next commit was certain.

              Graded mode gets the count only. Formative mode keeps the full list,
              because there the criteria are the teaching. */}
          {mode === "formative" ? (
            <ul className="arch-crits">
              {grade.criteria.map((c, i) => (
                <li key={i} data-ok={c.ok ? "true" : "false"}>
                  <span className="arch-crit-mark" aria-hidden="true">{c.ok ? "✓" : "○"}</span>
                  <span>
                    <strong>{t(c.label, locale)}</strong>
                    {c.note && (t(c.note, locale)) ? <span className="arch-crit-note"> — {t(c.note, locale)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-2)" }}>
              {t({
                en: `${grade.passed} of ${grade.total} criteria met.`,
                es: `${grade.passed} de ${grade.total} criterios cumplidos.`,
              }, locale)}
            </p>
          )}
          {/* `explain` is the reference architecture's rationale — it names the
              components. Shown when formative, or when the learner got it right;
              withheld on a graded miss, for the same reason the criteria are. */}
          {(mode === "formative" || grade.correct) && (
            <p style={{ fontSize: "var(--t-sm)", color: "var(--text)", marginTop: "var(--s-3)", borderTop: "1px solid var(--hairline)", paddingTop: "var(--s-3)" }}>
              {t(challenge.explain, locale)}
            </p>
          )}
          {mode === "formative" && !grade.correct && (
            <button className="btn btn-sm" style={{ marginTop: "var(--s-3)" }} onClick={reset}>
              {m("check.retry", locale)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ArchitectBuilder;
