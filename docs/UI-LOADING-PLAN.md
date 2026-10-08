# Pi.mn · Математик loading ба UI/UX ажлын төлөвлөгөө

2026-09-23 · UX01–UX08 · V1-ийн интерфейсийн суурь. Одоо зөвхөн төлөвлөгөө ба локал HTML доторх жишээ; production вебийн loader өөрчлөгдөөгүй.

## Дүрсний шийдвэр

Үндсэн санал: төвдөө **π**, гадна талдаа тасархай нимгэн цагираг. π нь хөдөлгөөнгүй, цагираг CSS transform-оор эргэнэ. Pi-ийн нэр, математикийн утгатай шууд холбоотой; шинэ зураг, гадны font, GIF/video, animation library хэрэггүй. Хэлбэрийг inline SVG path, цагирагийг CSS border-оор зурна. Өнгө/хэмжээ light/dark ба жижиг/том хувилбараар UX review хийнэ.

Энэ нь вебийн доторх page/section loading. Safari эсвэл бусад browser-ийн өөрийн toolbar reload дүрсийг сайт солихгүй. HTML/app shell хараахан татагдаагүй байхад custom дүрс харагдана гэж амлахгүй.

## Ачааллын гэрээ

- Дүрсний хөдөлгөөнд нэмэлт API, fetch, polling, WebSocket эсвэл analytics event loop **0**.
- Өгөгдлийн жинхэнэ хүсэлт хэвийн явна; loader түүнийг давхар үүсгэхгүй, refresh loop хийхгүй.
- Inline SVG+CSS зорилтот ≤3KB uncompressed; шинэ runtime dependencyгүй. Loader-оор дамжуулан зураг/video татахгүй.
- CSS transform ашиглах ч төхөөрөмжийн rendering/батарейн бага хэмжээний ажил байна; “бүх төрлийн ачаалал тэг” гэж нэрлэхгүй.
- Component алга болох, page ready болох, tab hidden үед animation/timer-аа зогсооно. Reduced motion үед хөдөлгөөнгүй π ба текст үлдэнэ.
- 150–200ms-ээс хурдан дуусвал indicator анивчуулахгүй байж болно. Дүрсээ харуулахын тулд бэлэн контентыг зориуд удаахгүй.

## UI төлөвүүд

| Нөхцөл | Харагдах зүйл | Дараагийн үйлдэл |
|---|---|---|
| Page/app data loading | π ба “Ачаалж байна…” | Бэлэн болоход арилна |
| Жагсаалт ачаалах | Хэмжээгээ хадгалсан skeleton | Ready эсвэл бодит empty state |
| Хариу/дүн хадгалах | Тухайн товч/мөр дээр “Хадгалж байна” | Commit receipt ирсний дараа “Хадгаллаа” |
| Фото/PDF upload | Мэдэгдэж буй byte progress; processing тусдаа | READY, failure/retry ялгаатай |
| Сервер удах | “Хариу хүлээж байна” гэсэн тайлбар | Тухайн endpoint-ийн timeout/retry policy |
| Offline/алдаа | Алдааны тодорхой тайлбар | Retry; pending draft хэвээр |
| Reduced motion | Хөдөлгөөнгүй π + loading текст | Бусадтай ижил readiness |

Хуурамч 0–100% progress, “бараг дууслаа” таамаг, эцэсгүй spinner хэрэглэхгүй. Retry нь төлбөр/submit-ийг давхар үүсгэхгүй idempotent гэрээтэй байна. role=status, aria-live=polite, busy region-ийн aria-busy; focus булаахгүй, frame бүр screen reader announcement хийхгүй.

## HTML-ийн хоёр харагдац

**Үйл ажиллагаа:** системийг ашиглах үед сурагч, багш, эцэг эх юу хийдгийг харуулна. Өнгө ба V1/V2 шүүлт хэвээр. Зөвхөн хөгжүүлэлтэд зориулсан 6 зураг (release scope, delivery, strategy, content QA, capacity rehearsal, release operations) үндсэн цэснээс салсан.

**Хийх ажлууд · TODO:** дизайнер/инженер/QA-ийн шинэ 8 UI/UX ажил + 468 шаардлагын хэрэгжилтийн бүртгэл. Map/ажлын хэсэг, V1/V2, хайлттай. Хариуцагч, гаралт, дуусах шалгуур тусдаа. Хуучин 483 үйлдлийн аудит бүрэн markdown backlog-д хэвээр. Ажил бүрээс холбоотой үйлдэл/төлөвлөлтийн зураг руу орно; зураг дээр “хийх ажлын жагсаалтад нээх” холбоосоор буцна. Зураглалын ID хадгалагдсан.

TODO доторх “2 секундийн жишээ” нь **дүрсийг үзүүлэх демо**; жинхэнэ ачааллын хувь/хугацаа биш. Веб рүү production feature нэмсэн гэж тэмдэглэхгүй. Browser toolbar icon өөрчлөхгүй.

UI feedback хөдөлгөөн нь өмнө V2 болгосон **бодлогын анимэйшн тайлбар**-аас тусдаа. V1-ийн AI/SMS/ML/онлайн анги/зорилго/автомат санал болголтын хасалт хэвээр.

## Хэрэгжүүлэх дараалал

UX01 дүрс батлах → UX02 component performance → UX03 actual loading state integration → UX04 accessibility → UX05 үндсэн аяллын wireframe → UX06 component/copy → UX07 Safari/mobile/network QA. UX08 нь үйл ажиллагаа ба implementation бүртгэлийн холбоог баримтжуулна. [Дэлгэцийн inventory](UI-UX-REGISTER.md), [backlog](SYSTEM-DESIGN-BACKLOG.md).
