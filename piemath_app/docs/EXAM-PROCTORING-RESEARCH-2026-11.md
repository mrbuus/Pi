# Шалгалтын хяналтын судалгаа (EnglishScore маягийн), 2026-11-16

Зорилго: Pimath апп (Flutter, `mn.piemath.app`) дотор цагтай шалгалтын үед «аппаас гарч болохгүй», «ойр орчимд чанга дуу гарвал мэдэх» хяналтыг App Store / Google Play-ийн шалгалтыг асуудалгүй давах хэмжээнд хэрхэн хийх вэ.
Энэ баримт зөвхөн судалгаа, код өөрчлөөгүй. Эх сурвалж бүр 9-р хэсэгт, текст дотор `[Эх N]` гэж заасан.
«Баталгаагүй» гэж тэмдэглэсэн зүйлийг албан баримтаас шалгаж чадаагүй.

## 1. Товч дүгнэлт

1. EnglishScore-ийн хяналт нь гурван тулгуур: урд камераар нүүр илрүүлж, санамсаргүй үед зураг авах; дэлгэцийн зураг, бичлэг, хуулах хориглох; аппыг хаавал оноо нөлөөлөх эсвэл тест цуцлагдах, гэрчилгээний зургийг хүн шалгах [Эх 1, 2, 3].
2. EnglishScore-ийн нийтэд нээлттэй баримтаас микрофоноор чимээ хэмждэг тухай олдсонгүй. «Чимээгүй газар, ганцаараа» гэдэг нь дүрэм, техникийн хяналт биш байх магадлалтай (баталгаагүй) [Эх 1, 3, 4].
3. iOS дээр «аппаас огт гарч болохгүй» болгох нийтийн хэрэглэгчид зориулсан цорын ганц зам бол Automatic Assessment Configuration (`AEAssessmentSession`, iOS 13.4+) бөгөөд Apple-ээс тусгай entitlement хүсэж авах шаардлагатай [Эх 10, 11, 13].
4. Guided Access-ийг аппаас асаах (`requestGuidedAccessSession`) нь зөвхөн MDM-ээр удирддаг (supervised) төхөөрөмжид ажиллана, сурагчийн хувийн утсанд хэрэглэх боломжгүй [Эх 15].
5. Android дээр device owner биш аппын `startLockTask()` нь screen pinning болж, хэрэглэгч зөвшөөрнө, хүссэн үедээ гарч чадна [Эх 20].
6. Манайд аль хэдийн байгаа: Android `FLAG_SECURE`, Android 14+ скриншот, 15+ бичлэгийн callback, iOS скриншот/бичлэг илрүүлэлт, гарсныг тоолох (2 сек шүүлттэй), 3 дахь удаад автоматаар илгээх, бичлэгийн үед агуулга нуух (6-р хэсэг).
7. Олдсон цоорхой: апп скриншот, бичлэгийн үйл явдлыг серверт ИЛГЭЭДЭГГҮЙ (зөвхөн LEAVE/RETURN), тиймээс багшийн «Скриншот», «Бичлэг» багана апп-аас үргэлж 0 байна (6.4).
8. Дэлгүүрт хамгийн эрсдэлтэй зүйл: микрофон, камерыг шалгалтын үед ашиглахдаа тодорхой зөвшөөрөл, purpose string, байнгын харагдах тэмдэг (2.5.14, 5.1.1), Play-ийн Prominent Disclosure, мөн насанд хүрээгүй хэрэглэгч.
9. Санал: А шат (зөвшөөрөлгүй, бараг бэлэн, цоорхойг нөхөх) одоо; Б шат (микрофоны түвшин, бичлэггүй, зөвхөн тоо илгээх) эзний шийдвэрээр, сонголттой; В шат (AAC entitlement хүсэх) зэрэгцээгээр хүсэлт гаргаад хүлээх.
10. Камер, нүүр илрүүлэлт, дуу/зураг серверт илгээх хувилбарыг санал болгохгүй: манай дүрэм (AI-гүй, медиа илгээхгүй) болон 15–18 насны хэрэглэгчийн эрсдэлтэй зөрчилдөнө.

## 2. EnglishScore ба ижил аппууд

### 2.1 EnglishScore (British Council)

| Механизм | Олдсон баримт | Эх |
|---|---|---|
| Камер, нүүр | «face monitoring technology through your smartphone's selfie camera»; бүтэн нүүр камерт харагдах, ганцаараа, чимээгүй газар байх ёстой | [Эх 3] |
| Зураг | Тестийн үеэр санамсаргүй үед зураг авна, гэрчилгээнд тавина; зөрчил илэрвэл нүүр тод харагдах хүртэл тест түр зогсоно | [Эх 1, 4] |
| AI хяналт | Хүрээнд нэмэлт хүн, сурагч хүрээнээс гарах, гаднын тусламжийн шинжийг AI тэмдэглэнэ | [Эх 2] |
| Дэлгэц | Скриншот, дэлгэц бичлэг, хуулж буулгах (copy-paste) тестийн туршид хаалттай | [Эх 2, 4] |
| Аппаас гарах | «You can't pause the test», «You can't exit the app. If you close the app, it can affect your score or cancel your test»; хэт удаан гарвал асуулт алгасагдах эсвэл тест бүхэлдээ цуцлагдана | [Эх 4, 5] |
| Микрофон, чимээ | Олдсонгүй. Ярианы тестэд микрофон ашигладаг ч чимээ хэмжиж зөрчил тоолдог тухай нийтийн баримт байхгүй | [Эх 3, 4] |
| Зөрчлийн тоо | Тодорхой тоо (жишээ нь 3 удаа) олдсонгүй | - |
| Хүний хяналт | Мэргэжлийн гэрчилгээ худалдан авбал зургийг аюулгүй байдлын баг шалгаж гэрчилгээнд тавина; гэрчилгээ бүрийг 1 ажлын өдөрт хүн шалгана | [Эх 2, 4] |
| Verified нөхцөл | Test security асаалттай байх ёстой; гэрчилгээ нь усан тэмдэгтэй, нууц үгтэй PDF, давтагдашгүй ID-аар ажил олгогч шалгана | [Эх 2, 3, 4] |
| Нэг төхөөрөмж | 3.14.1 хувилбараас нэг зэрэг нэг л төхөөрөмж дээр тест өгнө | [Эх 3] |
| Нууцлалын бодлого | «audio, video, image and other sensor information» гэсэн ерөнхий ангилал; хадгалах хугацаа тодорхойгүй; «We do not collect information about children» | [Эх 6] |
| Privacy label (App Store) | Зөвхөн имэйл, дэмжлэгийн контент, хэрэглээ, crash. Зураг, дуу label-д харагдахгүй байсан (энэ нь зураг серверт очдог гэсэн [Эх 4]-тэй зөрж байгаа мэт, шалтгаан тодорхойгүй) | [Эх 3] |
| Насны ангилал | App Store-д 4+ | [Эх 3] |

