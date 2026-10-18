# Гэрийн даалгаврын зураг, PDF хадгалалт, багшийн шалгалт: судалгаа

Огноо: 2026-10-17. Хамрах хүрээ: сурагч гар бичмэл даалгаврыг 1–5 хуудас зураглаж илгээнэ, сервер дээр PDF болж хадгалагдана, багш ~40 ажлыг PDF viewer-ээр шалгаж Хийсэн / Дутуу / Хийгээгүй тэмдэглэн хувийн сэтгэгдэл үлдээнэ.
Тэмдэглэгээ: [Э] = эх сурвалжаар баталгаажсан, [Т] = тооцоо / таамаглал, [?] = баталгаажаагүй, жинхэнэ утсаар турших шаардлагатай.

## 0. Товч дүгнэлт

- Сонголт: **(A) хөтөч дээр шахаж PDF болгоод S3 рүү шууд (presigned POST) илгээх**. API зөвхөн URL гарын үсэг зурна, метадата хадгална, PDF-ийг шалгана.
- 1 хуудас ≈ 250 KB (150–400), 1 ажил ≈ 0.77 MB. Хөтөч шахалтгүй бол 12 MB орчим тул сул 4G дээр 16 дахин удаан, найдваргүй.
- 700 сурагчийн жилийн хэмжээ ≈ 53 GB, 2000 сурагчийнх ≈ 150 GB. S3 нийт зардал 700 сурагчид сард ~$1.5 (жил 1), ~$4 (жил 3); 2000 сурагчид ~$4 -> ~$12 (бүгд Standard). Гарах дата (16–45 GB/сар) AWS-ийн 100 GB/сар үнэгүй хэмжээнд багтана.
- Postgres дотор bytes хадгалах нь хамгийн том эрсдэл (5–10 дахин үнэтэй, backup/restore удаан, API санах ойд бүтэн файл ачаална). S3 рүү шилжих хэрэгтэй.
- Эргүүлэлт: **метадата (pageRotations)** эх сурвалж болгож viewer дээр хэрэглэнэ, PDF-ийг дахин бичихгүй. Татаж авах үед л pdf-lib-ээр бүрэн хэрэглэнэ.

## 1. Оролтын формат

| Эх үүсвэр | Үндсэн формат | Хөтөчид ирэх зүйл | Төлөв |
|---|---|---|---|
| iPhone (iOS 11+) | HEIC ("High Efficiency" өгөгдмөл) | Safari нь `accept="image/jpeg,..."` үед HEIC-ийг JPEG болгон хөрвүүлнэ [Э] Apple forum; `image/*` үед ижил байх магадлалтай | [Э] / `image/*` [?] |
| Samsung Galaxy | JPEG; "High efficiency pictures" асаавал HEIC | Chrome Android HEIC-ийг хөрвүүлэхгүй, эх файлыг өгнө | [?] тохиргооны зам [Э], Chrome-ийн зан үйл [?] |
| Xiaomi / Oppo / Huawei | Голдуу JPEG, зарим загварт HEIF сонголт | JPEG; HEIC бол дээрхтэй адил | [?] 5 утсаар турших |
| Дэлгэцийн зураг | PNG (1–3 MB) | PNG | [Т] |
| Татсан / мессенжерээс | WebP, JPEG | WebP, JPEG (Safari 14+, Chrome дэмжинэ) | [Т] |

Тодорхой дүгнэлтүүд:
- iOS-д `accept="image/heic"`-ийг **бүү оруул**. Apple forum-д Safari 17+ JPEG/PNG файлыг HEIC болгон хөрвүүлдэг гэж мэдээлсэн [Э]. Энгийн `accept="image/*"` ашигла.
- `capture="environment"` нь зөвлөмж (hint) бөгөөд нэг зураг авдаг, desktop-д үл тоомсорлоно [Э] MDN. Тиймээс 2 товч: "Камер" (capture, "хуудас нэмэх" давталт) ба "Галерей" (`multiple`).
- Chrome HEIC-ийг ямар ч хувилбарт `<img>`-д дэмждэггүй, зөвхөн Safari дэмжинэ [Э] testmuai, dpreview. Тиймээс хөтөч дээр `createImageBitmap(file)` амжилтгүй бол л `heic2any` (lazy, 333 KB gzip) ачаална.
- Серверт HEIC хөрвүүлэх нь хэцүү: sharp-ийн урьдчилан бүтээсэн binary-д libheif/HEVC **ороогүй**, патентын шалтгаанаар хэзээ ч орохгүй [Э] sharp#1105. Өөрөө libvips+libheif+libde265 бүтээх шаардлагатай. Энэ нь клиент талын шийдлийг дэмжих гол шалтгаануудын нэг.
- EXIF эргүүлэлт: `createImageBitmap` нь `imageOrientation: "from-image"`-ийг өгөгдмөлөөр ашигладаг [Э] MDN. Canvas-д зурж JPEG болгоход EXIF (GPS мөн) арилж, эргэлт шууд хийгдсэн байна. Нэмэлт privacy ашиг.

