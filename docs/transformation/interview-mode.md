# Interview mode

> Section 35. Generated from `interview-bank.json`.

## Status: a view exists, the product surface does not

`interviewMode.routeExists: false`. There is no
`/interview` route, no interviewer, no follow-up prompts, no rubric.

What does exist is `interview-bank.json`: a generated VIEW over the existing item pool,
proving the tracks can be fed without authoring a second corpus.

| Track | Usable items | Rubric | Follow-ups |
|---|---:|---|---|
| ai-architecture | 50 | **no** | **no** |
| system-design | 116 | **no** | **no** |
| aws-architecture | 63 | **no** | **no** |
| staff-engineer | 157 | **no** | **no** |

Every track reports `hasRubric: false` and `hasFollowUps: false`, and each carries a
`missing` list. Reporting `true` there would have been the lie that matters — a
generated inventory that flatters the platform is worse than no inventory.

## The fifth track is different

Section 35.1 names a **Behavioral Interview** track, and `interview-bank.json` has no
entry for it. That is not an oversight in the inventory: the other four are fed by a view
over existing MCQs and mechanic checks, and a behavioural answer is a story about
something the learner did. There is no item pool to project from, and inventing one would
be fabricating experience — a rule this project holds elsewhere. So the honest state is
four tracks feedable and one that needs a different mechanism entirely.

## Why it is not built

Section 35 wants an interviewer that adds constraints mid-answer, scores against a
per-dimension rubric, and asks follow-ups. All three need free-text understanding, which
needs a model call, which needs a server. This platform is a static export with
0 API calls. Same wall as the Explain stage, and the same decision: ADR-012 rules both out rather than deferring them, because the static deployment is the property being protected.

## What is buildable without a server

- **Constraint escalation on MCQ.** Present a scenario, take a choice, then add a constraint that changes the answer, from authored branches. `SjtResponse.downstream` already models this.
- **Timed mixed sets.** Draw 386 usable items across the 4 tracks, shuffled per attempt with the existing machinery.
- **A self-scored rubric.** Show the dimensions and let the learner grade; honest as a reflection tool, worthless as a measurement, and it must be labelled as such.

## Rule

The bank must stay a **view**. Section 35 requires the same knowledge graph, not a
second corpus — a duplicated item drifts from its original and then two answers disagree.
`tests/inventories.test.ts` asserts every track is fed from existing items.
