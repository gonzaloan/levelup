"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "@/lib/practice/rng";
import type { ViewProps } from "./ItemViews";

type Box = { x: number; y: number; w: number; h: number };

/**
 * "Rebuild the diagram": the concept's real pre-rendered diagram with some boxes emptied. The
 * learner places components from a bank (which includes look-alikes from other diagrams in the
 * same topic). Slots are positioned over the SVG's own node geometry, so the picture is exactly
 * the one on the concept page.
 */
export function DiagramView({ item, seed, done, response, setResponse, label }: ViewProps) {
  const [svg, setSvg] = useState<{ dark: string; light: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [chip, setChip] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const blanks = useMemo(() => item.blanks ?? [], [item.blanks]);
  const bank = useMemo(() => shuffle(item.bank ?? [], seed), [item.bank, seed]);
  const fill = response?.type === "diagram" ? response.fill : draft;

  useEffect(() => {
    let alive = true;
    setSvg(null); setFailed(false); setDraft({}); setBoxes({});
    Promise.all(["dark", "light"].map((m) => fetch(`/diagrams/${item.c}.${m}.svg`).then((r) => (r.ok ? r.text() : Promise.reject()))))
      .then(([dark, light]) => alive && setSvg({ dark, light }))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [item.c]);

  const nodeEl = (root: Element, node: string) => root.querySelector<SVGGElement>(`g.node[id*="-flowchart-${CSS.escape(node)}-"]`);

  // Hide the blanked labels in both theme variants and measure the visible variant's boxes.
  const measure = useCallback(() => {
    const w = wrap.current;
    if (!w) return;
    for (const root of w.querySelectorAll(".dg")) for (const b of blanks) {
      nodeEl(root, b.node)?.querySelectorAll<SVGElement>("text, foreignObject, .label").forEach((t) => (t.style.visibility = "hidden"));
    }
    const visible = [...w.querySelectorAll<HTMLElement>(".dg")].find((el) => el.offsetParent !== null);
    if (!visible) return;
    const base = w.getBoundingClientRect();
    const next: Record<string, Box> = {};
    for (const b of blanks) {
      const el = nodeEl(visible, b.node);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next[b.node] = { x: r.left - base.left + w.scrollLeft, y: r.top - base.top + w.scrollTop, w: r.width, h: r.height };
    }
    setBoxes(next);
  }, [blanks]);

  useEffect(() => {
    if (!svg) return;
    const id = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    const mo = new MutationObserver(measure);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { cancelAnimationFrame(id); ro.disconnect(); mo.disconnect(); };
  }, [svg, measure]);

  const assign = (node: string, labelText: string | null) => {
    const next = { ...fill };
    for (const k of Object.keys(next)) if (labelText && next[k] === labelText) delete next[k]; // a component lives in one place
    if (labelText) next[node] = labelText; else delete next[node];
    setDraft(next);
    setResponse(blanks.every((b) => next[b.node]) ? { type: "diagram", fill: next } : null);
    setChip(null); setSlot(null);
  };
  const onSlot = (node: string) => {
    if (done) return;
    if (chip) assign(node, chip);
    else if (fill[node]) assign(node, null);
    else setSlot(slot === node ? null : node);
  };
  const onChip = (l: string) => {
    if (done) return;
    if (slot) assign(slot, l);
    else setChip(chip === l ? null : l);
  };

  if (failed) return <p className="p-hint">{label("pEmpty")}</p>;
  const used = new Set(Object.values(fill));
  const vbw = svg ? Number(svg.dark.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+)/)?.[1] ?? 0) : 0;
  return (
    <div className="p-diagram">
      <p className="p-hint">{label("pDiagramHint")}</p>
      <div className="p-dg-wrap diagram" ref={wrap} style={vbw ? { ["--dw" as string]: `${Math.round(vbw)}px` } : undefined}>
        {!svg ? <div className="p-dg-loading">{label("pLoading")}</div> : (
          <>
            <div className="dg dg-dark" dangerouslySetInnerHTML={{ __html: svg.dark }} />
            <div className="dg dg-light" dangerouslySetInnerHTML={{ __html: svg.light }} />
          </>
        )}
        {blanks.map((b) => {
          const box = boxes[b.node];
          if (!box) return null;
          const v = fill[b.node];
          const cls = done ? (v === b.label ? " ok" : " bad") : slot === b.node ? " sel" : v ? " filled" : "";
          return (
            <button key={b.node} type="button" className={`p-dg-slot${cls}`} disabled={done} onClick={() => onSlot(b.node)}
              style={{ left: box.x, top: box.y, width: Math.max(box.w, 64), height: Math.max(box.h, 34) }}
              aria-label={v ?? "?"}>
              {done && v !== b.label ? <><s>{v ?? "?"}</s><span>{b.label}</span></> : v ?? "?"}
            </button>
          );
        })}
      </div>
      {!done && (
        <div className="p-bank">
          {bank.map((l) => (
            <button key={l} type="button" className={`p-chip${chip === l ? " sel" : ""}${used.has(l) ? " used" : ""}`} onClick={() => onChip(l)}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}
