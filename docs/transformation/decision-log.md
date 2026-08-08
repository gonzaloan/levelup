# Decision log

> Every structural decision in this transformation, with what was rejected and why.
> Section 26 requires these; the ones marked **Accepted (implemented)** have code
> and tests behind them, and the rest are proposals awaiting the owner.

---

## ADR-001 — Separate technical capability from organizational scope

### Status
Accepted (designed; the route model is not yet built)

### Context

`curriculum.json` uses one axis, L3 to L7, across seven domains that mean
different things by it. For `ai-engineering`, L5 means depth in AI systems. For
`leveling-scope` and `direction-influence`, L5 means organizational scope. The
Climb engine then gates ascent on clearing 4 of 7 domain checkpoints at a level,
so a learner cannot reach "L6 AI" without also demonstrating L5-band *influence*.

Section 2.1 forbids exactly this. A person can be a Staff Engineer and a beginner
at RAG.

### Decision

Two routes with independent progressions — AI Architect (A1–A5, capability) and
Staff Engineer (S1–S5, scope) — plus a Shared Foundations layer with depth tiers
rather than stages. A learner's position on one route says nothing about the other.

### Alternatives

- **Keep one ladder, relabel the levels.** Rejected: renaming does not decouple
  the ascent gate, which is where the coupling actually bites.
- **One route per domain (seven routes).** Rejected: seven progressions is not an
  information architecture, it is the domain list with a new word. It also leaves
  the learner choosing between "Technical Depth" and "Systems Architecture", which
  is not a choice anyone can make about their own career.
- **Drop levels entirely, pure prerequisite DAG.** Rejected: the DAG already
  exists and is used; levels are what let a learner answer "am I ready for this".

### Consequences

`climb.ts` must be rewritten, not reconfigured — it assumes one ladder with a
breadth quorum, and its 9 tests encode that model. No learner-facing ids change,
so no progress migration is needed for the IA change itself.

### Affected content
All 178 concepts gain a route and stage, derived in `tools/inventory.cjs`.

### Date
2026-08-02

---

## ADR-002 — Shared Foundations has tiers, not stages

### Status
Accepted (designed)

### Context

The inventory maps 260 of 470 units to Shared Foundations, which reads at first
like the routes are a thin skin over a shared bulk. Only 80 of those 260 are
teachable concepts; the other 180 are Codex entries, reference architectures and
reading-list sources — material that is *supposed* to be shared.

### Decision

Shared Foundations has three depth tiers (F1 mechanics, F2 systems, F3
organizational consequence) and **no gate**. It is pulled from, not climbed. A
module names the foundations it needs as prerequisites; those are checked per
concept, which the existing prerequisite DAG already supports.

### Alternatives

- **Give it its own five-stage ladder.** Rejected: it reintroduces the ADR-001
  mistake one level down. You can be at F3 for reliability and F1 for data.
- **Fold each foundation into whichever route uses it most.** Rejected: it
  duplicates the concept for the other route, which section 7 forbids.

### Consequences

Each shared concept needs a per-route application scenario — 80 concepts × 2
routes of real authoring. The schema supports it (additive fields); the content
does not exist yet.

### Date
2026-08-02

---

## ADR-003 — Practice and graded pools are disjoint

### Status
**Accepted (implemented)** — `src/lib/checks.ts`, `tests/check-integrity.test.ts`

### Context

Measured: 66 of the 70 graded checkpoint checks (94.3%) were byte-identical to the
two the learner had just played formatively in the lesson, with unlimited free
retry and the explanation printed. 32 of 35 checkpoints had every graded check
pre-seen. Separately, 294 of 368 authored checks were unreachable by any learner,
because both selectors took only the first two of the same array.

### Decision

`poolFor` alternates by authored position: even indices are practice, odd are held
out for grading. A concept with exactly one check gives it to practice.

### Alternatives

- **Author a separate graded bank.** Rejected for now: the corpus already has 2+
  checks for nearly every concept, so a split is available today at no authoring
  cost. A dedicated bank is the better end state and remains open.
