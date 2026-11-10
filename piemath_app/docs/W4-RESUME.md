# Давалгаа 3–4: тасарвал эндээс үргэлжлүүлэх (2026-11-10 00:50-д бичив)

Эзний хүсэлт: токен дуусвал 03:50-д автоматаар сэргээд БҮГДИЙГ үргэлжлүүлэх. Эзний бүрэн даалгавар:
вэбийн бүх функцийг апп-д натив оруулах, апп дотроос вэб рүү ХЭЗЭЭ Ч гаргахгүй, RAM/диск кэшээр хамгийн гөлгөр,
бүх утсан дээр (2 GB Android 8 хүртэл) асуудалгүй; зургаар бодох судалгаа хийж «Photomath» session руу prompt илгээх.

Суурь: салбар `piemath-app` HEAD `000b20d7`, үндсэн worktree `/Users/mr.buus/Intern/pi.mnv2-scan`.
Flutter: `export PATH=~/Development/flutter-3.47/bin:$PATH`. Шалгалт: `flutter analyze` 0, `flutter test -x golden`.

## Agent-ууд (тус бүр өөрийн worktree, commit хийнэ, push хийхгүй)

| # | Ажил | Worktree (`/Users/mr.buus/Intern/pi.mnv2/.claude/worktrees/…`) | Салбар |
|---|---|---|---|
| 1 | Санхүү + тасалбар дуусгах | `agent-a98e8f3f399c3ecaa` (finance), `agent-aabb2d8a59e58b978` (passes) | app/w3-finance, app/w3-passes |
| 2 | SMS + элсэлт дуусгах | `agent-acd2feb3003e6734c` (sms), `agent-ad9853a77330cf237` (enrollment) | app/w3-sms, app/w3-enrollment |
| 3 | Серверийн зөөлөн устгал 2 | `agent-ae716d324985db8d9` | api/soft-delete-2 |
| 4 | Хурд, офлайн кэш (lib/core/network, cache, perf, files) | `w4-perf-offline` | app/w4-perf-offline |
| 5 | Вэб холбоосгүй болгох (auth, books, support, notifications, pending_screen) | `w4-no-web` | app/w4-no-web |
| 6 | Сурагч/эцэг эхийн дутуу хуудсууд | `w4-parity-student` | app/w4-parity-student |
| 7 | Ажилтан/админы дутуу хуудсууд | `w4-parity-staff` | app/w4-parity-staff |
| 8 | Зургаар бодох судалгаа → `piemath-wt/photo-solve/piemath_app/docs/PHOTO-SOLVE-RESEARCH-2026-11.md` + prompt | (код өөрчлөхгүй) | — |

**Дууссан:** 3 → `6ebd3a99`, piemath-app-д merge `37ead6c2` (jest 2749/2749, deploy хийгээгүй — эзний зөвшөөрөл,
ачааллын тест хэрэгтэй). 8 → судалгаа + prompt илгээсэн. 2 → sms `b14cb439`, enrollment `1179c202` merge +
маршрут `34362ddb` (analyze 0, тест 1824/1824). 1 → finance `c5c5c5be`, passes `d5217c16` merge + маршрут, хуулга
файл сонгогч `531d6606` (тест 1913/1913). Серверийн хатуу устгал үлдсэн: DELETE /finance/expenses/:id, /passes/:id,
pass grant revoke — апп-д товч гаргаагүй. 5 → no-web `fe0fbca1` merge `cf0deeae` + teacher-register public.
4 → perf `8428f7e6` merge `3067050a` (тест 1977/1977). 7 → staff 5 commit merge `99550141` + маршрут `0810ed84` (тест 2004/2004). Ажилтны үлдсэн: /app/admin/content,
capabilities (эзний шийдвэр), insights (problemToken), admin/v2, formulas print/widgets. 6 → student 14 commit merge
`9be11854` (тест 2036/2036).

## Давалгаа 5 (эзэн 01:56–01:59): хуваарь хялбар, дизайн, iOS зүүн захаас шудрах = буцах
| 9 | iOS edge swipe-back бүх дэлгэцэнд + хуваарийн hub зөвхөн Хуваарь/Төлөвлөгч, дотор нэг мөр удирдлага | `w5-nav-gesture` | app/w5-nav-gesture |
| 10 | Дизайны нэгдсэн шинэчлэл (core/ui) + нүүр хуудсууд (сурагч, багш/админ самбар, эцэг эх, худалдан авагч) | `w5-visual-home` | app/w5-visual-home |
Хоёулаа 9be11854-аас. 10 ДУУССАН: 5 commit merge `81613bf1` (тест 2061/2061). 10-ын хүсэлт (9 нийлсний дараа хий):
доод цэсний сонгосон шошго 700, brandTint pill, дээд хүрээ 1.5px line; my_class/ui/common.dart SectionCard → TitledCard.
Флэш картын \lim шүүлт `ee7be9bc`. Дуусмагц merge (9 → 10), analyze/test, Usukhbayar.B (UDID 00008110-001474D92212801E) руу суулга. Тэдгээрийг нийлүүлсний дараа: шинэ дэлгэцүүдэд
`swr`/`cacheFor` (docs/PERF-OFFLINE.md), өөр бүлгийн mutation-д `api.invalidateCache` (жишээ нь тест илгээх →
/student-hub), `ref.prefetch`-ийг таб нээгдэхэд холбох.

## Сэргэх үед хийх
1. Worktree бүрт `git log --oneline 000b20d7..HEAD` + `git status --short`: commit байгаа эсэх, commit хийгээгүй өөрчлөлт.
2. Дуусаагүй agent-ыг дахин ажиллуул (Agent, model opus, run_in_background) — тэр worktree дээр, «өмнөх ажлаа
   (commit + untracked) уншаад үргэлжлүүл, reset хийхгүй» гэж. Эзэмшлийн хил дээрх хүснэгтээр хэвээр.
3. Бүгд дуусахад `pi.mnv2-scan` дээр дараалан merge: 1,2 → 4 → 5 → 6 → 7 (зөрчил гарвал шийд), шинэ FeatureRoutes-ыг
   `lib/app/router.dart`-д импортлох, `flutter pub get`, analyze + бүтэн тест. 3 (сервер)-ыг тусад нь: тест ногоон бол
   piemath-app-д merge, прод deploy ХИЙХГҮЙ (эзнээс асууна; 18–24 цагт хэзээ ч).
4. 8 ДУУССАН (00:57). Prompt-ыг «Photomath» session (`local_17b00d58-37f5-4f09-ae07-2a5ad3c9d663`) руу илгээсэн, тэр
   session зөвшөөрөл хүлээж магадгүй (message_id 737c6b50) — ажиллаж эхэлсэн эсэхийг шалга, эхлээгүй бол дахин бүү илгээ, эзэнд хэл.
5. BakiPhone (UDID 00008120-001C783E3493C01E) руу release build суулгах:
   `flutter build ios --config-only --release` → `xcodebuild -workspace Runner.xcworkspace -scheme Runner -configuration Release
   -destination 'id=00008120-001C783E3493C01E' -derivedDataPath ../build/device -allowProvisioningUpdates DEVELOPMENT_TEAM=JF9FM583X6
   CODE_SIGN_ENTITLEMENTS=<хоосон plist>` → `xcrun devicectl device install app …`.
6. PROGRESS.md, PARITY.md шинэчил, push (`piemath-app`, `[skip render]`), эзэнд товч тайлан (10–15 мөр, монгол, орос үггүй).
