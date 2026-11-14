import 'package:freezed_annotation/freezed_annotation.dart';

part 'weekly_report.freezed.dart';
part 'weekly_report.g.dart';

/// `GET /parents/weekly-report?studentId=&week=YYYY-MM-DD` (угтвар `/parents` — олон тоо!).
@freezed
abstract class WeeklyReport with _$WeeklyReport {
  const factory WeeklyReport({
    @Default(ReportStudent()) ReportStudent student,
    required ReportWeek week,
    @Default(ReportAttendance()) ReportAttendance attendance,
    @Default(<ReportTest>[]) List<ReportTest> tests,
    @Default(true) bool testResultsComplete,
    int? testResultLimit,
    String? snapshotAt,
    @Default(0) int practiceCount,
    @Default(ReportHomework()) ReportHomework homework,
    @Default(ReportTopics()) ReportTopics topics,
    @Default(<ReportLesson>[]) List<ReportLesson> nextWeekSchedule,
  }) = _WeeklyReport;

  factory WeeklyReport.fromJson(Map<String, Object?> json) => _$WeeklyReportFromJson(json);
}

@freezed
abstract class ReportStudent with _$ReportStudent {
  const factory ReportStudent({String? id, @Default('') String firstName, @Default('') String lastName}) =
      _ReportStudent;

  factory ReportStudent.fromJson(Map<String, Object?> json) => _$ReportStudentFromJson(json);
}

@freezed
abstract class ReportWeek with _$ReportWeek {
  const factory ReportWeek({required String start, required String end}) = _ReportWeek;

  factory ReportWeek.fromJson(Map<String, Object?> json) => _$ReportWeekFromJson(json);
}

/// `present` = PRESENT + LATE (сервер тооцсон).
@freezed
abstract class ReportAttendance with _$ReportAttendance {
  const factory ReportAttendance({@Default(0) int present, @Default(0) int absent, @Default(0) int excused}) =
      _ReportAttendance;

  factory ReportAttendance.fromJson(Map<String, Object?> json) => _$ReportAttendanceFromJson(json);
}

@freezed
abstract class ReportTest with _$ReportTest {
  const factory ReportTest({@Default('') String title, num? score, num? maxScore, String? createdAt}) = _ReportTest;

  factory ReportTest.fromJson(Map<String, Object?> json) => _$ReportTestFromJson(json);
}

@freezed
abstract class ReportHomework with _$ReportHomework {
  const factory ReportHomework({
    @Default(ReportAssignments()) ReportAssignments assignments,
    @Default(ReportDailyMarks()) ReportDailyMarks dailyMarks,

    /// Энэ долоо хоногт шалгалтаар шалгасан даалгаврын оноо (эзэн 2026-11-08 19:08), огноогоор.
    @Default(<ReportQuiz>[]) List<ReportQuiz> quizzes,
  }) = _ReportHomework;

  factory ReportHomework.fromJson(Map<String, Object?> json) => _$ReportHomeworkFromJson(json);
}

@freezed
abstract class ReportQuiz with _$ReportQuiz {
  const factory ReportQuiz({
    required String date,
    @Default('') String classroom,
    @Default(0) double score,
    @Default(0) int problemCount,
  }) = _ReportQuiz;

  factory ReportQuiz.fromJson(Map<String, Object?> json) => _$ReportQuizFromJson(json);
}

@freezed
abstract class ReportAssignments with _$ReportAssignments {
  const factory ReportAssignments({
    @Default(0) int done,
    @Default(0) int notDone,
    @Default(<ReportAssignmentItem>[]) List<ReportAssignmentItem> items,
  }) = _ReportAssignments;

  factory ReportAssignments.fromJson(Map<String, Object?> json) => _$ReportAssignmentsFromJson(json);
}

@freezed
abstract class ReportAssignmentItem with _$ReportAssignmentItem {
  const factory ReportAssignmentItem({@Default('') String title, String? dueDate, @Default(false) bool done}) =
      _ReportAssignmentItem;

  factory ReportAssignmentItem.fromJson(Map<String, Object?> json) => _$ReportAssignmentItemFromJson(json);
}

@freezed
abstract class ReportDailyMarks with _$ReportDailyMarks {
  const factory ReportDailyMarks({
    @Default(0) int done,
    @Default(0) int partial,
    @Default(0) int notDone,
    @Default(0) int unmarked,
  }) = _ReportDailyMarks;

  factory ReportDailyMarks.fromJson(Map<String, Object?> json) => _$ReportDailyMarksFromJson(json);
}

@freezed
abstract class ReportTopics with _$ReportTopics {
  const factory ReportTopics({
    ReportTopic? best,
    ReportTopic? weakest,
    @Default(true) bool complete,
    int? sampleLimit,
  }) = _ReportTopics;

  factory ReportTopics.fromJson(Map<String, Object?> json) => _$ReportTopicsFromJson(json);
}

@freezed
abstract class ReportTopic with _$ReportTopic {
  const factory ReportTopic({required String topic, @Default(0) num rate}) = _ReportTopic;

  factory ReportTopic.fromJson(Map<String, Object?> json) => _$ReportTopicFromJson(json);
}

/// Дараагийн 7 хоногийн хичээл. `date` UB `YYYY-MM-DD`, `startMinute`/`endMinute` — UB шөнө дундаас
/// хойших минут. Гараг тооцох шаардлагагүй (`date` бэлэн).
@freezed
abstract class ReportLesson with _$ReportLesson {
  const factory ReportLesson({
    required String date,
    @Default(0) int startMinute,
    @Default(0) int endMinute,
    String? room,
    @Default('') String classroom,
  }) = _ReportLesson;

  factory ReportLesson.fromJson(Map<String, Object?> json) => _$ReportLessonFromJson(json);
}
