import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/teacher/data/teacher_models.dart';

void main() {
  test('BoardPayload: ирц, даалгавар, эрсдэл, илгээсэн задлана', () {
    final p = BoardPayload.fromJson({
      'date': '2026-11-02',
      'today': '2026-11-02',
      'classroom': {'id': 'c1', 'name': '12Б', 'type': 'IN_PERSON', 'grade': 12},
      'holiday': null,
      'lessons': [
        {'scheduleId': 's1', 'startMinute': 900, 'endMinute': 1020, 'room': '501', 'mine': true},
      ],
      'students': [
        {'id': 'u1', 'firstName': 'Тест', 'lastName': 'Сурагч', 'code': 'M0001', 'joinedAt': '2026-09-01'},
      ],
      'attendance': [
        {'studentId': 'u1', 'status': 'LATE', 'note': null, 'lateRange': 'FIVE_TO_TEN', 'markedBy': 'Б. Багш'},
      ],
      'homework': [
        {'studentId': 'u1', 'status': null, 'comment': 'дутуу хийсэн', 'markedBy': null},
      ],
      'risk': {
        'u1': [
          {'kind': 'lates', 'label': '5 удаа хоцорсон'},
        ],
      },
      'sent': {
        'assignmentIds': ['a1'],
        'students': ['u1'],
      },
      'canEditCriteria': false,
    });
    expect(p.attendance.single.status, AttendanceStatus.late);
    expect(p.attendance.single.lateRange, LateRange.fiveToTen);
    expect(p.homework.single.status, isNull);
    expect(p.risk['u1']!.single.label, '5 удаа хоцорсон');
    expect(p.sent, ['u1']);
    expect(p.lessons.single.mine, isTrue);
    expect(p.marks.sent, ['u1']);
  });

  test('ClassroomSummary: _count.enrollments, «Миний анги»', () {
    final c = ClassroomSummary.fromJson({
      'id': 'c1',
      'name': '12Б',
      'type': 'ONLINE',
      'teacher': {'id': 't1', 'firstName': 'Сараа', 'lastName': 'Очир', 'role': 'TEACHER_PLUS'},
      'assistantTeacher': null,
      '_count': {'enrollments': 24},
    });
    expect(c.studentCount, 24);
    expect(c.isMine('t1'), isTrue);
    expect(c.isMine('x'), isFalse);
    expect(c.isOnline, isTrue);
  });

  test('Төлөвийн хөрвүүлэлт буцаж ижил', () {
    for (final s in AttendanceStatus.values) {
      expect(attendanceFromApi(s.api), s);
    }
    for (final s in HomeworkStatus.values) {
      expect(homeworkFromApi(s.api), s);
    }
    for (final r in LateRange.values) {
      expect(lateRangeFromApi(r.api), r);
    }
    expect(attendanceFromApi('SICK'), isNull);
  });

  test('AssignmentSummary: шалгах хүлээгдэж буй тоо', () {
    final a = AssignmentSummary.fromJson({
      'id': 'a1',
      'title': 'Даалгавар 1',
      '_count': {'submissions': 3},
    });
    expect(a.pending, 3);
  });
}
