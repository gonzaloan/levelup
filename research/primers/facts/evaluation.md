# Cluster: evaluation — "Evaluation"

Current tagline (EN): You cannot improve what you have not separated: measure retrieval and generation apart.
Current tagline (ES): No puedes mejorar lo que no has separado: mide la recuperación y la generación por separado.

## The 18 entry slugs — your families MUST partition exactly these

- `retrieval-vs-generation-eval`
- `recall-at-k`
- `mrr-and-ndcg`
- `context-precision`
- `faithfulness-groundedness`
- `answer-relevance-metric`
- `golden-set-construction`
- `llm-judge-human-agreement`
- `rag-failure-taxonomy`
- `rag-missing-content`
- `rag-missed-top-ranked`
- `rag-not-in-context`
- `rag-not-extracted`
- `rag-wrong-format`
- `rag-incorrect-specificity`
- `ragas-noise-sensitivity`
- `agent-run-as-span-tree`
- `otel-genai-semconv`

## Each entry, so your primer sits ABOVE them and never restates one

### `retrieval-vs-generation-eval` — Separating retrieval and generation metrics
- **is:** Scoring the retriever and the generator with different metrics, so that a single end-to-end number cannot hide which of the two stages is failing.
- **when:** Before you touch the prompt: if the end-to-end score dropped, check retrieval first, because the generator cannot ground an answer on a chunk it never received.
- **costs:** Two label sets and two scoring runs instead of one: reference contexts or IDs for retrieval, plus per-claim judgments for generation, where Ragas spends one LLM call per judgment and two calls per NVIDIA-style rating.
- **cheaper first:** One end-to-end score plus a manual read of 20 failed traces is enough while the corpus is small; split the metrics once you can no longer tell by eye whether the chunk was missing or was received and ignored.
- **figures you may cite:**
  - Ragas paper on WikiEval (50 Wikipedia pages, one question each): agreement with human annotators 0
  - 95 for faithfulness, 0
  - 78 for answer relevance, 0
  - 70 for context relevance, against 0
  - 63 for GPT Score

### `recall-at-k` — Recall@k
- **is:** The share of all known relevant documents for a query that appear inside the top k results the retriever returns.
- **when:** When a reranker or a generator can only work with what it receives: measure recall at the exact k you feed downstream, before spending money on either stage.
- **costs:** It needs a labelled relevant set per query, and it rises monotonically with k, so a k of 100 flatters a retriever that puts nothing useful in the top 3.
- **cheaper first:** Hit rate at k, the fraction of queries with at least one relevant document retrieved, needs a single label per query instead of an exhaustive set, and wins when the generator only needs one supporting passage.
- **needs first:** retrieval-vs-generation-eval
- **figures you may cite:**
  - Elasticsearch rank_eval: the recall metric defaults to k = 10 and relevant_rating_threshold = 1
  - The Elasticsearch ranking evaluation API computes R@k with k defaulting to 10 and relevant_rating_threshold defaulting to 1
  - It needs a labelled relevant set per query, and it rises monotonically with k, so a k of 100 flatters a retriever that puts nothing useful in the top 3

### `mrr-and-ndcg` — MRR and nDCG
- **is:** Two ranked-retrieval scores: MRR averages 1/rank of the first relevant hit, nDCG discounts graded relevance by log2 of position and divides by the ideal ranking.
- **when:** MRR when a single right answer ends the query, as in lookup or jump-to-document search. nDCG when relevance is graded and several passages matter, which is the RAG case for any k above 1.
- **costs:** nDCG needs graded labels rather than binary ones, so judging costs more per document; MRR ignores everything after the first hit, so 1 relevant document at rank 1 plus 9 misses still scores a perfect 1.0.
- **cheaper first:** Recall@k plus a manual read of the top 3 answers the same question more cheaply while the generator reads all k chunks anyway; move to nDCG only once the order inside k changes the final answer.
- **needs first:** recall-at-k
- **figures you may cite:**
  - scikit-learn ndcg_score with true relevance [10, 0, 0, 1, 5]: 0
  - 69 for one score vector, 0
  - 49 for another, 0
  - 35 at k = 4, and 1
  - 0 for a perfect ranking at k = 4
  - sentence-transformers defaults mrr_at_k = [10], ndcg_at_k = [10], map_at_k = [100]

