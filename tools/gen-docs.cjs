#!/usr/bin/env node
/**
 * Writes the section 28 / 42 design documents, with every count interpolated from
 * docs/transformation/facts.json.
 *
 * WHY GENERATE PROSE
 * Not for the prose — for the numbers. A design document's characteristic failure is a
 * figure that was true when it was typed. This repo has already produced one candidate
 * (290 "definition" items, 273 of which were check imperatives) and two of the counts
 * in facts.json were wrong on their first run: `it(` missed all 87 Playwright tests, and
 * a field named `emptyAxes` actually counted every axes figure. Both would have been
 * quoted as evidence.
 *
 * So the argument, the judgment and the honesty are authored here; the numbers are
 * substituted. `tests/facts.test.ts` then asserts that every number appearing in the
 * generated docs still matches a measurement, so a stale doc fails the build.
 *
 * Run `node tools/gen-facts.cjs` first — this reads its output.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "transformation");
const F = JSON.parse(fs.readFileSync(path.join(OUT, "facts.json"), "utf8"));

const c = F.content;
const lm = F.learningModel;
const v = F.validation;
const vis = F.visual;
const a = F.a11y;
const an = F.analytics;
const r = F.routing;
const g = F.glossary;
const s = F.systems;
/**
 * A newline, as a binding rather than an escape sequence.
 *
 * Joining table rows needs a newline inside a template literal, in a file that is itself
 * edited by scripts — two levels of escaping deep, and the outer level ate the backslash,
 * leaving a real line break inside a JS string and a syntax error. Even the comment
 * explaining it got mangled on the first attempt.
 *
 * Third occurrence of this class here: a two-character escape became a literal backspace
 * in gen-facts.cjs, silently turning a filter into a no-op that reported 12 validators
 * where 11 exist; and a regex died inside a bash heredoc, reporting 0 of 98 glossary
 * candidates. The lesson is not "escape more carefully" — it is to stop needing an
 * escape where a binding will do.
 */
const NL = String.fromCharCode(10);
const interviewTracks = F.systems.interviewMode.tracks;

/** Percentage of the 178 concepts, as a whole number. */
const pct = (n) => Math.round((n / lm.totalConcepts) * 100);
/**
 * How many of the nine stages are complete, partial, or absent — derived, because this
 * sentence was hardcoded as "Five stages are complete. Four are not" and went stale the
 * moment Predict reached 24 and Transfer reached 6.
 */
const stageTally = (() => {
  const vals = Object.values(lm.coverage);
  return {
    full: vals.filter((n) => n === lm.totalConcepts).length,
    partial: vals.filter((n) => n > 0 && n < lm.totalConcepts).length,
    none: vals.filter((n) => n === 0).length,
  };
})();
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

const docs = {};

