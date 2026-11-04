// ignore_for_file: prefer_const_literals_to_create_immutables
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/learning/data/activity_models.dart';
import 'package:piemath_app/features/learning/data/events_repository.dart';
import 'package:piemath_app/features/learning/data/lesson_repository.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'learning_test_app.dart';

class _Launcher implements VideoLauncher {
  final opened = <Uri>[];
  bool ok = true;

  @override
  Future<bool> open(Uri uri) async {
    opened.add(uri);
    return ok;
  }
}

FakeHttp _practiceHttp() => FakeHttp()
  ..json('GET', '/recommend/next', <Object?>[])
  ..json('GET', '/problems/p1', {
    'id': 'p1',
    'format': 'OPEN',
    'statementText': r'$1+1$',
    'imageKey': null,
    'choices': null,
  });

void main() {
  group('бодлого бүрийн бичлэг', () {
    testWidgets('товшихоос өмнө сүлжээнд хандахгүй; товшоод жагсаалт, мөр товшоход open + YouTube nocookie', (
      tester,
    ) async {
      final launcher = _Launcher();
      Map<String, Object?>? openBody;
      final http = _practiceHttp()
        ..json('GET', '/videos/problem', [
          {'id': 'v1', 'title': 'Бодолтын тайлбар', 'duration': 125},
        ])
        ..on('POST', '/videos/v1/open', (req) {
          openBody = (req.data as Map).cast<String, Object?>();
          return const FakeResponse({
            'id': 'v1',
            'title': 'Бодолтын тайлбар',
            's3Key': 'https://youtu.be/dQw4w9WgXcQ',
            'media': {
              'kind': 'YOUTUBE',
              'url': 'https://youtu.be/dQw4w9WgXcQ',
              'embedUrl': 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
            },
          });
        });
      await pumpLearning(
        tester,
        http,
        location: '/app/practice/p1',
        overrides: [videoLauncherProvider.overrideWithValue(launcher)],
      );
      expect(http.count('GET', '/videos/problem'), 0, reason: 'автоматаар ачаалахгүй');
      await tester.tap(find.text('Бичлэгээр тайлбар'));
      await settle(tester);
      expect(http.requests.firstWhere((r) => r.path == '/videos/problem').queryParameters, {'problemId': 'p1'});
      expect(find.textContaining('Бодолтын тайлбар (2:05)'), findsOneWidget);
      expect(find.textContaining('тусламжтай оролдлого'), findsOneWidget);
      expect(launcher.opened, isEmpty);
      expect(http.count('POST', '/videos/v1/open'), 0);
      await tester.tap(find.textContaining('Бодолтын тайлбар (2:05)'));
      await settle(tester);
      expect(openBody, {'problemId': 'p1'});
      expect(launcher.opened.single.host, 'www.youtube-nocookie.com');
    });

    testWidgets('бичлэг холбогдоогүй бол тайван мессеж', (tester) async {
      final http = _practiceHttp()..json('GET', '/videos/problem', <Object?>[]);
      await pumpLearning(tester, http, location: '/app/practice/p1');
      await tester.tap(find.text('Бичлэгээр тайлбар'));
      await settle(tester);
      expect(find.text('Энэ бодлогод бичлэг хараахан холбогдоогүй'), findsOneWidget);
    });

    testWidgets('жагсаалт ачаалахад алдаа: дахин оролдох', (tester) async {
      final bad = _practiceHttp()..error('GET', '/videos/problem', 500);
      await pumpLearning(tester, bad, location: '/app/practice/p1');
      await tester.tap(find.text('Бичлэгээр тайлбар'));
      await settle(tester);
      expect(find.text('Дахин оролдох'), findsOneWidget);
    });

    testWidgets('эх сурвалж шалгагдаагүй бичлэгийг нээхгүй', (tester) async {
      final launcher = _Launcher();
      final http = _practiceHttp()
        ..json('GET', '/videos/problem', [
          {'id': 'v2', 'title': 'Сэжигтэй', 'duration': null},
        ])
        ..json('POST', '/videos/v2/open', {
          'id': 'v2',
          'title': 'Сэжигтэй',
          's3Key': 'https://evil.com/a.mp4',
          'media': null,
        });
      await pumpLearning(
        tester,
        http,
        location: '/app/practice/p1',
        overrides: [videoLauncherProvider.overrideWithValue(launcher)],
      );
      await tester.tap(find.text('Бичлэгээр тайлбар'));
      await settle(tester);
      await tester.tap(find.text('Сэжигтэй'));
      await settle(tester);
      expect(launcher.opened, isEmpty);
      expect(find.text('Бичлэгийн эх сурвалжийг багш шалгах шаардлагатай'), findsOneWidget);
    });

    testWidgets('сангийн бодлогод мөн байна (бодлого бүр өөрийн ID-тай)', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/chapters/c1/problems', [
          {
            'id': 'p7',
            'number': 1,
            'page': 1,
            'statementText': r'$x$',
            'imageKey': null,
            'format': 'OPEN',
            'choices': null,
            'choiceOptions': <Object?>[],
            'youtubeUrl': null,
            'variantLabel': null,
          },
        ])
        ..json('GET', '/videos/problem', <Object?>[]);
      await pumpLearning(tester, http, location: '/app/library/c1/problems');
      await tester.tap(find.text('Бичлэгээр тайлбар'));
      await settle(tester);
      expect(http.requests.firstWhere((r) => r.path == '/videos/problem').queryParameters, {'problemId': 'p7'});
    });
  });

  group('/events', () {
    testWidgets('хичээл ачаалагдахад вэбтэй ижил CHAPTER_OPENED batch нэг удаа', (tester) async {
      Map<String, Object?>? body;
      final http = FakeHttp()
        ..json('GET', '/lessons/c1', {
          'chapter': {
            'id': 'c1',
            'title': 'Тэгшитгэл',
            'book': {'code': 'X', 'title': 'Ном'},
          },
          'theories': <Object?>[],
          'videos': <Object?>[],
          'problemCount': 0,
          'tests': <Object?>[],
          'progress': {'theoryRead': <String>[], 'videosWatched': <String>[]},
        })
        ..on('POST', '/events', (req) {
          body = (req.data as Map).cast<String, Object?>();
          return const FakeResponse(null, status: 202);
        });
      await pumpLearning(tester, http, location: '/app/learn/c1');
      expect(http.count('POST', '/events'), 1);
      final events = body!['events']! as List;
      expect(events, hasLength(1));
      final e = (events.single as Map).cast<String, Object?>();
      expect(e['type'], 'CHAPTER_OPENED');
      expect(e['chapterId'], 'c1');
      expect(DateTime.parse(e['occurredAt']! as String).isUtc, isTrue);
      expect(e.keys.toSet(), {'type', 'occurredAt', 'chapterId'});
    });

    test('сервер алдаа өгвөл чимээгүй (сурагчийн урсгалыг блоклохгүй)', () async {
      final http = FakeHttp()..error('POST', '/events', 500);
      final c = testContainer(http: http);
      await c.read(eventsRepositoryProvider).chapterOpened('c1');
      expect(http.count('POST', '/events'), 1);
    });

    test('аюултай id-г илгээхгүй', () async {
      final http = FakeHttp();
      final c = testContainer(http: http);
      await c.read(eventsRepositoryProvider).chapterOpened('../x');
      expect(http.requests, isEmpty);
    });
  });

  test('ActivityStreak: сервер тоо, буруу утга 0', () {
    final s = ActivityStreak.fromJson({'currentStreak': 4, 'longestStreak': 9, 'totalActiveDays': 31});
    expect((s.currentStreak, s.longestStreak, s.totalActiveDays), (4, 9, 31));
    final bad = ActivityStreak.fromJson({'currentStreak': 'x'});
    expect(bad.currentStreak, 0);
  });
}
