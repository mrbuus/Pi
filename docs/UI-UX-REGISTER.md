# Pi.mn · UI/UX дэлгэц ба төлөвийн бүртгэл

2026-09-22 · OP01–03. **Санал route**, одоогийн хэрэгжсэн route-ийн баталгаа биш. Бүх дэлгэц mobile/desktop, keyboard/focus, loading/empty/ready/error/retry, permission denial, stale/conflict төлөвийн зурагтай болно. Asset ID нь файл нэрээс тусдаа. Энэ inventory дээр UI prototype ба API contract дараа нэмнэ.

| Screen ID / санал зам | Хэрэглэгч, гол үйлдэл | Өгөгдөл/API модуль | Медиа ба онцгой төлөв | Trace |
|---|---|---|---|---|
| UI01 `/app` | Багш: өөрийн анги → өнөөдрийн ирц/даалгавар нэг товшилт | Classroom dashboard | Avatar; unchecked count; бусдын анги scope | D,R |
| UI02 `/classes/:id/today` | Ирц, онолын багц сонгох; test/homework нэмэх/хасах; үдэлт | LessonBundle/Attendance | Онол1/1 uploader vs submittedS/N; duplicate/version conflict | LB,DP |
| UI03 `/review/:submission` | Фото үзэх → үнэлэх → дараагийн сурагч | Evidence/Review | PDF rotate±90°, zoom, page thumbnails, normalized rectangle comment; offline save conflict | R |
| UI04 `/homework/:id` | Сурагч хариулах → шалгах → засах → бодолт үзэх → фото | Attempts/Submission | 1st/retry/solutionViewed тусдаа; processing/failed; хийсэн хувь | H |
| UI05 `/lessons/:id` | Онол, тухайн өдрийн бодсон тест, даалгавар, нөхөлт | Lesson session | Permanent theory/PDF; absence makeup evidence; missing theory | T,M |
| UI06 `/parent/:child` | Өнөөдрийн ирц, илгээсэн/шалгасан, хоёр үнэлгээ, үдэлтийн ойролцоо цаг | Parent projection | Verified child only; refreshedAt/disconnected; staff-only note алга | DP,P |
| UI07 `/admissions` | Эхлээд төвийн тайлбар → форм → placement | Admissions | Нөхцөл/хаяг/цаг approved copy; no parent2 contact alternative | PA |
| UI08 `/placement/:attempt` | Хариу draft → бодолтын фото → complete | Placement/Evidence | PDF READY mandatory; missing/processing/retry; no forced all-correct | PA |
| UI09 `/staff/admissions` | Багш+ review → call task → trial → contract record | Admissions/Enrollment | Contact details scoped; source work private; 6/8 QA flagged | PA,EC |
| UI10 `/staff/exams/:id/edit` | Draft, question select/import, primary topic, tags, key, publish | Content/Taxonomy/Exam | LaTeX/images preview; source/year; taxonomy coverage; private notes | QT |
| UI11 `/exams/:id/lobby` | Худалдаж авсан exam эрх → live start эсвэл anytime begin | Exam/Entitlement | Server time, sync indicator, expired/pending payment | LV,OD |
| UI12 `/attempts/:id` | Тест бөглөх, autosave, submit | Answers/Grading | Missing image fallback; saving/saved/offline/deadline; key absent | LV,IF |
| UI13 `/attempts/:id/result` | Оноо → бүлгийн хувь → алдсан бодлого | ItemResult/TopicScore | Wrong/blank/N/max; untested≠0%; first/retry; no AI/goal | DG |
| UI14 `/results/:exam` | ID/name audience тохирсон ranking | Publication snapshot | Virtual list, pending count; regrade label; private fields absent | RP |
| UI15 `/catalog` / `/checkout/:order` | Ном/exam/bundle/pass → үнэ/хугацаа → gateway | Commerce | CoverAssetId; scope including video?; pending/paid/granted/mismatch/refund | IC |
| UI16 `/library` / `/books/:id` | Бие даан бодох; эрх дуусахад renew | Content/Entitlement | Question/image IDs; watermark; history remains; no Pi teacher upsell | SB,IC |
| UI17 `/problems/:id/solution` | Текст/видео бодолт, дараагийн бодлого | Solution/Playback | LaTeX; poster/videoID; locked/processing/denied/broken/offline; bounded prefetch | PV |
| UI18 `/staff/problems/:id/media` | Teacher+ URL attach/upload, mapping preview, publish | Media pipeline | Provider/master IDs, progress, resuming, error, preview, audit | PV,CQ |
| UI19 `/groups` | “Анги удирдах”, үүсгэх/join code/гишүүдийн явц | Group/Consent | Self-service, no approval; group history scope; internal Pi data absent | SG |
| UI20 `/staff/payments` | Хуулга import → candidate → mismatch → confirm | BankReconcile/Ledger | Хүүхдийн нэр/утас private; duplicate file/transaction, amount difference | BR |
| UI21 `/billing` | Танхимын period/due/grace/payment status | TuitionPolicy | 5ны due→9ны00:00 lock policy; trial/contract decision; paid recovery | TP |
| UI22 `/staff/registry` | Code mapping preview → review → migration plan | Identity/Alias | Collision/unknown, immutable internal IDs, rollback; no public PII export | RG |
| UI23 `/staff/omr` | Machine export → parse → validate → score → audience publish | OMR/Publication | Unknown variant/key/ID errors; name vs ID separate option | OI,RP |
| UI24 `/ops` | Алдаа/queue/backup/payment pending, requestId | Observability | Staff/admin scope; no raw credentials; runbook links | OP,IF |

