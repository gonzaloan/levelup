import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { SearchPalette } from "@/components/SearchPalette";
import { LOCALES, isLocale, m, t } from "@/lib/i18n";
import { getDomains } from "@/lib/content";
import { hueFor } from "@/lib/hue";

export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.map((locale) => ({ locale }));

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const domains = getDomains().map((d, i) => ({ id: d.id, title: t(d.title, locale), hue: hueFor(i) }));
  return (
    <>
      <a className="skip" href="#main">{locale === "es" ? "Saltar al contenido" : "Skip to content"}</a>
      <Header locale={locale} />
      <div id="main" className="site-main">{children}</div>
      <footer className="site-footer">
        <p>{m("footer", locale)} {m("shortcuts", locale)}</p>
      </footer>
      <SearchPalette locale={locale} domains={domains}
        labels={{ placeholder: m("searchPlaceholder", locale), empty: m("searchEmpty", locale), hint: m("searchHint", locale), close: "Esc" }} />
    </>
  );
}