Хэрэглэгчийн сэтгэгдэл: App Store-д нэг хэрэглэгч нүүр тод байсан ч тест түр зогсоод, зогсолт удсан гээд цуцлагдсан гэж бичсэн (ганц хүний мэдээлэл) [Эх 5]. Тусламжийн төвийн хуудсууд (support.englishscore.com) 403 буцаасан тул шууд уншиж чадаагүй, хайлтын товчлолоос л авав.

Дүгнэлт: EnglishScore iOS дээр AAC ашигладаг эсэх олдсонгүй. «Аппаас гарч болохгүй» гэдэг нь техникийн түгжээ биш, харин «гарвал цуцлагдана» гэсэн дүрэм + илрүүлэлт байх магадлалтай (баталгаагүй).

### 2.2 Ижил төрлийн аппууд (товч)

| Апп | Хяналт | Эх |
|---|---|---|
| Duolingo English Test | Хүний proctor тест бүрийг өдөр бүр хянаж, дүрэм зөрчсөн бол хүчингүй болгоно; бүтэн дэлгэц, цонхноос гарахгүй, нүдээ дэлгэцээс холдуулахгүй, чихэвч хориотой; камер, микрофоны бичлэгийг автомат + хүн шалгана (сүүлийнх нь гуравдагч эх сурвалж) | [Эх 7, 8] |
| Ерөнхий proctoring (Talview, TestReach) | Чимээгүй орчин, «suspicious noise or background chatter» тэмдэглэх; микрофоны шалгалт | [Эх 9] |

Ялгаа: эдгээр нь камер, микрофоны бичлэгийг СЕРВЕРТ илгээж хүн/AI хянадаг. Манай дүрэмд энэ загвар тохирохгүй.

## 3. iOS боломж

Манай iOS deployment target: 15.0 (`ios/Runner.xcodeproj/project.pbxproj:369`).

| Боломж | API | Зөвшөөрөл / entitlement | Хувилбар | Дэлгүүрийн эрсдэл |
|---|---|---|---|---|
| Бүрэн түгжих (single-app mode) | `AEAssessmentSession`, `AEAssessmentConfiguration`, `AEAssessmentSessionDelegate` | `com.apple.developer.automatic-assessment-configuration` entitlement, Apple-ээс хүсэлтээр [Эх 10, 13] | iOS/iPadOS 13.4+ [Эх 11] | Бага (Apple-ийн албан зам), гэхдээ хүсэлт удаан эсвэл хариугүй байж болно [Эх 14] |
| Guided Access аппаас асаах | `UIAccessibility.requestGuidedAccessSession(enabled:completionHandler:)` | Зөвхөн MDM-ээр supervised төхөөрөмж, апп нь MDM-ээр зөвшөөрөгдсөн байх [Эх 15] | iOS 7+ | Хувийн утсанд ажиллахгүй, хэрэглэх боломжгүй |
| Guided Access-ийг хэрэглэгч гараар асаах | Тохиргоо, гурван удаа хажуугийн товч; апп зөвхөн төлөвийг уншина (`UIAccessibility.isGuidedAccessEnabled`) [Эх 24] | Үгүй | - | Үгүй; гэхдээ сурагч өөрөө асааж, өөрөө унтраана, хүчээр биш |
| Background руу гарсныг мэдэх | Flutter `AppLifecycleListener` (`paused`/`hidden`) | Үгүй | - | Үгүй |
| Скриншот илрүүлэх | `UIApplication.userDidTakeScreenshotNotification`, авсны ДАРАА ирнэ [Эх 16] | Үгүй | iOS 7+ | Үгүй |
| Дэлгэц бичлэг, mirroring илрүүлэх | `UIScreen.isCaptured`, `capturedDidChangeNotification` [Эх 17]; шинэ: `UITraitCollection.sceneCaptureState` [Эх 18] | Үгүй | `isCaptured` iOS 11+, баримтад 27.0 хүртэл гэж тэмдэглэгдсэн (deprecated); `sceneCaptureState` iOS 17+ | Үгүй |
| Скриншотыг хориглох | Албан API байхгүй. AAC сесс л скриншот, бичлэгийг хаана [Эх 12]. `isSecureTextEntry` layer-ийн арга албан бус | AAC-гүйгээр байхгүй | - | Албан бус арга iOS шинэчлэлтэд эвдэрч болно |
| Мэдэгдэл, дуудлага | Тасалдал нь `inactive` болж ирнэ; AAC сесс Notification Center-ийг хаана (macOS жагсаалтад тодорхой, iOS-д «certain hardware buttons» гэж ерөнхий) [Эх 10, 12] | AAC-гүйгээр хаах боломжгүй | - | 2.5.9: стандарт товчийг өөрчлөх, хаахыг хориглоно [Эх 26] |
| Клипборд | AAC сесс эхлэх, дуусахад pasteboard-ийг цэвэрлэнэ [Эх 10] | AAC | - | - |
| Гуравдагч гар (keyboard) | `application(_:shouldAllowExtensionPointIdentifier:)`-ээр хаах; AAC үүнийг өөрөө хаадаггүй [Эх 12] | Үгүй | - | Үгүй |
| Split View / Slide Over (iPad) | Апп `inactive` болох магадлалтай (баталгаагүй, шалгах) | - | - | - |
| Микрофоны түвшин | `AVAudioRecorder` `isMeteringEnabled` + `updateMeters()` + `averagePower(forChannel:)` [Эх 19], эсвэл аудио урсгалаас RMS тооцох | `NSMicrophoneUsageDescription` заавал [Эх 23], ажиллах үед хэрэглэгчийн зөвшөөрөл | iOS 3+ | Дунд: улбар шар цэг (orange dot) статусын мөрөнд харагдана [Эх 25, гуравдагч]; 2.5.14 тодорхой зөвшөөрөл, тэмдэг шаардана [Эх 26] |
| Камер, нүүр | AVFoundation / Vision | `NSCameraUsageDescription` (манайд байгаа ч зорилго нь гэрийн даалгавар, QR) | - | Өндөр: 15–18 насны хүүхдийн нүүр, байнгын камер; purpose string-ийг өөрчлөх, 5.1.1, 2.5.14 |

