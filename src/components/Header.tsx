import Link from "next/link";
import type { Locale } from "@/lib/types";
import { m } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";
import { LangSwitch } from "./LangSwitch";
import { SearchButton } from "./SearchButton";
import { Icon } from "./Icon";

export function Header({ locale }: { locale: Locale }) {
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href={`/${locale}/`} className="brand" aria-label={L("brand")}>
          <span className="brand-mark" aria-hidden="true">◆</span>
          <span className="brand-name">levelup</span>
          <span className="brand-sub">{L("brandShort")}</span>
        </Link>
        <nav className="main-nav" aria-label="main">
          <Link href={`/${locale}/`}><Icon name="book" size={17} /><span>{L("navDomains")}</span></Link>
          <Link href={`/${locale}/cheatsheet/`}><Icon name="list" size={17} /><span>{L("navCheatsheet")}</span></Link>
          <Link href={`/${locale}/interview/`}><Icon name="mic" size={17} /><span>{L("navInterview")}</span></Link>
          <Link href={`/${locale}/practice/`}><Icon name="cards" size={17} /><span>{L("navPractice")}</span></Link>
        </nav>
        <div className="header-tools">
          <SearchButton label={L("search")} placeholder={L("searchPlaceholder")} />
          <LangSwitch locale={locale} label={L("language")} />
          <ThemeToggle label={L("theme")} />
        </div>
      </div>
    </header>
  );
}