// ─────────────────────────────────────────────────────────────────────────
docs["target-learning-model.md"] = `# Target learning model

> Section 6 and section 23. Every count comes from \`docs/transformation/facts.json\`
> (\`node tools/gen-facts.cjs\`); \`tests/facts.test.ts\` fails if this document and the
> measurement disagree.

## The claim being made

A learner should not advance by scrolling. Section 23 names six things a session must
contain — prediction, a meaningful decision, immediate feedback, build or inspection,
recall, and transfer — and the honest question is which of them the platform actually
has for each of its ${lm.totalConcepts} concepts.

## The nine stages, measured

| Stage | What it demands of the learner | Concepts with it | Coverage |
|---|---|---:|---:|
| **Predict** | Commit to an answer before the teaching | ${lm.coverage.predict} | ${pct(lm.coverage.predict)}% |
| **Read** | Take in the explanation | ${lm.coverage.read} | ${pct(lm.coverage.read)}% |
| **See** | Read a figure, widget or architecture | ${lm.coverage.see} | ${pct(lm.coverage.see)}% |
| **Worked example** | Follow one concrete case end to end | ${lm.coverage.worked} | ${pct(lm.coverage.worked)}% |
| **Practice** | Answer a scored check with feedback | ${lm.coverage.practice} | ${pct(lm.coverage.practice)}% |
| **Recall** | Retrieve from memory, unprompted | ${lm.coverage.recall} | ${pct(lm.coverage.recall)}% |
| **Build** | Construct the thing, not pick it | ${lm.coverage.build} | ${pct(lm.coverage.build)}% |
| **Explain** | Articulate it in their own words | ${lm.coverage.explain} | ${pct(lm.coverage.explain)}% |
| **Transfer** | Apply it in a second, unlike context | ${lm.coverage.transfer} | ${pct(lm.coverage.transfer)}% |

${stageTally.full} stages cover every concept, ${stageTally.partial} ${stageTally.partial === 1 ? "is" : "are"} partial, and ${stageTally.none} ${stageTally.none === 1 ? "does" : "do"} not exist. The gaps are the useful part of this table.

### Predict — ${lm.coverage.predict} of ${lm.totalConcepts}

The pedagogy audit found this missing platform-wide: \`grep -rn predict src/\` returned
two unrelated hits. The concept pane opened by naming the judgment, then showed the
figure, then explained — so the learner was told the answer before ever committing to
one. No commitment means no generation effect and no productive failure.

\`ConceptPredict\` and \`Predict.tsx\` now exist and gate the entire remainder of the pane
until a choice is made. It is deliberately **unscored and skippable**: attaching a score
to a guess made before the teaching punishes the learner for not yet knowing, which is
the whole reason for asking.

${lm.coverage.predict} concepts have one. This is a content gap, not an engine gap.

### Build — ${lm.coverage.build} of ${lm.totalConcepts}

\`BuildChallenge\` grades a constructed graph — required components present, required
edges present, known anti-pattern edges absent — with partial credit. The mechanism is
real and \`/build\` serves it.

${c.builds} challenges exist. Two consequences follow, and only the first is obvious:
most concepts have no constructive check, and the pool is too small for graded and
practice sets to be disjoint the way \`poolFor()\` splits the ${c.checks} checks.

### Explain — ${lm.coverage.explain} of ${lm.totalConcepts}

There is no free-text surface at all, and this is the one gap that cannot be closed with
content alone.

The reason it is still open: a self-graded text box is a checkbox, and an LLM-graded one
needs a server. This platform is a static export with \`localStorage\`-only persistence
and no API routes (\`fetchCallsToApi: ${an.fetchCallsToApi}\`), so grading free text would
mean either shipping a key to the browser or abandoning the deployment model. The
honest position is that Explain is unbuilt, not that flashcards cover it.

### Transfer — ${lm.coverage.transfer} of ${lm.totalConcepts}

Transfer means the same judgment applied in a context the learner has not seen. The
\`leansOn\` edges are the seam it is built on: a cross-route dependency is exactly a
second, unlike context for the concept it points at, and the corpus already records
${c.leansOnEdges} of them.

${lm.coverage.transfer} concepts now carry a transfer item — a systems concept assessed
in an AI scenario. \`backpressure-flow-control\` is asked about a saturating inference
endpoint, \`delivery-semantics-idempotency\` about an agent retrying a tool call,
\`caching-strategies\` about which part of an LLM request may be cached. Each lands in
the GRADED pool, so clearing the checkpoint requires the transfer rather than rewarding it.

The measurement was the hard part. Six such items shipped before the schema had a
\`transferTo\` field, and this document correctly reported zero — nothing distinguished
them from an ordinary check, so no gate could count them. \`merge-checks.cjs\` now
requires that the named domain have an authored \`leansOn\` relationship with the
concept, which stops the field from becoming a label meaning "this feels cross-domain".

Remaining: ${lm.totalConcepts - lm.coverage.transfer} concepts. The ceiling is the edge
count, not effort — a concept with no cross-domain relationship has no second context to
be assessed in, and inventing one would be the unfounded claim the validator now rejects.

## What holds the model up

- **${c.checks} checks across ${Object.keys(c.checksByKind).length} mechanics** — ${Object.entries(c.checksByKind).map(([k, n]) => `${n} ${k}`).join(", ")}. All four are display-shuffled per attempt, so no mechanic is passable positionally.
- **${c.checkpoints} checkpoints, ${c.checkpointItems} items** — the graded gate at the end of each domain×level cluster, capped at two attempts and threshold \`max(0.85, (n-1)/n)\`.
- **${c.midQuizItems} mid-lesson items** — formative, never scored, by design.
- **${c.conceptsWithFlashcards} concepts with flashcards** — the Recall stage.
- **${c.prerequisiteEdges} within-domain prerequisite edges** gate the daily brief; **${c.leansOnEdges} cross-route \`leansOn\` edges** are advisory and never gate, so an AI learner is not forced through the systems domain.

## Why formative and graded are separated

A learner who has seen the answer has not been assessed. Three mechanisms enforce this:

1. \`poolFor(slug, want)\` splits the ${c.checks} authored checks by index parity — even is practice, odd is graded — so the two pools are disjoint. Overlap went from 94.3% to 0%.
2. \`showDetail\` gates per-element marking, partial score AND the explanation. A graded surface reveals nothing except the total.
3. The attempt number is folded into the shuffle key and persisted in \`Progress\`, so a retry is a different arrangement. Before this, a failed attempt revealed the key and the retry replayed the identical order — a Mastermind oracle.

## Ordering

Predict → See → Read → Worked example → Practice → Recall, then Build where one exists,
with the checkpoint as the gate. Predict comes first because a commitment made after the
explanation is not a prediction. \`ConceptPane.tsx\` enforces this structurally: the
remainder of the pane is wrapped in \`{!predictOpen && (…)}\`, so the teaching is
unreachable until the learner commits or explicitly skips.
`;

