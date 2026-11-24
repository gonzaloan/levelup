import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { Gym } from "@/components/gym/Gym";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return locale === "es"
    ? pageMeta(locale, "/gym/", "Gimnasio", "15 minutos al día de lo que la IA hace por ti, hecho a mano: estimar, leer código, encontrar bugs, Big-O, explicar y programar desde cero.")
    : pageMeta(locale, "/gym/", "Gym", "15 minutes a day of what AI does for you, done by hand: estimating, reading code, spotting bugs, Big-O, explaining and coding from a blank page.");
}

const SOURCE = "https://www.anthropic.com/research/AI-assistance-coding-skills";

export default async function GymPage({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  return (
    <main className="page gym-page">
      <header className="page-head plain">
        <div>
          <h1>{es ? "Gimnasio" : "Gym"}</h1>
          <p className="page-sub">{es
            ? "Lo que la IA hace por ti, hecho a mano. 15 minutos al día para que no se oxide."
            : "What AI does for you, done by hand. 15 minutes a day so it doesn't rust."}</p>
        </div>
      </header>
      <Gym locale={locale} />
      <p className="lab-note gym-why">
        {es
          ? <>¿Por qué? En un experimento controlado de Anthropic (ene. 2026), quienes aprendieron una librería nueva con IA sacaron ~50% en la prueba posterior, contra ~67% de quienes programaron a mano; la mayor diferencia fue en depurar. </>
          : <>Why? In a randomized controlled trial by Anthropic (Jan 2026), engineers who learned a new library with AI scored ~50% on the follow-up quiz against ~67% for those who coded by hand; the biggest gap was in debugging. </>}
        <a href={SOURCE} target="_blank" rel="noopener noreferrer">{es ? "Fuente" : "Source"} ↗</a>
      </p>
    </main>
  );
}