### 3.1 AAC-ийн дэлгэрэнгүй

- Сесс эхлэхэд iOS/iPadOS «automatically restricts usage to just that specific app», мөн «certain hardware buttons, screen recording and screenshots, remote observation with Classroom, and dictionary definition lookup»-ийг унтраана [Эх 12].
- Тохируулж болох (анхдагчаар унтарсан): autocorrect, spell check, predictive text, keyboard shortcuts, dictation, spoken content, password autofill, Handoff [Эх 12, Эх 11-ийн `allows...` шинжүүд].
- Context menu-ээс Share, Translate, Scan Text-ийг хасна; AutoFill, Lookup-ийг апп өөрөө `buildMenu(with:)`-ээр хасах хэрэгтэй [Эх 12].
- Нэг зэрэг системд НЭГ л сесс; `begin()` дараа `assessmentSessionDidBegin(_:)` ирсний дараа л шалгалтаа эхлүүлэх; `assessmentSession(_:wasInterruptedWithError:)` ирвэл агуулгыг нууж `end()` дуудах [Эх 13].
- Хүсэлт: «If you publish an educational app that delivers exams to students, you can request permission» — хүсэлтийн маягт `developer.apple.com/contact/request/automatic-assessment-configuration/` [Эх 10].
- Бодит туршлага: маягт «Unauthorized» руу шилжүүлсэн, 75 хоног хариу ирээгүй, Distribution profile-д entitlement орохгүй байсан гэсэн форумын мэдээлэл [Эх 14]. Хэн хэдэн хоногт олгодог нь албан баримтад олдсонгүй.
- Flutter-д AAC-ийн бэлэн pub багц олдсонгүй, platform channel-ээр өөрөө бичнэ (5-р хэсэг).

## 4. Android боломж

Манай targetSdk = 36 хүртэл (`android/app/build.gradle*:39`), minSdk = Flutter-ийн анхдагч.

| Боломж | API | Зөвшөөрөл | Хувилбар | Дэлгүүрийн эрсдэл |
|---|---|---|---|---|
| Бүрэн түгжих (lock task) | `DevicePolicyManager.setLockTaskPackages` + `Activity.startLockTask()` | Device owner (DPC) заавал; хувийн утсанд боломжгүй [Эх 20] | API 21+ | Хэрэглэх боломжгүй |
| Screen pinning | Allowlist-гүй аппын `startLockTask()` → «would put the activity into screen pinning mode»; хэрэглэгч «can exit the mode whenever they want» [Эх 20] | Үгүй; системийн баталгаажуулах цонх гарна | API 21+ | Бага; гэхдээ хамгаалалт сул (гарах заавар цонхонд бичигдсэн) |
| Түгжээний төлөв мэдэх | `ActivityManager.getLockTaskModeState()` (`LOCK_TASK_MODE_LOCKED` / pinned) [Эх 20] | Үгүй | API 23+ | Үгүй |
| Скриншот, бичлэгийг хар болгох | `WindowManager.LayoutParams.FLAG_SECURE` — «preventing it from appearing in screenshots or from being viewed on non-secure displays» [Эх 21] | Үгүй | API 1+ | Үгүй (Android баримт хэрэглэгчид асаах/унтраах тохиргоо өгөхийг зөвлөдөг [Эх 22]) |
| Скриншот илрүүлэх | `Activity.registerScreenCaptureCallback` — зөвхөн техник товчлуурын хослол; ADB-ээр авсныг илрүүлэхгүй; систем өөрөө toast харуулна [Эх 22] | `DETECT_SCREEN_CAPTURE` (install-time) | Android 14 (API 34)+ | Бага; системийн toast-ыг урьдчилан тайлбарлах хэрэгтэй |
| Дэлгэц бичлэг илрүүлэх | `WindowManager.addScreenRecordingCallback` — аппын цонх бичлэгт харагдах/үл харагдах шилжилт [Эх 27] | `DETECT_SCREEN_RECORDING` | Android 15 (API 35)+ | Бага; бичлэгийг апп эхлэхээс өмнө эхлүүлбэл тойрч болно гэсэн гуравдагч мэдээлэл [Эх 28] |
| Background руу гарах | Flutter `AppLifecycleListener` | Үгүй | - | Үгүй |
| Олон цонх, split-screen, PiP | `isInMultiWindowMode`, `onMultiWindowModeChanged` (албан хуудсыг бүтэн уншиж чадаагүй, нэр баталгаагүй). Android 10+ олон цонхонд хоёр апп хоёулаа resumed байж болох тул Flutter `paused` ирэхгүй байх магадлалтай (баталгаагүй, туршиж шалгах) | Үгүй | - | Үгүй |
| Overlay (бусад аппын хөвөгч цонх) | `Window.setHideOverlayWindows(boolean)` — «Prevent non-system overlay windows from being drawn on top of this window» [Эх 29]. Шаардах `HIDE_OVERLAY_WINDOWS` зөвшөөрөл, API түвшинг баталж чадаагүй | Баталгаагүй | Баталгаагүй (API 31 орчим гэж таамаг) | Шалгах |
| Микрофоны түвшин | `AudioRecord` / `MediaRecorder.getMaxAmplitude()` эсвэл Flutter багц | `RECORD_AUDIO` (ажиллах үед зөвшөөрөл) | - | Дунд: Android 12+ статус мөрөнд микрофоны тэмдэг гарна; хэрэглэгч Quick Settings-ээс бүх аппын микрофоныг унтраавал апп «silent audio» авна [Эх 30]; Play-ийн Prominent Disclosure [Эх 31] |

