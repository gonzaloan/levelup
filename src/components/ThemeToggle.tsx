"use client";
import { Icon } from "./Icon";

export function ThemeToggle({ label }: { label: string }) {
  const toggle = () => {
    const el = document.documentElement;
    const next = el.dataset.theme === "light" ? "dark" : "light";
    el.dataset.theme = next;
    try { localStorage.setItem("fg.theme", next); } catch { /* ignore */ }
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={label} title={label}>
      <Icon name="sun" className="only-dark" />
      <Icon name="moon" className="only-light" />
    </button>
  );
}
