# CODEX-NIGHT-1: гүйцэтгэл ба хяналтын тайлан

Анхны тайлан: 2026-09-27 (Улаанбаатар). Эх даалгавар: эзний CODEX-NIGHT-1.json. Өмнөх локал нэгтгэлийн суурь: `claude/100-dollar-credit-usage-ksqjev`, `c47f63c`.

GitHub төлөвийг дахин шалгасан: **2026-09-27 00:47 (UTC+8)** / 2026-09-26 16:47 UTC. Одоогийн суурь: **`5202db2`**; G26/G36 follow-up PR-уудын эхэлсэн суурь: **`9c0cbb0`**. Доорх төлөв нь энэ мөчийн snapshot; нээлттэй PR-ийг нэгтгэгдсэн гэж үзэхгүй.

## Ажлын хүрээ

Ажлыг тусгаарласан `codex/night1-*` салбаруудаар хийсэн. Codex `main` руу push, force-push, GitHub PR merge, deployment, production сангийн өөрчлөлт хийгээгүй. #10–22, #24, #25-ын анхны head, #26, #28 болон өмнөх тайлан #29-ийг эзний тал нэгтгэсэн нь одоогийн сууринд орсон; энэ тайлан тэдгээрийг Codex өөрөө нэгтгэсэн гэж үзэхгүй. #23 нэгтгэгдээгүй хаагдсан. Эх feature салбарт дараа нь push хийсэн нь хаагдсан/нэгтгэгдсэн PR-ийн merge head-ийг өөрчилдөггүй.

Эх `/Users/mr.buus/Intern/Pi.mn` repo-ийн tracked файлууд өөрчлөгдөөгүй. Тэнд өмнө байсан untracked материалууд хэвээр. Түр checkout, синтетик сан, шалгалтын лог `/private/tmp/pi-night1` дотор; энэ хавтас урт хугацааны backup биш. Код, тайлан, зохиомол QA зураг нь GitHub PR-уудад хадгалагдсан.

Claude дуудахгүйгээр Codex дотор хяналт хийсэн. Жинхэнэ SMS, email, төлбөр илгээгээгүй; хувийн өгөгдөл fixture эсвэл screenshot-д оруулаагүй. Хамгаалсан dashboard/layout/nav файлуудыг өөрчлөхгүйгээр ажилласан. Тэдгээрийн эзний хийсэн шинэ холболт, загварыг шинэ суурьтай нийцүүлэхдээ хадгалсан. PLATFORM-SPEC.html дахь GAPS-ийг done болгож тэмдэглээгүй.

## Даалгавар бүрийн үр дүн

