# Pi.mn — машин сургалтын судалгаа

**Огноо:** 2026-08-08 · 10 сэдэв, зэрэг ажилласан агентууд

> ⚠️ **ТҮҮХИЙ гаралт.** Уншихдаа:
> 1. Тоо, өртөг, benchmark оноог эх сурвалжаар нь ШАЛГА — агент хуучирсан
>    эсвэл буруу тоо бичсэн байж болно. Ялангуяа ҮНЭ хурдан хуучирдаг.
> 2. Лицензийг өөрөө уншиж баталгаажуул — арилжааны хэрэглээ эрсдэлтэй.
> 3. Монгол бичвэрийн зарим хэсэг эвдэрсэн байж болзошгүй (агентын гаралт).
> 4. Санал бүрийг эзний дүрэмтэй тулга (гадаад CDN/зураг ХОРИОТОЙ).

---

## ?

*Pi.mn төслийн ЭЕШ математик шалгалтын хөдөлгүүр үнэлгээ - аюулгүй болгох арга*

### Олдворууд

**1. Self-consistency voting нь математикийн чанарыг 3-10% нэмэгдүүлэх боловч төсөв сорилт байна**

- *Эх сурвалж:* «A Survey on Test-Time Scaling in Large Language Models» (2025) нь процесс үнэлгээний алхам-алхамын зардал 3-10x өндөр байдлыг харуулсан. Sürü сонголт (majority voting) нь claude эсвэл өтөг загвараар 62%-75% нь нэмэгдүүлж болох. Гэхдээ ЭЕШ-ийн математикт сурагч нэг удаа бодлого бодох тул production-т 5x дахин давтах урсгал сурагчдыг сануулсан хийнэ.
- *Ач холбогдол:* Pi.mn-ийн төсөв сарын $50-300 байхад, 6125 бодлогын хэдэн хэсэгт self-consistency ашиглаж болно (чухал эсвэл эрсдэлтэй бодлого). Бүх бодлогод ашиглах нь боломжгүй.

**2. SymPy symbolic verification нь алгебр/арифметик хариуг 100% нарийвчлалтайгаар баталгаажуулдаг**

- *Эх сурвалж:* «Solving Math Word Problems by Combining Language Models With Symbolic Solvers» (2023) нь SymPy нь LaTeX хариуг регэксээр татаж, SymPy болгон парс хийн, символ болон нижээр эргүүлж баталгаажуулдлаг бичсэн. Таамаглалын ялгаа 0 болж байвал зөв. Хүнд талуудын геометр сорилт байна.
- *Ач холбогдол:* ЭЕШ математикийн 60-70% нь алгебр, арифметик (хэдэн хүүхдүүд байхав тийм). SymPy-г сервер талд орсуулбал сурагчийн хөндлөнийг хаадаг.

**3. Process Reward Models (PRMs) нь алхам-алхамаар үнэлэх боловч шаардлагатай өгөгдөл 3-10x илүү үнэтэй**

- *Эх сурвалж:* «The Lessons of Developing Process Reward Models in Mathematical Reasoning» (2025) нь PRM-ийн алхам-алхамын анноталь явдал ORM-ээс 3-10x үнэтэй байдлыг нотолсон. Monte Carlo estimate-аар сүүлэлгүүлэх арга чанарлалт муу байна.
- *Ач холбогдол:* Pi.mn-д шаардлагатай хүний үйлчилгээ (багш анноталь) маш их. Эхлээд ORM (outcome) ашиглаж сур, түүнээс PRM-рүү шилжүүлэх.

**4. GSM8K, MATH benchmark-уудын contamination давалгаа: 90%+ нарийвчлал одоо ч гараарандаа**

- *Эх сурвалж:* «Leveraging Online Olympiad-Level Math Problems for LLMs Training and Contamination-Resistant Evaluation» (2025) нь GSM8K нь saturate дээ (>90% SOTA оноо) ба ЭЕШ-т холбоотой байхгүй. Өлимпиадын түвшинний бодлого орсуулба контаминалгүй үнэлгээ боломжтой.
- *Ач холбогдол:* Монголын ЭЕШ нь өөрийн benchmark (50-100 гадна сонгосон бодлого) хэрэгтэй. Pi.mn-ийн одоо байгаа 6125 бодлогоос 10% сонгож хяналт group үүсгэ.

**5. Төсвийн үүднээс open-source LLM (Mistral, Qwen, Llama) + Together AI/Groq = $0.07-0.90/M tokens**

- *Эх сурвалж:* «LLM Inference Cost 2026» (2026) ба Featherless ба Inference.net өгөгдлүүд: OpenRouter-ийн Mistral 7B $0.07/M input, GPT-4o $3/M. Qwen-ын quantized версион ($0.15/M) нь quality loss багатай.
- *Ач холбогдол:* Claude/GPT-4o ($3-15/M tokens) ашиглавал сараа $500+ болно. Together AI-ийн Mistral ($0.15/M) = $3-5/сар бага ашиглалтын хувьд.

**6. Хүн шалгах стратеги: эрсдэлтэй (confidence < 0.7) + random sampling 10% → сургалтын төвийн сэтгэл санаа хэмнэнэ**

- *Эх сурвалж:* «CompassVerifier» (2025) нь confidence score-аар эрсдэлтэй бодлогуудыг сонгож шалгадал үнэлгээ чанарлалт 15-20% сайжирна гэсэн. Random sampling стратеги нь drift дээшүүлэлгэнэ.
- *Ач холбогдол:* Pi.mn-д 13 багш, 359 сурагч. Бүх үнэлгээг шалгах боломжгүй. 10-15% sampling + эрсдэлтэй бодлого = багшийн цагийн 80% хэмнэлт.

**7. LLM буруу хариу өгвөл сурагчид сансар: итгэлийн түвшинийг харуулаж "мэдэхгүй" гэх сонголт хэрэгтэй**

- *Эх сурвалж:* «Rating Roulette: Self-Inconsistency in LLM-As-A-Judge» (EMNLP 2025) нь LLM дэх uncertainty болон bias-т сэнгэгдэл бүхий үнэлгээ байна гэв. "I don't know" хэлэлг буруу хариуг байлаа гэхээс сайн.
- *Ач холбогдол:* Сурагч буруу үнэлгээнээс гэмтсэнгүүр төвийн нэр хүндэд бөөлнө. Confidence < 0.5 үед эргүүлэх ба хүнээс асуух үйлчилгээ байх.

### Pi.mn дээр хийх санал

| Нөлөө | Ажил | Үйлдэл | Үндэслэл |
|---|---|---|---|
| critical | S | Together AI + Mistral 7B эсвэл Qwen 8B-д API үүсгэнэ ($0.15-0.30/M) | Claude ($3/M) өндөр. Mistral/Qwen чанаржэнд хүрэлцүүлэхгүй боловч ЭЕШ түвшинд сайтар ажилла. Quantized версион (int4) 40% хурдан. NestJS-д webhook орсуулаа. |
| critical | S | LLM итгэлтэй байхгүй үед (confidence < 0.5) эргүүлүүлэх эсвэл bagaaral@pi-mn.mn-рүү илгээнэ | Буруу хариу → сурагч гэмтэх. Bagaaral = ЭЕШ чиглэлийн даалгавруулагч. SMS (Twilio?) эсвэл email alert орсуулаа. |
| high | M | Local symbolic validator (SymPy) үүсгэнэ: LaTeX парсинг + алгебрийн баталгаажуулалт | ЭЕШ математикийн 60-70% алгебр/арифметик. SymPy-д хэрэглэгчийн код оруулах аюулгүй биш (sandbox). Хэшээ сургалтын төвийн сервер (NestJS/Prisma) дээр edge function болгон орсуулаа. |
| high | M | Self-consistency voting систем (3-5x санамсаргүй бодуулж) эхлүүлэнэ - эхэндээ эрсдэлтэй 50 бодлогод | 3-10x давтал ашиглалтын токен 3-10 дахин нэмэгддэг. Бага бюджетийн хүрээнээр хайж болохгүй боловч чухал бодлогод (сорилгын 10-15%) ашиглаж болно. Mistral 7B $0.15/M = 50 x 500 token x 5 = 375k token = $0.06. |
| high | M | Монголын ЭЕШ benchmark: 6125-ыг 10% (612 бодлого) сонгож хяналт group үүсгэнэ | GSM8K contamination. Сургалтын төвийнхөө өөрийн контаминалгүй үнэлгээ дээд чух. 50-100 нь эхлэлтэй хүрэлцэх (200 токен/бодлого x 100 = 20k token = $0.01 Mistral-т). |
| high | M | Confidence score харуулалт + random 10% sampling + эрсдэлтэй (< 0.7) үнэлгээ хүний шалгалтад оруулна | Багш 13 хүн: бүгдийг шалгах боломжгүй. Эрсдэлтэй 15% + random 10% = 25% → 150-200 үнэлгээ/сар. Дипломынхаа болгоомжлол 15-20%. |
| medium | L | Process Reward Model-ыг үм үүнээс төхөөрөмж эхлүүлэхээсээ урьдчилан үнэлгээ хийнэ | PRM = 3-10x үндэр зардал. Эхэндээ ОRM (outcome) ашигла. 200+ алхам-алхамын анноталь өгөгдлийг цуглуулсны дараа PRM сургалт сон. |

<details><summary>Эх сурвалж (15)</summary>

