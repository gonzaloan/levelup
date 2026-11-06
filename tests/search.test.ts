import { describe, expect, it } from "vitest";
import { norm, prepare, search } from "@/lib/search";
import type { SearchDoc } from "@/lib/types";

const doc = (id: string, t: string, extra: Partial<SearchDoc> = {}): SearchDoc =>
  ({ id, d: "rag", l: "core", t, o: t, a: "", s: "", b: "", q: "", ...extra });

const docs = prepare([
  doc("ann-indexes", "ANN indexes: HNSW, IVF, PQ", { a: "HNSW · IVF · approximate nearest neighbor" }),
  doc("reranking", "Reranking (cross-encoders)", { a: "reranker · cross-encoder", s: "Retrieve many, then reorder with a slower model." }),
  doc("chunking", "Estrategias de chunking", { s: "Cómo cortar documentos para la recuperación." }),
  doc("rag", "RAG", { a: "retrieval-augmented generation", b: "reranking is a stage of RAG" }),
]);

describe("search", () => {
  it("normalizes accents and case", () => {
    expect(norm("Recuperación HNSW")).toBe("recuperacion hnsw");
  });
  it("finds acronyms via aliases", () => {
    expect(search(docs, "hnsw")[0].id).toBe("ann-indexes");
  });
  it("ranks a title hit above a body mention", () => {
    expect(search(docs, "rerank").map((d) => d.id)).toEqual(["reranking", "rag"]);
  });
  it("is accent-insensitive in both directions", () => {
    expect(search(docs, "recuperacion")[0].id).toBe("chunking");
  });
  it("requires every term to match (AND)", () => {
    expect(search(docs, "chunking hnsw")).toEqual([]);
  });
  it("returns nothing for an empty query", () => {
    expect(search(docs, "   ")).toEqual([]);
  });
});
