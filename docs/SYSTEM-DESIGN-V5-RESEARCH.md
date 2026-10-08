# Шаардлага ба судалгааны шинэчлэл · 2026-09-24

Энэ баримт нь хэрэглэгч юу хийж чадахыг тодорхойлох **эхний үе шат**. Production код, сервер, database, цалин, имэйл илгээлт өөрчлөгдөөгүй. Backend architecture-ийн эцсийн зураг одоо гаргахгүй. Өмнөх infrastructure баримтуудыг батлагдаагүй санал гэж уншина.

## 1. Юу байгаа, юу нэмэх вэ?

Кодын статик бүртгэл: **42 controller файл, 276 route declaration, 48 page.tsx, 70 Prisma model**. Энэ нь 276 бүрэн ажилладаг боломж гэсэн үг биш. Нэвтрэлт, эрх, сервисийн логик, UI, бодит өгөгдөл, runtime туршилтыг хамтад нь шалгаж байж ажилладаг гэж батална. Одоогийн өөрчлөгдсөн checkout-ыг уншсан; production deployment-тэй ижил гэсэн баталгаа байхгүй.

`CURRENT-CODE-INVENTORY.md` бүх олдсон route/page/model-ийг эх кодын зам, мөр, hash-тай жагсаана. Хуучин SYSTEM-MAP-ийн 615 зангилаа, 483 навч бичлэг мөн хэвээр. Хуучин тайлбар, кодын нотолгоо, шинэ хэрэгцээ нь гурван өөр эх сурвалж.

| Хэсэг | Кодод байгаа суурь | Энэ удаагийн нэмэлт / үлдсэн баталгаа |
|---|---|---|
| Хуваарь | ClassSchedule, ScheduleException, split, LessonTopic, week resolver, builder | Маргаашийн publication, төлөвлөсөн/бодит багц, нэрлэсэн хүмүүсийн тусгай эрх, meal duty, өнгө ба conflict-ийн хамрах хүрээ |
| Багшийн ажил | StaffTask, assignees, статус, Board/Timeline/Workload | Өдрийн самбарын ойлгомжтой UX, acknowledgement, carry-over, тусдаа төвийн календарь |
| Ажиллах өдөр | TeacherWorkDay, TeacherWorkException | Availability нь бодит ажилласан цаг биш. Time entry, review, lock, historical rate шинэ хэрэгцээ |
| Имэйл | Nodemailer service, SMTP тохиргоо | Durable reminder, хүргэлтийн бүртгэл, suppression, retry, timeout reconciliation бүрэн батлагдаагүй |
| Шалгалтаас гарах | visibility/blur/fullscreen, LEAVE_MAX=2, autosave jitter | Давхар event/retry тоолол, mobile fairness, бодлогын шинэ шийдвэр |
| Нүүр хуудас | Landing хэсгүүд, Achievements component | Он оны зөвшөөрөлтэй фото архив, багшийн нийтэд харагдах танилцуулга, brand book |
| Хичээлийн төрөл | Subject enum, Book.subject, EnrollmentWindow | Нийгмийн ирц/амжилтын UX батлах; материал/тестийн сан дараа |
| Томьёо | Formula, ProblemFormula | Контентын бүрэн байдал, mobile харагдац, шалгалтын үед харах эрх |
| Санал хүсэлт | Хуучин inventory-д байгаа төстэй боломжийг тулгах | Сурагчийн V1 feedback → triage → хариу → дахин нээх бүрэн аялал заавал |
| Homework comment | HomeworkCommentField зэрэг UI суурь | Student → problemId → class teacher thread бүрэн хэрэгжсэн гэж хараахан үзэхгүй |
| Goals / SMS / онлайн | Checkout дотор код байж болно | Хэрэглэгчийн шийдвэрээр V1-д орохгүй. Код байгаа нь release-д оруулах зөвшөөрөл биш |

Хуучин 56 судалгааны баримтыг бүтэн текстээр унших санд оруулав. Тэдгээрийн индекс, шүүмж, UX audit нь зарим claim баталгаажаагүй/буруу байсныг өөрсдөө тэмдэглэсэн. Бүх ишлэл, зах зээлийн тоо өнөөдөр дахин баталгаажсан гэсэн үг биш. Шинэ хэрэглэгчийн хүрээ хуучин AI/goals/SMS/online саналуудаас давуу.

