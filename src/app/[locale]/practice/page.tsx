import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { m } from "@/lib/i18n";
import { Hub } from "@/components/practice/Hub";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/practice/", m("pHubTitle", locale), m("pHubSub", locale));
}

export default async function Practice({ params }: P) {
  const { locale } = await params;
  return (
    <main className="page practice">
      <header className="page-head plain">
        <div>
          <h1>{m("pHubTitle", locale)}</h1>
        </div>
      </header>
      <Hub locale={locale} />
    </main>
  );
}
