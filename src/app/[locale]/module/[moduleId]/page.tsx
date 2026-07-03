import { isLocale, type Locale, LOCALES } from "@/i18n/config";
import { notFound } from "next/navigation";
import { MODULES, ITEMS, ROOMS, FIELDWORK } from "@/content/registry";
import { ModuleView } from "@/components/ModuleView";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => MODULES.map((mod) => ({ locale, moduleId: mod.id })));
}

export default async function ModulePage({ params }: { params: Promise<{ locale: string; moduleId: string }> }) {
  const { locale, moduleId } = await params;
  if (!isLocale(locale)) notFound();
  const mod = MODULES.find((x) => x.id === moduleId);
  if (!mod) notFound();

  const retrievalItems = ITEMS.filter((i) => (mod.retrieval ?? []).includes(i.id));
  const room = mod.room ? ROOMS.find((r) => r.id === mod.room) : ROOMS.find((r) => r.axes.includes(mod.axis.primary));
  const fieldWork = mod.fieldWork
    ? FIELDWORK.find((f) => f.id === mod.fieldWork)
    : FIELDWORK.find((f) => f.axis === mod.axis.primary);

  return (
    <div className="wrap" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)", maxWidth: 820 }}>
      <ModuleView locale={locale as Locale} mod={mod} retrievalItems={retrievalItems} room={room ?? null} fieldWork={fieldWork ?? null} />
    </div>
  );
}
