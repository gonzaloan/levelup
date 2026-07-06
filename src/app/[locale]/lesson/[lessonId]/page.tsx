import { isLocale, type Locale, LOCALES, t } from "@/i18n/config";
import { notFound } from "next/navigation";
import { LESSONS, getLesson } from "@/lib/lessons";
import { ORDERED_DOMAINS, conceptsOf, checkpointsAfter } from "@/lib/curriculum";
import { AXIS_BY_ID, LEVELS, type Level } from "@/lib/axes";
import { LessonView } from "@/components/LessonView";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => LESSONS.map((l) => ({ locale, lessonId: l.lessonId })));
}

// The recommended order: interleaved by level band across domains (same as the
// path). Compute the flat lesson sequence once to find "next lesson".
function lessonSequence() {
  const seq: { id: string; domainId: string; level: Level }[] = [];
  for (const level of LEVELS) {
    for (const dom of ORDERED_DOMAINS) {
      const has = dom.levels.find((l) => l.level === level)?.concepts.length;
      if (has) seq.push({ id: `${dom.id}-${level.toLowerCase()}`, domainId: dom.id, level });
    }
  }
  return seq;
}

export default async function LessonPage({ params }: { params: Promise<{ locale: string; lessonId: string }> }) {
  const { locale, lessonId } = await params;
  if (!isLocale(locale)) notFound();
  const L = locale as Locale;

  const lesson = LESSONS.find((l) => l.lessonId === lessonId);
  if (!lesson) notFound();

  const domainId = lessonId.replace(/-l[3-7]$/, "");
  const level = lessonId.split("-").pop()!.toUpperCase() as Level;
  const concepts = conceptsOf(domainId, level);
  const chk = checkpointsAfter(domainId, level);

  const seq = lessonSequence();
  const pos = seq.findIndex((s) => s.id === lessonId);
  const nextRef = pos >= 0 && pos + 1 < seq.length ? seq[pos + 1] : null;
  const nextLesson = nextRef && getLesson(nextRef.domainId, nextRef.level)
    ? {
        id: nextRef.id,
        domainId: nextRef.domainId,
        level: nextRef.level,
        title: `${t(AXIS_BY_ID[ORDERED_DOMAINS.find((d) => d.id === nextRef.domainId)!.axisId].name, L)} · ${nextRef.level}`,
      }
    : null;

  return (
    <LessonView
      locale={L}
      lesson={lesson}
      concepts={concepts}
      checkpointId={chk?.id ?? null}
      nextLesson={nextLesson}
    />
  );
}