## Өдөр тутмын үйлдлийн interaction budget

Багш login-ий дараа өөрийн анги, өнөөдөр урьдчилан сонгогдсон байна. Ирц эсвэл шалгаагүй даалгаврыг нэг click/tap-аар нээнэ. Review-д сурагч бүрээр platform солихгүй, grade save+next нэг үйлдэл; гэнэтийн back/connection үед unsaved indicator. Дүн mode (бодсон/дутуу тоо) нэг toggle, total/percentage live preview; семантик +/− хувилбарын usability pilot тусдаа. Нэг утга хэд хэдэн төлөвийг далд төлөөлөхгүй.

Ховор үйлдэл (анги шилжүүлэх, enrollment stop, profile edit) row-ийн `⋯` цэсэнд; action нэр тодорхой, touch target хүрэлцээтэй. Түүхтэй нөлөөлөлд preview/confirmation; байнга ашиглах ирц/үнэлгээний товчийг түүнд нуухгүй. Нууц staff note байгаа жижиг icon/count → explicit open → author/time/revision. Avatar/нэр нь зөвшөөрөгдсөн ангийн хүрээнд.

Контентын баримт: дэлгэц бүр `screenId, route, actor, permission, entry, exit, component, assetIds, API operationId, state copy, mobile/desktop reference, acceptance, version, owner`-той бүртгэл болно. Хуучин 483 leaf-ийн дэлгэц/API холбоосыг энэ хүснэгтээр бүрэн баталсан гэж үзэхгүй; тус бүрийн аудит backlog хэвээр.

## Хийх UI ажлын дараалал

1. UI01–06 өдөр тутмын wireframe ба багш/эцэг эхийн 5 бодит task walkthrough.
2. UI07–09 placement ба trial; дараа UI15–16 автомат checkout states.
3. UI10–14 exam authoring/attempt/result; 5000 ranking-д virtual list.
4. UI17–19 video/group permission states; UI20–24 санхүү/registry/ops.
5. Mobile/Safari/keyboard/slow network QA, copy/version батлах. Онлайн анги, SMS, AI, goal, ML, animation дэлгэцийг V1 navigation-д оруулахгүй.

## Loading болон хэрэгжилтийн ажлын тусдаа бүртгэл · 2026-09-23

[π loading / UI/UX төлөвлөгөө](UI-LOADING-PLAN.md): UX01–UX08. App loading, skeleton, save, processing, offline/retry нь өөр өөр UI төлөв; хөдөлгөөний нэмэлт API хүсэлтгүй. Бодлогын анимэйшн тайлбар V2 хэвээр. Static HTML-ийн «Хийх ажлууд · TODO» нь «Үйл ажиллагаа»-аас тусдаа харагдацтай.

## v0.5 · Хэрэгцээ тодруулах дэлгэцүүд (код хийхээс өмнө)

