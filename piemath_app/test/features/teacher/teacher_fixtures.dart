// Багшийн хэсгийн зохиомол өгөгдөл (жинхэнэ сурагчийн нэр, утас биш).
import '../../helpers/fake_http.dart';

const testDate = '2026-11-02';

Map<String, Object?> student(String id, String first, String last) => {
  'id': id,
  'firstName': first,
  'lastName': last,
  'code': 'M$id',
  'joinedAt': '2026-09-01T00:00:00.000Z',
};

Map<String, Object?> boardJson({
  String type = 'IN_PERSON',
  List<Map<String, Object?>>? attendance,
  List<Map<String, Object?>>? homework,
  List<Map<String, Object?>>? students,
  String? holiday,
}) => {
  'date': testDate,
  'today': testDate,
  'classroom': {'id': 'c1', 'name': '12Б', 'type': type, 'grade': 12},
  'holiday': holiday,
  'lessons': [
    {'scheduleId': 'sch1', 'startMinute': 900, 'endMinute': 1020, 'room': '501', 'topic': 'Интеграл', 'mine': true},
  ],
  'students':
      students ?? [student('s1', 'Тэмүүжин', 'Бат'), student('s2', 'Анужин', 'Дорж'), student('s3', 'Сарнай', 'Ганаа')],
  'attendance': attendance ?? [],
  'homework': homework ?? [],
  'criteria': {
    'windowDays': 30,
    'minAttendance': 80,
    'maxAbsences': 3,
    'maxLates': 4,
    'minHomework': 60,
    'missingStreak': 2,
  },
  'risk': {
    's3': [
      {'kind': 'lates', 'label': '5 удаа хоцорсон'},
    ],
  },
  'sent': {'assignmentIds': <String>[], 'students': <String>[]},
  'recordedBy': {'attendance': <Object?>[], 'homework': <Object?>[]},
  'canEditCriteria': false,
};

Map<String, Object?> marksJson({List<Map<String, Object?>>? attendance, List<Map<String, Object?>>? homework}) => {
  'date': testDate,
  'attendance': attendance ?? [],
  'homework': homework ?? [],
  'criteria': {'windowDays': 30},
  'risk': <String, Object?>{},
  'sent': {'assignmentIds': <String>[], 'students': <String>[]},
  'recordedBy': {'attendance': <Object?>[], 'homework': <Object?>[]},
};

Map<String, Object?> attRow(String sid, String status, {String? note, String? lateRange, String by = 'Б. Болд'}) => {
  'studentId': sid,
  'status': status,
  'note': note,
  'lateRange': lateRange,
  'markedBy': by,
};

Map<String, Object?> hwRow(String sid, String? status, {String? comment}) => {
  'studentId': sid,
  'status': status,
  'comment': comment,
  'markedBy': 'Б. Болд',
  'updatedAt': '2026-11-02T07:10:00.000Z',
};

/// `POST /classrooms/c1/attendance` — илгээсэн мөрийг буцаана (onlyIf-ийг хүндэлсэн мэт).
/// `status` ирүүлээгүй (зөвхөн тэмдэглэл) мөрөнд [existing]-ийн төлөв үлдэнэ.
FakeResponse echoAttendance(Map<String, Object?> body, {Map<String, String> existing = const {}}) {
  final entries = (body['entries']! as List).cast<Map<String, Object?>>();
  return FakeResponse({
    'marked': entries.length,
    'date': testDate,
    'applied': [for (final e in entries) e['studentId']],
    'skipped': <String>[],
    'rows': [
      for (final e in entries)
        if (e.containsKey('status') ? e['status'] : existing[e['studentId']] case final String st)
          attRow(e['studentId']! as String, st, note: e['note'] as String?),
    ],
  });
}

FakeHttp boardHttp({Map<String, Object?>? board}) => FakeHttp()
  ..json('GET', '/attendance/classrooms/c1/board', board ?? boardJson())
  ..json('GET', '/attendance/classrooms/c1/marks', marksJson());

// ───────── Ангийн самбар (`/class-dashboard*`) ─────────

Map<String, Object?> dashClass(
  String id,
  String name, {
  String type = 'IN_PERSON',
  Map<String, Object?>? teacher,
  int students = 20,
  int? attendance = 90,
  int? homework = 75,
  int? exam = 68,
  int risk = 0,
  Map<String, Object?>? payment,
}) => {
  'id': id,
  'name': name,
  'type': type,
  'grade': 12,
  'classTeacher': teacher,
  'teacherAvatarUrl': null,
  'assistantTeacher': null,
  'teachers': <String>[],
  'students': students,
  'attendanceRate': attendance,
  'homeworkRate': homework,
  'examAvg': exam,
  'examCount': 2,
  'riskCount': risk,
  'lastLesson': {'date': '2026-10-30', 'topic': 'Интеграл'},
  'payment': payment,
};

Map<String, Object?> dashList(List<Map<String, Object?>> classes, {Map<String, Object?>? permissions}) => {
  'windowDays': 30,
  'permissions': permissions ?? {'money': false, 'manageClasses': false, 'isAdmin': false},
  'classes': classes,
};

Map<String, Object?> dashStudent(
  String id,
  String first,
  String last, {
  String? code,
  List<String> risk = const [],
  List<Map<String, Object?>> flags = const [],
  Map<String, Object?>? payment,
  int? makeup,
}) => {
  'id': id,
  'firstName': first,
  'lastName': last,
  'studentCode': code,
  'attendance': {'rate': 82, 'marked': 10, 'absent': 2},
  'homework': {'rate': 60, 'marked': 10},
  'exam': {'avg': 55, 'last': 50, 'taken': 3, 'missed': 1, 'trend': <int>[]},
  'practice': {'attempts': 0, 'accuracy': null, 'guessed': 0, 'tests': 0},
  'makeup': makeup,
  'lagging': <Object?>[],
  'competency': {'score': 61, 'level': null},
  'risk': risk,
  'flags': flags,
  'payment': payment,
};

Map<String, Object?> dashDetail({
  String type = 'IN_PERSON',
  List<Map<String, Object?>>? students,
  Map<String, Object?>? payment,
}) => {
  'windowDays': 30,
  'classroom': {
    'id': 'c1',
    'name': '12Б',
    'type': type,
    'grade': 12,
    'classTeacher': {'id': 'u1', 'name': 'Багш Нараа'},
    'assistantTeacher': null,
  },
  'permissions': {'money': payment != null, 'manageClass': false, 'isAdmin': false},
  'summary': {
    'students': 2,
    'attendanceRate': 82,
    'homeworkRate': 60,
    'examAvg': 55,
    'exams': 3,
    'riskCount': 1,
    'improvedCount': 1,
    'makeupStudents': 1,
  },
  'payment': payment,
  'students':
      students ??
      [
        dashStudent('s1', 'Тэмүүжин', 'Бат', code: 'B27120001', risk: ['LOW_ATTENDANCE', 'LOW_SCORE'], makeup: 2),
        dashStudent('s2', 'Анужин', 'Дорж', flags: [
          {'id': 'f1', 'kind': 'IMPROVED', 'note': null},
        ]),
      ],
};
