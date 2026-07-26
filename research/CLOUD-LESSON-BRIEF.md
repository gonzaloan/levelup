# Authoring brief — Cloud & Platform lessons

You are authoring deep, bilingual lesson content for one level of the new
`cloud-platform` domain of a Staff/Principal engineering curriculum.

## Hard rules

1. **Do NOT invoke any Skill. Do NOT use WebSearch or WebFetch.** Everything you
   need is in the two local files named in your task. (Skills auto-trigger on
   cloud/AI topics and derail the job.)
2. **Facts come only from `research/2026-07-25-aws-verified-facts.md`.** Read it
   first. If a claim is not in that file and not a timeless engineering fact,
   don't make it. Never state a price, a launch date, or a service name that file
   marks UNVERIFIED. Prefer describing a *mechanism* generically ("a
   snapshot-restore initialization feature", "a per-instance management fee") over
   naming a product, except where the verified-facts file confirms the name.
3. **Bilingual, authored Spanish.** Every learner-facing string is
   `{"en": "...", "es": "..."}`. Spanish must read as written by a native
   engineer, not translated. Banned calques: `librería` (use `biblioteca`),
   `robusto`/`robustez` (use `confiable`/`fiabilidad`), `correctitud` (use
   `corrección`). Use `compensación` or `contrapartida` for "tradeoff". Correct
   `¿¡ñ` and accents. `es` must never equal `en`.
4. **Judgment, not trivia.** The audience has 10+ years of experience. Teach the
   decision and its cost. No "cloud computing is the on-demand delivery of…".
   No motivational filler. No em-dash-heavy AI cadence; vary sentence length.
5. **Code is code** — the `snippet` field is NOT translated. Comments inside it
   are English. Annotations (`note`) ARE bilingual.

## Output contract

Write ONE file: the path given in your task. Shape:

```json
{
  "lessons": [
    {
      "lessonId": "cloud-platform-l5",
      "overview": {"en": "...", "es": "..."},
      "concepts": [ /* one entry per concept, in the input's order */ ],
      "midQuiz": [ /* 3 items */ ],
      "cheatSheet": [ /* 2-3 sections */ ]
    }
  ]
}
```

### `overview` (required)
2–3 paragraphs separated by `\n\n`. What this level's cloud work *is*, framed by
the level's `intent`. Concrete.

### each concept (required fields marked ★)
```json
{
  "slug": "★ exactly the slug from the input, verbatim",
  "explanation": {"en": "★ 3-4 paragraphs, \n\n-separated", "es": "..."},
  "keyPoints": [{"en": "★ 3-4 takeaways", "es": "..."}],
  "diagram": {
    "kind": "★ one of: flow | compare | stack | axes",
    "caption": {"en": "...", "es": "..."},
    "nodes": [{"label": {"en":"","es":""}, "note": {"en":"","es":""}}],
    "left":  {"title": {"en":"","es":""}, "points": [{"en":"","es":""}]},
    "right": {"title": {"en":"","es":""}, "points": [{"en":"","es":""}]},
    "xAxis": {"en":"","es":""},
    "yAxis": {"en":"","es":""}
  },
  "depth": {"en": "1-2 extra paragraphs for the 'go deeper' toggle", "es": "..."},
  "keywords": [{"term": {"en":"","es":""}, "def": {"en":"","es":""}}],
  "code": {
    "lang": "python|ts|go|hcl|yaml|bash|sql|text",
    "snippet": "raw source, NOT i18n",
    "caption": {"en":"","es":""},
    "annotations": [{"line": 3, "note": {"en":"","es":""}}]
  },
  "example": {"scenario": {"en":"","es":""}, "walkthrough": {"en":"","es":""}},
  "architecture": { "same shape as diagram" },
  "visual": {"widgetId": "one of the ids below", "params": {}},
  "pitfalls": [{"en":"","es":""}],
  "analogy": {"en":"","es":""},
  "source": "the concept's source string from the input, or a real checkable doc",
  "children": [{"label": {"en":"","es":""}, "detail": {"en":"","es":""}}],
  "mnemonic": {"en":"","es":""},
  "flashcards": [{"front": {"en":"","es":""}, "back": {"en":"","es":""}}]
}
```

**`diagram` shape rules** (a mismatch renders empty):
- `kind: "flow"` or `"stack"` → provide `nodes` (3–5). No left/right/axes.
- `kind: "compare"` → provide `left` and `right`. No nodes.
- `kind: "axes"` → provide `xAxis` and `yAxis`, and `nodes` for plotted points.

**`architecture`** (optional, same shape) must depict something *genuinely
different* from `diagram` — a concrete system, a real scenario. If it would just
restate the diagram, omit it. This is the single most common quality failure.

**`visual.widgetId`** — ONLY these exist; anything else is dropped by the merge:
`big-o`, `sort-race`, `consistency`, `rag-pipeline`, `consensus`,
`latency-budget`, `token-economics`, `threat-board`, `scaling-curves`,
`eval-harness`, `spectrum`, `decision-flow`, `tradeoff-curve`.
Only attach one when it *teaches this concept*. Keyword coincidence is not a
reason. Omitting `visual` is fine and common. The three generic ones take params:
- `spectrum`: `{"left":{"en":"","es":""},"right":{"en":"","es":""},"stops":[{"label":{"en":"","es":""},"note":{"en":"","es":""}}]}`
- `decision-flow`: `{"steps":[{"q":{"en":"","es":""},"yes":{"en":"","es":""},"no":{"en":"","es":""}}]}`
- `tradeoff-curve`: `{"xAxis":{"en":"","es":""},"yAxis":{"en":"","es":""},"shape":"valley"|"rise"|"saturate","note":{"en":"","es":""}}`
  (`yAxis` is always a cost/risk you want LOW.)

### `midQuiz` — exactly 3 items
```json
{"stem": {"en":"","es":""},
 "options": [{"text": {"en":"","es":""}, "correct": true, "rationale": {"en":"","es":""}}]}
```
4 options, **exactly one** `correct: true`. Distractors must be the plausible
wrong calls a senior actually makes — never obviously silly. Every option gets a
rationale that teaches. Vary which position holds the key.

### `cheatSheet` — 2–3 sections
```json
{"heading": {"en":"","es":""}, "rows": [{"term": {"en":"","es":""}, "note": {"en":"","es":""}}]}
```

## Quality bar
This ships to production at levelup.skillrealm.dev. It must not read as
AI-generated: opinionated, specific, with real numbers only where verified, and
concrete scenarios (a Series-B carve-out, a 40-minute hourly batch job, a
4,000-item findings queue) rather than "imagine a system".