// ─────────────────────────────────────────────────────────────────────────
docs["validation-report.md"] = `# Validation report

> Sections 23, 24 and 41. Generated from \`facts.json\`.

## What runs

\`npm run verify\` is ${v.verifySteps} steps: typecheck, lint, ${v.contentValidators} content
validators, ${v.selfTests} gate self-tests, the inventory generators, and ${v.unitTests}
unit tests across ${v.unitTestFiles} files. Playwright adds ${v.e2eTests} browser tests
across ${v.e2eSpecFiles} spec files.

| Layer | Count | What it can catch |
|---|---:|---|
| Content validators | ${v.contentValidators} | Duplicate ids, broken concept links, prerequisite cycles, missing translations, dead asset refs, uncovered domain×mechanic cells, contradictory axes figures, untraceable figures, prose defects, banned terminology |
| Gate self-tests | ${v.selfTests} | Whether the validators above actually fail on the defects they exist for |
| Unit tests | ${v.unitTests} | Route independence, check integrity, exploit families, scoring, a11y source properties, inventory agreement, glossary/doc drift |
| Playwright | ${v.e2eTests} | What a learner can actually see and reach in a browser |

## The self-tests are the load-bearing part

A validator nobody attacks is a validator nobody should trust. Every gate in this repo
was wrong at least once, and reading its output would not have revealed it:

- A duplicate detector reported **595 false pairs** because it compared \`title + summary\`, which for a checkpoint are strings the build script generates. Real count after comparing authored prose with a 12-token floor: **1**.
- An untranslated-Spanish detector had no working threshold. "No diacritics past 40 words" missed a 35-word untranslated paragraph; tightening to 25 words fired on 10 pieces of correct Spanish, because authored Spanish runs to 52 accent-free words. Replaced with a measured English-minus-Spanish function-word skew.
- Scoring N/A as 0 manufactured **435 fake audit failures**, burying the actual finding that the ${lm.totalConcepts} teaching concepts have no zeros.
- A "purpose clarity" dimension measured punctuation — it awarded 3 for ending in "?" — and all ${lm.totalConcepts} concepts do, so all ${lm.totalConcepts} scored 4.
- "Technical grounding" ranked URLs above precise book citations, which is backwards.
- An attack script reported all 94 order checks broken by "sort ascending". That sorts the array of *authored* indices, which trivially yields \`[0..n-1]\`; a learner cannot execute it, because the index is a React key and never reaches the DOM.
- Three tests passed against a **fully restored defect**, because each rebuilt the thing it should have observed.
- A rule scanning raw source flagged its own explanatory comment. Twice.
- \`it(\` counted **${v.e2eTests > 0 ? 0 : "n/a"} of ${v.e2eTests}** Playwright tests, because Playwright uses \`test(\`.

Every one of those was found by attacking the gate, never by reading its output. That is
why \`gates:selftest\` runs in \`verify\`.

## Ratchet baselines

${v.baselineFiles} baseline files: ${v.baselineNames.map((n) => `\`${n}\``).join(", ")}.

