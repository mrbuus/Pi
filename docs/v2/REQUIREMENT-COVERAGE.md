# Pi.mn v2 — шаардлага ба нотолгоо

Туршилтын локал хувилбар. Хийсэн код болон баталгаатай туршилтыг тусад нь тэмдэглэнэ. Бодит үйлчилгээний тохиргоо, төлбөр, хууль/лиценз болон 5000 хэрэглэгчийн cloud acceptance дуусаагүй.

## D01 Онол, тест, даалгаврыг нэг өдрийн багцаар холбоно

Төлөв: **tested**

Багш анги, өдөр, сэдвээ сонгоход онол, ангийн сорил, гэрийн даалгаврыг нэг өдрийн багцад урьдчилан бэлдэнэ. Багш бодлого, онолыг нэмж хасаж хадгалж болох бөгөөд давтан хадгалалт ижил багцыг ашиглана. Бүх ангийн бодит хичээлд тохирох агуулгыг багш өөрөө шалгана.

Нотолгоо: Actual local PostgreSQL + HTTP: five concurrent class/day saves create one packet, test session and homework assignment; later teacher edit retains IDs and reload prefill. Atomic packet save freezes chapter identity; excluded test problem lists and explicitly selected theory blocks retained. Teacher UI typecheck/lint pass; full browser interaction not executed by this subagent.

Шалгах нөхцөл: Owning teacher selects UB class/day/chapter, views theory, selects class test and explicit published A makeup test, adjusts homework and saves. Concurrent replay creates one linked packet/session/assignment; later edit preserves IDs and original pupil receipts.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07; docs/PLATFORM-SPEC.html teacher-home/homework

`api/src/lesson-flow/lesson-flow.controller.ts`
`api/src/lesson-flow/lesson-flow.service.ts`
`api/src/lesson-flow/rotation.ts`
`web/src/app/app/lesson-flow/page.tsx`
`api/src/lesson-flow/local.integration.cjs`
`api/prisma/schema.prisma`

## D02 Илгээсэн хүүхдийн тоог давхардуулалгүй харна

Төлөв: **tested**

Өдрийн багцад онол, ангийн сорил, гэрийн даалгавар тус бүрийн илгээсэн хүүхдийн тоог тухайн өдрийн ангийн хүүхдийн тоотой харьцуулна. Нэг хүүхэд хэд дахин зураг илгээсэн ч нэгээр тоолно. Илгээсэн гэдэг нь зөв бодсон гэсэн дүн биш.

Нотолгоо: Actual HTTP verifies three distinct pupil counters and original receipts retained. Class test unions packet receipts, fully marked included bank problems for exact class/day, and submitted online sessions started that day. Partial evening marking does not count. Homework unions packet receipts with actual linked assignment submissions. Submission evidence is never a correctness grade.

Шалгах нөхцөл: Two-pupil packet: five replayed receipts and multiple revisions by one pupil count1; partial second pupil marking leaves1; full included marking becomes2; theory/class-test/homework counters divide by distinct historical-day roster.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/lesson-flow/lesson-flow.service.ts`
`web/src/app/app/lesson-flow/page.tsx`
`api/src/lesson-flow/local.integration.cjs`
`api/prisma/schema.prisma`

## D03 Ирцтэй хүүхдээс онолын зураг оруулах ээлж сонгоно

Төлөв: **tested**

Онолын зургийг өгөх ээлжийг ирцтэй уялдуулан сонгож, тасалсан хүүхдийн алдсан ээлжийг дараагийн боломжид түрүүлж өгнө. Багш шалтгаантайгаар өөр хүүхэд сонгож болно. Ээлж оноосон бүртгэл болон хүүхэд үнэхээр зураг илгээсэн бүртгэл тусдаа байна.

Нотолгоо: Persistent class advisory lock and packet-unique turn: four concurrent turn requests one ID; absent pupil pending, returned pupil next-day MISSED_TURN; teacher override preserves turn ID/reason and requeues unserved replaced pupil. Pure attendance selector tests pass. A turn is assignment evidence; actual photo receipt remains separately recorded.

Шалгах нөхцөл: Present/late pupils only; unknown/absent/excused cannot be overridden into capture duty. Absent unserved pupil gets returning priority. Reload/retry keeps same packet turn. Owner teacher override requires reason and changes same turn under lock.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/lesson-flow/rotation.ts`
`api/src/lesson-flow/rotation.spec.ts`
`api/src/lesson-flow/lesson-flow.service.ts`
`api/src/lesson-flow/local.integration.cjs`
`api/prisma/schema.prisma`

## D04 Тасалсан хичээлийг А хувилбараар нөхнө

Төлөв: **partial**

Тасалсан хүүхэд өөрийн ангийн өдрийн багцаас онол, хамтын зураг, багшийн сонгосон А хувилбарын сорилыг нээж, нөхсөн ажлын зураг эсвэл баримт илгээнэ. Өмнөх илгээлтүүд хадгалагдана. Нөхөлтийн ажлыг багш тусад нь үнэлэх бүрэн урсгал одоогоор гүйцээгүй.

Нотолгоо: Teacher-selected published variantLabel A is packet-linked and class TestAccess granted atomically. Actual HTTP verifies own bounded MAKEUP image/PDF receipt and retained prior revisions. Pupil UI links the actual A test and uploads through uploadFile; full online A test start/grade and a dedicated makeup teacher assessment workflow not freshly verified.

Шалгах нөхцөл: Absent pupil opens saved day, exact teacher A variant and theory/shared photo, takes authorized A test, uploads owned evidence. Teacher reads selected pupil receipt; verified parent sees child-only packet evidence and existing assignment original/assessment; random class/pupil denies.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07; docs/SYSTEM-DESIGN-V4-RESEARCH.md VS01

`api/src/class-sessions/class-sessions.service.ts`
`api/src/assignments/assignments.service.ts`
`web/src/app/app/lesson-flow/page.tsx`
`api/src/lesson-flow/lesson-flow.service.ts`
`web/src/app/app/lesson-flow/my/page.tsx`
`api/src/lesson-flow/local.integration.cjs`

## D05 Ангид ном дээр тэмдэглээд гэрт анхны хариугаа бөглөнө

Төлөв: **tested**

