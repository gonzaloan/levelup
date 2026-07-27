/**
 * Round-1 evaluator fixes: the smaller correctness defects.
 *
 * Each of these is small enough to look like a nit and is not, because the whole
 * premise of these artifacts is "this is the real deliverable". A Terraform block
 * that wouldn't validate, a printed total that the code doesn't produce, or an
 * SLO stated in the wrong unit teaches the learner to trust output they
 * shouldn't — which is the opposite of what a worked artifact is for.
 *
 *   • cloud-strategy-and-lock-in-math: printed $246,700; the arithmetic gives
 *     $246,800.
 *   • static-stability: both ASG blocks omitted `max_size` (required by the AWS
 *     provider), so neither would `terraform validate`.
 *   • cold-start: top-level `await` in a CommonJS module.
 *   • observability SLO: the budget was stated in MINUTES over a request-ratio
 *     SLI — mixing the two units is the exact error the concept teaches against.
 */
module.exports = {
  patches: [
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
    total_premium    += premium_5y
    expected_avoided += avoided
    verdict = "worth it" if avoided > premium_5y else "pays, never collects"
    print(f"{name:24} premium \${premium_5y:>9,}  avoided \${avoided:>9,}  {verdict}")

print(f"\\ntotal premium   \${total_premium:,}")
print(f"expected saving \${expected_avoided:,.0f}")
# managed queue            premium $  450,000  avoided $    6,000  pays, never collects
# managed relational DB    premium $  700,000  avoided $   90,000  pays, never collects
# object storage           premium $  150,000  avoided $      800  pays, never collects
# identity provider        premium $  900,000  avoided $  150,000  pays, never collects
#
# total premium   $2,200,000
# expected saving $246,800
#
# The components you actually migrate are few and predictable. A blanket rule
# pays everywhere and collects almost nowhere.

# Two things this table still understates:
#   1. "Provider-agnostic" in practice means an internal abstraction over every
#      managed service. That IS real engineering, and it usually leaks the exact
#      semantics that made the service worth using.
#   2. The expensive dependencies are the DATA FORMAT and the OPERATIONAL MODEL.
#      Avoiding a proprietary API addresses neither of them.
`,
      notes: [
        { at: "unless someone prices it", note: {
          en: "The room is sympathetic. Numbers are the only way to argue against a virtuous-sounding rule.",
          es: "La sala simpatiza con la idea. Los números son la única forma de discutir una regla que suena virtuosa." } },
        { at: "avoided    = switch_cost * p", note: {
          en: "Name the switching cost AND the probability. A rule that ignores probability buys insurance at any price.",
          es: "Nombra el costo de cambio Y la probabilidad. Una regla que ignora la probabilidad compra seguro a cualquier precio." } },
        { at: "it usually leaks the exact", note: {
          en: "The abstraction layer isn't free portability — it's the premium, plus a leak.",
          es: "La capa de abstracción no es portabilidad gratis: es la prima, más una fuga." } },
        { at: "Avoiding a proprietary API addresses neither", note: {
          en: "The rule targets the cheap dependency and leaves both expensive ones untouched.",
          es: "La regla apunta a la dependencia barata y deja intactas las dos costosas." } },
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
  min_size           = 6
  max_size           = 12
  desired_capacity   = 6          # 2 per zone, 100% utilized
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
# Ask the one diagnostic question: does recovery require CREATING anything?
# Yes — it requires launching instances. That is a control-plane call, made at
# the moment the control plane is most likely to be degraded, and every other
# team in the region is making the same call.

# AFTER — statically stable: recovery requires nothing to be created.
resource "aws_autoscaling_group" "api" {
  min_size           = 9
  max_size           = 18
  desired_capacity   = 9          # 3 per zone; any 2 zones carry all traffic
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
        { at: "does recovery require CREATING anything?", note: {
          en: "The whole test in one question. Control planes create and change; data planes serve what exists.",
          es: "La prueba completa en una pregunta. Los control planes crean y cambian; los data planes sirven lo que existe." } },
        { at: "team in the region is making the same call", note: {
          en: "Correlated demand is why control-plane calls fail exactly when you need them most.",
          es: "La demanda correlacionada es la razón por la que las llamadas al control plane fallan justo cuando más las necesitas." } },
        { at: "That idle third IS the availability", note: {
          en: "Static stability is bought with idle capacity. If you can't afford it, say so — don't claim you have it.",
          es: "La estabilidad estática se compra con capacidad ociosa. Si no puedes pagarla, dilo; no afirmes que la tienes." } },
        { at: "automating the failover", note: {
          en: "Automation changes who makes the call, not whether the call can succeed.",
          es: "La automatización cambia quién hace la llamada, no si la llamada puede tener éxito." } },
      ],
    },
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

exports.handler = async (event) => {
  const config = await getParameters('/app/*'); // 600 ms, on EVERY invocation
  // ...90 ms of actual work
};


// AFTER — step 1: trim initialization. Costs nothing.
// Import only the client you use, and fetch config ONCE per execution
// environment rather than once per request.
const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');

let configPromise;                              // module scope = survives warm invokes
const loadConfig = () => (configPromise ??= fetchConfig());

exports.handler = async (event) => {
  const config = await loadConfig();            // cold: 600 ms. warm: 0 ms.
  // ...
};

// step 2: raise memory. Cheap, real, NOT a cure — more memory means
// proportionally more CPU during init, so a CPU-bound 1.1 s import gets faster.
// It does nothing for a slow network call. Measure it; don't assume a multiple.

// step 3: pay for warm capacity. Only now, and know what you're undoing:
//   provisioned concurrency removes the cold start AND the idle-time saving
//   that made the serverless choice attractive in the first place.
// Snapshot-restore init (SnapStart) is the other lever — but it does not
// support Node.js, so it is not available to this function.
`,
      notes: [
        { at: "600 ms, on EVERY invocation", note: {
          en: "Config fetched inside the handler is paid on every request, not just cold ones — the cheapest bug here.",
          es: "La configuración leída dentro del handler se paga en cada petición, no solo en las frías: el bug más barato de aquí." } },
        { at: "configPromise ??= fetchConfig()", note: {
          en: "Cache the promise, not the value: two concurrent first invocations would otherwise both fetch.",
          es: "Cachea la promesa, no el valor: si no, dos primeras invocaciones concurrentes harían dos fetch." } },
        { at: "step 2: raise memory", note: {
          en: "Memory buys CPU. It helps a CPU-bound import and does nothing for a slow network call.",
          es: "La memoria compra CPU. Ayuda a un import limitado por CPU y no hace nada por una llamada de red lenta." } },
        { at: "step 3: pay for warm capacity", note: {
          en: "Last, because it reverses the economics you chose serverless for. Order the mitigations by cost.",
          es: "Al final, porque revierte la economía por la que elegiste serverless. Ordena las mitigaciones por costo." } },
        { at: "support Node.js, so it is not available", note: {
          en: "Runtime-restricted. Check applicability before you plan a quarter around it.",
          es: "Restringido por runtime. Verifica que aplique antes de planear un trimestre alrededor." } },
      ],
    },
    {
      lessonId: "systems-architecture-l6",
      slug: "observability-for-distributed-systems",
      lang: "yaml",
      caption: {
        en: "The 99.9%/30-day checkout SLO as configuration: what pages, what freezes, and what stays a dashboard.",
        es: "El SLO de 99.9%/30 días de checkout como configuración: qué alerta, qué congela y qué queda en un panel.",
      },
      snippet: `
# checkout-api.slo.yml — the artifact that turns "is it healthy?" into a decision.
slo:
  name: checkout-availability
  objective: 99.9        # over a rolling 30 days
  window: 30d
  # The SLI must be measured where the USER is, not inside the service.
  indicator:
    good:  'sum(rate(http_requests_total{route="/checkout",code!~"5.."}[5m]))'
    total: 'sum(rate(http_requests_total{route="/checkout"}[5m]))'
  # This is a REQUEST-RATIO SLI, so the budget is denominated in requests, not
  # minutes: 0.1% of ~10,000,000 monthly requests = 10,000 failed requests.
  # Mixing the two units ("43 minutes of downtime") is the classic error — a
  # ratio SLI cannot tell you about time, and 10,000 failures spread thin looks
  # nothing like 43 minutes of hard outage.
  budget: 10_000 failed requests / 30d

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

# NOT alerts. These are causes, and they wake you for things users never noticed.
not_alerts: [cpu_high, memory_high, pod_restarted, queue_depth]

# The decision the budget makes for you, agreed in advance so it isn't an
# argument at 2am:
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
        { at: "measured where the USER is", note: {
          en: "An SLI computed from internal success counters can read 100% while every user sees a timeout.",
          es: "Un SLI calculado con contadores internos puede marcar 100% mientras cada usuario ve un timeout." } },
        { at: "Mixing the two units", note: {
          en: "Pick request-ratio or time-based and stay in that unit. Converting between them invents precision you don't have.",
          es: "Elige razón de peticiones o tiempo y quédate en esa unidad. Convertir entre ellas inventa una precisión que no tienes." } },
        { at: "burn_rate: 14.4", note: {
          en: "Burn rate, not raw error rate: it answers \"will this cost us the month?\" instead of \"is something wrong?\".",
          es: "Tasa de consumo, no tasa de error: responde \"¿esto nos costará el mes?\" en vez de \"¿algo va mal?\"." } },
        { at: "not_alerts: [cpu_high", note: {
          en: "Alert on user-facing symptoms and burn rate. Cause-based pages train the team to ignore the pager.",
          es: "Alerta sobre síntomas que ve el usuario y sobre el consumo. Las alertas por causa enseñan a ignorar el pager." } },
        { at: 'budget_exhausted: "freeze feature deploys', note: {
          en: "Written before the incident, so the freeze is a pre-agreed policy rather than a fight about judgement.",
          es: "Escrito antes del incidente, así el congelamiento es política acordada y no una pelea de criterios." } },
        { at: "open breaker + healthy SLO = degraded, silently", note: {
          en: "The failure mode teams miss: the fallback works, so nothing alerts, and the dependency stays broken for weeks.",
          es: "La falla que los equipos pasan por alto: el fallback funciona, nada alerta, y la dependencia sigue rota semanas." } },
      ],
    },
  ],
};
