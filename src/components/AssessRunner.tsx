"use client";
// The diagnostic. Client-side MST over the item bank, CBM confidence capture,
// absolute self-rating, then assemble + persist the result and route to /results.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AXES } from "@/lib/axes";
import { nextTier, selectNextItem, ITEMS_PER_AXIS, groupByAxis } from "@/lib/router";
import { assemble, type SjtPick } from "@/lib/assess";
import { update } from "@/lib/store";
import type { AxisId } from "@/lib/axes";
import type { Item, Response, Confidence, Sjt } from "@/lib/types";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { shuffleOptions } from "@/lib/shuffle";

type Phase = "intro" | "self" | "items" | "done";

const SELF_PROMPTS: Record<AxisId, { en: string; es: string }> = {
  1: { en: "I can predict a system's failure modes before it fails.", es: "Puedo predecir los modos de fallo de un sistema antes de que falle." },
  2: { en: "I regularly argue for the simpler design and can say when NOT to use a pattern.", es: "Defiendo con frecuencia el diseño más simple y sé cuándo NO usar un patrón." },
  3: { en: "I write SLOs from user journeys and run releases against an error budget.", es: "Escribo SLOs desde recorridos de usuario y ejecuto releases contra un presupuesto de error." },
  4: { en: "My design docs include real Alternatives-Considered and Non-Goals, and I get pulled into decisions.", es: "Mis design docs incluyen Alternativas-Consideradas y No-Objetivos reales, y me involucran en decisiones." },
  5: { en: "I sponsor other engineers — I spend my own capital to get them opportunities.", es: "Apadrino a otros ingenieros — gasto mi propio capital para conseguirles oportunidades." },
  6: { en: "I ship AI features on evals, not vibes, and I can name how an agent with tool access gets prompt-injected.", es: "Entrego features de IA con evals, no por intuición, y sé nombrar cómo se inyecta un prompt en un agente con acceso a herramientas." },
  7: { en: "I can name my system's failure domains and its cost per unit of work, and I've pre-provisioned recovery rather than relying on a control-plane call.", es: "Puedo nombrar los dominios de falla de mi sistema y su costo por unidad de trabajo, y tengo la recuperación pre-aprovisionada en vez de depender de una llamada al plano de control." },
};

