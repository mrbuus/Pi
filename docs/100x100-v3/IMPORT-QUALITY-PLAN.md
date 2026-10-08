# Математикийн тестүүд 1-р дэвтэр — чанартай импортын төлөвлөгөө

> Төлөв: **import хийхээс өмнөх баталгаажсан төлөвлөгөө**. Энэ баримтын аль ч
> `PASS` хаалгыг даваагүй өгөгдлийг production ӨС-д бичихгүй.
>
> Эх сурвалж: `/Users/mr.buus/Desktop/Books/100x100 V3/`.
> Хамрах нэр: **Математикийн тестүүд 1-р дэвтэр**. Одоогийн `100x100`
> (V2, 1,974 бодлого)-г огт өөрчлөхгүй; энэ нь тусдаа `Book` байна.

## 1. Яагаад хуучин V3 оролдлогыг дахин ашиглаж болохгүй вэ

2026-08-26-ны V3 JSONL нь PDF-ийн зурагнаас OCR хийсэн гаралт. Тэнд математикийн
тэмдэг болон монгол үсэг буруу танигдсан нь батлагдсан тул `import-ready.jsonl`
нь **лавлагаа/харьцуулалт** л болно, импортын эх биш. Түүнчлэн хуучин
`import-100x100-v3.cjs` нь хариугүй бодлогыг дүгнэхэд боломжтой мэт хадгалж,
зарим object хэлбэрийн сонголтыг одоогийн grading/UI гэрээнд буруу өгнө.

Шинэ pipeline-ийн цорын ганц агуулгын эх нь Word `.docx`; PDF нь харагдацын
тулгалт, A/B answer PDF нь хариуны түлхүүр байна.

## 2. Чанарын гэрээ

Нэг бодлого `READY_FOR_REVIEW` болохын тулд доорх БҮГД үнэн байна.

1. Эх сурвалж, файл, SHA-256, тест, хувилбар, бодлогын дараалал нь хадгалагдсан.
2. Word-ийн OMML томьёо нь canonical LaTeX болсон; unicode математик glyph,
   `\bullet`, raw `×`, алдагдсан зэрэг байхгүй.
3. Монгол өгүүлбэр, томьёо, A–E сонголт, хариуны нүх, зураг/диаграмм нь эх PDF-тэй
   нүдээр тулгагдсан.
4. A/B хариуны PDF-тэй бодлогын тоо, label, бүх зөв хариу яг таарсан.
5. Нэг л зөв сонголттой `CHOICE` бодлогод `ProblemChoice` мөрүүд тус тусдаа
   хадгалагдсан; олон-нүхтэй бодлогод slot тус бүрийн canonical хариу хадгалагдсан.
6. Математикийн шийдэл нь бие даан шалгагдсан бөгөөд хариуны түлхүүртэй таарсан.
7. Багшийн хараагүй анализ хэзээ ч `VERIFIED` болохгүй. Автомат/agent гаралт
   `AUTO_DRAFT` эсвэл `REVIEW_REQUIRED` л байна.

### Эхний source audit-ийн бодит үр дүн

`inventory-100x100-v3-source.cjs`-ийн raw read-only audit-аар 93 content DOCX,
91 test PDF, 2 answer-key PDF, 12,883 OMML equation, 1,974 drawing,
261 embedded media илэрсэн. Duplicate candidate-ийг хасаад canonical corpus
нь 8,625 top-level OMML node-той 92 test × A/B, 1,632 numbered question
record гэж урьдчилан тоологдсон.

- `Тоо-тоолол-3..docx` нь PDF хосгүй. OMML эх нь байгаа ч independent visual
  reference дутуу тул generated PDF + staff review-гүйгээр publish хийхгүй.
- `Тэнцэтгэл биш-13.docx` болон `Тэнцэтгэл-биш-13..docx` нь давхардсан/өөр
  package байж болзошгүй. PDF-тэй хослосон hyphenated файлыг candidate canonical
  болгож, content hash ба хүнээр тулгана.