Анхаарах: микрофоныг Quick Settings-ээс унтраасан үед апп чимээгүй дуу авна [Эх 30] — «чимээгүй» гэж буруу дүгнэхгүйн тулд тэг түвшин удаан үргэлжилбэл «микрофон хаалттай байж магадгүй» гэж тэмдэглэх.

## 5. Дэлгүүрийн шаардлага ба татгалзах шалтгаан

### 5.1 App Store [Эх 26]

| Заалт | Агуулга (товч ишлэл) | Бидэнд хамаарах |
|---|---|---|
| 5.1.1 (i) | Нууцлалын бодлогын холбоос App Store Connect-д болон апп дотор | Шалгалтын хяналтын хэсгийг бодлогод нэмэх |
| 5.1.1 (ii) | Хэрэглэгчийн зөвшөөрөл; «Ensure your purpose strings clearly and completely describe your use of the data»; зөвшөөрлөө буцаах хялбар зам | Микрофоны purpose string-д «шалгалтын үеэр дууны түвшинг л хэмжинэ, бичихгүй, илгээхгүй» гэж тодорхой бичих |
| 5.1.1 (iii) | Зөвхөн үндсэн үйлдэлд хэрэгтэй өгөгдөл | Камер, нүүр хэрэггүй; микрофон зөвхөн шалгалтын үед |
| 5.1.1 (iv) | «not attempt to manipulate, trick, or force people to consent»; «provide alternative solutions for users who don't grant consent» | Микрофоноос татгалзсан сурагч шалгалтаа өгч чадах ёстой (зөвхөн тэмдэглэгээ) |
| 2.5.14 | «must request explicit user consent and provide a clear visual and/or audible indication when recording, logging, or otherwise making a record of user activity. This includes any use of the device camera, microphone, screen recordings...» | Шалгалтын үед дэлгэц дээр «Дууны түвшин хэмжиж байна» гэсэн байнгын тэмдэг; гарсныг тоолохыг ч эхэнд тайлбарлах |
| 2.5.4 | Background service-ийг зөвхөн зорилгоор нь | Микрофоныг background-д ажиллуулахгүй, `UIBackgroundModes audio` нэмэхгүй |
| 2.5.9 | Стандарт товч, системийн үйлдлийг өөрчлөх, хаахыг татгалзана | AAC-гүйгээр «гарахыг хаах» оролдлого хийхгүй |
| 5.1.2 (i) | Хувийн өгөгдлийг зөвшөөрөлгүй ашиглах, дамжуулахгүй; гуравдагч AI-д илгээхийг тодорхой хэлэх | Дуу, зураг илгээхгүй бол бага эрсдэл |
| 5.1.4, 1.3 | Хүүхдэд зориулсан апп: гуравдагч analytics, зар үгүй; Kids Category-д нэмэлт хязгаар | Манай апп Kids Category биш (баталгаажуулах); насны ангилал, бодлогод 15–18 нас дурдах |

Privacy Manifest: `PrivacyInfo.xcprivacy` нь цуглуулах өгөгдлийн төрөл, required reason API-ийг тэмдэглэнэ [Эх 32]. Манайд байгаа (`ios/Runner/PrivacyInfo.xcprivacy`), одоо 9 төрөл. Б шатанд зөвхөн тоо (зөрчлийн тоо/цаг) илгээвэл шинэ төрөл «Other Data Types / App Functionality» хангалттай байх магадлалтай; дуу илгээвэл «Audio Data» нэмэх шаардлагатай. App Store Connect-ийн Privacy Nutrition Label-ийг мөн адил шинэчлэх.

Нийтлэг татгалзах шалтгаан: purpose string ерөнхий («App needs microphone access» гэх мэт) [Эх 33]; зөвшөөрлийг хэрэгцээгүй үед хүсэх; хэрэглэгч татгалзвал аппын үндсэн үйлдэл ажиллахгүй болгох; бүртгэлгүй өгөгдөл цуглуулж label-тэй зөрөх. Proctoring аппын тусгай татгалзлын жишээ олдсонгүй.

