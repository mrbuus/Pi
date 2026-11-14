import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/lesson_flow/data/lesson_flow_models.dart';
import 'package:piemath_app/features/lesson_flow/lesson_flow_routes.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../student_harness.dart';
import '../w2_harness.dart';

// Зохиомол өгөгдөл (жинхэнэ сурагч, багшийн нэр биш).

const _classes = [
  {
    'id': 'c1',
    'name': '12-1 (Баруун 4)',
    'teacher': {'id': 'u1', 'firstName': 'Сарнай', 'lastName': 'Бат'},
    'assistantTeacher': null,
  },
  {
    'id': 'c2',
    'name': '11-2 (Зүүн 4)',
    'teacher': {'id': 't9', 'firstName': 'Болд', 'lastName': 'Дорж'},
    'assistantTeacher': {'id': 'u1', 'firstName': 'Сарнай', 'lastName': 'Бат'},
  },
  {
    'id': 'c3',
    'name': '10-3 (Зүүн 4)',
    'teacher': {'id': 't9', 'firstName': 'Болд', 'lastName': 'Дорж'},
    'assistantTeacher': null,
  },
];

const _chapters = [
  {
    'id': 'ch1',
    'title': 'Квадрат тэгшитгэл',
    'book': {'displayName': '100x100', 'title': '100x100'},
  },
];

Map<String, Object?> _pupil(String id, String first) => {'studentId': id, 'firstName': first, 'lastName': 'Тест'};

Map<String, Object?> _preview({Map<String, Object?>? packet}) => {
  'packet': packet,
  'classroom': {'id': 'c1', 'name': '12-1 (Баруун 4)'},
  'chapter': {
    'id': 'ch1',
    'title': 'Квадрат тэгшитгэл',
    'theories': [
      {
        'id': 'th1',
        'title': 'Виетийн теорем',
        'imageKeys': ['theory-1.png'],
      },
    ],
    'tests': [
      {'id': 'tA', 'title': 'Квадрат 1 A'},
      {'id': 'tB', 'title': 'Квадрат 1 B'},
    ],
  },
  'sessions': [
    {'id': 'ss1', 'testId': 'tA', 'manualTitle': null},
  ],
  'counters': {
    'classSize': 20,
    'theorySubmitted': packet == null ? null : 3,
    'classTestSubmitted': 12,
    'homeworkSubmitted': 5,
  },
  'photoCandidates': [_pupil('s1', 'Анар'), _pupil('s2', 'Тэмүүлэн')],
  'rotation': [_pupil('s1', 'Анар')],
  'makeupPupils': [_pupil('s3', 'Номин')],
  'homeworkImageKeys': packet == null ? <String>[] : ['hw-1.png'],
  'homeworkDueDate': null,
  'prefill': {
    'title': 'Квадрат тэгшитгэл — гэрийн даалгавар',
    'description': 'Онол: Квадрат тэгшитгэл\nАнгид хийсэн тест: Квадрат 1 A',
  },
  'limitations': ['Тоо нь илгээсэн сурагчийн тоо, зөв хариулсан гэсэн үг биш'],
};

const _packet = {
  'id': 'p1',
  'homeworkAssignmentId': 'a1',
  'makeupTestId': null,
  'testSessionId': 'ss1',
  'photoTurn': null,
};

String get _today => UbDateTime.now().startOfDay.dateKey;

FakeHttp _http({bool saved = false, bool forbidden = false}) => FakeHttp()
  ..json('GET', '/classrooms', _classes)
  ..json('GET', '/lessons/chapters', _chapters)
  ..json(
    'GET',
    '/lesson-flow/classrooms/c1/preview',
    forbidden ? {'statusCode': 403, 'message': 'Өөрийн ангийг сонгоно уу.'} : _preview(packet: saved ? _packet : null),
    status: forbidden ? 403 : 200,
  )
  ..json('POST', '/classrooms/c1/did-test', {'id': 'ss2'})
  ..json('PUT', '/lesson-flow/classrooms/c1/day?date=$_today', _packet)
  ..json('POST', '/lesson-flow/days/p1/photo-turn', {'studentId': 's1', 'reason': 'ATTENDANCE_ROTATION'});

Map<String, Object?> _body(RequestOptions r) => (r.data as Map).cast<String, Object?>();