## 2. Pipeline харьцуулалт

| Шалгуур | A: клиент дээр PDF, S3 рүү шууд | B: зураг API руу, сервер хөрвүүлнэ | C: зураг хадгалж PDF-ийг хүсэлтээр |
|---|---|---|---|
| Upload хэмжээ / ажил | ~0.77 MB | ~12 MB (3 × 4 MB JPEG), HEIC ~6 MB | ~0.77 MB (хуудас тус бүр) |
| Сул сүлжээний найдвар | Сайн: жижиг файл, нэг POST, retry | Муу: 12 MB нэг хүсэлт, таслагдвал эхнээс | Сайн: хуудас бүр тусдаа retry |
| API CPU | ~0 (зөвхөн PDF шалгах, ~20 ms) | 3 × (decode + resize + encode) ≈ 0.4–1 vCPU-сек / ажил [Т] | Хүсэлт бүрт PDF угсрах |
| API санах ой | Бага | 48MP decode ≈ 200 MB / хуудас, зэрэгцээ 4 → ~0.8 GB [Т] | Дунд |
| HEIC | Safari хөрвүүлнэ, үлдсэнийг heic2any | Өөрийн libvips бүтээх хэрэгтэй | Адил B |
| Нарийн төвөгтэй байдал | Дунд (клиент код) | Бага-дунд, гэхдээ ачаалал/санах ойн хяналт | Өндөр (хоёр хэлбэр) |
| Чанарын хяналт | Хэрэглэгч preview-ээр шалгана, эргүүлж/устгаж/дараалал өөрчилнө | Сервер дахин шахна, хэрэглэгч харахгүй | Сайн |
| "PDF хадгалах" шаардлага | Биелнэ | Биелнэ | Зөвхөн дараа нь үүснэ (архив нь PDF биш) |
| Viewer | PDF.js | PDF.js | `<img>` жагсаалт (хамгийн хурдан) |

Дүгнэлт: серверийн CPU 700 сурагчид B-г боломжтой болгодог (§6), гэхдээ A нь **upload-ын хэмжээ 16 дахин бага**, HEIC асуудлыг серверээс холдуулна, API-г blob дамжуулалтаас чөлөөлнө. C нь UX-ээр хамгийн сайн (PDF.js-гүй), гэхдээ эзний "PDF болгож хадгал" шаардлагатай зөрчилдөнө. Зөвхөн A үнэ цэнэтэй.
Нөөц (fallback): клиент PDF үүсгэж чадахгүй бол түүхий JPEG-үүдийг `/uploads/fallback` руу (B-lite, sharp + pdf-lib) илгээнэ. Үүнийг эхний үед **бүү бич**, телеметрээр бүтэлгүйтэл >2% гарвал нэм.

## 3. Хэмжээ

Синтетик туршилт (12 MP 3024×4032 цаас, гар бичмэл фонт, шугам, гэрлийн градиент, gaussian noise σ=3 ба 6, PIL, optimize=True) [Т]. Бодит зураг (сүүдэр, цаасны бүтэц, өнгөт үзэг) +30–60% их байж болно.

| Урт тал | q60 | q70 | q80 | Саарал q70 |
|---|---|---|---|---|
| 1600 px | 124 KB | 142–147 KB | 175–193 KB | 123–128 KB |
| **2000 px** | 163–166 KB | **185–200 KB** | 231–274 KB | 156–171 KB |
| 2400 px | 209–220 KB | 239–274 KB | 301–379 KB | 198–232 KB |
| (эх 12 MP, q92) | 1.5–1.9 MB | | | |

- Зөвлөмж: **урт тал 2000 px, JPEG q=0.72**, сул сүлжээнд 1600 px сонголт. 1600 px нь A4 дээр ~136 dpi, нарийн томьёо/зэрэг бүдгэрч болзошгүй тул 2000 px (~170 dpi) илүү найдвартай [Т].
- Төлөвлөх тоо: **250 KB / хуудас** (150–400), дундаж 3 хуудас, ажил = **0.75 MB PDF + 20 KB thumbnail ≈ 0.77 MB**. PDF-д JPEG шууд (DCTDecode) орох тул нэмэлт ≈ 1–3 KB / хуудас.
- Thumbnail: **хэрэгтэй**, зөвхөн 1-р хуудасны 480 px, q0.6 ≈ 20–25 KB, клиент үүсгэж PDF-тэй хамт илгээнэ (серверт зургийн боловсруулалт хэрэггүй). Жагсаалтад 40 ширхэг ≈ 1 MB, зөвхөн харагдах үед ачаална.
- Webp/AVIF-ийг PDF-д шууд оруулах боломжгүй тул JPEG.

Хэмжээний тооцоо (10 ажил / сурагч / сар = 13 хичээл × 80% хүлээлгэн өгөлт, 10 сар / жил) [Т]:

