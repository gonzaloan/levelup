// The widget registry is the contract between content-as-data (which references
// a widget by id) and the kit. This locks: every id resolves to a component,
// unknown ids resolve to null, and the ten signature widgets are all present.
import { describe, it, expect } from "vitest";
import { getWidget, WIDGET_IDS } from "@/components/viz";

const EXPECTED = [
  "big-o", "sort-race", "consistency", "rag-pipeline", "consensus",
  "latency-budget", "token-economics", "threat-board", "scaling-curves", "eval-harness",
];

describe("viz widget registry", () => {
  it("resolves unknown ids to null", () => {
    expect(getWidget("does-not-exist")).toBeNull();
  });

  it("registers all ten signature widgets as components", () => {
    for (const id of EXPECTED) {
      const W = getWidget(id);
      expect(W, `widget "${id}" should be registered`).toBeTruthy();
      expect(typeof W).toBe("function");
    }
  });

  it("WIDGET_IDS matches the registered set", () => {
    expect(WIDGET_IDS.sort()).toEqual([...EXPECTED].sort());
  });
});
