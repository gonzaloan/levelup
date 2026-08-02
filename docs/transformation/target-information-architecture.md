# Target information architecture

> Phase 3 deliverable. Derived from the Phase 1 inventory (470 units) and the
> Phase 2 audit, not from the transformation prompt's suggested shape taken on
> faith. Where the prompt's proposal does not fit what the content actually is,
> the deviation is stated and argued.

## The problem this IA solves

The audit's largest structural finding, restated precisely:

**`curriculum.json` uses one axis, L3 to L7, for seven domains that mean
different things by it.**

For `ai-engineering`, L5 means *technical depth in AI systems*. For
`leveling-scope` and `direction-influence`, L5 means *organizational scope and
seniority*. The Climb engine (`src/lib/climb.ts`) then gates ascent on clearing 4
of 7 domain checkpoints at a level — so a learner cannot reach "L6 AI" without
also demonstrating L5-band *influence*, and cannot progress in *influence* without
L5-band *storage engines*.

That is precisely what section 2.1 forbids. A person can be a Staff Engineer and
a beginner at RAG. A person can design excellent AI systems without Principal
scope. The current model asserts these move together, and the ascent gate
enforces it.

Everything below follows from separating those two things.

## The two routes, and the third thing that is not a route

### Route A — AI Architect (technical capability)

Progression represents **what you can build and diagnose**. Nothing about
headcount, scope or title.

| Stage | Name | The capability that defines it |
|---|---|---|
| A1 | Foundations | Model behavior is probabilistic; prompts and structured outputs; context limits; success criteria; first evals; basic risks. |
| A2 | Production AI | Eval-driven development; design a RAG system; tool calling; cost and latency budgets; tracing; fallbacks; operate a live AI feature. |
| A3 | AI Systems | Agent loops; tool orchestration; MCP; memory; advanced retrieval; fine-tuning decisions; safety and security; multi-step reliability. |
| A4 | AI Platform | Shared AI services; model gateways; routing; observability platform; eval infrastructure; governance; unit economics; tenant isolation; enablement. |
| A5 | AI Strategy | Model portfolio; build versus buy; portability; capability roadmap; org-wide eval standards; risk and governance strategy; investment tradeoffs. |

### Route B — Staff Engineer (scope, influence, leverage)

Progression represents **how far your effect reaches**. Nothing about which
technologies you know.

| Stage | Name | The scope that defines it |
|---|---|---|
| S1 | Developing Engineer | Local ownership; reliable execution; technical fundamentals; communication inside the team. |
| S2 | Senior Engineer | Owns features and systems; states tradeoffs; delivers; mentors locally; coordinates within a team. |
| S3 | Staff Threshold | Ambiguous problems; influence across teams; architecture judgment; leverage; direction without authority. |
| S4 | Staff Engineer | Multi-team scope; technical strategy; alignment; organizational bottlenecks; multiplying others; durable systems. |
| S5 | Principal Engineer | Organizational direction; portfolio thinking; long-term architecture; cross-org influence; systemic risk; technical standards. |

### Shared Foundations — a layer, not a ladder

The inventory maps **260 of 470 units** here, which at first reading looks like
the routes are a thin skin over a shared bulk. That reading is wrong, and the
distinction matters:

| Population | Units |
|---|---|
| Spine concepts in `technical-depth`, `systems-architecture`, `cloud-platform` | 80 |
| Codex entries (reference vocabulary, section 2.2) | 107 |
| Reference architectures | 14 |
| Reading-list sources routed to no single track | 59 |

Only **80 of the 260 are teachable concepts**. The rest is reference and reading
material, which is *supposed* to be shared — a canonical definition living in
exactly one place is the whole point of section 5.3.

**Shared Foundations deliberately has no stages.** It has three depth tiers (F1
mechanics, F2 systems, F3 organizational consequence), and a tier is not a rung:
you can enter at F3 for one cluster and F1 for another. Making foundations a
ladder would reintroduce the single-axis mistake one level down.

The ten clusters, with the domains that feed them:

| Cluster | Fed by |
|---|---|
| Distributed Systems | `systems-architecture`, `technical-depth` |
| Reliability | `systems-architecture`, `cloud-platform`, `execution-delivery` |
| Observability | `execution-delivery`, `cloud-platform` |
| Security | `cloud-platform`, `technical-depth` |
| Data | `technical-depth`, `systems-architecture` |
| Cloud | `cloud-platform` |
| APIs and Integration | `systems-architecture` |
| Cost and Capacity | `cloud-platform`, `execution-delivery` |
| Architecture Decision-Making | `systems-architecture`, `direction-influence` |
| Delivery Systems | `execution-delivery` |

## Domain-to-route mapping, and why each one

Derived in `tools/inventory.cjs` (`ROUTE_OF_DOMAIN`), so a seventh — or eighth —
domain cannot silently land nowhere: the script throws on an unmapped domain
rather than defaulting.

| Domain | Concepts | Route | Reasoning |
|---|---|---|---|
| `ai-engineering` | 24 | **AI Architect** | The route's entire subject. |
| `technical-depth` | 28 | Shared Foundations | Big-O, storage engines, concurrency: prerequisites for both routes, unchanged by which one you walk. |
| `systems-architecture` | 26 | Shared Foundations | Consistency, queues, backpressure. An AI architect needs these for serving; a Staff engineer for design review. |
| `cloud-platform` | 26 | Shared Foundations | Regions, IAM, cells, FinOps. Applied differently per route; the mechanics are identical. |
| `execution-delivery` | 28 | **Staff Engineer** | SLOs, review craft, operational ownership — how reliably you ship, which is scope, not technology. |
| `direction-influence` | 25 | **Staff Engineer** | Technical direction, influence without authority. Scope by definition. |
| `leveling-scope` | 21 | **Staff Engineer** | Explicitly about scope. The most obvious case. |

