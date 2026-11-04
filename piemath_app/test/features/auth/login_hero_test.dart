import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/auth/ui/hero/login_hero.dart';
import 'package:piemath_app/features/auth/ui/hero/login_hero_media.dart';
import 'package:video_player/video_player.dart';

/// Бодит байгаа PNG-г poster болгон ашиглана (зураг нэмэхгүй).
const _poster = 'assets/brand/logo-circle.png';

Future<int> _pump(
  WidgetTester tester, {
  LoginHeroMedia media = const LoginHeroMedia.none(),
  bool reduceMotion = false,
  double keyboard = 0,
  ThemeMode mode = ThemeMode.light,
}) async {
  tester.view.viewInsets = FakeViewPadding(bottom: keyboard);
  addTearDown(tester.view.resetViewInsets);
  var created = 0;
  final overrides = <Override>[
    loginHeroMediaProvider.overrideWith((ref) async => media),
    heroVideoControllerFactoryProvider.overrideWithValue(({String? asset, String? url}) {
      created++;
      throw StateError('тестэд видео үүсгэхгүй');
    }),
  ];
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: mode,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: reduceMotion),
          child: child!,
        ),
        home: const Scaffold(body: Column(children: [LoginHero()])),
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
  return created;
}

void main() {
  testWidgets('медиа байхгүй: зөвхөн лого, видео үүсгэхгүй', (tester) async {
    final before = await _pump(tester);
    expect(find.byType(BrandMark), findsOneWidget);
    expect(find.byType(VideoPlayer), findsNothing);
    expect(before, 0);
  });

  testWidgets('харанхуй горим: лого шууд үлдэнэ', (tester) async {
    await _pump(tester, mode: ThemeMode.dark);
    expect(find.byType(BrandMark), findsOneWidget);
  });

  testWidgets('видео байна: poster эхэлж, factory нэг удаа дуудагдана; алдаа бол poster үлдэнэ', (tester) async {
    final created = await _pump(
      tester,
      media: const LoginHeroMedia(video: 'assets/login_hero/hero.mp4', poster: _poster),
    );
    expect(created, 1);
    expect(find.byType(Image), findsOneWidget);
    expect(find.byType(BrandMark), findsNothing);
    expect(find.byType(VideoPlayer), findsNothing);
  });

  testWidgets('reduce motion: видео ачаалахгүй, poster харуулна', (tester) async {
    final created = await _pump(
      tester,
      media: const LoginHeroMedia(video: 'assets/login_hero/hero.mp4', poster: _poster),
      reduceMotion: true,
    );
    expect(created, 0);
    expect(find.byType(Image), findsOneWidget);
  });

  testWidgets('reduce motion + poster үгүй: лого', (tester) async {
    final created = await _pump(
      tester,
      media: const LoginHeroMedia(video: 'assets/login_hero/hero.mp4'),
      reduceMotion: true,
    );
    expect(created, 0);
    expect(find.byType(BrandMark), findsOneWidget);
  });

  testWidgets('гар нээлттэй: hero нугарч өндөр 0 болно, гараа хаавал сэргэнэ', (tester) async {
    await _pump(tester, keyboard: 300);
    expect(tester.getSize(find.byType(LoginHero)).height, 0);
    await _pump(tester);
    expect(tester.getSize(find.byType(LoginHero)).height, greaterThan(40));
  });

  testWidgets('алсын URL өгөгдмөлөөр унтраалттай', (tester) async {
    expect(loginHeroRemoteUrl, isEmpty);
    expect(const LoginHeroMedia.none().hasVideo(false), isFalse);
  });
}
