import { isLocale, type Locale, LOCALES } from "@/i18n/config";
import { notFound } from "next/navigation";
import { CHECKPOINTS } from "@/lib/curriculum";
import { CheckpointPlayer } from "@/components/CheckpointPlayer";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => CHECKPOINTS.map((c) => ({ locale, checkpointId: c.id })));
}

export default async function CheckpointPage({ params }: { params: Promise<{ locale: string; checkpointId: string }> }) {
  const { locale, checkpointId } = await params;
  if (!isLocale(locale)) notFound();
  const checkpoint = CHECKPOINTS.find((c) => c.id === checkpointId);
  if (!checkpoint || !checkpoint.items?.length) notFound();
  return <CheckpointPlayer locale={locale as Locale} checkpoint={checkpoint} />;
}
