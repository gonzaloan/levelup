"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "@/i18n/messages";
import { OTHER_LOCALE, LOCALE_LABEL, type Locale } from "@/i18n/config";
import { ThemeToggle } from "./ThemeToggle";

// An authored observatory mark: a small sextant/star reticle. Gives the brand a
// glyph it didn't have — crosshair + a charted star, in the instrument voice.
function Mark() {
  return (
    <svg width="22" height="22" viewBox="-11 -11 22 22" aria-hidden="true" style={{ flex: "none" }}>
      <circle r="9.5" fill="none" stroke="var(--hairline-2)" strokeWidth="1" />
      <path d="M0,-10 L0,10 M-10,0 L10,0" stroke="var(--hairline-2)" strokeWidth="0.6" opacity="0.7" />
      <path d="M0,-6 L0,6 M-6,0 L6,0" stroke="var(--gen)" strokeWidth="0.75" opacity="0.5" />
      <circle cx="3.2" cy="-3.2" r="2.4" fill="var(--gen)" />
      <circle cx="3.2" cy="-3.2" r="4.6" fill="none" stroke="var(--gen)" strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}

export function Nav({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const otherHref = pathname.replace(/^\/(en|es)/, `/${OTHER_LOCALE[locale]}`) || `/${OTHER_LOCALE[locale]}`;

  // Escape closes the sheet and returns focus to the burger; opening moves focus
  // into the sheet's first link (keyboard + screen-reader hygiene).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burgerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const firstLink = sheetRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Simplified nav (get-certified model): a tiny, unambiguous set of verbs.
  const links: { href: string; key: Parameters<typeof m>[0] }[] = [
    { href: `/${locale}/learn`, key: "nav.learn" },
    { href: `/${locale}/ladder`, key: "nav.ladder" },
    { href: `/${locale}/practice`, key: "nav.practice" },
    { href: `/${locale}/me`, key: "nav.me" },
  ];

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        background: "var(--overlay)",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <nav className="wrap" style={{ display: "flex", alignItems: "center", gap: "var(--s-5)", height: 60 }}>
        <Link href={`/${locale}`} style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => setOpen(false)}>
          <Mark />
          <span style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span className="display" style={{ fontSize: "1.5rem", lineHeight: 1 }}>level</span>
            <span className="mono" style={{ color: "var(--gen)", fontSize: "1.1rem" }}>·up</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="nav-links-desktop" style={{ display: "flex", gap: "var(--s-5)", marginLeft: "var(--s-4)" }}>
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} active={pathname.startsWith(l.href)}>
              {m(l.key, locale)}
            </NavLink>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
          <ThemeToggle labelStudio={m("theme.studio", locale)} labelPixel={m("theme.pixel", locale)} />
          <Link href={otherHref} className="eyebrow" aria-label="Switch language"
            style={{ border: "1px solid var(--hairline-2)", borderRadius: "var(--r-xs)", padding: "3px 8px" }}>
            {LOCALE_LABEL[OTHER_LOCALE[locale]]}
          </Link>
          <Link href={`/${locale}/learn`} className="btn btn-primary nav-cta-desktop" style={{ padding: "var(--s-2) var(--s-4)" }}>
            {m("nav.start", locale)}
          </Link>
          {/* Mobile hamburger */}
          <button
            ref={burgerRef}
            className="nav-burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="nav-sheet"
            onClick={() => setOpen((o) => !o)}
            style={{
              display: "none", background: "none", border: "1px solid var(--hairline-2)",
              borderRadius: "var(--r-xs)", padding: "6px 8px", cursor: "pointer",
            }}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
              {open ? (
                <path d="M2,2 L16,12 M16,2 L2,12" stroke="var(--text)" strokeWidth="1.6" />
              ) : (
                <path d="M1,2 H17 M1,7 H17 M1,12 H17" stroke="var(--text)" strokeWidth="1.6" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {open && (
        <div ref={sheetRef} id="nav-sheet" className="nav-sheet" style={{ borderTop: "1px solid var(--hairline)", padding: "var(--s-4) var(--s-6)" }}>
          <div className="stack" style={{ gap: "var(--s-2)" }}>
            {links.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                  style={{
                    fontFamily: "var(--font-head)", fontWeight: 600, fontSize: "1.0625rem",
                    padding: "var(--s-2) 0",
                    color: active ? "var(--gen)" : "var(--text)",
                  }}>
                  {m(l.key, locale)}
                </Link>
              );
            })}
            <Link href={`/${locale}/learn`} className="btn btn-primary" onClick={() => setOpen(false)}
              style={{ marginTop: "var(--s-2)", justifyContent: "center" }}>
              {m("nav.start", locale)}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// A nav link with a sliding underline that animates on active + hover.
function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="nav-link"
      data-active={active ? "true" : "false"}
      style={{
        position: "relative",
        fontSize: "var(--t-sm)", fontFamily: "var(--font-head)", fontWeight: 500,
        color: active ? "var(--text)" : "var(--text-3)",
        paddingBottom: 4,
        transition: "color var(--base) var(--eout)",
      }}
    >
      {children}
      <span
        aria-hidden="true"
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 1,
          background: "var(--gen)",
          transform: active ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "left",
          transition: "transform var(--base) var(--eout)",
        }}
      />
    </Link>
  );
}
