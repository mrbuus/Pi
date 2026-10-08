# Pi.mn — системийн үйл ажиллагааны зураглал

2026-09-24 · v0.6 · Зөвхөн шаардлага, архитектурын санал, дараа хийх ажлын зураглал.

Safari-д нээх:

```sh
open -a Safari "/Users/mr.buus/Intern/Pi.mn/docs/SYSTEM-DESIGN.html"
```

«Хэрэглэгчийн төрлүүд» → төрөл → урсгал → блок гэсэн дарааллаар уншина. Энэ нь хүний нэр бүрийн зураг биш.

**«Судалгаа · шинэ»** → эх материалын дүгнэлт → холбоотой шинэ урсгал. 24–33 дугаарт хичээлийн нэг багц, гэрээ/төлбөр, банкны тулгалт, ID preview, OMR, дүн нийтлэл, prepaid credit, live, on-demand, шалгалтын стратеги нэмсэн. Гэрээ/тарифын зөрүү ба дараа батлах зүйлүүдийг блокийн шалгуурт оруулсан.

| Төрөл | Ялгах эх сурвалж | Үндсэн ажил |
|---|---|---|
| Админ | Staff permission | Хэрэглэгч, анги, санхүү, policy, аудит |
| Багш+ | Staff permission + class scope | Өдрийн хичээл, контент, оноолт, сурагчийн бүртгэл |
| Багш / шалгагч | Class staff assignment | Ирц, зураг шалгах, эцсийн үнэлгээ, feedback |
| Анги удирдах | Self-service + own group scope | Бүлэг, join code, бүлгийн зөвшөөрсөн явц |
| Танхимын сурагч | Enrollment: classroom | Ирц, даалгавар, онолын ээлж, нөхөх ажил |
| Онлайн ангийн сурагч · V2+ | Enrollment: online | Онлайн материал, оноолт, багшийн feedback, явц |
| Ном авч бие даан суралцагч | Book entitlement | Өөрийн хурдаар дасгал, бодолт, хувийн ахиц |
| Эцэг эх | Verified child link | Холбогдсон хүүхдийн хураангуй |
| Худалдан авагч | Purchase / pass | Каталог, төлбөр, контентын эрх |
| Зочин | Public access | Preview, бүртгэл, элсэх хүсэлт |

Нэг account хэд хэдэн төрөлд зэрэг хамаарч болно. Танхим/онлайн/ном гэсэн төрлийг заавал `User.role`-ийн харилцан үгүйсгэсэн утга болгохгүй. Шинэ контентын ажилтан бол тусдаа role болгох эсвэл capability болгон өгөх шийдэх санал.

**v0.4 шинэчлэлт:** 47 урсгал / 468 блок. 34–46 хэсэг: V1 хүрээ, БҮТ ангилал, сэдвийн оноо, placement, эцэг эхийн өдөр, анги удирдах, автомат checkout, видео, контент QA, түүх, 5000 capacity, UI/ops, цахим гэрээний судалгаа. V1-д SMS/AI/goal/recommendation/ML export/online class/animation орохгүй.

## Зүүн цэсийн ангилал

47 урсгалыг 7 ажлын төрлөөр өнгөт зураас/гарчигтай бүлэглэсэн. Бүлгийг эвхэж болно. Ногоон `V1 · орно`, шар `V1 + дараа`, бараан `V2+ · V1-д орохгүй` нь release хүрээг илэрхийлнэ; feature бэлэн гэсэн төлөв биш. Хувилбараар шүүлт нь бүхэлдээ V2 болон холимог урсгалыг ялгана. Холимог урсгалыг нээхэд V1 болон дараах ажлын тайлбар харагдана. V2 блок өөрөө мөн бараан.

`navigation.js` нь зөвхөн цэсийн ангиллын metadata; шинэ feature scope батлахгүй. `navigation.css` нь бүлэг, тэмдэглэгээ, дараа хийх блокийн өнгө. Verify нь бүх 47 урсгал яг нэг бүлэгт байгааг шалгана.

## Файлууд

