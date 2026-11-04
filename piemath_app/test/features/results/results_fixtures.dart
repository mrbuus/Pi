import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/results/application/results_providers.dart';

import '../../helpers/fake_http.dart';
import '../classrooms_admin/classrooms_fixtures.dart' show pumpClassrooms, settle;

export '../classrooms_admin/classrooms_fixtures.dart' show requestBody, settle, staffSession;

/// Зохиомол өгөгдөл — жинхэнэ сурагчийн нэр биш (RULES §6).
final resultsToday = UbDateTime(2026, 11, 4, 10);

Map<String, Object?> resultRow(
  String id,
  String studentId,
  String first,
  String last, {
  num total = 0,
  num max = 40,
  String source = 'CHAPTER_EXAM',
  int? leave,
  int? shot,
}) => {
  'id': id,
  'testId': 't1',
  'studentId': studentId,
  'totalScore': total,
  'maxScore': max,
  'source': source,
  'student': {'id': studentId, 'firstName': first, 'lastName': last},
  'leaveCount': leave,
  'screenshotCount': shot,
  'recordingCount': null,
};

/// s1 Анар 36/40 цаасан, s2 Өлзий 30/40 онлайн + гарсан 2, s4 Бат 10/40 цаасан (өөр ангийн).
final resultRows = [
  resultRow('r1', 's1', 'Анар', 'Бат', total: 36),
  resultRow('r2', 's2', 'Өлзий', 'Дорж', total: 30, source: 'ONLINE_TEST', leave: 2),
  resultRow('r4', 's4', 'Болд', 'Сүх', total: 10),
];

Map<String, Object?> rosterEntry(String id, String first, String last) => {
  'student': {'id': id, 'firstName': first, 'lastName': last, 'studentCode': 'B2712000${id.substring(1)}'},
  'status': null,
};

/// Хариуны түлхүүр, бодолт агуулсан хариу — апп эдгээрийг ХАРУУЛАХГҮЙ байх ёстой.
final testMetaJson = {
  'id': 't1',
  'title': 'Тэгшитгэл A',
  'type': 'CHAPTER_EXAM',
  'access': [
    {'classroomId': 'c1'},
  ],
  'problems': [
    {
      'problem': {'correctAnswer': 'НУУЦ-ХАРИУ', 'statementText': 'НУУЦ-БОДЛОГО'},
    },
  ],
};

Map<String, Object?> item(
  String key,
  String label, {
  int part = 1,
  int? percent,
  int marked = 10,
  int correct = 5,
  Map<String, int>? counts,
  String? mostWrong,
  String? disc,
}) => {
  'key': key,
  'label': label,
  'part': part,
  'points': 1,
  'order': int.tryParse(label) ?? 1,
  'problemId': 'p$key',
  'group': null,
  'marked': marked,
  'correct': correct,
  'blank': 0,
  'percent': percent,
  'choices': counts == null
      ? null
      : {
          'counts': counts,
          'blank': 1,
          'total': 10,
          'correct': 'B',
          'mostWrong': mostWrong == null ? null : {'letter': mostWrong, 'count': 4, 'note': 'Тэмдэг андуурсан'},
        },
  'discrimination': disc == null ? null : {'value': 0.1, 'label': disc},
};

Map<String, Object?> analyticsJson({String? classroomId}) => {
  'test': {'id': 't1', 'title': 'Тэгшитгэл A', 'type': 'CHAPTER_EXAM'},
  'classroomId': classroomId,
  'chips': [
    {'id': 'c1', 'name': '12А'},
    {'id': 'c2', 'name': '11Б'},
  ],
  'canEditContent': true,
  'summary': {'students': 12, 'absent': 1, 'taken': 10, 'pending': 1, 'avg': 62.4, 'median': 65, 'max': 95, 'min': 20},
  'histogram': [1, 1, 3, 3, 2],
  'classes': [
    {'id': 'c1', 'name': '12А', 'students': 7, 'taken': 6, 'avg': 70},
    {'id': 'c2', 'name': '11Б', 'students': 5, 'taken': 4, 'avg': 50},
  ],
  'reliability': {'value': 0.81, 'level': 'GOOD'},
  'topics': [
    {'key': 'a', 'name': 'Шугаман тэгшитгэл', 'items': 3, 'earned': 2, 'max': 3, 'percent': 66},
    {'key': 'b', 'name': 'Квадрат тэгшитгэл', 'items': 2, 'earned': 1, 'max': 2, 'percent': 30},
  ],
  'items': [
    item('1', '1', percent: 90, correct: 9, counts: {'A': 0, 'B': 9, 'C': 1}, disc: 'GOOD'),
    item('2', '2', percent: 20, correct: 2, counts: {'A': 1, 'B': 2, 'C': 6}, mostWrong: 'C', disc: 'PROBLEM'),
  ],
  'attention': ['2', '1'],
  'markedStudents': 10,
  'onlineStudents': 6,
  'problems': [
    {'problemId': 'p1', 'correctAnswer': 'НУУЦ-ХАРИУ', 'solution': 'НУУЦ-БОДОЛТ'},
  ],
};

