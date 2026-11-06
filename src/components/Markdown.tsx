import type { Locale } from "@/lib/types";
import { md } from "@/lib/markdown";

export function Markdown({ src, locale, inline, className }: { src: string; locale: Locale; inline?: boolean; className?: string }) {
  const html = md(src, locale, inline);
  return inline
    ? <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
    : <div className={`prose ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