Хүүхэд утас ашиглаагүй хичээлийн дараа гэртээ анхны хариугаа оруулж, эргэлзсэн, таасан, чадаагүй эсвэл тусламж авсан эсэхээ тэмдэглэнэ. Анхны хариу хадгалагдаж, дараагийн засвар түүнийг солихгүй. Энэ нь хүүхдийн өөрийн тэмдэглэгээ бөгөөд анги доторх үйлдлийг шууд ажигласан бүртгэл биш.

Нотолгоо: Actual local HTTP integration passed; immutable per-user/problem evidence.

Шалгах нөхцөл: Five concurrent replays/reload preserve initial answer/flags; later correction never replaces it.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/learning-lab/learning-lab.service.ts`
`web/src/components/study/StudyTask.tsx`
`api/src/learning-lab/local.integration.cjs`

## D06 Анхны зөв, тусламжтай засвар, дараагийн шалгалтыг ялгана

Төлөв: **tested**

Хүүхэд анхны хариуныхаа үр дүнг хараад дахин оролдож, дараа нь бодолтыг нээж болно. Анхны зөв хариу, бодолт үзсэний дараах засвар, хугацааны дараах дахин оролдлогыг тусад нь хадгална. Давтан зөв бодсоныг шууд эзэмшсэн чадвар гэж дүгнэхгүй.

Нотолгоо: Service tests and local HTTP passed; PostgreSQL advisory lock serializes solution/retry. Probe timing provisional, not validated mastery model.

Шалгах нөхцөл: Solution/retry concurrent requests preserve commit ordering; assistance flagged; delayed distinct seed does not count as original unseen success.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07; docs/research/00-ALGORITHM-SPEC.md

`api/src/learning-lab/learning-lab.service.ts`
`web/src/components/study/StudyTask.tsx`
`docs/v2/LEARNING-REVIEW.md`

## D07 Үйлдэл ба харагдсан хугацааг болгоомжтой бүртгэнэ

Төлөв: **tested**

Суралцах хэсэг нээлттэй, харагдаж байсан хугацаа болон товч ашигласан тоог хязгаартайгаар нэгтгэнэ. Далд цонх, анхаарал тодорхойгүй хугацааг тусад нь ялгана. Энэ бүртгэл хүүхдийн бодит анхаарлыг хэмжихгүй, хурд дангаараа чадварын үнэлгээ болохгүй.

Нотолгоо: 5 clock tests passed, including real fractional performance.now regression. Raw durations retain fractions; API summaries floor conservatively to integer milliseconds. Six actual advanced Study mobile flows now save201; no actual-attention claim.

Шалгах нөхцөл: Hidden/blurred/suspension/backward/NaN intervals classified conservatively; bounded counts; no ability label based on speed.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07

`web/src/components/study/attention.ts`
`web/src/components/study/attention.test.mjs`

## M01 Баталгаажуулсан загвараар локал бодлого үүсгэнэ

Төлөв: **tested**

Суралцагч шулуун ба квадрат тэгшитгэл, бутархай, гурван хэмжээст векторын скаляр үржвэр, олон гишүүнтийн уламжлалын утга, тодорхой интегралын дасгал сонгож болно. Бодлого, хариуг хязгаарласан дүрмээр яг тооцож шалгана. Бүх төрлийн бодлого боддог систем эсвэл баталгаатай хүндрэлийн үнэлгээ биш.

Нотолгоо: 22 LearningLab tests across four suites pass; original families 2,000 seeds each, advanced families 4,000 seeds each plus uint32 extremes and independent rational/power-sum oracle. Actual local HTTP grades Buyer advanced tasks, hides keys, preserves first/replay/reload. 1,414 KaTeX expressions render. Bounded linear/quadratic/fractions/3D dot/derivative-at-point/definite-polynomial-integral only; no universal solver or empirical difficulty. Actual365/375px advanced Study six flows pass for Student classroom and Buyer independent across all three advanced families: first POST201, same task reload, immutable original111 after correction/solution, no math render errors or overflow.

Шалгах нөхцөл: Many seeds and rational/extreme inputs independently verify exact substitution; no answer key before submit; unsupported family rejected.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/learning-lab/generator.ts`
`api/src/learning-lab/generator.spec.ts`
`api/src/learning-lab/advanced-templates.ts`
`api/src/learning-lab/advanced-templates.spec.ts`
`api/src/learning-lab/local.integration.cjs`

## L01 Нэг гол үйлдэлтэй суралцах дэлгэц

Төлөв: **tested**

Суралцах нүүрээс хүүхэд нэг ажлаа сонгон, тухайн бодлого дээрээ төвлөрч ажиллана. Өөрийн даалгавар, онол, алдаагаа давтах болон өдрийн багц руу хүрэх холбоосууд бий. Бүх хуучин сургалтын дэлгэцийг нэг урсгалд бүрэн нэгтгээгүй.

Нотолгоо: Actual365/375px browser flows pass for classroom Student and independent Buyer: bounded generator, immutable first response, reload, help and correction remain separate; source-bank review uses selected topics and10/30/60 budgets. Advanced disclosures stay closed by default. This is scoped flow validation, not every inherited screen certified.

Шалгах нөхцөл: 375px pupil opens current assignment/theory/topic test; source failure distinguish unavailable from no activity; reload preserves task.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07

`web/src/app/app/study/page.tsx`
`web/src/components/study/StudyTask.tsx`
`web/src/components/study/TheoryReader.tsx`
`web/src/app/app/lesson-flow/my/page.tsx`

## L02 Бие даах тест болон долоо хоногийн шалгалт

Төлөв: **partial**

Суралцагч эрхтэй сэдвийн сорилдоо орж, хадгалсан хариугаа үргэлжлүүлэн шалгалтаа илгээнэ. Хугацаа болон эцсийн дүнг серверийн бүртгэлээр тогтооно. Долоо хоног бүрийн шалгалтыг автоматаар зохион байгуулах бүрэн урсгал одоогоор баталгаажаагүй.

Нотолгоо: Existing TestAttemptSession implementation inspected; weekly orchestration not proven by this audit. Actual BUYER JWT-role regression: unentitled bank403; after real chapter pass bank/response succeeds using actual BUYER role.

