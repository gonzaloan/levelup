"use client";
// Sort items into buckets. Tap an item to select it, then tap a bucket to drop
// it there (or use the per-item bucket buttons). Emits the chosen bucket index
// per item, in AUTHORED item order (-1 for unplaced).
//
// Both the tray and the buckets render in a shuffled order
// (`displayForCategorize`). 62 of the 81 authored categorize checks list their
// items already grouped by bucket, so with the tray in authored order a learner
// could sweep it and drop the first half in the first bucket without reading. A
// fixed bucket order is its own tell too — authors tend to write the "good"
// bucket first. See `checkDisplay.ts`.
//
// `placed` and the emitted array stay indexed by AUTHORED item position, because
// `gradeCheck` compares against `item.items.map(it => it.bucket)`.
import { useMemo, useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { displayForCategorize } from "@/lib/checkDisplay";
import type { CategorizeCheck } from "@/lib/types";

export function CategorizePlayer({
  item, locale, revealed, onChange, showDetail = true, attempt = 0,
}: {
  item: CategorizeCheck; locale: Locale; revealed: boolean; onChange: (r: number[]) => void;
  /** Per-element ok/bad marking. FALSE in graded mode: a per-element feedback
   *  vector against a layout the learner can re-enter is a Mastermind oracle, and
   *  it cleared every checkpoint by attempt 4. The all-or-nothing verdict still
   *  shows in the panel. */
  showDetail?: boolean;
  /** Folded into the display key, so a retry re-lays the elements out. */
  attempt?: number;
}) {
  const [placed, setPlaced] = useState<number[]>(Array(item.items.length).fill(-1));
  const [sel, setSel] = useState<number | null>(null);
  // Deterministic in item.id, so server and client agree (no Math.random).
  const { itemOrder, bucketOrder } = useMemo(() => displayForCategorize(item, attempt), [item, attempt]);

  function assign(itemIdx: number, bucket: number) {
    if (revealed) return;
    const next = [...placed]; next[itemIdx] = bucket; setPlaced(next); setSel(null); onChange(next);
  }
  // Tray in DISPLAY order, holding authored indices.
  const unplaced = itemOrder.filter((i) => placed[i] < 0);

  return (
    <div className="categorize">
      {/* item tray */}
      <div className="cat-tray" role="group" aria-label="items to sort">
        {unplaced.length === 0 ? <span className="dim text-sm">—</span> :
          unplaced.map((i) => (
            <button key={i} type="button" className="cat-chip" data-selected={sel === i}
              onClick={() => setSel(sel === i ? null : i)}>
              {t(item.items[i].label, locale)}
            </button>
          ))}
      </div>
      {/* buckets */}
      <div className="cat-buckets">
        {bucketOrder.map((bi) => (
          <div key={bi} className="cat-bucket">
            <button type="button" className="cat-bucket-head" disabled={revealed || sel == null}
              onClick={() => sel != null && assign(sel, bi)}>
              {t(item.buckets[bi], locale)}
            </button>
            <ul className="cat-bucket-items">
              {itemOrder.map((i) => {
                const it = item.items[i];
                if (placed[i] !== bi) return null;
                const ok = revealed && it.bucket === bi;
                return (
                  <li key={i}>
                    <button type="button" className="cat-placed" data-state={revealed && showDetail ? (ok ? "ok" : "bad") : undefined}
                      onClick={() => assign(i, -1)} disabled={revealed} aria-label={`remove ${t(it.label, locale)}`}>
                      {t(it.label, locale)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategorizePlayer;
