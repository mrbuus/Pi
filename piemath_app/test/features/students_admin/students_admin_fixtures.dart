import '../../helpers/fake_http.dart';

/// Зохиомол сурагчид (жинхэнэ нэр, утас биш).
Map<String, Object?> studentJson(
  String id, {
  String first = 'Сурагч',
  String last = 'Тест',
  String? code,
  String? phone,
  String? classId,
  String? className,
  int? grade = 10,
  String? branch,
  String? plan,
  int? amount,
  bool archived = false,
  String? reason,
}) => {
  'id': id,
  'role': 'STUDENT',
  'firstName': first,
  'lastName': last,
  'studentCode': code,
  'phone': phone,
  'lastSeenAt': null,
  if (archived) ...{'archivedAt': '2026-10-30T02:00:00.000Z', 'archiveReason': reason},
  'studentProfile': {
    'grade': grade,
    'branch': branch,
    'section': null,
    'school': null,
    'tuitionPlan': plan,
    'tuitionAmount': amount,
    'joinedOn': '2026-09-01T00:00:00.000Z',
  },
  if (archived)
    'lastClassroom': classId == null ? null : {'id': classId, 'name': className ?? classId}
  else
    'currentClassroom': classId == null ? null : {'id': classId, 'name': className ?? classId},
};

/// 3 идэвхтэй сурагч: Бат (10А, дутуу), Дорж (10А, хэвийн), Цэцэг (ангигүй, Нийгэм).
List<Map<String, Object?>> activeStudents() => [
  studentJson(
    's1',
    first: 'Бат',
    last: 'Болд',
    code: 'SIE-26-M-0001',
    phone: '99110001',
    classId: 'c1',
    className: '10А',
    branch: 'Баруун 4',
    plan: 'MONTHLY',
    amount: 300000,
  ),
  studentJson(
    's2',
    first: 'Дорж',
    last: 'Ганаа',
    code: 'SIE-26-M-0002',
    phone: '99110002',
    classId: 'c1',
    className: '10А',
    grade: 11,
    branch: 'Зүүн 4',
    plan: 'FULL_YEAR',
  ),
  studentJson('s3', first: 'Цэцэг', last: 'Сараа', code: 'SIE-26-N-0003', phone: '99110003', grade: 9),
];

const outstandingRows = [
  {'studentId': 's1', 'shortfall': 50000},
];

const attentionJson = {
  'unassigned': [
    {
      'id': 's3',
      'firstName': 'Цэцэг',
      'lastName': 'Сараа',
      'studentCode': 'SIE-26-N-0003',
      'waitingSince': '2026-10-20',
    },
  ],
  'notAttending': [
    {
      'id': 's2',
      'firstName': 'Дорж',
      'lastName': 'Ганаа',
      'studentCode': 'SIE-26-M-0002',
      'classroomId': 'c1',
      'classroomName': '10А',
      'lastAttended': null,
      'missedCount': 4,
    },
  ],
};

/// Сурагчдын жагсаалтын бүх хариутай mock API.
FakeHttp studentsHttp({bool finance = true}) => FakeHttp()
  ..on('GET', '/users', (o) {
    final archived = o.queryParameters['archived'] == 'true';
    return FakeResponse(
      archived
          ? [
              studentJson(
                'a1',
                first: 'Номин',
                last: 'Архив',
                classId: 'c2',
                className: '9Б',
                archived: true,
                reason: 'Давхар бүртгэл',
              ),
            ]
          : activeStudents(),
    );
  })
  ..json('GET', '/payments/outstanding', outstandingRows)
  ..json('GET', '/classrooms/attention-students', attentionJson)
  ..json('GET', '/staff-capabilities/me', {
    'administrator': false,
    'grants': [
      if (finance) {'capability': 'finance.manage', 'scopeKey': ''},
    ],
  })
  ..json('GET', '/classrooms', [
    {
      'id': 'c1',
      'name': '10А',
      'grade': 10,
      '_count': {'enrollments': 2},
    },
    {
      'id': 'c2',
      'name': '9Б',
      'grade': 9,
      '_count': {'enrollments': 5},
    },
  ]);

Map<String, Object?> withdrawalPreviewJson({int refund = 0}) => {
  'student': {'id': 's1', 'firstName': 'Бат', 'lastName': 'Болд'},
  'classroom': {'id': 'c1', 'name': '10А'},
  'plan': {'kind': 'FULL_YEAR', 'autoFull': true, 'settled': false, 'price': 3000000},
  'monthlyFee': 300000,
  'lessonsPerMonth': 12,
  'daysPerWeek': 3,
  'startDate': '2026-09-01',
  'countFrom': '2026-09-01',
  'leftOn': '2026-11-03',
  'payments': [
    {'amount': 600000, 'paidOn': '2026-09-02', 'forMonth': null},
  ],
  'result': {
    'cycles': [
      {
        'start': '2026-09-01',
        'end': '2026-09-30',
        'full': true,
        'lessons': 12,
        'leaveDay': null,
        'extraDays': <String>[],
        'counted': 12,
        'charge': 300000,
      },
      {
        'start': '2026-10-01',
        'end': '2026-10-31',
        'full': false,
        'lessons': 5,
        'leaveDay': '2026-10-08',
        'extraDays': <String>[],
        'counted': 4,
        'charge': 100000,
      },
    ],
    'perLesson': 25000,
    'fullMonths': 1,
    'owed': 400000,
    'paid': 600000,
    'refund': refund,
    'over': 0,
  },
  'lastCycleDays': [
    {'date': '2026-10-08', 'status': 'EXCUSED', 'note': null, 'leave': true, 'excluded': false},
    {'date': '2026-10-10', 'status': 'PRESENT', 'note': null, 'leave': false, 'excluded': false},
  ],
  'history': {
    'lessons': 17,
    'attendance': {'PRESENT': 15, 'EXCUSED': 1, 'ABSENT': 1},
    'homework': {'DONE': 14, 'NOT_DONE': 3},
  },
};
