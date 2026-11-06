// Build-time syntax highlighting (shiki). Emits dual-theme CSS variables, so the code block
// follows the site theme with zero client JS.
import { createHighlighter, type Highlighter } from "shiki";

const LANGS = ["python", "typescript", "javascript", "sql", "yaml", "bash", "json", "go", "java"] as const;
let hl: Promise<Highlighter> | null = null;

export async function highlight(code: string, lang: string): Promise<string> {
  hl ??= createHighlighter({ themes: ["github-dark-default", "github-light-default"], langs: [...LANGS] });
  const h = await hl;
  const l = (LANGS as readonly string[]).includes(lang) ? lang : "text";
  return h.codeToHtml(code, {
    lang: l,
    themes: { dark: "github-dark-default", light: "github-light-default" },
    defaultColor: false,
  });
}
