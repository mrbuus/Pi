// Сурагчийн өдөр тутмын хэсгийн тестийн өгөгдөл — api-contract-ийн бүтцээр, ЗОХИОМОЛ нэрс.

Map<String, Object?> overviewJson({bool inClass = true, bool withToday = true, bool withMark = true}) => {
      'classrooms': inClass
          ? [
              {'id': 'c1', 'name': '12-р анги, Үдээс хойш'},
            ]
          : <Object?>[],
      'attendance': {'total': 20, 'PRESENT': 15, 'LATE': 2, 'ABSENT': 2, 'EXCUSED': 1, 'rate': 85},
      'homework': {'total': 10, 'DONE': 6, 'PARTIAL': 2, 'NOT_DONE': 2, 'rate': 70},
      'today': withToday
          ? {
              'classroomId': 'c1',
              'classroomName': '12-р анги, Үдээс хойш',
              'date': '2026-11-02',
              'startMinute': 900,
              'endMinute': 1020,
              'room': '501',
              'topic': 'Логарифм тэгшитгэл',
            }
          : null,
      'latestMark': withMark
          ? {
              'date': '2026-10-30',
              'status': 'PARTIAL',
              'comment': 'Сүүлийн 3 бодлогоо дуусгаарай',
              'classroomId': 'c1',
              'lessonDate': '2026-10-28',
            }
          : null,
    };

Map<String, Object?> dayJson({
  String date = '2026-10-30',
  String classroomId = 'c1',
  String? topic = 'Илтгэгч функц',
  String? attendance = 'PRESENT',
  String? lateRange,
  String? homework = 'DONE',
  List<Map<String, Object?>>? tests,
  bool canSend = true,
}) =>
    {
      'date': date,
      'classroomId': classroomId,
      'classroomName': '12-р анги, Үдээс хойш',
      'startMinute': 900,
      'endMinute': 1020,
      'room': '501',
      'topic': topic,
      'teachers': ['Б. Сараа+'],
      'problemNumbers': '12; 14; 15',
      'tests': tests ??
          [
            {'testId': 't1', 'title': '100x100 V3 · Илтгэгч 2-B', 'variant': 'B', 'open': true, 'closedReason': null},
            {'testId': 't2', 'title': 'Логарифм 1', 'variant': 'A', 'open': false, 'closedReason': 'TOMORROW'},
          ],
      'attendance': attendance == null ? null : {'status': attendance, 'lateRange': lateRange},
      'homework': {'status': homework, 'comment': homework == null ? null : 'Сайн хийжээ', 'checkedOn': '2026-11-01'},
      'theory': {'count': 2, 'mine': false, 'canUpload': true, 'assignedToMe': true},
      'homeworkPhoto': null,
      'canSendHomework': canSend,
    };

Map<String, Object?> daysJson({
  String month = '2026-11',
  String? prev = '2026-10',
  String? next,
  List<Map<String, Object?>>? days,
}) =>
    {
      'month': month,
      'prevMonth': prev,
      'nextMonth': next,
      'days': days ??
          [
            dayJson(date: '$month-02', attendance: 'LATE', lateRange: 'TEN_TO_THIRTY', homework: null),
            dayJson(date: '$month-01', homework: 'NOT_DONE'),
          ],
    };

List<Map<String, Object?>> testsJson() => [
      {
        'testId': 't1',
        'title': '100x100 V3 · Илтгэгч 2-B',
        'variant': 'B',
        'date': '2026-10-30',
        'classroomName': '12-р анги',
        'problemCount': 10,
        'open': true,
        'closedReason': null,
      },
      {
        'testId': 't2',
        'title': 'Логарифм 1',
        'variant': null,
        'date': '2026-11-02',
        'classroomName': '12-р анги',
        'problemCount': 8,
        'open': false,
        'closedReason': 'TOMORROW',
      },
      {
        'testId': null,
        'title': 'Гарааны тест',
        'variant': null,
        'date': '2026-09-15',
        'classroomName': '12-р анги',
        'problemCount': 0,
        'open': false,
        'closedReason': 'NOT_AVAILABLE',
      },
    ];

Map<String, Object?> testDetailJson() => {
      'testId': 't1',
      'title': 'Илтгэгч 2-B',
      'variant': 'B',
      'date': '2026-10-30',
      'problems': [
        {
          'id': 'p2',
          'order': 2,
          'stem': r'Тэгшитгэл бод: $x + 1 = 3$',
          'imageKey': null,
          'choices': <Object?>[],
          'correctAnswer': 'x = 2',
          'hasVideo': false,
        },
        {
          'id': 'p1',
          'order': 1,
          'stem': r'Утгыг ол: $2^{3}$',
          'imageKey': null,
          'choices': [
            {'label': 'A', 'text': r'$6$', 'imageKey': null},
            {'label': 'B', 'text': r'$8$', 'imageKey': null},
            {'label': 'C', 'text': r'$9$', 'imageKey': null},
          ],
          'correctAnswer': 'B',
          'hasVideo': true,
        },
      ],
    };

List<Map<String, Object?>> attendanceJson() => [
      {'date': '2026-11-02T00:00:00.000Z', 'status': 'LATE', 'lateRange': 'FIVE_TO_TEN', 'classroom': {'id': 'c1', 'name': '12-р анги'}},
      {'date': '2026-10-30T00:00:00.000Z', 'status': 'PRESENT', 'lateRange': null, 'classroom': {'id': 'c1', 'name': '12-р анги'}},
      {'date': '2026-10-28T00:00:00.000Z', 'status': 'ABSENT', 'lateRange': null, 'classroom': null},
      {'date': '2026-09-15T00:00:00.000Z', 'status': 'EXCUSED', 'lateRange': null, 'classroom': {'id': 'c1', 'name': '12-р анги'}},
    ];

