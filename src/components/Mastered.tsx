"use client";
import { useEffect, useState } from "react";
import { getMastered, setMastered, PROGRESS_EVENT } from "@/lib/progress";
import { Icon } from "./Icon";

function useMastered() {
  const [m, setM] = useState<Record<string, 1>>({});
  useEffect(() => {
    const sync = () => setM(getMastered());
    sync();
    window.addEventListener(PROGRESS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(PROGRESS_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return m;
}

export function MasteredToggle({ id, label, doneLabel }: { id: string; label: string; doneLabel: string }) {
  const m = useMastered();
  const on = !!m[id];
  return (
    <button type="button" className={`mastered-btn${on ? " on" : ""}`} aria-pressed={on} onClick={() => setMastered(id, !on)}>
      <Icon name="check" size={16} />
      <span>{on ? doneLabel : label}</span>
    </button>
  );
}

/** "3/15 mastered" + bar, for a set of concept ids. */
export function ProgressMeter({ ids, label }: { ids: string[]; label: string }) {
  const m = useMastered();
  const n = ids.filter((id) => m[id]).length;
  const pct = ids.length ? Math.round((100 * n) / ids.length) : 0;
  return (
    <div className="meter" title={`${n}/${ids.length} ${label}`}>
      <div className="meter-bar"><span style={{ width: `${pct}%` }} /></div>
      <span className="meter-text">{n}/{ids.length} {label}</span>
    </div>
  );
}

/** Small dot marking a mastered concept in lists. */
export function MasteredDot({ id }: { id: string }) {
  const m = useMastered();
  return <span className={`dot${m[id] ? " on" : ""}`} aria-hidden="true" />;
}
