"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "@/i18n/messages";
import { OTHER_LOCALE, LOCALE_LABEL, type Locale } from "@/i18n/config";

export function Nav({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  // Swap only the leading locale segment for the language toggle.
  const otherHref = pathname.replace(/^\/(en|es)/, `/${OTHER_LOCALE[locale]}`) || `/${OTHER_LOCALE[locale]}`;

  const links: { href: string; key: Parameters<typeof m>[0] }[] = [
    { href: `/${locale}/assess`, key: "nav.assess" },
    { href: `/${locale}/map`, key: "nav.map" },
    { href: `/${locale}/tracks`, key: "nav.tracks" },
    { href: `/${locale}/me`, key: "nav.me" },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      backdropFilter: "blur(12px)",
      background: "var(--overlay)",
      borderBottom: "1px solid var(--hairline)",
    }}>
      <nav className="wrap" style={{ display: "flex", alignItems: "center", gap: "var(--s-6)", height: 60 }}>
        <Link href={`/${locale}`} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="display" style={{ fontSize: "1.5rem", lineHeight: 1 }}>level</span>
          <span className="mono" style={{ color: "var(--gen)", fontSize: "1.1rem" }}>·up</span>
        </Link>
        <div style={{ display: "flex", gap: "var(--s-5)", marginLeft: "var(--s-4)", flexWrap: "wrap" }}>
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href}
                style={{
                  fontSize: "var(--t-sm)", fontFamily: "var(--font-head)", fontWeight: 500,
                  color: active ? "var(--text)" : "var(--text-3)",
                  borderBottom: active ? "1px solid var(--gen)" : "1px solid transparent",
                  paddingBottom: 2,
                }}>
                {m(l.key, locale)}
              </Link>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
          <Link href={otherHref} className="eyebrow" aria-label="Switch language"
            style={{ border: "1px solid var(--hairline-2)", borderRadius: "var(--r-xs)", padding: "3px 8px" }}>
            {LOCALE_LABEL[OTHER_LOCALE[locale]]}
          </Link>
          <Link href={`/${locale}/assess`} className="btn btn-primary" style={{ padding: "var(--s-2) var(--s-4)" }}>
            {m("nav.start", locale)}
          </Link>
        </div>
      </nav>
    </header>
  );
}
