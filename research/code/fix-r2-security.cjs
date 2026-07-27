/**
 * The last artifact failing tools/check-trace.cjs.
 *
 * The old version invented a distribution (812 / 640 / 590 findings) and a
 * derived "68 weeks". The concept's example deliberately does NOT give per-class
 * counts — it says "a handful of classes account for most of the volume" and
 * names them (unencrypted volumes, over-broad roles, public snapshots), then
 * "retiring five classes usually removes more of the backlog than a year of
 * triage". Inventing precise counts made the artifact look more rigorous while
 * being less true, and it buried the actual claim, which is about SHAPE.
 *
 * Rewritten to compute only from the example's own numbers: 4,000 findings, 30
 * actions a week, 5 classes retired.
 */
module.exports = {
  patches: [
    {
      lessonId: "cloud-platform-l6",
      slug: "cloud-security-program-at-scale",
      lang: "python",
      caption: {
        en: "4,000 findings at 30 a week: why more analysts move the number and not the shape.",
        es: "4,000 hallazgos a 30 por semana: por qué más analistas mueven el número y no la forma.",
      },
      snippet: `
# Do the arithmetic in front of them. This is the whole first move.
OPEN            = 4_000    # across the estate
WEEKLY_CAPACITY = 30       # what the team can actually action

print(f"weeks to drain: {OPEN / WEEKLY_CAPACITY:.0f}")
# weeks to drain: 133      <- over two years
#
# …during which new findings arrive faster than that. So:
#   more analysts move the NUMBER, not the SHAPE.
# Triple the team and it is still a queue that regenerates.

# ── Change 1: group by class and count ───────────────────────────────────
from collections import Counter
by_class = Counter(f.rule_id for f in findings)
for rule, n in by_class.most_common(5):
    print(f"{rule:24} {n:5}")
# Typically a handful of classes account for most of the volume:
#   unencrypted volumes | over-broad roles | public snapshots
# Each of those is one guardrail away from never appearing again.
#
# Retiring five classes usually removes more of the backlog than a year of
# triage. Closing an instance is work; retiring a class is progress.

# ── Change 2: triage sequences, not findings ─────────────────────────────
# Severity is a property of the FINDING. Exposure is a property of your system.
def is_sequence(s):
    # A narrative: public entry point -> over-permissive role -> data store.
    return s.internet_entry and s.privilege_path and s.reaches_data
# Spend the thirty weekly actions on narratives that describe a plausible
# intrusion — not on the alphabetically-first critical in a dev account.

# ── Change 3: build the coverage matrix ──────────────────────────────────
# The gap nobody has noticed is the newest compute model your teams just
# adopted, where a runtime-monitoring capability may simply not apply.
# A part of the estate with NO findings currently reads as clean.
for service in estate:
    if not detection_applies(service):
        print(f"BLIND: {service}")   # absence of findings != absence of risk

# ── Then change the scoreboard, or changes 1-2 look like a productivity drop ──
# report:        classes retired | time-to-triage for sequences | honest coverage
# do NOT report: number of open findings — it rewards closing the easy ones
`,
      notes: [
        { at: "weeks to drain: 133", note: {
          en: "Do this arithmetic out loud, first. It ends the staffing conversation before priorities are argued.",
          es: "Haz esta aritmética en voz alta, primero. Cierra la conversación de contratación antes de discutir prioridades." } },
        { at: "more analysts move the NUMBER, not the SHAPE", note: {
          en: "The sentence to keep. The queue regenerates, so throughput is the wrong lever.",
          es: "La frase que hay que recordar. La cola se regenera, así que el rendimiento es la palanca equivocada." } },
        { at: "one guardrail away from never appearing again", note: {
          en: "Aggregate by rule before you triage. The distribution is where prevention pays.",
          es: "Agrupa por regla antes de hacer triaje. La distribución es donde paga la prevención." } },
        { at: "retiring a class is progress", note: {
          en: "This reframes the whole program: stop counting closures, start counting classes that can no longer occur.",
          es: "Esto replantea el programa completo: deja de contar cierres, empieza a contar clases que ya no pueden ocurrir." } },
        { at: "Exposure is a property of your system", note: {
          en: "Vendor severity can't know your topology. Three chained mediums outrank a hundred isolated highs.",
          es: "La severidad del proveedor no conoce tu topología. Tres medios encadenados superan cien altos aislados." } },
        { at: "absence of findings != absence of risk", note: {
          en: "The blind spot that looks like your best-performing area on every dashboard.",
          es: "El punto ciego que en todos los paneles parece tu área con mejor desempeño." } },
        { at: "it rewards closing the easy ones", note: {
          en: "Any metric you report becomes the work. Open-finding count buys the cheapest closures available.",
          es: "Cualquier métrica que reportas se vuelve el trabajo. Contar hallazgos abiertos compra los cierres más baratos." } },
      ],
    },
  ],
};
