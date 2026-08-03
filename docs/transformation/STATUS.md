# Transformation status

> Section 28 dashboard. GENERATED from `facts.json` — every count below is measured,
> and `tests/facts.test.ts` fails if this file and the measurement disagree.
>
> The previous version was hand-written and said "the route model is designed but not
> built" for four commits after it shipped, with metrics from three commits earlier. That
> is the failure mode a dashboard has, so this one is derived.

## Current phase

The audit, the target IA, the route model, the validation suite and the section 28/42
document set are all built. What remains is content depth, not structure — see
**Next reviewable step**.

## Learning model: 5 stages complete, 3 partial, 1 absent

| Stage | Concepts | Coverage |
|---|---:|---:|
| predict | 24 | 13% |
| read | 178 | 100% |
| see | 178 | 100% |
| worked example | 178 | 100% |
| practice | 178 | 100% |
| recall | 178 | 100% |
| build | 10 | 6% |
| explain | 0 | 0% |
| transfer | 6 | 3% |

Explain is the absent one, and it is blocked by the deployment model rather than by
effort: free-text grading needs a server, and this is a static export with
0 API routes.

## Content

- **178 spine concepts** across 7 domains, L3–L7
- **380 checks** in 4 mechanics — 82 cloze, 105 categorize, 98 order, 95 match
- **35 checkpoints, 183 items**; 105 formative mid-lesson items
- **107 Codex entries** in 11 clusters, 14 reference architectures
- **10 build challenges**, **24 predict steps**, **6 transfer items**
- **377 authored figures** + 14 interactive widgets
- **212 within-domain prerequisite edges** (hard gate) + **37 cross-route `leansOn` edges** (advisory)

## Bilingual

19881 English and 19881 Spanish strings — equal, with
**0 empty prose fields**. The 7 empty strings
are positional slots, not missing translations.

Glossary: **128 terms** (82 kept in English, 46 localized),
80 banned renderings enforced on every build, 50 carrying a written
note where the decision contradicts its own measurement.

## Verification

- **11 content validators** in `npm run verify` (12 chain steps; one is a generator, not a gate)
- **3 gate self-tests** — they attack the validators, which is where four of my own wrong rules were found
- **353 unit tests** across 30 files
- **110 Playwright tests** across 19 spec files
- 5 ratchet baselines: `coverage-baseline.json`, `glossary-baseline.txt`, `match-spare-baseline.txt`, `prose-baseline.txt`, `trace-baseline.txt` — they may only shrink

## Systems section 33-38 specifies

| System | State |
|---|---|
| Spaced review | Built — 7-rung ladder, 4 grades, pure module |
| Review queue | **1 of 10 sources** |
| Confidence | Captured and used for the band cap; **not read by the scheduler** |
| Saved content | **Absent** (section 33.1) |
| Interview mode | A generated view over 4 tracks; **no product surface** |
| Analytics | **0 tracking calls** |

## Risks

1. **No visual regression baseline.** 110 browser tests assert structure, not pixels. A CSS regression that keeps the DOM intact passes everything. Highest residual risk.
2. **A gate that fires on correct content trains people to bypass it.** Several of mine did during this work — most recently a glossary that banned `rendimiento` (meaning *performance*) as a calque of throughput. Every gate now ships with correct-content fixtures. Managed, not closed.
3. **The ratchets can be gamed by adding baseline lines.** None was added in this work; content was fixed instead, and one line was deleted when a figure became traceable.
4. **154 concepts have no Predict step and 168 have no Build challenge.** The engines exist; the content does not.
5. **No telemetry**, so no claim about learner behaviour in any of these documents has been validated against a learner.

## Next reviewable step

Extend Predict and Build to the Staff Engineer route, the way the AI route was done: the
engines and the validating merge tools now exist, so each concept is an additive,
independently shippable patch. Then wire wrong-with-high-confidence into the review queue
— the data is already in `responseLog`, which makes it the cheapest of the
9 unbuilt queue sources.
