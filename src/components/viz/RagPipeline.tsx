"use client";
// RagPipeline — step through a retrieval-augmented generation flow one stage at
// a time (query → embed → retrieve → rerank → augment → generate → ground-check)
// so the learner sees WHERE quality is won or lost, not just a box diagram.
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import { useReducedMotion, type WidgetProps } from "@/lib/viz";

const STAGES: { en: string; es: string; note: { en: string; es: string } }[] = [
  { en: "Query", es: "Consulta", note: { en: "the user's question", es: "la pregunta del usuario" } },
  { en: "Embed", es: "Embeder", note: { en: "→ vector", es: "→ vector" } },
  { en: "Retrieve", es: "Recuperar", note: { en: "top-k from the index", es: "top-k del índice" } },
  { en: "Rerank", es: "Reordenar", note: { en: "precision over recall", es: "precisión sobre recall" } },
  { en: "Augment", es: "Aumentar", note: { en: "stuff context window", es: "llenar la ventana" } },
  { en: "Generate", es: "Generar", note: { en: "grounded answer", es: "respuesta fundamentada" } },
  { en: "Check", es: "Verificar", note: { en: "cite or refuse", es: "citar o rehusar" } },
];

export function RagPipeline({ locale }: WidgetProps) {
  const es = locale === "es";
  const reduced = useReducedMotion();
  const [i, setI] = useState(reduced ? STAGES.length - 1 : 0);
  return (
    <VizFrame
      title={es ? "Pipeline RAG" : "RAG pipeline"}
      ariaLabel={es ? "Pipeline de RAG paso a paso" : "Step-through RAG pipeline"}
      caption={es
        ? "La calidad se gana en recuperar y reordenar; la confianza, en verificar."
        : "Quality is won at retrieve + rerank; trust is won at the ground-check."}
      controls={
        <div className="viz-steprow">
          <button className="btn btn-sm" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>←</button>
          <span className="mono">{i + 1}/{STAGES.length}</span>
          <button className="btn btn-sm" onClick={() => setI((x) => Math.min(STAGES.length - 1, x + 1))} disabled={i === STAGES.length - 1}>→</button>
        </div>
      }
    >
      <ol className="viz-pipe">
        {STAGES.map((s, k) => (
          <li key={k} className="viz-pipe-node" data-state={k < i ? "done" : k === i ? "active" : "todo"}>
            <span className="viz-pipe-label">{es ? s.es : s.en}</span>
            {k === i && <span className="viz-pipe-note dim">{es ? s.note.es : s.note.en}</span>}
          </li>
        ))}
      </ol>
    </VizFrame>
  );
}

export default RagPipeline;