### 5.2 Google Play

| Бодлого | Агуулга | Бидэнд |
|---|---|---|
| Permissions and APIs that Access Sensitive Information | «must be necessary for the app's core functionalities»; хэрэгтэй мөчид, үе шаттайгаар хүсэх; татгалзвал хүндэтгэх [Эх 34] | Микрофоныг шалгалт эхлэхээс өмнө тайлбартайгаар |
| User Data: Prominent Disclosure & Consent | «Must be within the app itself», «Cannot only be placed in a privacy policy», юу цуглуулж, хэрхэн ашиглахыг тайлбарлах [Эх 31] | Микрофон асаахаас өмнө апп доторх тайлбар цонх + зөвшөөрөх товч |
| Data safety | Бүх апп үнэн зөв бөглөх, бодлоготой нийцэх [Эх 31] | Б шатанд шинэчлэх |
| Families | Зорилтот үзэгчид хүүхэд орвол AAID, байршил, зарны хязгаар; үзэгчийг буруу заавал устгагдана [Эх 35] | Зорилтот насыг 13+ эсвэл 16+ гэж зөв сонгох (эзэн шийдэх) |
| Android 14 screenshot detection | Систем toast харуулна, «developers should provide in-context notices» [Эх 22] | Шалгалтын эхэнд тайлбарлах (манайд манифестэд аль хэдийн байгаа) |

### 5.3 Насанд хүрээгүй хэрэглэгч (15–18)

- Апп дотор шалгалтын хяналтын тайлбарыг сурагчид ойлгомжтой, айлгахгүй хэлээр (EXAM-INTEGRITY.md-ийн зарчим).
- Камер, нүүрний зураг, дуу хадгалах нь хамгийн мэдрэг; энэ судалгаа үүнийг санал болгохгүй.
- Эцэг эхийн мэдэгдэл, сургуулийн гэрээнд «шалгалтын үед дууны түвшин хэмжинэ, бичихгүй» гэдгийг оруулах эсэхийг эзэн шийднэ.
- Монголын хувийн мэдээллийн хуулийн шаардлагыг энэ судалгаанд шалгаагүй.

## 6. Манай одоогийн байдал (репо `pi.mnv2-scan`)

### 6.1 Апп (Flutter)

- `ExamGuard` интерфейс: `enter`, `exit`, `events` — `piemath_app/lib/core/integrity/exam_guard.dart:12-25`.
- Lifecycle observer БАЙГАА: `AppLifecycleListener` — `piemath_app/lib/core/integrity/method_channel_exam_guard.dart:66`; `hidden`/`paused` = гарсан, `inactive` (дуудлага, Control Center) тоологдохгүй — `exam_guard.dart:39-54`.
- Натив суваг `mn.piemath.app/exam_guard` + `/events` — `method_channel_exam_guard.dart:30-38`.
- Үйл явдлын төрөл: `screenshot`, `recordingStarted`, `recordingStopped`, `backgrounded`, `resumed` — `piemath_app/lib/core/integrity/integrity_event.dart:4-20`.
- Гаралтын дүрэм: 1 удаагаас анхааруулга, 3 удаад автоматаар илгээнэ, 2 секундээс богино гаралтыг тоолохгүй — `piemath_app/lib/core/integrity/leave_tracker.dart:39-62`; серверийн `leaveCount` их бол түүнийг авна — `leave_tracker.dart:151-154`.
- Контроллер: guard асаах — `piemath_app/lib/features/exam/application/exam_controller.dart:214-217`; бичлэг эхлэхэд `covered = true` (агуулга нуух), скриншот авахад toast — `exam_controller.dart:365-384`; 3 дахь гаралтад `submit(reason: FinishReason.leaves)` — `exam_controller.dart:385-392`.
- UI: `RecordingCover` — `piemath_app/lib/features/exam/ui/exam_screen.dart:225`; гаралтын анхааруулга `LeaveNoticeView` — `exam_screen.dart:218`.

### 6.2 Натив

- Android: `FLAG_SECURE` асаах/унтраах — `piemath_app/android/app/src/main/kotlin/mn/piemath/app/ExamGuardChannel.kt:63-89`; Android 14+ скриншотын callback — `ExamGuardChannel.kt:104-114`; Android 15+ бичлэгийн callback — `ExamGuardChannel.kt:127-141`. Манифестэд `DETECT_SCREEN_CAPTURE`, `DETECT_SCREEN_RECORDING` — `android/app/src/main/AndroidManifest.xml:7,9`. `RECORD_AUDIO` байхгүй.
- iOS: `ExamGuardPlugin` — `piemath_app/ios/Runner/AppDelegate.swift:15-16,31`; `userDidTakeScreenshotNotification` — `AppDelegate.swift:81-83`; `capturedDidChangeNotification` — `AppDelegate.swift:87`; `isCaptured` — `AppDelegate.swift:106-118`. AAC, Guided Access кодонд байхгүй. `NSMicrophoneUsageDescription` Info.plist-д байхгүй; `NSCameraUsageDescription` гэрийн даалгаврын зорилготой — `ios/Runner/Info.plist:65-66`.

### 6.3 API ба вэб