Шалгах нөхцөл: Pupil can start authorized topic and weekly exam, autosave/reload, submit server-timed session, see final immutable result.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07; docs/PLATFORM-SPEC.html tests

`api/src/tests/tests.service.ts`
`api/src/tests/tests.controller.ts`
`web/src/app/app/tests/page.tsx`
`api/src/learning-lab/learning-lab.controller.ts`

## L03 Жилийн бодит идэвх, суралцах түүх

Төлөв: **tested**

Баталгаажсан эцэг эх хүүхдийнхээ жилийн бодит оролдлого, өдрийн багц, даалгаврын илгээлт болон багшийн харагдах үнэлгээг түүхээс үзнэ. Хуучин илгээлтүүдийг архивласан эхтэй нь хадгална. Үйлдлийн тоог чадвар эсвэл анхаарлын баталгаа гэж тайлбарлахгүй.

Нотолгоо: Parent unit + actual local HTTP annual/historical fixtures passed; counts are evidence, not inferred ability. Actual parent annual response includes two authorized class-day packets and child-only5 append receipt snapshots.

Шалгах нөхцөл: Verified parent selects year, paginates all categories, sees actual totals, archived submitted work and original/assessment revisions.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/parents/parents.service.ts`
`api/src/parents/parent-history.ts`
`web/src/components/parent/ChildHistory.tsx`
`api/src/activity/activity.service.ts`
`api/src/lesson-flow/local.integration.cjs`

## L04 Сэдэв, хугацаагаа сонгосон давтлага ба түүх

Төлөв: **tested**

Суралцагч эрхтэй сэдвүүдээсээ сонгон 10, 30 эсвэл 60 минутын давтлага эхлүүлж, дахин нээхэд анхны хугацаа, хариугаа хэвээр үргэлжлүүлнэ. Хаасны дараах тусламжтай засвар анхны дүнг өөрчлөхгүй; өөрийн болон баталгаажсан хүүхдийн жилийн хураангуйг үзэж болно. Бодлогын тооны хязгаар нь хурдны зорилт биш бөгөөд энэ давтлага албан ёсны шалгалтын оноонд орохгүй.

Нотолгоо: Annual owned/verified-parent history API adds10 focused tests (StudyReview total26), plus production controller/JWT/Postgres proof of UB-year boundary, safe pagination/foreign cursor denial, verified-parent matrix, no answer keys and immutable first vs assisted correction. New history UI browser verification separately coordinated. 16 input/selection/key/choice-boundary tests; API/web typecheck and scoped lint pass. Latest real PostgreSQL/JWT/HTTP: eight-way start/first concurrency, immutable first, hash conflict, owner404/paid entitlement403, source/key snapshot, server expiry, post-review correction, no official TestResult. Invalid key/prior exposure excluded; pre-first video excludes independent evidence; deleted-book resume denied; lost-start recovery finds active run. Frozen-image replace-key owner200/foreign403/expired403; private Feedback and Revision precedence403. Actual365/375px nine UI flows: Student free, Buyer free and Buyer granted private across10/30/60;5/10/20 caps, keyboard flags, same deadline/first after reload, submit/correction unchangedfirstscore, no math errors/overflow. Final current-source isolated compile HTTP also passes numeric2+0→400/no first, exact4/2→true for frozen2, choice9/abc→400/no first, structured choice1→true and closed answer text1.9 targeted API suites59 tests and11 Study/clock tests pass; shared runtime restart is root-owned. Official-session exposure adds3 tests (StudyReview total29) plus actual production HTTP: previous issued/draft-only IDs excluded, an official session introduced after review creation marks first assisted, closed keys/solutions hidden for live IN_PROGRESS deadline overlap and released after expiration; history and official results unchanged. Live official overlap also rejects FIRST and CORRECTION403 before any response write; the same request succeeds assisted after official expiry. Five exposure tests bring StudyReview to31 tests; exact-source production JWT/HTTP proof confirms no response writes during live overlap and unchanged official results.

Шалгах нөхцөл: STUDENT/BUYER selects1–5 entitled topics and10/30/60min; bounded5/10/20 bank tasks hide keys until close; reload keeps server deadline and first; conflicting parallel replay denied; post-review correction never alters first/ranking; deleted/revoked entitlement and malformed keys denied.

Эх: Latest v2 user request conveyed in root task, 2026-10-07

`api/src/study-review/study-review.service.ts`
`api/src/study-review/study-review.controller.ts`
`api/src/study-review/study-review.policy.ts`
`api/src/study-review/study-review.policy.spec.ts`
`api/src/study-review/local.integration.cjs`
`web/src/app/app/study/review/page.tsx`
`docs/v2/SELF-REVIEW-DESIGN.md`

## P01 Баталгаажсан эцэг эх зөвхөн хүүхдээ харна

Төлөв: **tested**

Эцэг эх зөвхөн баталгаажсан холбоостой хүүхдийнхээ мэдээлэл, дүнг үзэж, танилцсанаа тэмдэглэнэ. Баталгаажаагүй болон өөр хүүхдийн холбоос мэдээлэл нээхгүй. Танилцсан тэмдэглэгээ нь хүүхдийн хариу, багшийн үнэлгээг өөрчлөхгүй.

Нотолгоо: Parent focused unit/HTTP fixtures passed; SMTP delivery external config, no provider called. Actual packet/child history HTTP denies other-child parent; pending parent denied packet and photos.

Шалгах нөхцөл: Pending/other-child parents denied history and both OTP acknowledgement stages; result IDs and persisted ack timestamp returned.

Эх: docs/PLATFORM-SPEC.html parent; Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/parents/parents.service.ts`
`api/src/parents/parents.service.spec.ts`
`web/src/app/app/parent/page.tsx`

## P02 Анги тарсан ойролцоо цаг

Төлөв: **tested**

Багш тухайн өдөр анги тарах ойролцоо цаг болон шаардлагатай бол хамгийн сүүлд тарах цагийг тэмдэглэнэ. Эцэг эхэд энэ нь ангийн мэдээлэл гэж харагдана. Хүүхэд бүрийн бодитоор гарсан цаг, байршил эсвэл шууд ирцийн баталгаа биш.

Нотолгоо: 5 unit tests + actual local HTTP passed.

