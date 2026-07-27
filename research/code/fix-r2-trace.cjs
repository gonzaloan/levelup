/**
 * Round-2 fixes: adopt the traceability rule instead of applying it eight times.
 *
 * Round 1 fixed the eight artifacts a reviewer named. Round 2 swept all 33 and
 * found three more whose figures were invented — and in these three the invented
 * figures were not a detail: they replaced the example's diagnosis, its ask, or
 * its complication, so the artifact and the "worked example" fold on the same
 * pane taught different things about the same meeting.
 *
 * The rule, now stated where the next author will read it: an artifact may
 * introduce NO number that the concept's own example, explanation or depth does
 * not already contain. If a number is needed and absent, the example is what
 * gets extended — not the artifact.
 */
module.exports = {
  patches: [
    // ── The ask was 3 engineers / 2 quarters; the example asks for one team for
    //    a quarter, and its stakes are 60% of SEVs and March's outage.
    {
      lessonId: "direction-influence-l6",
      slug: "executive-communication",
      lang: "markdown",
      caption: {
        en: "Fifteen minutes on the payments monolith, spent two ways — and what to do when she pushes back.",
        es: "Quince minutos sobre el monolito de pagos, gastados de dos formas, y qué hacer cuando ella objeta.",
      },
      snippet: `
# 15 minutes, VP of Engineering staff meeting — payments monolith

## The weak open
> "I want to walk through the history of our monolith and some options we've
> been considering for it."

Ten minutes of context later the VP still doesn't know what you need, checks
Slack, and you get *"let's take this offline."* You left with nothing.

Two failures in one sentence: it builds up to the point instead of leading with
it, and it hands a question upward without a pick.

## The strong open — 40 seconds
> "I need your sign-off to move the payments path off the monolith this half.
> Here's why: it's the source of **60% of our SEV incidents**, the migration
> costs **one team for a quarter**, and the risk of waiting is a repeat of
> **March's outage during Q4 peak**. I have a rollback plan. Can I get a yes
> today, or what would you need to say yes?"

The ask, the stakes and the exit, before any detail. Note the last clause: *"or
what would you need to say yes?"* converts a no into a condition you can go and
satisfy, which is a better outcome than a yes you argued into existence.

## When she pushes back
> "Why not just add read replicas?"

Do **not** relitigate in the room. That spends credibility defending an estimate
instead of getting a decision:

> "Good challenge — replicas don't fix the write contention, but let me send you
> the latency numbers this afternoon."

Captured, credibility intact, follow-up owned. You leave with a decision or a
crisp condition for one.

## Adapting to the room
Same content, different delivery per leader — preparation, not politics:
- **Pre-reader:** doc 24h ahead; the meeting is objections only. Walking slides
  at someone who has read them is an insult dressed as thoroughness.
- **Think-out-loud:** bring the recommendation and the rejected options, and
  expect to re-derive it together. Don't defend; think with them.
- **Number-first:** cost, headcount and expected effect in the first sentence.
`,
      notes: [
        { at: '> "I want to walk through the history', note: {
          en: "Everything true, nothing asked. A history lesson is the most common way to waste an executive slot.",
          es: "Todo cierto, nada pedido. Una clase de historia es la forma más común de desperdiciar un espacio ejecutivo." } },
        { at: "hands a question upward without a pick", note: {
          en: "You're paid to have a recommendation. Options without a pick get \"come back with a recommendation\".",
          es: "Te pagan por tener una recomendación. Opciones sin postura reciben \"vuelve con una recomendación\"." } },
        { at: "**60% of our SEV incidents**", note: {
          en: "One number the VP already believes, from her own incident review. Not a new metric to defend.",
          es: "Un número que la VP ya cree, de su propia revisión de incidentes. No una métrica nueva que defender." } },
        { at: "converts a no into a condition", note: {
          en: "Turns a no into a condition. A named condition is progress; a no is the end of the meeting.",
          es: "Convierte un no en una condición. Una condición nombrada es progreso; un no es el fin de la reunión." } },
        { at: "Do **not** relitigate in the room", note: {
          en: "In-room debate spends credibility. A dated follow-up with data spends nothing and wins later.",
          es: "Debatir en la sala gasta credibilidad. Un seguimiento con fecha y datos no gasta nada y gana después." } },
        { at: "an insult dressed as thoroughness", note: {
          en: "Adapt to how each leader preprocesses. Ignoring that reads as not knowing your audience.",
          es: "Adáptate a cómo procesa cada líder. Ignorarlo se lee como no conocer a tu audiencia." } },
      ],
    },

    // ── SCQA: the example's ask is one engineer over two quarters and its
    //    complication is tickets up 40% QoQ. The artifact had invented both.
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
+ Subject: Recommendation — move billing to streaming (1 engineer, 2 quarters)

- Let me walk through how the current system works. Billing runs as a nightly
- batch: it exports to S3, a job aggregates usage, a second job writes invoices,
- then reconciliation runs. Over the last two quarters we investigated the
- latency. We looked at tuning the batch, then at the export step, then at
- database contention during the aggregate window. What we found was...
-
- [twelve minutes later]
-
- So the recommendation is to move to streaming.
+ **Recommendation: move billing to streaming, phased over two quarters, one
+ engineer.**
+
+ **Situation.** Billing runs on a nightly batch.
+ **Complication.** Customers now expect real-time usage, and tickets are up
+ 40 percent quarter over quarter.
+ **Question.** Patch the batch, or move to streaming?
+ **Answer.** We move. Phasing, risks and the rollback plan below.
+
+ Happy to go wherever you want with the remaining time.
`,
      notes: [
        { at: "+ Subject: Recommendation — move billing", note: {
          en: "The subject line already contains the ask. A VP triaging 60 emails decides here.",
          es: "El asunto ya contiene la petición. Un VP que tría 60 correos decide aquí." } },
        { at: "- Let me walk through how the current system works.", note: {
          en: "Chronological order serves your memory of the investigation, not the reader's decision.",
          es: "El orden cronológico sirve a tu memoria de la investigación, no a la decisión del lector." } },
        { at: "- [twelve minutes later]", note: {
          en: "Build-up spends the scarce resource — attention — before reaching the point.",
          es: "La introducción gasta el recurso escaso —la atención— antes de llegar al punto." } },
        { at: "+ 40 percent quarter over quarter.", note: {
          en: "The complication is why the situation is a problem NOW. Without it there is nothing to decide.",
          es: "La complicación es por qué la situación es un problema AHORA. Sin ella no hay nada que decidir." } },
        { at: "+ Happy to go wherever you want", note: {
          en: "Nothing is omitted — it's reordered. The reader chooses which detail to spend the time on.",
          es: "Nada se omite, se reordena. El lector elige en qué detalle gastar el tiempo." } },
      ],
    },

    // ── Strategy: the example's diagnosis is retry stampedes on a shared
    //    Postgres, with three specific actions. The artifact had invented an
    //    entirely different mechanism (no SLOs) for the same org.
    {
      lessonId: "direction-influence-l6",
      slug: "strategy-diagnosis-policy-action",
      lang: "diff",
      caption: {
        en: "\"Path to Five Nines\" and its three bullets, rewritten as a kernel someone could act on Monday.",
        es: "\"Camino a los cinco nueves\" y sus tres viñetas, reescritas como un núcleo accionable el lunes.",
      },
      snippet: `
  # Path to Five Nines
- - Invest in reliability
- - Empower teams to own quality
- - Build a culture of operational excellence
-
- (circulated to 200 engineers. a quarter later, nothing has changed)
+ ## Run the kernel test on the old version first
+ Diagnosis? None — "invest in reliability" names no obstacle.
+ Policy?    None — nothing is forbidden.
+ Action?    "Build a culture" is not a move anyone can make Monday.
+ Three wishes. Nobody could disagree with them, which is why nothing happened.
+
+ ## Diagnosis
+ **70% of last quarter's incident-minutes trace to unbounded client retries
+ stampeding a shared Postgres during partial outages.**
+
+ That is a mechanism, and it is falsifiable — someone can check the number and
+ tell me I'm wrong. Write it about the system, not the teams: every team was
+ making a locally rational choice.
+
+ ## Guiding policy
+ **No synchronous request path may fan out to more than one shared datastore,
+ and every retry must carry a budget.**
+
+ Note what this forbids. A policy that forbids nothing is a preference.
+
+ ## Coherent action — this half
+ 1. A CI check that fails builds introducing a second synchronous datastore
+    dependency.
+ 2. Ship a retry-budget library, and require it on the three highest-traffic
+    paths.
+ 3. Split the shared Postgres for the payments service off first.
+
+ An engineer in a design review now knows exactly what "yes" and "no" look
+ like — which the three bullets never told them.
`,
      notes: [
        { at: "- - Invest in reliability", note: {
          en: "Three goals, zero diagnosis. Nobody can disagree with them, which is why nothing happened.",
          es: "Tres metas, cero diagnóstico. Nadie puede discrepar, y por eso no pasó nada." } },
        { at: "+ Diagnosis? None", note: {
          en: "The kernel test takes about a minute and catches most \"strategies\" before they cost a quarter.",
          es: "La prueba del núcleo toma un minuto y detecta la mayoría de \"estrategias\" antes de costar un trimestre." } },
        { at: "+ stampeding a shared Postgres during partial outages.**", note: {
          en: "A diagnosis names a mechanism someone can check. That is what makes the actions derivable.",
          es: "Un diagnóstico nombra un mecanismo verificable. Eso es lo que hace derivables las acciones." } },
        { at: "+ making a locally rational choice.", note: {
          en: "The diagnosis is the political part. Write it about the system, or it reads as blame.",
          es: "El diagnóstico es la parte política. Escríbelo sobre el sistema, o se lee como culpa." } },
        { at: "+ Note what this forbids.", note: {
          en: "A policy that forbids nothing allocates nothing. This is the line that makes it a real constraint.",
          es: "Una política que no prohíbe nada no asigna nada. Esta es la línea que la vuelve una restricción real." } },
        { at: "+ 1. A CI check that fails builds", note: {
          en: "Enforced by the pipeline, not by memory. The action makes the policy cheaper to follow than to evade.",
          es: "Lo hace cumplir el pipeline, no la memoria. La acción hace la política más barata de seguir que de evadir." } },
      ],
    },
  ],
};
