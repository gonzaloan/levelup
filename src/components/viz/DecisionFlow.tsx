"use client";
// DecisionFlow — a generic, PARAMETERIZED "walk the decision" widget for concepts
// that are really a small decision tree ("when do I introduce a queue?", "which
// consistency model?", "workflow vs agent?"). The author supplies the questions
// and where each yes/no leads, ending in a verdict. One widget, many concepts,
// zero keyword-fitting — it teaches exactly the tree the author wrote.
// Reads concept.visual.params:
//   { start: nodeId,
//     nodes: { [id]: { q:{en,es}, yes: nodeId|null, no: nodeId|null,
//                      verdict?:{en,es} } } }
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import type { WidgetProps } from "@/lib/viz";
import type { I18nText } from "@/i18n/config";

interface Node { q?: I18nText; yes?: string; no?: string; verdict?: I18nText; }
interface Params { start: string; nodes: Record<string, Node>; }

const FALLBACK: Params = {
  start: "a",
  nodes: {
    a: { q: { en: "Does the caller need the result right now?", es: "¿El llamador necesita el resultado ahora?" }, yes: "sync", no: "b" },
    b: { q: { en: "Is the work slow or spiky?", es: "¿El trabajo es lento o irregular?" }, yes: "queue", no: "sync" },
    sync: { verdict: { en: "Call it synchronously — a queue would add latency and ops for nothing.", es: "Llámalo de forma síncrona — una cola solo agregaría latencia y operación sin beneficio." } },
    queue: { verdict: { en: "Introduce a queue — decouple the slow work and return fast.", es: "Introduce una cola — desacopla el trabajo lento y responde rápido." } },
  },
};

export function DecisionFlow({ locale, params }: WidgetProps) {
  const es = locale === "es";
  const p = (params && (params as unknown as Params).nodes ? (params as unknown as Params) : FALLBACK);
  const [id, setId] = useState(p.start);
  const [path, setPath] = useState<string[]>([p.start]);
  const node = p.nodes[id] ?? {};
  const T = (x?: I18nText) => (x ? (es ? x.es : x.en) : "");

  function go(next?: string) {
    if (!next || !p.nodes[next]) return;
    setId(next);
    setPath((prev) => [...prev, next]);
  }
  function reset() { setId(p.start); setPath([p.start]); }

  const isVerdict = !!node.verdict;

  return (
    <VizFrame
      ariaLabel={es ? "Árbol de decisión" : "Decision tree"}
      caption={es
        ? "Sigue las preguntas hasta el veredicto; reinicia para explorar otra rama."
        : "Follow the questions to a verdict; reset to explore another branch."}
      controls={
        <button className="btn btn-sm" onClick={reset} disabled={path.length <= 1}>
          {es ? "Reiniciar" : "Reset"}
        </button>
      }
    >
      <div className="dflow">
        {isVerdict ? (
          <div className="dflow-verdict">
            <span className="dflow-verdict-mark" aria-hidden="true">✓</span>
            <p>{T(node.verdict)}</p>
          </div>
        ) : (
          <div className="dflow-q">
            <p className="dflow-question">{T(node.q)}</p>
            <div className="dflow-choices">
              <button className="btn btn-sm dflow-yes" onClick={() => go(node.yes)}>{es ? "Sí" : "Yes"}</button>
              <button className="btn btn-sm dflow-no" onClick={() => go(node.no)}>{es ? "No" : "No"}</button>
            </div>
          </div>
        )}
        <ol className="dflow-trail" aria-label={es ? "camino recorrido" : "path taken"}>
          {path.map((step, i) => (
            <li key={i} data-current={step === id ? "true" : "false"}>
              {p.nodes[step]?.verdict ? "◆" : (i + 1)}
            </li>
          ))}
        </ol>
      </div>
    </VizFrame>
  );
}

export default DecisionFlow;
