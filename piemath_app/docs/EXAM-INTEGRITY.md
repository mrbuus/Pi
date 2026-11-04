# Шалгалтын бүрэн бүтэн байдал (эзний хүсэлт 2026-11-01)

Зорилго: шалгалт эхэлснээс илгээх хүртэл **скриншот, дэлгэц бичлэг хийх боломжгүй** (эсвэл илэрнэ),
**апп-аас гарвал анхааруулга** гарч, багшид бүртгэгдэнэ. Хүүхдийг айлгахгүй, шударга байдлыг тайлбарлана.

## 1. Платформын бодит боломж (шударга хэлэх)

| | Android | iOS |
|---|---|---|
| Скриншот хориглох | **Тийм** — `WindowManager.LayoutParams.FLAG_SECURE` (дэлгэц бичлэг, recent apps preview-д хар) | **Хориглох API байхгүй.** Илрүүлнэ: `UIApplication.userDidTakeScreenshotNotification` (дараа нь мэдэгддэг) |
| Дэлгэц бичлэг | `FLAG_SECURE` хамгаална | `UIScreen.isCaptured` / `capturedDidChangeNotification` → агуулгыг нууж (blur) анхааруулна |
| Скриншотод агуулга харагдахгүй болгох | `FLAG_SECURE` | Аргачлал: агуулгыг `isSecureTextEntry=true` `UITextField`-ийн доторх layer-т байрлуулах (скриншотод хоосон). Албан бус, iOS шинэчлэлтэд эвдэрч болно — тест, fallback заавал |
| Апп-аас гарах | `AppLifecycleState.paused/hidden` | мөн адил |
| Апп-д түгжих | Screen pinning `startLockTask()` — хэрэглэгч зөвшөөрнө | **Automatic Assessment Configuration** (`AEAssessmentSession`, iOS 13.4+): скриншот, мэдэгдэл, апп солих бүгд хаагдана. Apple-аас **entitlement хүсэлт** гаргана [Э] |

## 2. Хэрэгжүүлэлт

`lib/core/integrity/`:

```dart
abstract class ExamGuard {
  Future<void> enter();   // шалгалт эхлэхэд
  Future<void> exit();    // илгээсэн / гарсан үед ЗААВАЛ (finally)
  Stream<IntegrityEvent> get events; // screenshot, recordingStarted, recordingStopped, backgrounded, resumed
}
```

- Android: platform channel → `FLAG_SECURE` set/clear. (Бэлэн сан ашиглавал эх кодыг нь шалга, жижиг байх.)
- iOS: screenshot/captured notification → event; бичлэг идэвхтэй үед агуулгын оронд «Дэлгэц бичлэгийг зогсооно уу» самбар.
- `exit()` нь `dispose`, алдаа, хугацаа дуусах бүх замд дуудагдана — шалгалт дууссаны дараа скриншот хориотой хэвээр үлдэх ёсгүй.

## 3. Апп-аас гарах үед

1. `paused/hidden` → цаг тэмдэглэнэ, `leaveCount++`, `events`-д `{t, type:'leave'}`.
2. Буцаж ирэхэд: бүтэн дэлгэцийн анхааруулга — «Шалгалтын үеэр аппаас гарсан нь багшид харагдана» (айлгах биш, тайлбарлах),
   хэдэн удаа гарсан, хэр удсан. «Үргэлжлүүлэх» товч.
3. Дараагийн autosave (`PATCH /tests/:id/session`) `leaveCount`, `events`-ийг илгээнэ — сервер аль хэдийн хадгалдаг
   (`TestAttemptSession.leaveCount`, `events` сүүлийн 100). Скриншот/бичлэгийн шинэ төрөл нэмэх бол [A]: DTO-ийн зөвшөөрөгдсөн
   `type` жагсаалтыг өргөтгөж, багшийн дүнгийн хуудсанд харуулна.
4. Утасны дуудлага, системийн диалог (`inactive`) нь «гарсан» биш — зөвхөн `paused/hidden`-ийг тоол.
5. Push мэдэгдэл шалгалтын үед апп дотор харуулахгүй.

## 4. Хориглох зүйл

- Хариуны түлхүүр, зөв хариуг апп-д хадгалахгүй (сервер илгээдэггүй — хадгалах ч хэрэггүй).
- Хугацааг утасны цагаар шийдэхгүй — серверийн `deadlineAt`, `remainingSec`.
- Root/jailbreak илрүүлэх нь хүүхдийг хориглох шалтгаан биш — зөвхөн үйл явдал болгон бүртгэ (эзэн шийдэх).

## 5. Тест

- `ExamGuard`-ийн fake-ээр: enter/exit бүх замд дуудагдах, leave тоолох, autosave-д дамжих.
- Android instrumented тест (боломжтой бол): `FLAG_SECURE` идэвхтэй.
