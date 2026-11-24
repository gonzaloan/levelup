// Diagram walkthroughs: the order the steps light up, and that every real diagram can be walked.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { flowOrder, flowWalk, sequenceWalk, svgText, type WalkGraph } from "@/lib/diagram-walk";

const g = (nodes: string[], edges: [string, string][]): WalkGraph => ({ nodes: nodes.map((id) => ({ id, label: id })), edges: edges.map(([from, to]) => ({ from, to })) });

describe("flowOrder", () => {
  it("puts every input before the step that needs it", () => {
    // Q and the index both feed R: R waits for both.
    expect(flowOrder(g(["Q", "R", "X", "I"], [["Q", "R"], ["R", "X"], ["I", "R"]]))).toEqual(["Q", "I", "R", "X"]);
  });
  it("reads breadth-first from the sources, ties in the diagram's order", () => {
    expect(flowOrder(g(["A", "B", "C", "D"], [["A", "C"], ["A", "B"], ["B", "D"], ["C", "D"]]))).toEqual(["A", "C", "B", "D"]);
  });
  it("enters a loop at the node the walk already points to, and visits each node once", () => {
    // An agent loop: S → B → M → T → S. No source: start at the first node.
    expect(flowOrder(g(["S", "B", "M", "T"], [["S", "B"], ["B", "M"], ["M", "T"], ["T", "S"]]))).toEqual(["S", "B", "M", "T"]);
    const order = flowOrder(g(["A", "L1", "L2", "Z"], [["A", "L1"], ["L1", "L2"], ["L2", "L1"], ["L2", "Z"]]));
    expect(order).toEqual(["A", "L1", "L2", "Z"]);
  });
  it("ignores edges to unknown nodes and self loops", () => {
    expect(flowOrder(g(["A", "B"], [["A", "B"], ["B", "B"], ["B", "ghost"]]))).toEqual(["A", "B"]);
  });
});

describe("svgText", () => {
  it("drops tags and decodes entities", () => {
    expect(svgText('<tspan>HTTP,</tspan><tspan> timeout &amp; fallback</tspan>')).toBe("HTTP, timeout & fallback");
  });
});

describe("every real diagram", () => {
  const dir = path.join(process.cwd(), "content", "diagrams");
  const ids = fs.readdirSync(dir).filter((f) => f.endsWith(".dark.svg")).map((f) => f.replace(".dark.svg", ""));
  it("walks each flowchart node once and lights every edge", () => {
    for (const id of ids.filter((x) => fs.existsSync(path.join(dir, `${x}.graph.json`)))) {
      const graph: WalkGraph = JSON.parse(fs.readFileSync(path.join(dir, `${id}.graph.json`), "utf8"));
      const svg = fs.readFileSync(path.join(dir, `${id}.dark.svg`), "utf8");
      const steps = flowWalk(graph, svg);
      expect(steps.map((s) => s.n).sort(), id).toEqual(graph.nodes.map((n) => n.id).sort());
      const lit = new Set(steps.flatMap((s) => s.via ?? []));
      const edges = new Set([...svg.matchAll(/<path[^>]*data-id="(L_[^"]+)"/g)].map((m) => m[1]));
      for (const e of edges) expect(lit.has(e), `${id}: ${e}`).toBe(true);
      for (const s of steps) expect(s.label.trim(), id).not.toBe("");
    }
  });
  it("walks each sequence diagram message by message", () => {
    for (const id of ids.filter((x) => !fs.existsSync(path.join(dir, `${x}.graph.json`)))) {
      const svg = fs.readFileSync(path.join(dir, `${id}.dark.svg`), "utf8");
      if (!svg.includes('aria-roledescription="sequence"')) continue;
      const steps = sequenceWalk(svg);
      expect(steps.length, id).toBe((svg.match(/data-et="message"/g) ?? []).length);
    }
  });
});