- **Randomize which items are graded.** Rejected: the platform forbids runtime
  randomness (SSR/hydration parity), and a stable split is easier to reason about.

### Consequences

0% overlap, reachable content up from 20% to 57%, every checkpoint still has
graded checks. A concept with one check contributes no graded item — acceptable,
because the checkpoint's MCQ bank still covers it.

### Date
2026-08-02

---

## ADR-004 — A failed attempt does not reveal the answer key

### Status
**Accepted (implemented)** — `src/components/CheckpointPlayer.tsx`

### Context

Every reveal painted the correct option green regardless of what was chosen, and
`retry()` replayed the same items in a provably identical order, because
`itemKey` was a pure function of stable inputs. Two passes cleared any of the 35
checkpoints: fail once to collect the key, pass from memory.

### Decision

A wrong pick marks only the pick. The learner still gets the rationale for their
own choice, which names the misconception. An attempt counter feeds the shuffle
key, so a retry is a different presentation.

### Alternatives

- **Limit attempts.** Rejected: a hard limit punishes the learner who is
  genuinely learning, and the goal is that a retry be *useful*, not scarce.
- **Author an item pool per checkpoint and sample per attempt.** The strongest
  option and still open — it makes the gate genuinely non-memorizable rather than
  merely inconvenient to memorize. Deferred because it is ~2.5× the current item
  bank in new authoring.

### Consequences

A learner who fails no longer sees the right answer. That is the intent, and it is
a real cost: the rationale for their own wrong choice has to carry the teaching,
which is why every distractor rationale was checked (1,052 of them, none under 12
words).

### Date
2026-08-02

---

## ADR-005 — Display order is computed in one place, and it is answer-aware

### Status
**Accepted (implemented)** — `src/lib/checkDisplay.ts`

### Context

`shuffle.ts` existed because authored content puts the correct answer first. It
was wired to MCQ options and to one of the four novel check players. The other
three shipped unshuffled, and their authored keys are the identity permutation in
63/73 match, 58/61 cloze, 62/81 categorize — so positional play cleared them.

### Decision

One module returns display order for all four mechanics. Each passes its actual
exploit as an `unsafe` predicate, and the order is re-keyed until the exploit
fails.

### Alternatives

- **Shuffle only.** Insufficient, and measured so: with shuffling but no
  predicate, 11 of 233 checks still fell, because a uniform shuffle lands on the
  giveaway order by chance.
- **Re-order the authored JSON.** Rejected: it fixes existing content only, and a
  future author reintroduces the bias.
- **Force the correct answer away from position 0.** Rejected after measuring —
  see the note in ADR-006.

### Consequences

One 2×2 match was unfixable by any shuffle (linking row i to row i yields the same
pair set either way), so it grew a third pair, and `merge-checks.cjs` now rejects
a match under three pairs. That is a content rule, not a display rule.

### Date
2026-08-02

---

## ADR-006 — Position carries no information, in both directions

### Status
**Accepted (implemented)** — `tests/check-integrity.test.ts`

### Context

I first asserted that no attempt may render the authored order, since 178 of 178
checkpoint items put the correct answer at index 0. The test reported 194
violations. Measuring rather than trusting the assertion: 27.2% of
attempt-instances put the key first, against ~25% expected by chance for a
4-option shuffle. The shuffle was working.

### Decision

Assert the correct answer reaches every position at near-chance rate. No position
may hold more than 42% or fewer than 5% of correct answers.

### Alternatives

- **Forbid the key-first order.** Rejected, and this is the point of the ADR: it
  installs a *sharper* tell than the one being fixed. "The first option is never
  correct" is a rule a learner can exploit in one sitting.

### Consequences

A learner will occasionally see the authored order. That is correct: an order that
is never the authored one is itself a pattern.

### Date
2026-08-02

---

## ADR-007 — Predict gates the whole pane, not the figure slot

