# Cluster: chunking — "Chunking"

Current tagline (EN): How you cut a document decides what retrieval can ever find. Pick the cut, then pay for it.
Current tagline (ES): Cómo cortas un documento decide qué podrá encontrar la recuperación. Elige el corte y luego págalo.

## The 12 entry slugs — your families MUST partition exactly these

- `fixed-size-chunking`
- `recursive-character-splitting`
- `sentence-based-chunking`
- `sliding-window-overlap`
- `semantic-chunking-embedding-breakpoints`
- `structural-markdown-aware-chunking`
- `layout-aware-chunking-pdf-tables`
- `propositional-atomic-chunking`
- `contextual-retrieval`
- `late-chunking`
- `parent-document-retrieval`
- `chunk-size-selection-experiment`

## Each entry, so your primer sits ABOVE them and never restates one

### `fixed-size-chunking` — Fixed-size chunking
- **is:** Cutting a document into pieces of one preset length, counted in characters or tokens, without regard for where sentences or sections actually end.
- **when:** The source carries no usable structure (an OCR'd scan, a call transcript) and you need a hard ceiling that stays under the embedding model's input limit, such as the 8,191 tokens of text-embedding-3-small.
- **costs:** Characters are not tokens. At roughly 4 characters per token, a 2,000-character ceiling is about 500 tokens, so a chunk sized in characters can overshoot a token budget by hundreds of tokens without warning.
- **cheaper first:** Index each document whole and skip splitting entirely. That wins when every document already fits the model's input limit and covers one topic; Azure's own guidance notes a wiki page spanning many sub-topics retrieves better cut finer even when the whole page fits.
- **figures you may cite:**
  - Azure AI Search Text Split skill with unit=characters: maximumPageLength default 5000, minimum 300, maximum 50000
  - Recommended starting parameters: pages mode, 2000 characters, 500 overlap
  - Chunk counts on the 200-page NASA Earth at Night PDF: 1000/0 gives 172 chunks, 1000/200 gives 216, 2000/0 gives 85, 2000/500 gives 113, 5000/0 gives 34, sentences mode gives 13,361
  - Suggested start for vectors: 512 tokens (about 2,000 characters) with 25% overlap, equal to 128 tokens
  - text-embedding-3-small input limit: 8,191 tokens, around 6,000 words
  - Azure AI Search's Text Split skill in `pages` mode reads maximumPageLength: default 5000 characters, minimum 300, maximum 50000

### `recursive-character-splitting` — Recursive character splitting
- **is:** Splitting on an ordered list of separators, trying the coarsest one first and falling back to finer ones only for the pieces that still exceed the size limit.
- **when:** The text has visible layout you want honored: blank lines between paragraphs, or code where function bodies are separated by blank lines, and you would rather cut there than at an arbitrary offset.
- **costs:** The last separator is the empty string, so a 4,000-character run with no blank line or space gets cut mid-word anyway; and because length_function defaults to len, the 4000 default counts characters, roughly 1,000 tokens, not 4,000 tokens.
- **cheaper first:** CharacterTextSplitter with its single default separator "\n\n". It wins when the document is well-formed prose whose longest paragraph is already under the limit, which you can check by measuring that paragraph before choosing anything.
- **needs first:** fixed-size-chunking
- **figures you may cite:**
  - Inherited from TextSplitter: chunk_size=4000, chunk_overlap=200, length_function=len, keep_separator=False, add_start_index=False, strip_whitespace=True
  - LangChain's own retrieval tutorial runs chunk_size=1000, chunk_overlap=200, turning 107 PDF pages into 516 chunks
  - Size comes from the base TextSplitter: chunk_size 4000 and chunk_overlap 200, measured with length_function=len, so the unit is characters until you pass a token counter
  - The last separator is the empty string, so a 4,000-character run with no blank line or space gets cut mid-word anyway
  - and because length_function defaults to len, the 4000 default counts characters, roughly 1,000 tokens, not 4,000 tokens

### `sentence-based-chunking` — Sentence-based chunking
- **is:** Building chunks out of whole sentences, packing them up to a token budget so that no chunk ever ends in the middle of a sentence.
- **when:** Your answers are sentence-shaped, such as policy clauses or product facts, and a chunk cut mid-sentence would be unusable as a quote you show back to the user.
- **costs:** Chunk size stops being something you control, and pure sentence mode explodes the index: Azure AI Search's sentences mode produced 13,361 chunks from the same 200-page e-book that gave 172 at 1,000 characters, 78x more vectors to store and rank.
- **cheaper first:** Recursive character splitting with a token-based length_function. It wins when mid-sentence cuts are rare in your corpus, which you can measure by sampling 50 chunk boundaries and counting how many land inside a sentence.
- **needs first:** fixed-size-chunking
- **figures you may cite:**
  - LlamaIndex SentenceSplitter defaults: chunk_size = DEFAULT_CHUNK_SIZE = 1024 tokens, chunk_overlap = SENTENCE_CHUNK_OVERLAP = 200 tokens, separator = a single space, paragraph_separator = three newlines
  - TokenTextSplitter instead uses DEFAULT_CHUNK_OVERLAP = 20 tokens and raises ValueError when chunk_overlap is strictly greater than chunk_size
  - SentenceWindowNodeParser defaults to window_size = 3 sentences on each side, DEFAULT_CONTEXT_WINDOW = 3900 tokens
  - Whole sentences are merged until the chunk reaches chunk_size, 1024 tokens by default, and the next chunk re-opens with SENTENCE_CHUNK_OVERLAP, 200 tokens, of the tail

### `sliding-window-overlap` — Sliding-window overlap
- **is:** Starting each chunk with the last N tokens of the previous one, so a fact straddling a boundary still appears whole inside at least one chunk.
- **when:** Answers span boundaries often in your corpus: an entity is named in one paragraph and its value given in the next, and you can point at retrieved chunks holding the number without the name.
- **costs:** 25% overlap duplicates a quarter of the corpus. Chroma measured precision_omega, the token efficiency ceiling at perfect recall, falling from 17.7% at 400 tokens with no overlap to 6.7% at 800 tokens with 400 overlap: 2.6x more wasted tokens per answer.
- **cheaper first:** Zero overlap plus one extra retrieved chunk. It wins when your reader can take 6 chunks instead of 5: Chroma's recursive splitter scored 89.5% recall at 400 tokens with no overlap, above the 88.1% it scored at 400 tokens with 200 overlap.
- **needs first:** fixed-size-chunking
- **figures you may cite:**
  - Chroma chunking evaluation, text-embedding-3-large, n=5 retrieved chunks, recursive splitter: 400 tokens with 0 overlap gives 89
  - 7% precision_omega
  - 400 with 200 overlap gives 88
  - 800 with 400 overlap gives 85
  - TokenTextSplitter at 800/400 gives 87
  - 9% recall and 4

### `semantic-chunking-embedding-breakpoints` — Semantic chunking (embedding-distance breakpoints)
- **is:** Splitting text where consecutive sentence embeddings diverge most, so each chunk covers one topic rather than a fixed character count.
- **when:** Your corpus has no headings or markup, topics shift mid-paragraph (call transcripts, scraped prose), and you can measure recall against a fixed-size baseline on your own queries.
- **costs:** One extra embedding call per sentence at index time, before any chunk exists. Qu et al. report the gains are inconsistent: fixed-size won F1@5 on 4 of 10 document-retrieval sets, 90.59 against 87.37 on HotpotQA.
- **cheaper first:** Fixed-size recursive splitting with overlap. It wins unless your own evaluation shows a recall gap, and in the same study swapping the embedder (stella over bge, +7.44 percent average on evidence retrieval) moved results more than any splitter choice.
- **figures you may cite:**
  - LlamaIndex documented values: buffer_size=1, breakpoint_percentile_threshold=95
  - 2024, F1@5 with the stella embedder, fixed-size against breakpoint-semantic: 90
  - 37 (HotpotQA), 93
  - 23 (MSMARCO), 43
  - 93 (stitched NQ*)
  - Only the largest 5 percent of jumps become boundaries, so chunk length is an output, never an input

### `structural-markdown-aware-chunking` — Structural (markdown-aware) chunking
- **is:** Cutting a document at its own markup boundaries (headings, list items, sections) and carrying the enclosing heading chain into each chunk's metadata.
- **when:** Your source is Markdown, HTML, or already-parsed elements with real headings, and correct answers are scoped to one section: API reference, runbooks, policy documents.
- **costs:** Two passes and one splitter per input format. Unstructured warns that partitioning mislabels short paragraphs and list items as Title, so you need combine_text_under_n_chars, whose default equals max_characters at 500, to merge the undersized chunks that result.
- **cheaper first:** A single RecursiveCharacterTextSplitter with the Markdown separator list. It wins when heading nesting is one level deep or absent, because heading metadata only pays for itself if you filter or rerank on it downstream.
- **figures you may cite:**
  - LangChain documented example: chunk_size=250, chunk_overlap=30, headers_to_split_on = [('#','Header 1'), ('##','Header 2'), ('###','Header 3')]
  - Unstructured open-source defaults: max_characters=500, new_after_n_chars equal to max_characters, overlap=0, overlap_all=False, multipage_sections=True
  - Unstructured warns that partitioning mislabels short paragraphs and list items as Title, so you need combine_text_under_n_chars, whose default equals max_characters at 500, to merge the undersized chunks that result

### `layout-aware-chunking-pdf-tables` — Layout-aware chunking for PDFs and tables
- **is:** Recovering a page's visual structure with vision models first (paragraphs, headings, tables, captions), then chunking those recovered elements instead of the raw text stream.
- **when:** Your corpus is PDFs where the answer lives in a table or a two-column page, and plain text extraction interleaves the columns or flattens a table row into one unlabeled line.
- **costs:** 1.27 pages/s and 6.20 GB peak RSS on an Apple M3 Max at 4 threads with the native backend, falling to 0.60 pages/s on an Intel Xeon E5-2690. TableFormer adds 2 to 6 s per table and EasyOCR upwards of 30 s per page.
- **cheaper first:** Plain text extraction with pdfminer, which is Unstructured's strategy='fast'. It wins whenever the PDF has extractable single-column text and no tables, since hi_res is needed mainly because it is the only strategy that extracts PDF tables.
- **figures you may cite:**
  - Docling v1 report, 225-page test set, OCR off: Apple M3 Max 16-core at 4 threads, native backend 177 s total and 1
  - 27 pages/s at 6
  - 20 GB peak RSS, pypdfium 103 s and 2
  - 18 pages/s at 2
  - Intel Xeon E5-2690 at 4 threads, 375 s native and 239 s pypdfium
  - Layout inference at 72 dpi, sub-second per page

### `propositional-atomic-chunking` — Propositional (atomic) chunking
- **is:** Rewriting a passage into standalone one-fact sentences with pronouns already resolved, then indexing those propositions instead of the passage.
- **when:** Queries ask for a single fact, the reader has a hard context budget such as 500 tokens, and your retriever is unsupervised or running out of its training domain, where the granularity gain is largest.
- **costs:** About 500 P100 GPU-hours to decompose 41M passages, plus a 768 GB dense index across 8 shards holding 6.3x more vectors than passage-level indexing. Every corpus update repays the decomposition cost.
- **cheaper first:** Sentence-level indexing, which captures much of the gain with 2.3x fewer units than propositions. Propositions only justify the build cost if your retriever is weak or out of domain: with supervised DPR the Recall@5 edge shrinks to +2.6 points.
- **figures you may cite:**
  - FactoidWiki: 41,393,528 passages at 58
  - 5 words, 114,219,127 sentences at 21
  - 0 words, 256,885,003 propositions at 11
  - 3 propositions per passage
  - Recall@5 averaged over 5 QA sets, passage to proposition: SimCSE 34
  - 0), Contriever 43

