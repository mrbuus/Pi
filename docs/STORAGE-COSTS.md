# Даалгаврын медиа хадгалалтын төсөв

Үнэ шалгасан: 2026-09-22. GCS Standard · Seoul (asia-northeast3) · flat namespace.

## Тооцооны нөхцөл

30 хоногийн төсвийн сар; 7 хоногт 4 хичээл → 30×4/7 = 17.1429 хичээл/сар. 700 болон 1000 сурагч БҮГД нэг хичээлд нэг багц, дунджаар 5 зураг илгээнэ. Нэг багц нь 2–3 тестийг нийлүүлж хамарна. Хэрэв 5 зураг нь ТЕСТ БҮРД бол хэмжээг тестийн тоогоор үржүүлнэ. Анхны тооцоонд амралт, таслалт, дахин upload, нөхөлтийн нэмэлт урсгал 0; calculator-ийн нэмэлт хувь тэдгээрийг загварчилна.

Зурагны хэмжээ нь decimal MB (1 MB=1,000,000 byte); GCS үнэ GiB (2^30 byte)-ээр. Нэг зурагт 0.05 MB thumbnail. Багц бүрийг сард нийт 2 бүтэн удаагийн хэмжээтэй тэнцэх download (багш + дахин үзэлт) гэж үзэв. Үзэх тоо нэмэгдвэл egress өснө. Багш/сурагч/processing-ийн нийлбэр byte нь энэ views параметрт багтана.

Хадгалалт steady-state: 30 хоног live + 7 хоног GCS soft delete; эхний хоосон сарын дундаж bill үүнээс бага. Тооцоо байнгын жигд upload гэж үзсэн тул хичээлийн яг хуваариас бага зэрэг зөрнө. Original raw өндөр чанарын давхар copy, staging, orphan upload, retry amplification, on-demand PDF, all noncurrent versions, CDN, worker, backend, DB, backup, SMS, татвар ороогүй. Эдгээр нь файл usage-ийн тооцоог бүх системийн bill гэж нэрлэхгүй байх шалтгаан.

## Тариф

GCS Seoul Standard: $0.023/GiB-month; internet Asia excluding China: $0.12/GiB эхний 10 TiB; flat namespace A $0.005/1000; B $0.0004/1000. Тарифын бүс Seoul-г албан хуудасны embedded pricing хүснэгтээс шалгасан. Free tier/promo хасаагүй. Нэг фото+thumbnail workflow-д A=3, B=2×views+1 гэсэн request budget-ийн таамаг; conversion-ийн бодит pipeline илүү байж болно.

## 30 хоног хадгалах сарын жишээ

| Сурагч | Фото MB | Фото/сар | Live GB (+preview) | GCS storage | Egress | Requests | GCS медиа нийлбэр | R2 жишээ* |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 700 | 0.3 | 60,000 | 21.00 | $0.55 | $4.69 | $1.02 | $6.27 | $0.16 |
| 700 | 0.5 | 60,000 | 33.00 | $0.87 | $7.38 | $1.02 | $9.27 | $0.34 |
| 700 | 1 | 60,000 | 63.00 | $1.66 | $14.08 | $1.02 | $16.77 | $0.79 |
| 700 | 5 | 60,000 | 303.00 | $8.00 | $67.73 | $1.02 | $76.75 | $4.39 |
| 1000 | 0.3 | 85,714 | 30.00 | $0.79 | $6.71 | $1.46 | $8.96 | $0.30 |
| 1000 | 0.5 | 85,714 | 47.14 | $1.25 | $10.54 | $1.46 | $13.24 | $0.57 |
| 1000 | 1 | 85,714 | 90.00 | $2.38 | $20.12 | $1.46 | $23.95 | $1.20 |
| 1000 | 5 | 85,714 | 432.86 | $11.44 | $96.75 | $1.46 | $109.64 | $6.34 |

*R2 Standard: $0.015/GB-month, free 10 GB / 1M A / 10M B, egress $0; billable units rounded up. Энэ жишээ нь account-ийн free allowance бусад ажилд ашиглагдаагүй гэж үзсэн. R2-д GCS-ийн 7 хоног soft delete-ийг дуурайлган тооцоогүй: ижил recovery policy, routing/auth compute, location performance гэсэн баталгаа биш. Cloudflare Worker, transformations, нэмэлт CDN/auth operation тусдаа байж болно.

## 30 хоног ба 10 хичээл

| Сурагч | Policy | Live GB | GCS (+7d soft delete) | Сарын upload GB |
|---:|---|---:|---:|---:|
| 700 | 30 хоног | 33.00 | $9.27 | 33.00 |
| 700 | 10 хичээл ≈17.5 хоног | 19.25 | $8.97 | 33.00 |
| 1000 | 30 хоног | 47.14 | $13.24 | 47.14 |
| 1000 | 10 хичээл ≈17.5 хоног | 27.50 | $12.82 | 47.14 |

Сүүлийн 10 хичээл нь application-level тооллого; 10 зураг, 10 object version биш. 30 хоног →10 хичээл болгох нь хадгалалтын хэсгийг бууруулна, сар бүр багш нээх download-ыг үндсэндээ бууруулахгүй. Шалгаж дуусаагүй/маргаантай ажлын hold-оос бодит хадгалалт өснө. Санал: 30 хоногийг pilot default болгон, hold-ийг тайлантай удирдах; одоогоор шийдвэр батлагдаагүй.

## Давхар шалгалт, жилийн өсөлт