### Status
**Accepted (implemented)** — `src/components/lesson/Predict.tsx`

### Context

Predict was missing platform-wide. The pane named the judgment, showed the figure,
then explained, so the learner was handed the answer before committing.

### Decision

A commitment step after the plain-words definition and before everything else, on
the three RAG-slice concepts. Not scored, not stored, skippable. It withholds the
entire remainder of the pane, and the sibling context rail, until it resolves.

### Alternatives

- **Guard the figure slot only.** Tried, and the Playwright test caught two more
  figures still on screen — the folded schematic and the folded code. A per-slot
  guard also fails silently for any section added later.
- **Score it.** Rejected: scoring a guess made before the teaching punishes a
  learner for not yet knowing, which is the reason for asking.
- **Make it mandatory.** Rejected: a learner opening a concept for reference should
  not be made to re-guess, and a forced interstitial on a lookup trains people to
  stop opening concepts.

### Consequences

The lesson gains a step, which costs time on a surface already competing for
attention. Scoped to one lesson so that cost can be judged before it spreads.

### Date
2026-08-02

---

## ADR-008 — Coverage is derived from the spine and gated

### Status
**Accepted (implemented)** — `tools/check-coverage.cjs`

### Context

`cloud-platform`, the 7th domain, had 0 of 290 checks — all 26 of its concepts,
against 40–56 per domain elsewhere. No validator could see it: every existing one
checks that what EXISTS is well-formed, and a domain with zero checks is perfectly
well-formed. This was the sixth defect caused by adding a 7th domain to code that
assumed six.

### Decision

A coverage matrix derived from the spine, failing on any gap, with a baseline file
for gaps that are known and accepted.

### Alternatives

- **A test asserting each domain has checks.** Rejected: it would hardcode the
  domain list, which is the original defect.

### Consequences

78 checks authored across 7 validated batches; `cloud-platform` now at 26/26. The
matrix also surfaced 4 domains with no Build Lab and 2 with no Codex cross-links —
open, and recorded rather than silently tolerated.

### Date
2026-08-02

---

## ADR-009 — A gate that fires on correct content is a broken gate

### Status
**Accepted (implemented)** — several validators

### Context

Four separate rules I wrote in this transformation fired on correct content or
missed real defects, and each was found by attacking the rule rather than reading
its output:

- Duplication over `title + summary` reported 595 pairs, 100% of them checkpoints
  matching my own generated template.
- "No diacritics past 40 words" missed a 35-word untranslated paragraph; at 25
  words it fired on 10 pieces of correct Spanish.
- Scoring N/A as 0 manufactured 435 fake audit failures.
- "Objective ends in a question mark" scored all 178 concepts a perfect 4.

### Decision

Every gate in this transformation carries a self-test that replays real defects
AND real correct content: `selftest-inventory.cjs` (25 checks) and
`selftest-merge-checks.cjs` (16 defect classes plus a known-good fixture).

### Consequences

The self-tests are as much code as the gates. Worth it: they caught a `--dry`
hole in the merge validator, and a fixture of mine that asserted a precondition it
never verified.

### Date
2026-08-02

---

## ADR-010 — Reading folds into Explore; four browse routes consolidate

### Status
Proposed

### Context

Section 17 allows Reading to leave the primary nav "if the audit demonstrates it".
Of 116 resources, 94 are already concept-mapped, so they have a natural home on
the concept that needs them. Separately, `/map`, `/ladder`, `/tracks` and
`/method` are four top-level routes answering one question.

### Decision

Reading moves under Explore and onto each module. The four browse routes
consolidate into Explore, keeping their URLs as redirects.

### Consequences

Needs the owner's call: it is the one decision here that changes what a returning
learner finds where.

### Date
2026-08-02

---

## ADR-011 — Some exploits are content defects, and no display layer can fix them

### Status
**Accepted (measured)** — `tests/exploit-family.test.ts`

### Context

