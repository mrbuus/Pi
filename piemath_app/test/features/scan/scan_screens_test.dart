import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/scan/data/scan_result.dart';
import 'package:piemath_app/features/scan/domain/lock_message.dart';
import 'package:piemath_app/features/scan/scan_routes.dart';
import 'package:piemath_app/features/scan/ui/qr_camera.dart';
import 'package:piemath_app/features/scan/ui/scan_result_screen.dart';
import 'package:piemath_app/features/scan/ui/scanner_screen.dart';

import '../../helpers/fake_http.dart';
import 'scan_test_helpers.dart';

/// Зохиомол бодлого (жинхэнэ контент биш).
Map<String, Object?> scanJson({
  String access = 'FULL',
  String? lockReason,
  String? opensAt,
  bool hasImage = false,
  String format = 'CHOICE',
  Object? correctAnswer = 'B',
}) =>
    {
      'problemId': 'p1',
      'format': format,
      'statementText': r'$x^2-5x+6=0$ тэгшитгэлийн их шийдийг ол.',
      'imageKey': null,
      'hasImage': hasImage,
      'choices': format == 'CHOICE'
          ? [
              {'letter': 'A', 'text': r'$2$', 'image': null},
              {'letter': 'B', 'text': r'$3$', 'image': null},
              {'letter': 'C', 'text': r'$5$', 'image': null},
              {'letter': 'D', 'text': r'$6$', 'image': null},
              {'letter': 'E', 'text': r'$-3$', 'image': null},
            ]
          : <Object?>[],
      'source': {'book': '300x300', 'chapter': 'Тэгшитгэл · Тест 3', 'page': 45, 'number': 12},
      'access': access,
      'lockReason': lockReason,
      'opensAt': opensAt,
      if (access != 'LOCKED') 'solution': r'Виетийн теоремоор $x_1+x_2=5$, $x_1 \cdot x_2=6$ тул $x=3$.',
      if (access == 'FULL') 'correctAnswer': correctAnswer,
      if (access == 'FULL') 'answerNeedsCheck': false,
      if (access == 'FULL') 'youtube': {'url': 'https://www.youtube.com/watch?v=abc', 'embedUrl': 'https://www.youtube-nocookie.com/embed/abc'},
    };

class FakeCamera implements QrCamera {
  ValueChanged<String>? detect;
  ValueChanged<QrCameraError>? error;
  final torchValue = ValueNotifier<bool?>(false);
  var toggled = 0;
  var disposed = false;

  @override
  Widget buildPreview(BuildContext context, {required ValueChanged<String> onDetect, required ValueChanged<QrCameraError> onError}) {
    detect = onDetect;
    error = onError;
    return const ColoredBox(color: Colors.transparent, child: SizedBox.expand(key: Key('preview')));
  }

  @override
  ValueListenable<bool?> get torch => torchValue;

  @override
  Future<void> toggleTorch() async => toggled++;

  @override
  void dispose() => disposed = true;
}