| Дэлгэц / урсгал | Хэн / эхлэх зам | Үндсэн үйлдэл | Заавал харах төлөв | Хамрах хувилбар |
|---|---|---|---|---|
| Маргаашийн хуваарь SD | schedule.plan эрхтэй багш | суурь→багш/багц→зөрүү→нийтлэх | draft/published/revised/conflict/missing | Батлах |
| Өдрийн самбар WB | бүх ажилтан өөрийн ажил | уншсан→хийж байгаа→дууссан/саадтай | due/late/carried-over | Батлах |
| Төвийн календарь CC | зохион байгуулагч | event→milestone→ажил | internal/public/cancelled/revised | Батлах |
| Миний цаг TT | багш | actual time→хянах→илгээх | draft/returned/approved/locked | Батлах |
| Цагийн хяналт TT | time.review эрх | зөрүү→тайлбар→батлах | own approval restriction / missing period | Батлах |
| Ажилтны эрх SA | эзэн/эрх удирдагч | capability→verified userId→хугацаа | granted/revoked/expired | Батлах |
| Мэдэгдэл EM | багш / эрхтэй хянагч | веб inbox→ажил; delivery→алдаа | accepted≠delivered≠read | Имэйл V1 эсэхийг батлах |
| Он оны амжилт PS | зочин | он/хичээл→карт→бодит үйл явдал | empty/loading/image failure | Батлах |
| Багшийн танилцуулга PS | зочин | зөвшөөрөлтэй фото/мэдээлэл | draft/private/public | Батлах |
| Brand book BA | дизайнер/контент | logo/color/type/photo/motion | proposed/approved/versioned | Төлөвлөлт |
| Exam warning EV | шалгуулагч | бодлого унших→event→тайлбар | hidden/visible/fullscreen/offline | V1 дүрэм батлах |
| Бодлогын асуулт SQ | танхимын сурагч | problem→асуулт→хариу | sent/read/reply/follow-up/resolved | Батлах |
| Дэмжлэгийн пост SP | багш / хүссэн сурагч | audience→post→унших | draft/published/reported/withdrawn | Батлах |
| Feedback FB | бүх сурагч | төрөл→тайлбар→илгээх→явц | received/triaged/replied/resolved/reopened | V1 заавал |
| Нийгмийн ирц SX | ангийн багш | анги→ирц→summary | хичээлийн файл нээгдээгүй | V1 хүрээ батлах |
| Хувийн planner PP | сурагч | agenda→private task→reminder | offline/conflict/source-changed | V2+ |
| Фото solver OCR | сурагч | crop→OCR→засах→solve/verify | uncertain/unsupported/quota/error | V2+ |
| Ангиар номын багц AB | худалдан авагч | хамрах агуулга→эрх→төлбөр | overlap/expired/renewal | V2+ |
| Томьёоны тайлбар FL | сурагч | subject/problem→formula | exam-restricted/overflow | Батлах |
| Хувийн agent AG | төсөл эзэмшигч | асуулт→файлтай нотолгоо→санал | stale/conflict/unknown | Судалгаа, V1 бүтээгдэхүүн биш |

Өнгө ганцаараа төлөв илэрхийлэхгүй. Багшийн theme бол хүн таних зориулалттай, үнэлгээ биш. Утас, keyboard, reduced-motion, сул сүлжээ, хоосон/алдаатай өгөгдөл бүрийг бодит жишээгээр шалгах TODO. Wireframe/prototype дараа нь баталж architecture-д шилжинэ.


## v0.6 — Хуваарь ба брэндийн нэмэлт

| Дэлгэц | Хэн | Гол үйлдэл | Төлөв / QA | Эх блок |
|---|---|---|---|---|
| Excel эхийн харагч | Төлөвлөгөө уншигч | Өдөр/таб/анги/зөрүү хайх, санал | Хоосон хайлт, бүх эх нүд, давхар огноо | V6E01–07 |
| ЕБС календарийн давхарга | Хуваарь хариуцагч | Жил/нутаг/түвшин, эх баримт, түр өөрчлөлт | Баталсан/эх дутуу/хугацаа зөрсөн | V6C01–06 |
| Маргаашийн ноорог | schedule.plan эрхтэй хүн | Анги/багш/өрөө, авах/засах/шалгах | Давхцал, хугацаа дутуу, зэрэг засвар | V6S01–08 |
| Сэдвийн санал | Төлөвлөгч ба багш | Үргэлжлүүлэх/дараагийн/гараар | Progressгүй, custom, version солигдсон | V6N01–07 |
| Сэдвийн дүрсний сан | Дизайнер/контентын багш | Хэвлэл, Topic, SVG хувилбар | Утга, 24px, light/dark, бүтэн нэр | V6I01–05 |
| Брэндийн контакт хуудас | Хэрэглэгч/дизайнер | Palette/type/photo/амжилтын карт | Эх баталгаа, consent, reduced motion | V6B01–06 |

Эдгээрийн production release шийдээгүй. Статик эх харагч л энэ төлөвлөгөөнд нэмэгдсэн. Нарийн архитектур дараагийн үе шат.


## v0.7 · Судалгаанаас нэмэгдсэн дэлгэцийн дүрэм

- Брэнд: шар/алтлаггүй, дэвтрийн grid/цэгэн чимэглэлгүй; Adobe Color → Realtime Colors proof → contrast. Шинэ HEX батлаагүй.
- Нүүр: бодит багш/орчин/он оны амжилт; native scroll; reduced-motion; before/after зөвхөн утгатай дүрсний хос дээр.
- Хуваарь: өдөр тутмын editable rows, manual topic/тайлбар, suggestion засах, scope-aware publish, role-filtered download, revision/date.
- Мэдэгдэл: pending preview, цуцлах, urgent override, 10 минутын debounce санал, delivery/read ялгаа; SMS V1 биш.
- Математик: browser graph, reset/keyboard, lazy load/fallback; зураг solver тусдаа V2.
- Санхүү: API автомат ба банкны хуулга review гэсэн хоёр суваг; duplicate/ambiguous/partial төлөв харагдах.
- Атлас: Судалгааны сангийн шинэ дүгнэлт, алдааны аудит, backend дараалал, feature coverage тусдаа товч; хуучин review ID хадгалсан.

Дэлгэрэнгүй: DESIGN-AND-SIMULATION-RESEARCH.md, SYSTEM-RISK-REVIEW.md, BACKEND-PLANNING-HANDOFF.md. Production UI хараахан өөрчлөгдөөгүй.