| Үзүүлэлт | Үндсэн | Хамгийн муу (13 ажил/сар, 5 хуудас × 400 KB) |
|---|---|---|
| Сурагч тутам / сар | 7.7 MB | 26 MB |
| Сурагч тутам / жил | 77 MB | 262 MB |
| Төв, 700 сурагч / жил | **53 GB** | 180 GB |
| Төв, 2000 сурагч / жил | **150 GB** | 513 GB |

## 4. Зардал (USD / сар), AWS ap-east-1 (Хонг Конг)

Үнэ: AWS Price List API, 2026-10-17-нд татсан (S3, EC2 2026-10-15; CloudFront 2026-10-03; RDS 2026-10-06; Data Transfer 2026-09-16). URL-ууд төгсгөлд.

| Нэгж | Үнэ |
|---|---|
| S3 Standard (эхний 50 TB) | $0.025 / GB-сар |
| Standard-IA / Glacier Instant Retrieval / Glacier Flexible | $0.0138 / $0.005 / $0.0045 |
| PUT, COPY, POST, LIST | $0.005 / 1000 |
| GET | $0.0004 / 1000 ($0.004 / 10 000) |
| IA / GIR хандалтын хураамж | $0.01 / $0.03 / GB |
| Интернет рүү гарах дата (S3 шууд, эхний 10 TB) | $0.12 / GB |
| CloudFront Asia, эхний 10 TB; HTTPS хүсэлт | $0.12 / GB; $0.012 / 10 000 |
| S3 -> CloudFront | $0 |
| Үнэгүй: бүх AWS-ээс интернет рүү | 100 GB / сар (CloudFront тусдаа 1 TB / сар), байнгын [Э] AWS blog |
| EC2 t4g.medium / t4g.large / c7g.large | $0.0464 / $0.0928 / $0.091 цаг = **$33.9 / $67.7 / $66.4** сар |
| RDS хадгалалт (Single-AZ) / backup | $0.12 / GB-сар (Multi-AZ x2) / $0.095 / GB-сар |

Сарын зардал, үндсэн хувилбар (§3-ын таамаглал; нэг ажлыг 3 удаа үзнэ = 2.3 MB гарах дата):

| | 300 сурагч | 700 сурагч | 2000 сурагч |
|---|---|---|---|
| Ажил / сар | 3 000 | 7 000 | 20 000 |
| Хадгалалт, 1 жилийн төгсгөлд (S3 Standard) | 23 GB = $0.56 | 53 GB = **$1.32** | 150 GB = **$3.76** |
| Хадгалалт, 3 жилийн төгсгөлд (бүгд Standard) | 68 GB = $1.69 | 158 GB = $3.95 | 451 GB = $11.28 |
| ...6 сарын дараа Glacier IR болговол | $0.61 | $1.42 | $4.06 |
| PUT (2 / ажил) + GET (20 / ажил) | $0.05 | $0.13 | $0.36 |
| Гарах дата (сард) | 6.7 GB | 15.7 GB | 44.9 GB |
| ...үнэ, үнэгүй 100 GB-гүй бол ($0.12/GB) | $0.81 | $1.89 | $5.39 |
| ...үнэ, 100 GB үнэгүйтэй | **$0** | **$0** | **$0** |
| **S3 нийт, 10-р сар (жил 1)** | **$0.6** | **$1.5** | **$4.1** |
| S3 нийт, 30-р сар (бүгд Standard) | $1.7 | $4.1 | $11.6 |
| Хамгийн муу хувилбар, жил 1 (хадгалалт + дата) | $1.9 | $4.5 | $12.8 + $6.4 (дата 153 GB) |
| Харьцуулалт: RDS-д хадгалбал, жил 1 (Single / Multi-AZ) | $2.7 / $5.4 | $6.3 / $12.6 | $18 / $36 |

- **CloudFront нь үнэ хэмнэхгүй**: Asia $0.12/GB нь S3 шууд гарах үнэтэй (HK -> интернет) тэнцүү. Кэшийн ашиг бага, учир нь нэг PDF-ийг ~3 хүн нэг удаа үзнэ. Эхний үед бүү нэм. Ашиглах бол: signed cookie/URL нэмэлт нарийн төвөгтэй байдал.
- **EC2**: A дээр API нь метадата л боловсруулах тул t4g.medium ($33.9) 2000 сурагчид хүрнэ. B дээр 2000 сурагчид t4g.large / c7g.large (~$67) эсвэл тусдаа worker хэрэгтэй [Т].
- **Lifecycle**: хадгалалт ≥ 200 GB болтол нийт хэмнэлт сард $0.1–7 (2000 сурагч, 3-р жил: $11.3 -> $4.1). Нэг дүрэм л бичнэ: `ObjectSizeGreaterThan 128 KB` (thumbnail-ийг оруулахгүй) шүүлтүүртэй 180 хоногийн дараа GIR (хамгийн бага хадгалалт 90 хоног [Э] S3 storage-classes). Хойшлуулж болно. Хадгалах хугацаа (устгах бодлого) зардлаас илүү чухал, §9 асуулт.
- `AbortIncompleteMultipartUpload` 1 хоног, `pending/` prefix 1 хоногт устгах (`complete` дуудагдаагүй хоосон файл).

