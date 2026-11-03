import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lottie/lottie.dart';
import 'package:piemath_app/core/perf/perf_tier.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/shared/anim/anim_manifest.dart';
import 'package:piemath_app/shared/anim/animation_slot.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Бодит байгаа PNG-г poster болгон ашиглана (зураг нэмэхгүй).
const _poster = 'assets/brand/logo-circle.png';
const _file = 'assets/anim/correct_burst.json';
const _fallbackKey = Key('fallback');

AnimManifest _manifest({bool withFile = true, bool withPoster = true, bool loop = false}) => AnimManifest(
  entries: {
    AnimSlot.correctBurst: AnimEntry(
      slot: AnimSlot.correctBurst,
      kind: AnimKind.lottie,
      file: _file,
      poster: _poster,
      loop: loop,
      maxKb: 40,
    ),
  },
  bundled: {if (withFile) _file, if (withPoster) _poster},
);

/// Хамгийн жижиг хүчинтэй Lottie (30fps, 24 кадр = 0.8с, давхаргагүй).
final _lottieBytes = utf8.encode(
  jsonEncode({'v': '5.7.4', 'fr': 30, 'ip': 0, 'op': 24, 'w': 64, 'h': 64, 'layers': <Object?>[]}),
);

/// [_file]-ийг жинхэнэ Lottie болгон өгнө, бусдыг апп-ын bundle-ээс.
class _LottieBundle extends CachingAssetBundle {
  @override
  Future<ByteData> load(String key) =>
      key == _file ? Future.value(ByteData.sublistView(_lottieBytes)) : rootBundle.load(key);
}