- [S2R: Teaching LLMs to Self-verify and Self-correct](https://aclanthology.org/2025.acl-long.1104.pdf) (ACL 2025)
- [A Theoretical Study on Bridging Internal Probability and Self-Consistency for LLM Reasoning](https://arxiv.org/pdf/2510.15444) (2025)
- [CompassVerifier: A Unified and Robust Verifier for LLMs Evaluation and Outcome Reward](https://arxiv.org/pdf/2508.03686) (2025)
- [Leveraging Online Olympiad-Level Math Problems for LLMs Training and Contamination-Resistant Evaluation](https://arxiv.org/pdf/2501.14275) (2025)
- [Rethinking Benchmark and Contamination for Language Models with Rephrased Samples](https://arxiv.org/pdf/2311.04850) (2023)
- [Solving Math Word Problems by Combining Language Models With Symbolic Solvers](https://mathai2023.github.io/papers/16.pdf) (2023)
- [Step-Wise Formal Verification for LLM-Based Mathematical Reasoning](https://arxiv.org/pdf/2505.20869) (2025)
- [GM-PRM: A Generative Multimodal Process Reward Model for Multimodal Mathematical Reasoning](https://arxiv.org/pdf/2508.04088) (2025)
- [The Lessons of Developing Process Reward Models in Mathematical Reasoning](https://arxiv.org/abs/2501.07301) (2025)
- [A Survey on Test-Time Scaling in Large Language Models: What, How, Where, and How Well?](https://arxiv.org/pdf/2503.24235) (2025)
- [Rating Roulette: Self-Inconsistency in LLM-As-A-Judge](https://aclanthology.org/2025.findings-emnlp.1361.pdf) (EMNLP 2025)
- [LLM API Pricing Comparison 2026: The Complete Guide to Inference Costs](https://featherless.ai/blog/llm-api-pricing-comparison-2026-complete-guide-inference-costs) (Featherless, 2026)
- [LLM Inference Cost 2026: Cost per Million Tokens](https://packet.ai/blog/llm-inference-cost) (Packet.ai, 2026)
- [OlympiadBench: A Challenging Benchmark for Promoting AGI with Olympiad-Level Bilingual Multimodal Scientific Problems](https://arxiv.org/html/2402.14008v1) (2024)
- [CogMath: Assessing LLMs' Authentic Mathematical Ability from a Human Cognitive Perspective](https://arxiv.org/pdf/2506.04481) (2025)

</details>

---

## ?

*Pi.mn сургалтын төвийн хямд ML стратеги: Fine-tuning, Serving, API сонголт*

### Олдворууд

**8. LoRA/QLoRA fine-tuning 7B загвар 6000 жишээ дээр $3–10 GPU цаг өртөг**

- *Эх сурвалж:* 2026 онд A100 80GB дээр 3–4 цаг, RTX 4090 дээр 6–8 цаг шаардлагатай. GPU үнэ: A100 $1.19/цаг, RTX 4090 $0.31/цаг. Нийт сургалт $3 (4090) ~ $5 (A100) болно.
- *Ач холбогдол:* Pi.mn 6125 бодлогоны дээр өөрийн math tutor загвар сургахдээ төсөвтэй бүрэн нийцэх үнэ. Монгол өгөгдлөөр сургах үед энэ үнэ ч байж болох бэлэг юм.

**9. Unsloth framework нь Axolotl-ээс 2x хурдан (3.2 цаг vs 5.8 цаг A100 дээр), гэхдээ бүтээлтэй ганц GPU дээр үйлчилдэг**

- *Эх сурвалж:* Llama 3.1 8B fine-tuning benchmark: Unsloth 3.2 цаг, Axolotl 5.8 цаг. Unsloth нээлттэй эх (MIT лиценз), argillalyical производства. LLaMA-Factory + Unsloth backend нь сайн сонголт.
- *Ач холбогдол:* Pi.mn-д нэг A100 эсвэл 4090 рүү үйл ажиллагаа эхлүүлж болох бүрэлдэхүүн. Unsloth өөрийн лиценз нь арилжаа идэвхтэй, API үйлчилгээ болгон үй ажиллуулах боломжтой.

**10. Google Colab Pro ($10/сар) A100 fine-tuning-д АДИЛГҮЙ. Дээрэлтүүлэлтийн баланс нэг долоо хоног дотор дуусна**

- *Эх сурвалж:* Colab Pro A100 15 CU/цаг боолж, 100 CU = 7 цаг. Сарын 2–3 цаг fine-tuning-ийн баланс үгүй болно. Paperspace A100 $1.15/цаг (хямдагц).
- *Ач холбогдол:* Colab Pro нь trial-д сайн, гэхдээ сөргүүлтийн үйлсүүлэлтийн сургалтыг үргэлжүүлэхийн тулд Lambda/Paperspace/Vast.ai рүү шилжих хэрэгтэй.

**11. vLLM vs TGI vs llama.cpp: vLLM хамгийн хурдан (24x TGI), ollama/llama.cpp бага ачаалалтай (1–5 сурагч)**

- *Эх сурвалж:* vLLM: A100 дээр Llama 70B → 3500 tokens/sec. TGI: 2500 tokens/sec. llama.cpp (CPU): 200–500 tokens/sec. 50 сурагч асуувал vLLM эсвэл TGI шаардлагатай.
- *Ач холбогдол:* Pi.mn-ий 50–100 сурагчийн идэвхтэй ашиглалтад vLLM-ээр NestJS сервер рүү API эвхүүлэх нь зөв сонголт. Таруулах: $500–1000/сар (A100 rental).

**12. DeepSeek V4 Flash $0.14/$0.28/M tokens (Gemini Flash-Lite $0.10/M, GPT-4o mini $0.40/M) нь хамгийн хямд API**

- *Эх сурвалж:* 2026 үнэлгээ: DeepSeek ≈99% хямд GPT-5.5-ээс. Монгол өгөгдлийн нээлттэй байдлын санаа тавьчихсан бол (өөрийн IP авах), DeepSeek эрхий эргүүлэлтүүд өчүүхэн хүнд (censorship эрсдэл нэмэлт).
- *Ач холбогдол:* Сарын 1800 асуулт (359 сурагч × 5/өдөр) × 200 input tokens × $0.14 = $50/сар. API шийдэл нь fine-tuning-ээс 20–30x хямдагц. Гэхдээ асуулт өгөгдлийг серверээр хадгалах нь МҮЧҮҮН.

**13. Semantic caching 40–86% өртөг хасах (embedding similarity cosine 0.92–0.95). Хоёрдугаарт ашигласан асуулт 250x хурдан**

- *Эх сурвалж:* AWS benchmark 63.8k сорил: 86% өртөг хасах, 88% latency сайжруулалт. Redis HNSW индекс, GPTCache, Percona. Хүлээлтийн сулруулалт: хичнээн хариулт буруу байх.
- *Ач холбогдол:* Pi.mn-д 6125 бодлого байгаа учир ижил бодлогуудыг олон сурагч асуувал (≈60% дубликат асуулт гэж таамаглая), caching-аар $50 → $15/сар хүртэл хасч болно. Gainer: Redis + embedding model.

**14. Prompt caching (яг нэлээд) + Semantic caching хоёр давхар: 60% өртөг хасах + 1000x хурдан**

- *Эх сурвалж:* 500-token prompt 1000 удаа/өдөр = $75/өдөр (GPT-4o). Keying + Redis с cosine similarity → $2/өдөр хүртэл. Input tokens л хасагддаг (output БИШ).
- *Ач холбогдол:* Pi.mn-д hint, solution дахь ижил текст олон удаа ашигласан болно. Яг нэлээд + semantic кэш → сарын $2000 → $500–800 болно.

**15. Монголоос Сингапур/Токио/Сөүл хандалт 80–150 ms. Хямд зам: Alibaba CDN Шанхайгаар ($2–5/сар).**

- *Эх сурвалж:* Equinix, Zenlayer latency maps. Монгол → Сөүл ≈100 ms, → Токио ≈120 ms, → Singapore ≈180 ms. AWS Asia (Tokyo) нь 200–250 ms. Хамгийн ойр: Сеул, Чэрнобыл (китайн нотариус).
- *Ач холбогдол:* Вэб талд нэг асуулт ≤ 200 ms эхлэх ёстой. Сөүлийн сервер эсвэл Шанхайн CDN ашигла. Монгол DNS + CDN хэмжээ авах бус.

**16. Mongolian-Llama3, Mongolian-Llama3.1 нүүрлүүлэх боломжтой (Hugging Face дээр нээлттэй эх, llama-3 лиценз)**

- *Эх сурвалж:* Dorjzodovsuren/Mongolian_Llama3-v1.1 (8B, instruction-tuned). Llama 3 нь 8 хэл л дэмждэг (МНМ БИШ), гэхдээ fine-tuning зөвшөөрөгдсөн. Avalanche, roleplay, tool-using чадвартай.
- *Ач холбогдол:* Pi.mn өөрийн Монгол math domain fine-tuning-ийн суурь нь энэ хүлээлэлт байдаг. Apache-2.0 эсвэл нээлттэй сайн. Альберт: DeepSeek-7B Монгол версия нь эргүүлээгүй байж магад.

**17. Монголын ПБНТ (Өөрийн Өгөгдлийн Хамгаалалтын Хууль, 2022 оны 5-р сар нээлттэй) нь AI-д сурагчийн өгөгдлийн нуруу хайрлахыг шаарддаг**

- *Эх сурвалж:* Mongolia Law of Personal Data Protection (2022-05-01 нээлттэй). Хүүхдийн өгөгдөл (үйл ажиллагаа, асуулт, хариу үнэлгээ) = sensitive data. ESIS (Education EMIS) нь cross-system ID ашигласан.
- *Ач холбогдол:* Pi.mn-д сурагчийн асуулт-хариу журамалд: гадаад API (DeepSeek, OpenAI) рүү явуулахнь заагдсан төслийн эгшигд хулгайлагдах эрсдэл. Нийлсэн дулааны эх (on-premise) эсвэл дотоодын API сайн. Өөрийн Llama ѐс санал.

**18. NestJS + Prisma + PostgreSQL дээр vLLM/TGI микросервис эвхүүлэх нь хамтын архитектур: API Gateway (NestJS) → Queue (Bull/RabbitMQ) → GPU Worker (Python vLLM)**

- *Эх сурвалж:* NestJS TypeScript, PostgreSQL pooling, Prisma ORM. AI workflow нь streaming, background task, orchestration шаардаж болно. Bull queue Redis-аар хувьсгалтан 10k+ RPS хэмжээ авдаг.
- *Ач холбогдол:* Pi.mn-д нэг NestJS сервер (HTTP/WebSocket) ба нэг Python vLLM сервер (хоёр машин) сайн сонголт. PostgreSQL дээр Attempt, Problem, Embedding (cached queries) хадгалах. Масаалаа нэмийх БИШ.

### Pi.mn дээр хийх санал

| Нөлөө | Ажил | Үйлдэл | Үндэслэл |
|---|---|---|---|
| critical | M | Фаза 2 үе: Мөнгөлийн ПБНТ-д нийцүүлэх: сурагчийн асуулт-хариу шифрлэлт (TLS 1.3), PostgreSQL row-level security (RLS), audit log. DeepSeek API ашигла БИШ — on-premise Llama эсвэл өөрийн fine-tuning л. | Уулзварын байгаль: өгөгдлийн нууцлал нь таны хууль ёс, дээрэлтүүлэлт их. ESIS (Education EMIS) интеграци биежүүлэх (гүйцээхгүй). Зөвхөн Pi.mn дотоод сүлжээ дээр, эстер эргүүлээгүй. |
| high | M | Фаза 1 (1–3 сар, $500 бюджет): Llama-3.1-8B Mongolian версийг Unsloth+QLoRA ашиглан 1000 math problem × solution жишээн дээр fine-tune хий | Хүлээмэл үр дүн: 70–80% accuracy (benchmark), learning curve сургалтын төв баг (data collection, prompt engineering), өгөгдлийн хэм үнэлгээ. LoRA adapter $10-20 RAM хадгалах. Шалгалт: Pi.mn-ий 50 сурагчид жүүрэл асуулга. |
| high | M | Фаза 1 үе: Redis + semantic caching сон (GPTCache эсвэл Perceone Redis Vector) нэмийх. Exact match + 0.93 cosine similarity давхаршилахаа болго | Дээшлүүлэлт: сарын өртөг $1800 (API) → $300–400 (fine-tuning + kэш). Хэмжүүлэх: cache hit rate (20–40% анхлын), latency (280ms on-premise vs 500ms API). Семантик кэш эрсдэл: хуурамч сайнаарр буруу хариу — quality check loop шаардлагатай. |
| high | L | Фаза 2 (3–6 сар, $1500 бюджет): vLLM inference сервер (A100 rented 3 месяца) Сөүлийн CDN-н байсан түс. NestJS → FastAPI (Python vLLM) микросервис архитектур | Нэг fine-tuned model нь 50 сурагч × 5 асуулт/өдөр = 250 req/өдөр → vLLM batching 100–200 req/batch → 2–3 batch/цаг. Lатенси ≤ 150ms гэрлүүлэх. Cost: $500/месяц (A100) + $50–100 (bandwidth) = $550/месяц. |
| high | XL | Фаза 2-3 (6–12 месяц, $2000–3000 бюджет): Свежд Llama-3.3-70B эсвэл GPT-MoE fine-tune (бүрэлдэхүүн багшүүдийн feedback дээр). A6000 эсвэл H100 rental. | Дээшлүүлэлт: 70B загвар нь 8B-ээс 15–25% нарийнчилалт сайн (benchmark). Хэмжүүлэх: ШЭШ-ий математикийн асуулга (сүүлийн 3 жилийн нээлттэй сорилуудын дээр fine-test). Өөрийн ЛМ замын дээр сүүлийн үе сургалт. |
| high | M | Дээрэлтүүлэлтийн жорба сүүлүүлэх (A/B test): fine-tuned Llama vs DeepSeek API. Сурагч × суд данс → xүн дээдээ эргүүл ба анализ хий. | Мэдэлгээ: Llama fine-tuning-н эргүүлэлт (байшин дээр ахиж) хоёр хүүгийн энэ утгатай вэ. Benchmarks ба анхны сургалтын үр дүн. Үнэн: Llama 15% доогуур баахаас гаш, гэхдээ latency 200ms агшин. Өрхүүлэлт: сэдэлүүлэлтийн роль (давтамжаа илүүт). |
| medium | S | Санал №1 (нэлээн хямд): DeepSeek V4 Flash API ашиглах ( Semantic caching-аар сүүлүүд цуглуулалт дээр). Pi.mn өгөгдөл гарт, нийлүүлсээн модерэ. | Сарын өртөг: 1800 асуулт × 200 input tokens × $0.14 = $50 (бага). Caching 50% hit → $25. Гэхдээ Монголын ПБНТ эхөлгөч тавьсан: өгөгдлийг китайн серверээр явуулахнь эзэнээ үе сургалт. Эрүүл эргүүлэлтийн журам сааа шаардагддаг. |
| medium | S | Санал №2 (эбээлдэг): Ollama + llama.cpp үйл ажиллагаа (20 сурагчид оффлайн, CPU дээр). Вэб app нь WebAssembly llama.cpp эвхүүлэх (privacy-first). | Таруулах: сирэм GPU БИШИХ. MacBook Pro эсвэл нэг RTX 4090 ганц. Чадвар: 50–100 token/sec (8B). 5–10 сурагч нэгэн үед асуувал ОК, 50+ БИШ. Чанар: offline, төгөлдөр нууцлал (сүүлүүлэх Internet БИШ). Монголын ПБНТ-т илүү сайн. |
| medium | S | Байшинтай Monolithic шалтгааныхӳ ХҮҮХДҮҮЛЭХ (простой эхлэл): NestJS/Next.js дээр Vercel AI SDK (OpenAI Proxy) + Redis semantic cache. Сүүлүүлэх дээр DeepSeek/Gemini toggle. | ОХШөн цагтын хүнээлэл: 2–3 долоо хоног. Өертөг: $50–100/месяц (Vercel Pro + DeepSeek API + Redis). Scalable-ийн сурвалга: хүүхэлнээл santo Фаза 1 сургалтын үргэлжүүлэлт. |

<details><summary>Эх сурвалж (21)</summary>

- [Fine-Tune LLMs with LoRA and QLoRA: 2026 Guide - DEV Community](https://dev.to/jangwook_kim_e31e7291ad98/fine-tune-llms-with-lora-and-qlora-2026-guide-33lf)
- [How to Fine-Tune LLMs in 2026: Costs, GPUs, and Code | Spheron Blog](https://www.spheron.network/blog/how-to-fine-tune-llm-2026/)
- [LLM fine-tuning budget guide: GPU costs, timelines, and what to Spend](https://io.net/blog/llm-fine-tuning-budget-guide-gpu-costs-timelines-and-what-to-spend)
- [Fine-Tuning Infrastructure: LoRA, QLoRA, and PEFT at Scale | Introl Blog](https://introl.com/blog/fine-tuning-infrastructure-lora-qlora-peft-scale-guide-2025)
- [How to Fine-Tune a 7B Model for Three Dollars on One GPU | n1n.ai](https://explore.n1n.ai/blog/fine-tune-7b-model-three-dollars-one-gpu-2026-07-05)
- [Unsloth vs Axolotl vs TRL vs LLaMA-Factory: A Fine-Tuning Framework Comparison - MarkTechPost](https://www.marktechpost.com/2026/07/22/unsloth-vs-axolotl-vs-trl-vs-llama-factory-a-fine-tuning-framework-comparison-on-speed-vram-and-multi-gpu/)
- [Google Colab Alternatives: 8 GPU Clouds Compared (2026) | Spheron Blog](https://www.spheron.network/blog/google-colab-alternatives-8-gpu-clouds-compared-2026/)
- [Best LLM Inference Engines 2026: vLLM vs SGLang vs TGI | DeployBase](https://deploybase.ai/articles/best-llm-inference-engine)
- [vLLM vs llama.cpp: Pick the Right Inference Engine in 30 Minutes [2026]](https://markaicode.com/vs/vllm-vs-llamacpp/)
- [DeepSeek API Pricing July 2026: Models, Cache, Rate Limits | NxCode](https://www.nxcode.io/resources/news/deepseek-api-pricing-complete-guide-2026)
- [LLM API Pricing (July 2026): GPT-5.6 Terra, Claude Sonnet 5 - TLDL](https://www.tldl.io/resources/llm-api-pricing)
- [AI API Pricing Comparison 2026 — Claude, GPT, Gemini, DeepSeek Costs | GitAutoReview](https://gitautoreview.com/tools/llm-pricing)
- [Semantic Caching: a Solution to Exploding LLM Costs | Medium](https://ndeplace.medium.com/semantic-caching-a-solution-to-exploding-llm-costs-d16e7d197795)
- [Semantic Caching for LLM Inference (2026) | Spheron Blog](https://www.spheron.network/blog/semantic-cache-llm-inference-gpu-cloud/)
- [Semantic Caching for LLM Apps: Reduce Costs by 40-80% | Percona](https://www.percona.com/blog/semantic-caching-for-llm-apps-reduce-costs-by-40-80-and-speed-up-by-250x/)
- [Cache LLM Responses with Redis: Cut API Costs 60% | Markaicode](https://markaicode.com/llm-response-caching-redis-cost-reduction/)
- [Dorjzodovsuren/Mongolian_Llama3-v1.1 | Hugging Face](https://huggingface.co/Dorjzodovsuren/Mongolian_Llama3-v1.1)
- [Evaluating Large Language Models in Mongolian | ANLP 2025](https://www.anlp.jp/proceedings/annual_meeting/2025/pdf_dir/Q1-12.pdf)
- [Law on Personal Data Protection - Mongolia (2022) | DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=MN)
- [Scaling AI in Education Systems: Lessons from Mongolia | World Bank](https://blogs.worldbank.org/en/education/scaling-ai-in-education-systems--lessons-from-mongolia)
- [Building Scalable Microservices with NestJS, Prisma & PostgreSQL | Medium](https://medium.com/@nageshadhavbncoe/building-scalable-microservices-with-nestjs-prisma-postgresql-b0c8363e789d)

</details>

---

## ?

*AI-Powered Tutoring Model for Pi.mn: Research-Based Implementation Guide*

### Олдворууд

**19. Средний уровень подсказок (strategic hints) максимизирует обучение; 'bottom-out' подсказки останавливают обучение**

- *Эх сурвалж:* Исследование Aleven & Koedinger (CMU PACT Lab) показано, что полные подсказки работают как отработанные примеры, но снижают когнитивное взаимодействие студента. LAK26 (2025) подтвердил: неправильное использование подсказок отрицательно коррелирует с результатами обучения. Процедурные подсказки > Стратегические подсказки > Полные подсказки по эффективности.
- *Ач холбогдол:* Для Pi.mn: система подсказок должна направлять студентов в Zone of Proximal Development (Vygotsky). При 359 студентах и неправильной системе подсказок вероятно до 25% потери эффективности обучения.

**20. Сократический метод (вопросы вместо ответов) улучшает удержание на 23% и критическое мышление**

- *Эх сурвалж:* Khanmigo (Khan Academy): 23% улучшение удержания концепций на 12 студентах за 8 недель. SocraticLLM (fine-tuned Llama 2): оценка эффективности 7.19 vs ChatGPT 6.40 (p<0.001). Обучено на 110,000 пар вопрос-ответ из r/changemyview. Работает на 7B и 13B параметров локально.
- *Ач холбогдол:* Для ЭЕШ подготовки эффективнее спрашивать 'Что ты знаешь о дроби?' вместо объяснения. Можно fine-tune Llama 2 7B на данных 359 студентов Pi.mn за $50-100.

**21. Показ 2-3 различных методов решения улучшает гибкость на 20-30% и передачу знаний**

- *Эх сурвалж:* Rittle-Johnson & Star (2020): сравнение методов на одной странице эффективнее, чем последовательное изучение. Учащиеся, сравнивавшие стратегии, показали большую гибкость в процедурах и лучше переносили знания на новые задачи. Требует:側-by-side сравнение, явное обсуждение эффективности методов.
- *Ач холбогдол:* Для 6,125 задач Pi.mn: вместо 1 решения показать 2-3 метода (например, алгебраический vs геометрический). УХ улучшение ~15-20%.

**22. Генерировать-Извлекать-Переранжировать (GRR) пайплайн диагностирует ошибочные концепции с высокой точностью**

- *Эх сурвалж:* Исследование EEDI dataset (2025): 3-этапный процесс — LLM генерирует кандидатов неправильных концепций → плотный поиск → кросс-энкодер переранжирует. Протестировано на Claude Sonnet, Llama, Qwen. Выявляет, например: 'студент думает что 3/4 + 1/4 = 4/8' (whole number bias).
- *Ач холбогдол:* Для Pi.mn: критично предотвратить, чтобы неправильная концепция студента не закрепилась. На основе 359×6,125 попыток построить классификатор неправильных ответов.

**23. Монгольский язык имеет низкие ресурсы; требует перевода-обратно и словаря математических терминов**

- *Эх сурвалж:* MM-Eval benchmark (2024): Монгольский поддерживается в оценке LLM, но статус 'low-resource'. Решение: обратный перевод (back-translation) + ручной словарь математических терминов (интеграл=积分→интеграл). Корпус из Reddit r/changemyview переведен на 20+ языков успешно.
- *Ач холбогдол:* Монголоор объяснение — критично. Машинный перевод LaTeX задач может потерять смысл; нужен проверенный словарь ('производная'='уламжлал', 'интеграл'='積分').

**24. Самохостинг Ollama + Qwen 7B или Llama 3.1 8B стоит $0-200/месяц после окупаемости 4-8 месяцев**

- *Эх сурвалж:* Cost breakdown 2025-2026: Ollama (бесплатно) + Qwen 2.5 7B (бесплатно) на RTX 4060 ($300 один раз) или облако spot ($10/месяц за H100). Для <2 млн токенов/день: self-hosted дешевле OpenAI. Crossover: ~35.6М токенов/месяц (экономия 71-97% выше). OpenAI GPT-4o мини: $0.15/1М токенов входа.
- *Ач холбогдол:* $50-300/месяц бюджет Pi.mn позволяет: купить б/у RTX 4060 ($300) и запустить Ollama. Сэкономить $200+/месяц vs API. Локальное хранение данных — приватность 359 студентов.

**25. Предотвращение неправильных ответов (hallucination): правила LaTeX + проверка embedding + fine-tuning на математике**

- *Эх сурвалж:* Стратегии (ASAPP, MIT Sloan 2025): (1) Валидация на основе правил (LaTeX parser, проверка синтаксиса); (2) Embedding-based verification (проверить, похожа ли сгенерированная подсказка на известные подсказки); (3) Fine-tuning на 5,000 вручную проверенных математических примерах. Предупреждение о возможных ошибках AI увеличивает запросы помощи на 40% — психологический эффект прозрачности.
- *Ач холбогдол:* Неправильный ответ от AI = самый большой риск для Pi.mn. Трёхслойная защита (правила→embedding→fine-tuning) требуется перед показом студентам.

**26. Отработанные примеры (worked examples) должны показываться в начале темы, затем постепенно убывать (fading)**

- *Эх сурвалж:* MIT TLL, Edutopia: worked examples эффективны при введении нового материала, снижают когнитивную нагрузку. Но если показывать всегда → зависимость. Лучшая практика: моделирование (watched) → совместное решение (guided) → независимое (faded). Требуется self-explain: почему каждый шаг?
- *Ач холбогдол:* Для Pi.mn: интерактивный режим 'explain-and-solve' с постепенным исчезновением подсказок лучше, чем статические решения в конце. Студент вовлечен в процесс рассуждения.

### Pi.mn дээр хийх санал

| Нөлөө | Ажил | Үйлдэл | Үндэслэл |
|---|---|---|---|
| critical | M | Построить классификатор неправильных концепций (GRR пайплайн) на данных 359×6,125 попыток | Шаг 1: Кластеризация неправильных ответов (embedding + DBSCAN). Шаг 2: LLM генерирует 5 кандидатов концепций, почему ошибка (whole number bias, sign error, order of operations). Шаг 3: кросс-энкодер переранжирует по вероятности. Обучить на EEDI dataset (8,000 примеров, free). Внедрить в post-attempt |
| critical | S | Развернуть Ollama + Qwen 2.5 7B или Llama 3.1 8B на NestJS backend (самохостинг) | Оборудование: куплю б/у RTX 4060 ($300, один раз) или арендовать E2 GPU на GCP ($10-20/месяц). Onnery Ollama на localhost:11434. NestJS микросервис на отдельном порту. Нет внешних вызовов OpenAI API — всё локально. Скорость: ~50 токенов/сек на Qwen 7B (достаточно для real-time). Стоимость: $0/месяц  |
| critical | M | Реализовать трёхслойную защиту от неправильных ответов (safety layer) | Слой 1: LaTeX парсер валидирует математический синтаксис (собственный парсер или regex). Слой 2: Embedding-based проверка (сравнить сгенерированный ответ с известными правильными ответами из Attempt DB; cosine similarity >0.85 → OK). Слой 3: Fine-tune Qwen 7B на 5,000 вручную проверенных задач Pi.mn |
| high | M | Реализовать трёхуровневую систему подсказок на основе Zone of Proximal Development (ZPD Vygotsky) | Уровень 1 (Процедурный): 'Какой первый шаг?' Уровень 2 (Стратегический): 'Почему мы используем эту формулу?' Уровень 3 (Bottom-out): полный ответ только после 2х неправильных попыток. Привязать к времени: если >5 минут — Level 2; >15 минут — Level 3. На основе LAK26 исследований: mid-level hints мак |
| high | L | Развернуть модуль Сократических вопросов: fine-tune Llama 2 7B на диалогах 359 студентов Pi.mn | Использовать fine-tuning QLoRA (4-bit quantization) на RTX 4060 в течение 4-6 часов. Обучающие данные: существующие диалоги студент-учитель из Pi.mn (если есть) + 5,000 синтетических Q&A из EEDI dataset. Развернуть на Ollama локально. Ожидаемый результат: 23% улучшение удержания концепций (как Khanm |
| high | M | Добавить view 'Сравнить методы' к 1,000 самых частых задач: показать 2-3 различных решения рядом | Извлечение из 6,125 LaTeX задач: для задач с correctRate <60% найти 2-3 различных методов (алгебраический, геометрический, численный). Расположить side-by-side с явным пояснением 'Метод 1 быстрее на сложных числах; Метод 2 легче понять'. Ожидаемый результат: процедурная гибкость +20-30%, перенос зна |
| high | M | Монголизировать: построить словарь математических терминов (50-100 терминов) + протестировать перевод LaTeX на кириллицу | Перевести 200 задач вручную и проверить качество. Пример: 'Производная'='Уламжлал' (не 'үүсмэл' которая неправильно). 'Интеграл'='積分' или 'интеграл'? Использовать back-translation (монгольский→английский→монгольский) для контроля качества. После проверки создать файл terminology.json для AI модели.  |
| medium | M | Внедрить fading worked examples: управлять видимостью шагов решения по прогрессу студента | При первом посещении темы: показать все 5 шагов с объяснениями (watched example). После 3 правильных ответов: скрыть шаг 3-4 (guided). После 10 правильных: показать только ответ (fading). Требует самообъяснение (prompting 'Объясни почему?'). Для 359 студентов: А/Б тест — группе 1: обычные решения, г |

<details><summary>Эх сурвалж (18)</summary>

- https://dl.acm.org/doi/10.1145/3785022.3785040
- https://www.cs.cmu.edu/~tom/pubs/Learning_to_Compare_Hints_2024.pdf
- https://arxiv.org/pdf/2603.07311
- https://arxiv.org/html/2409.05511v1
- https://arxiv.org/pdf/2504.04717
- https://www.kidsaitools.com/en/articles/khanmigo-review-2026
- https://arxiv.org/pdf/2606.09887
- https://cdn.vanderbilt.edu/t2-my/my-prd/wp-content/uploads/sites/3147/2020/01/Comparison_ZDM_1-31-17_NoFieldCodes.pdf
- https://arxiv.org/pdf/2605.23925
- https://arxiv.org/html/2602.02414v1
- https://arxiv.org/html/2411.09492v1
- https://github.com/tugstugi/mongolian-nlp
- https://www.premai.io/blog/self-hosted-llm-guide-setup-tools-cost-comparison-2026/
- https://arxiv.org/pdf/2412.05282
- https://arxiv.org/html/2606.03822
- https://arxiv.org/pdf/2103.03874
- https://tll.mit.edu/teaching-resources/how-people-learn/worked-examples/
- https://files.eric.ed.gov/fulltext/EJ1110545.pdf

</details>

---

## ?

*Pi.mn: 6125 бодлогоос LLM fine-tuning сургалтын өгөгдөл үүсгэх — баримтлал, форматжүүлэлт, өртөг*

### Олдворууд

**27. Чанар >> Тоо: 1000 сонгосон жишээ 52,000 LLM-үүсгэсэн жишээнээс дээр**

- *Эх сурвалж:* LIMA paper (2023): 1000 instruction pair (Stack Exchange + wikiHow) > Alpaca 52K samples. 2x өгөгдөл = адил үр дүн. LoRA судалгаа: 1000 vs 10,000 жишээ = 1000-ын ашиг 10,000 нэмэх ашиг их.
- *Ач холбогдол:* Pi.mn-ийн 6125 бодлого ХАНГАЛТТАЙ. Чанарт анхаара - ЭЕШ-д найдаж байгаа бодлого + chain-of-thought шийдэл = instruction tuning-д хүргүүлэнэ.

**28. Chain-of-Thought (CoT) математикийн fine-tuning-д ЗААВАЛ**

- *Эх сурвалж:* Phi-1 (Microsoft): textbook-quality өгөгдлээр 1.3B загвар гүцэтгэнэ. MathInstruct, GSM8K, MATH benchmarks: алхам-алхмаас шийдэл гарч болно. CoT утгалгүйгээр = 30-50% алдаа.
- *Ач холбогдол:* Pi.mn-ийн instruction туиндг бүхэлд нь CoT форматтай байлгахаас хэрэгтэй - 'Let's think step by step' → шийдэл солих.

**29. Synthetic data → Model collapse эрсдэл (0.1% синтетик ч хүргүүлж болно)**

- *Эх сурвалж:* 2024 судалгаа: Iterative retraining on synthetic-only data = rare events disappear, model behavior narrows. Шийдэл: Real:Synthetic = 80:20 саль, оригинал snapshot хадгалах.
- *Ач холбогдол:* Pi.mn-ийн augmentation (3x хувилбар) синтетик байхад original бодлого 80% байлгахаас. Auto-generated CoT нь 20% орамдлаш.

**30. Error analysis (буруу хариу) → сургалтын үе үлгэрт 30-40% үр дүн сайн**

- *Эх сурвалж:* Образ сургалтын судалгаа: ошибочные решения + коррекция → сурагч 30-40% сайн сургалт авна. Mistake types: үл анхааралтай тооцоо, үл ойлгосон ухагдахуун, аргын алдаа.
- *Ач холбогдол:* Pi.mn-ийн Attempt өгөгдөл (correctRate < 50%) → 200-300 error data самуугар сургалтын 10-20% = bagging баталгаажуулалт.

**31. Лиценз: Монголын 2021 Copyright Law - сургалтын төвийн бодлого эзэмлэл эрх, fine-tuning нь ши контекст**

- *Эх сурвалж:* WIPO (Mongolia): Авторын эрх registration (заавал БИШ) - Intellectual Property Office. Nomноос авсан бодлого = номын эзэмлэл эрх. Synthetic data = нэмэл эрх хэрэгтэй.
- *Ач холбогдол:* Pi.mn-ийн бодлогоны эх сурвалж тодох (сургалтын төв өмнө эсвэл ном?) → гэрэг авахаас хэрэгтэй юуа баталгаажуулах.

**32. LoRA fine-tuning $20-40 өртөгтэй, full tuning $200-500 → LoRA идэвхтэй Pi.mn-д**

- *Эх сурвалж:* 2026 pricing: A100 $10/h (2-4h LoRA = $20-40), RTX 4090 $2/h (LoRA = $4-8). Spheron: $3-10 per 8B LoRA. Full tuning: 8-20h ($80-200). QLoRA: $15-30 (70B).
- *Ач холбогдол:* Pi.mn бюджет $50-300/сар → LoRA (Spheron $10 × 3) үр дүн чухал. Axolotl (open source) үнэ төлөлтгүй, Ollama local CoT үүсгэлт үнэ төлөлтгүй.

**33. Instruction tuning формат: JSONL - {instruction, input, output, metadata}. Mathematical: chain-of-thought шийдэл хэрэгтэй.**

- *Эх сурвалж:* Hugging Face standard: JSONL line-by-line format. KIT-19, MathInstruct: problem + step-by-step solution + answer. Dataset size: GSM8K (8.5K), MATH (12.5K) - Pi.mn-ээр хүргүүлэн өргөнхөй.
- *Ач холбогдол:* Pi.mn-ийн database → JSONL export, LaTeX image handling, correct_answer + chapter_tag - backend integrated pipeline.

**34. Knowledge distillation: 1000 sample > full training on 10K. Жижиг загвар том загвараас chain-of-thought learning хүлээн авна.**

- *Эх сурвалж:* Distilling Step-by-Step: 770M student > 540B PaLM (few-shot). MCC-KD: multi-CoT consistent distillation. Teacher-student framework saves GPU.
- *Ач холбогдол:* Pi.mn: Mistral-7B LoRA (жижиг, хурдан) > GPT-4 batch (том, удаан). Local Ollama + Claude/GPT batch gen CoT = cost efficient.

**35. Örgöögдлийн нэмэгдүүлэлт (augmentation): тоо солих, нөхцөл өгүүлбэ өөрчлөх САЙН, concept transformation ЭРСДЭЛТЭЙ**

- *Эх сурвалж:* Best practices: 3x variations (numbers, conditions) work. Concept replacement = model learns shortcuts, not reasoning. Real:Synthetic=80:20 хүрээллэл.
- *Ач холбогдол:* Pi.mn: 6125 × 3 = 18,375 pairs хүргүүлэхэд real бодлогоны 80% (4900), synthetic 20% (3675) нийлүүлэх. Augmentation = parameter count × 3.

### Pi.mn дээр хийх санал

| Нөлөө | Ажил | Үйлдэл | Үндэслэл |
|---|---|---|---|
| critical | M | VI үе: LoRA fine-tuning Mistral-7B (Spheron $10 × 3 эсвэл local GPU) — 2-4 цаг, ≈20-40 минут шалгалт | LoRA хэнээр үр дүн (1000-5000 жишээ хангалттай). Spheron $3-10/run < $200-500 full tuning. Mistral > Llama (ЭЕШ domain-ын хувьд). |
| critical | L | VII үе: Inference server (NestJS backend + vLLM эсвэл Ollama) — сурагчдын API endpoint | Pi.mn вэб (NestJS + Prisma) → LLM API integrate. Ollama local (үнэ төлөлтгүй), Hugging Face Pro ($50/сар) эсвэл Spheron API. |
| critical | S | Лиценз асуудлын авч үзэлт: Pi.mn-ийн сургалтын төвөөс гэрэг авах, бодлогоны эх сурвалж тодоор зас | Монголын Copyright Law 2021: автор эрх эзэмлэл + synthetic data = нэмэл эрх. Fine-tuning = commercial use (заавал гэрэг). |
| high | M | I үе: 100 бодлогоны гараар chain-of-thought шийдэл бичүүлэх (bagsh эсвэл engineer) — контроль баталгаажуулалт | LIMA/Phi-1 баримтлал: хүний сонгосон 1000 жишээ > auto-gen 52K. Эхний 100 CoT = үнэлгээний шалгах, template үүсгэлт. |
| high | L | II үе: 5000+ бодлогоны auto-CoT үүсгэлт (Claude API эсвэл local Ollama) + 10% human QA | Cost efficient: Ollama local (үнэ төлөлтгүй) эсвэл Claude API $0.50-1.00/1000 tokens (1000 CoT ≈ $0.50-1). QA pass = 20-30 цаг. |
| high | S | V үе: JSONL форматжүүлэлт — Hugging Face standard (instruction, input, output, correct_answer, chapter, difficulty) | Axolotl (open source) input format. Database → JSONL export pipeline автоматжуулахаас хэрэгтэй. |
| high | L | VIII үе: A/B туршалт - 50-100 сурагч × 10 шалгалтын бодлого — accuracy, speed, error analysis feedback | Баталгаажуулалт: Pi.mn-ийн 359 сурагч → sampling 50-100 (14-28%) → 10 бодлого (5-10 минут) = 1-3 цаг per student. |
| medium | M | III үе: 6125 × 3 huvulbар = 18,375 instruction pairs (tooны өөрчлөлт, nөхцөлийн өгүүлбэ) | Augmentation эрсдэл авсан: real бодлого хадгалах 80% (4900), synthetic 20% (3675). Model collapse satiation. |
| medium | M | IV үе: Error data сонгох — Attempt (correctRate < 30%) дээр 200-300 буруу хариу, category classification + LLM explanation | Error analysis: 30-40% сургалтын ашиг. Attempt өгөгдөл бий → автоматжуулж болно. 10-15 мин batch processing. |
| medium | M | IX үе: Feedback loop — 10-20 ритэрийн дахин сургалт (error pattern analysis) — автоматик үйлчилгээ | Continuous improvement: student mistakes → model retraining every 2-4 сар. LoRA retraining $10-30 per cycle. |

<details><summary>Эх сурвалж (20)</summary>

- [LIMA: Less Is More for Alignment](https://arxiv.org/abs/2305.11206) — Zhou, Liu, Xu (2023) | NeurIPS 2023
- [Textbooks Are All You Need](https://arxiv.org/abs/2306.11644) — Gunasekar et al. (Microsoft Research, 2023) | Phi-1 paper
- [Textbooks Are All You Need II: phi-1.5 technical report](https://arxiv.org/abs/2309.05463) — Li, Bubeck et al. (2023)
- [LoRA: Low-Rank Adaptation](https://arxiv.org/abs/2106.09685) — Hu et al. (2021) | Key baseline
- [Dataset Size Recovery from LoRA Weights](https://arxiv.org/abs/2406.19395) — 1000 vs 10000 empirical study (2024)
- [How Much Data Do You Need to Fine-Tune an LLM in 2026?](https://particula.tech/blog/how-much-data-fine-tune-llm) — Particula (2024)
- [Escaping Model Collapse via Synthetic Data Verification](https://arxiv.org/abs/2510.16657) — Model collapse risk mitigation (2024)
- [Dual Instruction Tuning for Mathematical Reasoning](https://arxiv.org/abs/2403.18295) — Mathematical CoT best practices (2024)
- [DeepSeekMath: Pushing the Limits of Mathematical Reasoning](https://arxiv.org/abs/2402.03300) — Math-specific instruction tuning (2024)
- [Teaching and Learning Mathematics Through Error Analysis](https://www.researchgate.net/publication/322815547_Teaching_and_learning_mathematics_through_error_analysis) — Pedagogical foundation
- [AI-Driven Virtual Teacher for Enhanced Educational Efficiency](https://arxiv.org/abs/2409.09403) — Error analysis + LLM (2024)
- [Law of Mongolia on Copyright and Related Rights (2021)](https://www.wipo.int/en/web/traditional-knowledge/w/tklaws/article_0130) — WIPO official | Монгол зохиогчийн эрх
- [Intellectual Property Office of Mongolia](https://www.ipom.gov.mn/en.php?page=136) — Official registry
- [Axolotl · Hugging Face](https://huggingface.co/docs/transformers/en/community_integrations/axolotl) — Open source framework (Apache-2.0)
- [Fine-Tuning LLMs in 2026: Costs, GPUs, and Code](https://www.spheron.network/blog/how-to-fine-tune-llm-2026/) — Spheron pricing (2026)
- [LoRA Fine-Tuning Cost Analysis 2026](https://www.stratagem-systems.com/blog/lora-fine-tuning-cost-analysis-2026) — GPU pricing
- [Distilling Step-by-Step](https://arxiv.org/abs/2305.02301) — Knowledge distillation for CoT (Hsieh et al., 2023)
- [Pay for Hints, Not Answers: LLM Shepherding](https://arxiv.org/abs/2601.22132) — Distillation efficiency (2025)
- [JSONL Explained: The Line-by-Line Format](https://dev.to/pioneer10/jsonl-explained-the-line-by-line-format-powering-ai-datasets-3op6) — Data format standard
- [LLM Fine-Tuning Pricing 2026 — Compare Training Costs](https://pricepertoken.com/fine-tuning) — Cost comparison tool

</details>

---

## ?

*Pi.mn сургалтын төв — зургаас математик уншилт (OCR-to-LaTeX): нээлттэй ба худалдааны шийдлүүдийн иж бүрэн судалгаа*

### Олдворууд

**36. Nougat (Meta) — pinakamahusay na нээлттэй математик OCR**

- *Эх сурвалж:* BLEU 91%, тэгшитгэл 75%, Vision Transformer архитектур, Apache-2.0 лиценз, арилжааны хэрэглээ зөвшөөрнө. 6125 бодлогын хувьд GPU дээр batch хөрвүүлэлт боломжтой (~2-4 цаг A100 дээр)
- *Ач холбогдол:* Pi.mn-ийн төсвийн хязгаар ($50-300/сар)-ийн дотор ҮНЭГҮЙ эсвэл өөрийн GPU ашигла. Mathpix ($0.005/page) биш 6125 × $0.005 = $30-д хэмжээгүй

**37. Qwen2-VL — хамгийн найдвартай Vision-Language загвар математикт**

- *Эх сурвалж:* MathVista benchmark 70.5%, арилжааны хэрэглээ зөвшөөрнө, 2B/7B хувилбар байдаг. Pi.mn сервер дээр баригдаж, сурагчийн зургыг шууд уншиж болно. InternVL3.5 нь ойролцоо нарийвчлал (MathVista-д хамт үнэлэгддэг)
- *Ач холбогдол:* Gар утсаар зураасан бодлого → Vision-Language загвар (API утаа, клиент-сервер нь сайн). Nougat-аас илүү нарийн, лаг багатай

**38. Гар бичмэл математик — эцсийн эргүүлэлтийн цэг. GPT-4 нь Mathpix-ээс сайн (2025)**

- *Эх сурвалж:* Google 2025-ийн судалгаа: GPT-4.1-mini 88% transcription accuracy vs Mathpix-ийн хэвэлэлтийн асуудал. Монгол хэл болон нарийн тэмдэглэгээ эрсдэлтэй. MathWriting dataset-д 230k онлайн + 400k synthetic сорилт байгаа боловч Монгол дутаа
- *Ач холбогдол:* Сурагч буруу хариу авахаас сэргийлэхийн тулд HUMAN-IN-THE-LOOP баталгаажуулалт заавал. 5-10% дахин нягт шалгалт хэрэгтэй. OCR→LaTeX автомат гэсэн хүлээлтээс СЭРГИЛНЭ

**39. 6125 бодлогын хувьд өртгийн хамгийн бага шийдэл**

- *Эх сурвалж:* Surya (Meta, deprecated but works) + self-host = $0. GOT-OCR2.0 (580M param, CDM 86.6-86.8%, MIT) + local GPU = $0. Mathpix API: 6125 × $0.005 = $30 нэг удаа. Google Vision: 6125 × $0.0015 = $9.19. ГЭХДЭЭ гар бичмэл → $0.002/image = $12.25
- *Ач холбогдол:* Pi.mn-ий сар 3-5 доллар нэмэлт өртөг сайн. Mathpix нь төсвийн сонголт (оффлайн сервер нь GPU цаг юм), гэхдээ Nougat/Surya эзэнд үнэгүй

**40. Зураг хадгалах сан — Render disk утах асуудлыг шийднэ**

- *Эх сурвалж:* Cloudflare R2: $0.015/GB/month ($0 egress). Backblaze B2: $0.007/GB/month (3× stored vol egress). 6125 × 0.3MB ≈ 1.8GB. R2-д 1 жил $0.27, 3 жилд $0.81. Render disk $0.25/GB/month ($60/жил 1.8GB нь үнэтэй). Монголоос хандах хурд: Cloudflare (эхлүүлэх үйлчилгээ), B2 (ISO түүн дэлхийн өндөр хүн ам)
- *Ач холбогдол:* Pi.mn-ий STATUS.md §8: redeploy бүрт зураг устдаг. R2 буюу B2 ашиглавал $0.27-3/жилд асуудал шийдэгдэнэ. Render disk ($60/жил) хэцүү

**41. Mathpix vs нээлттэй эх: цэвэр худалдаа-за яагаа сонгох**

- *Эх сурвалж:* Mathpix: $0.005/page (6125 = $30 нэг удаа), гар бичмэл дэмждэг, баттай. Nougat/Surya: нээлттэй, $0 (GPU зөрүүтэй), 75-86% томьёа, мөн гар бичмэл дэмждэг. Qwen2-VL: API товруулж болно ($?), эсвэл self-host
- *Ач холбогдол:* Хэрэв эзэн $30 төсвийн дотор хүлээх чадалтай: Mathpix. Үйлчилгээ үүсгэхийг хүсвэл: Surya + human-in-the-loop. Монгол хэл дэмжих: Google Vision + GPT-4 (дахь үнэтэй)

**42. Молоо хэл, Монголын сургалтын төвийн онцлог**

- *Эх сурвалж:* Нэр томьёо (интеграл, үүсмэл, матриц), кирилл бичиг, сонгох тестийн шифр. Нээлттэй ба худалдааны аль ч загвар үнэндээ Монголд туршилтгүй. Анголис гартай зураг (~10-20% Pi.mn-ийн 6125) бэлэг амаргүй
- *Ач холбогдол:* Human-in-the-loop хэмжээг өндөрлүүлэхэд шаардлага (20% дахин шалгалт). Первый proof-of-concept: Surya + GPT-4 on a subset (50-100 задач), дараа нь scale

**43. Gар утсаар сурагч бодлого зурах ирээдүйн хэрэгжүүлэлт**

- *Эх сурвалж:* Vision-Language загвар (Qwen2-VL, MiniCPM-V) серверийн API-д баригдаж болно. HTTP POST хүсэлтээс зургыг LaTeX болгож хөрвүүлэх ~200-500мс. Photomath/QANDA маягийн UX боломжтой. ГЭХДЭЭ человек баталгаажуулалт хэрэгтэй буюу өндөр нарийвчлалтай нь $$ зарцаа
- *Ач холбогдол:* Pi.mn сурагчийн ирээдүйн сонирхлыг маацаахын өмнө, одоо байгаа 6125 бодлогойг LaTeX болгож турших. 6 сараас 1 жилд үйлчилгээ гараа (proof-of-concept), дараа нь мобайл App

### Pi.mn дээр хийх санал

| Нөлөө | Ажил | Үйлдэл | Үндэслэл |
|---|---|---|---|
| critical | S | Зураг сан (Cloudflare R2 буюу Backblaze B2) үнэмлэхүүлэх | Pi.mn-д хуудас disks нь persist хийгддэггүй. R2 ($0.015/GB/mo, $0 egress) буюу B2 ($0.007/GB/mo) ашиглавал 6125 × 0.3MB = 1.8GB × 12 months = $3-5/жилд шийдэгдэнэ. Render persistent disk нь үнэтэй |
| critical | M | Human-in-the-loop баталгаажуулалтын урсгал (QA process) гараа | OCR → LaTeX: 5-10% дахин шалгалт (багш/ЭХ эзэн). Монгол математикийн нэр томьёо болон гар бичмэл оррдиналь. Сорилтыг тавьдаг: шалгахад хэр их цаг, хүн юу хайж байна |
| high | M | Nougat (Meta) буюу Surya ашиглан 6125 бодлогын 10%-г (612) тестийн batch хөрвүүлэх | Нээлттэй эх, $0 OCR, гар бичмэл дэмждэг. Ирээдүйн сорилтуудыг олж мэдэх (формула нарийвчлал, Монгол нэр томьёо, сонгох жагсаалт). Машин ба человек баталгаажуулалтын урсгалыг турших |
| high | M | Google Vision OCR + GPT-4 pipeline үүсгэх (10% дээжийн хувьд) | Google Vision $0.0015/image (612 × $0.001 = $0.92), шарч алдсаннаас GPT-4 vision-capable уншиж болно. Гар бичмэл Монгол математик сайтар дэмжнэ. Mathpix альтернатив нь үнэлэхэд |
| high | S | 6125 бодлогын 1%-ийг (61) manual transcribe шалгах | Аль загвар ба pipeline хамгийн сайн? Оцінка-benchmarking. BLEU / edit distance metrics. Монгол хэл онцлог (нэр томьёо гадаа сарвалты гэхэд гашуут бүтээхэд) |
| high | XL | Мобайл app дизайн (1-2 сараас): сурагч → зураг → LaTeX → хариу шалгалт | QANDA/Photomath маягийн хэрэгжүүлэлт. Qwen2-VL API endpoint, R2 зургийн сан, человек баталгаажуулалтын хүрээ. Түүх гарга: 6 сараас 1 жилд |
| medium | L | Qwen2-VL (2B/7B) сервер дээ баригдах, мобайл API endpoint үүсгэх | Сурагчийн зургаас LaTeX өрчүүлэх урсгал (100-500мс). Vision-Language сайтар төвлөрүүлсэн (Nougat-аас өндөр нарийвчлал). Ирээдүйн App хөгжүүлэлтийн үндэс |
| medium | S | Mathpix API үнэлэхэд: 612 бодлогын (1 батч) $3-4 зарцуулаж туршить | Эзнийг $30 (6125 бүгд) өмнө итгээхэд Mathpix ашиглаж туршах. Нээлттэй эх vs худалдаа үйлчилгээ урьдчилсан орлуулалт |
| medium | S | Лиценз болон шилжүүлэлтийн хуулиуд (legal review) | Nougat (Apache-2.0), Surya (MIT), GOT-OCR2.0 (MIT) — бүгд арилжааны хэрэглээнд зөвшөөрнө. Google Vision, Azure — Microsoft/Google ToS. Mathpix — худалдаа үйлчилгээ |

<details><summary>Эх сурвалж (24)</summary>

- [Nougat Model Overview](https://the-decoder.com/nougat-metas-latest-ai-model-makes-scientific-pdfs-machine-readable/)
- [Nougat: Neural Optical Understanding for Academic Documents (OpenReview)](https://openreview.net/forum?id=fUtxNAKpdV)
- [LaTeX-OCR: Converting Math to Code with AI](https://medium.com/@BaconOreoMilkshake/latex-ocr-converting-handwritten-math-to-code-with-ai-89e7c553429b)
- [pix2tex GitHub - LaTeX OCR](https://github.com/EnriqueTMT/LaTeX-OCR-Testing)
- [Mathpix Convert API Pricing](https://mathpix.com/pricing/api)
- [TrOCR vs Surya Comparison](https://roboflow.com/compare/surya-vs-trocr)
- [Texify GitHub & Marker Pipeline](https://github.com/VikParuchuri/texify)
- [Open-Source PDF Parsing Tools Evaluation](https://www.eulerai.au/blog/doc-parser-benchmark)
- [Qwen2-VL: Enhancing Vision-Language Model's Perception](https://arxiv.org/pdf/2409.12191)
- [Qwen2-VL on Hugging Face](https://huggingface.co/Qwen/Qwen2-VL-2B-Instruct)
- [InternVL3.5: Advancing Open-Source Multimodal Models](https://arxiv.org/pdf/2508.18265)
- [MathCoder-VL: Bridging Vision and Code for Mathematical Reasoning](https://arxiv.org/pdf/2505.10557)
- [Evaluating AI Grading on Real-World Handwritten College Mathematics](https://arxiv.org/pdf/2603.00895)
- [Evaluating GPT-4 at Grading Handwritten Solutions in Math Exams](https://arxiv.org/html/2411.05231v1)
- [Automated Grading of Handwritten Mathematics Using Vision-Capable LLMs](https://arxiv.org/pdf/2605.19043)
- [GOT-OCR2.0: A 580M-Parameter Model](https://open-ocr.com/blog/got-ocr-2-unified-ocr-model)
- [Google Cloud Vision OCR Pricing 2026](https://sparkco.ai/blog/optimize-google-cloud-vision-ocr-pricing-for-enterprises-in-2025)
- [Azure Document Intelligence Pricing](https://docuocr.com/blog/azure-document-intelligence-pricing-2026)
- [Cloudflare R2 vs S3 vs Backblaze B2 Pricing 2026](https://tech-insider.org/cloudflare-r2-vs-s3-vs-backblaze-b2-2026/)
- [Render Persistent Disks Documentation](https://render.com/docs/disks)
- [I Was Paying $10/Month Just for Math OCR](https://dev.to/tex64/i-was-paying-10month-just-for-math-ocr-heres-what-i-use-instead-2lc0)
- [Molmo and PixMo: Open Weights and Open Data](https://arxiv.org/html/2409.17146v2)
- [MathWriting: A Dataset For Handwritten Mathematical Expression Recognition](https://openreview.net/forum?id=bxwWikAXSy)
- [Recognizing Handwritten Mathematical Expressions as LaTeX](https://arxiv.org/pdf/2003.00817)

</details>

---

## ?

*Pi.mn ҮНЭГҮЙ/НЭЭЛТТЭЙ AI БҮРЭН ЗУРАГЛАЛ — Математикийн сургалтын платформ*

### Олдворууд

**44. Qwen 2.5/3 (Apache-2.0) нь Pi.mn-ийн хамгийн сайн үндсэн загвар**

- *Эх сурвалж:* Qwen-3 нь 100+ хэл дэмжинэ, үүнд Traditional Mongolian. MM-Eval benchmark судалгаа Qwen-3 (4B, 30B) нь Mongolian translation-д state-of-the-art оноо өнгөрүүлсэн. Apache-2.0 лиценз = арилжааны хэрэглээ бүрэн зөвшөөрөгдөх, 700М хүнтэй Llama-ын шагналд нөлөөлөхгүй.
- *Ач холбогдол:* Pi.mn-ийн 359 сурагчийн Монгол хэлээр сурах нөхцөл. Mistral-7B нь Монголын хэл АЛДАА, Llama-3.1 нь неб дүнд. Qwen-3 нь ТҮҮВРИЙН ХЭЛИЙН ЧАНАР + НЭЭЛТТЭЙ ЭХ лиценз идэвхтэй хослол.

**45. Self-hosted Qwen/Mistral + free API (Cerebras) гибридн нь бюджет-ижил шийдэл**

- *Эх сурвалж:* CPU-only 16GB VPS (Ulaanbaatar) = $8–12/сар. Mistral-7B Q4 = 4GB VRAM. 12–18 токен/сек (хүнтэй). Cerebras API = 1M токен/day үнэгүй = 359 сурагчийн ≈36–180K токен/day хүрэлцэнэ. Groq (1K RPD) = БАГА. Hybrid: Cerebras үндсэн + self-hosted standby бүтэцээр $10–15/сар.
- *Ач холбогдол:* Pi.mn-ийн $50–300/сар төсөв. $15/сар = 1% төсөвийн доогуур, өндөр ажилтай. Google Gemini (1,500 req/day) байна ГЭХДЭЭ 2025 онд 50% устгасан. Free tier апи = ямар ч цогцтой мөчүүд БАЙНА. Self-hosted = эзэн хяналт, төлбөргүй.

**46. Answer validation (баталгаажуулалт) = LLM-аас 3 их нөлөөтэй эрсдэл**

- *Эх сурвалж:* LLM буруу математикийн хариуг авч магадшлалтай (hallucination). Pi.mn сурагчи буруу ответыг ИТГЭЛ, сурлага аюулгүй. Арав эс: (1) Symbolic check (regex/SymPy) = 90% үнэлгээ, (2) LLM-as-judge (DeepSeek-R1 reasoning) = 10%, (3) Teacher human review = 99%+. Hybrid validation chain → 95–98% accuracy.
- *Ач холбогдол:* ҮНДСЭН АСУУЛГА: Pi.mn-ийн ЭЧ ҮЙЛЧИЛГЭЭНИЙ ҮНЭ = ЗӨВӨӨ ХАРИУУ ӨГӨХ. Сурагчийн буруу хариуг нөхцөлгүйгээр өгвөл сургалтын үр дүн АЛДАА. Symbolic validation (SymPy = үнэгүй Python library) + self-hosted LLM-judge → 95% accuracy хүрэх арга.

**47. DeepSeek-R1 (MIT лиценз) = reasoning-ед дээд чанарын, гэхдээ Монголын хэлээ ДЭМЖХЭГҮЙ**

- *Эх сурвалж:* DeepSeek-R1-Distill-8B нь step-level reasoning математикийн бодлогонд өндөр үнэлгээтэй (CoT ажилтай). MIT лиценз = арилжааны full deployment зөвшөөрөгдөх. ГЭХДЭЭ Монгол хэлээ дэмжээд БИШ (training data дээр Монгол цөөтэй). Орчуулалтын гадал: Монгол → Англи → LLM → Англи → Монгол (Google Translate API үнэгүй) = ~5–10% утга сүлийн гажилт.
- *Ач холбогдол:* DeepSeek-R1-г LLM-judge-ийн адил ашигла (answer validation-д), ГЭХДЭЭ үндсэн instruction дүүлүүлж болохгүй. Монголын хэл хүрэл сонгоён Qwen-3. DeepSeek-R1 нь Cerebras API дээр үнэгүй ашиглаж болно (inference).

**48. pgvector (PostgreSQL extension, Apache-2.0) = байхдаа байх вектор хайлт, 0$ нэмэх өртөг**

- *Эх сурвалж:* Pi.mn-д PostgreSQL аль хэдийн БАЙНА (Prisma ORM). pgvector extension = үнэгүй PostgreSQL нэмэл (Apache-2.0). sentence-transformers (MIT лиценз) all-MiniLM-L6-v2 = 22MB модель, 384D embedding, CPU дээр 15–30 документ/сек index. HNSW индекс = semantic search аксельте.
- *Ач холбогдол:* Embedding cost = $0. Vector DB (Qdrant, Chroma) = нэмэх өртөг +複雑 deployment. pgvector = Postgres дотроо ажилтай, Pi.mn-ийн байхдаа ORM + query engine ашиглаж болно. Бодлого-ийн санамсар хайлт (similarity), сурагчийн ясуулга санамсаршүүлэх = үнээ нь үнэгүй.

**49. Free tier AI API (Groq, Cerebras, Google Gemini) = быстрый өнгөрсөн (эрсдэл ӨНДӨР)**

- *Эх сурвалж:* Groq: 30 RPM, 1K RPD = 359 сурагчийн 2 асуулга/день → НӨХЦӨЛГҮЙ БА. Cerebras: 1M токен/day = хүрэлцэнэ. Google Gemini: 1.5K req/day үнэгүй = ГЭХДЭЭ 2025 оны сүүл эхлүүлээд 50% эхэлнэ, дахин эхлүүл магадшлалтай. OpenRouter = үнэгүй модель = qpm rate limit.
- *Ач холбогдол:* Free tier API-г PRIMARY гаа БОЛОХГҮЙ. Cerebras-ийн combo (1M/day) + self-hosted fallback = ТОГТВОРТОЙ. Groq-г secondary real-time response дээр ашигла (хэрэв rate limit хүрээ дотро). Google Gemini = backup only, эрсдэл өндөр.

**50. Llama 3.1-ийн Meta Community License = 700М хүнтэй дээр хязгаар, Pi.mn (~359) = FINE, ГЭХДЭЭ Qwen-3 лучше**

- *Эх сурвалж:* Meta Llama 3.1: 'Community License' = non-OSI-approved, арилжааны АШИГЛАЛГА зөвшөөрөгдөх, ГЭХДЭЭ 700М monthly active users хөршүүлэхээ Meta-д хүсэлт. Pi.mn = 359 сурагч = амархан хүрээ. Apache-2.0 (Mistral, Qwen) = цэвэр, ямар ч цахилгаан юу.
- *Ач холбогдол:* Llama-г сонгохын үүнээ хүлээч-хаа БОЛОХГҮЙ ЮҮМС. Mistral/Qwen = лицензийн аюулгүй. Llama-ийн reasoning (R1 series) байна ГЭХДЭЭ дүүлүүлээс DeepSeek-R1 > Llama-3.1.

**51. Validation pipeline (symbolic + LLM + human) = 95–98% accuracy хүрэхийн үндэслэл**

- *Эх сурвалж:* Symbolic (SymPy, regex): 90% шилжүүлэх (эхлүүлэл цифр, нэгж, үндсэн arithmetic). LLM-judge (DeepSeek-R1): 10% сүүлүүшсэн (step-level reasoning). Human teacher: final approval. Arize AI + DeepEval (free/open) = evaluation framework. Promptfoo (open-source) = LLM testing.
- *Ач холбогдол:* Яаж сурагчийн ответ БАТАЛГААЖУУЛАХ вэ? LLM-only = АЛДАА. Symbolic = олон төрлийн ответ эвлүүлэхгүй. Hybrid chain = practical accuracy 95%+ хүрэх, пираа бүрэлдүүлэхгүй.

**52. Монголын хэлний translation pipeline (Google Translate API үнэгүй + quota) = практик шийдэл**

- *Эх сурвалж:* Google Translate API = үнэгүй 500K символ/месяц (бүргэдсээн үнэ). 359 сурагчийн 2 асуулга/день = ≈200K символ/месяц → хүрэлцэнэ. Gajilт: ≈5–10% утга сүлийн (мтематик текст дээр). DeepSeek-R1 = Монгол БИШ, орчуулалт шаардлагатай.
- *Ач холбогдол:* Монгол хэл ≠ Монголын хэл support LLM-д. Орчуулалтын gajilт = math текст-д хүнтэй (numbers, variables БАЙДАГ). Google Translate = нэгэнэ ҮНЭГҮЙ, хөнгөн.

**53. Monthly infrastructure cost: $10–15 (CPU) эсвэл $60–80 (GPU), амарйалын сонголт хүлээх**

- *Эх сурвалж:* Option A (CPU-only): 16GB VPS ($8–12) + Ollama/vLLM ($0) + pgvector ($0) = $10–15 total. Mistral-7B Q4 = 12–18 токен/сек. Option B (GPU): RTX 4060 VPS ($50–80) + Ollama ($0) = $50–80 total. 40–50 токен/сек. Ulaanbaatar VPS = $4.80–$17.99/월 (search result pricing). Pi.mn төсөв = $50–300/месяц → опция A эдийн засгийн.
- *Ач холбогдол:* Хол-гал сонголт ≠ том өртөг. $15/месяц = 30% төсөвийн доошгуур. CPU VPS = хүнтэй ажилтай (12–18 т/сек = 2–3 сек ответ). GPU = үнээ нь ЮҮМҮҮГЭЭ алд БИШ эхлээд.

**54. Mongolian models (sentence-transformers, BGE-M3) + self-hosted = embedding cost $0**

- *Эх сурвалж:* sentence-transformers all-MiniLM-L6-v2 (MIT): 22MB, CPU-only, 384D embedding. BGE-M3 (Apache-2.0): 1024D, multilingual (Mongolian?). pgvector = storage/index. No external embedding API.
- *Ач холбогдол:* Vector DB cost = $0. Semantic search (similarity) = Pi.mn-ийн бодлого хайлт, сурагчийн санамсар шилжүүлэх = $0 API cost.

### Pi.mn дээр хийх санал

| Нөлөө | Ажил | Үйлдэл | Үндэслэл |
|---|---|---|---|
| critical | M | 100 ЭЕШ-ийн математик бодлого + их сурагчийн (10–20) ответ-г collect, 3-step validation pipeline дээр сургалагдалт | Answer validation = ҮНДСЭН АСУУЛГА. Symbolic (SymPy) + LLM-judge (DeepSeek-R1 self-hosted) + human review дээр 95%+ accuracy эргүүлэлтийн гадалтыг үзэлгээ. |
| high | M | 16GB CPU VPS (Ulaanbaatar datacentre)-р Ollama + FastAPI deployment: end-to-end test | $8–12/месяц cost confirm, Mistral-7B Q4 performance real-world, NestJS backend integration (Proxy). Pi.mn-ийн байхдаа PostgreSQL-д холбоос. |
| high | M | Teacher dashboard prototype: attempt logs + LLM-judge scores + human approval UI | Bagш = validation chain-ийн суцаа. UI-г үнэлгээ: 'Is LLM judge's assessment helpful?', 'Override if needed', 'Store final result'. |
| high | M | Pilot: 50 сурагч (1 анги)-г 2 долоо хоног дээр AI tutor дээр, accuracy + engagement metrics үнэлгээ | Real-world feedback before full scale. Track: correct answer rate, student satisfaction, teacher feedback, false positives (wrong approved as correct). |
| high | S | Llama/Mistral/Qwen-3 лицензийн audit: Pi.mn-ийн төлөвлөгөөнд ямар модель law-compliant эсэхээ confirm | Arилжааны deployment = license risk. Meta Llama 700М user cap, Mistral/Qwen Apache-2.0, DeepSeek MIT. Confirm: Pi.mn-ийн use case safe. |
| high | S | Cost breakdown vs. performance trade-off matrix: CPU vs. GPU, API vs. self-hosted, accuracy vs. latency | Pi.mn leadership-р decision making. Option A ($15 CPU), Option B ($65 GPU), Option C ($0 API-only + risk) эргүүлэлтийн гадалтыг үзэх. |
| high | S | Deployment timeline & resource plan: Phase 1 (study, 1–2 месяц) → Phase 2 (prod setup, 3–4 месяц) → Phase 3 (pilot, 1–2 месяц) → Phase 4 (scale) | Realistic roadmap for Pi.mn team. Resource allocation: dev, ops, teacher training. |
| medium | S | Mistral-7B эсвэл Qwen2.5-7B-г local machine (CPU) дээр Ollama-р сургалагдалт хийж performance benchmark | Qwen-3 = Монгол хэлээр дээд, Mistral = Apache-2.0 цэвэр. Benchmarking: inference speed, memory usage, math problem accuracy дээр. CPU-only → understanding VPS requirements. |
| medium | S | Cerebras free API (1M токен/day) + Google Gemini үнэгүй quota дээр pilot test, rate limit + accuracy log | Free API stability check. Groq (too low), Cerebras + Gemini = combo feasibility. Google Gemini-ийн цутгалын хөрвөлт хүлээх (2025 оны эхэл эхэлэх магадшлалтай). |
| medium | S | pgvector extension PostgreSQL дээр install, sentence-transformers (all-MiniLM) embedding pipeline дээр | Pi.mn-ийн 6125 бодлого-г embedding-ээр index → semantic search. Cost = $0, already-deployed DB ашигла. |
| medium | S | Google Translate API (үнэгүй 500K символ/месяц) + Mongolian text pipeline setup, gajilт rate measure | Монгол асуулга → Англи LLM → Монгол ответ. Orçhlalt accuracy: <10% error acceptable math text. Fallback: зүүн орлулыг аргаж болохгүй. |
| medium | S | Hybrid backup strategy документ: primary (Cerebras) fail → self-hosted fallback, API monitor + alerting setup | Free tier API хаагдахыг бэлтгэхэд. Ollama health check, fallback trigger, NestJS middleware. |

<details><summary>Эх сурвалж (88)</summary>

- https://featherless.ai/blog/best-open-source-llms-2026
- https://huggingface.co/blog/daya-shankar/open-source-llm-models-to-run-locally
- https://huggingface.co/blog/daya-shankar/open-source-llms
- https://www.layer3labs.io/guides/best-open-source-llm
- https://monitorplatform.com/blog/10-free-best-LLMs
- https://till-freitag.com/en/blog/open-source-llm-comparison
- https://localaimaster.com/blog/best-open-source-llms-2026
- https://openrouter.ai/blog/tutorials/free-llm-apis-compared/
- https://freellm.net/
- https://klymentiev.com/blog/free-llm-api
- https://wetheflywheel.com/en/ai-model-access/free-llm-api-tiers-2026/
- https://ianlpaterson.com/blog/free-llm-api-2026/
- https://costbench.com/best/best-llm-api-with-free-tier/
- https://tokenmix.ai/blog/free-llm-apis-2026-every-provider-free-tier-tested
- https://tokenmix.ai/blog/free-llm-api
- https://www.premai.io/blog/self-hosted-llm-guide-setup-tools-cost-comparison-2026/
- https://alpacked.io/blog/self-hosted-llm-guide/
- https://dev.to/jaipalsingh/self-hosted-llm-guide-setup-tools-cost-comparison-2026-3m34
- https://www.cloudclusters.io/cloud/ollama
- https://ramnode.com/guides/series/ai-stack/ollama-cpu-llm
- https://vpsfor.dev/posts/best-vps-running-ollama-and-self-hosted-llms-in-2026/
- https://rackdiff.com/en/use-case/ollama
- https://daily.dev/blog/running-llms-locally-ollama-llama-cpp-self-hosted-ai-developers/
- https://machinelearningmastery.com/building-vector-similarity-search-in-postgresql-with-pgvector/
- https://deepeval.com/integrations/vector-databases/pgvector/
- https://github.com/deburky/pgvector_db
- https://medium.com/@muhammadalikhan0003/postgresql-pgvector-bringing-ai-embeddings-to-your-database-b9695eb9b5a4
- https://dev.to/letstalkoss/postgresql-first-approach-to-vector-databases-with-pgvector-and-python-20nm
- https://www.instaclustr.com/blog/vector-search-benchmarking-setting-up-embeddings-insertion-and-retrieval-with-postgresql/
- https://pypi.org/project/pgvector/
- https://cloud.google.com/discover/what-is-pgvector
- https://github.com/tembo-io/pg_vectorize
- https://dupple.com/learn/best-ai-evaluation-tools
- https://pecollective.com/tools/best-ai-testing-tools/
- https://www.confident-ai.com/knowledge-base/compare/best-ai-evaluation-tools-2026
- https://datatalks.club/blog/open-source-free-ai-agent-evaluation-tools.html
- https://www.grizzlypeaksoftware.com/articles/p/every-ai-api-with-a-free-tier-in-2026-the-developers-cheat-sheet-jl33ach0
- https://www.confident-ai.com/knowledge-base/compare/best-llm-evaluation-tools
- https://chozan.co/is-deepseek-free/
- https://www.thundercompute.com/blog/deepseek-r1-ollama
- https://deepseek-r1.com/
- https://ollama.com/library/deepseek-r1
- https://deepseekai.guide/guides/deepseek-open-source/
- https://en.wikipedia.org/wiki/DeepSeek_(chatbot)
- https://github.com/deepseek-ai/DeepSeek-V3/blob/main/LICENSE-MODEL
- https://educationaldatamining.org/edm2024/proceedings/2024.EDM-posters.80/index.html
- https://arxiv.org/pdf/2410.09576
- https://arxiv.org/html/2503.18432
- https://arxiv.org/pdf/2503.16460
- https://arxiv.org/pdf/2407.10153
- https://arxiv.org/pdf/2603.06198
- https://arxiv.org/pdf/2511.18221
- https://arxiv.org/html/2404.05692v1
- https://arxiv.org/html/2411.08910
- https://www.siliconflow.com/articles/en/best-open-source-models-for-translation
- https://www.siliconflow.com/articles/en/best-open-source-models-for-multilingual-tasks
- https://www.bentoml.com/blog/multimodal-ai-a-guide-to-open-source-vision-language-models
- https://www.gladia.io/blog/best-open-source-speech-to-text-models
- https://arxiv.org/html/2607.05849
- https://github.com/topics/mongolian
- https://arxiv.org/html/2411.09492v1
- https://intuitionlabs.ai/articles/claude-pricing-plans-api-costs
- https://www.gamsgo.com/blog/claude-student-discount
- https://www.gamsgo.com/blog/claude-discount
- https://krater.ai/blog/claude-pro-student-discount
- https://felloai.com/claude-student-discount/
- https://claudepricing.com/educational-nonprofit
- https://scottshipsolutions.com/blog/claude-ai-for-nonprofits/
- https://tygartmedia.com/claude-ai-for-nonprofits-discounts-eligibility-use-cases-2026/
- https://www.getaiperks.com/en/ai/claude-student-discount-guide
- https://ultahost.com/vps-mongolia
- https://servers.expert/en/catalog/mongolia
- https://vpsandserver.com/mongolia-vps.html
- https://www.vpssell.com/linux-vps/mongolia
- https://the.hosting/en/vps-vds-mongolia-ulaanbaatar
- https://www.trustedhosting.in/vps-hosting-mongolia.html
- https://atalnetworks.com/ulaanbaatar-mongolia-vps-server/
- https://www.serversinasia.com/serversmongolia.html
- https://www.corsair.com/us/en/explorer/diy-builder/how-tos/memory-for-local-llms-how-much-ram-do-you-need-and-when-speed-matters/
- https://arxiv.org/pdf/2407.18462
- https://medium.com/@imrohitkushwaha2001/llm-quantization-07d9f7a0e093
- https://blog.easecloud.io/ai-cloud/run-70b-models-on-consumer-gpus/
- https://plugable.com/blogs/news/gpu-vram-requirements-for-local-llms-plugable-guide
- https://localllm.in/blog/ollama-vram-requirements-for-local-llms
- https://arxiv.org/pdf/2412.18135
- https://arxiv.org/pdf/2309.05210
- https://arxiv.org/pdf/2308.13137
- https://www.hardware-corner.net/llm-database/Mistral/

</details>

---

## ?

*Математикийн нээлттэй эх загварууд: Pi.mn-ий эргүүлэн авч үзэх судалгаа*

### Олдворууд

**55. Qwen2.5-Math, DeepSeek-Math, InternLM2-Math нь 2024-09 оны сүүлийн үе дахь гол математикийн нээлттэй эх загварууд; 1.5B-ээс 72B параметр хүртэл байдаг**

- *Эх сурвалж:* GitHub (QwenLM/Qwen2.5-Math), HuggingFace загварын карт, arXiv баримтууд (2409.12122, 2310.10631). Benchmark: Qwen2.5-Math-72B нь MATH 82.6%, GSM8K ~95% авсан. DeepSeek-Math-V2 (685B) нь MATH ~88% авсан.
- *Ач холбогдол:* Pi.mn сургалтын төвөд жижиг төсвөтэй үйл ажиллагаа шаардлагатай. 7B загварууд (3.5-4GB VRAM @ 4-bit) практик, 72B+ нь GPU түрээсийн зардалтай (~$200-300/сар).

**56. Монгол хэлтэй нийцэл: Qwen2.5-Math ба DeepSeek-Math-нь Монголын математик функц дээр туршигдаагүй (MM-Eval benchmark дээр синтаксис-эх өндөрлөө, утга-сэтгэлгээ муу); орчуулалт эсвэл finetune шаардлагатай**

- *Эх сурвалж:* MM-Eval (2024-11): Qwen2-7B, DeepseekV2.5 эсвэл Qwen2.5 Mongolian-д математикийн балл авч төчөө; TM-Bench нь уламжлалт Монголын төлөө (математик ҮГҮЙ). WebFetch, WebSearch хайлтанд баримтлаг математик-Монгол үнэлгээ ОЛДСОГҮЙ.
- *Ач холбогдол:* БУРУУ ХАРИУ эрсдэл өндөр (30-50% орчуулалт алдаа). Finetune эсвэл орчуулалтын систем шаардлагатай. Qwen2.5-Math Bilingual (англи + хятад) ~ Монгол үгүй.

**57. CPU дээр ажиллах боломж: Qwen2.5-Math-1.5B ба -7B (GGUF 4-bit quantize) CPU дээр 5-15 токен/сек хүрэлцэнэ; llama.cpp ашиглан үнэгүй. Гэхдээ 70B+ загварууд CPU-д боломжгүй**

- *Эх сурвалж:* llama.cpp benchmark: FP16 2.6 т/сек → Q4_K_M 47.9 т/сек (AMD Ryzen 5800HS дээр); 90% VRAM сэргүүлэх. Qwen2.5-Math-7B @ 4-bit = 3.5GB VRAM. InternLM2-Math-7B GGUF ямар байхаа байгаа.
- *Ач холбогдол:* Сурагч хүлээхүүлэлт 10 сек хүртэл сүвшүүлнэ. 5-10 т/сек = 2-5 сек гаралт хүлээлт (реаль). CPU hosting = $0 (сервер үнэр сүүлдээ).

**58. API үнэ (359 сурагч, сарын 10 туршилт): DeepSeek $76/сар, Groq $42/сар, OpenRouter $76/сар; нийт ~$36-100/сар (ингэж тооцож авсан: 7.18B токен/сар @ 1M token pricing)**

- *Эх сурвалж:* OpenRouter pricing (July 2026), Groq pricing (June 2026), DeepSeek API guide (July 2026). Token usage: math problem ~2000 token input, ~1500 output = 3500 токен/атемпт × 10 × 359 = 12.6M-ээр ихэж. Үнэ: $0.05-0.31 / 1M токен.
- *Ач холбогдол:* API + Render deployment = $75-125/сар нийт = төсвөгүй ($300 доор). Гэхдээ Монгол tuning БИШ, өндөрлөс өөр API зөөлүүлэв.

**59. Гибрид стратеги (зөвлөмж): InternLM2-Math-7B-GGUF (80%, CPU @ $0) + Groq API (20% үүсэх, $30/сар) = $55/сар нийт; fine-tune дөхүүлэх боломж**

- *Эх сурвалж:* InternLM2-Math: GSM8K 49.2%, MATH 21.5% (base), Llama-2 лиценз. InternLM2-Math-Plus-7B-GGUF HuggingFace дээр үр. Groq: $0.05/1M token cheapest.
- *Ач холбогдол:* Pi.mn хамгийн төсвөг. Монголын fine-tune (500-1000 ЭЕШ жишээ) Qwen2.5-Math-7B дээр боломжтой (~$150-200 нэг удаа). Автоматжуулсан валидация шаардлагатай.

**60. Лиценз ба арилжаанд: Qwen2.5-Math (MIT), DeepSeek (MIT), Llama Community License (700M+ месяц үнэр БИШ), OpenMath (Llama 2), Mathstral (Apache-2.0) → БҮГД арилжаанд үнэлүүлэнэ; коммерц-free орлого нь хязгаарлалт ҮГҮЙ**

- *Эх сурвалж:* Model card Hugging Face, GitHub, NVIDIA tech blog. Meta Llama 2 Community License dөрөн үг 'Restricted' (700M+ MAU үнэр сүүлдээ).
- *Ач холбогдол:* Pi.mn коммерц эсэх эргүүлэн судалгаа. Тутаагдаж үйлчилгээ = арилжаанд ≠ MAU-д гүйцэтгэлгүй → Llama-2 аюулгүй. MIT/Apache-2.0 асуудал ҮГҮЙ.

### Pi.mn дээр хийх санал

| Нөлөө | Ажил | Үйлдэл | Үндэслэл |
|---|---|---|---|
| critical | L | Монгол ЭЕШ математик бодлогон 500 жишээ (LaTeX) харьцуулсан хүүхэл (~100-200 сурагч эргүүлэлт) - fine-tuning төлөө подготовка | Qwen2.5-Math эсвэл InternLM2-Math дээр custom tuning хүүхэлээр боломжтой. LoRA 24h = $60-80 GPU-д. |
| high | M | Qwen2.5-Math-7B эсвэл InternLM2-Math-7B-г Vast.ai (4-bit, GGUF) дээр туршилт; 5-10 сурагчдаар (50 бодлога) үлэн test хийх | Монгол орчуулалтын чанар үнэлэх, хугацаа хэмжих, benchmark validate. 2 долоо хоног = $15-20 GPU түрээс. |
| high | M | Орчуулалтын давхарга (Google Translate API эсвэл Meta's M2M-100) + Qwen2.5-Math коридорын архитектур хүүхэлээр хээрэл; validation ystème гүйцэтгүүлэх | Туршигдаа орчуулалтын суу: англи-Монгол 15-30% алдаа. Validation: symbolic check (SymPy), human 2% spot-check. |
| high | M | Render.com дээр deployment жимбүүлэх (NestJS + ML microservice); GPU сервер (Vast.ai эсвэл RunPod) холбону эхлүүлэх | Pi.mn stack (NestJS + Next.js) үргэлжлүүлэх. Inference API сүүлээр, web talban REST эндпойнт. |
| high | M | Сурагч-багш feedback loop (~2 өрөө/сар) → model улучшение, алдаа залруулалт. Logging: attempt, output, correctness (human-validated). | ONNX-ьюнигнен мониторинг. Мөнгөлийн буруу = бүдүүлэлтээр туш шинэ fine-tune эпизод. |
| medium | S | API резерв үнэлгээ (Groq эсвэл OpenRouter) - хоёр дахь сонголт (Mongolian tuning БААХҮҮ буюу hүлээх цаг хэтэрсэн үед) | Гибрид: 80% in-house, 20% API. Groq = хамгийн хямд ($0.05/1M), DeepSeek = Монгол туршилт боломж (эндпойнт дээр). |

<details><summary>Эх сурвалж (25)</summary>

- https://arxiv.org/pdf/2409.12122
- https://github.com/QwenLM/Qwen2.5-Math
- https://qwenlm.github.io/blog/qwen2.5-math/
- https://huggingface.co/Qwen/Qwen2.5-Math-7B
- https://huggingface.co/internlm/internlm2-math-base-7b
- https://arxiv.org/pdf/2310.10631
- https://blog.eleuther.ai/llemma/
- https://arxiv.org/pdf/2411.09492
- https://kaitchup.substack.com/p/gguf-quantization-for-fast-and-memory
- https://www.masternodeai.com/en/tools/gpu-pricing-live
- https://www.nxcode.io/resources/news/deepseek-api-pricing-complete-guide-2026
- https://www.aipricing.guru/groq-pricing/
- https://openrouter.ai/deepseek
- https://medium.com/@marketing_novita.ai/qwen-2-5-7b-vram-tips-every-dev-should-know-932303373ff0
- https://willitrunai.com/models/qwen-2-5-math-7b
- https://developer.nvidia.com/blog/build-enterprise-ai-agents-with-advanced-open-nvidia-llama-nemotron-reasoning-models/
- https://www.tiger-ai-lab.github.io/MAmmoTH2/
- https://arxiv.org/pdf/2405.03548
- https://www.hyperstack.cloud/blog/thought-leadership/mathstral-all-you-need-to-know-about-mistral-ais-new-7b-parameter-model
- https://arxiv.org/pdf/2407.08348
- https://arxiv.org/pdf/2308.09583
- https://github.com/ggml-org/llama.cpp
- https://www.sitepoint.com/opensource-vs-commercial-llms-the-complete-guide-2026/
- https://iternal.ai/token-usage-guide
- https://arxiv.org/pdf/2505.18056

</details>

---

## ?

*Pi.mn сургалтын төвийн бодлогонуудын хуваарилалт: 6 сэдэвт судалгаа*

### Олдворууд

**61. 359 сурагч, 6125 бодлого бүхий Pi.mn-д адаптив тест (CAT + IRT) нь нөхцөл боломжтой**

- *Эх сурвалж:* IRT калибрациид ≥300-500 хариултын түүхийг эрж байдаг. Pi.mn-ий 2.2М потенциал attempts (6125 × 359) нь хүрэлцүүлэхэд дур сайн. Rasch model 1PL эсвэл 2PL ашигла difficulty + discrimination параметр үнэлгээнүүлэх боломжтой [1][2][5]. Py-irt (Python, MIT) эсвэл irtQ (R, GPL) нээлттэй кодоор хийх
- *Ач холбогдол:* Адаптив хуваарилалт нь сургалтын үр дүнг 15-30% сайжруулж болно. Суглалтын хавтас (exposure control, Sympson-Hetter) нь нэг бодлого хэт олон удаа гарахаас хамгаална, асуулгалтуудын санхүүгийн үр дүнг оновчлулна [8]

**62. Сэдвийн урьдачилсан нөхцлийн граф (Knowledge Space Theory) нь бодлогын дарааллыг шалтгаатай болгодог**

- *Эх сурвалж:* ALEKS-ий KST загвар нь 'алгебра → квадрат функц → парабол' гэсэн шүтүүлэлтийг математикийн хэлээр загварчилдаг. Khan Academy-ий mastery learning нь 80% оноо авсны дараа дараа сэдэвт шилжүүлэх ямар зүйл 3 [2][3]. Монголын математик ЭЕШ-ий сэдвүүдийг сургалтын төвийн сургагчаарнаас гараар эсвэл LLM-ээр үнэгтсэнэ $50-100
- *Ач холбогдол:* Урьдачилсан нөхцөл өндөр сэдэвт 'тэнгэрээс унаах' сурагчдын асуудал авахыг багасгадаг. Ангид адаптив хуваарилалтын нэг том асуудал (мэдэгдлийн дагуу шилжүүлэх ерэмбийн сүүлийн нөхцлийн үр дүнг оновчлулна)

**63. Thompson Sampling (bandit алгоритм) нь сургалтын аргуудыг ардык туршилтаар оновчлуулж болно**

- *Эх сурвалж:* Адаптив туршилт (adaptive experiment) ашигла 2 сургалтын аргыг төлөвлөлтийн үнэлгээтэй харьцуулахун боломжтой [3][6]. 4 сарын туршилтанд Group A (адаптив) vs Group B (контроль) ≥30 сурагч/булэг байхдаа p < 0.05-ий статистик хүчинтэй дүгнэлт гаргахуу болно
- *Ач холбогдол:* Pi.mn-ий багшид хөөр сургалтын аргаас аль нь 'үнэн' ЭЕШ-ий оноог сайжруулж байгаа (n=60+80) үл мэдэгдлийн дагуу шилжүүлэх ерэмбийн сүүлийн нөхцлийн үр дүнг оновчлулна. Bandit туршилт нь доктрин болгохын өмнө бодит цахилгаан сугалалтын үр дүнг суулгадаг

**64. Спейсд репетишн (spaced repetition) + 7 хоногт 3 удааны хуваарь нь 60 хоного хойш retention ≥70% үл өндөрлүүлдэг**

- *Эх сурвалж:* FSRS (Free Spaced Repetition Scheduler, MIT) нь вероятностийн загварыг ашигла оптимал давталтын хугацаагнэмэгдүүлэлт [9][10]. Сургалтын төвийн 7 хоногт 3 удааны хуваарь (Пн/Лх/Пт) → 3-4 өдрийн цикл → FSRS интегрэйшн
- *Ач холбогдол:* Сурагч 60 хоногийн дараа анхны оноог мартсан байдаг (Ebbinghaus-ийн забышлын муруй). FSRS нь үл оновчлогчдын явах явцад хадгалан үлдэх магадлалыг FSRS нь үл оновчлогчдын явах явцад хадгалан үлдэх магадлалыг үл оновчлогчдын явах явцад хадгалан үлдэх магадлалыг нэмэгдүүлдэг

**65. Хүйтэн эхлэл (cold start) асуудлыг диагностик тест (20-30 бодлого) + Rasch 1PL ашигла шийднэ**

- *Эх сурвалж:* Шинэ сурагч → диагностик тест → Rasch 1PL θ̂ → адаптив шилжүүлэх. θ̂ > -1 логит байхдаа адаптив эхлэ [1][6]
- *Ач холбогдол:* Шинэ сурагч адаптив тестэд оруулахаас өмнө диагностик тестээр чадвалыг үнэлгээнүүлнэ (хэмжилтийн дагуу шилжүүлэх ерэмбийн сүүлийн нөхцлийн үр дүнг оновчлулна)

**66. Адаптив vs контроль англиын туршилтын этикийн асуудал нь 'градуал шилжүүлэлт' ба рандомизжүүлэлтээр шийднэ**

- *Эх сурвалж:* Судалгаа: 3-4 англь (60-80 сурагч), Group A = адаптив, Group B = контроль, 4 сарын дараа ЭЕШ-ий сорилцол. Эхлээд Group B-д адаптивын үр дүнг үзүүлэлтийн дараа, эргээр Group B-г адаптивт шилжүүлнэ [4][12][13]
- *Ач холбогдол:* Pi.mn-ий контроль англиын сурагч 'үл ашигтай байлаа' гэж авахыг сэргийлэх этик асуудал. Туршилтын үр дүн сайн болэхлавал, бүхэл ангийг адаптивт 'нийлүүлнэ'

**67. Төсөвний үл сучлал: 3 жилийн хөгжүүлэлтийн нийтдээ өртөг $150-300, сарын дундаж $50-100**

- *Эх сурвалж:* Фаза 1 (1-4 сар): IRT + холдаут үнэлгээ ($50-100). Фаза 2 (4-8 сар): KST граф + Bandit + Ангид туршилт ($50-100). Фаза 3 (8-12 сар): Spaced rep + cold start + бүх англид сугалалт ($50-100). Нээлттэй эхүүдээр бүхэл ($0 үнэлгээнүүлэлтийн толбо)
- *Ач холбогдол:* Pi.mn-ий төсөв $50-300/сар байгаа. Энэ 12-сарын хөгжүүлэлт нь сарын $50-100 өртөгтэй таарна. Том компаниуудын $2000+ SAASын нэвтрүүлэлтээс ($2000+) эцэг авах боломжтой

### Pi.mn дээр хийх санал

| Нөлөө | Ажил | Үйлдэл | Үндэслэл |
|---|---|---|---|
| critical | L | Фаза 2 (4-8 сар): 3-4 англид адаптив vs контроль туршилт (A/B тест) | Group A (n=30-40): адаптив IRT, Group B (n=30-40): контроль. 4 сарын дараа ЭЕШ-ий сорилцлын оноо Welch t-test (p < 0.05). Адаптив > контроль ≥5% үл байгаа ёстой. Үр дүнгээс хэм: Group A-г адаптивт нэвтрүүлэх үндсэлгээ авах |
| critical | XL | Фаза 3 (9-12 сар): Бүх английн адаптив нэвтрүүлэлт ба мониторинг | 21 английг аажиммаар адаптивт шилжүүлэх (gradual rollout). Сургалтын төвийн сургагчид мониторинг, feedback. ЭЕШ-ий сорилцлын оноо яхаа хойш (9-12 сарын дараа) үнэлгээ |
| critical | M | Бүх фазын үед: Өгөгдлийн баталгаажуулалт ба буруу хариуны төлөв мониторинг | Адаптив тестийн буруу калибрэйшн → сурагч 'сулан' байж болох. Квартальд дахин калибрэйшн, сургалтын төвийн сургагчаас feedback авах. ЭЕШ-ий оноог сорилцол тус бүр хэмжээ, адаптив > контроль сана баталгаажуулалт |
| high | L | Фаза 1 (1-4 сар): IRT калибрэйшн + CAT адаптив сонгох хэрэгжүүлэлт | Pi.mn-ий 6125 бодлогын (Problem table) correctRate, attemptCount өгөгдлөөс Rasch model 2PL ашигла difficulty (b) + discrimination (a) параметр калибрэйшн. Py-irt (PyTorch-based) ашигла GPU ашигладаг. NestJS API endpoint /adaptive/next-item эхлүүлэх, client->server POST (attempt) -> GET (next item).  |
| high | M | Фаза 1 (1-2 сар): Монгол математик ЭЕШ-ий сэдвийн граф (Knowledge Space, DAG) уусгах | Сургалтын төвийн 13 багшаа 'Аль сэдэв аль сэдвээс урьдачилсан нөхцөл вэ' асуу. LLM (OpenAI API, claude-opus) ашигла ярилцлагаар граф үнэгтүүлэх ($50-100 нэмэгдүүлэлтийн зардал). networkx (Python, BSD) ашигла DAG дүрслэн, UI-д үзүүлэх |
| high | M | Фаза 1 (1-4 сар): Холдаут (holdout) тестийн үнэлгээ ба cross-validation | 6125 бодлогын Attempt өгөгдлийн 70% сургалт, 30% үнэлгээ. RMSE(ability), Pearson r (шинэ сорилцлын оноо) хэмжээ. Сургалтын төвийн сургагчаас feedback авах ('энэ адаптив оноог сайн' гэж баталгаажуулалт) |
| medium | S | Фаза 1 (2-4 сар): Диагностик тест (20-30 бодлого) + cold start модуль | Шинэ сурагч → диагностик тест → Rasch 1PL θ̂ → адаптив шилжүүлэх. Диагностик тестийг ангиуд сүүдлүүлсэн бүтээлгүүлэн (бүхэл жилийн эхэнд) |
| medium | M | Фаза 2 (5-8 сар): Thompson Sampling (bandit) туршилтын нэвтрүүлэлт | Arm A: адаптив дарааллаар хуваарилалт, Arm B: шугаман сэдвийн дарааллаар. Thompson Sampling Beta-Binomial (pymc3, Apache-2.0). 4 сарын дараа Group A > Group B эсэхийг дүн. Сургалтын төвийн сургагчид сургалтын аргыг сонгосон баталгаажуулалт |
| medium | M | Фаза 2 (6-8 сар): FSRS (Free Spaced Repetition Scheduler) интегрэйшн | js-fsrs (TypeScript, MIT) эсвэл pyfsrs (Python) ашигла NestJS-т. Сургалтын төвийн 7 хоногт 3 удааны хуваарь → 3-4 өдрийн цикл → FSRS retention schedule ($0 нээлттэй эх). Pre-test (эхэн) / Post-test (60 хоного хойш) retention ≥70% үл ажиллах |

<details><summary>Эх сурвалж (15)</summary>

- [1] Deep Computerized Adaptive Testing — https://arxiv.org/pdf/2502.19275
- [2] Sample-Size Planning in Item-Response Theory: A Tutorial — https://journals.sagepub.com/doi/10.1177/25152459251314798
- [3] Why Mastery Learning, by Sal Khan — https://support.khanacademy.org/hc/en-us/articles/360030753412-Why-Mastery-Learning-by-Sal-Khan
- [4] A practical perspective on knowledge space theory: ALEKS and its data — https://jmatayoshi.github.io/publications/JMP2021_KST_ALEKS_preprint.pdf
- [5] The irtQ R package: a user-friendly tool for IRT-based analysis and calibration — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11561393/
- [6] Adaptive Experiments Under Data Sparse Settings: Applications for Educational Platforms — https://arxiv.org/pdf/2501.03999
- [7] py-irt: A Scalable Item Response Theory Library for Python — https://arxiv.org/pdf/2203.01282
- [8] Sympson-Hetter Item Exposure Control in CAT — https://assess.com/sympson-hetter-item-exposure-control/
- [9] Free Spaced Repetition Scheduler (FSRS) — https://github.com/open-spaced-repetition/fsrs
- [10] SM-2 Spaced Repetition Algorithm — https://github.com/open-spaced-repetition/sm-2
- [11] pyBKT: Python Library of Bayesian Knowledge Tracing Models — https://arxiv.org/pdf/2105.00385
- [12] Algorithmic Bias in Education — https://link.springer.com/article/10.1007/s40593-021-00285-9
- [13] Personalized adaptive learning in higher education: A scoping review — https://pmc.ncbi.nlm.nih.gov/articles/PMC11544060/
- [14] Rasch Model Item Difficulty Parameter — https://assess.com/irt-item-difficulty-parameter/
- [15] Opportunities for Adaptive Experiments to Enable Continuous Improvement in Computer Science Education — https://arxiv.org/pdf/2310.12324

</details>

---

## ?

*Монгол хэлийн NLP болон математикийн нэр томьёо — Pi.mn-ийн боловсрол дадлага*

### Олдворууд

**68. Монгол хэл нь LOW-RESOURCE хэлнээс үзүүлэлтийг БӨӨЛӨХ байгаа**

- *Эх сурвалж:* MM-Eval benchmark (2024): Qwen2-7B, GLM4, Llama3.1, GPT-4, DeepSeek V2.5 оноуулсан. Синтакс 55-65%, семантик 30-40% (англиас 3-4 дахин муу). FLORES-200 дээр монгол байгаа боловч benchmark нь 3001 үгүүлбэр (английнхаас 100x сүүлийн). tugstugi-ийн Mongolian-BERT: Wikipedia + 700M үгийн мэдээ (2016-2020), SentencePiece 32k vocab.
- *Ач холбогдол:* Pi.mn-ийн 6125 бодлого сорьцлохын өмнө энэ benchmarks-оос үнэл өгөх ёстой. Загвар үнэмлэхүүлэх болгон ТӨЛӨВЛӨЛ хэрэгтэй.

**69. ТОКЕНИЗЕР АСУУДАЛ: Монгол үг англи үгээс 1.5-2.5x OЛ ТОКЕН зарцуулдаг**

- *Эх сурвалж:* Араб хэлийн сорьц: 2.4 токен/үг vs англи 1.5-1.6. Монголын БОДИТ хэмжилт олдсонгүй — энэ нь НЭЭЛТТЭЙ АСУУДАЛ. Шалтгаан: англ-оновчлогч tokenizer (Llama, Claude, GPT) → Cyrillic монголыг их хэсэглэнэ. Шийдэл: SentencePiece эсвэл BPE монголоор дээр сурах.
- *Ач холбогдол:* API-ээр хүүргээх бол монголоор 2-3x илүү ТӨЛБӨЛ хүлээнэ. Pi.mn төсөв сүүлийн — token-г сайтар үнэлэх ЗААВАЛ.

**70. Кирилл монгол vs Уламжлалт бичиг (ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ): Үл нэгэлнэ хөрвүүлэлт-ээ**

- *Эх сурвалж:* CoPiT төсөл: Кирилл → Уламжлалт 3 алхам (vowel harmony recovery, Latin-normalization, Cyrillic-normalization). RNN/Self-attention оцнощ сорьцлагдсан. Монгол фонема-график нь олон: 'о/ө' нь Кириллд ялгаатай, Уламжлалт бичигт нэг үсэг. Ambiguity → орчуулалтын алдаа.
- *Ач холбогдол:* Pi.mn сурагчид (особенно хөндлөнгийн) ихэнхдээ кирилл уншдаг. Уламжлалт бичиг баланай оруулсан бол ҮҮСЭГТҮҮЛГЭЭ баталгаажуулах хэрэгтэй.

**71. Монгол математикийн нэр томьёо: 70%-ийг шууд англиар орчуулж болно, 30% нь монгол СТАНДАРТ байдлаас тодорхой**

- *Эх сурвалж:* Робилдорж (1717-1766) × Инжинаш (1704-1788) сонгох. Мөнгөлийн Математикийн Нийгэм (IMU member). 'язгуур'=root, 'ялгавар'=difference, 'нийлбэр'=sum нь англиар урамжилгүй. Гэхдээ 'интеграл', 'уламжлал' = ОРЧУУЛГЫН НАРИЙНЧИЛАЛ хэрэгтэй. Албан ёсны толь: 'Divine Knowledge' ном (2005), ерөөс олдсонгүй бүрэн толь онлайн.
- *Ач холбогдол:* Эдгээр нэр томьёо Pi.mn-ийн бодлогод маш их давтагддаг. СТАНДАРТ толь үйлдлэлгүйгээр холилдоохыг эрсдэл.

**72. Нээлттэй ӨГӨГДЛИЙН САН: Монгол 248M токен (CC-100), 700M үгийн мэдээ (tugstugi). Тулгалт: ҮНЭТЭЙ бага**

- *Эх сурвалж:* CC-100: 3.0 GiB / 248M токен (англи: 100B токен, 400x их). OSCAR, mC4: монгол хэмжээг нь баланай. Mongolian-BERT: 2016-2020 Wikipedia+мэдээ. Лицензи: tugstugi (Apache 2.0), MnTTS (CC-BY-4.0) — арилжааны хэрэглээ ОК.
- *Ач холбогдол:* Open-source BERT fine-tune → хямдад PI.mn-ийн төлөвлөл өртөл найдвартай. Гэхдээ НЭЭЛТТЭЙ МОНГОЛ текстээ (сурагчид хариулт) үнэлэлтээр сорьцлох ёстой.

**73. АЛДАА ХОЛБОО: Монголоор БУРУУ хариу = сурагчдын дунтагтай шалтгаан 5-15%**

- *Эх сурвалж:* Bilingual learning research: 'switching languages for arithmetic does NOT affect reasoning quality' (NCTM). Гэхдээ кирилл-орчуулалт, нэр томьёо зөрүүтэл → сурагч 'мэдэж' алдаа гарна. Pi.mn SMS-ээр сурагчид хүүргэнэ → НҮҮР замд дахь тэлээл ҮНЭТЭЙ.
- *Ач холбогдол:* Загвар үнэл үзүүлэлтийг ӨӨРӨӨ баталгаажуулах ЗААВАЛ. SMS/SMS хариулт + мастер-энд шатлалтай баталгаажуулалт дүзүүлэх.

### Pi.mn дээр хийх санал

| Нөлөө | Ажил | Үйлдэл | Үндэслэл |
|---|---|---|---|
| critical | M | 4. МОНГОЛ МАТЕМАТИКИЙН СТАНДАРТ ТОЛЬ: tugstugi/Mongolian-BERT корпус + Mongolian Mathematical Society ба University of Humanities of Mongolia-тай хамтлан үйлдлэлгүй бэлтгэх | Pi.mn-ийн 21 багш × 359 сурагч → БАЙНГА орчуулалтын зөрүүл гарч магадгүй. Толь хэрэгцээ: (1) EEШ-ийн албан ёсны математикийн нэр томьёо 300-500 үг, (2) CL-монгол (Cyrillic-Latin + Traditional) орчуулалт шалалт, (3) коментари (жишээ: 'язгуур'≈root буюу √x). Хөргөмж: Google Sheets + Slack/Discord бүтэ |
| critical | M | 5. БАТАЛГААЖУУЛАЛТЫН ҮЙЛЧИЛГЭЭ: SMS-аар шийдлүүлэх + Мастер-энд шатлалтай дахин шалга | БУРУУ ХАРИУ → сурагчийн АШИГТАЙ БИШ. Үйлчилгээ: (1) сурагч хариулт SMS-ээр → (2) загвар үнэл оноогдуулах (монгол → токен) → (3) эргүүлэх баталгаажуулалт (мастер энд үүрэг) → (4) GPS 85%-ээс дээш байвал ОК, эс тэгвэл солих. Technics: LiteLLM (open-source) эсвэл tugstugi BERT API. Өртөг: $0-20/сар (өө |
| high | L | 1. АНГЛИ-МОНГОЛ ХОЁР ХЭЛТ СТРАТЕГИ: ЭЕШ-ийн математикийн бодлого англиар натуролгоод монголоор орчуулах, сорьцлах | Bilingual learning →дүрслэл сайтар. CoPiT (traditional script) эсвэл кирилл-л орчуулалт ажилад гэдэг. Бодлогын анги тус бүрд (алгебр, геометр, вероят) орчуулалтын тогтолцоо байх. BBC толь хэвийлүүлэх. Өртөг: бүтээгч 40-60 цаг, техник 20-30 цаг (нийт 60-90 цаг, $600-1200 урамжилгүйн 1.5x хүмүүс). |
| high | M | 2. OPEN-SOURCE BERT FINE-TUNE: tugstugi/bert-base-mongolian-uncased → Pi.mn текстээр сорьцлах | Хямд сонголт ($0 лицензи, локаль дээр ажиллана, CDN-сан ХОРИОТОЙ вэб). tugstugi BERT эргүүлүүлэх хэрэгтэй: (1) 6125 бодлогын шийдлүүд × сорьцлалт → 50k-100k монгол үгүүлбэр, (2) DistilBERT хийгдээж (50% хурдан, 40% сүүлийн орноо), (3) SentencePiece 32k → 16k-32k monkey-vocabulary. ТОКЕНИЗЕР АСУУДАЛ  |
| medium | S | 3. API ХОЁРДОЛ СТРАТЕГИ: (3a) Mistral/Llama open-source cheap, (3b) DeepSeek-V3 low-cost GPT зарим үйлчилгээ-ээ | Монголоор орсон: Llama 3.3 70B (OpenRouter $0, rate-limit), Mistral Small ($0.10/M токен), DeepSeek-V3 ($0.27/$1.10). Claude/GPT → 16x үнэтэй. Pi.mn төсөв $100-200/сар → Mistral/OpenRouter + BERT fine-tune их үндэстэй. ГЭХДЭЭ: орсон загвар → монгол семантик 30-40% (MM-Eval). БАТАЛГААЖУУЛАЛТ эрэл. Өр |
| medium | S | 6. МОНГОЛЫН AI БАЙГУУЛЛАГА ХАМТРАХ: University of Humanities of Mongolia + Mongolian Mathematical Society + Omdena project-н сүүлийн Mongolian NLP хүмүүс | National AI Strategy (2025-2026) + Mongolia AI Center төлөвлөлтөд байна. Түүнээс өмнө University of Humanities-тай холбо яривалцуулах: (1) fine-tuned BERT хуваалцуулах, (2) уулүүлэлт benchmark (Pi.mn-ийн амжилтын магадлал) → 'Mongolian Education Task' нь MM-Eval-аа нэмнэ. Omdena project (NLP ургал): |
| medium | M | 7. ТОКЕНИЗЕР ШИЙДЛҮҮЛЭХ: SentencePiece + BPE монголоор дээр сурах + Llama/Claude-ийг токен зардлаар дүүлэх | Нээлттэй асуудал: Монгол токен-эффикэнси нь БАЙХГҮЙ. Зайлалт: (1) SentencePiece 16k-32k vocab монгол текстээр сургах (700M mənti мэдээ), (2) өнөөхөн бодлого sample 100-200 → token count измерение хийх (англи vs монгол), (3) 2-3x өртөг → API үнэ $1.50/бодлого (Claude) эс тэгвэл Mistral $0.20. Pi.mn б |
| low | L | 8. МОНГОЛ БИЧИГ ОРЧУУЛАЛТЫН БАЛАНАЙ СОНГОЛТ: Кирилл-л орчуулалт (90% сурагч) vs Уламжлалт Бичиг (10% сургалтын төв-ын урраг) → хоёулан дэмжих | CoPiT төсөл (digraphic Mongolian) хийгдэнэ. Pi.mn сурагч → кирилл 90%, уламжлалт 10% (сургалтын төв-ын үндэслэл). Үйлчилгээ: (1) Mongolian-BERT + кирилл-оновчлогч vocab (тухайн үе), (2) бичиглэлтэй орноо (vowel harmony + Cyrillic normalization нь зүрхний хүндрэл). Өртөг: 20-30 цаг техник (зөөлгөөн н |

<details><summary>Эх сурвалж (14)</summary>

- [MM-Eval: A Hierarchical Benchmark for Modern Mongolian Evaluation in LLMs](https://arxiv.org/pdf/2411.09492)
- [Evaluating Large Language Models in Mongolian (2025)](https://www.anlp.jp/proceedings/annual_meeting/2025/pdf_dir/Q1-12.pdf)
- [tugstugi/mongolian-nlp GitHub](https://github.com/tugstugi/mongolian-nlp)
- [tugstugi/bert-base-mongolian-uncased Hugging Face](https://huggingface.co/tugstugi/bert-base-mongolian-uncased)
- [FLORES-200: Multilingual MT Evaluation Dataset](https://www.emergentmind.com/topics/flores-200-benchmark-dataset)
- [GlotCC: An Open Broad-Coverage CommonCrawl Corpus for Minority Languages](https://arxiv.org/html/2410.23825)
- [Tokenization efficiency of current foundational LLMs for Ukrainian language](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1538165/full)
- [CoPiT: Cognitive Pivot Translation for Digraphic Low-Resource Mongolian](https://arxiv.org/html/2607.05849)
- [Transliteration-Aided Transfer Learning for Low-Resource ASR: Khalkha Mongolian](https://www.mdpi.com/2079-9292/14/6/1137)
- [MnTTS: An Open-Source Mongolian Text-to-Speech Synthesis Dataset](https://arxiv.org/pdf/2301.00657)
- [LLM API Pricing Comparison (August 2026)](https://benchlm.ai/llm-pricing)
- [5 Powerful Math Strategies for Multilingual Learners](https://www.ascd.org/blogs/5-powerful-math-strategies-for-multilingual-learners)
- [National Strategy on Big Data and Artificial Intelligence Presented - MONTSAME](https://www.montsame.mn/en/read/369839)
- [Leveraging AI to Transform Mongolian Digital Environment - Omdena](https://www.omdena.com/projects/leveraging-natural-language-processing-for-mongolia-landscape)

</details>

---

## ?

*Pi.mn ЭЕШ математик сургалт төвд машин сургалт хэрэгтэй юу: шийдвэрийн мод, үе шатуудын цэцэрлэг, өндөр эрсдэлүүд, өртөг, баталгаажуулалтын стратеги*

### Олдворууд

**74. Pi.mn-д ЭХНИЙ үе шатанд машин сургалт ЗААВАЛ БИШТЭЙ. Дүрэл-ээс-өгөгдөл хандалгаа 40-60% үнэ цэн авна.**

- *Эх сурвалж:* Google-ын "Машин сургалтын дүрэм" (Rule 1: "Don't be afraid to launch a product without machine learning") болон арилжааны судалгаа: 2025 онд AI төслүүдийн 42% бүрэлдээлээгүй; 80% нь өгөгдлийн чанар/бэлтгэлийн эцэг асуудалаас бүтэлгүйтдэг.
- *Ач холбогдол:* 6125 бодлого × 359 сурагч гэсэн том өгөгдлийн эргэлтүүрийн сүүлд ML эхлүүлэхэд 6-12 сарын хугацаа/1000+ доллар баталдуулаагүй. Үхсэн үз төлөвлөл нь ML-ГҮЙГЭЭР 50-60% ашиг урдчилан авна.

**75. Загвар сургах эсэх шийдвэрийн мод: (1) Бодлого нь нарийн логик шиг үг? → Дүрэл. (2) Үгүй, илсүүрүүд нь началгүүд үсэг адил нарийхан? → Хибрид (дүрэл + 1D загвар). (3) Хэтэрхий төвөгтэй, хөндлөнгө өөрчлөгдөнө? → ML.**

- *Эх сурвалж:* Medium (Khayyam H.) болон IEEE судалгаа: дүрэл-ээс сүзэг 80% нарийвчлалтай шуугийн асуудалд; ML 95%+ үйлүүлэх боломжтой ГЭВЧ нөхцлүүдүүд нь тодорхойлогдсон байна (өгөгдлийн хэмжээ, чанар, инженер).
- *Ач холбогдол:* Pi.mn-д: (а) бодлогуудыг ангилахын («Нилээдэл хялбар» vs «сунгалтатай») дүрэл 70% нарийвчлалыг эргүүлэх; (б) сурагчийн 2-3 оролцоо → түүний өндөр магадлалтай асуудал ишлэл → дүрэл (мас үрэлэг).

**76. Буруу хариуг баталгаажуулалт нь Pi.mn-д ХАМГИЙН СУЛАА эрсдэл. Өдөө загвар нь 57-84% яв, 16-40% саад байна.**

- *Эх сурвалж:* arXiv 2605.23925 (Catching the Correct Answer Trap): (1) Сурагч ЗӨВӨӨ хариулсан ч мацуу бодож байдлын илрүүлэх адал — BERT 57% л нь авдаг; (2) Gemini 3 Flash (шилүүн) 84% мацуу авдаг ГЭВЧ 1.6% явцхүүдлээс 18% хуурамч аньсан хэмжээ → үйл ажиллагаа 10-12 хуурамча саадалтай. (3) «Зөвлөмжүүдүүдээ баталгаажуулалт.»
- *Ач холбогдол:* Математик сургалтанд буруу хариуг баталгаажуулалт нь чухал: сурагч «зөв сүргүүлэлтээр олж авсан зөвийг» алдан авч болно. 359 × 10 = 3590 сурагч/сар үйл ажиллагаа бүтэлгүйтвэл 1-2 сур миний ганцаарчилсан дүнийг алдана.

**77. Өгөгдлийн ТУЯ СҮҮЛ: Pi.mn-д одоо (Attempt/Problem) бий; ЭХЛЭХИЙН ӨМНӨ эхлүүлэх сүүлүүлүүд: (1) Сурагчийн I.D., (2) Сэдэв/бүлэг (3) Сургалтын хугацаа (4) Аргатан (5) Сүүл (сүүл/санал болгосон).**

- *Эх сурвалж:* arXiv 2402.01666 (Personalization in Smart Education) + arXiv 2509.23996 (Knowledge Tracing): сургалтын контекс — сэдэв-д оллогдох цагийн урт (temporal) + ашиглалтын мод (clickstream) + шүүмжээлэлийн дараалал (attempt sequence) → өгөгдлийн сүүлүүлү юм.
- *Ач холбогдол:* ӨМНӨ эхлүүлэхгүй бол 6-12 сарын дараа «мэдээллээ» гэхэд дотор нь сүүл дутахаа ойлгоно. Одоо эхлүүлэхэд $0 зардал.

**78. Үе шатуудын ажлын горим: Үе 0 (өгөгдөл, 0-1 сар, $0), Үе 1 (дүрэл, 1-2 сар, $100-200), Үе 2 (1D загвар, 2-4 сар, $200-500), Үе 3 (сүүл/боловсрол, 4+, $500-1000).**

- *Эх сурвалж:* Google ML Rules, QCon SF 2024 (Production ML best practices): simple-first approach — хэтүүдүүлэнгүүлэлтийг төөрөгдүүлэхээс эхэл, дараа нь үзүүлэлтүүлэл авлалт. Pilot-to-production gap: 46% PoC-үүдээр алдагддаг.
- *Ач холбогдол:* Эргүүлэх хүчэл хамгийн бага үнэ цэнтэй үе шаттай эхлүүлэхэд хүчирхүүн юм. Pi.mn-д Үе 1 нь 1-2 сарт 40-50% үнэ цэн авна, ус хэрхэн хөлөгдөөхөө үз.

**79. Нээлттэй эхийн лиценз: Apache-2.0, MIT → коммерс ашигла (Pi.mn сургалт үйлчилгээ); GPL-3.0 → эргүүлэлт хорь ХАРИУТАН; Llama Community License → 700M идэвхтэй хэрэглэгч хүртэл (Pi.mn-д хэрэхгүй).**

- *Эх сурвалж:* WCR.Legal (2026), TrueFoundry, GitHub topic:open-llms: Apache-2.0/MIT нь 62% Hugging Face загвар; GPL 18%; Llama custom 8%.
- *Ач холбогдол:* Pi.mn-д Apache-2.0 (Qwen, Llama 3 OpenNLP гэх мэт) сонголт нь юм юу заавал сонгох хэрэгтэй юм. GPL-ээр эхлэбэл өөрийн код НЭЭЛТТЭЙ хийлэх хэрэгтэй.

**80. Өртөгийн үнэлгээ: Үе 1 (дүрэл) $50-100/сар, Үе 2 (1D загвар, CPU) $100-200/сар, Үе 3 (GPU inference) $300-1000/сар.**

- *Эх сурвалж:* GPU Cloud Pricing 2025: H100 CUDA ~$2.10/ц (пүүсийн), бага загвар (~7B параметр) CPU-д дүүл (Render/Replit $5-15/сар), GPU inference ~$6-50/сар (model size & request volume). Mistral 3 API $0.20/M tokens.
- *Ач холбогдол:* Pi.mn бюджет $50-300/сар. Үе 1-2 сүүлд дүүл, Үе 3-ээр эргүүлэлтүүлэх хэрэгтэй (болиулаадырго ба самбар ашиглалт).

**81. Загвар сургалтын ӨМНӨ сур аль тэр шаж сүүлүүлүүд сээ: (1) Сурагчийн адаадыг танах (знач үнэлгээ), (2) Бодлогуудыг ангилал эхний дүрэл, (3) Attempt sequence (дараалал)-ыг задаан доор асаалт.**

- *Эх сурвалж:* Rules of ML + ICML 2024: "Make your pipeline solid end-to-end" - өгөгдлийн сээрийн боловсролтогчүүд ю сэл нь шиндээр.
- *Ач холбогдол:* Одоо $0 хүргүүлэлтэй сүүлүүлүүд вольтсээл ч удаа улс ашигла, загвар сургалтаас 6-12 сарын дараа түүнүүд «мэдээллээ» гэж илтгэхгүй.

### Pi.mn дээр хийх санал

| Нөлөө | Ажил | Үйлдэл | Үндэслэл |
|---|---|---|---|
| critical | M | Үе 3: Баталгаажуулалтын ИНФРАСТРУКТУР (эхэлсэн үе 2-3 сарын дараа). Хийх хэрэгтэй: (1) Буруу сүүллүүдээ 50-100 гараар шалга — загварын яв үнэлгээ. (2) «Зөвлөмж» + «сүүл хүүхэл» = үнэлгээний үе (precision@k, recall@k). (3) Хүүхэл сүүлүүдээр гарах сүүл ижилэрүүл → дүрэлээ сайжрул. | Баталгаажуулалт байхгүйгээр 10-20% сурагч «буруу сүүл»-ээр авч алдана. Мөнгө нь үнэхээр шалгалт юм: random sample 50 + subject matter expert (5-10 ц багш) → $100-200 нэмэх. |
| critical | L | Рүндхүүмжүүлэлт: Буруу хариуг снэх infrastructure. (1) Нэмэлт өгөгдөл: сурагчийн нэхэм / сүүлүүлэлтийн үг (hint-ээ авч байгаа эсэх) / цагийн урт (хэтэрхий удаа). (2) Precision-recall balance: 60% PPV цахим → 1-2 хуурамча сүүл / 10-20 сурагч. (3) Мэдээлэх + сургалтын контакт. | Буруу сүүл = хүүхэл сургалтын гэмтэл. Бүр 10-20 сурагч баталгаажуулалтын цаг анголж байсан ч үнэ цэнэ юм. |
| high | S | Үе 0: Өгөгдлийн сүүл эхлүүлэх (бүхэл 0 доллар). Одоо эхлүүлэ: (1) Сэдэв/бүлэг кодыг П.М. бүхэл сур доо сонирхол идэвхтэй өгөгдлүүдэд хүрнүүл. (2) Сурагч сэдвээ сонирхон хэдэн сургалтын цагийг / Attempt дараалал сүүлнүүл. (3) Сүүлүүдээ өгөгдлийн санд төлөвлүүл (Prisma үйл ажиллагаа). | Загвар сургах өмнө 6-12 сар аялтаа хүрэл анхлан сүүлүүлүүдүүтүүлэхэд юу ч байна. Одоо эхлүүлэхэд $0, хөлөг шалгалга эргүүлэх нөхцөл сүүл ГҮЙЦЭНЭ. |
| high | M | Үе 1: Дүрэл-ээс-өгөгдөл системээ ЭХЛҮҮЛ. Шаалтан: (1) Бодлогуудыг ангилал гарга («Олан + мацуу», зэрэг) — контекст + сағаалт (難易度) үсгүүлээр. (2) Сурагчийн 2-3 оролцооны дараа «дараагийн сүүл»-ийг дүрэл (if-then) гарга. (3) Үеийн дүүлэлтийн үнэлгээ — 40-60% үнэ цэн авлалтай ГАРНА. | Дүрэлээс эхлэхэд (1) $0-100 зардал, (2) 1-2 сарт үз, (3) 40-60% үнэ цэн авна. Сүүлүүлээр өмнө ML уулын төрөл ойлгохгүй. |
| high | S | ҮЗҮҮЛЭЛТҮҮДИЙГ хэмжүүл. Сэгтүүлэх: (1) Үе 1: Дүрэлээр 40-60% үнэ цэнтэй эсэх (60+ сурагч сургалтын цаг өндөр). (2) Үе 2: Загварын 75%+ нарийвчлалтай эсэх (validation set). (3) Үе 3: Сүүлүүлүүдийн positive predictive value (PPV) ≥60% (баталгаажуулалтын өгөгдөл). | Үнэлгээ байхгүйгээр ямар болж байгаа ойлгохгүй. Эздэнь шүүмжээлэхэнд дүрс ширээтэй байх хэрэгтэй. |
| medium | M | Үе 2: 1D таалбалалтын загвар сур. Хийх хэрэгтэй: (1) Сурагчийн эхний 30-50 оролцооны өгөгдөлөөр логистикийн регресс (Scikit-learn, Apache-2.0) сул сур. (2) Validation set (20% өгөгдөл) дээр үнэл — 75-85% нарийвчлалтай. (3) Хэрэв 70% доошоо бол дүрэл буцаа. | Logistic regression нь: (1) хялбар, (2) өгөгдлийн шатлалд хүч (6125 бодлого × 359 сур = сум дөрөвдөв өгөгдөл), (3) үнэлэх энгийн, (4) хүүхэл үзүүлэлт өндөр. GPU хэрэхгүй → $100-200 зардал. |
| medium | S | Нээлттэй эхийн лицензийг сонгох. Өмнөөс: (1) Python/Scikit-learn (BSD-3, арилжаа OK). (2) Qwen/Llama (Apache-2.0, арилжаа OK). (3) Үг БУЙ: GPL ашиглахгүй (нээлттэй өртөл хэрэгтэй). | Pi.mn сургалтын үйлчилгээ нь бизнес, гэхдээ эзэнийг гараар төлүүлэхэд GPL хорих нь. Apache-2.0 ба MIT нь эргүүлэлтээ хүлээдүүл. |

<details><summary>Эх сурвалж (42)</summary>

- https://workos.com/blog/why-most-enterprise-ai-projects-fail-patterns-that-work
- https://qconsf.com/presentation/nov2024/why-most-machine-learning-projects-fail-reach-production-and-how-beat-odds
- https://timspark.com/blog/why-ai-projects-fail-artificial-intelligence-failures/
- https://martin.zinkevich.org/rules_of_ml/rules_of_ml.pdf
- https://www.pionero.io/en/best-practices-for-machine-learning-engineering/
- https://mikecarruego.medium.com/choosing-the-right-algorithm-machine-learning-vs-heuristics-dc0b65e97d98
- https://www.geeksforgeeks.org/machine-learning/rule-based-system-vs-machine-learning-system/
- https://medium.com/@khayyam.h/my-framework-for-choosing-between-rule-based-and-ml-based-systems-5c3f4cc27212
- https://towardsdatascience.com/when-not-to-use-machine-learning-14ec62daacd7/
- https://arxiv.org/pdf/2411.09492
- https://github.com/topics/mongolian
- https://github.com/multilingual-dh/nlp-resources
- https://www.gmicloud.ai/en/blog/gpu-cloud-pricing-comparison-for-ai-inference-2025
- https://dev.to/heckno/i-tested-9-serverless-gpu-providers-for-ai-inference-in-2026-heres-what-id-actually-use-4cf4
- https://www.spheron.network/blog/ai-inference-cost-economics-2026/
- https://blogs.vorecol.com/blog-adaptive-learning-pathways-how-ai-algorithms-can-predict-and-enhance-student-performance-196757
- https://files.eric.ed.gov/fulltext/ED646968.pdf
- https://arxiv.org/pdf/2402.01666
- https://arxiv.org/pdf/2508.07107
- https://arxiv.org/pdf/2511.15163
- https://developers.google.com/machine-learning/crash-course/production-ml-systems/deployment-testing
- https://www.pecan.ai/blog/ml-model-evaluation-reliability-performance/
- https://www.getmaxim.ai/articles/building-reliable-llm-applications-from-manual-validation-to-automated-testing
- https://galileo.ai/blog/best-practices-for-ai-model-validation-in-machine-learning
- https://arxiv.org/pdf/2605.23925
- https://the-learning-agency.com/the-cutting-ed/article/case-study-math-misconceptions-competition/
- https://arxiv.org/pdf/2205.15219
- https://arxiv.org/pdf/2602.00070
- https://www.truefoundry.com/blog/all-about-license-for-llm-models
- https://github.com/eugeneyan/open-llms
- https://wcr.legal/monetizing-open-source-llms-licensing-guide/
- https://wcr.legal/oss-licenses-vs-ai-model-licenses/
- https://local-ai-zone.github.io/guides/ai-model-licensing-complete-legal-guide-2025.html
- https://www.dreamhost.com/blog/open-source-ai/
- https://www.siliconflow.com/articles/en/the-cheapest-open-source-LLM-hosting
- https://infinum.com/blog/self-hosting-ai-models-a-practical-guide/
- https://medium.com/@mkann/important-frameworks-in-building-self-hosted-open-source-gen-ai-inference-6c4af2515c79
- https://arxiv.org/pdf/2509.23996
- https://www.researchgate.net/publication/313826391_Data-Driven_Personalization_of_Student_Learning_Support_in_Higher_Education
- https://www.madcapsoftware.com/blog/big-data-for-personalized-learning-and-development/
- https://arxiv.org/pdf/2512.24362
- https://www.triconinfotech.com/insights/ai-in-education-first-party-data-strategy-for-learning/

</details>

---
