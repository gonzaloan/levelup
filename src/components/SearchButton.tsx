"use client";
import { Icon } from "./Icon";

export const OPEN_SEARCH = "fg-open-search";

export function SearchButton({ label, placeholder, big }: { label: string; placeholder: string; big?: boolean }) {
  return (
    <button type="button" className={big ? "search-hero" : "search-btn"} aria-label={label}
      onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH))}>
      <Icon name="search" size={big ? 22 : 18} />
      <span className="search-btn-text">{big ? placeholder : label}</span>
      <kbd>/</kbd>
    </button>
  );
}