Future<void> _pump(
  WidgetTester tester, {
  bool reduceMotion = false,
  double? size = 96,
  bool realLottie = false,
  bool tickers = true,
  int count = 1,
}) async {
  Widget slot(int i) => AnimationSlot(
    key: ValueKey(i),
    slot: AnimSlot.correctBurst,
    size: size,
    fallback: const Icon(AppIcons.success, key: _fallbackKey, size: 40),
  );
  Widget body = Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [for (var i = 0; i < count; i++) slot(i)]),
  );
  if (realLottie) body = DefaultAssetBundle(bundle: _LottieBundle(), child: body);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light(),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(disableAnimations: reduceMotion),
        child: child!,
      ),
      home: Scaffold(
        body: TickerMode(enabled: tickers, child: body),
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    AnimDegradeStore.debugReset();
  });
  tearDown(() {
    AnimManifest.debugOverride(null);
    DevicePerf.tier = PerfTier.high;
  });

  testWidgets('файл, poster байхгүй: fallback яг хэвээр, хэмжээ нэмэхгүй', (tester) async {
    AnimManifest.debugOverride(_manifest(withFile: false, withPoster: false));
    await _pump(tester);
    expect(find.byKey(_fallbackKey), findsOneWidget);
    expect(find.byType(LottieBuilder), findsNothing);
    expect(find.byType(Image), findsNothing);
    // fallback-ыг ороож хэмжээ өөрчлөхгүй (size: 96 өгсөн ч 40).
    expect(tester.getSize(find.byType(AnimationSlot)), const Size(40, 40));
    expect(find.descendant(of: find.byType(AnimationSlot), matching: find.byType(RepaintBoundary)), findsNothing);
  });

  testWidgets('манифест хоосон (ачаалагдаагүй / алдаа): fallback', (tester) async {
    AnimManifest.debugOverride(const AnimManifest());
    await _pump(tester);
    expect(find.byKey(_fallbackKey), findsOneWidget);
  });

  testWidgets('бүх слот одоо файлгүй — жинхэнэ манифестээр fallback', (tester) async {
    AnimManifest.debugOverride(null);
    await tester.runAsync(AnimManifest.load);
    for (final s in AnimSlot.values.where((s) => s != AnimSlot.loginHero)) {
      await tester.pumpWidget(
        MaterialApp(
          home: AnimationSlot(
            slot: s,
            size: 120,
            fallback: const SizedBox(key: _fallbackKey),
          ),
        ),
      );
      expect(find.byKey(_fallbackKey), findsOneWidget, reason: s.key);
      expect(find.byType(LottieBuilder), findsNothing, reason: s.key);
    }
  });

  testWidgets('poster шууд харагдаж, Lottie ард нь ачаална', (tester) async {
    AnimManifest.debugOverride(_manifest());
    await _pump(tester);
    expect(find.byType(Image), findsOneWidget);
    expect(find.byType(LottieBuilder), findsOneWidget);
    expect(find.byType(FadeTransition), findsWidgets);
    expect(tester.getSize(find.byType(AnimationSlot)), const Size(96, 96));
    // Файл ачаалагдаагүй (тестэд байхгүй) — poster үлдэнэ.
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byType(Image), findsOneWidget);
  });

  testWidgets('эхний кадр бэлэн болмогц 180мс-д poster-оос солино; нэг удаагийнх дуусаад зогсоно', (tester) async {
    AnimManifest.debugOverride(_manifest());
    await _pump(tester, realLottie: true);
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
    await tester.pump();
    await tester.pump();
    expect(find.byType(LottieBuilder), findsOneWidget);
    expect(find.byType(Image), findsOneWidget, reason: 'солих хүртэл poster');
    for (var i = 0; i < 3; i++) {
      await tester.pump(AnimationSlot.crossFade);
    }
    expect(find.byType(Image), findsNothing, reason: 'солигдсоны дараа poster хасагдана');
    expect(find.byType(LottieBuilder), findsOneWidget);
    await tester.pump(const Duration(seconds: 1));
    expect(tester.hasRunningAnimations, isFalse, reason: '0.8с-ийн анимац дуусаад зогсоно');
  });

  testWidgets('TickerMode унтарсан (далд таб): poster хэвээр, тоглохгүй', (tester) async {
    AnimManifest.debugOverride(_manifest());
    await _pump(tester, realLottie: true, tickers: false);
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.hasRunningAnimations, isFalse);
  });

  testWidgets('давталттай хоёр слот: нэг л эзэмшинэ, хаагдахад чөлөөлнө', (tester) async {
    AnimManifest.debugOverride(_manifest(loop: true));
    await _pump(tester, realLottie: true, count: 2);
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(AnimLoopGate.owner.value, isNotNull);
    await tester.pumpWidget(const SizedBox());
    expect(AnimLoopGate.owner.value, isNull);
  });

  testWidgets('хөдөлгөөн багасгах: зөвхөн poster, Lottie үүсгэхгүй', (tester) async {
    AnimManifest.debugOverride(_manifest());
    await _pump(tester, reduceMotion: true);
    expect(find.byType(Image), findsOneWidget);
    expect(find.byType(LottieBuilder), findsNothing);
  });

  testWidgets('хөдөлгөөн багасгах + poster үгүй: fallback', (tester) async {
    AnimManifest.debugOverride(_manifest(withPoster: false));
    await _pump(tester, reduceMotion: true);
    expect(find.byKey(_fallbackKey), findsOneWidget);
    expect(find.byType(LottieBuilder), findsNothing);
  });

  testWidgets('сул төхөөрөмж: зөвхөн poster', (tester) async {
    DevicePerf.tier = PerfTier.low;
    AnimManifest.debugOverride(_manifest());
    await _pump(tester);
    expect(find.byType(Image), findsOneWidget);
    expect(find.byType(LottieBuilder), findsNothing);
  });

  testWidgets('өмнө нь удаан гэж тэмдэглэсэн слот: poster (SharedPreferences)', (tester) async {
    SharedPreferences.setMockInitialValues({'${AnimDegradeStore.prefix}correct_burst': true});
    AnimManifest.debugOverride(_manifest());
    await _pump(tester);
    expect(find.byType(Image), findsOneWidget);
    expect(find.byType(LottieBuilder), findsNothing);
  });

  testWidgets('EmptyState art: файл байхгүй бол одоогийн дүрс яг хэвээр', (tester) async {
    AnimManifest.debugOverride(const AnimManifest());
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const Scaffold(
          body: EmptyState(icon: AppIcons.homework, title: 'Даалгавар алга', art: AnimArt.emptyHomework),
        ),
      ),
    );
    final icon = tester.widget<Icon>(find.byIcon(AppIcons.homework));
    expect(icon.size, 40);
    expect(find.byType(AnimationSlot), findsOneWidget);
    expect(find.byType(LottieBuilder), findsNothing);
  });

  group('FrameBudgetMonitor', () {
    bool run(int frames, int slow, {Duration window = const Duration(seconds: 2)}) {
      final m = FrameBudgetMonitor();
      var result = false;
      final step = (window.inMicroseconds / (frames - 1)).ceil();
      for (var i = 0; i < frames; i++) {
        final span = i < slow ? const Duration(milliseconds: 24) : const Duration(milliseconds: 8);
        result = m.add(span, i * step) || result;
      }
      return result;
    }

    test('2с-д 15%-иас олон кадр 16мс хэтэрвэл true', () {
      expect(run(60, 10), isTrue); // 16.7%
      expect(run(60, 9), isFalse); // 15%
    });

    test('цөөн кадраар дүгнэхгүй, цонх дуусаагүй бол false', () {
      expect(run(10, 10), isFalse);
      final m = FrameBudgetMonitor();
      expect(m.add(const Duration(milliseconds: 40), 0), isFalse);
      expect(m.add(const Duration(milliseconds: 40), 1000), isFalse);
    });
  });

  test('AnimLoopGate: нэг удаад нэг эзэн, чөлөөлбөл бусад эзэмшиж болно', () {
    final a = Object(), b = Object();
    AnimLoopGate.claim(a);
    expect(AnimLoopGate.isFree(a), isTrue);
    expect(AnimLoopGate.isFree(b), isFalse);
    AnimLoopGate.claim(b);
    expect(AnimLoopGate.isFree(a), isFalse);
    AnimLoopGate.release(a); // эзэн биш — юу ч болохгүй
    expect(AnimLoopGate.isFree(a), isFalse);
    AnimLoopGate.release(b);
    expect(AnimLoopGate.isFree(a), isTrue);
  });

  test('AnimDegradeStore: тэмдэглэснийг санаж, хадгална', () async {
    expect(await AnimDegradeStore.isDegraded(AnimSlot.offline), isFalse);
    await AnimDegradeStore.mark(AnimSlot.offline);
    AnimDegradeStore.debugReset();
    expect(await AnimDegradeStore.isDegraded(AnimSlot.offline), isTrue);
    expect((await SharedPreferences.getInstance()).getBool('${AnimDegradeStore.prefix}offline'), isTrue);
  });
}
