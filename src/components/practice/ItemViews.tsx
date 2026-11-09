"use client";
import { useMemo, useState } from "react";
import type { PItem, Response } from "@/lib/practice/types";
import { derange, shuffle } from "@/lib/practice/rng";
import { parseNumber } from "@/lib/practice/grade";
import { inlineMd } from "@/lib/practice/md";

export interface ViewProps {
  item: PItem;
  seed: string;
  done: boolean;
  response: Response | null;
  setResponse: (r: Response | null) => void;
  label: (k: string) => string;
}

const Md = ({ src, className }: { src: string; className?: string }) => (
  <div className={className} dangerouslySetInnerHTML={{ __html: inlineMd(src) }} />
);
const LETTERS = "ABCDEFG";

/* ------------------------------------------------------------------ single choice (text or code) */
export function ChoiceView({ item, seed, done, response, setResponse }: ViewProps) {
  const order = useMemo(() => shuffle((item.options ?? []).map((_, i) => i), seed), [item, seed]);
  const chosen = response && (response.type === "mcq" || response.type === "code") ? response.choice : -1;
  const isCode = item.type === "code";
  return (
    <div className="p-options" role="radiogroup">
      {isCode && item.code && (
        <pre className="p-code"><code>{item.code.split("____").map((part, i, all) => (
          <span key={i}>{part}{i < all.length - 1 && <span className={`p-gap${chosen >= 0 ? " filled" : ""}`}>{chosen >= 0 ? item.options![chosen].text : "▢▢▢▢▢▢"}</span>}</span>
        ))}</code></pre>
      )}
      {order.map((oi, k) => {
        const o = item.options![oi];
        const cls = done ? (oi === item.answer ? " ok" : oi === chosen ? " bad" : " dim") : chosen === oi ? " sel" : "";
        return (
          <button key={oi} type="button" role="radio" aria-checked={chosen === oi} disabled={done}
            className={`p-opt${cls}${isCode ? " code" : ""}`} onClick={() => setResponse({ type: item.type as "mcq" | "code", choice: oi })}>
            <span className="p-key">{LETTERS[k]}</span>
            <span className="p-opt-body">
              {isCode ? <code>{o.text}</code> : <Md src={o.text} />}
              {done && o.why && oi !== item.answer && <Md src={o.why} className="p-why" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ select all that apply */
export function MultiView({ item, seed, done, response, setResponse, label }: ViewProps) {
  const order = useMemo(() => shuffle((item.options ?? []).map((_, i) => i), seed), [item, seed]);
  const chosen = new Set(response?.type === "multi" ? response.choices : []);
  const want = new Set(item.answers ?? []);
  const toggle = (i: number) => {
    const next = new Set(chosen);
    if (next.has(i)) next.delete(i); else next.add(i);
    setResponse(next.size ? { type: "multi", choices: [...next] } : null);
  };
  return (
    <div className="p-options">
      <p className="p-hint">{label("pSelectAll")}</p>
      {order.map((oi, k) => {
        const o = item.options![oi];
        const on = chosen.has(oi);
        const cls = done ? (want.has(oi) ? (on ? " ok" : " missed") : on ? " bad" : " dim") : on ? " sel" : "";
        return (
          <button key={oi} type="button" role="checkbox" aria-checked={on} disabled={done} className={`p-opt multi${cls}`} onClick={() => toggle(oi)}>
            <span className="p-key">{on ? "✓" : LETTERS[k]}</span>
            <span className="p-opt-body"><Md src={o.text} />{done && o.why && <Md src={o.why} className="p-why" />}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ put in order (tap to place) */
export function OrderView({ item, seed, done, response, setResponse, label }: ViewProps) {
  const steps = item.steps ?? [];
  const display = useMemo(() => derange(steps.length, seed), [steps.length, seed]);
  const seq = response?.type === "order" ? response.order : [];
  const [partial, setPartial] = useState<number[]>([]);
  const placed = seq.length ? seq : partial;
  const place = (i: number) => {
    if (done || placed.includes(i)) return;
    const next = [...placed, i];
    setPartial(next);
    setResponse(next.length === steps.length ? { type: "order", order: next } : null);
  };
  const unplace = (i: number) => {
    if (done) return;
    const next = placed.filter((x) => x !== i);
    setPartial(next);
    setResponse(null);
  };
  return (
    <div className="p-order">
      <p className="p-hint">{label("pTapOrder")}</p>
      <ol className="p-seq">
        {steps.map((_, pos) => {
          const i = placed[pos];
          const ok = done && i === pos;
          return (
            <li key={pos} className={`p-slot${i != null ? " filled" : ""}${done ? (ok ? " ok" : " bad") : ""}`}>
              <span className="p-n">{pos + 1}</span>
              {i != null
                ? <button type="button" disabled={done} onClick={() => unplace(i)} className="p-slot-btn"><Md src={steps[i]} /></button>
                : <span className="p-slot-empty">…</span>}
              {done && !ok && <Md src={steps[pos]} className="p-why" />}
            </li>
          );
        })}
      </ol>
      {!done && (
        <div className="p-bank">
          {display.map((i) => (
            <button key={i} type="button" className={`p-chip${placed.includes(i) ? " used" : ""}`} disabled={placed.includes(i)} onClick={() => place(i)}>
              <Md src={steps[i]} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ match pairs */
export function MatchView({ item, seed, done, response, setResponse, label }: ViewProps) {
  const pairs = item.pairs ?? [];
  const rightOrder = useMemo(() => derange(pairs.length, seed), [pairs.length, seed]);
  const map = response?.type === "match" ? response.map : null;
  const [draft, setDraft] = useState<number[]>(() => pairs.map(() => -1));
  const current = map ?? draft;
  const set = (row: number, v: number) => {
    const next = [...current];
    next[row] = v;
    setDraft(next);
    setResponse(next.every((x) => x >= 0) ? { type: "match", map: next } : null);
  };
  return (
    <div className="p-match">
      <p className="p-hint">{label("pMatchHint")}</p>
      {pairs.map((p, row) => {
        const ok = done && current[row] === row;
        return (
          <div key={row} className={`p-match-row${done ? (ok ? " ok" : " bad") : ""}`}>
            <Md src={p.left} className="p-match-left" />
            <select disabled={done} value={current[row]} onChange={(e) => set(row, Number(e.target.value))} aria-label={p.left}>
              <option value={-1}>—</option>
              {rightOrder.map((ri) => <option key={ri} value={ri}>{pairs[ri].right.replace(/\*\*|`/g, "")}</option>)}
            </select>
            {done && !ok && <Md src={p.right} className="p-why" />}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ numeric estimate */
export function NumericView({ item, done, response, setResponse, label }: ViewProps) {
  const [text, setText] = useState("");
  const value = response?.type === "numeric" ? response.value : NaN;
  return (
    <div className="p-numeric">
      <label>
        <span className="sr">{label("pYourAnswer")}</span>
        <input inputMode="decimal" autoComplete="off" value={text} disabled={done} placeholder="0"
          onChange={(e) => { setText(e.target.value); const v = parseNumber(e.target.value); setResponse(Number.isFinite(v) ? { type: "numeric", value: v } : null); }} />
        {item.unit && <span className="p-unit">{item.unit}</span>}
      </label>
      {done && (
        <p className="p-expected">
          {label("pExpected")}: <strong>{Number(item.answer).toLocaleString()}</strong>{item.unit ? ` ${item.unit}` : ""} (±{Math.round((item.tolerance ?? 0.1) * 100)}%)
          {Number.isFinite(value) && <> · {label("pYourAnswer")}: {value.toLocaleString()}</>}
        </p>
      )}
    </div>
  );
}
