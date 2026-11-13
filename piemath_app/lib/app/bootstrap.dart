import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/auth/session.dart';
import '../core/cache/cache_providers.dart';
import '../core/files/file_image.dart';
import '../core/perf/memory.dart';
import '../core/perf/perf_tier.dart';
import '../features/exam/data/exam_draft_store.dart';
import '../features/push/push_service.dart';
import 'app.dart';
import 'shell/splash_screen.dart';
import 'theme_mode.dart';

/// Апп эхлүүлэх: binding, тохиргоо, нэвтрэлт сэргээх.
///
/// Эхний кадр хүртэл зөвхөн зайлшгүй зүйл (prefs, түвшин, токен). Push (Firebase) зэрэг
/// хүлээж болох ажил эхний кадрын дараа — `docs/PERF-OFFLINE.md` §4.
/// Логоны анимац ямар нэг шалтгаанаар дуусахгүй бол (эхлэх дэлгэц харагдаагүй г.м.) апп гацахгүй.
const brandIntroMax = Duration(milliseconds: 2500);

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (kReleaseMode) {
    // Release-д log хэвлэхгүй (нэр, утас, токен log-д үлдэхгүй — SECURITY §3).
    debugPrint = (String? message, {int? wrapWidth}) {};
  }
  // Edge-to-edge: Android 15+ (targetSdk 35) заавал; доод хувилбарт ч ижил харагдана.
  unawaited(SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge));
  final (prefs, _, cacheDir) = await (
    SharedPreferences.getInstance(),
    DevicePerf.detect(),
    resolveApiCacheDirectory(),
  ).wait;
  final container = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      apiCacheDirectoryProvider.overrideWithValue(cacheDir == null ? null : () async => cacheDir),
      signOutCleanupsProvider.overrideWithValue([() => clearExamDrafts(prefs)]),
    ],
    // Riverpod 3-ын автомат давталтыг унтраана — давталтыг ApiClient хязгаартай хийдэг.
    retry: (_, _) => null,
  );
  // 2 GB утсанд decode хийсэн зургийн кэшийг багасгана.
  applyImageCacheLimits(DevicePerf.tier);
  // GET кэшийг эрт үүсгэнэ: сесс сэргэмэгц (SignedIn) хэрэглэгчийн хавтас нээгдэж,
  // нүүр дэлгэц өмнөх өгөгдлөөр шууд зурагдана; нэвтрээгүй бол үлдэгдлийг цэвэрлэнэ.
  container.read(responseCacheSessionSyncProvider);
  WidgetsBinding.instance.addObserver(
    MemoryPressureObserver([
      () => container.read(responseCacheProvider).clearMemory(),
      () => container.read(fileBytesCacheProvider).clearMemory(),
    ]),
  );
  // Логоны анимац (эхлэх дэлгэц) дуустал нүүр рүү шилжихгүй — бүтэн лого хамгийн түрүүнд (эзэн 2026-11-14).
  unawaited(
    container
        .read(sessionProvider.notifier)
        .restore(notBefore: brandIntroDone.future.timeout(brandIntroMax, onTimeout: () {})),
  );
  runApp(UncontrolledProviderScope(container: container, child: const PiemathApp()));
  // Push бүртгэл (Firebase эхлүүлэлт) — эхний кадрын дараа, хэрэглэгч дэлгэцээ харж эхэлсний
  // дараа. Сонсогч `fireImmediately`-тэй тул сэргээсэн сесс ч алдагдалгүй бүртгэгдэнэ.
  WidgetsBinding.instance.addPostFrameCallback((_) {
    Timer(const Duration(milliseconds: 1500), () => container.read(pushSyncProvider));
  });
}
