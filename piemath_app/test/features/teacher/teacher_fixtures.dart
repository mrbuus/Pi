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
