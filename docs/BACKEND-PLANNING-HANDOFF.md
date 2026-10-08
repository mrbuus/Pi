# v0.7 · Backend төлөвлөлтийн эхний шат

2026-09-24. Шаардлагын аудитын дараах зураг төслийн эхлэл; эцсийн архитектур, migration, production API код биш. Алдаагүй болно гэж батлахгүй: мөнгө/дүн/эрхийн дүрмийг тодорхойлж, баталсан тестээр эрсдэлийг багасгана.

## 1. Хэрэглэгч хамгийн түрүүнд юу шийдэх вэ

| Дараалал | Шийдвэр | Санал болгосон суурь | Шийдвэрлэх хүн |
|---|---|---|---|
| 1 | V1-ийн гол амжилт | Даалгавар → багшийн шалгалт → эцэг эх; онлайн ном/шалгалт → баталгаатай төлбөр → эрх | Төслийн эзэн |
| 2 | V1 staff хүрээ | Хуваарь/өдрийн самбарын зайлшгүй хэсэг; цалин автомат бодохыг тусад нь scope батлах | Эрх бүхий Багш+ |
| 3 | Төлбөрийн хоёр суваг | API автомат онлайн, банкны хуулга tuition review; нэг ledger | Эзэн + төлбөр хариуцагч |
| 4 | Бизнес дүрэм | Гэрээний хоног, өвчний сунгалт, partial/refund, төлбөр хаах мөч | Гэрээ/санхүү хариуцагч |
| 5 | Харах эрх ба түүх | Төв/анги/гаднын бүлэг/guardian scope; хэн юу засах | Эзэн + сургалтын менежер |
| 6 | Хадгалалт | Permanent content; сурагчийн evidence expiry/hold; record retention бодлого | Эзэн |
| 7 | Шалгалтын бодлого | Time cutoff, retry, solution release, дүн засах/нийтлэх | Шалгалт хариуцагч |
| 8 | Зардал ба сэргэлт | Сарын дээд төсөв; downtime/data-loss tolerance; 5000 burst test | Эзэн + инженер |
| 9 | Харагдах төрх | Master лого, хоёр professional palette proof, зураг ашиглах эрх | Эзэн + дизайнер |

Бүх шийдвэрийг нэг дор асууж ажлыг зогсоохгүй. Хамааралтай хэсэг дээр «батлагдсан / санал / нээлттэй» гэсэн статус хадгална. Өнгө батлаагүй нь төлбөрийн invariant зураглахад саад болохгүй; төлбөрийн бодлого батлаагүй нь мөнгө хөдөлгөх код гаргах үндэс болохгүй.

## 2. Зөв дараалал ба diagram-ийн төрөл