### `context-precision` — Context precision and context relevance
- **is:** A rank-aware score for retrieved chunks: the mean of precision@k over positions, counted only at ranks where the chunk itself was judged relevant.
- **when:** When the prompt truncates context or the model degrades on long inputs: context precision falls when relevant chunks sit low in the list, a defect recall@k cannot see at all.
- **costs:** One LLM judgment per retrieved chunk, so 10 chunks per query cost 10 judge calls, and the non-LLM variant instead needs reference_contexts plus a rapidfuzz string-distance dependency.
- **cheaper first:** Context Relevance rates the whole retrieved set 0, 1 or 2, divides by 2 and averages two judge calls, which is 2 calls per query instead of one per chunk, and it wins when you only need to know whether retrieval was on topic.
- **needs first:** retrieval-vs-generation-eval
- **figures you may cite:**
  - Ragas docs: the two-chunk example scores 0.9999999999 with the relevant chunk first and 0
  - 49999999995 with the irrelevant chunk first
  - IDBasedContextPrecision scores 0.5 when 2 of 4 retrieved IDs match the reference IDs
  - One LLM judgment per retrieved chunk, so 10 chunks per query cost 10 judge calls, and the non-LLM variant instead needs reference_contexts plus a rapidfuzz string-distance dependency

### `faithfulness-groundedness` — Faithfulness (groundedness)
- **is:** The fraction of claims in a generated answer that the retrieved context supports. Scored 0 to 1 by splitting the answer into claims and checking each one.
- **when:** Your answers cite retrieved documents, and one wrong sentence stated with confidence is a real incident rather than a cosmetic defect. Reach for it when retrieval scores already look fine and users still report invented details.
- **costs:** One LLM call to extract claims plus one verification call per claim, so a 6-claim answer runs about 7 judge calls; HHEM-2.1-Open replaces the verification calls in under 600MB of RAM at about 1.5s for a 2k-token input on CPU.
- **cheaper first:** A string or regex assertion on the values that must appear, then HHEM-2.1-Open instead of a frontier judge. HHEM wins when your contexts are short prose and you accept 76.55% balanced accuracy on AggreFact-SOTA, which beat GPT-4's 73.78% on that set.
- **figures you may cite:**
  - RAGAS paper: faithfulness agreed with two human annotators on 0.95 of WikiEval pairwise comparisons, against 0
  - 72 for a GPT score baseline and 0
  - 54 for GPT ranking
  - The two annotators themselves agreed on faithfulness in around 95% of cases, over 50 Wikipedia pages
  - The score is supported claims over total claims, so 1 of 2 statements verified gives 0
  - 5. DeepEval computes the same ratio and passes at a default threshold of 0

### `answer-relevance-metric` — Answer relevance (response relevancy)
- **is:** How directly a response addresses the question asked, ignoring whether it is factually right. Needs only the user input and the output, never a reference answer.
- **when:** Users report that answers wander, restate the question, or bury the point, while faithfulness stays high. It also catches an answer that covers only one half of a two-part question.
- **costs:** One LLM call plus 3 embedding calls per sample at the default strictness of 3, and the result is not bounded to 0 through 1 because cosine similarity spans -1 to 1.
- **cheaper first:** Output length limits and a refusal-phrase check, which cost zero model calls. They win when the failure you actually see is a 400-word preamble or a canned apology, not subtle off-topic drift.
- **figures you may cite:**
  - Ragas default strictness is 3 generated questions per sample
  - The documented example, question 'When was the first super bowl?' answered with 'Jan 15, 1967', scores 0
  - 9165. In the RAGAS paper the metric matched human annotators on 0
  - 78 of WikiEval pairs, against 0
  - 52 for a GPT score baseline
  - N defaults to 3 through the strictness parameter

### `golden-set-construction` — Golden set (labeled evaluation dataset)
- **is:** A fixed, versioned set of inputs with expected outputs or grading notes, labeled by a domain expert, that every change to the system is scored against.
- **when:** Before you tune a prompt or swap a model, because without a fixed labeled set every comparison is anecdote. Also the first time two people disagree about whether a given output was acceptable.
- **costs:** Expert labeling time: 100-200 items at binary pass or fail with a written critique each, which is hours of one senior person, plus a re-labeling pass every time the product's definition of a good answer moves.
- **cheaper first:** Twenty to thirty hand-reviewed examples in a spreadsheet, read in one sitting. That wins while you are still finding new failure modes, and the stopping rule is to keep labeling only until new modes stop appearing.
- **figures you may cite:**
  - Ragas states that a representative sample of 100-200 examples covering diverse scenarios is enough for reliable judge alignment, and its worked guide loads 160 annotated rows
  - Anthropic's eval guidance sizes per criterion instead: 1,000 labeled tweets for exact match, 200 articles for ROUGE-L, 100 inquiries for a 1-5 LLM grader, and 10,000 items for a held-out F1 target
  - Ragas guidance puts a representative sample at 100-200 examples across diverse scenarios
  - 2, so two scores stay comparable
  - Expert labeling time: 100-200 items at binary pass or fail with a written critique each, which is hours of one senior person, plus a re-labeling pass every time the product's definition of a good answer moves

