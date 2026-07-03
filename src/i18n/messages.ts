// UI chrome message catalog. Learner-facing curriculum lives in content-as-data,
// NOT here. All ES is authored, not machine-translated.
import type { Locale } from "./config";

export const MESSAGES = {
  "nav.assess":      { en: "Diagnostic",   es: "Diagnóstico" },
  "nav.map":         { en: "Star Chart",   es: "Carta Estelar" },
  "nav.tracks":      { en: "Tracks",       es: "Rutas" },
  "nav.me":          { en: "Progress",     es: "Progreso" },
  "nav.start":       { en: "Get placed",   es: "Diagnostícate" },

  "landing.eyebrow": { en: "The second half of an engineering career",
                       es: "La segunda mitad de una carrera de ingeniería" },
  "landing.cta":     { en: "Take the diagnostic", es: "Hacer el diagnóstico" },
  "landing.cta.sub": { en: "20 minutes · no login · honest result",
                       es: "20 minutos · sin cuenta · resultado honesto" },

  "assess.start":    { en: "Begin", es: "Comenzar" },
  "assess.next":     { en: "Next", es: "Siguiente" },
  "assess.confidence.prompt": { en: "How sure are you?", es: "¿Qué tan seguro estás?" },
  "assess.confidence.low":  { en: "Guessing", es: "Adivinando" },
  "assess.confidence.mid":  { en: "Fairly sure", es: "Bastante seguro" },
  "assess.confidence.high": { en: "Certain", es: "Seguro" },
  "assess.of":       { en: "of", es: "de" },

  "results.title":       { en: "Where you stand", es: "Dónde estás" },
  "results.axes":        { en: "Your five axes", es: "Tus cinco ejes" },
  "results.gap":         { en: "The gap worth naming", es: "La brecha que vale nombrar" },
  "results.roadmap":     { en: "Your highest-leverage next moves", es: "Tus próximos pasos de mayor impacto" },
  "results.provisional": { en: "Provisional placement — see how it's scored",
                           es: "Diagnóstico provisional — cómo se calcula" },
  "results.band.developing": { en: "Developing", es: "En desarrollo" },
  "results.band.solid":      { en: "Solid", es: "Sólido" },
  "results.band.strong":     { en: "Strong", es: "Fuerte" },

  "band.range":   { en: "territory", es: "territorio" },

  "cta.enterRoom":   { en: "Enter the Room", es: "Entrar a la Sala" },
  "cta.fieldWork":   { en: "Open the Field Work", es: "Abrir el Trabajo de Campo" },
  "cta.continue":    { en: "Continue", es: "Continuar" },

  "signal.label":    { en: "Signal", es: "Señal" },
  "cadence.label":   { en: "Cadence", es: "Cadencia" },
  "cadence.optin":   { en: "Cadence is off. Turn it on only if a weekly rhythm helps you.",
                       es: "Cadencia está apagada. Actívala solo si un ritmo semanal te ayuda." },

  "footer.built":    { en: "Built by someone who has been in the room.",
                       es: "Hecho por alguien que ha estado en la sala." },
  "footer.method":   { en: "How placement works", es: "Cómo funciona el diagnóstico" },
} as const;

export type MessageKey = keyof typeof MESSAGES;

export function m(key: MessageKey, locale: Locale): string {
  const entry = MESSAGES[key];
  return entry ? entry[locale] : key;
}
