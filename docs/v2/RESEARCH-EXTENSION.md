# Local mathematics research extension — 2026-10-07

This catalogue adds 52 primary URL identities absent from the baseline, including 32 new intellectual papers conservatively counted after excluding already-discussed works. It contains 38 paper entries and 14 official documentation/product entries. Each entry records an inspected primary source, evidence, application, limitations and license/hardware gates in [RESEARCH-EXTENSION.json](RESEARCH-EXTENSION.json). Nothing was downloaded, trained or deployed; no local model benchmark is claimed.

The baseline is 20 Markdown research files with 766 distinct extracted URLs, 761 canonical URL identities and 139 paper-like URL candidates. These are not a verified paper count. Title-only citations, mistaken links and alternate publisher/arXiv versions prevent an honest statement that the underlying algorithm literature has doubled. This is a substantial verified extension, **not a proven 2× corpus**. The JSON preserves the baseline file inventory and marks corrections separately.

## Recommended assembly and acceptance gates

Keep the DOCX/OMML path deterministic: XML → bounded preview → explicit teacher mapping → atomic, idempotent save. Raster OCR is a separate optional local worker. Retain original crop and recognized tokens; show low-confidence or unsupported structure for teacher correction. Compare UniMERNet for formulas, PaddleOCR-VL variants for mixed pages, Tesseract mon for CPU prose, and SmolVLM/Qwen3-VL as compact candidates. Do not auto-save OCR guesses or answer keys. No external model APIs or AWS managed AI inference are part of this proposal.

Build a consented, synthetic/authorized held-out test set containing Mongolian Cyrillic Ө/Ү/ё/й, mixed Latin variables, handwriting, printed fractions/roots/integrals, vectors, matrices, blurry camera images and layout variants. Split by document/template/writer to prevent leakage. Measure character/word errors for prose, structure/token exact match and rendered formula similarity, then mathematical equivalence with explicit domains. Report per-category failure rates, abstention/coverage, teacher correction time and p50/p95 RAM/VRAM/latency on named hardware. No paper establishes Pi.mn-specific accuracy or Mongolian math competence. Traditional vertical Mongolian and modern Cyrillic are different tasks.

Use a small local model for intent/step explanation only after deterministic constraints or symbolic checks. Parameter count and quantized file size do not establish peak VRAM, speed or correctness. Benchmark CPU first for line OCR; choose GPU size only after measuring full runtime, context, batch and image-resolution demand. Inspect exact checkpoint/dataset/model-code terms independently; an open repository is not automatically commercially reusable weights.

Generate questions from bounded typed templates: exact rational coefficients, explicit domain, units and exclusions; solve before publishing, validate unique correct choice and distractor inequality, and store seed plus template version. Geometry requires satisfiable constraints, nondegenerate configurations and replayable derivation; a diagram is illustrative unless its constraints are explicit. Vectors require dimensionality, coordinate basis and zero-vector exclusions for angles. Calculus requires interval/domain/branch assumptions, integration constants, singularity checks and limits for improper integrals. Derivative checks and numerical probes are useful tests, not universal proofs. Lean/formal tools can certify formal statements but cannot certify that OCR correctly captured the intended natural-language problem. Unsupported families should remain teacher-authored.

For adaptive practice, compare interpretable prerequisite/rule and factorization baselines before neural KT. Evaluate chronological held-out students/items with calibration and uncertainty, not only AUC. Do not interpret a predicted answer probability as certain mastery. Learning gains need a separate local controlled evaluation; the ASSISTments randomized trial supports a feedback-and-teacher workflow in its own context, not this app's effectiveness.

For AWS, isolate upload/API from self-hosted inference workers using bounded queues, idempotent job digests, timeouts, retries and dead-letter review. Preserve current persistent confirmation idempotency. Test duplicate delivery, worker crash, Spot interruption, malformed upload, peak queue depth and GPU exhaustion. Restrict source-object access with user authorization and short-lived URLs, keep answer keys off pupil responses, and rehearse RDS restores. Choose EC2/ECS GPU configuration from official support rather than assuming Fargate parity. Costs and capacity remain unmeasured; no free-compute or production-readiness claim.

## Corrections to earlier notes