### `llm-judge-human-agreement` — Validating an LLM judge against human labels
- **is:** Measuring how often an LLM grader's verdicts match an expert's on the same labeled items, before any score from that grader is trusted or reported.
- **when:** Any time a judge score will gate a deploy or land in a report someone acts on. The usable bar in practice is agreement with the expert at or above the human-human rate on the same items, 81% in MT-bench.
- **costs:** One judge call per labeled item per iteration, so 160 items across 3 prompt revisions is about 480 calls, and one full run took 4 minutes 35 seconds at 1.72s per item with gpt-4o-mini.
- **cheaper first:** A code assertion or exact match wherever the answer is checkable, which needs no labels and no judge model. That wins for formats, required fields and numeric answers, leaving the judge for genuinely subjective calls.
- **needs first:** golden-set-construction
- **figures you may cite:**
  - MT-bench: GPT-4 agreed with humans on 85% of non-tie votes against 81% human-human, over 3K expert votes from 58 labelers plus 30K crowdsourced comparisons
  - Few-shot examples raised GPT-4's position consistency from 65
  - 5% at 4x the prompt cost
  - A Ragas prompt rewrite moved alignment from 121/160 (75
  - 6%) to 139/160 (86
  - 9%), with 39 false positives and 0 false negatives at baseline

### `rag-failure-taxonomy` — The seven RAG failure points
- **is:** A named list of seven places a retrieval-augmented system returns a bad answer, from an unindexed document to an ignored output format.
- **when:** A RAG answer is wrong and you need to know which stage to instrument before you swap the embedding model.
- **costs:** One labelled failure point per bad answer, and labelling means a human reads the retrieved chunks: in the paper's BioASQ run of 1000 questions, 40 issues were reviewed by hand.
- **cheaper first:** Print the exact context string sent to the model for ten bad answers. If the answer text is already in that context, no retrieval change helps and you are in FP4 or FP5.
- **figures you may cite:**
  - BioASQ: 4017 open-access documents, 1000 questions, 40 issues reviewed manually
  - AI Tutor: 38 documents, piloted with 200 students from 30 October 2023
  - One labelled failure point per bad answer, and labelling means a human reads the retrieved chunks: in the paper's BioASQ run of 1000 questions, 40 issues were reviewed by hand

### `rag-missing-content` — FP1 missing content
- **is:** Failure point 1: the indexed corpus never held the answer, and the system replies anyway instead of admitting it does not know.
- **when:** The retrieved chunks are on topic and none of them states the specific fact the user asked for.
- **costs:** An abstain path adds one grounding check per query and converts some answerable questions into refusals, trading coverage for precision.
- **cheaper first:** Search the raw corpus for the entity named in the question. If it is absent, stop tuning retrieval and fix ingestion or scope instead.
- **needs first:** rag-failure-taxonomy

### `rag-missed-top-ranked` — FP2 missed the top ranked documents
- **is:** Failure point 2: the document holding the answer is ranked below the cut-off k, so retrieval never hands it to the model.
- **when:** recall@k on your labelled set is below your answer accuracy target and the gold chunk sits at rank 20 or lower.
- **costs:** Going from k=5 to k=50 multiplies context tokens by up to 10x per request, or you add a reranker call that scores 50 candidates before the answer starts.
- **cheaper first:** Measure recall@k with 50 hand-labelled questions. If the gold chunk is already inside the k you return, the fault is downstream and a reranker buys nothing.
- **needs first:** rag-failure-taxonomy
- **figures you may cite:**
  - Going from k=5 to k=50 multiplies context tokens by up to 10x per request, or you add a reranker call that scores 50 candidates before the answer starts

### `rag-not-in-context` — FP3 not in context
- **is:** Failure point 3: the answering document came back from the database and consolidation dropped it before the prompt was assembled.
- **when:** Retrieval logs contain the right chunk id and the prompt you actually sent does not.
- **costs:** Every dropped chunk is a token you refused to pay for, and even a 200k window forces a cut once 50 chunks of 1000 tokens come back per query.
- **cheaper first:** Log the final assembled prompt, not the retrieval result. Comparing the two logs separates FP3 from FP2 in one afternoon and costs no model calls.
- **needs first:** rag-failure-taxonomy
- **figures you may cite:**
  - Every dropped chunk is a token you refused to pay for, and even a 200k window forces a cut once 50 chunks of 1000 tokens come back per query

