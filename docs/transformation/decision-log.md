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