- Схем: `TestAttemptSession.leaveCount`, `events` (сүүлийн 100) — `api/prisma/schema.prisma:1153-1154`.
- Хүлээн авах үйл явдал: `LEAVE`, `RETURN`, `FULLSCREEN_EXIT`, `SCREENSHOT`, `RECORDING_START`, `RECORDING_STOP`; зөвхөн `LEAVE`, `FULLSCREEN_EXIT` нь `leaveCount`-ийг нэмнэ — `api/src/tests/integrity-events.ts:8-24`; DTO `@IsIn(SESSION_EVENTS)` — `api/src/tests/dto/submit-test.dto.ts:32-33`.
- Нэгтгэх логик: `api/src/tests/tests.service.ts:1880-1891` (`countsAsLeave` бол +1, `MAX_EVENTS = 100` — `tests.service.ts:70`).
- Багшид: `leaveCount`, `screenshotCount`, `recordingCount` — `tests.service.ts:1520-1535`; вэбийн хүснэгт — `web/src/components/results/ResultsTable.tsx:24-25`.
- Вэб: `LEAVE_WARN = 1`, `LEAVE_MAX = 3` — `web/src/app/app/tests/[id]/page.tsx:105-106`; `visibilitychange`, `blur`, `fullscreenchange` — `page.tsx:474-487`; 1.5 секундийн давхардлын шүүлт — `page.tsx:465`.

### 6.4 Олдсон цоорхой

1. Апп скриншот, бичлэгийг серверт илгээдэггүй: `ExamSessionEvent` нь зөвхөн `LEAVE`, `RETURN` — `leave_tracker.dart:13-21`; `lib/` дотор `SCREENSHOT`, `RECORDING_START` гэсэн утга огт алга. Сервер хүлээн авахад бэлэн (`integrity-events.ts:12-14`), багшийн багана бэлэн. Үр дүн: багшид апп-ын скриншот/бичлэг үргэлж 0.
2. Вэб `blur`-ийг гаралт гэж тоолдог (`page.tsx:477`), апп `inactive`-ийг тоолдоггүй (`exam_guard.dart:50-52`) — зориуд хийсэн ялгаа, гэхдээ багшид «нэг төрлийн тоо» мэт харагдана.
3. Android split-screen, PiP, iPad Slide Over үед `paused` ирэхгүй байж магадгүй — одоогийн тоолуур барихгүй (баталгаагүй, төхөөрөмж дээр турших).
4. `UIScreen.isCaptured` нь Apple-ийн баримтад 27.0 хүртэл гэж тэмдэглэгдсэн [Эх 17]; iOS 17+ дээр `sceneCaptureState` руу шилжих төлөвлөгөө хэрэгтэй [Эх 18].
5. Screen pinning, AAC, микрофоны хэмжилт байхгүй.

## 7. Санал болгох 3 шат

### А шат — зөвшөөрөл шаардахгүй (одоо хийх)

Агуулга:
- Апп скриншот, бичлэгийн үйл явдлыг серверт илгээх: `ExamSessionEvent`-д `SCREENSHOT`, `RECORDING_START`, `RECORDING_STOP` нэмж, `nextPending`/`ackPending` дараалалд оруулах. Сервер өөрчлөхгүй.
- Шалгалт эхлэхийн өмнө нэг дэлгэц: «Шалгалтын үеэр аппаас гарвал, дэлгэцийн зураг авбал багшид харагдана, 3 дахь удаад автоматаар илгээгдэнэ» (2.5.14-ийн «indication»-ыг хангах, Android 14-ийн toast-ыг урьдчилан тайлбарлах).
- Олон цонх, split-screen-ийг турших; хэрэв `paused` ирэхгүй бол Android-д `onMultiWindowModeChanged`, iOS-д scene-ийн төлөвийг натив сувгаар `backgrounded` болгон илгээх.
- Гуравдагч гарыг шалгалтын үед хаах (`shouldAllowExtensionPointIdentifier`, зөвхөн шалгалтын үед) [Эх 12].
- iOS 17+ дээр `sceneCaptureState` ажиглагч нэмэх (`isCaptured`-ийг fallback болгох).
- Сонголттой: Android-д screen pinning-ийг «санал» болгох (`startLockTask()`, хэрэглэгч зөвшөөрнө); pinning-ээс гарвал `LEAVE` гэж тоолох. Албадахгүй.
- Багшийн тайланд «гарсан», «скриншот», «бичлэг»-ийг тусад нь харуулах (бэлэн).

Хүч хөдөлмөр: 2–4 хоног (Dart + бага натив + тест). Эрсдэл: бага. Дэлгүүр: шинэ зөвшөөрөл байхгүй, Privacy label өөрчлөхгүй (үйл явдлын тоо аль хэдийн «App Functionality»).

### Б шат — микрофоны түвшин, бичлэггүй (эзний шийдвэрээр)

Зарчим: төхөөрөмж дээр л 100–200 мс тутам дууны түвшин (dBFS) тооцож, аудио буферийг шууд хаях; файл хадгалахгүй, серверт илгээхгүй. Зөвхөн «чанга дуу» босго (жишээ нь тайвшруулсан дундажаас X dB дээш, Y секунд үргэлжилсэн) давсан тоо, цагийг `LOUD_NOISE` гэж илгээнэ (сервер DTO-д нэг утга нэмнэ, `leaveCount`-д оруулахгүй, зөвхөн багшид харуулах).

Хэрэгжүүлэх зам:
- `record` (7.2.0, BSD-3, verified publisher cow-level.ovh, Android/iOS/бусад, `startStream` pcm16 + amplitude(dBFS)) [Эх 36] — урсгалаас RMS тооцоод хаях. Файлгүй ажиллах боломжтой.
- `noise_meter` (6.0.0, MIT, verified cachet.dk) [Эх 37] — шууд дБ өгнө, гэхдээ iOS 16+ шаардана (манай 15.0) ба iOS-д «Audio background mode» идэвхжүүлэхийг шаарддаг — 2.5.4-ийн эрсдэл тул ЗӨВЛӨХГҮЙ.
- Эсвэл platform channel-ээр `AVAudioRecorder` metering [Эх 19] / Android `AudioRecord`.
- Микрофоны зөвшөөрөлгүй бол шалгалт хэвийн явна, багшид «микрофон: зөвшөөрөөгүй» гэж л харагдана (5.1.1 (iv)).
- Тэг түвшин удаан үргэлжилбэл «микрофон хаалттай байж магадгүй» [Эх 30].

