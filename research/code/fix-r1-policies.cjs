/**
 * Round-1 evaluator fixes: the two policy artifacts were technically wrong.
 *
 * 1. guardrails-over-gatekeeping presented `Deny` + `NotAction: [s3:GetObject]`
 *    as the control that stops public reads. That policy denies everything
 *    EXCEPT reads — it permits precisely the action the concept forbids. It also
 *    omitted the `Principal` element an RCP requires.
 *
 * 2. Both artifacts used `StringNotEquals: {aws:PrincipalOrgID}` inside an SCP.
 *    An SCP only ever evaluates principals that are already in the organization,
 *    so that condition never matches and the statement is inert. The teaching
 *    point survives — but the mechanism is SCP-on-principals vs RCP-on-resources,
 *    which is what research/2026-07-25-aws-verified-facts.md actually records.
 *
 * Teaching a wrong policy is worse than teaching no policy, so these are rewritten
 * rather than patched.
 */
module.exports = {
  patches: [
    {
      lessonId: "cloud-platform-l6",
      slug: "guardrails-over-gatekeeping",
      lang: "json",
      caption: {
        en: "Three proposals for \"no public data stores\" — and why only a resource control states the invariant.",
        es: "Tres propuestas para \"ningún almacén de datos público\", y por qué solo un control sobre el recurso expresa la invariante.",
      },
      snippet: `
// Proposal 1: a review checklist.  Enforced by memory. Documentation, not control.
// Proposal 2: a nightly scanner.   Enforced after the fact — and a night of
//             publicly readable customer data is not a finding you can close,
//             it is an incident that already happened.
// Proposal 3: deny the action outright. Enforced by construction.
//
// For an IRREVERSIBLE outcome, only the third is a control. Choose the deny AND
// KEEP THE SCANNER: it catches resource types the policy doesn't cover, and
// configurations that are technically private but effectively exposed.

// ── An SCP constrains OUR PRINCIPALS ───────────────────────────────────────
// Unconditional, on purpose: "no principal in this organization may open a
// bucket up." A condition here would be a way for the action to succeed.
{
  "Effect": "Deny",
  "Action": ["s3:PutBucketPolicy", "s3:PutBucketAcl", "s3:PutAccountPublicAccessBlock"],
  "Resource": "*"
}
// …but an SCP cannot express "nobody OUTSIDE the org may READ this", because an
// SCP is only ever evaluated for principals that are already IN the org. So a
// condition on aws:PrincipalOrgID inside an SCP is inert: the key always equals
// your own org id, the deny never fires, and the policy reviews and deploys
// cleanly while doing nothing. That is the trap.

// ── An RCP constrains THE RESOURCE ─────────────────────────────────────────
// Deny-only, attached in Organizations, evaluated for EVERY caller including
// principals from outside the organization entirely:
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": "*",
  "Condition": {
    "StringNotEqualsIfExists": { "aws:PrincipalOrgID": "o-example" },
    "BoolIfExists": { "aws:PrincipalIsAWSService": "false" }
  }
}
// "Nothing outside this organization, ever" — regardless of which principal,
// which account, or who forgot. Note Action is s3:*, not NotAction: inverting
// it here would deny everything EXCEPT reads, which is the one thing we are
// trying to prevent.

// Ship these TWO things in the same change, or the platform becomes a queue:
//   1. an exception path — documented, time-boxed, named approver — so a
//      legitimate public dataset doesn't become a standoff
//   2. instrumentation counting BLOCKED ATTEMPTS on the guardrail. Otherwise the
//      scanner's shrinking dashboard looks like the effective mechanism at the
//      next budget review, and the thing actually preventing the incident looks
//      like it does nothing.
`,
      notes: [
        { at: "it is an incident that already happened", note: {
          en: "Reversibility decides prevention vs detection. Detection is fine for everything you can undo.",
          es: "La reversibilidad decide entre prevención y detección. Detectar basta para todo lo que puedes revertir." } },
        { at: "KEEP THE SCANNER", note: {
          en: "Not either/or. The scanner is the second layer, covering what the policy can't express.",
          es: "No es uno u otro. El escáner es la segunda capa, cubriendo lo que la política no puede expresar." } },
        { at: "// condition on aws:PrincipalOrgID inside an SCP is inert", note: {
          en: "The subtle failure: the policy reviews cleanly, deploys cleanly, and never fires once.",
          es: "La falla sutil: la política se revisa bien, se despliega bien y no se activa ni una vez." } },
        { at: '"Principal": "*"', note: {
          en: "An RCP is a resource-side policy, so it names a principal — that's how it reaches callers outside the org.",
          es: "Un RCP es una política del lado del recurso, así que nombra un principal: así alcanza a quien llama desde fuera de la organización." } },
        { at: "// it here would deny everything EXCEPT reads", note: {
          en: "Deny + NotAction is a classic inversion bug. Read it out loud before shipping it.",
          es: "Deny + NotAction es un error clásico de inversión. Léelo en voz alta antes de desplegarlo." } },
        { at: "counting BLOCKED ATTEMPTS", note: {
          en: "Prevention is invisible by design, so it loses budget reviews to detection unless you instrument it.",
          es: "La prevención es invisible por diseño, así que pierde revisiones de presupuesto ante la detección si no la instrumentas." } },
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
// The objection: "we can get the same isolation with tags and IAM conditions,
// without maintaining an account factory."
// Here is the tag-based version, and why it isn't the same thing.
{
  "Effect": "Deny",
  "Action": "s3:*",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": { "aws:ResourceTag/team": "\${aws:PrincipalTag/team}" }
  }
}
// This holds only where BOTH tags exist and are correct. An untagged resource, a
// service that creates resources without propagating tags, or a principal missing
// the tag all fall outside it. The rule is enforced by whoever remembered the
// condition — which is a convention, not a mechanism.

// ── The three things that are ACCOUNT-scoped and cannot be reproduced ──────
// 1. Service quotas. Quotas are per account, full stop. One team's runaway
//    Lambda concurrency consumes the quota every other team shares, and there is
//    no tag, policy or condition key that partitions a quota.
// 2. A clean billing seam. Cost allocation by tag is best-effort and always
//    partial; an account boundary is exact and needs no discipline to stay exact.
// 3. Credential blast radius. A leaked key is bounded by what the ACCOUNT can
//    reach — not by what someone intended it to reach.

// Point 1 is usually what ends the debate, because it is concrete and nobody can
// tag their way out of it. Note that none of the three is an argument about
// permissions: they are properties of the boundary itself.

// The cost, which belongs in the same review:
//   • cross-account access paths for shared services
//   • an account-provisioning pipeline someone owns and maintains
//   • a managed landing zone vs your own automation — a genuine choice: your own
//     gives more control and is a product you are now on the hook for
`,
      notes: [
        { at: "a convention, not a mechanism", note: {
          en: "The whole difference in five words. A tag is enforced by memory; a boundary by the provider.",
          es: "Toda la diferencia en cinco palabras: una etiqueta la hace cumplir la memoria; un límite, el proveedor." } },
        { at: "1. Service quotas. Quotas are per account", note: {
          en: "The argument that ends the debate: concrete, verifiable, and untaggable.",
          es: "El argumento que cierra el debate: concreto, verificable y no etiquetable." } },
        { at: "3. Credential blast radius", note: {
          en: "Blast radius is decided by the boundary, not by intent expressed in a policy document.",
          es: "El radio de impacto lo decide el límite, no la intención expresada en un documento de política." } },
        { at: "// permissions: they are properties of the boundary", note: {
          en: "Why the objection can't be met with better IAM: these are structural properties, not access rules.",
          es: "Por qué la objeción no se resuelve con mejor IAM: son propiedades estructurales, no reglas de acceso." } },
        { at: "a product you are now on the hook for", note: {
          en: "The honest cost of a landing zone isn't the accounts — it's the factory and its owner.",
          es: "El costo honesto de una landing zone no son las cuentas: es la fábrica y su dueño." } },
      ],
    },
    // ── shared-responsibility: the artifact marked two facts UNVERIFIED that the
    //    project's own fact file records as VERIFIED, and blocked the migration
    //    on them. The concept's example reasons FROM those facts.
    {
      lessonId: "cloud-platform-l3",
      slug: "shared-responsibility-in-practice",
      lang: "yaml",
      caption: {
        en: "The per-service responsibility line, written down — including the two seams that moved without anyone deploying anything.",
        es: "La línea de responsabilidad por servicio, escrita, incluidas las dos costuras que se movieron sin que nadie desplegara nada.",
      },
      snippet: `
# ecs-managed-instances.responsibility.yml
# Written as part of the change request that moved the workload — not after.
service: ECS Managed Instances
replaces: ECS on self-managed EC2 + AMI pipeline

provider_absorbs:
  - patching the host OS and container agent
  - AMI build and rollout (the work we are buying our way out of)

we_still_own:
  - the container image and everything in it
  - task-level IAM, secrets, network policy

# The part teams miss: every responsibility the provider takes MOVES something
# we were relying on. Both of these were confirmed before the migration.
seams_that_moved:
  - billing:
      what: >
        The per-instance management fee is charged per second with a one-minute
        minimum, ON TOP of the EC2 charge — and Reservations and Savings Plans do
        not offset that fee.
      published_example: >
        us-west-2 c6a.2xlarge = $0.306/hr EC2 + $0.037/hr fee.
        Only the first number is discountable.
      consequence: >
        Discount coverage % drops even though instance hours did not change and
        nobody deployed anything new. Finance sized the plan for 80% of
        steady-state compute; that number is now wrong for a reason no dashboard
        will explain.
      action: re-price the migration with the undiscountable fee included

  - detection:
      what: ECS Managed Instances are NOT covered by GuardDuty ECS Runtime Monitoring.
      consequence: >
        The signed attestation is now false for exactly the three newest services.
      action: >
        Write the compensating detection into the SAME change request that moved
        the workload, and name the seam explicitly — so the next team that adopts
        this service inherits the finding instead of rediscovering it.

  - debug_access:
      before: SSH to the instance during an incident
      after: no host access; reproduce from logs and exec into the task
      action: the runbook's first step no longer exists — rewrite it

# The fix is NOT to roll back. It is to know both seams and price them.
`,
      notes: [
        { at: "not after", note: {
          en: "The document is part of the change, so the seams are found at review time rather than at month end.",
          es: "El documento es parte del cambio, así que las costuras se encuentran en la revisión y no a fin de mes." } },
        { at: "MOVES something", note: {
          en: "The reframe that makes shared responsibility useful: not two boxes, but a list of what just changed hands.",
          es: "El replanteo que hace útil la responsabilidad compartida: no dos cajas, sino una lista de qué acaba de cambiar de manos." } },
        { at: "not offset that fee", note: {
          en: "Discount coverage is one of the two blind spots. Confirm per service; never assume the fee is covered.",
          es: "La cobertura del descuento es uno de los dos puntos ciegos. Confirma por servicio; nunca supongas que el cargo está cubierto." } },
        { at: "$0.306/hr EC2 + $0.037/hr fee", note: {
          en: "The published example makes the shape obvious: a ~12% surcharge that no commitment can touch.",
          es: "El ejemplo publicado deja clara la forma: un recargo de ~12% que ningún compromiso puede tocar." } },
        { at: "NOT covered by GuardDuty ECS Runtime Monitoring", note: {
          en: "Detection scope is the other blind spot, and the one that silently invalidates an attestation.",
          es: "El alcance de detección es el otro punto ciego, y el que invalida una atestación en silencio." } },
        { at: "inherits the finding instead of rediscovering it", note: {
          en: "Writing the seam down is the deliverable. Otherwise each team pays the same discovery cost.",
          es: "Escribir la costura es el entregable. Si no, cada equipo paga el mismo costo de descubrimiento." } },
      ],
    },
  ],
};
