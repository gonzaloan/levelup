# Validation report

> Sections 23, 24 and 41. Generated from `facts.json`.

## What runs

`npm run verify` is 6 steps: typecheck, lint, 10 content
validators, 3 gate self-tests, the inventory generators, and 334
unit tests across 30 files. Playwright adds 87 browser tests
across 19 spec files.

| Layer | Count | What it can catch |
|---|---:|---|
| Content validators | 10 | Duplicate ids, broken concept links, prerequisite cycles, missing translations, dead asset refs, uncovered domain×mechanic cells, contradictory axes figures, untraceable figures, prose defects, banned terminology |
| Gate self-tests | 3 | Whether the validators above actually fail on the defects they exist for |
| Unit tests | 334 | Route independence, check integrity, exploit families, scoring, a11y source properties, inventory agreement, glossary/doc drift |
| Playwright | 87 | What a learner can actually see and reach in a browser |

## The self-tests are the load-bearing part

A validator nobody attacks is a validator nobody should trust. Every gate in this repo
was wrong at least once, and reading its output would not have revealed it:

- A duplicate detector reported **595 false pairs** because it compared `title + summary`, which for a checkpoint are strings the build script generates. Real count after comparing authored prose with a 12-token floor: **1**.
- An untranslated-Spanish detector had no working threshold. "No diacritics past 40 words" missed a 35-word untranslated paragraph; tightening to 25 words fired on 10 pieces of correct Spanish, because authored Spanish runs to 52 accent-free words. Replaced with a measured English-minus-Spanish function-word skew.
- Scoring N/A as 0 manufactured **435 fake audit failures**, burying the actual finding that the 178 teaching concepts have no zeros.
- A "purpose clarity" dimension measured punctuation — it awarded 3 for ending in "?" — and all 178 concepts do, so all 178 scored 4.
- "Technical grounding" ranked URLs above precise book citations, which is backwards.
- An attack script reported all 94 order checks broken by "sort ascending". That sorts the array of *authored* indices, which trivially yields `[0..n-1]`; a learner cannot execute it, because the index is a React key and never reaches the DOM.
- Three tests passed against a **fully restored defect**, because each rebuilt the thing it should have observed.
- A rule scanning raw source flagged its own explanatory comment. Twice.
- `it(` counted **0 of 87** Playwright tests, because Playwright uses `test(`.

Every one of those was found by attacking the gate, never by reading its output. That is
why `gates:selftest` runs in `verify`.

## Ratchet baselines

5 baseline files: `coverage-baseline.json`, `glossary-baseline.txt`, `match-spare-baseline.txt`, `prose-baseline.txt`, `trace-baseline.txt`.

A listed item warns; an unlisted item fails. **The lists may only shrink.** Adding a
line to make a build pass is forbidden — it converts a defect into a permission.

## Bilingual integrity

19458 English and 19458 Spanish strings: exactly equal, and
**0 empty prose fields**. The 7 empty strings
that do exist are positional slots — a cloze sentence that opens with a blank, and one
deliberate `kind: "none"` figure opt-out — not missing translations. The naive count
reports 7 and would have been quoted as a translation gap.

Terminology: 128 glossary terms, 82 banned renderings checked against
every Spanish string on each build.

## What is not covered

- **No visual regression baseline.** Playwright asserts structure and reachability, not pixels. A layout regression that keeps the DOM intact passes.
- **No performance budget in CI.** `55` public assets total 4.1 MB; nothing fails when that grows.
- **No analytics to validate against.** 0 tracking calls, so no funnel or drop-off can be measured. See `analytics-plan.md`.
- **Spanish prose is machine-checked, not human-certified.** Two Spanish regressions were introduced and caught during this transformation.
