# Pi.mn v2 — ажлын хяналтын жагсаалт

Туршилтын локал хувилбар. Хийсэн код болон баталгаатай туршилтыг тусад нь тэмдэглэнэ. Бодит үйлчилгээний тохиргоо, төлбөр, хууль/лиценз болон 5000 хэрэглэгчийн cloud acceptance дуусаагүй.

- [x] **D01 Онол, тест, даалгаврыг нэг өдрийн багцаар холбоно** — tested
  Багш анги, өдөр, сэдвээ сонгоход онол, ангийн сорил, гэрийн даалгаврыг нэг өдрийн багцад урьдчилан бэлдэнэ. Багш бодлого, онолыг нэмж хасаж хадгалж болох бөгөөд давтан хадгалалт ижил багцыг ашиглана. Бүх ангийн бодит хичээлд тохирох агуулгыг багш өөрөө шалгана.
  Нотолгоо: Actual local PostgreSQL + HTTP: five concurrent class/day saves create one packet, test session and homework assignment; later teacher edit retains IDs and reload prefill. Atomic packet save freezes chapter identity; excluded test problem lists and explicitly selected theory blocks retained. Teacher UI typecheck/lint pass; full browser interaction not executed by this subagent.
  Acceptance: Owning teacher selects UB class/day/chapter, views theory, selects class test and explicit published A makeup test, adjusts homework and saves. Concurrent replay creates one linked packet/session/assignment; later edit preserves IDs and original pupil receipts.

- [x] **D02 Илгээсэн хүүхдийн тоог давхардуулалгүй харна** — tested
  Өдрийн багцад онол, ангийн сорил, гэрийн даалгавар тус бүрийн илгээсэн хүүхдийн тоог тухайн өдрийн ангийн хүүхдийн тоотой харьцуулна. Нэг хүүхэд хэд дахин зураг илгээсэн ч нэгээр тоолно. Илгээсэн гэдэг нь зөв бодсон гэсэн дүн биш.
  Нотолгоо: Actual HTTP verifies three distinct pupil counters and original receipts retained. Class test unions packet receipts, fully marked included bank problems for exact class/day, and submitted online sessions started that day. Partial evening marking does not count. Homework unions packet receipts with actual linked assignment submissions. Submission evidence is never a correctness grade.
  Acceptance: Two-pupil packet: five replayed receipts and multiple revisions by one pupil count1; partial second pupil marking leaves1; full included marking becomes2; theory/class-test/homework counters divide by distinct historical-day roster.

- [x] **D03 Ирцтэй хүүхдээс онолын зураг оруулах ээлж сонгоно** — tested
  Онолын зургийг өгөх ээлжийг ирцтэй уялдуулан сонгож, тасалсан хүүхдийн алдсан ээлжийг дараагийн боломжид түрүүлж өгнө. Багш шалтгаантайгаар өөр хүүхэд сонгож болно. Ээлж оноосон бүртгэл болон хүүхэд үнэхээр зураг илгээсэн бүртгэл тусдаа байна.
  Нотолгоо: Persistent class advisory lock and packet-unique turn: four concurrent turn requests one ID; absent pupil pending, returned pupil next-day MISSED_TURN; teacher override preserves turn ID/reason and requeues unserved replaced pupil. Pure attendance selector tests pass. A turn is assignment evidence; actual photo receipt remains separately recorded.
  Acceptance: Present/late pupils only; unknown/absent/excused cannot be overridden into capture duty. Absent unserved pupil gets returning priority. Reload/retry keeps same packet turn. Owner teacher override requires reason and changes same turn under lock.

- [ ] **D04 Тасалсан хичээлийг А хувилбараар нөхнө** — partial
  Тасалсан хүүхэд өөрийн ангийн өдрийн багцаас онол, хамтын зураг, багшийн сонгосон А хувилбарын сорилыг нээж, нөхсөн ажлын зураг эсвэл баримт илгээнэ. Өмнөх илгээлтүүд хадгалагдана. Нөхөлтийн ажлыг багш тусад нь үнэлэх бүрэн урсгал одоогоор гүйцээгүй.
  Нотолгоо: Teacher-selected published variantLabel A is packet-linked and class TestAccess granted atomically. Actual HTTP verifies own bounded MAKEUP image/PDF receipt and retained prior revisions. Pupil UI links the actual A test and uploads through uploadFile; full online A test start/grade and a dedicated makeup teacher assessment workflow not freshly verified.
  Acceptance: Absent pupil opens saved day, exact teacher A variant and theory/shared photo, takes authorized A test, uploads owned evidence. Teacher reads selected pupil receipt; verified parent sees child-only packet evidence and existing assignment original/assessment; random class/pupil denies.

- [x] **D05 Ангид ном дээр тэмдэглээд гэрт анхны хариугаа бөглөнө** — tested
  Хүүхэд утас ашиглаагүй хичээлийн дараа гэртээ анхны хариугаа оруулж, эргэлзсэн, таасан, чадаагүй эсвэл тусламж авсан эсэхээ тэмдэглэнэ. Анхны хариу хадгалагдаж, дараагийн засвар түүнийг солихгүй. Энэ нь хүүхдийн өөрийн тэмдэглэгээ бөгөөд анги доторх үйлдлийг шууд ажигласан бүртгэл биш.
  Нотолгоо: Actual local HTTP integration passed; immutable per-user/problem evidence.
  Acceptance: Five concurrent replays/reload preserve initial answer/flags; later correction never replaces it.

- [x] **D06 Анхны зөв, тусламжтай засвар, дараагийн шалгалтыг ялгана** — tested
  Хүүхэд анхны хариуныхаа үр дүнг хараад дахин оролдож, дараа нь бодолтыг нээж болно. Анхны зөв хариу, бодолт үзсэний дараах засвар, хугацааны дараах дахин оролдлогыг тусад нь хадгална. Давтан зөв бодсоныг шууд эзэмшсэн чадвар гэж дүгнэхгүй.
  Нотолгоо: Service tests and local HTTP passed; PostgreSQL advisory lock serializes solution/retry. Probe timing provisional, not validated mastery model.
  Acceptance: Solution/retry concurrent requests preserve commit ordering; assistance flagged; delayed distinct seed does not count as original unseen success.

