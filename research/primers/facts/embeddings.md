# Cluster: embeddings — "Embeddings"

Current tagline (EN): What a vector encodes, and what you give up each time you make one cheaper.
Current tagline (ES): Qué codifica un vector y qué cedes cada vez que lo haces más barato.

## The 8 entry slugs — your families MUST partition exactly these

- `embedding-vector-geometry`
- `dense-retrieval`
- `learned-sparse-retrieval`
- `late-interaction-multi-vector`
- `matryoshka-embeddings-truncation`
- `scalar-quantization-int8`
- `binary-quantization`
- `recall-latency-memory-triangle`

## Each entry, so your primer sits ABOVE them and never restates one

### `embedding-vector-geometry` — Embedding (vector representation)
- **is:** A list of floating-point numbers attached to a piece of data, positioned so that the distance between two lists tracks how related the two pieces are.
- **when:** Your matching requirement has to survive paraphrase: the user's words and the document's words differ, and an exact-string or keyword index returns nothing usable.
- **costs:** 4 bytes per dimension at float32, so one 1536-dimension vector is about 6 KB and 10 million of them is roughly 60 GB of resident memory before any quantization.
- **cheaper first:** A keyword index such as BM25 over the same text needs no model call and no vector store. It wins whenever query and document share vocabulary: on BEIR's NFCorpus, Vespa measures BM25 at nDCG@10 0.3210 against 0.3077 for a dense model.
- **figures you may cite:**
  - text-embedding-3-small: 1536 dims, 62
  - text-embedding-3-large: 3072 dims, 64
  - 6% MTEB, truncatable to 256 dims and still above ada-002's 61
  - Max input 8192 tokens on both
  - float32 is 4 bytes per value, so 1536 dims is about 6 KB per vector
  - A model projects high-dimensional input into d coordinates, with d commonly 256, 512 or 1024 for text and 3072 for OpenAI's text-embedding-3-large

### `dense-retrieval` — Dense retrieval
- **is:** Search that turns the query and each document into one vector apiece and returns the documents whose vector lies nearest, so a match survives sharing no words.
- **when:** Your query logs contain paraphrases whose terms never appear in the document that answers them, and BM25 leaves that document outside the top 20.
- **costs:** One encoder forward pass per query on the hot path, plus 4 bytes per dimension per document held resident: a 768-dimension float32 index over 8.8M passages is about 25 GiB.
- **cheaper first:** BM25 over the same field, which needs neither an encoder nor an ANN index. It wins whenever queries and documents share vocabulary: on BEIR's NFCorpus, Vespa measures BM25 at nDCG@10 0.3210 against 0.3077 for the dense profile.
- **needs first:** embedding-vector-geometry
- **figures you may cite:**
  - DPR beats Lucene-BM25 by 9 to 19 absolute points of top-20 retrieval accuracy
  - Counterexample on out-of-domain data: NFCorpus nDCG@10 0
  - 3077 dense against 0
  - 3210 BM25, measured by Vespa over 3,633 docs and 323 test queries
  - Reported gains over a Lucene-BM25 baseline are 9 to 19 absolute points of top-20 passage retrieval accuracy across open-domain QA datasets
  - One encoder forward pass per query on the hot path, plus 4 bytes per dimension per document held resident: a 768-dimension float32 index over 8

### `learned-sparse-retrieval` — Learned sparse retrieval (SPLADE)
- **is:** Retrieval where a language model assigns weights to vocabulary entries, so each text becomes a mostly-zero vector over the vocabulary that an inverted index can serve.
- **when:** You already operate an inverted index such as Lucene or Vespa and need paraphrase matching without standing up an ANN vector store next to it.
- **costs:** SPLADE reaches MRR@10 0.322 at 0.73 expected FLOPS per query-document pair against BM25's 0.13, roughly 5.6x the matching work, and each document carries about 32 extra posting-list entries.
- **cheaper first:** Plain BM25, at 0.13 FLOPS and recall@1000 of 0.853 on MS MARCO dev. Learned sparse only earns the extra 0.6 FLOPS if your own recall measurement shows the missing documents are missing for vocabulary reasons rather than ranking ones.
- **needs first:** embedding-vector-geometry
- **figures you may cite:**
  - MS MARCO dev, SPLADE with the FLOPS regularizer: MRR@10 0
  - 322, recall@1000 0
  - BM25: 0.184, 0
  - A heavily regularized variant still reaches MRR@10 0
  - 05 FLOPS with 18 non-zero dimensions per document and 6 per query, under 1
  - 4 GB of index on disk

### `late-interaction-multi-vector` — Late interaction (ColBERT-style multi-vector)
- **is:** Retrieval that keeps one vector per token on both sides, scoring a query and document pair by summing each query token's best match among the document tokens.
- **when:** Recall is your ceiling: the correct passage is absent from the single-vector top 100, so no reranker over that pool can recover it.
- **costs:** One vector per token instead of per document. ColBERT's MS MARCO index is 154 GiB at 128 dimensions and 16-bit, against roughly 25 GiB for a 768-dimension single-vector index over the same 8.8M passages, and end-to-end query latency was 458 ms on one V100 versus 61 ms for re-ranking only.
- **cheaper first:** Dense retrieval of the top 100 plus a cross-encoder rerank of that pool. Late interaction only wins when recall is the limit: ColBERT's end-to-end mode scored 36.0 MRR@10 against 34.8 for the same model re-ranking BM25's top 1000.
- **needs first:** embedding-vector-geometry, dense-retrieval
- **figures you may cite:**
  - MaxSim is the sum over query embeddings of the maximum dot product against document embeddings, with 128 dims per token and 32 query embeddings
  - MS MARCO dev MRR@10: 34
  - 9 re-ranking BM25's top 1000, 36
  - 7B FLOPs per query against 97T for BERT-base, whose re-ranking latency was 10,700 ms
  - Index 154 GiB at 2 bytes per dimension, or 27 GiB at 24 dims for about 1 MRR point
  - ColBERTv2 residual compression stores 36 bytes per vector at 2 bits and reports 39

