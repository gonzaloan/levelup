import Link from "next/link";
import type { Locale } from "@/lib/types";
import { m } from "@/lib/i18n";
import { SearchButton } from "./SearchButton";
import { LangSwitch } from "./LangSwitch";
import { MainNav, TabBar, type NavItem } from "./Nav";

// Four places, nothing else (docs/specs/simplify.md): Today, Path, Practice, You. Each also owns
// the routes reached from it, so the right tab stays lit (Practice covers the Gym and the mocks,
// You covers the Library and the reference pages). Settings and the account live in You; only
// search and the language switch (it keeps the page you're on) stay in the header.
export function Header({ locale }: { locale: Locale }) {
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  const home = `/${locale}/`;
  const p = (x: string) => `/${locale}/${x}/`;
  const items: NavItem[] = [
    { href: home, icon: "home", label: L("navToday") },
    { href: p("path"), icon: "compass", label: L("navPath"), match: [p("path"), `/${locale}/c/`, `/${locale}/d/`] },
    { href: p("practice"), icon: "cards", label: L("navPractice"), match: [p("practice"), p("gym"), p("interview")] },
    { href: p("me"), icon: "user", label: L("navMe"), match: ["me", "library", "plan", "map", "cheatsheet", "questions", "labs", "graph", "numbers", "pro"].map(p) },
  ];
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href={home} className="brand" title={L("brand")}>
            <span className="brand-mark" aria-hidden="true">◆</span>
            <span className="brand-name">levelup</span>
          </Link>
          <MainNav items={items} home={home} />
          <div className="header-tools">
            <SearchButton label={L("search")} placeholder={L("searchPlaceholder")} />
            <LangSwitch locale={locale} label={L("language")} />
          </div>
        </div>
      </header>
      <TabBar items={items} home={home} />
    </>
  );
}
