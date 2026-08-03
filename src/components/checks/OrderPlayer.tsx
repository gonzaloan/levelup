"use client";
// Sequence the tiles. Items start shuffled (deterministic shuffle so SSR and
// hydration match — seeded by item id, NEVER Math.random). Move a tile up/down
// with buttons or ArrowUp/ArrowDown when focused. Emits the item indices in the
// current order.
//
// The shuffle used to live here as a private Fisher-Yates plus its own string
// hash. It now comes from `displayForOrder`, which is the same primitive the other
// three players use — this was the ONLY mechanic that shuffled, and keeping four
// copies of "how do we hide the authored order" is how three of them ended up
// without one.
import { useMemo, useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { displayForOrder } from "@/lib/checkDisplay";
import type { OrderCheck } from "@/lib/types";

export function OrderPlayer({
  item, locale, revealed, onChange, showDetail = true, attempt = 0,
}: {
  item: OrderCheck; locale: Locale; revealed: boolean; onChange: (r: number[]) => void;
  /** Per-element ok/bad marking. FALSE in graded mode: a per-element feedback
   *  vector against a layout the learner can re-enter is a Mastermind oracle, and
   *  it cleared every checkpoint by attempt 4. The all-or-nothing verdict still
   *  shows in the panel. */
  showDetail?: boolean;
  /** Folded into the display key, so a retry re-lays the elements out. */
  attempt?: number;
}) {
  const initial = useMemo(() => displayForOrder(item, attempt).itemOrder, [item, attempt]);
  const [order, setOrder] = useState<number[]>(initial);

  function move(pos: number, dir: -1 | 1) {
    if (revealed) return;
    const to = pos + dir;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[pos], next[to]] = [next[to], next[pos]];
    setOrder(next);
    onChange(next);
  }

  return (
    <ol className="order-list" aria-label="reorder the steps">
      {order.map((itemIdx, pos) => {
        const ok = revealed && itemIdx === pos;
        return (
          <li key={itemIdx} className="order-tile" data-state={revealed && showDetail ? (ok ? "ok" : "bad") : undefined}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") { e.preventDefault(); move(pos, -1); }
              else if (e.key === "ArrowDown") { e.preventDefault(); move(pos, 1); }
            }}>
            <span className="order-num mono">{pos + 1}</span>
            <span className="order-label">{t(item.items[itemIdx], locale)}</span>
            <span className="order-moves">
              <button type="button" className="order-move" aria-label="move up" disabled={revealed || pos === 0} onClick={() => move(pos, -1)}>▲</button>
              <button type="button" className="order-move" aria-label="move down" disabled={revealed || pos === order.length - 1} onClick={() => move(pos, 1)}>▼</button>
            </span>
          </li>
        );
      })}
      {!revealed && <span className="sr-only">{m("check.orderHint", locale)}</span>}
    </ol>
  );
}

export default OrderPlayer;
