"use client";
// Thumb-reachable bottom tab bar on phones (get-certified / native-app pattern).
// Primary nav lives here on mobile; the header keeps brand + theme/lang chips.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";

export function MobileTabBar({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  // Five thumb tabs, Today first — the daily brief is the reason to come back.
  const tabs: { href: string; key: Parameters<typeof m>[0]; ico: string }[] = [
    { href: `/${locale}/today`, key: "nav.today", ico: "◉" },
    { href: `/${locale}/learn`, key: "nav.learn", ico: "▦" },
    { href: `/${locale}/ladder`, key: "nav.ladder", ico: "◆" },
    { href: `/${locale}/practice`, key: "nav.practice", ico: "✎" },
    { href: `/${locale}/me`, key: "nav.me", ico: "☆" },
  ];
  return (
    <nav className="mtabbar" aria-label="primary">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className="mtab" data-active={pathname.startsWith(t.href) ? "true" : "false"}>
          <span className="mtab-ico" aria-hidden="true">{t.ico}</span>
          <span>{m(t.key, locale)}</span>
        </Link>
      ))}
    </nav>
  );
}
