#!/usr/bin/env node
/**
 * Builds `content/glossary.en.json` and `content/glossary.es.json` (section 13).
 *
 * WHY THIS IS GENERATED RATHER THAN HAND-WRITTEN
 * Each entry carries `usage` — how often the term appears in each language across the
 * 19,228 shipped strings. A hand-written count is a count nobody re-checks, and the
 * whole point of the glossary is that `translate: false` records what the corpus
 * ALREADY does. So the editorial decisions live here and the numbers are measured by
 * tools/glossary-scan.cjs at build time. If the content changes, the numbers change.
 *
 * HOW THE `translate` FLAG WAS DECIDED
 * Not by taste. Per term, the ratio of Spanish occurrences to English occurrences:
 *   ratio ≈ 1   the Spanish edition keeps the English word     → translate: false
 *   ratio ≈ 0   the Spanish edition has its own word           → translate: true
 * The middle band was decided by reading the competing Spanish word's real sentences.
 * `guardrail` looked like it lost to `límite` (230 uses) until the sentences showed
 * `límite` means "threshold" — rate limits, token limits, trust boundaries. Banning it
 * would have broken 230 correct sentences. Same for `cola` (queue, not tail),
 * `bloqueo` (row lock, not vendor lock-in), `búsqueda` (lookup, not retrieval),
 * `inferencia` (inference, not serving).
 *
 * `principal` was excluded outright: it scores ratio 2.09, which looks like the
 * strongest "kept" term in the corpus and is actually the ordinary Spanish adjective
 * for "main". A false friend is not a glossary entry.
 *
 * WHAT `avoid` IS FOR
 * The calque a translator would plausibly produce and that must never ship. Every
 * entry here is checked by tools/check-glossary.cjs against the Spanish corpus, so a
 * banned rendering is a build failure rather than a note in a document.
 *
 * THE THREE TESTS AN `avoid` ENTRY MUST PASS
 * The first version of this file banned 120 renderings from intuition. The validator
 * then found 42 of them in shipped prose, and reading those sentences showed that
 * roughly half the bans were wrong, in three distinct ways:
 *
 *  1. THE RENDERING HAS ITS OWN MEANING. `rendimiento` was banned as a calque of
 *     `throughput`; its 137 uses mean "performance", and the corpus needs it to say
 *     that isolation costs performance. Likewise `respaldo` (backing, in delegation),
 *     `expiración` (TTL expiry), `capa de datos` (the data tier), `ficha` (a spec
 *     sheet / model card), `retroceso` (as in `retroceso exponencial`, backoff), and
 *     `rescate` — which appears in "Rescate (resolver por la persona)", about rescuing
 *     a mentee, and has nothing to do with retrieval. Banning any of these would fail
 *     hundreds of correct sentences.
 *
 *  2. IT IS AN ACRONYM EXPANSION, WHICH IS THE FIRST-USE EXPLANATION ITSELF. Section
 *     13 asks for a `first_use_explanation`; "objetivo de nivel de servicio (SLO)" IS
 *     that explanation. Banning the expansion of SLO, SLI, SLA, ADR and DLQ would
 *     forbid the exact practice the glossary exists to encourage. Expansions are never
 *     banned.
 *
 *  3. THE CORPUS PREFERS THE "BANNED" FORM. `arranque en frío` outnumbers `cold start`
 *     10 to 7 and `descarte de carga` outnumbers `load shedding` 8 to 7. When the
 *     Spanish edition has already settled on a form, the glossary records that form —
 *     it does not overrule 19,000 strings from taste.
 *
 * What survived is the genuine debt: a real calque, for this term, with no independent
 * meaning, that competes with a clearly dominant form. Those go in
 * glossary-baseline.txt as known debt rather than being silently dropped.
 */
const fs = require("node:fs");
const path = require("node:path");
const { corpus, count, classify } = require("./glossary-scan.cjs");

const OUT = path.join(__dirname, "..", "content");

/**
 * The editorial record. One object per term:
 *   t     canonical English term
 *   es    how Spanish should render it (equal to `t` when the term is kept)
 *   keep  true → `translate: false`
 *   e     first-use explanation, English
 *   s     first-use explanation, Spanish
 *   a     aliases (other spellings/abbreviations that mean the same thing)
 *   x     renderings that must NOT appear in Spanish prose
 *   n     an honest note, used where the corpus is inconsistent
 */
