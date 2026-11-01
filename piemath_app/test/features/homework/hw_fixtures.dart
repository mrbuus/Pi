/// Зохиомол өгөгдөл (жинхэнэ сурагчийн мэдээлэл биш) — `docs/api-contract/homework.md`-ийн бүтцээр.
library;

Map<String, Object?> _day(
  String date, {
  bool upcoming = false,
  String? mark,
  String? comment,
  Map<String, Object?>? photo,
  List<Map<String, Object?>> items = const [],
  String? topic,
  String? deadlineAt,
}) => {
  'date': date,
  'classroomId': 'c1',
  'classroomName': '12-р анги, Үдээс хойш',
  'deadlineAt': deadlineAt,
  'items': items,
  'photo': photo,
  'mark': mark,
  'markComment': comment,
  'upcoming': upcoming,
  'topic': topic,
};

Map<String, Object?> hwItem({String status = 'NOT_STARTED', Map<String, Object?>? score}) => {
  'testId': 't1',
  'title': '100x100 V3 · Логарифм 3-B',
  'variantLabel': 'B',
  'problemCount': 10,
  'timeLimitMin': 40,
  'status': status,
  'attemptId': null,
  'checksUsed': 0,
  'maxChecks': 2,
  'score': score,
  'submittedAt': null,
  'late': false,
};

List<Map<String, Object?>> fixtureDays() => [
  _day('2026-11-02', topic: 'Логарифмын тэгшитгэл', items: [hwItem()]),
  _day('2026-11-04', upcoming: true),
  _day('2026-11-06', upcoming: true),
  _day(
    '2026-10-30',
    mark: 'DONE',
    comment: 'Сайн байна',
    deadlineAt: '2026-11-01T16:00:00.000Z',
    photo: {'id': 'ph1', 'fileKey': 'f1.pdf', 'pages': 3, 'uploadedAt': '2026-10-30T10:00:00.000Z'},
    items: [hwItem(status: 'SUBMITTED', score: {'correct': 8, 'total': 10})],
  ),
  _day('2026-10-10', mark: 'NOT_DONE'),
];

List<Map<String, Object?>> fixtureAssignments() => [
  {
    'id': 'a1',
    'classroomId': 'c2',
    'type': 'DAILY',
    'title': 'Логарифмын даалгавар',
    'description': r'$\log_2 8$-ийг бод',
    'imageKeys': ['t1.jpg'],
    'dueDate': '2026-11-03T15:59:00.000Z',
    'createdById': 'x',
    'createdAt': '2026-10-26T10:00:00.000Z',
    'lessonDate': '2026-10-26T00:00:00.000Z',
    'deletedAt': null,
    'lesson': {
      'date': '2026-10-26',
      'weekday': 'Даваа',
      'dateText': '10-р сарын 26',
      'topic': 'Логарифм',
      'label': '10-р сарын 26 — Логарифм',
    },
    'classroom': {'id': 'c2', 'name': 'Онлайн 11', 'type': 'ONLINE'},
    'canSubmit': true,
    'myStatus': 'RETURNED',
    'mySubmission': {
      'state': 'RETURNED',
      'note': null,
      'studentNote': 'Хийлээ',
      'reviewNote': 'Зураг бүдэг байна',
      'revisions': <Object?>[],
      'imageKeys': ['s1.pdf'],
      'submittedAt': '2026-10-27T10:00:00.000Z',
      'checkedAt': '2026-10-27T12:00:00.000Z',
    },
  },
  {
    'id': 'a2',
    'classroomId': 'c2',
    'type': 'EXTRA',
    'title': 'Нэмэлт даалгавар',
    'description': null,
    'imageKeys': <String>[],
    'dueDate': null,
    'createdById': 'x',
    'createdAt': '2026-10-28T10:00:00.000Z',
    'lessonDate': null,
    'deletedAt': null,
    'lesson': {'date': '2026-10-28', 'weekday': 'Лхагва', 'dateText': '10-р сарын 28', 'topic': null, 'label': '10-р сарын 28-ны даалгавар'},
    'classroom': {'id': 'c2', 'name': 'Онлайн 11', 'type': 'ONLINE'},
    'canSubmit': true,
    'myStatus': 'NOT_DONE',
    'mySubmission': null,
  },
];

Map<String, Object?> fixtureAttempt({String status = 'IN_PROGRESS'}) => {
  'attemptId': 'at1',
  'status': status,
  'startedAt': '2026-11-02T10:00:00.000Z',
  'deadlineAt': '2026-11-02T10:40:00.000Z',
  'remainingSec': status == 'SUBMITTED' ? null : 600,
  'checksUsed': 0,
  'score': status == 'SUBMITTED' ? {'correct': 2, 'total': 3} : null,
  'maxChecks': 2,
  'problems': [
    {'id': 'p2', 'order': 2, 'format': 'CHOICE', 'statementText': r'$2^x = 8$ бол $x$ хэд вэ', 'imageKey': null,
      'choices': [
        for (final (l, t) in [('A', '1'), ('B', '2'), ('C', '3'), ('D', '4'), ('E', '5')]) {'label': l, 'text': t, 'imageKey': null},
      ]},
    {'id': 'p1', 'order': 1, 'format': 'FILL_NUMBER', 'statementText': r'$5 \cdot 7$ хэд вэ', 'imageKey': null, 'choices': null},
    {'id': 'p3', 'order': 3, 'format': 'FILL_NUMBER', 'statementText': 'Хоёр язгуурыг ол', 'imageKey': null, 'choices': null, 'fillSlots': ['a', 'b']},
  ],
  'answers': {'p1': '35'},
  'lastCheck': status == 'SUBMITTED' ? {'p1': 'CORRECT', 'p2': 'CORRECT', 'p3': 'WRONG'} : null,
};
