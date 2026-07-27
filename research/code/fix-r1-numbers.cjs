/**
 * Round-1 evaluator fixes: artifacts whose numbers were re-invented instead of
 * traced to the concept's own authored example.
 *
 * The original claim was that every number came from the concept's example. On
 * eight artifacts that was false, and on five of those the invented numbers led
 * to a conclusion OPPOSITE to what the example teaches — the artifact and the
 * "worked example" fold on the same pane told the learner different things.
 *
 * Rewritten here against the walkthroughs, quoting their figures exactly. Where
 * the example concedes something (the average case doesn't carry the program;
 * self-hosting is near break-even, not worse), the artifact now concedes it too,
 * because that concession IS the judgment being taught.
 */
module.exports = {
  patches: [
    // ── The reliability program: the example's whole point is that the average
    //    case does NOT carry it. The old artifact produced a 4.4x slam dunk.
    {
      lessonId: "cloud-platform-l7",
      slug: "org-wide-reliability-as-risk",
      lang: "python",
      caption: {
        en: "The two proposals that got a nod and no budget, replaced by expected annual loss — including the part that does not carry the program.",
        es: "Las dos propuestas que recibieron un asentimiento y ningún presupuesto, reemplazadas por pérdida anual esperada — incluida la parte que no financia el programa.",
      },
      snippet: `
# Two previous proposals both got a nod and no budget:
#   - an availability benchmark comparison  -> invites "what does that cost us?"
#   - an architecture risk review           -> describes mechanism, not exposure
# Neither competes with a feature, because neither is denominated in money.

# Build the arithmetic from OUR OWN incident history. Every input is a number
# someone else can challenge, which is the point: a challenged estimate everyone
# can inspect beats a confident assertion nobody can check.
INCIDENTS      = 6         # availability-affecting, last year, one failure class
MEDIAN_HOURS   = 40 / 60   # median 40 minutes
COST_PER_HOUR  = 9_000     # finance: revenue + support cost per hour degraded

one_class = INCIDENTS * MEDIAN_HOURS * COST_PER_HOUR
print(f"one class:      \${one_class:,.0f}/yr")     # one class:      $36,000/yr
three_classes = 110_000                            # same method, three classes
print(f"three classes:  \${three_classes:,.0f}/yr") # three classes:  $110,000/yr

PROGRAM = 180_000          # 2 engineers, 2 quarters, fully loaded
print(f"program:        \${PROGRAM:,.0f}")          # program:        $180,000

# Say this part FIRST, before someone else finds it:
#   $110,000 of expected annual loss against $180,000 of cost. The average case
#   does not carry the program. Conceding that is what makes the next number
#   credible instead of sounding like advocacy.

# Then add the tail, which is a different question the room already knows how to
# answer: the same architecture has one plausible failure that takes checkout
# down for six hours at peak.
tail_event = 200_000
print(f"single tail event: \${tail_event:,.0f}")    # single tail event: $200,000

# Two honest numbers, and the room chooses which conversation it is having.
# If they fund it on the tail, that is a risk decision, not a reliability
# argument. If they decline both, you have a quantified risk they accepted —
# on the record, before the tail event, which is materially better than a nod.
`,
      notes: [
        { at: "neither is denominated in money", note: {
          en: "Both prior proposals were true and unfundable. Truth isn't the missing ingredient; a shared axis is.",
          es: "Ambas propuestas previas eran ciertas e imposibles de financiar. Lo que falta no es verdad, es un eje común." } },
        { at: "COST_PER_HOUR  = 9_000", note: {
          en: "From finance, not from you. An input the CFO supplied is an input the CFO can't dismiss.",
          es: "Viene de finanzas, no de ti. Un insumo que dio el CFO es un insumo que el CFO no puede descartar." } },
        { at: "#   does not carry the program", note: {
          en: "The move that earns the room. Naming the weakness in your own number before anyone else does.",
          es: "El movimiento que gana la sala: nombrar la debilidad de tu propio número antes que nadie más." } },
        { at: "down for six hours at peak", note: {
          en: "The tail is a risk conversation, and executives are fluent in risk. That's why it's separate.",
          es: "La cola es una conversación de riesgo, y los ejecutivos dominan el riesgo. Por eso va aparte." } },
        { at: "on the record, before the tail event", note: {
          en: "A documented accepted risk is a real outcome. Waiting for the outage to argue for you is an abdication.",
          es: "Un riesgo aceptado y documentado es un resultado real. Esperar la caída para que argumente por ti es una abdicación." } },
      ],
    },

    // ── Toil: the example measures 58% against a 50% cap. The old artifact said
    //    7% against a 20% cap and annotated it "not a crisis".
    {
      lessonId: "execution-delivery-l6",
      slug: "toil-reduction-program",
      lang: "python",
      caption: {
        en: "Two weeks of tagging: 58% toil against a 50% cap, and which two items are worth automating.",
        es: "Dos semanas de etiquetado: 58% de trabajo repetitivo contra un tope de 50%, y qué dos ítems vale automatizar.",
      },
      snippet: `
# 6-engineer SRE team owning a data platform. Nobody had measured where the time
# goes, so every conversation was anecdote vs anecdote. Two weeks of tagging
# first: every ticket and page marked toil or not-toil.
#
# Toil has a narrow definition ON PURPOSE: manual, repetitive, automatable, no
# lasting value. Interrupt work that produces a fix is not toil.

MEASURED_TOIL = 0.58     # 58% of the team's time
CAP           = 0.50     # the line the team defends
# Measuring first is what turns "we're drowning" into a number you can act on —
# and here it lands OVER the cap, which is the case that needs a decision.

# The two biggest items, by frequency x time x risk:
items = [
    # name,                    per_week, minutes, risk
    ("manual access approvals",      40,       5, "low"),   # ~3.3 h/wk
    ("3am ETL restart",               3,      20, "high"),  # ~1 h/wk, on-call burnout
]
for name, n, mins, risk in items:
    print(f"{name:24} {n * mins / 60:4.1f} h/wk  risk={risk}")
# manual access approvals   3.3 h/wk  risk=low
# 3am ETL restart           1.0 h/wk  risk=high
#
# Note the ordering problem: the bigger number is the LOWER priority. Hours
# alone would have you automate approvals and leave someone waking at 3am.

# Fix 1 — pure volume, so self-service it. Policy-as-code auto-approves anything
# matching an existing role: 40 requests/week -> ~6 exceptions. A 3-day build
# reclaims ~3 h/wk.

# Fix 2 — the 3am wedge is a DESIGN SMELL, and the smarter restart script is the
# wrong fix. The job deadlocks on a connection-pool limit under load; raising the
# pool and adding a timeout removes the restart entirely.
# Recurring toil is usually a defect wearing an operations costume.

# After the quarter: 34% measured toil, and the reclaimed 4+ h/wk/person goes
# into the next automation rather than into hiring a seventh engineer.
# That is sub-linear scaling made concrete: the platform kept growing, ops fell.

# Crossing the cap does exactly one of two things — never "absorb it as heroics":
#   1. funds automation from the next sprint, or
#   2. hands load back to the requesting team until it is automated.
`,
      notes: [
        { at: "narrow definition ON PURPOSE", note: {
          en: "Without a definition, \"toil\" expands to all work someone dislikes and the number stops meaning anything.",
          es: "Sin definición, \"toil\" se expande a todo trabajo que alguien detesta y el número deja de significar algo." } },
        { at: "it lands OVER the cap", note: {
          en: "The cap only matters when it's crossed. That's the moment the pre-agreed consequence has to fire.",
          es: "El tope solo importa cuando se cruza. Ese es el momento en que la consecuencia acordada debe activarse." } },
        { at: "the bigger number is the LOWER priority", note: {
          en: "Frequency x cost x RISK. A 1 h/wk task that wakes someone at 3am outranks a 3.3 h/wk daytime one.",
          es: "Frecuencia x costo x RIESGO. Una tarea de 1 h/sem que despierta a alguien a las 3am supera a una de 3.3 h/sem diurna." } },
        { at: "# Fix 2 — the 3am wedge is a DESIGN SMELL", note: {
          en: "Ask what design makes this necessary before automating it. Often the automation is the wrong answer.",
          es: "Pregunta qué diseño hace esto necesario antes de automatizarlo. A menudo automatizar es la respuesta equivocada." } },
        { at: "rather than into hiring a seventh engineer", note: {
          en: "The outcome that makes the program fundable: the platform grew and the ops load fell.",
          es: "El resultado que hace financiable el programa: la plataforma creció y la carga operativa bajó." } },
        { at: 'never "absorb it as heroics"', note: {
          en: "A cap with no consequence is a wish. The two branches are what make it a real line.",
          es: "Un tope sin consecuencia es un deseo. Las dos ramas son lo que lo vuelve una línea real." } },
      ],
    },

    // ── Gameday: example says 99.9% / 800ms / 25% of traffic in one zone. The
    //    old artifact said 99.5% / 900ms / 100% traffic and annotated the
    //    100% as a virtue — reversing the blast-radius lesson.
    {
      lessonId: "cloud-platform-l6",
      slug: "verified-resilience-gamedays",
      lang: "yaml",
      caption: {
        en: "\"We know it works, we designed it that way\" — turned into a bounded experiment with an automatic abort.",
        es: "\"Sabemos que funciona, lo diseñamos así\" convertido en un experimento acotado con interrupción automática.",
      },
      snippet: `
# experiment-001-checkout-az-loss.yml
# The claim: checkout tolerates the loss of one availability zone.
# Until injected, that claim is a hypothesis written in the present tense.

hypothesis:
  # User-facing terms, not internal ones: health checks can stay green while
  # customers fail. Falsifiable = names the metric, threshold and window.
  statement: >
    With zone C's targets removed, checkout success rate stays above 99.9% and
    p99 stays under 800 ms, for 10 minutes.

blast_radius:
  environment: production     # staging can rehearse mechanics, not answer this
  traffic: 25% in one zone    # NOT the whole zone
  why: >
    Enough to falsify the claim if a single-zone dependency exists, which is the
    question being asked. Bounding it is not timidity — a smaller experiment
    that can still be falsified is strictly better.
  duration: 10m

stop_condition:
  # Wired to the SAME two metrics as the hypothesis, and automatic.
  - metric: checkout_success_rate
    below: 99.9
    action: halt_and_rollback
  - metric: checkout_p99_ms
    above: 800
    action: halt_and_rollback
  # A person watching a dashboard is not a control.

pre_agreed_reaction:
  # The human part is the real risk here: a senior engineer has already said
  # "we know it works, we designed it that way".
  agreed_in_writing_before_the_run: >
    A falsified hypothesis is a FINDING, not a failure. The most likely cause is
    a dependency nobody remembered — a session cache, a config fetch — rather
    than a design error. Saying that out loud beforehand is what keeps the
    second game day honest.
  if_confirmed: >
    Evidence with a date and a re-run cadence. Evidence expires; drift doesn't.

next_experiments:
  # If it passes cleanly, go smaller and meaner rather than bigger.
  - 200 ms of added latency on one dependency
  # That usually finds more real defects than removing a zone does.
`,
      notes: [
        { at: "hypothesis written in the present tense", note: {
          en: "The senior engineer's confidence is the reason to run it, not a reason to skip it.",
          es: "La confianza del ingeniero senior es la razón para ejecutarlo, no para omitirlo." } },
        { at: "# User-facing terms, not internal ones", note: {
          en: "Measure where the user is. This is the single most common way a gameday passes and teaches nothing.",
          es: "Mide donde está el usuario. Es la forma más común en que un gameday pasa y no enseña nada." } },
        { at: "traffic: 25% in one zone", note: {
          en: "Bound the blast radius. The experiment only has to be big enough to falsify the claim.",
          es: "Acota el radio de impacto. El experimento solo debe ser lo bastante grande para refutar la afirmación." } },
        { at: "Wired to the SAME two metrics", note: {
          en: "If the abort watches different metrics than the hypothesis, it can't stop the thing you're testing for.",
          es: "Si la interrupción vigila métricas distintas a la hipótesis, no puede detener lo que estás probando." } },
        { at: "a dependency nobody remembered", note: {
          en: "Naming the likely cause in advance removes the blame, which is what makes a second run possible.",
          es: "Nombrar la causa probable por adelantado quita la culpa, y eso hace posible una segunda corrida." } },
        { at: "200 ms of added latency on one dependency", note: {
          en: "Smaller and meaner beats bigger. Zone loss is the experiment teams design for; latency is the one that finds bugs.",
          es: "Más pequeño y más cruel le gana a más grande. La pérdida de zona es para la que diseñan; la latencia es la que encuentra bugs." } },
      ],
    },

    // ── Managed service tax: example lands on "roughly break-even in year one",
    //    and explicitly refuses "never self-host". The old artifact concluded
    //    self-hosting costs 42% MORE, using invented rates.
    {
      lessonId: "cloud-platform-l3",
      slug: "managed-service-tax",
      lang: "python",
      caption: {
        en: "The $840/month saving is real — priced against the column the benchmark left out. Year one is roughly break-even.",
        es: "El ahorro de $840/mes es real, valuado contra la columna que el benchmark omitió. El año uno queda casi en equilibrio.",
      },
      snippet: `
# The engineer benchmarked the same open-source broker on three instances and
# reported a real saving. Both numbers are correct; only one column is complete.
ANNUAL_SAVING = 840 * 12          # $840/month, measured
print(f"saving, year 1: \${ANNUAL_SAVING:,}")        # saving, year 1: $10,080

# Now price the other column. Days are the team's own estimates.
ENGINEER_DAY = 800                # fully loaded
year_one_days = {
    "broker upgrades (2x/yr, with a staging rehearsal)": 3,
    "build + periodically test failover":                5,   # 5 up front, 1/yr after
    "broker on-call + runbook":                          3,   # plus a share of incidents
}
ops_cost = sum(year_one_days.values()) * ENGINEER_DAY
print(f"engineering time: \${ops_cost:,}")           # engineering time: $8,800

print(f"net, year 1: \${ANNUAL_SAVING - ops_cost:,}") # net, year 1: $1,280
# Roughly break-even — and that assumes nothing goes wrong.

# The conclusion is NOT "never self-host". It is:
#   • year one is roughly break-even
#   • year two is better (5 days of failover build doesn't recur; 1 day does)
#   • it becomes clearly correct only if the team was going to build broker
#     expertise anyway
#
# That is a decision worth making deliberately. The version where nobody counts
# the right-hand column is not a decision at all — it's a saving that shows up
# next year as unmeasured toil.

# Note what does NOT shrink with scale: the days above are a floor. They are the
# same for a 12-engineer team and a 120-engineer one, which is why the managed
# premium is usually cheapest at small scale.
`,
      notes: [
        { at: "only one column is complete", note: {
          en: "The premium is easy to measure, which is exactly why it dominates the conversation and ops cost doesn't.",
          es: "El sobreprecio es fácil de medir, y justo por eso domina la conversación y el costo operativo no." } },
        { at: '"build + periodically test failover":                5', note: {
          en: "Untested failover is the line item that reads as free until the day it isn't.",
          es: "El failover sin probar es la línea que parece gratis hasta el día en que no lo es." } },
        { at: "# Roughly break-even", note: {
          en: "Same two real numbers as the benchmark, honest conclusion. Compare total cost of ownership, not price to price.",
          es: "Los mismos dos números reales del benchmark, conclusión honesta. Compara costo total de propiedad, no precio contra precio." } },
        { at: 'The conclusion is NOT "never self-host"', note: {
          en: "The analysis has to be able to come out either way, or it's advocacy with arithmetic attached.",
          es: "El análisis debe poder resultar en cualquier dirección, o es propaganda con aritmética encima." } },
        { at: "the days above are a floor", note: {
          en: "Operational work doesn't scale down. That's the structural reason small teams should buy managed.",
          es: "El trabajo operativo no escala hacia abajo. Esa es la razón estructural por la que equipos pequeños deben comprar administrado." } },
      ],
    },

    // ── Peering: the example says FIVE participants = FOUR relationships
    //    (hub-and-spoke), and the growth argument is about who does the work,
    //    not quadratic mesh growth. The old artifact said 10 links.
    {
      lessonId: "cloud-platform-l4",
      slug: "private-network-paths-and-egress",
      lang: "hcl",
      caption: {
        en: "Why peering for A→B aged badly by account E: four relationships, and a ticket to the network owner for every one.",
        es: "Por qué el peering de A→B envejeció mal al llegar la cuenta E: cuatro relaciones y un ticket al dueño de la red por cada una.",
      },
      snippet: `
# Month 0 — "peering is free, it's just a line between two boxes."
resource "aws_vpc_peering_connection" "checkout_to_payments" {
  vpc_id        = aws_vpc.checkout.id     # account B
  peer_vpc_id   = var.payments_vpc_id     # account A
  peer_owner_id = var.payments_account_id # cross-account: required
}
# Plus route-table entries on BOTH sides, and non-overlapping CIDRs.

# Month 3 — fulfilment (C), mobile BFF (D), reporting (E) need the same service.
# Peering does not transit: B's existing link doesn't help C, D or E. Each
# consumer needs its own relationship to A.
#
#   consumers of payments | peering links to A | who must act to add the next one
#   ----------------------+--------------------+---------------------------------
#            1 (B)        |         1          | both account owners
#            4 (B,C,D,E)  |         4          | both account owners, EVERY time
#
# The link count is linear. That is not the problem — the last column is. Every
# one of those four is a ticket to the network owner, plus route tables nobody
# can reason about any more.
#
# And peering grants NETWORK-level reachability: anything in account C can
# address anything in account A. "checkout calls payments" never meant that.

# The model that would have aged well is service-level:
resource "aws_vpc_endpoint_service" "payments" {   # provider publishes ONCE
  network_load_balancer_arns = [aws_lb.payments.arn]
  acceptance_required        = true
}

resource "aws_vpc_endpoint" "payments_from_e" {    # consumer self-serves
  vpc_id            = aws_vpc.reporting.id
  service_name      = var.payments_service_name
  vpc_endpoint_type = "Interface"
}
# Adding consumer #5 is now the CONSUMER's own action, with an explicit
# permission attached, and it reaches one service rather than a whole network.

# The test, available at decision time:
#   "when the third consumer arrives, who does the work?"
# Peering answers "the network owner, every time." That answer is the argument.
`,
      notes: [
        { at: "peer_owner_id", note: {
          en: "Cross-account peering needs the peer account id — the detail that makes it a two-team change, not a one-line one.",
          es: "El peering entre cuentas necesita el id de la cuenta par: el detalle que lo vuelve un cambio de dos equipos, no de una línea." } },
        { at: "Peering does not transit", note: {
          en: "The property that decides this, and the one a two-box diagram can never show.",
          es: "La propiedad que decide esto, y la que un diagrama de dos cajas nunca puede mostrar." } },
        { at: "The link count is linear. That is not the problem", note: {
          en: "Don't overstate the case: four consumers is four links. The cost is the ticket, not the count.",
          es: "No exageres el caso: cuatro consumidores son cuatro enlaces. El costo es el ticket, no la cantidad." } },
        { at: "peering grants NETWORK-level reachability", note: {
          en: "The security consequence teams discover last. You asked for one call and granted a whole network.",
          es: "La consecuencia de seguridad que los equipos descubren al final. Pediste una llamada y concediste una red completa." } },
        { at: "provider publishes ONCE", note: {
          en: "Endpoints scale per service: the provider publishes once and consumers arrive on their own.",
          es: "Los endpoints escalan por servicio: el proveedor publica una vez y los consumidores llegan solos." } },
        { at: '"when the third consumer arrives, who does the work?"', note: {
          en: "Ask this at decision time. It predicts the model's real cost better than any price sheet.",
          es: "Haz esta pregunta al decidir. Predice el costo real del modelo mejor que cualquier lista de precios." } },
      ],
    },

    // ── Commitments: the example says the $6k strands for THIRTY of 36 months,
    //    and models the migrating $8k as two lines rather than as a total loss.
    {
      lessonId: "cloud-platform-l4",
      slug: "commitment-based-discounts",
      lang: "python",
      caption: {
        en: "The $34k commitment finance proposed, recomputed with the two facts engineering had — and the honest three-part package.",
        es: "El compromiso de $34k que propuso finanzas, recalculado con los dos datos que tenía ingeniería, y el paquete honesto de tres partes.",
      },
      snippet: `
# Finance's proposal: commit $34k of a $40k/month compute spend, 3 years.
# Engineering knows two things that aren't on the spreadsheet.
TOTAL_MONTHLY   = 40_000
PROPOSED_COMMIT = 34_000
TERM_MONTHS     = 36

decommissioning  = 6_000   # legacy service, gone in ~9 months
migrating        = 8_000   # moving to managed instances, whose MANAGEMENT FEE
                           # receives no commitment discount at all

# 1. The stranded part, priced over the months it is actually stranded.
stranded_months = TERM_MONTHS - 9         # ~30 months of paying for nothing
print(f"stranded: \${decommissioning:,}/mo x {stranded_months} mo = "
      f"\${decommissioning * stranded_months:,}")
# stranded: $6,000/mo x 27 mo = $162,000
#
# Overcommitment is not a smaller discount. You pay the commitment whether or
# not the usage exists.

# 2. The migrating $8k is NOT a total loss — model it as two lines, because the
#    instance charge is still commitment-eligible and only the fee is not.
#    Committing the whole $8k overstates the saving; committing none of it
#    understates what is genuinely durable.

# 3. The honest package: commit the durable base only.
durable_base = TOTAL_MONTHLY - decommissioning - migrating
print(f"commit: \${durable_base:,}/mo at the 3-year rate")   # commit: $26,000/mo
# Leave the decommissioning $6k on demand and SAY WHY in one sentence, so the
# lower coverage number is a decision on the record rather than an oversight
# someone will "fix" next quarter.

# Coverage is the metric that hides all of this, because it looks good either way.
print(f"coverage at \${PROPOSED_COMMIT:,}: {PROPOSED_COMMIT / TOTAL_MONTHLY:.0%}")
# coverage at $34,000: 85%   <- a good number describing the wrong thing
# Unit cost — cost per 1k requests, tracked across the change — is the metric
# that survives an architecture change. High coverage of waste just discounts it.

# The sentence that makes this survivable politically: agree in advance that a
# stranded commitment is an acceptable cost of an improvement that pays for
# itself. Otherwise nobody will ever propose the improvement.
`,
      notes: [
        { at: "receives no commitment discount at all", note: {
          en: "Name what the commitment does NOT cover. Blending in charges that sit outside it overstates the saving.",
          es: "Nombra lo que el compromiso NO cubre. Mezclar cargos que quedan fuera exagera el ahorro." } },
        { at: "stranded_months = TERM_MONTHS - 9", note: {
          en: "Price the stranding over the months it actually strands, not the whole term. The honest number is the persuasive one.",
          es: "Valúa el desperdicio por los meses en que realmente ocurre, no por todo el plazo. El número honesto es el persuasivo." } },
        { at: "NOT a total loss", note: {
          en: "Two lines, not one. Over-correcting here loses a real discount on capacity that isn't going anywhere.",
          es: "Dos líneas, no una. Corregir de más aquí pierde un descuento real sobre capacidad que no se va a ninguna parte." } },
        { at: "SAY WHY in one sentence", note: {
          en: "An unexplained low coverage number gets \"optimized\" by someone next quarter. Write the reason next to it.",
          es: "Un número de cobertura bajo sin explicación lo \"optimiza\" alguien el próximo trimestre. Escribe la razón al lado." } },
        { at: "<- a good number describing the wrong thing", note: {
          en: "Coverage rewards committing to anything, including waste. Unit cost is what catches it.",
          es: "La cobertura premia comprometerse con cualquier cosa, incluido el desperdicio. El costo unitario es lo que lo detecta." } },
        { at: "an acceptable cost of an improvement", note: {
          en: "Without this agreement, the stranding penalty makes every future migration politically expensive.",
          es: "Sin este acuerdo, la penalización por desperdicio vuelve políticamente cara cada migración futura." } },
      ],
    },

    // ── Capability portfolio: the example gives 12% available and 8% contested;
    //    the old artifact invented a 61/12/27 split whose 27% contradicted its
    //    own 5%+3% breakdown.
    {
      lessonId: "cloud-platform-l7",
      slug: "capability-vs-cost-portfolio",
      lang: "markdown",
      caption: {
        en: "The CFO's 20%: the three responses available, and why the answer commits to 12% rather than to 20%.",
        es: "El 20% del CFO: las tres respuestas posibles y por qué la respuesta compromete 12% y no 20%.",
      },
      snippet: `
# Cloud spend: response to the 20% reduction request

Three responses are available and two of them end badly.

| Response | What happens |
|---|---|
| Commit to 20%, hope to find the rest | The extra 8% doesn't materialize. The cut lands on the same two investments anyway — except now it happens quietly and looks like your failure to deliver. **Your credibility is the buffer.** |
| Refuse the target | "Cloud spend scales with revenue, a percentage cut is the wrong instrument" is analytically fair and reads as defending the status quo — especially when you *do* have 12% available. |
| **Present the portfolio** | One number becomes three, with different owners and horizons. This is the one. |

## The portfolio
| Bucket | What it is | If cut |
|---|---|---|
| Keep-the-lights-on | Production capacity for current traffic | Availability loss, immediately |
| **Recoverable waste — 12%** | Idle resources, orphaned storage, over-provisioning | Nothing. This is free money. |
| Capability bets | Data platform migration; observability rebuild | Deferred capability — priced below |

A flat 20% on the undifferentiated total lands on the capability bets, because
they are the only line with no incident history defending them.

## What we commit to
**12%**, all of it recoverable waste, with the specific work named and dated so
it is a plan rather than a promise. We do not commit to 20%.

## The remaining 8%, priced out loud
It comes out of the two bets. That is a legitimate business choice; it is simply
not a free one:
- **Data platform migration slips two quarters.** The nightly export stays.
  Analytics stays a day stale, and the teams waiting on it keep their own
  pipelines — duplicated cost we are already paying.
- **Observability rebuild doesn't happen.** We keep paying its incident cost:
  last year it was the largest contributor to time-to-recover.

Hand that decision to the CFO. If they take the 20% anyway, that is a business
call made with its consequence attached — which is the outcome we were actually
responsible for producing. Not winning the meeting.
`,
      notes: [
        { at: "**Your credibility is the buffer.**", note: {
          en: "The failure mode of agreeing to be helpful: you absorb the gap and it reads as underdelivery.",
          es: "La falla de aceptar por quedar bien: absorbes la brecha y se lee como incumplimiento." } },
        { at: "reads as defending the status quo", note: {
          en: "Being right is not the same as being effective. A refusal with 12% in your pocket is indefensible.",
          es: "Tener razón no es lo mismo que ser eficaz. Un rechazo con 12% en el bolsillo es indefendible." } },
        { at: "**Recoverable waste — 12%**", note: {
          en: "Separating waste from capacity is what makes part of the cut genuinely free.",
          es: "Separar el desperdicio de la capacidad es lo que hace que parte del recorte sea realmente gratis." } },
        { at: "no incident history defending them", note: {
          en: "Why a flat percentage always lands on the future: only the present has an incident record.",
          es: "Por qué un porcentaje plano siempre cae en el futuro: solo el presente tiene historial de incidentes." } },
        { at: "Not winning the meeting.", note: {
          en: "The L7 move: an informed decision, not a defended budget.",
          es: "El movimiento de L7: una decisión informada, no un presupuesto defendido." } },
      ],
    },

    // ── Shaping bets: the example's target is 2.1s -> 1.0s, the sponsor is VP
    //    Product for a stated reason, and there is a concrete slip at week six.
    {
      lessonId: "direction-influence-l7",
      slug: "shaping-technical-bets",
      lang: "markdown",
      caption: {
        en: "Project Northstar: 2.1s → 1.0s, and the one sentence from the sponsor that kept it alive at week six.",
        es: "Proyecto Northstar: 2.1s → 1.0s, y la frase del patrocinador que lo mantuvo vivo en la semana seis.",
      },
      snippet: `
# Bet: Project Northstar

Everyone agrees "performance matters," so nothing moves: it is no one's job and
it loses to the feature roadmap every planning cycle. **Agreement is the
problem** — it costs nothing and commits nobody.

## 1. Shape — the name and the number kill the ambiguity
**Cut checkout p99 from 2.1s to 1.0s by end of Q3, measured on the existing RUM
dashboard.**

Not "improve checkout performance." With a number and a date, nobody can declare
victory retroactively, and the bet can be visibly missed — which is exactly what
forces it to be resourced. Measuring on a dashboard that **already exists**
matters too: a bet whose first task is building its own scoreboard has no
scoreboard for a month.

## 2. Sponsor — before rallying anyone
**VP of Product**, not VP of Engineering. The roadmap tension is a product call,
so the person who has to defend the tradeoff is the one who owns the metric it
trades against.

The ask was one specific question, not general support:

> "When someone asks in planning why three engineers are on latency instead of
> the new cart flow, will you say we're doing this on purpose?"

She agreed, and named it in her staff meeting. **Only then** were the two teams
committed.

## 3. Why that sequence mattered — week six
It slipped. A dependency turned out harder than scoped. In a planning room I was
not in, a director pushed to reclaim the engineers for features.

The VP said: *"No, Northstar stays funded through Q3, we committed."*

That one sentence, from someone with budget, is the entire difference between the
bet surviving and quietly dying. It was in hand before anyone was asked to jump.

## Sequence
shape → sponsor → commit. Reversing the last two is the common failure: staff it
first, hunt for air cover later, and discover in week six there wasn't any. An
unsponsored bet is the first thing cut in a reorg, and it burns the engineers who
staffed it — they lose two quarters of visible work and learn not to volunteer.
`,
      notes: [
        { at: "it loses to the feature roadmap every planning cycle", note: {
          en: "Universal agreement with no owner is a stable state. It feels like progress and produces nothing.",
          es: "El acuerdo universal sin dueño es un estado estable. Se siente como progreso y no produce nada." } },
        { at: "can be visibly missed", note: {
          en: "Public stakes are the mechanism. A target that can't be missed can't be resourced.",
          es: "Las apuestas públicas son el mecanismo. Un objetivo que no se puede fallar no se puede financiar." } },
        { at: "**already exists**", note: {
          en: "A bet that must first build its own measurement spends its credibility window unmeasured.",
          es: "Una apuesta que primero debe construir su propia medición gasta su ventana de credibilidad sin medir." } },
        { at: "**VP of Product**, not VP of Engineering", note: {
          en: "Pick the sponsor who owns the metric your bet trades against, not the one closest to you.",
          es: "Elige al patrocinador que es dueño de la métrica contra la que negocia tu apuesta, no al más cercano a ti." } },
        { at: "will you say we're doing this on purpose?", note: {
          en: "One concrete, answerable question. \"Do you support this?\" gets a yes that means nothing.",
          es: "Una pregunta concreta y respondible. \"¿Apoyas esto?\" recibe un sí que no significa nada." } },
        { at: '*"No, Northstar stays funded through Q3, we committed."*', note: {
          en: "This is what sponsorship IS. Everything before it was preparation for this sentence.",
          es: "Esto es lo que ES el patrocinio. Todo lo anterior fue preparación para esta frase." } },
      ],
    },
  ],
};
