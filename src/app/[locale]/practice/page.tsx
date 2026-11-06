import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { m, t } from "@/lib/i18n";
import { getDomains } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { Flashcards } from "@/components/Flashcards";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return { title: m("practiceTitle", locale), description: m("practiceSub", locale) };
}

export default async function Practice({ params }: P) {
  const { locale } = await params;
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  return (
    <main className="page practice">
      <header className="page-head plain">
        <div>
          <h1>{L("practiceTitle")}</h1>
          <p className="page-sub">{L("practiceSub")}</p>
        </div>
      </header>
      <Flashcards locale={locale} domains={getDomains().map((d, i) => ({ id: d.id, title: t(d.title, locale), hue: hueFor(i) }))}
        labels={{ reveal: L("reveal"), gotIt: L("gotIt"), again: L("again"), skip: L("skip"), openConcept: L("openConcept"), deck: L("deck"), reviewed: L("reviewed"), reset: L("resetProgress"), all: L("all"), questions: L("questions") }} />
    </main>
  );
}
