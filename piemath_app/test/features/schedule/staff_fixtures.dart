import '../../helpers/fake_http.dart';

// Ажилтны хуваарийн зохиомол өгөгдөл (жинхэнэ багш, сурагчийн нэр биш).

Map<String, Object?> lessonJson({
  required String id,
  required String date,
  String classroomId = 'c1',
  String classroomName = '12-1 (Баруун 4)',
  int start = 600,
  int end = 720,
  String? room = '501',
  String? teacherId = 't1',
  Map<String, Object?>? lead,
  bool mine = false,
  String? topic,
}) => {
  'scheduleId': id,
  'classroomId': classroomId,
  'classroomName': classroomName,
  'teacherId': teacherId,
  'teacherName': 'Сарнай Бат',
  'teacherRole': 'TEACHER',
  'startMinute': start,
  'endMinute': end,
  'room': room,
  'subject': 'MATH',
  'topic': topic,
  'leadTeacher': lead,
  'assistantTeacher': null,
  'exception': null,
  'occurrenceDate': date,
  'students': 20,
  'mine': mine,
  'plan': null,
  'previous': null,
  'done': <Object?>[],
  'note': null,
  'record': null,
  'dismissalAt': null,
};

Map<String, Object?> dayPlanJson(String date, {bool canPlan = false, List<Map<String, Object?>>? entries}) => {
  'date': date,
  'today': date,
  'isHoliday': false,
  'holiday': null,
  'restingClasses': <Object?>[],
  'viewer': {'role': canPlan ? 'TEACHER_PLUS' : 'TEACHER', 'canPlan': canPlan, 'canConfirm': true},
  'roster': {
    'parity': 1,
    'mode': 'ALTERNATING',
    'inRange': true,
    'teachers': [
      {'id': 't1', 'name': 'Сарнай', 'role': 'TEACHER'},
    ],
  },
  'entries':
      entries ??
      [
        lessonJson(id: 's1', date: date),
        lessonJson(
          id: 's2',
          date: date,
          classroomId: 'c2',
          classroomName: '11-2 (Зүүн 4)',
          start: 840,
          end: 960,
          room: '301',
          teacherId: 't2',
        ),
      ],
  'tests': <String, Object?>{},
};

const teachersJson = [
  {'id': 't1', 'firstName': 'Сарнай', 'lastName': 'Бат', 'role': 'TEACHER', 'displayName': 'Сарнай'},
  {'id': 't2', 'firstName': 'Болд', 'lastName': 'Дорж', 'role': 'TEACHER_PLUS', 'displayName': 'Болд'},
];

const classroomsJson = [
  {
    'id': 'c1',
    'name': '12-1 (Баруун 4)',
    'teacher': {'id': 't1', 'firstName': 'Сарнай', 'lastName': 'Бат'},
    '_count': {'enrollments': 20},
  },
  {
    'id': 'c2',
    'name': '11-2 (Зүүн 4)',
    'teacher': {'id': 't2', 'firstName': 'Болд', 'lastName': 'Дорж'},
    '_count': {'enrollments': 30},
  },
];

Map<String, Object?> workDaysJson() => {
  'workDays': [
    {
      'id': 'w1',
      'teacherId': 't1',
      'weekday': 1,
      'parity': 0,
      'sortOrder': 0,
      'note': null,
      'teacher': {'id': 't1', 'firstName': 'Сарнай', 'lastName': 'Бат', 'role': 'TEACHER'},
    },
  ],
  'exceptions': [
    {
      'id': 'x1',
      'teacherId': 't2',
      'date': '2026-11-05T00:00:00.000Z',
      'working': false,
      'note': 'Чөлөө',
      'teacher': {'id': 't2', 'firstName': 'Болд', 'lastName': 'Дорж', 'role': 'TEACHER_PLUS'},
    },
  ],
  'parityAnchor': '2026-08-31',
  'config': {'mode': 'FIXED', 'validFrom': null, 'validTo': null},
};

Map<String, Object?> slotJson(String id, {int weekday = 1, String classroomId = 'c1', String from = '2026-09-01'}) => {
  'id': id,
  'classroomId': classroomId,
  'weekday': weekday,
  'startMinute': 600,
  'endMinute': 720,
  'teacherId': 't1',
  'room': '501',
  'subject': 'MATH',
  'effectiveFrom': '${from}T00:00:00.000Z',
  'effectiveTo': null,
  'classroom': {
    'id': classroomId,
    'name': classroomId == 'c1' ? '12-1 (Баруун 4)' : '11-2 (Зүүн 4)',
    '_count': {'enrollments': 20},
  },
  'teacher': {'id': 't1', 'firstName': 'Сарнай', 'lastName': 'Бат', 'role': 'TEACHER'},
};

/// Бүх уншилтын замтай хуурамч сервер. `day-plan` хүссэн огноогоо буцаана.
FakeHttp staffHttp({bool canPlan = false, Map<String, Object?>? caps, List<Map<String, Object?>>? slots}) => FakeHttp()
  ..on(
    'GET',
    '/schedule/day-plan',
    (r) => FakeResponse(dayPlanJson(r.queryParameters['date']! as String, canPlan: canPlan)),
  )
  ..on('GET', '/schedule/week', (r) => FakeResponse({'start': r.queryParameters['start'], 'days': <Object?>[]}))
  ..json('GET', '/schedule/teachers', teachersJson)
  ..json('GET', '/classrooms', classroomsJson)
  ..json('GET', '/schedule', slots ?? [for (var d = 0; d < 7; d++) slotJson('p$d', weekday: d)])
  ..json('GET', '/schedule/teacher-workdays', workDaysJson())
  ..json('GET', '/calendar', <Object?>[])
  ..json('GET', '/staff-capabilities/me', caps ?? {'administrator': false, 'grants': <Object?>[]})
  ..json('POST', '/schedule/s1/exceptions', {'id': 'e1'})
  ..json('PUT', '/schedule/s1/staffing', {'ok': true})
  ..json('DELETE', '/schedule/s1', {'removed': true})
  ..json('PUT', '/schedule/teacher-workdays', {'ok': true});