Хүч хөдөлмөр: 4–7 хоног (босго тохируулга, олон төхөөрөмжид туршилт). Эрсдэл: дунд — худал дохио (гудамжны чимээ, ах дүүс), сурагчийн итгэл, улбар шар/ногоон тэмдэг харагдах. Чимээ гарсан нь хууран мэхэлсэн гэсэн үг биш тул автоматаар шийтгэхгүй, зөвхөн багшид мэдээлэл.

Дэлгүүр: `NSMicrophoneUsageDescription` (жишээ: «Шалгалтын үеэр орчны дууны түвшинг л хэмжинэ. Дуу бичихгүй, хадгалахгүй, илгээхгүй.»), апп доторх Prominent Disclosure цонх, Play Data safety, App Privacy label, нууцлалын бодлогын шинэ хэсэг; шалгалтын дэлгэц дээр байнгын «Дууны түвшин хэмжиж байна» тэмдэг (2.5.14).

### В шат — бүрэн түгжих (зэрэгцээгээр хүсэлт гаргах)

- iOS: AAC entitlement-ийн хүсэлт [Эх 10]. Зөвшөөрөгдвөл шалгалт эхлэхэд `AEAssessmentSession.begin()`, `assessmentSessionDidBegin` ирсний дараа асуулт харуулах, дуусахад/тасалдахад `end()`. Энэ үед скриншот, бичлэг, апп солих, мэдэгдэл хаагдана, `ExamGuard`-ийн бусад хэсэг fallback болно. Entitlement ирэхгүй бол А шат хэвээр.
- Android: нийтийн хэрэглэгчид бүрэн түгжих зам байхгүй (device owner шаардана) [Эх 20]. Screen pinning-ийг А шатанд сонголттой; бүрэн түгжээ нь зөвхөн сургуулийн удирддаг төхөөрөмжид (MDM) боломжтой.

Хүч хөдөлмөр: хүсэлт 1 өдөр; хүлээх хугацаа тодорхойгүй (форумд 75+ хоног хариугүй жишээ) [Эх 14]; хэрэгжүүлэлт 3–5 хоног (Swift plugin, provisioning, тасалдлын замуудыг турших). Эрсдэл: entitlement олгохгүй байж болно; provisioning profile-д entitlement орохгүй асуудал [Эх 14]; шалгалт гацвал утас түгжигдэх тул `end()` бүх замд (finally) заавал. Дэлгүүр: Apple-ийн албан зам тул review эрсдэл бага; App Review-д AAC ашиглах тайлбар, туршилтын бүртгэл өгөх.

## 8. Нээлттэй асуулт эзэнд

1. Б шат (микрофоны түвшин) хэрэгтэй юу, эсвэл А шат + дүрэм хангалттай юу? Чимээ илэрсэн нь зөвхөн багшид мэдээлэл үү, эсвэл анхааруулга ч гаргах уу?
2. Apple-д AAC entitlement хүсэх үү? Хүсэлтийг Apple Developer бүртгэлийн Account Holder гаргана (бүртгэлийн нэр, апп-ын тайлбар шаардлагатай).
3. Android-д screen pinning-ийг санал болгох уу (сурагч татгалзаж болно), эсвэл огт хэрэглэхгүй юу?
4. Камер, нүүр илрүүлэлтийг (EnglishScore шиг) ирээдүйд ч хийхгүй гэж баталгаажуулах уу? (Энэ судалгаа хийхгүй байхыг санал болгож байна.)
5. Апп-ын зорилтот нас (Play Families, App Store age rating) 13+ уу, 16+ уу?
6. Эцэг эх, сургуульд шалгалтын хяналтын талаар мэдэгдэх баримт хэрэгтэй юу?
7. 3 удаа гарвал автоматаар илгээх дүрэм хэвээр үү, эсвэл скриншот/бичлэг/чимээг тус тусад нь босготой болгох уу?

## 9. Эх сурвалж

Бүгдийг 2026-11-16-нд уншсан. Олдоогүй, уншиж чадаагүй зүйлийг текстэд тэмдэглэсэн.