A listed item warns; an unlisted item fails. **The lists may only shrink.** Adding a
line to make a build pass is forbidden — it converts a defect into a permission.

## Bilingual integrity

${F.i18n.en} English and ${F.i18n.es} Spanish strings: exactly equal, and
**${F.i18n.emptyProse} empty prose fields**. The ${F.i18n.emptyStructural} empty strings
that do exist are positional slots — a cloze sentence that opens with a blank, and one
deliberate \`kind: "none"\` figure opt-out — not missing translations. The naive count
reports 7 and would have been quoted as a translation gap.

Terminology: ${g.terms} glossary terms, ${g.bans} banned renderings checked against
every Spanish string on each build.

## What is not covered

- **No visual regression baseline.** Playwright asserts structure and reachability, not pixels. A layout regression that keeps the DOM intact passes.
- **No performance budget in CI.** \`${vis.publicAssets}\` public assets total ${mb(vis.publicBytes)} MB; nothing fails when that grows.
- **No analytics to validate against.** ${an.trackingCalls} tracking calls, so no funnel or drop-off can be measured. See \`analytics-plan.md\`.
- **Spanish prose is machine-checked, not human-certified.** Two Spanish regressions were introduced and caught during this transformation.
`;

// ─────────────────────────────────────────────────────────────────────────
docs["analytics-plan.md"] = `# Analytics plan

> Section 21. Generated from \`facts.json\`.

## Current state: nothing is instrumented

**${an.trackingCalls} tracking calls.** No gtag, no PostHog, no Plausible, no Mixpanel,
no Amplitude. ${an.fetchCallsToApi} fetches to an API route, because there are none.

This is a deliberate consequence of the deployment model, not an oversight:
\`output: "export"\`${r.staticExport ? "" : " (NOT SET — check next.config)"} with
\`localStorage\`-only persistence and no auth. There is no server to receive an event.

So this document plans instrumentation; it does not report on any.

## What the platform already knows locally

\`Progress\` has ${an.progressFields} fields in a single \`localStorage\` key
(\`${an.localStorageKeys.join("`, `") || "levelup.v1"}\` plus the theme key). Every
question below is answerable from data already on the learner's device:

| Question | Field it comes from |
|---|---|
| Which concepts were read but never checked? | \`conceptsRead\` minus \`responseLog\` |
| Where does a checkpoint get failed twice and abandoned? | \`checkpointAttempts\` at the cap with no clear |
| Which checks are answered wrong most? | \`responseLog\` |
| Is the streak real or a single long session? | \`streak.days\`, \`dailyLog\` |
| Which concepts get skipped? | \`skipped\` |
| Is confidence calibrated? | \`responseLog\` confidence vs correctness |

## The plan

**Phase 1 — local-only, no network.** Derive the above on-device and show it to the
learner on \`/me\`. No consent needed, nothing leaves the browser, and it answers the
questions that change the content. This is the phase worth doing, and it needs no
backend.

**Phase 2 — aggregate, opt-in.** If cohort data is ever needed, a single endpoint
receiving a coarse daily rollup — concepts completed, checkpoints attempted, no item
ids, no free text. Opt-in, off by default, and it breaks the static-export model, which
is the cost to weigh.

## Events, if phase 2 happens

| Event | Properties | Question it answers |
|---|---|---|
| \`concept_opened\` | route, stage, concept | Which stages are entered and abandoned |
| \`predict_committed\` | concept, correct | Does committing first change downstream accuracy |
| \`check_answered\` | mechanic, correct, attempt | Which of the ${Object.keys(c.checksByKind).length} mechanics teaches best |
| \`checkpoint_attempted\` | id, score, attempt | Where the ${c.checkpoints} gates are too hard |
| \`route_chosen\` | ${r.routeIds.filter((x) => x.includes("-")).join(", ")} | Whether the split matches demand |
| \`session_ended\` | duration, stages completed | Whether a session contains a decision |

## Rules

- **No PII, ever.** No email, no name, no free text. The platform has no accounts, so there is nothing to leak.
- **A metric that cannot change a decision is not collected.** Page views on \`/method\` change nothing.
- **Local first.** If a question is answerable on-device, it is not sent.
- **The learner can see and delete everything.** \`BackupPanel\` already exports and clears the full \`Progress\` object.
`;