Шалгах нөхцөл: Owner teacher enters UB day/time; random plus rejected; parent sees only enrolled historical day, label explicitly class estimate.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/learning-lab/dismissal.service.ts`
`api/src/learning-lab/dismissal.spec.ts`
`web/src/app/app/dismissal/page.tsx`
`api/src/parents/parent-history.ts`

## P03 Хувийн файлын хандалтын эрх

Төлөв: **tested**

Хүүхдийн хувийн зураг, даалгаврыг эзэмшигч хүүхэд, баталгаажсан эцэг эх, эрхтэй ангийн багш л нээнэ. Онолын хамтын материалыг тухайн агуулгын эрхээр шалгана. Файлын холбоос дахь нэвтрэх мэдээлэл задрах эрсдэлийг бүрэн арилгасан тусгай богино настай холбоос хараахан хийгдээгүй.

Нотолгоо: 11 new file unit tests and actual local HTTP matrix passed; query bearer leakage remains documented. Actual packet shared THEORY class/parent matrix and private CLASS_TEST/HOMEWORK/MAKEUP matrix passed, plus ownerless packet-theory reference.

Шалгах нөхцөл: Author/verified parent/assigned teacher/admin permitted private revision; random pupil/plus/pending parent deny; revoked/expired tokens401.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/storage/files-auth.guard.ts`
`api/src/storage/file-authorization.service.ts`
`api/src/storage/files.local.integration.cjs`

## P04 Анхны илгээлт ба багшийн үнэлгээний түүх

Төлөв: **tested**

Хүүхдийн анхны илгээсэн зураг болон багшийн хүүхдэд харагдах үнэлгээг тусад нь үзэж, засварын өмнөх хувилбаруудыг түүхээс нээж болно. Ижил илгээлтийг давтахад хуулбар үүсгэхгүй, өөр зурагтай давтвал зөрчлийг мэдэгдэнэ. Багшийн хувийн зан төлөвийн тэмдэглэл эцэг эхэд харагдахгүй.

Нотолгоо: Actual local parent fixture confirms snapshot/private exclusion; interface agent owns broader revision tests. Packet receipts are append-only snapshots with immutable clientRequestId replay; altered attachment payload on same key409. SessionStorage retains pending request/keys for client reload retry.

Шалгах нөхцөл: Original SUBMIT survives return/reupload/approve; visible studentNote/reviewNote distinct; ambiguous legacy/private actor excluded parent DTO.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/assignments/assignments.service.ts`
`api/src/assignments/submission-history.spec.ts`
`web/src/components/parent/ChildHistory.tsx`
`api/src/lesson-flow/lesson-flow.service.ts`

## C01 Бодлого, тест, номын хэвлэмэл дугаарын холбоос

Төлөв: **partial**

Номын бодлого, сорилыг тогтмол дугаар болон хэвлэмэл тэмдэглэгээгээр нь олж, ажилтай нь холбоно. Үүсгэсэн дасгал эх номын бодлогыг сольж бичихгүй. Бүх агуулгын хувилбарыг царцаах, хуучин дүнг дахин үнэлэх нийтлэг механизм бүрэн хийгдээгүй.

Нотолгоо: Printed-token lookup and no bank mutation by generated lab tested; universal content-version freeze/regrade not established.

Шалгах нөхцөл: Edit/reimport same printed token cannot silently overwrite bank; versioned exam retains key/rubric; archived original still resolve.

Эх: docs/SYSTEM-DESIGN-V4-RESEARCH.md LH/QT/CQ; Latest v2 user requirements conveyed in root task, 2026-10-07

`api/prisma/schema.prisma`
`api/src/content/content.service.ts`
`api/src/class-sessions/class-sessions.service.ts`
`api/src/learning-lab/learning-lab.service.ts`

## C02 Онолын зураг, PDF үзүүлэх

Төлөв: **tested**

Хүүхэд эрхтэй онолын зураг, баримтыг нээж үзнэ; өдрийн багцын түүхэн хамтын зураг тухайн өдрийн анги болон баталгаажсан эцэг эхэд хэвээр хүрнэ. Архивласан онол идэвхтэй жагсаалтаас хасагдаж, эрхтэй багш сэргээж болно. Материалын эрхгүй хэрэглэгч зөвхөн файлын нэр мэдсэнээр нээхгүй.

Нотолгоо: Historical class-day theory images and PDF/media viewer pass real authorization and mobile browser checks. Theory archive retains rows, text and media and supports privileged restore; archived content leaves active lists. Sixteen retention/idempotency tests and actual PostgreSQL archive/restore with audit pass.

Шалгах нөхцөл: Authorized pupil/purchased-book child/parent display file; unauthorized key deny; math uses MathText; upload provenance retained.

Эх: docs/PLATFORM-SPEC.html content-admin; Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/lessons/lessons.service.ts`
`web/src/components/study/TheoryReader.tsx`
`api/src/storage/file-authorization.service.ts`
`api/src/lessons/theory-retention.spec.ts`
`api/src/lessons/theory-retention.local.cjs`

## C03 Номын эх, хариуны түлхүүрийн шалгалт

Төлөв: **partial**

Багш цаасан бодлогын эхийг оруулж, хуудас, дугаар, хариуны тохирлыг шалгасны дараа ашиглана. Импортын хэрэгсэл байгаа нь бүх эх зөв танигдсан, бүх хариу баталгаажсан гэсэн үг биш. Эхийн эрх, танилтын алдаа, хариуны чанарыг хүний хяналтаар баталгаажуулах шаардлагатай.

Нотолгоо: Existing modules inspected; do not infer all content reviewed or complete.

Шалгах нөхцөл: Import fixture maps page/number/key, teacher previews and publishes; malformed OCR remains draft; no internal author notes leak.

Эх: docs/SYSTEM-DESIGN-V4-RESEARCH.md QT/CQ; docs/PLATFORM-SPEC.html import

`api/src/document-import/document-import.service.ts`
`api/src/content/content.service.ts`
`web/src/app/app/import/page.tsx`

## C04 Бодлого бүрийн видео бодолт

Төлөв: **partial**

