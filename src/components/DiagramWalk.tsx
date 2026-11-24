"use client";
// "Walk through" a pre-rendered diagram: the steps (flow order, computed at build time) light up
// one node or message at a time, with the edges that led there, and dim the rest. The SVG is never
// re-rendered: this only toggles classes on its existing elements, in both theme variants, so a
// theme switch mid-walk keeps the place. Reduced motion: no autoplay, no scroll animation.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Locale } from "@/lib/types";
import type { WalkStep } from "@/lib/diagram-walk";

const STEP_MS = 1500;

const T = {
  en: { walk: "Walk through", play: "Play", pause: "Pause", back: "Previous step", fwd: "Next step", again: "Replay", close: "Exit walkthrough", region: "Diagram walkthrough" },
  es: { walk: "Recorrer", play: "Reproducir", pause: "Pausar", back: "Paso anterior", fwd: "Paso siguiente", again: "Repetir", close: "Salir del recorrido", region: "Recorrido del diagrama" },
};

type Marks = { all: Element[]; at: Element[][]; via: Element[][]; nodes: Map<Element, string> };
const cache = new WeakMap<SVGSVGElement, Marks>();

/** The elements each step lights, looked up once per SVG. */
function marks(svg: SVGSVGElement, steps: WalkStep[], kind: "flow" | "seq"): Marks {
  const hit = cache.get(svg);
  if (hit) return hit;
  const nodes = new Map<Element, string>();
  let at: Element[][], via: Element[][];
  if (kind === "seq") {
    const lines = [...svg.querySelectorAll('[data-et="message"]')], texts = [...svg.querySelectorAll(".messageText")];
    at = steps.map((s) => [lines[s.m!], texts[s.m!]].filter(Boolean));
    via = steps.map(() => []);
  } else {
    // Node ids end "-flowchart-<id>-<n>"; a subgraph used as a node is its cluster, "...-<id>".
    const byId = new Map<string, Element>();
    for (const g of svg.querySelectorAll("g.node")) {
      const id = g.id.match(/-flowchart-(.+)-\d+$/)?.[1];
      if (id) byId.set(id, g);
    }
    const cluster = (id: string) => [...svg.querySelectorAll("g.cluster")].find((g) => g.id.endsWith(`-${id}`));
    at = steps.map((s) => {
      const el = byId.get(s.n!) ?? cluster(s.n!);
      if (el?.classList.contains("node")) nodes.set(el, el.getAttribute("transform") ?? "");
      return el ? [el] : [];
    });
    via = steps.map((s) => (s.via ?? []).flatMap((d) => {
      const path = svg.querySelector(`path[data-id="${CSS.escape(d)}"]`), label = svg.querySelector(`g.label[data-id="${CSS.escape(d)}"]`)?.closest(".edgeLabel");
      return [path, label].filter((x): x is Element => !!x);
    }));
  }
  const m = { all: [...new Set([...at.flat(), ...via.flat()])], at, via, nodes };
  cache.set(svg, m);
  return m;
}

