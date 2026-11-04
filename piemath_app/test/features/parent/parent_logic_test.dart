import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/parent/data/parent_models.dart';
import 'package:piemath_app/features/parent/data/weekly_report.dart';
import 'package:piemath_app/features/parent/domain/parent_labels.dart';

import '../m7_fixtures.dart';

void main() {
  group('7 хоногийн Даваа (тайлангийн week)', () {
    test('Лхагва → тухайн долоо хоногийн Даваа', () {
      expect(mondayKey(UbDateTime(2026, 11, 4)), '2026-11-02');
    });

    test('Ням → өмнөх Даваа (Монгол 7=Ням)', () {
      expect(mondayKey(UbDateTime(2026, 11, 8, 23)), '2026-11-02');
    });

    test('Даваа өөрөө', () {
      expect(mondayKey(UbDateTime(2026, 11, 2)), '2026-11-02');
    });

    test('сүүлийн 12 долоо хоног, шинэ нь эхэнд, сар/он дамжина', () {
      final w = weekOptions(UbDateTime(2026, 1, 7));
      expect(w.length, 12);
      expect(w.first, '2026-01-05');
      expect(w[1], '2025-12-29');
    });

    test('шошго', () {
      expect(weekLabel('2026-11-02'), '11-р сарын 2');
      expect(minuteLabel(900), '15:00');
      expect(minuteLabel(545), '09:05');
    });
  });

  test('огноо: эхний 10 тэмдэгт (бүсээр гулсахгүй)', () {
    expect(dayLabel('2026-10-30T00:00:00.000Z'), '2026.10.30');
    expect(dayLabel(null), '');
  });

  test('хүүхэд холбох утас: яг 8 цифр', () {
    expect(normalizeStudentPhone('9900-0001'), '99000001');
    expect(normalizeStudentPhone('9900001'), isNull);
    expect(normalizeStudentPhone('+976 99000001'), isNull);
  });

  test('ирц, даалгаврын шошго — «Өвчтэй» байхгүй', () {
    expect(AttendanceMark.fromApi('EXCUSED').label, 'Чөлөөтэй');
    expect(AttendanceMark.fromApi('SICK'), AttendanceMark.unknown);
    expect(AttendanceMark.values.map((m) => m.label), isNot(contains('Өвчтэй')));
    expect(HomeworkMark.fromApi('PARTIAL').label, 'Дутуу');
    expect(HomeworkMark.fromApi('DONE_IN_CLASS').label, 'Ангид шалгасан');
    expect(HomeworkMark.fromApi(''), HomeworkMark.unknown);
    expect(resultSourceLabel('CHAPTER_EXAM'), 'Багшийн үнэлгээ');
  });

  group('загвар (api-contract/parent.md)', () {
    test('баталгаажсан холболт', () {
      final l = ParentLink.fromJson(verifiedLink());
      expect(l.verified, isTrue);
      expect(l.student.fullName, 'Тэмүүлэн Тестийн');
      expect(l.student.attendances.length, 3);
      expect(l.student.testResults.first.acknowledgedAt, isNull);
      expect(l.student.testResults[1].acknowledgedAt, '2026-10-21T02:00:00.000Z');
      expect(l.student.isOnline, isFalse);
    });

    test('баталгаажаагүй — зөвхөн нэр', () {
      final l = ParentLink.fromJson(pendingLink());
      expect(l.verified, isFalse);
      expect(l.student.testResults, isEmpty);
    });

    test('дүнгийн карт, тайлан', () {
      expect(ExamResultCardData.fromJson(examCard()).parts!.part2Max, 12);
      final r = WeeklyReport.fromJson(weeklyReportJson());
      expect(r.topics.weakest, isNull);
      expect(r.tests[1].score, isNull);
      expect(r.nextWeekSchedule.single.startMinute, 900);
    });
  });
}
