"use client";
/**
 * Export / import progress as a file.
 *
 * There is no account here, so a learner's whole history is one localStorage key:
 * clearing site data or changing laptop loses it. Sync would fix that properly and
 * costs 8-11 days (docs/specs/2026-07-26-cognito-reuse-evaluation.md); this is the
 * half-day version that keeps the no-login promise and works today.
 *
 * Import OVERWRITES, and what it overwrites is the only copy — so it always shows
 * what is about to be replaced and asks first. Validation lives in lib/backup.ts.
 */
import { useRef, useState } from "react";
import { load } from "@/lib/store";
import {
  applyBackup,
  backupFilename,
  buildBackup,
  describeProgress,
  parseBackup,
  serializeBackup,
} from "@/lib/backup";
import type { Progress } from "@/lib/store";
import { t, type Locale } from "@/i18n/config";

const COPY = {
  title: { en: "Your progress is on this device", es: "Tu progreso está en este dispositivo" },
  body: {
    en: "There's no account: everything you've done lives in this browser. Save a file to keep a copy or move to another device.",
    es: "No hay cuenta: todo lo que hiciste vive en este navegador. Guarda un archivo para conservar una copia o pasarla a otro dispositivo.",
  },
  export: { en: "Save a copy", es: "Guardar una copia" },
  import: { en: "Restore from a file", es: "Restaurar desde un archivo" },
  confirmTitle: { en: "Replace your progress?", es: "¿Reemplazar tu progreso?" },
  current: { en: "On this device now", es: "Ahora en este dispositivo" },
  incoming: { en: "In the file", es: "En el archivo" },
  confirm: { en: "Replace", es: "Reemplazar" },
  cancel: { en: "Keep what I have", es: "Conservar lo que tengo" },
  done: { en: "Progress restored.", es: "Progreso restaurado." },
  saved: { en: "File saved.", es: "Archivo guardado." },
  adjusted: { en: "Some entries were repaired:", es: "Se repararon algunas entradas:" },
} as const;

export function BackupPanel({ locale }: { locale: Locale }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ progress: Progress; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function doExport() {
    // Date.now() is fine here: this runs on a click, never at render, so it can't
    // break SSR/hydration parity.
    const now = new Date();
    const blob = new Blob([serializeBackup(buildBackup(now))], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFilename(now);
    a.click();
    URL.revokeObjectURL(url);
    setStatus(t(COPY.saved, locale));
    setError(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice still fires a change event.
    e.target.value = "";
    if (!file) return;
    setStatus(null);
    const result = parseBackup(await file.text());
    if (!result.ok) { setError(result.error); setPending(null); return; }
    setError(null);
    setPending({ progress: result.progress, warnings: result.warnings });
  }

  function commit() {
    if (!pending) return;
    applyBackup(pending.progress);
    setStatus(t(COPY.done, locale));
    setPending(null);
  }

  const current = load();

  return (
    <div className="card stack" style={{ gap: "var(--s-3)" }}>
      <p className="eyebrow">{t(COPY.title, locale)}</p>
      <p className="dim text-sm" style={{ maxWidth: "62ch" }}>{t(COPY.body, locale)}</p>

      <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={doExport}>{t(COPY.export, locale)}</button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          {t(COPY.import, locale)}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onFile}
          // Hidden but reachable: the visible control is the button above, which
          // is styled and sized like every other action on the page.
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {error && <p role="alert" className="text-sm" style={{ color: "var(--bad)" }}>{error}</p>}
      {status && <p role="status" className="text-sm" style={{ color: "var(--ok)" }}>{status}</p>}

      {pending && (
        // Confirmation, not a modal: an import replaces the only copy, so both
        // sides are shown side by side and the safe choice is the plain one.
        <div className="card" style={{ borderColor: "var(--amber)", background: "var(--amber-dim)" }}>
          <p className="eyebrow" style={{ color: "var(--amber-accent)" }}>{t(COPY.confirmTitle, locale)}</p>
          <dl style={{ margin: "var(--s-3) 0", display: "grid", gap: "var(--s-2)" }}>
            <div>
              <dt className="eyebrow">{t(COPY.current, locale)}</dt>
              <dd className="text-sm" style={{ margin: 0 }}>{describeProgress(current)}</dd>
            </div>
            <div>
              <dt className="eyebrow">{t(COPY.incoming, locale)}</dt>
              <dd className="text-sm" style={{ margin: 0 }}>{describeProgress(pending.progress)}</dd>
            </div>
          </dl>
          {pending.warnings.length > 0 && (
            <div className="text-sm dim" style={{ marginBottom: "var(--s-3)" }}>
              {t(COPY.adjusted, locale)}
              <ul style={{ margin: "var(--s-1) 0 0", paddingLeft: "1.2em" }}>
                {pending.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={commit}>{t(COPY.confirm, locale)}</button>
            <button type="button" className="btn" onClick={() => setPending(null)}>{t(COPY.cancel, locale)}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BackupPanel;