Багш+ эсвэл админ тайлбарын бичлэгийг яг тухайн бодлоготой холбоно. Хүүхэд хүссэн үедээ бичлэгийн тайлбарыг нээх бөгөөд үзсэн тусламж нь дараагийн оролдлогын бүртгэлд ялгагдана. Нийтийн жагсаалтад харагдахгүй YouTube холбоос бусдад дамжиж болох тул хувийн хамгаалалт гэж амлахгүй; хувийн видео байршуулалтын үйлчилгээ бүрэн холбогдоогүй.

Нотолгоо: Per-problem exact ID nullable FK/creator, same-chapter Plus/Admin attach/detach, ordinary teacher author ownership with legacy deny, transaction audit/soft deletion, entitlement, metadata-only lazy disclosure and explicit help exposure implemented. 17 focused API suites/153 tests (22 video, nine purchase boundary) and actual synthetic local PostgreSQL/HTTP matrix pass; API build, targeted API lint and full web typecheck pass. Plain BOOK grants theory/problem/list access; media requires includesVideo. Actual HTTP verifies expiry/refund/future-pass boundaries and listing/direct agreement. Direct HTTPS media requires configured trusted origins; no private upload/provider/DRM or immutable problem-version pin fabricated. YouTube unlisted links are shareable; browser playback and external provider availability not tested.

Шалгах нөхцөл: Teacher attaches authorized video to exact problem/version; pupil sees only entitled media; provider URL/upload grant validated.

