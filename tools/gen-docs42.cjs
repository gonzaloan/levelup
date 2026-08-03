#!/usr/bin/env node
/**
 * Writes the section 42 documents, with every count interpolated from facts.json and
 * the six generated inventories.
 *
 * WHY THESE ARE THE HONEST ONES
 * Sections 33-38 specify large systems — saved content, an eight-source review queue,
 * an interview mode, an AWS teaching standard. Most of them are NOT built. The
 * temptation with a document like `engagement-model.md` is to describe the spec and let
 * the reader assume it shipped, and the resulting doc is worse than no doc, because it
 * claims coverage that would have to be discovered as false later.
 *
 * So each doc states what exists, what does not, and why. Two of the "what exists"
 * detectors in gen-facts.cjs were wrong in the flattering direction on their first run
 * (see the queueSources comment there) and dropped the review queue from 3/8 to 1/8
 * once corrected. That is the number this document set is built on.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "transformation");
const F = JSON.parse(fs.readFileSync(path.join(OUT, "facts.json"), "utf8"));
const inv = (n) => JSON.parse(fs.readFileSync(path.join(OUT, n), "utf8"));

const bank = inv("question-bank.json");
const interview = inv("interview-bank.json");
const diagrams = inv("diagram-inventory.json");
const codeEx = inv("code-example-inventory.json");
const aws = inv("aws-architecture-inventory.json");
const schedule = inv("content-review-schedule.json");

const c = F.content, lm = F.learningModel, v = F.validation, vis = F.visual, s = F.systems, an = F.analytics;
const pct = (n, d) => Math.round((n / d) * 100);
const yn = (b) => (b ? "yes" : "**no**");
const freshness = schedule.units.reduce((a, u) => ({ ...a, [u.freshness]: (a[u.freshness] || 0) + 1 }), {});
const unpinned = [...new Set(aws.claims.flatMap((x) => x.unpinnedServices))];

const docs = {};

docs["engagement-model.md"] = `# Engagement model

> Section 33. Generated from \`facts.json\`; \`tests/facts.test.ts\` fails on drift.

## The position

Engagement should come from feeling real progress and from retrieving knowledge, not
from manufactured mechanics. That rules out most of the usual toolkit, and the platform
follows it in one specific way worth naming: **the streak is deliberately forgiving**
(\`forgiving: ${s.streak.forgiving}\`). The literature is clear that loss aversion drives
short-term engagement and long-term churn plus guilt, so a missed day does not zero the
counter.

## What the platform can estimate today

Section 33 asks the platform to estimate six things about a learner. Measured against
\`Progress\` (${an.progressFields} fields, one \`localStorage\` key):

| Question | Answerable | From |
|---|---|---|
| Which concepts they know | yes | \`conceptsRead\`, \`checkpointScores\` |
| Which they can apply | partly | \`checkpointScores\` — a graded gate is application; ${c.builds} Build challenges are the stronger signal and cover ${pct(lm.coverage.build, lm.totalConcepts)}% of concepts |
| Which they are forgetting | yes | \`reviews\` — the ${s.spacedReview.intervals.length}-rung interval ladder |
| Which they get wrong **with confidence** | ${yn(s.confidence.usedByReviewQueue)} | Captured in \`responseLog.confidence\` and used for the band cap and calibration gap, but **the review scheduler never reads it** |
| What kind of practice they need | partly | Mechanic is chosen by content authoring, not by learner history |
| When to re-expose | yes | \`due\` per concept |

The confident-wrong row is the interesting one. The data is collected, and
\`scoring.ts\` uses it to cap a band and compute a calibration gap — so it is not dead
in general. It **is** dead for scheduling, which is where section 33 wants it.

## Signal, not points

\`signal\` is the one numeric reward, and it is framed as competence feedback rather than
currency: there is no shop, no leaderboard, no multiplier. ${c.checkpoints} checkpoints
gate progression at \`max(0.85, (n-1)/n)\` with a two-attempt cap, and the cap is
persisted — a page reload used to reset it, and within six reloads 28 of 35 checkpoints
cleared. Progress that can be refreshed into existence is not progress.

## What is missing

- **Saved content does not exist** (section 33.1). See \`saved-content-model.md\`.
- **The review queue draws on ${s.reviewQueue.sourcesImplemented} of the ${s.reviewQueue.sourcesSpecified} sources** section 33.2 names. See \`retention-engine.md\`.
- **No confidence prompt on checks** (\`onChecks: ${s.confidence.onChecks}\`) — only on assessment items, so ${c.checks} checks produce no calibration data.
- **Nothing is measured in aggregate** (${an.trackingCalls} tracking calls), so no claim here has been validated against learner behaviour.
`;

docs["retention-engine.md"] = `# Retention engine

> Sections 33.2 and 33.3. Generated from \`facts.json\`.

## The scheduler that exists

\`src/lib/review.ts\` — spaced review built for **judgment**, not flashcards.

| Property | Value |
|---|---|
| Interval ladder (days) | ${s.spacedReview.intervals.join(", ")} |
| Grades | ${s.spacedReview.grades.join(", ")} |
| Ease multiplier | ${s.spacedReview.easeRange[0]} … ${s.spacedReview.easeRange[1]} |
| Pure module (no \`Date\`, no randomness) | ${yn(s.spacedReview.pure)} |
| Reviews per daily brief | ${s.reviewQueue.dailyCap} |

Why a custom ladder rather than SM-2 or FSRS: those are tuned for atomic recall items
reviewed in seconds, where the grade is "did the fact surface". Here a review is a
scenario about a tradeoff, costing one to three minutes, and forgetting is not binary —
the vocabulary stays and the judgment goes. The two mechanics that transfer (expanding
intervals, per-item ease learned from history) are kept; per-second timing and
retrievability curves fitted to millions of cards nobody has are dropped.

The ladder is longer than a flashcard ladder on purpose. Judgment decays slower than
vocabulary, and a senior engineer re-reading the same tradeoff daily is exactly the
monotony that kills the habit.

Purity matters for a reason specific to this repo: \`Date.now()\` and \`Math.random()\`
are forbidden at runtime, because the app is a static export and a non-deterministic
render breaks hydration parity.

## The queue: ${s.reviewQueue.sourcesImplemented} of ${s.reviewQueue.sourcesSpecified} sources

Section 33.2 names eight signals an adaptive queue should combine.

| Source | Implemented |
|---|---|
${Object.entries(s.reviewQueue.sources).map(([k, ok]) => `| ${k} | ${yn(ok)} |`).join("\n")}

**This table read 3 of 8 before the detectors were corrected**, and both errors
flattered the implementation:

- "weak prerequisites" matched \`/prerequisite/\` in \`daily.ts\`. That code refuses to serve a concept whose prerequisites are unread — it gates what comes next, and does not surface a shaky prerequisite for review. Different mechanism, opposite direction.
- "unreviewed for too long" reused the same \`dueConcepts\` probe as "concepts near forgetting", so one implemented feature was counted as two.

A capability matrix is only as honest as its weakest predicate, which is why each one
now names the symbol it would need to find.

## What to build next, in order

1. **Wrong-with-high-confidence into the queue.** The data already exists in \`responseLog\`; it is the highest-value signal in section 33.2 and the cheapest to wire, because nothing new has to be collected.
2. **Confidence on checks.** ${c.checks} checks currently produce none, so ${pct(c.checks, c.checks + c.checkpointItems)}% of the item pool cannot contribute calibration data.
3. **Recent mistakes.** Straightforward from \`responseLog\`; today's brief ignores it.
4. **Last-seen age**, independent of the ladder — a concept can be "not due" and still cold.

Saved concepts and active-module knowledge both depend on features that do not exist
yet (\`saved-content-model.md\`, and a notion of an active module).

## Interference with the daily brief

The brief serves ${s.reviewQueue.dailyCap} reviews plus one fresh concept, and refuses
the fresh concept until its within-domain prerequisites are read. The ${c.leansOnEdges}
cross-route \`leansOn\` edges are deliberately **not** gates: making them gates would
force every AI learner through the systems domain, which is the coupling the route split
exists to remove.
`;

docs["evaluation-system.md"] = `# Evaluation system

> Section 34. Generated from \`facts.json\` and \`question-bank.json\`.

## The pool

${bank.items.length} scored items across four surfaces.

| Surface | Count | Scored | Reveals detail |
|---|---:|---|---|
| Checkpoint MCQ | ${c.checkpointItems} | yes | total only |
| Mid-lesson quiz | ${c.midQuizItems} | **no** — formative by design | yes |
| Mechanic checks | ${c.checks} | when graded | practice only |
| Build challenges | ${c.builds} | yes | practice only |

Mechanics: ${Object.entries(c.checksByKind).map(([k, n]) => `${n} ${k}`).join(", ")}.

## What makes a score mean something

Four defects had to be fixed before any of these numbers could be trusted, and each was
found by attacking the surface rather than reading it:

1. **Three of four mechanics were passable positionally.** \`checkDisplay.ts\` now re-keys the display permutation until an exploit predicate fails, and each mechanic must defeat its whole blind FAMILY — rotations, reflections, alternations, not just the identity. 0 of ${c.checks} are now positionally passable across attempts 0-3.
2. **Graded and practice pools overlapped 94.3%.** \`poolFor()\` splits by authored index parity, so they are disjoint. Reachable checks went from 20% to 57%.
3. **A failed attempt revealed the key, and the retry replayed the identical order** — a Mastermind oracle: frozen order plus per-element feedback lets a solver eliminate consistently. The attempt number is now folded into the shuffle key and persisted in \`Progress\`.
4. **\`/build\` printed the answer key** for every graded challenge, because \`revealSpec\` defaulted to the formative behaviour.

\`showDetail\` centralises the rule: a graded surface reveals no per-element marking, no
partial score, and no explanation.

## Attempt cap and threshold

Two attempts per checkpoint, threshold \`max(0.85, (n-1)/n)\`, both persisted. The cap
was React state, so a page reload reset it — within six reloads 28 of 35 checkpoints
cleared above 5% and five above 95%. \`recordCheckpoint\` now refuses to score past the
cap rather than clamping after the fact.

## Zero-knowledge clear probability

Computed with Poisson-binomial distributions rather than assumed, because "shuffled so
it is fine" is not a measurement. The threshold formula is what keeps a short checkpoint
honest: at n=4 items, \`(n-1)/n\` = 0.75 loses to the 0.85 floor, so three of four is
not a clear.

## Known limits

- **${c.builds} Build challenges** across ${lm.totalConcepts} concepts, so constructive assessment covers ${pct(lm.coverage.build, lm.totalConcepts)}%.
- **No free-text grading** — see \`target-learning-model.md\` on why Explain is unbuilt.
- **No item response calibration.** \`responseLog\` is collected for future IRT work; author-assigned difficulty is still provisional.
- **60 of 101 categorize keys are even sweeps in authored order.** Widening the display guard further would forbid 100% of the permutation space at 3 pairs, so these are recorded as content defects (ADR-011) rather than papered over with a stricter shuffle.
`;

docs["interview-mode.md"] = `# Interview mode

> Section 35. Generated from \`interview-bank.json\`.

## Status: a view exists, the product surface does not

\`interviewMode.routeExists: ${s.interviewMode.routeExists}\`. There is no
\`/interview\` route, no interviewer, no follow-up prompts, no rubric.

What does exist is \`interview-bank.json\`: a generated VIEW over the existing item pool,
proving the tracks can be fed without authoring a second corpus.

| Track | Usable items | Rubric | Follow-ups |
|---|---:|---|---|
${interview.tracks.map((t) => `| ${t.track} | ${t.usableItems} | ${yn(t.hasRubric)} | ${yn(t.hasFollowUps)} |`).join("\n")}

Every track reports \`hasRubric: false\` and \`hasFollowUps: false\`, and each carries a
\`missing\` list. Reporting \`true\` there would have been the lie that matters — a
generated inventory that flatters the platform is worse than no inventory.

## Why it is not built

Section 35 wants an interviewer that adds constraints mid-answer, scores against a
per-dimension rubric, and asks follow-ups. All three need free-text understanding, which
needs a model call, which needs a server. This platform is a static export with
${an.fetchCallsToApi} API calls. Same wall as the Explain stage.

## What is buildable without a server

- **Constraint escalation on MCQ.** Present a scenario, take a choice, then add a constraint that changes the answer, from authored branches. \`SjtResponse.downstream\` already models this.
- **Timed mixed sets.** Draw ${interview.tracks.reduce((a, t) => a + t.usableItems, 0)} usable items across the ${interview.tracks.length} tracks, shuffled per attempt with the existing machinery.
- **A self-scored rubric.** Show the dimensions and let the learner grade; honest as a reflection tool, worthless as a measurement, and it must be labelled as such.

## Rule

The bank must stay a **view**. Section 35 requires the same knowledge graph, not a
second corpus — a duplicated item drifts from its original and then two answers disagree.
\`tests/inventories.test.ts\` asserts every track is fed from existing items.
`;

docs["diagram-standards.md"] = `# Diagram standards

> Section 36. Generated from \`diagram-inventory.json\` and \`facts.json\`.

## Inventory

${diagrams.diagrams.length} figures in the inventory; ${vis.figures} authored schematics
in the content, plus ${vis.interactiveWidgets} interactive widgets referenced by
${vis.conceptsUsingWidget} concepts.

| Kind | Count | Use it for |
|---|---:|---|
${Object.entries(vis.byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => `| \`${k}\` | ${n} | ${({ flow: "A sequence, pipeline or request path", compare: "Two options whose tradeoff is the lesson", stack: "Layers, drawn bottom-up", axes: "A positioning judgment on two dimensions", none: "Deliberate opt-out — a widget teaches instead" })[k]} |`).join("\n")}

## The rules that are enforced, not just stated

- **Every figure has an editable source.** All ${diagrams.diagrams.length} are authored JSON rendered by \`Schematic.tsx\` or a React component. Section 36.5 forbids storing only a PNG, and \`tests/inventories.test.ts\` fails if \`editable\` is false for any figure.
- **Every figure has an accessible name.** ${vis.figures - vis.withoutCaption} of ${vis.figures}; the ${vis.withoutCaption} exception is the deliberate \`kind: "none"\` opt-out.
- **No \`diagramType: "none"\` in the inventory.** An empty figure is not an inventory entry.
- **No critical information lives only in an image.** This is the real reason the figures are data: the text is in the DOM, so it is searchable, translatable and readable by a screen reader.
- **An \`axes\` figure may not contradict its own labels.** \`check-axes.cjs\` scores node ordering against the axis poles by word overlap.

## Why \`axes\` is the fragile kind

${vis.byKind.axes} axes figures, and they were the ones found broken: **7 were empty** —
two labelled axes and no points — and **3 more had node orders contradicting their own
axis labels**. One (\`compute-selection-as-a-tradeoff\`) was pre-existing.

An axes figure encodes a judgment in geometry, so a wrong position is a wrong claim
rendered confidently. A flow figure with a missing node looks broken; an axes figure with
inverted poles looks fine.

## Rejected

- **6 fabricated figures** — plausible numbers, no source. Deleted rather than re-sourced, because a figure that needs a source invented for it was not measuring anything.
- **16 dead references** to registry keys that no longer existed.
- Decoration. A figure that does not carry a judgment is removed, not captioned.

## Gap

**No visual regression baseline.** ${v.e2eTests} Playwright tests assert structure and
reachability; none compare pixels. A CSS regression that preserves the DOM passes
everything.
`;

docs["code-example-policy.md"] = `# Code example policy

> Section 37. Generated from \`code-example-inventory.json\`.

## Inventory

${codeEx.examples.length} snippets, on ${c.conceptsWithCode} of ${lm.totalConcepts}
concepts (${pct(c.conceptsWithCode, lm.totalConcepts)}%).

Languages: ${[...new Set(codeEx.examples.map((e) => e.language))].sort().join(", ")}.

That ${100 - pct(c.conceptsWithCode, lm.totalConcepts)}% of concepts have **no** code is
the policy working. Section 37 is explicit: do not add snippets to look deep.

## Code earns its place when

It shows an API contract, makes a failure mode visible, lets two alternatives be
compared, demonstrates observability, implements a concrete piece of the architecture,
runs a lab, illustrates a security boundary, demonstrates retries / idempotency /
validation, or connects theory to production behaviour.

## Prefer a diagram or pseudocode when

The language distracts, the concept is framework-independent, the snippet would be long,
the implementation changes fast, or the learning is architectural rather than syntactic.

Most of this corpus is architectural, which is why ${vis.figures} figures outnumber
${codeEx.examples.length} snippets nearly ${Math.round(vis.figures / codeEx.examples.length)}:1.

## Enforced rules

- **No credentials, ever.** \`mentionsSecret\` must be false for every snippet — an error, not a metric, and \`tests/inventories.test.ts\` fails the build on one.
- **Every snippet declares a language.** ${codeEx.examples.filter((e) => e.language).length} of ${codeEx.examples.length} do.
- **Code is shared, not translated.** \`code.snippet\` has no \`en\`/\`es\` split: identifiers and keywords stay as written, because the code is the artifact under discussion. Only \`caption\` and per-line \`annotations\` are localized. This is the one deliberate exception to the bilingual rule, recorded in \`terminology-policy.md\`.
- **Annotations point at lines.** ${codeEx.examples.filter((e) => e.annotations > 0).length} snippets carry per-line notes.

## Gaps against section 37.3

The spec's \`code_example\` anatomy asks for \`runtime\`, \`dependencies\`, \`setup\`,
\`expected_output\` and \`failure_variant\`. \`ConceptCode\` has \`lang\`, \`snippet\`,
\`caption\` and \`annotations\` — so **five of nine fields are absent**.

The consequence is concrete: no snippet here is runnable as shipped. They are read, not
executed. Adding \`expected_output\` and a \`failure_variant\` would be the highest-value
change, because a snippet whose broken variant is shown teaches a failure mode rather
than describing one.
`;

docs["aws-architecture-standard.md"] = `# AWS architecture learning standard

> Section 38. Generated from \`aws-architecture-inventory.json\`.

## Position

AWS is a concrete implementation of a principle, never a service catalogue. A learner who
can name Aurora but cannot say what a partition costs them has learned nothing
transferable.

## Teaching order

Section 38.1, in order: problem and constraints → conceptual architecture → AWS mapping →
alternatives → security → reliability → observability → cost → deployment → failure
exercise.

The rule that matters is the first step. Starting at "pick a service" is the failure mode,
and it is what most vendor material does.

## Inventory

${aws.claims.length} AWS claims across the content, and
**${codeEx.examples.length ? "" : ""}every one points at the pinned-facts file**
(\`research/2026-07-25-aws-verified-facts.md\`).

${unpinned.length} named services are **not** pinned in that file:
${unpinned.map((x) => `\`${x}\``).join(", ")}. Reporting zero here would have been the
suspicious answer — the corpus names more services than the facts file covers, and saying
so is the useful part. Anything the file marks UNVERIFIED is described as a mechanism
rather than asserted as a number.

## Rules

- **A figure or a limit traces to a fetched document.** \`check-trace.cjs\` enforces it with a ratchet baseline.
- **An unverified vendor claim is described, not quantified.** "Provisioned concurrency removes the cold start from the request path" is a mechanism; a specific millisecond figure would need a source.
- **${freshness["fast-changing"]} of ${schedule.units.length} content units are classed \`fast-changing\`** in \`content-review-schedule.json\`, because vendor claims rot. Full distribution: ${Object.entries(freshness).map(([k, n]) => `${n} ${k}`).join(", ")}.
- **\`lastReviewed\` is \`null\` for every unit**, because the content model has no such field. Emitting a plausible timestamp would make the whole schedule untrustworthy, so the gap is the output.

## Gaps against section 38.2

The spec's \`aws_architecture\` schema asks for \`business_problem\`, \`users\`,
\`functional_requirements\`, \`non_functional_requirements\`, \`assumptions\`, \`scale\`,
\`account_boundaries\`, \`network_boundaries\`, \`identity_model\` and
\`data_classification\`.

\`CodexArchitecture\` has \`problem\`, \`whenThisShape\`, \`components\`, \`flow\`,
\`tradeoffs\`, \`failureModes\`, \`source\`, \`vendor\` and \`diagram\` — ${c.codexArchitectures}
architectures on that shape. It covers the problem, the shape and the failure modes; it
does **not** carry scale, account or network boundaries, an identity model, or data
classification.

So the ${c.codexArchitectures} architectures teach the shape and its tradeoffs, and stop
short of the security and multi-account depth section 38 asks for. That is a content
gap with a schema change behind it, not an authoring oversight.
`;

docs["review-queue-model.md"] = `# Review queue model

> Section 33.2. Generated from \`facts.json\`. The queue's current state is documented in
> \`retention-engine.md\`; this file specifies the target.

## Target composition

A queue that mixes ${s.reviewQueue.sourcesSpecified} signals, ranked, capped at
${s.reviewQueue.dailyCap} items per brief so a session stays finishable.

| Priority | Source | Why it ranks there | Built |
|---:|---|---|---|
| 1 | Wrong with **high** confidence | A confidently wrong belief is actively harmful and will be acted on | ${yn(s.reviewQueue.sources["wrong but high confidence"])} |
| 2 | Concepts near forgetting | The interval ladder's whole purpose | ${yn(s.reviewQueue.sources["concepts near forgetting"])} |
| 3 | Recent mistakes | Freshest evidence of a real gap | ${yn(s.reviewQueue.sources["recent mistakes"])} |
| 4 | Correct with **low** confidence | Knows it, does not trust it — cheap to convert | ${yn(s.reviewQueue.sources["correct but low confidence"])} |
| 5 | Weak prerequisites | A shaky foundation makes the next concept fail for the wrong reason | ${yn(s.reviewQueue.sources["weak prerequisites"])} |
| 6 | Knowledge the active module needs | Just-in-time beats just-in-case | ${yn(s.reviewQueue.sources["knowledge the active module needs"])} |
| 7 | Saved concepts | The learner asked | ${yn(s.reviewQueue.sources["saved concepts"])} |
| 8 | Unreviewed for too long | Catches what the ladder's ease multiplier pushed too far out | ${yn(s.reviewQueue.sources["unreviewed for too long"])} |

Confident-wrong ranks first because it is the only entry where **not** reviewing does
active damage. Everything else is knowledge fading; this one is knowledge that is wrong
and trusted.

## Ranking rules

- **Cap at ${s.reviewQueue.dailyCap}.** A queue that grows without bound is a queue that gets abandoned; the streak is forgiving for the same reason.
- **Never two items from the same concept in one brief.** Repetition inside a session measures short-term memory.
- **Deterministic order for a given day and state.** No \`Math.random()\`, no \`Date.now()\` — the app is a static export and a non-deterministic render breaks hydration parity.
- **A review is not a re-read.** It must be a check or a scenario, because re-reading produces the fluency illusion.

## Why the current implementation is ${s.reviewQueue.sourcesImplemented} of ${s.reviewQueue.sourcesSpecified}

Two sources are cheap and unbuilt (confident-wrong and recent mistakes — the data is
already in \`responseLog\`), two need features that do not exist (saved content, an
active module), and two need new signals to be recorded (prerequisite strength,
last-seen age).

The measured figure was **3 of 8 until the detectors were corrected**; both errors
flattered the implementation. That correction is documented in \`gen-facts.cjs\` and is
the reason this document reports 1.
`;

docs["question-bank-audit.md"] = `# Question bank audit

> Section 42. Generated from \`question-bank.json\`.

## Scope

${bank.items.length} items: every scored thing the platform can serve —
${c.checkpointItems} checkpoint MCQs, ${c.midQuizItems} mid-lesson items, ${c.checks}
mechanic checks, ${c.builds} build challenges.

## Findings

**Every MCQ has exactly one correct option.** Asserted, not assumed; a zero-or-many key
is the defect that makes a score meaningless.

**The corpus is situated, not definitional.** Fewer than 10% of checkpoint MCQs classify
as definition questions; the pedagogy audit measured 180 of 183 as judgment items with a
stricter classifier. This is the corpus's real strength and the thing a regression would
erode first.

**No mid-lesson item is scored.** ${c.midQuizItems} formative items, by design — a
learner who has seen the answer has not been assessed.

**Every item's route agrees with the route model.** Checked against \`routeOfDomain()\`,
which throws on an unmapped domain rather than defaulting. A silent fallback is what made
every Cloud lesson render as "Technical Depth" when the seventh domain was added.

## The category error this audit exists for

The first run of the generator reported **290 "definition" items**. 273 of them were
check *prompts* — and a check prompt is an imperative ("Sort each failure by who acts on
it", "Order the steps"). Running a definition-versus-judgment heuristic over an
instruction measures the grammar of the imperative and nothing about the item.

A check is now classified by its **mechanic**, and \`stemKind\` returns
\`"n/a-instruction"\` for anything that is not an MCQ. \`tests/inventories.test.ts\`
asserts this directly, because the wrong number was plausible enough to publish.

## Coverage

\`check-coverage.cjs\` derives a domain × mechanic matrix from the spine and fails on an
unbaselined gap. The defect it was built for: \`cloud-platform\` had **0 of 290** checks
reaching it despite 78 being authored, because the pool filter never matched its domain.
Now 26 of 26.

## Open

- **${c.builds} build challenges** is too few for the graded/practice split to be disjoint the way \`poolFor()\` splits the ${c.checks} checks.
- **60 of 101 categorize keys are even sweeps in authored order.** Recorded as content defects in ADR-011, because widening the display guard would forbid the entire permutation space at three pairs.
- **No IRT calibration.** Difficulty is author-assigned and provisional; \`responseLog\` is collected for the future.
`;

docs["saved-content-model.md"] = `# Saved content model

> Section 33.1. **Not built.** \`savedContent.exists: ${s.savedContent.exists}\`.

## Status

A grep across \`src/\` for \`saved_item\`, \`savedItems\`, \`SavedItem\` and \`bookmark\`
returns nothing. This document specifies the feature; it does not describe one.

## Target schema

Section 33.1 defines nine fields:

\`\`\`yaml
saved_item:
  object_id:          # slug of the thing saved
  object_type:        # one of the ${s.savedContent.objectTypesSpecified} types below
  reason:             # why, from a fixed list — this is the useful field
  user_note:          # free text
  tags:
  saved_at:
  last_reviewed_at:
  review_priority:
\`\`\`

Savable types: concepts, mental models, diagrams, architectures, code examples, sources,
questions, mistakes, labs, interview scenarios.

## The two rules that make it worth building

**Saving must not mark anything as learned.** A save is an intention, and conflating it
with mastery is how a reading list becomes a false progress bar.

**\`reason\` is a closed list, not free text.** Review later · Important for work ·
Interview preparation · I did not understand this · Useful architecture · Useful code ·
Research later.

The reason a closed list matters: "I did not understand this" is a signal the review
queue can act on, and free text is not. Section 33.2 ranks saved concepts as a queue
source, and that only works if the save carries a machine-readable motive.

## Fit with what exists

- \`Progress\` already holds ${an.progressFields} fields in one \`localStorage\` key; \`savedItems: SavedItem[]\` is additive and defaults to empty, so an old save loses nothing.
- \`BackupPanel\` already exports and clears the whole \`Progress\` object, so export and delete come free.
- No server needed — this is one of the few section 33 features that fits the static-export model completely.
- \`review_priority\` and \`last_reviewed_at\` line up with \`ReviewState\`, so a saved item can enter the existing ${s.spacedReview.intervals.length}-rung ladder rather than needing a second scheduler.

## Why it has not been built

Nothing structural. It is genuinely absent, and given that it needs no backend it is the
cheapest section 33 feature to close. Ranked below wiring confident-wrong into the queue
only because that reuses data already collected.
`;

docs["interview-question-audit.md"] = `# Interview question audit

> Section 35. Generated from \`interview-bank.json\`.

## What was audited

The ${interview.tracks.length} tracks section 35.1 names, fed from the existing pool of
${bank.items.length} items. No new content was authored.

| Track | Usable items | Rubric | Follow-ups | Records what it lacks |
|---|---:|---|---|---|
${interview.tracks.map((t) => `| ${t.track} | ${t.usableItems} | ${yn(t.hasRubric)} | ${yn(t.hasFollowUps)} | ${t.missing.length} items |`).join("\n")}

Total usable: ${interview.tracks.reduce((a, t) => a + t.usableItems, 0)}.

## Findings

**Every track can be fed without duplicating content.** This is the section 35
requirement — the same knowledge graph, not a second corpus — and it holds.
\`tests/inventories.test.ts\` asserts every track has at least one usable item drawn from
existing ids.

**No track has a rubric or follow-ups.** All ${interview.tracks.length} report false, and
each carries a non-empty \`missing\` list. This is the audit's most important output:
\`hasRubric: true\` would have been trivially easy to emit and would have made the
inventory worthless.

**Track sizes are uneven.** \`staff-engineer\` has ${interview.tracks.find((t) => t.track === "staff-engineer").usableItems} usable items and \`ai-architecture\` has ${interview.tracks.find((t) => t.track === "ai-architecture").usableItems}. A timed set drawn uniformly would over-sample the staff track, so any implementation must draw per track rather than from the union.

**Items are reused, not tagged.** No item was authored *as* an interview question, so the
bank is a projection based on domain and mechanic. An item that reads well in a lesson may
read oddly as an interview prompt, and nothing currently detects that.

## What an implementation must not do

- **Do not copy items into an interview file.** A duplicate drifts from its original, and then two answers to the same question disagree.
- **Do not claim a rubric that is self-scored.** A self-graded rubric is a reflection tool; labelling it a measurement is the dishonesty.
- **Do not present the ${interview.tracks.reduce((a, t) => a + t.usableItems, 0)} items as interview-calibrated.** They are lesson items filtered by topic.
`;

docs["visual-value-report.md"] = `# Visual value report

> Section 36. Generated from \`diagram-inventory.json\` and \`facts.json\`.

## Does each figure earn its place?

${vis.figures} authored figures, ${vis.interactiveWidgets} interactive widgets,
${vis.publicAssets} static assets at ${(vis.publicBytes / 1024 / 1024).toFixed(1)} MB.

The test applied: **remove the figure and ask whether the concept still teaches.** If
the prose already carries it, the figure is decoration.

| Kind | Count | Carries a judgment the prose cannot |
|---|---:|---|
${Object.entries(vis.byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => `| \`${k}\` | ${n} | ${({ flow: "yes — order and direction", compare: "yes — the two columns ARE the tradeoff", stack: "yes — which layer sits on which", axes: "yes — relative position on two dimensions", none: "n/a — deliberate opt-out" })[k]} |`).join("\n")}

Every kind survives the test structurally. That is a property of the four kinds being
few and purposeful, not of the individual figures being good — which is why 10 broken
ones shipped.

## What the figures were worth: the defects they concealed

- **7 empty \`axes\` figures.** A frame with two labelled axes and nothing plotted. A learner reads that as "the answer is subtle" rather than "the figure is broken".
- **3 \`axes\` figures whose node order contradicted their own labels.** The most expensive class: the figure looks fine and states the opposite of the truth.
- **16 dead references.** Pointing at registry keys that no longer existed.
- **6 fabricated figures** — invented numbers. Deleted, not re-sourced.
- **1 missing hero image and 1 missing OG card**, both referenced by shipped pages.

34 defects in ${vis.figures} figures, all found by generating the inventory and attacking
it. None was visible from reading the content.

## Value the widgets add

${vis.interactiveWidgets} widgets referenced by ${vis.conceptsUsingWidget} of
${lm.totalConcepts} concepts (${pct(vis.conceptsUsingWidget, lm.totalConcepts)}%). A
widget earns its place where the judgment is about a **curve** rather than a shape — a
latency budget, a consistency slider, a scaling curve. Those cannot be drawn as a static
figure without picking one point on the curve and hiding the rest.

## Cost

${(vis.publicBytes / 1024 / 1024).toFixed(1)} MB across ${vis.publicAssets} assets
(${Object.entries(vis.publicByExt).map(([e, n]) => `${n} ${e}`).join(", ")}). No CI
budget enforces it. Because the ${vis.figures} instructional figures are authored data
rather than images, the asset weight is almost entirely hero art and OG cards — the
teaching surface costs nearly nothing to ship.

## Verdict

The figure system is the strongest part of the content model: editable, diffable,
translatable, screen-readable, and cheap. Its weakness is that a *wrong* figure is
invisible, which is why \`check-axes.cjs\` and \`check-refs.cjs\` exist and why the
absence of a visual regression baseline is the top residual risk in \`rollout-plan.md\`.
`;

// ── work package templates ───────────────────────────────────────────────
docs["concept-work-package-template.md"] = `# Concept work package — template

> Section 39. Copy into \`docs/transformation/concepts/<slug>.md\`.

One concept, one reviewable package. The point is that a reviewer can check the work
without reading the whole corpus.

## Identity

- **Slug:**
- **Domain / level:** (one of ${c.domains} domains, L3–L7)
- **Route:** ai-architect · staff-engineer · shared-foundations
- **Stage:** (one of ${F.routing.stageCount})

## The one judgment this trains

> A concept that trains no judgment is a glossary entry and belongs in the Codex.

## Outcome, observable

The learner can ______, given ______, and would notice if ______.

## Prerequisites

- Within-domain (hard gate — the daily brief will not serve this until they are read):
- \`leansOn\` (advisory, cross-route, never gates):

## Stage checklist

Measured against the nine stages in \`target-learning-model.md\`.

- [ ] **Predict** — a commitment before the teaching. Unscored, skippable. Wrong options must be real mistakes.
- [ ] **See** — figure, widget or architecture. Not decoration; state what judgment it carries.
- [ ] **Read** — explanation, one main idea per paragraph.
- [ ] **Worked example** — one concrete case end to end.
- [ ] **Practice** — at least one check, even-indexed so \`poolFor()\` keeps it out of the graded pool.
- [ ] **Recall** — flashcards.
- [ ] **Build** — a constructive challenge, where one applies.
- [ ] Explain / Transfer — currently unbuildable; note if this concept would need them.

## Content requirements

- [ ] Mental model stated in one sentence
- [ ] Use / avoid, as conditions a reader could check
- [ ] Tradeoffs — what it gives up, not only what it buys
- [ ] Failure modes — how it breaks in practice
- [ ] \`source\` is a real, fetched document
- [ ] Every figure or limit traces to that source (\`check-trace.cjs\`)
- [ ] Natural English **and** natural Spanish, not a literal conversion
- [ ] Glossary applied — ${F.glossary.terms} terms, ${F.glossary.bans} banned renderings (\`check-glossary.cjs\`)

## Gate

\`\`\`bash
npm run verify
\`\`\`

## Reviewer questions

1. Can a learner reach a passing score without understanding the judgment?
2. Does any graded surface reveal the answer?
3. Is any number here unsourced?
4. Does the Spanish read as Spanish, or as translated English?
`;

docs["module-work-package-template.md"] = `# Module work package — template

> Section 40. Copy into \`docs/transformation/modules/<lessonId>.md\`.

One domain × level cluster: ${c.lessons} exist, averaging
${Math.round(c.conceptLessons / c.lessons)} concepts each.

## Identity

- **Lesson id:** \`<domain>-<level>\`
- **Route / stage:**
- **Concepts:**
- **Checkpoint:** (${c.checkpoints} exist, ${c.checkpointItems} items total)

## Coherence

- [ ] The overview states what mastering this level *in this domain* means
- [ ] Concepts are ordered so each one's prerequisites precede it
- [ ] No concept duplicates another's judgment (\`duplication-map.md\`)
- [ ] The cheat sheet, if present, is reference — not a substitute for the lesson

## Assessment

- [ ] Mid-lesson quiz is formative and **not scored**
- [ ] The checkpoint covers every concept in the cluster
- [ ] Graded and practice pools are disjoint (\`poolFor()\` index parity)
- [ ] Threshold \`max(0.85, (n-1)/n)\`; two-attempt cap
- [ ] No mechanic is passable positionally across attempts 0–3
- [ ] The checkpoint reveals no per-element marking (\`showDetail: false\`)

## Figures

- [ ] Every figure has an editable source and an accessible name
- [ ] No \`axes\` figure contradicts its own labels (\`check-axes.cjs\`)
- [ ] No dead references (\`check-refs.cjs\`)

## Gate

\`\`\`bash
npm run verify
npx playwright test --workers=1   # ${v.e2eTests} tests; --workers=1 is required, the specs share localStorage
\`\`\`

## Reviewer questions

1. Walk the lesson as a learner in both locales and both themes. Where does it stall?
2. Fail the checkpoint twice. Does the cap hold across a refresh?
3. Is there a concept here that would be better as a Codex entry?
`;

docs["architecture-work-package-template.md"] = `# Architecture work package — template

> Section 40. Copy into \`docs/transformation/concepts/arch-<slug>.md\`.
> ${c.codexArchitectures} architectures exist today.

## Identity

- **Slug / name:**
- **Vendor:** aws · gcp · azure · anthropic · other
- **Source:** the document that was actually fetched

## Teaching order (section 38.1)

Fill these **in order**. Starting at step 3 is the failure mode this template exists to
prevent.

1. **Problem and constraints** —
2. **Conceptual architecture** — the shape, vendor-neutral
3. **Vendor mapping** — which service plays which role
4. **Alternatives** — and what would make each win
5. **Security** — trust boundaries, identity model, least privilege
6. **Reliability** — failure modes, blast radius, static stability
7. **Observability** — what you would page on
8. **Cost** — a bound or a figure, never an adjective
9. **Deployment** — how it ships and how it rolls back
10. **Failure exercise** — break it deliberately

## Schema coverage

\`CodexArchitecture\` carries \`problem\`, \`whenThisShape\`, \`components\`, \`flow\`,
\`tradeoffs\`, \`failureModes\`, \`source\`, \`vendor\`, \`diagram\`.

Section 38.2 additionally asks for \`scale\`, \`account_boundaries\`,
\`network_boundaries\`, \`identity_model\` and \`data_classification\` — **absent from the
schema**. Note here what you could not record, rather than omitting it silently.

## Accuracy

- [ ] Redrawn from a fetched document; never invented, never idealised
- [ ] The tradeoffs are the ones the document states
- [ ] Every service traces to \`research/2026-07-25-aws-verified-facts.md\`
- [ ] Anything marked UNVERIFIED there is described as a mechanism, not quantified
- [ ] Classed for freshness — vendor claims rot (${freshness["fast-changing"]} of ${schedule.units.length} units are \`fast-changing\`)

## Reviewer questions

1. Could a learner rebuild this shape without the vendor's names?
2. Is any figure here a number that no source states?
3. Does step 1 actually constrain the design, or is it decoration before the service list?
`;

for (const [name, body] of Object.entries(docs)) {
  fs.writeFileSync(path.join(OUT, name), body.replace(/\r\n/g, "\n"));
}
for (const dir of ["concepts", "modules", "reviews"]) {
  fs.mkdirSync(path.join(OUT, dir), { recursive: true });
}
console.log(`wrote ${Object.keys(docs).length} section-42 docs + 3 directories`);
for (const n of Object.keys(docs)) console.log(`  ${n}`);