const TERMS = [
  // ── Retrieval and RAG ───────────────────────────────────────────────────
  { t: "RAG", es: "RAG", keep: true, a: ["retrieval-augmented generation"],
    e: "Answering with text fetched at query time instead of text baked into the weights.",
    s: "Responder con texto recuperado en el momento de la consulta en vez de texto grabado en los pesos.",
    x: [] },
  { t: "chunk", es: "chunk", keep: true,
    e: "One indexable piece of a source document — the unit retrieval returns.",
    s: "Una pieza indexable de un documento fuente: la unidad que devuelve la recuperación.",
    x: ["pedazo", "fragmento recuperable"],
    n: "`trozo` is NOT banned: its 5 uses mean an ordinary piece — \"un trozo de residuo (cruft)\", " +
       "\"un trozo de pegamento\" — never a retrieval chunk." },
  { t: "chunking", es: "chunking", keep: true,
    e: "Splitting source documents into indexable pieces; size and boundaries decide what can be found.",
    s: "Dividir documentos fuente en piezas indexables; el tamaño y los límites deciden qué se puede encontrar.",
    x: ["fragmentación de trozos", "troceado", "trozado"] },
  { t: "overlap", es: "overlap", keep: true,
    e: "Repeating the tail of one chunk at the head of the next, so a fact spanning a boundary survives.",
    s: "Repetir el final de un chunk al inicio del siguiente, para que un dato que cruza el límite sobreviva.",
    x: ["solapamiento de trozos", "traslape"] },
  { t: "embedding", es: "embedding", keep: true,
    e: "A vector placed so that distance between two vectors tracks similarity of meaning.",
    s: "Un vector ubicado de modo que la distancia entre dos vectores refleje similitud de significado.",
    x: ["incrustación", "empotrado", "vector incrustado"] },
  { t: "reranking", es: "reranking", keep: true,
    e: "Reordering retrieved candidates with a slower, more accurate model before the generator reads them.",
    s: "Reordenar los candidatos recuperados con un modelo más lento y preciso antes de que el generador los lea.",
    x: ["reclasificación", "reordenamiento por relevancia"] },
  { t: "BM25", es: "BM25", keep: true,
    e: "A lexical ranking function: scores a document by how often the query's exact terms appear in it.",
    s: "Una función de ranking léxico: puntúa un documento por cuántas veces aparecen sus términos exactos.",
    x: [] },
  { t: "HNSW", es: "HNSW", keep: true, a: ["hierarchical navigable small world"],
    e: "A layered proximity graph for approximate nearest-neighbour search; trades recall for query speed.",
    s: "Un grafo de proximidad por capas para búsqueda aproximada de vecinos cercanos; cambia recall por velocidad.",
    x: [] },
  { t: "top-k", es: "top-k", keep: true,
    e: "How many retrieved results are passed on. Raising it costs context and can add noise.",
    s: "Cuántos resultados recuperados se pasan adelante. Subirlo cuesta contexto y puede agregar ruido.",
    x: ["los k mejores", "primeros k"] },
  { t: "recall", es: "recall", keep: true,
    e: "The fraction of the relevant documents that actually came back. It bounds what the generator can use.",
    s: "La fracción de documentos relevantes que efectivamente volvió. Acota lo que el generador puede usar.",
    x: ["cobertura de resultados", "recuerdo"],
    n: "`recuerdo` is the textbook translation and is banned on purpose: it reads as 'memory' in prose. " +
       "`exhaustividad` is NOT banned — its 2 uses mean exhaustiveness (\"abdicación disfrazada de " +
       "exhaustividad\"), not the metric." },
  { t: "hit-rate", es: "hit-rate", keep: true,
    e: "The share of queries whose answer appears anywhere in what was retrieved.",
    s: "La proporción de consultas cuya respuesta aparece en algún lugar de lo recuperado.",
    x: ["índice de acierto"] },
  { t: "corpus", es: "corpus", keep: true,
    e: "The whole body of documents available to retrieve from, at the moment of the query.",
    s: "El conjunto completo de documentos disponibles para recuperar, al momento de la consulta.",
    x: [] },
  { t: "grounding", es: "fundamentación", keep: false,
    e: "Tying each claim in an answer to a passage that was actually retrieved.",
    s: "Atar cada afirmación de una respuesta a un pasaje que de verdad se recuperó.",
    x: ["anclaje a fuentes"],
    n: "`fundamentación` (5) edges out `grounding` (3); both are thin, and the Spanish form wins on evidence." },
  { t: "RAGAS", es: "RAGAS", keep: true,
    e: "A metric suite for retrieval pipelines — faithfulness, context precision, answer relevance.",
    s: "Un conjunto de métricas para pipelines de recuperación: fidelidad, precisión de contexto, relevancia.",
    x: [] },
  { t: "vector store", es: "vector store", keep: true, a: ["vector database"],
    e: "The index that holds embeddings and answers nearest-neighbour queries over them.",
    s: "El índice que guarda embeddings y responde consultas de vecinos cercanos sobre ellos.",
    x: ["almacén vectorial"],
    n: "Both `vector store` (4) and `almacén de vectores` (3) ship; the English form wins as canonical." },
  { t: "retrieval", es: "recuperación", keep: false,
    e: "Fetching candidate passages for a query, before any generation happens.",
    s: "Traer pasajes candidatos para una consulta, antes de que ocurra cualquier generación.",
    x: ["recobro"],
    n: "Spanish overwhelmingly says `recuperación` (299 vs 38). `búsqueda` is NOT banned — it means lookup." },
  { t: "hybrid search", es: "búsqueda híbrida", keep: false,
    e: "Running lexical and vector retrieval together and fusing the two ranked lists.",
    s: "Correr recuperación léxica y vectorial juntas y fusionar las dos listas ordenadas.",
    x: [] },
  { t: "faithfulness", es: "fidelidad", keep: false,
    e: "Whether the generated answer is supported by the retrieved context and nothing else.",
    s: "Si la respuesta generada está respaldada por el contexto recuperado y nada más.",
    x: ["fidelidad al contexto recuperado"] },

  // ── Models, prompts, serving ────────────────────────────────────────────
  { t: "prompt", es: "prompt", keep: true,
    e: "The full text the model reads before producing a token — instructions, context and question.",
    s: "El texto completo que el modelo lee antes de producir un token: instrucciones, contexto y pregunta.",
    x: ["indicación", "consigna"] },
  { t: "token", es: "token", keep: true,
    e: "The unit a model reads and emits — a few characters, not a word. What you are billed for.",
    s: "La unidad que un modelo lee y emite: unos pocos caracteres, no una palabra. Es lo que se factura.",
    x: ["unidad léxica"],
    n: "The auth sense (`signed token`) is the same word and equally kept." },
  { t: "LLM", es: "LLM", keep: true, a: ["large language model"],
    e: "A model that predicts the next token over text, used here as a component with a cost and a failure mode.",
    s: "Un modelo que predice el siguiente token sobre texto, tratado aquí como componente con costo y modo de falla.",
    x: [] },
  { t: "fine-tuning", es: "fine-tuning", keep: true,
    e: "Updating the model's weights on curated examples to change behaviour, not to add facts.",
    s: "Actualizar los pesos del modelo con ejemplos curados para cambiar comportamiento, no para agregar hechos.",
    x: ["afinamiento", "sintonización fina"],
    n: "`fine-tuning` dominates 106 to 3. The two remaining `ajuste fino` uses are inside book and article " +
       "titles being cited, which is why the phrase itself is not banned." },
  { t: "LoRA", es: "LoRA", keep: true,
    e: "Fine-tuning by training small added matrices instead of the full weights, so it fits on one GPU.",
    s: "Fine-tuning entrenando matrices pequeñas añadidas en vez de todos los pesos, así cabe en una GPU.",
    x: [] },
  { t: "temperature", es: "temperature", keep: true,
    e: "Scales the logits before sampling; near zero sharpens toward the single most likely token.",
    s: "Escala los logits antes de muestrear; cerca de cero agudiza hacia el token más probable.",
    x: ["temperatura de muestreo"],
    n: "Spanish keeps the English word for the sampling parameter to avoid reading as physical heat." },
  { t: "KV cache", es: "KV cache", keep: true,
    e: "The keys and values of already-processed tokens, held in GPU memory so each new token is cheap.",
    s: "Las claves y valores de los tokens ya procesados, en memoria de GPU para que cada token nuevo sea barato.",
    x: ["caché de claves y valores"] },
  { t: "MCP", es: "MCP", keep: true, a: ["Model Context Protocol"],
    e: "An open JSON-RPC protocol standardising how a host application connects a model to tools and resources.",
    s: "Un protocolo abierto sobre JSON-RPC que estandariza cómo una aplicación host conecta un modelo a tools y resources.",
    x: [] },
  { t: "tool calling", es: "tool calling", keep: true,
    e: "The model emitting a structured request for a function the application then runs.",
    s: "El modelo emitiendo una petición estructurada de una función que luego ejecuta la aplicación.",
    x: ["llamado de herramientas", "invocación de herramientas"],
    n: "Only 5 uses; `llamado de herramientas` appears once and is banned to settle the inconsistency." },
  { t: "batching", es: "batching", keep: true,
    e: "Serving several requests in one forward pass, trading a little latency for much more throughput.",
    s: "Atender varias peticiones en un mismo forward pass, cambiando algo de latencia por mucho más throughput.",
    x: ["agrupamiento por lotes"],
    n: "`lotes` / `por lotes` also ship (60 uses) and are accepted in prose; the noun is `batching`." },
  { t: "quantization", es: "cuantización", keep: false,
    e: "Storing weights or cache at lower precision to fit more model in the same memory.",
    s: "Guardar pesos o caché con menor precisión para que quepa más modelo en la misma memoria.",
    x: ["cuantificación"] },
  { t: "context window", es: "ventana de contexto", keep: false,
    e: "The maximum number of tokens the model can read in one call.",
    s: "La cantidad máxima de tokens que el modelo puede leer en una sola llamada.",
    x: [] },
  { t: "structured output", es: "salida estructurada", keep: false,
    e: "Constraining generation so the result parses as a declared schema.",
    s: "Restringir la generación para que el resultado se parsee según un esquema declarado.",
    x: [] },
  { t: "inference", es: "inferencia", keep: false,
    e: "Running the model to produce output, as opposed to training it.",
    s: "Ejecutar el modelo para producir salida, en contraste con entrenarlo.",
    x: [] },
  { t: "serving", es: "servido", keep: false,
    e: "Operating a model behind an endpoint: batching, queueing, autoscaling and the tail latency it produces.",
    s: "Operar un modelo detrás de un endpoint: batching, encolado, autoescalado y la latencia de cola que produce.",
    x: [],
    n: "Inconsistent (14 vs 56). `inferencia` and `servir` are NOT banned — both are correct in their own senses." },
  { t: "eval", es: "evaluación", keep: false, a: ["eval set", "evals"],
    e: "A fixed labelled set a change is scored against, so a regression is a number rather than an opinion.",
    s: "Un conjunto etiquetado fijo contra el que se puntúa un cambio, así una regresión es un número y no una opinión.",
    x: [],
    n: "Spanish says `evaluación` (188) far more than `eval` (66); `eval` survives in fixed phrases like `eval set`." },

  // ── Reliability and distributed systems ─────────────────────────────────
  { t: "throughput", es: "throughput", keep: true,
    e: "How many calls the system completes per unit of time.",
    s: "Cuántas llamadas completa el sistema por unidad de tiempo.",
    x: ["caudal", "tasa de procesamiento"],
    n: "`rendimiento` is banned because it also means performance in general, which loses the distinction from latency." },
  { t: "timeout", es: "timeout", keep: true,
    e: "A hard time limit on a remote call; without one, a slow dependency holds your threads.",
    s: "Un límite de tiempo estricto para una llamada remota; sin él, una dependencia lenta retiene tus hilos.",
    x: ["tiempo de espera agotado"] },
  { t: "backpressure", es: "backpressure", keep: true,
    e: "A signal that propagates \"I am full, slow down\" upstream instead of buffering silently.",
    s: "Una señal que propaga \"estoy lleno, ve más lento\" hacia arriba en vez de bufferear en silencio.",
    x: ["presión inversa"],
    n: "`contrapresión` (4) is a real Spanish word for this and is allowed; `presión inversa` is the calque." },
  { t: "circuit breaker", es: "circuit breaker", keep: true,
    e: "A client-side switch that stops sending traffic to a dependency after a failure threshold.",
    s: "Un interruptor del lado del cliente que deja de enviar tráfico a una dependencia tras un umbral de fallas.",
    x: ["interruptor de circuito"],
    n: "`cortacircuitos` (3) is the standard Spanish electrical term and reads naturally; only the " +
       "word-by-word calque is banned." },
  { t: "load shedding", es: "descarte de carga", keep: false,
    e: "Deliberately rejecting or degrading a fraction of requests fast when over capacity.",
    s: "Rechazar o degradar deliberadamente una fracción de requests rápido cuando estás sobre capacidad.",
    x: [],
    n: "Narrowly prefers `descarte de carga` (8 vs 7). `alivio de carga` is NOT banned — it means relief, " +
       "as in \"a cache buys load relief, not correctness\"." },
  { t: "fallback", es: "fallback", keep: true,
    e: "A degraded answer served when a dependency is down — a cached value, a default, a partial page.",
    s: "Una respuesta degradada que se sirve cuando una dependencia está caída: un valor en caché, un default, una página parcial.",
    x: ["repliegue", "plan alternativo"] },
  { t: "failover", es: "failover", keep: true,
    e: "Promoting a follower to leader when the leader dies. Writes pause while it happens.",
    s: "Promover un seguidor a líder cuando el líder muere. Las escrituras se pausan mientras ocurre.",
    x: ["conmutación por error", "tolerancia a fallos por relevo"] },
  { t: "shard", es: "shard", keep: true,
    e: "One partition of the data, owned by an independent primary.",
    s: "Una partición de los datos, cuyo dueño es un primario independiente.",
    x: ["esquirla", "añico"] },
  { t: "sharding", es: "sharding", keep: true,
    e: "Splitting rows across independent primaries so write load divides too.",
    s: "Partir las filas entre primarios independientes para que la carga de escritura también se divida.",
    x: ["fragmentación horizontal", "particionado por esquirlas"] },
  { t: "shuffle sharding", es: "shuffle sharding", keep: true,
    e: "Giving each tenant a random subset of workers, so one bad tenant rarely shares all of yours.",
    s: "Dar a cada tenant un subconjunto aleatorio de workers, para que un tenant malo raramente comparta todos los tuyos.",
    x: [],
    n: "Only 3 Spanish uses against 14 English, but there is no Spanish rendering at all — the technique " +
       "has no established translation, so the English name is kept." },
  { t: "saga", es: "saga", keep: true,
    e: "A sequence of local transactions with compensating actions, used when one atomic transaction is impossible.",
    s: "Una secuencia de transacciones locales con acciones compensatorias, para cuando una transacción atómica es imposible.",
    x: [] },
  { t: "outbox", es: "outbox", keep: true,
    e: "Writing the event into the same transaction as the data, then publishing it from that table.",
    s: "Escribir el evento en la misma transacción que el dato, y publicarlo después desde esa tabla.",
    x: ["bandeja de salida"] },
  { t: "write-ahead log", es: "write-ahead log", keep: true, a: ["WAL"],
    e: "Durability by appending the change to a log before applying it, so a crash can replay.",
    s: "Durabilidad escribiendo el cambio en un log antes de aplicarlo, para que una caída pueda reproducirlo.",
    x: ["registro de escritura anticipada"] },
  { t: "DLQ", es: "DLQ", keep: true, a: ["dead-letter queue"],
    e: "Where a message goes after it has failed enough times to stop being retried.",
    s: "Donde va un mensaje después de fallar suficientes veces para dejar de reintentarse.",
    x: [] },
  { t: "cold start", es: "arranque en frío", keep: false,
    e: "The extra latency of the first call into a function that has no warm instance.",
    s: "La latencia extra de la primera llamada a una función que no tiene instancia caliente.",
    x: [],
    n: "Spanish prefers `arranque en frío` (10 vs 7), so the glossary records that rather than overruling it." },
  { t: "provisioned concurrency", es: "provisioned concurrency", keep: true,
    e: "Paying to keep function instances warm so the cold start is not on the request path.",
    s: "Pagar por mantener instancias de la función calientes para que el cold start no esté en la ruta del request.",
    x: [] },
  { t: "sidecar", es: "sidecar", keep: true,
    e: "A helper process deployed alongside the app to handle a cross-cutting concern.",
    s: "Un proceso auxiliar desplegado junto a la app para atender una preocupación transversal.",
    x: [] },
  { t: "latency", es: "latencia", keep: false,
    e: "How long a single call takes end to end.",
    s: "Cuánto tarda una sola llamada de punta a punta.",
    x: [] },
  { t: "queue", es: "cola", keep: false,
    e: "Where work waits when arrivals outpace service. Depth is the signal, not the symptom.",
    s: "Donde el trabajo espera cuando las llegadas superan al servicio. La profundidad es la señal, no el síntoma.",
    x: [] },
  { t: "retry", es: "reintento", keep: false,
    e: "Sending a failed call again — safe only when the operation is idempotent and the retry is bounded.",
    s: "Enviar de nuevo una llamada fallida: seguro solo si la operación es idempotente y el reintento está acotado.",
    x: [] },
  { t: "tail", es: "extremo lento", keep: false, a: ["tail latency"],
    e: "The slow end of the latency distribution — p95, p99, p99.9 — which is what real users complain about.",
    s: "El extremo lento de la distribución de latencia (p95, p99, p99.9), del que se quejan los usuarios reales.",
    x: [],
    n: "`cola` is NOT banned: it is the ordinary word for queue and appears 356 times in that sense." },
  { t: "idempotency", es: "idempotencia", keep: false,
    e: "The property that applying an operation twice leaves the same state as applying it once.",
    s: "La propiedad de que aplicar una operación dos veces deja el mismo estado que aplicarla una vez.",
    x: [] },
  { t: "eventual consistency", es: "consistencia eventual", keep: false,
    e: "Replicas converge, but a read right after a write may not see it.",
    s: "Las réplicas convergen, pero una lectura inmediatamente después de una escritura puede no verla.",
    x: [] },
  { t: "cell", es: "celda", keep: false,
    e: "A complete independent instance of the stack serving a subset of customers, so failure is contained.",
    s: "Una instancia completa e independiente del stack que atiende a un subconjunto de clientes, así la falla se contiene.",
    x: [] },
  { t: "blast radius", es: "radio de impacto", keep: false,
    e: "How much can be damaged by a single failure or compromise.",
    s: "Cuánto puede dañarse por una sola falla o compromiso.",
    x: ["radio de explosión"] },
  { t: "static stability", es: "estabilidad estática", keep: false,
    e: "Keeping working when the control plane is unavailable, by not needing it to serve.",
    s: "Seguir funcionando cuando el control plane no está disponible, por no necesitarlo para servir.",
    x: [] },
  { t: "autoscaling", es: "autoescalado", keep: false,
    e: "Adding or removing capacity from a signal — and the delay between the signal and the capacity.",
    s: "Agregar o quitar capacidad a partir de una señal, y el retardo entre la señal y la capacidad.",
    x: ["escalamiento automático"] },
  { t: "rate limit", es: "límite de tasa", keep: false,
    e: "A cap on requests per caller per window, enforced to protect the callee.",
    s: "Un tope de peticiones por llamador y por ventana, aplicado para proteger al llamado.",
    x: [],
    n: "Thin either way (5 Spanish vs 4 English uses). `límite de tasa` wins narrowly and is unambiguous, " +
       "which the bare English is not — `rate` alone reads as several things." },
  { t: "service mesh", es: "malla de servicios", keep: false,
    e: "Moving retries, mTLS and traffic policy out of each app and into the platform layer.",
    s: "Mover reintentos, mTLS y política de tráfico fuera de cada app hacia la capa de plataforma.",
    x: [],
    n: "Measures as `kept` on 4 English and 2 Spanish uses — too thin to be a signal. `malla de servicios` " +
       "(3) is the settled Spanish form in the corpus and wins on the Spanish-side count." },
  { t: "observability", es: "observabilidad", keep: false,
    e: "Being able to answer a new question about production without shipping new code.",
    s: "Poder responder una pregunta nueva sobre producción sin desplegar código nuevo.",
    x: [] },
  { t: "tracing", es: "trazas", keep: false, a: ["distributed tracing"],
    e: "Following one request across services, so latency can be attributed rather than guessed.",
    s: "Seguir un request a través de los servicios, para atribuir la latencia en vez de adivinarla.",
    x: ["rastreo distribuido"],
    n: "`trazas` (36) clearly beats `tracing` (6) in Spanish prose; the 26 English uses are what make the " +
       "raw ratio look inconsistent." },

  // ── Delivery, SRE, platform ─────────────────────────────────────────────
  { t: "SLO", es: "SLO", keep: true, a: ["service level objective"],
    e: "A target set on an SLI over a window, e.g. 99.9% under 300 ms across 28 days.",
    s: "Un objetivo fijado sobre un SLI en una ventana, p. ej. 99.9% bajo 300 ms en 28 días.",
    x: [] },
  { t: "SLI", es: "SLI", keep: true, a: ["service level indicator"],
    e: "A number observed directly about service quality, almost always a ratio of good events to all events.",
    s: "Un número observado directamente sobre la calidad del servicio, casi siempre una razón de eventos buenos sobre todos.",
    x: [] },
  { t: "SLA", es: "SLA", keep: true, a: ["service level agreement"],
    e: "A contract with the customer plus consequences — credits, penalties — when it is missed.",
    s: "Un contrato con el cliente más consecuencias (créditos, penalidades) cuando se incumple.",
    x: [] },
  { t: "error budget", es: "presupuesto de error", keep: false,
    e: "The gap between the SLO and 100%: at 99.9% you may be unhealthy 0.1% of the window.",
    s: "La brecha entre el SLO y el 100%: con un SLO de 99.9% puedes estar no sano el 0.1% de la ventana.",
    x: ["presupuesto de errores"],
    n: "Both forms ship (67 singular, 2 plural). The singular is canonical; the plural is banned to settle it." },
  { t: "p99", es: "p99", keep: true,
    e: "The latency the slowest 1% of requests exceed. It degrades under load because queues form.",
    s: "La latencia que supera el 1% más lento de las peticiones. Empeora bajo carga porque se forman colas.",
    x: ["percentil 99"] },
  { t: "p95", es: "p95", keep: true,
    e: "The latency the slowest 5% of requests exceed.",
    s: "La latencia que supera el 5% más lento de las peticiones.",
    x: ["percentil 95"] },
  { t: "runbook", es: "runbook", keep: true,
    e: "A short, current doc per alert: what it means, how to confirm it, the first diagnostic steps.",
    s: "Un doc corto y actualizado por alerta: qué significa, cómo confirmarla, los primeros pasos de diagnóstico.",
    x: ["libro de procedimientos", "manual de operación"] },
  { t: "toil", es: "toil", keep: true,
    e: "Repetitive manual on-call work that scales with traffic and leaves no durable value.",
    s: "Trabajo manual repetitivo de guardia que escala con el tráfico y no deja valor duradero.",
    x: ["trabajo penoso", "faena"] },
  { t: "DORA", es: "DORA", keep: true,
    e: "The research programme that named four delivery metrics separating high from low performers.",
    s: "El programa de investigación que nombró cuatro métricas de entrega que separan alto de bajo desempeño.",
    x: [] },
  { t: "canary", es: "canary", keep: true,
    e: "Sending a small slice of traffic to the new version and deciding on numbers, not on watching.",
    s: "Enviar una porción pequeña del tráfico a la versión nueva y decidir con números, no mirando.",
    x: ["despliegue canario"],
    n: "`canario` (9) is allowed as the adjective the corpus already uses (\"lanzamiento canario\", " +
       "\"umbral del canario\"); the noun is `canary`." },
  { t: "blue-green", es: "blue-green", keep: true,
    e: "Two full environments; the switch is a routing change, so rollback is the same change reversed.",
    s: "Dos entornos completos; el cambio es de ruteo, así que el rollback es el mismo cambio al revés.",
    x: [],
    n: "`azul-verde` (3) appears as a gloss beside the English term and is left alone." },
  { t: "rollback", es: "rollback", keep: true,
    e: "Returning to the last known-good version. The interesting question is whether it is automatic.",
    s: "Volver a la última versión buena conocida. La pregunta interesante es si es automático.",
    x: ["marcha atrás"],
    n: "Also the database sense (a transaction rolling back); the same word covers both here." },
  { t: "commit", es: "commit", keep: true,
    e: "In a database, the point after which the write survives a crash. In version control, one recorded change.",
    s: "En una base de datos, el punto tras el cual la escritura sobrevive a una caída. En control de versiones, un cambio registrado.",
    x: ["consignar"],
    n: "There is a THIRD sense in the corpus — disagree-and-commit, full support for a decision made against you. " +
       "That one is a verb in prose, not this term, which is why `confirmar` (27 uses) is not banned." },
  { t: "feature flag", es: "feature flag", keep: true,
    e: "A runtime switch that lets unfinished code merge to trunk turned off.",
    s: "Un interruptor en tiempo de ejecución que permite integrar código inconcluso al trunk apagado.",
    x: ["bandera de característica", "interruptor de función"] },
  { t: "trunk-based", es: "trunk-based", keep: true,
    e: "Everyone merges to one branch daily; long-lived branches are the thing being avoided.",
    s: "Todos integran a una sola rama a diario; las ramas de larga vida son justo lo que se evita.",
    x: ["basado en tronco", "desarrollo troncal"],
    n: "`basado en trunk` (6 uses) is the hybrid the corpus actually ships; the fully translated form is banned." },
  { t: "guardrail", es: "guardrail", keep: true,
    e: "A systemic control that makes the dangerous action hard or impossible, rather than discouraged.",
    s: "Un control sistémico que hace difícil o imposible la acción peligrosa, en vez de solo desalentarla.",
    x: ["barandilla"],
    n: "`guardarraíl` (9) is the accepted Spanish spelling and ships; `barandilla` is a handrail. " +
       "`límite` (230) and `barrera` (29) are NOT banned either: the first means threshold, the second is literal." },
  { t: "paved road", es: "camino pavimentado", keep: false,
    e: "The supported default path that is easier than the alternatives, so teams choose it without a mandate.",
    s: "El camino por defecto soportado que es más fácil que las alternativas, así los equipos lo eligen sin mandato.",
    x: [] },
  { t: "gameday", es: "gameday", keep: true,
    e: "A scheduled rehearsal of a failure, run against production or a faithful copy.",
    s: "Un ensayo agendado de una falla, ejecutado contra producción o una copia fiel.",
    x: ["día de juego"] },
  { t: "postmortem", es: "postmortem", keep: true,
    e: "The written account after an incident, whose value is the systemic cause, not the timeline.",
    s: "El relato escrito después de un incidente, cuyo valor está en la causa sistémica, no en la cronología.",
    x: ["autopsia"] },
  { t: "blameless", es: "sin culpa", keep: false,
    e: "Written so the cause is a system property rather than a person's mistake.",
    s: "Escrito de modo que la causa sea una propiedad del sistema y no el error de una persona.",
    x: ["sin culpables"],
    n: "Both forms ship (31 vs 4); the singular is canonical." },
  { t: "on-call", es: "guardia", keep: false,
    e: "The rotation that owns production right now, and is paged when the SLO burns.",
    s: "La rotación que es dueña de producción ahora mismo, y a la que se pagea cuando el SLO se quema.",
    x: [],
    n: "Spanish says `guardia` / `de guardia` (155) far more than `on-call` (32)." },
  { t: "drift", es: "deriva", keep: false,
    e: "Any divergence between declared infrastructure and deployed reality.",
    s: "Cualquier divergencia entre la infraestructura declarada y la realidad desplegada.",
    x: ["desvío de configuración"] },
  { t: "control plane", es: "plano de control", keep: false,
    e: "The part that decides and configures, as opposed to the part serving requests.",
    s: "La parte que decide y configura, en contraste con la que atiende peticiones.",
    x: ["capa de control"],
    n: "`plano de control` (44) beats `control plane` (15) in Spanish prose. The pair with `data plane` is " +
       "decided together so the two halves cannot drift apart." },
  { t: "data plane", es: "plano de datos", keep: false,
    e: "The part that actually serves the request path.",
    s: "La parte que efectivamente atiende la ruta del request.",
    x: [],
    n: "Follows `control plane`: `plano de datos` (9) against 3 English uses in Spanish prose. " +
       "`capa de datos` is NOT banned — it means the data tier, a different idea." },
  { t: "landing zone", es: "zona de aterrizaje", keep: false,
    e: "The pre-built multi-account baseline — identity, network, logging, guardrails — a workload lands in.",
    s: "La base multi-cuenta preconstruida (identidad, red, logging, guardrails) donde aterriza una carga.",
    x: [],
    n: "`zona de aterrizaje` (7) against 2 uses of the English form in Spanish prose." },
  { t: "least privilege", es: "mínimo privilegio", keep: false,
    e: "Granting exactly the permissions needed, and nothing that is merely convenient.",
    s: "Otorgar exactamente los permisos necesarios, y nada que sea solo conveniente.",
    x: ["privilegio mínimo", "menor privilegio"],
    n: "Three variants ship (23 / 4 / 2). One is canonical and the other two are banned to end the drift." },
  { t: "SBOM", es: "SBOM", keep: true, a: ["software bill of materials"],
    e: "The machine-readable list of what is actually inside a build.",
    s: "La lista legible por máquina de lo que hay realmente dentro de un build.",
    x: [] },
  { t: "lock-in", es: "lock-in", keep: true,
    e: "The cost of leaving a vendor, which is a number you can estimate rather than a feeling.",
    s: "El costo de salir de un proveedor, que es un número estimable y no una sensación.",
    x: ["cautividad", "atadura"],
    n: "`amarre` (19) outnumbers `lock-in` (14) and is deliberately allowed: it is idiomatic and the corpus " +
       "uses it for exactly this idea (\"la ubicación del catálogo decide el amarre\"). `bloqueo` (49) is not " +
       "banned either — it means a database lock here." },
  { t: "portability", es: "portabilidad", keep: false,
    e: "How much would have to change to run the same workload somewhere else.",
    s: "Cuánto habría que cambiar para correr la misma carga en otro lugar.",
    x: [],
    n: "`portabilidad` (19) against 5 uses of `portability` in Spanish prose — a direct cognate, so there " +
       "is no reason to keep the English." },
  { t: "chargeback", es: "chargeback", keep: true,
    e: "Billing each team for the infrastructure it consumes, so cost lands where the decision is made.",
    s: "Facturar a cada equipo la infraestructura que consume, para que el costo caiga donde se decide.",
    x: ["retrofacturación"] },
  { t: "unit economics", es: "economía unitaria", keep: false,
    e: "Cost per unit of value delivered — per request, per tenant — rather than total spend.",
    s: "Costo por unidad de valor entregado (por request, por tenant) en vez de gasto total.",
    x: [] },
  { t: "tenant", es: "tenant", keep: true,
    e: "One customer's isolated slice of a shared system.",
    s: "La porción aislada de un sistema compartido que corresponde a un cliente.",
    x: [],
    n: "Nearly even (78 vs 64), so neither form is banned. `tenant` is canonical for new prose; `inquilino` " +
       "is correct Spanish and stays. `cliente` (322) means customer and is unrelated." },
  { t: "multi-tenant", es: "multitenant", keep: false,
    e: "One deployment serving many customers, where isolation is a design property and not a hope.",
    s: "Un despliegue que atiende a muchos clientes, donde el aislamiento es una propiedad de diseño y no un deseo.",
    x: ["multiarrendatario"],
    n: "`multi-inquilino` (3) is consistent with `inquilino` staying legal above." },

  // ── Acronyms the corpus teaches ─────────────────────────────────────────
  // Added after tools/_gaps.js found `p50` shipping 42 times with no entry — a gap the
  // self-test hit by accident. Every acronym here measures at ratio ≈ 1.0: an acronym
  // crosses languages unchanged, which is worth RECORDING rather than assuming, because
  // it is the reason their Spanish expansions are aliases and never bans. Universal
  // computing acronyms (API, CPU, JSON, HTTP, SQL) are deliberately excluded: nobody
  // needs a bilingual ruling on `API`, and an entry per acronym would bury the terms
  // where the decision is real.
  { t: "p50", es: "p50", keep: true, a: ["median latency"],
    e: "The latency half of all requests come in under — the typical case, and the one that hides the problem.",
    s: "La latencia bajo la que cae la mitad de las peticiones: el caso típico, y el que esconde el problema.",
    x: ["percentil 50"] },
  { t: "TTL", es: "TTL", keep: true, a: ["time to live"],
    e: "How long a cached value stays valid. Expiry is a failure mode, not a cleanup detail.",
    s: "Cuánto tiempo sigue siendo válido un valor en caché. La expiración es un modo de falla, no un detalle de limpieza.",
    x: [],
    n: "`tiempo de vida` (7) coexists as a first-use gloss and is not banned." },
  { t: "CAP", es: "CAP", keep: true,
    e: "Under a network partition you choose consistency or availability. It says nothing about the normal case.",
    s: "Bajo una partición de red eliges consistencia o disponibilidad. No dice nada sobre el caso normal.",
    x: [],
    n: "Ratio 0.41 is misleading: the English figure counts `CAP` inside `PACELC` discussions and in " +
       "\"CAP theorem\", while Spanish writes `teorema CAP`. The acronym itself is never translated." },
  { t: "PACELC", es: "PACELC", keep: true,
    e: "Extends CAP with the question that matters more day to day: latency or consistency when there is no partition.",
    s: "Extiende CAP con la pregunta que importa más a diario: latencia o consistencia cuando no hay partición.",
    x: [] },
  { t: "ACID", es: "ACID", keep: true,
    e: "The four guarantees a transaction gives, of which durability is the one that survives a crash.",
    s: "Las cuatro garantías que da una transacción, de las cuales la durabilidad es la que sobrevive a una caída.",
    x: [] },
  { t: "CQRS", es: "CQRS", keep: true, a: ["command query responsibility segregation"],
    e: "Separating the write model from the read model, which buys read scale and costs you consistency.",
    s: "Separar el modelo de escritura del de lectura: compra escala de lectura y cuesta consistencia.",
    x: [] },
  { t: "CDC", es: "CDC", keep: true, a: ["change data capture"],
    e: "Publishing a stream of committed database changes, so downstream systems follow the log rather than poll.",
    s: "Publicar un flujo de cambios ya confirmados de la base, para que los sistemas de abajo sigan el log en vez de sondear.",
    x: [] },
  { t: "LSM", es: "LSM", keep: true, a: ["log-structured merge tree"],
    e: "A write-optimised index: buffer in memory, flush sorted runs, merge them later. Writes are cheap, reads pay.",
    s: "Un índice optimizado para escritura: bufferear en memoria, volcar corridas ordenadas y fusionarlas luego. Las escrituras son baratas, las lecturas pagan.",
    x: [] },
  { t: "QPS", es: "QPS", keep: true, a: ["queries per second"],
    e: "Arrival rate. Compared against service rate, it tells you whether a queue forms.",
    s: "Tasa de llegada. Comparada con la tasa de servicio, dice si se forma una cola.",
    x: [],
    n: "`peticiones por segundo` (14) is a legitimate expansion and stays." },
  { t: "TTFT", es: "TTFT", keep: true, a: ["time to first token"],
    e: "How long before the first token appears — a separate serving goal from inter-token latency and throughput.",
    s: "Cuánto tarda en aparecer el primer token: un objetivo de serving distinto de la latencia entre tokens y del throughput.",
    x: [] },
  { t: "MRR", es: "MRR", keep: true, a: ["mean reciprocal rank"],
    e: "Scores retrieval by how high the first relevant result lands, averaged over queries.",
    s: "Puntúa la recuperación según qué tan alto queda el primer resultado relevante, promediado sobre las consultas.",
    x: [] },
  { t: "PII", es: "PII", keep: true, a: ["personally identifiable information"],
    e: "Data that identifies a person, whose leakage is a compliance event and not just a bug.",
    s: "Datos que identifican a una persona, cuya fuga es un evento de cumplimiento y no solo un bug.",
    x: [] },
  { t: "OWASP", es: "OWASP", keep: true,
    e: "The body whose Top 10 lists name the most consequential risks — including one specific to LLM applications.",
    s: "La organización cuyas listas Top 10 nombran los riesgos más consecuentes, incluida una específica para aplicaciones LLM.",
    x: [] },
  { t: "STRIDE", es: "STRIDE", keep: true,
    e: "A threat-modelling checklist applied per trust boundary, which is what makes it exhaustive rather than clever.",
    s: "Una checklist de modelado de amenazas aplicada por límite de confianza, que es lo que la hace exhaustiva y no ingeniosa.",
    x: [] },
  { t: "AZ", es: "AZ", keep: true, a: ["availability zone"],
    e: "One isolated failure domain within a region — the unit multi-AZ redundancy is measured in.",
    s: "Un dominio de falla aislado dentro de una región: la unidad en la que se mide la redundancia multi-AZ.",
    x: [],
    n: "Closest call among the acronyms: `zona de disponibilidad` (9) nearly matches `AZ` (13). Both stay." },
  { t: "IC", es: "IC", keep: true, a: ["individual contributor"],
    e: "The non-management track, where scope grows through leverage rather than headcount.",
    s: "La vía sin gestión de personas, donde el alcance crece por apalancamiento y no por número de reportes.",
    x: [] },

  // ── Scope, influence, staff-level work ──────────────────────────────────
  { t: "tradeoff", es: "tradeoff", keep: true,
    e: "What an option gains in exchange for what it gives up; every real alternative has both.",
    s: "Lo que una opción gana a cambio de lo que sacrifica; toda alternativa real tiene ambos.",
    x: [],
    n: "`compensación` (61) outnumbers `tradeoff` (36) and is deliberately still allowed — it is idiomatic Spanish. " +
       "This entry sets the canonical form without invalidating shipped prose." },
  { t: "scope", es: "alcance", keep: false,
    e: "What a piece of work includes and, more usefully, what it excludes.",
    s: "Lo que un trabajo incluye y, más útil aún, lo que excluye.",
    x: [] },
  { t: "leverage", es: "apalancamiento", keep: false,
    e: "Output that continues after you stop pushing, because it changed how others work.",
    s: "Resultado que continúa después de que dejas de empujar, porque cambió cómo trabajan otros.",
    x: [] },
  { t: "glue work", es: "trabajo de pegamento", keep: false,
    e: "The coordination that makes a project land and that no artifact records.",
    s: "La coordinación que hace que un proyecto aterrice y que ningún artefacto registra.",
    x: ["trabajo de unión"] },
  { t: "sponsorship", es: "patrocinio", keep: false,
    e: "Spending your own credibility to put someone into an opportunity they cannot reach alone.",
    s: "Gastar tu propia credibilidad para meter a alguien en una oportunidad que no puede alcanzar solo.",
    x: ["apadrinamiento"],
    n: "`padrinazgo` (7) is used deliberately alongside `patrocinio` (103) to separate sponsoring a person " +
       "from sponsoring a project, so it is allowed." },
  { t: "mentoring", es: "mentoría", keep: false,
    e: "Advice given to someone who then decides. Distinct from sponsorship, which spends your capital.",
    s: "Consejo dado a alguien que después decide. Distinto del patrocinio, que gasta tu capital.",
    x: ["mentoreo"] },
  { t: "delegation", es: "delegación", keep: false,
    e: "Handing over the decision, not the typing.",
    s: "Ceder la decisión, no el tecleo.",
    x: [] },
  { t: "influence", es: "influencia", keep: false,
    e: "Changing what other teams do without authority over them.",
    s: "Cambiar lo que hacen otros equipos sin autoridad sobre ellos.",
    x: [] },
  { t: "stakeholder", es: "stakeholder", keep: true,
    e: "Anyone whose work the decision changes, including the people who will operate it.",
    s: "Cualquiera cuyo trabajo cambie por la decisión, incluidas las personas que la van a operar.",
    x: ["parte interesada"],
    n: "Thin evidence (6 vs 16) and no dominant Spanish form; the English term is standard in the region." },
  { t: "ADR", es: "ADR", keep: true, a: ["architecture decision record"],
    e: "A short record of one decision, its context and what it rules out — written when it is made.",
    s: "Un registro corto de una decisión, su contexto y lo que descarta, escrito cuando se toma.",
    x: [] },
  { t: "RFC", es: "RFC", keep: true,
    e: "A written proposal circulated for comment before the work starts.",
    s: "Una propuesta escrita que se circula para comentarios antes de empezar el trabajo.",
    x: [] },
  { t: "design doc", es: "documento de diseño", keep: false,
    e: "The document that makes a design reviewable before it is code.",
    s: "El documento que hace revisable un diseño antes de que sea código.",
    x: [],
    n: "`documento de diseño` leads 42 to 4; the short form is an abbreviation, not a calque." },
  { t: "roadmap", es: "roadmap", keep: true,
    e: "The sequenced plan, whose honest version names what is being deferred.",
    s: "El plan secuenciado, cuya versión honesta nombra lo que se está postergando.",
    x: [],
    n: "`roadmap` leads 22 to 6, but `hoja de ruta` is standard Spanish and is not worth banning." },
  { t: "tech lead", es: "tech lead", keep: true,
    e: "The role accountable for a team's technical direction and delivery.",
    s: "El rol responsable de la dirección técnica y la entrega de un equipo.",
    x: ["líder técnico"] },
];