## 5. Багшийн шалгалтын гүйцэтгэл (40 ажил)

Сүлжээний таамаглал: Монголын медиан гар утасны татах хурд ≈ 20.6 Mbps (2025 эхэн) [Э] DataReportal / Ookla. Upload хурд, HK-ийн RTT-ийн талаар эх сурвалж олдсонгүй [?]: сул 4G = 5 Mbps, муу = 2 Mbps, RTT + TLS ≈ 0.3–0.6 сек гэж авлаа. **Монгол -> HK RTT-ийг заавал хэмжих.**

| Хурд | 1 PDF (0.75 MB) татах | 40 PDF (30 MB) | Upload A (0.77 MB) | Upload B (~12 MB) |
|---|---|---|---|---|
| 20.6 Mbps | 0.3 сек | 12 сек | | |
| 5 Mbps | 1.2 сек | 48 сек | 1.2 сек | 19 сек |
| 2 Mbps | 3 сек | 2 мин | 3 сек | 48 сек |
| 0.5 Mbps | | | 12 сек | 3.2 мин |

Ачаалах дараалал:
1. **Эхэнд зөвхөн метадата**: `GET /homework/classes/:id?date=` -> 40 мөр (сурагч, төлөв, сэтгэгдлийн сүүлийн хэсэг, pages, KB, version, pageRotations, thumbnail presigned URL) ≈ 16 KB JSON.
2. Thumbnail: `IntersectionObserver`-ээр харагдах үед (≤ 1 MB нийт).
3. Ажил нээхэд PDF-ийг **1 GET** (бүтнээр) татна, дараагийн 2 ажлыг `fetch(..., {priority:'low'})`-оор урьдчилан татна. Санах ойд ≤ 3 PDF, Cache API / Map-ийг **submissionId+version**-оор түлхүүрлэнэ (presigned URL тус бүрд өөр тул URL-аар кэшлэхгүй).
4. PDF.js: `getDocument({data})` бөгөөд хуудсыг виртуал (харагдах ±1), `devicePixelRatio` ≤ 2, `maxCanvasPixels` хязгаарла.
5. Багш ажилд 10–20 сек зарцуулдаг тул урьдчилан татах нь ихэнхдээ хангалттай. Зөвхөн 2 Mbps-д л хүлээлт мэдрэгдэнэ.

**PDF.js range request vs pre-render зураг**: PDF.js нь сервер `Accept-Ranges` + `Content-Length` (+ cross-origin бол `Access-Control-Expose-Headers`) өгвөл хэсэгчлэн татдаг [Э] pdf.js FAQ. Харин манай PDF 0.5–2 MB, JPEG-ээс тогтсон тул 3–5 range-ийн RTT нь нэг бүтэн GET-ээс удаан: `disableRange:true, disableStream:true` эсвэл `data`-аар ачаал. Pre-render хуудас зураг (хоёр дахин хадгалалт) **үнэ цэнэгүй**. PDF.js-ийн 6.x нь шинэ хөтөч шаарддаг тул хуучин Android-д `legacy` build хэрэгтэй эсэхийг турших [?]. `<iframe>`/`<embed>` PDF: iOS Safari зөвхөн 1-р хуудас, Android Chrome татаж авдаг тул [?] (түгээмэл мэдээлэл) PDF.js зайлшгүй.

Presigned GET: хүчинтэй 10–15 мин, `ResponseContentType=application/pdf`, `ResponseContentDisposition=inline`; сурагч, ангийн багш, эцэг эхийн эрхийг API шалгаж URL гаргана. Bucket нь private, SSE-S3.

**Эргүүлэлт**: `HomeworkFile.pageRotations Json` (`{"2":90}`) гэж **метадата**. Давуу тал: шууд, буцаах боломжтой, S3 дээр шинэ объект / кэш хүчингүй болгох шаардлагагүй, 2 багш зэрэг ажиллахад зөрчилгүй, аудит. Сул тал: татаж авсан / хэвлэсэн PDF буруу эргэлттэй. Шийдэл: `GET /homework/:id/export` нь pdf-lib-ээр `page.setRotation(degrees(n))` хийж (зураг дахин шахахгүй, ~20 ms) хариу өгнө. Нэмж, сурагчийн preview дээр "эргүүл / устга / дараалал" өгч эргэлтийн хэрэгцээг эхнээс нь бууруулна. PDF-д /Rotate шууд бичих нь шинэ хувилбар + дахин upload + кэш = илүү.

Багшийн үйлдэл бүр хадгалагдах: оптимист UI + 600 ms debounce + `PUT` (idempotent upsert) + IndexedDB дараалал + "хадгалагдлаа" тэмдэг; `pagehide` дээр `sendBeacon`. Сервер талд append-only `HomeworkReviewEvent` (MARK, COMMENT, ROTATE, RETURN).

## 6. Оргил ачаалал (18:00–22:00, 400 ажил)

