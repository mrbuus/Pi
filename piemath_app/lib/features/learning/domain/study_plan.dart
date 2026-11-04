import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';
import '../../exam/data/exam_models.dart' show TestRow;
import '../../homework/data/homework_models.dart';
import '../../homework/domain/homework_logic.dart';
import '../data/readiness_models.dart';

/// «Бие даан суралцах» төвийн цэвэр логик (`docs/RESEARCH-2026-11.md` §2). Бизнесийн дүрэм серверт —
/// энд зөвхөн байгаа endpoint-уудын хариуг өдрийн жагсаалт болгон эрэмбэлнэ.

/// Өдрийн төлөвлөгөөний мөрийн төрөл.
enum PlanKind { homework, formulas, mistakes, problemReview, lastTopic, nextExam, practice }

@immutable
class PlanItem {
  const PlanItem({required this.kind, required this.title, required this.path, this.subtitle, this.minutes});

  final PlanKind kind;
  final String title;
  final String? subtitle;

  /// Ойролцоо хугацаа (мин). Гэрийн даалгаврынх тодорхойгүй — null.
  final int? minutes;
  final String path;

  /// Гэрийн даалгавар үргэлж хамгийн дээр, тэмдэглэгээтэй.
  bool get pinned => kind == PlanKind.homework;
}

/// Хугацаа нь болсон гэрийн даалгавар (танхим эсвэл онлайн загвараас).
@immutable
class HomeworkDue {
  const HomeworkDue({required this.title, this.subtitle});

  final String title;
  final String? subtitle;
}

/// Өдрийн төлөвлөгөөний оролт. null = ачаалагдаагүй / алдаа (тэр мөрийг алгасна).
@immutable
class PlanInputs {
  const PlanInputs({
    this.homework = const [],
    this.mistakesToday,
    this.formulasDue,
    this.problemsDue,
    this.lastTopic,
    this.lastTopicPath,
    this.nextExam,
  });

  final List<HomeworkDue> homework;
  final int? mistakesToday;
  final int? formulasDue;

  /// Хугацаатай давталтын хугацаа нь болсон бодлого (өнөөдрийн алдаатай давхардаагүй).
  final int? problemsDue;

  /// Сүүлийн хичээлийн сэдэв.
  final String? lastTopic;

  /// Сэдэв бүлэгтэй таарвал сэдвээр дасгалын зам, үгүй бол ерөнхий давтлага.
  final String? lastTopicPath;

  /// Ойрын 7 хоногийн шалгалт.
  final UpcomingExam? nextExam;
}

/// Гэрийн даалгаврын дээд тоо (жагсаалт урт болохгүй).
const planMaxHomework = 2;

/// Гэрийн даалгавраас гадна 3–4 мөр, нийт ~15–25 мин.
const planMinItems = 3;
const planMaxItems = 4;