- [Эх 1] EnglishScore тусламжийн төв, «What do you have in the app to help me follow the Test Rules?» (403, хайлтын товчлолоос) — https://support.englishscore.com/hc/en-gb/articles/4407992547213
- [Эх 2] EnglishScore Security Report June 2026 — https://www.englishscore.com/wp-content/uploads/2026/07/Security-Report-June-2026-2.pdf ; Core Skills Guide — https://www.englishscore.com/wp-content/uploads/2026/08/Core-Skills-Guide-Updated.pdf
- [Эх 3] EnglishScore, App Store — https://apps.apple.com/us/app/englishscore/id1499806063
- [Эх 4] EnglishScore Speaking Test Guide (Mobile, PDF) — https://5907605.fs1.hubspotusercontent-na1.net/hubfs/5907605/EnglishScore_SpeakingTest_Mobile%20(1).pdf
- [Эх 5] Хайлтын товчлол: EnglishScore Writing Test Guide — https://5907605.fs1.hubspotusercontent-na1.net/hubfs/5907605/Writing%20Test%20Guide/EnglishScore_WritingTest_Desktop.pdf ; App Store (eg) сэтгэгдэл — https://apps.apple.com/eg/app/englishscore/id1499806063
- [Эх 6] EnglishScore Privacy Policy — https://www.englishscore.com/privacy-policy/
- [Эх 7] Duolingo English Test blog — https://blog.englishtest.duolingo.com/the-5-most-broken-rules-on-the-duolingo-english-test-and-how-to-avoid-breaking-them
- [Эх 8] Гуравдагч тайлбар (DET хяналт) — https://open-exam-prep.com/study-guides/duolingo-english-test/introduction-architecture-security/security-proctoring-rules
- [Эх 9] Talview quiet space — https://docs.talview.com/candidates/system-diagnostics/setting-up-a-quiet-space-for-proctored-sessions ; TestReach — https://help.testreach.com/hc/en-us/articles/27783116977693-Microphone-Check-Failed-Audibility
- [Эх 10] Apple, Automatic Assessment Configuration — https://developer.apple.com/documentation/automaticassessmentconfiguration
- [Эх 11] Apple, AEAssessmentConfiguration — https://developer.apple.com/documentation/automaticassessmentconfiguration/aeassessmentconfiguration
- [Эх 12] Apple, Preparing an educational assessment app for distribution — https://developer.apple.com/documentation/automaticassessmentconfiguration/preparing-an-educational-assessment-app-for-distribution
- [Эх 13] Apple, AEAssessmentSession — https://developer.apple.com/documentation/automaticassessmentconfiguration/aeassessmentsession ; entitlement — https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.automatic-assessment-configuration
- [Эх 14] Apple Developer Forums, AAC — https://developer.apple.com/forums/thread/793173 ; https://developer.apple.com/forums/tags/automatic-assessment-configuration
- [Эх 15] Apple, requestGuidedAccessSession — https://developer.apple.com/documentation/uikit/uiaccessibility/requestguidedaccesssession(enabled:completionhandler:)
- [Эх 16] Apple, userDidTakeScreenshotNotification — https://developer.apple.com/documentation/uikit/uiapplication/userdidtakescreenshotnotification
- [Эх 17] Apple, UIScreen.isCaptured — https://developer.apple.com/documentation/uikit/uiscreen/iscaptured
- [Эх 18] Apple, UITraitCollection.sceneCaptureState — https://developer.apple.com/documentation/uikit/uitraitcollection/scenecapturestate
- [Эх 19] Apple, AVAudioRecorder.updateMeters() — https://developer.apple.com/documentation/avfaudio/avaudiorecorder/updatemeters()
- [Эх 20] Android, Lock task mode — https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode
- [Эх 21] Android, WindowManager.LayoutParams.FLAG_SECURE — https://developer.android.com/reference/android/view/WindowManager.LayoutParams#FLAG_SECURE
- [Эх 22] Android 14, Screenshot detection — https://developer.android.com/about/versions/14/features/screenshot-detection
- [Эх 23] Apple, NSMicrophoneUsageDescription — https://developer.apple.com/documentation/bundleresources/information-property-list/nsmicrophoneusagedescription
- [Эх 24] kiosk_mode (Guided Access төлөв уншина) — https://pub.dev/packages/kiosk_mode
- [Эх 25] iOS улбар шар/ногоон цэг (гуравдагч; Apple-ийн албан хуудсыг уншаагүй) — https://9to5mac.com/2020/09/18/ios-14-what-do-the-orange-and-green-dots-in-the-status-bar-mean/
- [Эх 26] App Store Review Guidelines — https://developer.apple.com/app-store/review/guidelines/
- [Эх 27] Android 15 features, Screen recording detection — https://developer.android.com/about/versions/15/features#screen-recording-detection
- [Эх 28] Гуравдагч: Android 15 screen recording detection — https://proandroiddev.com/screen-recording-detection-android-15-26ee709b66b4 ; https://guardsquare.com/blog/android-15-screen-spying-protection
- [Эх 29] Android, Window.setHideOverlayWindows — https://developer.android.com/reference/android/view/Window#setHideOverlayWindows(boolean)
- [Эх 30] Android, Explaining access (indicators, toggles) — https://developer.android.com/training/permissions/explaining-access
- [Эх 31] Google Play, User Data policy — https://support.google.com/googleplay/android-developer/answer/10144311
- [Эх 32] Apple, Privacy manifest files — https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
- [Эх 33] Apple App Review Help, 5.1.1 purpose strings — https://developer.apple.com/help/app-review/guideline-reference/5-1-1-purpose-strings ; форум — https://developer.apple.com/forums/thread/113646
- [Эх 34] Google Play, Permissions and APIs that Access Sensitive Information — https://support.google.com/googleplay/android-developer/answer/9888170
- [Эх 35] Google Play, Families policy — https://support.google.com/googleplay/android-developer/answer/9893335
- [Эх 36] pub.dev, record — https://pub.dev/packages/record
- [Эх 37] pub.dev, noise_meter — https://pub.dev/packages/noise_meter
- Бусад шалгасан багц: no_screenshot 2.0.1 (BSD-3, verified flutterplaza.com) — https://pub.dev/packages/no_screenshot ; screen_protector 1.5.3 (Apache-2.0, verified inteniquetic.com, 1.4.4–1.4.13 crash анхааруулгатай) — https://pub.dev/packages/screen_protector ; kiosk_mode 0.10.0 (BSD-3, verified mews.com; Android lock task/pinning, iOS зөвхөн Guided Access төлөв) — https://pub.dev/packages/kiosk_mode ; screen_pinning 1.0.0 (MIT, verified биш, 12 татан авалт, Android) — https://pub.dev/packages/screen_pinning . Манайд бичсэн натив суваг эдгээрийн ихэнхийг аль хэдийн хийдэг тул шинэ багц нэмэх шаардлагагүй (Б шатанд `record`-оос бусад).
