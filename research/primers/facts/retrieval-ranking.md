# Cluster: retrieval-ranking — "Retrieval and ranking"

Current tagline (EN): Most RAG failures are retrieval failures. These are the moves that fix them, and what each costs.
Current tagline (ES): La mayoría de las fallas de RAG son fallas de recuperación. Estas son las jugadas que las arreglan y qué cuesta cada una.

## The 12 entry slugs — your families MUST partition exactly these

- `bm25-lexical-retrieval`
- `hybrid-search`
- `reciprocal-rank-fusion`
- `cross-encoder-reranking`
- `query-rewriting`
- `hyde-hypothetical-document-embeddings`
- `multi-query-fan-out`
- `query-decomposition-multi-hop`
- `prefilter-vs-postfilter-metadata-filtering`
- `mmr-diversity-reranking`
- `graph-retrieval-graphrag`
- `hierarchical-summary-index-retrieval`

## Each entry, so your primer sits ABOVE them and never restates one

### `bm25-lexical-retrieval` — BM25 (lexical retrieval)
- **is:** Ranking function that scores a document by how often the query's exact terms appear in it, damped by how rare each term is and by document length.
- **when:** The query carries tokens that must match literally: error codes, SKUs, function names, ticket ids, legal citations, a rare surname.
- **costs:** 20 ms per query and a 0.4 GB index for 1M DBPedia documents, against 3 GB for 768-dimension dense vectors. You pay for it in recall whenever the user paraphrases.
- **cheaper first:** Nothing over text is cheaper than BM25, so the option to rule out is adding embeddings at all. Measure recall@20 on 50 real logged queries first; embeddings only win if users describe instead of quoting.
- **figures you may cite:**
  - BEIR, 18 datasets, nDCG@10: in-domain MS MARCO BM25 0
  - 228 against TAS-B 0
  - 408, yet averaged over BEIR, DPR sits 47
  - 7% below BM25, DeepCT 27
  - 9% below, SPARTA 20
  - 3% below, ANCE 7

### `hybrid-search` — Hybrid search
- **is:** Running a lexical query and a vector query over the same corpus for one user request, then merging the two ranked lists into a single result set.
- **when:** Your miss log has two distinct shapes: queries that fail because the user paraphrased, and queries that fail on a literal identifier. One index cannot fix both.
- **costs:** Two indexes to build, keep in sync and query on every request, plus a one-time $1.02 per million document tokens if you generate per-chunk context first.
- **cheaper first:** Ship one index and label every miss by cause. The second index earns its place only if both buckets are large: the measured move is 5.7% to 2.9% failure at recall@20, not from broken to solved.
- **needs first:** bm25-lexical-retrieval
- **figures you may cite:**
  - Failure rate at recall@20 over 20 retrieved chunks: 5
  - 7% baseline, 3
  - 7% with contextual embeddings alone (35% reduction), 2
  - 9% adding contextual BM25 (49%), 1
  - 9% adding a reranker (67%)
  - Chunk-context generation cost $1.02 per million document tokens

### `reciprocal-rank-fusion` — Reciprocal Rank Fusion (RRF)
- **is:** Merging several ranked lists into one by summing 1/(k + rank) for each document across the lists. Positions decide the outcome, original scores are discarded.
- **when:** You hold two or more ranked lists whose scores live on different scales, and you have no labelled pairs to train a weighted combiner.
- **costs:** Ranks throw away magnitude: a document that wins its list by a landslide and one that barely leads both contribute exactly 1/61. Weaviate reports about 6% better recall on FiQA from normalizing scores instead.
- **cheaper first:** If one retriever already wins on your eval set, ship it alone and skip fusion entirely. RRF pays off only when each list surfaces relevant documents the other one misses.
- **needs first:** hybrid-search
- **figures you may cite:**
  - Pilot over TREC topics 351-400, MAP by k: 0
  - 2072 at k=0, 0
  - 2145 at k=60, 0
  - 2098 at k=500, against best single system 0
  - 2016, Condorcet 0
  - 2074, CombMNZ 0

### `cross-encoder-reranking` — Cross-encoder reranking
- **is:** Scoring each query-document pair with a model that reads both texts at once, then reordering a short candidate list by that score.
- **when:** Recall@100 on your eval set is high but precision@5 is poor, meaning the right passage is retrieved and then sits below the cutoff you send to the model.
- **costs:** One model pass per candidate at query time. BEIR measures BM25 plus a MiniLM cross-encoder over the top 100 at 450 ms per query on a V100 and 6100 ms on 8 CPU cores, against 20 ms for BM25 alone.
- **cheaper first:** Send less context instead. If the generator already answers correctly from the top 3 of a fused list, a reranker adds a network hop for nothing, so check precision@5 before you add the second model.
- **needs first:** bm25-lexical-retrieval
- **figures you may cite:**
  - Cross-encoding every pair of 10,000 sentences is roughly 50 million pairs and about 65 hours, against about 5 seconds to embed the same 10,000 once with a bi-encoder
  - The documented pattern reranks the top 100 per query
  - The Sentence Transformers pattern is to retrieve the top 100 with the bi-encoder, then score those 100 pairs with the cross-encoder
  - BEIR measures BM25 plus a MiniLM cross-encoder over the top 100 at 450 ms per query on a V100 and 6100 ms on 8 CPU cores, against 20 ms for BM25 alone

