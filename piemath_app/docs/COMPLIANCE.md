# Дэлгүүрийн шаардлагын хяналт (App Store, Google Play)

Төлөв: 2026-11-03. Эх сурвалжийг тухайн өдөр шалгасан. ✅ = код/тохиргоонд хийгдсэн, `[Э]` = эзний данс, шийдвэр хэрэгтэй, `[lib]` = Dart кодын өөрчлөлт хэрэгтэй (§4). Дэлгүүрийн хуудас, скриншот, build-ийн заавар: STORE.md.

## 1. Apple App Store

| # | Шаардлага | Төлөв | Хаана |
|---|---|---|---|
| 1.1 | Нууцлалын манифест `PrivacyInfo.xcprivacy`: tracking=false, tracking домэйн үгүй, цуглуулах өгөгдөл, required-reason API (UserDefaults `CA92.1`, FileTimestamp `C617.1`) | ✅ | `ios/Runner/PrivacyInfo.xcprivacy` (Copy Bundle Resources-д) |
| 1.2 | Залгаасуудын манифест: firebase_messaging, google_sign_in, image_picker, mobile_scanner, url_launcher, connectivity_plus, secure_storage, shared_preferences, path_provider өөрсдийнхтэй. pdfx, flutter_image_compress, sign_in_with_apple-ийн iOS кодод required-reason API байхгүй | ✅ | pub-cache шалгасан |
| 1.3 | Sign in with Apple (4.8): Google-тэй зэрэг. Entitlement `com.apple.developer.applesignin` одоо `CODE_SIGN_ENTITLEMENTS`-ээр Runner-т холбогдсон (өмнө нь холбогдоогүй байсан) | ✅ / `[Э]` | `Runner.entitlements`, `project.pbxproj`. [Э] App ID-д «Sign in with Apple», «Push Notifications» capability асаах |
| 1.4 | Google нэвтрэлт iOS: `CFBundleURLTypes`-д reversed client ID (байхгүй бол товч дарахад апп унана, 2.1-ээр татгалзана) | ✅ / `[Э]` | `Info.plist` → `$(GOOGLE_REVERSED_CLIENT_ID)`. [Э] `ios/Flutter/GoogleSignIn.xcconfig` үүсгэж `GOOGLE_REVERSED_CLIENT_ID = com.googleusercontent.apps.…` бичих, `--dart-define=GOOGLE_IOS_CLIENT_ID` мөн адил client |
| 1.5 | Экспортын шифрлэлт: `ITSAppUsesNonExemptEncryption = false` (зөвхөн HTTPS) | ✅ | `Info.plist` |
| 1.6 | Зөвшөөрлийн бичвэр монголоор, үнэн: камер (даалгаврын зураг, QR), зургийн сан (дэвтрийн зураг сонгох). Микрофон, байршил, контакт, ATT **байхгүй** | ✅ | `Info.plist` |
| 1.7 | App Tracking Transparency: tracking, реклам, IDFA байхгүй → `NSUserTrackingUsageDescription` нэмэхгүй | ✅ | |
| 1.8 | Апп дотор данс устгах (5.1.1(v)): Профайл → доод талын «Бүртгэл устгах хүсэлт» → `/app/profile/deletion-request` → баталгаажуулах. Хүсэлтийг админ шалгаж устгана | ✅ | `lib/features/auth/ui/profile_screen.dart`, `deletion_request_screen.dart` |
| 1.9 | Дижитал агуулгыг апп-аас гадуур худалдах руу чиглүүлэхгүй (3.1.1). Монголын дэлгүүрт гадаад холбоосны үл хамаарал **байхгүй** (зөвхөн АНУ) | ❌ `[lib]` | Номын «Эрх нээх → Вэбээр нээх» нь үнэтэй эрх зардаг вэб хуудас руу хөтөлдөг (§4.1) |
| 1.10 | Сургалтын төлбөр (биечлэн хичээл) банкны дансаар: апп-аас гадуурх үйлчилгээ (3.1.3(e)) тул IAP шаардахгүй | ✅ | `pay_info_card.dart`. Review тэмдэглэлд тайлбарлана (§3) |
| 1.11 | Насны ангилал: шинэ асуулга (2026-01-31-ээс заавал). Хүчирхийлэл, бэлгийн агуулга, мөрийтэй тоглоом, хэрэглэгч хоорондын чат, шүүлтүүргүй хөтөч **үгүй** | `[Э]` | App Store Connect → App Information |
| 1.12 | Ангилал: Education. **Kids ангилал биш** (1.3, 5.1.4: Kids бол гуравдагч анализ, зар бүрэн хориотой, эцэг эхийн хаалт заавал). Насанд хүрээгүй хэрэглэгчийн өгөгдлийг зөвхөн үйлчилгээнд ашиглана | `[Э]` | |
| 1.13 | App Privacy хариулт `PrivacyInfo.xcprivacy`-тэй таарах: Name, Phone, Email (Google/Apple нэвтрэлт), User ID, Device ID (push токен), Photos, Other User Content (даалгавар), Purchase History (төлбөрийн төлөв), Other Data (дүн, ирц). Бүгд «Linked», «App Functionality», tracking үгүй | `[Э]` | STORE.md §5.2 |
| 1.14 | Xcode 26 / iOS 26 SDK-ээр build (2026-04-28-аас). Доод iOS 15 (≥13 шаардлага) | ✅ / `[Э]` | `IPHONEOS_DEPLOYMENT_TARGET = 15.0` |
| 1.15 | Push: `aps-environment` = development; App Store-д export хийхэд Xcode provisioning profile-оор production болгоно | ✅ | |
| 1.16 | Universal Links (`/q/<код>`): заавал биш. Хийх бол [Э] App ID-д Associated Domains + вэбд `apple-app-site-association` | `[Э]` сонголт | §2.10 |
| 1.18 | iOS build (Swift Package Manager): `firebase_messaging 17` (Firebase iOS 13, gtm-session-fetcher ≥4) ба `google_sign_in_ios 6.3.8` (GoogleSignIn 9, gtm-session-fetcher <4) зөрчилдөж **iOS build огт гарахгүй** байсан. `firebase_core ^4.15.2`, `firebase_messaging ^16.7.1` (Firebase iOS 12) болгож шийдэв; Dart API өөрчлөгдөөгүй, `analyze` 0. `google_sign_in_ios` GoogleSignIn 10-ийг дэмжвэл Firebase-ийг буцааж шинэчилнэ. `Package.resolved` commit хийсэн | ✅ | `pubspec.yaml`, `ios/**/swiftpm/Package.resolved`. `flutter build ios --debug --no-codesign` амжилттай |
| 1.17 | Нууцлалын бодлогын URL апп дотор ба дэлгүүрт | ✅ / `[Э]` | `consent_screen.dart`, `/privacy`; [Э] нийтийн URL батлах |