Эх: docs/SYSTEM-DESIGN-V4-RESEARCH.md PV01–11; Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/videos/videos.service.ts`
`api/prisma/schema.prisma`
`web/src/app/app/videos/page.tsx`
`api/src/videos/media-policy.ts`
`api/src/videos/videos.controller.ts`
`api/src/videos/videos.service.spec.ts`
`api/src/videos/media-policy.spec.ts`
`api/src/videos/videos.local.integration.cjs`
`web/src/components/content-admin/VideosPanel.tsx`
`web/src/components/lesson/ProblemVideoDisclosure.tsx`
`web/src/components/lesson/LessonVideoPlayer.tsx`
`web/src/components/lesson/media-source.ts`
`docs/v2/VIDEO-REVIEW.md`
`api/src/common/access.ts`
`api/src/common/purchase-access.spec.ts`

## C05 Томьёоны сан ба давталт

Төлөв: **tested**

Суралцагч томьёогоо хайж уншаад, давтах хэсгээс эргэн ажиллаж болно. Давталтын хуваарийн хэрэгсэл бий. Одоогийн хуваарийг хүүхэд бүрийн суралцах үр дүнг баталгаатай сайжруулдаг гэж дүгнээгүй.

Нотолгоо: Whole API suite includes existing formula scheduler/tests; separate KaTeX validator checks9 formula source files and387 formulas. Formula curation remains permission-scoped; licensed completeness and every curriculum skill require teacher review.

Шалгах нөхцөл: Seed fixture formula MathText valid, review due queue updates AGAIN/HARD/GOOD/EASY and survives reload.

Эх: docs/CODEX-SPRINT-2.md T01/T09/T10

`api/src/formulas/formulas.service.ts`
`api/src/formulas/review-scheduler.ts`
`web/src/app/app/formulas/page.tsx`

## C06 Алдааны дэвтэр ба бэлэн байдлын тайлбар

Төлөв: **partial**

Суралцагч алдсан бодлогоо эргэн харж, дахин оролдох хэсгийг сонгоно. Бэлтгэлийн мэдээлэл нь байгаа оролдлогод тулгуурлана. Шалгалтад авах оноо эсвэл хувь хүний чадварыг баталгаатай таамаглах загвар хараахан батлагдаагүй.

Нотолгоо: Existing modules; research draft warns citation quality, not validated individual predictor.

Шалгах нөхцөл: Sparse/no assessed topic says untested; original wrong and corrected evidence distinguish; no official exam forecast from tiny sample.

Эх: docs/CODEX-SPRINT-2.md T12/T13; docs/research/00-ALGORITHM-SPEC.md

`api/src/mistakes/mistakes.service.ts`
`api/src/readiness/readiness.service.ts`
`web/src/app/app/mistakes/page.tsx`
`web/src/app/app/readiness/page.tsx`

## E01 Багш өөрийн бүлгийн явцыг харна

Төлөв: **tested**

Гаднын багш өөрийн бүлэг, холбоотой сурагчдын ажлын хүрээнд ажиллана. Гаднын багшаар бүртгүүлэх нь төвийн бүх хүүхдийн мэдээлэл, төлбөртэй агуулгын хариуны түлхүүр эсвэл нийт бодлогын санг засах эрх болохгүй. Төвийн ажилтан болон гаднын багшийн эрхийг тусад нь шалгана.

Нотолгоо: New group teacher registration activates own group-management mode without centre approval; current-role/group ownership/privacy tests plus actual HTTP and365px browser prove own group create, restricted centre APIs, public-home session preservation. This does not certify all legacy group cohort statistics.

Шалгах нөхцөл: Verified external teacher sees only own group pupil-shared score/attendance; no private notes or center finance; unverified denies.

Эх: docs/SYSTEM-DESIGN-V4-RESEARCH.md SG01–07; docs/CHATGPT-PROMPTS.html G12 teacher groups

`api/src/teacher-groups/teacher-groups.service.ts`
`api/src/teacher-groups/teacher-groups.service.spec.ts`
`web/src/app/app/groups/page.tsx`
`docs/v2/REGISTRATION-GROUP-PRIVACY-REVIEW.md`
`web/src/lib/navigation-role.ts`

## E02 Төлбөртэй шалгалт, анги ба сургуулийн эрэмбэ

Төлөв: **partial**

Дэлгүүр, шалгалтын эрх болон дүнгийн жагсаалтын хэсгүүд байгаа ч төлбөртэй шалгалтад бүртгүүлэх, хэтэвчээс найдвартай суутгах, анги ба сургуулийн хэмжээнд эрэмбэлэх урсгал бүхэлдээ дуусаагүй. Одоо байгаа хэсгийг бүрэн төлбөртэй шалгалтын үйлчилгээ гэж үзүүлэхгүй.

Нотолгоо: Current study ranking implements private own exam/class/school summaries; real ties1/1/3, owner404 and role403 pass. Published test/book/pass purchase linkage is validated locally. Durable prepaid wallet and national live weekly orchestration remain unfinished.

Шалгах нөхцөл: Fund wallet once, atomic debit/grant exam, provider replay idempotent, publish rank only eligible comparable cohort/class/school.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07; docs/SYSTEM-DESIGN-V4-RESEARCH.md IC

`api/src/store/store.service.ts`
`api/src/tests/tests.service.ts`
`web/src/app/app/store/page.tsx`
`api/src/tests/ranking.service.ts`

## E03 Төлбөр баталгаажмагц эрхийг нэг удаа нээнэ

Төлөв: **external-config**

Төлбөр баталгаажсаны дараа эрх олгохдоо давтан хүсэлт нэг эрхийг давхар үүсгэхээс хамгаална. Бодит төлбөрийн үйлчилгээний тохиргоо, баталгаажуулалт болон туршилт шаардлагатай. Орон нутгийн туршилт нь бодит мөнгө хүлээн авсан эсвэл төлбөрийн үйлчилгээтэй холбогдсон баталгаа биш.

Нотолгоо: No external provider called; provider config and business verification required before live checkout claim.

Шалгах нөхцөл: Sandbox webhook replay+failure/retry creates one payment/grant; access expires correctly; credentials kept local secrets.

Эх: docs/SYSTEM-DESIGN-V4-RESEARCH.md IC01–11

`api/src/payments/payments.service.ts`
`api/src/passes/passes.service.ts`
`api/src/store/store.service.ts`
`api/src/gateways/qpay.service.ts`

## E04 Танхимын төлбөр, хүчинтэй хугацаа, хуулга тулгалт

Төлөв: **partial**

Эрхтэй ажилтан сургалтын төлбөрийн бүртгэл, төлсөн хугацаа болон тулгалтын мэдээллийг үзэж ажиллана. Төлбөрийн бүртгэл нь хүүхдийн сургалтын үр дүн эсвэл элсэлтийн гэрээний баталгаа биш. Бодит үйлчилгээний бүх тохиолдлын тулгалтыг энэ хувилбараар бүрэн баталгаажуулаагүй.

Нотолгоо: Actual local payment UUID/replay locks, bank reconciliation, confirmed-only summaries, narrowed finance capability and frozen entitlement grants pass. Contract policy, historical bank fixtures, prorated refund allocation and provider settlement remain release gates.

Шалгах нөхцөл: Local invoice/payment fixture refund/reversal recomputes ledger/history; verified parent only child finance; bank import dry-run no side effects.

Эх: docs/PLATFORM-SPEC.html tuition/payments; docs/SYSTEM-DESIGN-V4-RESEARCH.md

`api/src/tuition/paid-until.ts`
`api/src/tuition/proration.ts`
`api/src/reconcile/reconcile.service.ts`
`web/src/components/payments/StudentHistoryPanel.tsx`
`docs/v2/FINANCIAL-WORKFLOW-REVIEW.md`

## S01 Тогтмол хуваарь, нэг удаагийн өөрчлөлт

Төлөв: **tested**

Эрх олгосон ажилтан давтагдах хуваарь, өөрчлөлт, чөлөөт өдөр, багшийн ажлын өдрийг удирдана. Багш өөрийн хичээлийн сэдвийг тэмдэглэж, хүүхэд болон баталгаажсан эцэг эх өөрийн ангийн хуваарийг үзнэ. Багш+ гэсэн нэр дангаараа бусад ангийн хуваарийг өөрчлөх эрх олгохгүй.

Нотолгоо: Nine focused schedule suites / 102 tests passed, including six new scope/capability tests and existing week/split/ICS/hour rules. Actual synthetic local PostgreSQL plus HTTP production JWT guards verifies schedule.manage denial for ungranted Plus create/bulk/split/update/remove/exceptions/workdays, classroom-scoped edit success and destination-class denial, expired/revoked/changed-role grants denied, own assigned teacher topic preserved, pupil/verified-parent own-class reads, no global staff roster/workdays, BUYER/unverified parent no classroom timetable. Calendar mutation remains admin-only. Full browser schedule interactions not freshly exercised.

Шалгах нөхцөл: UB week/holiday/exception produces correct events, lesson topic persists exact schedule/day, no extra personal data in public calendar.

Эх: docs/SYSTEM-DESIGN-V5-RESEARCH.md sections2–3

`api/src/schedule/schedule.service.ts`
`web/src/components/schedule/ScheduleClient.tsx`
`api/prisma/schema.prisma`
`api/src/schedule/schedule-access.service.ts`
`api/src/schedule/schedule-access.spec.ts`
`api/src/schedule/schedule.controller.ts`
`api/src/schedule/schedule.local.integration.cjs`

## S02 Ажилтны дотоод төлөвлөгч

Төлөв: **partial**

Ажилтанд ажил оноох, өөрийн ажлыг харах төлөвлөгчийн хэсэг бий. Бүх ажилтны ачааллыг хүрээгээр нь удирдах, давтагдах ажлын түүхийг бүрэн хадгалах урсгалын баталгаажуулалт дутуу. Энэ хэсгийг бүрэн ажлын гүйцэтгэл, цалингийн систем гэж үзүүлэхгүй.

Нотолгоо: Existing tasks code; latest task review user-specific capability acceptance requires root audit.

Шалгах нөхцөл: Assignee sees own task, manager scoped workload; recurring revision does not delete historical completions.

Эх: docs/SYSTEM-DESIGN-V5-RESEARCH.md section3; Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/tasks/tasks.service.ts`
`api/src/tasks/tasks.controller.ts`
`web/src/app/app/planner/page.tsx`

## S03 Ажилласан цаг, хяналт, цалингийн эрх

Төлөв: **partial**

Багш өөрийн хуваарьт суурилсан цагийн тооцоог үзнэ; бүх багшийн тооцоог үзэхэд тусгай эрх шаардлагатай. Энэ нь бодитоор ажилласан цагийг илгээж, баталж түгжсэн бүртгэл биш. Цалингийн тарифын хувилбар, батлагдсан цагт тулгуурласан цалин бодох бүрэн урсгал хийгдээгүй.

Нотолгоо: All-teacher schedule-derived hours require global time.review; own teacher hours remain accessible. Actual local HTTP verifies ungranted denial, persisted grant success, schedule-only scope isolation, and archived/current-role denial. These are estimates from scheduled lessons. Actual worked-time submission, approval/locking, payroll-rate versioning and calculation are not implemented.

