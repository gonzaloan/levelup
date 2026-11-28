import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { Icon } from "@/components/Icon";

// Simulacros: the three rounds of a real loop, one card each (docs/specs/simplify.md). The
// reference material that used to live here is in its concepts, the question bank and the Library.
type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return locale === "es"
    ? pageMeta(locale, "/interview/", "Simulacros de entrevista", "Una ronda de coding, una de system design y tus historias conductuales, cronometradas como en la entrevista real.")
    : pageMeta(locale, "/interview/", "Mock interviews", "A coding round, a system design round and your behavioral stories, timed like the real interview.");
}

export default async function Interview({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  const cards = es
    ? [["practice/code/mock/", "code", "Ronda de coding", "Dos problemas, 45 minutos, sin pistas."],
       ["practice/design/", "server", "Ronda de system design", "Un caso real, 45 minutos con fases y rúbrica. También con un amigo."],
       ["interview/stories/", "mic", "Historias conductuales", "Tus historias STAR, cubiertas por competencia, practicadas en voz alta."]]
    : [["practice/code/mock/", "code", "Coding round", "Two problems, 45 minutes, no hints."],
       ["practice/design/", "server", "System design round", "A real case, 45 minutes with phases and a rubric. Also with a friend."],
       ["interview/stories/", "mic", "Behavioral stories", "Your STAR stories, covered by competency, practiced out loud."]];
  return (
    <main className="page interview">
      <header className="page-head plain">
        <div>
          <h1>{es ? "Simulacros" : "Mock interviews"}</h1>
          <p className="page-sub">{es ? "Las tres rondas de un loop real. Elige una." : "The three rounds of a real loop. Pick one."}</p>
        </div>
      </header>
      <div className="hub">
        {cards.map(([href, icon, title, sub]) => (
          <Link key={href} className="pc" href={`/${locale}/${href}`}>
            <span className="pc-icon"><Icon name={icon} size={22} /></span>
            <div className="pc-text"><h2>{title}</h2><p>{sub}</p></div>
            <Icon name="right" size={18} />
          </Link>
        ))}
      </div>
    </main>
  );
}
