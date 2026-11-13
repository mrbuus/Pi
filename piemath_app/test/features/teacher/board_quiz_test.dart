import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/tokens.dart';
import 'package:piemath_app/features/teacher/ui/board_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

const _screen = BoardScreen(classId: 'c1', date: testDate);

Map<String, Object?> _body(FakeHttp http, String method, String path) =>
    (http.requests.lastWhere((r) => r.method == method && r.path == path).data as Map).cast();

Finder _inKey(String key, Finder f) => find.descendant(of: find.byKey(ValueKey(key)), matching: f);

FakeHttp _http({Map<String, Object?>? quiz, Map<String, Object?>? board}) => boardHttp(quiz: quiz, board: board)
  ..on('PUT', '/classrooms/c1/homework-quiz', (req) {
    final n = ((req.data as Map)['problemCount'] as num).toInt();
    return FakeResponse(quizJson(problemCount: n, scores: {'s3': 4}));
  })
  ..on(
    'PUT',
    '/classrooms/c1/homework-quiz/scores/s2',
    (req) => FakeResponse({'studentId': 's2', 'score': (req.data as Map)['score']}),
  )
  ..json('DELETE', '/classrooms/c1/homework-quiz?date=$testDate', quizJson());

AppColors _colors(WidgetTester tester) => Theme.of(tester.element(find.byType(BoardScreen))).extension<AppColors>()!;

