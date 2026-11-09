# Authoring exercises

One file per concept: `content/exercises/<domain>/<concept-id>.json` = `{ "concept": id, "items": [...] }`.
Gold example: `content/exercises/rag/reranking.json` — **read it first and match its quality.**
Validate: `node tools/check-exercises.mjs <files>`.

The reader is preparing for AI Architect / Staff / Principal interviews at top companies. Every item
is graded **deterministically in the browser** (no LLM), scheduled by spaced repetition, and must
teach something when the reader gets it wrong.

## What to write per concept

**3 items (4 at most)**, varied:
1. **A scenario judgment question** (`mcq`): "You see X in production / the interviewer says Y — what
   do you do / what's the cause?" This is the heart of interview prep: applied judgment, not trivia.
2. **One non-MCQ item** that fits the concept naturally:
   - `numeric` when the concept has numbers to reason with (sizing, cost, latency, math).
   - `code` when the concept has code (a gap on a meaningful line).
   - `order` for pipelines, protocols and processes with one unambiguous order.
   - `match` for sets of terms ↔ meanings (3–5 pairs).
   - `multi` for "which of these are true" with 2–3 correct out of 4–6.
3. **A misconception check** (`mcq` or `multi`): the mistake people actually make about this concept.

Do NOT write "which concept is this?" items (auto-generated) or rephrase the concept's interview
questions (they are already practice cards). Diagram-rebuild items are auto-generated too.

## Rules that make items fair and useful

- **Facts come from the concept file** (already fact-checked) or are textbook-universal. Never
  introduce a new statistic, price or date.
- **Distractors are real misconceptions**, same grammatical form and similar length as the answer.
  No "all/none of the above", no joke options, no absolute-word giveaways only in wrong options.
  The correct option must not be visibly the longest or most hedged.
- Every wrong option should carry a `why` (≤ 45 words) that names the misconception.
- `explain` (10–100 words) teaches the principle behind the answer, not just restates it.
- One unambiguous correct answer (or set / order). If an expert could argue for two, rewrite.
- Prompt ≤ 70 words; option text ≤ 40 words. Markdown allowed: `**bold**`, `` `code` ``.
- Spanish is authored, neutral Latin-American `tú`; same facts in both languages. Keep standard
  English terms engineers use (prompt, embedding, chunk, cache, throughput…).
- ids: `<concept>.a1`, `<concept>.a2`, …

## Type reference

```jsonc
{ "id": "x.a1", "type": "mcq", "prompt": {en,es}, "options": [{ "text": {en,es}, "why": {en,es} }], "answer": 0, "explain": {en,es} }
{ "id": "x.a2", "type": "multi", "prompt": {en,es}, "options": [ ...4-6 ], "answers": [0, 2], "explain": {en,es} }
{ "id": "x.a3", "type": "order", "prompt": {en,es}, "steps": [ {en,es}, ... ]  /* 3-7, correct order */, "explain": {en,es} }
{ "id": "x.a4", "type": "match", "prompt": {en,es}, "pairs": [ { "left": {en,es}, "right": {en,es} } ] /* 3-5 */, "explain": {en,es} }
{ "id": "x.a5", "type": "numeric", "prompt": {en,es} /* state every assumption */, "answer": 116, "tolerance": 0.15, "unit": "QPS", "explain": {en,es} /* show the arithmetic */ }
{ "id": "x.a6", "type": "code", "prompt": {en,es}, "lang": "python", "code": "...\n    ____\n...", "options": [ { "text": "code line", "why": {en,es} } ], "answer": 0, "explain": {en,es} }
```

Options are shuffled at render, so put the correct one anywhere (index 0 is fine). For `numeric`,
`tolerance` is relative (0.15 = ±15%): pick it so a correct method with sensible rounding passes and a
wrong method (off by an order of magnitude, wrong unit) fails.
