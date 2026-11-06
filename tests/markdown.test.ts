import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content", () => ({ getConcept: (id: string) => (id === "rag" ? { title: { en: "RAG", es: "RAG" } } : undefined) }));
const { md } = await import("@/lib/markdown");

describe("markdown", () => {
  it("keeps ~ as 'approximately' instead of strikethrough", () => {
    const html = md("cache hit (~5 ms), then search ~40M chunks", "en");
    expect(html).not.toContain("<del>");
    expect(html).toContain("~5 ms");
    expect(html).toContain("~40M");
  });
  it("renders [[id]] as a localized concept link", () => {
    expect(md("see [[rag]]", "es")).toContain('<a href="/es/c/rag/">RAG</a>');
  });
  it("shows stray HTML tags literally", () => {
    expect(md("wrap it in <invoice> tags", "en")).toContain("&lt;invoice&gt;");
  });
});
