import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { allConcepts, getLabs, getProblems } from "@/lib/content";
import { Icon } from "@/components/Icon";

// levelup Pro, stage 1 (docs/business/pro-analysis.md): the proposal and a waitlist, nothing to
// pay. The free site stays complete and static; Pro would be a separate app with a backend. The
// waitlist is an external form (NEXT_PUBLIC_PRO_FORM_URL at build time); without it the button
// says the list opens soon. No tracking here: the form's own count is the demand signal.
type P = { params: Promise<{ locale: Locale }> };
const FORM = process.env.NEXT_PUBLIC_PRO_FORM_URL ?? "";

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return locale === "es"
    ? pageMeta(locale, "/pro/", "levelup Pro", "Lo gratis sigue gratis. Pro agregaría un coach con IA que te evalúa como un entrevistador. Súmate a la lista de espera.")
    : pageMeta(locale, "/pro/", "levelup Pro", "Free stays free. Pro would add an AI coach that grades you like an interviewer. Join the waitlist.");
}

export default async function ProPage({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  const n = { concepts: allConcepts().length, problems: getProblems().length, labs: getLabs().length };
  const free = es
    ? [`${n.concepts} conceptos con diagrama, puntos clave y ejercicios`, `${n.problems} problemas de coding con tests, límite de tiempo y repaso espaciado`, `${n.labs} labs interactivos`, "Gimnasio diario, ruta de estudio, plan por fecha", "Rondas de system design, mocks con un amigo, banco de historias STAR", "Sincronización con tu cuenta y modo offline"]
    : [`${n.concepts} concepts with diagram, key points and exercises`, `${n.problems} coding problems with tests, time limits and spaced re-solving`, `${n.labs} interactive labs`, "Daily Gym, study path, plan by date", "System design rounds, mocks with a friend, STAR story bank", "Sync with your account and offline mode"];
  const pro = es
    ? [["Coach con IA", "Explicas un concepto o cuentas una historia STAR en voz alta o por escrito, y te devuelve feedback como un entrevistador: qué faltó, qué sobró y qué repasar."],
       ["Ronda de diseño evaluada", "Haces la ronda de 45 minutos y la IA evalúa tu diseño con la misma rúbrica, fase por fase."],
       ["Revisión de tu código", "Además de los tests: claridad, casos borde y la complejidad que dirías en voz alta."],
       ["Packs por empresa", "Preguntas y casos frecuentes por empresa y rol (cuando estén verificados)."]]
    : [["AI coach", "Explain a concept or tell a STAR story, out loud or in writing, and get feedback like an interviewer's: what was missing, what was extra, what to review."],
       ["Graded design round", "Do the 45-minute round and the AI grades your design with the same rubric, phase by phase."],
       ["Code review", "Beyond the tests: clarity, edge cases and the complexity you'd say out loud."],
       ["Company packs", "Frequent questions and cases by company and role (once verified)."]];
  const faq = es
    ? [["¿Lo gratis sigue gratis?", "Sí. Todo lo que hay hoy sigue gratis y sin anuncios. Pro solo agrega lo que necesita un servidor, como la IA."],
       ["¿Cuánto costaría?", "La idea es un precio de fundador de ~US$10 al mes. Es un supuesto: el formulario pregunta cuánto pagarías tú."],
       ["¿Qué datos dejo?", "Solo lo que pongas en el formulario (correo y unas respuestas). levelup no te rastrea; no hay pago ni compromiso."]]
    : [["Does free stay free?", "Yes. Everything here today stays free and ad-free. Pro only adds what needs a server, like the AI."],
       ["What would it cost?", "The idea is a founder price of ~US$10 a month. That's an assumption: the form asks what you'd pay."],
       ["What data do I leave?", "Only what you type in the form (email and a few answers). levelup doesn't track you; no payment, no commitment."]];
  const href = FORM ? `${FORM}${FORM.includes("?") ? "&" : "?"}lang=${locale}&src=pro-page` : "";
  return (
    <main className="page pro-page">
      <header className="page-head plain">
        <div>
          <p className="eyebrow">{es ? "En desarrollo · lista de espera" : "In development · waitlist"}</p>
          <h1>levelup Pro</h1>
          <p className="page-sub">{es
            ? "Practicar solo te lleva lejos, pero en la entrevista alguien te evalúa. Pro sería ese alguien: un coach con IA que escucha tu respuesta y te dice qué le faltó."
            : "Practicing alone gets you far, but in the interview someone grades you. Pro would be that someone: an AI coach that hears your answer and tells you what it missed."}</p>
        </div>
      </header>
      <div className="pro-grid">
        <section className="pro-card">
          <h2>{es ? "Gratis, siempre" : "Free, always"}</h2>
          <ul>{free.map((x) => <li key={x}><Icon name="check" size={16} /> {x}</li>)}</ul>
        </section>
        <section className="pro-card pro-plus">
          <h2>Pro <small>{es ? "(lo que estamos evaluando)" : "(what we're evaluating)"}</small></h2>
          <ul>{pro.map(([h, d]) => <li key={h}><Icon name="star" size={16} /> <span><strong>{h}</strong> {d}</span></li>)}</ul>
        </section>
      </div>
      <div className="pro-cta">
        {href
          ? <a className="btn btn-primary" href={href} target="_blank" rel="noopener">{es ? "Quiero Pro: avísame" : "I want Pro: tell me"} <Icon name="external" size={16} /></a>
          : <span className="btn" aria-disabled="true">{es ? "La lista de espera abre pronto" : "The waitlist opens soon"}</span>}
        <span>{es ? "2 minutos · sin pago · sin compromiso" : "2 minutes · no payment · no commitment"}</span>
      </div>
      <section className="pro-faq">
        {faq.map(([q, a]) => <details key={q} className="fold-mini"><summary>{q}</summary><p>{a}</p></details>)}
      </section>
      <p className="lab-note"><Link href={`/${locale}/`}>{es ? "Volver a estudiar gratis" : "Back to studying for free"} →</Link></p>
    </main>
  );
}