### `query-rewriting` — Query rewriting
- **is:** Replacing the user's raw question with one or more reformulated search strings before retrieval, fixing typos and adding synonyms the corpus actually uses.
- **when:** Your query log shows short, misspelled, or vocabulary-mismatched queries, and the metric that fails is recall at 50, not the ranking of what you already found.
- **costs:** One generative-model call added to the critical path of every search, N extra query executions for N rewrites (N from 1 to 10), and preview status with no SLA.
- **cheaper first:** A hand-maintained synonym map plus a spell corrector in the index costs no per-query model call. It wins if your log shows a short tail of repeated misspellings rather than open-ended phrasing.
- **figures you may cite:**
  - count-1 through count-10 rewrites per query, 5 in the documented example
  - The semantic reranker score spans 0.00 to 4
  - 00 and is reported separately as @search
  - You set the count with queryRewrites: "generative|count-5", any value from 1 to 10
  - One generative-model call added to the critical path of every search, N extra query executions for N rewrites (N from 1 to 10), and preview status with no SLA

### `hyde-hypothetical-document-embeddings` — HyDE (hypothetical document embeddings)
- **is:** Asking a language model to invent an answer document for the query, then embedding that fake document instead of the query and searching for its nearest real neighbours.
- **when:** You have no relevance labels and no query log, and an off-the-shelf or unsupervised embedding model is losing to BM25 on your own eval set.
- **costs:** An LLM generation on the critical path before the ANN lookup, multiplied by the number of sampled passages (8 in the authors' code), so latency is dominated by generation rather than by search.
- **cheaper first:** BM25, or BM25 hybridised with vectors, needs no generation at all and beat unsupervised Contriever on DL19 (50.6 against 44.5 nDCG@10). BM25 wins whenever your queries already share vocabulary with the corpus.
- **figures you may cite:**
  - TREC DL19 nDCG@10: Contriever 44
  - 3, fine-tuned ContrieverFT 62
  - 1. DL19 recall@1k goes from 74
  - 0. Generation temperature 0
  - An LLM generation on the critical path before the ANN lookup, multiplied by the number of sampled passages (8 in the authors' code), so latency is dominated by generation rather than by search

### `multi-query-fan-out` — Multi-query fan-out
- **is:** Generating several paraphrases of one question, running a separate retrieval for each, and returning the deduplicated union of all the hits.
- **when:** One phrasing of a question reliably misses documents you know are indexed, and your eval shows recall swinging widely across paraphrases of the same intent.
- **costs:** 3 retriever round-trips and 1 LLM call per user question, and the dedup step is quadratic because _unique_documents compares each Document against every earlier one by equality rather than by hash.
- **cheaper first:** A single hybrid query, BM25 plus vectors, fused with reciprocal rank fusion buys diversity from two retrievers instead of three paraphrases and adds no LLM call. It wins unless your misses come from vocabulary rather than from ranking.
- **figures you may cite:**
  - The default prompt asks for 3 question variations and include_original defaults to False
  - LangChain's MultiQueryRetriever prompts an LLM to "generate 3 different versions of the given user question", splits the reply on newlines with LineListOutputParser, and calls the underlying retriever once per version
  - 3 retriever round-trips and 1 LLM call per user question, and the dedup step is quadratic because _unique_documents compares each Document against every earlier one by equality rather than by hash

### `query-decomposition-multi-hop` — Query decomposition for multi-hop questions
- **is:** Splitting a question whose answer needs two or more chained facts into explicit sub-questions, retrieving and answering each, then composing the final answer.
- **when:** The items failing your eval are questions whose answer depends on a fact you can only look up after resolving an earlier one, and single-shot retrieval returns documents for one hop only.
- **costs:** One retrieval and one LLM turn per hop, so a 2-hop question costs at least 2 sequential round-trips that cannot be batched; self-ask averaged 569 generated tokens per 2WikiMultiHopQA answer.
- **cheaper first:** Plain chain of thought, with no decomposition and no search, reached 46.4 on Bamboogle against self-ask's 57.6. It wins when your questions are single-hop, where the extra hop only buys latency.
- **figures you may cite:**
  - The compositionality gap stayed near 40% across the GPT-3 family, from Ada 0
  - 35B to Davinci 175B
  - On Bamboogle (125 hand-written 2-hop questions) Davinci-002 scored: direct 17
  - 6, chain of thought 46
  - 4, self-ask 57
  - 6, self-ask plus search 60

### `prefilter-vs-postfilter-metadata-filtering` — Metadata filtering: pre-filter vs post-filter
- **is:** Applying a metadata predicate to a vector search either during graph traversal (pre-filter) or to the already-returned top-k (post-filter).
- **when:** Your query carries a predicate that keeps under about 2% of the corpus, or k is small: pre-filtering is then the only mode that guarantees k rows.
- **costs:** Azure measured pre-filtering about 7x slower in QPS than post-filtering at 1M vectors of 1536 dimensions when the filter kept under 2% of the corpus, and about 30% slower when it kept over 30%.
- **cheaper first:** Post-filter with an inflated k, which is Azure's own tip for cutting false negatives, then measure how often fewer than k rows survive. If that stays near zero on your real query mix, the predicate is not selective enough to pay for pre-filtering's extra traversal.
- **figures you may cite:**
  - Azure AI Search benchmark indexes: 100k docs / 2
  - 5 GB / 1536 dims, 1M docs / 25 GB / 1536 dims, 1B docs / 1
  - 9 TB / 96 dims
  - Under 0.1% selectivity at 100k docs, pre-filter about 50% slower
  - Under 2% at 1M docs, about 7x slower
  - preFilter is the default for indexes created after roughly 15 October 2023

### `mmr-diversity-reranking` — MMR (maximal marginal relevance) reranking
- **is:** Reranking a candidate set by a score that adds similarity to the query and subtracts similarity to already-selected results, so the final list stops repeating itself.
- **when:** Your top-k inspection shows the same passage arriving as three near-duplicate chunks, so the model reads one fact k times instead of k facts.
- **costs:** One extra similarity pass over the candidates, roughly k x fetch_k comparisons on embeddings you already hold, plus the latency of retrieving 20 candidates to return 4.
- **cheaper first:** Deduplicate by document id or by an exact hash of the chunk text before any reranking. If the redundancy comes from repeated ingests rather than genuinely similar passages, dedup removes the symptom at zero embedding cost.
- **figures you may cite:**
  - LangChain defaults: k=4, fetch_k=20, lambda_mult=0
  - 5. lambda_mult ranges 0 to 1, with 0 for maximum diversity and 1 for minimum diversity
  - LangChain's max_marginal_relevance_search fetches fetch_k=20 candidates, then greedily picks k=4
  - At each step every remaining candidate scores lambda_mult times its query similarity minus (1 minus lambda_mult) times its highest similarity to anything already picked
  - lambda_mult defaults to 0.5, where 0 is maximum diversity and 1 is minimum diversity, which is plain similarity order
  - One extra similarity pass over the candidates, roughly k x fetch_k comparisons on embeddings you already hold, plus the latency of retrieving 20 candidates to return 4

### `graph-retrieval-graphrag` — Graph-based retrieval (GraphRAG)
- **is:** Retrieval over an LLM-built entity graph: extract entities and relations from every chunk, cluster them into communities, summarize each community, then answer from those summaries.
- **when:** Users ask corpus-wide questions such as what themes run across these 3,000 documents, which no single chunk answers, and the corpus changes rarely enough to amortize one index build.
- **costs:** Indexing the paper's 1-million-token podcast corpus took 281 minutes of LLM calls against a gpt-4-turbo endpoint rated 2M TPM. Microsoft reports LazyGraphRAG indexing at 0.1% of full GraphRAG's cost and equal to vector RAG's, which puts a full graph index near 1000x a vector index.
- **cheaper first:** Vector retrieval with a larger k and a reranker. The graph pays off only for questions whose facts are spread across many documents. On the paper's own control criterion, directness, plain vector RAG beat every GraphRAG condition.
- **figures you may cite:**
  - GraphRAG paper, podcast corpus: 1,669 chunks of 600 tokens with 100-token overlap, about 1M tokens, 8,564 graph nodes and 20,691 edges, 281 minutes to index
  - Win rates over vector RAG of 72-83% on the paper's coverage criterion and 62-82% on diversity
  - Root-level community summaries (C0) needed 26,657 context tokens per query against 1,014,611 for full-text summarization, that is 2
  - Indexing the paper's 1-million-token podcast corpus took 281 minutes of LLM calls against a gpt-4-turbo endpoint rated 2M TPM
  - Microsoft reports LazyGraphRAG indexing at 0.1% of full GraphRAG's cost and equal to vector RAG's, which puts a full graph index near 1000x a vector index

### `hierarchical-summary-index-retrieval` — Hierarchical summary index retrieval (RAPTOR)
- **is:** An index whose nodes are recursive summaries of clustered chunks, so a query can retrieve a whole-section abstraction instead of only the leaf passages.
- **when:** Answers need information from more than one chunk of the same document, and your top-k of leaf chunks each hold a fragment that on its own reads as irrelevant.
- **costs:** One LLM summarization call per cluster per layer, with about 6.7 children per parent, 131-token summaries over 85.6-token children, a 0.28 compression ratio, and build time plus token spend that both scale linearly with document length.
- **cheaper first:** Larger chunks with overlap, or a parent-document retriever that returns the enclosing section when a leaf hits. If the answer never spans more than two adjacent chunks, an overlap window gets the same context for zero LLM calls.
- **figures you may cite:**
  - RAPTOR with GPT-4 scored 82
  - 6% on the QuALITY test set and 76
  - 2% on QuALITY-HARD, against a prior best of 62
  - Leaves about 100 tokens, average summary 131 tokens, average child 85
  - 7 children per parent, 0
  - 28 compression ratio
