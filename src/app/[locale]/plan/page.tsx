import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { t } from "@/lib/i18n";
import { getConcept, getPath } from "@/lib/content";
import { PlanView, type PlanItem } from "@/components/PlanView";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return locale === "es"
    ? pageMeta(locale, "/plan/", "Plan de entrevista", "Pon la fecha de tu entrevista y el rol: te dice qué estudiar cada día, qué practicar y qué dejar para después.")
    : pageMeta(locale, "/plan/", "Interview plan", "Set your interview date and role: it tells you what to study each day, what to practice and what to leave for later.");
}

export default async function PlanPage({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  // Path order is the learning order; the plan filters it by role and by what is already studied.
  const items: PlanItem[] = getPath().flatMap((p) => p.modules.flatMap((m) => m.concepts.flatMap((id) => {
    const c = getConcept(id);
    return c ? [{ id, t: t(c.title, locale), domain: c.domain, level: c.level, module: t(m.title, locale) }] : [];
  })));
  return (
    <main className="page plan-page">
      <header className="page-head plain">
        <div>
          <h1>{es ? "Plan de entrevista" : "Interview plan"}</h1>
          <p className="page-sub">{es ? "Tu fecha, tu rol y tu tiempo: qué hacer hoy y cada semana hasta la entrevista." : "Your date, your role and your time: what to do today and every week until the interview."}</p>
        </div>
      </header>
      <PlanView items={items} locale={locale} />
    </main>
  );
}
