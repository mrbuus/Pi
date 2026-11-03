import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/auth/session.dart';
import '../core/perf/perf_tier.dart';
import '../features/exam/data/exam_draft_store.dart';
import '../features/push/push_service.dart';
import 'app.dart';
import 'theme_mode.dart';

/// Апп эхлүүлэх: binding, тохиргоо, нэвтрэлт сэргээх.
Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (kReleaseMode) {
    // Release-д log хэвлэхгүй (нэр, утас, токен log-д үлдэхгүй — SECURITY §3).
    debugPrint = (String? message, {int? wrapWidth}) {};
  }
  // Edge-to-edge: Android 15+ (targetSdk 35) заавал; доод хувилбарт ч ижил харагдана.
  unawaited(SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge));
  final (prefs, _) = await (SharedPreferences.getInstance(), DevicePerf.detect()).wait;
  final container = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      signOutCleanupsProvider.overrideWithValue([() => clearExamDrafts(prefs)]),
    ],
    // Riverpod 3-ын автомат давталтыг унтраана — давталтыг ApiClient хязгаартай хийдэг.
    retry: (_, _) => null,
  );
  // Апп асахад push бүртгэлийг сонсож эхэлнэ (сэргээсэн сесс ч бүртгэгдэнэ).
  container.read(pushSyncProvider);
  unawaited(container.read(sessionProvider.notifier).restore());
  runApp(UncontrolledProviderScope(container: container, child: const PiemathApp()));
}