## 2. Google Play

| # | Шаардлага | Төлөв | Хаана |
|---|---|---|---|
| 2.1 | Target API 36 (2026-08-31-ээс шинэ апп, шинэчлэлд заавал), compileSdk 36 | ✅ | `build.gradle.kts` `maxOf(36, flutter…)`, merged manifest `targetSdkVersion=36` |
| 2.2 | 64-бит: arm64-v8a, x86_64 (+ armeabi-v7a) | ✅ | APK-уудад шалгасан |
| 2.3 | 16 KB хуудас (шинэчлэлд 2027-02-01-ээс заавал): бүх `.so` LOAD align ≥ 2**14, `zipalign -c -P 16` амжилттай. AGP 9.1, NDK r28 | ✅ | `libflutter`, `libapp` 2**16; `libdartjni`, `libdatastore_shared_counter`, `libimage_processing_util_jni`, `libsurface_util_jni` 2**14 |
| 2.4 | Predictive back: `android:enableOnBackInvokedCallback="true"` (API 36-д өгөгдмөл). Flutter `PopScope` (`onPopInvokedWithResult`) ашиглаж байгаа, хуучин `WillPopScope` үгүй | ✅ | `AndroidManifest.xml` |
| 2.5 | Зөвшөөрөл хамгийн бага: INTERNET, CAMERA, POST_NOTIFICATIONS, ACCESS_NETWORK_STATE, WAKE_LOCK, c2dm RECEIVE (FCM), DETECT_SCREEN_CAPTURE/RECORDING. Медиа (READ_MEDIA_*, READ/WRITE_EXTERNAL_STORAGE), биометр, AD_ID-г `tools:node="remove"`-оор хассан | ✅ | `AndroidManifest.xml` |
| 2.6 | Зураг сонгох: image_picker → Android Photo Picker, өргөн медиа зөвшөөрөлгүй (Photo and Video Permissions бодлого) | ✅ | |
| 2.7 | `POST_NOTIFICATIONS` (Android 13+) ажиллах үед асуух: `FirebaseMessaging.requestPermission()` нэвтэрсний дараа | ✅ | `lib/features/push/push_service.dart` |
| 2.8 | Foreground service, exact alarm (`SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`), full-screen intent **байхгүй** → Play-ийн мэдүүлэг шаардахгүй | ✅ | merged manifest шалгасан |
| 2.9 | Нөөцлөлт: `allowBackup=false`, `dataExtractionRules` (Android 12+ үүл, төхөөрөмж шилжүүлэлт) бүгдийг хассан. Токен нөөцөнд орохгүй | ✅ | `data_extraction_rules.xml` |
| 2.10 | App Links `/q/`: `autoVerify="true"`. [Э] вэбд `https://pimath.mn/.well-known/assetlinks.json` (одоо байхгүй) байрлуулна: `package_name: mn.piemath.app`, `sha256_cert_fingerprints`: **Play App Signing**-ийн түлхүүр (Play Console → App integrity), upload key биш. Шалгах: `adb shell pm get-app-links mn.piemath.app` | `[Э]` | |
| 2.11 | Edge-to-edge (API 35+ албадна, API 36-д opt-out үгүй). Native тал: `windowOptOutEdgeToEdgeEnforcement` хэрэглээгүй. Flutter давхаргын inset-ийн засвар | ✅ / `[lib]` | §4.3 |
| 2.12 | Том дэлгэц (sw600dp+, API 36): чиглэл, хэмжээ түгжихгүй. Манифестэд `screenOrientation` үгүй | ✅ | |
| 2.13 | Release: R8 minify + shrinkResources, Dart `--obfuscate --split-debug-info`, нативын symbol (`debugSymbolLevel = SYMBOL_TABLE`) AAB-д | ✅ | `build.gradle.kts`, STORE.md §2 |
| 2.14 | ABI хуваалт: AAB-ийг Play хуваана; шууд APK `--split-per-abi` | ✅ | |
| 2.15 | Гарын үсэг: upload key + Play App Signing. Түлхүүрийг репод хийхгүй | `[Э]` | `key.properties.example` |
| 2.16 | Данс устгах: апп доторх зам (§1.8) ✅. **Вэб холбоос** заавал (Data safety-д оруулна): вэбд одоо **байхгүй** | `[Э]` / вэб | `pimath.mn` дээр «Бүртгэл устгах хүсэлт» хуудас (утас + нэр, апп суулгахгүйгээр) |
| 2.17 | Data safety маягт | `[Э]` | §2.1 доор |
| 2.18 | Payments бодлого: дижитал агуулгыг Play Billing-ээс өөр төлбөр рүү чиглүүлэхгүй | ❌ `[lib]` | §4.1 (Apple 1.9-тэй ижил) |
| 2.19 | Families бодлого: зорилтот нас | `[Э]` | §2.2 доор |
| 2.20 | Шинэ хувь хүний данс бол 12 тестер × 14 хоногийн хаалттай туршилт. Байгууллагын данс бол үгүй | `[Э]` | STORE.md §7.1 |

