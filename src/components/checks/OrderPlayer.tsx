"use client";
// Sequence the tiles. Items start shuffled (deterministic shuffle so SSR/hydration
// match — seeded by item id, NEVER Math.random). Move a tile up/down with buttons
// or ArrowUp/ArrowDown when focused. Emits the item indices in the current order.
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import type { OrderCheck } from "@/lib/types";

// deterministic seeded shuffle (Fisher-Yates w/ mulberry32) — stable per item id.
function seededOrder(n: number, seed: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  // guard: if the shuffle happens to equal the answer, rotate by one
  if (a.every((v, i) => v === i) && n > 1) a.push(a.shift()!);
  return a;
}
function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; }

export function OrderPlayer({
  item, locale, revealed, onChange,
}: {
  item: OrderCheck; locale: Locale; revealed: boolean; onChange: (r: number[]) => void;
}) {
  const [order, setOrder] = useState<number[]>(() => seededOrder(item.items.length, hash(item.id)));

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
          <li key={itemIdx} className="order-tile" data-state={revealed ? (ok ? "ok" : "bad") : undefined}
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
