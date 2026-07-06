// Registry mapping a stable widgetId → the widget component. Content-as-data
// references a widget by id (concept.visual.widgetId); LessonView resolves it
// via getWidget. Unknown ids resolve to null so a bad reference degrades
// gracefully (the concept still shows its prose + diagram).
import type { ComponentType } from "react";
import type { WidgetProps } from "@/lib/viz";

import { BigOExplorer } from "./BigOExplorer";
import { SortRace } from "./SortRace";
import { ConsistencySlider } from "./ConsistencySlider";
import { RagPipeline } from "./RagPipeline";
import { ConsensusRounds } from "./ConsensusRounds";
import { LatencyBudget } from "./LatencyBudget";
import { TokenEconomics } from "./TokenEconomics";
import { ThreatModelBoard } from "./ThreatModelBoard";
import { ScalingCurves } from "./ScalingCurves";
import { EvalHarness } from "./EvalHarness";

export const WIDGETS: Record<string, ComponentType<WidgetProps>> = {
  "big-o": BigOExplorer,
  "sort-race": SortRace,
  "consistency": ConsistencySlider,
  "rag-pipeline": RagPipeline,
  "consensus": ConsensusRounds,
  "latency-budget": LatencyBudget,
  "token-economics": TokenEconomics,
  "threat-board": ThreatModelBoard,
  "scaling-curves": ScalingCurves,
  "eval-harness": EvalHarness,
};

export function getWidget(id: string): ComponentType<WidgetProps> | null {
  return WIDGETS[id] ?? null;
}

/** All registered widget ids — used by the enrichment fleet to validate that a
 *  concept.visual.widgetId points at a real widget. */
export const WIDGET_IDS = Object.keys(WIDGETS);
