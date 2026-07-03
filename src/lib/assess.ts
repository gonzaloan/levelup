// Assembles a full AssessmentResult from raw responses + SJT picks + self-ratings.
import type { AxisId } from "./axes";
import { AXES } from "./axes";
import { scoreAxis } from "./scoring";
import { groupByAxis } from "./router";
import type { AssessmentResult, AxisResult, Item, Response } from "./types";

export interface SjtPick {
  axis: AxisId;
  score: number;
  maxScore: number;
}

export function assemble(
  responses: Response[],
  sjtPicks: SjtPick[],
  selfRatings: Partial<Record<AxisId, number>>,
  itemBank: Item[]
): AssessmentResult {
  const byAxisResp = groupByAxis(responses);
  const byAxisSjt = groupByAxis(sjtPicks);

  // Map itemId -> misconception slug for confident-wrong roadmap items.
  const misByItem = new Map<string, string>();
  for (const r of responses) {
    if (!r.correct) {
      const item = itemBank.find((i) => i.id === r.itemId);
      const opt = item?.options.find((o) => o.id === r.optionId);
      if (opt?.misconception) misByItem.set(r.itemId, opt.misconception);
    }
  }

  const axes: AxisResult[] = AXES.map((a) =>
    scoreAxis(
      a.id,
      byAxisResp.get(a.id) ?? [],
      (byAxisSjt.get(a.id) ?? []).map((p) => ({ score: p.score, maxScore: p.maxScore })),
      selfRatings[a.id],
      misByItem
    )
  );

  const weakest = [...axes]
    .sort((x, y) => x.composite - y.composite)
    .slice(0, 2)
    .map((x) => x.axis);

  return { axes, weakest, completedAt: 0 };
}