- Answer key нь Rational inequalities Test 13 A/B-г агуулаагүй. Энэ 20 асуулт
  `manualReview` хэвээр байна; solver-ийн хариуг автоматаар production key
  болгохгүй.
- B key дотор Irrational equations-ийн нэг мөр `Тест 6-A` гэж харагдах тул
  variant mapping-ийг candidate гэж үзэж, Word/PDF/answer гурваар батална.

Түр Word lock файл (`~$…docx`) нь source биш; manifest-д тусад нь анхааруулга
болж орно.

## 3. Canonical content package

Эх файлыг шууд ӨС рүү уншихгүй. Эхлээд gitignore-д үлдэх, version-тэй
`content-package` үүснэ. Нэг мөр = нэг бодлого, тусдаа asset manifest-тэй.

```text
source file + source PDF + answer-key PDF
  → OMML-aware extractor
  → raw provenance package
  → canonical LaTeX + structured choices/slots/assets
  → deterministic QA
  → independent mathematical review
  → teacher review queue
  → idempotent DB importer
```

Заавал хадгалах талбар:

```json
{
  "source": {"docx": "…", "pdf": "…", "sha256": "…", "page": 1},
  "identity": {"book": "Математикийн тестүүд 1-р дэвтэр", "topic": "…", "test": 1, "variant": "A", "number": 1},
  "content": {"statementLatex": "…", "format": "CHOICE", "choices": []},
  "answer": {"kind": "choice", "correctLabel": "B", "keySource": "answer-A.pdf"},
  "assets": [],
  "review": {"parseStatus": "PASS", "visualStatus": "PENDING", "mathStatus": "PENDING"}
}
```

Хадгалах package нь эхийн агуулгыг агуулдаг тул public GitHub-д орохгүй.
Харин скрипт, schema, тест, тайлан, агуулга агуулаагүй manifest нь commit-д
орж болно.

## 4. ӨС-ийн зорилтот зохион байгуулалт

Одоогийн `Book → Chapter → Problem → ProblemChoice/ProblemAnalysis` суурийг
ашиглана. Номын V2 хувилбарын ID, token, Test, Attempt, Analysis дээр
`UPDATE`/`DELETE` хийхгүй.

Шинэ номд дараах нэмэлт бүтэц хэрэгтэй:

- **Import provenance**: source файл, checksum, page/range, extraction хувилбар,
  visual-QA-ийн үр дүн. Ингэснээр алдаа гарвал эх сурвалж руу нэг алхмаар очно.
- **Answer slots**: олон-нүхтэй бодлогод нүх бүр (`a`, `b`, …), харагдах дараалал,
  зөв canonical утга, формат/validation. Нэг нийлүүлсэн string хадгалахгүй.
- **Structured solution**: арга тус бүр, алхамуудын дараалал, LaTeX өмнөх/дараах
  илэрхийлэл, тайлбар, хэрэглэх нөхцөл, шалгалт. `solutionOutline`-оор ганц
  догол мөр хадгалах нь ML болон UI-д хангалтгүй.
- **Misconception/risk**: буруу сонголт эсвэл хариунд хүргэдэг алдааны төрөл,
  яг яагаад, хаана гардаг, confidence, human review status. Энэ нь trait label
  биш; зөвхөн бодлогын эрсдэл/оношлогооны дохио.
- **Assets**: график/зураг бүр эх PDF-ийн crop, alt text, source page, checksum,
  width/height, review status-тай байна. Зургийг LaTeX текстээр таамаглан
  орлуулахгүй.

Эдгээрийг migration, API DTO, grading, тестийн UI, content editor-ээр **нэг
гэрээ** болгон оруулна. Нэг зөв хариуны хоёр давхар source (`choices` JSON ба
`ProblemChoice`) үүсгэхгүй; canonical source нь `ProblemChoice`/`AnswerSlot`.

## 5. Олон-нүхтэй хариуны UX

Эх бичвэрт байгаа нүхийг slot metadata-гаар рендерлэнэ. Нүх бүр label-тай,
том хүрэх талбайтай, дараагийн нүх рүү автоматаар шилжинэ; keyboard ба numeric
keypad хоёулаа ажиллана. `a=`, `b=` зэрэг тэмдэг нь нүдэн дээр үргэлж харагдана.