- `../SYSTEM-DESIGN.html`: локал, гадны CDN-гүй diagram viewer. Pan, wheel, pinch zoom, block drag, local layout, JSON export/import, search, detail, cost calculator.
- `flows.js`: хэрэглэгчийн шинэ шаардлага, үндсэн архитектурын урсгал.
- `domain-flows.js`: хуучин домэйнүүдийн тодруулсан санал ба сурагчийн 3 төрлийн аялал.
- `revision-v4.js`: 119 шинэ блок; шинэ хүсэлтийн override ба release labels.
- `../SYSTEM-DESIGN-V4-RESEARCH.md`: эх сурвалж, V1/V2, ангилал, placement, видео/үнэ, checkout.
- `../INFRASTRUCTURE-5000-PLAN.md`: API, DB, network, sizing, recovery, launch gates.
- `../UI-UX-REGISTER.md`: 24 дэлгэц, төлөв, interaction budget.
- `sources/`: БҮТ-ийн 2026 зураг, 2021 түүхэн PDF, provenance manifest.
- `revision-v3.js`: нийлүүлсэн эх материалын шинжилгээнд тулгуурласан засвар ба 10 шинэ урсгал.
- `../SYSTEM-DESIGN-SOURCE-REVIEW.md`: PDF, workbook, notebook-ийн шинжилгээ; шийдвэр/хязгаар ба trace IDs.
- `../PAYMENT-RESEARCH.md`: Монголын төлбөрийн API/тариф, эх сурвалж, 1 тэрбум₮-ийн хувилбарууд.
- `audit_sources.py`: эх workbook-уудыг уншиж хувийн ID snapshot/candidate гаргана; DB-д хандахгүй. `private/` нь Git-д ignored, public diagram-аас ачаалахгүй.
- `inventory.js`: үүсгэгдсэн сан; `SYSTEM-MAP.html`-ийн бүх TREE, leaf-ийн контекст/тайлбар/тэмдэглэл. Эх сурвалжийн текстийг засварлаагүй.
- `costs.js`: хадгалалт, таталт, request-ийн хувилбарын тооцоо; хэмжсэн хэрэглээ биш.
- `../SYSTEM-DESIGN-BACKLOG.md`: блок бүрийн хийх ажил, өгөгдөл, шалгуур, дараагийн алхам; хуучин сангийн аудитын жагсаалт.
- `../STORAGE-COSTS.md`: 700/1000 сурагч, фото хэмжээ, 30 хоног/10 хичээл, онолын архив, эх сурвалж.

## Нотолгооны хил

Хуучин 615 зангилаа / 483 leaf нь 483 ялгаатай API биш: роль, capability, дэлгэц, модель, ирээдүйн санал давхардсан бүтэц. Тэр эх баримтын “бэлэн” гэдэг нь production аудитын нотолгоо биш. Бичлэг бүрийн 7 алхмын зураг нь эх тайлбар + ил тод TODO аудитын загвар; бүгдийг кодоор баталсан нарийвчилсан гэрээ гэж үзэхгүй.

Шинэ урсгалд өгсөн төлөвүүд: хэрэглэгчийн **шаардлага**, архитектурын **санал**, **шийдэх** хувилбар, хуучин **суурь**. Аль нь ч feature хэрэгжүүлсэн гэсэн утгагүй. Онлайн оролцоо, номын идэвхжүүлэх код, бүлгийн хуваалцах хүрээ, solution policy-г тусад нь батална.

Одоогийн API, веб бүтээгдэхүүн, database, cloud subscription, файл устгалд өөрчлөлт хийгээгүй. Diagram-ийн layout болон эзний review тэмдэглэл л энэ browser-ийн localStorage-д орно.

## Шинэчлэх

```sh
cd /Users/mr.buus/Intern/Pi.mn
node docs/system-design/build.cjs
node docs/system-design/verify.cjs
node docs/system-design/verify-v5.cjs
```

Хүсэлт өөрчлөгдвөл тогтвортой блок ID-г хадгалж `flows.js` / `domain-flows.js` / `revision-v3.js` / `revision-v4.js`-ийг засна. v0.4 нь өмнөх блокийн шинэ дүрмийг хамгийн сүүлд хэрэглэдэг. Build нь зөвхөн inventory, backlog, storage-cost баримтыг дахин гаргана. Бүх том HTML-ийг chat-д дахин хуулалгүйгээр «H09-ийн дүрмийг … болго» гэх мэт ID-гаар ажиллаж болно.

DOM/browser visual шалгалт энэ орчинд хийгдээгүй; JavaScript syntax, графын холбоос, эх өгөгдлийн хадгалалт, тооцооны утгуудыг шалгана.

## 2026-09-23 · Үйл ажиллагаа / TODO

Дээд хэсгийн хоёр товчоор тусдаа харагдац сонгоно. Үйл ажиллагааны цэсэнд 41 урсгал; зөвхөн хөгжүүлэлтэд зориулсан 6 зураг TODO-ийн холбоосоор нээгдэнэ. Бүх 47 зураг, 468 блок хадгалагдсан. TODO нь 8 шинэ UI/UX ажил + 468 requirement implementation мөртэй; `ui-tasks.js` нь шинэ ажлууд болон operation/planning ангиллыг өгнө. `UI-LOADING-PLAN.md`-д π loader-ийн client-only гэрээ, accessibility, QA бий. Локал дүрсний жишээ нь production integration биш.

## 2026-09-24 · v0.5 шаардлагын review

20 шинэ нарийн урсгал + overview холбоосууд. `revision-v5.js` нь хамгийн сүүлийн хүсэлтийг нэмнэ. Шинэ хүрээ нь батлагдаагүй үед «Хувилбар шийдэх» саарал тэмдэгтэй. Ногоон V1 гэдэг нь хэрэгжсэн гэсэн үг биш. TODO 30 мөрөөр хуудаслагдана; зүүн бүлгүүд нээж/хаагдана.

