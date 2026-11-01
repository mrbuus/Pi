import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/learning/data/lesson_repository.dart';
import 'package:piemath_app/features/learning/ui/chapter_problems_screen.dart';
import 'package:piemath_app/features/learning/ui/learn_screens.dart';
import 'package:piemath_app/features/learning/ui/practice_screens.dart';

import '../../helpers/fake_http.dart';
import 'learning_test_app.dart';

class _Launcher implements VideoLauncher {
  final opened = <Uri>[];

  @override
  Future<bool> open(Uri uri) async {
    opened.add(uri);
    return true;
  }
}

Map<String, Object?> problem(int n, {String? youtube, bool choices = false, String? variant}) => {
  'id': 'p$n',
  'number': n,
  'page': 1,
  'statementText': r'$x^2=' '$n\$ бол хариуг ол',
  'imageKey': null,
  'format': choices ? 'CHOICE' : 'OPEN',
  'choices': null,
  'choiceOptions': choices
      ? [
          {'label': 'A', 'text': r'$1$', 'imageKey': null},
          {'label': 'B', 'text': r'$2$', 'imageKey': null},
        ]
      : <Object?>[],
  'youtubeUrl': youtube,
  'variantLabel': variant,
};

void main() {
  testWidgets('бүлгийн бодлого: жагсаалт, сонголт, хувилбар; хариу, түлхүүр харагдахгүй', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/chapters/c1/problems', [problem(1, choices: true, variant: 'A хувилбар'), problem(2)]);
    await pumpLearning(tester, http, location: '/app/library/c1/problems');
    expect(find.byType(ChapterProblemsScreen), findsOneWidget);
    expect(find.textContaining('1-р бодлого'), findsOneWidget);
    expect(find.textContaining('A хувилбар'), findsOneWidget);
    expect(find.text('A.'), findsOneWidget);
    expect(find.text('Бодох'), findsNWidgets(2));
    expect(find.text('Цааш үзэх'), findsNothing);
    expect(http.requests.single.queryParameters, {'skip': 0, 'take': 50});
  });

  testWidgets('хоосон жагсаалт', (tester) async {
    final http = FakeHttp()..json('GET', '/chapters/c1/problems', <Object?>[]);
    await pumpLearning(tester, http, location: '/app/library/c1/problems');
    expect(find.text('Энэ бүлэгт нээлттэй бодлого алга'), findsOneWidget);
  });

  testWidgets('403: тайлбар ба дахин оролдох', (tester) async {
    final http = FakeHttp()
      ..error('GET', '/chapters/c1/problems', 403, 'Энэ бүлгийг үзэх эрхгүй байна')
      ..json('GET', '/chapters/c1/problems', [problem(1)]);
    await pumpLearning(tester, http, location: '/app/library/c1/problems');
    expect(find.text('Бодлого ачаалж чадсангүй'), findsOneWidget);
    expect(find.text('Энэ бүлгийг үзэх эрхгүй байна'), findsOneWidget);
    await tester.tap(find.text('Дахин оролдох'));
    await settle(tester);
    expect(find.textContaining('1-р бодлого'), findsOneWidget);
  });

  testWidgets('Цааш үзэх: дараагийн хуудас skip=50, алдаа гарвал жагсаалт хэвээр', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/chapters/c1/problems', [for (var i = 1; i <= 50; i++) problem(i)])
      ..on('GET', '/chapters/c1/problems', (_) => const FakeResponse({'statusCode': 500}, status: 500))
      ..json('GET', '/chapters/c1/problems', [problem(51)]);
    await pumpLearning(tester, http, location: '/app/library/c1/problems');
    await tester.scrollUntilVisible(find.text('Цааш үзэх'), 600, scrollable: find.byType(Scrollable).first);
    await tester.tap(find.text('Цааш үзэх'));
    await settle(tester);
    expect(find.text('Дараагийн бодлогуудыг ачаалж чадсангүй', skipOffstage: false), findsOneWidget);
    expect(http.requests.last.queryParameters['skip'], 50);
    await tester.drag(find.byType(ListView), const Offset(0, -2000));
    await settle(tester);
    await tester.tap(find.text('Дахин оролдох'));
    await settle(tester);
    await tester.scrollUntilVisible(find.textContaining('51-р бодлого'), 600, scrollable: find.byType(Scrollable).first);
    expect(find.text('Цааш үзэх'), findsNothing);
  });

  testWidgets('Бодох: дасгалын дэлгэц рүү; бодолтын бичлэг зөвхөн товшилтоор, YouTube nocookie', (tester) async {
    final launcher = _Launcher();
    final http = FakeHttp()
      ..json('GET', '/chapters/c1/problems', [problem(1, youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'), problem(2, youtube: 'https://evil.com/x')])
      ..json('GET', '/problems/p1', {'id': 'p1', 'format': 'OPEN', 'statementText': r'$x$ ол'});
    await pumpLearning(tester, http, location: '/app/library/c1/problems', overrides: [videoLauncherProvider.overrideWithValue(launcher)]);
    expect(find.text('Бодолтын бичлэг'), findsOneWidget, reason: 'найдваргүй холбоосыг харуулахгүй');
    expect(launcher.opened, isEmpty);
    await tester.tap(find.text('Бодолтын бичлэг'));
    await settle(tester);
    expect(launcher.opened.single.toString(), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0&playsinline=1');
    await tester.tap(find.text('Бодох').first);
    await settle(tester);
    expect(find.byType(PracticeProblemScreen), findsOneWidget);
  });

  testWidgets('хичээлийн дэлгэц: «Бүлгийн бодлогууд» холбоос', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/lessons/c1', {
        'chapter': {'id': 'c1', 'title': 'Тэгшитгэл', 'book': {'code': 'X', 'title': 'Ном'}},
        'theories': <Object?>[],
        'videos': <Object?>[],
        'problemCount': 12,
        'tests': <Object?>[],
      })
      ..json('GET', '/chapters/c1/problems', [problem(1)]);
    await pumpLearning(tester, http, location: '/app/learn/c1');
    expect(find.byType(LessonScreen), findsOneWidget);
    expect(find.text('12 бодлого'), findsOneWidget);
    await tester.tap(find.text('Бүлгийн бодлогууд'));
    await settle(tester);
    expect(find.byType(ChapterProblemsScreen), findsOneWidget);
  });
}
