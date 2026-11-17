"use client";
import { useEffect, useState } from "react";

/** Folded sections are <details>: following a link (or a shared #hash) to one opens it. */
const unfold = (id: string) => { const el = document.getElementById(id); if (el instanceof HTMLDetailsElement) el.open = true; };

/** "On this page" with scroll-spy. */
export function Toc({ items, title }: { items: { id: string; label: string }[]; title: string }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: "-80px 0px -65% 0px" });
    els.forEach((e) => io.observe(e));
    const onHash = () => location.hash && unfold(decodeURIComponent(location.hash.slice(1)));
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => { io.disconnect(); window.removeEventListener("hashchange", onHash); };
  }, [items]);
  return (
    <nav className="toc" aria-label={title}>
      <div className="rail-title">{title}</div>
      <ul>
        {items.map((i) => (
          <li key={i.id}><a href={`#${i.id}`} onClick={() => unfold(i.id)} className={active === i.id ? "active" : ""}>{i.label}</a></li>
        ))}
      </ul>
    </nav>
  );
}
