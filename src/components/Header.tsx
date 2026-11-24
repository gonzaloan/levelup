import Link from "next/link";
import type { Locale } from "@/lib/types";
import { m } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";
import { LangSwitch } from "./LangSwitch";
import { SearchButton } from "./SearchButton";
import { AccountButton } from "./Account";
import { MainNav, TabBar, type NavItem } from "./Nav";

export function Header({ locale }: { locale: Locale }) {
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  const home = `/${locale}/`;
  // One list feeds the header links and the phone tab bar; `primary` = a tab, the rest go in "More".
  const items: NavItem[] = [
    { href: `/${locale}/path/`, icon: "compass", label: L("navPath"), primary: true },
    { href: `/${locale}/practice/`, icon: "cards", label: L("navPractice"), primary: true },
    { href: `/${locale}/gym/`, icon: "zap", label: L("navGym"), primary: true },
    { href: `/${locale}/labs/`, icon: "sliders", label: L("navLabs"), primary: true },
    { href: home, icon: "book", label: L("navDomains") },
    { href: `/${locale}/map/`, icon: "map", label: L("navMap") },
    { href: `/${locale}/interview/`, icon: "mic", label: L("navInterview"), primary: true },
    { href: `/${locale}/cheatsheet/`, icon: "list", label: L("navCheatsheet") },
  ];
  const more: NavItem[] = [
    { href: `/${locale}/plan/`, icon: "chart", label: L("navPlan") },
    { href: `/${locale}/graph/`, icon: "network", label: L("navGraph") },
    { href: `/${locale}/questions/`, icon: "message", label: L("navQuestions") },
  ];
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href={`/${locale}/`} className="brand" aria-label={L("brand")}>
            <span className="brand-mark" aria-hidden="true">◆</span>
            <span className="brand-name">levelup</span>
            <span className="brand-sub">{L("brandShort")}</span>
          </Link>
          <MainNav items={items} home={home} />
          <div className="header-tools">
            <SearchButton label={L("search")} placeholder={L("searchPlaceholder")} />
            <LangSwitch locale={locale} label={L("language")} />
            <ThemeToggle label={L("theme")} />
            <AccountButton locale={locale} />
          </div>
        </div>
      </header>
      <TabBar items={[...items, ...more]} home={home} moreLabel={L("navMore")} />
    </>
  );
}
