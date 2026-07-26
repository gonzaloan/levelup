"use client";
// Thumb-reachable bottom tab bar on phones (get-certified / native-app pattern).
// Primary nav lives here on mobile; the header keeps brand + theme/lang chips.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "@/i18n/messages";
import { t, type Locale } from "@/i18n/config";

/**
 * Authored line icons, one per tab.
 *
 * These were Unicode glyphs (◉ ▦ ◆ ✎ ☆), which rendered at inconsistent weights
 * and sizes across fonts — the pencil in particular fell back to a heavy emoji
 * beside four thin geometric marks. Drawn as SVG they share one stroke weight and
 * sit in one 20px field, which is what makes a tab bar read as a set.
 */
const ICONS: Record<string, React.ReactNode> = {
  // Today: a filled dot inside a ring — "you are here, now".
  today: (<><circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="2.6" fill="currentColor" stroke="none" /></>),
  // Learn: stacked lesson rows.
  learn: (<><rect x="3" y="4" width="14" height="12" rx="1.5" /><path d="M3 8h14M7.5 8v8" /></>),
  // Ladder: rungs to climb.
  ladder: (<><path d="M6.5 3.5v13M13.5 3.5v13M6.5 7h7M6.5 10.5h7M6.5 14h7" /></>),
  // Practice: a target — repetition aimed at something.
  practice: (<><circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="3" /><circle cx="10" cy="10" r="0.6" fill="currentColor" stroke="none" /></>),
  // Progress: a rising line.
  progress: (<><path d="M3 15.5h14" /><path d="M4.5 13l3.5-3.5 3 2.5L16 6" /></>),
};

function TabIcon({ name }: { name: string }) {
  return (
    <svg className="mtab-ico" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

export function MobileTabBar({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  // Five thumb tabs, Today first — the daily brief is the reason to come back.
  // Labels are SHORT forms: at five-across on a 360px phone, "The Ladder" and
  // "Progress" truncate, and a truncated label is worse than a shorter true one.
  const tabs: { href: string; icon: string; label: { en: string; es: string } }[] = [
    { href: `/${locale}/today`, icon: "today", label: { en: "Today", es: "Hoy" } },
    { href: `/${locale}/learn`, icon: "learn", label: { en: "Learn", es: "Aprender" } },
    { href: `/${locale}/ladder`, icon: "ladder", label: { en: "Ladder", es: "Escalera" } },
    { href: `/${locale}/practice`, icon: "practice", label: { en: "Practice", es: "Práctica" } },
    { href: `/${locale}/me`, icon: "progress", label: { en: "Progress", es: "Progreso" } },
  ];
  return (
    <nav className="mtabbar" aria-label={m("nav.primary", locale)}>
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="mtab"
            data-active={active ? "true" : "false"}
            aria-current={active ? "page" : undefined}
          >
            <TabIcon name={tab.icon} />
            <span>{t(tab.label, locale)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