Finder get _scroll =>
    find.descendant(of: find.byKey(const ValueKey('lesson-flow')), matching: find.byType(Scrollable)).first;

/// Анги, сэдвээ сонгоно (өдөр = өнөөдөр).
Future<void> _choose(WidgetTester tester) async {
  await tester.tap(find.byKey(const ValueKey('flow:class')));
  await settle(tester);
  await tester.tap(find.text('12-1 (Баруун 4)').last);
  await settle(tester);
  await tester.tap(find.byKey(const ValueKey('flow:chapter')));
  await settle(tester);
  await tester.tap(find.text('Квадрат тэгшитгэл').last);
  await settle(tester);
}

Future<void> _scrollTo(WidgetTester tester, Finder f) async {
  await tester.scrollUntilVisible(f, 200, scrollable: _scroll);
  await settle(tester);
}

void main() {
  setUpAll(loadAppFonts);

  group('логик', () {
    test('/app/lesson-flow/my → /app/my-class, tab/day/c хадгална', () {
      expect(lessonFlowMyRedirect(Uri.parse('/app/lesson-flow/my')), '/app/my-class');
      expect(
        lessonFlowMyRedirect(Uri.parse('/app/lesson-flow/my?tab=homework&day=2026-11-04&c=c1&x=1')),
        '/app/my-class?tab=homework&day=2026-11-04&c=c1',
      );
      expect(lessonFlowMyRedirect(Uri.parse('/app/lesson-flow/my?tab=')), '/app/my-class');
    });

    test('Багш зөвхөн үндсэн, туслах багшийн ангиа; Багш+, Админ бүгдийг', () {
      final all = [for (final c in _classes) FlowClass.fromJson(c)];
      expect(runnableClasses(all, role: UserRole.teacher, userId: 'u1').map((c) => c.id), ['c1', 'c2']);
      expect(runnableClasses(all, role: UserRole.teacherPlus, userId: 'u1'), hasLength(3));
      expect(runnableClasses(all, role: UserRole.admin, userId: null), hasLength(3));
      expect(runnableClasses(all, role: UserRole.student, userId: 'u1'), isEmpty);
    });

    test('урьдчилсан мэдээлэл: багц, холбох тест, ээлжийн шалтгаан', () {
      final p = FlowPreview.fromJson(_preview(packet: _packet));
      expect(p.saved, isTrue);
      expect(p.linkedTestId, 'tA');
      expect(p.counters.theorySubmitted, 3);
      expect(p.pupilName('s3'), 'Т. Номин');
      expect(FlowPreview.fromJson(_preview()).counters.theorySubmitted, isNull);
      expect(photoTurnReason('MISSED_TURN'), 'Өмнө ээлжээ алгассан');
      expect(photoTurnReason('Зураг сайн авдаг'), 'Зураг сайн авдаг');
    });
  });

  testWidgets('Багш: өөрийн анги, сонгомогц өдрийн мэдээлэл, тест бүртгэх, багц хадгалах', (tester) async {
    final http = _http();
    await pumpW2(tester, http: http, location: '/app/lesson-flow');
    expect(find.text('Анги, сэдвээ сонгоно уу'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('flow:class')));
    await settle(tester);
    expect(find.text('11-2 (Зүүн 4)'), findsOneWidget);
    expect(find.text('10-3 (Зүүн 4)'), findsNothing);
    await tester.tap(find.text('12-1 (Баруун 4)').last);
    await settle(tester);
    expect(http.count('GET', '/lesson-flow/classrooms/c1/preview'), 0);

    await tester.tap(find.byKey(const ValueKey('flow:chapter')));
    await settle(tester);
    await tester.tap(find.text('Квадрат тэгшитгэл').last);
    await settle(tester);
    final preview = http.requests.lastWhere((r) => r.path == '/lesson-flow/classrooms/c1/preview');
    expect(preview.queryParameters, {'date': _today, 'chapterId': 'ch1'});
    expect(find.text('5/20'), findsOneWidget);
    expect(find.text('Квадрат 1 A'), findsOneWidget);

    // Тест бүртгэх
    await tester.tap(find.text('Тест бүртгэх'));
    await settle(tester);
    await tester.tap(find.text('Тест').last);
    await settle(tester);
    await tester.tap(find.text('Квадрат 1 B').last);
    await settle(tester);
    await tester.tap(find.text('Бүртгэх'));
    await settle(tester);
    final did = http.requests.lastWhere((r) => r.path == '/classrooms/c1/did-test');
    expect(_body(did), {'testId': 'tB', 'date': _today});
    expect(http.count('GET', '/lesson-flow/classrooms/c1/preview'), 2);

    // Өдрийн багц хадгалах (автомат бөглөсөн гарчигтай)
    await _scrollTo(tester, find.text('Өдрийн багц хадгалах'));
    await tester.tap(find.text('Өдрийн багц хадгалах'));
    await settle(tester);
    await tester.tap(find.text('Хадгалах'));
    await settle(tester);
    final put = http.requests.lastWhere((r) => r.method == 'PUT');
    expect(put.path, '/lesson-flow/classrooms/c1/day?date=$_today');
    final body = _body(put);
    expect(body['chapterId'], 'ch1');
    expect(body['testId'], 'tA');
    expect(body['makeupTestId'], isNull);
    expect((body['homework']! as Map)['title'], 'Квадрат тэгшитгэл — гэрийн даалгавар');
    expect(http.count('GET', '/lesson-flow/classrooms/c1/preview'), 3);
  });

  testWidgets('хадгалсан багц: зураг авах ээлж автоматаар ба гараар', (tester) async {
    final http = _http(saved: true);
    await pumpW2(tester, http: http, location: '/app/lesson-flow');
    await _choose(tester);
    expect(find.text('Хадгалсан'), findsOneWidget);
    expect(find.text('3/20'), findsOneWidget);

    await _scrollTo(tester, find.text('Ээлж батлах'));
    await tester.tap(find.text('Ээлж батлах'));
    await settle(tester);
    final auto = http.requests.lastWhere((r) => r.path == '/lesson-flow/days/p1/photo-turn');
    expect(_body(auto), isEmpty);

    await _scrollTo(tester, find.text('Өөрөө сонгох'));
    await tester.tap(find.text('Өөрөө сонгох'));
    await settle(tester);
    // Шалтгаангүй бол илгээхгүй.
    await tester.tap(find.text('Сурагч').last);
    await settle(tester);
    await tester.tap(find.text('Т. Тэмүүлэн').last);
    await settle(tester);
    await tester.tap(find.text('Батлах'));
    await settle(tester);
    expect(http.count('POST', '/lesson-flow/days/p1/photo-turn'), 1);
    await tester.enterText(find.byType(TextField).last, 'Утас нь сайн');
    await tester.tap(find.text('Батлах'));
    await settle(tester);
    final manual = http.requests.lastWhere((r) => r.path == '/lesson-flow/days/p1/photo-turn');
    expect(_body(manual), {'studentId': 's2', 'reason': 'Утас нь сайн'});
  });

  testWidgets('Сурагч: хичээлийн өдөр нь багш нарт, /my → /app/my-class', (tester) async {
    final http = _http();
    final router = await pumpW2(tester, http: http, location: '/app/lesson-flow', role: UserRole.student);
    expect(find.text('Энэ хэсэг багш нарт'), findsOneWidget);
    expect(http.count('GET', '/classrooms'), 0);

    router.go('/app/lesson-flow/my?tab=homework&day=2026-11-04');
    await settle(tester);
    expect(find.text('ROUTE:/app/my-class?tab=homework&day=2026-11-04'), findsOneWidget);
  });

  testWidgets('Админ: бүх анги, алдаа гарвал дахин оролдох', (tester) async {
    final http = _http(forbidden: true);
    await pumpW2(tester, http: http, location: '/app/lesson-flow', role: UserRole.admin);
    await tester.tap(find.byKey(const ValueKey('flow:class')));
    await settle(tester);
    expect(find.text('10-3 (Зүүн 4)'), findsOneWidget);
    await tester.tap(find.text('12-1 (Баруун 4)').last);
    await settle(tester);
    await tester.tap(find.byKey(const ValueKey('flow:chapter')));
    await settle(tester);
    await tester.tap(find.text('Квадрат тэгшитгэл').last);
    await settle(tester);
    expect(find.text('Өөрийн ангийг сонгоно уу.'), findsOneWidget);
    expect(find.text('Дахин оролдох'), findsOneWidget);
  });
}