- [x] **D07 Үйлдэл ба харагдсан хугацааг болгоомжтой бүртгэнэ** — tested
  Суралцах хэсэг нээлттэй, харагдаж байсан хугацаа болон товч ашигласан тоог хязгаартайгаар нэгтгэнэ. Далд цонх, анхаарал тодорхойгүй хугацааг тусад нь ялгана. Энэ бүртгэл хүүхдийн бодит анхаарлыг хэмжихгүй, хурд дангаараа чадварын үнэлгээ болохгүй.
  Нотолгоо: 5 clock tests passed, including real fractional performance.now regression. Raw durations retain fractions; API summaries floor conservatively to integer milliseconds. Six actual advanced Study mobile flows now save201; no actual-attention claim.
  Acceptance: Hidden/blurred/suspension/backward/NaN intervals classified conservatively; bounded counts; no ability label based on speed.

- [x] **M01 Баталгаажуулсан загвараар локал бодлого үүсгэнэ** — tested
  Суралцагч шулуун ба квадрат тэгшитгэл, бутархай, гурван хэмжээст векторын скаляр үржвэр, олон гишүүнтийн уламжлалын утга, тодорхой интегралын дасгал сонгож болно. Бодлого, хариуг хязгаарласан дүрмээр яг тооцож шалгана. Бүх төрлийн бодлого боддог систем эсвэл баталгаатай хүндрэлийн үнэлгээ биш.
  Нотолгоо: 22 LearningLab tests across four suites pass; original families 2,000 seeds each, advanced families 4,000 seeds each plus uint32 extremes and independent rational/power-sum oracle. Actual local HTTP grades Buyer advanced tasks, hides keys, preserves first/replay/reload. 1,414 KaTeX expressions render. Bounded linear/quadratic/fractions/3D dot/derivative-at-point/definite-polynomial-integral only; no universal solver or empirical difficulty. Actual365/375px advanced Study six flows pass for Student classroom and Buyer independent across all three advanced families: first POST201, same task reload, immutable original111 after correction/solution, no math render errors or overflow.
  Acceptance: Many seeds and rational/extreme inputs independently verify exact substitution; no answer key before submit; unsupported family rejected.

- [x] **L01 Нэг гол үйлдэлтэй суралцах дэлгэц** — tested
  Суралцах нүүрээс хүүхэд нэг ажлаа сонгон, тухайн бодлого дээрээ төвлөрч ажиллана. Өөрийн даалгавар, онол, алдаагаа давтах болон өдрийн багц руу хүрэх холбоосууд бий. Бүх хуучин сургалтын дэлгэцийг нэг урсгалд бүрэн нэгтгээгүй.
  Нотолгоо: Actual365/375px browser flows pass for classroom Student and independent Buyer: bounded generator, immutable first response, reload, help and correction remain separate; source-bank review uses selected topics and10/30/60 budgets. Advanced disclosures stay closed by default. This is scoped flow validation, not every inherited screen certified.
  Acceptance: 375px pupil opens current assignment/theory/topic test; source failure distinguish unavailable from no activity; reload preserves task.

- [ ] **L02 Бие даах тест болон долоо хоногийн шалгалт** — partial
  Суралцагч эрхтэй сэдвийн сорилдоо орж, хадгалсан хариугаа үргэлжлүүлэн шалгалтаа илгээнэ. Хугацаа болон эцсийн дүнг серверийн бүртгэлээр тогтооно. Долоо хоног бүрийн шалгалтыг автоматаар зохион байгуулах бүрэн урсгал одоогоор баталгаажаагүй.
  Нотолгоо: Existing TestAttemptSession implementation inspected; weekly orchestration not proven by this audit. Actual BUYER JWT-role regression: unentitled bank403; after real chapter pass bank/response succeeds using actual BUYER role.
  Acceptance: Pupil can start authorized topic and weekly exam, autosave/reload, submit server-timed session, see final immutable result.

- [x] **L03 Жилийн бодит идэвх, суралцах түүх** — tested
  Баталгаажсан эцэг эх хүүхдийнхээ жилийн бодит оролдлого, өдрийн багц, даалгаврын илгээлт болон багшийн харагдах үнэлгээг түүхээс үзнэ. Хуучин илгээлтүүдийг архивласан эхтэй нь хадгална. Үйлдлийн тоог чадвар эсвэл анхаарлын баталгаа гэж тайлбарлахгүй.
  Нотолгоо: Parent unit + actual local HTTP annual/historical fixtures passed; counts are evidence, not inferred ability. Actual parent annual response includes two authorized class-day packets and child-only5 append receipt snapshots.
  Acceptance: Verified parent selects year, paginates all categories, sees actual totals, archived submitted work and original/assessment revisions.

- [x] **L04 Сэдэв, хугацаагаа сонгосон давтлага ба түүх** — tested
  Суралцагч эрхтэй сэдвүүдээсээ сонгон 10, 30 эсвэл 60 минутын давтлага эхлүүлж, дахин нээхэд анхны хугацаа, хариугаа хэвээр үргэлжлүүлнэ. Хаасны дараах тусламжтай засвар анхны дүнг өөрчлөхгүй; өөрийн болон баталгаажсан хүүхдийн жилийн хураангуйг үзэж болно. Бодлогын тооны хязгаар нь хурдны зорилт биш бөгөөд энэ давтлага албан ёсны шалгалтын оноонд орохгүй.
  Нотолгоо: Annual owned/verified-parent history API adds10 focused tests (StudyReview total26), plus production controller/JWT/Postgres proof of UB-year boundary, safe pagination/foreign cursor denial, verified-parent matrix, no answer keys and immutable first vs assisted correction. New history UI browser verification separately coordinated. 16 input/selection/key/choice-boundary tests; API/web typecheck and scoped lint pass. Latest real PostgreSQL/JWT/HTTP: eight-way start/first concurrency, immutable first, hash conflict, owner404/paid entitlement403, source/key snapshot, server expiry, post-review correction, no official TestResult. Invalid key/prior exposure excluded; pre-first video excludes independent evidence; deleted-book resume denied; lost-start recovery finds active run. Frozen-image replace-key owner200/foreign403/expired403; private Feedback and Revision precedence403. Actual365/375px nine UI flows: Student free, Buyer free and Buyer granted private across10/30/60;5/10/20 caps, keyboard flags, same deadline/first after reload, submit/correction unchangedfirstscore, no math errors/overflow. Final current-source isolated compile HTTP also passes numeric2+0→400/no first, exact4/2→true for frozen2, choice9/abc→400/no first, structured choice1→true and closed answer text1.9 targeted API suites59 tests and11 Study/clock tests pass; shared runtime restart is root-owned. Official-session exposure adds3 tests (StudyReview total29) plus actual production HTTP: previous issued/draft-only IDs excluded, an official session introduced after review creation marks first assisted, closed keys/solutions hidden for live IN_PROGRESS deadline overlap and released after expiration; history and official results unchanged. Live official overlap also rejects FIRST and CORRECTION403 before any response write; the same request succeeds assisted after official expiry. Five exposure tests bring StudyReview to31 tests; exact-source production JWT/HTTP proof confirms no response writes during live overlap and unchanged official results.
  Acceptance: STUDENT/BUYER selects1–5 entitled topics and10/30/60min; bounded5/10/20 bank tasks hide keys until close; reload keeps server deadline and first; conflicting parallel replay denied; post-review correction never alters first/ranking; deleted/revoked entitlement and malformed keys denied.

