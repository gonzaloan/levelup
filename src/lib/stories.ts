// Competencies a behavioral round probes, with typical questions. The Amazon Leadership Principles
// are the official 16 (names in English as Amazon publishes them; checked 2026-11-22 at
// atoz.amazon/en-us/discover/leadership-principles). The Staff themes are a generic set common
// to senior/staff loops, not any company's official rubric. Questions are illustrative.
import type { I18n } from "./types";

export interface Competency { id: string; group: "staff" | "amazon"; name: I18n; questions: I18n[] }

const q = (en: string, es: string): I18n => ({ en, es });

export const STAFF: Competency[] = [
  { id: "influence", group: "staff", name: q("Influence without authority", "Influir sin autoridad"), questions: [q("Tell me about a time you convinced another team to change direction.", "Cuéntame de una vez en que convenciste a otro equipo de cambiar de rumbo."), q("How did you get buy-in for a technical strategy you did not own?", "¿Cómo conseguiste apoyo para una estrategia técnica que no era tuya?")] },
  { id: "conflict", group: "staff", name: q("Conflict and disagreement", "Conflicto y desacuerdo"), questions: [q("Tell me about a strong technical disagreement and how it ended.", "Cuéntame de un desacuerdo técnico fuerte y cómo terminó."), q("When did you disagree with your manager, and what did you do?", "¿Cuándo no estuviste de acuerdo con tu jefe y qué hiciste?")] },
  { id: "failure", group: "staff", name: q("Failure and learning", "Fracaso y aprendizaje"), questions: [q("Tell me about a project that failed. What would you do differently?", "Cuéntame de un proyecto que falló. ¿Qué harías distinto?"), q("Describe an outage you caused or owned.", "Describe una caída que causaste o de la que fuiste responsable.")] },
  { id: "ambiguity", group: "staff", name: q("Ambiguity", "Ambigüedad"), questions: [q("Tell me about a problem with no clear owner or requirements.", "Cuéntame de un problema sin dueño ni requisitos claros."), q("How did you decide what to build when the goal was vague?", "¿Cómo decidiste qué construir cuando el objetivo era vago?")] },
  { id: "scope", group: "staff", name: q("Leading a cross-team project", "Liderar un proyecto entre equipos"), questions: [q("Tell me about the largest project you led end to end.", "Cuéntame del proyecto más grande que lideraste de punta a punta."), q("How did you keep several teams moving toward one deadline?", "¿Cómo mantuviste a varios equipos avanzando hacia una misma fecha?")] },
  { id: "decision", group: "staff", name: q("A hard technical decision", "Una decisión técnica difícil"), questions: [q("Tell me about a trade-off you made that others questioned.", "Cuéntame de un trade-off que tomaste y que otros cuestionaron."), q("When did you choose the simpler option, and why?", "¿Cuándo elegiste la opción más simple y por qué?")] },
  { id: "mentoring", group: "staff", name: q("Growing others", "Hacer crecer a otros"), questions: [q("Tell me about someone you helped grow. What changed for them?", "Cuéntame de alguien a quien ayudaste a crecer. ¿Qué cambió para esa persona?"), q("How do you raise the bar of a whole team?", "¿Cómo subes el nivel de todo un equipo?")] },
  { id: "pressure", group: "staff", name: q("Delivering under pressure", "Entregar bajo presión"), questions: [q("Tell me about a deadline you nearly missed.", "Cuéntame de una fecha que casi no cumpliste."), q("What did you cut to ship, and how did you decide?", "¿Qué recortaste para lanzar y cómo lo decidiste?")] },
];

const lp = (id: string, en: string, es: string, ...qs: I18n[]): Competency => ({ id, group: "amazon", name: { en, es: `${en} (${es})` }, questions: qs });

export const AMAZON_LPS: Competency[] = [
  lp("customer-obsession", "Customer Obsession", "obsesión por el cliente", q("Tell me about a time you went beyond what the customer asked.", "Cuéntame de una vez en que fuiste más allá de lo que pidió el cliente.")),
  lp("ownership", "Ownership", "ser dueño", q("Tell me about something you fixed that was not your job.", "Cuéntame de algo que arreglaste aunque no era tu responsabilidad.")),
  lp("invent-simplify", "Invent and Simplify", "inventar y simplificar", q("Tell me about a complex process you simplified.", "Cuéntame de un proceso complejo que simplificaste.")),
  lp("right-a-lot", "Are Right, A Lot", "tener razón, muchas veces", q("Tell me about a decision you made with incomplete data.", "Cuéntame de una decisión que tomaste con datos incompletos.")),
  lp("learn-curious", "Learn and Be Curious", "aprender y ser curioso", q("What did you learn recently that changed how you work?", "¿Qué aprendiste hace poco que cambió tu forma de trabajar?")),
  lp("hire-develop", "Hire and Develop the Best", "contratar y desarrollar a los mejores", q("Tell me about a hiring decision you are proud of.", "Cuéntame de una decisión de contratación de la que estés orgulloso.")),
  lp("highest-standards", "Insist on the Highest Standards", "exigir los estándares más altos", q("When did you refuse to ship something that was not good enough?", "¿Cuándo te negaste a lanzar algo que no estaba a la altura?")),
  lp("think-big", "Think Big", "pensar en grande", q("Tell me about a bold idea you pushed for.", "Cuéntame de una idea ambiciosa que impulsaste.")),
  lp("bias-action", "Bias for Action", "inclinación a la acción", q("Tell me about a decision you made quickly, without all the facts.", "Cuéntame de una decisión que tomaste rápido, sin todos los datos.")),
  lp("frugality", "Frugality", "frugalidad", q("Tell me about doing more with fewer resources.", "Cuéntame de una vez en que lograste más con menos recursos.")),
  lp("earn-trust", "Earn Trust", "ganarse la confianza", q("Tell me about feedback you gave that was hard to hear.", "Cuéntame de un feedback difícil que diste.")),
  lp("dive-deep", "Dive Deep", "profundizar", q("Tell me about a problem you solved by digging into the details.", "Cuéntame de un problema que resolviste metiéndote en los detalles.")),
  lp("backbone", "Have Backbone; Disagree and Commit", "tener convicción; discrepar y comprometerse", q("Tell me about disagreeing with a decision and committing anyway.", "Cuéntame de una vez en que discrepaste de una decisión y te comprometiste igual.")),
  lp("deliver-results", "Deliver Results", "entregar resultados", q("Tell me about your most important result in the last year.", "Cuéntame de tu resultado más importante del último año.")),
  lp("best-employer", "Strive to be Earth's Best Employer", "ser el mejor empleador del planeta", q("Tell me about making your team's work environment better.", "Cuéntame de cómo mejoraste el ambiente de trabajo de tu equipo.")),
  lp("broad-responsibility", "Success and Scale Bring Broad Responsibility", "el éxito y la escala traen una responsabilidad amplia", q("Tell me about considering second-order effects of your work.", "Cuéntame de cuando consideraste los efectos de segundo orden de tu trabajo.")),
];

export const COMPETENCIES = [...STAFF, ...AMAZON_LPS];
export const LPS_SOURCE = { url: "https://atoz.amazon/en-us/discover/leadership-principles", checked: "2026-11-22" };