### `contextual-retrieval` — Contextual retrieval
- **is:** Prepending a short LLM-written summary of how each chunk fits its source document to that chunk before you embed and index it.
- **when:** Your chunks stop naming their own subject: the answer chunk says "the company" or "that quarter" and never repeats the entity, so a keyword or vector query for the entity never reaches it.
- **costs:** $1.02 per million document tokens as a one-time indexing pass with prompt caching, plus 50 to 100 extra tokens stored and embedded on every chunk forever.
- **cheaper first:** Raise top-K from 5 to 20 and add BM25 next to the vector search, which needs no rewriting pass over the corpus. That wins if your misses are ranking misses rather than chunks that no longer state what they are about.
- **figures you may cite:**
  - Baseline top-20 retrieval failure (1 minus recall@20) was 5
  - Contextual embeddings took it to 3.7%, a 35% reduction
  - Adding contextual BM25 reached 2.9%, a 49% reduction
  - Adding a Cohere reranker over the top 150 down to the top 20 reached 1
  - 9%, a 67% reduction
  - Indexing cost $1.02 per million document tokens

### `late-chunking` — Late chunking
- **is:** Embedding the whole document first, then mean-pooling the token vectors inside each chunk boundary, so every chunk vector carries context from the full text.
- **when:** Documents are long and full of back references, and your encoder's context window covers a whole document. Check the window first: jina-embeddings-v2 gives 8192 tokens, roughly ten pages.
- **costs:** One forward pass over the full document at index time, bounded by the encoder window of 8192 tokens, and you need control of the pooling step rather than a plain embed endpoint.
- **cheaper first:** Plain chunking with a smaller size and some overlap. It wins when documents are short: on Quora, whose documents average 62.2 characters, late chunking and naive chunking both scored 87.19% nDCG@10.
- **figures you may cite:**
  - nDCG@10 with jina-embeddings-v2-small-en, naive versus late: SciFact 64
  - 10%, NFCorpus 23
  - 98%, TRECCOVID 63
  - 70%, FiQA2018 33
  - 84%, Quora tied at 87
  - Cosine similarity of the query "Berlin" against a sentence reading "3.85 million inhabitants" rose from 0