/// Халаалт (томьёо, алдаа) → гол хэсэг (сүүлийн хичээл эсвэл ойрын шалгалтын сэдэв) → дасгалаар дүүргэнэ.
List<PlanItem> buildTodayPlan(PlanInputs i) {
  final items = <PlanItem>[
    for (final h in i.homework.take(planMaxHomework))
      PlanItem(kind: PlanKind.homework, title: h.title, subtitle: h.subtitle, path: '/app/homework'),
  ];
  final rest = <PlanItem>[];
  final formulas = i.formulasDue ?? 0;
  if (formulas > 0) {
    rest.add(
      PlanItem(
        kind: PlanKind.formulas,
        title: 'Томьёо давтах',
        subtitle: '$formulas томьёо',
        minutes: 5,
        path: '/app/formulas/review',
      ),
    );
  }
  final mistakes = i.mistakesToday ?? 0;
  if (mistakes > 0) {
    rest.add(
      PlanItem(
        kind: PlanKind.mistakes,
        title: 'Алдаагаа дахин бодох',
        subtitle: '$mistakes бодлого',
        minutes: 5,
        path: '/app/mistakes/today',
      ),
    );
  }
  final problems = i.problemsDue ?? 0;
  if (problems > 0) {
    rest.add(
      PlanItem(
        kind: PlanKind.problemReview,
        title: 'Хугацаа нь болсон бодлого',
        subtitle: '$problems бодлого',
        minutes: 5,
        path: '/app/study/due',
      ),
    );
  }
  final exam = i.nextExam;
  final topic = i.lastTopic?.trim();
  if (exam != null) {
    rest.add(
      PlanItem(
        kind: PlanKind.nextExam,
        title: 'Шалгалтын өмнөх давтлага',
        subtitle: exam.title,
        minutes: 10,
        path: '/app/study/review',
      ),
    );
  }
  if (topic != null && topic.isNotEmpty) {
    rest.add(
      PlanItem(
        kind: PlanKind.lastTopic,
        title: 'Сүүлийн хичээлийн сэдвээр',
        subtitle: topic,
        minutes: 10,
        path: i.lastTopicPath ?? '/app/study/review',
      ),
    );
  }
  if (rest.length < planMinItems) {
    rest.add(
      const PlanItem(
        kind: PlanKind.practice,
        title: 'Танд тохирсон бодлого',
        subtitle: 'Дасгал',
        minutes: 10,
        path: '/app/practice',
      ),
    );
  }
  return [...items, ...rest.take(planMaxItems)];
}

/// Төлөвлөгөөний нийт минут.
int planMinutes(List<PlanItem> items) => items.fold(0, (s, p) => s + (p.minutes ?? 0));

/// Танхимын загвар: илгээх цонх нээлттэй, хугацаа дуусаагүй, багш хараахан тэмдэглээгүй, дутуу өдрүүд
/// (шинэ нь эхэнд).
List<HomeworkDue> classroomHomeworkDue(List<HwDay> days, String today, {required DateTime now}) {
  final due =
      days
          .where((d) => !d.upcoming && d.date.compareTo(today) <= 0 && d.mark == null)
          .where((d) => d.deadlineAt == null || d.deadlineAt!.isAfter(now))
          .where((d) => canSendPhoto(d, today) && !dayDone(d))
          .toList()
        ..sort((a, b) => b.date.compareTo(a.date));
  return [
    for (final d in due)
      HomeworkDue(
        title: d.date == today ? 'Өнөөдрийн гэрийн даалгавар' : 'Гэрийн даалгавар',
        subtitle: [dayLabel(d.date, withWeekday: false), d.classroomName].where((s) => s.isNotEmpty).join(', '),
      ),
  ];
}

/// Онлайн загвар: илгээх боломжтой, илгээгээгүй эсвэл буцаагдсан даалгавар (хугацаа ойрхон нь эхэнд).
List<HomeworkDue> onlineHomeworkDue(List<Assignment> list) {
  final due =
      list
          .where((a) => a.canSubmit && (a.status == AssignmentStatus.notDone || a.status == AssignmentStatus.returned))
          .toList()
        ..sort((a, b) {
          final x = a.dueDate, y = b.dueDate;
          if (x == null && y == null) return 0;
          if (x == null) return 1;
          if (y == null) return -1;
          return x.compareTo(y);
        });
  return [
    for (final a in due)
      HomeworkDue(
        title: a.title.trim().isEmpty ? 'Гэрийн даалгавар' : a.title.trim(),
        subtitle: a.status == AssignmentStatus.returned
            ? 'Дахин илгээх'
            : a.dueDate == null
            ? null
            : 'Хугацаа ${dayLabel(UbDateTime.fromInstant(a.dueDate!).dateKey, withWeekday: false)}',
      ),
  ];
}

/// Сүүлийн (өнөөдөр эсвэл өмнөх) хичээлийн сэдэв.
String? lastLessonTopic(List<HwDay> days, String today) {
  final past = days.where((d) => d.date.compareTo(today) <= 0 && (d.topic?.trim().isNotEmpty ?? false)).toList()
    ..sort((a, b) => b.date.compareTo(a.date));
  return past.isEmpty ? null : past.first.topic!.trim();
}

