import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/teacher/data/staff_models.dart';
import 'package:piemath_app/features/teacher/data/teacher_models.dart';
import 'package:piemath_app/features/teacher/domain/board_logic.dart';

void main() {
  group('шалтгааны чип', () {
    test('«өвчтэй» болон өвчний сонголт хэзээ ч байхгүй', () {
      for (final r in [...absenceReasons, ...excusedReasons, ...homeworkReasons]) {
        expect(r.contains('өвч'), isFalse, reason: r);
      }
    });

    test('чөлөөтэйд «өөр давтлагатай» нэмэгдэнэ; ирсэн/хоцорсонд чип үгүй', () {
      expect(excusedReasons.first, 'өөр давтлагатай');
      expect(reasonsForAttendance(AttendanceStatus.absent), absenceReasons);
      expect(reasonsForAttendance(AttendanceStatus.present), isEmpty);
      expect(reasonsForAttendance(AttendanceStatus.late), isEmpty);
    });
  });

  group('recordFor', () {
    const server = ServerMarks(
      att: {'s1': AttRow(studentId: 's1', status: AttendanceStatus.absent, note: 'тэмцээн', markedBy: 'Б. Болд')},
      hw: {'s1': HwRow(studentId: 's1', status: HomeworkStatus.done)},
    );

    test('серверийн утга', () {
      final r = recordFor('s1', server, const {});
      expect(r.att, AttendanceStatus.absent);
      expect(r.attNote, 'тэмцээн');
      expect(r.hw, HomeworkStatus.done);
      expect(r.attBy, 'Б. Болд');
      expect(recordFor('s9', server, const {}), DayRec.empty);
    });

    test('хадгалагдаж буй түр утга серверийнхийг давна', () {
      final r = recordFor('s1', server, {
        cellKey('s1', Cell.att): const AttOverride(AttendanceStatus.late, LateRange.tenToThirty),
        cellKey('s1', Cell.hwNote): const HwNoteOverride('ойлгоогүй'),
      });
      expect(r.att, AttendanceStatus.late);
      expect(r.lateRange, LateRange.tenToThirty);
      expect(r.attNote, 'тэмцээн');
      expect(r.hwNote, 'ойлгоогүй');
    });

    test('withAtt: хариуд ирээгүй сурагчийн мөр устна', () {
      final next = server.withAtt(['s1'], const []);
      expect(next.att, isEmpty);
      expect(next.hw.length, 1);
    });
  });

  group('planAttendance', () {
    test('ирсэн болбол шалтгааны чипийг цэвэрлэнэ', () {
      const cur = DayRec(att: AttendanceStatus.absent, attNote: 'тэмцээн');
      final p = planAttendance('s1', cur, AttendanceStatus.present);
      expect(p.entry, {'studentId': 's1', 'status': 'PRESENT', 'note': null});
      expect(p.overrides.whereType<AttNoteOverride>().single.text, '');
    });

    test('гараар бичсэн тэмдэглэлийг үлдээнэ', () {
      const cur = DayRec(att: AttendanceStatus.absent, attNote: 'аав нь залгасан');
      final p = planAttendance('s1', cur, AttendanceStatus.present);
      expect(p.entry.containsKey('note'), isFalse);
      expect(p.overrides, hasLength(1));
    });

    test('тасалсанаас чөлөөтэй рүү шилжихэд шалтгаан үлдэнэ', () {
      const cur = DayRec(att: AttendanceStatus.absent, attNote: 'тэмцээн');
      expect(planAttendance('s1', cur, AttendanceStatus.excused).entry.containsKey('note'), isFalse);
    });

    test('цэвэрлэвэл (null) мөр устах тул тэмдэглэл ч арилна, бие note-гүй', () {
      const cur = DayRec(att: AttendanceStatus.absent, attNote: 'гараар');
      final p = planAttendance('s1', cur, null);
      expect(p.entry, {'studentId': 's1', 'status': null});
      expect(p.overrides.whereType<AttNoteOverride>(), hasLength(1));
    });

    test('хоцролтын хугацаа зөвхөн LATE-д үлдэнэ', () {
      const cur = DayRec(att: AttendanceStatus.late, lateRange: LateRange.fiveToTen);
      expect(
        (planAttendance('s1', cur, AttendanceStatus.late).overrides.first as AttOverride).lateRange,
        LateRange.fiveToTen,
      );
      expect((planAttendance('s1', cur, AttendanceStatus.present).overrides.first as AttOverride).lateRange, isNull);
    });
  });

  test('planHomework: хийсэн болбол шалтгааны чип цэвэрлэгдэнэ', () {
    final p = planHomework(const DayRec(hw: HomeworkStatus.partial, hwNote: 'ойлгоогүй'), HomeworkStatus.done);
    expect(p.fields, {'status': 'DONE', 'comment': null});
    final q = planHomework(const DayRec(hw: HomeworkStatus.partial, hwNote: 'ойлгоогүй'), HomeworkStatus.notDone);
    expect(q.fields, {'status': 'NOT_DONE'});
  });

  group('бөөнөөр', () {
    final recs = {
      's1': const DayRec(),
      's2': const DayRec(att: AttendanceStatus.present),
      's3': const DayRec(att: AttendanceStatus.late, hw: HomeworkStatus.partial),
      's4': const DayRec(att: AttendanceStatus.absent),
    };
    final ids = recs.keys.toList();

    test('«Бүгд ирсэн» зөвхөн тэмдэглээгүй', () {
      expect(bulkPresentCandidates(ids, recs), ['s1']);
    });

    test('«Бүгд хийсэн» ирсэн/хоцорсон, даалгавар тэмдэглээгүй; бусдыг алгасна', () {
      expect(bulkDoneCandidates(ids, recs), ['s2']);
      expect(bulkDoneSkipped(ids, recs), 2);
    });

    test('тоо: Ирсэн ба Хоцорсон тусдаа', () {
      final c = dayCounts(ids, recs);
      expect(c.attendance[AttendanceStatus.present], 1);
      expect(c.attendance[AttendanceStatus.late], 1);
      expect(c.attUnmarked, 1);
      expect(c.homework[HomeworkStatus.partial], 1);
      expect(c.hwUnmarked, 3);
    });
  });

  test('needsDetail', () {
    expect(needsDetail(const DayRec(att: AttendanceStatus.present), homework: true), isFalse);
    expect(needsDetail(const DayRec(att: AttendanceStatus.excused), homework: false), isTrue);
    expect(needsDetail(const DayRec(hw: HomeworkStatus.notDone), homework: true), isTrue);
    expect(needsDetail(const DayRec(hw: HomeworkStatus.notDone), homework: false), isFalse);
  });

  test('цаг, сар', () {
    expect(hm(900), '15:00');
    expect(hm(545), '09:05');
    expect(lessonAt(const [BoardLesson(scheduleId: 'a', startMinute: 900, endMinute: 1020)], 960)?.scheduleId, 'a');
    expect(lessonAt(const [BoardLesson(scheduleId: 'a', startMinute: 900, endMinute: 1020)], 1020), isNull);
    expect(shiftMonth('2026-01', -1), '2025-12');
    expect(shiftMonth('2026-12', 1), '2027-01');
    expect(hoursLabel(2160), '36 цаг');
    expect(hoursLabel(125), '2 цаг 5 мин');
    expect(hoursLabel(40), '40 мин');
  });

  group('сурагчийн карт (вэбийн StudentCard)', () {
    const late = DayRec(att: AttendanceStatus.late, attNote: ' автобус ', hwNote: 'ойлгоогүй');

    test('илгээсэн ч шалгаагүй: танхимын анги, илгээсэн, даалгавар тэмдэглээгүй', () {
      expect(awaitingCheck(DayRec.empty, homework: true, sent: true), isTrue);
      expect(awaitingCheck(const DayRec(hw: HomeworkStatus.done), homework: true, sent: true), isFalse);
      expect(awaitingCheck(DayRec.empty, homework: false, sent: true), isFalse);
      expect(awaitingCheck(DayRec.empty, homework: true, sent: false), isFalse);
    });

    test('тэмдэглэлийн товч, эрсдэлийн бичвэр, нөхөх төлөв', () {
      expect(notePreview(late, homework: true), 'автобус, ойлгоогүй');
      expect(notePreview(late, homework: false), 'автобус');
      expect(notePreview(DayRec.empty, homework: true), '');
      expect(riskText(null), '');
      expect(
        riskText(const [RiskFlag(kind: 'a', label: '3 удаа тасалсан'), RiskFlag(kind: 'b', label: '5 удаа хоцорсон')]),
        '3 удаа тасалсан, 5 удаа хоцорсон',
      );
      expect(showsMakeup(late), isTrue);
      expect(showsMakeup(const DayRec(att: AttendanceStatus.present)), isFalse);
      expect(
        [for (final s in MakeupStatus.values) makeupLabel(s)],
        ['Нөхөөгүй', 'Хагас нөхсөн', 'Нөхсөн', 'Чөлөөлсөн'],
      );
    });

    test('хичээл эхлээгүй: ирээдүйн өдөр, эсвэл өнөөдөр эхний хичээлээс өмнө', () {
      const lessons = [BoardLesson(scheduleId: 'a', startMinute: 900, endMinute: 1020)];
      expect(lessonUpcoming('2026-11-03', '2026-11-02', 0, lessons), isTrue);
      expect(lessonUpcoming('2026-11-02', '2026-11-02', 899, lessons), isTrue);
      expect(lessonUpcoming('2026-11-02', '2026-11-02', 900, lessons), isFalse);
      expect(lessonUpcoming('2026-11-01', '2026-11-02', 0, lessons), isFalse);
      expect(lessonUpcoming('2026-11-02', '2026-11-02', 0, const []), isFalse);
    });

    test('монгол цагаан толгойн дараалал: О < Ө < П, У < Ү < Ф', () {
      final sorted = ['Үүрцайх', 'Өлзий', 'Пүрэв', 'Отгон', 'Ууганаа', 'Анужин', 'Фаина']..sort(compareMn);
      expect(sorted, ['Анужин', 'Отгон', 'Өлзий', 'Пүрэв', 'Ууганаа', 'Үүрцайх', 'Фаина']);
      final list = byFirstName(const [
        BoardStudent(id: '1', firstName: 'Сарнай', lastName: 'Ганаа'),
        BoardStudent(id: '2', firstName: 'Анужин', lastName: 'Дорж'),
        BoardStudent(id: '3', firstName: 'Сарнай', lastName: 'Бат'),
      ]);
      expect(list.map((s) => s.id), ['2', '3', '1']);
    });
  });

  group('шүүлтүүр (вэбийн BoardFilters)', () {
    const data = BoardFilterData(
      recs: {
        's1': DayRec(att: AttendanceStatus.present, hw: HomeworkStatus.done),
        's2': DayRec(att: AttendanceStatus.absent),
      },
      risk: {
        's3': [RiskFlag(kind: 'lates', label: '5 удаа хоцорсон')],
      },
      sent: {'s2'},
      online: {'s1'},
    );
    const ids = ['s1', 's2', 's3'];

    test('төлөв бүрээр', () {
      expect(data.apply(null, ids), ids);
      expect(data.apply(BoardFilter.attPresent, ids), ['s1']);
      expect(data.apply(BoardFilter.attAbsent, ids), ['s2']);
      expect(data.apply(BoardFilter.attNone, ids), ['s3']);
      expect(data.apply(BoardFilter.hwDone, ids), ['s1']);
      expect(data.apply(BoardFilter.hwNone, ids), ['s2', 's3']);
      expect(data.apply(BoardFilter.hwSent, ids), ['s2']);
      expect(data.apply(BoardFilter.onlineYes, ids), ['s1']);
      expect(data.apply(BoardFilter.onlineNo, ids), ['s2', 's3']);
      expect(data.apply(BoardFilter.risk, ids), ['s3']);
    });

    test('төлөв → шүүлтүүр', () {
      expect(BoardFilter.att(null), BoardFilter.attNone);
      expect(BoardFilter.att(AttendanceStatus.excused), BoardFilter.attExcused);
      expect(BoardFilter.hw(HomeworkStatus.notDone), BoardFilter.hwNotDone);
    });
  });
}
