"use client";
// Connect pairs. Tap a left item to select it, then tap a right item to link
// them (re-tapping replaces that left item's link). Colored dots show the
// connection. Emits the [leftIndex, rightIndex] pairs made so far.
//
// BOTH columns render in a shuffled order (`displayForMatch`). 63 of the 73
// authored match checks key pairs [[0,0],[1,1],…], so with both columns in
// authored order a learner could link row 1 to row 1 straight down the list and
// be right every time, without reading. See `checkDisplay.ts`.
//
// `links` and every emitted pair stay in AUTHORED indices; only the render order
// changes. The visible badge number is a DISPLAY position, because it exists to
// help a learner see which right-hand row they picked — it is never graded.
import { useMemo, useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { displayForMatch } from "@/lib/checkDisplay";
import type { MatchCheck } from "@/lib/types";

export function MatchPlayer({
  item, locale, revealed, onChange,
}: {
  item: MatchCheck; locale: Locale; revealed: boolean; onChange: (r: [number, number][]) => void;
}) {
  const [links, setLinks] = useState<Map<number, number>>(new Map()); // left -> right (AUTHORED indices)
  const [selL, setSelL] = useState<number | null>(null);
  const wanted = new Map(item.pairs.map(([l, r]) => [l, r]));
  // Deterministic in item.id, so server and client agree (no Math.random).
  const { leftOrder, rightOrder } = useMemo(() => displayForMatch(item), [item]);
  // Authored right index -> the badge number the learner sees for it.
  const badgeOf = useMemo(() => {
    const m = new Map<number, number>();
    rightOrder.forEach((authored, slot) => m.set(authored, slot + 1));
    return m;
  }, [rightOrder]);

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
        {leftOrder.map((l) => {
          const lx = item.left[l];
          const ok = revealed && rightOf(l) === wanted.get(l);
          return (
            <li key={l}>
              <button type="button" className="match-item" data-selected={selL === l} data-linked={leftLinked(l)}
                data-state={revealed ? (ok ? "ok" : "bad") : undefined}
                onClick={() => pickLeft(l)}>
                {t(lx, locale)}
                {leftLinked(l) && <span className="match-badge mono">{badgeOf.get(rightOf(l)!)}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="match-col match-right">
        {rightOrder.map((r, slot) => (
          <li key={r}>
            <button type="button" className="match-item" data-linked={rightLinked(r)} disabled={revealed}
              onClick={() => pickRight(r)}>
              <span className="match-badge mono">{slot + 1}</span>
              {t(item.right[r], locale)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MatchPlayer;
