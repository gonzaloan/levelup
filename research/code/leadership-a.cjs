/**
 * Artifacts for the leadership-side concepts that had no widget, no snippet and
 * no system diagram — part A (8 concepts).
 *
 * The temptation here is to invent a toy function so the concept "has code".
 * That teaches nothing. At these levels the thing a Staff engineer actually
 * produces is a written artifact: an SLO definition, review comments on an RFC,
 * a memo, a toil ledger. Those are what these are — rendered through the code
 * view because the renderer already supports yaml/markdown/diff, and because
 * seeing the real shape of the artifact is the lesson.
 *
 * Every scenario, number and name comes from the concept's own authored example.
 */
module.exports = {
  patches: [
    // ── systems-architecture-l6 ──────────────────────────────────────────
    {
      lessonId: "systems-architecture-l6",
      slug: "observability-for-distributed-systems",
      lang: "yaml",
      caption: {
        en: "The 99.9%/30-day checkout SLO as configuration: what pages, what freezes, and what stays a dashboard.",
        es: "El SLO de 99.9%/30 días de checkout como configuración: qué pagina, qué congela y qué queda en un panel.",
      },
      snippet: `
# checkout-api.slo.yml — the artifact that turns "is it healthy?" into a decision.
slo:
  name: checkout-availability
  objective: 99.9        # over a rolling 30 days
  window: 30d
  # The SLI must be measured where the USER is, not inside the service.
  indicator:
    good: 'sum(rate(http_requests_total{route="/checkout",code!~"5.."}[5m]))'
    total: 'sum(rate(http_requests_total{route="/checkout"}[5m]))'
  # 0.1% of 30 days = 43 minutes of error budget for the month.

# Burn-rate alerts: two windows, because one can't be both fast and quiet.
alerts:
  - name: checkout-budget-burning-fast
    burn_rate: 14.4      # exhausts the month's budget in ~2 days
    windows: [5m, 1h]    # long window fires, short window confirms still-happening
    action: page         # a bad deploy returning 5xx trips this in minutes
  - name: checkout-budget-burning-slow
    burn_rate: 3
    windows: [6h, 3d]
    action: ticket       # real, not urgent — nobody wakes up for this

# NOT alerts. These are causes, and they page you for things users never noticed.
not_alerts: [cpu_high, memory_high, pod_restarted, queue_depth]

# The decision the budget makes for you, agreed in advance so it isn't an argument
# at 2am:
policy:
  budget_remaining: "ship"
  budget_exhausted: "freeze feature deploys; reliability work only until it recovers"

# Resilience you can't see isn't resilience — instrument the mechanisms too, or
# working-as-designed is indistinguishable from quietly-broken.
resilience_telemetry:
  - circuit_breaker_state{dependency}     # open breaker + healthy SLO = degraded, silently
  - retry_attempts_total{dependency}      # retries hiding a failing dependency
  - fallback_served_total{path}           # how often users got the cached answer
`,
      notes: [
        {
          at: "measured where the USER is",
          note: {
            en: "An SLI computed from internal success counters can read 100% while every user sees a timeout.",
            es: "Un SLI calculado con contadores internos puede marcar 100% mientras cada usuario ve un timeout.",
          },
        },
        {
          at: "burn_rate: 14.4",
          note: {
            en: "Burn rate, not raw error rate: it answers \"will this cost us the month?\" instead of \"is something wrong?\".",
            es: "Tasa de consumo, no tasa de error: responde \"¿esto nos costará el mes?\" en vez de \"¿algo va mal?\".",
          },
        },
        {
          at: "not_alerts: [cpu_high",
          note: {
            en: "Alert on user-facing symptoms and burn rate. Cause-based pages train the team to ignore the pager.",
            es: "Alerta sobre síntomas que ve el usuario y sobre el consumo. Las páginas por causa enseñan a ignorar el pager.",
          },
        },
        {
          at: 'budget_exhausted: "freeze feature deploys',
          note: {
            en: "Written before the incident, so the freeze is a pre-agreed policy rather than a fight about judgement.",
            es: "Escrito antes del incidente, así el congelamiento es política acordada y no una pelea de criterios.",
          },
        },
        {
          at: "open breaker + healthy SLO = degraded, silently",
          note: {
            en: "The failure mode teams miss: the fallback works, so nothing alerts, and the dependency stays broken for weeks.",
            es: "La falla que los equipos pasan por alto: el fallback funciona, nada alerta, y la dependencia sigue rota semanas.",
          },
        },
      ],
    },
    {
      lessonId: "systems-architecture-l6",
      slug: "leading-architecture-review",
      lang: "markdown",
      caption: {
        en: "The same RFC, reviewed two ways: the version that wins the argument, and the version that leaves the author owning it.",
        es: "El mismo RFC revisado de dos formas: la que gana la discusión y la que deja al autor siendo dueño.",
      },
      snippet: `
# Review: RFC-114 "Order totals service" (author: mid-level engineer)

Two problems, very different severity. The review has to treat them differently
or the author learns only one thing: guess what the Staff reviewer wants.

## ✗ The version that wins the argument
> Money must be integer minor units, not floats. Also replace the nightly batch
> with an event stream. I've pushed a revised design doc — take a look.

Both points are correct. The author now owns nothing, and next time they will
write half a design and wait for me to finish it.

## ✓ The version I actually posted

**Blocking — floats for money.** This one I am going to insist on, and I want to
be explicit that I'm using a block rather than a preference. \`0.1 + 0.2\` is
\`0.30000000000000004\`, so a total can disagree with the sum of its lines, and
the corruption is silent, in stored data, discovered by a customer at month end.
It is a one-way door: unwinding it later means a migration plus a reconciliation
of everything written in between. Integer minor units (\`amount_cents\`), or a
decimal type if you'd rather — your call which.

**Not blocking — the nightly batch.** Genuine question rather than a redirect:
what does a user see between an order being placed and the 02:00 sync? And if
the job fails at 02:00, who finds out, and when? If the answer is "the totals
are stale until tomorrow and support hears about it first", that may still be
fine for v1 — but I'd want it written down as a known limitation with the
trigger for revisiting it. If it's not fine, an event on order-committed is one
option; a 5-minute poll is a cheaper one worth pricing first.

**Not my call.** Naming, module layout, and the choice of HTTP framework are
yours. I have opinions and they aren't load-bearing.

---
Reserve blocks for load-bearing, hard-to-reverse risk: data loss, security,
one-way doors. Everything reversible belongs to the author, or you own their
design and they own the pager.
`,
      notes: [
        {
          at: "guess what the Staff reviewer wants",
          note: {
            en: "The real cost of winning: the team stops designing and starts predicting you.",
            es: "El costo real de ganar: el equipo deja de diseñar y empieza a predecirte.",
          },
        },
        {
          at: "I'm using a block rather than a preference",
          note: {
            en: "Naming the severity out loud is what makes the non-blocking comments safe to disagree with.",
            es: "Nombrar la severidad en voz alta es lo que hace seguro discrepar de los comentarios no bloqueantes.",
          },
        },
        {
          at: "It is a one-way door",
          note: {
            en: "The block is justified by reversibility and blast radius, not by seniority.",
            es: "El bloqueo se justifica por reversibilidad y radio de impacto, no por jerarquía.",
          },
        },
        {
          at: "what does a user see between",
          note: {
            en: "Surface risk as a question. The author reaches the conclusion and therefore keeps owning it.",
            es: "Plantea el riesgo como pregunta. El autor llega a la conclusión y por eso sigue siendo dueño.",
          },
        },
        {
          at: "I have opinions and they aren't load-bearing",
          note: {
            en: "Saying this explicitly is how a review stops expanding to fill every file it touches.",
            es: "Decir esto explícitamente es cómo una revisión deja de expandirse a todo lo que toca.",
          },
        },
      ],
    },

    // ── systems-architecture-l7 ──────────────────────────────────────────
    {
      lessonId: "systems-architecture-l7",
      slug: "architecture-as-engineering-strategy",
      lang: "markdown",
      caption: {
        en: "Six databases across 40 services: the strategy, in diagnosis → policy → actions, with the constraint stated out loud.",
        es: "Seis bases de datos en 40 servicios: la estrategia como diagnóstico → política → acciones, con la restricción dicha en voz alta.",
      },
      snippet: `
# Data storage strategy — FY26

## Diagnosis
40 services run on 6 database technologies (Postgres, MySQL, Mongo, Cassandra,
DynamoDB, one Redis-as-primary). The problem is not that six is more than one.
It is that **on-call for any service requires tribal knowledge of that team's
stack, so nobody can cover a sister team's page.** Every stack multiplies four
fixed costs: a backup/restore runbook that must be tested, an upgrade path, a
performance-debugging skill, and an on-call population of exactly one team.

That is the challenge this strategy addresses. Everything below follows from it,
and if you disagree with the diagnosis, argue there — not with the actions.

## Guiding policy
**Postgres is the default. A second store requires a written access pattern that
Postgres provably cannot serve, reviewed by the architecture group.**

Chosen because it is the only store already covering both transactional and
document-shaped workloads here, and the one with the deepest existing bench.

## Coherent actions
1. Postgres becomes the paved road: managed provisioning, tested restore,
   shared on-call runbook, upgrade automation. Ships before any migration is asked for.
2. Redis-as-primary is the one **mandatory** migration. It has no durability
   story, which makes it a data-loss risk rather than a consistency preference.
3. Cassandra stays for the events pipeline. It serves a write pattern Postgres
   does not, and it is well-operated. Documented as a sanctioned exception.
4. Mongo and MySQL services migrate opportunistically — when a service is
   already being substantially changed, never as standalone migration projects.
5. New services on anything but Postgres need the written exception. Zero today.

## What this costs, and what we are NOT doing
- **Locally suboptimal, on purpose.** Two teams would each pick something better
  for their own workload. The org-wide gain — anyone can take any page — is worth
  more than either local optimum, and I'd rather say that than pretend it's free.
- **Not** a big-bang migration of 40 services. Actions 3-4 mean this strategy
  is partly a decision to *stop* re-litigating storage choices, not to relocate data.
- **Not** touching analytics stores. Different problem, different diagnosis.
`,
      notes: [
        {
          at: "The problem is not that six is more than one",
          note: {
            en: "A diagnosis names a mechanism, not a count. \"Too many databases\" isn't a diagnosis, it's a complaint.",
            es: "Un diagnóstico nombra un mecanismo, no un conteo. \"Demasiadas bases de datos\" es una queja, no un diagnóstico.",
          },
        },
        {
          at: "argue there — not with the actions",
          note: {
            en: "Inviting disagreement at the diagnosis is what prevents the actions being fought one by one forever.",
            es: "Invitar el desacuerdo en el diagnóstico es lo que evita pelear las acciones una por una para siempre.",
          },
        },
        {
          at: "Ships before any migration is asked for",
          note: {
            en: "The policy has to be cheaper to follow than to evade, before it is asked of anyone.",
            es: "La política debe ser más barata de seguir que de evadir, antes de pedírsela a nadie.",
          },
        },
        {
          at: "Locally suboptimal, on purpose",
          note: {
            en: "Pick constraints that let many teams move. Saying it out loud is what lets people disagree instead of routing around you.",
            es: "Elige restricciones que permitan avanzar a muchos equipos. Decirlo permite discrepar en vez de rodearte.",
          },
        },
        {
          at: "**Not** a big-bang migration",
          note: {
            en: "A strategy that never says what you're not doing is a list of projects with dates.",
            es: "Una estrategia que nunca dice qué no vas a hacer es una lista de proyectos con fechas.",
          },
        },
      ],
    },
    {
      lessonId: "systems-architecture-l7",
      slug: "conways-law-sociotechnical-design",
      lang: "markdown",
      caption: {
        en: "The two-week checkout queue: why the fix is the team boundary, not the service boundary.",
        es: "La cola de dos semanas en checkout: por qué el arreglo es el límite del equipo, no el del servicio.",
      },
      snippet: `
# Checkout change-throughput — proposal

## The symptom leadership sees
Catalog, pricing and promotions all ship features that require checkout changes.
Every launch = a cross-team PR into checkout, a shared standup, a two-week queue.
The obvious proposal is "split checkout into microservices."

## Why splitting the service alone won't work
Communication structure, not the codebase, is producing the queue:

    3 upstream teams  ──►  1 owning team  ──►  1 review queue

Split checkout into four services owned by the SAME team and you get four repos
feeding one review queue. The boundary that binds is ownership, and the system
will drift back to match it — you ship your org chart whether or not you drew it.

## Inverse Conway: shape the teams, let the architecture follow
The change teams keep asking for is *promotion rules* — the logic, not the
checkout flow. So make that a boundary with an owner:

| Before | After |
|---|---|
| checkout (1 team) contains promotion rules | checkout owns the flow + a rules interface |
| 3 teams queue for changes | promotions team owns rules end-to-end, deploys independently |
| coordination per launch | coordination once, at the interface |

The extraction is real work. It is also the only version where the queue
disappears rather than moving, because after it the promotions team can ship
without asking anyone.

## What this actually is
**A reorg is an architecture decision.** This proposal changes who owns what,
which is why it goes to the same review an architecture change would — and why
an architect should be in the room the next time the org chart moves, before the
boundaries are set by a headcount spreadsheet.

## Cost, stated
Two boundaries where there was one: a versioned rules interface, an integration
test suite that is now load-bearing, and one more on-call rotation.
`,
      notes: [
        {
          at: '"split checkout into microservices."',
          note: {
            en: "The reflexive fix. It addresses the artifact and leaves the mechanism producing the queue untouched.",
            es: "El arreglo reflejo. Ataca el artefacto y deja intacto el mecanismo que produce la cola.",
          },
        },
        {
          at: "feeding one review queue",
          note: {
            en: "Worth drawing before any split: does the change actually remove a coordination point, or relocate it?",
            es: "Vale dibujarlo antes de cualquier división: ¿el cambio elimina un punto de coordinación o lo reubica?",
          },
        },
        {
          at: "*promotion rules*",
          note: {
            en: "The right boundary is the one the change requests keep tracing — listen to the PRs, not the diagram.",
            es: "El límite correcto es el que trazan las solicitudes de cambio: escucha los PRs, no el diagrama.",
          },
        },
        {
          at: "**A reorg is an architecture decision.**",
          note: {
            en: "The line to take away. Org changes set system boundaries whether or not an architect was consulted.",
            es: "La línea que hay que llevarse. Los cambios de organización fijan límites del sistema, con o sin arquitecto.",
          },
        },
      ],
    },

    // ── execution-delivery-l6 ────────────────────────────────────────────
    {
      lessonId: "execution-delivery-l6",
      slug: "toil-reduction-program",
      lang: "python",
      caption: {
        en: "Six SRE engineers, unmeasured toil: the ledger that turns \"we're drowning\" into a cap and a prioritized queue.",
        es: "Seis ingenieros SRE con trabajo repetitivo sin medir: el registro que convierte \"nos ahogamos\" en un tope y una cola priorizada.",
      },
      snippet: `
# 6-engineer SRE team owning a data platform. Nobody has measured where the time
# goes, so every conversation is anecdote vs anecdote. Two weeks of tagging first.

TEAM_SIZE, HOURS_PER_WEEK = 6, 40
capacity = TEAM_SIZE * HOURS_PER_WEEK          # 240 engineer-hours/week

# Toil has a definition, and it is narrow ON PURPOSE: manual, repetitive,
# automatable, no lasting value. Interrupt work that produces a fix is not toil.
toil = [
    # task,                       per_week, minutes, risk_if_wrong (1-3)
    ("access-approval tickets",        38,       12, 1),
    ("manual partition rebalance",      3,       95, 3),
    ("failed-pipeline restarts",       22,       18, 2),
    ("quarterly cert rotation",      0.08,      240, 3),   # ~1x/quarter
]

hours = {t: n * m / 60 for t, n, m, _ in toil}
total = sum(hours.values())
print(f"toil: {total:.0f} h/wk of {capacity} = {total/capacity:.0%} of the team")
# toil: 17 h/wk of 240 = 7% of the team
#
# 7% is not a crisis. Measuring FIRST is what stops a program being sized by
# whoever complained loudest — and it's the number to defend the cap with.

# Prioritize by frequency x cost x risk, not by how annoying it feels.
for t, n, m, risk in toil:
    print(f"{t:28} {n*m/60:5.1f} h/wk  score {n*m/60*risk:5.1f}")
# access-approval tickets        7.6 h/wk  score   7.6
# failed-pipeline restarts       6.6 h/wk  score  13.2
# manual partition rebalance     4.8 h/wk  score  14.3
# quarterly cert rotation        0.3 h/wk  score   1.0   <- a 2-week script would
#                                                           never pay this back

# The two worth automating are ALSO design smells: pipelines shouldn't need
# manual restarts, and partitions shouldn't need a human to rebalance. Recurring
# toil is usually a defect wearing an operations costume.

# The cap, agreed with the team's manager and written down:
CAP = 0.20
# Crossing it does exactly one of two things — never "absorb it as heroics":
#   1. funds automation from the next sprint, or
#   2. hands load back to the requesting team until it's automated.
`,
      notes: [
        {
          at: "narrow ON PURPOSE",
          note: {
            en: "Without a definition, \"toil\" expands to mean all work someone dislikes, and the number becomes unusable.",
            es: "Sin definición, \"toil\" se expande a todo trabajo que alguien detesta y el número deja de servir.",
          },
        },
        {
          at: "7% is not a crisis",
          note: {
            en: "Measuring first often deflates the program — and that's a result, not a failure.",
            es: "Medir primero a menudo desinfla el programa, y eso es un resultado, no un fracaso.",
          },
        },
        {
          at: "score   1.0",
          note: {
            en: "A rare five-minute task isn't worth a two-week script, however irritating it is.",
            es: "Una tarea rara de cinco minutos no vale un script de dos semanas, por irritante que sea.",
          },
        },
        {
          at: "a defect wearing an operations costume",
          note: {
            en: "Ask what design makes this necessary before you automate it. Often the automation is the wrong fix.",
            es: "Pregunta qué diseño hace esto necesario antes de automatizarlo. A menudo automatizar es el arreglo equivocado.",
          },
        },
        {
          at: 'never "absorb it as heroics"',
          note: {
            en: "A cap with no consequence is a wish. The two branches are what make it a real line.",
            es: "Un tope sin consecuencia es un deseo. Las dos ramas son lo que lo vuelve una línea real.",
          },
        },
      ],
    },

    // ── direction-influence-l4 ───────────────────────────────────────────
    {
      lessonId: "direction-influence-l4",
      slug: "alternatives-and-tradeoffs",
      lang: "diff",
      caption: {
        en: "The two dismissive sentences, rewritten so a Kafka advocate would recognize their own argument.",
        es: "Las dos frases despectivas, reescritas para que un defensor de Kafka reconozca su propio argumento.",
      },
      snippet: `
  ## Alternatives considered

- ### Kafka
- Too complex for our needs. Requires operating a cluster.
-
- ### RabbitMQ
- Also too complex for our needs. Another component to run.
+ ### Kafka
+ **What it buys:** durable, replayable log — reprocess a week of jobs after a
+ bug fix, which Postgres cannot do. Handles ~100k msg/s; we need ~50/s today,
+ but it removes throughput from the conversation permanently. Consumer groups
+ give independent scaling per job type.
+ **What it costs:** a cluster to operate (or a managed bill), partition/consumer
+ concepts every on-call engineer must learn, and it is a second datastore, so we
+ lose transactional enqueue — "insert row and enqueue job" stops being atomic.
+ **Why not now:** replay is the one capability we'd genuinely want, and we have
+ no case for it yet. Revisit when we do, or at ~5k jobs/s.
+
+ ### RabbitMQ
+ **What it buys:** real broker semantics we'd otherwise hand-roll — per-message
+ ack, dead-letter queues, priority, delayed delivery. Mature client libraries.
+ **What it costs:** a component to run and monitor, plus the same loss of
+ transactional enqueue.
+ **Why not now:** we need three of those semantics, and all three are ~200 lines
+ on Postgres. If we needed priority AND delayed delivery AND fanout, this wins.
+
+ ### Postgres queue (recommended)
+ **What it buys:** transactional enqueue with the business write, zero new
+ operational surface, one backup story, a queue any engineer can debug with SQL.
+ **What it costs:** we hand-roll retries and dead-lettering; \`SELECT … FOR UPDATE
+ SKIP LOCKED\` becomes contended somewhere around a few thousand jobs/s; no replay.
+ **Exit:** the consumer interface stays broker-agnostic, so switching later is a
+ rewrite of one module, not of every producer.
`,
      notes: [
        {
          at: '- Too complex for our needs.',
          note: {
            en: "\"Too complex for our needs\" is what a reviewer reads as \"I decided first and wrote this after\".",
            es: "\"Demasiado complejo para lo que necesitamos\" se lee como \"decidí primero y escribí esto después\".",
          },
        },
        {
          at: "+ **What it buys:** durable, replayable log",
          note: {
            en: "Write the rejected option in its strongest form. If it has no upside, it was never an alternative.",
            es: "Escribe la opción rechazada en su forma más fuerte. Si no tiene ventaja, nunca fue una alternativa.",
          },
        },
        {
          at: "+ lose transactional enqueue",
          note: {
            en: "The cost that decides this and appears in neither original sentence. Stating it is the whole value of the section.",
            es: "El costo que decide esto y no aparece en ninguna frase original. Nombrarlo es todo el valor de la sección.",
          },
        },
        {
          at: "+ **Why not now:** replay is the one capability",
          note: {
            en: "\"Not now, and here's the trigger\" survives review. \"Never\" invites someone to relitigate it in six months.",
            es: "\"No ahora, y este es el disparador\" sobrevive la revisión. \"Nunca\" invita a relitigarlo en seis meses.",
          },
        },
        {
          at: "+ **What it costs:** we hand-roll retries",
          note: {
            en: "State the recommendation's costs too. A recommendation with no downside reads as advocacy, not analysis.",
            es: "Nombra también los costos de tu recomendación. Una recomendación sin desventajas se lee como propaganda.",
          },
        },
      ],
    },
    {
      lessonId: "direction-influence-l4",
      slug: "structured-writing-scqa",
      lang: "diff",
      caption: {
        en: "Fifteen VP minutes: the walkthrough that runs out of time, and the SCQA opening that doesn't.",
        es: "Quince minutos con el VP: el recorrido que se queda sin tiempo y la apertura SCQA que no.",
      },
      snippet: `
  Subject: Billing pipeline
+ Subject: Approve 2 engineers / 1 quarter — billing batch → streaming

- Today billing runs as a nightly batch. It was built in 2019 when we had
- 40k invoices a month, and it works by exporting to S3, then a Spark job
- aggregates usage, then a second job writes invoices, then reconciliation
- runs at 04:00. Over the last two quarters we investigated latency in the
- pipeline. We looked at Spark tuning, then at the export step, then at
- database contention during the aggregate window. What we found was…
-
- [12 minutes later]
-
- So the recommendation is to move to streaming.
+ **Situation.** Billing runs as a nightly batch; invoices are up to 26 hours
+ stale.
+ **Complication.** Support handles ~340 "my usage looks wrong" tickets a month
+ that are just staleness, and the two enterprise deals in the pipeline both
+ require same-day usage visibility in their contracts.
+ **Question.** Do we fix the batch or move billing to streaming?
+ **Answer — what I'm asking you to approve.** Streaming, 2 engineers for 1
+ quarter. Batch tuning gets staleness to ~6 hours at best, which still fails
+ the contract requirement, so it spends the quarter without solving it.
+
+ Detail below: architecture, migration plan, what we tried, risks. Happy to go
+ wherever you want with the remaining time.
`,
      notes: [
        {
          at: "+ Subject: Approve 2 engineers",
          note: {
            en: "The subject line already contains the ask. A VP triaging 60 emails decides here.",
            es: "El asunto ya contiene la petición. Un VP que tría 60 correos decide aquí.",
          },
        },
        {
          at: "- Today billing runs as a nightly batch. It was built in 2019",
          note: {
            en: "Chronological order serves your memory of the investigation, not the reader's decision.",
            es: "El orden cronológico sirve a tu memoria de la investigación, no a la decisión del lector.",
          },
        },
        {
          at: "- [12 minutes later]",
          note: {
            en: "Build-up spends the scarce resource — attention — before reaching the point.",
            es: "La introducción gasta el recurso escaso —la atención— antes de llegar al punto.",
          },
        },
        {
          at: "+ **Complication.**",
          note: {
            en: "The complication is why the situation is a problem NOW. Without it, there's nothing to decide.",
            es: "La complicación es por qué la situación es un problema AHORA. Sin ella, no hay nada que decidir.",
          },
        },
        {
          at: "+ Detail below: architecture",
          note: {
            en: "Nothing is omitted — it's reordered. The first paragraph alone conveys the ask and why.",
            es: "Nada se omite, se reordena. El primer párrafo solo ya transmite la petición y el por qué.",
          },
        },
      ],
    },
    {
      lessonId: "direction-influence-l4",
      slug: "team-alignment",
      lang: "markdown",
      caption: {
        en: "Priya goes silent in review, then reopens it in Slack: the pre-wire log that surfaces the objection first.",
        es: "Priya se queda callada en la revisión y luego lo reabre en Slack: el registro de pre-alineación que saca la objeción antes.",
      },
      snippet: `
# Streaming rewrite — socialization log (before wide review)

Priya owns the billing service this replaces. In the last two reviews she went
quiet, then reopened the debate in Slack the next day. That is not obstruction —
it is the signal that the review is not where she'll actually say the thing.
So the doc goes to her before it goes to the room.

## 1:1 with Priya — before wide review
Opened with the question, not the pitch: *"You've run this service for three
years. Where does this design break?"*

Three concerns, all real, none of which I had:
1. **The 03:00 reconciliation job** consumes batch output and is what finance
   signs off on quarterly. My design had no answer for it. → **Doc changed:**
   reconciliation keeps reading a materialized batch view built from the stream.
2. **Ownership during migration.** She'd be on call for a system she no longer
   controls. → **Doc changed:** named a dual-ownership window with an end date.
3. **Prior rewrite was abandoned at 60%** and she absorbed the mess. → I can't
   design that away. **Written into the doc as a risk**, with the incremental
   rollout and the kill criteria that make stopping cheap.

Concern 1 alone would have surfaced mid-build, in a quarter, at ten times the cost.

## Wide review — the part that has to be deliberate
Priya's concerns are in the doc, credited to her. Then, in the room, on the
agenda: *"Priya, you've raised the reconciliation dependency — is the
materialized view enough, or is there something else it touches?"*

Named directly, because silence is not agreement. The quiet person in an
architecture review is usually the one holding the constraint you don't know
about, and false alignment is more expensive than open disagreement: it commits
the org while the objection keeps its full force, unaddressed, for later.

## Still unresolved (in the doc, not hidden)
Marcus prefers a different partitioning scheme. Not blocking, genuinely his
call to disagree with — recorded so it doesn't resurface as a surprise.
`,
      notes: [
        {
          at: "not where she'll actually say the thing",
          note: {
            en: "Read the pattern as information about the forum, not a verdict on the person.",
            es: "Lee el patrón como información sobre el foro, no como veredicto sobre la persona.",
          },
        },
        {
          at: '*"You\'ve run this service for three',
          note: {
            en: "Open by asking where it breaks. Presenting the design invites a yes; asking invites the constraint.",
            es: "Abre preguntando dónde se rompe. Presentar el diseño invita un sí; preguntar invita la restricción.",
          },
        },
        {
          at: "at ten times the cost",
          note: {
            en: "This is the whole economic case for pre-wiring: a gap in the room is cheap, a gap mid-build isn't.",
            es: "Este es todo el caso económico de pre-alinear: una brecha en la sala es barata, a mitad de construcción no.",
          },
        },
        {
          at: "credited to her",
          note: {
            en: "Attribution converts an objector into a co-author. Absorbing the concern silently wastes the alignment.",
            es: "Atribuir convierte a quien objeta en coautor. Absorber la preocupación en silencio desperdicia la alineación.",
          },
        },
        {
          at: "Named directly, because silence is not agreement",
          note: {
            en: "Drawing the quiet dissenter out by name is the move. It has to be on the agenda, not improvised.",
            es: "Sacar por nombre a quien disiente en silencio es la clave. Debe estar en la agenda, no improvisarse.",
          },
        },
      ],
    },
  ],
};
