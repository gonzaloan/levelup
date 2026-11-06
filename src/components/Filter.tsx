"use client";
import { useEffect, useState } from "react";
import { norm } from "@/lib/search";
import { Icon } from "./Icon";

/**
 * Client-side filter over server-rendered rows. Rows carry data-filter (normalized text) and
 * data-domain / data-level; sections ([data-section]) hide when they have no visible rows.
 */
export function Filter({ domains, levels, placeholder, allLabel, printLabel, scope }: {
  domains: { id: string; title: string; hue: number }[];
  levels?: { id: string; label: string }[];
  placeholder: string; allLabel: string; printLabel?: string; scope: string;
}) {
  const [q, setQ] = useState("");
  const [dom, setDom] = useState("");
  const [lvl, setLvl] = useState("");
  useEffect(() => {
    const root = document.getElementById(scope);
    if (!root) return;
    const terms = norm(q).split(/\s+/).filter(Boolean);
    root.querySelectorAll<HTMLElement>("[data-filter]").forEach((el) => {
      const text = el.dataset.filter || "";
      const ok = (!dom || el.dataset.domain === dom) && (!lvl || el.dataset.level === lvl) && terms.every((t) => text.includes(t));
      el.hidden = !ok;
    });
    root.querySelectorAll<HTMLElement>("[data-section]").forEach((s) => {
      s.hidden = !s.querySelector("[data-filter]:not([hidden])");
    });
  }, [q, dom, lvl, scope]);
  return (
    <div className="filter-bar">
      <div className="filter-input">
        <Icon name="search" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      </div>
      <div className="chips" role="group">
        <button type="button" className={`chip-btn${!dom ? " on" : ""}`} onClick={() => setDom("")}>{allLabel}</button>
        {domains.map((d) => (
          <button key={d.id} type="button" style={{ ["--h" as string]: d.hue }} className={`chip-btn${dom === d.id ? " on" : ""}`}
            onClick={() => setDom(dom === d.id ? "" : d.id)}>{d.title}</button>
        ))}
      </div>
      {levels && (
        <div className="chips" role="group">
          {levels.map((l) => (
            <button key={l.id} type="button" className={`chip-btn lvl-${l.id}${lvl === l.id ? " on" : ""}`} onClick={() => setLvl(lvl === l.id ? "" : l.id)}>{l.label}</button>
          ))}
          {printLabel && <button type="button" className="chip-btn print-btn" onClick={() => window.print()}><Icon name="printer" size={15} /> {printLabel}</button>}
        </div>
      )}
    </div>
  );
}
