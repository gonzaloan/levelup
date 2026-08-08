# THE PRIMER CONTRACT — every Codex cluster gets a top-down orientation

The companion to `REWRITE-CONTRACT.md`. That contract governs a **concept** in the
178-concept spine. This one governs a **cluster** in the Codex, and it exists because
the two surfaces fail differently.

## What was measured, and why this exists

The Codex ships 107 entries in 11 clusters. Every entry is individually well-formed —
`merge-codex.cjs` enforces the six-part anatomy, a `cost` stated as a bound, and a
`cheaperFirst`. The defect is not in any entry. It is in what sits **above** them:

- **11 of 11 clusters orient the reader with exactly one line of tagline**, then hand
  over between 4 and 18 sibling techniques as a flat list.
- **49 of 107 entries have no prerequisites**, so they are all layer 0. On the reading
  path they arrive as equals, which is true of the DAG and false of the learning.
- **The umbrella term is never defined.** "RAG" appears 126 times across `codex.json`
  and is the first word of a cluster tagline — and no entry answers *what RAG is*.
  `rag-failure-taxonomy` enumerates its seven failure points to a reader who was never
  told what the thing is. The same holds for chunking: twelve strategies for cutting a
  document, and nothing that says why a document must be cut at all.
- **Nothing states the axis of choice.** The twelve chunking entries differ along two
  dimensions (what decides the boundary; whether context is added back). A reader who
  cannot name those dimensions cannot choose, so they read twelve entries as twelve
  unrelated facts and remember none.

That is the gap: **a reference organized for lookup, used by someone who does not yet
know the vocabulary they are looking up.** Entries answer "what does X cost". A learner
arriving at a cluster is asking something earlier — "what is this family, why does it
exist, and which axis am I choosing along".

Uniform excellence at the leaf does not compose into understanding at the root.

## THE PRIMER — the `primer` field on `CodexCluster`

One per cluster. Renders ABOVE the entry list, always visible, never behind a fold.
It is the general-to-specific descent: umbrella term, why it exists, the axis of
choice, the families, how to pick.

Authors have exactly the four marks the spine allows: `**bold**`, `` `code` ``,
`- bullet`, `## label`. Nothing else.

### Fields

```ts
primer: {
  /** The umbrella term, defined in plain words. Sentence 1 is a definition. */
  whatItIs: I18nText;        // <= 45 words, definition-first
  /** The problem that makes this family necessary. Concrete, with a number. */
  whyItExists: I18nText;     // <= 60 words, at least one real figure
  /** The dimension(s) every entry in the cluster varies along. */
  axisOfChoice: I18nText;    // <= 50 words, names the axis explicitly
  /** The families: each a named group, its member entries, and its one-line rule. */
  families: {
    label: I18nText;         // the family's name — a noun phrase, not a sentence
    rule: I18nText;          // when this family wins, as a checkable condition
    entries: string[];       // entry slugs in THIS cluster — validated, never free text
  }[];
  /** The ordered questions that walk a reader from "no idea" to one entry. */
  howToChoose: I18nText[];   // 2-5 steps, each a question with its consequence
}
```

### HARD RULES

1. **DEFINITION FIRST, AND THE UMBRELLA TERM IS THE SUBJECT.** `whatItIs` sentence 1
   is `<Umbrella> is <what it is, plainly>`. Not a hook, not an antithesis, not a
   promise about what the reader will learn. If the cluster is `chunking`, sentence 1
   defines chunking — not "chunking matters more than people think".

2. **EVERY FAMILY'S `entries` MUST RESOLVE, AND THE PARTITION MUST BE TOTAL.**
   Every slug names a real entry **in this cluster**, no slug appears in two families,
   and the union covers **every** entry in the cluster. A partition that silently drops
   an entry is the exact defect this contract exists to fix: it re-creates an orphan at
   the level above the one we just organized. `merge-codex.cjs` enforces all three.

3. **AT LEAST ONE REAL NUMBER in `whyItExists`**, and it must be traceable to a figure
   an entry in this cluster already states. Never invent one. The primer summarizes
   what the cluster contains; a figure that appears nowhere below it is a claim the
   reference cannot support.

4. **`axisOfChoice` NAMES THE AXIS.** Not "there are tradeoffs" — the dimension, in
   words the reader can then apply: "what decides the boundary: a count you set, the
   document's own structure, or the text's meaning". A reader who finishes this
   sentence can classify a new entry they have never seen.

5. **`howToChoose` STEPS ARE QUESTIONS WITH CONSEQUENCES.** Each step is something the
   reader can actually check about their own situation, followed by where the answer
   sends them. "Does the source have structure you can trust?" is a step. "Consider
   your requirements" is not.

6. **NO FAMILY OF ONE, unless the cluster has fewer than 4 entries.** A family with a
   single member is a rename, not a grouping, and it inflates the appearance of
   structure without adding any.

7. **ONE em-dash and ONE semicolon per field, maximum.** Same as the spine.

8. **THE PRIMER MAY NOT RESTATE AN ENTRY.** It is the level above. If a sentence in the
   primer would be at home inside an entry's `definition` or `cost`, it belongs there
   instead. The primer's job is the shape of the family, not any member's detail.

### BANNED

Everything `REWRITE-CONTRACT.md` bans (words and shapes) applies unchanged — the
merge validator reuses the same regexes, so the two cannot drift.

Additionally banned in a primer, because each is the specific way an orientation
section goes wrong:

- **"In this cluster you will learn..." / "This section covers..."** — a table of
  contents read aloud. The reader can see the list; tell them what the family IS.
- **"There are many approaches to X."** True of everything, decides nothing.
- **"It depends."** As the whole of `howToChoose`, or as any step in it. If it depends,
  name what it depends ON — that is the axis, and it is rule 4.
- **A family label that is a sentence.** Labels are noun phrases: "Structure-driven",
  not "You can let the structure decide".

### SPANISH

Authored, never machine-translated, same banned calques as the spine. Terms
Spanish-speaking engineers genuinely say in English stay in English: embedding,
chunking, prompt, token, cache, deploy, reranker.

## Why this is a GATE and not a style note

Because the last contract was prose in a doc and was adopted in 1 of 178 concepts.
`merge-codex.cjs --check` now validates every rule above that is mechanically
checkable: presence, bilinguality, word count, the total-partition property, banned
words and shapes, a digit in `whyItExists`, and no family of one. Its self-test
(`tools/selftest-merge-codex.cjs`) contains BOTH real defects and real correct content,
because a gate that has never rejected anything is not known to work — and one that
fires on correct content trains people to bypass it.

What the gate CANNOT check is whether the definition is any good, whether the axis is
the *right* axis, or whether the families carve the cluster where a practitioner would
carve it. That judgment stays with the reviewers.