- Тест илгээхэд `{ "a": "3", "b": "54" }` хэлбэрээр slot бүрийг илгээнэ.
- Сервер slot тус бүрийг canonicalization хийж тус тусад нь дүгнэнэ.
- Алдаа байвал аль slot дутуу/бурууг хадгална; энэ нь дараагийн ML дохио болно.
- PDF дээрх мөр, багана, үсэг/тоо нөхөх хэлбэрийг зурагт баталгаажуулсны дараа
  л responsive web layout гаргана.

## 6. Дараалал ба QA хаалга

### Phase 0 — эхийн аудит

- 93 content `.docx`, хос PDF, 2 answer-key PDF-ийн checksum/хослол/хуудасны manifest.
- Word дахь OMML, drawing/media, текстийн бүтцийг тоолох.
- Нэг сэдвийн A/B тестийг түүвэр болгон Word → web preview → source PDF гурваар
  тулгах. Энэ үе ӨС-д огт бичихгүй.

### Phase 1 — extractor ба canonicalizer

- OMML-aware extractor: math mode дотор орсон монгол үгийг text mode руу гаргах,
  `\epsilon` зэрэг semantic засварыг дүрмээр шалгах, `\bullet → \cdot`.
- A/B header, problem boundary, A–E choices, fill slots, зураг reference-ийг
  алдахгүй салгах.
- Хариуны PDF-г тусдаа parser-аар задлаад source test/variant/problem-той
  тулгана. Тоо нь зөрвөл тухайн test бүрэн BLOCKED.

### Phase 2 — автомат шалгалт

- schema validation; unique identity; source↔output cardinality; missing answer;
  нэгээс олон/тэг зөв choice; slot completeness;
- LaTeX lint; кирилл OCR lint; forbidden glyph; balancing; KaTeX render;
- бүх asset reference бодитой эсэх; output preview snapshot;
- random биш risk-based sampling: бүх зурагтай, бүх FILL, бүх parse-warning,
  мөн тест тус бүрээс minimum sample-ийг PDF-тэй нүдээр тулгах.

### Phase 3 — математик ба педагогикийн анализ

Бодлого бүрд хямд parallel draft → тусдаа verifier → answer-key/symbolic check
→ conflict queue гэсэн урсгал ашиглана. Agent-ийн хариу дангаараа үнэн гэж
үзэхгүй.

1. Эхлээд зөв хариуг бие даан бодно.
2. Хариуны түлхүүртэй зөрвөл `REVIEW_REQUIRED`; таамгаар засахгүй.
3. Бодох арга, хэрэглэсэн томьёо, domain/sign condition, алхам, distractor/slot
   алдаа, түвшин, эрсдэлийг structured draft болгоно.
4. Хоёр reviewer тохирсон, эсвэл багш баталсан тохиолдолд л `VERIFIED`.

### Phase 4 — багшийн review ба import

- Эхлээд нэг test A/B-ийн staging import, preview, end-to-end grading, mobile
  visual QA.
- Дараа нь topic-by-topic idempotent staging import.
- Production import хийхийн өмнө immutable import report, rollback key,
  record counts, source checksum, QA totals гарна.

## 7. Ашиглахгүй зүйл

- 2026-08-26 OCR `import-ready.jsonl`-ийг импортын эх болгохгүй.
- Unicode математикийн глиф, таамагласан зураг, fabricated solution/answer,
  unreviewed agent analysis, raw `fetch`, public repository дэх номын content.
- `SELF_STATE`-ийг бодит чадварын ганц үнэн гэж үзэхгүй.

## 8. Done гэсэн тодорхойлолт

Ном бүхэлдээ `done` болох нь зөвхөн бодлогын тоо орсон гэсэн үг биш. Дараах
тайлангүйгээр done гэж хэлэхгүй: source/output count, answer-key coverage,
LaTeX/KaTeX pass rate, image coverage, parse/review queue, математик
cross-check, teacher-verified count, test-taking/mobile screenshot QA,
staging import + rollback proof.