// ─────────────────────────────────────────────────────────────────────────
docs["accessibility-audit.md"] = `# Accessibility audit

> Section 22. Generated from \`facts.json\`. WCAG 2.2 AA is the target.

## What was measured

${a.tsxFiles} TSX files, ${a.cssFiles} stylesheets, both themes (Studio and Pixel),
both locales.

| Signal | Count |
|---|---:|
| Files using \`aria-label\` | ${a.withAriaLabel} |
| Files using an explicit \`role\` | ${a.withRole} |
| \`<img>\`/\`<Image>\` with \`alt\` | ${a.imagesWithAlt} of ${a.imagesTotal} |
| Files honouring reduced motion | ${a.prefersReducedMotion} |
| Authored figures with an accessible name | ${vis.figures - vis.withoutCaption} of ${vis.figures} |

\`${a.imagesWithAlt}/${a.imagesTotal}\` images carry alt text. The number is small
because the platform draws its ${vis.figures} figures as authored SVG through
\`Schematic.tsx\` rather than shipping raster images — which is also why every figure has
a caption that serves as its accessible name.

## Defects found and fixed

- **WCAG 1.4.1 (use of colour) on 3 graded surfaces.** Correctness was conveyed by colour alone. Now every state carries a text or shape cue as well.
- **WCAG 2.5.8 (target size) on 3 nav controls.** 40 px, below the 44 px minimum. Raised.
- **A trapped learner.** A Playwright failure dismissed as pre-existing turned out to be a state with no way forward — and an unreachable mobile menu was the other. \`git stash\` answers "did I cause it", not "is it a bug".
- **Contrast in dark mode.** White text on a light token, on the surfaces where the two themes disagree about which token is the background.

## Structural guarantees

- \`tests/a11y-source.test.ts\` asserts source-level properties, so a regression is a build failure rather than a discovery.
- Every check mechanic is operable by keyboard, and grading is on the resulting state, not the gesture. Architecture Builder accepts drag, tap-to-place or keyboard — it grades the graph.
- ${a.prefersReducedMotion} files respect \`prefers-reduced-motion\`.
- \`HtmlLang.tsx\` sets \`lang\` per locale, so a screen reader pronounces Spanish as Spanish.
- The two themes share information and hierarchy; the visual mode never changes the pedagogy.

## Known gaps

- **No screen-reader pass.** The audit is static analysis plus keyboard testing. NVDA and VoiceOver have not been run, so the reading ORDER of a complex figure is unverified.
- **No automated axe run in CI.** Worth adding; not present.
- **Interactive widgets (${vis.interactiveWidgets}) are keyboard-operable but not individually audited** for focus order.
- **Colour-contrast ratios are not computed in CI.** The dark-mode defects above were found by looking.
`;

// ─────────────────────────────────────────────────────────────────────────
docs["visual-asset-audit.md"] = `# Visual asset audit

> Sections 12 and 36. Generated from \`facts.json\`.

## Inventory

${vis.figures} authored figures, ${vis.interactiveWidgets} interactive widgets,
${vis.publicAssets} static assets at ${mb(vis.publicBytes)} MB.

| Figure kind | Count | What it is for |
|---|---:|---|
${Object.entries(vis.byKind).sort((x, y) => y[1] - x[1]).map(([k, n]) => `| \`${k}\` | ${n} | ${({ flow: "A sequence or pipeline", compare: "Two options side by side", stack: "Layers, bottom-up", axes: "A positioning judgment on two dimensions", none: "Deliberate opt-out — the concept teaches through a widget" })[k] || ""} |`).join("\n")}

Static assets: ${Object.entries(vis.publicByExt).map(([e, n]) => `${n} \`${e}\``).join(", ")}.
${vis.conceptsUsingWidget} of ${lm.totalConcepts} concepts reference an interactive widget.

## Every figure has an editable source

