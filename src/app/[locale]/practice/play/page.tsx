import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { m } from "@/lib/i18n";
import { PlayRoute } from "@/components/practice/PlayRoute";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return { title: m("pHubTitle", locale), robots: { index: false } };
}

export default async function Play({ params }: P) {
  const { locale } = await params;
  return (
    <main className="page play">
      <PlayRoute locale={locale} />
    </main>
  );
}