/// Дараагийн хичээл: өнөөдөр эсвэл ирэх хамгийн ойрын өдөр.
HwDay? nextLesson(List<HwDay> days, String today) {
  final next = days.where((d) => d.date.compareTo(today) >= 0).toList()..sort((a, b) => a.date.compareTo(b.date));
  return next.isEmpty ? null : next.first;
}

@immutable
class UpcomingExam {
  const UpcomingExam({required this.title, required this.at});

  final String title;
  final UbDateTime? at;
}

/// Ирэх [withinDays] хоногийн хамгийн ойрын шалгалт (`/exam-results/my`-ийн `upcoming`).
UpcomingExam? nextExam(List<TestRow> exams, UbDateTime now, {int withinDays = 14}) {
  final limit = now.startOfDay.addDays(withinDays + 1);
  final upcoming = exams.where((e) => e.upcoming).toList()
    ..sort((a, b) {
      final x = a.assignedAt, y = b.assignedAt;
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return x.compareTo(y);
    });
  for (final e in upcoming) {
    final at = e.assignedAt == null ? null : UbDateTime.fromInstant(e.assignedAt!);
    if (at != null && at.compareTo(limit) >= 0) continue;
    return UpcomingExam(title: e.title, at: at);
  }
  return null;
}

/// Сэдвийн эзэмшлийн 4 түвшин (Khan Academy). Серверийн 0–100 баримжааг харуулах шат.
enum MasteryLevel {
  attempted('Оролдсон'),
  familiar('Танил'),
  proficient('Чадвартай'),
  mastered('Эзэмшсэн');

  const MasteryLevel(this.label);

  final String label;

  /// 0–49 Оролдсон, 50–69 Танил, 70–89 Чадвартай, 90–100 Эзэмшсэн.
  static MasteryLevel fromPercent(int p) => p >= 90
      ? mastered
      : p >= 70
      ? proficient
      : p >= 50
      ? familiar
      : attempted;

  /// Дүүрсэн хэсэг (1–4).
  int get steps => index + 1;
}

/// Хамгийн сул [count] сэдэв (хэмжигдсэн, эзэмшил өсөхөөр).
List<ReadinessTopic> weakestTopics(Readiness r, {int count = 3}) => r.measuredTopics.take(count).toList();

/// Сурагчийн өөрөө тавьсан 7 хоногийн зорилго ба энэ 7 хоногийн идэвхтэй өдөр.
@immutable
class WeeklyGoalProgress {
  const WeeklyGoalProgress({required this.goal, required this.activeDays});

  /// 1–7.
  final int goal;
  final int activeDays;

  bool get reached => activeDays >= goal;

  int get remaining => reached ? 0 : goal - activeDays;
}

/// Зорилгын зөвшөөрөгдсөн утга.
int clampWeeklyGoal(int n) => n.clamp(1, 7);

/// «Давтах» тоолуурын хэсгүүд. Хугацаатай давталтын бодлого өнөөдрийн алдаатай давхцвал нэг удаа л тоолно.
@immutable
class ReviewCounts {
  const ReviewCounts({required this.mistakes, required this.formulas, required this.problems});

  final int mistakes;
  final int formulas;

  /// Алдаанаас гадуурх хугацаа нь болсон бодлого.
  final int problems;

  int get total => mistakes + formulas + problems;
}

/// [dueTotal] — серверийн нийт тоо, [dueProblemIds] — ачаалсан мөрүүдийн бодлого.
ReviewCounts reviewCounts({
  required List<String> mistakeProblemIds,
  required int formulas,
  required int dueTotal,
  required List<String> dueProblemIds,
}) {
  final mistakes = mistakeProblemIds.toSet();
  final overlap = dueProblemIds.where(mistakes.contains).toSet().length;
  return ReviewCounts(
    mistakes: mistakeProblemIds.length,
    formulas: formulas < 0 ? 0 : formulas,
    problems: (dueTotal - overlap).clamp(0, 100000),
  );
}