After the display guard was widened to reject each mechanic's exploit family, a
reviewer found three strategies still clearing above the 15% ceiling that test sets.
The worst was a categorize sweep in **authored** order at 59%.

The obvious response is to widen `unsafe` again: reject the full dihedral group for
match, index the cloze reversal on bank length as well as blank count, and test the
authored-order strategies too. I implemented that and measured it.

### Decision

**Stop widening the display guard.** The wider version is *unsatisfiable*, and the
arithmetic says why:

- For a **3-pair match**, the dihedral group is 2n = 6 patterns and there are exactly
  3! = 6 permutations. The guard forbids 100% of the space. At n=4 it forbids 33%, at
  n=5 only 8% — so it is satisfiable only on long lists, and **25 of the 95 match
  checks are 3×3**.
- For **categorize**, the authored-order strategies never read the display order.
  **63 of 105 categorize checks had an authored key that WAS an even sweep. Now 0.** No
  permutation of the tray changes that, because the strategy does not look at the tray.

These are content properties wearing a display costume. Forcing the guard would either
fail to terminate or fall back to a rotation — which is *worse* than the exploit,
because a predictable order is a sharper tell than a chance one.

### Alternatives

- **Widen the guard anyway, with a longer fallback chain.** Rejected: measured
  unsatisfiable on 96 match, 80 cloze, 292 categorize and 36 order item/attempt pairs.
  Every one of those would silently take the rotation escape hatch.
- **Re-author the 60 categorize keys and the 24 3×3 matches.** The correct fix, and
  real work: a 3-pair match needs a fourth row or an unmatched distractor; a
  categorize whose buckets fall in a neat run needs its items authored out of it.
  Not done in this pass, and recorded rather than implied.
- **Accept the exposure silently.** Rejected. The residual is now two assertions
  carrying the measured numbers (62% and 30% ceilings), so the figures live in the
  suite and a regression is still caught even though the residual is not zero.

### Consequences

A learner who both notices the pattern and can recover authored order retains an
advantage on some categorize items. That is bounded by the attempt cap and by the
fact that recovering authored order is not something the UI offers.

The generalisable lesson: **when a guard becomes unsatisfiable, that is information.**
It means the defect is not in the layer being guarded.

### Affected content
63 categorize checks with sweep-shaped keys, all since reordered (0 remain); 25 3-pair match checks.

### Date
2026-08-02

---

## ADR-012 — The platform stays static and model-free, so Explain is out of scope

### Status
**Accepted (enforced)** — `tools/check-static.cjs`, `tools/selftest-static.cjs`

### Context

Section 23 names nine learning stages. Eight are built. **Explain** — articulating a concept
in your own words — is the ninth, and it needs free-text judgment, which needs one of three
things:

1. **A model call from the browser.** That means shipping a key in a public bundle. Anyone can
   read it out of the JavaScript and spend it.
2. **A model call from a server.** That means adding a backend: an API route, a runtime, a
   secret store, a cost that scales with use, and a new security surface. The platform is a
   static export served from S3 behind CloudFront — 236 HTML files, no server, progress in
   `localStorage`.
3. **Self-grading.** A text box and a "did you get it?" button.

The third is the tempting one and it is the reason this ADR exists rather than a backlog item.
A learner who has already read the correct answer cannot judge impartially whether their own
words matched it; they mark themselves right. It would be a checkbox that looks like a
measurement — and this repo ships 26 self-test cases specifically to keep gates from doing
that.

### Decision

**Explain is out of scope, permanently, and the constraint that rules it out is enforced.**

The owner's constraint is simplicity and no LLM in the web app. That is not a limitation
working around Explain; it is a property worth more than Explain. A static site has no
runtime cost, no key to leak, no backend to operate, no latency, and works offline after load.
Trading that for one stage of nine — the one that cannot be graded honestly without a
server — is a bad trade.

`check-static.cjs` now fails the build on: a model SDK in `package.json`, an
`src/app/api` directory, `"use server"`, a `runtime` export, `force-dynamic`, any
`fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`, a credential-shaped literal, a
non-`NEXT_PUBLIC_` env var, a missing `output: "export"`, and `Math.random()` in a
rendered module.

