# CODEX-NIGHT-1: гүйцэтгэл ба хяналтын тайлан

Огноо: 2026-09-27 (Улаанбаатар). Эх даалгавар: эзний CODEX-NIGHT-1.json. Суурь: `claude/100-dollar-credit-usage-ksqjev`, `c47f63c`.

## Ажлын хүрээ

Ажлыг тусгаарласан `codex/night1-*` салбаруудаар хийсэн. Codex `main` руу push, force-push, GitHub PR merge, deployment, production сангийн өөрчлөлт хийгээгүй. #10–22 PR-уудыг эзний тал нэгтгэсэн нь одоогийн сууринд орсон; энэ тайлан тэдгээрийг Codex өөрөө нэгтгэсэн гэж үзэхгүй.

Эх `/Users/mr.buus/Intern/Pi.mn` repo-ийн tracked файлууд өөрчлөгдөөгүй. Тэнд өмнө байсан untracked материалууд хэвээр. Түр checkout, синтетик сан, шалгалтын лог `/private/tmp/pi-night1` дотор; энэ хавтас урт хугацааны backup биш. Код, тайлан, зохиомол QA зураг нь GitHub PR-уудад хадгалагдсан.

Claude дуудахгүйгээр Codex дотор хяналт хийсэн. Жинхэнэ SMS, email, төлбөр илгээгээгүй; хувийн өгөгдөл fixture эсвэл screenshot-д оруулаагүй. Хамгаалсан dashboard/layout/nav файлуудыг өөрчлөхгүйгээр ажилласан. Тэдгээрийн эзний хийсэн шинэ холболт, загварыг шинэ суурьтай нийцүүлэхдээ хадгалсан. PLATFORM-SPEC.html дахь GAPS-ийг done болгож тэмдэглээгүй.

## Даалгавар бүрийн үр дүн