/** Paints step `i` (-1 clears): the current step "on", earlier ones "seen", the rest dimmed. */
function paint(svg: SVGSVGElement, m: Marks, i: number) {
  svg.classList.toggle("wk", i >= 0);
  for (const el of m.all) el.classList.remove("wk-on", "wk-seen");
  for (let k = 0; k <= i && k < m.at.length; k++) {
    for (const el of [...m.at[k], ...m.via[k]]) el.classList.add(k === i ? "wk-on" : "wk-seen");
  }
  // The current node grows a little. A CSS transform replaces the SVG transform attribute, so the
  // node's own translate is repeated in front of the scale.
  for (const [g, base] of m.nodes) {
    const t = base.match(/translate\(\s*([-\d.e]+)[\s,]+([-\d.e]+)\s*\)/);
    (g as SVGGElement).style.transform = i >= 0 && t ? `translate(${t[1]}px, ${t[2]}px) scale(${m.at[i]?.includes(g) ? 1.08 : 1})` : "";
  }
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function DiagramWalk({ steps, kind, locale }: { steps: WalkStep[]; kind: "flow" | "seq"; locale: Locale }) {
  const t = T[locale];
  const bar = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(-1); // -1: not walking
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const last = steps.length - 1;

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => { setReduced(q.matches); if (q.matches) setPlaying(false); };
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);

  // Paint every variant (dark and light), then bring the current step into view if the diagram
  // scrolls (wide diagrams on a phone, the full-screen view).
  useEffect(() => {
    const box = bar.current?.closest(".zoomable");
    if (!box) return;
    const svgs = [...box.querySelectorAll<SVGSVGElement>(".dg svg")];
    for (const svg of svgs) paint(svg, marks(svg, steps, kind), i);
    if (i < 0) return;
    const shown = svgs.find((s) => s.getBoundingClientRect().width > 0);
    const el = shown && marks(shown, steps, kind).at[i]?.[0];
    if (!el || (box.scrollWidth <= box.clientWidth && box.scrollHeight <= box.clientHeight)) return;
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    const dx = r.left + r.width / 2 - (b.left + box.clientWidth / 2), dy = r.top + r.height / 2 - (b.top + box.clientHeight / 2);
    const outX = r.left < b.left + 24 || r.right > b.left + box.clientWidth - 24, outY = box.scrollHeight > box.clientHeight && (r.top < b.top + 24 || r.bottom > b.top + box.clientHeight - 80);
    if (outX || outY) box.scrollBy({ left: outX ? dx : 0, top: outY ? dy : 0, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [i, steps, kind]);

  // Clear the marks if the page unmounts mid-walk (client navigation keeps the SVG nodes cached).
  useEffect(() => {
    const box = bar.current?.closest(".zoomable");
    return () => box?.querySelectorAll<SVGSVGElement>(".dg svg").forEach((svg) => paint(svg, marks(svg, steps, kind), -1));
  }, [steps, kind]);

  useEffect(() => {
    if (!playing) return;
    if (i >= last) { setPlaying(false); return; }
    const h = setTimeout(() => setI((v) => Math.min(last, v + 1)), STEP_MS);
    return () => clearTimeout(h);
  }, [playing, i, last]);

  const start = () => { setI(0); setPlaying(!reduced); };
  const step = useCallback((d: number) => { setPlaying(false); setI((v) => Math.max(0, Math.min(last, v + d))); }, [last]);
  const toggle = () => { if (playing) { setPlaying(false); return; } if (i >= last) setI(0); setPlaying(true); };
  const stop = () => { setPlaying(false); setI(-1); };
  // ← / → step while the bar has focus, instead of reaching the page's previous / next concept.
  const onKey = (e: KeyboardEvent) => {
    if (i < 0 || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); step(e.key === "ArrowLeft" ? -1 : 1); }
  };

  const s = steps[i];
  return (
    <div className={`dg-walk${i >= 0 ? " on" : ""}`} ref={bar} role="group" aria-label={t.region} onKeyDown={onKey}>
      {i < 0 ? (
        <button type="button" className="wk-start" onClick={start}><Glyph d="M8 5.5v13l10-6.5z" fill />{t.walk}</button>
      ) : (
        <>
          <div className="wk-btns">
            <button type="button" className="wk-btn" onClick={() => step(-1)} disabled={i === 0} aria-label={t.back} title={t.back}><Glyph d="M15 6l-6 6 6 6" /></button>
            {!reduced && (
              <button type="button" className="wk-btn wk-main" onClick={toggle} aria-label={playing ? t.pause : i >= last ? t.again : t.play} title={playing ? t.pause : i >= last ? t.again : t.play}>
                {playing ? <Glyph d="M9 6v12M15 6v12" /> : i >= last ? <Glyph d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /> : <Glyph d="M8 5.5v13l10-6.5z" fill />}
              </button>
            )}
            <button type="button" className="wk-btn" onClick={() => step(1)} disabled={i >= last} aria-label={t.fwd} title={t.fwd}><Glyph d="M9 6l6 6-6 6" /></button>
            <span className="wk-count" aria-hidden>{i + 1}/{steps.length}</span>
          </div>
          <p className="wk-cap" aria-live="polite" key={i}>
            <span className="wk-sr">{i + 1}/{steps.length}: </span>
            {s.edge && <span className="wk-edge">{s.edge} →</span>}
            <strong>{s.label}</strong>
          </p>
          <button type="button" className="wk-btn wk-close" onClick={stop} aria-label={t.close} title={t.close}><Glyph d="M6 6l12 12M18 6 6 18" /></button>
          <span className="wk-progress" aria-hidden style={{ ["--p" as string]: `${((i + 1) / steps.length) * 100}%` }} />
        </>
      )}
    </div>
  );
}

function Glyph({ d, fill }: { d: string; fill?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
