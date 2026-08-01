# Codex entry contract

You are authoring entries for a REFERENCE that a working AI architect keeps open.
Not a tutorial, not a blog post: each entry answers three things — what it IS, when to
reach for it, and what it costs — and is checkable against a source you actually fetched.

## The shape of ONE entry

```json
{
  "slug": "kebab-case-unique",
  "term": { "en": "...", "es": "..." },
  "definition": { "en": "What it IS. <=30 words. Plain. No jargon that is not defined here.", "es": "..." },
  "howItWorks": { "en": "2-4 sentences of mechanism. Name real things.", "es": "..." },
  "whenToUse": { "en": "The trigger, as a condition you could actually check.", "es": "..." },
  "cost": { "en": "A BOUND or a NUMBER. Never an adjective.", "es": "..." },
  "cheaperFirst": { "en": "The cheaper option to rule out first, and what would have to be true for it to win.", "es": "..." },
  "failureMode": { "en": "How this goes wrong in production. A real failure, not a caveat.", "es": "..." },
  "numbers": { "en": "Verified figures with units. Omit the field entirely if you verified none.", "es": "..." },
  "source": "https://... — the exact URL you fetched",
  "diagram": { ... see below, or omit ... },
  "prerequisites": ["other entry slugs that must be read first — [] if none"],
  "relatedConcepts": ["spine concept slugs — [] if you are unsure"]
}
```

### Field bars the validator enforces (it will reject the file)
- `definition`: 20+ chars, at most ~30 words. A 60-word "definition" is an explanation wearing
  a definition's name.
- `howItWorks`: 60+ chars. `whenToUse`, `cheaperFirst`, `failureMode`: 25+ chars. `cost`: 15+.
- `cost` MUST contain a number, a unit, a fraction, or a named resource (capacity, latency,
  memory, tokens, dimensions, recall, reversibility, migration, engineer-time…). "More reliable"
  is rejected. "32x less memory, and you must rescore the top 100 to get recall back" passes.
- `source` must be a real `https://` URL you fetched. Never invent one.
- `es` must differ from `en`, in EVERY field.
- At most ONE em-dash and ONE semicolon per field.
- `prerequisites` may only name entries that exist somewhere in the codex, and the graph must
  be acyclic. When unsure, use `[]`.
- `relatedConcepts` must be REAL slugs from the 178-concept spine
  (`src/content/data/curriculum.json`). A slug that does not exist fails the merge. If you have
  not verified a slug exists, use `[]`.

### The diagram, if you include one
A shape mismatch renders EMPTY, so this matters more than it looks.

**`caption` IS REQUIRED on every diagram, bilingual, and es ≠ en.** This is the single most-missed
field: the validator rejected 20 of the first 25 authored diagrams for omitting it. The caption is
what the figure ASSERTS — one sentence a reader could disagree with — not a title for it.
Bad: "Chunking pipeline". Good: "The document is embedded once and reused, so the context costs
tokens at index time and nothing at query time."

- `"kind":"flow"` or `"stack"` → give `nodes` (3-6 items, each `{label:{en,es}, note:{en,es}}`).
  Do NOT also give left/right/xAxis/yAxis.
- `"kind":"compare"` → give `left` and `right`, each `{title:{en,es}, points:[{en,es}]}`.
  BOTH SIDES MUST HAVE THE SAME NUMBER OF POINTS (2-5). Each side needs at least one concrete
  quantity or named specific. Three quantified points against one hedge reads as a tradeoff and
  teaches nothing. Do NOT also give `nodes`.
- `"kind":"axes"` → give `xAxis`, `yAxis`, and `nodes`.
- Omit `diagram` entirely rather than inventing one that teaches nothing.

## WRITING RULES

1. DEFINITION FIRST. Never presume the concept inside the sentence meant to introduce it.
2. Every claim concrete: a named system, a real number with a unit, or a specific failure.
3. `cost` is a bound or a figure. `cheaperFirst` is the line most likely to save the reader a
   quarter of work — write it like you mean it.
4. BANNED WORDS: leverage · robust · robustness · harness · crucial · seamless · cutting-edge ·
   game-changing · delve · showcase · pivotal · intricate · meticulous · realm · embark ·
   tapestry · plethora · myriad · furthermore · moreover · comprehensive
   BANNED PHRASES: "best practice(s)" · "it's important to note" · "in today's" ·
   "at the end of the day" · "when it comes to" · "not just X but Y" · "not only X but also Y" ·
   "serves/functions/acts as" · "The judgment is…"
5. BANNED SHAPES: opening with an antithesis ("X is not Y, it's Z") before defining X;
   tricolons used as padding; a trailing "-ing" verdict clause.

## SPANISH

Authored, never machine-translated. Correct ¿¡ñ and all accents.
Banned calques: `librería` (for library) · `robusto` · `robustez` · `correctitud` ·
`eventualmente` (EXCEPT "eventualmente consistente", which is correct) · `es por qué` / `es cómo`.
Use `compensación` for tradeoff, `confiable` not `robusto`.
Terms Spanish-speaking engineers genuinely say in English STAY in English: embedding, chunking,
prompt, token, cache, deploy, commit, chunk, overlap, reranker, batch, rollout, latencia is
Spanish but TTFT stays TTFT.
