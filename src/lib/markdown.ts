// Server-side markdown → HTML for authored content. Supports [[concept-id]] links.
import { Marked } from "marked";
import type { Locale } from "./types";
import { getConcept } from "./content";

const marked = new Marked({ gfm: true, breaks: false });
marked.use({
  renderer: {
    // Authored text never carries real HTML: show a stray `<tag>` literally instead of swallowing it.
    html({ text }) {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    link({ href, text }) {
      const external = /^https?:/.test(href);
      return external
        ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
        : `<a href="${href}">${text}</a>`;
    },
  },
});

export function md(src: string, locale: Locale, inline = false): string {
  const withLinks = src.replace(/\[\[([a-z0-9-]+)\]\]/g, (_, id: string) => {
    const c = getConcept(id);
    const label = c ? c.title[locale] : id;
    return c ? `[${label}](/${locale}/c/${id}/)` : label;
  });
  return (inline ? marked.parseInline(withLinks) : marked.parse(withLinks)) as string;
}
