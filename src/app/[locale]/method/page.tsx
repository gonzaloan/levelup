import { isLocale, type Locale, LOCALES, t } from "@/i18n/config";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const SECTIONS = [
  {
    h: { en: "We place you in a band, not a number", es: "Te ubicamos en una banda, no un número" },
    p: { en: "Around seven judgment items per axis can't tell L4 from L5 with false precision. So we report one of three honest bands — Developing, Solid, Strong — each mapped to a level range. When we're unsure, we say provisional and widen the range. We would rather be honestly vague than confidently wrong.", es: "Alrededor de siete ítems de juicio por eje no pueden distinguir L4 de L5 con falsa precisión. Por eso reportamos una de tres bandas honestas — En desarrollo, Sólido, Fuerte — cada una mapeada a un rango de nivel. Cuando dudamos, lo decimos: provisional y ampliamos el rango. Preferimos ser honestamente vagos que estar seguros y equivocados." },
  },
  {
    h: { en: "A hard question right is worth more", es: "Una pregunta difícil bien vale más" },
    p: { en: "Ability is estimated with a penalized (MAP) 1PL model: getting a hard item right moves your estimate more than an easy one, and the prior keeps an all-right or all-wrong run from flying off to infinity. This is what separates the placement from a percentage-correct quiz.", es: "La habilidad se estima con un modelo 1PL penalizado (MAP): acertar un ítem difícil mueve tu estimación más que uno fácil, y el prior evita que una racha de todo-bien o todo-mal se dispare al infinito. Esto es lo que separa el diagnóstico de un cuestionario de porcentaje de aciertos." },
  },
  {
    h: { en: "Being confidently wrong is the signal", es: "Estar seguro y equivocado es la señal" },
    p: { en: "Every item asks how sure you are, scored so that honesty beats bluffing. A confident wrong answer is the most useful event in the whole diagnostic — but we only let it lower a band when a second signal agrees, and we surface a calibration gap only when it's bigger than our own measurement error.", es: "Cada ítem pregunta qué tan seguro estás, puntuado para que la honestidad gane al farol. Una respuesta segura y equivocada es el evento más útil de todo el diagnóstico — pero solo dejamos que baje una banda cuando una segunda señal coincide, y mostramos una brecha de calibración solo cuando es mayor que nuestro propio error de medición." },
  },
  {
    h: { en: "The Room is keyed by senior reviewers, not a crowd", es: "La Sala la califican revisores senior, no una multitud" },
    p: { en: "Scenario answers are scored against a senior-reviewed key with defensible best, acceptable, and harmful options — not one right answer. We tell you how many reviewers keyed it, and we don't dress a single author's key up as consensus.", es: "Las respuestas de escenario se califican contra una clave revisada por seniors con opciones defendibles: la mejor, aceptables y dañinas — no una sola correcta. Te decimos cuántos revisores la calificaron, y no disfrazamos la clave de un solo autor como consenso." },
  },
] as const;

export default async function MethodPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const L = locale as Locale;
  return (
    <div className="wrap prose" style={{ paddingTop: "var(--s-12)", paddingBottom: "var(--s-16)" }}>
      <p className="eyebrow">{t({ en: "How placement works", es: "Cómo funciona el diagnóstico" }, L)}</p>
      <h1 className="display" style={{ fontSize: "var(--t-h1)", margin: "var(--s-3) 0 var(--s-8)" }}>
        {t({ en: "Honest by construction.", es: "Honesto por construcción." }, L)}
      </h1>
      {SECTIONS.map((s, i) => (
        <section key={i} style={{ marginBottom: "var(--s-8)" }}>
          <h2 style={{ fontSize: "var(--t-h3)", marginBottom: "var(--s-3)" }}>{t(s.h, L)}</h2>
          <p>{t(s.p, L)}</p>
        </section>
      ))}
    </div>
  );
}
