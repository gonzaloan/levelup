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
  {
    h: { en: "What the diagnostic uses, exactly", es: "Qué usa el diagnóstico, exactamente" },
    p: { en: "Your placement is computed from the objective judgment items and your confidence on them — knowledge weighted with calibration. The Room lives inside the modules, where it sharpens judgment with downstream consequences; it does not feed the placement score. We'd rather under-claim what the 20-minute diagnostic measures than pretend a single scenario can level you.", es: "Tu diagnóstico se calcula a partir de los ítems objetivos de juicio y tu confianza en ellos — conocimiento ponderado con calibración. La Sala vive dentro de los módulos, donde afina el juicio con consecuencias posteriores; no alimenta el puntaje del diagnóstico. Preferimos declarar de menos lo que mide el diagnóstico de 20 minutos antes que fingir que un solo escenario puede nivelarte." },
  },
] as const;

export default async function MethodPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const L = locale as Locale;
  return (
    <div className="wrap" style={{ paddingTop: "var(--s-12)", paddingBottom: "var(--s-16)", maxWidth: 940 }}>
      <p className="eyebrow">{t({ en: "How placement works", es: "Cómo funciona el diagnóstico" }, L)}</p>
      <h1 className="display" style={{ fontSize: "var(--t-h1)", margin: "var(--s-3) 0 var(--s-10)" }}>
        {t({ en: "Honest by construction.", es: "Honesto por construcción." }, L)}
      </h1>
      {SECTIONS.map((s, i) => (
        <section key={i} className="method-row" style={{ marginBottom: "var(--s-10)" }}>
          <div className="method-glyph" aria-hidden="true"><MethodGlyph i={i} /></div>
          <div>
            <h2 style={{ fontSize: "var(--t-h3)", marginBottom: "var(--s-3)" }}>{t(s.h, L)}</h2>
            <p className="prose">{t(s.p, L)}</p>
          </div>
        </section>
      ))}
    </div>
  );
}

// Small instrument glyphs — one per principle, in the observatory language.
function MethodGlyph({ i }: { i: number }) {
  const common = { fill: "none", strokeWidth: 1.25 } as const;
  if (i === 0) {
    // three bands
    return (
      <svg viewBox="0 0 64 64" width="56" height="56">
        {[18, 32, 46].map((y, k) => (
          <line key={y} x1="8" y1={y} x2="56" y2={y} stroke={k === 1 ? "var(--gen)" : "var(--hairline-2)"} {...common} />
        ))}
        <circle cx="38" cy="32" r="3.5" fill="var(--gen)" />
      </svg>
    );
  }
  if (i === 1) {
    // a logistic curve
    return (
      <svg viewBox="0 0 64 64" width="56" height="56">
        <path d="M8,52 C28,52 30,12 56,12" stroke="var(--gen)" {...common} />
        <line x1="8" y1="56" x2="56" y2="56" stroke="var(--hairline-2)" strokeWidth="0.75" />
      </svg>
    );
  }
  if (i === 2) {
    // a target with an off-center hit (confident-wrong)
    return (
      <svg viewBox="0 0 64 64" width="56" height="56">
        <circle cx="32" cy="32" r="20" stroke="var(--hairline-2)" {...common} />
        <circle cx="32" cy="32" r="10" stroke="var(--hairline-2)" {...common} />
        <circle cx="46" cy="22" r="3.5" fill="var(--bad)" />
      </svg>
    );
  }
  if (i === 3) {
    // a keyed panel (senior review)
    return (
      <svg viewBox="0 0 64 64" width="56" height="56">
        {[16, 28, 40].map((y) => (
          <line key={y} x1="10" y1={y} x2="42" y2={y} stroke="var(--hairline-2)" strokeWidth="1" />
        ))}
        <path d="M48,20 l6,6 l-6,6" stroke="var(--ai-signal)" {...common} />
      </svg>
    );
  }
  // fusion — three inputs into one
  return (
    <svg viewBox="0 0 64 64" width="56" height="56">
      {[16, 32, 48].map((y) => (
        <line key={y} x1="8" y1={y} x2="34" y2="32" stroke="var(--hairline-2)" strokeWidth="1" />
      ))}
      <line x1="34" y1="32" x2="56" y2="32" stroke="var(--gen)" strokeWidth="1.5" />
      <circle cx="34" cy="32" r="3" fill="var(--gen)" />
    </svg>
  );
}
