// ignore_for_file: prefer_const_literals_to_create_immutables
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/homework/data/homework_models.dart';
import 'package:piemath_app/features/homework/domain/homework_logic.dart';

import 'hw_fixtures.dart';

void main() {
  final days = [for (final d in fixtureDays()) HwDay.fromJson(d)];

  group('загвар задлах', () {
    test('өдөр, зураг, тэмдэглэгээ, тест', () {
      final past = days.firstWhere((d) => d.date == '2026-10-30');
      expect(past.mark, HomeworkMark.done);
      expect(past.markComment, 'Сайн байна');
      expect(past.photo!.pages, 3);
      expect(past.photo!.uploadedAt, DateTime.utc(2026, 10, 30, 10));
      expect(past.items.single.status, HwItemStatus.submitted);
      expect(past.items.single.score!.correct, 8);
      expect(past.deadlineAt, DateTime.utc(2026, 11, 1, 16));
      final up = days.firstWhere((d) => d.date == '2026-11-04');
      expect(up.upcoming, isTrue);
      expect(up.mark, isNull);
    });

    test('онлайн даалгавар', () {
      final a = Assignment.fromJson(fixtureAssignments().first);
      expect(a.status, AssignmentStatus.returned);
      expect(a.submission!.reviewNote, 'Зураг бүдэг байна');
      expect(a.lessonLabel, '10-р сарын 26 — Логарифм');
      expect(a.imageKeys, ['t1.jpg']);
      expect(AssignmentStatus.parse('UNKNOWN'), AssignmentStatus.notDone);
    });

    test('бодолт: бодлого эрэмбэлэгдэнэ, хариу, сүүлийн шалгалт', () {
      final a = HwAttempt.fromJson(fixtureAttempt());
      expect(a.problems.map((p) => p.order), [1, 2, 3]);
      expect(a.problems[1].choices!.length, 5);
      expect(a.problems[2].fillSlots, ['a', 'b']);
      expect(a.answers['p1'], '35');
      expect(a.remainingSec, 600);
      expect(a.submitted, isFalse);
    });

    test('шалгалтын хариу: CORRECT/WRONG/BLANK', () {
      final r = CheckOutcome.fromJson({
        'checksUsed': 1,
        'results': {'p1': 'CORRECT', 'p2': 'WRONG', 'p3': 'BLANK'},
        'correct': 1,
        'total': 3,
      });
      expect(r.results.values, [CheckResult.correct, CheckResult.wrong, CheckResult.blank]);
      final s = CheckOutcome.fromJson({
        'score': {'correct': 2, 'total': 3},
        'results': <String, Object?>{},
      });
      expect((s.correct, s.total, s.checksUsed), (2, 3, null));
    });
  });

  group('өдрийн хэсэг, илгээх цонх', () {
    test('өнөөдөр → урьдчилан (ойрх нь эхэнд) → өмнөх (шинэ нь эхэнд)', () {
      final s = homeworkSections(days, '2026-11-02');
      expect(s.map((x) => x.title), ['Өнөөдөр', 'Урьдчилан илгээх', 'Өмнөх хичээлүүд']);
      expect(s[1].days.map((d) => d.date), ['2026-11-04', '2026-11-06']);
      expect(s[2].days.map((d) => d.date), ['2026-10-30', '2026-10-10']);
    });

    test('хоосон хэсэг орохгүй', () {
      expect(homeworkSections(days, '2026-11-03').map((x) => x.title), ['Урьдчилан илгээх', 'Өмнөх хичээлүүд']);
    });

    test('14 хоногийн цонх, урьдчилан үргэлж', () {
      final today = days.firstWhere((d) => d.date == '2026-11-02');
      expect(canSendPhoto(today, '2026-11-02'), isTrue);
      expect(canSendPhoto(days.firstWhere((d) => d.date == '2026-10-30'), '2026-11-02'), isTrue);
      expect(canSendPhoto(days.firstWhere((d) => d.date == '2026-10-10'), '2026-11-02'), isFalse);
      expect(canSendPhoto(days.firstWhere((d) => d.date == '2026-11-04'), '2026-11-02'), isTrue);
      // 13 хоногийн өмнө — болно, 14 — болохгүй.
      expect(dayDiff('2026-11-02', '2026-10-20'), 13);
      expect(dayDiff('2026-03-01', '2026-02-28'), 1);
    });

    test('өдрийн бүх ажил илгээгдсэн эсэх', () {
      expect(dayDone(days.firstWhere((d) => d.date == '2026-10-30')), isTrue);
      expect(dayDone(days.firstWhere((d) => d.date == '2026-11-02')), isFalse);
    });

    test('өдрийн шошго (вэбийн dayLabel)', () {
      expect(dayLabel('2026-11-02'), '11-р сарын 2, Даваа');
      expect(dayLabel('2026-11-08', withWeekday: false), '11-р сарын 8');
      expect(dayLabel('буруу'), 'буруу');
    });
  });

  group('cleanTitle (вэбийн studentTitle.ts)', () {
    test('номын дотоод нэр, хувилбар, тусгаарлагч', () {
      expect(cleanTitle('100x100 V3 · Логарифм 3-B', variantLabel: 'B'), 'Логарифм 3');
      expect(cleanTitle('200×200 V2 · Илтгэгч тэгшитгэл (B)', variantLabel: 'B'), 'Илтгэгч тэгшитгэл');
      expect(cleanTitle('Квадрат тэгшитгэл B хувилбар', variantLabel: 'B'), 'Квадрат тэгшитгэл');
      expect(cleanTitle('Интеграл · Тест 1'), 'Интеграл — Тест 1');
      expect(cleanTitle('100x100 V3'), 'Даалгавар');
    });
  });

  group('хариу', () {
    test('хоосон хариу', () {
      expect(isBlankAnswer(null), isTrue);
      expect(isBlankAnswer('  '), isTrue);
      expect(isBlankAnswer('___'), isTrue);
      expect(isBlankAnswer(const {'a': '', 'b': null}), isTrue);
      expect(isBlankAnswer(const {'a': '3'}), isFalse);
      expect(isBlankAnswer('B'), isFalse);
    });

    test('зөвхөн өөрчлөгдсөн хариуг хадгална', () {
      const saved = <String, Object?>{'p1': 'A', 'p2': {'a': '1'}};
      expect(changedAnswers(const {'p1': 'A', 'p2': {'a': '1'}}, saved), isEmpty);
      expect(changedAnswers(const {'p1': 'B', 'p2': {'a': '1', 'b': '2'}, 'p3': '5'}, saved).keys, ['p1', 'p2', 'p3']);
    });

    test('цаг', () {
      expect(formatClock(247), '4:07');
      expect(formatClock(3847), '1:04:07');
      expect(formatClock(-5), '0:00');
    });
  });

  test('missedPhotoDays: зөвхөн «Өмнөх хичээлүүд», 14 хоногийн дотор зураггүй өдөр', () {
    final extra = HwDay.fromJson({...fixtureDays().last, 'date': '2026-10-31', 'mark': null});
    final sections = homeworkSections([...days, extra], '2026-11-02');
    final past = sections.firstWhere((s) => s.title == 'Өмнөх хичээлүүд');
    expect(missedPhotoDays(past, '2026-11-02'), 1, reason: '10-31 зураггүй; 10-30 зурагтай; 10-10 хугацаа өнгөрсөн');
    expect(missedPhotoDays(sections.first, '2026-11-02'), 0);
  });
}
