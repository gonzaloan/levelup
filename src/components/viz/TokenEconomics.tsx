"use client";
// TokenEconomics — the unit economics of an LLM feature. Drag requests/day and
// context size, watch monthly cost move. Staff-level judgment: cost scales with
// TOKENS, and context you stuff every call is the silent budget killer.
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import { numParam, type WidgetProps } from "@/lib/viz";

export function TokenEconomics({ locale, params }: WidgetProps) {
  const es = locale === "es";
  const [rpd, setRpd] = useState(numParam(params, "rpd", 10000));
  const [ctx, setCtx] = useState(numParam(params, "ctx", 4000)); // input tokens/call
  const out = 500;                        // output tokens/call
  const inPrice = 3 / 1_000_000;          // $/token in (illustrative)
  const outPrice = 15 / 1_000_000;        // $/token out
  const perCall = ctx * inPrice + out * outPrice;
  const monthly = perCall * rpd * 30;
  const fmt = (n: number) => "$" + n.toLocaleString(locale, { maximumFractionDigits: 0 });
  return (
    <VizFrame
      title={es ? "Economía por token" : "Token economics"}
      ariaLabel={es ? "Costo mensual de una feature LLM" : "Monthly cost of an LLM feature"}
      caption={es
        ? "El costo escala con tokens. El contexto que metes en cada llamada es el asesino silencioso."
        : "Cost scales with tokens. The context you stuff into every call is the silent killer."}
      controls={
        <div className="viz-controls-col">
          <label className="viz-control"><span className="mono">{es ? "peticiones/día" : "requests/day"}: {rpd.toLocaleString(locale)}</span>
            <input type="range" min={100} max={1_000_000} step={100} value={rpd} onChange={(e) => setRpd(Number(e.target.value))} aria-label={es ? "peticiones por día" : "requests per day"} /></label>
          <label className="viz-control"><span className="mono">{es ? "contexto (tokens)" : "context (tokens)"}: {ctx.toLocaleString(locale)}</span>
            <input type="range" min={500} max={128_000} step={500} value={ctx} onChange={(e) => setCtx(Number(e.target.value))} aria-label={es ? "tokens de contexto" : "context tokens"} /></label>
        </div>
      }
    >
      <div className="viz-bignum">
        <span className="viz-bignum-val mono">{fmt(monthly)}</span>
        <span className="viz-bignum-label dim">{es ? "por mes (aprox.)" : "per month (approx.)"}</span>
      </div>
      <p className="dim text-sm">
        {es ? `${fmt(perCall * 1000)} por cada 1.000 llamadas · salida fija ${out} tokens` : `${fmt(perCall * 1000)} per 1,000 calls · output fixed at ${out} tokens`}
      </p>
    </VizFrame>
  );
}

export default TokenEconomics;