- 700 сурагч, 0.5 MB фото: 1/2/5 бүтэн download-той сарын GCS зардал $5.53 / $9.27 / $20.48. Фото+thumbnail retentionгүй 12 сар цуглуулахад төгсгөлийн footprint ~396.00 GB; энэ нь жилийн storage bill биш.
- 1000 сурагч, 0.5 MB фото: 1/2/5 бүтэн download-той сарын GCS зардал $7.90 / $13.24 / $29.25. Фото+thumbnail retentionгүй 12 сар цуглуулахад төгсгөлийн footprint ~565.71 GB; энэ нь жилийн storage bill биш.

## Онолын урт хугацааны зураг — сурагч бүрт хувилахгүй

13 анги × 17.1429 хичээл × 5 зураг × 1 MB = 1.114 GB/сар (+0.05 MB thumbnail-тай 1.170 GB/сар). 12 сарын төгсгөлд 14.04 GB; зөвхөн live storage ≈ $0.30/сар GCS Seoul. 10 зураг бол хоёр дахин. Энэ нь ЗӨВХӨН хадгалалт: 700 сурагч бүр хичээл бүрийн 5 зураг+thumbnail-ийг нэг удаа үзвэл 63 GB/сар ≈ $7.04 egress нэмэгдэнэ; 1000 сурагч →90 GB ≈ $10.06. Үндсэн бодлогын зураг, видео, онолын эх файл, архив backup тусдаа.

## Фото PDF болгох санал

PDF нь савлагаа; ижил compressed image-г PDF-д хийхэд хэмжээ автоматаар буурахгүй. Шахалт, resize, crop нь байтыг бууруулдаг бөгөөд уншигдах чанарыг бодит хуудсаар шалгана. Санал: уншигдах compressed page+thumbnail-ийг canonical болгох; annotation/rotation-г metadata; PDF-г хүссэн үед түр экспорт. Existing PDF-ийг заавал PNG болгохгүй. 0.3/0.5/1 MB нь таамаг, чанарын баталгаа биш. Олон хувилбарыг зэрэг хадгалбал төсөвт бүгдийг нэмнэ.

## Найдвартай ажиллагаа ба сонгох provider

GCS Seoul-г анхны үнэлгээний reference болгосон; Монголд хамгийн хурдан гэж хэмжээгүй. Улаанбаатарын fixed/mobile ISP, 4G, сул Wi-Fi дээр Seoul/Tokyo болон R2 хувилбарын upload/download p50/p95-г туршина. Зөвхөн egress үнэгүй гэдгээр provider сонгохгүй; private delivery, signed URL, viewer, retry, support, recovery шаардлагыг харьцуулна.

HA database хүртэл failover үед холболт тасарна; Google-ийн тайлбарт ~60 секунд гэж өгсөн ч бодит ачааллаас хамаарна. App shell/cached public content үлдэж болно; шинэ дүн DB-гүйгээр баталгаажихгүй. Autosave draft, idempotent replay, health checks, worker queue, backup restore хэрэгтэй. “100% хэзээ ч унахгүй” баталгаа өгөхгүй. Backend+HA database-ийн нийт үнийг RAM/CPU, concurrency, retention, backup/RPO/RTO тодорхойлсны дараа тусад нь sizing хийнэ.

## Төсвийн дүгнэлт

0.5 MB/photo хүрч чадсан нөхцөлд GCS файл storage+transfer+requests-ийн сарын хэмжээ 700 хүүхдэд ойролцоогоор $9.3, 1000-д $13.3. Pilot-н зураг/дахин upload/нөхөлт/conversion overhead хэмжигдэх хүртэл media-only төсвийг $15–25 / $20–35 хүрээнд төлөвлөх инженерийн нөөцийн санал; provider quote биш. Raw 5MB зурагтай бол $83 / $119 орчим болж өснө. Нийт web bill нь эндээс өндөр, compute/DB/HA тусдаа.

## Эх сурвалж

- [Google Cloud Storage — үнэ](https://cloud.google.com/storage/pricing)
- [GCS — lifecycle](https://docs.cloud.google.com/storage/docs/lifecycle)
- [GCS — soft delete](https://docs.cloud.google.com/storage/docs/soft-delete)
- [GCS — signed URL](https://docs.cloud.google.com/storage/docs/access-control/signed-urls)
- [Cloud SQL — HA](https://docs.cloud.google.com/sql/docs/postgres/high-availability)
- [Cloudflare R2 — үнэ](https://developers.cloudflare.com/r2/pricing/)

## v0.3: Багшийн нэмэлт бодлого ба байнгын сан

LB05–06-ийн нэмэлт бодлогын зураг PDF болох нь хэрэглэгчийн шаардлага. Дээрх canonical page / түр PDF санал нь сурагчийн evidence-д хамаарна. Багшийн бодлого, номын бодлого, системийн зураг/бодолт, онол нь permanent; 30 хоног/10 хичээлийн lifecycle-д хэзээ ч орохгүй. Архивлах нь файл устгахгүй.

Байнгын нэмэлт PDF-ийн сарын өсөлт = ангийн тоо × хичээл/сар × нэмэлт багц/хичээл × хадгалах бүх хувилбарын MB /1000. Жишээ13 анги ×17.1429 хичээл ×1 багц ×2MB =0.446GB/сар; 12 сарын эцэст5.35GB, зөвхөн storage ≈$0.115/сар GCS Seoul. Энэ нь сар бүр бүх багш нэг нэмэлт PDF үүсгэнэ гэсэн таамаг; сурагч бүрт шинэ copy хадгалахгүй. Эх зураг/preview/backup байвал 2MB нийлбэрт багтаах эсвэл нэмж тооцно. Таталт ба processing энд ороогүй.