Таамаглал [Т]: 400 ажил 4 цагт, оргил цагт 50% (200 / цаг = 0.056 / сек), 5 минутын оргил 15% (60 ажил = **0.2 ажил / сек**). 2000 сурагчид x2.9.

| | A (S3 шууд) | B (API-аар) |
|---|---|---|
| API хүсэлт (presign + complete + шалгалт) | ~4 / ажил = **0.8 req/сек** | 1 том multipart + илүү |
| API-аар дамжих дата | ~0 (метадата) | 0.2 x 12 MB = **2.4 MB/сек = 19 Mbps** (2000 сурагчид 56 Mbps) |
| S3-д орох дата | 0.15 MB/сек = 1.2 Mbps | 0.15 MB/сек (боловсруулсны дараа) |
| Серверийн CPU | PDF шалгалт ~20 ms x 0.2 = ~0.5% | 0.2 x ~1 vCPU-сек = 20% x 2 vCPU, санах ойн оргил |
| Хамгийн сул холбоо | Сурагчийн утас | API процесс, нэг instance, upload таслагдах |

S3 нэг prefix-д 3 500 PUT/сек гэсэн хязгаартай тул асуудалгүй. B 700 сурагчид ч ажиллаж болох ч санах ой, таслагдсан upload, нэг instance-д уях зэрэг нь A-г илүү болгож байна. Багшийн талд 20 багш x 0.75 MB / 20 сек ≈ 0.75 MB/сек, ач холбогдолгүй.

## 7. Кодын одоогийн байдал (api/)

- `Submission` (`prisma/schema.prisma:555`): `assignmentId+studentId` unique, `state`, **`imageKeys String[]`**, `reviewNote`, `checkedById`. `SubmissionRevision`: imageKeys-ийн бичлэг. `Assignment.imageKeys` "S3 түлхүүрүүд" гэж тайлбарласан ч бодит байдалд `StoredFile` түлхүүр.
- `DailyHomeworkMark` (`:608`): `classroomId+studentId+date` unique, `status` DONE/PARTIAL/NOT_DONE, `comment`. Багшийн Хийсэн/Дутуу/Хийгээгүй -> шууд тохирно. Файл холбоос байхгүй.
- `StoredFile` (`:2282`): `key, mime, size, bytes Bytes, ownerId`.
- `api/src/storage/uploads.controller.ts`: multer `diskStorage` -> `UPLOAD_DIR` -> **`readFileSync` хийж бүх bytes-ийг `storedFile.create`-д бичнэ** (Render-ийн түр диск тул "диск = кэш, ӨС = эх сурвалж"); хязгаар 25 MB; зураг + PDF зөвшөөрөх, magic bytes шалгах; `serve()` нь `Cache-Control: private, no-store`, Range дэмжихгүй, диск байхгүй бол `findUnique` -> `Buffer.from(bytes)`-ээр бүтнээр нь илгээнэ. API-д S3 SDK, sharp, pdf-lib байхгүй (`package.json`).
- Web (`web/package.json`): `next 16.4.0`, PDF сан байхгүй.

**Postgres / RDS-д bytes хадгалах эрсдэл:**
1. Зардал: RDS $0.12/GB-сар (Multi-AZ x2) vs S3 $0.025: **4.8x–9.6x**; backup дээр нэмэх $0.095/GB. 700 сурагч жил 1: $6.3–12.6 vs $1.3 [Т].
2. DB-ийн хэмжээ: харилцаат мэдээлэл ~сая мөр биш, жилд +53–150 GB blob -> restore, snapshot, major upgrade, `pg_dump` хэдэн дахин удаан. Устгалт / UPDATE нь TOAST bloat үүсгэнэ, `VACUUM FULL` нь хүснэгтийг түгжинэ.
3. Санах ой / холболт: `findUnique` нь бүтэн bytea-г Node санах ойд ачаална (40 багш x PDF), Prisma холболтын сангийн ачаалал; Range, streaming, CDN байхгүй.
4. API процесс нь upload (25 MB multipart) ба download-ын бүх байтыг дамжуулдаг, event loop болон EC2-ийн зурвасын өргөнийг эзэлнэ; 1 instance-д уяатай (диск + DB давхар бичих), хэвтээ масштаб боломжгүй.

**Шилжих алхам (саадгүй):**
1. `StorageDriver` интерфейс (`put/getStream/presignGet/presignPost`), key-д prefix: `s3:hw/...` эсвэл хуучин `uuid.ext` (= DB). Шинэ код S3-д л бичнэ.
2. `StoredFile`-д `storage ENUM(DB,S3)`, `s3Key?`, `bytes` -> nullable (migration).
3. Backfill job (нэг нэгээр, `select` дотор bytes-гүйгээр жагсааж, нэг мөр бүрийг дангаар уншиж `PutObject` + `HeadObject` хэмжээ тулгах), 100 мөр / багц, cron.
4. Унших замыг "S3 байвал presigned redirect, үгүй бол DB"-ээр сольж, 2 долоо хоног ажиллуулна.
5. Тулгалт баталгаажсаны дараа `UPDATE ... SET bytes = NULL`, дараа нь `pg_repack` (эсвэл засварын цонхонд `VACUUM FULL`).
6. Хуучин `/uploads/:key` эндпойнтыг шинэ файлд хаах; зураг (профайл, ном, бодлого) тусад нь шилжүүл.