- [x] **P01 Баталгаажсан эцэг эх зөвхөн хүүхдээ харна** — tested
  Эцэг эх зөвхөн баталгаажсан холбоостой хүүхдийнхээ мэдээлэл, дүнг үзэж, танилцсанаа тэмдэглэнэ. Баталгаажаагүй болон өөр хүүхдийн холбоос мэдээлэл нээхгүй. Танилцсан тэмдэглэгээ нь хүүхдийн хариу, багшийн үнэлгээг өөрчлөхгүй.
  Нотолгоо: Parent focused unit/HTTP fixtures passed; SMTP delivery external config, no provider called. Actual packet/child history HTTP denies other-child parent; pending parent denied packet and photos.
  Acceptance: Pending/other-child parents denied history and both OTP acknowledgement stages; result IDs and persisted ack timestamp returned.

- [x] **P02 Анги тарсан ойролцоо цаг** — tested
  Багш тухайн өдөр анги тарах ойролцоо цаг болон шаардлагатай бол хамгийн сүүлд тарах цагийг тэмдэглэнэ. Эцэг эхэд энэ нь ангийн мэдээлэл гэж харагдана. Хүүхэд бүрийн бодитоор гарсан цаг, байршил эсвэл шууд ирцийн баталгаа биш.
  Нотолгоо: 5 unit tests + actual local HTTP passed.
  Acceptance: Owner teacher enters UB day/time; random plus rejected; parent sees only enrolled historical day, label explicitly class estimate.

- [x] **P03 Хувийн файлын хандалтын эрх** — tested
  Хүүхдийн хувийн зураг, даалгаврыг эзэмшигч хүүхэд, баталгаажсан эцэг эх, эрхтэй ангийн багш л нээнэ. Онолын хамтын материалыг тухайн агуулгын эрхээр шалгана. Файлын холбоос дахь нэвтрэх мэдээлэл задрах эрсдэлийг бүрэн арилгасан тусгай богино настай холбоос хараахан хийгдээгүй.
  Нотолгоо: 11 new file unit tests and actual local HTTP matrix passed; query bearer leakage remains documented. Actual packet shared THEORY class/parent matrix and private CLASS_TEST/HOMEWORK/MAKEUP matrix passed, plus ownerless packet-theory reference.
  Acceptance: Author/verified parent/assigned teacher/admin permitted private revision; random pupil/plus/pending parent deny; revoked/expired tokens401.

- [x] **P04 Анхны илгээлт ба багшийн үнэлгээний түүх** — tested
  Хүүхдийн анхны илгээсэн зураг болон багшийн хүүхдэд харагдах үнэлгээг тусад нь үзэж, засварын өмнөх хувилбаруудыг түүхээс нээж болно. Ижил илгээлтийг давтахад хуулбар үүсгэхгүй, өөр зурагтай давтвал зөрчлийг мэдэгдэнэ. Багшийн хувийн зан төлөвийн тэмдэглэл эцэг эхэд харагдахгүй.
  Нотолгоо: Actual local parent fixture confirms snapshot/private exclusion; interface agent owns broader revision tests. Packet receipts are append-only snapshots with immutable clientRequestId replay; altered attachment payload on same key409. SessionStorage retains pending request/keys for client reload retry.
  Acceptance: Original SUBMIT survives return/reupload/approve; visible studentNote/reviewNote distinct; ambiguous legacy/private actor excluded parent DTO.

- [ ] **C01 Бодлого, тест, номын хэвлэмэл дугаарын холбоос** — partial
  Номын бодлого, сорилыг тогтмол дугаар болон хэвлэмэл тэмдэглэгээгээр нь олж, ажилтай нь холбоно. Үүсгэсэн дасгал эх номын бодлогыг сольж бичихгүй. Бүх агуулгын хувилбарыг царцаах, хуучин дүнг дахин үнэлэх нийтлэг механизм бүрэн хийгдээгүй.
  Нотолгоо: Printed-token lookup and no bank mutation by generated lab tested; universal content-version freeze/regrade not established.
  Acceptance: Edit/reimport same printed token cannot silently overwrite bank; versioned exam retains key/rubric; archived original still resolve.

- [x] **C02 Онолын зураг, PDF үзүүлэх** — tested
  Хүүхэд эрхтэй онолын зураг, баримтыг нээж үзнэ; өдрийн багцын түүхэн хамтын зураг тухайн өдрийн анги болон баталгаажсан эцэг эхэд хэвээр хүрнэ. Архивласан онол идэвхтэй жагсаалтаас хасагдаж, эрхтэй багш сэргээж болно. Материалын эрхгүй хэрэглэгч зөвхөн файлын нэр мэдсэнээр нээхгүй.
  Нотолгоо: Historical class-day theory images and PDF/media viewer pass real authorization and mobile browser checks. Theory archive retains rows, text and media and supports privileged restore; archived content leaves active lists. Sixteen retention/idempotency tests and actual PostgreSQL archive/restore with audit pass.
  Acceptance: Authorized pupil/purchased-book child/parent display file; unauthorized key deny; math uses MathText; upload provenance retained.

