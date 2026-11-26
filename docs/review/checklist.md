# Revisión humana del contenido

Para un revisor con experiencia Staff / AI Architect. Por concepto: lee la página (link), revisa
las cifras listadas contra sus fuentes y marca las casillas. Si algo está mal, anota la corrección
debajo del concepto: se corrige en `content/concepts/<tema>/<id>.json` (en ES y EN).

Casillas: **[R]** resumen y puntos clave correctos · **[C]** cifras verificadas · **[F]** fuentes
vigentes · **[E]** español natural.

Generado con `node tools/review-checklist.mjs`. Prioridad: nivel `core` primero.

## Fundamentos de LLMs (15)

### [ ] Tokens y tokenización — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/tokens/) · `content/concepts/foundations/tokens.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Inglés: ~4 caracteres o ~0.75 palabras por token; 100 tokens ≈ 75 palabras.
- Tamaños de vocabulario: GPT-2 50,257; cl100k_base ~100k; o200k_base ~200k; Llama 3 128,256.
- El español suele necesitar ~20–50% más tokens que el inglés para el mismo texto, según el tokenizer.
- Entre idiomas, el mismo texto puede ocupar hasta ~15× más tokens (Petrov et al., 2023).
- Los tokens de salida suelen costar ~4–8× lo que cuestan los de entrada.
- Fuentes: [Sennrich et al. — Neural Machine Translation of Rare Words with Subword Units (BPE)](https://arxiv.org/abs/1508.07909) · [OpenAI — tiktoken](https://github.com/openai/tiktoken) · [OpenAI Help — What are tokens and how to count them?](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them) · [Petrov et al. — Language Model Tokenizers Introduce Unfairness Between Languages](https://arxiv.org/abs/2305.15425)

### [ ] Embeddings — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/embeddings/) · `content/concepts/foundations/embeddings.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Dimensiones comunes: 384 (all-MiniLM-L6-v2), 768 (clase BERT-base), 1,024, 1,536 y 3,072 (OpenAI text-embedding-3-small / -large).
- Almacenamiento: dimensiones × 4 bytes por vector en float32; 1M × 1,536 ≈ 6.1 GB. En int8 es 4× menos, en binario 32×.
- Con vectores unitarios: coseno = producto punto y L2² = 2 − 2·coseno, así que las tres métricas ordenan igual.
- Entrada máxima: text-embedding-3 acepta 8,192 tokens; all-MiniLM-L6-v2 trunca en 256 word pieces.
- Fuentes: [Reimers & Gurevych — Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks](https://arxiv.org/abs/1908.10084) · [OpenAI — Embeddings guide](https://developers.openai.com/api/docs/guides/embeddings) · [Muennighoff et al. — MTEB: Massive Text Embedding Benchmark](https://arxiv.org/abs/2210.07316) · [Sentence Transformers documentation](https://www.sbert.net/)

### [ ] Arquitectura Transformer — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/transformer/) · `content/concepts/foundations/transformer.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Parámetros ≈ 12 × capas × d_model² en un bloque clásico; GPT-3: 12 × 96 × 12,288² ≈ 174B.
- Llama 3 8B: 32 capas, d_model 4,096, 32 heads de query / 8 de KV, ancho del MLP 14,336, vocabulario 128,256.
- Los MLP tienen ~2/3 de cada bloque en el diseño clásico; ~81% en Llama 3 8B (SwiGLU + GQA), ~70% del total.
- Cómputo: ~2 × parámetros FLOPs por token en el forward; ~6 × parámetros por token para entrenar.
- Memoria de pesos = parámetros × bytes por parámetro: 8B en bf16 ≈ 16 GB.
- Fuentes: [Vaswani et al. — Attention Is All You Need](https://arxiv.org/abs/1706.03762) · [Su et al. — RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864) · [Llama Team, Meta — The Llama 3 Herd of Models](https://arxiv.org/abs/2407.21783) · [Jay Alammar — The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/)

### [ ] Self-attention (autoatención) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/attention/) · `content/concepts/foundations/attention.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Matriz de puntajes por head y por capa: n² entradas; 32k tokens ≈ 1,070 millones de entradas.
- Duplicar el contexto ≈ 4× FLOPs de atención, pero solo 2× de KV cache.
- KV cache por token = 2 × capas × heads de KV × head_dim × bytes; Llama 3 8B en bf16 ≈ 128 KiB.
- GQA en Llama 3 8B: 32 heads de query comparten 8 heads de K/V, un cache 4× más chico que con MHA.
- Dimensión típica de un head: 64–128.
- Fuentes: [Vaswani et al. — Attention Is All You Need](https://arxiv.org/abs/1706.03762) · [Ainslie et al. — GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints](https://arxiv.org/abs/2305.13245) · [Shazeer — Fast Transformer Decoding: One Write-Head is All You Need (MQA)](https://arxiv.org/abs/1911.02150) · [Dao et al. — FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://arxiv.org/abs/2205.14135)

### [ ] Ventana de contexto — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/context-window/) · `content/concepts/foundations/context-window.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- 128k tokens ≈ ~96k palabras en inglés ≈ ~300 páginas.
- Ventanas comunes (2025–26): 128k (GPT-4o, Llama 3.1), 200k (Claude ≤4.5), ~1M (Gemini 2.5 Pro, GPT-4.1, Claude 4.6+).
- Los topes de salida son aparte y más chicos: 16,384 tokens en GPT-4o, 65,536 en Gemini 2.5 Pro.
- RULER (2024): de los modelos que anunciaban 32k o más de contexto, solo cerca de la mitad rendía bien a 32k.
- Un chat reenvía el historial en cada turno, así que los tokens de entrada de la sesión crecen ~cuadráticamente con los turnos.
- Fuentes: [Liu et al. — Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) · [Hsieh et al. — RULER: What's the Real Context Size of Your Long-Context Language Models?](https://arxiv.org/abs/2404.06654) · [Anthropic — Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows)

### [ ] Decoding y sampling (temperatura, top-p) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/sampling/) · `content/concepts/foundations/sampling.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- API de OpenAI: temperatura 0–2 (default 1). Anthropic: 0–1 en modelos Claude anteriores; Opus 4.7/4.8, Sonnet 5 y Haiku 5.5 rechazan temperature, top_p y top_k distintos del default con un 400 (release notes, mayo–oct 2026).
- Valores comunes de truncamiento: top_p 0.9–0.95; min_p 0.05–0.1.
- Thinking Machines: 1,000 corridas del mismo prompt con T=0 en Qwen3-235B dieron 80 completions distintas; con kernels invariantes al batch salieron idénticas.
- Vocabulario puntuado en cada paso: ~128k tokens (Llama 3) a ~200k (o200k de OpenAI).
- Fuentes: [Holtzman et al. — The Curious Case of Neural Text Degeneration (nucleus sampling)](https://arxiv.org/abs/1904.09751) · [Nguyen et al. — Turning Up the Heat: Min-p Sampling](https://arxiv.org/abs/2407.01082) · [Thinking Machines — Defeating Nondeterminism in LLM Inference](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/) · [Hugging Face — How to generate text: decoding methods](https://huggingface.co/blog/how-to-generate)

### [ ] KV cache — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/kv-cache/) · `content/concepts/foundations/kv-cache.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Por token: 2 × capas × kv_heads × head_dim × bytes por valor.
- Llama-3.1-8B en fp16: 128 KiB/token → ~16 GiB con 128k tokens, más o menos lo que pesan sus pesos.
- Llama-3.1-70B en fp16: 320 KiB/token → ~40 GiB por secuencia de 128k tokens.
- GQA con 8 KV heads en vez de 32: cache 4× más chico; KV en FP8: otro 2×.
- Paper de vLLM: los servidores previos usaban solo ~20–38% de la memoria de KV para tokens reales; PagedAttention desperdicia menos del 4%.
- Fuentes: [Ainslie et al. — GQA: Training Generalized Multi-Query Transformer Models](https://arxiv.org/abs/2305.13245) · [Kwon et al. — Efficient Memory Management for LLM Serving with PagedAttention (vLLM)](https://arxiv.org/abs/2309.06180) · [Meta — The Llama 3 Herd of Models](https://arxiv.org/abs/2407.21783)

### [ ] Cómo se entrenan los LLMs — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/llm-training-pipeline/) · `content/concepts/foundations/llm-training-pipeline.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Datos de pretraining: Llama 3 ~15T tokens; DeepSeek-V3 14.8T.
- Llama 3.1 405B: ~3.8×10^25 FLOPs en hasta 16k GPUs H100.
- DeepSeek-V3: ~2.79M horas-GPU H800 en total, y solo ~5K de ellas de post-training.
- InstructGPT: los anotadores prefirieron el modelo instruct de 1.3B sobre el GPT-3 base de 175B.
- LIMA: 1,000 ejemplos curados de SFT convirtieron un modelo base de 65B en un asistente sólido.
- Fuentes: [Ouyang et al. — Training language models to follow instructions with human feedback (InstructGPT)](https://arxiv.org/abs/2203.02155) · [Rafailov et al. — Direct Preference Optimization](https://arxiv.org/abs/2305.18290) · [DeepSeek-AI — DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437) · [DeepSeek-AI — DeepSeek-R1: Incentivizing Reasoning Capability via RL](https://arxiv.org/abs/2501.12948)

### [ ] Modelos de razonamiento y test-time compute — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/reasoning-models/) · `content/concepts/foundations/reasoning-models.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- o1 en AIME 2024: 74% pass@1 frente a 12% de GPT-4o; 83% con consenso de 64 muestras.
- DeepSeek-R1-Zero, solo con RL: AIME 2024 pass@1 de 15.6% a 71.0%; R1 llegó a 79.8%.
- Extended thinking manual de Anthropic: el `budget_tokens` mínimo es 1,024 (Claude 4.7+ usa adaptive thinking + `effort` en su lugar).
- OpenAI sugiere reservar ≥25,000 tokens de salida para razonamiento + respuesta al empezar.
- Fuentes: [OpenAI — Learning to Reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/) · [DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2501.12948) · [Snell et al. — Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters](https://arxiv.org/abs/2408.03314) · [Anthropic — Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

### [ ] Alucinaciones: por qué ocurren — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/hallucinations/) · `content/concepts/foundations/hallucinations.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- SimpleQA (OpenAI): gpt-5-thinking-mini se abstiene 52% y se equivoca 26%; o4-mini se abstiene 1% y se equivoca 75%, con precisión similar (22% vs 24%).
- Kalai et al.: si ~20% de hechos como cumpleaños aparecen una sola vez en el entrenamiento, espera ≥~20% de alucinación sobre ellos.
- Mata v. Avianca (2023): 6 citas judiciales inventadas, sanción de $5,000.
- Fuentes: [OpenAI — Why language models hallucinate](https://openai.com/index/why-language-models-hallucinate/) · [Kalai et al. — Why Language Models Hallucinate](https://arxiv.org/abs/2509.04664) · [Huang et al. — A Survey on Hallucination in Large Language Models](https://arxiv.org/abs/2311.05232)

### [ ] Modelos multimodales — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/multimodal/) · `content/concepts/foundations/multimodal.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- LLaVA-1.5: una imagen de 336×336 → 576 tokens visuales (24×24 parches de 14 px).
- Claude (docs de 2026): 1 token por parche de 28×28 px; máximo 1,568 por imagen, 4,784 en Claude 4.7+.
- GPT-4o: 85 tokens en detalle bajo; una imagen de 1024×1024 en detalle alto ≈ 765 tokens.
- Gemini 2.x: 258 tokens por imagen de ≤384 px por lado (las más grandes se dividen en mosaicos); audio ≈ 32 tokens/s.
- Voz de GPT-4o: ~320 ms de respuesta promedio frente a 2.8–5.4 s del Voice Mode anterior con ASR→LLM→TTS.
- Fuentes: [Dosovitskiy et al. — An Image is Worth 16x16 Words (ViT)](https://arxiv.org/abs/2010.11929) · [Liu et al. — Visual Instruction Tuning (LLaVA)](https://arxiv.org/abs/2304.08485) · [Anthropic — Vision](https://platform.claude.com/docs/en/build-with-claude/vision) · [OpenAI — Hello GPT-4o](https://openai.com/index/hello-gpt-4o/)

### [ ] Modelos encoder vs decoder (BERT vs GPT) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/encoder-vs-decoder/) · `content/concepts/foundations/encoder-vs-decoder.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- BERT-base 110M / BERT-large 340M parámetros; el preentrenamiento oculta 15% de los tokens.
- DistilBERT: 40% más pequeño, 60% más rápido, conserva ~97% de la comprensión del lenguaje de BERT.
- ModernBERT (dic. 2024): contexto de 8,192 tokens, 149M (base) / 395M (large) parámetros.
- all-MiniLM-L6-v2: 22M parámetros, embeddings de 384 dimensiones, sigue siendo una línea base común.
- Fuentes: [Devlin et al. — BERT: Pre-training of Deep Bidirectional Transformers](https://arxiv.org/abs/1810.04805) · [Raffel et al. — Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (T5)](https://arxiv.org/abs/1910.10683) · [Vaswani et al. — Attention Is All You Need](https://arxiv.org/abs/1706.03762) · [Hugging Face — Finally, a Replacement for BERT: Introducing ModernBERT](https://huggingface.co/blog/modernbert)

### [ ] Scaling laws y Chinchilla — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/scaling-laws/) · `content/concepts/foundations/scaling-laws.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Entrenamiento ≈ 6·N·D FLOPs; inferencia ≈ 2·N FLOPs por token.
- Óptimo según Chinchilla: ~20 tokens por parámetro (70B con 1.4T tokens).
- GPT-3: ~1.7 tokens por parámetro; Llama 3 8B: ~1,875 tokens por parámetro (15T tokens).
- Llama 3.1 405B: ~3.8×10^25 FLOPs con 15.6T tokens.
- El exponente de loss contra cómputo de Kaplan es ~0.05: 10× más cómputo reduce la loss apenas ~11%.
- Fuentes: [Kaplan et al. — Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361) · [Hoffmann et al. — Training Compute-Optimal Large Language Models (Chinchilla)](https://arxiv.org/abs/2203.15556) · [Sardana et al. — Beyond Chinchilla-Optimal: Accounting for Inference in LM Scaling Laws](https://arxiv.org/abs/2401.00448) · [Snell et al. — Scaling LLM Test-Time Compute Optimally](https://arxiv.org/abs/2408.03314)

### [ ] Mixture of Experts (MoE) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/moe/) · `content/concepts/foundations/moe.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Mixtral 8x7B: ~47B totales, ~13B activos (top-2 de 8 expertos).
- DeepSeek-V3: 671B totales, 37B activos (8 de 256 expertos ruteados + 1 compartido).
- Qwen3-235B-A22B: 235B totales, 22B activos.
- gpt-oss-120b: ~117B totales, ~5.1B activos; cabe en una GPU de 80 GB con pesos en MXFP4.
- Cómputo por token ≈ 2 × parámetros activos; memoria de pesos ≈ parámetros totales × bytes por parámetro.
- Fuentes: [Shazeer et al. — Outrageously Large Neural Networks: The Sparsely-Gated MoE Layer](https://arxiv.org/abs/1701.06538) · [Fedus et al. — Switch Transformers](https://arxiv.org/abs/2101.03961) · [Jiang et al. — Mixtral of Experts](https://arxiv.org/abs/2401.04088) · [DeepSeek-AI — DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437)

### [ ] Cómo elegir un modelo — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/model-selection/) · `content/concepts/foundations/model-selection.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- FrugalGPT: las cascadas de LLMs igualaron la calidad de GPT-4 con hasta 98% menos costo en sus benchmarks.
- Diferencia de precio de lista dentro de una familia: GPT-4.1 $2 vs GPT-4.1-nano $0.10 por M de tokens de entrada (20×, a 2025).
- 200 casos de evaluación con ~90% de precisión → intervalo de confianza del 95% de ±~4 puntos: diferencias menores son ruido.
- Licencia comunitaria de Llama: los servicios con más de 700M de usuarios activos mensuales necesitan otra licencia de Meta.
- Fuentes: [Chen, Zaharia, Zou — FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance](https://arxiv.org/abs/2305.05176) · [Chiang et al. — Chatbot Arena: An Open Platform for Evaluating LLMs by Human Preference](https://arxiv.org/abs/2403.04132) · [OpenAI — Model selection guide](https://developers.openai.com/api/docs/guides/model-selection) · [LiteLLM documentation](https://docs.litellm.ai/)

## Prompting y context engineering (12)

### [ ] Anatomía de un prompt — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/prompt-anatomy/) · `content/concepts/prompting/prompt-anatomy.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Anthropic: documentos largos (~20K+ tokens) arriba y la consulta al final dieron respuestas hasta ~30% mejores con entradas complejas de varios documentos.
- Guía de GPT-4.1 de OpenAI: instrucciones arriba y abajo del contexto largo superan a cualquiera de las dos solas; si van una sola vez, ponlas arriba.
- En Anthropic, las lecturas de cache cuestan 10% del precio base de entrada (5% en Opus/Sonnet 5.5, fines de 2026), solo para un prefijo idéntico.
- OpenAI cachea prompts automáticamente desde 1,024 tokens, también solo por prefijo.
- Fuentes: [Anthropic — Prompting best practices: long context prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#long-context-prompting) · [Anthropic — Migrating away from prefilled responses](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#migrating-away-from-prefilled-responses) · [OpenAI Cookbook — GPT-4.1 Prompting Guide](https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide) · [Wallace et al. 2024 — The Instruction Hierarchy](https://arxiv.org/abs/2404.13208)

### [ ] Prompting zero-shot vs few-shot — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/few-shot/) · `content/concepts/prompting/few-shot.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Empieza con 3–5 ejemplos diversos (guía de Anthropic); agrega más solo si mejora tu eval.
- Zhao et al. 2021: solo el formato, la elección de ejemplos y su orden llevaron a GPT-3 de casi azar a casi el estado del arte.
- Min et al. 2022: etiquetas aleatorias en las demostraciones apenas bajan la precisión en clasificación; el formato y el espacio de etiquetas explican buena parte del efecto.
- Many-shot ICL (Agarwal et al. 2024): cientos a miles de ejemplos en contexto largo dieron mejoras significativas en muchas tareas.
- Paper de DeepSeek-R1: few-shot degradaba de forma consistente al modelo de razonamiento, por eso recomiendan zero-shot.
- Fuentes: [Zhao et al. 2021 — Calibrate Before Use: Improving Few-Shot Performance of Language Models](https://arxiv.org/abs/2102.09690) · [Min et al. 2022 — Rethinking the Role of Demonstrations](https://arxiv.org/abs/2202.12837) · [Agarwal et al. 2024 — Many-Shot In-Context Learning](https://arxiv.org/abs/2404.11018) · [Anthropic — Prompting best practices: use examples effectively](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#use-examples-effectively)

### [ ] Chain-of-thought (CoT) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/chain-of-thought/) · `content/concepts/prompting/chain-of-thought.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- CoT zero-shot (Kojima 2022): InstructGPT pasó de 17.7% a 78.7% en MultiArith y de 10.4% a 40.7% en GSM8K.
- CoT few-shot (Wei 2022): PaLM 540B en GSM8K pasó de 17.9% a 56.9%; las mejoras aparecieron solo desde ~100B+ parámetros.
- Meta-análisis de Sprague et al. 2024: el beneficio de CoT se concentra en matemática y razonamiento simbólico, con mejoras mucho menores en lo demás.
- Anthropic 2025: los modelos de razonamiento mencionaron una pista que sí usaron solo ~25% (Claude 3.7 Sonnet) y ~39% (DeepSeek-R1) de las veces.
- Los tokens de razonamiento y de thinking se cobran como tokens de salida, aunque estén ocultos o resumidos. En Claude 4.6+ la profundidad se fija con adaptive thinking y `effort`; desde 4.7, `budget_tokens` se rechaza (fines de 2026).
- Fuentes: [Wei et al. 2022 — Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903) · [Kojima et al. 2022 — Large Language Models are Zero-Shot Reasoners](https://arxiv.org/abs/2205.11916) · [Turpin et al. 2023 — Language Models Don't Always Say What They Think](https://arxiv.org/abs/2305.04388) · [OpenAI — Reasoning best practices](https://developers.openai.com/api/docs/guides/reasoning-best-practices)

### [ ] Structured outputs y JSON mode — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/structured-outputs/) · `content/concepts/prompting/structured-outputs.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Eval de OpenAI: gpt-4o-2024-08-06 con Structured Outputs obtuvo 100% siguiendo esquemas complejos; gpt-4-0613 quedó por debajo de 40%.
- Tam et al. 2024: restricciones de formato más estrictas en general implicaron caídas mayores en tareas de razonamiento.
- Regla práctica: permite 1–2 reintentos con el error de validación; si más de ~1% de las llamadas lo necesita, arregla el esquema o el prompt.
- Fuentes: [OpenAI — Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) · [OpenAI — Introducing Structured Outputs in the API](https://openai.com/index/introducing-structured-outputs-in-the-api/) · [Willard & Louf 2023 — Efficient Guided Generation for Large Language Models](https://arxiv.org/abs/2307.09702) · [Tam et al. 2024 — Let Me Speak Freely? Format Restrictions and LLM Performance](https://arxiv.org/abs/2408.02442)

### [ ] Técnicas de prompting que importan — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/prompt-patterns/) · `content/concepts/prompting/prompt-patterns.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Anthropic reporta que poner la pregunta después de los documentos largos mejora la calidad de la respuesta hasta ~30% en entradas complejas con varios documentos.
- Anthropic recomienda 3–5 ejemplos variados y relevantes para few-shot.
- Guía de GPT-4.1 de OpenAI: con contexto largo, repite las instrucciones clave al inicio y al final; XML funcionó bien como delimitador de documentos y JSON, mal.
- Fuentes: [Anthropic — Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview) · [Anthropic — Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) · [OpenAI Cookbook — GPT-4.1 Prompting Guide](https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide)

### [ ] Prompt caching (caché de prompts) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/prompt-caching/) · `content/concepts/prompting/prompt-caching.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Anthropic (fines de 2026): escribir en caché cuesta 1.25× el input base (TTL de 5 minutos) o 2× (TTL de 1 hora); leer, 0.1×, o 0.05× en Opus y Sonnet 5.5.
- Con escritura a 1.25× y lectura a 0.1×, el punto de equilibrio es el primer reuso: dos llamadas cuestan ~1.35× en vez de 2×.
- OpenAI (fines de 2026): activo por defecto desde 1,024 tokens; los modelos anteriores descuentan 50–90% el input en caché sin cobrar la escritura; GPT-5.6+ cobra 1.25× al escribir y 0.1× al leer.
- Benchmark de lanzamiento de Anthropic (2024): un prompt de 100k tokens en caché bajó el tiempo al primer token de 11.5 s a 2.4 s y el costo en 90%.
- El prefijo mínimo cacheable depende del modelo: 512–4,096 tokens en Claude, 1,024 en OpenAI y 2,048–4,096 en la caché implícita de Gemini. Los prompts más cortos nunca se cachean.
- Fuentes: [Anthropic — Prompt caching (docs)](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · [Anthropic — Prompt caching with Claude (2024 launch)](https://claude.com/resources/articles/prompt-caching) · [OpenAI — Prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching) · [Google — Gemini API context caching](https://ai.google.dev/gemini-api/docs/caching)

### [ ] Lost in the middle y context rot — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/context-rot/) · `content/concepts/prompting/context-rot.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Liu et al.: caída de ~20 puntos de precisión cuando la respuesta pasa de la primera posición al medio (GPT-3.5-Turbo, 20 documentos).
- RULER: de los modelos que declaran 32K+ de contexto, solo cerca de la mitad rindió bien a 32K.
- NoLiMa (2025): a 32K tokens, 11 de 13 modelos cayeron por debajo del 50% de su puntaje con contexto corto; GPT-4o pasó de 99.3% a 69.7%.
- Anthropic: poner la consulta después de los documentos largos mejoró la calidad de respuesta hasta un 30% en sus pruebas.
- Fuentes: [Liu et al. — Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) · [Chroma — Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://www.trychroma.com/research/context-rot) · [Hsieh et al. — RULER: What's the Real Context Size of Your Long-Context Language Models?](https://arxiv.org/abs/2404.06654) · [Anthropic — Prompting best practices: long context prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#long-context-prompting)

### [ ] Prompts como código: versionado — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/prompt-management/) · `content/concepts/prompting/prompt-management.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Escalera de rollout: ~1–5% → 25–50% → 100%, esperando en cada paso lo suficiente para leer las métricas online.
- Arranca el golden set de CI con ~50–200 casos por prompt; debe terminar en minutos o la gente se lo salta.
- Lecturas del registro: caché en el cliente (TTL ~60 s, el valor por defecto de Langfuse) más un fallback empaquetado, para que una caída nunca bloquee requests.
- Los snapshots fijados también se retiran: en octubre de 2026 OpenAI avisó con 3 meses que los snapshots de gpt-4o y gpt-4.1 se apagan el 14 de enero de 2027. Presupuesta una nueva eval por migración.
- Fuentes: [Langfuse — Prompt Management](https://langfuse.com/docs/prompt-management/get-started) · [promptfoo — CI/CD integration](https://www.promptfoo.dev/docs/integrations/ci-cd/) · [OpenAI — Models and snapshots](https://developers.openai.com/api/docs/models) · [Hamel Husain — Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/)

### [ ] Context engineering — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/context-engineering/) · `content/concepts/prompting/context-engineering.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Anthropic: un subagente puede explorar con decenas de miles de tokens, pero devuelve un resumen condensado de ~1,000–2,000 tokens.
- El investigador multiagente de Anthropic: ~15× los tokens de un chat; el uso de tokens por sí solo explicó ~80% de la variación de desempeño en BrowseComp.
- Anthropic reportó que borrar los resultados viejos de herramientas redujo 84% el uso de tokens en una eval de búsqueda web de 100 turnos.
- Fuentes: [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) · [Anthropic — How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system) · [Anthropic — Managing context on the Claude Developer Platform](https://claude.com/resources/articles/context-management) · [Chroma Research — Context Rot](https://www.trychroma.com/research/context-rot)

### [ ] Contexto largo vs RAG — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/long-context-vs-rag/) · `content/concepts/prompting/long-context-vs-rag.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica de Anthropic (2024): con menos de ~200k tokens (~500 páginas), considera saltarte RAG y poner toda la base de conocimiento en el prompt, con caché.
- Lost in the Middle (2023): la exactitud de GPT-3.5-Turbo en QA multidocumento cayó ~20 puntos cuando la respuesta pasó del inicio a la mitad de 20 documentos.
- RULER (2024): solo cerca de la mitad de los modelos que anunciaban ventanas de 32k o más mantuvieron un desempeño satisfactorio a 32k.
- Ejemplo resuelto a $3/M de entrada, corpus de 150k tokens: ~$0.45 por consulta metiendo todo, ~$0.05 con caché, ~$0.015 con RAG de 5k tokens.
- Fuentes: [Liu et al. — Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) · [Li et al. — Retrieval Augmented Generation or Long-Context LLMs? A Comprehensive Study and Hybrid Approach](https://arxiv.org/abs/2407.16833) · [Hsieh et al. — RULER: What's the Real Context Size of Your Long-Context Language Models?](https://arxiv.org/abs/2404.06654) · [Anthropic — Introducing Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval)

### [ ] Self-consistency y best-of-N — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/self-consistency/) · `content/concepts/prompting/self-consistency.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Wang et al.: +17.9 puntos en GSM8K con PaLM 540B (40 caminos CoT muestreados vs CoT greedy).
- OpenAI o1 en AIME 2024: 74% con una muestra, 83% con consenso sobre 64 y 93% reordenando 1,000 muestras con un scorer aprendido.
- Cobbe et al.: un verificador entrenado en GSM8K dio aproximadamente la mejora de un modelo 30× más grande.
- En producción, N ≈ 3–10 es el rango habitual; los benchmarks reportan 32–64+, con retornos decrecientes.
- Fuentes: [Wang et al. — Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171) · [Chen et al. — Universal Self-Consistency for Large Language Model Generation](https://arxiv.org/abs/2311.17311) · [Cobbe et al. — Training Verifiers to Solve Math Word Problems](https://arxiv.org/abs/2110.14168) · [OpenAI — Learning to Reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/)

### [ ] Optimización automática de prompts (DSPy) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/prompt-optimization/) · `content/concepts/prompting/prompt-optimization.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- OPRO: los prompts optimizados superaron a los escritos por humanos hasta en 8% en GSM8K y hasta en 50% en tareas de Big-Bench Hard.
- La mejor instrucción de OPRO en GSM8K para PaLM 2-L, "Take a deep breath and work on this problem step-by-step": 80.2% vs 71.8% de "Let's think step by step".
- MIPRO: superó a los optimizadores base en 5 de 7 programas de varias etapas con Llama-3-8B, hasta por 13% de precisión.
- TextGrad: subió la precisión zero-shot de GPT-4o en Google-Proof QA de 51% a 55%.
- Fuentes: [Khattab et al. — DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines](https://arxiv.org/abs/2310.03714) · [Opsahl-Ong et al. — Optimizing Instructions and Demonstrations for Multi-Stage Language Model Programs (MIPRO)](https://arxiv.org/abs/2406.11695) · [Yang et al. — Large Language Models as Optimizers (OPRO)](https://arxiv.org/abs/2309.03409) · [Yuksekgonul et al. — TextGrad: Automatic "Differentiation" via Text](https://arxiv.org/abs/2406.07496)

## RAG y recuperación (18)

### [ ] RAG (generación aumentada por recuperación) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/rag/) · `content/concepts/rag/rag.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Forma típica online: recuperar ~50 → reordenar → 3–8 chunks de ~300–800 tokens en el prompt.
- Indexar es barato: 75M de tokens con text-embedding-3-small (US$0.02 por millón, precio de lista a 2026) ≈ US$1.50.
- La recuperación más el reranking suelen sumar ~100–400 ms antes del primer token; la generación domina la latencia total.
- El paper original de RAG recuperaba de ~21M de pasajes de Wikipedia de 100 palabras.
- Fuentes: [Lewis et al. (2020) — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) · [Gao et al. (2023) — Retrieval-Augmented Generation for Large Language Models: A Survey](https://arxiv.org/abs/2312.10997) · [Barnett et al. (2024) — Seven Failure Points When Engineering a Retrieval Augmented Generation System](https://arxiv.org/abs/2401.05856) · [Liu et al. (2023) — Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172)

### [ ] Ingesta y parsing de documentos — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/document-parsing/) · `content/concepts/rag/document-parsing.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- El OCR administrado cuesta ~US$1.50 por cada 1,000 páginas; la extracción de layout o tablas, ~US$10–15 por cada 1,000 (precios de lista de Azure y AWS, 2026).
- Menos de ~100–200 caracteres extraídos por página suele indicar un escaneo que necesita OCR.
- Lee a ojo 20–50 documentos parseados antes de ajustar cualquier cosa que venga después.
- Fuentes: [Auer et al. (2024) — Docling Technical Report](https://arxiv.org/abs/2408.09869) · [Unstructured — Documentation](https://docs.unstructured.io) · [Microsoft — Azure AI Document Intelligence overview](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/overview) · [AWS — Amazon Textract](https://aws.amazon.com/textract/)

### [ ] Estrategias de chunking — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/chunking/) · `content/concepts/rag/chunking.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Punto de partida común: 300–800 tokens por chunk con 10–20% de solapamiento.
- Padre-hijo: hijos de ~100–400 tokens y padres de ~1,000–2,000 tokens o una sección completa.
- Muchos modelos de embeddings abiertos limitan la entrada a 512 tokens (algunos a 256); el texto más largo se trunca sin aviso.
- El contextual retrieval de Anthropic antepone ~50–100 tokens de contexto generado a cada chunk.
- Fuentes: [Pinecone — Chunking Strategies for LLM Applications](https://www.pinecone.io/learn/chunking-strategies/) · [Günther et al. (2024) — Late Chunking: Contextual Chunk Embeddings Using Long-Context Embedding Models](https://arxiv.org/abs/2409.04701) · [Chroma Research — Evaluating Chunking Strategies for Retrieval](https://www.trychroma.com/research/evaluating-chunking) · [Anthropic — Introducing Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval)

### [ ] Cómo elegir un modelo de embeddings — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/embedding-models/) · `content/concepts/rag/embedding-models.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- OpenAI text-embedding-3-small: 1,536 dimensiones, US$0.02 por millón de tokens; -large: 3,072 dimensiones, US$0.13 por millón (precios de lista a 2026); entrada máxima de 8,191 tokens.
- Almacenamiento en float32 = dimensiones × 4 bytes: 1,024 dimensiones ≈ 4 KB por vector, ~4 GB por millón de chunks.
- OpenAI reporta que text-embedding-3-large truncado a 256 dimensiones todavía supera en MTEB a ada-002 con 1,536.
- BGE-M3: 1,024 dimensiones, hasta 8,192 tokens de entrada, más de 100 idiomas y salidas densas, dispersas y multivector.
- Cuantización: int8 ocupa 4× menos que float32 y binario, 32× menos.
- Fuentes: [Muennighoff et al. (2022) — MTEB: Massive Text Embedding Benchmark](https://arxiv.org/abs/2210.07316) · [OpenAI — New embedding models and API updates](https://openai.com/index/new-embedding-models-and-api-updates/) · [Kusupati et al. (2022) — Matryoshka Representation Learning](https://arxiv.org/abs/2205.13147) · [Chen et al. (2024) — BGE M3-Embedding](https://arxiv.org/abs/2402.03216)

### [ ] Bases de datos vectoriales — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/vector-databases/) · `content/concepts/rag/vector-databases.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- 1M × 1536 dimensiones × 4 B ≈ 6 GB de float32 crudo; int8 ≈ 1.5 GB; binario ≈ 0.2 GB.
- pgvector indexa hasta 2,000 dimensiones con `vector` y 4,000 con `halfvec`.
- Valores por defecto de HNSW en pgvector: m = 16, ef_construction = 64, hnsw.ef_search = 40.
- Los enlaces de HNSW cuestan ~2·M × 4 B por vector (~130 B con M = 16): poco al lado de un vector de 6 KB.
- Fuentes: [pgvector — Open-source vector similarity search for Postgres](https://github.com/pgvector/pgvector) · [Qdrant — Filtering](https://qdrant.tech/documentation/search/filtering/) · [Pinecone — Documentation](https://docs.pinecone.io/)

### [ ] Búsqueda léxica y BM25 — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/bm25/) · `content/concepts/rag/bm25.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Valores por defecto en Lucene, Elasticsearch y OpenSearch: k1 = 1.2, b = 0.75.
- BM25 es la similitud por defecto de Lucene desde Lucene 6.0 (2016).
- IDF ≈ ln(1 + (N − n + 0.5)/(n + 0.5)): un término en 37 de 200k documentos ≈ 8.6; en la mitad de los documentos ≈ 0.7.
- BEIR (18 datasets, 2021): fuera de dominio, BM25 fue una línea base zero-shot fuerte que muchos recuperadores densos de esa época no lograron superar.
- Fuentes: [Elasticsearch — Similarity module (BM25)](https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity) · [Thakur et al. — BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models](https://arxiv.org/abs/2104.08663) · [rank_bm25 — BM25 implementations in Python](https://github.com/dorianbrown/rank_bm25) · [Wikipedia — Okapi BM25](https://en.wikipedia.org/wiki/Okapi_BM25)

### [ ] Búsqueda híbrida y RRF — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/hybrid-search/) · `content/concepts/rag/hybrid-search.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- RRF: puntaje = Σ 1/(k + rank), con k = 60 según Cormack et al. (2009).
- Con k = 60: primero en ambas listas ≈ 0.033; primero en una sola ≈ 0.016; el puesto 10 vale ~13% menos que el 1.
- Forma típica: top ~50 por recuperador → fusionar → reordenar → conservar 3–8.
- Anthropic: embeddings contextuales + BM25 contextual reducen en 49% las fallas de recuperación en el top 20, y en 67% con reranking.
- Fuentes: [Cormack, Clarke & Büttcher — Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods (SIGIR 2009)](https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf) · [Elasticsearch — Reciprocal rank fusion](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion) · [Anthropic — Introducing Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval) · [Qdrant — Hybrid queries](https://qdrant.tech/documentation/search/hybrid-queries/)

### [ ] Reranking (cross-encoders) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/reranking/) · `content/concepts/rag/reranking.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Forma típica: recuperar 50–100 → reordenar → conservar 3–8.
- Anthropic midió que contextual retrieval + reranking reduce en 67% las fallas de recuperación en el top 20.
- Fuentes: [Anthropic — Introducing Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval) · [Sentence Transformers — Cross-Encoders](https://www.sbert.net/examples/cross_encoder/applications/README.html)

### [ ] Filtros de metadatos y recuperación con permisos — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/permission-aware-retrieval/) · `content/concepts/rag/permission-aware-retrieval.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Cuenta del post-filtro: un usuario que puede leer una fracción p del corpus conserva ~p·k de k resultados; 1% de 100 ≈ 1.
- Demora de revocación = tu intervalo de sincronización de ACL: un batch nocturno puede seguir sirviendo accesos revocados hasta ~24 h.
- pgvector 0.8+ agrega iterative index scans para que las consultas HNSW filtradas sigan devolviendo suficientes filas.
- Fuentes: [Qdrant — Filtering](https://qdrant.tech/documentation/search/filtering/) · [pgvector — README (filtering and iterative index scans)](https://github.com/pgvector/pgvector) · [Azure AI Search — Security filters for trimming results](https://learn.microsoft.com/en-us/azure/search/search-security-trimming-for-azure-search)

### [ ] Citas y grounding — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/citations-grounding/) · `content/concepts/rag/citations-grounding.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Liu et al. (2023), al auditar 4 buscadores generativos: solo ~51.5% de las oraciones generadas estaban totalmente respaldadas por sus citas.
- Mismo estudio: solo ~74.5% de las citas respaldaban de verdad la oración a la que estaban asociadas.
- Precisión de citas = citas que respaldan su afirmación ÷ todas las citas; recall de citas = afirmaciones totalmente respaldadas ÷ todas las afirmaciones.
- Anthropic reportó que su función Citations superó a la mayoría de las implementaciones propias y subió la exactitud del recall hasta 15% (evaluaciones internas, enero de 2025).
- Fuentes: [Liu et al. — Evaluating Verifiability in Generative Search Engines](https://arxiv.org/abs/2304.09848) · [Gao et al. — Enabling Large Language Models to Generate Text with Citations (ALCE)](https://arxiv.org/abs/2305.14627) · [Anthropic — Citations (docs)](https://platform.claude.com/docs/en/build-with-claude/citations)

### [ ] Evaluar un sistema RAG — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/rag-evaluation/) · `content/concepts/rag/rag-evaluation.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- MRR por pregunta: primer documento relevante en el puesto 1 → 1.0; puesto 2 → 0.5; puesto 5 → 0.2; no encontrado → 0.
- Un hit rate@50 de 0.80 significa que ~20% de las preguntas nunca ve un documento relevante: ningún generador puede arreglar eso.
- Métricas centrales de RAGAS: faithfulness, answer relevancy, context precision, context recall.
- RAG triad de TruLens: context relevance, groundedness, answer relevance.
- Fuentes: [Es et al. — RAGAS: Automated Evaluation of Retrieval Augmented Generation (2023)](https://arxiv.org/abs/2309.15217) · [Saad-Falcon et al. — ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems (2023)](https://arxiv.org/abs/2311.09476) · [TruLens documentation](https://www.trulens.org/) · [Gao et al. — Enabling Large Language Models to Generate Text with Citations (2023)](https://arxiv.org/abs/2305.14627)

### [ ] Índices ANN: HNSW, IVF, PQ — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/ann-indexes/) · `content/concepts/rag/ann-indexes.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- kNN exacto sobre 10M × 768 en float32 lee ~31 GB por consulta.
- Puntos de partida comunes en HNSW: M = 16, efConstruction = 64–200, efSearch = 40–100 (y siempre ≥ k).
- PQ con 1 byte cada 16 dimensiones: un vector float32 de 1536 dimensiones pasa de 6 KB a 96 bytes (64×).
- Guía de pgvector para IVFFlat: lists = filas/1000 hasta 1M de filas, √filas por encima; probes ≈ √lists.
- Paper de DiskANN: un índice de mil millones de puntos en una estación de trabajo con 64 GB de RAM más un SSD.
- Fuentes: [Malkov & Yashunin — Efficient and robust approximate nearest neighbor search using HNSW graphs](https://arxiv.org/abs/1603.09320) · [Douze et al. — The Faiss library](https://arxiv.org/abs/2401.08281) · [Microsoft — DiskANN](https://github.com/microsoft/DiskANN) · [ANN-Benchmarks](https://ann-benchmarks.com/)

### [ ] Transformación de consultas (rewrite, HyDE) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/query-transformation/) · `content/concepts/rag/query-transformation.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Latencia: +1 llamada a un modelo pequeño, ~0.2–1 s; genera reescritura, variantes y pasaje HyDE en una sola llamada.
- Multi-query: 3–5 variantes → recuperación ×3–5 → fusión con RRF, puntaje = Σ 1/(60 + rank).
- HyDE (Gao et al., 2022) es zero-shot: superó al recuperador no supervisado Contriever sin ninguna etiqueta de relevancia.
- Fuentes: [Gao et al. — Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)](https://arxiv.org/abs/2212.10496) · [Ma et al. — Query Rewriting for Retrieval-Augmented Large Language Models](https://arxiv.org/abs/2305.14283) · [Zheng et al. — Take a Step Back: Evoking Reasoning via Abstraction in LLMs](https://arxiv.org/abs/2310.06117)

### [ ] Contextual retrieval (recuperación contextual) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/contextual-retrieval/) · `content/concepts/rag/contextual-retrieval.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tasa de fallas de recuperación en el top 20 en las pruebas de Anthropic: 5.7% base → 3.7% con contextual embeddings (−35%).
- Sumando contextual BM25: 2.9% (−49%); sumando además reranking: 1.9% (−67%).
- Contexto generado: ~50–100 tokens por chunk.
- ~$1.02 por millón de tokens de documento, una sola vez, con prompt caching (precios de Claude 3 Haiku, 2024); escálalo según el precio de tu modelo.
- Con menos de ~200K tokens (~500 páginas) de conocimiento, sáltate la recuperación y envía todo con caché.
- Fuentes: [Anthropic — Introducing Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval) · [Anthropic — Prompt caching (docs)](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

### [ ] GraphRAG y grafos de conocimiento — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/graphrag/) · `content/concepts/rag/graphrag.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Costo de indexación ≈ una llamada de extracción por chunk (más reintentos opcionales de "gleaning") + un reporte por comunidad.
- El paper de GraphRAG evaluó sobre corpus de ~1–2M tokens (transcripciones de podcasts, artículos de noticias).
- En el paper, chunks de 600 tokens extrajeron ~2× las referencias a entidades que chunks de 2,400 tokens.
- LazyGraphRAG: costo de indexación similar al de RAG vectorial, ~0.1% del de GraphRAG completo (Microsoft Research, 2024).
- Fuentes: [Edge et al. — From Local to Global: A Graph RAG Approach to Query-Focused Summarization (2024)](https://arxiv.org/abs/2404.16130) · [Microsoft GraphRAG documentation](https://microsoft.github.io/graphrag/) · [Guo et al. — LightRAG: Simple and Fast Retrieval-Augmented Generation (2024)](https://arxiv.org/abs/2410.05779) · [Microsoft Research — LazyGraphRAG: Setting a new standard for quality and cost](https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/)

### [ ] Agentic RAG — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/agentic-rag/) · `content/concepts/rag/agentic-rag.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- N pasos de agente cuestan más que N× los tokens de entrada de un RAG de una pasada: cada llamada reenvía la conversación acumulada.
- Self-RAG usa 4 tipos de tokens de reflexión: Retrieve, IsRel, IsSup, IsUse.
- El evaluador de recuperación de CRAG es un T5-large con fine-tuning (~770 millones de parámetros), no el LLM generador: evaluar puede ser barato.
- Regla práctica: ~1–3 s para RAG de una pasada vs ~10 s o más cuando el agente da 3–5 pasos.
- Fuentes: [Asai et al. — Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection (2023)](https://arxiv.org/abs/2310.11511) · [Yan et al. — Corrective Retrieval Augmented Generation (2024)](https://arxiv.org/abs/2401.15884) · [Trivedi et al. — Interleaving Retrieval with Chain-of-Thought Reasoning for Knowledge-Intensive Multi-Step Questions (2022)](https://arxiv.org/abs/2212.10509) · [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents)

### [ ] Late interaction (ColBERT) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/late-interaction/) · `content/concepts/rag/late-interaction.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- ColBERT: vector de 128 dimensiones por token; las consultas se rellenan o recortan a 32 tokens.
- Sin comprimir: 300 tokens × 128 dims × 2 bytes (fp16) ≈ 77 KB por chunk vs ~4 KB de un vector fp32 de 1,024 dims.
- Compresión residual de ColBERTv2 (1–2 bits por dimensión): índice 6–10× más chico.
- PLAID: hasta ~7× menos latencia en GPU y ~45× en CPU frente a ColBERTv2 sin PLAID.
- ColPali: ~1,000 vectores de parche de 128 dims por imagen de página.
- Fuentes: [Khattab & Zaharia — ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT (2020)](https://arxiv.org/abs/2004.12832) · [Santhanam et al. — ColBERTv2: Effective and Efficient Retrieval via Lightweight Late Interaction (2021)](https://arxiv.org/abs/2112.01488) · [Santhanam et al. — PLAID: An Efficient Engine for Late Interaction Retrieval (2022)](https://arxiv.org/abs/2205.09707) · [Faysse et al. — ColPali: Efficient Document Retrieval with Vision Language Models (2024)](https://arxiv.org/abs/2407.01449)

### [ ] Frescura y ciclo de vida del índice — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/index-lifecycle/) · `content/concepts/rag/index-lifecycle.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- GDPR: responde una solicitud de supresión sin demora indebida, normalmente en un plazo de un mes (art. 12.3).
- Volver a generar embeddings para mil millones de tokens con text-embedding-3-small ≈ US$20 (US$0.02 por millón, precio de lista a 2026); el cuello de botella real es el throughput y el tiempo de reconstrucción.
- La inversión de embeddings (vec2text) recuperó exactamente el 92% de entradas de 32 tokens a partir de sus embeddings.
- SLA de ejemplo: p95 de edición a búsqueda < 15 min; borrados < 1 h; alerta sobre el desfase medido.
- Fuentes: [Qdrant documentation — Collections and collection aliases](https://qdrant.tech/documentation/manage-data/collections/) · [GDPR Article 17 — Right to erasure](https://gdpr-info.eu/art-17-gdpr/) · [Morris et al. — Text Embeddings Reveal (Almost) As Much As Text (2023)](https://arxiv.org/abs/2310.06801) · [Debezium documentation](https://debezium.io/documentation/)

## Agentes y uso de herramientas (18)

### [ ] Agentes vs workflows — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/agents-vs-workflows/) · `content/concepts/agents/agents-vs-workflows.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Anthropic (2025): los agentes usan ~4× los tokens de una interacción de chat; los sistemas multiagente, ~15×.
- Acumulación: con 95% de confiabilidad por paso, una ejecución de 10 pasos sale bien ~60% de las veces (0.95¹⁰ ≈ 0.60); con 99%, ~90%.
- El 49% de Anthropic en SWE-bench Verified (Claude 3.5 Sonnet, oct. 2024) usó un agente mínimo: un prompt, una herramienta bash, una de edición y un loop.
- Fuentes: [Anthropic — Building effective agents (2024)](https://www.anthropic.com/research/building-effective-agents) · [Anthropic — How we built our multi-agent research system (2025)](https://www.anthropic.com/research/multi-agent-research-system) · [Anthropic — Raising the bar on SWE-bench Verified with Claude 3.5 Sonnet](https://www.anthropic.com/research/swe-bench-sonnet)

### [ ] Tool calling / function calling — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/tool-calling/) · `content/concepts/agents/tool-calling.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- τ-bench (2024): agentes con function calling sobre gpt-4o resolvieron <50% de las tareas, y pass^8 (que acierten los 8 intentos) fue <25% en retail.
- Anthropic agrega un system prompt oculto de uso de herramientas cada vez que envías tools: ~290–680 tokens según el modelo (p. ej. 497 en Sonnet 4.6, 286 en Opus 5.5; docs, nov. 2026).
- Regla práctica: una definición de herramienta cuesta ~50–300 tokens, así que 30 herramientas suman varios miles de tokens a cada llamada.
- Latencia: N pasos de herramientas en secuencia ≈ N llamadas al modelo; las llamadas independientes en un mismo turno paralelo cuestan una.
- Fuentes: [Anthropic — Tool use with Claude (docs)](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) · [OpenAI — Function calling (docs)](https://developers.openai.com/api/docs/guides/function-calling) · [Yao et al. — τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains (2024)](https://arxiv.org/abs/2406.12045) · [Berkeley Function Calling Leaderboard (BFCL)](https://gorilla.cs.berkeley.edu/leaderboard.html)

### [ ] ReAct: el loop del agente — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/react/) · `content/concepts/agents/react.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Paper de ReAct: +34 y +10 puntos absolutos de éxito sobre baselines de imitación y RL en ALFWorld y WebShop, con solo 1–2 ejemplos en el prompt.
- En HotpotQA, ReAct solo quedó un poco por debajo de chain-of-thought; combinarlo con CoT con self-consistency dio el mejor resultado. En FEVER, ReAct superó a CoT.
- Cuenta de costo: el paso k reenvía los k pasos previos, así que n pasos envían ~n²/2 bloques de entrada del tamaño de un paso; [[prompt-caching]] abarata el prefijo repetido.
- Regla práctica: pon el tope de pasos en ~2–3× los pasos que necesita una ejecución exitosa típica, medidos en las trazas.
- Fuentes: [Yao et al. — ReAct: Synergizing Reasoning and Acting in Language Models (2022)](https://arxiv.org/abs/2210.03629) · [ReAct project page (prompts, trajectories)](https://react-lm.github.io/) · [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents)

### [ ] Patrón: prompt chaining — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/prompt-chaining/) · `content/concepts/agents/prompt-chaining.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- La confiabilidad se multiplica: cinco pasos al 95% cada uno ≈ 77% de punta a punta (0.95⁵). Las compuertas existen para romper esa cuenta.
- La latencia es aditiva: de punta a punta ≈ suma de las latencias de cada paso, más los reintentos que disparen las compuertas.
- Una compuerta en código cuesta microsegundos y $0; una compuerta con LLM como juez suma una llamada completa (~0.5–3 s). Prefiere compuertas en código cuando se pueda.
- Fuentes: [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) · [Claude docs — Prompting best practices: chain complex prompts](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#chain-complex-prompts) · [Wu et al. — AI Chains: Transparent and Controllable Human-AI Interaction by Chaining Large Language Model Prompts (CHI 2022)](https://arxiv.org/abs/2110.01691)

### [ ] Patrón: routing — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/routing/) · `content/concepts/agents/routing.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- El nivel más chico y el más grande de un mismo proveedor suelen diferir 5–20× por token: GPT-4.1 nano salió a $0.10 contra $2.00 de GPT-4.1 por 1M de tokens de entrada (precios de lista, abr. 2025).
- RouteLLM (2024): los routers aprendidos redujeron el costo más de 2× en algunos benchmarks sin perder calidad de respuesta.
- FrugalGPT (2023): una cascada de LLMs igualó el desempeño de GPT-4 con hasta 98% menos costo en sus benchmarks.
- Regla práctica para el sobrecosto del router: una llamada a un LLM chico suma unos cientos de ms; un clasificador local con embeddings o afinado, ~1–20 ms.
- Fuentes: [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) · [Ong et al. — RouteLLM: Learning to Route LLMs with Preference Data (2024)](https://arxiv.org/abs/2406.18665) · [Chen, Zaharia, Zou — FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance (2023)](https://arxiv.org/abs/2305.05176)

### [ ] Patrón: paralelización — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/parallelization/) · `content/concepts/agents/parallelization.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: tiempo de reloj ≈ máx(latencias de las ramas); costo ≈ suma de todas las ramas.
- Self-consistency (Wang et al., 2022): votar por mayoría sobre ~40 caminos de razonamiento muestreados sumó +17.9 puntos en GSM8K frente a un solo chain-of-thought.
- Cuentas con independencia: 3 votantes que detectan cada uno el 70% de los bugs → cualquiera-de ~97%, mayoría ~78%. Solo si sus errores fueran independientes, cosa que rara vez pasa.
- Regla práctica: 3–5 votantes es un punto de partida habitual; agrega más solo si la curva del eval sigue subiendo.
- Fuentes: [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) · [Wang et al. — Self-Consistency Improves Chain of Thought Reasoning in Language Models (2022)](https://arxiv.org/abs/2203.11171) · [Li et al. — More Agents Is All You Need (2024)](https://arxiv.org/abs/2402.05120)

### [ ] Model Context Protocol (MCP) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/mcp/) · `content/concepts/agents/mcp.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Lanzado en nov. 2024; OpenAI, Google y Microsoft anunciaron soporte entre marzo y mayo de 2025.
- Dos transportes estándar, stdio y Streamable HTTP (desde la spec 2025-03-26, que reemplazó al HTTP+SSE original), y siguen siendo los dos en la revisión 2026-07-28. Revisión vigente de la spec: 2026-07-28, la versión sin estado y sin handshake initialize.
- La cuenta: 5 apps × 20 sistemas = 100 conectores a medida; con MCP, 5 + 20 = 25 implementaciones.
- Anthropic midió 58 tools de 5 servidores (GitHub, Slack, Sentry, Grafana, Splunk) en ~55k tokens de definiciones antes de que empiece la conversación.
- Anthropic: llamar a las tools MCP desde ejecución de código en vez de llamadas directas redujo un flujo de ~150k a ~2k tokens (~98.7%).
- Fuentes: [Anthropic — Introducing the Model Context Protocol (2024)](https://www.anthropic.com/news/model-context-protocol) · [Model Context Protocol — Specification (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28) · [MCP Python SDK — migration guide v1 → v2 (MCPServer)](https://py.sdk.modelcontextprotocol.io/migration/) · [MCP Python SDK (GitHub)](https://github.com/modelcontextprotocol/python-sdk)

### [ ] Human-in-the-loop y aprobaciones — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/human-in-the-loop/) · `content/concepts/agents/human-in-the-loop.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: nivel según el radio de impacto; solo lectura en automático, escrituras con aprobación, dinero/borrados/permisos con confirmación explícita.
- Precedente de fatiga de alertas: los médicos ignoran entre 49% y 96% de las alertas de seguridad de medicamentos (van der Sijs et al., 2006).
- Anthropic: el sandboxing redujo 84% las solicitudes de permiso de Claude Code en uso interno; menos solicitudes, más atención en cada una.
- Regla práctica: si más del 95% de las aprobaciones de una acción pasan sin cambios, apruébala en automático con muestreo.
- Fuentes: [LangGraph — Human-in-the-loop (interrupts)](https://docs.langchain.com/oss/python/langgraph/interrupts) · [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) · [Anthropic — Making Claude Code more secure and autonomous with sandboxing (Oct 2025)](https://www.anthropic.com/research/claude-code-sandboxing) · [EU AI Act — Article 14: Human Oversight](https://artificialintelligenceact.eu/article/14/)

### [ ] Confiabilidad de agentes: presupuestos y loops — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/agent-reliability/) · `content/concepts/agents/agent-reliability.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Acumulación: 0.95^20 ≈ 36%, 0.99^20 ≈ 82%, 0.90^10 ≈ 35%.
- τ-bench (2024): GPT-4o resolvió menos del 50% de las tareas, y su pass^8 en retail cayó por debajo de 25%.
- Regla práctica: limita los pasos a ~2–3× la mediana de una corrida exitosa; detente en la 3.ª llamada idéntica.
- Fuentes: [Yao et al. — τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains (2024)](https://arxiv.org/abs/2406.12045) · [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) · [OWASP GenAI — LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)

### [ ] Diseño de herramientas para agentes (ACI) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/tool-design/) · `content/concepts/agents/tool-design.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Claude Code limita las respuestas de herramientas a 25,000 tokens por defecto (Anthropic, 2025).
- Guía de OpenAI: apunta a menos de ~20 funciones disponibles a la vez, un límite blando por precisión.
- SWE-agent (2024): con una ACI hecha a medida, GPT-4 Turbo llegó a 12.5% pass@1 en SWE-bench; las ablaciones mostraron que solo detalles de interfaz (linting de ediciones, un visor de archivos por ventanas) cambiaban la tasa de resolución.
- Regla práctica: mantén las salidas típicas en cientos de tokens, con un `limit` de página por defecto de ~10–50 elementos.
- Fuentes: [Anthropic — Writing effective tools for agents, with agents (Sep 2025)](https://www.anthropic.com/research/writing-tools-for-agents) · [Yang et al. — SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering (2024)](https://arxiv.org/abs/2405.15793) · [Anthropic — Building effective agents (Appendix 2: prompt-engineering your tools)](https://www.anthropic.com/research/building-effective-agents) · [OpenAI — Function calling best practices (docs)](https://developers.openai.com/api/docs/guides/function-calling)

### [ ] Patrón: orquestador–workers — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/orchestrator-workers/) · `content/concepts/agents/orchestrator-workers.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Anthropic (2025): un líder Opus 4 con subagentes Sonnet 4 superó en 90.2% a un solo agente Opus 4 en su eval interno de investigación.
- Mismo artículo: los agentes usan ~4× los tokens de un chat; los sistemas multiagente, ~15×.
- En el análisis de Anthropic sobre BrowseComp, el uso de tokens por sí solo explicó ~80% de la varianza de desempeño.
- Lanzar 3–5 subagentes en paralelo (más llamadas a herramientas en paralelo) redujo hasta 90% el tiempo de investigación en consultas complejas.
- Fuentes: [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) · [Anthropic — How we built our multi-agent research system (Jun 2025)](https://www.anthropic.com/research/multi-agent-research-system) · [Shen et al. — HuggingGPT: Solving AI Tasks with ChatGPT and its Friends in Hugging Face (2023)](https://arxiv.org/abs/2303.17580)

### [ ] Patrón: evaluador–optimizador — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/evaluator-optimizer/) · `content/concepts/agents/evaluator-optimizer.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Self-Refine (2023): la retroalimentación iterativa del propio modelo mejoró el desempeño ~20% absoluto en promedio sobre 7 tareas.
- Reflexion (2023): el feedback de correr tests llevó el pass@1 en HumanEval a 91%, frente a 80% de GPT-4 solo.
- Huang et al. (2023): sin feedback externo, la autocorrección no mejoró los benchmarks de razonamiento y a veces bajó la precisión.
- Regla práctica: tope de 2–4 rondas; la mayor parte de la mejora suele llegar en las primeras una o dos revisiones.
- Fuentes: [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) · [Madaan et al. — Self-Refine: Iterative Refinement with Self-Feedback (2023)](https://arxiv.org/abs/2303.17651) · [Shinn et al. — Reflexion: Language Agents with Verbal Reinforcement Learning (2023)](https://arxiv.org/abs/2303.11366) · [Huang et al. — Large Language Models Cannot Self-Correct Reasoning Yet (2023)](https://arxiv.org/abs/2310.01798)

### [ ] Planificación (plan-and-execute) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/planning/) · `content/concepts/agents/planning.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- ReWOO (Xu et al., 2023): ~5× de eficiencia en tokens y +4% de precisión en HotpotQA frente al razonamiento intercalado.
- LLMCompiler (Kim et al., 2023): hasta 3.7× menos latencia y 6.7× menos costo que ReAct al ejecutar en paralelo el DAG del plan.
- Regla práctica: 3–10 pasos por plan, cada uno con una verificación de "terminado cuando"; limita las replanificaciones a 2–3 y luego escala.
- Fuentes: [Xu et al. — ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models (2023)](https://arxiv.org/abs/2305.18323) · [Kim et al. — An LLM Compiler for Parallel Function Calling (2023)](https://arxiv.org/abs/2312.04511) · [Wang et al. — Plan-and-Solve Prompting (2023)](https://arxiv.org/abs/2305.04091) · [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents)

### [ ] Memoria de agentes — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/agent-memory/) · `content/concepts/agents/agent-memory.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Generative Agents (Park et al., 2023): puntaje de recuperación = recencia + importancia + relevancia; la recencia decae 0.995 por hora de juego y el LLM califica la importancia de 1 a 10.
- Regla práctica: inyecta ~5–10 memorias (de unos cientos a ~2k tokens) por turno, nunca la transcripción completa.
- RGPD art. 17 (derecho de supresión): el borrado debe alcanzar las filas de memoria, los embeddings y los resúmenes derivados, no solo el registro del chat.
- Fuentes: [Packer et al. — MemGPT: Towards LLMs as Operating Systems (2023)](https://arxiv.org/abs/2310.08560) · [Sumers et al. — Cognitive Architectures for Language Agents (CoALA) (2023)](https://arxiv.org/abs/2309.02427) · [Park et al. — Generative Agents: Interactive Simulacra of Human Behavior (2023)](https://arxiv.org/abs/2304.03442) · [Letta documentation](https://docs.letta.com/)

### [ ] Protocolos agente a agente (A2A) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/a2a/) · `content/concepts/agents/a2a.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Lanzado en abr. 2025 por Google con más de 50 socios; pasó a la Linux Foundation en jun. 2025 (entre los miembros fundadores: AWS, Cisco, Microsoft, Salesforce, SAP, ServiceNow); bajo su Agentic AI Foundation desde ago. 2026.
- Bindings: JSON-RPC 2.0, gRPC y HTTP+JSON sobre HTTPS, streaming con SSE y push por webhook; la v0.3 (jul. 2025) agregó Agent Cards firmadas y la ruta `agent-card.json`.
- v1.0 (12 mar. 2026): operaciones en PascalCase (`SendMessage`, `GetTask`, nuevo `ListTasks`), enums `TASK_STATE_*`, Parts sin `kind`, `supportedInterfaces` en lugar del `url` de la tarjeta y header `A2A-Version` obligatorio.
- Regla práctica: cada salto entre agentes es un ciclo completo de LLM (de segundos a minutos), así que limita las cadenas de delegación a 1–2 saltos.
- Fuentes: [Google Developers Blog — A2A: A new era of agent interoperability (2025)](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) · [A2A Protocol — Specification v1.0](https://a2a-protocol.org/latest/specification/) · [A2A Protocol — What's new in v1.0](https://a2a-protocol.org/latest/whats-new-v1/) · [A2A on GitHub (Linux Foundation project)](https://github.com/a2aproject/A2A)

### [ ] Sistemas multiagente — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/multi-agent/) · `content/concepts/agents/multi-agent.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Sistema de investigación de Anthropic: un solo agente usa ~4× los tokens de un chat; el multiagente, ~15×.
- Anthropic: un líder Opus 4 con subagentes Sonnet 4 superó por 90.2% a un solo agente Opus 4 en su eval interna de investigación.
- Anthropic: el uso de tokens por sí solo explicó ~80% de la varianza de desempeño en BrowseComp.
- MAST (Cemri et al., 2025): 14 modos de falla en 3 grupos: especificación, desalineación entre agentes y verificación.
- Fuentes: [Anthropic — How we built our multi-agent research system (Jun 2025)](https://www.anthropic.com/research/multi-agent-research-system) · [Cognition — Don't Build Multi-Agents (Jun 2025)](https://cognition.com/blog/dont-build-multi-agents) · [Cemri et al. — Why Do Multi-Agent LLM Systems Fail? (2025)](https://arxiv.org/abs/2503.13657)

### [ ] Computer use y agentes de navegador — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/computer-use/) · `content/concepts/agents/computer-use.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- OSWorld: personas ~72%; Claude 3.5 Sonnet ~15% (oct. 2024); OpenAI CUA 38.1% (ene. 2025); Claude Sonnet 4.5 61.4% (sep. 2025, OSWorld-Verified); Claude Opus 4.6 72.7% (feb. 2026, reportado).
- OpenAI CUA (ene. 2025): 58.1% en WebArena y 87% en WebVoyager; las tareas web curadas son más fáciles que un escritorio completo.
- Costo de imagen en Claude = ⌈ancho/28⌉ × ⌈alto/28⌉ tokens visuales (parches de 28 px, ≈ ancho × alto / 750): una captura de 1280×800 ≈ 1,334 tokens, en cada paso; los modelos Claude 4.7+ admiten hasta 2,576 px y 4,784 tokens por imagen (docs, nov. 2026).
- Piloto de Claude for Chrome (ago. 2025): el éxito de ataques de prompt injection bajó de 23.6% a 11.2% con mitigaciones; menos, pero no cero.
- Fuentes: [Anthropic — Introducing computer use, a new Claude 3.5 Sonnet, and Claude 3.5 Haiku](https://www.anthropic.com/news/3-5-models-and-computer-use) · [OpenAI — Computer-Using Agent](https://openai.com/index/computer-using-agent/) · [Xie et al. — OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments (2024)](https://arxiv.org/abs/2404.07972) · [Anthropic — Piloting Claude in Chrome (Aug 2025)](https://claude.com/resources/articles/claude-for-chrome)

### [ ] Ejecución durable para agentes — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/durable-agents/) · `content/concepts/agents/durable-agents.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- AWS Step Functions: los workflows Standard corren hasta 1 año; los Express, hasta 5 minutos.
- Step Functions limita a 256 KB la entrada/salida de cada estado: guarda las conversaciones en S3 y pasa punteros.
- Temporal: el historial de eventos tiene un tope de 51,200 eventos o 50 MB por ejecución; usa Continue-As-New en agentes largos.
- Stripe puede borrar las claves de idempotencia después de 24 horas: es una ventana de reintento, no una garantía eterna.
- Fuentes: [Temporal docs — Temporal Workflow](https://docs.temporal.io/workflows) · [LangGraph — Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) · [AWS — What is Step Functions?](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html) · [Stripe API — Idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## Evaluación (14)

### [ ] Eval-driven development (desarrollo guiado por evals) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/eval-driven-development/) · `content/concepts/evals/eval-driven-development.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: empieza con ~20–50 casos sacados de fallas reales; los cientos llegan después, desde las trazas de producción.
- Piso de ruido: con n=100 y 80% de aprobación, el IC del 95% es de ~±8 puntos; con n=1.000, de ~±2,5.
- Los tres niveles de Hamel Husain: aserciones en cada commit → eval humano y con modelos de forma periódica → tests A/B para cambios grandes.
- Fuentes: [Hamel Husain — Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) · [Eugene Yan — Task-Specific LLM Evals that Do & Don't Work](https://eugeneyan.com/writing/evals/) · [Hamel Husain — A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/) · [Anthropic — Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)

### [ ] Análisis de errores: mira tus datos — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/error-analysis/) · `content/concepts/evals/error-analysis.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: revisa ~100 trazas por ronda y sigue hasta que las trazas nuevas dejen de revelar modos de falla nuevos.
- Forma típica (regla práctica): unos pocos modos, a menudo 3–6, cubren la mayoría de las fallas: Pareto, no uniforme.
- Esfuerzo (regla práctica): con un buen visor de trazas, 100 trazas son unas horas de lectura, no días.
- Fuentes: [Hamel Husain — A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/) · [Hamel Husain & Shreya Shankar — Frequently Asked Questions About AI Evals](https://hamel.dev/blog/posts/evals-faq/) · [Shankar et al. — Who Validates the Validators? (2024)](https://arxiv.org/abs/2404.12272)

### [ ] Golden datasets y sets de prueba — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/golden-datasets/) · `content/concepts/evals/golden-datasets.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: empieza con ~50–200 casos; crece hacia varios cientos o ~1.000 a medida que se multiplican los segmentos.
- Con 80% de aprobación, el IC del 95% es de ~±8 puntos con 100 casos y de ~±4 con 400.
- Un segmento de 25 casos con 80% tiene un IC del 95% de ~±16 puntos: leer por segmento exige más casos o efectos más grandes.
- Regla práctica: ~10–20% de casos sin respuesta o fuera de alcance, para que la abstención realmente se pruebe.
- Fuentes: [Hamel Husain — Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) · [Anthropic — Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) · [Hamel Husain & Shreya Shankar — Frequently Asked Questions About AI Evals](https://hamel.dev/blog/posts/evals-faq/)

### [ ] Graders basados en código y aserciones — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/deterministic-graders/) · `content/concepts/evals/deterministic-graders.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- HumanEval: 164 problemas de Python escritos a mano, calificados con tests unitarios y reportados como pass@k (Chen et al., 2021).
- pass@k insesgado con n muestras y c correctas: 1 − C(n−c, k) / C(n, k), promediado sobre los problemas.
- SWE-bench: 2.294 issues reales de GitHub de 12 repos de Python, calificados corriendo los tests de cada repo.
- Brecha de costo: un chequeo en código toma ~milisegundos y $0; una llamada a un juez, ~segundos más tokens, en cada caso y cada corrida.
- Fuentes: [Anthropic — Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) · [promptfoo — Assertions & metrics](https://www.promptfoo.dev/docs/configuration/expected-outputs/) · [Chen et al. — Evaluating Large Language Models Trained on Code (HumanEval)](https://arxiv.org/abs/2107.03374) · [Jimenez et al. — SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](https://arxiv.org/abs/2310.06770)

### [ ] LLM como juez (LLM-as-a-judge) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/llm-as-judge/) · `content/concepts/evals/llm-as-judge.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Zheng et al. (2023): en MT-Bench, GPT-4 como juez coincidió con expertos humanos en >80% de los votos sin empate, más o menos lo que coinciden los humanos entre sí.
- Mismo paper: al invertir el orden de las respuestas, incluso GPT-4 mantuvo su veredicto solo ~65% de las veces.
- Regla práctica: calibra con ~100–200 ejemplos etiquetados por humanos; apunta a un TPR y TNR del juez de ~0,9 o más.
- Fuentes: [Zheng et al. — Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (2023)](https://arxiv.org/abs/2306.05685) · [Liu et al. — G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment (2023)](https://arxiv.org/abs/2303.16634) · [Hamel Husain — Creating a LLM-as-a-Judge That Drives Business Results](https://hamel.dev/blog/posts/llm-judge/) · [Eugene Yan — Evaluating the Effectiveness of LLM-Evaluators (aka LLM-as-Judge)](https://eugeneyan.com/writing/llm-evaluators/)

### [ ] Evaluación humana y anotación — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/human-eval/) · `content/concepts/evals/human-eval.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Bandas de kappa de Landis y Koch (1977): 0,41–0,60 moderada, 0,61–0,80 sustancial, 0,81–1,00 casi perfecta.
- Por qué kappa: si ambos evaluadores marcan ~90% PASS, la concordancia por azar es 82%, así que un 90% de coincidencia es apenas κ ≈ 0,44.
- Regla práctica: ~50 ítems con doble etiqueta para estimar la concordancia; ~100–200 etiquetas para calibrar un juez.
- Fuentes: [Shankar et al. — Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences (2024)](https://arxiv.org/abs/2404.12272) · [Landis & Koch — The Measurement of Observer Agreement for Categorical Data (Biometrics, 1977)](https://www.jstor.org/stable/2529310) · [Label Studio documentation](https://labelstud.io/guide/) · [Argilla documentation](https://docs.argilla.io/)

### [ ] Precisión, recall, F1 y ROC-AUC — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/classification-metrics/) · `content/concepts/evals/classification-metrics.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- F1 = 2PR / (P + R): precisión 0,9 con recall 0,5 da F1 ≈ 0,64, no el promedio de 0,7.
- Tasa base: con 1% de prevalencia, 99% de recall y 1% de falsos positivos dan apenas ~50% de precisión.
- Líneas base aleatorias: ROC-AUC = 0,5 con cualquier balance de clases; PR-AUC = la tasa de positivos (p. ej. 0,01).
- Con 1% de positivos, un modelo que siempre dice negativo saca 99% de accuracy y 0 de recall.
- Fuentes: [scikit-learn — Metrics and scoring: quantifying the quality of predictions](https://scikit-learn.org/stable/modules/model_evaluation.html) · [Saito & Rehmsmeier — The Precision-Recall Plot Is More Informative than the ROC Plot When Evaluating Binary Classifiers on Imbalanced Datasets (PLOS ONE, 2015)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0118432)

### [ ] No determinismo: pass@k y varianza — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/nondeterminism/) · `content/concepts/evals/nondeterminism.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Semiancho del IC 95% ≈ 1,96·√(p(1−p)/n): con 50%, n=100 → ±~10 pts; n=400 → ±~5; n=1.000 → ±~3.
- pass^k ≈ p^k con intentos independientes: 90% por corrida → ~73% para 3 seguidos y ~59% para 5.
- Codex (2021): 28,8% de HumanEval con 1 muestra y 70,2% con 100 muestras por problema.
- τ-bench (2024): GPT-4o resolvió <50% de las tareas y su pass^8 cayó por debajo de 25% en el dominio retail.
- Fuentes: [Chen et al. — Evaluating Large Language Models Trained on Code (pass@k)](https://arxiv.org/abs/2107.03374) · [Yao et al. — τ-bench: tool-agent-user interaction benchmark (pass^k)](https://arxiv.org/abs/2406.12045) · [Miller — Adding Error Bars to Evals](https://arxiv.org/abs/2411.00640) · [Thinking Machines — Defeating Nondeterminism in LLM Inference](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/)

### [ ] Evaluación offline vs. online — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/offline-online-evals/) · `content/concepts/evals/offline-online-evals.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: canary con ~1–5% de los usuarios y luego rampas escalonadas (p. ej., 25% → 50% → 100%) condicionadas a los guardrails.
- La precisión del juez depende del volumen, no del porcentaje: ~400 trazas juzgadas dan ±~5 pts al 95% y ~100 dan ±~10.
- Estudio de GitHub Copilot (Ziegler et al., 2022): la tasa de aceptación de sugerencias mostradas predijo la productividad percibida mejor que otras métricas de uso.
- Fuentes: [Ziegler et al. — Productivity Assessment of Neural Code Completion](https://arxiv.org/abs/2205.06537) · [Hamel Husain — Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) · [Google SRE Workbook — Canarying Releases](https://sre.google/workbook/canarying-releases/) · [Eugene Yan — Patterns for Building LLM-based Systems & Products](https://eugeneyan.com/writing/llm-patterns/)

### [ ] Benchmarks públicos y contaminación — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/benchmarks/) · `content/concepts/evals/benchmarks.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tamaños: HumanEval 164 problemas; GPQA Diamond 198; SWE-bench Verified 500; MMLU ~16 mil preguntas en 57 materias.
- SWE-bench (2023): el mejor modelo resolvió 1,96% de los issues; a fines de 2025, los mejores modelos reportaban ~80% en SWE-bench Verified (cada proveedor con su propio harness).
- GPQA: expertos con doctorado (terminado o en curso) sacan ~65% (~74% sin contar errores evidentes); no expertos capacitados con acceso a la web, ~34%.
- MMLU-Redux (2024): ~6,5% de las preguntas de MMLU tienen errores, así que las diferencias cerca de 90% miden en parte ruido de etiquetas.
- Paper de GPT-3 (2020): midió la contaminación como solapamiento de 13-gramas entre ítems del benchmark y datos de entrenamiento.
- Fuentes: [Rein et al. — GPQA: A Graduate-Level Google-Proof Q&A Benchmark](https://arxiv.org/abs/2311.12022) · [Jimenez et al. — SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](https://arxiv.org/abs/2310.06770) · [Jain et al. — LiveCodeBench: Holistic and Contamination Free Evaluation of LLMs for Code](https://arxiv.org/abs/2403.07974) · [Gema et al. — Are We Done with MMLU? (MMLU-Redux)](https://arxiv.org/abs/2406.04127)

### [ ] Evals en CI/CD y gates de release — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/eval-ci/) · `content/concepts/evals/eval-ci.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: subconjunto de PR de ~50–200 casos en menos de ~10 minutos; suite completa cada noche y antes de cada release.
- Piso de ruido: con n=200 y 85% de aciertos, el IC 95% de una corrida es de ±~5 pts. Pon los umbrales de regresión por encima o agrega intentos.
- Los snapshots con fecha (p. ej., gpt-4o-2024-08-06) no cambian; los alias como gpt-4o se reasignan a snapshots más nuevos con el tiempo.
- Fuentes: [promptfoo — CI/CD integration](https://www.promptfoo.dev/docs/integrations/ci-cd/) · [OpenAI Evals (GitHub)](https://github.com/openai/evals) · [Braintrust — Documentation](https://docs.braintrust.dev/) · [Hamel Husain — Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/)

### [ ] Medir alucinaciones y groundedness — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/groundedness/) · `content/concepts/evals/groundedness.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Faithfulness de RAGAS = afirmaciones respaldadas por el contexto recuperado ÷ total de afirmaciones de la respuesta (0–1).
- FActScore (Min et al., 2023): solo ~58% de los hechos atómicos en biografías generadas por ChatGPT estaban respaldados.
- Vectara HHEM puntúa cada par (fuente, afirmación) de 0 (alucinado) a 1 (consistente); 0,5 es un corte común; ajústalo con datos etiquetados.
- Fuentes: [Es et al. — RAGAS: Automated Evaluation of Retrieval Augmented Generation (2023)](https://arxiv.org/abs/2309.15217) · [Manakul et al. — SelfCheckGPT: Zero-Resource Black-Box Hallucination Detection for Generative Large Language Models (2023)](https://arxiv.org/abs/2303.08896) · [Min et al. — FActScore: Fine-grained Atomic Evaluation of Factual Precision in Long Form Text Generation (2023)](https://arxiv.org/abs/2305.14251) · [Vectara — HHEM (Hughes Hallucination Evaluation Model) model card](https://huggingface.co/vectara/hallucination_evaluation_model)

### [ ] Evaluar agentes — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/agent-evals/) · `content/concepts/evals/agent-evals.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- τ-bench (Yao et al., 2024): agentes con function calling sobre gpt-4o resolvieron <50% de las tareas, y pass^8 fue <25% en el dominio retail.
- Intentos independientes con 90% de éxito cada uno: pass^8 = 0,9^8 ≈ 43%, mientras que pass@8 ≈ 100%.
- SWE-bench: 2.294 issues reales de GitHub de 12 repos de Python, calificados con los tests del repo; SWE-bench Verified es un subconjunto de 500 tareas validado por humanos.
- Regla práctica: empieza con 20–50 tareas sacadas de fallas reales, con 3–10 intentos cada una.
- Fuentes: [Yao et al. — τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains (2024)](https://arxiv.org/abs/2406.12045) · [Jimenez et al. — SWE-bench: Can Language Models Resolve Real-World GitHub Issues? (2023)](https://arxiv.org/abs/2310.06770) · [OpenAI — Introducing SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/) · [Chen et al. — Evaluating Large Language Models Trained on Code (pass@k, 2021)](https://arxiv.org/abs/2107.03374)

### [ ] A/B testing de funcionalidades con LLM — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/ab-testing/) · `content/concepts/evals/ab-testing.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla de Lehr: n por grupo ≈ 16·p(1−p)/δ² (potencia 80%, α=0,05). Base 50%: +2 pts → ~10.000 por grupo; +1 pt → ~40.000.
- Peeking: 10 revisiones intermedias con p < 0,05 llevan la tasa real de falsos positivos a ~19% (Armitage et al.).
- 20 métricas con α=0,05 → ~64% de probabilidad de que al menos una muestre una falsa "mejora" (1 − 0,95²⁰).
- CUPED en Microsoft (Deng et al., 2013): ~50% menos varianza en algunas métricas de Bing, la misma potencia con ~la mitad del tráfico.
- Regla práctica: corre al menos 1–2 semanas completas para cubrir los ciclos semanales y dejar que pase la novedad.
- Fuentes: [Evan Miller — How Not To Run an A/B Test](https://www.evanmiller.org/how-not-to-run-an-ab-test.html) · [Johari et al. — Always Valid Inference: Bringing Sequential Analysis to A/B Testing](https://arxiv.org/abs/1512.04922) · [Kohavi, Tang, Xu — Trustworthy Online Controlled Experiments](https://experimentguide.com/)

## Fine-tuning y adaptación (13)

### [ ] Prompt → RAG → fine-tuning: la decisión — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/adaptation-ladder/) · `content/concepts/training/adaptation-ladder.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- LIMA: ~1,000 ejemplos curados le enseñaron a LLaMA-65B el formato de asistente (Zhou et al., 2023).
- InstructGPT: los evaluadores prefirieron un modelo ajustado de 1.3B sobre GPT-3 de 175B. La adaptación puede ganarle al tamaño.
- Diferencia de precio entre un modelo frontera y su hermano pequeño: a menudo ~10–20× por token (GPT-4o vs GPT-4o mini era ~16× con los precios de lista de fines de 2024).
- Guía de SFT de OpenAI: al menos 10 ejemplos, mejoras desde 50–100 (su plataforma cerró a nuevos usuarios en 2026).
- Fuentes: [Ovadia et al. — Fine-Tuning or Retrieval? Comparing Knowledge Injection in LLMs](https://arxiv.org/abs/2312.05934) · [Gekhman et al. — Does Fine-Tuning LLMs on New Knowledge Encourage Hallucinations?](https://arxiv.org/abs/2405.05904) · [Zhang et al. — RAFT: Adapting Language Model to Domain Specific RAG](https://arxiv.org/abs/2403.10131) · [OpenAI — Optimizing LLMs for accuracy](https://developers.openai.com/api/docs/guides/optimizing-llm-accuracy)

### [ ] Fine-tuning supervisado (SFT) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/sft/) · `content/concepts/training/sft.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- LIMA: ~1,000 ejemplos curados alinearon a LLaMA-65B de forma competitiva (Zhou et al., 2023).
- El set de SFT de InstructGPT tenía apenas ~13k prompts con respuestas escritas por evaluadores.
- Guía de SFT de OpenAI: mínimo 10 ejemplos; las mejoras suelen aparecer desde 50–100 (plataforma cerrada a nuevos usuarios, 2026).
- Regla práctica: 1–3 épocas; LR ~1e-5–2e-5 completo, ~1e-4–2e-4 con LoRA.
- Qi et al. (2023): 10 ejemplos adversarios (<$0.20) deshicieron el ajuste de seguridad de GPT-3.5 Turbo.
- Fuentes: [Zhou et al. — LIMA: Less Is More for Alignment](https://arxiv.org/abs/2305.11206) · [Hugging Face TRL — SFT Trainer](https://huggingface.co/docs/trl/sft_trainer) · [Qi et al. — Fine-tuning Aligned Language Models Compromises Safety, Even When Users Do Not Intend To!](https://arxiv.org/abs/2310.03693) · [OpenAI — Supervised fine-tuning guide](https://developers.openai.com/api/docs/guides/supervised-fine-tuning)

### [ ] LoRA y QLoRA — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/lora/) · `content/concepts/training/lora.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- LoRA en GPT-3 175B: ~10,000× menos parámetros entrenables, ~3× menos memoria de GPU, checkpoint de 350 GB → ~35 MB.
- QLoRA: modelo de 65B ajustado en una GPU de 48 GB, igualando al fine-tuning en 16 bits (Dettmers et al., 2023).
- Modelo de 8B, r=16 en todas las capas lineales: ~42M parámetros entrenables, cerca del 0.5%.
- Regla práctica: r = 8–64, alpha ≈ r a 2r, LR ~1e-4–2e-4.
- S-LoRA: miles de adapters concurrentes servidos sobre un único modelo base compartido.
- Fuentes: [Hu et al. — LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) · [Dettmers et al. — QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314) · [Sheng et al. — S-LoRA: Serving Thousands of Concurrent LoRA Adapters](https://arxiv.org/abs/2311.03285) · [Biderman et al. — LoRA Learns Less and Forgets Less](https://arxiv.org/abs/2405.09673)

### [ ] Destilación de conocimiento — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/distillation/) · `content/concepts/training/distillation.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- DistilBERT: ~40% más pequeño (66M contra 110M parámetros), ~60% más rápido y conserva ~97% del desempeño de BERT en GLUE.
- DeepSeek-R1-Distill-Qwen-32B: 72.6% de pass@1 en AIME 2024 contra 63.6% de o1-mini, solo con SFT sobre ~800 mil muestras curadas con R1.
- Mismo paper: destilar R1 en Qwen-32B superó a aplicarle RL a gran escala directamente (72.6% contra ~47% en AIME).
- Los soft targets de Hinton usan una temperatura T > 1 y escalan la pérdida suave por T² para mantener gradientes comparables.
- Fuentes: [Hinton, Vinyals, Dean — Distilling the Knowledge in a Neural Network](https://arxiv.org/abs/1503.02531) · [Sanh et al. — DistilBERT, a distilled version of BERT](https://arxiv.org/abs/1910.01108) · [DeepSeek-AI — DeepSeek-R1 (includes distilled Qwen and Llama models)](https://arxiv.org/abs/2501.12948) · [Agarwal et al. — On-Policy Distillation of Language Models (GKD)](https://arxiv.org/abs/2306.13649)

### [ ] Datos sintéticos — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/synthetic-data/) · `content/concepts/training/synthetic-data.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Self-Instruct: 175 tareas semilla humanas crecieron a ~52 mil instrucciones; Alpaca de Stanford lo reprodujo con menos de $500 de llamadas a la API.
- Nemotron-4 340B: más del 98% de los datos usados en su proceso de alineación fueron sintéticos.
- phi-1 (1.3B): 50.6% de pass@1 en HumanEval, entrenado con ~6B tokens web filtrados más ~1B tokens de libros de texto y ejercicios escritos por GPT-3.5.
- Persona Hub: mil millones de personas (~13% de la población mundial) para diversificar la generación.
- Fuentes: [Wang et al. — Self-Instruct: Aligning Language Models with Self-Generated Instructions](https://arxiv.org/abs/2212.10560) · [Xu et al. — WizardLM: Empowering Large Pre-Trained Language Models to Follow Complex Instructions (Evol-Instruct)](https://arxiv.org/abs/2304.12244) · [Ge et al. — Scaling Synthetic Data Creation with 1,000,000,000 Personas](https://arxiv.org/abs/2406.20094) · [Shumailov et al. — The Curse of Recursion: Training on Generated Data Makes Models Forget](https://arxiv.org/abs/2305.17493)

### [ ] RLHF: aprendizaje por refuerzo con retroalimentación humana — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/rlhf/) · `content/concepts/training/rlhf.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- InstructGPT: los evaluadores prefirieron el modelo RLHF de 1.3B sobre GPT-3 de 175B, con 100× menos parámetros.
- Datos de InstructGPT: ~13k prompts de SFT, ~33k para el reward model, ~31k para PPO, ~40 evaluadores contratados.
- InstructGPT ordenaba 4–9 respuestas por prompt, lo que da hasta 36 pares por ranking.
- Llama 2-Chat: más de 1M de comparaciones binarias humanas recolectadas por Meta.
- El RLHF con PPO mantiene 4 modelos: política, referencia, reward y value (crítico). DPO necesita 2.
- Fuentes: [Ouyang et al. — Training language models to follow instructions with human feedback (InstructGPT)](https://arxiv.org/abs/2203.02155) · [Schulman et al. — Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347) · [Gao, Schulman, Hilton — Scaling Laws for Reward Model Overoptimization](https://arxiv.org/abs/2210.10760) · [Sharma et al. — Towards Understanding Sycophancy in Language Models](https://arxiv.org/abs/2310.13548)

### [ ] DPO y optimización por preferencias — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/dpo/) · `content/concepts/training/dpo.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- β ≈ 0.1 es el valor por defecto habitual (el de TRL); los barridos suelen ir de ~0.01 a 0.5.
- Memoria: el RLHF con PPO carga 4 modelos (política, referencia, recompensa y valor); DPO carga 2; ORPO y SimPO, 1.
- Zephyr-7B: SFT + DPO con ~60 mil pares de UltraFeedback calificados por GPT-4 superó a Llama-2-70B-chat en MT-Bench.
- El post-training de Llama 3 eligió DPO en vez de PPO por requerir menos cómputo a gran escala y seguir mejor las instrucciones.
- Regla práctica: learning rate de ~5e-7 a 1e-6 en fine-tuning completo, muy por debajo del ~1e-5 del SFT.
- Fuentes: [Rafailov et al. — Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290) · [Ethayarajh et al. — KTO: Model Alignment as Prospect Theoretic Optimization](https://arxiv.org/abs/2402.01306) · [Meng et al. — SimPO: Simple Preference Optimization with a Reference-Free Reward](https://arxiv.org/abs/2405.14734) · [Hugging Face TRL — DPO Trainer](https://huggingface.co/docs/trl/dpo_trainer)

### [ ] RL con recompensas verificables (GRPO) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/rlvr/) · `content/concepts/training/rlvr.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- DeepSeek-R1-Zero: el pass@1 en AIME 2024 subió de 15.6% a 71.0% con RL puro (86.7% con voto por mayoría).
- Tamaño de grupo en GRPO: por lo común 8–64 muestras por prompt; el valor por defecto de TRL es 8.
- Regla práctica: conserva los prompts que el modelo resuelve ~10–90% de las veces; los grupos que aciertan o fallan todos dan ventaja cero.
- GRPO se presentó en DeepSeekMath (feb. 2024); el término RLVR lo acuñó Tülu 3 de AI2 (nov. 2024).
- Fuentes: [Shao et al. — DeepSeekMath (introduces GRPO)](https://arxiv.org/abs/2402.03300) · [DeepSeek-AI — DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2501.12948) · [Lambert et al. — Tülu 3: Pushing Frontiers in Open Language Model Post-Training](https://arxiv.org/abs/2411.15124) · [Hugging Face TRL — GRPO Trainer](https://huggingface.co/docs/trl/grpo_trainer)

### [ ] Calidad y curación de datos de entrenamiento — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/data-curation/) · `content/concepts/training/data-curation.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- LIMA: 1000 ejemplos de SFT curados; sus respuestas igualaron o superaron a las de GPT-4 en el 43% de las comparaciones.
- Lee et al.: C4 contenía una oración de 61 palabras repetida más de 60 mil veces; deduplicar redujo ~10× el texto memorizado emitido literalmente.
- FineWeb-Edu: ~1.3T de los ~15T tokens de FineWeb, seleccionados por un clasificador entrenado con ~450 mil calificaciones de Llama-3-70B.
- DCLM-Baseline: un modelo de 7B llegó a 64% en MMLU 5-shot con 2.6T tokens, gracias sobre todo al filtrado basado en modelos.
- Mezcla final de pretraining de Llama 3: ~50% conocimiento general, 25% matemáticas y razonamiento, 17% código y 8% multilingüe.
- Fuentes: [Zhou et al. — LIMA: Less Is More for Alignment](https://arxiv.org/abs/2305.11206) · [Lee et al. — Deduplicating Training Data Makes Language Models Better](https://arxiv.org/abs/2107.06499) · [Penedo et al. — The FineWeb Datasets: Decanting the Web for the Finest Text Data at Scale](https://arxiv.org/abs/2406.17557) · [Gebru et al. — Datasheets for Datasets](https://arxiv.org/abs/1803.09010)

### [ ] Olvido catastrófico (catastrophic forgetting) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/catastrophic-forgetting/) · `content/concepts/training/catastrophic-forgetting.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Qi et al. 2023: 10 ejemplos adversariales y menos de USD 0.20 de fine-tuning por API rompieron las salvaguardas de seguridad de GPT-3.5 Turbo.
- Biderman et al. 2024: el fine-tuning completo aprende cambios de pesos de rango 10–100× mayor que las configuraciones típicas de LoRA.
- Regla práctica: 1–3 épocas en SFT; más épocas, más olvido.
- Regla práctica: replay de ~5–20% de datos generales en la mezcla de entrenamiento.
- Learning rates típicos: ~1e-5–2e-5 para fine-tuning completo, ~1e-4–2e-4 para LoRA.
- Fuentes: [Kirkpatrick et al. — Overcoming catastrophic forgetting in neural networks (EWC)](https://arxiv.org/abs/1612.00796) · [Biderman et al. — LoRA Learns Less and Forgets Less](https://arxiv.org/abs/2405.09673) · [Qi et al. — Fine-tuning Aligned Language Models Compromises Safety, Even When Users Do Not Intend To!](https://arxiv.org/abs/2310.03693)

### [ ] Fine-tuning de embeddings y rerankers — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/embedding-finetuning/) · `content/concepts/training/embedding-finetuning.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- MNRL: un batch de B pares le da a cada consulta B−1 negativos gratis dentro del batch; escala por defecto 20 (temperatura 0.05).
- Regla práctica: ~1k–10k pares buenos mueven un modelo de tamaño base (~110M); entrenar toma de minutos a una hora en una GPU.
- Regla práctica: muestrea hard negatives de los puestos ~10–50, no de los primeros, donde viven los falsos negativos.
- Costo de reindexar: 10M chunks × ~500 tokens = 5B tokens que volver a embeber tras cada cambio de modelo.
- Fuentes: [Karpukhin et al. — Dense Passage Retrieval for Open-Domain Question Answering (DPR)](https://arxiv.org/abs/2004.04906) · [Wang et al. — GPL: Generative Pseudo Labeling for Unsupervised Domain Adaptation of Dense Retrieval](https://arxiv.org/abs/2112.07577) · [Hugging Face — Training and Finetuning Embedding Models with Sentence Transformers v3](https://huggingface.co/blog/train-sentence-transformers) · [Sentence Transformers — Loss Overview](https://sbert.net/docs/sentence_transformer/loss_overview.html)

### [ ] Entrenamiento distribuido: DP, TP, PP, FSDP — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/distributed-training/) · `content/concepts/training/distributed-training.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Adam en precisión mixta ≈ 16 bytes/parámetro sin contar activaciones: 7B ≈ 112 GB, 70B ≈ 1.1 TB.
- ZeRO-3/FSDP: estado por GPU ≈ 16 × parámetros / N, con ~1.5× el volumen de comunicación de DDP.
- Burbuja del pipeline ≈ (p−1)/(m+p−1) del tiempo del paso: 4 etapas y 16 micro-batches → ~16% ocioso.
- NVLink en H100: ~900 GB/s por GPU frente a ~100 GB/s de un enlace InfiniBand de 400 Gb/s (ambos bidireccionales, ~9×): TP se queda dentro del nodo.
- Llama 3 405B: paralelismo 4D (TP, CP, PP, FSDP) en hasta 16K H100 con ~38–43% de MFU.
- Fuentes: [Rajbhandari et al. — ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](https://arxiv.org/abs/1910.02054) · [Narayanan et al. — Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM](https://arxiv.org/abs/2104.04473) · [Zhao et al. — PyTorch FSDP: Experiences on Scaling Fully Sharded Data Parallel](https://arxiv.org/abs/2304.11277) · [Hugging Face — The Ultra-Scale Playbook: Training LLMs on GPU Clusters](https://huggingface.co/spaces/nanotron/ultrascale-playbook)

### [ ] Continued pretraining (preentrenamiento continuo) — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/continued-pretraining/) · `content/concepts/training/continued-pretraining.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Cómputo de entrenamiento ≈ 6 × parámetros × tokens FLOPs: 8B parámetros con 10B tokens ≈ 4.8e20, ~340 horas de H100 al 40% de MFU.
- Code Llama: Llama 2 continuado con 500B tokens de código (+100B tokens de Python para la variante Python).
- Meditron: Llama 2 continuado con ~48B tokens de texto médico.
- BloombergGPT: 50B parámetros entrenados desde cero con un corpus de 363B tokens financieros + 345B generales.
- Regla práctica: replay de ~5–25% de datos generales, más cuanto mayor sea el cambio, como un idioma nuevo.
- Fuentes: [Gururangan et al. — Don't Stop Pretraining: Adapt Language Models to Domains and Tasks](https://arxiv.org/abs/2004.10964) · [Ibrahim et al. — Simple and Scalable Strategies to Continually Pre-train Large Language Models](https://arxiv.org/abs/2403.08763) · [Rozière et al. — Code Llama: Open Foundation Models for Code](https://arxiv.org/abs/2308.12950) · [Wu et al. — BloombergGPT: A Large Language Model for Finance](https://arxiv.org/abs/2303.17564)

## Inferencia, serving y costos (17)

### [ ] Métricas de latencia: TTFT, TPOT, throughput — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/inference-metrics/) · `content/concepts/inference/inference-metrics.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- E2E ≈ TTFT + TPOT × (tokens de salida − 1); velocidad por usuario = 1/TPOT (20 ms → 50 tokens/s).
- Una persona lee ~200–300 palabras/min ≈ ~4–7 tokens/s; un stream de ~10+ tokens/s ya la supera.
- Límites de MLPerf Inference para Llama-2-70B en modo server (p99): TTFT ≤ 2 s y TPOT ≤ 200 ms; el escenario interactivo de v5.0 los baja a 450 ms y 40 ms.
- Regla práctica para chat: TTFT p95 por debajo de ~1 s y TPOT por debajo de ~50 ms (20+ tokens/s).
- Fuentes: [Databricks — LLM Inference Performance Engineering: Best Practices](https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices) · [Zhong et al. — DistServe: Disaggregating Prefill and Decoding for Goodput-optimized LLM Serving](https://arxiv.org/abs/2401.09670) · [MLCommons — MLPerf Inference: Datacenter](https://mlcommons.org/benchmarks/inference-datacenter/) · [vLLM — Benchmark CLI (vllm bench serve)](https://docs.vllm.ai/en/latest/benchmarking/cli/)

### [ ] Prefill vs. decode — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/prefill-decode/) · `content/concepts/inference/prefill-decode.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Una pasada ≈ 2 FLOPs por parámetro por token: un modelo de 8B que hace prefill de 2k tokens ≈ 32 TFLOPs.
- Decode con batch 1 ≈ 1 FLOP por byte de pesos en FP16; una H100 necesita ~300 (989 TFLOPS ÷ 3.35 TB/s) para quedar limitada por cómputo.
- El output cuesta ~4–8× el input en lista (precios de 2025): GPT-4o $2.50 vs. $10, Claude Sonnet $3 vs. $15 por millón de tokens.
- DistServe: hasta 7.4× más requests o SLOs 12.6× más estrictos que el serving con fases juntas, con >90% de los requests dentro del SLO.
- Fuentes: [Zhong et al. — DistServe: Disaggregating Prefill and Decoding for Goodput-optimized LLM Serving](https://arxiv.org/abs/2401.09670) · [Agrawal et al. — Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve](https://arxiv.org/abs/2403.02310) · [Patel et al. — Splitwise: Efficient Generative LLM Inference Using Phase Splitting](https://arxiv.org/abs/2311.18677) · [NVIDIA Dynamo (GitHub)](https://github.com/ai-dynamo/dynamo)

### [ ] Cálculo de memoria de GPU — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/gpu-memory-math/) · `content/concepts/inference/gpu-memory-math.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Pesos: 70B ≈ 140 GB en FP16, ~70 GB en FP8, ~35 GB en INT4 (+ escalas).
- KV por token en FP16: Llama-3-8B 128 KiB, Llama-3-70B 320 KiB.
- H100 SXM: 80 GB de HBM3 a ~3.35 TB/s; H200: 141 GB a ~4.8 TB/s; A100 80 GB: ~2 TB/s.
- Techo de decode con batch 1 = ancho de banda ÷ bytes de pesos: 7B en FP16 en una A100 ≈ 140 tokens/s.
- vLLM usa por defecto gpu_memory_utilization = 0.9: el 90% de cada GPU para pesos, activaciones y KV.
- Fuentes: [Kipply — Transformer Inference Arithmetic](https://kipp.ly/p/transformer-inference-arithmetic) · [Databricks — LLM Inference Performance Engineering: Best Practices](https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices) · [NVIDIA — H100 Tensor Core GPU](https://www.nvidia.com/en-us/data-center/h100/) · [Meta — The Llama 3 Herd of Models](https://arxiv.org/abs/2407.21783)

### [ ] Cuantización (INT8, INT4, FP8) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/quantization/) · `content/concepts/inference/quantization.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Bytes por parámetro: BF16 2, FP8/INT8 1, INT4 0.5. Un modelo de 70B ocupa ~140 / ~70 / ~35 GB, más ~5–10% de escalas.
- Regla práctica: techo del decode con batch 1 ≈ ancho de banda de HBM ÷ bytes de pesos. 8B en una H100 (3.35 TB/s): ~200 tok/s en BF16, aproximadamente 3× eso en INT4.
- GPTQ cuantizó modelos de 175B parámetros a 3–4 bits en ~4 horas de GPU.
- La doble cuantización de QLoRA ahorra ~0.37 bits por parámetro (~3 GB en un modelo de 65B).
- Fuentes: [Frantar et al. — GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers](https://arxiv.org/abs/2210.17323) · [Lin et al. — AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration](https://arxiv.org/abs/2306.00978) · [Dettmers et al. — QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314) · [Dettmers et al. — LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale](https://arxiv.org/abs/2208.07339)

### [ ] API vs self-hosting — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/api-vs-self-host/) · `content/concepts/inference/api-vs-self-host.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Un mes son ~730 horas: una GPU rentada las cobra todas, ocupada u ociosa.
- Costo por token con self-hosting = $/hora de GPU ÷ tokens por hora realmente servidos: si la utilización baja a la mitad, el costo unitario se duplica.
- Las APIs batch bajan el precio ~50% a cambio de resultados en hasta 24 h (OpenAI, Anthropic, Gemini).
- Ejemplo resuelto (supuestos en el código): ~$0.62/M al 60% de utilización vs $0.80/M por API → equilibrio en ~60–90B tokens al mes al contar la operación.
- Fuentes: [OpenAI — Data controls in the OpenAI platform](https://developers.openai.com/api/docs/guides/your-data) · [Amazon Bedrock — Data protection](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html) · [OpenAI — Batch API guide](https://developers.openai.com/api/docs/guides/batch) · [vLLM documentation](https://docs.vllm.ai/en/latest/)

### [ ] Economía de tokens y estimación de costos — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/token-economics/) · `content/concepts/inference/token-economics.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- ~4 caracteres ≈ 1 token ≈ 0.75 palabras en inglés (regla práctica de OpenAI).
- Salida ~4–8× la entrada en precios de lista de 2025 por 1M: GPT-4.1 $2/$8, Claude Sonnet 4 $3/$15, GPT-5 $1.25/$10.
- Lectura de entrada en caché: ~0.1× el precio base en Anthropic; 50–90% de descuento en OpenAI según el modelo.
- APIs batch: ~50% de descuento a cambio de resultados en hasta 24 h.
- Historial: si cada turno agrega k tokens, N turnos envían ~k·N²/2 tokens de entrada en total.
- Fuentes: [OpenAI — API pricing](https://openai.com/api/pricing/) · [Anthropic — Pricing](https://platform.claude.com/docs/en/about-claude/pricing) · [OpenAI — Batch API guide](https://developers.openai.com/api/docs/guides/batch) · [OpenAI — tiktoken](https://github.com/openai/tiktoken)

### [ ] Respuestas en streaming (SSE) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/streaming/) · `content/concepts/inference/streaming.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Límites de tiempo de respuesta de Nielsen: ~0.1 s se siente instantáneo, ~1 s mantiene el hilo, ~10 s pierde la atención. Apunta a un TTFT menor a ~1 s.
- Regla práctica: los modelos hospedados generan ~50–100 tokens de salida/s por stream, así que una respuesta de 500 tokens tarda 5–10 s sin streaming.
- Los navegadores permiten ~6 conexiones HTTP/1.1 por origen; los streams SSE abiertos cuentan, así que sírvelos por HTTP/2.
- El idle timeout por defecto de un ALB de AWS es de 60 s: envía comentarios de heartbeat durante pausas largas, como el razonamiento.
- Fuentes: [MDN — Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) · [OpenAI — Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses) · [Anthropic — Streaming Messages](https://platform.claude.com/docs/en/build-with-claude/streaming) · [nginx — proxy_buffering directive](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering)

### [ ] Inferencia batch (por lotes) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/batch-inference/) · `content/concepts/inference/batch-inference.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- OpenAI Batch y Anthropic Message Batches: ~50% de descuento sobre el precio estándar, resultados en menos de 24 h, a menudo mucho antes.
- Por batch: OpenAI hasta 50,000 peticiones y 200 MB; Anthropic hasta 100,000 peticiones o 256 MB.
- Anthropic guarda los resultados de un batch durante 29 días, y su descuento batch se suma al de prompt caching.
- Cálculo de costo: ítems × (tokens de entrada × precio de entrada + tokens de salida × precio de salida) × 0.5. Los tokens de salida suelen costar ~4–8× los de entrada.
- Fuentes: [OpenAI — Batch API guide](https://developers.openai.com/api/docs/guides/batch) · [Anthropic — Batch processing (Message Batches API)](https://platform.claude.com/docs/en/build-with-claude/batch-processing) · [vLLM — GitHub repository (offline batched inference)](https://github.com/vllm-project/vllm)

### [ ] Observabilidad y tracing de LLMs — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/llm-observability/) · `content/concepts/inference/llm-observability.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Atributos centrales de OTel GenAI: gen_ai.request.model, gen_ai.usage.input_tokens, gen_ai.usage.output_tokens. Capturar el contenido de los mensajes es opcional (opt-in).
- Regla práctica de muestreo: métricas del 100% de las peticiones; payloads completos de todos los errores y del feedback negativo, más ~1–10% del resto.
- Regla práctica: ~4 caracteres por token en inglés, así que el payload ocupa ~4 bytes × tokens por span.
- Cuatro dashboards: costo (por equipo, funcionalidad, modelo), latencia (TTFT y total en p50/p95/p99), errores (429, 5xx, timeouts, rechazos), calidad (feedback, scores de evals online).
- Fuentes: [OpenTelemetry — Semantic conventions for generative AI](https://opentelemetry.io/docs/specs/semconv/gen-ai/) · [Langfuse — Documentation](https://langfuse.com/docs) · [Arize Phoenix (open source)](https://github.com/Arize-ai/phoenix) · [OpenLLMetry — OpenTelemetry instrumentation for LLMs](https://github.com/traceloop/openllmetry)

### [ ] Continuous batching — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/continuous-batching/) · `content/concepts/inference/continuous-batching.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Orca: 36.9× más throughput que NVIDIA FasterTransformer con la misma latencia (GPT-3 175B).
- Benchmark de Anyscale: hasta ~23× más throughput que un static batching ingenuo (con vLLM), y además menor latencia p50.
- vLLM (PagedAttention + continuous batching): 2–4× más throughput que FasterTransformer y Orca con la misma latencia.
- Costo de un batch estático = secuencia más larga × tamaño del batch: una respuesta de 50 tokens junto a una de 1,000 desperdicia ~95% de su lugar.
- Fuentes: [Yu et al. — Orca: A Distributed Serving System for Transformer-Based Generative Models (OSDI 2022)](https://www.usenix.org/conference/osdi22/presentation/yu) · [Anyscale — How continuous batching enables 23x throughput in LLM inference](https://www.anyscale.com/blog/continuous-batching-llm-inference) · [Kwon et al. — Efficient Memory Management for LLM Serving with PagedAttention (vLLM)](https://arxiv.org/abs/2309.06180)

### [ ] PagedAttention y vLLM — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/paged-attention/) · `content/concepts/inference/paged-attention.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Los servidores previos a vLLM usaban solo el 20–38% de la memoria de KV en tokens reales; vLLM desperdicia menos de 4%.
- 2–4× de throughput frente a FasterTransformer/Orca con igual latencia (paper); hasta 24× frente a HF Transformers simple (blog de lanzamiento de vLLM).
- Compartir bloques reduce hasta 55% la memoria del muestreo paralelo y beam search (blog de vLLM).
- Valores por defecto: 16 tokens por bloque; `gpu_memory_utilization=0.9`.
- Fuentes: [Kwon et al. — Efficient Memory Management for Large Language Model Serving with PagedAttention (SOSP 2023)](https://arxiv.org/abs/2309.06180) · [vLLM blog — Easy, Fast, and Cheap LLM Serving with PagedAttention](https://vllm.ai/blog/2023-06-20-vllm)

### [ ] FlashAttention — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/flash-attention/) · `content/concepts/inference/flash-attention.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- A100: ~20 MB de SRAM en el chip a ~19 TB/s contra 40–80 GB de HBM a ~1.5–2 TB/s.
- FA-1: entrenamiento de GPT-2 3× más rápido con 1k tokens; 10–20× de ahorro de memoria de atención con 2k–4k.
- FA-2: ~2× FA-1, llega al 50–73% de los FLOPs/s pico de una A100.
- FA-3 en H100: 1.5–2× FA-2, hasta ~740 TFLOPs/s en FP16 (~75% de utilización), ~1.2 PFLOPs/s en FP8.
- Fuentes: [Dao et al. — FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://arxiv.org/abs/2205.14135) · [Dao — FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning](https://arxiv.org/abs/2307.08691) · [Shah et al. — FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision](https://arxiv.org/abs/2407.08608) · [Dao-AILab/flash-attention (GitHub)](https://github.com/Dao-AILab/flash-attention)

### [ ] Speculative decoding — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/speculative-decoding/) · `content/concepts/inference/speculative-decoding.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Leviathan et al.: 2–3× en T5-XXL con salidas idénticas; Chen et al.: 2–2.5× en Chinchilla 70B.
- Tokens esperados por pasada del objetivo = (1 − α^(k+1)) / (1 − α); aceptación α = 0.8, k = 4 → ~3.4.
- Medusa-2: 2.3–3.6×; EAGLE: 2.7–3.5× en LLaMA2-Chat 70B (papers).
- Multi-token prediction de DeepSeek-V3: 85–90% de aceptación del segundo token, ~1.8× tokens/s.
- Fuentes: [Leviathan et al. — Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192) · [Chen et al. — Accelerating Large Language Model Decoding with Speculative Sampling](https://arxiv.org/abs/2302.01318) · [Cai et al. — Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads](https://arxiv.org/abs/2401.10774) · [Li et al. — EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty](https://arxiv.org/abs/2401.15077)

### [ ] Stack de serving self-hosted — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/serving-stack/) · `content/concepts/inference/serving-stack.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Pesos ≈ parámetros × bytes: 70B en BF16 ≈ 140 GB → al menos 2 GPUs de 80 GB, normalmente 4 para dejar espacio al KV cache.
- vLLM reserva por defecto el 90% de la memoria de la GPU (`--gpu-memory-utilization 0.9`), casi todo para el KV cache.
- Paper de SGLang (2023): hasta 6.4× más throughput que los sistemas previos en cargas estructuradas que comparten prefijos.
- NVLink en H100 ~900 GB/s vs ~50 GB/s de una NIC de 400 Gb/s: por eso el tensor parallelism se queda dentro de un nodo.
- Piso del arranque en frío: 140 GB a ~1 GB/s son ~2.3 minutos solo de bytes, sin contar aprovisionar el nodo ni el warm-up.
- Fuentes: [vLLM documentation](https://docs.vllm.ai/en/latest/) · [Zheng et al. — SGLang: Efficient Execution of Structured Language Model Programs](https://arxiv.org/abs/2312.07104) · [NVIDIA Dynamo (GitHub)](https://github.com/ai-dynamo/dynamo) · [Sheng et al. — S-LoRA: Serving Thousands of Concurrent LoRA Adapters](https://arxiv.org/abs/2311.03285)

### [ ] Routing de modelos y cascadas — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/model-routing/) · `content/concepts/inference/model-routing.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- RouteLLM (LMSYS, 2024): más de 2× de reducción de costo con calidad similar; ~85% más barato que usar solo GPT-4 en MT Bench con el 95% de su calidad.
- FrugalGPT (2023): las cascadas igualaron la calidad de GPT-4 con hasta 98% menos costo en sus benchmarks.
- Costo de cascada = chico + P(escalar) × grande: un modelo 20× más barato con 25% de escalamiento cuesta ~30% de usar solo el grande.
- La diferencia de precio a aprovechar: GPT-4.1 $2 vs GPT-4.1-nano $0.10 por 1M de tokens de entrada (20×, lista de 2025).
- Fuentes: [Ong et al. — RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665) · [LMSYS — RouteLLM: An Open-Source Framework for Cost-Effective LLM Routing](https://lmsys.org/blog/2024-07-01-routellm/) · [Chen, Zaharia, Zou — FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance](https://arxiv.org/abs/2305.05176) · [LiteLLM — Routing and fallbacks](https://docs.litellm.ai/docs/routing)

### [ ] Semantic caching (caché semántica) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/semantic-caching/) · `content/concepts/inference/semantic-caching.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Umbral coseno típico ~0.90–0.95 con embeddings normalizados; ajústalo con pares de consultas etiquetados (regla práctica).
- Un hit = una llamada de embedding + una búsqueda vectorial: decenas de ms vs segundos de una generación.
- text-embedding-3-small: $0.02 por 1M de tokens (precio de lista de OpenAI, sin cambios a nov 2026), así que las búsquedas son casi gratis.
- Ahorro ≈ tasa de hit × costo del LLM: con 20% de hits ahorras ~20%, menos el costo de embeddings y almacenamiento.
- Fuentes: [Zilliz — GPTCache (GitHub)](https://github.com/zilliztech/GPTCache) · [Redis — RedisVL (GitHub)](https://github.com/redis/redis-vl-python) · [OpenAI — Embeddings guide](https://developers.openai.com/api/docs/guides/embeddings)

### [ ] LLM gateway (gateway de IA) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/llm-gateway/) · `content/concepts/inference/llm-gateway.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Los límites de los proveedores tienen dos ejes: requests/min y tokens/min (Anthropic separa TPM de entrada y de salida). Tus cuotas también deben tenerlos.
- Reintenta 429, 500/502/503, 529 (overloaded de Anthropic) y timeouts con backoff + jitter; nunca reintentes 400/401/403.
- Regla práctica: un gateway debería agregar pocos milisegundos por llamada, despreciable frente a cientos de ms de TTFT.
- LiteLLM expone más de 100 proveedores detrás del formato de la API de OpenAI.
- Fuentes: [LiteLLM — Proxy Server (LLM Gateway)](https://docs.litellm.ai/docs/simple_proxy) · [Agent Router (formerly Envoy AI Gateway) — documentation](https://theagentrouter.ai/) · [Cloudflare AI Gateway — documentation](https://developers.cloudflare.com/ai-gateway/) · [Portkey AI Gateway (open source)](https://github.com/Portkey-AI/gateway)

## Seguridad y gobernanza (13)

### [ ] Prompt injection (directa e indirecta) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/prompt-injection/) · `content/concepts/security/prompt-injection.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Término acuñado en septiembre de 2022 (Simon Willison); la inyección indirecta se formalizó en febrero de 2023 (Greshake et al.).
- #1 del OWASP Top 10 para apps con LLMs en todas las ediciones hasta ahora: 2023, 2025 y 2026 (LLM01).
- Regla práctica: un detector con 99% de acierto deja pasar 1 de cada 100 intentos, y los atacantes reintentan. En seguridad, 99% es reprobar.
- AgentDojo (2024), benchmark estándar para medir defensas: 97 tareas de agente y 629 casos de prueba de inyección.
- Fuentes: [Greshake et al. — Not what you've signed up for: Indirect Prompt Injection (2023)](https://arxiv.org/abs/2302.12173) · [Simon Willison — The Dual LLM pattern](https://simonwillison.net/2023/Apr/25/dual-llm-pattern/) · [Debenedetti et al. — Defeating Prompt Injections by Design (CaMeL, 2025)](https://arxiv.org/abs/2503.18813) · [Beurer-Kellner et al. — Design Patterns for Securing LLM Agents against Prompt Injections (2025)](https://arxiv.org/abs/2506.08837)

### [ ] La trifecta letal — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/lethal-trifecta/) · `content/concepts/security/lethal-trifecta.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- 3 patas; quitar cualquiera cierra esta vía de exfiltración (no las demás).
- 0 clics: una imagen markdown renderizada pide su URL automáticamente, un canal clásico de exfiltración.
- Rule of Two (Meta, oct. 2025): como máximo 2 de las 3 propiedades por sesión; las 3 juntas requieren supervisión humana.
- EchoLeak (CVE-2025-32711, junio de 2025): exfiltración sin clics desde Microsoft 365 Copilot con un solo correo manipulado.
- Fuentes: [Simon Willison — The lethal trifecta for AI agents (2025)](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) · [Beurer-Kellner et al. — Design Patterns for Securing LLM Agents against Prompt Injections (2025)](https://arxiv.org/abs/2506.08837) · [Debenedetti et al. — Defeating Prompt Injections by Design (CaMeL, 2025)](https://arxiv.org/abs/2503.18813) · [Meta — Agents Rule of Two: A Practical Approach to AI Agent Security (2025)](https://ai.meta.com/blog/practical-ai-agent-security/)

### [ ] Jailbreaks — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/jailbreaks/) · `content/concepts/security/jailbreaks.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Constitutional Classifiers (Anthropic, feb. 2025): éxito de jailbreaks automatizados de 86% a 4.4%, con +0.38% de rechazos y 23.7% de cómputo extra.
- Su bug bounty de 2024: 183 red-teamers, más de 3,000 horas y ningún jailbreak universal; la demo pública de febrero de 2025 (~3,700 horas) produjo uno.
- Many-shot (Anthropic, 2024): el éxito crece con la cantidad de ejemplos; una mitigación que clasifica el prompt bajó el éxito del ataque de 61% a 2%.
- Best-of-N (2024): con 10,000 intentos con variaciones aleatorias, ~89% de éxito en GPT-4o y ~78% en Claude 3.5 Sonnet. Los reintentos son el ataque.
- Constitutional Classifiers de nueva generación (Anthropic, ene. 2026): ~1% de cómputo extra, 0.05% de rechazos y más de 1,700 horas de red team sin jailbreak universal.
- Fuentes: [Anthropic — Many-shot jailbreaking (2024)](https://www.anthropic.com/research/many-shot-jailbreaking) · [Zou et al. — Universal and Transferable Adversarial Attacks on Aligned Language Models (GCG, 2023)](https://arxiv.org/abs/2307.15043) · [Russinovich et al. — Great, Now Write an Article About That: The Crescendo Multi-Turn LLM Jailbreak Attack (2024)](https://arxiv.org/abs/2404.01833) · [Sharma et al. — Constitutional Classifiers (2025)](https://arxiv.org/abs/2501.18837)

### [ ] OWASP Top 10 para apps con LLMs — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/owasp-llm-top10/) · `content/concepts/security/owasp-llm-top10.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- 10 riesgos, LLM01–LLM10; la edición vigente es la 2026 (publicada en agosto de 2026); las anteriores son la 2025 (nov. 2024) y la 2023.
- Prompt Injection es el #1 en las tres ediciones; Sensitive Information Disclosure es el #2 desde 2025.
- 2026: 8 de las 10 entradas cambiaron de posición; Excessive Agency subió del #6 al #3 e Improper Output Handling bajó del #5 al #10.
- 1 renombre en 2026: System Prompt Leakage (LLM07:2025) pasó a ser Hidden Context Exposure (LLM08:2026).
- OWASP Top 10 for Agentic Applications: diciembre de 2025, ASI01–ASI10, con ASI01 Agent Goal Hijack.
- Fuentes: [OWASP GenAI Security Project — OWASP GenAI LLM Top 10 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) · [OWASP GenAI Security Project — LLM Top 10 2026 source (GitHub)](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10) · [OWASP — LLM Top 10 2025 (previous edition)](https://genai.owasp.org/llm-top-10/) · [MITRE ATLAS — Adversarial Threat Landscape for AI Systems](https://atlas.mitre.org/)

### [ ] Guardrails: entrada, salida y acciones — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/guardrails/) · `content/concepts/security/guardrails.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Llama Guard 3: 8B con 14 categorías de riesgo de MLCommons (S1–S14), 1B con 13 (sin S14, abuso del intérprete de código); Llama Guard 4 (2025): 12B, multimodal, 14 categorías.
- Prompt Guard 2 de Meta, el clasificador de inyección y jailbreak, viene en 86M y 22M de parámetros: lo bastante barato para correr en cada request.
- Regla práctica: regex <1 ms, clasificador pequeño ~10–50 ms, guard basado en LLM ~0.2–1 s o más si corre en serie.
- El endpoint de moderación de OpenAI es gratuito.
- Fuentes: [Inan et al. — Llama Guard: LLM-based Input-Output Safeguard for Human-AI Conversations](https://arxiv.org/abs/2312.06674) · [NVIDIA NeMo Guardrails (GitHub)](https://github.com/NVIDIA/NeMo-Guardrails) · [Guardrails AI (GitHub)](https://github.com/guardrails-ai/guardrails) · [OpenAI Cookbook — How to use guardrails](https://developers.openai.com/cookbook/examples/how_to_use_guardrails)

### [ ] PII y privacidad de datos — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/pii-privacy/) · `content/concepts/security/pii-privacy.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Multas del GDPR: hasta €20M o el 4% de la facturación anual global, lo que sea mayor.
- GDPR: responde una solicitud de supresión o de acceso en 1 mes; notifica una brecha a la autoridad en 72 h.
- Los datos de la API de OpenAI no se usan para entrenar por defecto (desde marzo de 2023); los logs de monitoreo de abuso se guardan hasta 30 días salvo que tengas ZDR.
- vec2text recuperó exactamente el 92% de textos de 32 tokens a partir de sus embeddings: trata los embeddings como datos personales.
- Fuentes: [Microsoft Presidio — documentation](https://microsoft.github.io/presidio/) · [Regulation (EU) 2016/679 — General Data Protection Regulation](https://eur-lex.europa.eu/eli/reg/2016/679/oj) · [Morris et al. — Text Embeddings Reveal (Almost) As Much As Text](https://arxiv.org/abs/2310.06816) · [OpenAI — Your data: API data usage, retention and Zero Data Retention](https://developers.openai.com/api/docs/guides/your-data)

### [ ] IA responsable: sesgo, equidad, transparencia — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/responsible-ai/) · `content/concepts/security/responsible-ai.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla de los cuatro quintos (lineamientos de la EEOC de EE. UU., 1978): una tasa de selección menor al 80% de la del grupo más alto indica impacto adverso.
- Gender Shades (2018): clasificadores comerciales de género fallaban hasta un 34.7% con mujeres de piel oscura frente a 0.8% con hombres de piel clara.
- Las model cards las propusieron Mitchell et al. en 2019; las datasheets para datasets, Gebru et al. en 2018.
- Fuentes: [Mitchell et al. — Model Cards for Model Reporting](https://arxiv.org/abs/1810.03993) · [Gebru et al. — Datasheets for Datasets](https://arxiv.org/abs/1803.09010) · [Buolamwini & Gebru — Gender Shades (FAT* 2018)](https://proceedings.mlr.press/v81/buolamwini18a.html) · [Fairlearn — user guide](https://fairlearn.org/)

### [ ] Aislamiento multi-tenant en apps de IA — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/tenant-isolation/) · `content/concepts/security/tenant-isolation.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- ChatGPT, marzo de 2023: un bug de `redis-py` expuso datos de pago de ~1.2% de los suscriptores Plus activos en una ventana de 9 horas.
- OpenAI documenta que las caches de prompts no se comparten entre organizaciones.
- Carlini et al. (2021) extrajeron de GPT-2 cientos de secuencias textuales de entrenamiento, incluidos nombres, teléfonos y correos.
- Fuentes: [OpenAI — March 20 ChatGPT outage: Here's what happened](https://openai.com/index/march-20-chatgpt-outage/) · [Carlini et al. — Extracting Training Data from Large Language Models](https://arxiv.org/abs/2012.07805) · [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) · [OpenAI — Prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching)

### [ ] Red teaming de sistemas de IA — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/red-teaming/) · `content/concepts/security/red-teaming.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Anthropic publicó ~39k ataques de red team humanos (Ganguli et al., 2022), un set público para arrancar tu propia suite.
- PAIR, un LLM atacante que refina prompts contra el modelo objetivo, suele encontrar un jailbreak en menos de 20 consultas.
- Regla práctica: reporta la tasa de éxito de ataques (ASR) por categoría en cada release; cualquier hallazgo crítico abierto frena el lanzamiento.
- Regla práctica: vuelve a correr la suite automatizada en cada cambio de modelo, prompt o herramienta; una actualización puede reabrir fallas corregidas.
- Fuentes: [Microsoft PyRIT (GitHub)](https://github.com/microsoft/PyRIT) · [NVIDIA garak — LLM vulnerability scanner (GitHub)](https://github.com/NVIDIA/garak) · [promptfoo — LLM red teaming guide](https://www.promptfoo.dev/docs/red-team/) · [Ganguli et al. — Red Teaming Language Models to Reduce Harms](https://arxiv.org/abs/2209.07858)

### [ ] Cadena de suministro de modelos y datos — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/supply-chain/) · `content/concepts/security/supply-chain.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- ~250 documentos envenenados bastaron para plantar una puerta trasera en modelos de 600M a 13B parámetros, sin importar el tamaño (Anthropic, UK AISI, Instituto Turing, oct. 2025).
- Envenenar el 0.01% de LAION-400M comprando dominios vencidos habría costado ~60 USD (Carlini et al., 2023).
- Un estudio de 2024 encontró que ~20% de los paquetes sugeridos en código generado por LLM no existían: nombres que un atacante puede registrar.
- PyTorch 2.6 (enero de 2025) hizo que `torch.load(weights_only=True)` fuera el valor por defecto.
- En el OWASP LLM Top 10 de 2026, LLM04 es la cadena de suministro y LLM05 el envenenamiento de datos y del modelo (LLM03 y LLM04 en la edición 2025).
- Fuentes: [Hubinger et al. — Sleeper Agents: Training Deceptive LLMs that Persist Through Safety Training](https://arxiv.org/abs/2401.05566) · [Carlini et al. — Poisoning Web-Scale Training Datasets is Practical](https://arxiv.org/abs/2302.10149) · [Hugging Face — safetensors documentation](https://huggingface.co/docs/safetensors/index) · [Protect AI — ModelScan](https://github.com/protectai/modelscan)

### [ ] Alineación y Constitutional AI — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/alignment/) · `content/concepts/security/alignment.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- InstructGPT (2022): las respuestas del modelo de 1.3B con RLHF fueron preferidas a las de GPT-3 de 175B.
- Alignment faking (2024): Claude 3 Opus accedió a pedidos dañinos ~14% de las veces cuando creía que la conversación se usaría para entrenarlo, y casi nunca en el caso contrario.
- OpenAI revirtió una actualización aduladora de GPT-4o en abril de 2025, a días de lanzarla.
- Fuentes: [Bai et al. — Constitutional AI: Harmlessness from AI Feedback](https://arxiv.org/abs/2212.08073) · [Ouyang et al. — Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) · [Greenblatt et al. — Alignment faking in large language models](https://arxiv.org/abs/2412.14093) · [Sharma et al. — Towards Understanding Sycophancy in Language Models](https://arxiv.org/abs/2310.13548)

### [ ] EU AI Act (Ley de IA de la UE) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/eu-ai-act/) · `content/concepts/security/eu-ai-act.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Vigente desde el 1 de agosto de 2024; prohibiciones y alfabetización en IA desde el 2 de febrero de 2025; obligaciones GPAI desde el 2 de agosto de 2025; transparencia del Art. 50 desde el 2 de agosto de 2026.
- Digital Omnibus (Regl. (UE) 2026/1744, en vigor desde el 27 de julio de 2026): alto riesgo del Anexo III desde el 2 de diciembre de 2027, productos del Anexo I desde el 2 de agosto de 2028; nuevas prohibiciones NCII/CSAM desde el 2 de diciembre de 2026.
- Multas de hasta 35 M€ o 7% de la facturación anual mundial por prácticas prohibidas, y de hasta 15 M€ o 3% para la mayoría de los demás incumplimientos.
- Se presume riesgo sistémico en los modelos GPAI entrenados con más de 10²⁵ FLOPs.
- Logs de sistemas de alto riesgo: consérvalos al menos 6 meses, o más si otra ley lo exige.
- Fuentes: [EUR-Lex — Regulation (EU) 2024/1689 (Artificial Intelligence Act)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) · [European Commission — AI Act regulatory framework](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai) · [Future of Life Institute — EU AI Act Explorer](https://artificialintelligenceact.eu/) · [EUR-Lex — Regulation (EU) 2026/1744 (Digital Omnibus on AI, amending the AI Act)](https://eur-lex.europa.eu/eli/reg/2026/1744/oj)

### [ ] NIST AI RMF e ISO/IEC 42001 — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/ai-risk-frameworks/) · `content/concepts/security/ai-risk-frameworks.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- NIST AI RMF 1.0: publicado el 26 de enero de 2023; 4 funciones y 7 características de confiabilidad.
- NIST AI 600-1, Generative AI Profile (julio de 2024): 12 categorías de riesgo de IA generativa.
- ISO/IEC 42001 (diciembre de 2023): el Anexo A enumera 38 controles de referencia en 9 objetivos (A.2–A.10).
- La certificación ISO sigue un ciclo de 3 años con auditorías de seguimiento anuales.
- AI RMF 1.0 sigue siendo la versión vigente (nov. 2026); la revisión ordenada por el AI Action Plan de EE. UU. (julio de 2025) aún no tiene borrador público.
- Fuentes: [NIST — AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) · [NIST AI 100-1 — AI RMF 1.0](https://doi.org/10.6028/NIST.AI.100-1) · [NIST AI 600-1 — Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1) · [ISO — ISO/IEC 42001:2023 AI management systems](https://www.iso.org/standard/81230.html)

## Arquitectura de IA (9)

### [ ] Arquitectura de referencia de una app con LLMs — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/llm-reference-architecture/) · `content/concepts/architecture/llm-reference-architecture.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Datos de Databricks citados por BAIR (2024): el 60% de las apps de LLM usaba alguna forma de RAG y el 30% cadenas de varios pasos.
- La disponibilidad en serie se multiplica: una app de 99.9% sobre una API de modelo de 99.5% queda en ≈ 99.4% sin fallback.
- Regla práctica: la llamada al modelo domina la latencia y el costo; un gateway debería sumar solo unos pocos ms.
- Anthropic (2025): los agentes usan ~4× los tokens de una interacción de chat; los sistemas multiagente, ~15×.
- Fuentes: [BAIR — The Shift from Models to Compound AI Systems (2024)](https://bair.berkeley.edu/blog/2024/02/18/compound-ai-systems/) · [Chip Huyen — Building A Generative AI Platform (2024)](https://huyenchip.com/2024/07/25/genai-platform.html) · [a16z — Emerging Architectures for LLM Applications (2023)](https://a16z.com/emerging-architectures-for-llm-applications/) · [Anthropic — Building effective agents (2024)](https://www.anthropic.com/research/building-effective-agents)

### [ ] Calidad, latencia y costo: el triángulo de trade-offs — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/ai-tradeoff-triangle/) · `content/concepts/architecture/ai-tradeoff-triangle.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Guía de latencia de OpenAI: reducir a la mitad los tokens de salida puede bajar la latencia ~50%; reducir el prompt a la mitad, a menudo solo ~1–5%.
- Diferencia de precio dentro de una familia: GPT-4.1 $2 vs. GPT-4.1-nano $0.10 por 1M de tokens de entrada (20×, lista 2025).
- RouteLLM (2024): ~85% más barato que usar solo GPT-4 en MT Bench, con el 95% de su calidad.
- APIs batch: ~50% de descuento con resultados en 24 h. Lecturas de input en caché en Anthropic: ~0.1× el precio base.
- Límites de Nielsen: ~0.1 s se siente instantáneo, ~1 s mantiene el hilo de pensamiento, ~10 s pierde la atención.
- Fuentes: [OpenAI — Latency optimization guide](https://developers.openai.com/api/docs/guides/latency-optimization) · [Kapoor et al. — AI Agents That Matter (2024)](https://arxiv.org/abs/2407.01502) · [Ong et al. — RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665) · [Chen, Zaharia, Zou — FrugalGPT](https://arxiv.org/abs/2305.05176)

### [ ] Resiliencia: failover multiproveedor y degradación — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/llm-resilience/) · `content/concepts/architecture/llm-resilience.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Disponibilidad en serie: una app de 99.9% sobre una API de 99.5% ≈ 99.4%. Un fallback independiente sube la capa de modelos a ~99.997% (la independencia es optimista).
- The Tail at Scale (Google): una hedged request a los 10 ms bajó la latencia p99.9 de 1,800 ms a 74 ms con solo 2% más de requests.
- Google SRE: como máximo 3 intentos por request; mantén los reintentos por debajo de ~10% del tráfico de cada cliente.
- Postmortem de Anthropic (sept. 2025): un bug de enrutamiento degradó hasta el 16% de las requests a Sonnet 4 en la peor hora, sin devolver errores.
- Anthropic devuelve 429 por rate limit y 529 cuando está sobrecargado; reintenta ambos con backoff.
- Fuentes: [Amazon Builders' Library — Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) · [Dean & Barroso — The Tail at Scale (Google Research)](https://research.google/pubs/the-tail-at-scale/) · [Anthropic — A postmortem of three recent issues (2025)](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) · [Amazon Bedrock — Cross-Region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html)

### [ ] Capas de caché en un sistema de IA — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/ai-caching-layers/) · `content/concepts/architecture/ai-caching-layers.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Prompt caching de Anthropic: lecturas a ~0.1× del input base; TTL por defecto de 5 minutos que se renueva con cada hit, opción de 1 hora con escritura a 2×.
- OpenAI cachea prompts automáticamente desde 1,024 tokens; las cachés no se comparten entre organizaciones.
- Anthropic (2024): cachear un prompt de 100k tokens bajó el tiempo al primer token de 11.5 s a 2.4 s.
- Umbral de caché semántica ~0.90–0.95 de coseno (regla práctica); ajústalo con pares de consultas etiquetados.
- Latencia promedio = hit × caché + miss × origen: 30% de hits a 5 ms vs. misses de 3 s ≈ 2.1 s.
- Fuentes: [Anthropic — Prompt caching (docs)](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · [OpenAI — Prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching) · [vLLM — Automatic prefix caching (design)](https://docs.vllm.ai/en/latest/design/prefix_caching.html) · [Zheng et al. — SGLang: Efficient Execution of Structured Language Model Programs (RadixAttention)](https://arxiv.org/abs/2312.07104)

### [ ] Upgrades y deprecación de modelos — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/model-migrations/) · `content/concepts/architecture/model-migrations.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Anthropic: aviso de al menos 60 días antes de retirar un modelo público; Claude Sonnet 4.5 se marcó deprecated el 30 de septiembre de 2026 y se retira el 30 de noviembre de 2026.
- Mínimos que declara OpenAI (2026): al menos 6 meses para modelos GA, 3 meses para variantes especializadas y apenas ~2 semanas para los preview.
- Los snapshots recientes de Claude se retiraron ~1–2 años después de su lanzamiento (Sonnet 3.7: feb 2025 → feb 2026).
- Mismo nombre, otro comportamiento: la exactitud de GPT-4 para identificar primos pasó de 84% (marzo 2023) a 51% (junio 2023) según Chen et al.
- Regla práctica: shadow de al menos 1 semana y canary al 1–5% durante días, para que aparezcan los patrones semanales de tráfico.
- Fuentes: [Anthropic — Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations) · [OpenAI — Deprecations](https://developers.openai.com/api/docs/deprecations) · [Chen, Zaharia & Zou — How Is ChatGPT's Behavior Changing over Time?](https://arxiv.org/abs/2307.09009)

### [ ] El data flywheel — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/data-flywheel/) · `content/concepts/architecture/data-flywheel.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Cursor Tab (sep 2025): RL online sobre señales de aceptar/rechazar de más de 400M de requests diarios → 21% menos sugerencias y 28% más aceptación.
- Tesla (Karpathy, CVPR 2021): 221 triggers en shadow mode y 7 vueltas del data engine produjeron ~1M de clips de 10 segundos, ~6B de objetos etiquetados y 1.5 PB.
- Estudio de GitHub Copilot (Ziegler et al., 2022): la tasa de aceptación predijo la productividad percibida mejor que el tiempo que el código sobrevivía.
- API de OpenAI: los datos de clientes no se usan para entrenar por defecto desde el 1 de marzo de 2023. Revisa los términos de cada proveedor.
- Regla práctica: reserva ~10% del presupuesto de etiquetado para una muestra aleatoria, así los evals no heredan el sesgo de selección.
- Fuentes: [Cursor — Improving Cursor Tab with online RL](https://cursor.com/blog/tab-rl) · [IEEE Spectrum — Tesla's Autopilot Depends on a Deluge of Data](https://spectrum.ieee.org/tesla-autopilot-data-deluge) · [Ziegler et al. — Productivity Assessment of Neural Code Completion](https://arxiv.org/abs/2205.06537)

### [ ] Inferencia on-device y en el edge — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/edge-ai/) · `content/concepts/architecture/edge-ai.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Apple (2024): modelo on-device de ~3B, mezcla de 2 y 4 bits con ~3.7 bits por peso; ~0.6 ms por token de prompt y ~30 tokens/s en iPhone 15 Pro.
- Pesos ≈ parámetros × bits ÷ 8: 3B en 4 bits ≈ 1.5 GB; en 16 bits ≈ 6 GB, demasiado para la mayoría de los teléfonos.
- Regla práctica: tokens/s de decode ≲ ancho de banda de memoria ÷ bytes de pesos; ~50 GB/s ÷ 1.5 GB ≈ ~30 tokens/s.
- Los adaptadores LoRA por tarea de Apple (rango 16) sobre el modelo de 3B pesan decenas de MB, así una sola base sirve a muchas funcionalidades.
- Tesla HW3 (2019): dos chips FSD independientes, ~72 TOPS cada uno, ~144 TOPS por computadora.
- Fuentes: [Apple ML Research — Introducing Apple's On-Device and Server Foundation Models](https://machinelearning.apple.com/research/introducing-apple-foundation-models) · [Apple Security Research — Private Cloud Compute](https://security.apple.com/blog/private-cloud-compute/) · [PyTorch — Introducing ExecuTorch 1.0](https://pytorch.org/blog/introducing-executorch-1-0/) · [llama.cpp — LLM inference in C/C++](https://github.com/ggml-org/llama.cpp)

### [ ] Identidad y autorización para agentes — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/agent-authz/) · `content/concepts/architecture/agent-authz.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- El RFC 8693 (enero de 2020) define el token exchange de OAuth; su claim `act` registra quién actúa por quién.
- Las sesiones de rol de AWS STS duran de 15 min a 12 h, 1 h por defecto; el encadenamiento de roles las limita a 1 h.
- Los access tokens de Microsoft Entra duran por defecto un valor aleatorio de 60–90 minutos (75 en promedio).
- Spec de MCP: la autorización es opcional; los servidores HTTP que la usan son resource servers de OAuth 2.1 y deben rechazar tokens que no se emitieron para ellos.
- Confused deputy: lo nombró Norm Hardy en 1988 y sigue siendo el bug central de seguridad en agentes.
- Fuentes: [RFC 8693 — OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693) · [Model Context Protocol — Authorization (spec 2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) · [Microsoft identity platform — OAuth 2.0 On-Behalf-Of flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow) · [OWASP GenAI — LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)

### [ ] Búsqueda vectorial a escala de miles de millones — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/vector-search-scale/) · `content/concepts/architecture/vector-search-scale.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- 1B × 768 dimensiones: float32 ≈ 3.07 TB, int8 ≈ 0.77 TB, binario o PQ de 96 bytes ≈ 96 GB.
- DiskANN (NeurIPS 2019): 1B de puntos SIFT en una máquina con 64 GB de RAM más SSD, >5,000 QPS, <3 ms de latencia media y ≥95% de 1-recall@1.
- Hugging Face (mar 2024): la cuantización binaria conservó ~92.5% de la calidad de recuperación, ~96% con rescoring; int8 conservó ~97%.
- Amazon S3 Vectors (GA dic 2025): hasta 2B de vectores por índice; menos de 1 s en consultas poco frecuentes y ~100 ms o menos en las frecuentes.
- OpenAI (ene 2024): text-embedding-3-large truncado a 256 dimensiones todavía superó a ada-002 con 1,536 dimensiones en MTEB.
- Fuentes: [Subramanya et al. — DiskANN: Fast Accurate Billion-point Nearest Neighbor Search on a Single Node](https://www.microsoft.com/en-us/research/publication/diskann-fast-accurate-billion-point-nearest-neighbor-search-on-a-single-node/) · [Hugging Face — Binary and Scalar Embedding Quantization](https://huggingface.co/blog/embedding-quantization) · [Patel et al. — ACORN: Performant and Predicate-Agnostic Search Over Vector Embeddings and Structured Data](https://arxiv.org/abs/2403.04871) · [AWS — Amazon S3 Vectors is now generally available](https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-vectors-generally-available)

## Casos de diseño de sistemas de IA (21)

### [ ] El framework de diseño de sistemas GenAI — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/design-framework/) · `content/concepts/design/design-framework.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Reparto en 50 minutos: aclarar 6 · estimar 4 · arquitectura 9 · deep dives 14 · evaluación 5 · seguridad 4 · serving 3 · fallas 3 · cierre 2.
- QPS = requests/día ÷ 86,400: 1M/día ≈ 12 QPS en promedio; supón que el pico es ≈ 2–3× el promedio.
- Tokens/día = requests × (entrada + salida); en las APIs principales el token de salida cuesta ~4–8× el de entrada.
- Presupuesto de latencia de un chat (supuesto): recuperación ~150 ms + rerank ~100 ms + primer token ~0.5–1 s; el resto va en streaming.
- Las APIs batch (OpenAI, Anthropic) cuestan ~50% menos para trabajo que puede esperar hasta 24 h.
- Fuentes: [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) · [Eugene Yan — Patterns for Building LLM-based Systems & Products](https://eugeneyan.com/writing/llm-patterns/) · [Hamel Husain — Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) · [Chip Huyen — Building A Generative AI Platform](https://huyenchip.com/2024/07/25/genai-platform.html)

### [ ] Diseño: asistente de conocimiento empresarial — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-enterprise-rag/) · `content/concepts/design/case-enterprise-rag.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Corpus: 10M de documentos × ~4 chunks (supuesto) = 40M de chunks; 1,024 dimensiones en float32 ≈ 164 GB de vectores, ~41 GB en int8.
- Carga: 50k empleados × 40% activos al día × 5 preguntas = 100k/día ≈ 3.5 QPS en 8 horas hábiles, ~7 con un pico de 2×.
- LLM: 100k × (5k de entrada + 400 de salida) = 0.5B + 40M tokens/día ≈ $2.1k/día a un supuesto de $3/$15 por millón; ~$260 a $0.40/$1.60.
- Primer token: grupos 20 ms (en cache) + híbrida 120 ms + rerank 100 ms + prefill y cola ~700 ms ≈ 1 s.
- Re-embeber todo: 40M × 500 tokens = 20B de tokens ≈ $400 a $0.02 por millón; el costo real es la migración con dos índices.
- Fuentes: [Microsoft — Security filters for trimming results in Azure AI Search](https://learn.microsoft.com/en-us/azure/search/search-security-trimming-for-azure-search) · [Qdrant — Hybrid and multi-stage queries](https://qdrant.tech/documentation/search/hybrid-queries/) · [Anthropic — Introducing Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) · [Lewis et al. — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)

### [ ] Diseño: agente de soporte al cliente — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-support-agent/) · `content/concepts/design/case-support-agent.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Volumen: 1M de usuarios × 0.3 contactos/mes (supuesto) ≈ 300k conversaciones/mes ≈ 10k/día.
- Llamadas al LLM: 10k × ~6 = 60k/día; en 10 horas de actividad con un pico de 2×, ~3–4 llamadas/s.
- Tokens: ~6k de entrada por llamada (system, herramientas, historial) × 6 ≈ 36k de entrada + ~2k de salida por conversación → ~360M + 20M por día.
- Costo a un supuesto de $3/$15 por millón: ~$1.1k + $0.3k ≈ $1.4k/día (~$42k/mes) sin cache; las lecturas de cache cuestan ~10–50% del precio de entrada, según el proveedor.
- Stripe guarda las claves de idempotencia por al menos 24 h; los reintentos que puedan llegar después necesitan tu propia tabla de deduplicación.
- Fuentes: [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) · [Stripe API — Idempotent requests](https://docs.stripe.com/api/idempotent_requests) · [OWASP GenAI — LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) · [Temporal — Workflows](https://docs.temporal.io/workflows)

### [ ] Diseño: asistente tipo ChatGPT a escala — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-chat-assistant/) · `content/concepts/design/case-chat-assistant.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tráfico: 10M DAU × 15 mensajes/día = 150M/día ≈ 1.7k msg/s; ×3 en el pico ≈ 5k msg/s, o ~30k streams SSE abiertos a ~6 s por respuesta.
- Tokens: ~3k de entrada (system + historial + archivos) y ~400 de salida por mensaje → 450B de entrada + 60B de salida al día.
- Costo (precios supuestos): 85% chico a $0.15/$0.60 por 1M (~$88k) + 15% grande a $2.50/$10 (~$259k) ≈ $350k/día ≈ $10M/mes; el grande es 15% del tráfico y ~75% del costo.
- Almacenamiento: 150M mensajes × ~1.5 KB ≈ 225 GB/día ≈ 80 TB/año antes de replicar.
- Presupuesto de TTFT ~1 s: gateway 20 ms + historial 20 + recuperación de memoria/archivos 80 + router 20 + cola y prefill ~500; la seguridad corre en paralelo.
- Fuentes: [OpenAI — March 20 ChatGPT outage: Here's what happened](https://openai.com/index/march-20-chatgpt-outage/) · [MDN — Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) · [RouteLLM: Learning to Route LLMs with Preference Data (Ong et al., 2024)](https://arxiv.org/abs/2406.18665) · [Efficient Memory Management for LLM Serving with PagedAttention (Kwon et al., 2023)](https://arxiv.org/abs/2309.06180)

### [ ] Diseño: asistente de programación con IA — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-coding-assistant/) · `content/concepts/design/case-coding-assistant.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Presupuesto de autocompletado ~300 ms: debounce ~75 + red ~40 + prefill ~40 + 15 tokens × ~8 ms ≈ 275 ms (modelo FIM de ~7B, región cercana).
- Carga: 100k asientos × 40% escribiendo en el pico × 1 petición cada ~4 s tras el debounce ≈ 10k QPS de autocompletado.
- Dominado por el prefill: 10k QPS × ~2.6k tokens de entrada ≈ 26M tok/s de prefill vs ~200k tok/s de salida (~20 cada una), así que el prefix caching manda.
- Tarea del agente: 40 pasos × ~30k de contexto ≈ 1.2M tokens de entrada ≈ $3.60 a un supuesto de $3/1M sin caché, ~$0.70 con 90% de hits y lecturas de caché al 10% del precio, más ~$0.30 de salida (~500 por paso a $15/1M).
- Índice: 1M de líneas × ~10 tokens = 10M tokens ≈ 33k chunks de ~300 × 4 KB (float32 de 1,024 dims) ≈ 135 MB; regenerar todo cuesta ~$0.20 a $0.02/1M.
- Fuentes: [Efficient Training of Language Models to Fill in the Middle (Bavarian et al., 2022)](https://arxiv.org/abs/2207.14255) · [Productivity Assessment of Neural Code Completion (Ziegler et al., 2022)](https://arxiv.org/abs/2205.06537) · [SWE-bench: Can Language Models Resolve Real-World GitHub Issues? (Jimenez et al., 2023)](https://arxiv.org/abs/2310.06770) · [Tree-sitter documentation](https://tree-sitter.github.io/tree-sitter/)

### [ ] Diseño: búsqueda semántica de productos — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-semantic-search/) · `content/concepts/design/case-semantic-search.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tráfico: 30M búsquedas/día ÷ 86,400 ≈ 350 QPS en promedio; ×10 en una noche de temporada ≈ 3.5k QPS, y cada consulta toca todos los shards.
- Vectores: 50M × 768 dims × 4 B ≈ 154 GB en float32; en int8 ≈ 38 GB + ~6 GB de enlaces HNSW (M=16) por réplica.
- Presupuesto p99 de 200 ms: interpretación 15 + embedding 10 + recuperación 60 + features 15 + ranking 30 + facetas 20 + red/margen 50.
- Interpretaciones: 1M consultas frecuentes × (300 de entrada + 100 de salida) a un supuesto de $0.15/$0.60 por 1M ≈ $105 por refresco completo, ~$50 con API batch; online para 30M búsquedas/día = 30× los tokens + 300 ms.
- Regenerar embeddings: 50M productos × ~100 tokens = 5B tokens ≈ $100 a $0.02/1M, o ~1 h en 16 GPUs a ~1k productos/s cada una.
- Fuentes: [Semantic Product Search (Nigam et al., Amazon, KDD 2019)](https://arxiv.org/abs/1907.00937) · [From RankNet to LambdaRank to LambdaMART: An Overview (Burges, Microsoft Research)](https://www.microsoft.com/en-us/research/publication/from-ranknet-to-lambdarank-to-lambdamart-an-overview/) · [Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods (Cormack et al., SIGIR 2009)](https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf) · [Efficient and robust approximate nearest neighbor search using HNSW graphs (Malkov & Yashunin)](https://arxiv.org/abs/1603.09320)

### [ ] Diseño: pipeline de extracción de documentos — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-document-extraction/) · `content/concepts/design/case-document-extraction.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Volumen: 1M docs/mes ≈ 33k/día ≈ 0.4/s; supón picos de ~5× a fin de mes (~2/s) y 3 páginas/doc → 3M páginas/mes.
- Tokens: supón ~1k tokens/página + 1.5k de prompt en caché ≈ 4.5k de entrada y ~0.4k de salida por doc → 4.5B de entrada + 0.4B de salida al mes.
- LLM: a un supuesto de $0.40/M de entrada y $1.60/M de salida ≈ $1.8k + $0.6k = $2.4k/mes a precio de lista, ~$1.2k con una API de batch al 50%.
- OCR: a ~$1.50 por cada 1,000 páginas, 3M páginas ≈ $4.5k/mes; si el 60% son PDFs nativos y se saltan el OCR, ≈ $1.8k.
- Revisión: supón 8% de docs marcados × ~60 s ≈ 1,330 h/mes ≈ 8 personas de tiempo completo ≈ $33k a $25/h, ~90% de un total ≈ $0.04/doc.
- Fuentes: [OpenAI — Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs) · [OpenAI — Batch API guide](https://platform.openai.com/docs/guides/batch) · [LayoutLMv3: Pre-training for Document AI with Unified Text and Image Masking (Huang et al., 2022)](https://arxiv.org/abs/2204.08387) · [Azure AI Document Intelligence — overview](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/overview)

### [ ] Diseño: sistema de moderación de contenido — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-content-moderation/) · `content/concepts/design/case-content-moderation.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Carga: 100k ítems/min ≈ 1.7k/s; planea picos de ~3× ≈ 5k/s; ≈ 4.3B ítems/mes. Supón 80% texto y 20% imágenes.
- Embudo (supuesto): hashes + clasificadores resuelven ~97%; ~3% → LLM ≈ 50 req/s; ~0.05% → personas ≈ 72k ítems/día.
- LLM por API: 130M llamadas/mes × (3k de política en caché + ~300 nuevos + 100 de salida) a un supuesto de $0.10/$0.40/$1.60 por M ≈ $39k + $16k + $21k ≈ $75k/mes.
- Autohospedado en su lugar: un modelo guardián de 8B con prefix caching en ~4 GPUs (con margen) a un supuesto de $2.50/GPU-hora ≈ $7k/mes.
- Personas: 72k ítems/día × ~30 s ≈ 600 h/día ≈ 100 turnos de seis horas al día ≈ ~140 revisores con semanas de 5 días.
- Presupuesto en línea: normalizar ~5 ms + hash ~5 ms + clasificadores ~20–50 ms → ≤ 100 ms p99. El LLM (0.5–2 s) y las personas (de minutos a horas) corren asíncronos.
- Fuentes: [Llama Guard: LLM-based Input-Output Safeguard for Human-AI Conversations (Inan et al., 2023)](https://arxiv.org/abs/2312.06674) · [OpenAI — Using GPT-4 for content moderation](https://openai.com/index/using-gpt-4-for-content-moderation/) · [Meta ThreatExchange — PDQ and TMK+PDQF perceptual hashing](https://github.com/facebook/ThreatExchange) · [OpenAI — Moderation guide](https://platform.openai.com/docs/guides/moderation)

### [ ] Diseño: asistente de analítica text-to-SQL — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-text-to-sql/) · `content/concepts/design/case-text-to-sql.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Carga: supón 2,000 usuarios × 10 preguntas por día hábil = 20k/día; en ~8 horas laborales ≈ 0.7/s, picos de ~2/s.
- Tokens por pregunta: ~3k de schema + ~1.5k de few-shot + ~1.5k de instrucciones ≈ 6k de entrada y ~0.4k de salida, × ~1.3 llamadas por aclaraciones y reintentos.
- LLM: 440k preguntas/mes (22 días hábiles) → ~3.4B tokens de entrada + ~0.23B de salida; a un supuesto de $2/M de entrada y $8/M de salida ≈ $6.9k + $1.8k ≈ $9k/mes.
- Protección del warehouse: BigQuery on-demand cobra ~$6.25 por TiB escaneado, así que recorrer completa una tabla de 10 TB ≈ $57; un tope de 50 GB por consulta limita el peor caso a ~$0.30.
- Latencia: recuperación ~0.2 s + generación 2–4 s + validación y dry run ~0.5 s + ejecución 1–5 s ≈ 4–10 s; cada ronda de autocorrección suma ~3 s.
- Spider 2.0 (schemas empresariales reales): el agente de código de los autores, sobre o1-preview, resolvió solo ~21% de las tareas, contra ~91% en Spider 1.0 y ~73% en BIRD (Lei et al., 2024).
- Fuentes: [Can LLM Already Serve as A Database Interface? A BIg Bench for Large-Scale Database Grounded Text-to-SQLs (BIRD, Li et al., 2023)](https://arxiv.org/abs/2305.03111) · [Spider 2.0: Evaluating Language Models on Real-World Enterprise Text-to-SQL Workflows (Lei et al., 2024)](https://arxiv.org/abs/2411.07763) · [sqlglot — SQL parser, transpiler and optimizer](https://github.com/tobymao/sqlglot) · [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

### [ ] Diseño: agente de voz en tiempo real — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-voice-agent/) · `content/concepts/design/case-voice-agent.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Presupuesto de latencia (p50): endpointing 200 + ASR final 75 + TTFT del LLM 250 + primera oración 70 (~10 tokens a ~150 tok/s) + primer audio del TTS 100 + red 100 ≈ 800 ms.
- Entre turnos humanos suele haber 0–200 ms en 10 idiomas (Stivers et al., 2009); pasado ~1.5 s, la gente empieza a repetirse o a preguntar «¿hola?».
- Audio: la PSTN usa G.711 a 8 kHz (64 kbit/s) y WebRTC usa Opus a 48 kHz; los pipelines mueven frames de ~20 ms. Mide la precisión del ASR con audio telefónico de 8 kHz, no con grabaciones limpias.
- Concurrencia: 100k llamadas/día × 4 min = 400k minutos; si ~15% cae en la hora pico, 60k min ÷ 60 ≈ 1,000 llamadas concurrentes.
- Costo por minuto (precios supuestos): telefonía ~$0.01 + ASR ~$0.01 + TTS ~$0.02 + LLM ~$0.005 (3 turnos × 3k tokens a $0.50/M) ≈ $0.05, contra ~$0.50 de una persona que cuesta $30/h con cargas.
- Fuentes: [OpenAI — Realtime API guide](https://platform.openai.com/docs/guides/realtime) · [LiveKit Agents — documentation](https://docs.livekit.io/agents/) · [Pipecat — open-source framework for voice and multimodal agents](https://github.com/pipecat-ai/pipecat) · [Stivers et al. — Universals and cultural variation in turn-taking in conversation (PNAS, 2009)](https://www.pnas.org/doi/10.1073/pnas.0903616106)

### [ ] Diseño: plataforma interna de IA — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-ai-platform/) · `content/concepts/design/case-ai-platform.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Carga: 100 equipos, ~50M llamadas/mes ÷ 2.6M s ≈ 20 QPS en promedio; con un pico ~5× el promedio, planea ~100 QPS más streams de larga duración.
- Gasto: 50M llamadas × (2k de entrada + 300 de salida) = 100B tokens de entrada + 15B de salida al mes; suponiendo $1/M de entrada y $5/M de salida ≈ $100k + $75k = $175k/mes.
- Logs: 50M llamadas × ~10 KB (prompt, respuesta, metadatos) ≈ 500 GB/mes; guarda los payloads completos ~30 días y los metadatos 13 meses.
- Latencia: auth + cuota + ruteo bajo 10 ms en p99; los clasificadores de guardrails cuestan ~20–100 ms, así que corre los chequeos de entrada de bajo riesgo en paralelo con el LLM y cancela si alguno salta.
- Cuenta de ruteo: mover el 70% del tráfico a un modelo 10× más barato deja 0.3 + 0.07 = 37% del gasto, un recorte de ~63%, si los evals muestran que la calidad se mantiene.
- Fuentes: [LiteLLM — Proxy Server (LLM Gateway)](https://docs.litellm.ai/docs/simple_proxy) · [Agent Router (formerly Envoy AI Gateway) — open-source AI gateway on Envoy](https://theagentrouter.ai/) · [OpenTelemetry — Semantic conventions for generative AI](https://opentelemetry.io/docs/specs/semconv/gen-ai/) · [Evan Bottcher — What I Talk About When I Talk About Platforms (martinfowler.com)](https://martinfowler.com/articles/talk-about-platforms.html)

### [ ] Diseño: plataforma de evaluación de agentes — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-eval-platform/) · `content/concepts/design/case-eval-platform.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Corrida completa: 500 tareas × 5 intentos × ~30k tokens = 75M tokens ≈ $225 suponiendo $3/M combinado; cada noche ≈ $6.8k/mes.
- Tiempo real: 2,500 episodios × ~3 min ÷ 200 sandboxes en paralelo ≈ 38 min; el presupuesto de tiempo de CI fija el paralelismo.
- Resolución: con 80% de éxito, la mitad del CI del 95% es ±~3.5 puntos con 500 tareas y ±~10 con 60, así que un smoke de PR solo detecta regresiones grandes.
- Confiabilidad: 90% por intento da pass^5 ≈ 59% (0.9^5); reporta pass^k junto a la media, porque los clientes viven en el pass^k.
- Almacenamiento: ~150 KB por trayectoria; 2,500 nocturnas + 50 corridas de PR × 180 ≈ 11.5k trayectorias/día ≈ 1.7 GB/día ≈ 50 GB/mes.
- Fuentes: [Yao et al. — τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains (2024)](https://arxiv.org/abs/2406.12045) · [Jimenez et al. — SWE-bench: Can Language Models Resolve Real-World GitHub Issues? (2023)](https://arxiv.org/abs/2310.06770) · [Miller — Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations (2024)](https://arxiv.org/abs/2411.00640) · [UK AI Security Institute — Inspect (open-source eval framework)](https://github.com/UKGovernmentBEIS/inspect_ai)

### [ ] Diseño: recomendaciones con LLMs — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-recommendations/) · `content/concepts/design/case-recommendations.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tráfico: 10M DAU × 5 cargas del feed = 50M solicitudes/día ≈ 580 QPS promedio, ~1,700 en un pico de 3×; × 700 candidatos ≈ 1.2M puntajes del ranker por segundo en el pico.
- Enriquecimiento: 50k ítems nuevos/día × (1,500 tokens de entrada + 200 de salida) = 75M de entrada + 10M de salida; a $0.40/$1.60 por 1M (precio de lista de GPT-4.1-mini, abr. 2025) ≈ $46/día, ~$23 en batch ≈ $700/mes.
- Contrafactual con un LLM como re-ranker: 50M solicitudes × ~5k tokens (perfil + 50 candidatos) = 250B tokens/día ≈ $100k/día solo de entrada a $0.40 por 1M, ~$3M/mes, más 1–3 s por solicitud.
- Índice ANN: 10M ítems × 128 dimensiones float32 = 5.1 GB de vectores crudos, cabe en RAM en un nodo: replica para soportar las QPS en vez de shardear por tamaño.
- Presupuesto de latencia, p99 150 ms: features 20 + retrieval 15 + ranking 50 + re-ranking 10 + red 25 + margen 30.
- Fuentes: [Covington et al. — Deep Neural Networks for YouTube Recommendations (RecSys 2016)](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/) · [Eugene Yan — System Design for Recommendations and Search](https://eugeneyan.com/writing/system-design-for-discovery/) · [TensorFlow Recommenders — Building a two-tower retrieval model](https://www.tensorflow.org/recommenders/examples/basic_retrieval) · [Wu et al. — A Survey on Large Language Models for Recommendation](https://arxiv.org/abs/2305.19860)

### [ ] Diseño: resumen de reseñas con defensas ante injection y PII — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-review-summarization/) · `content/concepts/design/case-review-summarization.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Map: 500k reseñas nuevas/día × ~140 tokens (texto + prompt amortizado) = 70M de entrada, ~30M de salida (2 filas × 30 tokens); a un supuesto de $0.40/$1.60 por 1M, −50% en batch ≈ $38/día.
- Reduce + verificación solo ante cambio material: ~5% de 2M productos = 100k/día × (~5k de entrada + 0.6k de salida) a los mismos precios ≈ $150/día en batch. Total ≈ $190/día ≈ $5.6k/mes.
- Re-resumir todo a diario: 2M productos × ~100 reseñas × 100 tokens = 20B tokens/día ≈ $4k/día aun en batch (~20× más), y un producto con 50k reseñas (~5M tokens) no cabe en ninguna ventana.
- Backfill: 200M reseñas ≈ 28B tokens de entrada + 12B de salida ≈ $15k una sola vez a precio batch; 10M llamadas de 20 reseñas = 200 archivos batch de 50k solicitudes.
- Revisión por muestreo: 200 resúmenes/día (~0.2% de las reescrituras) a ~2 min cada uno ≈ 7 horas-persona; 1,400 por semana miden una tasa de defectos del 1% con ±0.5 puntos (IC 95%).
- Fuentes: [Greshake et al. — Not what you've signed up for: indirect prompt injection](https://arxiv.org/abs/2302.12173) · [Simon Willison — The Dual LLM pattern](https://simonwillison.net/2023/Apr/25/dual-llm-pattern/) · [Microsoft Presidio — PII detection and anonymization](https://microsoft.github.io/presidio/) · [OpenAI — Batch API](https://platform.openai.com/docs/guides/batch)

### [ ] Diseño: ranking del news feed — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-feed-ranking/) · `content/concepts/design/case-feed-ranking.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tráfico: 2 mil millones de DAU × 10 cargas del feed al día (supuesto) = 20 mil millones de solicitudes/día ≈ 230k QPS promedio, ~500k en un pico de ~2×.
- Pasada principal: 500k QPS × 500 candidatos = 250M de puntajes pesados/s en el pico; la primera pasada puntúa ~3× más ítems a una fracción del costo por ítem.
- Una sola tabla de IDs de usuario: 3 mil millones de filas × 128 dimensiones × 2 bytes (fp16) ≈ 770 GB; suma tablas de posts, autores y grupos y llegas a TBs, particionados.
- Latencia p99 ~300 ms (supuesto): candidatos 50 + features 40 + primera pasada 20 + pasada principal 80 + pasada final 20 + red y margen 90.
- Logs: 20 mil millones de cargas × ~20 posts vistos × ~2 KB de features ≈ 800 TB/día (supuesto): submuestrea las impresiones sin acción y repondera.
- Fuentes: [Meta Engineering — How machine learning powers Facebook's News Feed ranking algorithm](https://engineering.fb.com/2021/01/26/core-infra/news-feed-ranking/) · [Meta Engineering — Scaling the Instagram Explore recommendations system](https://engineering.fb.com/2023/08/09/ml-applications/scaling-instagram-explore-recommendations-system/) · [Zhao et al. — Recommending What Video to Watch Next: A Multitask Ranking System (RecSys 2019)](https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/) · [Naumov et al. — Deep Learning Recommendation Model for Personalization and Recommendation Systems (DLRM)](https://arxiv.org/abs/1906.00091)

### [ ] Diseño: predicción de CTR para anuncios — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-ads-ctr/) · `content/concepts/design/case-ads-ctr.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Puntuación: 1M de solicitudes de anuncios/s en el pico (supuesto) × 150 anuncios en el ranker pesado = 150M de predicciones/s, cada una con heads de pCTR y pCVR.
- Filas de entrenamiento: 10 mil millones de impresiones/día × 1% de CTR = 100M de positivos, más 2.5% de 9.9 mil millones de negativos ≈ 250M → ~350M de filas/día (volúmenes supuestos).
- Recalibración: CTR real 1%, w = 0.025 → el modelo ve 0.01 / (0.01 + 0.99 × 0.025) ≈ 29%; q = p / (p + (1 − p)/w) lo devuelve a su valor.
- Embeddings: 5 mil millones de filas con hashing × 64 dimensiones × 2 bytes (fp16) ≈ 640 GB → particionadas entre hosts para entrenar y servir.
- Facebook, 2014: árboles + LR superaron a cada uno por separado en >3% de NE; reentrenar cada semana en vez de cada día costó ~1% de NE; entrenar con el 10% de los datos costó ~1% de NE.
- Fuentes: [He et al. — Practical Lessons from Predicting Clicks on Ads at Facebook (ADKDD 2014)](https://research.facebook.com/publications/practical-lessons-from-predicting-clicks-on-ads-at-facebook/) · [Cheng et al. — Wide & Deep Learning for Recommender Systems](https://arxiv.org/abs/1606.07792) · [Naumov et al. — Deep Learning Recommendation Model for Personalization and Recommendation Systems (DLRM)](https://arxiv.org/abs/1906.00091) · [Ktena et al. — Addressing Delayed Feedback for Continuous Training with Neural Networks in CTR prediction (RecSys 2019)](https://arxiv.org/abs/1907.06558)

### [ ] Diseño: detección de fraude en tiempo real — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-fraud-detection/) · `content/concepts/design/case-fraud-detection.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Carga: 5k pagos/s en el pico (supuesto) × ~6 entidades (tarjeta, dispositivo, IP, email, cuenta, comercio) = ~30k multi-gets clave-valor/s.
- Latencia p99 ~100 ms (supuesto): red 10 + features 15 + grafo 10 + reglas 5 + GBDT ~2 + política 3 ms; logging asíncrono; ~55 ms de margen.
- Punto de equilibrio (margen 30%, costo de churn $20, comisión $15, supuestos): pedido de $200 p* = 80 / (80 + 215) ≈ 0.27; pedido de $20 p* = 26 / (26 + 35) ≈ 0.43.
- Tasa base: con 0.1% de fraude y 80% de recall (supuestos), una tasa de falsos positivos de 1% rechaza ~12 pagos legítimos por cada fraude detectado; Stripe reporta que Radar bloquea por error ~0.1% de los pagos legítimos.
- Exención por análisis de riesgo de PSD2 en la UE: tasa de fraude del PSP ≤ 0.13% para ≤ €100, ≤ 0.06% para ≤ €250, ≤ 0.01% para ≤ €500; no aplica por encima de €500.
- Fuentes: [Stripe — How we built it: Stripe Radar](https://stripe.dev/blog/how-we-built-it-stripe-radar) · [Stripe — A primer on machine learning for fraud protection](https://stripe.com/guides/primer-on-machine-learning-for-fraud-protection) · [Stripe Docs — Strong Customer Authentication exemptions](https://docs.stripe.com/payments/3d-secure/strong-customer-authentication-exemptions) · [Apache Flink — Windows (DataStream API)](https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/)

### [ ] Diseño: agente de investigación profunda — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-deep-research/) · `content/concepts/design/case-deep-research.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tokens por informe (supuesto): 5 subagentes × ~12 turnos × ~17k tokens de contexto releídos por turno ≈ 1M de entrada; con líder, síntesis y verificación ≈ 1.2M de entrada y ~60k de salida.
- Costo a un supuesto de $3/$15 por millón (nov. 2026), más ~60 búsquedas a un supuesto de $5/1k: ~$4.80 sin cache, ~$2.50 con ~70% de la entrada como lecturas de cache a ~10% del precio. Con 100k informes/día: ~$250k/día.
- Concurrencia (ley de Little): 100k informes/día ≈ 1.2 inicios/s × ~600 s cada uno ≈ 700 jobs en curso, ~1.4k con un pico de 2×, cada uno con hasta ~5 loops de agente activos.
- Tiempo de reloj: plan ~30 s + 2 rondas de investigación × ~3 min + síntesis ~2 min + verificación ~1 min ≈ 9–10 min, más lo que tarde el usuario en responder las aclaraciones.
- Anthropic (jun. 2025): la investigación multiagente usó ~15× los tokens de un chat; el uso de tokens por sí solo explicó ~80% de la varianza de desempeño en BrowseComp.
- Fuentes: [Anthropic — How we built our multi-agent research system (Jun 2025)](https://www.anthropic.com/research/multi-agent-research-system) · [LangChain — Open Deep Research](https://www.langchain.com/blog/open-deep-research) · [Google — Gemini Deep Research overview](https://gemini.google/overview/deep-research/) · [Radware — ShadowLeak: a zero-click, service-side attack exfiltrating data via ChatGPT's Deep Research agent (Sep 2025)](https://www.radware.com/blog/threat-intelligence/shadowleak/)

### [ ] Diseño: motor de respuestas con IA (búsqueda + LLM) — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-answer-engine/) · `content/concepts/design/case-answer-engine.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Carga: 10M consultas/día ≈ 115 QPS, ~300 con un pico supuesto de 2.5×; ~6.5k tokens de entrada (5k de pasajes + system e historial) y ~300 de salida por consulta → ~65B de entrada y ~3B de salida por día.
- Por consulta, a precios supuestos de nov. 2026: modelo chico a $0.40/$1.60 por millón ≈ 0.3¢ + búsqueda a $5/1k = 0.5¢ → ~0.8¢; con un modelo de $3/$15 ≈ 2.4¢ + 0.5¢.
- Primer token: reescritura 120 ms + búsqueda 350 + fetch ≤ 800 + extracción y rerank ~130 + prefill ~300 ≈ 1.7 s; tarjetas de fuentes visibles a ~0.5 s.
- API de búsqueda: 10M/día × $5/1k ≈ $50k/día (~$18M/año), más que los ~$30k/día del modelo chico: el disparador de build vs. buy para un índice propio.
- Liu et al. (2023), 4 buscadores generativos: 51.5% de las oraciones totalmente respaldadas por citas; 74.5% de las citas respaldaban su oración.
- Fuentes: [Liu, Zhang, Liang — Evaluating Verifiability in Generative Search Engines (2023)](https://arxiv.org/abs/2304.09848) · [Perplexity — Architecting and evaluating an AI-first Search API (Sep 2025)](https://www.perplexity.ai/hub/blog/architecting-and-evaluating-an-ai-first-search-api) · [Microsoft — Bing Search API retirement](https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement) · [Columbia Journalism Review (Tow Center) — AI search has a citation problem (Mar 2025)](https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php)

### [ ] Diseño: plataforma de inferencia de LLMs — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-inference-platform/) · `content/concepts/design/case-inference-platform.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Pico supuesto del modelo insignia de 70B: 60k tokens/s de salida + 600k de entrada (~3× el promedio). Decode: 60k ÷ ~1,500 tokens/s por H100 (goodput supuesto con TPOT p95 ≤ 50 ms, FP8) = 40 GPUs.
- Prefill: 600k × 50% de fallos de cache × 140 GFLOP/token (2 × 70B) ≈ 42 PFLOP/s ÷ ~800 TFLOPS efectivos por H100 (~40% de 1,979 en FP8 denso) ≈ 53 GPUs.
- Flota: 93 GPUs + ~25% de margen para N+1 y ráfagas ≈ 120 H100 (30 réplicas TP=4, 15 nodos) ≈ $220k/mes con un supuesto de $2.50 por GPU-hora (nov. 2026).
- Costo unitario: 1,500 tokens/s × 3,600 s = 5.4M de tokens de salida por GPU-hora → ~$0.46 por millón al 100% de ocupación, ~$1.16 al 40%: la utilización es la mayor palanca de costo.
- LoRA: rango 16 en todas las capas lineales de Llama-3-70B ≈ 207M de parámetros ≈ 0.4 GB en BF16, ~0.3% de la base; caben cientos en la RAM del host.
- Fuentes: [vLLM — Automatic Prefix Caching (design doc)](https://docs.vllm.ai/en/latest/design/prefix_caching.html) · [NVIDIA Dynamo (GitHub)](https://github.com/ai-dynamo/dynamo) · [llm-d — Intelligent Inference Scheduling with llm-d](https://llm-d.ai/blog/intelligent-inference-scheduling-with-llm-d) · [Sheng et al. — S-LoRA: Serving Thousands of Concurrent LoRA Adapters](https://arxiv.org/abs/2311.03285)

### [ ] Diseño: data engine para conducción autónoma — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-autonomy-data-engine/) · `content/concepts/design/case-autonomy-data-engine.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tamaño de clip: el dataset de Tesla en CVPR 2021 tenía 1.5 PB para un millón de clips de 10 segundos ≈ 1.5 GB por clip con calidad de entrenamiento.
- Presupuesto: 2M de autos × ~1 h de manejo al día (supuesto) = 2M de horas-auto; un trigger que se dispara una vez por hora-auto produce 2M de clips ≈ 3 PB/día, 20× un presupuesto de 100k clips.
- Ingesta: 100k clips/día × 1.5 GB = 150 TB/día ≈ 14 Gbps sostenidos, ~55 PB/año antes de niveles y expiración.
- E/S de entrenamiento: una pasada sobre 1.5 PB a 1.6 TB/s (el nivel NVMe de Tesla en 2021) ≈ 16 min; a ~100 GB/s desde object storage ≈ 4 h. La carga de datos, no los FLOPs, puede fijar el tiempo de una época.
- Cero fallas en n millas acotan la tasa por debajo de ~3/n con 95% de confianza; RAND (2016): ~275M de millas sin fallas para mostrar una tasa de muertes no peor que la humana de EE. UU., 1.09 por cada 100M de millas.
- Fuentes: [Andrej Karpathy — Tesla keynote, CVPR 2021 Workshop on Autonomous Driving (video)](https://www.youtube.com/watch?v=g6bOwQdCJrc) · [Tesla — AI Day 2021 (video)](https://www.youtube.com/watch?v=j0z4FweCy4M) · [Tesla — AI Day 2022 (video)](https://www.youtube.com/watch?v=ODSJsviD_SU) · [Kalra & Paddock (RAND, 2016) — Driving to Safety: How Many Miles of Driving Would It Take to Demonstrate Autonomous Vehicle Reliability?](https://www.rand.org/pubs/research_reports/RR1478.html)

## Fundamentos de ML (12)

### [ ] Aprendizaje supervisado, sesgo–varianza y overfitting — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/ml-fundamentals/) · `content/concepts/ml/ml-fundamentals.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Error cuadrático esperado = sesgo² + varianza + ruido irreducible σ².
- Regla práctica de split: 80/10/10 o 70/15/15; con millones de ejemplos, 98/1/1 igual deja más de 10k filas para validación y para test.
- k = 5 o 10 folds; Kohavi (1995) recomendó 10-fold estratificado para selección de modelos.
- Ruido del test: con ~90% de accuracy sobre 1,000 ejemplos, el intervalo de confianza al 95% es de unos ±1.9 puntos.
- Fuentes: [scikit-learn — Cross-validation: evaluating estimator performance](https://scikit-learn.org/stable/modules/cross_validation.html) · [scikit-learn — Validation curves and learning curves](https://scikit-learn.org/stable/modules/learning_curve.html) · [Kohavi (1995) — A Study of Cross-Validation and Bootstrap for Accuracy Estimation and Model Selection](https://www.ijcai.org/Proceedings/95-2/Papers/016.pdf) · [Nakkiran et al. — Deep Double Descent: Where Bigger Models and More Data Hurt](https://arxiv.org/abs/1912.02292)

### [ ] Funciones de pérdida y descenso de gradiente — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/gradient-descent/) · `content/concepts/ml/gradient-descent.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Defaults de Adam: lr 1e-3, β1 0.9, β2 0.999, ε 1e-8 (Kingma y Ba); el preentrenamiento de LLMs suele usar β2 0.95 (GPT-3, LLaMA).
- Receta de LLaMA: AdamW, weight decay 0.1, 2,000 pasos de warmup, decaimiento coseno hasta el 10% del LR máximo, gradient clipping de 1.0.
- Grid de fine-tuning de BERT: LR 5e-5, 3e-5 o 2e-5; batch 16 o 32; 2–4 épocas.
- Adam en precisión mixta necesita ~16 bytes por parámetro (pesos, gradientes, copia maestra fp32 + 2 momentos): ~112 GB para 7B, sin contar activaciones.
- Transformer original: 4,000 pasos de warmup y luego el LR decae ∝ 1/√paso.
- Fuentes: [Ruder — An overview of gradient descent optimization algorithms](https://arxiv.org/abs/1609.04747) · [Kingma & Ba — Adam: A Method for Stochastic Optimization](https://arxiv.org/abs/1412.6980) · [Loshchilov & Hutter — Decoupled Weight Decay Regularization (AdamW)](https://arxiv.org/abs/1711.05101) · [Touvron et al. — LLaMA: Open and Efficient Foundation Language Models](https://arxiv.org/abs/2302.13971)

### [ ] Regularización — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/regularization/) · `content/concepts/ml/regularization.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Paper de dropout: conservar las unidades ocultas con p de 0.5–0.8 (apagar 20–50%), entradas ~0.8; Transformer original: dropout 0.1.
- Label smoothing ε = 0.1 en Inception-v3 y en el Transformer original.
- Weight decay: 0.1 con AdamW en preentrenamiento de LLMs (GPT-3, LLaMA); 1e-4 con SGD en la receta de ResNet.
- Una paciencia de ~5–10 épocas para early stopping es una regla práctica común.
- Fuentes: [Srivastava et al. — Dropout: A Simple Way to Prevent Neural Networks from Overfitting (JMLR 2014)](https://jmlr.org/papers/v15/srivastava14a.html) · [Loshchilov & Hutter — Decoupled Weight Decay Regularization (AdamW)](https://arxiv.org/abs/1711.05101) · [Müller, Kornblith & Hinton — When Does Label Smoothing Help?](https://arxiv.org/abs/1906.02629) · [Goodfellow, Bengio & Courville — Deep Learning, ch. 7: Regularization](https://www.deeplearningbook.org/contents/regularization.html)

### [ ] Redes neuronales y backpropagation — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/neural-networks/) · `content/concepts/ml/neural-networks.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- La derivada de la sigmoide vale como máximo 0.25: en 10 capas sigmoide, solo los factores de activación pueden encoger el gradiente a 0.25¹⁰ ≈ 10⁻⁶.
- Entrenar cuesta ≈ 6·N FLOPs por token (2N forward, ~4N backward), o sea ~3× la inferencia (Kaplan et al., 2020).
- Inicialización He para ReLU: varianza de pesos 2/fan_in; Xavier/Glorot: 2/(fan_in + fan_out).
- El activation checkpointing recalcula las activaciones en lugar de guardarlas: ~un forward extra (~33% más de cómputo) a cambio de mucha menos memoria.
- Fuentes: [Goodfellow, Bengio & Courville — Deep Learning, ch. 6: Deep Feedforward Networks](https://www.deeplearningbook.org/contents/mlp.html) · [Stanford CS231n — Backpropagation, Intuitions](https://cs231n.github.io/optimization-2/) · [He et al. — Deep Residual Learning for Image Recognition](https://arxiv.org/abs/1512.03385) · [Kaplan et al. — Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361)

### [ ] Árboles con gradient boosting (GBDT) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/gbdt/) · `content/concepts/ml/gbdt.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Paper de XGBoost (2016): 17 de las 29 soluciones ganadoras de Kaggle publicadas en 2015 usaron XGBoost.
- Grinsztajn et al. (NeurIPS 2022): en 45 datasets, los árboles siguen ganándoles a las redes profundas en datos tabulares medianos (~10K filas).
- Valores por defecto: XGBoost learning rate 0,3 y max_depth 6; LightGBM learning rate 0,1 y num_leaves 31. Regla práctica: 0,01–0,1 con early stopping.
- LightGBM (NeurIPS 2017) reportó entrenamiento hasta más de 20× más rápido que el GBDT convencional, con casi la misma precisión.
- Ads de Facebook (He et al., 2014): árboles boosteados como transformación de features más regresión logística superaron a cada uno por separado en más de 3%.
- Fuentes: [Chen & Guestrin — XGBoost: A Scalable Tree Boosting System (KDD 2016)](https://arxiv.org/abs/1603.02754) · [LightGBM docs — Parameters Tuning](https://lightgbm.readthedocs.io/en/latest/Parameters-Tuning.html) · [Grinsztajn, Oyallon & Varoquaux — Why do tree-based models still outperform deep learning on tabular data? (NeurIPS 2022)](https://arxiv.org/abs/2207.08815) · [Lundberg, Erion & Lee — Consistent Individualized Feature Attribution for Tree Ensembles (TreeSHAP)](https://arxiv.org/abs/1802.03888)

### [ ] Feature engineering y fuga de datos — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/feature-engineering/) · `content/concepts/ml/feature-engineering.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Kapoor y Narayanan: el leakage afectó ~300 papers publicados en 17 campos científicos (294 en la versión de Patterns de 2023).
- Ads de Facebook (He et al., 2014): "lo más importante es tener las features correctas"; dominaron las features históricas de usuario y anuncio.
- Regla práctica: one-hot hasta ~decenas de categorías; más allá, target encoding, hashing o embeddings.
- Regla práctica (Google, feature columns de TensorFlow): tamaño del embedding ≈ raíz cuarta del número de categorías, p. ej. 10.000 → 10.
- El `TargetEncoder` de scikit-learn (≥ 1.3) hace cross-fitting con 5 folds en `fit_transform`, así ninguna fila ve su propia etiqueta en su codificación.
- Fuentes: [scikit-learn — Common pitfalls and recommended practices (data leakage)](https://scikit-learn.org/stable/common_pitfalls.html) · [scikit-learn — Target Encoder](https://scikit-learn.org/stable/modules/preprocessing.html#target-encoder) · [Kapoor & Narayanan — Leakage and the Reproducibility Crisis in ML-based Science](https://arxiv.org/abs/2207.07048) · [Weinberger et al. — Feature Hashing for Large Scale Multitask Learning (ICML 2009)](https://arxiv.org/abs/0902.2206)

### [ ] Visión por computadora: CNNs y Vision Transformers — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/computer-vision/) · `content/concepts/ml/computer-vision.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- AlexNet (2012): 15,3% de error top-5 en ImageNet frente a 26,2% del segundo lugar, el inicio del deep learning en visión.
- ResNet ganó ILSVRC 2015 con 3,57% de error top-5 y hasta 152 capas; ResNet-50: ~25,6M parámetros, ~3,8 GFLOPs por imagen.
- ViT-B/16 a 224×224: 196 tokens de parche (+1 [CLS]), ~86M parámetros.
- YOLO original: 45 FPS en una GPU Titan X; Fast YOLO: 155 FPS.
- Dos convoluciones 3×3 apiladas ven 5×5 y tres ven 7×7, con 27C² pesos frente a 49C² de una sola 7×7.
- Fuentes: [He et al. — Deep Residual Learning for Image Recognition (ResNet)](https://arxiv.org/abs/1512.03385) · [Dosovitskiy et al. — An Image is Worth 16x16 Words (ViT)](https://arxiv.org/abs/2010.11929) · [Redmon et al. — You Only Look Once: Unified, Real-Time Object Detection](https://arxiv.org/abs/1506.02640) · [Tesla AI Day 2021 (vision stack, HydraNets, BEV)](https://www.youtube.com/watch?v=j0z4FweCy4M)

### [ ] Desbalance de clases y calibración — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/imbalance-calibration/) · `content/concepts/ml/imbalance-calibration.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Umbral por costo (Elkan, 2001): t = c_FP / (c_FP + c_FN); una revisión de US$5 frente a un fraude perdido de US$100 da t ≈ 0,048.
- Corrección por submuestreo (He et al., Facebook, 2014): q = p / (p + (1 − p)/w), donde w es la tasa de muestreo de negativos.
- Focal loss (Lin et al., 2017): γ = 2 y α = 0,25 funcionaron mejor en RetinaNet; con γ = 0 es cross-entropy normal.
- scikit-learn: la isotónica iguala o supera a la sigmoide (Platt) con más de ~1.000 muestras de calibración.
- Métrica de calibración de Facebook: CTR predicho promedio ÷ CTR observado; objetivo ≈ 1,0.
- Fuentes: [scikit-learn — Probability calibration](https://scikit-learn.org/stable/modules/calibration.html) · [He et al. — Practical Lessons from Predicting Clicks on Ads at Facebook (ADKDD 2014)](https://research.facebook.com/publications/practical-lessons-from-predicting-clicks-on-ads-at-facebook/) · [Guo et al. — On Calibration of Modern Neural Networks (ICML 2017)](https://arxiv.org/abs/1706.04599) · [Lin et al. — Focal Loss for Dense Object Detection (ICCV 2017)](https://arxiv.org/abs/1708.02002)

### [ ] Learning to rank (LTR) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/learning-to-rank/) · `content/concepts/ml/learning-to-rank.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Descuento de NDCG 1/log2(puesto + 1): puesto 1 = 1,0, puesto 3 = 0,5, puesto 10 ≈ 0,29.
- Un ensamble de rankers LambdaMART ganó el Track 1 del Yahoo! Learning to Rank Challenge de 2010 (Burges, 2010).
- Benchmark MSLR-WEB30K: ~30K consultas, 136 features por par consulta–documento, etiquetas de 0 a 4.
- Regla práctica: recuperar 100–1.000, ordenar con LTR, mostrar 10–20.
- `rank:ndcg` de XGBoost usa por defecto la ganancia 2^rel − 1, así que las etiquetas deben ser ≤ 31.
- Fuentes: [Burges — From RankNet to LambdaRank to LambdaMART: An Overview (Microsoft Research, 2010)](https://www.microsoft.com/en-us/research/publication/from-ranknet-to-lambdarank-to-lambdamart-an-overview/) · [Joachims, Swaminathan & Schnabel — Unbiased Learning-to-Rank with Biased Feedback (WSDM 2017)](https://arxiv.org/abs/1608.04468) · [Hu et al. — Unbiased LambdaMART: An Unbiased Pairwise Learning-to-Rank Algorithm (WWW 2019)](https://arxiv.org/abs/1809.05818) · [XGBoost docs — Learning to Rank](https://xgboost.readthedocs.io/en/stable/tutorials/learning_to_rank.html)

### [ ] Exploración: multi-armed bandits — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/bandits/) · `content/concepts/ml/bandits.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- El bono de UCB1, √(2 ln t / nᵢ), da regret O(log T) (Auer et al., 2002); un greedy con ε fijo tiene regret lineal.
- Lai y Robbins (1985): ninguna política crece más lento que ~log T en regret; UCB y Thompson sampling alcanzan ese orden.
- LinUCB en la portada de Yahoo!: 12,5% más clics que un bandit sin contexto (Li et al., 2010).
- Regla práctica: ε = 5–10% para ε-greedy; prior Beta(1,1) para Thompson sampling sobre clics.
- Fuentes: [Russo et al. — A Tutorial on Thompson Sampling](https://arxiv.org/abs/1707.02038) · [Li et al. — A Contextual-Bandit Approach to Personalized News Article Recommendation (LinUCB)](https://arxiv.org/abs/1003.0146) · [Auer, Cesa-Bianchi & Fischer — Finite-time Analysis of the Multiarmed Bandit Problem (UCB1)](https://link.springer.com/article/10.1023/A:1013689704352)

### [ ] Aprendizaje contrastivo y CLIP — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/contrastive-learning/) · `content/concepts/ml/contrastive-learning.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- CLIP: ~400M pares imagen–texto, batch de 32.768, temperatura aprendida que arranca en τ = 0,07 (escala de logits limitada a 100).
- CLIP zero-shot en ImageNet: 76,2% top-1, igual que el ResNet-50 original sin usar ninguna de sus 1,28M imágenes etiquetadas.
- SimCLR: un batch de 8.192 da 16.382 negativos por par positivo (dos vistas aumentadas por imagen).
- MultipleNegativesRankingLoss de Sentence-Transformers es InfoNCE con negativos in-batch; escala por defecto 20, es decir τ = 0,05.
- Fuentes: [Radford et al. — Learning Transferable Visual Models From Natural Language Supervision (CLIP)](https://arxiv.org/abs/2103.00020) · [van den Oord et al. — Representation Learning with Contrastive Predictive Coding (InfoNCE)](https://arxiv.org/abs/1807.03748) · [Chen et al. — A Simple Framework for Contrastive Learning of Visual Representations (SimCLR)](https://arxiv.org/abs/2002.05709) · [Zhai et al. — Sigmoid Loss for Language Image Pre-Training (SigLIP)](https://arxiv.org/abs/2303.15343)

### [ ] Modelos de difusión — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/diffusion-models/) · `content/concepts/ml/diffusion-models.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- DDPM entrena con T = 1.000 pasos de ruido; DDIM muestrea en decenas de pasos, 10–50× más rápido en tiempo real (Song et al., 2020).
- Stable Diffusion v1: 512×512×3 → latente de 64×64×4 (48× menos valores); U-Net de ~860M parámetros más un encoder de texto CLIP de 123M.
- CFG cuesta 2 pasadas del denoiser por paso; el pipeline de Stable Diffusion en diffusers usa guidance 7,5 por defecto.
- Los modelos destilados (LCM, SDXL Turbo) muestrean en 1–4 pasos; SDXL Turbo trabaja a 512×512 sin CFG.
- Regla práctica: costo por imagen ≈ pasos × (2 con CFG) × una pasada del denoiser, que crece con la resolución.
- Fuentes: [Ho, Jain & Abbeel — Denoising Diffusion Probabilistic Models (DDPM)](https://arxiv.org/abs/2006.11239) · [Rombach et al. — High-Resolution Image Synthesis with Latent Diffusion Models](https://arxiv.org/abs/2112.10752) · [Ho & Salimans — Classifier-Free Diffusion Guidance](https://arxiv.org/abs/2207.12598) · [Esser et al. — Scaling Rectified Flow Transformers for High-Resolution Image Synthesis (SD3)](https://arxiv.org/abs/2403.03206)

## MLOps y sistemas de ML (11)

### [ ] El ciclo de vida de ML — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/ml-lifecycle/) · `content/concepts/mlops/ml-lifecycle.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Niveles de madurez de Google: 0 = manual, 1 = entrenamiento continuo automatizado, 2 = CI/CD del propio pipeline.
- Según la descripción de Google del nivel 0, una nueva versión del modelo se despliega apenas un par de veces al año.
- Sculley et al. (NeurIPS 2015): el código de ML es solo una pequeña fracción de un sistema de ML real.
- Rules of ML #1: no tengas miedo de lanzar un producto sin machine learning.
- Fuentes: [Sculley et al. — Hidden Technical Debt in Machine Learning Systems (NeurIPS 2015)](https://research.google/pubs/hidden-technical-debt-in-machine-learning-systems/) · [Google Cloud — MLOps: Continuous delivery and automation pipelines in machine learning](https://docs.cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning) · [Google — Rules of Machine Learning](https://developers.google.com/machine-learning/guides/rules-of-ml)

### [ ] LLMOps vs MLOps — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/llmops/) · `content/concepts/mlops/llmops.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Los tokens de salida cuestan ~4–5× los de entrada (precios de lista, nov. 2026): $2 vs $10 por 1M en Claude Sonnet 5.5, $2.50 vs $10 en GPT-4o.
- Las APIs batch (OpenAI, Anthropic) bajan el precio ~50% para trabajos que pueden esperar hasta 24 h.
- Con n = 100 casos y 50% de aciertos, el IC del 95% es de unos ±10 puntos: un set chico no ve regresiones chicas.
- Regla práctica: arranca el golden set con ~50–200 casos tomados del tráfico real y hazlo crecer con las fallas.
- Fuentes: [Chip Huyen — Building LLM applications for production](https://huyenchip.com/2023/04/11/llm-engineering.html) · [Eugene Yan — Patterns for Building LLM-based Systems & Products](https://eugeneyan.com/writing/llm-patterns/) · [OpenAI — Deprecations](https://developers.openai.com/api/docs/deprecations)

### [ ] Training–serving skew — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/training-serving-skew/) · `content/concepts/mlops/training-serving-skew.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Rules of ML de Google #29: registra las features usadas al servir y entrena con ellas; #32: reutiliza código entre entrenamiento y serving.
- Regla práctica: en un chequeo de paridad, si más de ~1% de las filas no coincide en una feature, es un bug de código, no ruido.
- TFDV detecta skew en features categóricas con la distancia L-infinito entre las distribuciones de entrenamiento y serving (su guía usa un umbral de 0.01); la divergencia de Jensen-Shannon cubre también las numéricas.
- Fuentes: [Google — Rules of Machine Learning](https://developers.google.com/machine-learning/guides/rules-of-ml) · [TensorFlow Data Validation guide](https://www.tensorflow.org/tfx/guide/tfdv) · [Google Cloud — Model Monitoring overview (Gemini Enterprise Agent Platform, formerly Vertex AI)](https://docs.cloud.google.com/gemini-enterprise-agent-platform/machine-learning/model-monitoring/overview)

### [ ] Data drift y concept drift — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/drift/) · `content/concepts/mlops/drift.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica del PSI: <0.1 estable, 0.1–0.25 cambio moderado, >0.25 cambio significativo que merece acción.
- El PSI suele calcularse con 10 bins de la referencia (deciles); los bins vacíos necesitan un piso chico para evitar log(0).
- KS de dos muestras con n = m = 100k: un D mayor a ~0.006 ya es significativo con p < 0.05.
- La divergencia JS está acotada en [0, 1] con logaritmo en base 2; KL es asimétrica e infinita con bins vacíos.
- Chequeo con clasificador de dominio: un AUC ≈ 0.5 significa que la referencia y los datos en vivo son indistinguibles.
- Fuentes: [Gama et al. — A Survey on Concept Drift Adaptation (ACM Computing Surveys, 2014)](https://dl.acm.org/doi/10.1145/2523813) · [Chip Huyen — Data Distribution Shifts and Monitoring](https://huyenchip.com/2022/02/07/data-distribution-shifts-and-monitoring.html) · [SciPy — scipy.stats.ks_2samp](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html)

### [ ] Model registry y versionado — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/model-registry/) · `content/concepts/mlops/model-registry.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- MLflow 2.9 (dic. 2023) deprecó los stages fijos Staging/Production en favor de alias libres (por ejemplo `@champion`, agregados en 2.8) más tags.
- Regla práctica: mantén cargables las últimas 2–3 versiones de producción para que el rollback sea inmediato.
- Regla práctica: un release de LLM fija ~5 cosas juntas: snapshot del modelo, prompt, índice de recuperación, esquemas de tools y configuración de guardrails.
- Fuentes: [MLflow — Model Registry](https://mlflow.org/docs/latest/ml/model-registry/) · [Amazon SageMaker — Model Registry](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html) · [Google Cloud — Introduction to Model Registry (Gemini Enterprise Agent Platform, formerly Vertex AI)](https://docs.cloud.google.com/gemini-enterprise-agent-platform/machine-learning/model-registry/introduction)

### [ ] Experiment tracking y reproducibilidad — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/experiment-tracking/) · `content/concepts/mlops/experiment-tracking.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Con 100 ejemplos de eval y ~80% de exactitud, el intervalo de confianza del 95% es de unos ±8 puntos: una 'mejora' de 2 puntos es ruido.
- Regla práctica: compara cambios de modelo con 3–5 semillas y reporta media ± desviación estándar.
- Una corrida reproducible fija 4 cosas: commit del código, snapshot de datos, digest del entorno y configuración con semillas.
- Fuentes: [MLflow — Tracking](https://mlflow.org/docs/latest/ml/tracking/) · [Weights & Biases — Experiments overview (W&B docs)](https://docs.coreweave.com/products/wandb/track) · [DVC — Documentation](https://doc.dvc.org/) · [PyTorch — Reproducibility](https://docs.pytorch.org/docs/stable/notes/randomness.html)

### [ ] Monitoreo de modelos en producción — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/ml-monitoring/) · `content/concepts/mlops/ml-monitoring.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica de PSI: < 0.1 estable, 0.1–0.25 cambio moderado, > 0.25 cambio significativo.
- Regla práctica: corre LLM-as-judge sobre ~1–5% del tráfico de producción, y más justo después de un release.
- Google SRE: alerta cuando un SLO de 30 días consume el 2% de su presupuesto de error en 1 hora (burn rate de 14.4×).
- Fuentes: [Chip Huyen — Data Distribution Shifts and Monitoring](https://huyenchip.com/2022/02/07/data-distribution-shifts-and-monitoring.html) · [Google SRE Workbook — Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/) · [Evidently AI — Documentation](https://docs.evidentlyai.com/)

### [ ] Inferencia batch vs en tiempo real — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/batch-vs-realtime/) · `content/concepts/mlops/batch-vs-realtime.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- OpenAI Batch API y Anthropic Message Batches: 50% más baratas que las llamadas síncronas, con resultados en menos de 24 h.
- Regla práctica: una página interactiva tiene ~100–200 ms de punta a punta; al modelo le toca solo una parte.
- La retención por defecto de Kafka es de 7 días (`log.retention.hours=168`): tu ventana para reproducir eventos en un backfill.
- Fuentes: [Chip Huyen — Real-time machine learning: challenges and solutions](https://huyenchip.com/2022/01/02/real-time-machine-learning-challenges-and-solutions.html) · [Amazon SageMaker — Batch transform](https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform.html) · [OpenAI — Batch API guide](https://developers.openai.com/api/docs/guides/batch)

### [ ] Feature stores — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/feature-store/) · `content/concepts/mlops/feature-store.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: las lecturas online deberían tardar pocos ms en p99, porque una llamada completa de fraude o ranking suele tener ~50–100 ms.
- Regla del point-in-time: usa el último valor con feature_ts ≤ label_ts, y solo si está dentro del TTL de la feature.
- Michelangelo de Uber (2017) popularizó la separación entre feature store offline y online.
- Fuentes: [Feast documentation](https://docs.feast.dev/) · [Uber Engineering — Meet Michelangelo: Uber's Machine Learning Platform](https://www.uber.com/blog/michelangelo-machine-learning-platform/)

### [ ] Sistemas de recomendación — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/recsys/) · `content/concepts/mlops/recsys.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Covington et al. (YouTube, 2016): la generación de candidatos reduce millones de videos a cientos; el ranking los puntúa para mostrar decenas.
- Netflix (Gomez-Uribe y Hunt, 2015): las recomendaciones influyen en ~80% de las horas vistas; el otro ~20% viene de la búsqueda.
- Netflix Prize: US$1M por mejorar 10% el RMSE (otorgado en 2009); el ensamble ganador nunca se desplegó completo porque el costo de ingeniería superaba la ganancia (Netflix Tech Blog, 2012).
- Fuentes: [Covington, Adams, Sargin — Deep Neural Networks for YouTube Recommendations (RecSys 2016)](https://dl.acm.org/doi/10.1145/2959100.2959190) · [Gomez-Uribe, Hunt — The Netflix Recommender System: Algorithms, Business Value, and Innovation (2015)](https://dl.acm.org/doi/10.1145/2843948) · [Eugene Yan — System Design for Recommendations and Search](https://eugeneyan.com/writing/system-design-for-discovery/) · [Google — Recommendation Systems course](https://developers.google.com/machine-learning/recommendation)

### [ ] Plataforma de datos para IA — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/data-platform/) · `content/concepts/mlops/data-platform.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Valores por defecto de Delta Lake: `VACUUM` conserva 7 días de archivos viejos y el log de transacciones 30 días; un time travel más antiguo necesita un snapshot explícito.
- Tamaños de archivo objetivo: Iceberg usa 512 MB por defecto y el `OPTIMIZE` de Delta open source 1 GB (Databricks lo ajusta según el tamaño de la tabla); miles de archivos diminutos arruinan la velocidad de lectura.
- Orígenes que conviene saber: Delta Lake nació en Databricks, Iceberg en Netflix y Hudi en Uber.
- Fuentes: [Armbrust et al. — Lakehouse: A New Generation of Open Platforms (CIDR 2021)](https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf) · [Armbrust et al. — Delta Lake: High-Performance ACID Table Storage over Cloud Object Stores (VLDB 2020)](https://www.vldb.org/pvldb/vol13/p3411-armbrust.pdf) · [Apache Iceberg — Documentation](https://iceberg.apache.org/docs/latest/) · [OpenLineage — Documentation](https://openlineage.io/docs/)

## Sistemas distribuidos (37)

### [ ] Estimaciones de servilleta (back-of-the-envelope) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/back-of-envelope/) · `content/concepts/systems/back-of-envelope.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Caché L1 ~1 ns · memoria principal ~100 ns · lectura aleatoria en SSD ~16–100 µs.
- Round trip: mismo datacenter ~0.5 ms; California ↔ Países Bajos ~150 ms.
- 1 día = 86,400 s ≈ 10⁵ s, así que 1M de requests/día ≈ 12 QPS de promedio.
- 2¹⁰ ≈ 10³ (KB), 2²⁰ ≈ 10⁶ (MB), 2³⁰ ≈ 10⁹ (GB), 2⁴⁰ ≈ 10¹² (TB): mil, millón, mil millones, billón.
- Regla práctica: 1 token ≈ 4 caracteres ≈ 0.75 palabras en inglés (en español suele haber más tokens por palabra).
- Fuentes: [Colin Scott — Latency Numbers Every Programmer Should Know (interactive)](https://colin-scott.github.io/personal_website/research/interactive_latency.html) · [Peter Norvig — Teach Yourself Programming in Ten Years (timing table)](https://norvig.com/21-days.html) · [Google SRE Workbook — Non-Abstract Large System Design](https://sre.google/workbook/non-abstract-design/) · [OpenAI Help — What are tokens and how to count them?](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them)

### [ ] CAP y PACELC — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/cap-pacelc/) · `content/concepts/systems/cap-pacelc.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- SLA de Cloud Spanner multirregión: 99.999% (~5 min/año): un sistema CP también puede ser muy disponible.
- Round trip entre continentes ~70–150 ms: el piso de una escritura EC que debe llegar a otra región.
- N=3 réplicas: R=2, W=2 se solapan (R + W > N); R=1, W=1 es la configuración EL rápida.
- Intervalo de refresh por defecto en Elasticsearch/OpenSearch: 1 s; los documentos nuevos no se pueden buscar hasta entonces.
- Fuentes: [Eric Brewer — CAP Twelve Years Later: How the "Rules" Have Changed (InfoQ)](https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/) · [Daniel Abadi — Consistency Tradeoffs in Modern Distributed Database System Design (PACELC)](https://ieeexplore.ieee.org/document/6127847) · [Martin Kleppmann — Please stop calling databases CP or AP](https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html) · [Google Cloud — Spanner Service Level Agreement](https://cloud.google.com/spanner/sla)

### [ ] Replicación — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/replication/) · `content/concepts/systems/replication.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Amazon Aurora: hasta 15 réplicas de lectura, con lag normalmente menor a 100 ms (docs de AWS).
- El failover de RDS Multi-AZ (un standby) suele completarse en 1–2 minutos.
- El TTL por defecto del lock de líder en Patroni es 30 s: más o menos lo que tarda en notarse un líder caído antes de empezar a promover.
- RF=3 es la elección habitual: con quórum 2, sobrevive a la pérdida de una réplica.
- GitHub, oct. 2018: una partición de red de 43 s llevó a un failover entre regiones y ~24 h de servicio degradado.
- Fuentes: [PostgreSQL docs — High Availability, Load Balancing, and Replication](https://www.postgresql.org/docs/current/high-availability.html) · [DeCandia et al. — Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) · [GitHub — October 21 post-incident analysis](https://github.blog/news-insights/company-news/oct21-post-incident-analysis/) · [Martin Kleppmann — Designing Data-Intensive Applications](https://dataintensive.net/)

### [ ] Particionamiento y sharding — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/sharding/) · `content/concepts/systems/sharding.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Pasar de `hash % N` a `% (N+1)` mueve ~N/(N+1) de las keys (~91% con N=10); las particiones fijas o el consistent hashing mueven ~1/(N+1).
- Límites por partición en DynamoDB: 3,000 RCU, 1,000 WCU y 10 GB.
- DynamoDB: 5 índices secundarios locales y 20 globales por tabla (cuota por defecto); los GSI son eventualmente consistentes.
- Instagram (2012) asignó varios miles de shards lógicos de Postgres a muchos menos servidores físicos.
- Fuentes: [Amazon DynamoDB — Best practices for designing and using partition keys effectively](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html) · [Instagram Engineering — Sharding & IDs at Instagram](https://medium.com/instagram-engineering/sharding-ids-at-instagram-1cf5a71e5a5c) · [Martin Kleppmann — Designing Data-Intensive Applications](https://dataintensive.net/)

### [ ] Consistent hashing — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/consistent-hashing/) · `content/concepts/systems/consistent-hashing.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Pasar de N a N+1 nodos: consistent hashing mueve ~1/(N+1) de las claves y `% N` mueve ~N/(N+1). De 10 a 11 es ~9% contra ~91%.
- Regla práctica: con V vnodes por nodo, la dispersión de carga ≈ 1/√V; 100 vnodes ≈ 10% de desviación estándar.
- Cassandra: 256 vnodes por nodo por defecto antes de la 4.0 y 16 desde la 4.0 (junto con un asignador de tokens más inteligente).
- Redis Cluster no usa anillo: 16,384 slots fijos (CRC16 de la clave mod 16384) asignados a los nodos.
- Carga acotada (Google, 2016): limita cada nodo a (1+ε)× la carga promedio; el exceso avanza en sentido horario al siguiente nodo.
- Fuentes: [DeCandia et al. — Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) · [Mirrokni, Thorup, Zadimoghaddam — Consistent Hashing with Bounded Loads](https://arxiv.org/abs/1608.01350) · [Lamping, Veach — A Fast, Minimal Memory, Consistent Hash Algorithm (Jump hash)](https://arxiv.org/abs/1406.2294)

### [ ] Estrategias de caché — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/caching/) · `content/concepts/systems/caching.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Latencia promedio = hit × caché + miss × origen: con 1 ms contra 50 ms, 90% de hits → ~5.9 ms y 99% → ~1.5 ms.
- La carga del origen escala con el miss rate: pasar de 90% a 99% de hits reduce 10× el tráfico al backend.
- Escalera de latencias (Jeff Dean): acceso a RAM ~100 ns, ida y vuelta en el mismo datacenter ~0.5 ms, seek de disco ~10 ms.
- Regla práctica: una instancia de Redis maneja ~100k operaciones simples por segundo con latencia submilisegundo.
- Leer de la prompt cache de Anthropic cuesta ~0.1× el input base; el TTL por defecto es de 5 minutos y se renueva con cada hit.
- Fuentes: [Nishtala et al. — Scaling Memcache at Facebook (NSDI 2013)](https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala) · [RFC 5861 — HTTP Cache-Control Extensions for Stale Content](https://datatracker.ietf.org/doc/html/rfc5861) · [AWS — Caching Best Practices](https://aws.amazon.com/caching/best-practices/)

### [ ] Colas vs streams (Kafka) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/queues-streams/) · `content/concepts/systems/queues-streams.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Retención por defecto en Kafka: 7 días (`log.retention.hours=168`); los topics compactados conservan indefinidamente el último valor por clave.
- Visibility timeout de SQS: 30 s por defecto y 12 h como máximo; retención de mensajes de 4 días por defecto y 14 como máximo.
- Shard de Kinesis: 1 MB/s o 1,000 registros/s de entrada y 2 MB/s de salida.
- El paralelismo de un consumer group ≤ número de particiones; los consumidores extra quedan ociosos.
- Ley de Little para dimensionar: jobs en curso = tasa de llegada × tiempo en el sistema (50 jobs/s × 180 s = 9,000).
- Fuentes: [Apache Kafka documentation — Design (log, partitions, consumer groups)](https://kafka.apache.org/documentation/#design) · [Apache Kafka — Documentation](https://kafka.apache.org/documentation/) · [Amazon SQS — Visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)

### [ ] Idempotencia — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/idempotency/) · `content/concepts/systems/idempotency.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Stripe guarda las claves de idempotencia al menos 24 horas; reutilizar una clave con parámetros distintos devuelve un error.
- HTTP (RFC 9110): GET, HEAD, OPTIONS, TRACE, PUT y DELETE son idempotentes; POST no lo es, y PATCH no tiene garantía de serlo.
- SQS FIFO deduplica por `MessageDeduplicationId` dentro de una ventana de 5 minutos: las ventanas de deduplicación siempre son acotadas.
- Una clave UUIDv4 tiene 122 bits aleatorios: las colisiones no son un problema práctico.
- Fuentes: [Stripe — Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency) · [Brandur Leach — Implementing Stripe-like Idempotency Keys in Postgres](https://brandur.org/idempotency-keys) · [AWS Builders' Library — Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) · [IETF draft — The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)

### [ ] Reintentos, backoff y circuit breakers — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/retries-backoff/) · `content/concepts/systems/retries-backoff.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Full jitter: espera = random(0, min(tope, base × 2^intento)), según el AWS Architecture Blog.
- Google SRE: máximo 3 intentos por request y un presupuesto por cliente que mantiene los reintentos por debajo del 10% de los requests.
- Los reintentos se multiplican entre capas: 3 capas × 4 intentos = 4³ = 64 llamadas al servicio de abajo.
- Los SDKs de Python de OpenAI y Anthropic reintentan 2 veces por defecto con backoff exponencial (429, 5xx, errores de conexión).
- Anthropic devuelve 429 por límite de tasa (con header retry-after) y 529 cuando la API está sobrecargada.
- Fuentes: [AWS Architecture Blog — Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) · [Amazon Builders' Library — Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) · [Google SRE Book — Handling Overload](https://sre.google/sre-book/handling-overload/) · [Martin Fowler — CircuitBreaker](https://martinfowler.com/bliki/CircuitBreaker.html)

### [ ] Rate limiting (límites de tasa) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/rate-limiting/) · `content/concepts/systems/rate-limiting.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- HTTP 429 Too Many Requests está definido en el RFC 6585; envía Retry-After para que el cliente sepa cuándo volver.
- Una ventana fija puede admitir hasta 2× el límite en una ráfaga que cruza el borde.
- Los proveedores de LLM limitan RPM y TPM por separado; Anthropic separa tokens de entrada (ITPM) y de salida (OTPM).
- Dimensionar un token bucket: recarga r = límite / 60 por segundo; capacidad B = la ráfaga más grande que aceptas.
- N réplicas que aplican cada una un límite local L dan un límite efectivo de N × L.
- Fuentes: [Stripe — Scaling your API with rate limiters](https://stripe.com/blog/rate-limiters) · [OpenAI — Rate limits guide](https://platform.openai.com/docs/guides/rate-limits) · [Anthropic — Rate limits](https://platform.claude.com/docs/en/api/rate-limits) · [RFC 6585 — Additional HTTP Status Codes (429)](https://www.rfc-editor.org/rfc/rfc6585)

### [ ] Balanceo de carga (load balancing) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/load-balancing/) · `content/concepts/systems/load-balancing.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Al ubicar n requests en n servidores: una elección al azar da una carga máxima de ~log n / log log n; la mejor de dos al azar da ~log log n.
- El consistent hashing mueve ~1/N de las claves cuando sale uno de N nodos; hash mod N mueve casi todas.
- Defaults de outlier detection en Envoy: expulsa tras 5 respuestas 5xx seguidas, 30 s de expulsión base, máximo 10% de los hosts.
- El costo de prefill de un LLM varía ~500×: un prompt de 100k tokens contra un turno de chat de 200, sin contar la salida.
- Fuentes: [Envoy — Supported load balancers](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers) · [Envoy — Outlier detection](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier) · [Google SRE Book — Load Balancing in the Datacenter](https://sre.google/sre-book/load-balancing-datacenter/) · [Kubernetes Gateway API Inference Extension](https://gateway-api-inference-extension.sigs.k8s.io/)

### [ ] SLIs, SLOs y presupuesto de errores — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/slos/) · `content/concepts/systems/slos.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Presupuesto de errores en 30 días: 99% ≈ 7.2 h, 99.9% ≈ 43 min, 99.99% ≈ 4.3 min.
- Defaults del SRE Workbook: alerta urgente a 14.4× en 1 h (2% del presupuesto) y 6× en 6 h (5%); ticket a 1× en 3 días (10%).
- Con un burn rate de 14.4×, un presupuesto de 30 días se agota en ~2 días (30 / 14.4 ≈ 2.1).
- Las dependencias en serie se multiplican: un servicio al 99.9% sobre una API de LLM al 99.5% queda en ≈ 99.4% sin fallback.
- Fuentes: [Google SRE Book — Service Level Objectives](https://sre.google/sre-book/service-level-objectives/) · [Google SRE Workbook — Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/) · [Google SRE Workbook — Implementing SLOs](https://sre.google/workbook/implementing-slos/) · [Google SRE Workbook — Example Error Budget Policy](https://sre.google/workbook/error-budget-policy/)

### [ ] SQL vs NoSQL — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/sql-vs-nosql/) · `content/concepts/systems/sql-vs-nosql.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- DynamoDB: ítem máximo de 400 KB; cada partición sirve hasta 3,000 RCU y 1,000 WCU por segundo.
- MongoDB: tamaño máximo de documento de 16 MB.
- Los índices de pgvector (HNSW, IVFFlat) admiten hasta 2,000 dimensiones con `vector` y 4,000 con `halfvec`.
- El aislamiento por defecto de Postgres es Read Committed, no Serializable.
- Regla práctica: pgvector en un nodo bien dimensionado va cómodo hasta ~10M de vectores; más allá, planea particionar o una base vectorial dedicada.
- Fuentes: [PostgreSQL docs — JSON Types](https://www.postgresql.org/docs/current/datatype-json.html) · [pgvector — Open-source vector similarity search for Postgres](https://github.com/pgvector/pgvector) · [AWS — NoSQL design for DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html) · [Martin Kleppmann — Designing Data-Intensive Applications](https://dataintensive.net/)

### [ ] Monolito vs microservicios — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/microservices/) · `content/concepts/systems/microservices.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Números de latencia de Jeff Dean: ~100 ns por una referencia a memoria principal vs ~500 µs por un viaje de ida y vuelta dentro de un datacenter, miles de veces más.
- La disponibilidad se multiplica: 5 dependencias en serie al 99.9% cada una dan ~99.5% de punta a punta (0.999^5).
- Regla de las dos pizzas de Amazon: un servicio pertenece a un equipo tan pequeño que se alimenta con dos pizzas.
- Fuentes: [Martin Fowler — MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html) · [James Lewis & Martin Fowler — Microservices](https://martinfowler.com/articles/microservices.html) · [Martin Fowler — Conway's Law](https://martinfowler.com/bliki/ConwaysLaw.html) · [Martin Fowler — Strangler Fig Application](https://martinfowler.com/bliki/StranglerFigApplication.html)

### [ ] Observabilidad: logs, métricas y trazas — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/observability/) · `content/concepts/systems/observability.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Número de series = producto de los valores de las etiquetas: 50 rutas × 5 códigos de estado × 20 pods = 5,000 series; agrega `user_id` con 1M de usuarios y son 5 mil millones.
- El `traceparent` de W3C lleva un trace-id de 16 bytes y un span-id padre de 8 bytes.
- Las cuatro señales doradas del SRE de Google: latencia, tráfico, errores y saturación.
- Regla práctica: con alto volumen, muestrea ~1–10% de las trazas al inicio, pero usa tail sampling para conservar el 100% de los errores y las peticiones lentas.
- Fuentes: [OpenTelemetry — Traces](https://opentelemetry.io/docs/concepts/signals/traces/) · [OpenTelemetry — Semantic conventions for generative AI](https://opentelemetry.io/docs/specs/semconv/gen-ai/) · [Brendan Gregg — The USE Method](https://www.brendangregg.com/usemethod.html) · [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)

### [ ] Diseño de APIs: REST, gRPC y async — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/api-design/) · `content/concepts/systems/api-design.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- RFC 9110: `GET`, `HEAD` y `OPTIONS` son seguros; esos más `PUT` y `DELETE` son idempotentes; `POST` no lo es.
- Pasa a async después de ~30 s: el timeout de integración de AWS API Gateway es de 29 s por defecto y el idle timeout del ALB, de 60 s.
- Stripe elimina las claves de idempotencia después de ≥24 h; un reenvío dentro de esa ventana devuelve el resultado original, incluso un 500.
- El tamaño máximo de mensaje recibido por defecto en gRPC es de 4 MB: transmite los payloads grandes por streaming en vez de subirlo a ciegas.
- `OFFSET 500000 LIMIT 50` lee y descarta 500,000 filas; un cursor por clave (`WHERE id > $1 ORDER BY id`) llega directo con el índice.
- Fuentes: [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) · [gRPC — Core concepts, architecture and lifecycle](https://grpc.io/docs/what-is-grpc/core-concepts/) · [Stripe API — Idempotent requests](https://docs.stripe.com/api/idempotent_requests) · [Google Cloud — API design guide](https://cloud.google.com/apis/design)

### [ ] CDN y caché en el edge — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/cdn/) · `content/concepts/systems/cdn.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Carga del origen = peticiones × (1 − hit ratio): 95% de hits → 5% llega al origen; 99% → 1%.
- Assets con huella: `Cache-Control: public, max-age=31536000, immutable` (un año).
- CloudFront: las primeras 1,000 rutas de invalidación al mes son gratis; un comodín `/*` cuenta como una ruta (revisado en nov. 2026).
- CloudFront sin cache policy usa un TTL por defecto de 24 h cuando el origen no envía `Cache-Control`.
- Fuentes: [RFC 9111 — HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111) · [Amazon CloudFront — Use Origin Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html) · [Amazon CloudFront — Manage how long content stays in the cache](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html) · [Valve — Steam store incident statement (Dec 2015)](https://store.steampowered.com/oldnews/19852)

### [ ] Almacenamiento de objetos (estilo S3) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/object-storage/) · `content/concepts/systems/object-storage.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- S3 Standard: diseñado para 11 nueves (99.999999999%) de durabilidad, con datos en al menos 3 AZs.
- Multipart: partes de 5 MiB–5 GiB, máximo 10,000; objeto máximo de 50 TB desde dic. 2025 (10,000 × 5 GiB).
- Por prefijo particionado: al menos 3,500 escrituras/s y 11,000 lecturas/s (docs de AWS, nov. 2026); reparte las keys en varios prefijos para ir más alto.
- Precio de lista en us-east-1 (nov. 2026), por GB-mes: Standard $0.023, Standard-IA $0.0125, Glacier Instant Retrieval $0.004; los PUT, $0.005 por cada 1,000.
- Presigned URLs: hasta 7 días con llaves de un usuario IAM; con credenciales de un rol expiran junto con la sesión.
- Fuentes: [Amazon S3 — Uploading objects using multipart upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html) · [Amazon S3 — Download and upload objects with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) · [Amazon S3 — Storage classes](https://aws.amazon.com/s3/storage-classes/) · [Amazon S3 — Optimizing performance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html)

### [ ] Entrega en tiempo real: polling, SSE, WebSockets — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/realtime-delivery/) · `content/concepts/systems/realtime-delivery.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Navegadores: 6 conexiones SSE por dominio sobre HTTP/1.1, compartidas por todas las pestañas; HTTP/2 negocia streams (100 por defecto) (MDN).
- Timeout de inactividad por defecto de AWS ALB: 60 s. Envía heartbeats más seguido o se cortan las conexiones inactivas.
- Discord (2017): ~5M usuarios concurrentes; guilds de hasta 30k usuarios concurrentes; publicar en guilds grandes tardaba 900 ms–2.1 s antes de Manifold.
- Slack (2023): decenas de millones de clientes conectados; mensajes entregados en todo el mundo en ~500 ms.
- Dimensionamiento de gateways (supuesto): 10M conexiones ÷ 100k por nodo ≈ 100 nodos, más margen para perder una zona.
- Fuentes: [RFC 6455 — The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455) · [MDN — Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) · [Slack Engineering — Real-time Messaging (2023)](https://slack.engineering/real-time-messaging/) · [Discord — How Discord Scaled Elixir to 5,000,000 Concurrent Users (2017)](https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users)

### [ ] AuthN vs AuthZ: sesiones, JWT, OAuth — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/authn-authz/) · `content/concepts/systems/authn-authz.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- PKCE (RFC 7636, 2015): verifier de 43–128 caracteres; challenge = base64url(SHA-256(verifier)).
- RFC 9700 (BCP de seguridad de OAuth, ene. 2025): los clientes públicos DEBEN usar PKCE; el password grant NO DEBE usarse.
- Valores por defecto de Amazon Cognito (revisados en nov. 2026): access e ID tokens de 1 hora, refresh tokens de 30 días.
- Google Zanzibar (2019): billones de ACLs, millones de validaciones/s, p95 bajo 10 ms.
- Fuentes: [RFC 9700 — Best Current Practice for OAuth 2.0 Security (2025)](https://datatracker.ietf.org/doc/html/rfc9700) · [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) · [RFC 8725 — JSON Web Token Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725) · [Pang et al. — Zanzibar: Google's Consistent, Global Authorization System (USENIX ATC 2019)](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)

### [ ] Cifrado y gestión de secretos — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/encryption-secrets/) · `content/concepts/systems/encryption-secrets.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- TLS 1.3: RFC 8446 (agosto de 2018), reeditado con aclaraciones como RFC 9846 (julio de 2026). Sin intercambio de llaves RSA estático, solo cifrados AEAD, handshake de 1-RTT; los datos 0-RTT se pueden reproducir (replay).
- `Encrypt` de AWS KMS acepta como máximo 4.096 bytes, así que los datos grandes necesitan una data key de `GenerateDataKey`.
- Rotación automática de AWS KMS (revisado en nov. 2026): cada 365 días por defecto, configurable de 90 a 2.560 días; el material antiguo se conserva.
- OWASP Password Storage Cheat Sheet (revisado en nov. 2026): Argon2id con al menos 19 MiB de memoria, 2 iteraciones y paralelismo 1; bcrypt heredado con work factor 10 o más y límite de 72 bytes.
- Las credenciales de un rol de AWS STS (revisado en nov. 2026) duran de 15 minutos a 12 horas, 1 hora por defecto.
- Fuentes: [RFC 9846 — The Transport Layer Security (TLS) Protocol Version 1.3 (July 2026, obsoletes RFC 8446)](https://www.rfc-editor.org/rfc/rfc9846.html) · [AWS KMS Developer Guide — Cryptography essentials (envelope encryption)](https://docs.aws.amazon.com/kms/latest/developerguide/kms-cryptography.html) · [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) · [OWASP — Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

### [ ] Modelos de consistencia — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/consistency-models/) · `content/concepts/systems/consistency-models.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla de quórum: R + W > N; la configuración habitual es N=3, W=2, R=2.
- En DynamoDB las lecturas son eventualmente consistentes por defecto; una lectura fuertemente consistente cuesta el doble de capacidad de lectura.
- Amazon S3 tiene consistencia fuerte de lectura después de escritura desde diciembre de 2020.
- La incertidumbre de TrueTime (ε) en Spanner era de ~1–7 ms según el paper de 2012; el commit wait espera ese tiempo antes de confirmar una escritura.
- Fuentes: [Jepsen — Consistency Models](https://jepsen.io/consistency) · [Werner Vogels — Eventually Consistent](https://www.allthingsdistributed.com/2008/12/eventually_consistent.html) · [Amazon DynamoDB — Read consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html) · [Martin Kleppmann — Designing Data-Intensive Applications](https://dataintensive.net/)

### [ ] Consenso (Raft) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/consensus/) · `content/concepts/systems/consensus.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- 2f+1 nodos toleran f fallas: 3→1, 5→2, 7→3. Los tamaños pares agregan costo, no tolerancia.
- Regla práctica: confirmar cuesta un viaje de ida y vuelta a una mayoría más un fsync, ~1–5 ms en una región y 50–200 ms entre continentes.
- Valores por defecto de etcd: heartbeat de 100 ms, timeout de elección de 1,000 ms y cuota de almacenamiento de 2 GB.
- Paper de Raft: los timeouts de elección aleatorios de 150–300 ms hacen raros los empates de votos.
- Kafka 4.0 (2025) eliminó ZooKeeper; los metadatos del clúster ahora viven en un quórum KRaft (Raft).
- Fuentes: [Ongaro, Ousterhout — In Search of an Understandable Consensus Algorithm (Raft, 2014)](https://raft.github.io/raft.pdf) · [The Raft Consensus Algorithm — visualization and implementations](https://raft.github.io/) · [Lamport — Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf) · [Martin Kleppmann — How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)

### [ ] Backpressure y load shedding — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/backpressure-load-shedding/) · `content/concepts/systems/backpressure-load-shedding.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Espera en cola ≈ profundidad ÷ tasa de servicio: 200 en cola a 1.000 req/s son 0,2 s de espera.
- Google SRE: con tráfico estable, mantén la cola en 50% o menos del tamaño del thread pool.
- Google etiqueta cada solicitud con uno de cuatro niveles de criticidad: CRITICAL_PLUS, CRITICAL, SHEDDABLE_PLUS, SHEDDABLE.
- Los clientes de Google se frenan solos cuando sus solicitudes superan K × las aceptadas; K = 2 es el valor habitual.
- Las fallas metaestables fueron bautizadas por Bronson et al. en HotOS 2021.
- Fuentes: [Amazon Builders' Library — Using load shedding to avoid overload](https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/) · [Google SRE Book — Handling Overload](https://sre.google/sre-book/handling-overload/) · [Google SRE Book — Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/) · [Bronson et al. — Metastable Failures in Distributed Systems (HotOS 2021)](https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s11-bronson.pdf)

### [ ] Recuperación ante desastres (RPO y RTO) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/disaster-recovery/) · `content/concepts/systems/disaster-recovery.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- AWS Well-Architected (revisado en nov. 2026): backup and restore = RPO de horas, RTO de hasta un día; pilot light = RPO de minutos, RTO de decenas de minutos.
- Misma fuente: warm standby = RPO de segundos, RTO de minutos; multi-site active-active lleva ambos hacia cero.
- Aurora Global Database (AWS, revisado en nov. 2026): replicación asíncrona entre regiones, normalmente con menos de 1 s de atraso; una secundaria se promueve en menos de un minuto.
- DynamoDB global tables (revisado en nov. 2026): el modo por defecto es asíncrono (RPO de unos segundos); el modo de consistencia fuerte es síncrono (RPO 0) y exige exactamente tres regiones.
- GitLab, enero de 2017: ~6 h de datos perdidos y más de 18 h de caída después de que los backups fallaran en silencio.
- Fuentes: [AWS Whitepaper — Disaster recovery options in the cloud](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html) · [AWS Well-Architected Framework — REL13-BP02 Use defined recovery strategies to meet the recovery objectives](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel13-bp02.html) · [Amazon DynamoDB — How global tables work (consistency modes, RPO)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html) · [GitLab — Postmortem of database outage of January 31 (2017)](https://about.gitlab.com/blog/postmortem-of-database-outage-of-january-31/)

### [ ] Índices de bases de datos: B-tree vs LSM — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/indexes/) · `content/concepts/systems/indexes.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tamaño de página: 8 KB en Postgres, 16 KB en InnoDB; con cientos de claves por página, los B-trees se quedan en ~3–4 niveles.
- Bloom filter: ~10 bits por clave dan ~1% de falsos positivos (la configuración clásica de RocksDB).
- Los índices covering de Postgres (`INCLUDE`) existen desde la v11; los index-only scans requieren un visibility map al día por el vacuum.
- La compactación size-tiered escribe SSTables nuevos mientras los viejos siguen en disco, así que en el peor caso necesita espacio libre casi igual a los datos que compacta: deja ~50% de margen.
- Fuentes: [PostgreSQL docs — Multicolumn Indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html) · [PostgreSQL docs — Index-Only Scans and Covering Indexes](https://www.postgresql.org/docs/current/indexes-index-only-scans.html) · [RocksDB wiki — Leveled Compaction](https://github.com/facebook/rocksdb/wiki/Leveled-Compaction) · [Use The Index, Luke — SQL indexing and tuning](https://use-the-index-luke.com/)

### [ ] Event sourcing y CQRS — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/event-driven/) · `content/concepts/systems/event-driven.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- La retención por defecto de Kafka es de 7 días (`log.retention.hours=168`): un event store necesita retención infinita.
- Regla práctica: haz snapshot de un stream cada ~100–1,000 eventos para que cargar nunca reproduzca miles.
- Fuentes: [Martin Fowler — Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) · [Martin Fowler — CQRS](https://martinfowler.com/bliki/CQRS.html) · [Microsoft Azure Architecture Center — Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)

### [ ] Sagas y el patrón outbox — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/sagas-outbox/) · `content/concepts/systems/sagas-outbox.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Las sagas las propusieron Garcia-Molina y Salem en 1987, para transacciones de larga duración en una sola base.
- 2PC: dos viajes de ida y vuelta con locks retenidos todo el tiempo; si el coordinador cae después del PREPARE, los participantes quedan bloqueados.
- Postgres retiene el WAL de un replication slot sin consumir indefinidamente, salvo que `max_slot_wal_keep_size` (PG 13+) lo limite.
- Fuentes: [Garcia-Molina & Salem — Sagas (SIGMOD 1987)](https://doi.org/10.1145/38713.38742) · [microservices.io — Pattern: Saga](https://microservices.io/patterns/data/saga.html) · [microservices.io — Pattern: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html) · [Debezium — Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)

### [ ] Patrones de multi-tenancy — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/multi-tenancy/) · `content/concepts/systems/multi-tenancy.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Postgres omite RLS para superusuarios y roles con `BYPASSRLS`, y para el dueño de la tabla salvo que actives `FORCE ROW LEVEL SECURITY`.
- HTTP 429 Too Many Requests (RFC 6585) con `Retry-After` es la respuesta estándar para un tenant que superó su cuota.
- La replicación lógica de Postgres admite filtros de filas desde la v15: copia las filas de un tenant fuera del pool con `WHERE tenant_id = ...`.
- Fuentes: [AWS SaaS Lens — Silo, pool, and bridge models](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html) · [Azure Architecture Center — Noisy Neighbor antipattern](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/noisy-neighbor/noisy-neighbor) · [Azure Architecture Center — Tenancy models for a multitenant solution](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models) · [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

### [ ] Estructuras de datos probabilísticas — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/probabilistic-structures/) · `content/concepts/systems/probabilistic-structures.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Bloom: 1% de falsos positivos → ~9.6 bits/clave y 7 hashes; 0.1% → ~14.4 bits/clave y 10 hashes.
- Dimensionar un Bloom: m = −n·ln p / (ln 2)² bits; k óptimo = (m/n)·ln 2.
- Error estándar de HyperLogLog ≈ 1.04/√m; el paper cuenta más de 10⁹ elementos con ~2% usando 1.5 KB.
- HyperLogLog de Redis: hasta 12 KB, 0.81% de error estándar, hasta 2^64 elementos.
- Count-Min: ancho w = ⌈e/ε⌉, profundidad d = ⌈ln(1/δ)⌉; el exceso es ≤ ε·N con probabilidad 1−δ.
- Fuentes: [Redis docs — Bloom filter](https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/) · [Redis docs — HyperLogLog](https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/) · [Flajolet et al. — HyperLogLog (AofA 2007)](https://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf) · [Cormode & Muthukrishnan — The Count-Min Sketch (J. Algorithms 2005)](https://www.cs.ox.ac.uk/people/graham.cormode/pubs/html/CormodeMuthukrishnan04CMJalg.html)

### [ ] Relojes y orden de eventos — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/clocks-ordering/) · `content/concepts/systems/clocks-ordering.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Precisión de NTP: ~1 ms o mejor en una LAN, decenas de ms por internet pública.
- Spanner (2012): el ε de TrueTime es un diente de sierra de ~1–7 ms, ~4 ms casi siempre; drift supuesto de 200 µs/s.
- Un drift de 200 µs/s = 6 ms tras 30 s y ~17 s tras un día sin sincronizar.
- El desfase máximo de reloj en CockroachDB es 500 ms por defecto; un nodo desfasado en un 80% de eso respecto de la mitad del clúster se apaga (docs, nov. 2026).
- Fuentes: [Lamport — Time, Clocks, and the Ordering of Events in a Distributed System (CACM 1978)](https://www.microsoft.com/en-us/research/publication/time-clocks-ordering-events-distributed-system/) · [Kulkarni et al. — Logical Physical Clocks and Consistent Snapshots (HLC, 2014)](https://cse.buffalo.edu/tech-reports/2014-04.pdf) · [Corbett et al. — Spanner: Google's Globally-Distributed Database (OSDI 2012)](https://research.google/pubs/spanner-googles-globally-distributed-database-2/) · [CockroachDB docs — Transaction Layer (HLC, max clock offset)](https://docs.cockroachlabs.com/docs/stable/architecture/transaction-layer)

### [ ] Protocolos gossip y detección de fallas — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/gossip-membership/) · `content/concepts/systems/gossip-membership.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Cassandra: cada segundo cada nodo hace gossip con un nodo al azar, y a veces con uno inalcanzable o un seed; condena a sus pares con una variante de phi accrual (`phi_convict_threshold` 8 por defecto).
- Valores por defecto para LAN de HashiCorp memberlist (revisado en nov. 2026): gossip a 3 nodos cada 200 ms, un sondeo por segundo, 3 sondeos indirectos.
- Paper de Dynamo (2007): cada nodo contacta a un par al azar cada segundo; hacer gossip de la membresía completa funciona para un par de cientos de nodos.
- SWIM (2002): el tiempo de detección y la carga de mensajes por miembro no crecen con el tamaño del grupo; los heartbeats de todos contra todos crecen como N².
- Simulación de juguete, fanout 3: ~8 rondas para 1.000 nodos, 10–11 para 10.000, ~13 para 100.000.
- Fuentes: [Das, Gupta, Motivala — SWIM: Scalable Weakly-consistent Infection-style Process Group Membership Protocol (2002)](https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf) · [Apache Cassandra docs — Dynamo: gossip, ring membership and failure detection](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html) · [DeCandia et al. — Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) · [HashiCorp Consul docs — Gossip (Serf, SWIM, Lifeguard)](https://developer.hashicorp.com/consul/docs/concept/gossip)

### [ ] Locks distribuidos y fencing tokens — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/distributed-locks/) · `content/concepts/systems/distributed-locks.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Lock en Redis: `SET key random NX PX 30000`; libéralo solo si el valor sigue coincidiendo (script Lua, o `DELEX` en Redis 8.4+).
- Redlock: N = 5 masters de Redis independientes, se necesita una mayoría de 3; timeout de ~5–50 ms por nodo para un lease de 10 s.
- Kleppmann (2016): hubo pausas de GC de minutos, y un incidente de GitHub demoró paquetes ~90 s, mucho más que los TTL típicos.
- Redis expira las claves por reloj de pared, no por un reloj monotónico, así que un salto de reloj puede liberar un lock antes de tiempo.
- Fuentes: [Martin Kleppmann — How to do distributed locking (2016)](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) · [Redis docs — Distributed Locks with Redis (Redlock)](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) · [Burrows — The Chubby lock service for loosely-coupled distributed systems (OSDI 2006)](https://research.google/pubs/the-chubby-lock-service-for-loosely-coupled-distributed-systems/)

### [ ] Stream processing: ventanas, watermarks, estado — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/stream-processing/) · `content/concepts/systems/stream-processing.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Watermark de desorden acotado ≈ máximo event time visto − demora permitida (p. ej., 30 s).
- Los sinks exactly-once de Flink usan two-phase commit desde Flink 1.4 (dic. 2017) y confirman en cada checkpoint.
- Kafka Streams: `processing.guarantee=exactly_once_v2` (Kafka 3.0+, brokers 2.5+).
- Con salida transaccional, los lectores con `read_committed` ven los resultados solo tras el commit: latencia ≥ intervalo de checkpoint.
- Fuentes: [Akidau et al. — The Dataflow Model (VLDB 2015)](https://research.google/pubs/the-dataflow-model-a-practical-approach-to-balancing-correctness-latency-and-cost-in-massive-scale-unbounded-out-of-order-data-processing/) · [Apache Flink docs — Timely Stream Processing (event time, watermarks)](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/) · [Apache Flink — End-to-End Exactly-Once Processing with Kafka (2018)](https://flink.apache.org/2018/02/28/an-overview-of-end-to-end-exactly-once-processing-in-apache-flink-with-apache-kafka-too/)

### [ ] Indexación geoespacial (geohash, S2, H3) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/geospatial-indexing/) · `content/concepts/systems/geospatial-indexing.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Geohash en el ecuador: 5 caracteres ≈ 4.9 × 4.9 km, 6 ≈ 1.2 km × 609 m, 7 ≈ 153 × 152 m.
- H3: 16 resoluciones, cada una con ~7× más celdas; res 8 ≈ 0.74 km² (lado ~0.53 km), res 9 ≈ 0.1 km².
- Un anillo H3 de radio k tiene 1 + 3k(k+1) hexágonos: 7 para k=1 y 19 para k=2.
- S2: 31 niveles (0–30) de ids de celda de 64 bits; las celdas hoja miden ~1 cm.
- Redis GEO: un geohash de 52 bits como score del sorted set; una consulta por radio revisa las 1 + 8 áreas que rodean el punto.
- Fuentes: [Uber — H3: Uber's Hexagonal Hierarchical Spatial Index (2018)](https://www.uber.com/blog/h3/) · [S2 Geometry — S2 Cell Hierarchy](https://s2geometry.io/devguide/s2cell_hierarchy) · [Redis — GEOADD (how geohash scores work)](https://redis.io/docs/latest/commands/geoadd/) · [Elastic — Geohash grid aggregation (cell sizes)](https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-geohashgrid-aggregation)

### [ ] Estrategias de deploy (canary, blue-green, flags) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/deployment-strategies/) · `content/concepts/systems/deployment-strategies.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Google SRE: aproximadamente el 70% de las caídas se debe a cambios en un sistema en vivo.
- Defaults del rolling update de Kubernetes: `maxSurge` 25% (redondeado hacia arriba), `maxUnavailable` 25% (redondeado hacia abajo).
- Ejemplo del SRE workbook: un cambio que falla en el 20% de los requests detrás de un canary del 5% cuesta ~1% del total.
- CrowdStrike (jul. 2024): una actualización de contenido tumbó ~8.5M dispositivos Windows (estimación de Microsoft); su plan de remediación agregó canary y despliegues por etapas.
- Fuentes: [Google SRE Workbook — Canarying Releases](https://sre.google/workbook/canarying-releases/) · [Google SRE Book — Introduction (change management: ~70% of outages)](https://sre.google/sre-book/introduction/) · [Danilo Sato — Parallel Change (expand and contract)](https://martinfowler.com/bliki/ParallelChange.html) · [SEC — Order against Knight Capital Americas LLC (Release 34-70694, Oct 2013)](https://www.sec.gov/files/litigation/admin/2013/34-70694.pdf)

### [ ] Motores de almacenamiento: LSM-tree vs B-tree — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/storage-engines/) · `content/concepts/systems/storage-engines.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Guía de tuning de RocksDB, 500 GB con niveles de 10×: amplificación de escritura ~33 y de espacio ~1.14.
- La compactación leveled deja ~90% de los datos en el último nivel, por eso la amplificación de espacio queda cerca de 1.1×.
- La compactación universal (size-tiered) puede duplicar temporalmente el uso de disco durante una compactación completa.
- Páginas de B-tree: 8 KB en Postgres y 16 KB en InnoDB, que se escriben enteras aunque cambien 100 bytes.
- UDB de Facebook en MyRocks: ~50% menos almacenamiento que InnoDB comprimido (2016).
- Fuentes: [O'Neil et al. — The Log-Structured Merge-Tree (Acta Informatica, 1996)](https://www.cs.umb.edu/~poneil/lsmtree.pdf) · [RocksDB wiki — RocksDB Tuning Guide](https://github.com/facebook/rocksdb/wiki/RocksDB-Tuning-Guide) · [RocksDB wiki — Universal Compaction](https://github.com/facebook/rocksdb/wiki/Universal-Compaction) · [Meta Engineering — MyRocks: A space- and write-optimized MySQL database (2016)](https://engineering.fb.com/2016/08/31/core-data/myrocks-a-space-and-write-optimized-mysql-database/)

## Diseño de sistemas clásico (23)

### [ ] Diseño: acortador de URLs — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-url-shortener/) · `content/concepts/sysdesign/case-url-shortener.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Escrituras: 100M de enlaces/día (supuesto) ÷ 86,400 s ≈ 1.2k/s; con 100:1 de lecturas ≈ 116k redirecciones/s en promedio.
- Espacio de keys: 62^6 ≈ 56.8 mil millones, 62^7 ≈ 3.5 billones; a 100M/día, 6 caracteres duran ~1.6 años y 7 duran ~96 años.
- Almacenamiento: 5 años ≈ 180 mil millones de enlaces × ~500 B ≈ ~90 TB antes de replicar.
- Hash truncado a 7 caracteres base62: ~50% de probabilidad de una colisión con apenas ~2.2M de enlaces.
- Los IDs Snowflake (41 bits de tiempo, 10 de máquina, 12 de secuencia) son enteros de 64 bits: hasta 11 caracteres base62.
- Fuentes: [RFC 9110 — HTTP Semantics, §15.4 Redirection 3xx](https://www.rfc-editor.org/rfc/rfc9110.html#name-redirection-3xx) · [MDN — Redirections in HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Redirections) · [Twitter (archived) — Snowflake ID generator README (2010)](https://github.com/twitter-archive/snowflake/tree/snowflake-2010)

### [ ] Diseño: rate limiter distribuido — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-rate-limiter/) · `content/concepts/sysdesign/case-rate-limiter.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Memoria (supuesta): 10M de keys activas × ~100 B por contador ≈ ~1 GB. La memoria de los contadores rara vez es el límite.
- Throughput: 100k verificaciones/s (supuesto) es más o menos lo que rinde una instancia de Redis, ~100k ops simples/s (regla práctica): particiona por key del cliente.
- Cloudflare (2017): sus contadores de ventana deslizante permitieron o limitaron por error solo el 0.003% de 400M de requests.
- Filtro de rate limit de Envoy: timeout de 20 ms por defecto; ante errores deja pasar el tráfico salvo que actives `failure_mode_deny` (entonces responde 500).
- N regiones con contadores independientes: en el peor caso, N × el límite; con un reparto fijo, un cliente de una sola región recibe 1/N.
- Fuentes: [Redis — INCR (Pattern: rate limiter)](https://redis.io/docs/latest/commands/incr/) · [Cloudflare — How we built rate limiting capable of scaling to millions of domains (2017)](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/) · [Envoy — HTTP rate limit filter, v3 API (timeout, failure_mode_deny)](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto) · [Stripe — Scaling your API with rate limiters (2017)](https://stripe.com/blog/rate-limiters)

### [ ] Diseño: sistema de notificaciones — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-notification-system/) · `content/concepts/sysdesign/case-notification-system.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Volumen: 100M de usuarios × 10 notificaciones/día (supuesto) = mil millones/día ≈ 12k/s en promedio; las campañas generan picos muy superiores.
- Claves de deduplicación: mil millones/día × ~100 B ≈ 100 GB por cada día de TTL; un TTL de 7 días ≈ 700 GB.
- APNs: payload ≤ 4 KB (VoIP 5 KB); guarda un push no entregado hasta 30 días.
- FCM: TTL de 0 a 28 días; 4 collapse keys por dispositivo; Android descarta todo tras 100 mensajes no colapsables pendientes.
- Envíos masivos a Gmail (5,000+/día, desde feb. 2024): SPF, DKIM, DMARC, baja con un clic y tasa de spam bajo 0.3%.
- Fuentes: [Apple — Sending notification requests to APNs](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns) · [Firebase — Non-collapsible and collapsible messages](https://firebase.google.com/docs/cloud-messaging/customize-messages/collapsible-message-types) · [Firebase — Set the lifespan of a message](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-lifespan) · [Google — Email sender guidelines (Gmail)](https://support.google.com/mail/answer/81126)

### [ ] Diseño: autocompletado de búsqueda (typeahead) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-typeahead/) · `content/concepts/sysdesign/case-typeahead.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tráfico: 100M de DAU × 10 búsquedas × ~6 peticiones (supuesto) = 6 mil millones/día ≈ 70k QPS, ~140k en el pico.
- Presupuesto: ~100 ms de la tecla a la pantalla se sienten instantáneos (Nielsen, 1993); la red se lleva la mayor parte.
- Memoria: ~100M de prefijos × top 10 × IDs de 4 bytes ≈ 4 GB más las claves (supuesto): replica, no particiones.
- Facebook (2010): tardar más de 100 ms en traer un resultado hace que el typeahead "tartamudee".
- Fuentes: [Meta Engineering — The life of a typeahead query (2010)](https://engineering.fb.com/2010/05/17/web/the-life-of-a-typeahead-query/) · [Nielsen Norman Group — Response times: the 3 important limits](https://www.nngroup.com/articles/response-times-3-important-limits/) · [Elastic — Elasticsearch suggesters (completion suggester)](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-suggesters)

### [ ] Diseño: web crawler — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-web-crawler/) · `content/concepts/sysdesign/case-web-crawler.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Throughput: 1B de páginas/mes ÷ ~2.6M s ≈ ~400 páginas/s (supuesto); planifica ~800/s para un pico de 2×.
- Common Crawl, ago. 2026: 2.14B de páginas, 360 TiB sin comprimir, ~185 KB por página.
- Filtro de Bloom: ~9.6 bits por elemento con 1% de falsos positivos, así que 10B de URLs ≈ 12 GB.
- RFC 9309: robots.txt en cache ≤ 24 h, procesar ≥ 500 KiB, un 5xx significa asumir prohibición total.
- Casi duplicados: SimHash de 64 bits con ≤ 3 bits distintos sirve para 8B de páginas (Google, WWW 2007).
- Fuentes: [RFC 9309 — Robots Exclusion Protocol (2022)](https://www.rfc-editor.org/rfc/rfc9309) · [Google Crawling Infrastructure — How Google interprets the robots.txt specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) · [Manku, Jain, Das Sarma — Detecting near-duplicates for web crawling (WWW 2007)](https://research.google/pubs/detecting-near-duplicates-for-web-crawling/) · [Common Crawl — August 2026 crawl archive](https://commoncrawl.org/blog/august-2026-crawl-archive-now-available)

### [ ] Diseño: cache distribuida — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-distributed-cache/) · `content/concepts/sysdesign/case-distributed-cache.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Redis Cluster: 16,384 slots, slot = CRC16(key) mod 16384; máximo sugerido de ~1,000 nodos.
- Valores por defecto de Memcached: 64 MB de memoria, ítems de hasta 1 MB, 4 threads, puerto 11211; las keys admiten hasta 250 bytes.
- Valores por defecto de Redis: sin límite de memoria, `noeviction` y 5 keys de muestra por desalojo.
- Dimensionamiento (supuesto): 240 GB ÷ 24 GB útiles por nodo de 32 GB = 10 primarios, 20 nodos con réplicas; 500k ops/s ÷ 10 = 50k cada uno.
- Pierdes 1 de 10 nodos con un hit rate de 95%: la carga de la base pasa de 5% a 14.5% de las lecturas, 2.9×.
- Fuentes: [Redis — Cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/) · [Redis — Key eviction](https://redis.io/docs/latest/develop/reference/eviction/) · [Memcached — Configuring the server (defaults)](https://docs.memcached.org/serverguide/configuring/) · [Nishtala et al. — Scaling Memcache at Facebook (NSDI 2013)](https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala)

### [ ] Diseño: plataforma de streaming de video — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-video-streaming/) · `content/concepts/sysdesign/case-video-streaming.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Egress: supón 100M de reproducciones/día × 5 min × ~3 Mbps → ~11 PB/día, ~1 Tbps en promedio.
- Escalera H.264 de ejemplo de Apple: de 145 kbps (416×234) a 7,800 kbps (1080p); 9 peldaños suman ~25.6 Mbps.
- Especificación HLS de Apple: segmentos de ~6 s y un keyframe cada 2 s.
- Multipart de S3 (nov. 2026): hasta 10,000 partes de 5 MiB a 5 GiB; objetos de hasta 48.8 TiB.
- El ABR basado en buffer redujo 10–20% los rebuffers de Netflix frente a su algoritmo por defecto (SIGCOMM 2014).
- Fuentes: [RFC 8216 — HTTP Live Streaming (2017)](https://www.rfc-editor.org/rfc/rfc8216.html) · [Apple — HLS authoring specification for Apple devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) · [Netflix — Open Connect](https://openconnect.netflix.com/en/) · [AWS — Amazon S3 multipart upload limits](https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html)

### [ ] Diseño: servicio de proximidad (Yelp) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-proximity-service/) · `content/concepts/sysdesign/case-proximity-service.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Carga (supuesta): 100M de usuarios diarios × 5 búsquedas ÷ 86,400 s ≈ ~5.8k búsquedas/s en promedio.
- Celdas de geohash en el ecuador: 4 caracteres ≈ 39.1 × 19.5 km, 5 ≈ 4.9 × 4.9 km, 6 ≈ 1.2 km × 609 m.
- Cada carácter de geohash agrega 5 bits: un carácter menos es una celda 32× más grande.
- Índice geográfico (supuesto): 200M de entradas × ~30 B ≈ ~6 GB, lo bastante chico para tenerlo entero en memoria.
- Área promedio de una celda S2: nivel 12 ≈ 5.07 km², nivel 13 ≈ 1.27 km², nivel 14 ≈ 0.32 km².
- Fuentes: [Elastic — Geohash grid aggregation (cell sizes by precision)](https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-geohashgrid-aggregation) · [S2 Geometry — S2 Cell Statistics](https://s2geometry.io/resources/s2cell_statistics) · [PostGIS — ST_DWithin](https://postgis.net/docs/ST_DWithin.html) · [Yelp Engineering — Nrtsearch: Yelp's Fast, Scalable and Cost Effective Search Engine (2021)](https://engineeringblog.yelp.com/2021/09/nrtsearch-yelps-fast-scalable-and-cost-effective-search-engine.html)

### [ ] Diseño: venta de boletos — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-ticket-booking/) · `content/concepts/sysdesign/case-ticket-booking.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Demanda (supuesta): 2M de fans para 50k asientos = 40 fans por asiento; a ~4 asientos por orden, ~99% se van sin boletos.
- Órdenes: 50k asientos ÷ ~4 por orden ≈ 12.5k órdenes; agotar en 10 min son apenas ~21 órdenes/s.
- Sala de espera (supuesto: 2k admisiones/min): el último de 2M de fans esperaría ~1,000 min (~17 h), así que avisa pronto que se agotó.
- Ticketmaster, preventa del Eras Tour (nov 2022): 3.5B de solicitudes al sistema, 4× su pico anterior; más de 2M de boletos vendidos ese día.
- Cloudflare Waiting Room tiene dos perillas principales: usuarios activos totales y usuarios nuevos por minuto (revisado en nov 2026).
- Fuentes: [Ticketmaster — Taylor Swift | The Eras Tour Onsale Explained (Nov 2022)](https://business.ticketmaster.com/press-release/taylor-swift-the-eras-tour-onsale-explained/) · [PostgreSQL — SELECT: the locking clause (FOR UPDATE, NOWAIT, SKIP LOCKED)](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE) · [Cloudflare — Waiting Room configuration settings](https://developers.cloudflare.com/waiting-room/reference/configuration-settings/)

### [ ] Diseño: scheduler de jobs distribuido — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-job-scheduler/) · `content/concepts/sysdesign/case-job-scheduler.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Carga (supuesta): 100M de corridas/día ≈ 1.2k/s; si 20% se disparan en el primer minuto de cada hora, ese minuto ve ~14k/s (~12×).
- Lease (supuesto): 30 s con heartbeat cada 10 s; la corrida de un worker caído se reinicia en ~30 s.
- El visibility timeout de SQS, la misma idea de lease: 30 s por defecto, máximo 12 h (revisado en nov 2026).
- El ATF de Dropbox atendía ~9k tareas asíncronas programadas por segundo, con ejecución at-least-once (nov 2020).
- Reintentos (supuesto): un backoff de 1, 2, 4, 8 y 16 min cubre ~31 min antes de la dead-letter queue.
- Fuentes: [Google SRE Book — Distributed Periodic Scheduling with Cron](https://sre.google/sre-book/distributed-periodic-scheduling/) · [Dropbox Tech — Asynchronous task scheduling at Dropbox (2020)](https://dropbox.tech/infrastructure/asynchronous-task-scheduling-at-dropbox) · [Martin Kleppmann — How to do distributed locking (2016)](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) · [PostgreSQL — SELECT: the locking clause (SKIP LOCKED)](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)

### [ ] Diseño: sincronización de archivos (Dropbox) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-file-sync/) · `content/concepts/sysdesign/case-file-sync.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Commits (supuestos): 50M DAU × 10 cambios/día = 500M/día ≈ 5.8k/s en promedio, ~12k/s con un pico de 2×.
- Subida (supuesto ~200 KB de datos nuevos por cambio tras deduplicar): 500M × 200 KB ≈ 100 TB/día hacia el almacenamiento de bloques.
- Dropbox: bloques de 4 MB con hash SHA-256 (2014); Magic Pocket guardaba varios exabytes (2016).
- Notificaciones (supuesto ~100k long-polls inactivos por servidor): 50M de dispositivos conectados necesitan ~500 servidores.
- Fuentes: [Dropbox Tech — Streaming File Synchronization (2014)](https://dropbox.tech/infrastructure/streaming-file-synchronization) · [Dropbox Tech — Inside the Magic Pocket (2016)](https://dropbox.tech/infrastructure/inside-the-magic-pocket) · [Dropbox Help — What's a conflicted copy?](https://help.dropbox.com/organize/conflicted-copy)

### [ ] Diseño: top-K y heavy hitters — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-top-k/) · `content/concepts/sysdesign/case-top-k.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Supuesto: 1,000M de eventos/hora ≈ 278k/s sobre 50M de ítems distintos.
- Space-Saving con m contadores conserva todo ítem con más de N/m apariciones; un conteo se pasa a lo sumo en N/m.
- Count-min: w = ⌈e/ε⌉, d = ⌈ln(1/δ)⌉. Con ε = 0.00001 y δ = 1%: 271,829 × 5 contadores ≈ 11 MB a 8 B cada uno.
- Exacto: 50M de ítems distintos × ~100 B (supuesto) ≈ 5 GB por ventana.
- Default de `shard_size` en Elasticsearch: `size × 1.5 + 10` términos por shard (revisado en nov. 2026).
- Fuentes: [Cormode & Muthukrishnan — An improved data stream summary: the count-min sketch and its applications (J. Algorithms 2005)](https://www.cs.ox.ac.uk/people/graham.cormode/pubs/html/CormodeMuthukrishnan04CMJalg.html) · [Metwally, Agrawal, El Abbadi — Efficient Computation of Frequent and Top-k Elements in Data Streams (2005)](https://www.cs.ucsb.edu/sites/default/files/documents/2005-23.pdf) · [Elastic docs — Terms aggregation (shard size and document count error)](https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation) · [Redis docs — Top-K (HeavyKeeper)](https://redis.io/docs/latest/develop/data-types/probabilistic/top-k/)

### [ ] Diseño: leaderboard en tiempo real — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/case-leaderboard/) · `content/concepts/sysdesign/case-leaderboard.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- `ZADD`, `ZINCRBY`, `ZREVRANK`, `ZCOUNT`: O(log N). `ZSCORE`: O(1). Un rango de M: O(log N + M).
- Carga supuesta: 5M de DAU × 10 partidas = 50M de actualizaciones/día ≈ 580/s en promedio, ~3k/s en el pico.
- Memoria: 50M de miembros × ~100 B (supuesto) ≈ 5 GB, que entran en un nodo.
- Los scores son doubles: los enteros son exactos solo hasta 2⁵³ ≈ 9 × 10¹⁵.
- `ZREVRANGE` está deprecado desde Redis 6.2; usa `ZRANGE … REV` (revisado en nov. 2026).
- Fuentes: [Redis docs — Sorted sets (skip list + hash table, leaderboards)](https://redis.io/docs/latest/develop/data-types/sorted-sets/) · [Redis docs — ZADD (score precision, equal scores, GT)](https://redis.io/docs/latest/commands/zadd/) · [Redis source — t_zset.c (skip list: zslGetRank sums the span stored on each link)](https://github.com/redis/redis/blob/unstable/src/t_zset.c) · [Redis docs — Persistence (RDB, AOF)](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)

### [ ] Diseño: news feed — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-news-feed/) · `content/concepts/sysdesign/case-news-feed.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Lecturas: 300M de DAU × 10 cargas/día (supuesto) = 3 mil millones/día ≈ 35k/s en promedio, ~70k en un pico de 2×.
- Push: 150M de posts/día × 200 seguidores (supuesto) = 30 mil millones de inserciones/día ≈ 350k/s, 10× la tasa de lectura.
- Cache de feeds: 300M de usuarios × 800 IDs × 8 B ≈ 1.9 TB de IDs crudos; los puntajes, el overhead de Redis y las réplicas lo multiplican.
- Twitter (2013): ~300k QPS de lecturas de timeline, ~5k tweets/s en promedio, timelines de 800 entradas en Redis, 3 réplicas.
- Push de celebridades en Twitter (2013): un tweet a ~31M de seguidores tardaba hasta 5 minutos.
- Fuentes: [InfoQ — Raffi Krikorian, Timelines at Scale (Twitter, 2013)](https://www.infoq.com/presentations/Twitter-Timeline-Scalability/) · [High Scalability — The architecture Twitter uses to deal with 150M active users (2013)](https://highscalability.com/the-architecture-twitter-uses-to-deal-with-150m-active-users/) · [Meta Engineering — Serving Facebook Multifeed: efficiency, performance gains through redesign (2015)](https://engineering.fb.com/2015/03/10/production-engineering/serving-facebook-multifeed-efficiency-performance-gains-through-redesign/)

### [ ] Diseño: sistema de chat — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-chat-system/) · `content/concepts/sysdesign/case-chat-system.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tráfico: 100M de DAU × 50 mensajes/día (supuesto) = 5 mil millones/día ≈ 58k mensajes/s en promedio, ~120k en un pico de 2×.
- Almacenamiento: 5 mil millones × ~200 B ≈ 1 TB/día, ~365 TB/año antes de replicar.
- Conexiones: ~30M simultáneas ÷ ~100k por gateway (ambos supuestos) ≈ 300 gateways.
- Discord (2023): de 177 nodos de Cassandra a 72 de ScyllaDB; p99 de lectura de historial de 40–125 ms a 15 ms.
- Discord (2017): buckets de ~10 días por canal mantienen cada partición bajo 100 MB.
- Fuentes: [RFC 6455 — The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455.html) · [Discord — How Discord stores billions of messages (2017)](https://discord.com/blog/how-discord-stores-billions-of-messages) · [Discord — How Discord stores trillions of messages (2023)](https://discord.com/blog/how-discord-stores-trillions-of-messages) · [Slack Engineering — Real-time messaging (2023)](https://slack.engineering/real-time-messaging/)

### [ ] Diseño: key-value store distribuido — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-kv-store/) · `content/concepts/sysdesign/case-kv-store.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Dynamo (2007): (N, R, W) común = (3, 2, 2); SLA de ejemplo de 300 ms en el p99.9 para 500 peticiones/s.
- La divergencia es rara: el 99.94% de las lecturas del carrito vio exactamente una versión en 24 h.
- Dynamo trunca los vector clocks en ~10 pares (nodo, contador); Cassandra solo guarda pistas durante las primeras 3 h de caída de un nodo (por defecto).
- Dimensionamiento: supón 10B de claves × 1 KB × 3 réplicas = 30 TB; con ~1 TB por nodo (supuesto), ~30 nodos más margen.
- Fuentes: [DeCandia et al. — Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) · [Elhemali et al. — Amazon DynamoDB (USENIX ATC 2022)](https://www.usenix.org/system/files/atc22-elhemali.pdf) · [Apache Cassandra — Dynamo architecture](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html) · [Apache Cassandra — Hints](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/hints.html)

### [ ] Diseño: ride hailing (Uber, Lyft) — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-ride-hailing/) · `content/concepts/sysdesign/case-ride-hailing.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Supón 1M de conductores conectados × 1 ping cada 4 s ≈ 250k escrituras de ubicación/s en el pico.
- Celda H3 promedio: resolución 8 ≈ 0.74 km² (lado ~530 m); resolución 9 ≈ 0.105 km² (lado ~200 m).
- Un disco hexagonal de radio k cubre 1 + 3k(k+1) celdas: 7 para k = 1 y 19 para k = 2.
- Regla práctica: una instancia de Redis maneja ~100k operaciones simples/s, así que particiona el índice por región.
- Fuentes: [Uber Engineering — H3: Uber's Hexagonal Hierarchical Spatial Index (2018)](https://www.uber.com/blog/h3/) · [H3 — Tables of cell statistics across resolutions](https://h3geo.org/docs/core-library/restable) · [Redis — GEOSEARCH](https://redis.io/docs/latest/commands/geosearch/)

### [ ] Diseño: sistema de pagos — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-payment-system/) · `content/concepts/sysdesign/case-payment-system.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Supón 10M de pagos/día ≈ ~115/s en promedio; planifica ~10× para eventos de ventas pico.
- API v1 de Stripe (nov. 2026): claves de idempotencia de hasta 255 caracteres, que pueden borrarse pasadas ≥ 24 h.
- Stripe reintenta los webhooks hasta por 3 días en modo live, sin garantía de orden (nov. 2026).
- Manejar números de tarjeta sin tokenizar puede implicar más de 300 controles de seguridad de PCI DSS (guía de Stripe, nov. 2026).
- Volumen del ledger: 10M de pagos × ~4 entradas ≈ 40M de filas/día, ~15 mil millones/año (supuesto).
- Fuentes: [Stripe API — Idempotent requests](https://docs.stripe.com/api/idempotent_requests) · [Stripe Docs — Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks) · [Square Engineering — Books, an immutable double-entry accounting database service (2019)](https://developer.squareup.com/blog/books-an-immutable-double-entry-accounting-database-service/) · [Stripe Docs — Integration security guide (PCI)](https://docs.stripe.com/security/guide)

### [ ] Diseño: billetera digital — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-digital-wallet/) · `content/concepts/sysdesign/case-digital-wallet.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Dimensionamiento (supuesto): 10k transferencias/s × 2 escrituras locales ÷ ~1k escrituras/s por nodo ≈ 20 shards.
- Con S shards, una transferencia queda en un solo shard con probabilidad 1/S: con 20 shards, ~95% cruza shards.
- Volumen del ledger: 4 entradas por transferencia, así que 10k transferencias/s ≈ 40k entradas/s en el pico.
- PostgreSQL trae 2PC desactivado: `max_prepared_transactions` vale 0 por defecto.
- Ledger de Stripe (2024): ~5 mil millones de eventos al día; 99.99% del volumen en dólares ingerido y verificado en cuatro días.
- Fuentes: [Stripe — Ledger: Stripe's system for tracking and validating money movement (2024)](https://stripe.dev/blog/ledger-stripe-system-for-tracking-and-validating-money-movement) · [Martin Fowler — Event Sourcing (2005)](https://martinfowler.com/eaaDev/EventSourcing.html) · [PostgreSQL — PREPARE TRANSACTION (two-phase commit)](https://www.postgresql.org/docs/current/sql-prepare-transaction.html) · [Apache Seata — TCC mode (Try, Confirm, Cancel)](https://seata.apache.org/docs/user/mode/tcc/)

### [ ] Diseño: editor colaborativo — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-collaborative-editing/) · `content/concepts/sysdesign/case-collaborative-editing.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Carga (supuesta): 1M de editores concurrentes × ~1 op agrupada/s ≈ 1M ops/s de entrada; con ~3 editores por documento, ~2M difusiones/s de salida.
- Volumen del log (supuesto ~100 B por op): 1M ops/s ≈ 100 MB/s en el pico; compacta las ops viejas en snapshots.
- Snapshot cada ~1,000 ops (supuesto): abrir un documento reproduce como máximo ~1,000 ops encima.
- Google Docs: hasta 100 personas con permiso de ver, editar o comentar pueden trabajar en un archivo a la vez (revisado en nov 2026).
- Fuentes: [Google Drive Blog — What's different about the new Google Docs: Conflict resolution (2010)](https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs_22.html) · [Figma — How Figma's multiplayer technology works (2019)](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) · [Kleppmann et al. — Local-first software (Ink & Switch, 2019)](https://www.inkandswitch.com/essay/local-first/) · [Google Workspace — Document sharing basics in Google Docs (100-person limit)](https://support.google.com/a/users/answer/9305685)

### [ ] Diseño: sistema de métricas y monitoreo — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-metrics-monitoring/) · `content/concepts/sysdesign/case-metrics-monitoring.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Ingesta (supuesta): 10k hosts × 1,000 series ÷ 15 s ≈ 670k muestras/s.
- Almacenamiento: 670k/s × 86,400 s × ~1.37 B ≈ 79 GB/día en crudo, ~29 TB/año antes de retención y reducción de resolución.
- Gorilla (VLDB 2015): de 16 B a ~1.37 B por punto (12×); ~96% de los timestamps se comprimen a un solo bit.
- Valores por defecto de Prometheus: bloques de 2 h, retención local de 15 días e intervalos de scrape y de evaluación de reglas de 1 m (revisado en nov 2026).
- Thanos: resolución de 5 m para bloques de más de 40 h y de 1 h para bloques de más de 10 días.
- Fuentes: [Pelkonen et al. — Gorilla: A Fast, Scalable, In-Memory Time Series Database (VLDB 2015)](https://www.vldb.org/pvldb/vol8/p1816-teller.pdf) · [Prometheus — Storage](https://prometheus.io/docs/prometheus/latest/storage/) · [Prometheus — Metric and label naming](https://prometheus.io/docs/practices/naming/) · [Thanos — Compactor and downsampling](https://thanos.io/tip/components/compact.md/)

### [ ] Diseño: cola de mensajes distribuida — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-message-queue/) · `content/concepts/sysdesign/case-message-queue.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Carga supuesta: 1M de mensajes/s × 1 KB ≈ 1 GB/s ≈ 86 TB/día; 7 días × 3 réplicas ≈ 1.8 PB.
- Defaults de Kafka (docs 4.4, revisados en nov. 2026): segmentos de 1 GiB, retención de 7 días; `acks=all` y el productor idempotente son defaults desde la 3.0 (sept. 2021, KIP-679).
- Un seguidor sale del ISR tras 30 s de atraso respecto al líder (`replica.lag.time.max.ms`).
- Documento de diseño de Kafka: escrituras lineales de ~600 MB/s vs ~100 kB/s aleatorias en un arreglo SATA de seis discos.
- El ISR tolera f fallas con f+1 réplicas; un quorum por mayoría necesita 2f+1.
- Fuentes: [Apache Kafka documentation — Design (persistence, efficiency, replication, delivery semantics)](https://kafka.apache.org/documentation/#design) · [Kreps, Narkhede, Rao — Kafka: a Distributed Messaging System for Log Processing (NetDB 2011)](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/09/Kafka.pdf) · [Jay Kreps — The Log: What every software engineer should know about real-time data's unifying abstraction (LinkedIn, 2013)](https://www.linkedin.com/blog/engineering/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying) · [Confluent — Exactly-once Semantics is Possible: Here's How Apache Kafka Does it (2017)](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/)

### [ ] Diseño: agregador de clics de anuncios — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/case-ad-click-aggregator/) · `content/concepts/sysdesign/case-ad-click-aggregator.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Supuesto: 1,000M de clics/día ÷ 86,400 s ≈ 11.6k/s en promedio, ~58k/s con un pico de 5×.
- Log crudo: 1,000M × ~0.5 KB (supuesto) ≈ 500 GB/día.
- Estado de deduplicación: ~42M de click ids por hora de TTL (1,000M ÷ 24).
- Frescura ≈ ventana de 1 minuto + demora del watermark (p. ej., 30 s) + hasta un intervalo de checkpoint cuando el sink es transaccional.
- Uber (2021): ventanas tumbling de un minuto y checkpoints de Flink cada 2 minutos.
- Fuentes: [Uber Engineering — Real-Time Exactly-Once Ad Event Processing with Apache Flink, Kafka, and Pinot (2021)](https://www.uber.com/blog/real-time-exactly-once-ad-event-processing/) · [Ananthanarayanan et al. — Photon: Fault-tolerant and Scalable Joining of Continuous Data Streams (SIGMOD 2013)](https://research.google/pubs/photon-fault-tolerant-and-scalable-joining-of-continuous-data-streams/) · [Jay Kreps — Questioning the Lambda Architecture (O'Reilly, 2014)](https://www.oreilly.com/radar/questioning-the-lambda-architecture/) · [Apache Druid docs — Data rollup](https://druid.apache.org/docs/latest/ingestion/rollup/)

## Patrones de coding (20)

### [ ] Big-O y análisis de complejidad — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/big-o/) · `content/concepts/coding/big-o.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Presupuesto de ~1 s (CPH): n ≤ 20 → O(2ⁿ); n ≤ 500 → O(n³); n ≤ 5,000 → O(n²); n ≤ 10⁶ → O(n log n) u O(n).
- Una CPU moderna hace unos cientos de millones de operaciones simples por segundo; O(n²) con n = 10⁵ son 10¹⁰ pasos.
- log₂(10⁶) ≈ 20 y log₂(10⁹) ≈ 30: un factor log es barato.
- Python: `x in list` y `list.pop(0)` son O(n); `x in set` es O(1) en promedio y `deque.popleft()` es O(1).
- Fuentes: [Python docs — Time complexity of operations on built-in types](https://docs.python.org/3/builtins/time-complexity.html) · [Laaksonen — Competitive Programmer's Handbook (ch. 2 and 8)](https://cses.fi/book/book.pdf) · [Sedgewick & Wayne — Algorithms, 4th ed., 1.4 Analysis of Algorithms](https://algs4.cs.princeton.edu/14analysis/)

### [ ] Hash maps, sets y prefix sums — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/hash-maps/) · `content/concepts/coding/hash-maps.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- `dict`/`set` de Python: get, set, delete e `in` son O(1) en promedio y O(n) en el peor caso, cuando las claves colisionan.
- Python agrega un salt aleatorio por proceso a los hashes de `str` y `bytes` por defecto (desde 3.3) para bloquear ataques de hash flooding.
- El `HashMap` de Java 8 convierte los buckets saturados en árboles balanceados: peor caso O(log n) en vez de O(n) con claves comparables.
- Two-sum: O(n²) por fuerza bruta → O(n) en tiempo y O(n) en espacio con un map.
- Fuentes: [Python docs — Time complexity of operations on built-in types](https://docs.python.org/3/builtins/time-complexity.html) · [Python docs — Data model: object.__hash__ (hash randomization)](https://docs.python.org/3/reference/datamodel.html#object.__hash__) · [OpenJDK — JEP 180: Handle Frequent HashMap Collisions with Balanced Trees](https://openjdk.org/jeps/180) · [Tech Interview Handbook — Array cheatsheet (precomputation, prefix sums)](https://www.techinterviewhandbook.org/algorithms/array/)

### [ ] Prefix sums y arreglos de diferencias — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/prefix-sums/) · `content/concepts/coding/prefix-sums.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Construir O(n), consultar O(1): q consultas cuestan O(n + q) en vez de O(n·q).
- 2D: se construye en O(filas × columnas); cualquier suma de rectángulo son 4 lecturas.
- Arreglo de diferencias: O(1) por actualización de rango más una pasada O(n): O(n + u) para u actualizaciones.
- Fenwick tree, para actualizaciones puntuales y sumas de rango intercaladas: O(log n) cada una.
- La forma 2D es la summed-area table (Crow, 1984), la "integral image" de la detección de objetos de Viola–Jones (2001).
- Fuentes: [Laaksonen — Competitive Programmer's Handbook (9.1 Static array queries; 9.4 Additional techniques: range updates)](https://cses.fi/book/book.pdf) · [Wikipedia — Summed-area table (2D prefix sums)](https://en.wikipedia.org/wiki/Summed-area_table) · [cp-algorithms — Fenwick tree](https://cp-algorithms.com/data_structures/fenwick.html) · [Python docs — itertools.accumulate](https://docs.python.org/3/library/itertools.html#itertools.accumulate)

### [ ] Two pointers (dos punteros) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/two-pointers/) · `content/concepts/coding/two-pointers.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Suma de pares con entrada ordenada: O(n) en tiempo y O(1) en espacio; O(n log n) si primero ordenas.
- 3Sum: O(n²) con ordenamiento más two pointers, contra O(n³) por fuerza bruta.
- Detección de ciclos de Floyd: O(n) en tiempo y O(1) en espacio, contra O(n) de espacio con un set de visitados.
- Mezclar dos arreglos ordenados: O(n + m) con un puntero en cada uno.
- Fuentes: [Laaksonen — Competitive Programmer's Handbook (8.1 Two pointers method)](https://cses.fi/book/book.pdf) · [Tech Interview Handbook — Array cheatsheet (two pointers)](https://www.techinterviewhandbook.org/algorithms/array/) · [Wikipedia — Cycle detection (Floyd's tortoise and hare)](https://en.wikipedia.org/wiki/Cycle_detection)

### [ ] Sliding window (ventana deslizante) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/sliding-window/) · `content/concepts/coding/sliding-window.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- O(n) en tiempo: `right` avanza n veces y `left` como máximo n veces en total.
- Espacio O(k) para los conteos de la ventana, con k = tamaño del alfabeto o de valores distintos (26 para minúsculas).
- Fuerza bruta: O(n²) ventanas, O(n³) si recorres cada una de nuevo.
- Mínimo de ventana deslizante con un deque monótono: O(n) en total, contra O(n·k) si recorres cada ventana.
- Fuentes: [Laaksonen — Competitive Programmer's Handbook (8.1 Two pointers, 8.3 Sliding window minimum)](https://cses.fi/book/book.pdf) · [Tech Interview Handbook — Array cheatsheet (sliding window)](https://www.techinterviewhandbook.org/algorithms/array/)

### [ ] Binary search y búsqueda sobre la respuesta — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/binary-search/) · `content/concepts/coding/binary-search.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- log₂(10⁶) ≈ 20 y log₂(10⁹) ≈ 30 iteraciones.
- La búsqueda sobre la respuesta cuesta O(log(rango) × costo de un chequeo), por ejemplo O(n log(suma)).
- El bug de overflow de `(low + high) / 2` estuvo ~9 años en el binary search del JDK antes de que lo reportaran (Bloch, 2006).
- Ese bug requiere que `low + high` supere 2³¹ − 1: arreglos de 2³⁰ (~mil millones) elementos o más.
- Fuentes: [Python docs — bisect: array bisection algorithm](https://docs.python.org/3/library/bisect.html) · [Joshua Bloch — Nearly All Binary Searches and Mergesorts are Broken (Google Research, 2006)](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/) · [Laaksonen — Competitive Programmer's Handbook (3.3 Binary search)](https://cses.fi/book/book.pdf)

### [ ] Linked lists (listas enlazadas) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/linked-lists/) · `content/concepts/coding/linked-lists.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Acceso y búsqueda O(n); insertar o borrar O(1) si ya tienes el nodo anterior (cualquier nodo, si es doblemente enlazada).
- Invertir, encontrar el medio, detectar un ciclo: O(n) en tiempo, O(1) en espacio.
- Mezclar dos listas ordenadas de n y m nodos: O(n + m) en tiempo, O(1) de espacio extra.
- Python: `list.pop(0)` e `insert(0, v)` son O(n); `collections.deque` hace ambos extremos en ~O(1).
- Fuentes: [Tech Interview Handbook — Linked list cheatsheet](https://www.techinterviewhandbook.org/algorithms/linked-list/) · [Wikipedia — Linked list (sentinel nodes)](https://en.wikipedia.org/wiki/Linked_list) · [Python docs — collections.deque](https://docs.python.org/3/library/collections.html#collections.deque) · [Linux kernel docs — Linked Lists in Linux](https://docs.kernel.org/core-api/list.html)

### [ ] Árboles binarios y BST — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/binary-trees/) · `content/concepts/coding/binary-trees.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Recorrido: O(n) en tiempo. Espacio: O(h) para DFS (h = altura), O(w) para BFS (w = nivel más ancho, hasta ~n/2).
- Altura: ~log₂ n si está balanceado (~20 para 10⁶ nodos), n si está degenerado como una linked list.
- Buscar, insertar y borrar en un BST: O(h), es decir O(log n) balanceado y O(n) degenerado.
- Un árbol perfecto de L niveles tiene 2ᴸ − 1 nodos; el último nivel tiene 2ᴸ⁻¹, cerca de la mitad.
- El límite de recursión por defecto de CPython es de 1,000 frames.
- Fuentes: [Wikipedia — Tree traversal (pre-order, in-order, post-order, level-order)](https://en.wikipedia.org/wiki/Tree_traversal) · [Wikipedia — Binary search tree](https://en.wikipedia.org/wiki/Binary_search_tree) · [Wikipedia — Lowest common ancestor](https://en.wikipedia.org/wiki/Lowest_common_ancestor) · [Tech Interview Handbook — Tree cheatsheet](https://www.techinterviewhandbook.org/algorithms/tree/)

### [ ] Heaps y top-K — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/heaps-top-k/) · `content/concepts/coding/heaps-top-k.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Push y pop O(log n); ver el tope O(1); `heapify` O(n).
- Top-K: tiempo O(n log K), espacio O(K). Ordenar todo: tiempo O(n log n), espacio O(n).
- Merge de N elementos en total desde k listas: O(N log k).
- Quickselect: O(n) en promedio, O(n²) en el peor caso.
- Fuentes: [Python docs — heapq (heap queue algorithm)](https://docs.python.org/3/library/heapq.html) · [Wikipedia — Binary heap](https://en.wikipedia.org/wiki/Binary_heap)

### [ ] Problemas de intervalos: ordenar y barrer — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/intervals/) · `content/concepts/coding/intervals.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Merge, salas de reunión, scheduling: O(n log n) por el sort y luego O(n).
- Insertar en una lista ya ordenada y sin solapes: O(n), sin sort.
- Salas de reunión: 2n eventos; la respuesta es el pico de la suma acumulada.
- Fuentes: [Wikipedia — Interval scheduling (earliest-finish greedy)](https://en.wikipedia.org/wiki/Interval_scheduling) · [Wikipedia — Sweep line algorithm](https://en.wikipedia.org/wiki/Sweep_line_algorithm) · [PostgreSQL docs — Range types and exclusion constraints](https://www.postgresql.org/docs/current/rangetypes.html)

### [ ] Recorrido de grafos: BFS y DFS — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/graph-traversal/) · `content/concepts/coding/graph-traversal.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tiempo O(V + E) con listas de adyacencia; O(V²) con una matriz de adyacencia.
- Grid R × C: R·C nodos y ≤ 4·R·C revisiones de vecinos.
- Espacio O(V) para los visitados; la queue de BFS guarda hasta el nivel más ancho.
- Límite de recursión por defecto en CPython: 1,000 frames (`sys.getrecursionlimit()`).
- Fuentes: [cp-algorithms — Breadth-first search](https://cp-algorithms.com/graph/breadth-first-search.html) · [cp-algorithms — Depth-first search](https://cp-algorithms.com/graph/depth-first-search.html) · [Python docs — collections.deque](https://docs.python.org/3/library/collections.html#collections.deque)

### [ ] Orden topológico (topological sort) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/topological-sort/) · `content/concepts/coding/topological-sort.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tiempo O(V + E); espacio O(V) para los in-degrees y la queue.
- Course schedule con n cursos y p pares de prerrequisitos: O(n + p).
- Camino más largo: O(V + E) en un DAG con orden topológico más DP; NP-hard en grafos generales.
- `graphlib.TopologicalSorter`: en la biblioteca estándar de Python desde la 3.9.
- Fuentes: [Wikipedia — Topological sorting (Kahn 1962, DFS, Tarjan 1976)](https://en.wikipedia.org/wiki/Topological_sorting) · [Python docs — graphlib.TopologicalSorter](https://docs.python.org/3/library/graphlib.html) · [cp-algorithms — Topological sorting](https://cp-algorithms.com/graph/topological-sort.html)

### [ ] Caminos más cortos (BFS, Dijkstra, Bellman-Ford) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/shortest-paths/) · `content/concepts/coding/shortest-paths.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- BFS: O(V + E). Dijkstra con heap binario: O((V + E) log V).
- Bellman-Ford: O(V·E), V − 1 rondas más una ronda para detectar un ciclo negativo.
- Caminos mínimos en un DAG: O(V + E) en orden topológico, con pesos negativos permitidos.
- 0-1 BFS: O(V + E), con las aristas de costo 0 al frente del deque.
- Floyd-Warshall, todos los pares: O(V³) de tiempo, O(V²) de espacio.
- Fuentes: [Sedgewick & Wayne, Algorithms 4th ed. — 4.4 Shortest Paths](https://algs4.cs.princeton.edu/44sp/) · [cp-algorithms — Dijkstra on sparse graphs](https://cp-algorithms.com/graph/dijkstra_sparse.html) · [cp-algorithms — Bellman-Ford](https://cp-algorithms.com/graph/bellman_ford.html)

### [ ] Programación dinámica — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/dynamic-programming/) · `content/concepts/coding/dynamic-programming.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tiempo = estados × trabajo por estado: LCS y edit distance O(m·n); knapsack 0/1 O(n·W).
- Fibonacci: recursión ingenua ~O(2ⁿ) llamadas; con memo, O(n).
- Dos filas rotativas bajan la memoria de edit distance de O(m·n) a O(min(m, n)).
- El límite de recursión por defecto de CPython es de 1000 frames.
- Fuentes: [cp-algorithms — Introduction to Dynamic Programming](https://cp-algorithms.com/dynamic_programming/intro-to-dp.html) · [cp-algorithms — Knapsack Problem](https://cp-algorithms.com/dynamic_programming/knapsack.html) · [Python docs — functools.cache](https://docs.python.org/3/library/functools.html#functools.cache)

### [ ] Algoritmos greedy — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/greedy/) · `content/concepts/coding/greedy.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Costo típico: O(n log n) por el sort y luego O(n). Jump game: O(n) en tiempo, O(1) en espacio.
- Monedas {1, 3, 4}, monto 6: greedy usa 3 monedas (4 + 1 + 1); el óptimo es 2 (3 + 3).
- Monedas de EE. UU. sin la de 5¢, {25, 10, 1}, para 40¢: greedy usa 7 monedas; el óptimo es 4 (4 × 10).
- Coin change con DP: O(monto × cantidad de denominaciones).
- Fuentes: [Laaksonen — Competitive Programmer's Handbook (6 Greedy algorithms: coin problem, scheduling)](https://cses.fi/book/book.pdf) · [Erickson — Algorithms, ch. 4: Greedy Algorithms (exchange arguments)](https://jeffe.cs.illinois.edu/teaching/algorithms/book/04-greedy.pdf) · [Wikipedia — Change-making problem (canonical coin systems)](https://en.wikipedia.org/wiki/Change-making_problem) · [Wikipedia — Greedy algorithm](https://en.wikipedia.org/wiki/Greedy_algorithm)

### [ ] Backtracking — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/backtracking/) · `content/concepts/coding/backtracking.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Subconjuntos: 2ⁿ resultados, O(n·2ⁿ) con las copias; n = 20 → 1 048 576 subconjuntos.
- Permutaciones: n! resultados; 10! = 3 628 800.
- Combinaciones: C(n, k) = n! / (k!(n − k)!) resultados.
- N-Queens: 92 soluciones para n = 8 (12 sin contar rotaciones ni reflejos).
- Profundidad de recursión = cantidad de decisiones (≤ n), no la cantidad de resultados.
- Fuentes: [Wikipedia — Backtracking](https://en.wikipedia.org/wiki/Backtracking) · [Wikipedia — Eight queens puzzle](https://en.wikipedia.org/wiki/Eight_queens_puzzle) · [Python docs — itertools (permutations, combinations)](https://docs.python.org/3/library/itertools.html)

### [ ] Tries (árboles de prefijos) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/tries/) · `content/concepts/coding/tries.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- insert, search, startsWith: O(L) para una clave de largo L, sin depender de la cantidad de claves.
- Espacio: O(total de caracteres) en el peor caso, un nodo por prefijo distinto.
- Hijos en arreglo: acceso O(1) al hijo, pero un espacio por letra del alfabeto en cada nodo (26 para a–z).
- Autocompletado: O(L) para llegar al nodo del prefijo, más la parte de su subárbol que visites.
- Fuentes: [Wikipedia — Trie](https://en.wikipedia.org/wiki/Trie) · [Sedgewick & Wayne, Algorithms 4th ed. — 5.2 Tries](https://algs4.cs.princeton.edu/52trie/)

### [ ] Stacks y stacks monótonos — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/monotonic-stack/) · `content/concepts/coding/monotonic-stack.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Tiempo O(n): cada índice entra una vez y sale como máximo una vez (≤ 2n operaciones).
- Espacio O(n) en el peor caso: una entrada estrictamente decreciente nunca hace pop.
- Máximo en ventana: O(n) con un deque, O(n log n) con un heap con borrado perezoso, O(n·k) por fuerza bruta.
- Python: `list.pop()` al final es O(1) y `list.pop(0)` es O(n); usa `collections.deque` para ambos extremos.
- Fuentes: [cp-algorithms — Minimum stack / Minimum queue](https://cp-algorithms.com/data_structures/stack_queue_modification.html) · [Wikipedia — All nearest smaller values (stack-based linear algorithm)](https://en.wikipedia.org/wiki/All_nearest_smaller_values) · [Python docs — collections.deque](https://docs.python.org/3/library/collections.html#collections.deque)

### [ ] Union-Find (conjuntos disjuntos) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/union-find/) · `content/concepts/coding/union-find.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Con ambas optimizaciones: O(α(n)) amortizado por operación; α(n) ≤ 4 para cualquier n realista (Tarjan, 1975).
- Solo union by rank: O(log n) por `find`; el rank nunca supera ⌊log₂ n⌋.
- MST de Kruskal: O(E log E), dominado por ordenar las aristas.
- Espacio: O(n) para `parent` y `rank`.
- Fuentes: [cp-algorithms — Disjoint Set Union](https://cp-algorithms.com/data_structures/disjoint_set_union.html) · [Sedgewick & Wayne, Algorithms 4th ed. — 1.5 Union-Find](https://algs4.cs.princeton.edu/15uf/) · [Wikipedia — Disjoint-set data structure](https://en.wikipedia.org/wiki/Disjoint-set_data_structure)

### [ ] Diseñar una estructura de datos (LRU cache) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/design-data-structures/) · `content/concepts/coding/design-data-structures.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- LRU cache: `get` y `put` en O(1) promedio; espacio O(capacidad).
- Min stack: push, pop, top y getMin en O(1); O(n) de espacio extra para los mínimos guardados.
- Set aleatorio: insert, remove y getRandom en O(1) promedio (hash map).
- `functools.lru_cache` de Python usa `maxsize=128` por defecto.
- Redis aproxima LRU muestreando claves (`maxmemory-samples`, 5 por defecto): un LRU exacto cuesta más memoria.
- Fuentes: [Python docs — collections.OrderedDict (move_to_end, popitem, LRU recipes)](https://docs.python.org/3/library/collections.html#collections.OrderedDict) · [Python docs — functools.lru_cache](https://docs.python.org/3/library/functools.html#functools.lru_cache) · [Redis docs — Key eviction (approximated LRU)](https://redis.io/docs/latest/develop/reference/eviction/) · [Wikipedia — Cache replacement policies (LRU)](https://en.wikipedia.org/wiki/Cache_replacement_policies)

## Liderazgo Staff/Principal (21)

### [ ] Qué significa realmente ser Staff/Principal — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/staff-role/) · `content/concepts/leadership/staff-role.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Arquetipos de Larson: 4 — Tech Lead, Architect, Solver, Right Hand.
- Regla práctica: lidera tú como máximo ~2–3 problemas a la vez; apoya el resto.
- Fuentes: [StaffEng — Staff archetypes (Will Larson)](https://staffeng.com/guides/staff-archetypes/) · [StaffEng — Work on what matters](https://staffeng.com/guides/work-on-what-matters/) · [Tanya Reilly — Being Glue](https://www.noidea.dog/glue)

### [ ] Design docs y RFCs — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/design-docs/) · `content/concepts/leadership/design-docs.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: 2–6 páginas; si necesita 20, divídelo en varios documentos.
- Regla práctica: más o menos una semana de revisión asíncrona y luego una reunión de decisión corta solo si hace falta.
- Regla práctica: al menos dos alternativas reales, una de ellas "no hacer nada".
- Fuentes: [Malte Ubl — Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) · [The Pragmatic Engineer — Companies using RFCs or design docs](https://blog.pragmaticengineer.com/rfcs-and-design-docs/) · [Andrew Harmel-Law (martinfowler.com) — Scaling the Practice of Architecture, Conversationally](https://martinfowler.com/articles/scaling-architecture-conversationally.html)

### [ ] ADRs: registros de decisiones de arquitectura — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/adrs/) · `content/concepts/leadership/adrs.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Nygard (2011): 5 secciones — título, estado, contexto, decisión, consecuencias.
- Regla práctica: 1–2 páginas; lo que sea más largo es exploración y va en un design doc.
- Fuentes: [Michael Nygard — Documenting Architecture Decisions (2011)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) · [ADR GitHub organization — templates and tooling](https://adr.github.io/) · [Andrew Harmel-Law (martinfowler.com) — Scaling the Practice of Architecture, Conversationally](https://martinfowler.com/articles/scaling-architecture-conversationally.html)

### [ ] Entrevistas conductuales: historias STAR — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/behavioral-star/) · `content/concepts/leadership/behavioral-star.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: 2–3 minutos por historia, con Situación + Tarea en menos de ~30 segundos.
- Banco de historias: 8–10, cada una con 2–3 competencias, e incluye al menos un fracaso real y un conflicto.
- Regla práctica: todo Resultado lleva un número, o un antes/después concreto si no hay métrica.
- Fuentes: [Amazon — Leadership Principles](https://www.amazon.jobs/content/en/our-workplace/leadership-principles) · [StaffEng — Promotion packets](https://staffeng.com/guides/promo-packets/) · [StaffEng — Staff archetypes](https://staffeng.com/guides/staff-archetypes/)

### [ ] Code review (revisión de código) — `core`
[Ver página](https://levelup.skillrealm.dev/es/c/code-review/) · `content/concepts/leadership/code-review.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Guía de Google: responde en un día hábil como máximo.
- Guía de Google: ~100 líneas suele ser un cambio razonable; ~1,000 casi siempre es demasiado.
- Estudio de Google (2018, 9M de cambios): mediana de 24 líneas por cambio, 1 revisor y menos de 4 horas de latencia de revisión.
- Mismo estudio: los desarrolladores dedicaban ~3 horas a la semana a revisar (media 3.2, mediana 2.6).
- Fuentes: [Google Engineering Practices — The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html) · [Google Engineering Practices — Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html) · [Google Engineering Practices — Speed of Code Reviews](https://google.github.io/eng-practices/review/reviewer/speed.html) · [Sadowski et al. — Modern Code Review: A Case Study at Google (ICSE SEIP 2018)](https://research.google/pubs/modern-code-review-a-case-study-at-google/)

### [ ] Puertas de una vía vs. de doble vía — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/one-way-doors/) · `content/concepts/leadership/one-way-doors.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Bezos (2016): decide con ~70% de la información que quisieras tener; esperar al 90% casi siempre es demasiado lento.
- Decisiones Tipo 1 / Tipo 2: carta a los accionistas de Amazon de 2015.
- Fuentes: [Amazon — 2015 Letter to Shareholders (Type 1 / Type 2 decisions, one-way doors; SEC filing)](https://www.sec.gov/Archives/edgar/data/1018724/000119312516530910/d168744dex991.htm) · [Amazon — 2016 Letter to Shareholders (two-way doors, 70% information, disagree and commit)](https://www.aboutamazon.com/news/company-news/2016-letter-to-shareholders)

### [ ] Build vs. buy (y selección de proveedores de IA) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/build-vs-buy/) · `content/concepts/leadership/build-vs-buy.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: compara el TCO a ~3 años, incluida la gente que lo opera, no solo la primera construcción.
- Regla práctica: corre el POC sobre unos cientos de casos reales tuyos, idénticos para todas las opciones.
- Fuentes: [Martin Fowler — Utility vs Strategic Dichotomy](https://martinfowler.com/bliki/UtilityVsStrategicDichotomy.html) · [Joel Spolsky — In Defense of Not-Invented-Here Syndrome (build core business functions, buy the rest)](https://www.joelonsoftware.com/2001/10/14/in-defense-of-not-invented-here-syndrome/)

### [ ] Comunicar trade-offs a ejecutivos — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/tradeoff-communication/) · `content/concepts/leadership/tradeoff-communication.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Traduce tasas a cantidades: 95% de accuracy con 10,000 solicitudes al día son ~500 respuestas incorrectas al día.
- Regla práctica: una página, 2–3 opciones, un pedido explícito, una fecha de decisión.
- Regla práctica: la primera oración tiene que funcionar aunque sea la única que se lea.
- Fuentes: [StaffEng — Present to executives](https://staffeng.com/guides/present-to-executives/) · [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)

### [ ] Gestionar la deuda técnica — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/tech-debt/) · `content/concepts/leadership/tech-debt.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Las cuatro métricas clave de DORA: frecuencia de deploy, change lead time, tasa de fallas por cambio y tiempo de recuperación de un deploy fallido (el nombre actual del antiguo MTTR); después se sumó una quinta, la tasa de retrabajo de deploys.
- Regla práctica: intereses ≈ tiempo extra por cambio × cambios al mes en esa área.
- Regla práctica: reserva una porción fija de cada ciclo (a menudo 10–20%) para deuda y mantenimiento.
- Fuentes: [Martin Fowler — Technical Debt Quadrant](https://martinfowler.com/bliki/TechnicalDebtQuadrant.html) · [Sculley et al. — Hidden Technical Debt in Machine Learning Systems (NeurIPS 2015)](https://research.google/pubs/hidden-technical-debt-in-machine-learning-systems/) · [DORA — Software delivery metrics (the four keys)](https://dora.dev/guides/dora-metrics/) · [Will Larson — Managing technical quality](https://lethain.com/managing-technical-quality/)

### [ ] Gobierno de costos de IA (FinOps para IA) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/ai-finops/) · `content/concepts/leadership/ai-finops.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Las APIs de batch (OpenAI, Anthropic) cobran los trabajos asíncronos a ~50% del precio síncrono, con hasta 24 h de entrega.
- En las APIs principales el token de salida cuesta varias veces el de entrada (4× y 5× son comunes), así que limitar la salida rinde pronto.
- Pronóstico: costo mensual ≈ usuarios activos × llamadas por usuario × tokens por llamada × precio combinado por token.
- Si hospedas: costo por token = costo de GPU por hora ÷ tokens realmente servidos por hora. La utilización lo es todo.
- Fuentes: [FinOps Foundation — FinOps for AI Overview](https://www.finops.org/wg/finops-for-ai-overview/) · [FinOps Foundation — FinOps Framework](https://www.finops.org/framework/) · [OpenAI — Batch API guide](https://platform.openai.com/docs/guides/batch)

### [ ] Incidentes y postmortems sin culpables — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/incident-leadership/) · `content/concepts/leadership/incident-leadership.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: en SEV1, actualizaciones a stakeholders cada 15–30 min; en SEV2, cada hora, aunque sea "sin cambios".
- Regla práctica: borrador del postmortem en más o menos una semana, mientras la memoria y los logs están frescos.
- Mide por separado el tiempo de detección, de mitigación y de resolución; la mitigación es la que sienten los usuarios.
- Fuentes: [Google SRE Book — Managing Incidents](https://sre.google/sre-book/managing-incidents/) · [Google SRE Book — Postmortem Culture: Learning from Failure](https://sre.google/sre-book/postmortem-culture/) · [PagerDuty Incident Response — Different roles (IC, Deputy, Scribe, Liaisons)](https://response.pagerduty.com/before/different_roles/) · [PagerDuty Postmortem documentation](https://postmortems.pagerduty.com/)

### [ ] Planificación y estimación — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/planning-estimation/) · `content/concepts/leadership/planning-estimation.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Cono de incertidumbre: en el concepto inicial, el esfuerzo real puede caer entre ~0.25× y 4× lo estimado (Boehm, 1981; McConnell).
- Valor esperado PERT: (optimista + 4 × probable + pesimista) ÷ 6; las colas largas de atraso lo empujan por encima de "probable".
- Evidence-Based Scheduling (Spolsky, 2007): tareas de 16 horas o menos; simula 100 futuros con tus razones históricas estimado/real.
- Ley de Brooks (1975): agregar gente a un proyecto de software atrasado lo atrasa más.
- Regla del noventa-noventa (Tom Cargill, Bell Labs): el último 10% del código toma el otro 90% del tiempo.
- Fuentes: [Martin Fowler — Purpose of Estimation (2013)](https://martinfowler.com/bliki/PurposeOfEstimation.html) · [Joel Spolsky — Evidence Based Scheduling (2007)](https://www.joelonsoftware.com/2007/10/26/evidence-based-scheduling/) · [Cone of Uncertainty (Boehm; McConnell) — Wikipedia](https://en.wikipedia.org/wiki/Cone_of_Uncertainty)

### [ ] Métricas de ingeniería (DORA) — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/engineering-metrics/) · `content/concepts/leadership/engineering-metrics.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Clúster elite de DORA 2024: deploys a demanda, lead time < 1 día, change fail rate ~5%, recuperación < 1 hora.
- Los clústeres se recalculaban cada año con los datos de la encuesta; DORA 2025 los reemplazó por siete arquetipos de equipo.
- Cinco métricas desde 2024 (se agregó rework rate); en 2023, el MTTR pasó a ser failed deployment recovery time.
- SPACE (Forsgren et al., 2021): cinco dimensiones; combina varias y nunca leas la actividad sola.
- Fuentes: [DORA — Software delivery performance metrics (five metrics and pitfalls)](https://dora.dev/guides/dora-metrics/) · [DORA — A history of DORA's software delivery metrics](https://dora.dev/insights/dora-metrics-history/) · [Gergely Orosz & Kent Beck — Measuring developer productivity? A response to McKinsey (2023)](https://newsletter.pragmaticengineer.com/p/measuring-developer-productivity) · [Martin Fowler — Cannot Measure Productivity (2003)](https://martinfowler.com/bliki/CannotMeasureProductivity.html)

### [ ] Contratación y entrevistas estructuradas — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/hiring-interviews/) · `content/concepts/leadership/hiring-interviews.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Validez según Sackett et al. (2022): entrevistas estructuradas ~0.42, muestras de trabajo ~0.33, entrevistas no estructuradas ~0.19.
- Las cifras anteriores de Schmidt y Hunter (1998), que se siguen citando: estructuradas 0.51, no estructuradas 0.38.
- Google re:Work: los candidatos rechazados que tuvieron una entrevista estructurada quedaron 35% más satisfechos con el proceso.
- Amazon (2019): cada contratación debe ser mejor que el 50% de sus futuros pares en roles similares.
- Fuentes: [Google re:Work — A guide to structured interviewing](https://rework.withgoogle.com/intl/en/guides/a-guide-to-structured-interviewing-for-better-hiring-practices) · [Sackett, Zhang, Berry & Lievens — Revisiting meta-analytic estimates of validity in personnel selection (J. Applied Psychology, 2022)](https://doi.org/10.1037/apl0000994) · [About Amazon — What is an Amazon Bar Raiser? (2019)](https://www.aboutamazon.com/news/workplace/amazon-bar-raiser)

### [ ] Priorizar y decir que no — `advanced`
[Ver página](https://levelup.skillrealm.dev/es/c/prioritization/) · `content/concepts/leadership/prioritization.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- CD3 = costo de demora ÷ duración; el puntaje más alto va primero.
- Ejemplo de Black Swan Farming: el orden por CD3 redujo el costo total de demora 61% frente a primero en llegar, primero en salir ($69k → $27k).
- Escalas de RICE (Intercom, 2018): impacto 3 / 2 / 1 / 0.5 / 0.25; confianza 100% / 80% / 50%; esfuerzo en meses-persona.
- Fuentes: [Black Swan Farming — Cost of Delay Divided by Duration (CD3)](https://blackswanfarming.com/cost-of-delay-divided-by-duration/) · [Intercom (Sean McBride, 2018) — RICE: Simple prioritization for product managers](https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/) · [StaffEng (Will Larson) — Work on what matters](https://staffeng.com/guides/work-on-what-matters/)

### [ ] Escribir una estrategia técnica — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/technical-strategy/) · `content/concepts/leadership/technical-strategy.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- El kernel de Rumelt tiene 3 partes: diagnóstico, política guía, acciones coherentes.
- Receta de Larson: 5 design docs → 1 estrategia; 5 estrategias proyectadas a 2 años → 1 visión.
- Regla práctica: 2–4 páginas se leen; el kernel en sí debería caber en una.
- Fuentes: [Will Larson — Good engineering strategy is boring](https://lethain.com/good-engineering-strategy-is-boring/) · [StaffEng — Writing an engineering strategy](https://staffeng.com/guides/engineering-strategy/) · [Will Larson — Writing an engineering strategy (Rumelt's diagnosis, guiding policies, coherent actions)](https://lethain.com/eng-strategies/)

### [ ] Influencia sin autoridad — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/influence/) · `content/concepts/leadership/influence.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: ninguna persona que decide escucha tu propuesta por primera vez en la reunión de decisión.
- Regla práctica: la propuesta cabe en 1–2 páginas; los detalles van en un anexo.
- Fuentes: [StaffEng — Staying aligned with authority](https://staffeng.com/guides/staying-aligned-with-authority/) · [StaffEng — Getting in the room](https://staffeng.com/guides/getting-in-the-room/) · [Amazon — Leadership Principles (Have Backbone; Disagree and Commit)](https://www.amazon.jobs/content/en/our-workplace/leadership-principles)

### [ ] Estrategia y roadmap de adopción de IA — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/ai-strategy/) · `content/concepts/leadership/ai-strategy.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: construye una capacidad de plataforma compartida cuando la necesita el segundo o tercer equipo, no antes.
- Regla práctica: ningún piloto arranca sin dueño, línea base, set de evals y criterios de cancelación.
- Regla práctica: puntúa de 1 a 5 cada eje y multiplica, para que un eje débil hunda el total.
- Fuentes: [Google — Rules of Machine Learning](https://developers.google.com/machine-learning/guides/rules-of-ml) · [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) · [Will Larson — Writing an engineering strategy](https://lethain.com/eng-strategies/)

### [ ] Adopción de agentes de código con IA — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/ai-assisted-engineering/) · `content/concepts/leadership/ai-assisted-engineering.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- RCT de METR (jul 2025): 16 desarrolladores open source experimentados, 246 tareas, 19% más lentos con IA; esperaban ir 24% más rápido y después creían haber ido 20% más rápido.
- RCT de GitHub (Peng et al., 2023): el grupo con Copilot terminó una tarea de servidor HTTP 55.8% más rápido.
- DORA 2025 (~5,000 encuestados): el 90% usa IA en el trabajo, con una mediana de ~2 h/día; más del 80% reporta más productividad; el 30% confía poco o nada en la IA.
- DORA 2024: un aumento de 25% en la adopción de IA se asoció con ~1.5% menos throughput de entrega y ~7.2% menos estabilidad de entrega.
- AGENTS.md, hoy a cargo de la Agentic AI Foundation de la Linux Foundation, se usa en más de 60k proyectos open source.
- Fuentes: [Becker et al. (METR) — Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/abs/2507.09089) · [Google — How are developers using AI? Inside our 2025 DORA report](https://blog.google/technology/developers/dora-report-2025/) · [Peng et al. — The Impact of AI on Developer Productivity: Evidence from GitHub Copilot](https://arxiv.org/abs/2302.06590) · [AGENTS.md — A simple, open format for guiding coding agents](https://agents.md/)

### [ ] Mentoría, coaching y sponsorship — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/mentoring/) · `content/concepts/leadership/mentoring.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica: delega el problema y quédate con la revisión de las puertas de un solo sentido; acuerden cuáles antes de empezar.
- Regla práctica: da feedback SBI en cuestión de días, mientras la situación sigue concreta para los dos.
- Fuentes: [StaffEng — Create space for others](https://staffeng.com/guides/create-space-for-others/) · [Lara Hogan — What does sponsorship look like?](https://larahogan.me/blog/what-sponsorship-looks-like/) · [Center for Creative Leadership — Situation-Behavior-Impact (SBI)](https://www.ccl.org/articles/leading-effectively-articles/closing-the-gap-between-intent-vs-impact-sbii/)

### [ ] Liderar proyectos entre equipos — `staff`
[Ver página](https://levelup.skillrealm.dev/es/c/leading-projects/) · `content/concepts/leadership/leading-projects.json`

- [ ] R  - [ ] C  - [ ] F  - [ ] E
- Regla práctica (Orosz): milestones lo bastante chicos para terminarse en pocas semanas; divide los más largos.
- Regla práctica (Orosz): un reporte de estado escrito cada semana y una demo cada una o dos semanas.
- RACI y DACI permiten exactamente un Accountable (o Approver) por decisión.
- El playbook de migraciones de Larson: reducir riesgo, habilitar, terminar; las herramientas migran el ~90% fácil y tú terminas la cola.
- Fuentes: [Gergely Orosz — How to Lead a Project as a Software Engineer (2020)](https://blog.pragmaticengineer.com/how-to-lead-a-project-in-software-development/) · [Gergely Orosz — Software Engineers Leading Projects: Part Two (2022)](https://newsletter.pragmaticengineer.com/p/engineers-leading-projects-part-2) · [Will Larson — Migrations: the sole scalable fix to tech debt (de-risk, enable, finish)](https://lethain.com/migrations/) · [Atlassian Team Playbook — DACI decision-making framework](https://www.atlassian.com/team-playbook/plays/daci)