Section 36.5 forbids storing only a rendered PNG. All ${vis.figures} figures are either
authored JSON rendered by \`Schematic.tsx\` or a React component — both diffable and
reviewable. There is no figure whose source is an image.

That is also what made the defects below findable.

## Defects found and fixed

- **7 empty \`axes\` figures.** Rendered as a labelled but empty plot: two axes, no points. A learner saw a frame with nothing in it.
- **3 more \`axes\` figures whose node order contradicted their own axis labels.** \`check-axes.cjs\` now scores node ordering against the axis poles by word overlap, so an inverted figure fails the build. One (\`compute-selection-as-a-tradeoff\`) was pre-existing.
- **16 dead diagram references.** Pointing at registry keys that no longer existed.
- **A missing hero image** (\`/hero/codex.webp\`) and a **missing OG card** (\`domain-cloud-platform.png\`), both referenced by shipped pages.
- **6 fabricated figures** — plausible-looking numbers with no source. Removed rather than re-sourced.

## Rules in force

- Every figure needs a purpose; a decorative figure is deleted, not captioned.
- Every figure needs an accessible name — ${vis.figures - vis.withoutCaption} of ${vis.figures} have one, and the ${vis.withoutCaption} that does not is the deliberate \`kind: "none"\` opt-out.
- **No critical information exists only inside an image.** This is why the figures are authored data: the text is in the DOM.
- Both themes share information and hierarchy.
- Lazy loading without layout shift; assets optimised (${Object.keys(vis.publicByExt).includes(".webp") ? "WebP is the default format" : "no WebP"}).
- A boss image is never a substitute for showing progress.

## Known gaps

- **No visual regression baseline.** ${v.e2eTests} Playwright tests assert structure; none compare pixels. A CSS regression that preserves the DOM passes.
- **No CI size budget.** ${mb(vis.publicBytes)} MB across ${vis.publicAssets} assets, and nothing fails if it doubles.
- **${vis.byKind.axes || 0} axes figures are the fragile kind.** They encode a judgment in geometry, which is why they were the ones found broken. \`check-axes.cjs\` covers contradiction, not subtlety.
`;

// ─────────────────────────────────────────────────────────────────────────
docs["migration-map.md"] = `# Migration map

> Section 20. Generated from \`facts.json\`.

## Shape of the change

The transformation adds a route layer on top of an existing spine. It does not move
content between files, and it does not rename a slug — so there is no data migration and
no redirect table. \`hasRedirects: ${r.hasRedirects}\` in \`${r.configFile}\`, and that is
correct rather than a gap.

${r.pageRoutes} page routes ship. \`trailingSlash: ${r.trailingSlash}\` with
\`output: "export"\`, so every URL is a directory with an \`index.html\`.

## What changed, and what a returning learner sees

| Change | Learner-visible effect | Their stored progress |
|---|---|---|
| Route model (${r.routeIds.filter((x) => x.includes("-")).length} routes, ${r.stageCount} stages) | A new picker at \`/learn\`; the old ladder still resolves | Untouched — routes read existing \`checkpointsCleared\` |
| \`poolFor()\` graded/practice split | Practice checks differ from checkpoint checks | Untouched; past scores stay valid |
| Per-attempt display shuffle | A retry shows a different arrangement | \`checkpointAttempts\` is a new field, absent = 0 |
| \`showDetail\` gating | Graded surfaces no longer reveal per-element marks | No effect |
| Attempt cap persisted | F5 no longer resets the cap | New field; a learner mid-checkpoint starts at 0 attempts |
| \`leansOn\` (${c.leansOnEdges} edges) | Foundations surface where a concept needs them | Advisory only, never gates |
| Predict step (${lm.coverage.predict} concepts) | A commitment before the teaching | Unscored, so nothing to store |

## Backward compatibility of stored progress

One \`localStorage\` key, ${an.progressFields} fields. Every field added by this
transformation is optional and defaults to empty, so a learner returning with an old
\`Progress\` object loses nothing. \`tests/backup.test.ts\` covers the round trip.

The one behavioural change worth naming: **the attempt cap now survives a refresh.** A
learner who had been re-rolling a checkpoint by pressing F5 can no longer do that. That
is the defect being fixed, and it will read as a restriction.

## Rollback

Every change is additive. \`ROUTES_ENABLED\` in \`src/lib/flags.ts\` turns the route shell
off and restores the previous \`/learn\`, without touching content or stored progress.
Content changes are in \`src/content/data/*.json\` and revert with git; no schema
migration has to be undone.

## Not migrated

- **${lm.totalConcepts - lm.coverage.predict} concepts have no Predict step** and ${lm.totalConcepts - lm.coverage.build} have no Build challenge. The engines exist; the content does not.
- **Explain and Transfer do not exist** — see \`target-learning-model.md\`.
- **No analytics migration**, because there is no analytics.
`;