- [ ] **C03 Номын эх, хариуны түлхүүрийн шалгалт** — partial
  Багш цаасан бодлогын эхийг оруулж, хуудас, дугаар, хариуны тохирлыг шалгасны дараа ашиглана. Импортын хэрэгсэл байгаа нь бүх эх зөв танигдсан, бүх хариу баталгаажсан гэсэн үг биш. Эхийн эрх, танилтын алдаа, хариуны чанарыг хүний хяналтаар баталгаажуулах шаардлагатай.
  Нотолгоо: Existing modules inspected; do not infer all content reviewed or complete.
  Acceptance: Import fixture maps page/number/key, teacher previews and publishes; malformed OCR remains draft; no internal author notes leak.

- [ ] **C04 Бодлого бүрийн видео бодолт** — partial
  Багш+ эсвэл админ тайлбарын бичлэгийг яг тухайн бодлоготой холбоно. Хүүхэд хүссэн үедээ бичлэгийн тайлбарыг нээх бөгөөд үзсэн тусламж нь дараагийн оролдлогын бүртгэлд ялгагдана. Нийтийн жагсаалтад харагдахгүй YouTube холбоос бусдад дамжиж болох тул хувийн хамгаалалт гэж амлахгүй; хувийн видео байршуулалтын үйлчилгээ бүрэн холбогдоогүй.
  Нотолгоо: Per-problem exact ID nullable FK/creator, same-chapter Plus/Admin attach/detach, ordinary teacher author ownership with legacy deny, transaction audit/soft deletion, entitlement, metadata-only lazy disclosure and explicit help exposure implemented. 17 focused API suites/153 tests (22 video, nine purchase boundary) and actual synthetic local PostgreSQL/HTTP matrix pass; API build, targeted API lint and full web typecheck pass. Plain BOOK grants theory/problem/list access; media requires includesVideo. Actual HTTP verifies expiry/refund/future-pass boundaries and listing/direct agreement. Direct HTTPS media requires configured trusted origins; no private upload/provider/DRM or immutable problem-version pin fabricated. YouTube unlisted links are shareable; browser playback and external provider availability not tested.
  Acceptance: Teacher attaches authorized video to exact problem/version; pupil sees only entitled media; provider URL/upload grant validated.

- [x] **C05 Томьёоны сан ба давталт** — tested
  Суралцагч томьёогоо хайж уншаад, давтах хэсгээс эргэн ажиллаж болно. Давталтын хуваарийн хэрэгсэл бий. Одоогийн хуваарийг хүүхэд бүрийн суралцах үр дүнг баталгаатай сайжруулдаг гэж дүгнээгүй.
  Нотолгоо: Whole API suite includes existing formula scheduler/tests; separate KaTeX validator checks9 formula source files and387 formulas. Formula curation remains permission-scoped; licensed completeness and every curriculum skill require teacher review.
  Acceptance: Seed fixture formula MathText valid, review due queue updates AGAIN/HARD/GOOD/EASY and survives reload.

- [ ] **C06 Алдааны дэвтэр ба бэлэн байдлын тайлбар** — partial
  Суралцагч алдсан бодлогоо эргэн харж, дахин оролдох хэсгийг сонгоно. Бэлтгэлийн мэдээлэл нь байгаа оролдлогод тулгуурлана. Шалгалтад авах оноо эсвэл хувь хүний чадварыг баталгаатай таамаглах загвар хараахан батлагдаагүй.
  Нотолгоо: Existing modules; research draft warns citation quality, not validated individual predictor.
  Acceptance: Sparse/no assessed topic says untested; original wrong and corrected evidence distinguish; no official exam forecast from tiny sample.

- [x] **E01 Багш өөрийн бүлгийн явцыг харна** — tested
  Гаднын багш өөрийн бүлэг, холбоотой сурагчдын ажлын хүрээнд ажиллана. Гаднын багшаар бүртгүүлэх нь төвийн бүх хүүхдийн мэдээлэл, төлбөртэй агуулгын хариуны түлхүүр эсвэл нийт бодлогын санг засах эрх болохгүй. Төвийн ажилтан болон гаднын багшийн эрхийг тусад нь шалгана.
  Нотолгоо: New group teacher registration activates own group-management mode without centre approval; current-role/group ownership/privacy tests plus actual HTTP and365px browser prove own group create, restricted centre APIs, public-home session preservation. This does not certify all legacy group cohort statistics.
  Acceptance: Verified external teacher sees only own group pupil-shared score/attendance; no private notes or center finance; unverified denies.

- [ ] **E02 Төлбөртэй шалгалт, анги ба сургуулийн эрэмбэ** — partial
  Дэлгүүр, шалгалтын эрх болон дүнгийн жагсаалтын хэсгүүд байгаа ч төлбөртэй шалгалтад бүртгүүлэх, хэтэвчээс найдвартай суутгах, анги ба сургуулийн хэмжээнд эрэмбэлэх урсгал бүхэлдээ дуусаагүй. Одоо байгаа хэсгийг бүрэн төлбөртэй шалгалтын үйлчилгээ гэж үзүүлэхгүй.
  Нотолгоо: Current study ranking implements private own exam/class/school summaries; real ties1/1/3, owner404 and role403 pass. Published test/book/pass purchase linkage is validated locally. Durable prepaid wallet and national live weekly orchestration remain unfinished.
  Acceptance: Fund wallet once, atomic debit/grant exam, provider replay idempotent, publish rank only eligible comparable cohort/class/school.

- [ ] **E03 Төлбөр баталгаажмагц эрхийг нэг удаа нээнэ** — external-config
  Төлбөр баталгаажсаны дараа эрх олгохдоо давтан хүсэлт нэг эрхийг давхар үүсгэхээс хамгаална. Бодит төлбөрийн үйлчилгээний тохиргоо, баталгаажуулалт болон туршилт шаардлагатай. Орон нутгийн туршилт нь бодит мөнгө хүлээн авсан эсвэл төлбөрийн үйлчилгээтэй холбогдсон баталгаа биш.
  Нотолгоо: No external provider called; provider config and business verification required before live checkout claim.
  Acceptance: Sandbox webhook replay+failure/retry creates one payment/grant; access expires correctly; credentials kept local secrets.

