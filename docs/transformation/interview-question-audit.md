# Interview question audit

> Section 35. Generated from `interview-bank.json`.

## What was audited

4 of the **5** tracks section 35.1 names, fed from the existing pool of
678 items. No new content was authored.

| Track | Usable items | Rubric | Follow-ups | Records what it lacks |
|---|---:|---|---|---|
| ai-architecture | 50 | **no** | **no** | 4 items |
| system-design | 116 | **no** | **no** | 4 items |
| aws-architecture | 63 | **no** | **no** | 4 items |
| staff-engineer | 157 | **no** | **no** | 4 items |

Total usable: 386.

## Findings

**Every track can be fed without duplicating content.** This is the section 35
requirement — the same knowledge graph, not a second corpus — and it holds.
`tests/inventories.test.ts` asserts every track has at least one usable item drawn from
existing ids.

**No track has a rubric or follow-ups.** All 4 report false, and
each carries a non-empty `missing` list. This is the audit's most important output:
`hasRubric: true` would have been trivially easy to emit and would have made the
inventory worthless.

**Track sizes are uneven.** `staff-engineer` has 157 usable items and `ai-architecture` has 50. A timed set drawn uniformly would over-sample the staff track, so any implementation must draw per track rather than from the union.

**Items are reused, not tagged.** No item was authored *as* an interview question, so the
bank is a projection based on domain and mechanic. An item that reads well in a lesson may
read oddly as an interview prompt, and nothing currently detects that.

## What an implementation must not do

- **Do not copy items into an interview file.** A duplicate drifts from its original, and then two answers to the same question disagree.
- **Do not claim a rubric that is self-scored.** A self-graded rubric is a reflection tool; labelling it a measurement is the dishonesty.
- **Do not present the 386 items as interview-calibrated.** They are lesson items filtered by topic.