## 2. Хуваарь: тогтмол ирц, оройн бэлтгэл, бодит хичээл

**Хамгийн бага үндсэн дэлгэц:** Өнөөдөр / Маргааш; анги бүрийн цаг, өрөө, багш, туслах, онолын багц, нийтэлсэн эсэх. Нэг анги дээр дарахад ирц, үзсэн багц, даалгавар, эрт тарах тэмдэглэл шууд нээгдэнэ. Ховор series өөрчлөх үйлдэл ⋯ цэсэнд байна.

Долоо хоногийн суурь нь өдөр бүр давтагдах ажлыг хэмнэнэ. Маргаашийн өдөр үүсэхдээ тухайн өдрийн exception/амралтыг тооцно. Орой ойролцоогоор 20:00-д багш, сэдэв тодорхой болдог нь ажиллах хэв маяг; яг 20:00-д автомат нийтлэх шинэ шаардлага гэж үзээгүй. Хэн хэзээ нийтэлснийг хадгална.

Онолын багц сонгоход тест/даалгаврын анхны санал дагана. Өнөөдрийн яг орсон хичээл бол багшийн баталсан actual record; төлөвлөсөн сэдвийг үнэн гэж чимээгүй хуулж дуусгахгүй. Өөрчилсөн агуулга болон дутуу баталгаажуулалтыг харуулна. Одоо LessonTopic байгаа ч planned/actual-ийн бүх семантик батлагдаагүй.

| Өөрчлөлт | Хүлээх үйлдэл | Хадгалах зүйл |
|---|---|---|
| Нэг өдөр амрах | Тэр instance цуцлах | Шалтгаан, анхны өдөр, ирцэд үзүүлэх нөлөө |
| Нэг удаа эрт тарах/цаг солих | Тэр instance-д exception | Өмнөх/шинэ цаг, мэдэгдэл |
| Тавдугаар сараас шинэ хуваарь | Effective date-ээр шинэ series | Өнгөрсөн хуваарь, ирц, дүн, холбоос хэвээр |
| Багш солигдох | Хуваарийн revision | Орлуулсан багш, нийтлэгдсэн хувилбар |
| Бямба/нямын хоол | Тусдаа meal duty | Хоол, хариуцагч, цаг; хичээлийн сэдэв биш |

