# Authoring a concept

One concept = one JSON file at `content/concepts/<domain>/<id>.json`.
The reference example is `content/concepts/rag/reranking.json` — **read it first and match its
density and tone.** The list of every concept id lives in `content/domains.json`.

The reader is a senior engineer preparing to be (or interview as) a **Staff/Principal AI
Architect**. They will use this page two ways: to *learn* a concept in five minutes, and as a
*cheatsheet* minutes before or during an interview. Every field must serve one of those.

## The bar

- **Simple first.** The first sentence of `explain` defines the thing in plain words. No throat
  clearing, no history lesson, no "In today's world".
- **Concrete.** Real numbers, real tools, real failure stories. "Faster" is banned; "~3× faster
  at batch 32" is the bar. If you are not confident in a figure, leave it out or mark it `~`.
- **Short.** Respect the word limits below. A cheatsheet that needs scrolling has failed.
- **Correct.** You are writing for someone who will repeat it to an interviewer. Prefer the
  well-known published figure (paper, official docs) over a guess. Never invent a statistic,
  benchmark result, paper title or URL.
- **Opinionated.** Say what you'd actually do and when. Staff engineers are paid for judgment.

## Fields

| field | required | limit | notes |
|---|---|---|---|
| `id` | yes | — | kebab-case, must equal the filename and an id in `domains.json` |
| `domain` | yes | — | the domain id |
| `level` | yes | — | `core` (everyone must know), `advanced` (senior+), `staff` (Staff/Principal depth) |
| `title` | yes | ≤ 8 words | `{en, es}`. Keep standard English terms in ES when that's what engineers say |
| `aliases` | yes | 2–8 | search synonyms & acronyms, plain strings (e.g. `"RRF"`, `"HNSW"`) |
| `tldr` | yes | ≤ 35 words | the one sentence you'd say out loud in an interview |
| `analogy` | no | ≤ 40 words | everyday analogy; skip it rather than force a bad one |
| `explain` | yes | 90–230 words (EN) | markdown. What it is → how it works. Design cases may go to 420 |
| `diagram` | strongly encouraged | ≤ 14 nodes | `{code, caption{en,es}}`, Mermaid (rules below) |
| `code` | when it helps | ≤ 35 lines | `{lang, title{en,es}, source}`. Runnable-ish, real libraries |
| `example` | yes | 40–130 words | markdown. A concrete scenario with numbers |
| `deepDive` | no | 2–6 items, ≤ 140 words each | `[{title{en,es}, body{en,es}}]`. Mainly for design cases |
| `pros` / `cons` | yes | 2–4 each | one line each |
| `whenToUse` / `whenNotToUse` | yes | ≤ 40 words each | |
| `numbers` | yes (0 ok if truly none) | 0–5 | figures worth memorizing, one line each |
| `pitfalls` | yes | 2–4 | mistakes people actually make |
| `interview` | yes | 2–3 Q&A | answers 40–120 words, spoken first person, structured |
| `related` | yes | 2–6 | ids from `domains.json` (any domain) |
| `sources` | yes | 1–4 | `{title, url}` canonical: papers (arxiv), official docs, well-known engineering blogs |

Every learner-facing text is `{ "en": "...", "es": "..." }`. `code.source`, `diagram.code`,
`aliases`, `sources` are language-neutral.

## Markdown allowed

`**bold**`, `*italic*`, `` `code` ``, `- bullets`, `1. numbered`, `[text](url)`, and
`[[concept-id]]` to link another concept (renders with its title; must be a real id).
In `explain` of design cases you may use `### Subheadings`. No tables, no HTML, no images.

## Spanish

Neutral Latin-American Spanish, `tú`. Authored, not translated word-for-word: natural sentences,
correct `¿ ¡ ñ` and accents. Keep the English term where Spanish-speaking engineers use it
(*prompt, embedding, chunk, token, fine-tuning, pipeline, throughput, trade-off, cache, deploy*),
but don't calque (*"robusto"* → *"confiable/resistente"*, *"aplicar"* not *"aplicar a"* when it
means *apply for*). Same facts and numbers in both languages.

## Mermaid rules (diagrams are pre-rendered; a syntax error fails the build)

- `flowchart LR` / `flowchart TD` or `sequenceDiagram`. Nothing exotic. Use `TD` when a chain has more
  than 5 nodes: wide `LR` diagrams shrink into unreadable text on a 760px column.
- ≤ 14 nodes, labels ≤ 5 words, labels in **English** (shared by both locales).
- Quote any label with punctuation: `A["Embed (bi-encoder)"]`. Use `<br/>` for line breaks.
- No `style`, `classDef`, `click`, colors, emojis or HTML besides `<br/>` — the theme handles looks.
- Edge labels: `A -->|cache hit| B`. Databases: `I[(Index)]`. Decisions: `B{Router}`.
- The diagram must show the *mechanism* (data flow / sequence), not a mind-map of buzzwords.

## Code rules

- Python by default (TypeScript/SQL/YAML/bash when more natural). ≤ 35 lines.
- Real, current libraries (`openai`, `anthropic`, `sentence-transformers`, `numpy`, `pydantic`,
  `fastapi`, `vllm`, `transformers`, `peft`…). Short comments that explain *why*.
- Model ids are examples: write them as a constant with a comment, e.g.
  `MODEL = "gpt-4.1-mini"  # any chat model`. Code comments in English.
- Show the essential mechanism; elide boilerplate with helper names (`hybrid_search(...)`).

## Interview answers

Spoken, first person, structured: claim → reason → what I'd do / trade-off. A Staff answer names
the trade-off and the failure mode unprompted. No "Great question".