## 8. Google Classroom-ийн шалгалтын UX (5 тэмдэглэл)

1. Grading tool = сурагчдын жагсаалт + том viewer; дараагийн / өмнөх товч, гар утсан дээр хажуу тийш шудрах [Э].
2. Хувийн сэтгэгдэл зөвхөн багш-сурагчид харагдана, нийтэлсний дараа засах / устгах боломжгүй (append-only), сурагч хариулж чадна [Э]. Манайд: хугацаатай засвар + аудит.
3. Comment bank: давтагддаг сэтгэгдлийг хадгалж hashtag-аар хайна [Э] -> 40 ажилд "Алхам дутуу", "Зөв" гэх хурдан chip.
4. Draft ба Return тусдаа: тэмдэглэгээ, сэтгэгдэл эхлээд ноорог, "Буцаах" дарахад л сурагчид харагдана, бөөнөөр буцаах боломжтой [Э]. Манайд: Хийсэн / Дутуу / Хийгээгүй -> "Буцаах" -> SMS мэдэгдэл (сурагчид утасны дугаартай).
5. Жагсаалтад төлөв (Turned in / Missing / Done) ба сүүлийн хувийн сэтгэгдлийн хэсэг [Э] -> мөр бүрт төлөвийн тэмдэг + thumbnail + сэтгэгдлийн товч.

## 9. Эцсийн зөвлөмж

### 9.1 Pipeline (A)
1. Сонгох: `<input type=file accept="image/*" multiple>` + "Камер" (`capture="environment"`, хуудас нэмэх давталт). Хамгийн ихдээ 5 хуудас, хуудас бүр ≤ 25 MB оролт.
2. `createImageBitmap(file, {imageOrientation:'from-image', resizeWidth})` (эсрэг бол `<img>`+canvas); алдаа бол `heic2any`-ийг lazy ачаал. Дараалан (зэрэггүй) боловсруулж `bitmap.close()` / `canvas.width=0`-оор санах ой чөлөөл.
3. Урт тал 2000 px (1600 сонголт), цагаан дэвсгэр, сонголтоор "Баримт" горим (саарал + контраст), JPEG q0.72 (`OffscreenCanvas` Worker-т боломжтой бол).
4. Preview: эргүүл / устга / дараалал өөрчил. Дараа нь `@cantoo/pdf-lib` `embedJpg` -> `addPage` (хуудасны харьцаа хадгална) -> `save({useObjectStreams:true})`; 1-р хуудасны 480 px thumbnail.
5. `POST /homework/uploads` -> API эрх, rate limit шалгаад **presigned POST** (`content-length-range 10 KB–6 MB`, `Content-Type application/pdf`, түлхүүр `hw/{classroomId}/{studentId}/{date}/{uuid}.pdf`) + thumbnail-ийн POST. **PUT биш POST**: presigned PUT хэмжээг хязгаарлаж чаддаггүй [Э] fast.io (хоёрдогч эх сурвалж).
6. Upload `XMLHttpRequest` (явц харуулна), экспоненциал retry (5 удаа), PDF-ийг IndexedDB-д "outbox"-д барьж дахин нээхэд үргэлжлүүлнэ. iOS-д Background Sync байхгүй тул "хуудсыг бүү хаа" сануулга.
7. `POST /homework/uploads/:id/complete`: `HeadObject` (хэмжээ, төрөл), эхний 1 KB-аар `%PDF-`, дараа нь PDF-ийг (≤ 6 MB) татаж pdf-lib-ээр **шалгах**: хуудас ≤ 5, зөвхөн image XObject, `/JS`, `/OpenAction`, `/Launch` байхгүй (сурагчийн оруулсан PDF итгэлгүй). Дараа нь нэг транзакцаар `HomeworkFile` version үүсгэж `SubmissionRevision` шиг түүх бичнэ.

### 9.2 Сангууд (npm, 2026-10-17)
| Сан | Хувилбар | Хаана | Тэмдэглэл |
|---|---|---|---|
| `@cantoo/pdf-lib` | 2.11.1 (2026-09) | web upload, API шалгалт, export | `pdf-lib` 1.17.1 сүүлд 2021-11-д гарсан; fork нь идэвхтэй. 217 KB gzip, зөвхөн upload хуудсанд lazy |
| `pdfjs-dist` | 6.4.299 | багшийн viewer | 131 KB gzip + worker; зөвхөн багшийн хуудсанд lazy; `legacy` build-ийг хуучин утсанд турших |
| `heic2any` | 0.0.4 (2023-03) | зөвхөн HEIC fallback | ~333 KB gzip, lazy; идэвхгүй, libheif дотор нь (LGPL) |
| `@aws-sdk/client-s3`, `s3-presigned-post`, `s3-request-presigner` | 3.1152.0 | API | HeadObject, presign |
| `sharp` | 0.35.5 | зөвхөн B-lite fallback бол | HEIC-гүй |
| `jspdf` | 4.2.1 | сонгохгүй | pdf-lib нь JPEG-ийг дахин шахахгүй шургуулдаг, шалгалт / export-д ч хэрэгтэй |
Шахалтын туслах сан (`browser-image-compression` 2.0.2, 19 KB gzip) шаардлагагүй: canvas + `toBlob` хангалттай.