// ── build ────────────────────────────────────────────────────────────────
const c = corpus();
const EN = c.en.join("\n");
const ES = c.es.join("\n");

const measured = TERMS.map((d) => {
  const en = count(EN, d.t);
  const es = count(ES, d.es);
  const kept = count(ES, d.t); // the English form, inside Spanish prose
  const { verdict, ratio } = classify(en, kept);
  return { d, usage: { en, esCanonical: es, englishFormInSpanish: kept, ratio: Number(ratio.toFixed(2)), verdict } };
});

const REVIEW_STATE = "reviewed";
const header = (lang) => ({
  $schema: "./glossary.schema.md",
  sourceLanguage: "en",
  language: lang,
  reviewState: REVIEW_STATE,
  generatedBy: "tools/gen-glossary.cjs",
  policy: "docs/transformation/terminology-policy.md",
  note:
    "GENERATED — edit tools/gen-glossary.cjs, not this file. `usage` is measured against " +
    "src/content/data/*.json at build time so the numbers cannot go stale.",
  terms: [],
});

const en = header("en");
en.terms = measured.map(({ d, usage }) => ({
  term: d.t,
  canonical: d.t,
  spanish_usage: d.es,
  translate: !d.keep,
  first_use_explanation: d.e,
  aliases: d.a ?? [],
  avoid: d.x,
  ...(d.n ? { note: d.n } : {}),
  usage,
}));

const es = header("es");
es.terms = measured.map(({ d, usage }) => ({
  term: d.t,
  canonical: d.t,
  spanish_usage: d.es,
  translate: !d.keep,
  first_use_explanation: d.s,
  aliases: d.a ?? [],
  avoid: d.x,
  ...(d.n ? { note: d.n } : {}),
  usage,
}));

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "glossary.en.json"), JSON.stringify(en, null, 2) + "\n");
fs.writeFileSync(path.join(OUT, "glossary.es.json"), JSON.stringify(es, null, 2) + "\n");

const keptN = measured.filter((m) => m.d.keep).length;
const banned = measured.reduce((a, m) => a + m.d.x.length, 0);
console.log(
  `content/glossary.{en,es}.json — ${measured.length} terms ` +
  `(${keptN} kept in English, ${measured.length - keptN} localized), ${banned} banned renderings`
);
const noEvidence = measured.filter((m) => m.usage.en + m.usage.englishFormInSpanish + m.usage.esCanonical < 6);
if (noEvidence.length) {
  console.log(`\nthin evidence (<6 total uses) — ${noEvidence.length}:`);
  for (const m of noEvidence) console.log(`  ${m.d.t}: en ${m.usage.en}, es ${m.usage.esCanonical}`);
}
