"use client";
// Connect pairs. Tap a left item to select it, then tap a right item to link
// them (re-tapping replaces that left item's link). Colored dots show the
// connection. Emits the [leftIndex, rightIndex] pairs made so far.
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import type { MatchCheck } from "@/lib/types";

export function MatchPlayer({
  item, locale, revealed, onChange,
}: {
  item: MatchCheck; locale: Locale; revealed: boolean; onChange: (r: [number, number][]) => void;
}) {
  const [links, setLinks] = useState<Map<number, number>>(new Map()); // left -> right
  const [selL, setSelL] = useState<number | null>(null);
  const wanted = new Map(item.pairs.map(([l, r]) => [l, r]));

  function emit(map: Map<number, number>) {
    onChange([...map.entries()].map(([l, r]) => [l, r] as [number, number]));
  }
  function pickLeft(l: number) { if (!revealed) setSelL(l); }
  function pickRight(r: number) {
    if (revealed || selL == null) return;
    const next = new Map(links);
    // a right item can only belong to one left — drop any prior owner
    for (const [l, rr] of next) if (rr === r) next.delete(l);
    next.set(selL, r);
    setLinks(next); setSelL(null); emit(next);
  }
  const rightOf = (l: number) => links.get(l);
  const leftLinked = (l: number) => links.has(l);
  const rightLinked = (r: number) => [...links.values()].includes(r);

  return (
    <div className="match" role="group" aria-label="connect the pairs">
      <ul className="match-col match-left">
        {item.left.map((lx, l) => {
          const ok = revealed && rightOf(l) === wanted.get(l);
          return (
            <li key={l}>
              <button type="button" className="match-item" data-selected={selL === l} data-linked={leftLinked(l)}
                data-state={revealed ? (ok ? "ok" : "bad") : undefined}
                onClick={() => pickLeft(l)}>
                {t(lx, locale)}
                {leftLinked(l) && <span className="match-badge mono">{(rightOf(l)! + 1)}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="match-col match-right">
        {item.right.map((rx, r) => (
          <li key={r}>
            <button type="button" className="match-item" data-linked={rightLinked(r)} disabled={revealed}
              onClick={() => pickRight(r)}>
              <span className="match-badge mono">{r + 1}</span>
              {t(rx, locale)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MatchPlayer;