### 9.3 Өгөгдлийн загвар (Prisma ноорог)
```prisma
model HomeworkSubmission {   // 1 мөр = анги + сурагч + өдөр (DailyHomeworkMark-ийн түлхүүртэй адил)
  id String @id @default(cuid())
  classroomId String; studentId String; date DateTime @db.Date
  currentFileId String? @unique
  state HomeworkFileState @default(NONE)          // NONE, UPLOADING, READY, REJECTED
  submittedAt DateTime?; returnedAt DateTime?; reviewedAt DateTime?
  files HomeworkFile[]; comments HomeworkComment[]; events HomeworkReviewEvent[]
  @@unique([classroomId, studentId, date])
}
model HomeworkFile {         // өөрчлөгдөхгүй хувилбар
  id String @id @default(cuid())
  submissionId String; version Int; s3Key String @unique; thumbKey String
  bytes Int; pages Int; sha256 String
  pageRotations Json @default("{}")              // {"2":90}: метадата, PDF-д бичихгүй
  uploadedById String; createdAt DateTime @default(now()); deletedAt DateTime?
  @@unique([submissionId, version])
}
model HomeworkComment {      // хувийн сэтгэгдэл, багш <-> сурагч, append-only
  id String @id @default(cuid())
  submissionId String; authorId String; authorRole Role
  body String; createdAt DateTime @default(now()); readAt DateTime?
}
model HomeworkReviewEvent {  // "багшийн үйлдэл бүр хадгалагдана"
  id String @id @default(cuid())
  submissionId String; actorId String; type HomeworkEventType   // MARK, COMMENT, ROTATE, RETURN, REOPEN
  payload Json; at DateTime @default(now())
}
```
Тэмдэглэгээ (Хийсэн/Дутуу/Хийгээгүй) `DailyHomeworkMark.status` хэвээр, нэмэх нь `submissionId?` холбоос. Хуучин `Submission.imageKeys` хөндөхгүй (legacy).

### 9.4 Үе шат
| Үе | Агуулга | Хугацаа [Т] |
|---|---|---|
| 0 | S3 bucket (private, SSE, CORS: GET/POST, `Range`, expose `ETag, Content-Range, Accept-Ranges`), IAM, `StorageDriver`, 8 утсаар туршилт (iPhone 11+, Samsung A/S, Redmi, Oppo A, Huawei): хэмжээ, хугацаа, HEIC, камер | 3–4 өдөр |
| 1 | Upload pipeline, presigned POST, complete + PDF шалгалт, outbox, моделиуд | 1–1.5 долоо хоног |
| 2 | Багшийн viewer, урьдчилан татах, тэмдэглэгээ + хувийн сэтгэгдэл, үйлдлийн түүх, эргэлт, "Буцаах" + SMS | 1.5–2 долоо хоног |
| 3 | `StoredFile` -> S3 backfill, bytes цэвэрлэх, lifecycle, CloudWatch, клиент алдааны телеметр, (хэрэгтэй бол) B-lite | 1 долоо хоног |
| 4 | Сонголттой: CloudFront, хадгалах хугацааны устгал | шаардлагаар |

### 9.5 Эрсдэл
- Бодит зургийн хэмжээ синтетик тооноос их (+30–60%) -> Фаз 0-д 30 бодит ажлаар шалга.
- Хуучин / бага санах ойтой Android дээр 5 x 12 MP canvas -> дараалан боловсруулах, 1600 px руу бууруулах, алдааны телеметр.
- Android Chrome HEIC / камерын зан үйл [?], Samsung / Xiaomi / Oppo / Huawei-н өгөгдмөл формат [?].
- HK-ийн RTT Монголоос [?]; муу бол CloudFront / Seoul-ийн дахин үнэлгээ.
- Асуудалтай PDF (сурагч гараар бүтээсэн) -> complete дээрх шалгалт, PDF.js скриптийг идэвхгүй.
- Насанд хүрээгүй хүүхдийн зураг: private bucket, богино presigned хугацаа, EXIF/GPS арилсан (canvas), хадгалах хугацаа.
- `pdf-lib` fork-ийн хөгжүүлэгч алга болох -> хувилбар түгжих; зөвхөн энгийн image PDF учир солиход амархан.

