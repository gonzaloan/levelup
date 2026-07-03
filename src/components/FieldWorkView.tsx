"use client";
// Field Work — proof-of-work. The learner writes/answers against a staff-derived
// rubric. Success is non-fakeable: for the 30% Gauntlet they must name the flaws;
// self-scoring against the rubric reveals what a staff reviewer looks for.
import { useState } from "react";
import { update, awardSignal } from "@/lib/store";
import { t, type Locale } from "@/i18n/config";
import type { FieldWork } from "@/lib/types";

export function FieldWorkView({ locale, fieldWork }: { locale: Locale; fieldWork: FieldWork }) {
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const totalWeight = fieldWork.rubric.reduce((s, c) => s + c.weight, 0);
  const gotWeight = fieldWork.rubric.filter((c) => checked.has(c.id)).reduce((s, c) => s + c.weight, 0);
  const ratio = totalWeight ? gotWeight / totalWeight : 0;

  function toggle(id: string) {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function submit() {
    setSubmitted(true);
    update((p) => ({ ...p, fieldWork: { ...p.fieldWork, [fieldWork.id]: { submittedAt: Date.now(), selfScore: ratio } } }));
    awardSignal(Math.round(ratio * 40));
  }

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <div>
        <p className="eyebrow">{t({ en: "Field Work", es: "Trabajo de Campo" }, locale)} · {fieldWork.kind}</p>
        <h2 className="display" style={{ fontSize: "var(--t-h2)" }}>{t(fieldWork.title, locale)}</h2>
        <p className="prose">{t(fieldWork.prompt, locale)}</p>
      </div>

      {fieldWork.starter && (
        <pre style={{ background: "var(--bg)", border: "1px solid var(--hairline-2)", borderRadius: "var(--r-sm)", padding: "var(--s-4)", overflowX: "auto", fontFamily: "var(--font-mono)", fontSize: "var(--t-sm)", lineHeight: 1.7 }}>
          <code>{t(fieldWork.starter, locale)}</code>
        </pre>
      )}

      <div>
        <label className="eyebrow" htmlFor="fw" style={{ display: "block", marginBottom: "var(--s-2)" }}>
          {t({ en: "Your answer", es: "Tu respuesta" }, locale)}
        </label>
        <textarea id="fw" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={8}
          placeholder={fieldWork.kind === "harden-code"
            ? t({ en: "Name each flaw and how you'd fix it…", es: "Nombra cada defecto y cómo lo arreglarías…" }, locale)
            : t({ en: "Write your design doc…", es: "Escribe tu design doc…" }, locale)}
          style={{ width: "100%", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--hairline-2)", borderRadius: "var(--r-sm)", padding: "var(--s-4)", fontFamily: "var(--font-body)", resize: "vertical" }} />
      </div>

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: "var(--s-4)" }}>
          {submitted
            ? t({ en: "What a staff reviewer checks — how did you do?", es: "Lo que revisa un ingeniero staff — ¿cómo te fue?" }, locale)
            : t({ en: "Score yourself honestly against the rubric", es: "Califícate honestamente contra la rúbrica" }, locale)}
        </p>
        <div className="stack" style={{ gap: "var(--s-3)" }}>
          {fieldWork.rubric.map((c) => (
            <label key={c.id} style={{ display: "flex", gap: "var(--s-3)", alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" checked={checked.has(c.id)} onChange={() => toggle(c.id)}
                style={{ marginTop: 4, accentColor: "var(--gen)" }} />
              <span style={{ fontSize: "var(--t-sm)" }}>
                {t(c.criterion, locale)}
                <span className="mono dim" style={{ marginLeft: 6 }}>·{c.weight}</span>
              </span>
            </label>
          ))}
        </div>
        {!submitted ? (
          <button className="btn btn-primary" style={{ marginTop: "var(--s-4)" }} onClick={submit}>
            {t({ en: "Submit Field Work", es: "Enviar Trabajo de Campo" }, locale)}
          </button>
        ) : (
          <div style={{ marginTop: "var(--s-4)", display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
            <span className="mono" style={{ fontSize: "var(--t-mono-lg)", color: "var(--gen-accent)" }}>{Math.round(ratio * 100)}%</span>
            <span className="dim" style={{ fontSize: "var(--t-sm)" }}>
              {ratio >= 0.8
                ? t({ en: "That's the 30% most people ship past. Well found.", es: "Ese es el 30% que la mayoría deja pasar. Bien encontrado." }, locale)
                : t({ en: "Go back and look again — the misses are where the level is.", es: "Vuelve y mira de nuevo — los que faltan son donde está el nivel." }, locale)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