void main() {
  group('ScanResult загвар', () {
    test('FULL задлалт', () {
      final r = ScanResult.fromJson(scanJson());
      expect(r.access, ScanAccess.full);
      expect(r.correctLetter, 'B');
      expect(r.choices.length, 5);
      expect(r.source.number, 12);
      expect(r.youtube!.url, contains('youtube'));
    });

    test('LOCKED + WAITING', () {
      final r = ScanResult.fromJson(scanJson(access: 'LOCKED', lockReason: 'WAITING', opensAt: '2026-11-02T07:00:00.000Z'));
      expect(r.access, ScanAccess.locked);
      expect(r.lockReason, ScanLockReason.waiting);
      expect(r.opensAt, DateTime.utc(2026, 11, 2, 7));
      expect(r.solution, isNull);
      expect(r.correctLetter, isNull);
    });

    test('хариуны утга, YouTube хаягийн шалгалт', () {
      expect(formatAnswerValue({'a': '3', 'bc': '54'}), 'a = 3, bc = 54');
      expect(formatAnswerValue('3_5'), '3_5');
      expect(isAllowedYoutubeUrl('https://youtu.be/abc'), isTrue);
      expect(isAllowedYoutubeUrl('http://youtube.com/x'), isFalse);
      expect(isAllowedYoutubeUrl('https://evil.com/youtube.com'), isFalse);
    });
  });

  group('Бодлогын дэлгэц /app/scan/:code', () {
    testWidgets('FULL: бодлого, зөв хариу, бодолт, видео', (tester) async {
      final http = FakeHttp()..json('GET', '/scan/AB12CD34', scanJson());
      await pumpRouted(tester, initial: '/app/scan/ab12cd34', routes: scanRoutes.shell, http: http);
      await settle(tester);
      expect(find.text('12-р бодлого'), findsOneWidget);
      expect(find.text('45-р хуудас'), findsOneWidget);
      expect(find.byType(ChoiceGrid), findsOneWidget);
      expect(find.text('Зөв хариу: '), findsOneWidget);
      expect(find.text('Бодолт'), findsOneWidget);
      expect(find.text('Бодолтын видео үзэх'), findsOneWidget);
      // Кодыг нормчилж дуудсан.
      expect(http.requests.single.path, '/scan/AB12CD34');
    });

    testWidgets('LOCKED: шалтгааны бичвэр, зургийн сануулга, бодолтгүй', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/scan/AB12CD34', scanJson(access: 'LOCKED', lockReason: 'NOT_TAKEN', hasImage: true));
      await pumpRouted(tester, initial: '/app/scan/AB12CD34', routes: scanRoutes.shell, http: http);
      await settle(tester);
      expect(find.text('Эхлээд өөрөө бодоод үзээрэй'), findsOneWidget);
      expect(find.text('Энэ бодлого орсон шалгалтаа өгсний дараа бодолт нь нээгдэнэ.'), findsOneWidget);
      expect(find.text('Зургийг номын хуудаснаас харна уу.'), findsOneWidget);
      expect(find.text('Бодолт'), findsNothing);
      expect(find.text('Зөв хариу: '), findsNothing);
    });

    testWidgets('404: серверийн мессеж + дахин уншуулах', (tester) async {
      final http = FakeHttp()..error('GET', '/scan/AB12CD34', 404, 'Энэ QR кодтой бодлого олдсонгүй');
      await pumpRouted(tester, initial: '/app/scan/AB12CD34', routes: scanRoutes.shell, http: http);
      await settle(tester);
      expect(find.text('Энэ QR кодтой бодлого олдсонгүй'), findsOneWidget);
      expect(find.text('Дахин уншуулах'), findsOneWidget);
    });

    testWidgets('сүлжээгүй: монгол мессеж + дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..on('GET', '/scan/AB12CD34', (_) => const FakeResponse.network())
        ..on('GET', '/scan/AB12CD34', (_) => const FakeResponse.network())
        ..on('GET', '/scan/AB12CD34', (_) => FakeResponse(scanJson()));
      await pumpRouted(tester, initial: '/app/scan/AB12CD34', routes: scanRoutes.shell, http: http);
      await settle(tester, frames: 30);
      expect(find.text(AppStrings.networkError), findsOneWidget);
      await tester.tap(find.text(AppStrings.retry));
      await settle(tester);
      expect(find.text('12-р бодлого'), findsOneWidget);
    });

    testWidgets('429: хэт олон оролдлого', (tester) async {
      final http = FakeHttp()..error('GET', '/scan/AB12CD34', 429);
      await pumpRouted(tester, initial: '/app/scan/AB12CD34', routes: scanRoutes.shell, http: http);
      await settle(tester);
      expect(find.text(AppStrings.tooManyRequests), findsOneWidget);
    });

    testWidgets('буруу код: API дуудахгүй', (tester) async {
      final http = FakeHttp();
      await pumpRouted(tester, initial: '/app/scan/UUU', routes: scanRoutes.shell, http: http);
      await settle(tester);
      expect(find.text('QR код буруу байна'), findsOneWidget);
      expect(http.requests, isEmpty);
    });

    testWidgets('ачаалж байхад skeleton', (tester) async {
      final http = FakeHttp()
        ..on('GET', '/scan/AB12CD34', (_) => FakeResponse(scanJson(), delay: const Duration(seconds: 1)));
      await pumpRouted(tester, initial: '/app/scan/AB12CD34', routes: scanRoutes.shell, http: http);
      await tester.pump();
      expect(find.byType(LoadingState), findsOneWidget);
      await settle(tester, frames: 30);
    });

    testWidgets('гаднаас нээгдсэн: буцах → нүүр', (tester) async {
      final http = FakeHttp()..json('GET', '/scan/AB12CD34', scanJson());
      await pumpRouted(tester, initial: '/app/scan/AB12CD34', routes: scanRoutes.shell, http: http);
      await settle(tester);
      await tester.tap(find.byTooltip(AppStrings.back));
      await settle(tester);
      expect(currentPath(tester), isNot(startsWith('/app/scan')));
    });
  });

  group('QR уншигч /app/scan', () {
    late FakeCamera cam;
    setUp(() => cam = FakeCamera());

    Future<void> open(WidgetTester tester, {bool explained = true}) async {
      final http = FakeHttp()..json('GET', '/scan/AB12CD34', scanJson());
      await pumpRouted(
        tester,
        initial: '/app/scan',
        routes: [...scanRoutes.fullscreen, ...scanRoutes.shell],
        http: http,
        prefs: {if (explained) ScannerScreen.explainedKey: true},
        extra: [qrCameraFactoryProvider.overrideWithValue(() => cam)],
      );
      await settle(tester);
    }

    testWidgets('эхний удаа: камер яагаад хэрэгтэйг тайлбарлаад дараа нь нээнэ', (tester) async {
      await open(tester, explained: false);
      expect(find.text('Камер хэрэгтэй'), findsOneWidget);
      expect(find.byKey(const Key('preview')), findsNothing);
      await tester.tap(find.text('Камер нээх'));
      await settle(tester);
      expect(find.byKey(const Key('preview')), findsOneWidget);
    });

    testWidgets('номын QR → бодлогын дэлгэц', (tester) async {
      await open(tester);
      cam.detect!('https://pimath.mn/q/ab12cd34');
      await settle(tester);
      expect(currentPath(tester), '/app/scan/AB12CD34');
      expect(find.text('12-р бодлого'), findsOneWidget);
    });

    testWidgets('өөр QR → тайван мессеж, шилжихгүй', (tester) async {
      await open(tester);
      cam.detect!('https://evil.example/q/AB12CD34');
      await settle(tester);
      expect(find.textContaining('номын бодлогынх биш'), findsOneWidget);
      expect(currentPath(tester), '/app/scan');
    });

    testWidgets('гар чийдэн', (tester) async {
      await open(tester);
      await tester.tap(find.byTooltip('Гэрэл асаах'));
      expect(cam.toggled, 1);
    });

    testWidgets('зөвшөөрөлгүй: тайлбар + гараар бичих', (tester) async {
      await open(tester);
      cam.error!(QrCameraError.permissionDenied);
      await settle(tester);
      expect(find.text('Камерын зөвшөөрөл алга'), findsOneWidget);
      await tester.tap(find.text('Кодоо бичих'));
      await settle(tester);
      await tester.enterText(find.byType(TextField), 'ab12cd3');
      await tester.tap(find.text('Бодлого харах'));
      await settle(tester);
      expect(find.textContaining('8 тэмдэгттэй'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'ab12cd34');
      await tester.tap(find.text('Бодлого харах'));
      await settle(tester);
      expect(currentPath(tester), '/app/scan/AB12CD34');
    });

    testWidgets('хаахад камер чөлөөлөгдөнө', (tester) async {
      await open(tester);
      await tester.tap(find.byTooltip(AppStrings.close));
      await settle(tester);
      expect(cam.disposed, isTrue);
    });
  });
}