- [ ] **E04 Танхимын төлбөр, хүчинтэй хугацаа, хуулга тулгалт** — partial
  Эрхтэй ажилтан сургалтын төлбөрийн бүртгэл, төлсөн хугацаа болон тулгалтын мэдээллийг үзэж ажиллана. Төлбөрийн бүртгэл нь хүүхдийн сургалтын үр дүн эсвэл элсэлтийн гэрээний баталгаа биш. Бодит үйлчилгээний бүх тохиолдлын тулгалтыг энэ хувилбараар бүрэн баталгаажуулаагүй.
  Нотолгоо: Actual local payment UUID/replay locks, bank reconciliation, confirmed-only summaries, narrowed finance capability and frozen entitlement grants pass. Contract policy, historical bank fixtures, prorated refund allocation and provider settlement remain release gates.
  Acceptance: Local invoice/payment fixture refund/reversal recomputes ledger/history; verified parent only child finance; bank import dry-run no side effects.

- [x] **S01 Тогтмол хуваарь, нэг удаагийн өөрчлөлт** — tested
  Эрх олгосон ажилтан давтагдах хуваарь, өөрчлөлт, чөлөөт өдөр, багшийн ажлын өдрийг удирдана. Багш өөрийн хичээлийн сэдвийг тэмдэглэж, хүүхэд болон баталгаажсан эцэг эх өөрийн ангийн хуваарийг үзнэ. Багш+ гэсэн нэр дангаараа бусад ангийн хуваарийг өөрчлөх эрх олгохгүй.
  Нотолгоо: Nine focused schedule suites / 102 tests passed, including six new scope/capability tests and existing week/split/ICS/hour rules. Actual synthetic local PostgreSQL plus HTTP production JWT guards verifies schedule.manage denial for ungranted Plus create/bulk/split/update/remove/exceptions/workdays, classroom-scoped edit success and destination-class denial, expired/revoked/changed-role grants denied, own assigned teacher topic preserved, pupil/verified-parent own-class reads, no global staff roster/workdays, BUYER/unverified parent no classroom timetable. Calendar mutation remains admin-only. Full browser schedule interactions not freshly exercised.
  Acceptance: UB week/holiday/exception produces correct events, lesson topic persists exact schedule/day, no extra personal data in public calendar.

- [ ] **S02 Ажилтны дотоод төлөвлөгч** — partial
  Ажилтанд ажил оноох, өөрийн ажлыг харах төлөвлөгчийн хэсэг бий. Бүх ажилтны ачааллыг хүрээгээр нь удирдах, давтагдах ажлын түүхийг бүрэн хадгалах урсгалын баталгаажуулалт дутуу. Энэ хэсгийг бүрэн ажлын гүйцэтгэл, цалингийн систем гэж үзүүлэхгүй.
  Нотолгоо: Existing tasks code; latest task review user-specific capability acceptance requires root audit.
  Acceptance: Assignee sees own task, manager scoped workload; recurring revision does not delete historical completions.

- [ ] **S03 Ажилласан цаг, хяналт, цалингийн эрх** — partial
  Багш өөрийн хуваарьт суурилсан цагийн тооцоог үзнэ; бүх багшийн тооцоог үзэхэд тусгай эрх шаардлагатай. Энэ нь бодитоор ажилласан цагийг илгээж, баталж түгжсэн бүртгэл биш. Цалингийн тарифын хувилбар, батлагдсан цагт тулгуурласан цалин бодох бүрэн урсгал хийгдээгүй.
  Нотолгоо: All-teacher schedule-derived hours require global time.review; own teacher hours remain accessible. Actual local HTTP verifies ungranted denial, persisted grant success, schedule-only scope isolation, and archived/current-role denial. These are estimates from scheduled lessons. Actual worked-time submission, approval/locking, payroll-rate versioning and calculation are not implemented.
  Acceptance: Own time submitted; scoped reviewer rejects/approves/locks; payroll rate/version locked; no selfapproval or arbitrary plus financial access.

- [ ] **S04 Нэрээс хамаарахгүй нарийн эрхийн тохиргоо** — partial
  Админ тодорхой ажилтанд хүрээ, хугацаатай тусгай эрх олгож эсвэл цуцална. Хуваарь удирдах, бүх багшийн цаг харах, санхүү удирдах эрх тусдаа шалгагдах бөгөөд хугацаа дууссан эрх үйлчлэхгүй. Цалин харах эрхийн нэр байгаа ч цалин бодох бүрэн урсгалын хэрэгжилт биш.
  Нотолгоо: Persisted current-role capability service supports scoped schedule.manage and global time.review, payroll.view and finance.manage. Schedule/hour/finance entry checks and admin grant/revoke UI exist; actual local HTTP covers global versus classroom scope, expiry, revocation, current database role and archived-user denial. payroll.view is a permission definition, not an implemented payroll calculation or work-approval workflow.
  Acceptance: Grant by stable userId+scope+expiry; database current-role check; same-role ungranted user cannot schedule.manage/time.review/payroll.view.

- [ ] **N01 Вэб болон имэйлийн мэдэгдлийн төлөв** — external-config
  Систем доторх мэдэгдлийг хэрэглэгч үзэж болно. Цахим шуудан бодитоор хүрсэн эсэхийг үйлчилгээний тохиргоо болон илгээлтийн туршилтаар тусад нь баталгаажуулах шаардлагатай. Мэдэгдлийн мөр үүссэн нь шуудан хүрсэн гэсэн үг биш.
  Нотолгоо: No SMTP/provider call in fixtures; real delivery not verified.
  Acceptance: Unconfigured provider recorded skipped/unknown not delivered; email timeout not read receipt; template event retry bounded/idempotent.

- [ ] **N02 SMS үйлчилгээний дараагийн шат** — future
  Мессеж илгээх болон төлбөрийн автомат сануулга энэ хувилбарын идэвхтэй үйлчилгээ биш. Үйлчилгээний эрх, тохиргоо, илгээх нөхцөл болон бодит хүргэлтийн баталгаажуулалтгүйгээр хүүхэд, эцэг эхэд мессеж илгээхгүй.
  Нотолгоо: Excluded V1; existing dormant screens do not prove authorized provider configuration.
  Acceptance: Only after explicit v2 scope and provider/cost approval: server estimate, suppression, one delivery event, reconciliation.