1. **Requirement register** — stable ID, хэрэглэгч, асуудал, үйлдэл, V1/V2, баталгааны эх, шалгуур. Одоогийн атлас энэ шатны эх.
2. **Use case + swimlane** — сурагч/багш/систем/provider-ийг тусад нь баганаар; эхлэх нөхцөл, сонголт, буцах зам. Payment, homework, schedule, exam эхний дөрөв.
3. **State diagram** — нэг зүйл ямар төлөвөөс хаашаа шилжих; буруу шилжилтийг хориглох. Жишээ: pending төлбөрийг сурагч paid болгож болохгүй.
4. **Domain model ба ERD** — нэр томьёо, ownership, relation, version/history; key/cardinality; дараа physical DB schema.
5. **C4 context → container** — хэрэглэгч/гадаад API/веб/API/worker/DB/object store; component диаграмыг төвөгтэй хэсэгт л. [C4 эх](https://c4model.com/diagrams).
6. **Sequence diagram** — request, transaction, provider callback, retry, crash, response loss. Happy path дангаараа хангалтгүй.
7. **API contract** — input/output, auth scope, error codes, pagination, idempotency, concurrency. [OpenAPI стандарт](https://spec.openapis.org/oas/latest.html); ашиглах version-ийг toolchain-тай батална.
8. **Deployment + recovery** — domain/TLS/CDN/WAF, app instances, private DB, queue, backups, monitoring, runbook, restore.
9. **Test / migration / rollout plan** — acceptance, API integration, permission, load/failure, pilot, rollback. Дараа л implementation.

Нэг аварга диаграмд бүх endpoint/field-ийг чихэхгүй. Том зураг → domain → нэг урсгал → field dictionary гэсэн шатлалтай, хоорондоо ID холбоостой байна. Бүх code variable-ийг одоо таахын оронд бизнесийн өгөгдөл/төлөвийн утгыг эхэлж тогтооно.

## 3. Domain хуваарилалтын ноорог

| Domain | Өөрөө эзэмших мэдээлэл | Бусадтай холбогдох нь |
|---|---|---|
| Identity & access | User, student identity, guardian link, scoped permission | Enrollment/access check |
| Curriculum & content | Subject, topic, question revision, answer key, book edition, asset, video | Lesson, exam нь immutable revision холбоно |
| Classroom & schedule | Class, membership period, recurring series, exception, planned/actual lesson | Attendance, homework, staff duty |
| Learning & review | Attempt, answers, homework evidence, teacher review, completion | Result/parent view; content-ыг өөрчилдөггүй |
| Exams | Exam version, registration, timed attempt, OMR import, publication | Payment entitlement, topic result |
| Commerce | Product/plan, invoice, payment observation, allocation, refund, entitlement | Provider ба bank хоёр intake |
| Staff operations | Task, event, approved work interval, wage rate version | Teaching plan нь actual hours биш |
| Communications | Notification intent, recipient snapshot, delivery/read state | Outbox event; core save-г mail outage зогсоохгүй |
| Media | Upload job, asset metadata, permanent/evidence class, expiry/hold | Object bytes тусдаа storage; access domain-оос |
| Reporting | Read projections, topic aggregates, traceability | Source record-ыг дахин үнэн эх болгохгүй |

Эхний архитектурын санал: зохион байгуулалттай modular backend + asynchronous worker, relational authoritative data, object storage, optional cache. Одоогийн кодын reuse boundary-г модулиар хэмжиж байж шийднэ; бүгдийг шинээр бичих эсвэл microservice болгохыг урьдчилж батлаагүй.

## 4. Талбарын утга — эхний чухал dictionary

Доорх нь logical contract-ийн санал. Нэр, DB төрөл эцэслээгүй. Бүх write нь actor/time/reason/request ID; version conflict ба audit-тай.

| Талбар / объект | Утга ба validation | Хэн өөрчилж болох |
|---|---|---|
| studentId | Immutable internal ID; нэр/утаснаас хамаарахгүй | Identity import/service |
| externalStudentCode | Burtgel mapping; эхийн leading zero хадгална; unique scope шийдэх | Preview баталсан admin |
| membership.from/to | Анги/бүлгийн хүчинтэй интервал; from<to | Scoped эрхтэй менежер |
| questionId + revisionId | Нэг бодлогын тогтвортой ID, тусдаа хэвлэгдсэн хувилбар | Контентын эрхтэй Багш+ |
| attempt.questionRevision | Хариулсан үед ашигласан хувилбар; immutable | Attempt үүсэхэд server |
| firstAccuracy | Анхны хариунаас; дахин зассан ажлаар overwrite хийхгүй | Grading service |
| verifiedCompleted/total | 0≤completed≤total; зөв бодсон хувьтай адил биш | Review эрхтэй багш |
| gradeRevision | Зэрэг засахад conflict шалгах; override шалтгаантай | Review service |
| mediaClass | QUESTION_BANK/THEORY/VIDEO permanent; HOMEWORK/MAKEUP evidence | Upload purpose policy |
| expiresAt + hold | Хугацаа дуусах ба маргааны hold тусдаа; permanent=null | Retention policy service |
| invoice.amount/currency | Floating point биш exact amount; currency нэг мөр | Commerce service |
| payment.providerRef | Provider/merchant хүрээнд давтагдахгүй; verified status | Verified provider intake |
| bank.transactionRef | Account+bank reference; reference дутуу бол conflict review | Import parser + reviewer |
| allocation.amount | Нэг төлбөрөөс хэдийг invoice-д оноосон; нийлбэр available-ээс ихгүй | Commerce transaction |
| entitlement.validFrom/to | Paid allocation/refund policy-оос; хугацааны хил тодорхой | Entitlement service |
| schedule.seriesId/revision | Давтамжийн эх ба хувилбар | Schedule.manage capability |
| schedule.effectiveFrom | Өнгөрснийг өөрчлөхгүйгээр дараагийн өдрүүдэд үйлчлэх | Эрхтэй төлөвлөгч |
| session.actualTopicIds | Бодитоор үзсэн; suggested/planned-тай ялгаатай | Тухайн хичээлийн багш |
| startsAt/endsAt/timezone | UTC instant + Asia/Ulaanbaatar display; end>start | Schedule service |
| notification.dueAt | Last published change +600s санал; client timer биш | Notification service |
| notification.revision/key | Хуучин revision discard; recipient/channel dedupe | Delivery worker |
| exam.deadlineAt | Server absolute deadline; grace policy ил тод | Exam service |
| answer.sequence | Хуучин autosave шинэ хариуг дарахгүй | Attempt service |
| work.approvedMinutes | Бодит батлагдсан минут; давхцал/завсарлага шалгана | Time.approve capability |
| wageRate.effectiveFrom | Өмнөх payroll-ыг шинэ rate-аар overwrite хийхгүй | Payroll тусгай эрх |

Хоосон/null/0 ялгааг бүртгэнэ: ирц «хараахан бүртгээгүй» нь «тасалсан» биш; completed=null нь 0 биш; төлбөр төлөгдөөгүй нь failed гэсэн үг биш. Decimal rounding, date inclusive/exclusive, timezone, value limits-ийг API ба DB дээр ижил болгоно.

## 5. Эхний таван sequence-ийн дүрэм

**Онлайн худалдан авалт:** order → invoice → provider payment → callback received → provider verify → atomic allocation + entitlement + outbox → response. Callback алдагдвал bounded reconciliation query. UI refresh эрх давхар олгохгүй. Банкны хуулгаар ижил мөнгө ирвэл шинэ орлого болгохгүй, cross-channel match/conflict review. Provider integration хоёр сувгийн ledger-ийг тойрохгүй.

**Банкны хуулга:** file hash → preview rows → normalize → duplicate detection → phone/ID/amount candidates → exact/ambiguous/unmatched → эрхтэй review → atomic allocation → эрх/тайлан. Ижил утас/ижил дүн л байгаагаар төлбөрийг автоматаар оноохгүй. Match өндөр итгэлтэй байсан ч tuition batch confirm хэрэглэгчийн шаардлага хэвээр.

**Даалгавар:** lesson snapshot → student attempt → upload draft → processing → ready → submit → teacher review → final completion → parent projection. Processing дундах файл final биш; review update concurrent conflict-тай. Эхний accuracy ба багшийн completion тусдаа хадгална.

**Хуваарь:** draft → validation → publish revision → durable notification intent → 10min wait → latest revision/recipient check → delivery. Cancel/return-to-original/urgent-send/retry гэсэн замуудтай. Таб хаагдах, сервер restart болоход browser setTimeout-д найддаггүй.

**Шалгалт:** registration+entitlement → attempt snapshot → versioned autosave → final submit/server cutoff → grade → topic aggregates → configured publication. Grade ба leaderboard asynchronous байж болно; «оноо бэлэн / нийт байр бэлтгэж байна» төлөв тусдаа.

## 6. Ачаалал ба тестийн эхний төлөв

5000 active × autosave 15 секунд = дунджаар ~333 request/s гэсэн ЖИШЭЭ. Нэг мөчид timer давхацвал burst илүү их; client jitter, changed answers only, retry backoff-г туршина. 5000 final submit/30 секунд ≈167/s; бүгд нэг секундэд ирэх хувилбарыг ч хэмжинэ. Эдгээр нь capacity баталгаа биш, туршилтын workload.

DB write latency, connection pool, queue lag, error ratio, duplicate rejects, storage failures-ийг request/exam/job ID-аар хайдаг болгох. Жишээ SLO/RPO/RTO-г өртөгтэй нь эзэн батлах; multi-zone, failover, read-only degradation, offline draft нь тусдаа сценаритай. Нөөц сэргээж шалгаагүй бол «HA бэлэн» гэж нэрлэхгүй.

Гарах deliverable: нэг domain dictionary; scoped permission matrix; таван sequence; state diagram; ERD; API contract; media lifecycle; deployment ба restore зураг; F01–F40-той test matrix; migration dry run; сарын 700/1000 ба 5000 burst төсөв. Одоогоор эдгээрийн эхлэх дараалал/логик boundary гарсан; бүх diagram/schema бүрэн батлагдаагүй.