### The deviation worth arguing

The prompt's section 5.2 implies each route owns a self-sufficient progression.
Under this mapping **AI Architect owns only 24 spine concepts directly** and
depends on Shared Foundations for the rest.

That is correct, and it is a feature. An AI Architect route that re-taught
consistency models and queueing would either duplicate `systems-architecture`
(forbidden by section 7) or teach it worse. What the route owns is *the ordering
and the framing*: A2 pulls `backpressure-flow-control` from Shared Foundations at
the moment a learner is designing an inference queue, with an AI-specific scenario
attached. The concept has one canonical definition and two applications, which is
exactly the section 5.3 contract.

## How a spine level maps to a route stage

Also in `tools/inventory.cjs` (`STAGE_OF`). L3 to L7 is not deleted — it remains
the authored band in `curriculum.json`, and existing progress keys off concept
slugs, not levels, so nothing is orphaned.

| Spine level | AI Architect | Staff Engineer | Shared Foundations |
|---|---|---|---|
| L3 | A1 | S1 | F1 |
| L4 | A2 | S2 | F1 |
| L5 | A3 | S3 | F2 |
| L6 | A4 | S4 | F3 |
| L7 | A5 | S5 | F3 |

Shared Foundations collapses five bands into three tiers because the distinction
between an L3 and an L4 treatment of Big-O is depth, not scope, and three tiers
is as fine as that distinction can honestly be drawn.

**The critical consequence:** a learner's position on Route A and their position
on Route B are now **independent state**. Being at A3 says nothing about S-stage
and vice versa. The ascent gate that coupled them is replaced per route:

- **Route A ascent:** clear the stage's capability checkpoint. AI capability is
  demonstrated by AI work — not by influence work.
- **Route B ascent:** clear the stage's capability checkpoint. Same principle.
- **Shared Foundations has no gate at all.** It is pulled from, not climbed. A
  module names the foundations it needs as prerequisites, and those are checked
  per concept, which the prerequisite DAG already supports.

## Navigation

The prompt's section 17 proposal, with two changes the audit justifies:

```
Today                     the recurring front door (already exists, already good)
Routes
  AI Architect            A1 … A5
  Staff Engineer          S1 … S5
Learn                     modules within the route you are on
Practice                  Remember · Diagnose · Decide · Design · Defend
Build Lab                 the five lab types
Codex                     the canonical reference (107 entries)
Explore                   topics · capability map · concept graph · architectures · labs · sources
Progress                  capability, not a percentage
```

**Change 1: Reading folds into Explore and into each module.** The prompt says
this is allowed "if the audit demonstrates it". The audit demonstrates it: of 116
resources, 94 are already concept-mapped, so they have a natural home on the
concept that needs them. A top-level nav slot for a link list competes with Today
and Learn for attention and wins nothing.

**Change 2: `/map`, `/ladder`, `/tracks`, `/method` collapse into Explore.** Four
top-level routes for what is one question — "show me everything, differently" —
is the cognitive load section 2.4 is about. They keep their URLs as redirects.

### Route context is a global requirement, not a page

Section 17 asks for visible location and route context. Concretely: once a learner
picks a route, every Learn, Practice and Build surface states which route's framing
it is showing, because the same shared concept has a different scenario per route.
A learner who cannot tell which framing they are in cannot tell why the scenario
changed.

## URL migration

Section 19 requires preserving public URLs. Every existing route keeps working:

| Existing | Becomes | Mechanism |
|---|---|---|
| `/[locale]/lesson/[lessonId]` | unchanged | Lessons stay the unit of authoring; they gain a route and stage. |
| `/[locale]/checkpoint/[id]` | unchanged | Ids are stable; the item mix changes inside. |
| `/[locale]/codex` | unchanged | Already the canonical layer. |
| `/[locale]/today` | unchanged | Already the section 6.1 shape. |
| `/[locale]/build`, `/practice`, `/me`, `/resources` | unchanged | Restructured inside. |
| `/[locale]/learn` | route picker, then the route's Learn | Existing deep links land on the Climb for the learner's saved route. |
| `/[locale]/path` | already redirects to `/learn` | unchanged |
| `/[locale]/map`, `/ladder`, `/tracks`, `/method` | `/explore#…` | client redirect, same pattern as `/path` |
| `/[locale]/module/[moduleId]` | kept, marked superseded | 14 legacy modules; see `migration-map.md`. Their CBM banks move to Practice; the URL keeps resolving. |

No learner-facing id changes, so **no progress migration is required for the IA
change itself**. `Progress` keys off concept slugs, checkpoint ids and module ids
— none of which move.

## What this IA does not fix

Stated plainly, because section 29 forbids hiding uncertainty:

1. **Route A is thin at A1 and A5.** `ai-engineering` has 4 concepts at L3 and 3
   at L7 (24 total). Foundations and Strategy are the two stages a route most
   needs to feel complete, and they are the two thinnest. Authoring, not
   restructuring, closes that.
2. **Shared Foundations needs per-route application text.** Section 5.3 requires
   each shared concept to carry a different scenario per route. 80 concepts x 2
   routes is real authoring work; the schema supports it (additive fields) but the
   content does not exist yet.
3. **The Climb's ascent gate must be rewritten, not reconfigured.** `climb.ts`
   assumes one ladder with a breadth quorum across domains. Two independent
   ladders plus an ungated shared layer is a different engine, and its tests
   (`tests/climb.test.ts`, 9 of them) encode the old model.
4. **`cloud-platform` has no checks at all** (26 of 26 concepts). Routing it to
   Shared Foundations means both routes depend on a domain that cannot currently
   assess anything. That is why closing it is the first content work item, ahead
   of any restructuring.