### `matryoshka-embeddings-truncation` — Matryoshka embeddings and dimension truncation
- **is:** An embedding trained so its first k dimensions already work as a shorter vector, which you can slice off without retraining the model.
- **when:** Your vector store caps dimensions, or your RAM bill scales with them, and the model card states the model was trained with Matryoshka loss.
- **costs:** Slicing text-embedding-3-large from 3072 to 1024 dimensions leaves a third of the stored bytes and a third of the distance arithmetic, while the embedding call costs exactly the same: truncation buys storage and search, never inference.
- **cheaper first:** A smaller native model. all-MiniLM-L6-v2 emits 384 dimensions with no truncation step at all, and it wins whenever your own eval set tolerates its 41.66 NDCG@10 against 54.39 for a 1024-dimension model on MTEB Retrieval.

### `scalar-quantization-int8` — Scalar quantization (int8)
- **is:** Storing each embedding component as one 8-bit integer instead of a 32-bit float, mapped into 256 buckets between a per-dimension minimum and maximum.
- **when:** RAM is the line item you need to cut and you can afford a few points of recall: this is usually the first compression to try, at 4x less vector memory. Qdrant's under-1% figure is quantization error, not recall — Weaviate measures 95-97% recall for the same technique, so budget 3-5%.
- **costs:** 4x less vector memory, plus a one-time training pass per shard and a permanent floor on precision: Weaviate's own table lists 95-97% recall for scalar quantization, so 3-5% recall is the bill. Confirm it on your corpus rather than assume it.
- **cheaper first:** Store fewer vectors. Deduplicating near-identical chunks or dropping documents that no query has ever retrieved cuts the same 4x with zero precision loss, and wins when a real share of the index is dead weight.
- **figures you may cite:**
  - Qdrant: float32 to uint8 reduces memory by a factor of 4, with quantization error usually less than 1%
  - Weaviate lists SQ as 75% less memory, 95-97% recall, and 3-4x faster search than uncompressed vectors
  - The engine learns a range per dimension from a training pass over stored vectors (Weaviate defaults to 100,000 objects per shard), then maps every float into 256 buckets
  - Distance is computed directly on the integers with 8-bit SIMD, so the vector gets 4x smaller and comparisons get faster at the same time
  - Qdrant exposes a quantile setting, typically 0.99, so the most extreme 1% of values do not stretch the bucket range for everything else
  - 4x less vector memory, plus a one-time training pass per shard and a permanent floor on precision: Weaviate's own table lists 95-97% recall for scalar quantization, so 3-5% recall is the bill

### `binary-quantization` — Binary quantization
- **is:** One bit per embedding dimension, the sign of each value, so distance becomes a bitwise count instead of float arithmetic.
- **when:** RAM dominates your cost at your corpus size, your model emits 1024 dimensions or more, and you still keep int8 or float32 copies reachable for the rescoring pass.
- **costs:** 32x less memory for the vector payload only — the HNSW graph and per-vector overhead do not shrink, so total memory falls by far less. Retention is model-specific, not a bound: one benchmark kept about 92.5% of NDCG@10 without rescoring and about 96% with it, while e5-base-v2 kept only 74.77% on the same measure.
- **cheaper first:** int8 scalar quantization, which keeps about 99.3% of performance at 4x. Binary only wins once 4x no longer fits the budget, as with 250M 1024-dimension vectors at 238.41GB against 29.80GB.
- **needs first:** scalar-quantization-int8
- **figures you may cite:**
  - For 250M vectors of a 1024-dimension model: 953
  - 67GB and $3623/mo in float32 against 29
  - 80GB and $113
  - 25/mo binary, a 32x cut
  - Exact search on CPU ran 15.05x to 45
  - NDCG@10 retention was 92

### `recall-latency-memory-triangle` — The recall, latency and memory triangle
- **is:** The three-way budget in vector search: recall, query latency, and memory. Compression and disk offload each improve one of them by charging another.
- **when:** Before you accept any compression or offload setting: name which of the three you are willing to lose, then measure the other two on your own corpus and query mix.
- **costs:** Every memory cut is repaid in over-fetch, and the over-fetch factor multiplies the vectors you read per query: a limit of 10 with a rescoreLimit of 200 reads 200 originals for 10 results.
- **cheaper first:** Cut the corpus, not the vectors. Dropping stale documents and deduplicating near-identical chunks improves all three corners at once, and it wins whenever a measurable share of the index is never retrieved by any real query.
- **needs first:** scalar-quantization-int8, binary-quantization
- **figures you may cite:**
  - Qdrant, 1M vectors: about 1
  - 2GB of RAM sustained 774
  - 38 requests per second with no speed degradation
  - With vectors on disk, 1200MB gave 759
  - 94 and 1000MB gave 10
  - With vectors and graph on disk, 135MB gave 0