### 9.6 Боломжгүй / үнэ цэнэгүй
- **Боломжгүй**: sharp-ийн бэлэн binary-аар серверт HEIC хөрвүүлэх; presigned PUT-ээр хэмжээ хязгаарлах; iOS дээр апп хаагдсан үед upload үргэлжлүүлэх (веб Background Sync байхгүй); цаасны чиглэлийг (эргэлт) найдвартай автоматаар таних (OCR/ML-гүйгээр).
- **Үнэ цэнэгүй**: хуудас бүрийн pre-rendered зураг (хадгалалт x2); tus / S3 multipart (файл < 2 MB); S3 Transfer Acceleration; эхний үед CloudFront; PDF-ийг хэсэгчлэн (range) татах; Glacier-ийг ≤ 200 GB-д оновчлох (сард $1–7).
- **Хамрахгүй**: гар бичмэлийн OCR / автомат засалт, PDF/A, офлайн шалгалт.

## 10. Эзэнд тавих асуулт
1. Ажлыг хэдэн сар / жил хадгалах вэ (устгах / архивлах)? 2. Сурагч хугацаанаас өмнө дахин илгээж (шинэ version) чадах уу? 3. Эцэг эх хувийн сэтгэгдлийг харах уу? 4. Багш сэтгэгдлээ хэр хугацаанд засах вэ? 5. "Буцаах" нь SMS илгээнэ үү (зардал)? 6. Хуудас дээд тал нь 5 хэвээр үү?

## 11. Эзний шийдвэр (2026-10-17)

| Асуулт | Шийдвэр | Хэрэгжүүлэлт |
|---|---|---|
| Хийсэн/Дутуу/Хийгээгүй төлөв | Шинэчлэх хүртэл **байнга** хадгална | ӨС-ийн мөр, устгахгүй |
| Даалгаврын PDF хадгалах хугацаа | **2 долоо хоног** (1 сар шаардлагагүй) | S3 lifecycle 14 хоногоор устгана; ӨС-д `fileDeletedAt` тэмдэглэнэ |
| Дахин илгээх | Сурагч устгаад дахин илгээж болно | Шинэ хувилбар; хуучин PDF-ийг шууд устгана |
| Хугацаа (deadline) | Багш жижиг товчоор тавина; эсвэл «байнга энэ цагт» | Анги тутам `defaultDueTime` + өдрийн override; хоцорсон илгээлтийг тэмдэглэнэ |
| Буцаах/дүгнэсэн | Багш дүгнэж дуусахад «Багш өнөөдрийн даалгаврыг дүгнэлээ» мэдэгдэл | Апп доторх мэдэгдэл (Notification). Имэйл: ихэнх хэрэглэгч имэйлгүй (зөвхөн утас) тул сонголтоор, дараа |
| Хуудасны дээд хязгаар | **6 хуудас** | 6 зураг = 6 PDF хуудас; клиент 6-аас илүүг сонгуулахгүй |

Хадгалах хугацаа 14 хоног болсноор зардал дахин буурна: 700 сурагчид байнга ~2–3 GB,
2000 сурагчид ~6–9 GB хадгалагдана (сард $0.1–0.3). Зардлын гол хэсэг нь EC2 (~$34) хэвээр.

## Эх сурвалж
- Apple forum, Safari 17 HEIC: https://developer.apple.com/forums/thread/743049 ; Apple HEIF: https://support.apple.com/en-us/116944
- MDN `capture`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture ; `createImageBitmap`: https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap
- HEIF хөтчийн дэмжлэг: https://www.testmuai.com/learning-hub/heif-browser-support/ , https://www.dpreview.com/forums/threads/why-does-chrome-not-support-hif-images.4791621 ; sharp / libheif: https://github.com/lovell/sharp/issues/1105
- Samsung HEIF (хоёрдогч): https://support.topenergy.co.nz/support/solutions/articles/76000035383 ; heic2any хэмжээ: https://depscope.dev/pkg/npm/heic2any ; canvas-size: https://github.com/jhildenbiddle/canvas-size
- AWS Price List API (татсан 2026-10-17): https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/{AmazonS3,AmazonEC2,AmazonRDS}/current/ap-east-1/index.json , .../AWSDataTransfer/current/ap-east-1/index.json , .../AmazonCloudFront/current/index.json
- AWS хуудас: https://aws.amazon.com/s3/pricing/ , https://aws.amazon.com/cloudfront/pricing/ , https://aws.amazon.com/s3/storage-classes/ ; үнэгүй дата: https://aws.amazon.com/blogs/aws/aws-free-tier-data-transfer-expansion-100-gb-from-regions-and-1-tb-from-amazon-cloudfront-per-month
- Presigned PUT vs POST (хоёрдогч): https://fast.io/resources/s3-presigned-url-file-size-limit/ ; PDF.js FAQ: https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions
- Google Classroom: https://support.google.com/edu/classroom/answer/9093530 ; Монголын гар утасны хурд: https://datareportal.com/reports/digital-2025-mongolia
- npm: https://registry.npmjs.org/ (pdf-lib, @cantoo/pdf-lib, pdfjs-dist, heic2any, sharp, @aws-sdk/*) ; хэмжээ: https://bundlephobia.com/
- Синтетик хэмжээний туршилт: энэ судалгааны явцад PIL-ээр хийсэн, хадгалаагүй (§3).