void main() {
  testWidgets('шалгалтгүй: ганц товч → бодлогын тоо → эхлүүлнэ (PUT), «Онлайн»-ы оронд онооны талбар', (tester) async {
    final http = _http();
    await pumpTeacher(tester, _screen, http: http);
    expect(find.byKey(const ValueKey('online-s2')), findsOneWidget);
    await scrollTo(tester, find.byKey(const ValueKey('quiz-start')));
    await tester.tap(find.byKey(const ValueKey('quiz-start')));
    await settle(tester);
    expect(find.text('Шалгалтаар даалгавар шалгах'), findsWidgets);
    expect(find.text('Ангид хэдэн бодлого өгснөө бичнэ үү'), findsOneWidget);
    await tester.enterText(find.byKey(const ValueKey('quiz-count-input')), '0');
    await tester.tap(find.byKey(const ValueKey('quiz-count-save')));
    await settle(tester);
    expect(find.text('1-ээс 200 хүртэл'), findsWidgets);
    expect(http.count('PUT', '/classrooms/c1/homework-quiz'), 0);
    await tester.enterText(find.byKey(const ValueKey('quiz-count-input')), '10');
    await tester.tap(find.byKey(const ValueKey('quiz-count-save')));
    await settle(tester, frames: 20);
    expect(_body(http, 'PUT', '/classrooms/c1/homework-quiz'), {'date': testDate, 'problemCount': 10});
    expect(find.byKey(const ValueKey('quiz-bar')), findsOneWidget);
    expect(find.text('10 бодлого'), findsOneWidget);
    // Сервер s3-т 4 оноо буцаасан: дундаж 40% улаан, (1/3).
    expect(find.text('40%'), findsOneWidget);
    expect(find.text('(1/3)'), findsOneWidget);
    expect(find.byKey(const ValueKey('online-s2')), findsNothing);
    expect(find.byKey(const ValueKey('quiz-input-s2')), findsOneWidget);
  });

  testWidgets('оноо бичихэд өнгө шууд, 600 мс-ийн дараа хадгална (бутархай 7,5)', (tester) async {
    final http = _http(quiz: quizJson(problemCount: 10));
    await pumpTeacher(tester, _screen, http: http);
    final input = find.byKey(const ValueKey('quiz-input-s2'));
    await scrollTo(tester, input);
    await tester.enterText(input, '7,5');
    await tester.pump(const Duration(milliseconds: 100));
    expect(http.count('PUT', '/classrooms/c1/homework-quiz/scores/s2'), 0);
    expect(find.text('Хадгалж байна'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 600));
    await settle(tester);
    expect(_body(http, 'PUT', '/classrooms/c1/homework-quiz/scores/s2'), {'date': testDate, 'score': 7.5});
    expect(find.text('Хадгалагдсан'), findsOneWidget);
    // 75% — улбар шар хүрээ.
    final box = tester.widget<DecoratedBox>(
      find.descendant(of: find.byKey(const ValueKey('quiz-s2')), matching: find.byType(DecoratedBox)).first,
    );
    final warning = _colors(tester).warning;
    expect(
      (box.decoration as BoxDecoration).color,
      Color.alphaBlend(warning.withValues(alpha: 0.15), _colors(tester).surface),
    );
    expect(find.text('75%'), findsOneWidget); // дундаж (зөвхөн оноотой нэг сурагч)
    // Илүү оноо — буруу, хадгалахгүй.
    await tester.enterText(input, '12');
    await tester.pump(const Duration(milliseconds: 800));
    await settle(tester);
    expect(http.count('PUT', '/classrooms/c1/homework-quiz/scores/s2'), 1);
    expect(find.text('1 оноо буруу'), findsOneWidget);
  });

  testWidgets('оноотой сурагч «Тэмдэглээгүй», «Бүгд хийсэн»-д тоологдохгүй', (tester) async {
    final http = _http(
      quiz: quizJson(problemCount: 10, scores: {'s2': 9}),
      board: boardJson(attendance: [attRow('s1', 'PRESENT'), attRow('s2', 'PRESENT'), attRow('s3', 'PRESENT')]),
    );
    await pumpTeacher(tester, _screen, http: http);
    // Даалгавар: 3 тэмдэглээгүйгээс 1 нь шалгалтын оноотой.
    expect(_inKey('board-summary', find.bySemanticsLabel('Тэмдэглээгүй 2')), findsOneWidget);
    await scrollTo(tester, find.text('Үлдсэнийг нэг дор'));
    expect(find.text('Бүгд хийсэн (2)'), findsOneWidget);
  });

  testWidgets('нуухад оноо устахгүй, «Онлайн» буцаж гарна; дахин харах', (tester) async {
    final http = _http(quiz: quizJson(problemCount: 10, scores: {'s2': 9}));
    await pumpTeacher(tester, _screen, http: http);
    await scrollTo(tester, find.byKey(const ValueKey('quiz-hide')));
    await tester.tap(find.byKey(const ValueKey('quiz-hide')));
    await settle(tester);
    expect(find.byKey(const ValueKey('online-s2')), findsOneWidget);
    expect(find.text('Шалгалтын оноо харах (1/3)'), findsOneWidget);
    expect(http.requests.where((r) => r.method == 'DELETE'), isEmpty);
    await tester.tap(find.byKey(const ValueKey('quiz-show')));
    await settle(tester);
    expect(find.byKey(const ValueKey('quiz-input-s2')), findsOneWidget);
  });

  testWidgets('бодлогын тоо засах цонхонд «Шалгалтыг устгах» — баталгаажуулж DELETE', (tester) async {
    final http = _http(quiz: quizJson(problemCount: 10, scores: {'s2': 9}));
    await pumpTeacher(tester, _screen, http: http);
    await scrollTo(tester, find.byKey(const ValueKey('quiz-edit')));
    await tester.tap(find.byKey(const ValueKey('quiz-edit')));
    await settle(tester);
    expect(find.text('Шалгалтын бодлогын тоо'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('quiz-remove')));
    await settle(tester);
    expect(find.text('1 сурагчийн оруулсан оноо хамт устна. Устгах уу?'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('quiz-remove-confirm')));
    await settle(tester, frames: 20);
    expect(http.count('DELETE', '/classrooms/c1/homework-quiz?date=$testDate'), 1);
    expect(find.byKey(const ValueKey('quiz-start')), findsOneWidget);
  });

  testWidgets('хадгалалт амжилтгүй бол тоолж хэлнэ; дахин бичихэд шууд илгээнэ', (tester) async {
    final http = boardHttp(quiz: quizJson(problemCount: 10))
      ..error('PUT', '/classrooms/c1/homework-quiz/scores/s2', 400, 'Сурагч энэ ангид алга байна');
    await pumpTeacher(tester, _screen, http: http);
    final input = find.byKey(const ValueKey('quiz-input-s2'));
    await scrollTo(tester, input);
    await tester.enterText(input, '6');
    await tester.pump(const Duration(milliseconds: 700));
    await settle(tester);
    expect(find.text('1 оноо хадгалагдсангүй'), findsOneWidget);
    expect(http.count('PUT', '/classrooms/c1/homework-quiz/scores/s2'), 1);
  });

  testWidgets('320dp утсан дээр шалгалтын мөр, онооны талбар халихгүй', (tester) async {
    final http = _http(quiz: quizJson(problemCount: 12, scores: {'s2': 7.5, 's3': 11}));
    await pumpTeacher(tester, _screen, http: http, size: const Size(320, 640));
    expect(tester.takeException(), isNull);
    await scrollTo(tester, find.byKey(const ValueKey('quiz-bar')));
    expect(tester.takeException(), isNull);
    await scrollTo(tester, find.byKey(const ValueKey('quiz-input-s3')));
    expect(tester.takeException(), isNull);
    expect(tester.getSize(find.byKey(const ValueKey('quiz-s3'))).height, greaterThanOrEqualTo(48));
  });

  testWidgets('онлайн ангид шалгалтын хүсэлт явуулахгүй', (tester) async {
    final http = _http(board: boardJson(type: 'ONLINE'));
    await pumpTeacher(tester, _screen, http: http);
    expect(http.count('GET', '/classrooms/c1/homework-quiz'), 0);
    expect(find.byKey(const ValueKey('quiz-start')), findsNothing);
  });
}
