"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "@/i18n/messages";
import { OTHER_LOCALE, LOCALE_LABEL, t, type Locale } from "@/i18n/config";
import { ThemeToggle } from "./ThemeToggle";

// Authored bilingual screen-reader strings for nav controls. Kept inline (rendered
// via t()) rather than in the shared message catalog so ES users hear ES announcements
// without editing a file shared across the fleet. Real Spanish, not machine-translated.
const A11Y = {
  switchLang: { en: "Switch language", es: "Cambiar idioma" },
  openMenu: { en: "Open menu", es: "Abrir menú" },
  closeMenu: { en: "Close menu", es: "Cerrar menú" },
} as const;

// An authored observatory mark: a small sextant/star reticle in a framed disc.
// Gives the brand a glyph it didn't have — crosshair + a charted star, in the
// instrument voice. If a decorative brand emblem WebP has been generated it is
// layered on top with an onError fallback; the authored SVG is always the base,
// so the mark is complete whether or not the art file exists.
function Mark() {
  const [hasEmblem, setHasEmblem] = useState(false);
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative", flex: "none", width: 26, height: 26,
        display: "grid", placeItems: "center", borderRadius: "var(--r-sm)",
        border: "1px solid var(--hairline-2)",
        background: "radial-gradient(120% 120% at 70% 20%, var(--film-2), transparent 60%)",
        boxShadow: "var(--edge-hi)",
      }}
    >
      <svg width="18" height="18" viewBox="-11 -11 22 22" style={{ display: "block", opacity: hasEmblem ? 0 : 1 }}>
        <circle r="9.5" fill="none" stroke="var(--hairline-2)" strokeWidth="1" />
        <path d="M0,-10 L0,10 M-10,0 L10,0" stroke="var(--hairline-2)" strokeWidth="0.6" opacity="0.7" />
        <path d="M0,-6 L0,6 M-6,0 L6,0" stroke="var(--gen)" strokeWidth="0.75" opacity="0.5" />
        <circle cx="3.2" cy="-3.2" r="2.4" fill="var(--gen)" />
        <circle cx="3.2" cy="-3.2" r="4.6" fill="none" stroke="var(--gen)" strokeWidth="0.5" opacity="0.5" />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/emblem.webp" alt=""
        onLoad={() => setHasEmblem(true)}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
        style={{
          position: "absolute", inset: 3, width: "calc(100% - 6px)", height: "calc(100% - 6px)",
          objectFit: "contain", borderRadius: "var(--r-xs)",
          opacity: hasEmblem ? 1 : 0, transition: "opacity var(--base) var(--eout)",
        }}
      />
    </span>
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
      <nav className="wrap" style={{ display: "flex", alignItems: "center", gap: "var(--s-6)", height: 60 }}>
        <Link href={`/${locale}`} aria-label="level·up — home"
          style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={() => setOpen(false)}>
          <Mark />
          <span style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span className="display" style={{ fontSize: "1.4rem", lineHeight: 1, letterSpacing: "-0.01em" }}>level</span>
            <span className="mono" style={{ color: "var(--gen)", fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.02em" }}>·up</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="nav-links-desktop" style={{ display: "flex", gap: "var(--s-5)", marginLeft: "var(--s-2)" }}>
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} active={pathname.startsWith(l.href)}>
              {m(l.key, locale)}
            </NavLink>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
          <ThemeToggle labelStudio={m("theme.studio", locale)} labelPixel={m("theme.pixel", locale)} />
          <Link href={otherHref} className="eyebrow" aria-label={t(A11Y.switchLang, locale)}
            style={{
              display: "inline-flex", alignItems: "center", height: 40,
              border: "1px solid var(--hairline-2)", borderRadius: "var(--r-sm)",
              padding: "0 10px", color: "var(--text-2)",
              transition: "color var(--base) var(--eout), border-color var(--base) var(--eout)",
            }}>
            {LOCALE_LABEL[OTHER_LOCALE[locale]]}
          </Link>
          <Link href={`/${locale}/learn`} className="btn btn-primary nav-cta-desktop" style={{ height: 40, padding: "0 var(--s-4)" }}>
            {m("nav.start", locale)}
          </Link>
          {/* Mobile hamburger */}
          <button
            ref={burgerRef}
            className="nav-burger"
            aria-label={open ? t(A11Y.closeMenu, locale) : t(A11Y.openMenu, locale)}
            aria-expanded={open}
            aria-controls="nav-sheet"
            onClick={() => setOpen((o) => !o)}
            style={{
              display: "none", background: "none", border: "1px solid var(--hairline-2)",
              borderRadius: "var(--r-sm)", width: 40, height: 40, placeItems: "center",
              cursor: "pointer",
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
                    display: "flex", alignItems: "center", gap: "var(--s-3)",
                    fontFamily: "var(--font-head)", fontWeight: 600, fontSize: "1.0625rem",
                    padding: "var(--s-3) var(--s-3)", borderRadius: "var(--r-sm)",
                    background: active ? "var(--film-2)" : "transparent",
                    color: active ? "var(--gen)" : "var(--text)",
                  }}>
                  <span aria-hidden="true" style={{
                    width: 3, height: "1.1em", borderRadius: 2,
                    background: active ? "var(--gen)" : "transparent",
                  }} />
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
