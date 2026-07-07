// A statically-exported, crawlable page per achievement. LinkedIn's
// share-offsite reads THIS page's Open Graph tags to render the rich card
// (it can't see localStorage), so each badge gets its own OG title/desc/image
// at a stable URL. Also the human landing for a shared link.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale, LOCALES, t } from "@/i18n/config";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, badgeArt } from "@/lib/badges";
import { AchievementView } from "@/components/AchievementView";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => ACHIEVEMENTS.map((a) => ({ locale, id: a.id })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const a = ACHIEVEMENT_BY_ID.get(id);
  if (!a || !isLocale(locale)) return {};
  const L = locale as Locale;
  const title = `${t(a.name, L)} — level-up`;
  const description = t(a.description, L);
  const ogImage = `/og/${id}.png`;   // 1200×627, pre-rendered at build (public/og)
  const url = `/${L}/achievement/${id}/`;
  return {
    title,
    description,
    openGraph: {
      title, description, url, type: "website",
      images: [{ url: ogImage, width: 1200, height: 627, alt: t(a.name, L) }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    alternates: { canonical: url },
  };
}

export default async function AchievementPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const a = ACHIEVEMENT_BY_ID.get(id);
  if (!a) notFound();
  return <AchievementView locale={locale as Locale} achievementId={id} art={badgeArt(id)} />;
}