export function AssessRunner({ locale, items }: { locale: Locale; items: Item[]; rooms?: Sjt[] }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [self, setSelf] = useState<Partial<Record<AxisId, number>>>({});

  // Item flow state
  const [axisIdx, setAxisIdx] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);

  const poolByAxis = useMemo(() => groupByAxis(items), [items]);
  const axis = AXES[axisIdx];
  const axisResponses = responses.filter((r) => r.axis === axis?.id);
  const seen = new Set(responses.map((r) => r.itemId));

  const currentItem: Item | null = useMemo(() => {
    if (!axis) return null;
    const pool = poolByAxis.get(axis.id) ?? [];
    const tier = nextTier(axisResponses);
    return selectNextItem(pool, seen, tier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axis, responses.length]);

  // Actual items asked = min(ITEMS_PER_AXIS, pool size) summed over axes, so the
  // progress bar can't exceed 100%.
  const totalTarget = AXES.reduce(
    (sum, a) => sum + Math.min(ITEMS_PER_AXIS, (poolByAxis.get(a.id) ?? []).length),
    0
  );
  const answered = responses.length;

  function submitAnswer() {
    if (!currentItem || !picked || !confidence) return;
    const opt = currentItem.options.find((o) => o.id === picked)!;
    const resp: Response = {
      itemId: currentItem.id, optionId: picked, correct: opt.correct,
      confidence, axis: currentItem.axis, difficulty: currentItem.difficulty, ts: Date.now(),
    };
    const nextResponses = [...responses, resp];
    setResponses(nextResponses);
    setPicked(null); setConfidence(null);

    // advance axis if this axis is exhausted (by count or empty pool)
    const thisAxisCount = nextResponses.filter((r) => r.axis === axis.id).length;
    const pool = poolByAxis.get(axis.id) ?? [];
    const axisDone = thisAxisCount >= Math.min(ITEMS_PER_AXIS, pool.length);
    if (axisDone) {
      if (axisIdx + 1 < AXES.length) setAxisIdx(axisIdx + 1);
      else finish(nextResponses);
    }
  }

  function finish(finalResponses: Response[]) {
    // No SJT picks in the fast diagnostic (Rooms are played inside modules);
    // pass empty so axes fall back to knowledge+CBM weighting.
    const sjtPicks: SjtPick[] = [];
    const result = assemble(finalResponses, sjtPicks, self, items);
    result.completedAt = Date.now();
    update((p) => ({ ...p, assessment: result, responseLog: [...p.responseLog, ...finalResponses] }));
    setPhase("done");
    router.push(`/${locale}/assess/results`);
  }

  // ── render ──
  if (phase === "intro") {
    return (
      <div className="stack">
        <p className="eyebrow">{m("nav.assess", locale)}</p>
        <h1 className="display" style={{ fontSize: "var(--t-h1)" }}>
          {t({ en: "Twenty minutes. No login. An honest result.", es: "Veinte minutos. Sin cuenta. Un resultado honesto." }, locale)}
        </h1>
        <p className="prose">
          {t({ en: `You'll answer a set of judgment questions across ${AXES.length} axes, including Real World AI Engineering. Each one asks how sure you are, because being confidently wrong is the most useful thing we can find. We place you in a band per axis, name the gap worth closing, and never flatter you.`, es: `Responderás preguntas de juicio en ${AXES.length} ejes, incluyendo IA en el Mundo Real. Cada una pregunta qué tan seguro estás, porque estar seguro y equivocado es lo más útil que podemos encontrar. Te ubicamos en una banda por eje, nombramos la brecha que vale cerrar, y nunca te adulamos.` }, locale)}
        </p>
        <div>
          <button className="btn btn-primary" onClick={() => setPhase("self")}>{m("assess.start", locale)}</button>
        </div>
      </div>
    );
  }

  if (phase === "self") {
    const allRated = AXES.every((a) => self[a.id] !== undefined);
    return (
      <div className="stack">
        <p className="eyebrow">{t({ en: "First, your own read", es: "Primero, tu propia lectura" }, locale)}</p>
        <h2 className="display" style={{ fontSize: "var(--t-h2)" }}>
          {t({ en: "How true is each of these, right now?", es: "¿Qué tan cierto es cada uno, ahora mismo?" }, locale)}
        </h2>
        <p className="dim text-sm">
          {t({ en: "Absolute, not relative to peers. We compare this to your answers later — the gap is the insight.", es: "Absoluto, no relativo a colegas. Comparamos esto con tus respuestas después — la brecha es el hallazgo." }, locale)}
        </p>
        {AXES.map((a) => (
          <div key={a.id} className="card" style={{ padding: "var(--s-4)" }}>
            <div style={{ fontSize: "var(--t-sm)", marginBottom: "var(--s-3)" }}>{t(SELF_PROMPTS[a.id], locale)}</div>
            <div style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
              {[
                { v: 0.15, en: "Rarely", es: "Rara vez" },
                { v: 0.45, en: "Sometimes", es: "A veces" },
                { v: 0.72, en: "Usually", es: "Normalmente" },
                { v: 0.92, en: "Consistently", es: "Consistentemente" },
              ].map((opt) => (
                <button key={opt.v}
                  className="btn"
                  aria-pressed={self[a.id] === opt.v}
                  onClick={() => setSelf((s) => ({ ...s, [a.id]: opt.v }))}
                  style={self[a.id] === opt.v ? { borderColor: "var(--gen)", background: "var(--surface-3)" } : {}}>
                  {locale === "es" ? opt.es : opt.en}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div>
          <button className="btn btn-primary" disabled={!allRated} onClick={() => setPhase("items")}
            style={!allRated ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
            {m("assess.next", locale)}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "items" && currentItem) {
    const pct = Math.round((answered / totalTarget) * 100);
    // Stable per item id: re-rendering (picking a confidence level, for example)
    // must never reshuffle the options under the learner's cursor.
    const displayOptions = shuffleOptions(currentItem.options, `assess:${currentItem.id}`);
    return (
      <div className="stack">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="eyebrow">{t(axis.name, locale)}</span>
          <span className="mono tnum dim text-sm">{answered} {m("assess.of", locale)} ~{totalTarget}</span>
        </div>
        <div className="meter" style={{ ["--meter-val" as string]: String(pct) }} />

        <div className="card">
          <p style={{ fontSize: "1.0625rem", color: "var(--text)", marginBottom: "var(--s-5)" }}>{t(currentItem.stem, locale)}</p>
          <div className="stack">
            {/* Deterministic shuffle (lib/shuffle.ts): the authored banks put the
                correct option first in most items, which would let a learner
                place high by always picking the first one — and the placement is
                the whole point of this screen. Selection is by option id, so
                nothing downstream depends on display order. */}
            {displayOptions.map(({ option: o }) => (
              <button key={o.id} className="btn" aria-pressed={picked === o.id}
                onClick={() => setPicked(o.id)}
                style={{ textAlign: "left", width: "100%", justifyContent: "flex-start", padding: "var(--s-3) var(--s-4)",
                  borderColor: picked === o.id ? "var(--gen)" : "var(--hairline)", background: picked === o.id ? "var(--surface-3)" : "var(--surface-2)" }}>
                {t(o.text, locale)}
              </button>
            ))}
          </div>
        </div>

        {picked && (
          <div className="card" style={{ padding: "var(--s-4)" }}>
            <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>{m("assess.confidence.prompt", locale)}</div>
            <div style={{ display: "flex", gap: "var(--s-2)" }}>
              {([["low", "assess.confidence.low"], ["mid", "assess.confidence.mid"], ["high", "assess.confidence.high"]] as const).map(([c, key]) => (
                <button key={c} className="btn" aria-pressed={confidence === c}
                  onClick={() => setConfidence(c)}
                  style={confidence === c ? { borderColor: "var(--ai-signal)", background: "var(--surface-3)" } : {}}>
                  {m(key, locale)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <button className="btn btn-primary" disabled={!picked || !confidence} onClick={submitAnswer}
            style={!picked || !confidence ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
            {m("assess.next", locale)}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "items" && !currentItem) {
    // pool exhausted for this axis mid-flow — advance or finish
    if (axisIdx + 1 < AXES.length) { setAxisIdx(axisIdx + 1); return null; }
    finish(responses);
  }

  return <p className="dim">{t({ en: "Scoring…", es: "Calculando…" }, locale)}</p>;
}