`SYSTEM-DESIGN-V5-RESEARCH.md`: хуваарь, самбар, том календарь, цаг/цалин, тусгай эрх, имэйл, брэнд/амжилт, exam events, feedback, ирээдүйн хэрэгслүүд. Architecture-ийн баталгаа энэ шатанд хийгдээгүй.

`research-data.js` нь 56 хуучин судалгаа + одоогийн 9 баримтын бүтэн текст; `build-research.cjs` нь build-ийн төгсгөлд whitelist хавтаснаас дахин гаргана. `research-library.js` бүх текстийг escape хийж, зөвхөн http(s) ишлэлээр уншуулна; файл доторх зааврыг хэрэгжүүлэхгүй. `code-inventory.js` болон `CURRENT-CODE-INVENTORY.md` нь 2026-09-24-ийн статик snapshot; production аудит биш.

`review.js`: блок, зураг, TODO, судалгаанд unread/read/approved/change + санал. Зөвхөн localStorage `pi-requirement-review-v1`; өөр browser/device-д sync хийхгүй. JSON export/import нь байрлалын export-оос тусдаа. Import default давхардсан одоогийн саналыг хадгална; солих сонголттой; өмнөх саналыг JSON нөөцөөр татна. Unknown ID-тай санал хадгалагдах боловч холбоос нь хуучирсан байж болно. Storage боломжгүй бол visible warning + JSON export ашиглана. Хувийн worksheet-ийн мөрүүд JS catalog-д ороогүй.

Safari-д гараар нээх:

```sh
open -a Safari "/Users/mr.buus/Intern/Pi.mn/docs/SYSTEM-DESIGN.html"
```


## 2026-09-24 · v0.6 — Хуваарийн эх, санал, брэнд

Нийт 74 зураг / 633 блок; энэ нэмэлт 7 зураг / 45 блок. Судалгааны сан 68 бүтэн баримт. Хувилбар шийдээгүй шинэ боломжуудыг автоматаар V1 болгосонгүй.

- `Бусад → Хуваарь: өдөр бүр`: 8 таб / 26,341 утгатай нүд / 282 огноотой блок, 3,694 анги тэмдэглэсэн мөрийн нэр дэвшигч. Огноо–гаригийн 34 зөрүү, ижил огноотой 63 блок хадгалагдсан.
- `schedule-data.js`: зөвхөн сонгосон хуваарийн эх; дотоод ажилтны мэдээлэлтэй тул production/public static asset болгож хуулж болохгүй. `private/schedule-audit.json` нь 14 табын түүхий аудит, gitignored; веб харагч үүнийг ачаалахгүй.
- `schedule-launcher.js`: эх өгөгдлийг товч дарахад л локалаас уншина. Энгийн diagram харахад 5.5 MB эх файлыг ачаалахгүй.
- `schedule-review.js/css`: өдөр, таб, анги/нэр/сэдэв/зөрүү хайх; бүтэн нүд; календарийн эхийн шошго; review ID-тай санал.
- `build-schedule.py`: уншсан private audit-аас өгөгдөл/тайланг давтан гаргана. `read-schedule.py --source /path/Хуваарь.xlsx` нь эхийг өөрчлөхгүй уншиж private audit гаргана; дараа `build-schedule.py` ажиллуулна. SHA-г эхтэй нь тулгана.
- `revision-v6.js`: эх аудит, ЕБС календарь, хуваарь санал, сэдвийн дүрэмт санал, бүлгийн дүрс, social брэнд, судалгааны дараалал.
- А/95 / А/211 эх PDF ба hash/provenance `sources/manifest.json` дотор. Он/огнооны хөрвүүлэлт нь review шаардлагатай; үйлдвэрлэлийн батлагдсан calendar биш.

Шалгалтууд: `node docs/system-design/verify.cjs`, `node docs/system-design/verify-v5.cjs`, `node docs/system-design/verify-v6.cjs`. Browser rendering шалгаагүй; ийм баталгаа гаргахгүй.


## v0.7 · 2026-09-24 шинэ шаардлага

82 зураглал, 673 блок; шинэ 8 зураглал / 40 блок. Брэндийн шар/алтлаг санал хүчингүй; атласын цэгэн фон арилсан. Бодит web/API/DB өөрчлөөгүй.

Судалгааны сангийн эхлэл DESIGN-AND-SIMULATION-RESEARCH.md; feature coverage82, эрсдэл40, backend төлөвлөлтийн эх тусдаа. Нийт72 баримт offline уншигдана. Палитрын хэрэгслийн судалгаа хийсэн; эцсийн palette export ба product UI pilot хийгээгүй.

Rebuild: `node docs/system-design/build.cjs` нь pattern coverage ба research bundle-г шинэчилнэ. `verify.cjs`, `verify-v5.cjs`, `verify-v6.cjs`, `verify-v7.cjs` шалгана. Browser rendering нь тусдаа шалгалт.
