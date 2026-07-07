"use client";
// Sort items into buckets. Tap an item to select it, then tap a bucket to drop
// it there (or use the per-item bucket buttons). Emits the chosen bucket index
// per item, in item order (-1 for unplaced).
import { useState } from "react";
import { t, type Locale } from "@/i18n/config";
import type { CategorizeCheck } from "@/lib/types";

export function CategorizePlayer({
  item, locale, revealed, onChange,
}: {
  item: CategorizeCheck; locale: Locale; revealed: boolean; onChange: (r: number[]) => void;
}) {
  const [placed, setPlaced] = useState<number[]>(Array(item.items.length).fill(-1));
  const [sel, setSel] = useState<number | null>(null);

  function assign(itemIdx: number, bucket: number) {
    if (revealed) return;
    const next = [...placed]; next[itemIdx] = bucket; setPlaced(next); setSel(null); onChange(next);
  }
  const unplaced = item.items.map((_, i) => i).filter((i) => placed[i] < 0);

  return (
    <div className="categorize">
      {/* item tray */}
      <div className="cat-tray" role="group" aria-label="items to sort">
        {unplaced.length === 0 ? <span className="dim" style={{ fontSize: "var(--t-sm)" }}>—</span> :
          unplaced.map((i) => (
            <button key={i} type="button" className="cat-chip" data-selected={sel === i}
              onClick={() => setSel(sel === i ? null : i)}>
              {t(item.items[i].label, locale)}
            </button>
          ))}
      </div>
      {/* buckets */}
      <div className="cat-buckets">
        {item.buckets.map((b, bi) => (
          <div key={bi} className="cat-bucket">
            <button type="button" className="cat-bucket-head" disabled={revealed || sel == null}
              onClick={() => sel != null && assign(sel, bi)}>
              {t(b, locale)}
            </button>
            <ul className="cat-bucket-items">
              {item.items.map((it, i) => {
                if (placed[i] !== bi) return null;
                const ok = revealed && it.bucket === bi;
                return (
                  <li key={i}>
                    <button type="button" className="cat-placed" data-state={revealed ? (ok ? "ok" : "bad") : undefined}
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