### Alternatives rejected

- **Self-graded Explain.** Dishonest, per the above. Rejected on the same grounds the
  interview-mode rubric was: labelling a reflection tool a measurement is the defect.
- **Ship a rate-limited key.** Still public. Rate limiting bounds the bill, not the leak.
- **A serverless function just for grading.** One route is still a backend: a deploy target, a
  secret, an on-call surface, and the end of "a release is a directory of files".
- **Peer review between learners.** Needs accounts, a database and moderation. Larger than the
  platform it would be bolted onto.

### Consequences

The learning model is **8 of 9 stages, and that is the finished state** — not a gap awaiting
work. `target-learning-model.md` says so, and `tests/facts.test.ts` fails if
`coverage.explain` ever becomes non-zero, which forces this ADR to be revisited rather than
letting a document silently go stale.

What is genuinely lost: no stage detects the fluency illusion by making a learner produce
prose. What partially covers it: the Predict step forces a commitment before the teaching,
and 24 concepts have one; flashcards force unprompted retrieval; and the graded surfaces
reveal nothing, so recognition cannot substitute for recall.

The generalisable lesson: **a constraint that only lives in prose is one refactor from being
false.** Three documents reason from "0 API routes". Now a gate does too.

### Affected content
None. This removes a planned stage rather than changing anything authored.

### Date
2026-08-04

## ADR-013 — A reference needs a level above its entries, and the axis is the field that fails

### Status
**Accepted (enforced)** — `docs/curriculum/PRIMER-CONTRACT.md`, `tools/merge-codex.cjs`,
`tools/selftest-merge-codex.cjs` (22 defect classes), `tests/codex-primer.test.ts`

### Context

The Codex shipped 107 entries that every gate called well-formed: the six-part anatomy complete,
`cost` stated as a bound, `cheaperFirst` named with its winning condition. `merge-codex.cjs`
passed. The defect was not in any entry.

Measured on the shipped data:

- **11 of 11 clusters oriented the reader with ONE line of tagline**, then handed over between 4
  and 18 sibling techniques as a flat list.
- **49 of 107 entries had no prerequisites**, so they were all layer 0 on the reading path. True
  of the DAG, false of the learning.
- **The umbrella term was never defined.** `"RAG"` appeared 126 times in `codex.json`;
  `"retrieval-augmented generation"` appeared **0 times in `codex.json` and 0 in `lessons.json`**.
  Six entry slugs begin `rag-`, and `rag-failure-taxonomy` enumerated its seven failure points to
  a reader who was never told what the thing is. Twelve chunking strategies shipped with nothing
  saying why a document must be cut at all.
- **Nothing stated the axis of choice.** The twelve chunking entries vary along two dimensions
  (what decides the boundary; whether context is restored). A reader who cannot name those
  dimensions reads twelve entries as twelve unrelated facts.

This is a distinct failure class from the one `REWRITE-CONTRACT.md` addresses. That contract fixed
the CONCEPT — prose with no structure, no number, no named cost. Every rule in it was satisfied
here and the reference was still hard to learn from, because **a reference organized for LOOKUP
fails the reader who does not yet own the vocabulary they are looking up.** An entry answers "what
does X cost". Someone arriving at a cluster is asking something earlier: what is this family, why
does it exist, and which axis am I choosing along.

Uniform excellence at the leaf does not compose into understanding at the root.

### Decision

**Every cluster carries a `primer`, and it is a gate rather than a style note.**