### 2.1 Data safety хариулт (ноорог)

- Цуглуулдаг, **хуваалцдаггүй** (Firebase бол боловсруулагч, «sharing» биш). Дамжуулалт шифрлэгдсэн (HTTPS). Устгах хүсэлт гаргах боломжтой (апп + вэб URL).
- Personal info: Name, Email address (Google/Apple нэвтрэлт), Phone number, User IDs. Зорилго: App functionality, Account management. Заавал.
- Photos: гэрийн даалгаврын зураг. App functionality. Сонголтоор.
- App activity / Other user-generated content: даалгавар, шалгалтын хариу. App functionality.
- Financial info / Purchase history: сургалтын төлбөрийн төлөв (картын дугаар **үгүй**). App functionality.
- Device or other IDs: FCM токен. App functionality (мэдэгдэл).
- Байршил, контакт, аудио, вэб түүх, crash/анализ: **үгүй**. Реклам ID: **үгүй**.

### 2.2 Families (Play) ба насанд хүрээгүй хэрэглэгч

- Сурагчид 10-18 насны. Target audience-д 13-аас доош нас сонговол Families бодлого (зар үгүй/сертификатжсан сан, өгөгдөл хамгийн бага, Teacher Approved биш ч хамаарна) үйлчилнэ. Апп зар, анализ, AD_ID ашигладаггүй тул хүнд биш. Firebase Messaging нь Families-д зөвшөөрөгдсөн боловч хамгийн бага өгөгдөлтэй байх ёстой.
- Санал: [Э] «13-15, 16-17, 18+» сонгож, 13-аас доош сурагч эцэг эхийн дансаар орно. Эсвэл 13-аас доош сонгож Families-ийн бүх шаардлагыг хүлээн зөвшөөрнө. Аль ч тохиолдолд нууцлалын бодлогод насанд хүрээгүй хүний өгөгдлийг хэрхэн хамгаалдгийг бичнэ.
- Apple: Kids ангилал сонгохгүй, насны үнэлгээ асуулгын үр дүнгээр.

