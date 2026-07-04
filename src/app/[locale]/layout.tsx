import { notFound } from "next/navigation";
import { LOCALES, isLocale, type Locale } from "@/i18n/config";
import { Nav } from "@/components/Nav";
import { RewardHost } from "@/components/Reward";
import { m } from "@/i18n/messages";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <>
      <Nav locale={locale} />
      <main>{children}</main>
      <RewardHost />
      <footer style={{ borderTop: "1px solid var(--hairline)", marginTop: "var(--s-24)" }}>
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", padding: "var(--s-8) var(--s-6)", flexWrap: "wrap", gap: "var(--s-4)" }}>
          <span className="dim" style={{ fontSize: "var(--t-sm)" }}>{m("footer.built", locale as Locale)}</span>
          <a href={`/${locale}/method`} className="eyebrow">{m("footer.method", locale as Locale)}</a>
        </div>
      </footer>
    </>
  );
}
