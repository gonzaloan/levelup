"use client";
// Navigation in two shapes from one list: a row of links in the header (desktop) and a bottom tab
// bar with a "More" sheet (phones, where seven icon-only links were too small to hit and had no
// names). The active entry comes from the URL.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

export interface NavItem { href: string; icon: string; label: string; primary?: boolean }

const isActive = (path: string, href: string, home: string) =>
  href === home ? path === home : path.startsWith(href);

export function MainNav({ items, home }: { items: NavItem[]; home: string }) {
  const path = usePathname() ?? "";
  return (
    <nav className="main-nav" aria-label="main">
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={isActive(path, it.href, home) ? "page" : undefined}>
          <Icon name={it.icon} size={17} /><span>{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function TabBar({ items, home, moreLabel }: { items: NavItem[]; home: string; moreLabel: string }) {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const tabs = items.filter((i) => i.primary);
  const rest = items.filter((i) => !i.primary);
  const restActive = rest.some((i) => isActive(path, i.href, home));
  return (
    <>
      {open && <button type="button" className="tab-scrim" aria-label="Esc" onClick={() => setOpen(false)} />}
      <nav className="tabbar" aria-label="main">
        {open && (
          <div className="tab-sheet" id="tab-more">
            {rest.map((it) => (
              <Link key={it.href} href={it.href} aria-current={isActive(path, it.href, home) ? "page" : undefined}>
                <Icon name={it.icon} size={19} /><span>{it.label}</span>
              </Link>
            ))}
          </div>
        )}
        {tabs.map((it) => (
          <Link key={it.href} href={it.href} className="tab" aria-current={isActive(path, it.href, home) ? "page" : undefined}>
            <Icon name={it.icon} size={21} /><span>{it.label}</span>
          </Link>
        ))}
        <button type="button" className={`tab${restActive ? " on" : ""}`} aria-expanded={open} aria-controls="tab-more" onClick={() => setOpen(!open)}>
          <Icon name={open ? "close" : "list"} size={21} /><span>{moreLabel}</span>
        </button>
      </nav>
    </>
  );
}