## 3. Review тэмдэглэл (хуулж оруулах)

App Store Connect → App Review Information → Notes, Play Console → App access:

```
Piemath бол "Шинэ ирээдүйн эзэд" сургалтын төвийн сурагч, эцэг эх, багшид зориулсан апп.
Данс зөвхөн сургалтын төвд бүртгүүлэхэд үүснэ; апп дотор бүртгүүлэх, худалдан авах үйлдэл байхгүй.

Туршилтын данс (сурагч):  утас: <ЭЗЭН_БӨГЛӨНӨ>  нууц үг: <ЭЗЭН_БӨГЛӨНӨ>
Туршилтын данс (эцэг эх): утас: <ЭЗЭН_БӨГЛӨНӨ>  нууц үг: <ЭЗЭН_БӨГЛӨНӨ>
Нэвтрэх: "Утасны дугаар" талбарт утсаа, дараа нь нууц үгээ оруулна.

- Төлбөр: апп нь биечлэн явагдах хичээлийн сургалтын төлбөрийн ТӨЛӨВ, төвийн банкны дансыг
  харуулна (Guideline 3.1.3(e): апп-аас гадуур хэрэглэгдэх үйлчилгээ). Апп дотор төлбөр авахгүй,
  дижитал агуулга худалддаггүй.
- Бүртгэл: апп дотор бүртгүүлж болно (сурагч, худалдан авагч, эцэг эх, багш). Нөхцөл, нууцлалын бодлого апп дотор.
- Данс устгах: Профайл > "Бүртгэл устгах хүсэлт" > илгээх.
- Sign in with Apple, Google нэвтрэлт нь төвд бүртгэлтэй дансыг холбоно.
- Камер: гэрийн даалгаврын зураг авах, номын QR уншуулах. Шалгалтын үед дэлгэц бичлэгийг илрүүлж
  агуулгыг нууна (шалгалтын шударга байдал).
- Реклам, tracking байхгүй.
```

Дүрэм: бодит сурагчийн мэдээлэл өгөхгүй. Туршилтын дансыг **тусдаа хуулбар сан биш, прод дээрх тусгай review данс** болгох эсэхийг [Э] шийднэ (прод дээр QA анги, хүүхэд үүсгэхгүй дүрэм бий; review дансыг харагдахгүй ангид байрлуулах). Тэмдэглэлд нууц үг бүү хадгал, зөвхөн Console-д бөглө.

## 4. Dart (`lib/`) өөрчлөлтийн хүсэлт

Энэ ажил `lib/`-д хүрээгүй. Эзэмшигч агент дараахыг хийнэ:

### 4.1 Дижитал эрхийн худалдаа руу чиглүүлэхийг авах (ЗААВАЛ, Apple 3.1.1, Play Payments)

Вэбийн `/books/<код>` (`web/src/components/books/UnlockPanel.tsx`) үнэтэй «эрх» зардаг. Апп-аас тийш хөтлөх нь татгалзах шалтгаан.