- [ ] **A01 Хувийн зорилго, AI зөвлөхийн дараагийн шат** — future
  Хувийн зорилго болон хиймэл оюуны зөвлөхийн санаа ирээдүйн ажил хэвээр байна. Байгаа зорилгын кодыг бүрэн зөвлөх үйлчилгээ гэж үзүүлэхгүй. Одоогийн бодит боломж нь хязгаарласан математик дасгал болон бүртгэгдсэн оролдлогод тулгуурласан давтлага юм.
  Нотолгоо: Existing goal code is not release authorization; latest bounded local generator separately implemented.
  Acceptance: Explicit scoped v2 goal contract and user consent; no fabricated advice/ability, no external model calls until authorized.

- [ ] **A02 Бодит өгөгдөлд тулгуурласан давтлага санал болгох** — partial
  Систем бүртгэгдсэн бие даасан оролдлого, тусламжтай засвар, мэдэгдэхгүй үр дүнг ялган дараагийн давтах сэдвийг санал болгоно. Цөөн баримттай үед тодорхойгүй байдлыг тайлбарлана. Энэ нь баталгаажсан чадварын магадлал, суралцах хэв маягийн шошго эсвэл үр нөлөө нь нотлогдсон ухаалаг загвар биш.
  Нотолгоо: 32 targeted recommendation tests passed; combined owned API suites passed 92 tests. Actual local PostgreSQL/HTTP verifies entitled BUYER cold-start candidates, paid-chapter denial, malformed limit, and server grading despite spoofed correctness. Current-role entitlement, deterministic accessible cold-start topics, historical/class progression constraints, explicit zero accuracy and independent/corrected/help/self-report/unknown separation implemented. DTO/UI show actual counts, cautious explanations and uncertainty; no answer keys. Scheduler remains a deterministic heuristic, not calibrated BKT/IRT or proven learning efficacy.
  Acceptance: Recommendation includes concrete evidence/uncertainty and next step; independent held-out validation before ability forecasting; no learning styles/deep model on tiny data.

- [ ] **A03 Зураг таних, өргөн хүрээний математик загвар** — future
  Зураг таних, дүрслэл үүсгэх, илүү өргөн хиймэл оюуны туслах нь дараагийн шатны ажил. Одоогийн импортын хэрэгсэл бүх зургийг алдаагүй уншдаг гэсэн баталгаа биш. Гаднын загварын үйлчилгээ энэ ажлаар холбогдоогүй.
  Нотолгоо: No external AI used; OCR importer existence is not universal recognition correctness.
  Acceptance: Teacher-reviewable draft with source provenance and exact key verification; provider config/quality review before release.

- [ ] **Q01 Олон хэрэглэгчийн ачаалал, нөөц сэргээх, байршуулалт** — partial
  Энэ хувилбарыг зөвхөн орон нутгийн орчинд шалгасан. Таван мянган зэрэг хэрэглэгч, үүлэн орчны ачаалал, нөөцөөс сэргээх болон бодит нэвтрүүлэлтийг тусад нь туршина. Одоогийн шалгалтыг үйлдвэрлэлийн хүчин чадлын баталгаа гэж үзүүлэхгүй.
  Нотолгоо: No production access or deployment. All54 migrations apply on an empty disposable local database; dump/restore critical counts and attachment byte hashes pass. Cloud5000 concurrency/HA/PITR/CDN/load and recovery still need isolated real testing.
  Acceptance: Approved isolated load/failure test meets stated p95/error budget; restore rehearsed; live rollout separate explicit decision.

- [ ] **Q02 Утасны цэвэр дэлгэц, математик дүрслэл, алдааны төлөв** — partial
  Шинэ суралцах хэсгүүд утасны дэлгэцэд нэг ажил дээр төвлөрч, математик тэмдэглэгээ болон бодит хоосон, алдааны төлөвийг харуулна. Давтлага, түүхийн гол урсгалыг жижиг дэлгэцээр шалгасан. Системийн бүх хуучин дэлгэцийн харагдах байдал, хүртээмжийг бүрэн шалгаж дуусаагүй.
  Нотолгоо: Actual365/375px and desktop checks cover new study/review/history, homework, theory, parent, feedback, checkout, gallery, group mode, tabs and help; no overflow or KaTeX errors in those flows. Scoped lint/typechecks pass. Every inherited screen and full accessibility/performance pilot are not certified.
  Acceptance: 375px/desktop browser checks focus and loading/errors; math renders; no emoji/random glyph or fake personal examples.

- [x] **Q03 Хувийн багшийн тэмдэглэл ба хадгалалтын хязгаар** — tested
  Хуучин илгээлт, засвар, онолын холбоосыг түүхтэй нь хадгалж, идэвхтэй жагсаалтаас архивласан материалыг ялгана. Хүүхэд, эцэг эхэд зөвхөн тэдэнд харагдах үнэлгээ, хавсралтыг өгнө. Бүх хуучин хэсгийн мэдээлэл дамжуулах хүрээг нэг бүрчлэн шалгасан гэж амлахгүй.
  Нотолгоо: Actual local historical parent/file fixtures passed; crossmodule full DTO audit not exhaustive.
  Acceptance: Parent DTO never contains StudentNote, legacyNote, actor internals or global finance; archived revision images still authorized.

- [x] **Q04 Хуучин хүсэлтийг өнөөгийн шаардлагаас ялгах** — tested
  Хуучин төлөвлөгөө, шаардлагыг одоо байгаа код, туршилтын нотолгоотой харьцуулж үзнэ. Хийсэн, хэсэгчлэн хийсэн, дараа хийх болон үйлчилгээний тохиргоо хүлээж буй ажлыг ялгана. Хуучин баримтын тэмдэглэгээ нь бодит хэрэгжилт эсвэл нэвтрүүлэх зөвшөөрөл болохгүй.
  Нотолгоо: Audit generated with explicit verification strings; no status inferred from old HTML ok labels.
  Acceptance: Every row has source/status/exact files/acceptance; referenced missing path detected; future/config features never called complete.