| Ажил | PR | Гүйцэтгэл |
|---|---|---|
| A1 G22 эрх | [#15](https://github.com/mrbuus/Pi/pull/15) | Эрх засах/идэвхгүй болгох, сурагч хайж эрх олгох, тайлбар, шалтгаантай цуцлалт, audit. |
| A2 G23 зарлага | [#18](https://github.com/mrbuus/Pi/pull/18) | Засах, баталгаажуулж устгах, Түрээс шошго; ADMIN эрх болон audit тест. |
| A3 G12 гадны багш | [#21](https://github.com/mrbuus/Pi/pull/21) | Хүсэлт шүүх, шалтгаантай татгалзах, дахин авч үзэх, баталгаажуулалт цуцлах. |
| A4 G36 ноорог | [#25](https://github.com/mrbuus/Pi/pull/25) | Серверт 2 секундийн autosave, revision-аар давхар засалт илрүүлэх, сэргээх/дахин оролдох/хуулбарлах. ADMIN, Багш+, Багш; багш нар зөвхөн өөрийн ноорог. Тест хуулбарлахад үр дүн, эрх, анги дагахгүй; хуучин response-ийн problems тоо хадгалагдана. |
| B1 G24 SMS | [#11](https://github.com/mrbuus/Pi/pull/11) | Загвар CRUD, GSM/UCS-2 сегмент, серверийн өртөгтэй баталгаажуулалт. Бодит илгээлт хийгээгүй. |
| B2 G27 мэдэгдэл | [#16](https://github.com/mrbuus/Pi/pull/16) | Өөрийн мэдэгдэл, cursor, уншсан төлөв, тоо, bell/page, optional SMTP. Эзэн bell-ийг шинэ суурийн layout-д холбосон. |
| B3 G39 календарь | [#22](https://github.com/mrbuus/Pi/pull/22) | Hash-тай token URL/reset, өөрийн 12 долоо хоногийн ICS, UID/timezone, хуваарь өөрчлөгдөх мэдэгдэл. |
| C1 G25 сурагч | [#19](https://github.com/mrbuus/Pi/pull/19), [#26](https://github.com/mrbuus/Pi/pull/26) | Архив/сэргээх, Excel preview, 100 мөрийн batch, CSV BOM экспорт, архивласан сурагчийг идэвхтэй roster/шинэ элсэлтээс хасах. 205 зохиомол мөрийг 100/100/5-аар шалгасан. |
| C2 G26 төлсөн хугацаа | [#23](https://github.com/mrbuus/Pi/pull/23) | Өөрийн болон verified хүүхдийн төлсөн хугацаа, Улаанбаатарын өдрийн тооцоо, алдаанд retry. Хүүхэд солих үед өмнөх хүүхдийн мэдээлэл харагдахгүй; ижил card-ийн ID давхцахгүй. Эзний шинэ chunky UI хадгалсан. |
| C3 LaTeX аудит | [#24](https://github.com/mrbuus/Pi/pull/24) | Унших зориулалттай KaTeX аудит, 8 төрлийн шинж, JSON/CSV аюулгүй экспорт. Production контент уншиж/засаагүй. |
| D1 G17 зөвшөөрөл | [#10](https://github.com/mrbuus/Pi/pull/10) | Монгол privacy/terms төсөл, consent checkbox/API/page. Хуульчаар баталгаажсан гэж үзэхгүй. |
| D2 G33 preview | [#12](https://github.com/mrbuus/Pi/pull/12) | Ном/бүлгийн эхний 3 бодлогын statement; зөв хариу/бодолт/video нийтэд өгөхгүй; archived/deleted ном хаалттай. |
| D3 G37 PWA | [#13](https://github.com/mrbuus/Pi/pull/13) | Manifest, локал дүрс, static-only SW, offline fallback. API, хувийн HTML/RSC cache хийхгүй. |
| E1 G30 E2E | [#20](https://github.com/mrbuus/Pi/pull/20) | 375/1280 өргөнтэй journey. Эзэн admin overflow-ийг сууринд зассан тул өмнөх expected failure арилсан. Эцсийн үр дүн доор. |
| E2 G31 load | [#14](https://github.com/mrbuus/Pi/pull/14) | 2000 VU k6 script, synthetic fixture, хамгаалалт, хоосон үр дүнгийн загвар. k6 хэмжилт ажиллуулаагүй. |
| E3 G32 OpenAPI | [#17](https://github.com/mrbuus/Pi/pull/17) | DTO metadata, Swagger plugin; зөвхөн non-production ба ENABLE_SWAGGER=1. Production идэвхгүйг шалгасан. |
| E4 smoke/эрх | [#28](https://github.com/mrbuus/Pi/pull/28) | Бүх Night-1 endpoint-ийн role/DTO contract, localhost HTTP matrix, Store admin endpoint-ийн дутуу RolesGuard. Draft, duplicate-ийн Багш+ эрхтэй нийцүүлсэн. |

## Шалгасан нотолгоо

Нэгтгэлийн checkout: `codex/night1-current-local` (зөвхөн локал, push хийгээгүй). Суурь дээр #23–26, #28-ын эцсийн өөрчлөлтийг нэгтгэсэн. PR тус бүрийн суурь тестүүдийг давхар нэмж нийт тоо гаргаагүй.

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

## Миграци ба нэгтгэл

Night-1-ийн нэмэлтүүд: `20260927_01_add_user_archived`, `02_user_consent`, `03_notifications`, `04_test_draft`. Сууринд эзний `05_add_stored_file` болон `20260908_add_google_identity_auth` аль хэдийн орсон; Google хүснэгтүүдэд хүрээгүй. Бүх шинэ migration нэмэх хэлбэртэй. Хоосон санд амжилттай deploy болсон нь production migration history/drift таарсны баталгаа биш.

G39 нь G27-оос хамаарна; эдгээр аль хэдийн шинэ сууринд бий. Нээлттэй feature PR-уудыг нэгтгэсний дараа `NIGHT1_COMPLETE=1` болон HTTP `--night1-complete` дахин ажиллуулна. Generated Prisma client-ийн conflict гарвал нэг талыг шууд сонгохгүй; бүх additive schema өөрчлөлтийг хадгалаад validate/generate хийнэ.

## Үлдсэн хязгаар

1. **Ачаалал:** 2000/5000 зэрэг хэрэглэгч, p95 latency, production pool/timeout-ийн хэмжилт хийгээгүй. Тусдаа дүйцэх орчинд k6 шаардлагатай; тестийн тоогоор даац батлахгүй.
2. **Lint:** 91 warning үлдсэн. Хамгаалсан UI файлуудад эдгээрийн хэсэг бий. Дүрэм сулруулж эсвэл ignore нэмж нуухгүйгээр тусдаа хүрээнд шийдэх шаардлагатай.
3. **Импорт:** preview нь нэг process-ийн memory-д, 15 минут/10 entry хязгаартай. Restart эсвэл олон instance орчинд shared durable storage хэрэгтэй. 1000 мөрийн дээд хязгаар, 100 мөрийн transaction batch нь бүх Excel-ийг нэг атом transaction болгохгүй; partial progress/retry-г UI харуулна.
4. **Хууль/үйлчилгээ:** privacy/terms-ийн хууль зүйн хяналт, бодит хадгалалтын хугацаа/асран хамгаалагчийн баталгаажуулалт, SMTP/SMS/QPay integration, backup/rollback болон deployment тусдаа баталгаажна. Codex эдгээрийг хийсэн гэж тайлагнахгүй.
5. **Төхөөрөмж:** жинхэнэ iPhone/Safari суулгалт, Android календарийн refresh-ийг локал browser QA орлохгүй. ICS token холбоосыг нууцална; алдагдвал reset хийнэ.
6. **Контент:** preview-ийн 100 ном/500 бүлгийн хамгаалалтын хязгаараас том каталогт pagination шаардлагатай. LaTeX аудит зөвхөн оношилно, бодлогыг автоматаар засахгүй; бодит сан дээр ажиллуулаагүй.
7. **UI холболт:** шинэ сууринд эзэн NotificationBell, PaidUntilCard, consent/navigation холбоосуудыг оруулсан. Манай feature PR тэдгээрийг буцаагаагүй. Бүрэн role-by-role production journey-г deploy-ийн өмнө шалгана.

## Дараагийн алхам

Нээлттэй PR-уудын diff, migration, owner decision-ийг хянаж, эзний нэгтгэсэн эцсийн commit дээр хатуу тестүүдийг ажиллуулна. Дараа нь төхөөрөмжийн QA, бодит load test, орчны тохиргоо, backup/rollback-ийг тусад нь батлаад байршуулна. Энэ тайлан нь production-д байршуулсан гэсэн мэдэгдэл биш. Sprint-2-ийн шинэ томьёо/давталтын ажлууд тусдаа PR-уудаар үргэлжилнэ.
