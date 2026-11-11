"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/types";
import { AUTH_EVENT, accountEmail, deleteSynced, isLoggedIn, lastSyncedAt, login, logout, schedulePush, syncEnabled, syncNow } from "@/lib/sync";
import { STUDY_EVENT } from "@/lib/practice/store";
import { Icon } from "./Icon";

/** Keeps a signed-in learner's progress in sync: pull on load/focus, debounced push after study,
 *  and a last push when the tab is hidden (closing it or switching apps) if answers are pending. */
export function SyncAgent() {
  useEffect(() => {
    if (!syncEnabled()) return;
    let last = 0;
    const pull = () => { if (isLoggedIn() && Date.now() - last > 60_000) { last = Date.now(); void syncNow(); } };
    let pending = false;
    const onStudy = (e: Event) => { if (!(e as CustomEvent).detail?.fromSync) { pending = true; schedulePush(); } };
    pull();
    const onVis = () => {
      if (document.visibilityState === "visible") pull();
      else if (pending && isLoggedIn()) { pending = false; void syncNow(); }
    };
    window.addEventListener(STUDY_EVENT, onStudy);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener(STUDY_EVENT, onStudy); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return null;
}

/** Header account control. Renders nothing when login is not configured. */
export function AccountButton({ locale }: { locale: Locale }) {
  const [, tick] = useState(0);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    const f = () => tick((n) => n + 1);
    window.addEventListener(AUTH_EVENT, f);
    return () => window.removeEventListener(AUTH_EVENT, f);
  }, []);
  if (!ready || !syncEnabled()) return null;
  const es = locale === "es";
  if (!isLoggedIn()) {
    return (
      <button type="button" className="icon-btn account" onClick={() => void login()} title={es ? "Entra para guardar tu progreso en la nube (misma cuenta que get-certified)" : "Sign in to save your progress in the cloud (same account as get-certified)"}>
        <Icon name="user" size={18} /><span>{es ? "Entrar" : "Sign in"}</span>
      </button>
    );
  }
  const email = accountEmail() ?? "";
  const synced = lastSyncedAt();
  return (
    <div className="account-wrap">
      <button type="button" className="icon-btn account on" aria-expanded={open} onClick={() => setOpen(!open)} title={email}>
        <span className="avatar">{(email[0] ?? "?").toUpperCase()}</span>
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <p className="am-email">{email}</p>
          <p className="am-sync">{synced ? `${es ? "Sincronizado" : "Synced"} ${new Date(synced).toLocaleTimeString()}` : es ? "Sincronizando…" : "Syncing…"}</p>
          <button type="button" role="menuitem" onClick={() => void syncNow()}>{es ? "Sincronizar ahora" : "Sync now"}</button>
          <button type="button" role="menuitem" onClick={logout}>{es ? "Cerrar sesión" : "Sign out"}</button>
          <button type="button" role="menuitem" className="am-danger" onClick={() => {
            // Signing out too: while signed in, the next sync would upload this device's copy again.
            const msg = es ? "¿Borrar tu progreso guardado en la nube y cerrar sesión? Este dispositivo conserva su copia local." : "Delete your progress saved in the cloud and sign out? This device keeps its local copy.";
            if (window.confirm(msg)) void deleteSynced().then((ok) => ok ? logout() : window.alert(es ? "No se pudo borrar. Intenta de nuevo." : "Could not delete. Try again."));
          }}>{es ? "Borrar datos en la nube" : "Delete cloud data"}</button>
        </div>
      )}
    </div>
  );
}
