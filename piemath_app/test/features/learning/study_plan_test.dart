import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart';
import 'package:piemath_app/features/exam/domain/review_breakdown.dart';
import 'package:piemath_app/features/homework/data/homework_models.dart';
import 'package:piemath_app/features/learning/data/readiness_models.dart';
import 'package:piemath_app/features/learning/domain/study_plan.dart';

HwDay _day(
  String date, {
  bool upcoming = false,
  String? mark,
  Map<String, Object?>? photo,
  String? topic,
  String? deadlineAt,
}) => HwDay.fromJson({
  'date': date,
  'classroomId': 'c1',
  'classroomName': '12А',
  'deadlineAt': deadlineAt,
  'items': const <Object?>[],
  'photo': photo,
  'mark': mark,
  'markComment': null,
  'upcoming': upcoming,
  'topic': topic,
});

void main() {
  final now = UbDateTime(2026, 11, 4, 10);
  const today = '2026-11-04';

  group('buildTodayPlan', () {
    test('гэрийн даалгавар хамгийн дээр (ихдээ 2), дараа нь халаалт → гол хэсэг, 4-өөс ихгүй', () {
      final plan = buildTodayPlan(
        const PlanInputs(
          homework: [
            HomeworkDue(title: 'a'),
            HomeworkDue(title: 'b'),
            HomeworkDue(title: 'c'),
          ],
          formulasDue: 3,
          mistakesToday: 2,
          lastTopic: 'Логарифм',
          nextExam: UpcomingExam(title: 'Бүлгийн шалгалт', at: null),
        ),
      );
      expect(plan.map((p) => p.kind), [
        PlanKind.homework,
        PlanKind.homework,
        PlanKind.formulas,
        PlanKind.mistakes,
        PlanKind.nextExam,
        PlanKind.lastTopic,
      ]);
      expect(plan.first.pinned, isTrue);
      expect(plan.where((p) => !p.pinned).length, lessThanOrEqualTo(planMaxItems));
      expect(planMinutes(plan), 30);
    });

    test('цөөн бол дасгалаар дүүргэнэ; юу ч байхгүй ч хоосон биш', () {
      final plan = buildTodayPlan(const PlanInputs(mistakesToday: 0, formulasDue: 0));
      expect(plan.map((p) => p.kind), [PlanKind.practice]);
      final two = buildTodayPlan(const PlanInputs(mistakesToday: 1, formulasDue: 2));
      expect(two.map((p) => p.kind), [PlanKind.formulas, PlanKind.mistakes, PlanKind.practice]);
      expect(planMinutes(two), 20);
    });

    test('ачаалагдаагүй (null) мөрийг алгасна', () {
      final plan = buildTodayPlan(const PlanInputs(lastTopic: '  '));
      expect(plan.map((p) => p.kind), [PlanKind.practice]);
    });

    test('гарчгийн төгсгөлд цэг байхгүй', () {
      final plan = buildTodayPlan(
        const PlanInputs(
          formulasDue: 1,
          mistakesToday: 1,
          lastTopic: 'x',
          nextExam: UpcomingExam(title: 'y', at: null),
        ),
      );
      for (final p in plan) {
        expect(p.title.endsWith('.'), isFalse, reason: p.title);
      }
    });
  });

  group('гэрийн даалгавар', () {
    test('танхим: тэмдэглээгүй, дутуу, цонх нээлттэй өдөр л (шинэ нь эхэнд)', () {
      final due = classroomHomeworkDue(
        [
          _day('2026-11-04'),
          _day('2026-11-03', mark: 'DONE'),
          _day('2026-11-02', photo: {'id': 'p', 'fileKey': 'k', 'pages': 1, 'uploadedAt': '2026-11-02T10:00:00Z'}),
          _day('2026-11-01'),
          _day('2026-10-01'),
          _day('2026-11-06', upcoming: true),
          _day('2026-10-31', deadlineAt: '2026-11-01T00:00:00.000Z'),
        ],
        today,
        now: now.toInstant(),
      );
      expect(due.map((d) => d.title), ['Өнөөдрийн гэрийн даалгавар', 'Гэрийн даалгавар']);
      expect(due.last.subtitle, '11-р сарын 1, 12А');
    });

    test('онлайн: илгээгээгүй, буцаагдсан; хугацаа ойрхон нь эхэнд', () {
      Assignment a(String id, String status, String? due, {bool canSubmit = true}) => Assignment.fromJson({
        'id': id,
        'title': 'Даалгавар $id',
        'dueDate': due,
        'canSubmit': canSubmit,
        'myStatus': status,
      });
      final due = onlineHomeworkDue([
        a('1', 'NOT_DONE', '2026-11-10T00:00:00.000Z'),
        a('2', 'RETURNED', null),
        a('3', 'SUBMITTED', '2026-11-05T00:00:00.000Z'),
        a('4', 'NOT_DONE', '2026-11-06T00:00:00.000Z'),
        a('5', 'NOT_DONE', '2026-11-05T00:00:00.000Z', canSubmit: false),
      ]);
      expect(due.map((d) => d.title), ['Даалгавар 4', 'Даалгавар 1', 'Даалгавар 2']);
      expect(due.last.subtitle, 'Дахин илгээх');
    });

    test('сүүлийн хичээлийн сэдэв, дараагийн хичээл', () {
      final days = [
        _day('2026-11-02', topic: 'Илтгэгч функц'),
        _day('2026-11-03'),
        _day('2026-11-06', upcoming: true, topic: 'Логарифм'),
        _day('2026-11-09', upcoming: true),
      ];
      expect(lastLessonTopic(days, today), 'Илтгэгч функц');
      expect(nextLesson(days, today)?.date, '2026-11-06');
      expect(nextLesson(const [], today), isNull);
    });
  });

  test('ойрын шалгалт: upcoming, хугацаа дотор, хамгийн ойрх нь', () {
    TestRow e(String title, String at, {bool upcoming = true}) =>
        TestRow.fromJson({'id': title, 'title': title, 'type': 'CHAPTER_EXAM', 'upcoming': upcoming, 'assignedAt': at});
    final list = [
      e('Хол', '2026-12-30T02:00:00.000Z'),
      e('Ойр', '2026-11-07T02:00:00.000Z'),
      e('Өгсөн', '2026-11-05T02:00:00.000Z', upcoming: false),
    ];
    expect(nextExam(list, now)?.title, 'Ойр');
    expect(nextExam(list, now, withinDays: 2), isNull);
  });

  test('эзэмшлийн 4 түвшин', () {
    expect(MasteryLevel.fromPercent(0), MasteryLevel.attempted);
    expect(MasteryLevel.fromPercent(49), MasteryLevel.attempted);
    expect(MasteryLevel.fromPercent(50), MasteryLevel.familiar);
    expect(MasteryLevel.fromPercent(70), MasteryLevel.proficient);
    expect(MasteryLevel.fromPercent(90), MasteryLevel.mastered);
    expect(MasteryLevel.values.map((l) => l.label), ['Оролдсон', 'Танил', 'Чадвартай', 'Эзэмшсэн']);
    expect(MasteryLevel.mastered.steps, 4);
  });

  test('хамгийн сул 3 сэдэв (хэмжигдсэн л)', () {
    final r = Readiness.fromJson(const {
      'index': 50,
      'dataPoints': 10,
      'coverage': 50,
      'topics': [
        {'topic': 'a', 'title': 'A', 'mastery': 80, 'measured': true},
        {'topic': 'b', 'title': 'B', 'mastery': 20, 'measured': true},
        {'topic': 'c', 'title': 'C', 'mastery': 10, 'measured': false},
        {'topic': 'd', 'title': 'D', 'mastery': 60, 'measured': true},
        {'topic': 'e', 'title': 'E', 'mastery': 95, 'measured': true},
      ],
    });
    expect(weakestTopics(r).map((t) => t.title), ['B', 'D', 'A']);
  });

  test('7 хоногийн зорилго', () {
    expect(const WeeklyGoalProgress(goal: 4, activeDays: 1).remaining, 3);
    expect(const WeeklyGoalProgress(goal: 4, activeDays: 5).reached, isTrue);
    expect(const WeeklyGoalProgress(goal: 4, activeDays: 5).remaining, 0);
    expect(clampWeeklyGoal(9), 7);
    expect(clampWeeklyGoal(0), 1);
  });

  test('шалгалтын дараах задаргаа: сэдвээр, сул нь эхэнд, хариу тодорхойгүйг тооцохгүй', () {
    PracticeReviewItem it(int n, String? ch, {bool correct = false, bool answered = true, bool unknown = false}) =>
        PracticeReviewItem.fromJson({
          'n': n,
          'points': 1,
          'chapterTitle': ch,
          'answered': answered,
          'correct': correct,
          'answerUnknown': unknown,
        });
    final t = topicBreakdown([
      it(1, 'Функц', correct: true),
      it(2, 'Функц', correct: true),
      it(3, 'Логарифм'),
      it(4, 'Логарифм', correct: true),
      it(5, 'Логарифм', unknown: true),
      it(6, null, answered: false),
    ]);
    expect(t.map((x) => x.name), ['Бусад', 'Логарифм', 'Функц']);
    expect(t[1].earned, 1);
    expect(t[1].max, 2);
    expect(t[1].percent, 50);
  });
}
