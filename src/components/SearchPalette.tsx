"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale, SearchDoc } from "@/lib/types";
import { prepare, search } from "@/lib/search";
import { Icon } from "./Icon";
import { OPEN_SEARCH } from "./SearchButton";

type DomainMeta = { id: string; title: string; hue: number };

const loaders: Record<Locale, () => Promise<{ default: SearchDoc[] }>> = {
  en: () => import("@/generated/search-en.json") as Promise<{ default: SearchDoc[] }>,
  es: () => import("@/generated/search-es.json") as Promise<{ default: SearchDoc[] }>,
};

export function SearchPalette({ locale, domains, labels }: {
  locale: Locale;
  domains: DomainMeta[];
  labels: { placeholder: string; empty: string; hint: string; close: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const dmap = useMemo(() => new Map(domains.map((d) => [d.id, d])), [domains]);

  const load = useCallback(() => {
    if (docs) return;
    loaders[locale]().then((m) => setDocs(m.default)).catch(() => setDocs([]));
  }, [docs, locale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH, onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_SEARCH, onOpen); };
  }, []);

  useEffect(() => {
    if (!open) return;
    load();
    setActive(0);
    input.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open, load]);

  const prepared = useMemo(() => (docs ? prepare(docs) : []), [docs]);
  const results = useMemo(() => search(prepared, q, 30), [prepared, q]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (id: string) => { setOpen(false); setQ(""); router.push(`/${locale}/c/${id}/`); };

  if (!open) return null;
  return (
    <div className="palette-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={labels.placeholder}>
        <div className="palette-input">
          <Icon name="search" />
          <input ref={input} autoFocus value={q} placeholder={labels.placeholder} aria-label={labels.placeholder}
            role="combobox" aria-expanded={results.length > 0} aria-controls="palette-results"
            aria-activedescendant={results[active] ? `pr-${results[active].id}` : undefined}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && results[active]) go(results[active].id);
            }} />
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label={labels.close}><Icon name="close" size={18} /></button>
        </div>
        {q.trim() && (
          <ul className="palette-results" id="palette-results" role="listbox" ref={list}>
            {results.length === 0 && docs && <li className="palette-empty">{labels.empty}</li>}
            {results.map((r, i) => {
              const d = dmap.get(r.d);
              return (
                <li key={r.id} id={`pr-${r.id}`} data-i={i} role="option" aria-selected={i === active}
                  className={i === active ? "active" : ""} onMouseMove={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); go(r.id); }}>
                  <div className="pr-top">
                    <span className="pr-title">{r.t}</span>
                    {d && <span className="chip" style={{ ["--h" as string]: d.hue }}>{d.title}</span>}
                  </div>
                  <div className="pr-sub">{r.s}</div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="palette-foot">{labels.hint}</div>
      </div>
    </div>
  );
}