- [x] **V01 Нүүр хуудас ба буцах зам** — tested
  Бүх эрхээр нийтэд зориулсан нүүр рүү буцна. Гүн холбоос бүр мэдэгдэж буй эцэг хэсэгтэй.
  Нотолгоо: Бүх эрхээр нийтэд зориулсан нүүр рүү буцна. Гүн холбоос бүр мэдэгдэж буй эцэг хэсэгтэй.
  Acceptance: Нэвтэрсэн6 эрх,375px/том дэлгэцээр нүүр→самбар→гүн хуудас→буцах; сесс хэвээр.

- [ ] **V02 Он оноор амжилтын галерей** — partial
  2018–2026 он, гарын удирдлага, өндөр чанарын зөвшөөрсөн зурагт зориулсан кодын тохиргоо. Тусдаа upload админ дэлгэц хэрэггүй. Бодит баталсан зураг, дүн одоогоор оруулаагүй.
  Нотолгоо: 2018–2026 он, гарын удирдлага, өндөр чанарын зөвшөөрсөн зурагт зориулсан кодын тохиргоо. Тусдаа upload админ дэлгэц хэрэггүй. Бодит баталсан зураг, дүн одоогоор оруулаагүй.
  Acceptance: Зохиомол ганц зурагтай болон хоосон375px/1280px шалгалт давсан; баталсан бодит эхийг кодын manifest-д оруулах ажил үлдсэн.

- [x] **V03 Гараар эргүүлэх гурван хэмжээст биет** — tested
  Куб, конус, бөмбөрцөг. Хуруу, хулгана, сумтай товчоор эргүүлнэ; өнцгийг сэргээнэ. Богино танилцуулах хөдөлгөөн, харагдаж байх үеийн10 минутын солилт; серверийн хүсэлтгүй.
  Нотолгоо: Куб, конус, бөмбөрцөг. Хуруу, хулгана, сумтай товчоор эргүүлнэ; өнцгийг сэргээнэ. Богино танилцуулах хөдөлгөөн, харагдаж байх үеийн10 минутын солилт; серверийн хүсэлтгүй.
  Acceptance: Геометр51 өнцгөөр, бодит Chrome365/1440, mouse/touch/keyboard/reset, босоо гүйлгэлт, reduced motion, далд/фокустай биетийн цагийн хамгаалалт шалгасан. docs/v2/LANDING-DESIGN-QA.md.

- [x] **V04 Word тэгшитгэлээс LaTeX импорт** — tested
  Эхийг урьдчилж хараад багш prompt/сонголт/зөв хариуг батална. OMML дэмжихгүй хэсэг анхааруулгатай.
  Нотолгоо: Эхийг урьдчилж хараад багш prompt/сонголт/зөв хариуг батална. OMML дэмжихгүй хэсэг анхааруулгатай.
  Acceptance: 8 бодит эхийг уншсан;16 тест; бодит DB concurrency/rollback; хүний баталгаа шаардлагатай.

- [x] **V05 Санал хүсэлт, хариу, хавсралт** — tested
  Өөрийн хүсэлт ба хариуг харна. Давхар хүсэлт нэг бичилт; зөвхөн өөрийн зураг.
  Нотолгоо: Өөрийн хүсэлт ба хариуг харна. Давхар хүсэлт нэг бичилт; зөвхөн өөрийн зураг.
  Acceptance: Өөр хүн хүсэлт/зураг үзэхгүй; холбоо тасрахад draft үлдэнэ; админы хариу түүхтэй.

- [x] **V06 Төвийн мэдээллийн туслах чат** — tested
  Зөвхөн бичиж баталгаажуулсан12 сэдвийн мэдээлэл. Хариу эх сурвалжтай, хувийн сан уншихгүй.
  Нотолгоо: Зөвхөн бичиж баталгаажуулсан12 сэдвийн мэдээлэл. Хариу эх сурвалжтай, хувийн сан уншихгүй.
  Acceptance: Монгол/латин асуулт, мэдэхгүй асуулт, нууц утга/injection, холбоо тасрахад асуулт хадгалах.

- [x] **V07 Судалгааны шинэ эх сурвалжийн сан** — tested
  52 шалгасан эх,32 шинэ судалгааны ажил. Давхардал ба буруу ишлэлийг ялгасан.
  Нотолгоо: 52 шалгасан эх,32 шинэ судалгааны ажил. Давхардал ба буруу ишлэлийг ялгасан.
  Acceptance: URL/identity давхцахгүй; license ба hardware хязгаар тодорхой. Суурь тоо баталгаажаагүй тул2× гэж зарлахгүй.

- [x] **V08 Өөрийн анги, сургууль, шалгалтын эрэмбэ** — tested
  Зөвхөн өөрийн оноо/байр/тоо. Ижил оноо ижил байр; бусдын нэр/ID хариунд орохгүй.
  Нотолгоо: Зөвхөн өөрийн оноо/байр/тоо. Ижил оноо ижил байр; бусдын нэр/ID хариунд орохгүй.
  Acceptance: Бодит HTTP tie1/1/3, дүнгүй404, бусад эрх403,375px гарын удирдлага.

- [x] **V09 Шинэчилсэн сангууд ба давтан шалгалт** — tested
  Next16.4, React19.3, KaTeX0.19, Prisma7.10. API1,341 тест, вэб19 тест давсан; production audit хоёр талд0. Dev tooling-ийн advisory үлдсэн бөгөөд cloud баталгаа биш.
  Нотолгоо: Next16.4, React19.3, KaTeX0.19, Prisma7.10. API1,341 тест, вэб19 тест давсан; production audit хоёр талд0. Dev tooling-ийн advisory үлдсэн бөгөөд cloud баталгаа биш.
  Acceptance: Хамаарлын audit, production build, формулын LaTeX validator, бодит upload/auth regression.

- [x] **V10 Хувилбарын хяналт, тэмдэглэл, export** — tested
  Үйл ажиллагаанаас тусдаа хөгжүүлэлтийн хяналтын жагсаалт. Checkbox/comment төхөөрөмж дээр; JSON export.
  Нотолгоо: Үйл ажиллагаанаас тусдаа хөгжүүлэлтийн хяналтын жагсаалт. Checkbox/comment төхөөрөмж дээр; JSON export.
  Acceptance: Reload тэмдэглэл хадгална; эвдэрсэн импорт өгөгдлийг дарж бичихгүй; search/filter/mobile.

