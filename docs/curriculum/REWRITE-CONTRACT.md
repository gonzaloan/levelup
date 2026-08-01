# THE REWRITE CONTRACT — every concept, every domain

Generalized from `docs/curriculum/cloud-platform-l5.txt` (the owner-approved rewrite of
`cloud-platform-l5/cell-based-architecture`, the ONE concept in the corpus that meets the bar).

## What was measured, and why this exists

Across all 178 concepts:
- **177 contain zero `**bold**`, zero `- bullets`, zero `## labels`.** 159 are exactly three
  paragraphs. The renderer has supported structure since the last pass; the content never used it.
- **178 of 178 render with a single paragraph above the fold.** The lead budget is 110 words and
  the median first paragraph is 81, so a second paragraph never fits. Median **69% of every
  explanation is hidden behind "read more"** — and what IS visible is one undifferentiated block.
- **79 of 178 contain no digit at all.** No number, no threshold, no cost.
- Only **51 of 178** name both a cost and a cheaper alternative to rule out first. Exactly **1**
  labels them.
- **95 of 178** violate definition-first, usually by opening with an antithesis or a hook that
  presumes the concept.
- **171 of 178** `why` lines open with "Trains…/Teaches…/Builds…". Only 5 ask a question.
- Countable tics: **614 em-dashes**, 203 semicolons, 127 tricolons, **63** uses of the
  "The judgment is…" pivot, and stock metaphors reused verbatim ("wearing a costume" ×5,
  "heroics" ×8).

The corpus is not lazy. It is uniformly competent prose written to one invisible template — which is
worse, because reading ten concepts makes all ten forgettable.

## THE SECTION TEMPLATE — every concept, in this order

The `explanation` field. Authors have exactly four marks: `**bold**`, `` `code` ``, `- bullet`,
`## label`. Nothing else (no links, images, tables, or nested lists).

```
<Thing> is <plain words for what it is>.                          <- sentence 1, <=30 words
<One or two more sentences of mechanism. Concrete.>

## What you buy, and what you pay
- **You buy:** <a BOUND or a number, never an adjective>
- **You do not buy:** <the thing people wrongly assume it gives them>
- **You pay:** <capacity, latency, operational surface, or reversibility — named>

## When it makes sense
<The trigger, as a condition you could check.> <Then the cheaper option to rule out FIRST, and
what would have to be true for that cheaper option to win.>

## What it requires
- <non-negotiable 1 — without this it is not the thing>
- <non-negotiable 2>
```

`analogy` stays a separate field and renders LAST on the pane. It settles a concept the reader
already has; as an opener it is a metaphor for something they have not met.

### The fold is the design constraint
`splitLead()` advances a `## label` together with its body as one atomic unit, and lets the 110-word
budget overshoot to finish a section it started. So write so that **definition + the buy/pay bullets**
fit the lead. That is the whole point of the template: the reader sees the shape without clicking.

Target **170–230 words** for `explanation`. If you have more to say, that material belongs in
`depth`, which is a real field and is empty on 75 concepts.

## HARD RULES

1. **DEFINITION FIRST.** Sentence 1 is `<Thing> is <what it is, plainly>`. The antithesis
   ("X is not Y, it's Z") is allowed only AFTER the definition, as a correction.
2. **PLAIN LANGUAGE.** No jargon before it is defined on the page. Convert nominalizations to verb
   phrases: "bounded per-cell impact" -> "a failure only reaches that cell's customers".
   These five terms cover 37 concepts and must be glossed on first use: `p99`, `blast radius`,
   `idempotent`, `SLO`, `linearizability`.
3. **AT LEAST ONE REAL NUMBER**, pulled UP from the concept's own `example` (every concept has one).
   Never invent a figure: `tools/check-trace.cjs` fails the build on a number the example cannot
   account for. Use the example's own figures.
4. **COST AS A BOUND.** "a failure reaches 1/N of customers", not "more reliable".
5. **A NAMED FAILURE**, not a caveat. What actually breaks, and what it looks like.
6. **ONE em-dash and ONE semicolon per field, maximum.** The corpus averages 3.5 em-dashes.

## BANNED — words

leverage · robust · harness · crucial · seamless · cutting-edge · game-changing · delve · showcase ·
pivotal · intricate · meticulous · realm · embark · tapestry · comprehensive · plethora · myriad ·
furthermore · moreover · "best practice" · "it's important to note" · "in today's" · "at the end of
the day" · "when it comes to"

## BANNED — shapes (these survive a word blocklist, which is why they matter more)

- The **"The judgment is… / The judgment call is… / The practical move is…"** pivot. 63 concepts
  have it, 28 as the second paragraph's opener. Delete the phrase; the trigger belongs under
  `## When it makes sense`.
- **Antithesis as an opener** before the thing is defined. 26 concepts.
- **"Here's the…"** as an opener. 19 concepts. Delete.
- **Tricolons used as padding.** Three items only when there are exactly three real things.
- **"not just X but Y" / "not only X but also Y" / "serves as" / "functions as".**
- **Trailing "-ing" verdict clauses** ending a paragraph (", making it the obvious choice.").
- These stock metaphors, now retired: "wearing a costume", "is a wish", "is decoration",
  "is wallpaper", "the tell is", "heroics".
- **A lesson `overview` opening "At L# you stop X and start Y."** 19 of 35 are identical. A learner
  walking one domain sees them consecutively, so it is the most visible fake symmetry in the app.

## `keyPoints` / `pitfalls` / `children` labels

First two words carry the line. Never start one with: it, this, when, generally, there, "in order to",
"one of". Lead with the noun or the verb that matters.

## SPANISH

Authored, never machine-translated. Correct `¿¡ñ` and accents throughout.
Banned calques: `librería` (for library) · `robusto` · `robustez` · `correctitud` ·
`eventualmente` (EXCEPT the correct term "eventualmente consistente") · `es por qué` /
`es cómo` (English "is why"/"is how" carried over — use "es la razón por la que", "es lo que",
"por eso").
Use `compensación` for tradeoff, `confiable` not `robusto`. Terms Spanish-speaking engineers
genuinely say in English stay in English: embedding, chunking, prompt, token, cache, deploy.
`es` must never be identical to `en`.

## THE `why` FIELD (in curriculum.json, renders FIRST on the pane, above everything)

Rewrite to a **question the learner would actually ask**, <=30 words, ending in `?`.
Optionally a one-sentence setup then the question.

Bad (the current shape, 171 of 178):
> "Trains the judgment of deciding whether bounded per-cell impact is worth the routing layer,
>  the duplicated capacity, and the migration machinery it costs you."

Good (the owner-approved rewrite):
> "When one customer's bad day becomes everyone's bad day, is it worth running several copies of
>  your system so a failure only reaches some of them?"

Never open with Trains / Teaches / Builds / Trusting.
