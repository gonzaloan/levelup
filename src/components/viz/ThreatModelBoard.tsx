"use client";
// ThreatModelBoard — STRIDE as a checklist you work, not memorize. Toggle each
// category to reveal the question it forces you to ask about your design. The
// judgment: threat modeling is asking the six questions, every design review.
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import type { WidgetProps } from "@/lib/viz";

const STRIDE: { key: string; name: { en: string; es: string }; q: { en: string; es: string } }[] = [
  { key: "S", name: { en: "Spoofing", es: "Suplantación" }, q: { en: "Can someone pretend to be another identity?", es: "¿Alguien puede hacerse pasar por otra identidad?" } },
  { key: "T", name: { en: "Tampering", es: "Manipulación" }, q: { en: "Can data be altered in transit or at rest?", es: "¿Se puede alterar el dato en tránsito o en reposo?" } },
  { key: "R", name: { en: "Repudiation", es: "Repudio" }, q: { en: "Can an actor deny they did it? Do you have logs?", es: "¿Puede negar que lo hizo? ¿Hay registros?" } },
  { key: "I", name: { en: "Info disclosure", es: "Fuga de información" }, q: { en: "Can secrets or PII leak to the wrong party?", es: "¿Pueden filtrarse secretos o PII a quien no debe?" } },
  { key: "D", name: { en: "Denial of service", es: "Denegación" }, q: { en: "Can it be exhausted or flooded?", es: "¿Se puede agotar o inundar?" } },
  { key: "E", name: { en: "Elevation", es: "Elevación" }, q: { en: "Can a user gain rights they shouldn't have?", es: "¿Puede un usuario ganar permisos que no debe?" } },
];

export function ThreatModelBoard({ locale }: WidgetProps) {
  const es = locale === "es";
  const [open, setOpen] = useState<string | null>(null);
  return (
    <VizFrame
      title={es ? "Modelado de amenazas — STRIDE" : "Threat modeling — STRIDE"}
      ariaLabel="STRIDE"
      caption={es ? "Modelar amenazas = hacer estas seis preguntas en cada revisión de diseño." : "Threat modeling = asking these six questions in every design review."}
    >
      <ul className="viz-stride">
        {STRIDE.map((s) => (
          <li key={s.key}>
            <button className="viz-stride-btn" aria-expanded={open === s.key} onClick={() => setOpen(open === s.key ? null : s.key)}>
              <span className="viz-stride-key mono">{s.key}</span>
              <span>{es ? s.name.es : s.name.en}</span>
            </button>
            {open === s.key && <p className="viz-stride-q dim">{es ? s.q.es : s.q.en}</p>}
          </li>
        ))}
      </ul>
    </VizFrame>
  );
}

export default ThreatModelBoard;