// ─────────────────────────────────────────────────────────────────────────
docs["STATUS.md"] = `# Transformation status

> Section 28 dashboard. GENERATED from \`facts.json\` — every count below is measured,
> and \`tests/facts.test.ts\` fails if this file and the measurement disagree.
>
> The previous version was hand-written and said "the route model is designed but not
> built" for four commits after it shipped, with metrics from three commits earlier. That
> is the failure mode a dashboard has, so this one is derived.

## Current phase

The audit, the target IA, the route model, the validation suite and the section 28/42
document set are all built. What remains is content depth, not structure — see
**Next reviewable step**.

## Learning model: ${stageTally.full} stages complete, ${stageTally.partial} partial, ${stageTally.none} absent

| Stage | Concepts | Coverage |
|---|---:|---:|
${Object.entries(lm.coverage).map(([k, n]) => `| ${k === "worked" ? "worked example" : k} | ${n} | ${pct(n)}% |`).join(NL)}

Explain is the absent one, and it is blocked by the deployment model rather than by
effort: free-text grading needs a server, and this is a static export with
${an.fetchCallsToApi} API routes.

## Content

- **${c.spineConcepts} spine concepts** across ${c.domains} domains, L3–L7
- **${c.checks} checks** in ${Object.keys(c.checksByKind).length} mechanics — ${Object.entries(c.checksByKind).map(([k, n]) => `${n} ${k}`).join(", ")}
- **${c.checkpoints} checkpoints, ${c.checkpointItems} items**; ${c.midQuizItems} formative mid-lesson items
- **${c.codexEntries} Codex entries** in ${c.codexClusters} clusters, ${c.codexArchitectures} reference architectures
- **${c.builds} build challenges**, **${lm.coverage.predict} predict steps**, **${lm.coverage.transfer} transfer items**
- **${vis.figures} authored figures** + ${vis.interactiveWidgets} interactive widgets
- **${c.prerequisiteEdges} within-domain prerequisite edges** (hard gate) + **${c.leansOnEdges} cross-route \`leansOn\` edges** (advisory)

## Bilingual

${F.i18n.en} English and ${F.i18n.es} Spanish strings — equal, with
**${F.i18n.emptyProse} empty prose fields**. The ${F.i18n.emptyStructural} empty strings
are positional slots, not missing translations.

Glossary: **${g.terms} terms** (${g.kept} kept in English, ${g.localized} localized),
${g.bans} banned renderings enforced on every build, ${g.withNote} carrying a written
note where the decision contradicts its own measurement.

## Verification

- **${v.contentValidators} content validators** in \`npm run verify\` (${v.contentCheckSteps} chain steps; one is a generator, not a gate)
- **${v.selfTests} gate self-tests** — they attack the validators, which is where four of my own wrong rules were found
- **${v.unitTests} unit tests** across ${v.unitTestFiles} files
- **${v.e2eTests} Playwright tests** across ${v.e2eSpecFiles} spec files
- ${v.baselineFiles} ratchet baselines: ${v.baselineNames.map((n) => `\`${n}\``).join(", ")} — they may only shrink

## Systems section 33-38 specifies

| System | State |
|---|---|
| Spaced review | Built — ${s.spacedReview.intervals.length}-rung ladder, ${s.spacedReview.grades.length} grades, pure module |
| Review queue | **${s.reviewQueue.sourcesImplemented} of ${s.reviewQueue.sourcesSpecified} sources** |
| Confidence | Captured and used for the band cap; **not read by the scheduler** |
| Saved content | **Absent** (section 33.1) |
| Interview mode | A generated view over ${interviewTracks} tracks; **no product surface** |
| Analytics | **${an.trackingCalls} tracking calls** |

## Risks