Google Calendar-ийн official recurring-event загвар нь нэг instance болон “энэ өдрөөс цааш” өөрчлөлтийг ялгадаг. Манай бүтээгдэхүүнд энэ зарчмыг ашиглах санал; Google-той интеграц одоо хийхгүй. [Google Calendar recurrence](https://developers.google.com/workspace/calendar/api/guides/recurringevents)

Notion Calendar-ийн олон calendar/өнгө, event удирдлагаас харагдацын санаа авна. Багш бүрийн тогтвортой өнгө + нэр/initial зэрэг харагдана. Хичээл, дотоод ажил, төвийн том event гурван тусдаа давхарга байна. [Notion Calendar](https://www.notion.com/help/manage-your-calendars-and-events)

Шалгах жишээ: нэг багш хоёр ангид давхцах; нэг өрөө хоёр ангитай; нэг удаагийн амралт; holiday дээр make-up; тавдугаар сарын өөрчлөлт; past attendance хэвээр; нийтэлсний дараах засвар; орлох багш; хоолгүй өдөр. Одоогийн overlap шалгалт байгааг бүх resource conflict бүрэн шийдсэн гэж үзэхгүй.

## 3. Дотоод самбар ба стратегийн календарь

**Өдөр тутмын самбар:** “9А тест хэвлэх — туслах багш — 15:30-аас өмнө”; “11Б өнөөдөр эрт тарна” гэх богино ажил. Заавал төслийн олон талбар бөглөхгүй. Үндсэн хариуцагч заавал тодорхой; хамтрагчид сонголттой. Хүлээн авсан, хийж байгаа, саадтай, дууссан төлөв тусдаа. Хоцорсон ажлыг шинэ өдөр рүү автоматаар нууж шилжүүлэхгүй: анхны хугацаа + carry-over шийдвэртэй байна.

**Төвийн том calendar:** улсын сорил, олимпиад, тэмцээн. Event → milestone → өдөр тутмын ажил гэсэн холбоотой. Жишээ: сорилын өдөр → 7 хоногийн өмнө материал батлах → өмнөх өдөр хэвлэх → дүн нийтлэх → зураг/сургамж архивлах. Calendar дээр том зураг; staff board дээр тухайн хүний өнөөдрийн үйлдэл.

Одоогийн PlannerClient-ийн Board/Timeline/Workload ба StaffTask-ийг ашиглах боломжийг эхлээд UX туршина. EstimateHours нь бодит цаг/цалин биш. Шинэ зүйл хийхийн өмнө дараах 5 ажлаар прототип турших TODO: хэвлэх ажил оноох, ажил уншсаныг харах, хүн солих, хугацаа хэтрэх, том event-ийн өдөр солих.

## 4. Цаг.xlsx-ийн уншилт ба цагийн хэрэгцээ

Эх workbook-ийг өөрчлөлгүй, **Sheet1 A1:R20** бүх cell/formula/cached result-ыг уншсан. 19 хүний мөр, 1–15 гэсэн 15 багана; R баганад 19 SUM formula. Numeric цагийн нийлбэр 872; бүх cached total тусдаа тооцоотой таарсан; Excel error cell илрээгүй. Энэ нь зөв хүн зөв өдөр ажилласан гэдгийг батлахгүй.

Дутуу өгөгдөл: сар/он, эхлэх/дуусах цаг, завсарлага, rate, ажлын төрөл, батлагч. Хоосон cell нь ажиллаагүй эсвэл оруулаагүй эсэх тодорхойгүй. Ижил нэртэй мөрүүдийг нэрээр автоматаар нэг хүн болгохгүй. 7.5 цаг нь 7 цаг30 минут. Нийлбэр зөв гэдэг нь цалингийн хууль/гэрээ/суутгал зөв гэсэн баталгаа биш.

Санал болгож буй аялал: хугацаа ба хүний ID mapping → actual entry → багш хянана → эрхтэй хүн review → буцаах/батлах → үе түгжих → шаардлагатай бол rate-аар **урьдчилсан** үржвэр → нягтлангийн хяналт. Тариф өөрчлөгдөх хүчинтэй хугацаатай, өнгөрсөн сарын тооцоо өөрчлөгдөхгүй. Time entry бүхэл минутаар, display аравтын цаг/цаг-минут хоёул байж болно.

Clockify-ийн submit/approve/reject/lock загвар нь тохирох харьцуулалт. Манайх Clockify худалдаж авах шийдвэр гаргаагүй. [Clockify approval](https://clockify.me/help/track-time-and-expenses/approval)

Хувийн мөрүүд static HTML-д ороогүй. Багш өөрийн цаг/баталгаажуулалтаа харна. Payroll харах эрх ба schedule.plan эрх өөр. Нийт багшид цалинг ил тавих шаардлага гэж хэрэглэгчийн “ил тод”-ыг тайлбарлаагүй.

## 5. Эрхийг нэр ба role-той хутгахгүй

Хуваарь төлөвлөх анхны хүмүүс: хэрэглэгчийн нэрлэснээр Баасанжав, Баасансүрэн, Энхсайхан, Бадрал, Дуламсүрэн. Нэрийн бичвэрээр hardcode auth хийхгүй; баталгаатай userId-д тусгай capability оноох хэрэгцээ. Цаг/цалингийн жагсаалтыг тусад нь батална: хэрэглэгч эхний гурвыг жишээлсэн, бусдыг автоматаар нэмэхгүй.

Бүх Teacher+ биш; schedule.plan/publish, time.review, payroll.view/manage, staff-task.manage тусдаа үйлдэл/өгөгдлийн хүрээтэй байна. Түр орлуулах эрх хугацаатай. UI товч нуух нь ганцаараа хангалтгүй; архитектурын дараагийн шатанд серверийн access matrix-г гаргана. Өөрийн цагийг өөрөө батлах эсэх, payroll экспорт, rate өөрчлөх эрх нээлттэй шийдвэр.

## 6. Имэйл ба мэдэгдэл

Эхний ялгаа: веб мэдэгдэл, гарах reminder email, Gmail inbox integration нь гурван өөр боломж. Одоо Gmail унших/имэйл илгээх ажил хийгээгүй. Хэрэгцээ нь ихэвчлэн outbound reminder + хүргэлтийн лог.

Одоогийн email.service SMTP тохиргоогүй үед warning хийгээд return; send timeout 10 секундийн race хэрэглэдэг. Үүнийг заавал sent гэж бүртгэж болохгүй. Timeout болсон хүсэлт provider дээр аль хэдийн accepted байж болох тул шууд давтан илгээвэл duplicate эрсдэлтэй. Дараа implementation хийхдээ event ID, bounded retry/backoff, provider status reconciliation хэрэгтэй.

Төлөвүүд: queued, skipped/unconfigured, suppressed, accepted, delayed, delivered, bounced, complained, failed, unknown. Delivered нь хүн уншсан гэсэн үг биш. Веб дээрх read state тусдаа. Template/version, recipient, event/revision, оролдлого, алдаа, provider ID-аар хайна; хувийн дүн/нууц түлхүүрийг delivery log-д хийхгүй.

Notion-ийн reminder нь санаа авах жишээ. Recurring calendar event ба recurring reminder нь ижил боломж биш; албан FAQ дээр recurring reminders дэмжихгүй гэж заасан. [Notion reminders](https://www.notion.com/en-gb/help/reminders)

Resend-ийн үнэ/үнэгүй plan-ийн өдөр тутмын хязгаарыг сонгох үед дахин шалгана. 19 багш ×2 email/өдөр ×30=1140 email/сар, 38/өдөр; харин 1000 сурагчид нэг дор email илгээх нь 100/өдрийн free cap-д багтахгүй. **2025-12-05-ийн түүхэн** Pro $20/50k, overage $0.90/1000 гэдэг нь зөвхөн нөхцөлт жишээ; өнөөгийн гэрээт үнийн баталгаа биш. [Одоогийн pricing](https://resend.com/pricing), [түүхэн үнийн өөрчлөлт](https://resend.com/changelog/pay-as-you-go-pricing), [delivery events](https://resend.com/changelog/improved-bounced-and-delivery-details)

## 7. Нүүр царай, амжилт, медиа

Санал: он сонгох → хичээлээр шүүх → амжилтын зураг → тухайн үеийн бодит үйл явдал. 800 оноонд зөөлөн хүрээ/glow, текстэн тэмдэг. Багшийн танилцуулгад зөвшөөрөлтэй зураг, заадаг хичээл, бодит намтар. Дэмждэг орчинг “бид гэр бүл” гэх баталгаагүй урианаас илүү бодит зураг, богино түүх, сайн зохион байгуулсан мэдээллээр мэдрүүлнэ.

Контент код/manifest-аар version review хийж шинэчлэгдэнэ; тусгай гар admin CMS шаардахгүй. Manifest шаардлага: stable ID, year, subject/event, title, source, media reference, publication permission, alt/caption, draft/published. Эх постын холбоос, 2018 эхэлсэн эсэх, хүний оноо, зөвшөөрөл хараахан нийлүүлээгүй тул зохиомол зураг/оноо оруулаагүй.

Sony камераар авсан өндөр чанарын master-ийг байнгын архивт, веб derivatives-ийг thumbnail/phone/desktop байдлаар. “Чанартай хадгалах” нь хүн бүрт raw camera file татуулах гэсэн үг биш. srcset/sizes, lazy loading, poster, pagination; next media preload бага хязгаартай. [MDN responsive images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)

Brand book TODO: logo variants/clear space, өнгө ба semantic өнгө, багшийн theme, typography/кирилл/LaTeX, spacing, фото crop, watermark, хөдөлгөөн/reduced-motion, contrast, loading/error/empty/retry. Watermark нь хуулбарлалтыг 100% хориглохгүй. Арга хэмжээнүүдийн зураг/видео master нь homework-ийн 30 хоногийн устгалд орохгүй.

Хэмжээний жишээ: 5000 зураг ×10MB=50GB master; derivative, backup, video, download тусдаа. Бодит фото/видео тоо байхгүй тул “яг сарын төлбөр” зохиохгүй.

## 8. Шалгалтын анхаарал, асуулт, санал хүсэлт

Одоогийн exam page: visibility hidden, blur, fullscreen exit; 1.5секундийн client debounce; хоёр leave-д finish. Autosave 20 секунд орчим **jitter-тэй**. Хуучин UX audit-ийн “jitter үгүй” гэсэн claim-г шинэ нотолгоо гэж ашиглахгүй. Server merge event бүрт count+1; үзсэн merge хэсэгт event ID dedupe харагдаагүй, бүх concurrency/save замыг дараагийн аудит шалгана.

Blur нь заавал tab hidden биш; permission dialog, focus өөрчлөлт байж болно. Hidden нь өөр app/lock/minimize ч байж болно. Аль нь ч хуулалтын баталгаа биш. Page Visibility-г үндсэн, fullscreen-г тусдаа event гэж үзэх санал. Нэг hidden interval нэг event; stable eventId, bounded local queue, existing autosave-д batch, сервер dedupe. [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

sendBeacon бол best effort; accepted queue нь сервер хадгалсан acknowledgement биш. Reconnect үед ID-тэй дахин илгээх, server count-г source болгох; crash/force-close дээр event алдагдахыг бүрэн арилгана гэж амлахгүй. [MDN sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)

5000 хүн ×20 event=100000 event; 120 byte гэж таамаглавал12MB raw payload. JSON wrapper, request overhead, index, logging, retries тусдаа. Ачааллыг зөвхөн byte-аар хэмжихгүй; request count/burst/DB writes хэмжинэ. Хоёр leave-д хүчээр дуусгах дүрмийг эхлээд хэрэглэгчтэй батална; одоо production кодыг өөрчлөөгүй.

**Сурагчийн бодлогын асуулт:** problemId/assignment → тайлбар → ангийн багш inbox → уншсан/маргааш тайлбарлах/хариулсан → сурагч тодруулах/шийдсэн. Номын гаднын худалдан авагчид төвийн багшийн үйлчилгээ дагалдахгүй. Энэ нь одоогийн багшийн homework үнэлгээний comment-той адил зүйл биш.

**V1 заавал feedback:** бүх сурагч цэснээс report; алдаа/санал/ойлгомжгүй хэсэг; ref ID; triage; явц/хариу; шийдсэн/дахин нээх. Хувийн screenshot нийтэд гарахгүй; нэргүй санал эсэхийг батална. Энэ HTML дээрх эзний review нь бүтээгдэхүүний сурагчийн feedback-ээс тусдаа.

**Дэмжлэгийн пост:** бүх багш өөрийн эрхийн хүрээнд text/video, audience; хүүхэд хүсвэл уншина. Шалгалтын стрессийг оношлохгүй; сонголттой тайван хэсэг. Хэрэглэгчийг олон цаг байлгахын тулд хязгааргүй feed/autoplay/дарамттай streak хийхгүй. Зорилго нь сурахад хэрэгтэй ажил нэг дор шийдэгдэх.

## 9. Нийгэм ба томьёоны хүрээ

Subject enum, Book.subject, EnrollmentWindow кодод байна. Нийгмийн анги/ирц/амжилтыг харах хэрэгцээ одоо; lesson file ба өргөн тестийн сан дараа. Математикийн ангиллыг бүх хичээлд хүчээр тулгахгүй. Формула сангийн өгөгдөл, problem link, LaTeX харагдац, шалгалтын үед зөвшөөрөх эсэхийг тусдаа батална.

## 10. Дараагийн хувилбаруудын судалгаа ба үнэ

| Санаа | Хамгийн түрүүнд батлах асуулт | Туршилт / зардлын хязгаар |
|---|---|---|
| Хувийн planner | Хүүхдэд ямар 3–5 өдөр тутмын ажил үнэхээр хэмнэх вэ? | 1000×5edit×30=150000write/сар; 2KB=300MB raw; index/history/read/reminder тусдаа |
| OCR + solver | Монгол өгүүлбэр, гар бичиг, геометрийг хэр зөв таних/бодох вэ? | 100–300 teacher-key dataset; cost per correctly solved item |
| Анги/насны багц | Ямар бодит контент, эрхийн хугацаа, duplicate purchase дүрэмтэй вэ? | Үнэ/эрэлт турших; контентгүй анги амлахгүй |
| Хувийн төслийн туслах | Файл/шийдвэрийг зөв олох уу, хуучныг одоогийнх гэж андуурах уу? | 20 бодит асуултын test; model/API/tool/indexing зардал |

### Planner

Calendar view нь day/week agenda, төвөөс read-only linked event, өөрийн task, давтамж, quiet hours. Default private. Google/Notion-той хоёр чиглэлт sync-ийг эхний хувилбар гэж үзэхгүй: OAuth, revoked access, recurring exceptions, duplicate/conflict, timezones, offline нь тусдаа өртөг. 5000 идэвхтэй хүн секунд бүр polling хийвэл5000req/s, минут бүр бол~83req/s гэсэн жишээ; бодит хэрэгжилт visible-tab/delta/cache/notification шаардлагаар шийдэгдэнэ. Байнгын polling хэрэгтэй гэсэн санал биш.

### OCR

Mathpix-ийн шалгасан нийтэд буй үнэ: image $0.002 (эхний1M/month tier), 12 мөрөөс урт текст PDF/page $0.005 нөхцөлтэй. 20000 богино image=$40 OCR-only; $19.99 нэг удаагийн setup, solver model, compute, storage, retries, татвар тусдаа. [Mathpix pricing](https://mathpix.com/pricing/api), [баримт](https://docs.mathpix.com/)

OCR нь answer solver биш. Crop → recognize → сурагч засаж батлах → solve/verify → uncertainty/abstain. Photomath ч scan дараа edit хийх замтай. [Photomath scan/edit](https://support.google.com/photomath/answer/14333327?hl=en)

Гол эрсдэл: exponent/minus/root ambiguity, олон бодлого, дутуу нөхцөл, geometry diagram, Монгол нэр томьёо, answer hallucination, quota abuse, гуравдагч талын retention. Mathpix default30day, opt-out24h deletion нөхцөлийг хэрэгжүүлэх үед дахин батална. Хувийн зураг model training-д зөвшөөрөлгүй ашиглахгүй. V1-д OCR/AI solver байхгүй.

### Хувийн туслах

Эхний санал нь model сургах биш: шаардлага/decision log, repo file index, source hash/date, retrieval, зөв ишлэл. Fine-tuning нь байнга өөрчлөгддөг файлын байрлалыг санах үндсэн арга биш. Read-only эхлэх, secrets exclusion, өөрчлөлтийг diff-ээр review, хуучирсан баримтыг refresh; автоматаар publish/имэйл/санхүү хийхгүй.

Албан pricing хуудсаар 2026-09-24 шалгасан Sonnet5 жишээ: input$2/M, output$10/M. Өдөр20turn×30=600turn; turn бүр10kinput+2koutput бол600×($0.02+$0.02)=$24/сар model-only. Context100kinput бол$132/сар. Cache/retrieval нь бууруулж болно; tools/indexing/storage/retries/tax/subscription тусдаа. Энэ нь сонголт баталсан гэсэн үг биш. [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Sonnet](https://www.anthropic.com/claude/sonnet)

Local хувилбарт API төлбөргүй байж болох ч hardware/electricity, чанар, latency, maintenance бий. Дараа platform/provider-уудыг бодит 20 асуултаар харьцуулж сонгоно.

## 11. Шалгах дараалал ба нээлттэй шийдвэр

1. Хэрэглэгчийн шаардлага, actor, normal/error flow, V1 хүрээ, acceptance-ийг уншиж review үлдээх.
2. Бодит багш/сурагч/эцэг эхийн төлөөллөөр task walkthrough; давхар/хэрэггүй алхмыг хасах.
3. Нээлттэй шийдвэрийг эзэн баталж requirement baseline болгох.
4. **Дараа** software architecture: reuse/replace, object/module/API/data, эрх, migration, error, observability, 5000exam load, backup/restore.
5. **Дараа** код, integration/permission/mobile/load tests, нийтлэх ба rollback.

Одоо шийдээгүй: цагийн Excel-ийн сар/он; pay policy; эрхтэй хүний ID; schedule publication cutoff; хоолны цаг цалинд орох эсэх; имэйлийн V1 scope; асуулт/дэмжлэг/planner-ийн үе; төслийн туслахын төсөв; public зураг/эх пост/зөвшөөрөл; шалгалтын leave penalty. Эдгээрийг default-оор зохиож батлаагүй, блокийн «шийдэх зүйл» болгосон.

Үнийн судалгааны TODO: provider region, free tier/overage, request/egress/video, payment fee/банк, email, OCR/agent, VAT/ханш, хүний үйлчилгээ, backup/recovery, peak ачаалал. 700/1000 сурагч ба5000concurrent шалгуулагчийн загварыг ялгана. Төсөв нь хэмжилтээр шинэчлэгдэх хувилбартай баримт байна.