- `lib/features/books/ui/books_common.dart`: `accessNoteText`-ээс «вэб эсвэл» хасаж, жишээ нь `'Номын бүх тест, зөв хариу, бодолт, видео тайлбарыг эрхтэй сурагчид үзнэ. Эрхийг сургалтын төв олгоно.'`. `AccessNoteCard`, `showAccessSheet`-ийн «Вэбээр нээх» `OutlinedButton`-ыг авах (iOS, Android хоёуланд). Гарчиг «Эрх нээх» → «Эрхийн тухай».
- `lib/features/books/ui/try_test_screen.dart:138`, `placement_screen.dart:82`: `/books/…`, `/placement` руу «Вэбээр нээх» товч эрх худалдах хуудас руу хөтөлж байвал авах (үнэгүй агуулга бол үлдэж болно, үнэ харагдахгүй байх ёстой).
- `lib/app/shell/pending_screen.dart`: «Вэбээр нээх» нь зөвхөн үнэгүй, худалдаагүй хуудас руу байхыг шалгах.
- Тест: `test/`-д «Вэбээр нээх» номын дэлгэцэд байхгүйг шалгах widget тест.

### 4.2 iOS-д Apple нэвтрэлтгүйгээр Google харуулахгүй (4.8)

`lib/features/auth/ui/native_sign_in_section.dart:122`: iOS дээр `showGoogle`-ийг `showApple`-тай хамт л үнэн болгох (`Platform.isIOS && !showApple` бол Google нуух). Сервер Apple-ийг идэвхгүй гэж хариулсан тохиолдолд (`_hidden`) ч хамаарна.

### 4.3 Edge-to-edge inset (Android 15+/16)

- `lib/app/app.dart` (эсвэл `main.dart`): `SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge)` ба `SystemUiOverlayStyle(systemNavigationBarColor: Colors.transparent, systemNavigationBarContrastEnforced: false, statusBarColor: Colors.transparent)`, цайвар/харанхуй горимд icon brightness-ийг `AppBarTheme.systemOverlayStyle`-оор.
- `showModalBottomSheet(isScrollControlled: true)` 10 газар: `useSafeArea: true` эсвэл агуулгыг `SafeArea(top: false)`-аар ороох (доод товч gesture bar-ын ард орохгүй).
- Scaffold-гүй бүтэн дэлгэц (QR скан, PDF харах): доод удирдлагад `MediaQuery.paddingOf(context).bottom`.
- Шалгах: Android 16 эмулятор, 3 товчтой болон gesture навигаци.

### 4.4 Predictive back (сонголт, сайжруулалт)

`ThemeData.pageTransitionsTheme`: `TargetPlatform.android: PredictiveBackPageTransitionsBuilder()`. Шалгалтын дэлгэцийн `PopScope(canPop: false)` хэвээр ажиллахыг Android 16 дээр шалгах.

### 4.5 Бусад

- Release-д `debugPrint` дуудлага (8 газар) хувийн мэдээлэл хэвлэхгүй байхыг шалгах (SECURITY.md §3).

## 5. Эх сурвалж (2026-11-03-нд шалгасан)

- Target API: https://developer.android.com/google/play/requirements/target-sdk
- 16 KB: https://developer.android.com/guide/practices/page-sizes
- Android 16 өөрчлөлт (edge-to-edge, predictive back, том дэлгэц): https://developer.android.com/about/versions/16/behavior-changes-16
- Play данс устгах: https://support.google.com/googleplay/android-developer/answer/13327111
- Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Play Photo/Video permissions: https://support.google.com/googleplay/android-developer/answer/14115180
- Play Families: https://support.google.com/googleplay/android-developer/answer/9893335
- Play Payments: https://support.google.com/googleplay/android-developer/answer/9858738
- Apple шаардлагууд (Xcode 26, насны асуулга, iOS 13+): https://developer.apple.com/news/upcoming-requirements/
- Apple App Review Guidelines (3.1.1, 3.1.3, 4.8, 5.1.1(v), 1.3): https://developer.apple.com/app-store/review/guidelines/
- Privacy manifest: https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
- Required-reason API: https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
- Export compliance: https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations
- App Links verify: https://developer.android.com/training/app-links/verify-android-applinks
