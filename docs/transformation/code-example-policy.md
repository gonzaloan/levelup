# Code example policy

> Section 37. Generated from `code-example-inventory.json`.

## Inventory

110 snippets, on 110 of 178
concepts (62%).

Languages: c, diff, hcl, http, java, javascript, json, markdown, promql, protobuf, python, sql, text, typescript, yaml.

That 38% of concepts have **no** code is
the policy working. Section 37 is explicit: do not add snippets to look deep.

## Code earns its place when

It shows an API contract, makes a failure mode visible, lets two alternatives be
compared, demonstrates observability, implements a concrete piece of the architecture,
runs a lab, illustrates a security boundary, demonstrates retries / idempotency /
validation, or connects theory to production behaviour.

## Prefer a diagram or pseudocode when

The language distracts, the concept is framework-independent, the snippet would be long,
the implementation changes fast, or the learning is architectural rather than syntactic.

Most of this corpus is architectural, which is why 377 figures outnumber
110 snippets nearly 3:1.

## Enforced rules

- **No credentials, ever.** `mentionsSecret` must be false for every snippet — an error, not a metric, and `tests/inventories.test.ts` fails the build on one.
- **Every snippet declares a language.** 110 of 110 do.
- **Code is shared, not translated.** `code.snippet` has no `en`/`es` split: identifiers and keywords stay as written, because the code is the artifact under discussion. Only `caption` and per-line `annotations` are localized. This is the one deliberate exception to the bilingual rule, recorded in `terminology-policy.md`.
- **Annotations point at lines.** 110 snippets carry per-line notes.

## Gaps against section 37.3

The spec's `code_example` anatomy asks for `runtime`, `dependencies`, `setup`,
`expected_output` and `failure_variant`. `ConceptCode` has `lang`, `snippet`,
`caption` and `annotations` — so **12 of its 16 fields are absent**.

The consequence is concrete: no snippet here is runnable as shipped. They are read, not
executed. Adding `expected_output` and a `failure_variant` would be the highest-value
change, because a snippet whose broken variant is shown teaches a failure mode rather
than describing one.
