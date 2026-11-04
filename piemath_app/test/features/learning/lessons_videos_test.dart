import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/learning/data/lesson_repository.dart';
import 'package:piemath_app/features/learning/ui/learn_screens.dart';

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
    final bad = FakeHttp()..error('GET', '/lessons/chapters', 500);
    await pumpLearning(tester, bad, location: '/app/library');
    expect(find.text('Ном ачаалж чадсангүй'), findsOneWidget);
  });

  testWidgets('ном: номоор бүлэглэнэ', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/lessons/chapters', [
        chapter('c1', 'Тэгшитгэл'),
        chapter('c2', 'Функц', code: 'B2', book: 'Физик'),
      ]);
    await pumpLearning(tester, http, location: '/app/library');
    expect(find.byType(LibraryScreen), findsOneWidget);
    expect(find.text('Математик 10'), findsOneWidget);
    expect(find.text('Физик'), findsOneWidget);
    await tester.tap(find.text('Физик'));
    await settle(tester);
    expect(find.text('Функц'), findsOneWidget);
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
    expect(find.text('Хичээл нээгдсэнгүй'), findsOneWidget);
    expect(find.text('Энэ бүлгийн хичээлийг үзэх эрхгүй байна'), findsOneWidget);
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
