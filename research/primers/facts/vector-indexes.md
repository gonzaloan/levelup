# Cluster: vector-indexes — "Vector indexes"

Current tagline (EN): Every index trades recall for latency or memory. Knowing which one it trades is the whole skill.
Current tagline (ES): Todo índice cambia recall por latencia o memoria. Saber cuál de los dos cede es la habilidad completa.

## The 4 entry slugs — your families MUST partition exactly these

- `exact-flat-vector-search`
- `hnsw-index`
- `ivf-pq-index`
- `disk-based-ann`

## Each entry, so your primer sits ABOVE them and never restates one

### `exact-flat-vector-search` — Exact (flat) vector search
- **is:** Comparing the query against every stored vector, returning the true nearest neighbours with 100% recall and no index structure at all.
- **when:** Under roughly 10k vectors, or you expect only 1000-10000 total searches so build time never amortises, or you need a ground truth to measure another index's recall against.
- **costs:** Latency grows linearly with N: every query reads all vectors at full width, d x 4 bytes each, so 1M vectors of 768 dimensions means about 3 GB touched per query.
- **cheaper first:** Before adding any index, narrow the candidate set with a metadata filter and scan only the remainder — Qdrant does exactly this below its full_scan_threshold of 10000 KB (1 KB is about one 256-dimension vector), because walking a graph over few points is slower.
- **figures you may cite:**
  - Milvus FLAT gives 100% recall by construction
  - Storage equals the raw dataset, d x 4 bytes per float32 vector (Faiss)
  - Qdrant prefers a full scan below 10000 KB of matching vectors
  - Faiss advises brute force when total searches will be 1000-10000
  - Latency grows linearly with N: every query reads all vectors at full width, d x 4 bytes each, so 1M vectors of 768 dimensions means about 3 GB touched per query

### `hnsw-index` — HNSW (hierarchical navigable small world)
- **is:** A multi-layer proximity graph for approximate nearest-neighbour search: sparse upper layers route the query coarsely, the dense bottom layer refines it.
- **when:** You need recall above 0.95 at single-digit-millisecond latency, and the graph plus the vectors both fit in the RAM of one instance.
- **costs:** Memory is proportional to M: (Mmax0 + mL x Mmax) x bytes_per_link, roughly 60-450 bytes per object for M between 6 and 48, on top of the vectors themselves. Build is O(N log N), and 200M SIFT vectors took 5.6 hours at M=16, efConstruction=500.
- **cheaper first:** Try IVFFlat: faster builds and less memory, per pgvector's own framing. It wins when your recall target is modest and you can create the index after the table is already loaded, since it needs a k-means training pass over real data.
- **needs first:** exact-flat-vector-search
- **figures you may cite:**
  - Defaults differ per engine: pgvector m=16, ef_construction=64, hnsw
  - ef_search=40. Qdrant m=16, ef_construct=100, full_scan_threshold=10000 KB
  - Milvus M=30 (range 2-2048), efConstruction=360
  - The paper calls M 5-48 reasonable and Mmax0=2M near-optimal
  - hnswlib states about M x 8-10 bytes per stored element and M=48-64 for word embeddings at high recall
  - Faiss puts an HNSW index at (d x 4 + M x 2 x 4) bytes per vector

### `ivf-pq-index` — IVF-PQ (inverted file with product quantization)
- **is:** Two-stage approximate search: cluster vectors into nlist inverted lists, then store each vector as m compressed subspace codes instead of raw floats.
- **when:** Your vectors no longer fit in RAM at float32 and you can afford a rescore pass over the top candidates against full-precision vectors.
- **costs:** Storage falls from D x 32 bits to m x nbits bits: at D=128, m=64, nbits=8 that is 4096 bits down to 512, an 8x cut. Distances become approximate, so recall is bought back with nprobe (default 8) and a rescore, both of which add latency.
- **cheaper first:** Scalar quantization: float32 to uint8 is a 4x memory cut with under 1% error in Qdrant's measurement. It wins whenever 4x is enough, because it needs no codebook training and imposes no requirement that m divide D.
- **needs first:** exact-flat-vector-search
- **figures you may cite:**
  - Milvus IVF_PQ: nlist default 128 (range 1-65536, recommended 32-4096), nbits default 8 giving 256 centroids per subspace, nprobe default 8, m must divide D with D/2 a common choice
  - Worked example: 128 dimensions, 4096 bits to 512 bits, 8x
  - pgvector IVFFlat: lists = rows/1000 up to 1M rows and sqrt(rows) above it, probes default 1, start tuning at sqrt(lists)
  - Qdrant reports up to 64x with product quantization using 256 centroids stored in one byte
  - Build runs k-means to place nlist coarse centroids, then splits every vector into m sub-vectors of D/m dimensions and runs k-means inside each subspace to learn 2^nbits centroids, 256 of them at the default nbits=8
  - At query time Milvus scans only the nprobe closest lists, precomputes one distance table of 2^nbits entries per subspace, and sums m table lookups per candidate

### `disk-based-ann` — Disk-based ANN (DiskANN, ScaNN family)
- **is:** An index whose graph and full-precision vectors live on SSD while only compressed codes stay in RAM, letting one machine hold a billion vectors.
- **when:** Your vector count times d x 4 bytes exceeds the RAM you are willing to rent, and a few milliseconds of SSD latency per query is acceptable to the product.
- **costs:** Query latency now includes SSD round trips, which the design must hold under ten and preferably five per query. Recall is bought with a memory budget knob: Milvus DiskANN defaults PQCodeBudgetGBRatio to 0.125 of raw data size and SearchCacheBudgetGBRatio to 0.10.
- **cheaper first:** Price in-memory HNSW first. DiskANN's own claim is 5-10x more points per node at high recall, so if one instance's RAM already holds your graph plus vectors, the SSD path adds I/O tail latency and an NVMe dependency for nothing.
- **needs first:** hnsw-index, ivf-pq-index
- **figures you may cite:**
  - Best reported figure is 98.68% 1-recall@1 under 5 ms
  - PQ codes are about 32 bytes per point
  - Milvus DiskANN sets MaxDegree 56 and BeamWidthRatio 4
  - ScaNN reports roughly 2x the queries per second of the next-fastest library at equal accuracy on glove-100-angular
  - DiskANN builds a Vamana graph, then writes each node's neighbour list together with its full coordinates into the same 4 KB disk sector, so retrieving a neighbourhood costs no extra read
  - RAM holds only product-quantized codes, about 32 bytes per point, which drive the approximate distances inside a beam search