- `docs/research/knowledge-tracing.md:513` associates SAKT with arXiv 2302.06881, which is simpleKT. SAKT is [1907.06837](https://arxiv.org/abs/1907.06837). SAINT/AKT are verified existing coverage, excluded from the new-paper count.
- `docs/research/RESEARCH-ML-2026-08-08.md:427` describes Nougat with a blanket Apache/commercial implication. The [official repository](https://github.com/facebookresearch/nougat) distinguishes MIT code from CC-BY-NC weights. Default commercial use of those weights is rejected here. GOT-OCR's exact checkpoint license was not established by this audit; the earlier blanket MIT assertion is not accepted.
- Earlier $0 cost, 100–500 ms latency and 95–98% hybrid accuracy statements are not measured Pi.mn results. Replace them with the local acceptance protocol above. Lack of Mongolian evaluation is **missing evidence**, not proof a model cannot process Mongolian.
- [FormalGeo's official repository](https://github.com/formalgeo/FormalGeo) announces a license change effective 2026-05-01. Pin a revision and inspect its actual terms; do not reuse old MIT descriptions for current releases.

## Verified catalogue

### S01 — UniMERNet

[paper; OCR] [UniMERNet](https://arxiv.org/abs/2404.15254). New primary URL. New intellectual paper.

Evidence: Specialized formula recognition trained on diverse formula images. Application: First formula-only local benchmark candidate; preserve original crop alongside LaTeX. Limits: Printed/handwritten formula results do not establish Mongolian prose accuracy. License: Official repository Apache-2.0 code; checkpoint/data terms still require review. Hardware: Tiny/small/base checkpoint downloads listed as 441 MB/773 MB/1.3 GB; these are disk sizes, not VRAM requirements.

### S02 — PaddleOCR-VL

[paper; OCR] [PaddleOCR-VL](https://arxiv.org/abs/2510.14528). New primary URL. New intellectual paper.

Evidence: 0.9B document model combines visual encoding with multilingual language model; paper reports 109 languages. Application: Compare mixed text/table/formula extraction locally. Limits: Language count does not prove Mongolian Cyrillic reliability. License: PaddleOCR repository Apache-2.0; inspect selected checkpoint terms. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S03 — PaddleOCR-VL-1.5

[paper; OCR] [PaddleOCR-VL-1.5](https://arxiv.org/abs/2601.21957). New primary URL. New intellectual paper.

Evidence: 2026 revision evaluates document parsing including physical distortions. Application: Test blur, rotation, lighting, handwriting and math layouts against earlier model. Limits: Published benchmark score is not a Pi.mn measurement. License: PaddleOCR repository Apache-2.0; checkpoint terms separately. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S04 — OCRBench v2

[paper; evaluation] [OCRBench v2](https://arxiv.org/abs/2501.00321). New primary URL. New intellectual paper.

Evidence: Bilingual evaluation spans localization, recognition and reasoning tasks. Application: Separate reading errors from subsequent solver errors. Limits: English/Chinese evaluation does not establish Mongolian coverage. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S05 — SmolVLM

[paper; OCR] [SmolVLM](https://arxiv.org/abs/2504.05299). New primary URL. New intellectual paper.

Evidence: Compact vision-language variants include 256M, 500M and 2.2B. Application: Low-memory exploratory prose/crop classification candidate. Limits: General vision model is not a mathematical equivalence certifier. License: SmolVLM-256M-Instruct official model card Apache-2.0. Hardware: Paper reports sub-1GB inference for smallest configuration; reproduce with chosen runtime/context.

### S06 — Qwen3-VL technical report

[paper; OCR] [Qwen3-VL technical report](https://arxiv.org/abs/2511.21631). New primary URL. New intellectual paper.

Evidence: Vision-language report includes compact 2B deployment option. Application: Compare 2B local OCR on Cyrillic text and formula crops. Limits: Hallucinated formula tokens require review; no Mongolian-specific result verified. License: Qwen3-VL-2B-Instruct official model card Apache-2.0. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S07 — Donut

[paper; OCR] [Donut](https://arxiv.org/abs/2111.15664). New primary URL. New intellectual paper.

Evidence: OCR-free transformer maps document images to structured output. Application: Architectural baseline for structured question extraction. Limits: Domain-specific fine-tuning needed; document extraction does not solve math. License: Official clovaai/donut code MIT; data/checkpoints independently review. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S08 — TrOCR

[paper; OCR] [TrOCR](https://arxiv.org/abs/2109.10282). New primary URL. Excluded from new intellectual-paper count.

Evidence: Transformer OCR pretraining supports printed and handwritten text recognition. Application: Text-line candidate for Mongolian Cyrillic evaluation. Limits: Line recognizer does not represent fraction trees or 2D equation layout. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S09 — Image-to-Markup Generation with Coarse-to-Fine Attention

[paper; OCR] [Image-to-Markup Generation with Coarse-to-Fine Attention](https://proceedings.mlr.press/v70/deng17a.html). New primary URL. New intellectual paper.

Evidence: Primary PMLR paper studies visual formula-to-markup generation. Application: Baseline reason for dedicated math OCR instead of ordinary line OCR. Limits: Training distributions and markup normalization affect transfer. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S10 — Image Over Text: Character Detection Matching

[paper; evaluation] [Image Over Text: Character Detection Matching](https://openaccess.thecvf.com/content/CVPR2025/papers/Wang_Image_Over_Text_Transforming_Formula_Recognition_Evaluation_with_Character_Detection_CVPR_2025_paper.pdf). New primary URL. New intellectual paper.

Evidence: Evaluates rendered formula similarity with character detection matching. Application: Add visual equivalence metric alongside exact token match. Limits: Visual agreement still misses mathematical semantic differences. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S11 — Teaching Machines to Code: Neural Markup Generation

[paper; OCR] [Teaching Machines to Code: Neural Markup Generation](https://arxiv.org/abs/1802.05415). New primary URL. New intellectual paper.

Evidence: Visual attention generates markup sequences from formula images. Application: Historical formula-recognition comparison. Limits: Model age and dataset scope limit deployment conclusions. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S12 — MathCoder

[paper; solver] [MathCoder](https://arxiv.org/abs/2310.03731). New primary URL. New intellectual paper.

Evidence: Interleaves mathematical reasoning and code execution. Application: Use structured solver tool calls after OCR confirmation. Limits: Generated code untrusted; benchmark gains do not establish universal correctness. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S13 — ToRA

[paper; solver] [ToRA](https://arxiv.org/abs/2309.17452). New primary URL. New intellectual paper.

Evidence: Tool-integrated reasoning uses computation and symbolic tools. Application: Architectural reference for deterministic local solver plus compact language explanation. Limits: Sandbox code; validate tool outputs and assumptions; prohibit arbitrary production execution. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S14 — Phi-4 technical report

[paper; solver] [Phi-4 technical report](https://arxiv.org/abs/2412.08905). New primary URL. New intellectual paper.

Evidence: 14B model report emphasizes synthetic data and STEM performance. Application: Upper-bound comparator if local hardware permits. Limits: Not the smallest model; no Mongolian mastery evidence verified. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S15 — TinyLlama

[paper; solver] [TinyLlama](https://arxiv.org/abs/2401.02385). New primary URL. New intellectual paper.

Evidence: 1.1B language model provides compact pretraining baseline. Application: Evaluate intent classification rather than authoritative final answers. Limits: Small parameter count alone does not imply mathematical or Cyrillic competence. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S16 — Gemma 3 technical report

[paper; solver] [Gemma 3 technical report](https://arxiv.org/abs/2503.19786). New primary URL. New intellectual paper.

Evidence: Model family offers multiple sizes and multimodal variants. Application: Alternative local comparison only after license and hardware evaluation. Limits: Do not extrapolate multilingual coverage to Mongolian math. License: Custom model terms: not verified in this audit; no deployment recommendation. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S17 — FormalGeo

[paper; geometry] [FormalGeo](https://arxiv.org/abs/2310.18021). New primary URL. New intellectual paper.

Evidence: Formalized geometry framework represents problems and theorem deductions. Application: Template-based Euclidean plane generation with replayable proofs. Limits: Does not cover arbitrary diagrams, vectors, calculus or OCR automatically. License: Official repository announces MIT-to-GPL change effective 2026-05-01; inspect/pin exact revision. Earlier releases and current releases differ. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S18 — InterGPS

[paper; geometry] [InterGPS](https://arxiv.org/abs/2105.04165). New primary URL. New intellectual paper.

Evidence: Combines geometry text/diagram interpretation and formal solving. Application: Evaluate parser/solver stages separately for imported diagrams. Limits: Diagram perception and numerical assumptions can fail; never infer exact length from pixels. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S19 — FGeoTP

[paper; geometry] [FGeoTP](https://arxiv.org/abs/2402.09047). New primary URL. New intellectual paper.

Evidence: Language-model-enhanced geometry theorem prediction within formal framework. Application: Compare theorem-search heuristics with deterministic baseline. Limits: FormalGeo dataset performance does not justify unconstrained generated geometry. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S20 — GeoQA

[paper; geometry] [GeoQA](https://arxiv.org/abs/2105.14517). New primary URL. New intellectual paper.

Evidence: Benchmark studies numerical geometry question answering. Application: Construct held-out geometric interpretation tests. Limits: Answer accuracy alone may hide invalid reasoning; dataset reuse license unresolved. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S21 — Solving Geometry Problems: Combining Text and Diagram Interpretation

[paper; geometry] [Solving Geometry Problems: Combining Text and Diagram Interpretation](https://aclanthology.org/D15-1171/). New primary URL. New intellectual paper.

Evidence: Primary ACL paper joins text and diagram evidence. Application: Use explicit constraints rather than visual guesses. Limits: Older restricted problem domain; not general high-school proof engine. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S22 — MathVerse

[paper; evaluation] [MathVerse](https://arxiv.org/abs/2403.14624). New primary URL. New intellectual paper.

Evidence: Visual math benchmark varies diagram/text availability. Application: Detect whether local solver actually uses diagram evidence. Limits: Benchmark English content does not cover Mongolian; generated rationales are not proof. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S23 — WeMath

[paper; evaluation] [WeMath](https://arxiv.org/abs/2407.01284). New primary URL. New intellectual paper.

Evidence: Studies multimodal mathematical reasoning and knowledge decomposition. Application: Tag conceptual gaps separately from perception mistakes. Limits: External benchmark gains do not establish classroom learning gains. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S24 — UniGeo

[paper; geometry] [UniGeo](https://aclanthology.org/2022.emnlp-main.218/). New primary URL. New intellectual paper.

Evidence: Reformulates geometry logical reasoning through mathematical expression generation. Application: Reference structured intermediate representation. Limits: Expression generation is not guaranteed logical validity. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S25 — When Does Auxiliary Modality Matter in Solving Geometric Problems?

[paper; geometry] [When Does Auxiliary Modality Matter in Solving Geometric Problems?](https://aclanthology.org/2026.eacl-short.4/). New primary URL. New intellectual paper.

Evidence: 2026 primary paper compares textual, formal and visual modalities. Application: Choose modality based on held-out ablation, not model marketing. Limits: Transfer to Mongolian and local geometry templates remains untested. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S26 — Learning to Solve Geometry Problems from Natural Language Demonstrations

[paper; geometry] [Learning to Solve Geometry Problems from Natural Language Demonstrations](https://aclanthology.org/S17-1029/). New primary URL. New intellectual paper.

Evidence: Learns geometry solving from textbook demonstrations. Application: Compare authored derivation steps with generated explanations. Limits: Textbook examples alone do not establish robustness to novel constructions. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S27 — miniF2F

[paper; verification] [miniF2F](https://arxiv.org/abs/2109.00110). New primary URL. New intellectual paper.

Evidence: 488 formal Olympiad and school/university problem statements across proof systems. Application: Evaluate proof checking as stronger gate than language-model answer matching. Limits: Formal statement correctness and geometry diagram formalization remain human work. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S28 — LeanDojo

[paper; verification] [LeanDojo](https://arxiv.org/abs/2306.15626). New primary URL. New intellectual paper.

Evidence: Open theorem proving toolkit and retrieval-augmented benchmark. Application: Optional proof-worker experiment for authored formal topics. Limits: Heavy setup and search; kernel success does not verify OCR translation. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S29 — ProofNet

[paper; verification] [ProofNet](https://arxiv.org/abs/2302.12433). New primary URL. New intellectual paper.

Evidence: 371 natural-language/formal undergraduate mathematics examples. Application: Audit autoformalization separately from theorem proving. Limits: Undergraduate domains and Lean version differ from school geometry workflow. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S30 — pyKT

[paper; adaptive] [pyKT](https://arxiv.org/abs/2206.11460). New primary URL. New intellectual paper.

Evidence: Knowledge tracing toolkit standardizes datasets and model evaluation. Application: Compare KT baselines with consistent splits and preprocessing. Limits: Offline prediction is not a causal learning-outcome result. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S31 — Knowledge Tracing Machines

[paper; adaptive] [Knowledge Tracing Machines](https://arxiv.org/abs/1811.03388). New primary URL. New intellectual paper.

Evidence: Factorization machines provide interpretable feature-based knowledge tracing. Application: Compare simple skill/item/attempt baselines before neural model deployment. Limits: Requires reliable skill tags; latent scores are uncertain mastery estimates. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S32 — Addressing Two Problems in Deep Knowledge Tracing

[paper; adaptive] [Addressing Two Problems in Deep Knowledge Tracing](https://arxiv.org/abs/1806.02180). New primary URL. New intellectual paper.

Evidence: Prediction-consistent regularization addresses reconstruction and oscillation problems. Application: Check mastery stability when observations arrive. Limits: Regularization does not validate pedagogical interventions. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S33 — Online Mathematics Homework Increases Student Achievement

[paper; adaptive] [Online Mathematics Homework Increases Student Achievement](https://journals.sagepub.com/doi/abs/10.1177/2332858416673968). New primary URL. New intellectual paper.

Evidence: Randomized field trial evaluates ASSISTments homework and feedback with 2,850 seventh-grade students. Application: Evidence for immediate feedback plus teacher-facing formative assessment; plan local controlled evaluation. Limits: US seventh-grade intervention includes teachers/context; cannot transfer effect size directly. License: Article CC-BY-3.0; software terms separate. Hardware: Not applicable: educational intervention paper, not runtime benchmark.

### S34 — Nougat

[paper; correction] [Nougat](https://arxiv.org/abs/2308.13418). New primary URL. Excluded from new intellectual-paper count.

Evidence: Academic document image-to-markup model. Application: Correct prior commercial-use assumptions. Limits: Academic printed PDFs are not handwritten Mongolian math. License: Official repository: code MIT, model weights CC-BY-NC; reject default commercial weights. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S35 — GOT-OCR 2.0

[paper; correction] [GOT-OCR 2.0](https://arxiv.org/abs/2409.01704). New primary URL. Excluded from new intellectual-paper count.

Evidence: 580M unified OCR model. Application: Evaluate local recognition, not assume solved equations. Limits: Exact checkpoint license was not verified; previous blanket MIT claim is unsupported. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S36 — SAKT

[paper; correction] [SAKT](https://arxiv.org/abs/1907.06837). New primary URL. Excluded from new intellectual-paper count.

Evidence: Self-attentive knowledge tracing paper. Application: Correct baseline link pointing to simpleKT. Limits: Does not supply causal learning benefit. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S37 — SAINT

[paper; correction] [SAINT](https://arxiv.org/abs/2002.07033). New primary URL. Excluded from new intellectual-paper count.

Evidence: Query/key/value design for knowledge tracing. Application: Add primary citation for already discussed SAINT. Limits: Not new intellectual coverage. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S38 — AKT

[paper; correction] [AKT](https://arxiv.org/abs/2007.12324). New primary URL. Excluded from new intellectual-paper count.

Evidence: Context-aware attentive knowledge tracing. Application: Verify existing baseline discussion. Limits: Not new intellectual coverage. License: Not verified: inspect exact code, checkpoint and dataset licenses separately before use. Hardware: No local benchmark: measure peak RAM/VRAM, p50/p95 latency and throughput on target hardware.

### S39 — SQS at-least-once delivery

[official-document; AWS] [SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html). New primary URL. Excluded from new intellectual-paper count.

Evidence: Standard queues can redeliver messages. Application: Use source/job digest plus durable unique idempotency key before saving OCR/import result. Limits: Exactly-once processing cannot be assumed. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S40 — SQS visibility timeout

[official-document; AWS] [SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html). New primary URL. Excluded from new intellectual-paper count.

Evidence: Visibility timeout hides in-flight messages and must fit processing time. Application: Heartbeat long OCR jobs and cap retries. Limits: Visibility does not eliminate duplicate delivery. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S41 — ECS GPU workloads

[official-document; AWS] [ECS GPU workloads](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-gpu.html). New primary URL. Excluded from new intellectual-paper count.

Evidence: GPU resources are configured on GPU-capable EC2 container instances. Application: Separate bounded inference workers from HTTP API. Limits: Pin CUDA/driver/runtime; evaluate queue backpressure and memory saturation. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S42 — ECS Fargate task differences

[official-document; AWS] [ECS Fargate task differences](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html). New primary URL. Excluded from new intellectual-paper count.

Evidence: Task parameter support differs between EC2 and Fargate. Application: Validate actual compute configuration before scheduling chosen model. Limits: Do not assume all EC2 GPU settings transfer to Fargate. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S43 — EC2 Spot interruption notices

[official-document; AWS] [EC2 Spot interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html). New primary URL. Excluded from new intellectual-paper count.

Evidence: Spot interruptions expose notice mechanisms. Application: Checkpoint/requeue idempotent jobs; keep confirmation transactions on durable service. Limits: A notice is not a guarantee every job completes. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S44 — RDS point-in-time recovery

[official-document; AWS] [RDS point-in-time recovery](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html). New primary URL. Excluded from new intellectual-paper count.

Evidence: PITR creates a new instance without modifying the source. Application: Rehearse restores and verify security/parameter settings and audit rows. Limits: Configured backup is not evidence of tested recovery. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S45 — RDS Proxy

[official-document; AWS] [RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html). New primary URL. Excluded from new intellectual-paper count.

Evidence: Proxy manages database connection pooling. Application: Evaluate connection bursts separately from GPU queue scaling. Limits: Transactions and session behavior must be tested; proxy is not unlimited DB capacity. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S46 — S3 presigned URLs

[official-document; AWS] [S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html). New primary URL. Excluded from new intellectual-paper count.

Evidence: Presigned URLs grant time-bounded access using signer permissions. Application: Short-lived per-user upload/download scopes, never public source books. Limits: URL possession grants access; expiry alone does not provide application authorization. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S47 — AWS Reliability Pillar

[official-document; AWS] [AWS Reliability Pillar](https://docs.aws.amazon.com/whitepapers/latest/reliability-pillar/welcome.html). New primary URL. Excluded from new intellectual-paper count.

Evidence: Official reliability guidance covers resilient architecture and recovery. Application: Define job retry limits, health checks, alerts and failure drills. Limits: Guidance does not certify this un-deployed local app. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S48 — SymPy integrals

[official-document; calculus] [SymPy integrals](https://docs.sympy.org/latest/modules/integrals/integrals.html). New primary URL. Excluded from new intellectual-paper count.

Evidence: Integration APIs may return unevaluated integrals when methods cannot solve them. Application: Generate supported templates, verify derivatives, state domain/constant and use exact rationals. Limits: Symbolic tools are not universal solvers; branch conditions and improper integrals require explicit validation. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S49 — Tesseract language data

[official-document; Cyrillic] [Tesseract language data](https://github.com/tesseract-ocr/tessdata). New primary URL. Excluded from new intellectual-paper count.

Evidence: Official data repository includes mon.traineddata. Application: CPU text-line baseline for Mongolian Ө/Ү/ё/й and mixed symbols. Limits: Model existence is not measured script coverage or handwritten/math fidelity; no downloads performed. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S50 — ALEKS Knowledge Space Theory

[official-document; competitor] [ALEKS Knowledge Space Theory](https://www.aleks.com/about_aleks/knowledge_space_theory). New primary URL. Excluded from new intellectual-paper count.

Evidence: Vendor describes assessment using feasible knowledge states. Application: Compare prerequisite graph and explainable placement instead of opaque single mastery percentage. Limits: Vendor account is not independent efficacy proof; no pricing comparison. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S51 — Khanmigo

[official-document; competitor] [Khanmigo](https://www.khanacademy.org/khanmigo). New primary URL. Excluded from new intellectual-paper count.

Evidence: Official product positions teacher assistant and student tutor. Application: Compare guided questioning and teacher review workflows. Limits: Hosted AI approach does not satisfy local/no-external-AI requirement; no equivalent outcome claimed. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

### S52 — Desmos Geometry

[official-document; competitor] [Desmos Geometry](https://help.desmos.com/hc/en-us/articles/15316366009997-Getting-Started-Desmos-Geometry). New primary URL. Excluded from new intellectual-paper count.

Evidence: Official tool supports interactive geometric constructions. Application: Use draggable constraint exploration as UI comparison. Limits: Construction tools do not replace validated question generation or local pedagogical outcomes. License: Documentation reference only; service/runtime/data licensing separate. Hardware: Measure actual worker/database resource demand and restore times; no price or throughput claim.

## Unresolved evidence

Exact checkpoint and dataset licenses remain deployment gates wherever explicitly unverified. No authoritative modern Mongolian Cyrillic handwriting benchmark with a reproduced local result was established. Competitor pages describe products, not comparative efficacy or current regional availability. Paper findings are source claims, not local validation. The catalogue does not establish a doubled verified baseline, universal solver coverage, or production deployment readiness.
