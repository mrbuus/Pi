import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/online_students/application/online_providers.dart';

import '../../helpers/fake_http.dart';
import '../classrooms_admin/classrooms_fixtures.dart' show pumpClassrooms;

export '../classrooms_admin/classrooms_fixtures.dart' show requestBody, settle;

/// 2026-11-04 10:00 UB (02:00 UTC). Зохиомол өгөгдөл.
final onlineNow = DateTime.utc(2026, 11, 4, 2);

Map<String, Object?> onlineRow(
  String id,
  String name, {
  String engagement = 'ACTIVE',
  String? passExpires = '2026-12-31T00:00:00.000Z',
  String? lastActive = '2026-11-03T02:00:00.000Z',
  int last30d = 12,
  int? success = 75,
}) => {
  'studentId': id,
  'studentCode': 'B2712${id.padLeft(4, '0')}',
  'name': name,
  'grade': 11,
  'activePass': passExpires == null ? null : {'name': 'Онлайн 3 сар', 'expiresAt': passExpires},
  'lastActiveAt': lastActive,
  'problemsAttempted': {'last7d': 3, 'last30d': last30d},
  'successRate': success,
  'testsTaken': 2,
  'engagement': engagement,
};

final onlineRows = [
  onlineRow('o2', 'Бат Анар'),
  onlineRow('o1', 'Ган Сод', engagement: 'DORMANT', lastActive: '2026-09-01T02:00:00.000Z', last30d: 0, success: null),
  onlineRow('o3', 'Дорж Нараа', engagement: 'SLOWING', passExpires: null),
];

final detailJson = {
  'student': {'id': 'o1', 'studentCode': 'B27120001', 'name': 'Ган Сод', 'grade': 11, 'school': '1-р сургууль'},
  'activePass': {'name': 'Онлайн 3 сар', 'expiresAt': '2026-11-08T00:00:00.000Z'},
  'passHistory': [
    {'name': 'Онлайн 1 сар', 'startsAt': '2026-08-01T00:00:00.000Z', 'expiresAt': '2026-09-01T00:00:00.000Z'},
    {'name': 'Онлайн 3 сар', 'startsAt': '2026-09-01T00:00:00.000Z', 'expiresAt': '2026-11-08T00:00:00.000Z'},
  ],
  'streak': {'currentStreak': 4, 'longestStreak': 9, 'totalActiveDays': 40},
  'dailyActivity': {
    'year': 2026,
    'totalActiveDays': 40,
    'days': [
      {'date': '2026-11-02', 'count': 5, 'level': 3, 'isHoliday': false, 'isClassDay': false},
      {'date': '2026-11-03', 'count': 0, 'level': 0, 'isHoliday': false, 'isClassDay': false},
      {'date': '2026-11-05', 'count': 9, 'level': 4, 'isHoliday': false, 'isClassDay': false},
    ],
  },
  'chapters': [
    {
      'chapterId': 'ch1',
      'title': 'Квадрат тэгшитгэл',
      'theoryRead': true,
      'videosWatched': 2,
      'problemsAttempted': 10,
      'problemsCorrect': 8,
      'successRate': 80,
    },
    {
      'chapterId': 'ch2',
      'title': 'Олонлог',
      'theoryRead': false,
      'videosWatched': 0,
      'problemsAttempted': 10,
      'problemsCorrect': 3,
      'successRate': 30,
    },
  ],
  'weakestTopics': [
    {'tag': 'Дискриминант', 'type': 'SKILL', 'attempts': 6, 'successRate': 20},
  ],
  'tests': [
    {
      'testId': 't1',
      'title': 'Тэгшитгэл A',
      'type': 'CHAPTER_EXAM',
      'totalScore': 30,
      'maxScore': 40,
      'createdAt': '2026-11-01T02:00:00.000Z',
    },
  ],
};

final timelineJson = {
  'items': [
    {
      'kind': 'ATTEMPT',
      'at': '2026-11-02T03:00:00.000Z',
      'source': 'EVENING_SELF_REPORT',
      'problemToken': 'НУУЦ-ТОКЕН',
      'chapterTitle': 'Олонлог',
      'selfState': 'FAILED',
      'autoCorrect': false,
      'attemptId': 'a1',
    },
    {
      'kind': 'ATTEMPT',
      'at': '2026-11-02T02:30:00.000Z',
      'source': 'ONLINE_TEST',
      'problemToken': 'НУУЦ-ТОКЕН',
      'chapterTitle': 'Квадрат тэгшитгэл',
      'selfState': 'SOLVED_CLEAN',
      'autoCorrect': true,
    },
    {'kind': 'EVENT', 'at': '2026-11-02T02:00:00.000Z', 'type': 'CHAPTER_OPENED', 'durationMs': 180000},
  ],
};

FakeHttp onlineHttp() => FakeHttp()
  ..on('GET', '/progress/online-students', (r) {
    final q = r.queryParameters;
    final rows = q['activity'] == 'DORMANT' && q['passStatus'] == 'ACTIVE' ? [onlineRows[1]] : onlineRows;
    return FakeResponse({'page': 1, 'pageSize': 50, 'total': rows.length, 'items': rows});
  })
  ..json('GET', '/progress/student/o1', detailJson)
  ..json('GET', '/progress/student/o1/timeline', timelineJson)
  ..json('GET', '/tests', [
    {
      'id': 't1',
      'title': 'Тэгшитгэл A',
      'type': 'CHAPTER_EXAM',
      'chapter': {'title': 'Тэгшитгэл'},
    },
    {'id': 't2', 'title': 'Олонлог B', 'type': 'CHAPTER_EXAM', 'chapter': null},
  ])
  ..json('POST', '/progress/student/o1/assign-test', {'granted': true})
  ..json('PATCH', '/progress/student/o1/attempt/a1', {'id': 'a1'});

Future<void> pumpOnline(
  WidgetTester tester,
  Widget screen, {
  required FakeHttp http,
  String role = 'TEACHER',
  List<Override> overrides = const [],
}) => pumpClassrooms(
  tester,
  screen,
  http: http,
  role: role,
  overrides: [onlineNowProvider.overrideWithValue(onlineNow), ...overrides],
);

Finder verticalScroll() => find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).last;