Шалгах нөхцөл: Own time submitted; scoped reviewer rejects/approves/locks; payroll rate/version locked; no selfapproval or arbitrary plus financial access.

Эх: docs/SYSTEM-DESIGN-V5-RESEARCH.md sections4–5; Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/finance/finance.service.ts`
`web/src/components/teacher-hours/TeacherHoursClient.tsx`
`api/prisma/schema.prisma`
`api/src/schedule/teacher-hours.controller.ts`
`api/src/schedule/teacher-hours.service.ts`
`api/src/schedule/schedule.local.integration.cjs`

## S04 Нэрээс хамаарахгүй нарийн эрхийн тохиргоо

Төлөв: **partial**

Админ тодорхой ажилтанд хүрээ, хугацаатай тусгай эрх олгож эсвэл цуцална. Хуваарь удирдах, бүх багшийн цаг харах, санхүү удирдах эрх тусдаа шалгагдах бөгөөд хугацаа дууссан эрх үйлчлэхгүй. Цалин харах эрхийн нэр байгаа ч цалин бодох бүрэн урсгалын хэрэгжилт биш.

Нотолгоо: Persisted current-role capability service supports scoped schedule.manage and global time.review, payroll.view and finance.manage. Schedule/hour/finance entry checks and admin grant/revoke UI exist; actual local HTTP covers global versus classroom scope, expiry, revocation, current database role and archived-user denial. payroll.view is a permission definition, not an implemented payroll calculation or work-approval workflow.

Шалгах нөхцөл: Grant by stable userId+scope+expiry; database current-role check; same-role ungranted user cannot schedule.manage/time.review/payroll.view.

Эх: docs/SYSTEM-DESIGN-V5-RESEARCH.md section5

`api/src/auth/guards/roles.guard.ts`
`api/prisma/schema.prisma`
`api/src/staff-capabilities/staff-capability.service.ts`
`api/src/staff-capabilities/staff-capability.controller.ts`
`api/src/schedule/schedule-access.service.ts`
`api/src/schedule/schedule-access.spec.ts`
`api/src/schedule/schedule.local.integration.cjs`

## N01 Вэб болон имэйлийн мэдэгдлийн төлөв

Төлөв: **external-config**

Систем доторх мэдэгдлийг хэрэглэгч үзэж болно. Цахим шуудан бодитоор хүрсэн эсэхийг үйлчилгээний тохиргоо болон илгээлтийн туршилтаар тусад нь баталгаажуулах шаардлагатай. Мэдэгдлийн мөр үүссэн нь шуудан хүрсэн гэсэн үг биш.

Нотолгоо: No SMTP/provider call in fixtures; real delivery not verified.

Шалгах нөхцөл: Unconfigured provider recorded skipped/unknown not delivered; email timeout not read receipt; template event retry bounded/idempotent.

Эх: docs/SYSTEM-DESIGN-V5-RESEARCH.md section6; docs/CODEX-SPRINT-2.md T14

`api/src/notification-center/notification-center.service.ts`
`api/src/notifications/email-otp.service.ts`
`web/src/app/app/notifications/page.tsx`

## N02 SMS үйлчилгээний дараагийн шат

Төлөв: **future**

Мессеж илгээх болон төлбөрийн автомат сануулга энэ хувилбарын идэвхтэй үйлчилгээ биш. Үйлчилгээний эрх, тохиргоо, илгээх нөхцөл болон бодит хүргэлтийн баталгаажуулалтгүйгээр хүүхэд, эцэг эхэд мессеж илгээхгүй.

Нотолгоо: Excluded V1; existing dormant screens do not prove authorized provider configuration.

Шалгах нөхцөл: Only after explicit v2 scope and provider/cost approval: server estimate, suppression, one delivery event, reconciliation.

Эх: docs/SYSTEM-DESIGN-V4-RESEARCH.md VS exclusions; docs/SYSTEM-DESIGN-BACKLOG.md V1/V2

`web/src/app/app/sms/page.tsx`
`api/src/notifications`

## A01 Хувийн зорилго, AI зөвлөхийн дараагийн шат

Төлөв: **future**

Хувийн зорилго болон хиймэл оюуны зөвлөхийн санаа ирээдүйн ажил хэвээр байна. Байгаа зорилгын кодыг бүрэн зөвлөх үйлчилгээ гэж үзүүлэхгүй. Одоогийн бодит боломж нь хязгаарласан математик дасгал болон бүртгэгдсэн оролдлогод тулгуурласан давтлага юм.

Нотолгоо: Existing goal code is not release authorization; latest bounded local generator separately implemented.

Шалгах нөхцөл: Explicit scoped v2 goal contract and user consent; no fabricated advice/ability, no external model calls until authorized.

Эх: docs/SYSTEM-DESIGN-BACKLOG.md V1 exclusions; Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/goals/goals.service.ts`
`web/src/app/app/goals/page.tsx`

## A02 Бодит өгөгдөлд тулгуурласан давтлага санал болгох

Төлөв: **partial**

Систем бүртгэгдсэн бие даасан оролдлого, тусламжтай засвар, мэдэгдэхгүй үр дүнг ялган дараагийн давтах сэдвийг санал болгоно. Цөөн баримттай үед тодорхойгүй байдлыг тайлбарлана. Энэ нь баталгаажсан чадварын магадлал, суралцах хэв маягийн шошго эсвэл үр нөлөө нь нотлогдсон ухаалаг загвар биш.

Нотолгоо: 32 targeted recommendation tests passed; combined owned API suites passed 92 tests. Actual local PostgreSQL/HTTP verifies entitled BUYER cold-start candidates, paid-chapter denial, malformed limit, and server grading despite spoofed correctness. Current-role entitlement, deterministic accessible cold-start topics, historical/class progression constraints, explicit zero accuracy and independent/corrected/help/self-report/unknown separation implemented. DTO/UI show actual counts, cautious explanations and uncertainty; no answer keys. Scheduler remains a deterministic heuristic, not calibrated BKT/IRT or proven learning efficacy.

Шалгах нөхцөл: Recommendation includes concrete evidence/uncertainty and next step; independent held-out validation before ability forecasting; no learning styles/deep model on tiny data.

