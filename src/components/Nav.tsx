"use client";
// Navigation in two shapes from one list: links in the header (desktop) and a bottom tab bar
// (phones). Four places only (docs/specs/simplify.md); the active one comes from the URL, and an
// item may own other routes (`match`) so the reader always knows where they are.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

export interface NavItem { href: string; icon: string; label: string; match?: string[] }

const isActive = (path: string, it: NavItem, home: string) =>
  it.href === home ? path === home : (it.match ?? [it.href]).some((pre) => path.startsWith(pre));

export function MainNav({ items, home }: { items: NavItem[]; home: string }) {
  const path = usePathname() ?? "";
  return (
    <nav className="main-nav" aria-label="main">
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={isActive(path, it, home) ? "page" : undefined}>
          <Icon name={it.icon} size={17} /><span>{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function TabBar({ items, home }: { items: NavItem[]; home: string }) {
  const path = usePathname() ?? "";
  return (
    <nav className="tabbar" aria-label="main">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="tab" aria-current={isActive(path, it, home) ? "page" : undefined}>
          <Icon name={it.icon} size={22} /><span>{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
