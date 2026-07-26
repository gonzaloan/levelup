/**
 * Code artifacts for Cloud & Platform L5-L7 — the 12 concepts whose only visual
 * was a text schematic.
 *
 * At these levels the artifact is rarely application code, and forcing a toy
 * function would teach the wrong thing. What a Staff/Principal engineer actually
 * produces here is a policy document, a router contract, an experiment spec, a
 * risk calculation, or a decision register — so that's what these are. The
 * renderer already supports yaml/hcl/json/markdown, so they render as code.
 *
 * Same two rules as cloud-l3-l4.cjs: every number traces to the concept's own
 * authored example, and the artifact is the real deliverable for the decision.
 */
module.exports = {
  patches: [
    // ── cloud-platform-l5 ────────────────────────────────────────────────
    {
      lessonId: "cloud-platform-l5",
      slug: "cell-based-architecture",
      lang: "typescript",
      caption: {
        en: "The router and the migration — the two deliverables that separate real cells from static shards.",
        es: "El router y la migración: los dos entregables que separan celdas reales de shards estáticos.",
      },
      snippet: `
// The three incidents were: a bulk import saturating shared workers, a
// pathological query exhausting the pool, a retry storm from a bad client.
// Cells don't make any of those less likely — they bound who else notices.

// Deliverable 1: the router. Tenant -> cell, and it must be a LOOKUP, not a hash.
// A hash is a one-line implementation you can never rebalance.
async function routeTenant(tenantId: string): Promise<CellId> {
  const assignment = await cellDirectory.get(tenantId);   // authoritative, mutable
  if (!assignment) throw new UnassignedTenant(tenantId);  // fail closed
  return assignment.cell;
}

// Deliverable 2: no-downtime migration. Without this you have static shards.
type Phase = "steady" | "dual-write" | "verifying" | "cutover" | "draining";

async function migrateTenant(tenantId: string, to: CellId) {
  await setPhase(tenantId, "dual-write");   // writes to both, reads from source
  await backfill(tenantId, to);
  await setPhase(tenantId, "verifying");    // compare; a mismatch aborts, no cutover
  if (!(await consistent(tenantId, to))) return abort(tenantId);
  await setPhase(tenantId, "cutover");      // reads follow writes
  await setPhase(tenantId, "draining");     // source retained for rollback
}

// The bill for all of this, stated up front so nobody is surprised:
//   - headroom per cell means lower utilization than one big pool
//   - N cells = N x operational surface (deploys, dashboards, on-call)
//   - anything needing a global view (search, leaderboards, "all tenants" admin)
//     becomes a scatter-gather you now own
//
// Try these FIRST — they cover all three incidents at a fraction of the cost:
//   per-tenant concurrency limits | fair queueing | load shedding
// Cells are for when isolation must be structural, not merely enforced.
`,
      notes: [
        {
          at: "it must be a LOOKUP, not a hash",
          note: {
            en: "A hash-based router is unrebalanceable. This one line decides whether you have cells or shards.",
            es: "Un router por hash no se puede rebalancear. Esta línea decide si tienes celdas o shards.",
          },
        },
        {
          at: 'await setPhase(tenantId, "verifying")',
          note: {
            en: "Verify before cutover, and let a mismatch abort. A migration you can't abort isn't a migration path.",
            es: "Verifica antes del corte y deja que una discrepancia aborte. Una migración que no puedes abortar no es un camino de migración.",
          },
        },
        {
          at: "becomes a scatter-gather you now own",
          note: {
            en: "The cost teams discover last: every global-view feature gets harder forever.",
            es: "El costo que los equipos descubren al final: cada función con vista global se vuelve más difícil para siempre.",
          },
        },
        {
          at: "Try these FIRST",
          note: {
            en: "Cells bound reach; they don't reduce probability. Cheaper controls often buy enough isolation.",
            es: "Las celdas acotan el alcance; no reducen la probabilidad. Controles más baratos suelen dar aislamiento suficiente.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l5",
      slug: "static-stability-and-control-plane-dependence",
      lang: "hcl",
      caption: {
        en: "The \"4-6 minute recovery\" runbook, and the version that doesn't need a control plane to survive.",
        es: "El runbook de \"recuperación en 4-6 minutos\" y la versión que no necesita un control plane para sobrevivir.",
      },
      snippet: `
# BEFORE — the runbook says: on AZ loss the ASG launches replacements in the
# surviving zones, recovery 4-6 minutes. Sized for exactly the load it serves.
resource "aws_autoscaling_group" "api" {
  min_size         = 6
  desired_capacity = 6          # 2 per zone, 100% utilized
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
# Ask the one diagnostic question: does recovery require CREATING anything?
# Yes — it requires launching instances. That is a control-plane call, made at
# the moment the control plane is most likely to be degraded, and every other
# team in the region is making the same call.

# AFTER — statically stable: recovery requires nothing to be created.
resource "aws_autoscaling_group" "api" {
  min_size         = 9
  desired_capacity = 9          # 3 per zone; any 2 zones can carry all traffic
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
# Losing a zone now removes capacity we were not depending on. The data plane
# (load balancer health checks, DNS) stops sending traffic to it, and serving
# continues through what already exists.

# The price, stated honestly:
#   9 instances to serve the load of 6 -> ~67% steady-state utilization ON PURPOSE.
#   That idle third IS the availability. It is not waste to be optimized away.
#
# Note what does NOT help: automating the failover. A script that calls the same
# degraded control plane hits the same wall a human would, just faster.
`,
      notes: [
        {
          at: "does recovery require CREATING anything?",
          note: {
            en: "The whole test in one question. Control planes create and change; data planes serve what exists.",
            es: "La prueba completa en una pregunta. Los control planes crean y cambian; los data planes sirven lo que existe.",
          },
        },
        {
          at: "team in the region is making the same call",
          note: {
            en: "Correlated demand is why control-plane calls fail exactly when you need them most.",
            es: "La demanda correlacionada es por qué las llamadas al control plane fallan justo cuando más las necesitas.",
          },
        },
        {
          at: "That idle third IS the availability",
          note: {
            en: "Static stability is bought with idle capacity. If you can't afford it, say so — don't claim you have it.",
            es: "La estabilidad estática se compra con capacidad ociosa. Si no puedes pagarla, dilo; no afirmes que la tienes.",
          },
        },
        {
          at: "automating the failover",
          note: {
            en: "Automation changes who makes the call, not whether the call can succeed.",
            es: "La automatización cambia quién hace la llamada, no si la llamada puede tener éxito.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l5",
      slug: "managed-data-platform-choices",
      lang: "sql",
      caption: {
        en: "Team A vs Team B, priced as reversibility: what it costs to change your mind in year three.",
        es: "Equipo A vs Equipo B, valuado como reversibilidad: qué cuesta cambiar de opinión en el año tres.",
      },
      snippet: `
-- Team A: load nightly into the proprietary warehouse the team already knows.
-- Team B: managed tables in an open format on object storage, any engine.
-- Do NOT argue this on query performance. Argue it on what year three costs.

-- ── Team B, adding a second consumer with a different engine ──────────────
-- The catalog is separable, so this is configuration, not migration:
CREATE EXTERNAL TABLE orders
  USING iceberg
  LOCATION 's3://lake/warehouse/orders';       -- same files, same snapshots
-- Spark, Trino, DuckDB and the warehouse can all read this. Nothing is copied.

-- ── Team A, the same request ──────────────────────────────────────────────
-- The storage format is the engine's internal format, so the second consumer
-- needs its own copy:
CREATE TABLE orders_export AS SELECT * FROM orders;   -- export
-- + a scheduled unload, + a second storage bill, + a freshness gap, + drift
--   between two copies that will diverge and be reconciled by someone.

-- ── The asymmetry that should dominate the decision ───────────────────────
--   engine:  weeks to change      (a query dialect and some tuning)
--   storage: quarters to change   (rewrite every byte, dual-run, re-verify)
-- Data has gravity. Choose the layer you can't cheaply change, first.

-- What open formats used to cost, and no longer do — managed table services
-- run these for you, which is what removed the old objection:
--   compaction (small-file problem) | snapshot expiry | orphan file cleanup

-- State the price of the optionality out loud, or the argument isn't honest:
-- Team B pays a query-latency premium today and a catalog to operate.
`,
      notes: [
        {
          at: "Argue it on what year three costs",
          note: {
            en: "Performance arguments are winnable and irrelevant here; both options are fast enough.",
            es: "Los argumentos de rendimiento son ganables e irrelevantes aquí: ambas opciones son suficientemente rápidas.",
          },
        },
        {
          at: "Nothing is copied",
          note: {
            en: "An open format plus a separable catalog turns \"replace the engine\" into a config change.",
            es: "Un formato abierto más un catálogo separable convierte \"reemplazar el motor\" en un cambio de configuración.",
          },
        },
        {
          at: "diverge and be reconciled by someone",
          note: {
            en: "Every copy is a future reconciliation ticket with no owner yet.",
            es: "Cada copia es un ticket de reconciliación futuro que todavía no tiene dueño.",
          },
        },
        {
          at: "storage: quarters to change",
          note: {
            en: "The engine is cheap to change, the storage format isn't. Let that asymmetry decide.",
            es: "El motor es barato de cambiar, el formato de almacenamiento no. Deja que esa asimetría decida.",
          },
        },
        {
          at: "State the price of the optionality out loud",
          note: {
            en: "Optionality isn't free. Naming its cost is what makes the recommendation trustworthy.",
            es: "La opcionalidad no es gratis. Nombrar su costo es lo que hace confiable la recomendación.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l5",
      slug: "landing-zone-and-account-boundaries",
      lang: "json",
      caption: {
        en: "The senior engineer's objection, answered with the three things tags provably cannot do.",
        es: "La objeción del ingeniero senior, respondida con las tres cosas que las etiquetas demostrablemente no pueden hacer.",
      },
      snippet: `
// The objection: "we can get the same isolation with tags and IAM conditions."
// Here is the tag-based version, and why it isn't the same.
{
  "Effect": "Deny",
  "Action": "s3:*",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": { "aws:ResourceTag/team": "\${aws:PrincipalTag/team}" }
  }
}
// This holds only where BOTH tags exist and are correct. An untagged resource,
// a service that creates resources without propagating tags, or a principal
// missing the tag all fall outside it. The rule is enforced by whoever
// remembered the condition.

// ── The three things that are account-scoped and cannot be reproduced ─────
// 1. Service quotas. Quotas are per account: one team's runaway Lambda
//    concurrency consumes the quota every other team shares. No tag fixes this.
// 2. A clean billing seam. Cost allocation by tag is best-effort and always
//    partial; an account boundary is exact and needs no discipline.
// 3. Credential blast radius. A leaked key is bounded by what the ACCOUNT can
//    reach, not by what someone intended it to reach.

// The account-boundary version, enforced by the provider regardless of tags:
{
  "Effect": "Deny",
  "Action": "s3:PutBucketPolicy",
  "Resource": "*",
  "Condition": { "StringNotEquals": { "aws:PrincipalOrgID": "o-example" } }
}

// And the cost, which is real and should be named in the same review:
//   cross-account access paths | shared services | an account-provisioning
//   pipeline that someone owns and maintains
// Managed landing zone vs your own automation is a genuine choice: your own
// gives more control and is a product you are now on the hook for.
`,
      notes: [
        {
          at: "// remembered the condition",
          note: {
            en: "That's the difference in one line: a tag is a convention, a boundary is a mechanism.",
            es: "Esa es la diferencia en una línea: una etiqueta es una convención, un límite es un mecanismo.",
          },
        },
        {
          at: "1. Service quotas",
          note: {
            en: "The argument that usually ends the debate, because it's concrete and nobody can tag their way out.",
            es: "El argumento que suele cerrar el debate, porque es concreto y nadie puede resolverlo con etiquetas.",
          },
        },
        {
          at: "3. Credential blast radius",
          note: {
            en: "Blast radius is decided by the boundary, not by intent expressed in a policy.",
            es: "El radio de impacto lo decide el límite, no la intención expresada en una política.",
          },
        },
        {
          at: "a product you are now on the hook for",
          note: {
            en: "The honest cost of a landing zone isn't the accounts — it's the factory and its owner.",
            es: "El costo honesto de una landing zone no son las cuentas: es la fábrica y su dueño.",
          },
        },
      ],
    },

    // ── cloud-platform-l6 ────────────────────────────────────────────────
    {
      lessonId: "cloud-platform-l6",
      slug: "guardrails-over-gatekeeping",
      lang: "json",
      caption: {
        en: "Three proposals for \"no public data stores\" — only one is enforced by construction.",
        es: "Tres propuestas para \"ningún almacén de datos público\": solo una se hace cumplir por construcción.",
      },
      snippet: `
// Proposal 1: a review checklist.  Enforced by memory. Holds until someone is busy.
// Proposal 2: a nightly scanner.   Enforced after the fact. A night of public
//             data is not something a ticket can undo.
// Proposal 3: an org control that denies the action. Enforced by construction.
//
// For an IRREVERSIBLE outcome, only the third one is a control.

// A first attempt — and the subtle hole in it:
{
  "Effect": "Deny",
  "Action": ["s3:PutBucketPolicy", "s3:PutBucketAcl"],
  "Resource": "*",
  "Condition": { "StringNotEquals": { "aws:PrincipalOrgID": "o-example" } }
}
// This is PRINCIPAL-scoped: it constrains who acts. A permissive resource
// policy still lets a principal from outside the org read the data, because
// that path never involves one of our principals at all.

// The control that actually states the invariant — resource-scoped:
{
  "Effect": "Deny",
  "NotAction": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::reports-*/*",
  "Condition": {
    "StringNotEqualsIfExists": { "aws:PrincipalOrgID": "o-example" },
    "BoolIfExists": { "aws:PrincipalIsAWSService": "false" }
  }
}
// "Nothing outside this organization, ever" — regardless of which principal,
// which account, or who forgot.

// Ship the exception path IN THE SAME CHANGE, or the platform becomes a ticket
// queue and teams route around it:
//   documented owner | named approver | time-boxed | logged and reviewed
// A guardrail with no exception path is a gate wearing a guardrail's name.
`,
      notes: [
        {
          at: "For an IRREVERSIBLE outcome, only the third one is a control",
          note: {
            en: "Prevention beats detection when the outcome can't be undone. Detection is fine for the rest.",
            es: "La prevención le gana a la detección cuando el resultado no se puede revertir. Para el resto, detectar basta.",
          },
        },
        {
          at: "This is PRINCIPAL-scoped",
          note: {
            en: "The most common real-world gap: a principal-scoped policy circumvented by a permissive resource policy.",
            es: "El hueco más común en la práctica: una política sobre el principal, esquivada por una política de recurso permisiva.",
          },
        },
        {
          at: "resource-scoped",
          note: {
            en: "Only a resource-scoped control can state \"nothing outside this org, ever\".",
            es: "Solo un control sobre el recurso puede afirmar \"nada fuera de esta organización, nunca\".",
          },
        },
        {
          at: "IN THE SAME CHANGE",
          note: {
            en: "The guardrail and its exception path ship together, or teams route around the platform.",
            es: "El guardrail y su vía de excepción se entregan juntos, o los equipos rodean la plataforma.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l6",
      slug: "platform-as-product-paved-roads",
      lang: "markdown",
      caption: {
        en: "30% adoption after a year: the review that treats it as a product signal instead of accepting the mandate.",
        es: "30% de adopción tras un año: la revisión que lo trata como señal de producto en vez de aceptar el mandato.",
      },
      snippet: `
# Paved road: deployment pipeline — adoption review

**Adoption: 30% after 12 months.** Teams say it's slower than their own scripts.
Leadership has offered an org-wide mandate. Declining that offer is the decision.

## Why we are not taking the mandate
A mandate would move adoption to 100% next quarter and destroy the only honest
signal we have. Today, "teams don't use it" is a bug report. After a mandate,
it becomes "teams comply", and we will never again learn that it is slow.

## The bug report, with a location
| Friction | Ours | Their script | Status |
|---|---|---|---|
| p50 deploy time | 14 min | 4 min | root cause: serialized integration stage |
| Rollback | ticket to platform | one command | fixing: self-serve rollback |
| Local dry-run | none | trivial | fixing: \`road deploy --plan\` |
| Custom build step | not supported | trivial | by design — see escape hatch |

Three of four are our defects. Not a discipline problem.

## Escape hatch (kept fast, on purpose)
Any team can leave with one config flag and no approval. Making it cheap to
leave is what makes it safe to trust the road — a road you can't leave is a
gate, and teams pre-emptively avoid gates.

## What we measure
- adoption trend, by team, monthly (the outcome)
- p50 deploy time vs. the best hand-rolled script (the reason they left)
- escape-hatch usage, WITHOUT penalty — it's our best backlog

## What we do NOT measure
Number of teams onboarded under mandate. That's compliance, not adoption.
`,
      notes: [
        {
          at: "Declining that offer is the decision",
          note: {
            en: "Politically easy to accept, which is exactly why it needs a written decision.",
            es: "Es políticamente fácil aceptarlo, y justo por eso necesita una decisión escrita.",
          },
        },
        {
          at: "it becomes \"teams comply\"",
          note: {
            en: "A mandate converts a product problem into a compliance problem and burns your only feedback channel.",
            es: "Un mandato convierte un problema de producto en uno de cumplimiento y quema tu único canal de retroalimentación.",
          },
        },
        {
          at: "Three of four are our defects",
          note: {
            en: "Low adoption is a product signal. Treat friction as a bug report with a location.",
            es: "La baja adopción es una señal de producto. Trata la fricción como un reporte de bug con ubicación.",
          },
        },
        {
          at: "Making it cheap to",
          note: {
            en: "Counter-intuitive and load-bearing: the fast escape hatch is why people stay.",
            es: "Contraintuitivo y esencial: la vía de salida rápida es la razón por la que la gente se queda.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l6",
      slug: "verified-resilience-gamedays",
      lang: "yaml",
      caption: {
        en: "\"We know it works, we designed it that way\" — turned into a falsifiable experiment with an automatic abort.",
        es: "\"Sabemos que funciona, lo diseñamos así\" convertido en un experimento falsable con aborto automático.",
      },
      snippet: `
# experiment-001-checkout-az-loss.yml
# The claim: checkout tolerates the loss of one availability zone.
# Until injected, that claim is a hypothesis written in the present tense.

hypothesis:
  # Falsifiable: states the metric, the threshold and the window. "It stays up"
  # is not a hypothesis, it's a hope.
  statement: >
    With us-east-1b removed from service, checkout p99 latency stays under
    900 ms and the success rate stays above 99.5% for the full 10 minutes.

blast_radius:
  environment: production        # staging can rehearse mechanics, not answer this
  scope: 1 of 3 zones, checkout service only
  traffic: 100%                  # a partial-traffic run answers a smaller question
  duration: 10m

stop_condition:
  # AUTOMATIC, and tied to the falsifying metric — not to a person's judgement.
  - metric: checkout_success_rate
    below: 99.5
    for: 60s
    action: halt_and_rollback
  - metric: checkout_p99_ms
    above: 900
    for: 120s
    action: halt_and_rollback
  # A human watching a dashboard is NOT a stop condition.

pre_agreed_reaction:
  # Decided before we learn the answer, so the result can't be renegotiated.
  if_falsified: >
    Finding goes to the reliability backlog at the severity the data implies,
    the availability claim is retracted from the service tier doc the same day,
    and nobody is blamed — the design predated two dependency changes.
  if_confirmed: >
    Recorded as evidence with a date and a re-run cadence of one quarter.
    Evidence expires; the system keeps drifting.

rollback: remove the fault injection; no other action should be required
          (if recovery needs a control-plane call, that is a separate finding)
`,
      notes: [
        {
          at: "hypothesis written in the present tense",
          note: {
            en: "The senior engineer's confidence is the reason to run it, not a reason to skip it.",
            es: "La confianza del ingeniero senior es la razón para ejecutarlo, no para omitirlo.",
          },
        },
        {
          at: "environment: production",
          note: {
            en: "Staging lacks production's traffic mix, dependency behaviour and accumulated drift.",
            es: "Staging no tiene la mezcla de tráfico, el comportamiento de dependencias ni la deriva acumulada de producción.",
          },
        },
        {
          at: "AUTOMATIC, and tied to the falsifying metric",
          note: {
            en: "The abort must fire on the metric that would disprove the hypothesis, within seconds.",
            es: "El aborto debe dispararse con la métrica que refutaría la hipótesis, en segundos.",
          },
        },
        {
          at: "Decided before we learn the answer",
          note: {
            en: "Agreeing the reaction in advance is what stops a falsified result from being explained away.",
            es: "Acordar la reacción por adelantado es lo que evita que un resultado refutado se explique convenientemente.",
          },
        },
        {
          at: "Evidence expires",
          note: {
            en: "A passed gameday is evidence with a date on it, not a permanent property.",
            es: "Un gameday superado es evidencia con fecha, no una propiedad permanente.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l6",
      slug: "cloud-security-program-at-scale",
      lang: "python",
      caption: {
        en: "4,000 findings and 30 actions a week: why \"sort by severity and hire two analysts\" never closes the gap.",
        es: "4,000 hallazgos y 30 acciones por semana: por qué \"ordenar por severidad y contratar dos analistas\" nunca cierra la brecha.",
      },
      snippet: `
OPEN = 4_000          # across 200 accounts
WEEKLY_CAPACITY = 30  # what the team can actually action

# The plan already on the table: sort by severity, hire two more analysts.
print(f"weeks to drain: {OPEN / WEEKLY_CAPACITY:.0f}")          # 133 weeks
print(f"with 3x staff:  {OPEN / (WEEKLY_CAPACITY * 3):.0f}")    # 44 weeks
# Both numbers assume the queue is static. It isn't: the same misconfigurations
# regenerate every time a team creates a resource the same way.

# Two design problems hide behind one number.
# ── 1. No exposure-based prioritization ──────────────────────────────────
# Severity is a property of the FINDING. Exposure is a property of your system.
def exposure(f):
    return (f.internet_reachable and f.holds_customer_data and f.credential_path)
# A correlated attack SEQUENCE - public entry point -> over-permissive role ->
# data store - is the signal that reflects real risk. Three "medium" findings
# in a chain outrank a hundred isolated "highs".

# ── 2. No prevention retiring the classes that regenerate ────────────────
from collections import Counter
by_class = Counter(f.rule_id for f in findings)
print(by_class.most_common(3))
# [('s3-public-acl', 812), ('unencrypted-ebs', 640), ('overbroad-iam', 590)]
# 2,042 of 4,000 findings are THREE classes. Closing them one by one is 68 weeks
# of work that regenerates. An org-level guardrail retires each class once.

# Closing an instance is work. Retiring a class is progress.

# ── Change the scoreboard ───────────────────────────────────────────────
# report:     finding classes retired; median time-to-triage for correlated
#             sequences; honest detection coverage (what we do NOT see)
# do not report: number of open findings — it rewards closing the easy ones
`,
      notes: [
        {
          at: "Both numbers assume the queue is static",
          note: {
            en: "The staffing plan fails on arithmetic before you argue about priorities.",
            es: "El plan de contratación falla por aritmética antes de discutir prioridades.",
          },
        },
        {
          at: "Exposure is a property of your system",
          note: {
            en: "Vendor severity can't know your topology. Three chained mediums beat a hundred isolated highs.",
            es: "La severidad del proveedor no conoce tu topología. Tres medios encadenados superan cien altos aislados.",
          },
        },
        {
          at: "2,042 of 4,000 findings are THREE classes",
          note: {
            en: "Aggregate by rule before you triage. The distribution tells you where prevention pays.",
            es: "Agrupa por regla antes de triar. La distribución te dice dónde paga la prevención.",
          },
        },
        {
          at: "Retiring a class is progress",
          note: {
            en: "The one line to keep. It reframes the whole program.",
            es: "La línea que hay que recordar. Replantea el programa completo.",
          },
        },
        {
          at: "it rewards closing the easy ones",
          note: {
            en: "Any metric you report becomes the work. Open-finding count buys the cheapest closures.",
            es: "Cualquier métrica que reportas se vuelve el trabajo. Contar hallazgos abiertos compra los cierres más baratos.",
          },
        },
      ],
    },

    // ── cloud-platform-l7 ────────────────────────────────────────────────
    {
      lessonId: "cloud-platform-l7",
      slug: "cloud-strategy-and-lock-in-math",
      lang: "python",
      caption: {
        en: "The blanket portability rule, priced per component — the premium is paid everywhere and collected almost nowhere.",
        es: "La regla general de portabilidad, valuada por componente: la prima se paga en todas partes y se cobra casi en ninguna.",
      },
      snippet: `
# Proposed today: "only provider-agnostic services, so we're never locked in."
# Nobody wants to argue for lock-in, so this passes unless someone prices it.
# Lock-in is a price, not a sin. Price it per component, over the term you
# expect to hold it.

components = [
  # name,               switching cost, P(switch in 5y), agnostic premium/yr
  ("managed queue",         120_000,        0.05,           90_000),
  ("managed relational DB", 900_000,        0.10,          140_000),
  ("object storage",         40_000,        0.02,           30_000),
  ("identity provider",     600_000,        0.25,          180_000),
]

total_premium = expected_avoided = 0
for name, switch_cost, p, premium in components:
    premium_5y = premium * 5
    avoided    = switch_cost * p        # expected cost the rule saves us
    total_premium   += premium_5y
    expected_avoided += avoided
    verdict = "worth it" if avoided > premium_5y else "pays, never collects"
    print(f"{name:24} premium \${premium_5y:>9,}  avoided \${avoided:>9,}  {verdict}")

print(f"\\ntotal premium  \${total_premium:,}")
print(f"expected saving \${expected_avoided:,}")
# managed queue            premium $  450,000  avoided $    6,000  pays, never collects
# managed relational DB    premium $  700,000  avoided $   90,000  pays, never collects
# object storage           premium $  150,000  avoided $      800  pays, never collects
# identity provider        premium $  900,000  avoided $  150,000  pays, never collects
#
# total premium  $2,200,000
# expected saving $246,700
#
# The components you actually migrate are few and predictable. A blanket rule
# pays everywhere and collects almost nowhere.

# And the premium is usually understated, because "provider-agnostic" in
# practice means an internal abstraction over every managed service. That IS
# real engineering, and it usually leaks the exact semantics that made the
# service worth using.
#
# Worse: the expensive dependencies are the DATA FORMAT and the OPERATIONAL
# MODEL. Avoiding a proprietary API addresses neither.
`,
      notes: [
        {
          at: "unless someone prices it",
          note: {
            en: "The room is sympathetic. Numbers are the only way to argue against a virtuous-sounding rule.",
            es: "La sala simpatiza con la idea. Los números son la única forma de discutir una regla que suena virtuosa.",
          },
        },
        {
          at: "avoided    = switch_cost * p",
          note: {
            en: "Name the switching cost AND the probability. A rule that ignores probability buys insurance at any price.",
            es: "Nombra el costo de cambio Y la probabilidad. Una regla que ignora la probabilidad compra seguro a cualquier precio.",
          },
        },
        {
          at: "it usually leaks the exact semantics",
          note: {
            en: "The abstraction layer isn't free portability — it's the premium, plus a leak.",
            es: "La capa de abstracción no es portabilidad gratis: es la prima, más una fuga.",
          },
        },
        {
          at: "Avoiding a proprietary API addresses neither",
          note: {
            en: "The rule targets the cheap dependency and leaves both expensive ones untouched.",
            es: "La regla apunta a la dependencia barata y deja intactas las dos caras.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l7",
      slug: "capability-vs-cost-portfolio",
      lang: "markdown",
      caption: {
        en: "The CFO's 20%, answered with three buckets instead of one number — and 12% committed, not 20%.",
        es: "El 20% del CFO, respondido con tres cubos en vez de un número: y 12% comprometido, no 20%.",
      },
      snippet: `
# Cloud spend: response to the 20% reduction request

A 20% cut on the undifferentiated total lands on the capability bets, because
they are the only line with no incident history defending them. So we don't
present one number. We present three buckets with different owners and horizons.

| Bucket | Share | What it is | If cut |
|---|---|---|---|
| Keep-the-lights-on | 61% | Production capacity for current traffic | Availability loss, immediately |
| Recoverable waste | 12% | Idle resources, orphaned storage, over-provisioning | Nothing. This is free money. |
| Capability bets | 27% | Data platform migration, observability rebuild | Deferred capability — see below |

## What we commit to
**12%**, all of it from recoverable waste, with named work items and dates.
We do not commit to 20%. We have identified 12%; committing to an unidentified
8% would make our credibility the buffer, and we'd spend the year explaining
a miss instead of delivering the saving.

## The remaining 8%, priced out loud
It comes out of the two capability bets. That is a legitimate business choice —
it is simply not a free one, so here is what it costs:

- **Data platform migration (5%)** — deferring 12 months keeps the nightly
  export in place. Analytics stays a day stale; the three teams waiting on it
  keep their own pipelines, which is duplicated cost we're already paying.
- **Observability rebuild (3%)** — deferring keeps median incident diagnosis
  where it is. Last year that was the largest contributor to time-to-recover.

We are not trying to win the meeting. We are trying to make sure the business
makes the decision it is actually making, with the price attached.
`,
      notes: [
        {
          at: "no incident history defending them",
          note: {
            en: "Why a flat percentage always lands on the future: only the present has an incident record.",
            es: "Por qué un porcentaje plano siempre cae sobre el futuro: solo el presente tiene historial de incidentes.",
          },
        },
        {
          at: "| Recoverable waste | 12% |",
          note: {
            en: "Separating waste from capacity is what makes part of the cut genuinely free.",
            es: "Separar el desperdicio de la capacidad es lo que hace que parte del recorte sea realmente gratis.",
          },
        },
        {
          at: "make our credibility the buffer",
          note: {
            en: "Commit only to savings you've identified. An unidentified target is borrowed against your name.",
            es: "Compromete solo ahorros que ya identificaste. Una meta sin identificar se toma prestada contra tu nombre.",
          },
        },
        {
          at: "We are not trying to win the meeting",
          note: {
            en: "The goal is an informed decision, not a defended budget. That distinction is the L7 move.",
            es: "El objetivo es una decisión informada, no un presupuesto defendido. Esa distinción es el movimiento de L7.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l7",
      slug: "org-wide-reliability-as-risk",
      lang: "python",
      caption: {
        en: "The two proposals that got a nod and no budget, replaced by expected annual loss with inspectable inputs.",
        es: "Las dos propuestas que recibieron un asentimiento y ningún presupuesto, reemplazadas por pérdida anual esperada con insumos inspeccionables.",
      },
      snippet: `
# Two previous proposals both got a nod and no budget:
#   - an availability benchmark comparison  -> invites "what does that cost us?"
#   - an architecture risk review           -> describes mechanism, not exposure
# Neither competes with a feature, because neither is denominated in money.

# Every input below is a number someone else can challenge. That is the point:
# a challenged estimate everyone can inspect beats a confident assertion nobody
# can check.
REVENUE_PER_HOUR      = 210_000   # finance, FY plan / operating hours
DEGRADED_CONVERSION   = 0.35      # measured during the March incident
INCIDENT_RESPONSE_COST=  18_000   # per incident: eng hours + support + credits

# From our own incident record, last 8 quarters:
INCIDENTS_PER_YEAR = 4.5
MEAN_HOURS         = 2.3

revenue_loss = INCIDENTS_PER_YEAR * MEAN_HOURS * REVENUE_PER_HOUR * DEGRADED_CONVERSION
response     = INCIDENTS_PER_YEAR * INCIDENT_RESPONSE_COST
expected_annual_loss = revenue_loss + response
print(f"expected annual loss: \${expected_annual_loss:,.0f}")
# expected annual loss: $841,725

# The ask, in the same units:
PROGRAM_COST = 2 * 2 * 95_000 / 4 * 2   # 2 engineers, 2 quarters, loaded cost
TARGET_REDUCTION = 0.40                 # what the program is scoped to remove
print(f"program cost: \${PROGRAM_COST:,.0f}")
print(f"expected reduction: \${expected_annual_loss * TARGET_REDUCTION:,.0f}/yr")
# program cost: $190,000
# expected reduction: $336,690/yr

# Now reliability is on the same axis as a feature, and the exec team can
# compare it to anything else competing for those two engineers.
#
# Note what we did NOT do: wait for the next outage to make the argument for us.
# That works, and it is an abdication — we would have chosen to let it happen.
`,
      notes: [
        {
          at: "neither is denominated in money",
          note: {
            en: "Both previous proposals were true and unfundable. Truth isn't the missing ingredient; a shared axis is.",
            es: "Ambas propuestas anteriores eran ciertas e imposibles de financiar. Lo que falta no es verdad, es un eje común.",
          },
        },
        {
          at: "DEGRADED_CONVERSION   = 0.35",
          note: {
            en: "The input most likely to be challenged, so it comes from a measured incident, not an assumption.",
            es: "El insumo con más probabilidad de ser cuestionado, así que viene de un incidente medido, no de un supuesto.",
          },
        },
        {
          at: "expected annual loss: $841,725",
          note: {
            en: "Frequency × duration × revenue-per-hour. Crude, transparent, and comparable to a feature's upside.",
            es: "Frecuencia × duración × ingreso por hora. Tosco, transparente y comparable con el beneficio de una función.",
          },
        },
        {
          at: "we would have chosen to let it happen",
          note: {
            en: "Waiting for the outage is an accurate read of the org and an abdication at the same time.",
            es: "Esperar la caída es una lectura acertada de la organización y a la vez una abdicación.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l7",
      slug: "migration-as-a-multi-year-program",
      lang: "markdown",
      caption: {
        en: "Stalled at 70% for two quarters: the per-service endgame register instead of the mandate.",
        es: "Estancada en 70% por dos trimestres: el registro de cierre por servicio en vez del mandato.",
      },
      snippet: `
# Platform migration — endgame register

At 70%, unmoved for two quarters. Remaining: **40 low-traffic services across
12 teams.** Leadership has offered a mandate with a hard deadline.

Migrations don't stall in the middle; they stall here. The tail is small,
low-traffic services whose owners gain nothing from moving. A deadline doesn't
change that arithmetic — it just moves the cost onto teams who were right that
migrating was a poor use of their quarter.

So every remaining service gets ONE of three decisions, with an owner and a date.
"We'll get to it" is not on the list: it's a cost with no owner and no date.

| Services | Decision | Owner | Date | Note |
|---|---|---|---|---|
| 14 | **Migrate** | owning team | Q3-Q4 | Real ongoing value; platform pairs 1 week each |
| 19 | **Retire** | owning team | Q3 | Zero or near-zero traffic. Cheaper to delete than to move. |
| 7 | **Stay, permanently** | platform | — | Costed below. A legitimate outcome, not a failure. |

## The 7 that stay
Old platform, indefinitely, **owned and paid for**: $14k/mo of infrastructure
plus a named maintainer. This is written into the platform budget for FY+1 and
FY+2 so it is a decision, not a leak.

Deciding this explicitly is what lets us shut down the migration PROGRAM —
its reporting, its steering meeting, its dashboard — and hand the remaining 33
services to their teams as ordinary work.

## What we'd do differently
Each increment should have been independently valuable and reversible. Ours
front-loaded the platform build and back-loaded the value, which is why 70% felt
like nothing shipped when priorities changed. They always change.
`,
      notes: [
        {
          at: "they stall here",
          note: {
            en: "Predictable enough to plan for: the tail is where incentives run out, not where difficulty peaks.",
            es: "Predecible: la cola es donde se agotan los incentivos, no donde la dificultad es mayor.",
          },
        },
        {
          at: "| 19 | **Retire** |",
          note: {
            en: "Usually the largest bucket, and the one nobody proposes because it isn't migration work.",
            es: "Suele ser el grupo más grande, y el que nadie propone porque no es trabajo de migración.",
          },
        },
        {
          at: "owned and paid for",
          note: {
            en: "\"Permanently on the old platform, owned and paid for\" is a real outcome. \"We'll get to it\" isn't.",
            es: "\"Permanentemente en la plataforma vieja, con dueño y pagada\" es un resultado real. \"Ya lo haremos\" no.",
          },
        },
        {
          at: "shut down the migration PROGRAM",
          note: {
            en: "Ending the program is the deliverable. A program with no end date outlives its own value.",
            es: "Terminar el programa es el entregable. Un programa sin fecha de término sobrevive a su propio valor.",
          },
        },
        {
          at: "independently valuable and reversible",
          note: {
            en: "The structural fix. Front-loaded platform work is why the 70% mark felt like nothing shipped.",
            es: "El arreglo estructural. Cargar el trabajo de plataforma al inicio es por qué el 70% se sintió como nada entregado.",
          },
        },
      ],
    },
  ],
};