final attemptJson = {
  'student': {'id': 's1', 'firstName': 'Анар', 'lastName': 'Бат'},
  'absent': false,
  'result': {'totalScore': 36, 'maxScore': 40, 'percent': 90},
  'parts': {'part1': 30, 'part1Max': 32, 'part2': 6, 'part2Max': 8},
  'topics': [
    {'key': 'a', 'name': 'Шугаман тэгшитгэл', 'items': 3, 'earned': 3, 'max': 3, 'percent': 100},
  ],
  'wrong': [
    {'key': '7', 'label': '7', 'part': 1, 'points': 1, 'status': 'WRONG'},
    {'key': '9', 'label': '9', 'part': 1, 'points': 1, 'status': 'BLANK'},
  ],
  'trend': [
    {
      'testId': 't1',
      'title': 'Тэгшитгэл A',
      'type': 'CHAPTER_EXAM',
      'at': '2026-11-03T02:00:00.000Z',
      'percent': 90,
      'current': true,
    },
    {
      'testId': 't0',
      'title': 'Олонлог B',
      'type': 'CHAPTER_EXAM',
      'at': '2026-10-20T02:00:00.000Z',
      'percent': 55,
      'current': false,
    },
  ],
};

/// Дүнгийн үндсэн mock API.
FakeHttp resultsHttp({List<Map<String, Object?>>? rows}) => FakeHttp()
  ..json('GET', '/tests/t1/results', rows ?? resultRows)
  ..json('GET', '/tests/t1', testMetaJson)
  ..json('GET', '/classrooms', [
    {'id': 'c1', 'name': '12А'},
    {'id': 'c2', 'name': '11Б'},
  ])
  ..json('GET', '/classrooms/c1/attendance', [
    rosterEntry('s1', 'Анар', 'Бат'),
    rosterEntry('s2', 'Өлзий', 'Дорж'),
    rosterEntry('s3', 'Нараа', 'Ган'),
  ])
  ..json('GET', '/classrooms/c2/attendance', [rosterEntry('s4', 'Болд', 'Сүх')])
  ..on(
    'GET',
    '/exams/t1/analytics',
    (r) => FakeResponse(analyticsJson(classroomId: r.queryParameters['classroomId'] as String?)),
  )
  ..json('GET', '/exams/t1/students/s1', attemptJson)
  ..json('POST', '/tests/t1/results', {'id': 'new'})
  ..json('GET', '/users/search', [
    {'id': 's9', 'firstName': 'Тэмүүлэн', 'lastName': 'Очир', 'studentCode': 'B27120009', 'username': null},
  ]);

Future<void> pumpResults(
  WidgetTester tester,
  Widget screen, {
  required FakeHttp http,
  String role = 'TEACHER',
  Size size = const Size(390, 844),
  List<Override> overrides = const [],
}) => pumpClassrooms(
  tester,
  screen,
  http: http,
  role: role,
  size: size,
  overrides: [resultsTodayProvider.overrideWithValue(resultsToday), ...overrides],
);

/// Хэвтээ жагсаалтын чипийг (lazy) гүйлгэж харагдуулаад дарна.
Future<void> tapScrolledChip(WidgetTester tester, Key key) async {
  final chip = find.byKey(key);
  if (chip.evaluate().isEmpty) {
    final id = (key as ValueKey<String>).value;
    final prefix = '${id.split(':').first}:';
    final first = find
        .byWidgetPredicate((w) => w.key is ValueKey<String> && (w.key! as ValueKey<String>).value.startsWith(prefix))
        .first;
    final row = find.ancestor(of: first, matching: find.byType(Scrollable)).first;
    await tester.drag(row, const Offset(2000, 0));
    await settle(tester, frames: 4);
    await tester.scrollUntilVisible(chip, 80, scrollable: row);
  }
  await tester.ensureVisible(chip);
  await settle(tester, frames: 4);
  await tester.tap(chip);
  await settle(tester);
}

/// Босоо гүйлгэгч (хамгийн дотор талынх).
Finder verticalScroll() => find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).last;
