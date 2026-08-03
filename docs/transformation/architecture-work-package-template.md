# Architecture work package — template

> Section 40. Copy into `docs/transformation/concepts/arch-<slug>.md`.
> 14 architectures exist today.

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

`CodexArchitecture` carries `problem`, `whenThisShape`, `components`, `flow`,
`tradeoffs`, `failureModes`, `source`, `vendor`, `diagram`.

Section 38.2 additionally asks for `scale`, `account_boundaries`,
`network_boundaries`, `identity_model` and `data_classification` — **absent from the
schema**. Note here what you could not record, rather than omitting it silently.

## Accuracy

- [ ] Redrawn from a fetched document; never invented, never idealised
- [ ] The tradeoffs are the ones the document states
- [ ] Every service traces to `research/2026-07-25-aws-verified-facts.md`
- [ ] Anything marked UNVERIFIED there is described as a mechanism, not quantified
- [ ] Classed for freshness — vendor claims rot (101 of 401 units are `fast-changing`)

## Reviewer questions

1. Could a learner rebuild this shape without the vendor's names?
2. Is any figure here a number that no source states?
3. Does step 1 actually constrain the design, or is it decoration before the service list?
