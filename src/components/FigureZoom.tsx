"use client";
// FigureZoom — an accessible lightbox that wraps any authored figure (a
// Schematic diagram or a viz Widget) with a click / tap / keyboard "enlarge"
// affordance. Opens a focus-trapped role="dialog" overlay rendering the SAME
// figure scaled up (up to ~92vw × 88vh), closes on ✕ / scrim / Esc, restores
// focus to the trigger, and locks body scroll while open. Reduced-motion gated
// (CSS collapses the transitions; JS skips the exit animation). Reinterprets
// get-certified's figure-zoom.js UX in React — the same figure node is simply
// rendered a second time inside the portal, so there is no DOM cloning.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { t, type I18nText, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function FigureZoom({
  children,
  label,
  locale,
  hint = true,
}: {
  children: ReactNode;
  label?: I18nText; // accessible name / caption for the enlarged view
  locale: Locale;
  hint?: boolean; // show the subtle "click to enlarge" hint
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [armed, setArmed] = useState(false); // drives the enter transition
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Portals need a client DOM; defer until mounted (SSR/hydration parity).
  useEffect(() => setMounted(true), []);

  const reduced = () =>
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleClose = useCallback(() => {
    if (reduced()) {
      setOpen(false);
      setArmed(false);
      return;
    }
    setClosing(true);
  }, []);

  // Arm the enter transition one frame after the overlay mounts, focus the
  // close button, and lock body scroll. Teardown restores everything.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      setArmed(true);
      closeBtnRef.current?.focus();
    });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Restore focus to the trigger once the overlay is fully gone — but only on a
  // real open→close transition. On initial mount `open` is already false, so an
  // ungated effect would steal focus onto the mid-pane enlarge button (and
  // scroll it into view) the instant a lesson loads. `wasOpen` guards that.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open && wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Esc to close + Tab focus-trap, bound while the dialog is live.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = dialogRef.current;
      if (!panel) return;
      const f = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
      if (!f.length) {
        e.preventDefault();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, handleClose]);

  const onExited = () => {
    if (!closing) return;
    setClosing(false);
    setOpen(false);
    setArmed(false);
  };

  const ariaLabel = label ? t(label, locale) : m("figure.zoom", locale);

  return (
    <div className="figzoom">
      <div className="figzoom-inline">
        {children}
        <button
          ref={triggerRef}
          type="button"
          className="figzoom-trigger btn btn-sm"
          aria-label={`${ariaLabel} — ${m("figure.zoom", locale)}`}
          onClick={() => {
            setOpen(true);
          }}
        >
          <span aria-hidden="true">⤢</span> {m("figure.zoom", locale)}
        </button>
      </div>
      {hint && (
        <span className="figzoom-hint eyebrow" aria-hidden="true">
          {m("figure.zoomHint", locale)}
        </span>
      )}

      {mounted &&
        open &&
        createPortal(
          <div
            className={`figzoom-overlay${armed && !closing ? " is-open" : ""}${closing ? " is-closing" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
            onTransitionEnd={(e) => {
              if (e.target === e.currentTarget) onExited();
            }}
          >
            <div className="figzoom-dialog" ref={dialogRef}>
              <button
                ref={closeBtnRef}
                type="button"
                className="figzoom-close"
                aria-label={m("figure.close", locale)}
                onClick={handleClose}
              >
                <span aria-hidden="true">✕</span>
              </button>
              <div className="figzoom-stage">{children}</div>
              {label && <div className="figzoom-cap">{t(label, locale)}</div>}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
