// Tiny, safe inline markdown for practice text (escapes HTML first): **bold**, `code`, *em*,
// "> quote" lines, blank-line paragraphs, [[id]] → plain id.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function inlineMd(src: string): string {
  return src.split(/\n{2,}/).map((block) => {
    const quote = block.startsWith("> ");
    const body = esc(quote ? block.replace(/^> /gm, "") : block)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/\[\[([a-z0-9-]+)\]\]/g, "$1")
      .replace(/\n/g, "<br/>");
    return quote ? `<blockquote>${body}</blockquote>` : `<p>${body}</p>`;
  }).join("");
}