| Ажил | PR | Гүйцэтгэл |
|---|---|---|
| A1 G22 эрх | [#15](https://github.com/mrbuus/Pi/pull/15) | Эрх засах/идэвхгүй болгох, сурагч хайж эрх олгох, тайлбар, шалтгаантай цуцлалт, audit. |
| A2 G23 зарлага | [#18](https://github.com/mrbuus/Pi/pull/18) | Засах, баталгаажуулж устгах, Түрээс шошго; ADMIN эрх болон audit тест. |
| A3 G12 гадны багш | [#21](https://github.com/mrbuus/Pi/pull/21) | Хүсэлт шүүх, шалтгаантай татгалзах, дахин авч үзэх, баталгаажуулалт цуцлах. |
| A4 G36 ноорог | [#25](https://github.com/mrbuus/Pi/pull/25) анхны head нэгтгэгдсэн; [#34](https://github.com/mrbuus/Pi/pull/34) follow-up нээлттэй | Серверт 2 секундийн autosave, revision-аар давхар засалт илрүүлэх, сэргээх/дахин оролдох/хуулбарлах. ADMIN, Багш+, Багш; багш нар зөвхөн өөрийн ноорог. Тест хуулбарлахад үр дүн, эрх, анги дагахгүй; хуучин response-ийн problems тоо хадгалагдана. |
| B1 G24 SMS | [#11](https://github.com/mrbuus/Pi/pull/11) | Загвар CRUD, GSM/UCS-2 сегмент, серверийн өртөгтэй баталгаажуулалт. Бодит илгээлт хийгээгүй. |
| B2 G27 мэдэгдэл | [#16](https://github.com/mrbuus/Pi/pull/16) | Өөрийн мэдэгдэл, cursor, уншсан төлөв, тоо, bell/page, optional SMTP. Эзэн bell-ийг шинэ суурийн layout-д холбосон. |
| B3 G39 календарь | [#22](https://github.com/mrbuus/Pi/pull/22) | Hash-тай token URL/reset, өөрийн 12 долоо хоногийн ICS, UID/timezone, хуваарь өөрчлөгдөх мэдэгдэл. |
| C1 G25 сурагч | [#19](https://github.com/mrbuus/Pi/pull/19), [#26](https://github.com/mrbuus/Pi/pull/26) нэгтгэгдсэн | Архив/сэргээх, Excel preview, 100 мөрийн batch, CSV BOM экспорт, архивласан сурагчийг идэвхтэй roster/шинэ элсэлтээс хасах. 205 зохиомол мөрийг 100/100/5-аар шалгасан. |
| C2 G26 төлсөн хугацаа | [#23](https://github.com/mrbuus/Pi/pull/23) нэгтгэгдээгүй хаагдсан; [#33](https://github.com/mrbuus/Pi/pull/33) follow-up нээлттэй | Өөрийн болон verified хүүхдийн төлсөн хугацаа, Улаанбаатарын өдрийн тооцоо, алдаанд retry. Хүүхэд солих үед өмнөх хүүхдийн мэдээлэл харагдахгүй; ижил card-ийн ID давхцахгүй. Эзний шинэ chunky UI хадгалсан. |
| C3 LaTeX аудит | [#24](https://github.com/mrbuus/Pi/pull/24) нэгтгэгдсэн | Унших зориулалттай KaTeX аудит, 8 төрлийн шинж, JSON/CSV аюулгүй экспорт. Production контент уншиж/засаагүй. |
| D1 G17 зөвшөөрөл | [#10](https://github.com/mrbuus/Pi/pull/10) | Монгол privacy/terms төсөл, consent checkbox/API/page. Хуульчаар баталгаажсан гэж үзэхгүй. |
| D2 G33 preview | [#12](https://github.com/mrbuus/Pi/pull/12) | Ном/бүлгийн эхний 3 бодлогын statement; зөв хариу/бодолт/video нийтэд өгөхгүй; archived/deleted ном хаалттай. |
| D3 G37 PWA | [#13](https://github.com/mrbuus/Pi/pull/13) | Manifest, локал дүрс, static-only SW, offline fallback. API, хувийн HTML/RSC cache хийхгүй. |
| E1 G30 E2E | [#20](https://github.com/mrbuus/Pi/pull/20) | 375/1280 өргөнтэй journey. Эзэн admin overflow-ийг сууринд зассан тул өмнөх expected failure арилсан. Эцсийн үр дүн доор. |
| E2 G31 load | [#14](https://github.com/mrbuus/Pi/pull/14) | 2000 VU k6 script, synthetic fixture, хамгаалалт, хоосон үр дүнгийн загвар. k6 хэмжилт ажиллуулаагүй. |
| E3 G32 OpenAPI | [#17](https://github.com/mrbuus/Pi/pull/17) | DTO metadata, Swagger plugin; зөвхөн non-production ба ENABLE_SWAGGER=1. Production идэвхгүйг шалгасан. |
| E4 smoke/эрх | [#28](https://github.com/mrbuus/Pi/pull/28) нэгтгэгдсэн | Бүх Night-1 endpoint-ийн role/DTO contract, localhost HTTP matrix, Store admin endpoint-ийн дутуу RolesGuard. Draft, duplicate-ийн Багш+ эрхтэй нийцүүлсэн. |

## GitHub нийтлэлт ба follow-up

| Ажил | GitHub-д бодитоор хаагдсан head | Дараа нь push хийсэн эх салбар | Шинэ нээлттэй PR |
|---|---|---|---|
| G26 | #23: `a283f10`, CLOSED, mergedAt байхгүй | `codex/night1-g26-paid-until`: `5e76f31` | [#33](https://github.com/mrbuus/Pi/pull/33), `codex/night1-g26-followup`, `044baad` |
| G36 | #25: `0b1565`, MERGED, 2026-09-26 15:28:03 UTC | `codex/night1-g36-drafts`: `9a1a4f0` | [#34](https://github.com/mrbuus/Pi/pull/34), `codex/night1-g36-followup`, `bf70723` |

Хуучин PR-ийн body-д эцсийн засварыг бичсэн нь тэр кодыг merge-д оруулсан гэсэн үг биш. #33/#34 нь `9c0cbb0`-оос тусдаа worktree-д эхэлж, эх салбарын засварыг одоогийн owner кодтой харьцуулан хамгийн бага diff-ээр авчирсан бодит шинэ PR-ууд. G26-д Swagger metadata, chunky/compact UI; G36-д `duplicateTest` нэр, Prisma cast, одоогийн ганц хуулбарлах товч болон хуудасны зохион байгуулалтыг хадгалсан.

Бусад төлөв: #10–22 болон #24 MERGED. #26 (`3525d3c`), #28 (`b838ad0`) болон өмнөх тайлан #29 (`54f2bff`) нь **2026-09-26 16:36:45 UTC**-д MERGED болсон. #29 нэгтгэгдсэний дараа энэ залруулгыг `5202db2`-оос эхэлсэн `codex/night1-report-followup` салбарт бэлтгэсэн; хуучин #29-ийн body засах нь энэ баримтын кодыг нэгтгэхгүй. Тайлангийн төлөв нь кодын review/merge/deploy-ийг орлохгүй.

## Өмнөх локал нэгтгэлийн нотолгоо (c47f63c)

Нэгтгэлийн checkout: `codex/night1-current-local`, `25f76c8` (зөвхөн локал, push хийгээгүй). `c47f63c` дээр G26 `5e76f31`, G36 `9a1a4f0`, G25 болон smoke-ийн эцсийн feature салбаруудыг локал нэгтгэсэн. Энэ нь GitHub #23/#25-ын хуучин head биш, мөн шинэ `9c0cbb0` follow-up-уудын нийлмэл run биш. Доорх өмнө бодитоор гарсан тоонуудыг шинэ run гэж дахин нэрлээгүй; PR тус бүрийн тестүүдийг нэмж нийт тоо гаргаагүй.

- `NIGHT1_COMPLETE=1 npm test -- --runInBand`: **62 suite, 644 тест амжилттай**, skip байхгүй.
- Prisma validate/generate, API TypeScript/build: амжилттай. Build entry нь `dist/src/main.js`.
- Web TypeScript болон production build: амжилттай. Lint **0 error, 91 warning**; өмнөх тайлангийн 104 error нь шинэ суурийн төлөв биш. Эзний суурийн lint өөрчлөлтийг хуулбарласан; warning-ийг нууж 0 болгоогүй.
- `PW_CHANNEL=chrome npx playwright test`: **17 passed, 1 skipped**. Skip нь desktop project дээр давхардах mobile-only diagnostic. Admin mobile overflow одоо pass.
- Localhost HTTP strict smoke: **1115 шалгалт, 0 missing, 0 failure**. Өгөгдөл өөрчлөх зөвшөөрөгдсөн 201 хүсэлтийг зориуд ажиллуулаагүй; тэдгээр нь энэ HTTP шалгалтаар end-to-end батлагдсан гэсэн үг биш.
- Хоосон синтетик PostgreSQL санд **38 migration** deploy амжилттай. SMTP/SMS/payment орчны хувьсагчгүйгээр API асаж, role matrix ажилласан.
- LaTeX аудит ба script safety: **21 тест амжилттай**.
- G36 эцсийн тусдаа regression: 583 API тест, API/web build амжилттай; Багш+ бусдын ноорог унших/засах/устгах боломжгүй.
- G25: 375/1280 UI, 205 мөрийн batch, архив/сэргээх/CSV; G26: retry, хүүхэд солих, timezone, давхар ID; G36: autosave/retry/conflict/duplicate синтетик browser QA хийсэн. Screenshot нь тухайн PR-ийн `docs/qa` дотор.

Jest-ийн зарим суурь suite тест дууссаны дараа асинхрон handle-ийн анхааруулга өгсөн. Process өөрөө дууссан; энэ анхааруулгыг тестийн failure гэж эсвэл бүрэн цэвэр teardown гэж аль алингаар нь тайлбарлаагүй. Browser mocks нь бодит үйлчилгээтэй холбогдсоны баталгаа биш.

## Шинэ суурийн follow-up шалгалт (2026-09-27 00:42, UTC+8)

Хоёр branch хоёулаа `9c0cbb0`-оос эхэлсэн. Dependency-ийг өмнөх synthetic checkout-оос тусдаа хуулж, schema/client-ийг validate/generate хийсэн; generated client-ийн diff гараагүй.

| PR / head | API | Web ба нэмэлт шалгалт |
|---|---|---|
| G26 #33 / `044baad` | Prisma validate/generate, TypeScript, build; **61 suite, 583/583 тест**, skip 0 | TypeScript, өөрчилсөн компонентын lint, production build; 163 статик холбоос, broken 0; 21 computed href шалгагдаагүй |
| G36 #34 / `bf70723` | Prisma validate/generate, TypeScript, build; **59 suite, 583/583 тест**, skip 0 | TypeScript, өөрчилсөн хуудасны lint, production build; 163 статик холбоос, broken 0; 20 computed href шалгагдаагүй |

Эдгээр 583 тоог хооронд нь эсвэл өмнөх 644-тэй нэмж нэгтгэлийн тоо болгоогүй. HTTP test listener болон Turbopack worker-ийн localhost port эхний sandbox run-д EPERM өгсөн; зөвшөөрөгдсөн локал socket орчинд дахин ажиллуулж дээрх амжилтыг авсан. Jest-ийн өмнөх async handle анхааруулга үлдсэн, процесс өөрөө дууссан.

G36-ийн шинэ built localhost хуудсанд **TEACHER_PLUS** synthetic Chrome journey ажиллуулсан: autosave, restore retry, conflict хувилбарыг тусдаа ноорог болгох, ганц «Хуулах» товч ба засварын хуудас руу шилжих амжилттай. 2 create, 2 patch, 0 delete, 1 duplicate; 375px overflow 0, pageerror 0. Энэ шалгалт saved-status UI дахь хуучин role нөхцөл/буруу мэдэгдлийг илрүүлж зассаны дараа дахин тэнцсэн.

G26 компонент `5e76f31`-ийн өмнө browser QA хийсэн файлтай ижил; тэр 375/1280 зураг, retry/хүүхэд солих/timezone/ID шалгалтыг түүхэн нотолгоо болгон хадгалсан. Шинэ browser run гэж тоолоогүй. Энэ follow-up-д 1115 HTTP matrix, 17 E2E journey, 38 migration deploy-ийг нийлмэл checkout дээр дахин ажиллуулаагүй; тэдгээр нь зөвхөн өмнөх хэсгийн run-д хамаарна.

## Хамгийн шинэ суурийн локал нэгтгэл (2026-09-27 00:49, UTC+8)

GitHub суурь шинэчлэгдсэний дараа `5202db2` дээр #33 `044baad` болон #34 `bf70723`-ийг тусгаарласан локал checkout-д conflict-гүй нэгтгэв. Локал commit: **`3b24d3b`**, branch: `codex/night1-followup-integration-local`; push хийгээгүй. Энэ сууринд эзний нэгтгэсэн #26/#28 болон Sprint-2 formula API зэрэг нэмэлтүүд орсон тул өмнөх run-аас suite/test-ийн тоо өөр.

- Prisma validate/generate, API TypeScript/build: амжилттай; generated client-ийн tracked diff байхгүй.
- `NIGHT1_COMPLETE=1 npm test -- --runInBand`: **67 suite, 731/731 тест**, skip 0. Draft/duplicate/paid-until болон одоогийн route contract-уудыг хамтад нь шалгасан.
- Web TypeScript болон production build: амжилттай.
- Dependency-ийг өмнөх тусгаарласан checkout-оос хуулж, шинэ суурийн KaTeX-ийг T01-ийн dependency хуулбараас нэмсэн; repository-ийн package/lock файлыг өөрчлөөгүй.

Jest-ийн async handle анхааруулга гарсан ч процесс өөрөө амжилттай дууссан. Энэ run-д browser/HTTP matrix, migration deploy болон load test дахин ажиллуулаагүй. Локал нэгтгэл тэнцсэн нь GitHub PR merge эсвэл deployment болсон гэсэн үг биш.

## Миграци ба нэгтгэл

Night-1-ийн нэмэлтүүд: `20260927_01_add_user_archived`, `02_user_consent`, `03_notifications`, `04_test_draft`. Сууринд эзний `05_add_stored_file` болон `20260908_add_google_identity_auth` аль хэдийн орсон; Google хүснэгтүүдэд хүрээгүй. Бүх шинэ migration нэмэх хэлбэртэй. Хоосон санд амжилттай deploy болсон нь production migration history/drift таарсны баталгаа биш.

G39 нь G27-оос хамаарна; эдгээр болон #26/#28 аль хэдийн шинэ сууринд бий. Нээлттэй #33/#34 PR-уудыг эзэн нэгтгэсний дараа эцсийн commit дээр `NIGHT1_COMPLETE=1` болон HTTP `--night1-complete` дахин ажиллуулна. Generated Prisma client-ийн conflict гарвал нэг талыг шууд сонгохгүй; бүх additive schema өөрчлөлтийг хадгалаад validate/generate хийнэ.

## Үлдсэн хязгаар

1. **Ачаалал:** 2000/5000 зэрэг хэрэглэгч, p95 latency, production pool/timeout-ийн хэмжилт хийгээгүй. Тусдаа дүйцэх орчинд k6 шаардлагатай; тестийн тоогоор даац батлахгүй.
2. **Lint:** 91 warning үлдсэн. Хамгаалсан UI файлуудад эдгээрийн хэсэг бий. Дүрэм сулруулж эсвэл ignore нэмж нуухгүйгээр тусдаа хүрээнд шийдэх шаардлагатай.
3. **Импорт:** preview нь нэг process-ийн memory-д, 15 минут/10 entry хязгаартай. Restart эсвэл олон instance орчинд shared durable storage хэрэгтэй. 1000 мөрийн дээд хязгаар, 100 мөрийн transaction batch нь бүх Excel-ийг нэг атом transaction болгохгүй; partial progress/retry-г UI харуулна.
4. **Хууль/үйлчилгээ:** privacy/terms-ийн хууль зүйн хяналт, бодит хадгалалтын хугацаа/асран хамгаалагчийн баталгаажуулалт, SMTP/SMS/QPay integration, backup/rollback болон deployment тусдаа баталгаажна. Codex эдгээрийг хийсэн гэж тайлагнахгүй.
5. **Төхөөрөмж:** жинхэнэ iPhone/Safari суулгалт, Android календарийн refresh-ийг локал browser QA орлохгүй. ICS token холбоосыг нууцална; алдагдвал reset хийнэ.
6. **Контент:** preview-ийн 100 ном/500 бүлгийн хамгаалалтын хязгаараас том каталогт pagination шаардлагатай. LaTeX аудит зөвхөн оношилно, бодлогыг автоматаар засахгүй; бодит сан дээр ажиллуулаагүй.
7. **UI холболт:** шинэ сууринд эзэн NotificationBell, PaidUntilCard, consent/navigation холбоосуудыг оруулсан. Манай feature PR тэдгээрийг буцаагаагүй. Бүрэн role-by-role production journey-г deploy-ийн өмнө шалгана.

## Дараагийн алхам

Нээлттэй #33/#34 болон энэ тайлангийн follow-up PR-ийн diff, owner decision-ийг хянаж, эзний нэгтгэсэн эцсийн commit дээр хатуу тестүүдийг ажиллуулна. Эдгээр follow-up шинэ migration агуулаагүй. Дараа нь төхөөрөмжийн QA, бодит load test, орчны тохиргоо, backup/rollback-ийг тусад нь батлаад байршуулна. Энэ тайлан нь production-д байршуулсан гэсэн мэдэгдэл биш. Sprint-2-ийн шинэ томьёо/давталтын ажлууд тусдаа PR-уудаар үргэлжилнэ.
