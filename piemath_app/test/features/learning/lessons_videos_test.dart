import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/learning/data/lesson_repository.dart';
import 'package:piemath_app/features/learning/ui/learn_screens.dart';
import 'package:piemath_app/features/learning/ui/library_screen.dart';

import '../../helpers/fake_http.dart';
import 'learning_test_app.dart';

class FakeLauncher implements VideoLauncher {
  final opened = <Uri>[];
  bool ok = true;

  @override
  Future<bool> open(Uri uri) async {
    opened.add(uri);
    return ok;
  }
}

Map<String, Object?> chapter(String id, String title, {String code = 'B1', String book = 'Математик 10', int theories = 2, int videos = 1, int read = 0}) => {
  'id': id,
  'title': title,
  'order': 1,
  'grade': 10,
  'book': {'code': code, 'title': book, 'displayName': null, 'subject': 'MATH'},
  'theoryCount': theories,
  'videoCount': videos,
  'theoriesRead': read,
  'videosWatched': 0,
  'completed': false,
};

void main() {
  testWidgets('хичээл үзэх: жагсаалт, явц, хайлт; номын код харагдахгүй', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/lessons/chapters', [chapter('c1', 'Тэгшитгэл', code: 'SECRET-CODE', read: 1), chapter('c2', 'Функц')]);
    await pumpLearning(tester, http, location: '/app/learn');
    expect(find.byType(LearnScreen), findsOneWidget);
    expect(find.text('Тэгшитгэл'), findsOneWidget);
    expect(find.textContaining('SECRET-CODE'), findsNothing);
    final bar = tester.widget<LinearProgressIndicator>(find.byType(LinearProgressIndicator).first);
    expect(bar.value, closeTo(1 / 3, 1e-9));
    await tester.enterText(find.byType(TextField), 'функ');
    await tester.pump();
    expect(find.text('Тэгшитгэл'), findsNothing);
    expect(find.text('Функц'), findsOneWidget);
  });

  testWidgets('хоосон жагсаалт', (tester) async {
    final http = FakeHttp()..json('GET', '/lessons/chapters', <Object?>[]);
    await pumpLearning(tester, http, location: '/app/learn');
    expect(find.text('Одоогоор нээлттэй хичээл алга'), findsOneWidget);
  });

  testWidgets('ном ачаалахад алдаа: дахин оролдох', (tester) async {
    final bad = FakeHttp()..error('GET', '/books', 500);
    await pumpLearning(tester, bad, location: '/app/library');
    expect(find.text('Ном ачаалж чадсангүй'), findsOneWidget);
  });

  Map<String, Object?> book(String id, String title, {String? display, int? order, int tests = 3}) => {
        'id': id,
        'code': id.toUpperCase(),
        'title': title,
        'displayName': display,
        'displayOrder': order,
        'problemCount': 10,
        'testCount': tests,
        '_count': {'chapters': 2},
      };
  Map<String, Object?> ch(String id, String title, {int order = 0, bool free = false, int problems = 5, int theories = 0}) => {
        'id': id,
        'title': title,
        'order': order,
        'freePreview': free,
        '_count': {'problems': problems, 'theories': theories, 'tests': 1},
      };

  testWidgets('бодлогын сан: хичээл, номын таб, сэдэв, тест → бодлогын жагсаалт', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/books', [
        book('b1', '100x100', display: 'Е-1', order: 1, tests: 70),
        book('b2', 'Хавтгай 1'),
        {...book('b3', 'Хоосон'), 'problemCount': 0, '_count': {'chapters': 0}},
      ])
      ..json('GET', '/chapters', [
        ch('c1', 'Илтгэгч функц · Тест 1', order: 1, free: true, theories: 2),
        ch('c2', 'Илтгэгч функц · Тест 2', order: 2),
        ch('c3', 'Логарифм · Тест 1', problems: 8),
      ]);
    final router = await pumpLearning(tester, http, location: '/app/library');
    expect(find.byType(LibraryScreen), findsOneWidget);
    expect(http.requests.first.queryParameters, {'subject': 'MATH'});
    expect(find.text('Е-1  70 тест'), findsOneWidget, reason: 'дотоод нэр «100x100» харагдахгүй');
    expect(find.textContaining('100x100'), findsNothing);
    expect(find.textContaining('Хоосон'), findsNothing, reason: 'бүтэцгүй ном');
    expect(http.requests.last.queryParameters, {'bookId': 'b1'});
    expect(find.text('Илтгэгч функц'), findsOneWidget);
    expect(find.text('Тест 1'), findsOneWidget);
    expect(find.text('Үнэгүй'), findsOneWidget);
    await tester.tap(find.byTooltip('Дараах: Логарифм'));
    await settle(tester);
    expect(find.text('Логарифм'), findsOneWidget);
    expect(find.textContaining('8 бодлого'), findsWidgets);
    await tester.tap(find.text('Тест 1'));
    await settle(tester);
    expect(router.state.uri.path, '/app/library/c3/problems');
    expect(router.state.uri.queryParameters['title'], 'Логарифм, Тест 1');
  });

  testWidgets('Нийгмийн ухаан: subject параметр, ном алга бол тайлбар', (tester) async {
    final http = FakeHttp()
      ..on('GET', '/books', (_) => FakeResponse([book('b1', 'Е-1')]))
      ..on('GET', '/books', (_) => const FakeResponse(<Object?>[]))
      ..json('GET', '/chapters', <Object?>[]);
    await pumpLearning(tester, http, location: '/app/library');
    expect(find.text('Ангидаа үзсэн сэдвүүд энд харагдана'), findsOneWidget);
    await tester.tap(find.text('Нийгмийн ухаан'));
    await settle(tester);
    expect(http.requests.where((r) => r.path == '/books').last.queryParameters, {'subject': 'SOCIAL_STUDIES'});
    expect(find.text('Энэ хичээлээр ном хараахан нэмэгдээгүй байна'), findsOneWidget);
  });

  testWidgets('хичээл: онол нээхэд THEORY_READ, бичлэг товшход YouTube nocookie, зөвхөн товшилтоор', (tester) async {
    final progress = <Map<String, Object?>>[];
    final launcher = FakeLauncher();
    final http = FakeHttp()
      ..json('GET', '/lessons/c1', {
        'chapter': {'id': 'c1', 'title': 'Тэгшитгэл', 'book': {'code': 'X', 'title': 'Ном'}},
        'theories': [
          {'id': 't1', 'title': 'Тодорхойлолт', 'content': r'**Чухал**: $x^2=4$', 'imageKeys': <String>[], 'order': 1},
        ],
        'videos': [
          {'id': 'v1', 'title': 'Хичээл 1', 'url': 'https://youtu.be/dQw4w9WgXcQ', 's3Key': 'https://youtu.be/dQw4w9WgXcQ', 'duration': 605},
          {'id': 'v2', 'title': 'Сэжигтэй', 'url': 'https://evil.com/a.mp4', 's3Key': 'https://evil.com/a.mp4', 'duration': null},
        ],
        'problemCount': 12,
        'tests': [
          {'id': 'tt1', 'title': 'Сэдвийн тест', 'type': 'DAILY', 'problemCount': 10},
        ],
        'progress': {'theoryRead': <String>[], 'videosWatched': <String>[], 'problemsAttempted': 0},
      })
      ..on('POST', '/lessons/c1/progress', (req) {
        progress.add((req.data as Map).cast<String, Object?>());
        return const FakeResponse({'accepted': true}, status: 202);
      });
    await pumpLearning(tester, http, location: '/app/learn/c1', overrides: [videoLauncherProvider.overrideWithValue(launcher)]);
    expect(find.byType(LessonScreen), findsOneWidget);
    expect(launcher.opened, isEmpty, reason: 'бичлэг автоматаар нээгдэхгүй');
    expect(progress, isEmpty);

    await tester.tap(find.text('Тодорхойлолт'));
    await settle(tester);
    expect(progress.single, {'action': 'THEORY_READ', 'theoryId': 't1'});

    await tester.tap(find.text('Хичээл 1'));
    await settle(tester);
    expect(launcher.opened.single.toString(), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0&playsinline=1');
    expect(progress.last, {'action': 'VIDEO_STARTED', 'videoId': 'v1'});

    await tester.tap(find.text('Сэжигтэй'));
    await settle(tester);
    expect(launcher.opened.length, 1, reason: 'найдваргүй эх сурвалжийг нээхгүй');
    expect(find.text('Бичлэгийн эх сурвалжийг багш шалгах шаардлагатай'), findsOneWidget);
    expect(find.text('Сэдвийн тест', skipOffstage: false), findsWidgets);
  });

  testWidgets('403: эрхгүй бол тайлбар', (tester) async {
    final http = FakeHttp()..error('GET', '/lessons/c9', 403, 'Энэ бүлгийн хичээлийг үзэх эрхгүй байна');
    await pumpLearning(tester, http, location: '/app/learn/c9');
    expect(find.text('Энэ хичээлийг үзэх эрх хэрэгтэй байна'), findsOneWidget);
    expect(find.text('Эрхийг сургалтын төв олгоно'), findsOneWidget);
    expect(find.text('Дахин оролдох'), findsNothing, reason: 'эрхгүй бол давтах утгагүй');
  });

  testWidgets('онлайн хичээл: бүлэг → бичлэг', (tester) async {
    final launcher = FakeLauncher();
    final http = FakeHttp()
      ..json('GET', '/videos/chapters', [
        {'id': 'c1', 'title': 'Тэгшитгэл', 'book': {'code': 'X', 'title': 'Ном', 'displayName': null}, '_count': {'videos': 2}},
      ])
      ..json('GET', '/videos', [
        {
          'id': 'v1',
          'title': 'Эхний бичлэг',
          's3Key': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'duration': 120,
          'media': {'kind': 'YOUTUBE', 'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'embedUrl': 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0&playsinline=1'},
          'unavailable': false,
        },
        {'id': 'v2', 'title': 'Хуучин', 's3Key': '', 'duration': null, 'media': null, 'unavailable': true},
      ]);
    await pumpLearning(tester, http, location: '/app/videos', overrides: [videoLauncherProvider.overrideWithValue(launcher)]);
    expect(find.text('2 бичлэг'), findsOneWidget);
    await tester.tap(find.text('Тэгшитгэл'));
    await settle(tester);
    expect(http.requests.last.queryParameters['chapterId'], 'c1');
    expect(find.text('Эх сурвалж шалгагдаж байна'), findsOneWidget);
    await tester.tap(find.text('Эхний бичлэг'));
    await settle(tester);
    expect(launcher.opened.single.host, 'www.youtube-nocookie.com');
  });
}