### `parent-document-retrieval` — Parent-document retrieval (small-to-big)
- **is:** Embedding small child chunks for search but returning their larger parent chunk to the model, so match precision and reading context are decided separately.
- **when:** Your top hits are the right sentences but too small to answer from, and the model is missing the table row, list, or paragraph that surrounded the match.
- **costs:** A second store to keep in sync: LlamaIndex's example held 1029 nodes in the docstore to serve 795 embedded leaves, and returned prompt text grows to parent size, up to 2048 tokens per merged node.
- **cheaper first:** Just embed bigger chunks with overlap and skip the hierarchy. That wins unless token precision collapses: in Chroma's sweep, going from 200 tokens with no overlap to 800 with 400 overlap dropped precision from 7.0% to 1.5% at five retrieved chunks.
- **figures you may cite:**
  - HierarchicalNodeParser defaults to chunk sizes 2048, 512 and 128 tokens
  - Its Llama 2 example produced 1029 nodes with 795 leaves embedded
  - With similarity_top_k of 6, four leaves merged into one parent and 3 nodes were returned
  - Correctness scored 4.267 with auto-merging against 4
  - 208 without, relevancy 0
  - 9167 and faithfulness 0

### `chunk-size-selection-experiment` — Chunk size as a measured decision
- **is:** Choosing chunk size and overlap by running a retrieval experiment on your own corpus and metrics instead of copying a default like 800 tokens with 400 overlap.
- **when:** Before you index the real corpus, and again whenever you swap embedding model. The same sweep changes answer: with all-MiniLM-L6-v2, dropping overlap took recall from 82.4% to 77.1%, a penalty that did not appear with text-embedding-3-large.
- **costs:** About $0.01 per generated question with GPT-4, near $10 per thousand, at 3 to 16 seconds each, plus one full re-index of the corpus for every configuration you test.
- **cheaper first:** Start at 200 tokens with zero overlap using a recursive splitter, the setting that stayed high on every metric in Chroma's sweep. Run the real experiment only once you can show that setting misses questions users actually ask.
- **figures you may cite:**
  - Chroma, text-embedding-3-large, five chunks retrieved, 472 queries over 328,208 tokens
  - Recursive 800 with 400 overlap: 85
  - 5% precision, 6
  - 7% precision omega
  - Recursive 400 with no overlap: 89
  - 6% precision, 17
