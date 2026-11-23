"use client";
// Registers the service worker (pages you visit keep working offline) and offers to save the
// whole guide in the current language for the subway, a flight or a bad connection.
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/types";
import { clearOffline, loadSaved, offlineSupported, saveForOffline, swEnabled, type Saved } from "@/lib/offline";

const T = {
  en: { save: "Save for offline", sub: (mb: string) => `The whole guide in English on this device (~${mb} MB).`, saving: (a: number, b: number) => `Saving… ${a}/${b}`, cancel: "Cancel",
    saved: (d: string) => `✓ Available offline · saved ${d}`, update: "Update", remove: "Remove", stale: "A newer version is published.", failed: "Could not save everything. Check your connection and try again.", offline: "You are offline: showing saved pages." },
  es: { save: "Guardar para usar sin conexión", sub: (mb: string) => `Toda la guía en español en este dispositivo (~${mb} MB).`, saving: (a: number, b: number) => `Guardando… ${a}/${b}`, cancel: "Cancelar",
    saved: (d: string) => `✓ Disponible sin conexión · guardado el ${d}`, update: "Actualizar", remove: "Quitar", stale: "Hay una versión más nueva publicada.", failed: "No se pudo guardar todo. Revisa tu conexión e inténtalo de nuevo.", offline: "Estás sin conexión: se muestran las páginas guardadas." },
};

export function Offline({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [info, setInfo] = useState<{ mb: string; build: string } | null>(null);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [error, setError] = useState(false);
  const [online, setOnline] = useState(true);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!offlineSupported() || !swEnabled()) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    setReady(true);
    setSaved(loadSaved());
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    // The size shown on the button, and whether a saved copy is from an older build.
    fetch(`/offline-${locale}.json`, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null))
      .then((l) => l && setInfo({ mb: (l.bytes / 1e6).toFixed(0), build: l.build })).catch(() => undefined);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [locale]);

  if (!ready) return null;
  const run = async () => {
    setError(false);
    abort.current = new AbortController();
    setProgress([0, 1]);
    try { setSaved(await saveForOffline(locale, (a, b) => setProgress([a, b]), abort.current.signal)); }
    catch { if (!abort.current.signal.aborted) setError(true); }
    setProgress(null);
  };
  const mine = saved?.locale === locale ? saved : null;
  const stale = !!mine && !!info && !!info.build && mine.build !== info.build;

  return (
    <div className="offline" aria-live="polite">
      {!online && <p className="offline-note">{t.offline}</p>}
      {progress ? (
        <p><progress value={progress[0]} max={progress[1]} /> {t.saving(progress[0], progress[1])} <button type="button" className="link-btn" onClick={() => abort.current?.abort()}>{t.cancel}</button></p>
      ) : mine ? (
        <p>{t.saved(new Date(mine.at).toLocaleDateString(locale, { day: "numeric", month: "short" }))}{stale ? ` · ${t.stale}` : ""}{" "}
          {online && <button type="button" className="link-btn" onClick={() => void run()}>{t.update}</button>}{" "}
          <button type="button" className="link-btn" onClick={() => void clearOffline().then(() => setSaved(null))}>{t.remove}</button></p>
      ) : online && info ? (
        <p><button type="button" className="btn offline-btn" onClick={() => void run()}>{t.save}</button> <span>{t.sub(info.mb)}</span></p>
      ) : null}
      {error && <p className="offline-note">{t.failed}</p>}
    </div>
  );
}