1. **No visual regression baseline.** ${v.e2eTests} browser tests assert structure, not pixels. A CSS regression that keeps the DOM intact passes everything. Highest residual risk.
2. **A gate that fires on correct content trains people to bypass it.** Several of mine did during this work — most recently a glossary that banned ${"`rendimiento`"} (meaning *performance*) as a calque of throughput. Every gate now ships with correct-content fixtures. Managed, not closed.
3. **The ratchets can be gamed by adding baseline lines.** None was added in this work; content was fixed instead, and one line was deleted when a figure became traceable.
4. **${lm.totalConcepts - lm.coverage.predict} concepts have no Predict step and ${lm.totalConcepts - lm.coverage.build} have no Build challenge.** The engines exist; the content does not.
5. **No telemetry**, so no claim about learner behaviour in any of these documents has been validated against a learner.

## Next reviewable step

Extend Predict and Build to the Staff Engineer route, the way the AI route was done: the
engines and the validating merge tools now exist, so each concept is an additive,
independently shippable patch. Then wire wrong-with-high-confidence into the review queue
— the data is already in \`responseLog\`, which makes it the cheapest of the
${s.reviewQueue.sourcesSpecified - s.reviewQueue.sourcesImplemented} unbuilt queue sources.
`;

docs["rollout-plan.md"] = `# Rollout plan

> Section 20. Generated from \`facts.json\`.

## Deployment reality

Static export, ${r.pageRoutes} page routes, no server, no auth, no database. A release is
a directory of files behind a CDN. That constrains the rollout in a way worth stating
plainly: **there is no server-side flag, no cohort split, and no way to serve two
versions to two learners.** Anything resembling a canary has to be client-side.

**The owner deploys.** This repo prepares code and a runbook; it does not push.

## Gate before any deploy

\`\`\`bash
npm run verify        # ${v.verifySteps} steps: typecheck, lint, ${v.contentValidators} validators, ${v.selfTests} self-tests, ${v.unitTests} tests
npx playwright test --workers=1   # ${v.e2eTests} browser tests
npm run build         # must produce the full page set
\`\`\`

All three must pass. \`--workers=1\` is not optional: the specs share \`localStorage\`
state.

## Sequence

**Stage 1 — behind the flag.** \`ROUTES_ENABLED = false\` ships the content and engine
changes with the old \`/learn\`. Everything except the route shell is live and reversible
by a git revert.

**Stage 2 — flag on.** One line in \`src/lib/flags.ts\`. The route picker appears; no
stored progress changes meaning.

**Stage 3 — content depth.** The gaps in \`target-learning-model.md\`:
${lm.totalConcepts - lm.coverage.predict} concepts still need a Predict step,
${lm.totalConcepts - lm.coverage.build} need a Build challenge. Each is additive and
independently shippable.

## Rollback

| Failure | Action | Cost |
|---|---|---|
| Route shell is wrong | \`ROUTES_ENABLED = false\` | One line, one deploy |
| A content defect | Revert the JSON commit | Content only; progress untouched |
| A check is unfair | Revert; \`checkpointScores\` keeps prior clears | No learner loses a clear |
| Total | Redeploy the previous export | Full, because a release is just files |

Every stored-progress field added is optional, so no rollback needs a data migration.

## Risks

- **No visual regression baseline.** A CSS regression that keeps the DOM intact passes all ${v.e2eTests} browser tests. Highest residual risk.
- **No telemetry.** With ${an.trackingCalls} tracking calls, a rollout is judged by looking. If the route split confuses learners, nothing reports it.
- **The attempt cap will read as a restriction** to anyone who had been refreshing to re-roll a checkpoint.
- **${mb(vis.publicBytes)} MB of assets** with no CI budget.

## After the deploy

Walk the ${r.routeIds.filter((x) => x.includes("-")).length} routes in both locales and
both themes; clear one checkpoint; fail one twice and confirm the cap holds across a
refresh; open \`/build\` and confirm the answer key is not printed. Those are the four
defects that were most expensive to find, so they are the four worth re-checking by hand.
`;

// ─────────────────────────────────────────────────────────────────────────
for (const [name, body] of Object.entries(docs)) {
  fs.writeFileSync(path.join(OUT, name), body.replace(/\r\n/g, "\n"));
}
console.log(`wrote ${Object.keys(docs).length} docs to docs/transformation/:`);
for (const n of Object.keys(docs)) console.log(`  ${n}`);