- [ ] **V11 Дурын зураг таньж боддог локал загвар** — future
  OCR→LaTeX→багш батлах→семантик хувиргалт→хязгаартай solver гэсэн үе шат. Универсал solver гэж амлахгүй.
  Нотолгоо: OCR→LaTeX→багш батлах→семантик хувиргалт→хязгаартай solver гэсэн үе шат. Универсал solver гэж амлахгүй.
  Acceptance: Монгол бичвэр/гар бичмэл/геометр/лиценз/зорилтот төхөөрөмжийн хэмжилт бүрэн болоод идэвхжүүлнэ.

- [ ] **V12 Бүх үеийн медиаг устгахгүй хадгалах** — partial
  Онолыг hard delete хийхгүй; архив, сэргээх түүхтэй. Бодлого, ном, видео эхийг хадгална; private upload DB хуулбартай.54 миграцийн хоосон сан болон DB/file байтын нөөц сэргээх локал шалгалт давсан. CDN/object-store rollout тусдаа; PDF үргэлж жижиг болдоггүй.
  Нотолгоо: Онолыг hard delete хийхгүй; архив, сэргээх түүхтэй. Бодлого, ном, видео эхийг хадгална; private upload DB хуулбартай.54 миграцийн хоосон сан болон DB/file байтын нөөц сэргээх локал шалгалт давсан. CDN/object-store rollout тусдаа; PDF үргэлж жижиг болдоггүй.
  Acceptance: DB+object store нөөцөөс сэргээх, хэмжээ ба чанарын харьцуулалт, хадгалалтын гэрээ/эрхийн шалгалт.

- [ ] **V13 Хөгжүүлэлт ба байршуулалтын дараалал** — partial
  Локал acceptance→cloud staging→restore/load→хязгаарласан rollout. Гаднын холболтын credential ашиглаагүй.
  Нотолгоо: Локал acceptance→cloud staging→restore/load→хязгаарласан rollout. Гаднын холболтын credential ашиглаагүй.
  Acceptance: Docker/runtime/API schema/DB pool/CDN/outbox monitoring;5000 хэрэглэгчийн баталгаа тусдаа бодит тест.

- [ ] **V14 Алдаагүй гэж зарлахын өмнөх нотолгоо** — partial
  Хийсэн, туршсан, хэсэгчлэн, гадаад тохиргоо, дараа гэсэн төлөвийг ялгана.
  Нотолгоо: Хийсэн, туршсан, хэсэгчлэн, гадаад тохиргоо, дараа гэсэн төлөвийг ялгана.
  Acceptance: Бүрэн unit/typecheck/build, browser role workflows, хэрэглэгчийн pilot, restore ба production integration.

- [x] **V15 Нэг командаар тусгаарласан локал орчин асаах** — tested
  Node22.12+ эсвэл24+, өөрийн PostgreSQL5544, API3380, вэб3381. Setup/seed/current readiness ба буруу тохиргоо, эзлэгдсэн портын татгалзал туршсан.
  Нотолгоо: Node22.12+ эсвэл24+, өөрийн PostgreSQL5544, API3380, вэб3381. Setup/seed/current readiness ба буруу тохиргоо, эзлэгдсэн портын татгалзал туршсан.
  Acceptance: Production-mode startup-ийн эцсийн үр дүн VALIDATION.md-д; cloud дээр байршуулсан гэсэн үг биш.

- [x] **V16 Бүлэг удирдах багшийн өөрийн хэсэг** — tested
  Төвийн ажилтны цэс үзүүлэхгүй; өөрийн бүлгээ шууд үүсгэнэ. API эрхийг одоогийн role/profile-аар давхар шалгана.
  Нотолгоо: Төвийн ажилтны цэс үзүүлэхгүй; өөрийн бүлгээ шууд үүсгэнэ. API эрхийг одоогийн role/profile-аар давхар шалгана.
  Acceptance: 365px шинэ бүртгэл→login→Анги удирдах→өөрийн бүлэг→нийтийн нүүр→буцах давсан; төвийн API403, JWTrole өөрчлөгдөөгүй.

- [ ] **V17 Орлого, захиалга, хүлээгдэж буй төлбөрийг ялгах** — partial
  Баталсан төлбөрийг давхар тоолохгүй; хүлээгдэж буй захиалгын үнэ орлого биш. UUID-тай төлбөрийн хүсэлт давхардалгүй; PASS-ийн scope/хугацааны snapshot хадгална. Батлах ба атомар эрх нээх нь тусдаа, дахин оролдож болох хүсэлт.
  Нотолгоо: Баталсан төлбөрийг давхар тоолохгүй; хүлээгдэж буй захиалгын үнэ орлого биш. UUID-тай төлбөрийн хүсэлт давхардалгүй; PASS-ийн scope/хугацааны snapshot хадгална. Батлах ба атомар эрх нээх нь тусдаа, дахин оролдож болох хүсэлт.
  Acceptance: Локал concurrency/privacy/money checks давсан; BOOK-ийн нөхцөлийн snapshot, бодит provider settlement, өмнөх банкны өгөгдөл, буцаалтын allocation хийгдээгүй.

- [ ] **V18 Элсэлт, түвшин тогтоох, туршилтын хичээл, гэрээ** — future
  Хэрэглэгчийн дэлгэрэнгүй дараалал баримтжуулсан. Одоогийн бүртгэл/идэвхжүүлэлтийг бүрэн элсэлтийн урсгал гэж үзэхгүй.
  Нотолгоо: Хэрэглэгчийн дэлгэрэнгүй дараалал баримтжуулсан. Одоогийн бүртгэл/идэвхжүүлэлтийг бүрэн элсэлтийн урсгал гэж үзэхгүй.
  Acceptance: Зургийн баталгаа→багшийн үнэлгээ→холбогдох→туршилтын1–2 хичээл→гэрээ гэсэн ажиллагааг тусдаа хэрэгжүүлж туршина.