### `rag-not-extracted` — FP4 not extracted
- **is:** Failure point 4: the answer sits in the context window and the model fails to pull it out.
- **when:** You pasted the exact prompt into a playground, the answer is visibly in it, and the model still misses.
- **costs:** Cutting context from 20 chunks to 5 lowers recall of the answering chunk, so you pay recall to buy extraction accuracy.
- **cheaper first:** Hand the model only the gold chunk. If it answers correctly, the context is what needs work and the model choice is not.
- **needs first:** rag-failure-taxonomy
- **figures you may cite:**
  - Cutting context from 20 chunks to 5 lowers recall of the answering chunk, so you pay recall to buy extraction accuracy

### `rag-wrong-format` — FP5 wrong format
- **is:** Failure point 5: a specific output shape was requested, a table or a list, and the model ignored the instruction.
- **when:** A downstream parser consumes the answer, so a shape violation breaks the next job instead of only looking odd.
- **costs:** A schema check plus one retry adds one extra call on the failing fraction of requests, and constrained decoding rules out some phrasings the model would otherwise produce.
- **cheaper first:** Validate the output and retry once with the parse error attached. If the second attempt passes above 99% of the time, you do not need constrained decoding.
- **needs first:** rag-failure-taxonomy

### `rag-incorrect-specificity` — FP6 incorrect specificity
- **is:** Failure point 6: the answer is on topic and pitched at the wrong grain, either too general or too narrow for the asker.
- **when:** Reviewers keep marking answers as technically correct and not useful for the question that was asked.
- **costs:** A clarifying turn adds one round trip per ambiguous query, and query rewriting adds a model call before retrieval on 100% of requests.
- **cheaper first:** Read 20 real user queries end to end. If they are vague, fix the input surface with examples or a template before touching the retriever.
- **needs first:** rag-failure-taxonomy
- **figures you may cite:**
  - A clarifying turn adds one round trip per ambiguous query, and query rewriting adds a model call before retrieval on 100% of requests

### `ragas-noise-sensitivity` — Noise sensitivity (Ragas)
- **is:** A Ragas metric: the fraction of claims in an answer that are wrong, judged against a reference and the retrieved context.
- **when:** You need a number for FP4: good chunks were retrieved and the answer still carries claims the reference does not support.
- **costs:** A judge model call per claim per sample, and the range is 0 to 1 with lower being better, which inverts every alert threshold you already wrote.
- **cheaper first:** Label 30 answers by hand as supported or unsupported per claim. If the human labels and the metric disagree, the judge prompt is what needs work, not the pipeline.
- **needs first:** rag-not-extracted
- **figures you may cite:**
  - Range 0 to 1, lower is better
  - The documented example scores 0.3333333333333333, one incorrect claim out of three
  - the same sample scores 0.0 under mode='irrelevant'
  - A judge model call per claim per sample, and the range is 0 to 1 with lower being better, which inverts every alert threshold you already wrote

### `agent-run-as-span-tree` — An agent run as a span tree
- **is:** One agent run recorded as nested spans, where a workflow span holds agent invocations and each holds its plan, model calls and tool executions.
- **when:** An agent loops or stalls and the total wall time is not enough: you need to see which tool call repeated.
- **costs:** One span per step means a 30-step run emits 60 or more spans, and the message-content attributes are Opt-In precisely because they carry user data.
- **cheaper first:** Emit one structured log line per step with a shared run id and a step index. If you only need step counts and durations, that answers it with no collector to run.
- **figures you may cite:**
  - tool_calls are Histograms in units {inference_call} and {tool_call}, both bucketed 1, 2, 4, 8, 16, 32, 64, 128
  - duration buckets span 1 s to 7200 s
  - One span per step means a 30-step run emits 60 or more spans, and the message-content attributes are Opt-In precisely because they carry user data

### `otel-genai-semconv` — OpenTelemetry GenAI semantic conventions
- **is:** The OpenTelemetry spec that fixes the names of GenAI metrics, spans and attributes, so telemetry from different SDKs aggregates in one query.
- **when:** Two or more services call models through different SDKs and you want one token and latency panel across all of them.
- **costs:** The conventions carry Development status, so attribute names still change between releases, and one rename invalidates every saved query, alert and 30-day comparison built on it.
- **cheaper first:** Emit gen_ai.client.token.usage and gen_ai.client.operation.duration and nothing else. Two metrics answer the spend and latency questions; add span attributes when a specific incident needs them.
- **needs first:** agent-run-as-span-tree
- **figures you may cite:**
  - usage buckets: 1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864
  - duration buckets: 0.01 s doubling to 81
  - time_to_first_token buckets run 0.001 s to 10
  - The conventions carry Development status, so attribute names still change between releases, and one rename invalidates every saved query, alert and 30-day comparison built on it