The primer is the general-to-specific descent, in this order: `whatItIs` (the umbrella, defined,
definition-first) → `whyItExists` (the forcing problem, with a figure an entry below actually
states) → `axisOfChoice` (the dimension every member varies along, NAMED) → `families` (a **total
partition** of the cluster's entries, each with a rule for when the family wins) → `howToChoose`
(2-5 ordered questions the reader can check about their own situation).

**Nothing in a primer folds.** This is deliberately the opposite of the entry card, which hides its
mechanism behind a `<details>`: an entry is CONSULTED, so hiding detail is right, but a primer is
what a lost reader needs and a fold is exactly what a lost reader does not open.

It is a gate because the last contract shipped as prose in a doc and was adopted in **1 of 178
concepts**. `merge-codex.cjs` enforces every mechanically checkable rule and
`selftest-merge-codex.cjs` proves it catches 22 defect classes while accepting real correct
content.

### What this pass established

**The load-bearing rule is the TOTAL PARTITION.** A families list that quietly drops an entry
re-creates the orphan defect ONE LEVEL UP, and does it invisibly — the cluster still renders and
every family in it still looks complete. "Absence is invisible to schema validators" is the most
expensive lesson in this repo's history; this is that lesson at a new altitude.

**The AXIS is the field that fails.** Six primers passed the learner review and five failed; four
of the five failed the same way — the families carved the cluster correctly and the axis did not
describe that carve, so a reader trusting `axisOfChoice` as their classifier was misrouted or
stranded. `tools-integration` named two dimensions for three families, leaving all of `Wiring and
protocol` (3 of 8 entries) unplaceable, and the primer had already NAMED that family, so the
author knew the dimension existed. To review a primer, take its axis and try to place a specific
entry with it.

**Three rules in this pass were wrong, and each was found by attacking the rule rather than
reading its green output:**

1. "The axis names a dimension" omitted `where`/`dónde`, rejecting security's correct "Where the
   control sits relative to the model...". Its Spanish branch matched the accented `dimensión` and
   so missed its own unaccented plural `dimensiones`. Fixed by folding diacritics.
2. "No family of one" was SUSPECTED of rejecting a correct taxonomy, so it was measured rather than
   assumed: all 11 primers carve 107 entries with zero singleton families, and `vector-indexes`
   came out a clean 2x2 along storage fidelity — a better carve than the hypothetical that
   prompted the doubt, found because the rule forced the question. Kept strict on evidence.
3. The family-label word cap was shared across locales and rejected the correct Spanish "Resumen
   en vez de la traza completa" (7 words vs a 6-word cap). But DROPPING the Spanish cap was worse
   and was only caught by attacking the relaxed rule: a 13-word Spanish sentence then merged
   cleanly, because the only other label rule is the trailing full stop. Spanish gets a looser cap
   (9), not an absent one.

**A figure can be right inside every entry and still wrong across the Codex.** Attacking the
primers' numbers verified all 38 against an entry in the same cluster — and turned up a defect in
the ENTRIES: `fixed-size-chunking` cited text-embedding-3's input limit as 8,191 tokens while
`embedding-vector-geometry` said 8192 in three of its own fields. Every gate was green because each
entry was internally consistent and each primer agreed with its own cluster; the disagreement
existed only BETWEEN clusters, where nothing was looking. The guard added for it is scoped to a
named model's documented constant, because 8192 remains correct three times over (jina-v2's window,
Bedrock's `maxTokens`, vLLM's `max_num_batched_tokens`) and a rule about the bare number would fire
on correct content.

**Word caps are measured on the authored source language.** Spanish runs 20-40% longer than English
for the same content, so one shared cap either lets English sprawl or rejects correct Spanish.

### Consequences

Adding a cluster now costs a primer, and adding an entry to a cluster costs a decision about which
family it joins — the merge refuses an entry in no family. That is the intended cost: an entry
nobody can place in the cluster's own taxonomy is usually an entry in the wrong cluster.

The gate cannot check whether a definition is good, whether the axis is the RIGHT axis, or whether
the families carve where a practitioner would. That judgment stays with reviewers, which is why
this pass ran two independent ones with different lenses.

### Affected content
`src/content/data/codex.json` — 11 primers, 36 families, 107 of 107 entries grouped. No entry's own
fields were changed except the text-embedding-3 limit correction above.

### Date
2026-08-07