Эх: docs/research/00-ALGORITHM-SPEC.md sections1–2; Latest v2 user requirements conveyed in root task, 2026-10-07

`api/src/recommend/recommend.service.ts`
`api/src/insights/insights.service.ts`
`docs/v2/LEARNING-REVIEW.md`
`api/src/recommend/scheduler.ts`
`api/src/recommend/recommend.controller.ts`
`api/src/recommend/evidence.ts`
`api/src/recommend/evidence.spec.ts`
`api/src/recommend/recommend.service.spec.ts`
`web/src/app/app/study/page.tsx`
`api/src/lesson-flow/local.integration.cjs`

## A03 Зураг таних, өргөн хүрээний математик загвар

Төлөв: **future**

Зураг таних, дүрслэл үүсгэх, илүү өргөн хиймэл оюуны туслах нь дараагийн шатны ажил. Одоогийн импортын хэрэгсэл бүх зургийг алдаагүй уншдаг гэсэн баталгаа биш. Гаднын загварын үйлчилгээ энэ ажлаар холбогдоогүй.

Нотолгоо: No external AI used; OCR importer existence is not universal recognition correctness.

Шалгах нөхцөл: Teacher-reviewable draft with source provenance and exact key verification; provider config/quality review before release.

Эх: docs/SYSTEM-DESIGN-V4-RESEARCH.md VS exclusions; docs/SYSTEM-DESIGN-V5-RESEARCH.md section10

`api/src/document-import/document-import.service.ts`
`docs/research`

## Q01 Олон хэрэглэгчийн ачаалал, нөөц сэргээх, байршуулалт

Төлөв: **partial**

Энэ хувилбарыг зөвхөн орон нутгийн орчинд шалгасан. Таван мянган зэрэг хэрэглэгч, үүлэн орчны ачаалал, нөөцөөс сэргээх болон бодит нэвтрүүлэлтийг тусад нь туршина. Одоогийн шалгалтыг үйлдвэрлэлийн хүчин чадлын баталгаа гэж үзүүлэхгүй.

Нотолгоо: No production access or deployment. All54 migrations apply on an empty disposable local database; dump/restore critical counts and attachment byte hashes pass. Cloud5000 concurrency/HA/PITR/CDN/load and recovery still need isolated real testing.

Шалгах нөхцөл: Approved isolated load/failure test meets stated p95/error budget; restore rehearsed; live rollout separate explicit decision.

Эх: docs/SYSTEM-DESIGN-V4-RESEARCH.md rollout; docs/CODEX-NIGHT-1.json E2

`api/test/load/index.js`
`docs/INFRASTRUCTURE-5000-PLAN.md`
`tools/v2/migration-check.cjs`
`tools/v2/restore-check.cjs`

## Q02 Утасны цэвэр дэлгэц, математик дүрслэл, алдааны төлөв

Төлөв: **partial**

Шинэ суралцах хэсгүүд утасны дэлгэцэд нэг ажил дээр төвлөрч, математик тэмдэглэгээ болон бодит хоосон, алдааны төлөвийг харуулна. Давтлага, түүхийн гол урсгалыг жижиг дэлгэцээр шалгасан. Системийн бүх хуучин дэлгэцийн харагдах байдал, хүртээмжийг бүрэн шалгаж дуусаагүй.

Нотолгоо: Actual365/375px and desktop checks cover new study/review/history, homework, theory, parent, feedback, checkout, gallery, group mode, tabs and help; no overflow or KaTeX errors in those flows. Scoped lint/typechecks pass. Every inherited screen and full accessibility/performance pilot are not certified.

Шалгах нөхцөл: 375px/desktop browser checks focus and loading/errors; math renders; no emoji/random glyph or fake personal examples.

Эх: docs/CODEX-SPRINT-2.md hard rules; web/AGENTS.md; STATUS.md §6

`web/src/components/ui/kit/button.tsx`
`web/src/components/MathText.tsx`
`web/src/app/app/study/page.tsx`
`web/src/app/app/lesson-flow/page.tsx`
`docs/v2/UI-UX-REVIEW.md`

## Q03 Хувийн багшийн тэмдэглэл ба хадгалалтын хязгаар

Төлөв: **tested**

Хуучин илгээлт, засвар, онолын холбоосыг түүхтэй нь хадгалж, идэвхтэй жагсаалтаас архивласан материалыг ялгана. Хүүхэд, эцэг эхэд зөвхөн тэдэнд харагдах үнэлгээ, хавсралтыг өгнө. Бүх хуучин хэсгийн мэдээлэл дамжуулах хүрээг нэг бүрчлэн шалгасан гэж амлахгүй.

Нотолгоо: Actual local historical parent/file fixtures passed; crossmodule full DTO audit not exhaustive.

Шалгах нөхцөл: Parent DTO never contains StudentNote, legacyNote, actor internals or global finance; archived revision images still authorized.

Эх: Latest v2 user requirements conveyed in root task, 2026-10-07; docs/SYSTEM-DESIGN-V4-RESEARCH.md QT

`api/src/parents/parents.service.ts`
`api/src/storage/file-authorization.service.ts`
`api/src/content/content.service.ts`

## Q04 Хуучин хүсэлтийг өнөөгийн шаардлагаас ялгах

Төлөв: **tested**

Хуучин төлөвлөгөө, шаардлагыг одоо байгаа код, туршилтын нотолгоотой харьцуулж үзнэ. Хийсэн, хэсэгчлэн хийсэн, дараа хийх болон үйлчилгээний тохиргоо хүлээж буй ажлыг ялгана. Хуучин баримтын тэмдэглэгээ нь бодит хэрэгжилт эсвэл нэвтрүүлэх зөвшөөрөл болохгүй.

Нотолгоо: Audit generated with explicit verification strings; no status inferred from old HTML ok labels.

Шалгах нөхцөл: Every row has source/status/exact files/acceptance; referenced missing path detected; future/config features never called complete.

Эх: docs/CODEX-NIGHT-1.json; docs/CHATGPT-PROMPTS.html; Latest v2 user requirements conveyed in root task, 2026-10-07

`docs/v2/REQUIREMENT-COVERAGE.json`
`docs/v2/REQUIREMENT-COVERAGE.md`