List<Map<String, Object?>> makeupJson({bool withPending = true}) => [
      if (withPending)
        {
          'classroomId': 'c1',
          'classroomName': '12-р анги',
          'date': '2026-10-28',
          'reason': 'ABSENT',
          'status': 'PENDING',
          'photos': 0,
          'imageKeys': <Object?>[],
          'submittedAt': null,
          'resubmit': true,
          'photosAccepted': false,
          'tests': [
            {'testId': 'm1', 'title': 'Илтгэгч 2-A', 'variant': 'A', 'done': false, 'inClass': false, 'online': true, 'open': false},
            {'testId': 'm2', 'title': 'Илтгэгч 2-B', 'variant': 'B', 'done': true, 'inClass': false, 'online': true, 'open': true},
            {'testId': 'm3', 'title': 'Гараар дүгнэх', 'variant': null, 'done': false, 'inClass': false, 'online': false, 'open': false},
          ],
        },
      {
        'classroomId': 'c1',
        'classroomName': '12-р анги',
        'date': '2026-10-10',
        'reason': 'LATE',
        'status': 'DONE',
        'photos': 2,
        'imageKeys': ['a.jpg', 'b.jpg'],
        'submittedAt': '2026-10-11T03:00:00.000Z',
        'resubmit': false,
        'photosAccepted': true,
        'tests': <Object?>[],
      },
    ];

Map<String, Object?> theoryDayJson({bool photos = true}) => {
      'classroomId': 'c1',
      'classroomName': '12-р анги',
      'date': '2026-10-30',
      'upcoming': false,
      'topic': 'Илтгэгч функц',
      'tests': <Object?>[],
      'uploader': {'name': 'Т. Ану', 'isMe': false},
      'canUpload': true,
      'assignedToMe': false,
      'photos': photos
          ? [
              {
                'id': 's1',
                'uploaderName': 'Т. Ану',
                'isMine': false,
                'isAssigned': true,
                'imageKeys': ['th1.jpg', 'th2.pdf'],
                'pages': 3,
                'createdAt': '2026-10-30T10:00:00.000Z',
              },
            ]
          : <Object?>[],
    };

Map<String, Object?> scheduleMeJson({bool enrolled = true}) => {
      'classroomId': enrolled ? 'c1' : null,
      'entries': enrolled
          ? [
              _entry('e1', 1, 900, '501'), // JS 1 = Даваа
              _entry('e2', 3, 900, '501'), // Лхагва
              _entry('e3', 0, 600, '403'), // JS 0 = Ням
            ]
          : <Object?>[],
    };

Map<String, Object?> _entry(String id, int weekday, int start, String room) => {
      'id': id,
      'classroomId': 'c1',
      'weekday': weekday,
      'startMinute': start,
      'endMinute': start + 120,
      'teacherId': 'tch1',
      'room': room,
      'subject': 'MATH',
      'effectiveFrom': '2026-09-01T00:00:00.000Z',
      'effectiveTo': null,
      'createdAt': '2026-08-20T00:00:00.000Z',
      'classroom': {
        'id': 'c1',
        'name': '12-р анги',
        '_count': {'enrollments': 18},
      },
      'teacher': {'id': 'tch1', 'firstName': 'Сараа', 'lastName': 'Очир', 'role': 'TEACHER_PLUS'},
    };

Map<String, Object?> weekJson(String start) {
  final base = DateTime.utc(int.parse(start.substring(0, 4)), int.parse(start.substring(5, 7)), int.parse(start.substring(8, 10)));
  String key(int i) => base.add(Duration(days: i)).toIso8601String().substring(0, 10);
  return {
    'start': start,
    'days': [
      for (var i = 0; i < 7; i++)
        {
          'date': key(i),
          'weekday': (i + 1) % 7, // Даваагаас эхэлсэн 7 хоног, JS дугаарлалт
          'isHoliday': i == 2,
          'holiday': i == 2 ? {'type': 'HOLIDAY', 'title': 'Үндэсний баяр'} : null,
          'restingClasses': <Object?>[],
          'entries': i == 0
              ? [
                  {
                    'scheduleId': 'e1',
                    'classroomId': 'c1',
                    'classroomName': '12-р анги',
                    'teacherId': 'tch1',
                    'teacherName': 'Очир Сараа',
                    'teacherRole': 'TEACHER_PLUS',
                    'startMinute': 900,
                    'endMinute': 1020,
                    'room': '501',
                    'subject': 'MATH',
                    'topic': 'Логарифм',
                    'leadTeacher': null,
                    'assistantTeacher': null,
                    'exception': null,
                  },
                ]
              : i == 4
                  ? [
                      {
                        'scheduleId': 'e2',
                        'classroomId': 'c1',
                        'classroomName': '12-р анги',
                        'teacherId': null,
                        'teacherName': null,
                        'teacherRole': null,
                        'startMinute': 600,
                        'endMinute': 720,
                        'room': null,
                        'subject': null,
                        'topic': null,
                        'leadTeacher': null,
                        'assistantTeacher': null,
                        'exception': {'kind': 'MOVED', 'note': null, 'originalDate': key(2)},
                      },
                    ]
                  : <Object?>[],
        },
    ],
    'teacherRoster': <Object?>[],
  };
}
