/**
 * Code artifacts for the Cloud & Platform L3-L4 concepts that had no widget, no
 * snippet and no system diagram — 9 concepts whose only visual was a text
 * schematic, which is what the wall-of-text pass was called to fix.
 *
 * Two rules held while writing these:
 *
 * 1. Every number comes from the concept's OWN authored example, which already
 *    passed the fact gate (research/2026-07-25-aws-verified-facts.md). Nothing
 *    here introduces a new price, limit, or percentage.
 * 2. The artifact is whatever a Staff engineer would actually produce for that
 *    decision — a cost query, a Terraform diff, a coverage calculation — not a
 *    toy function invented so the concept could have code on the page.
 *
 * Annotation lines are resolved by substring at build time (build-code-patch),
 * so editing a snippet cannot silently misplace a note.
 */
module.exports = {
  patches: [
    // ── cloud-platform-l3 ────────────────────────────────────────────────
    {
      lessonId: "cloud-platform-l3",
      slug: "shared-responsibility-in-practice",
      lang: "yaml",
      caption: {
        en: "The per-service responsibility line, written down. This is the artifact the two-box diagram can't give you.",
        es: "La línea de responsabilidad por servicio, escrita. Este es el artefacto que el diagrama de dos cajas no te da.",
      },
      snippet: `
# ecs-managed-instances.responsibility.yml
# Written BEFORE the migration, reviewed by security and finance.
service: ECS Managed Instances
replaces: ECS on self-managed EC2 + AMI pipeline

provider_absorbs:
  - patching the host OS and container agent
  - AMI build and rollout (the work we are buying our way out of)

we_still_own:
  - the container image and everything in it
  - task-level IAM, secrets, network policy

changed_and_must_be_re-verified:   # ← the part teams miss
  - debug_access:
      before: SSH to the instance during an incident
      after:  no host access; reproduce from logs and exec into the task
  - instance_lifecycle:
      after: nodes are replaced on a provider cadence, not ours
      action: drain-safe shutdown handling is now load-bearing
  - runtime_monitoring:
      question: does our agent still see host-level events?
      status: UNVERIFIED -> blocks the migration until answered
  - discount_coverage:
      question: does the Compute Savings Plan offset this charge?
      status: UNVERIFIED -> finance sized it for 80% of steady-state compute
`,
      notes: [
        {
          at: "changed_and_must_be_re-verified",
          note: {
            en: "This section is the whole point. Every responsibility the provider takes moves something you were relying on.",
            es: "Esta sección es todo el punto. Cada responsabilidad que toma el proveedor mueve algo en lo que te apoyabas.",
          },
        },
        {
          at: "no host access; reproduce from logs",
          note: {
            en: "Not a security note — an incident-response note. Your runbook's first step may no longer exist.",
            es: "No es una nota de seguridad, es de respuesta a incidentes. El primer paso de tu runbook puede ya no existir.",
          },
        },
        {
          at: "status: UNVERIFIED -> blocks the migration",
          note: {
            en: "Detection scope and discount coverage are the two blind spots. UNVERIFIED is a valid state; assuming is not.",
            es: "El alcance de detección y la cobertura del descuento son los dos puntos ciegos. UNVERIFIED es un estado válido; suponer no.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l3",
      slug: "managed-service-tax",
      lang: "python",
      caption: {
        en: "The comparison the $560-vs-$1,400 benchmark left out — same numbers, complete accounting.",
        es: "La comparación que el benchmark de $560 vs $1,400 dejó fuera: los mismos números, contabilidad completa.",
      },
      snippet: `
# The engineer's comparison: managed $1,400/mo vs self-hosted $560/mo -> "60% saving".
# Both numbers are correct. The comparison is not, because only one side is complete.

MANAGED_MONTHLY = 1_400
SELF_HOSTED_INFRA_MONTHLY = 560     # 3 instances, measured, real

# The work the premium was buying. Hours are the team's own estimates, and the
# blended cost of an engineer-hour here is $95.
ENGINEER_HOUR = 95
recurring_ops = {
    "patching + version upgrades": 6,   # hours/month
    "capacity changes":            2,
    "backup restore verification": 3,   # the one everyone skips until it matters
    "on-call for the broker itself": 4,
}
ops_monthly = sum(recurring_ops.values()) * ENGINEER_HOUR

self_hosted_true = SELF_HOSTED_INFRA_MONTHLY + ops_monthly
print(f"managed:            \${MANAGED_MONTHLY:,}/mo")
print(f"self-hosted infra:  \${SELF_HOSTED_INFRA_MONTHLY:,}/mo")
print(f"+ ops ({sum(recurring_ops.values())} h/mo): \${ops_monthly:,}/mo")
print(f"self-hosted total:  \${self_hosted_true:,}/mo")
# managed:            $1,400/mo
# self-hosted infra:  $560/mo
# + ops (15 h/mo):    $1,425/mo
# self-hosted total:  $1,985/mo   <- the 60% saving is a 42% increase

# And this ignores the one-time migration entirely, plus the fact that 15 h/mo
# does not shrink when the team is 12 engineers instead of 120.
`,
      notes: [
        {
          at: "only one side is complete",
          note: {
            en: "The tax is easy to measure, which is exactly why it dominates the conversation and the ops cost doesn't.",
            es: "El impuesto es fácil de medir, y justo por eso domina la conversación y el costo operativo no.",
          },
        },
        {
          at: '"backup restore verification": 3',
          note: {
            en: "Untested backups are the line item that reads as free right up until the restore fails.",
            es: "Los respaldos sin probar son la línea que parece gratis hasta que la restauración falla.",
          },
        },
        {
          at: "<- the 60% saving is a 42% increase",
          note: {
            en: "Same two real numbers, opposite conclusion. Compare total cost of ownership, never price against price.",
            es: "Los mismos dos números reales, conclusión opuesta. Compara costo total de propiedad, nunca precio contra precio.",
          },
        },
        {
          at: "does not shrink when the team is 12 engineers",
          note: {
            en: "Operational work has a floor. That's why the premium is usually cheapest at small scale.",
            es: "El trabajo operativo tiene un piso. Por eso el sobreprecio suele ser más barato a escala pequeña.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l3",
      slug: "cloud-cost-as-a-design-signal",
      lang: "sql",
      caption: {
        en: "Reading the 18%-with-flat-traffic bill as telemetry: three queries, three engineering findings.",
        es: "Leer la factura que subió 18% con tráfico plano como telemetría: tres consultas, tres hallazgos de ingeniería.",
      },
      snippet: `
-- Cost and Usage Report, queried as telemetry rather than read as a statement.
-- Symptom: spend +18% month over month, request volume flat.

-- 1. WHAT grew? Group by usage type, not by service: "EC2 +$4k" is not actionable,
--    "EC2:PublicIPv4 +$4k" is.
SELECT line_item_usage_type,
       SUM(CASE WHEN month = 'current'  THEN unblended_cost END) AS now_cost,
       SUM(CASE WHEN month = 'previous' THEN unblended_cost END) AS was_cost
FROM cur
GROUP BY line_item_usage_type
ORDER BY (now_cost - was_cost) DESC
LIMIT 10;
-- PublicIPv4:InUseAddress   +40%   <- inventory finding: how many are unattached?
-- EBS:SnapshotUsage         +25%   <- accumulation: a create path with no delete
-- DataTransfer-Regional     +12%   <- topology: chatty cross-AZ traffic

-- 2. Is it price or quantity? Flat traffic + rising cost means quantity.
SELECT line_item_usage_type,
       SUM(usage_amount)                        AS units,
       SUM(unblended_cost) / SUM(usage_amount)  AS unit_cost
FROM cur
WHERE line_item_usage_type = 'EBS:SnapshotUsage'
GROUP BY 1, month;
-- unit_cost unchanged, units +25% -> nobody raised a price. We are keeping more.

-- 3. Undeniable waste first: idle resources billed at the full rate.
SELECT resource_id, SUM(unblended_cost) AS cost, MAX(usage_amount) AS peak_usage
FROM cur
WHERE line_item_usage_type LIKE '%PublicIPv4%'
GROUP BY resource_id
HAVING MAX(usage_amount) = 0        -- billed, never used
ORDER BY cost DESC;
`,
      notes: [
        {
          at: "queried as telemetry rather than read as a statement",
          note: {
            en: "The bill is the only complete inventory of what you own, including what nobody remembers creating.",
            es: "La factura es el único inventario completo de lo que tienes, incluido lo que nadie recuerda haber creado.",
          },
        },
        {
          at: "<- accumulation: a create path with no delete",
          note: {
            en: "Cost rising while traffic is flat is accumulation, not pricing. Look for a create path with no matching delete.",
            es: "Costo que sube con tráfico plano es acumulación, no precio. Busca un camino que crea y nunca borra.",
          },
        },
        {
          at: "unit_cost unchanged, units +25%",
          note: {
            en: "Splitting cost into price × quantity is what turns a finance question into an engineering one.",
            es: "Separar el costo en precio × cantidad es lo que convierte una pregunta financiera en una de ingeniería.",
          },
        },
        {
          at: "HAVING MAX(usage_amount) = 0",
          note: {
            en: "Triage order: undeniable waste, then analysed efficiency, then procurement. Never commit before diagnosing.",
            es: "Orden de triaje: desperdicio innegable, luego eficiencia analizada, luego compras. Nunca comprometerse antes de diagnosticar.",
          },
        },
      ],
    },

    // ── cloud-platform-l4 ────────────────────────────────────────────────
    {
      lessonId: "cloud-platform-l4",
      slug: "cold-start-and-warm-path-economics",
      lang: "javascript",
      caption: {
        en: "The 2.4 s p99, fixed in the order the mitigations actually cost: free, then cheap, then paid.",
        es: "El p99 de 2.4 s, arreglado en el orden en que las mitigaciones cuestan: gratis, luego barato, luego pagado.",
      },
      snippet: `
// BEFORE — p50 90 ms, p99 2.4 s. Init is 1.9 s of that:
//   1.1 s importing the SDK bundle, 600 ms fetching config.
const AWS = require('aws-sdk');                 // whole SDK: ~1.1 s to load
const config = await getParameters('/app/*');   // 600 ms, on EVERY cold start

exports.handler = async (event) => { /* 90 ms of actual work */ };


// AFTER — step 1: trim initialization. Costs nothing.
// Import only the client you use, and let the config fetch happen ONCE per
// environment rather than once per request path.
const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');

let configPromise;                              // module scope = survives warm invokes
const loadConfig = () => (configPromise ??= fetchConfig());

exports.handler = async (event) => {
  const config = await loadConfig();            // cold: 600 ms. warm: 0 ms.
  // ...
};

// step 2: raise memory. Cheap, real, NOT a cure — more memory means
// proportionally more CPU during init, so a CPU-bound 1.1 s import gets faster.
// Measure it; don't assume a multiple.

// step 3: pay for warm capacity. Only now, and know what you're undoing:
//   provisioned concurrency removes the cold start AND the idle-time saving
//   that made the serverless choice attractive.
// Snapshot-restore init (SnapStart) is the other lever — but it does NOT
// support Node.js, so it is not available to this function.
`,
      notes: [
        {
          at: "600 ms, on EVERY cold start",
          note: {
            en: "Cold starts hit on scale-out and after idleness, not just after a deploy — that's why they live in p99.",
            es: "Los arranques en frío ocurren al escalar y tras inactividad, no solo tras un deploy: por eso viven en el p99.",
          },
        },
        {
          at: "configPromise ??= fetchConfig()",
          note: {
            en: "Cache the promise, not the value: two concurrent first invocations would otherwise both fetch.",
            es: "Cachea la promesa, no el valor: si no, dos primeras invocaciones concurrentes harían dos fetch.",
          },
        },
        {
          at: "step 2: raise memory",
          note: {
            en: "Memory buys CPU. It helps a CPU-bound import and does nothing for a slow network call.",
            es: "La memoria compra CPU. Ayuda a un import limitado por CPU y no hace nada por una llamada de red lenta.",
          },
        },
        {
          at: "step 3: pay for warm capacity",
          note: {
            en: "Last, because it reverses the economics you chose serverless for. Order the mitigations by cost.",
            es: "Al final, porque revierte la economía por la que elegiste serverless. Ordena las mitigaciones por costo.",
          },
        },
        {
          at: "support Node.js, so it is not available",
          note: {
            en: "Runtime-restricted. Check applicability before you plan a quarter around it.",
            es: "Restringido por runtime. Verifica que aplique antes de planear un trimestre alrededor.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l4",
      slug: "private-network-paths-and-egress",
      lang: "hcl",
      caption: {
        en: "Why peering for accounts A→B became the wrong answer at account E: the diff nobody drew on the whiteboard.",
        es: "Por qué el peering de A→B fue la respuesta equivocada al llegar la cuenta E: el diff que nadie dibujó en la pizarra.",
      },
      snippet: `
# Month 0 — "peering is free, it's just a line between two boxes."
resource "aws_vpc_peering_connection" "checkout_to_payments" {
  vpc_id      = aws_vpc.checkout.id     # account B
  peer_vpc_id = var.payments_vpc_id     # account A
}
# Plus a route in EVERY route table on both sides, and non-overlapping CIDRs.

# Month 3 — fulfilment (C), mobile BFF (D), reporting (E) need the same service.
# Peering does not transit: B cannot reach A "through" C. So it's not 4 links,
# it's one per PAIR that must talk — and each is a cross-account change request.
#
#   consumers | peering links | who must act to add the next one
#   ----------+---------------+----------------------------------
#       2     |       1       | both account owners
#       5     |      10       | both account owners, every time
#
# That last column is the whole decision, and no two-box diagram shows it.

# The alternative, priced by the same question:
resource "aws_vpc_endpoint_service" "payments" {   # provider publishes ONCE
  network_load_balancer_arns = [aws_lb.payments.arn]
  acceptance_required        = true
}

resource "aws_vpc_endpoint" "payments_from_e" {    # consumer self-serves
  vpc_id            = aws_vpc.reporting.id
  service_name      = var.payments_service_name
  vpc_endpoint_type = "Interface"
}
# Now adding consumer #6 is one change in account F. The payments team does
# nothing. It costs more per hour than peering and less per new consumer.
`,
      notes: [
        {
          at: "Peering does not transit",
          note: {
            en: "The single most expensive property to discover late: peering is pairwise, so links grow quadratically.",
            es: "La propiedad más cara de descubrir tarde: el peering es por pares, así que los enlaces crecen cuadráticamente.",
          },
        },
        {
          at: "who must act to add the next one",
          note: {
            en: "Ask this question first. It predicts the model's real cost in two years better than any price sheet.",
            es: "Haz esta pregunta primero. Predice el costo real del modelo en dos años mejor que cualquier lista de precios.",
          },
        },
        {
          at: "provider publishes ONCE",
          note: {
            en: "Endpoints scale per service, not per pair — the provider publishes once and consumers arrive on their own.",
            es: "Los endpoints escalan por servicio, no por par: el proveedor publica una vez y los consumidores llegan solos.",
          },
        },
        {
          at: "more per hour than peering and less per new consumer",
          note: {
            en: "Choose by growth path and ownership. The hourly rate is the number that misleads here.",
            es: "Elige por trayectoria de crecimiento y propiedad. La tarifa por hora es el número que engaña aquí.",
          },
        },
      ],
    },
    {
      lessonId: "cloud-platform-l4",
      slug: "commitment-based-discounts",
      lang: "python",
      caption: {
        en: "The $34k commitment finance proposed, recomputed with the two facts engineering had.",
        es: "El compromiso de $34k que propuso finanzas, recalculado con los dos datos que tenía ingeniería.",
      },
      snippet: `
# Finance's proposal: commit $34k of a $40k/month compute spend, 3 years.
# Engineering knows two things that aren't on the spreadsheet.

TOTAL_MONTHLY   = 40_000
PROPOSED_COMMIT = 34_000

decommissioning  = 6_000   # legacy service, gone in ~9 months of a 36-month term
moving_off_model = 8_000    # shifting to managed instances, whose MANAGEMENT FEE
                           # sits OUTSIDE the compute commitment

# What is actually steady for the full term?
steady = TOTAL_MONTHLY - decommissioning - moving_off_model
print(f"steady footprint: \${steady:,}/mo, proposed commit: \${PROPOSED_COMMIT:,}/mo")
# steady footprint: $26,000/mo, proposed commit: $34,000/mo

overcommit = PROPOSED_COMMIT - steady
print(f"overcommitted by \${overcommit:,}/mo -> \${overcommit * 36:,} over the term")
# overcommitted by $8,000/mo -> $288,000 over the term
#
# Overcommitment is not a smaller discount. It is spend on capacity you no
# longer run: you pay the commitment whether or not the usage exists.

# Coverage is the metric that hides this, because it looks great either way.
def coverage(commit, spend):  return commit / spend
print(f"coverage at \${PROPOSED_COMMIT:,}: {coverage(PROPOSED_COMMIT, TOTAL_MONTHLY):.0%}")
# coverage at $34,000: 85%   <- a good number describing the wrong thing

# Unit cost is the metric that catches it: cost per 1k requests, tracked across
# the change. High coverage of a wasteful architecture just discounts the waste.
`,
      notes: [
        {
          at: "sits OUTSIDE the compute commitment",
          note: {
            en: "Name what the commitment does NOT cover. Blending fees that sit outside it overstates the saving.",
            es: "Nombra lo que el compromiso NO cubre. Mezclar cargos que quedan fuera exagera el ahorro.",
          },
        },
        {
          at: "steady footprint: $26,000/mo",
          note: {
            en: "You're selling optionality for a rate. Only the part that will still exist in three years is safe to sell.",
            es: "Estás vendiendo opcionalidad por una tarifa. Solo la parte que seguirá existiendo en tres años se puede vender.",
          },
        },
        {
          at: "$288,000 over the term",
          note: {
            en: "Sequence matters: clean up, then commit. Buying first is an efficient purchase of waste.",
            es: "El orden importa: primero limpia, luego compromete. Comprar antes es comprar desperdicio con eficiencia.",
          },
        },
        {
          at: "<- a good number describing the wrong thing",
          note: {
            en: "Coverage rewards committing to anything. Unit cost is the metric that survives an architecture change.",
            es: "La cobertura premia comprometerse con cualquier cosa. El costo unitario es la métrica que sobrevive un cambio de arquitectura.",
          },
        },
      ],
    },
  ],
};
