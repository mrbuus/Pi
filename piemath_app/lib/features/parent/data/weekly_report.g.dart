// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'weekly_report.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_WeeklyReport _$WeeklyReportFromJson(Map<String, dynamic> json) =>
    _WeeklyReport(
      student: json['student'] == null
          ? const ReportStudent()
          : ReportStudent.fromJson(json['student'] as Map<String, dynamic>),
      week: ReportWeek.fromJson(json['week'] as Map<String, dynamic>),
      attendance: json['attendance'] == null
          ? const ReportAttendance()
          : ReportAttendance.fromJson(
              json['attendance'] as Map<String, dynamic>,
            ),
      tests:
          (json['tests'] as List<dynamic>?)
              ?.map((e) => ReportTest.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ReportTest>[],
      testResultsComplete: json['testResultsComplete'] as bool? ?? true,
      testResultLimit: (json['testResultLimit'] as num?)?.toInt(),
      snapshotAt: json['snapshotAt'] as String?,
      practiceCount: (json['practiceCount'] as num?)?.toInt() ?? 0,
      homework: json['homework'] == null
          ? const ReportHomework()
          : ReportHomework.fromJson(json['homework'] as Map<String, dynamic>),
      topics: json['topics'] == null
          ? const ReportTopics()
          : ReportTopics.fromJson(json['topics'] as Map<String, dynamic>),
      nextWeekSchedule:
          (json['nextWeekSchedule'] as List<dynamic>?)
              ?.map((e) => ReportLesson.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ReportLesson>[],
    );

Map<String, dynamic> _$WeeklyReportToJson(_WeeklyReport instance) =>
    <String, dynamic>{
      'student': instance.student,
      'week': instance.week,
      'attendance': instance.attendance,
      'tests': instance.tests,
      'testResultsComplete': instance.testResultsComplete,
      'testResultLimit': instance.testResultLimit,
      'snapshotAt': instance.snapshotAt,
      'practiceCount': instance.practiceCount,
      'homework': instance.homework,
      'topics': instance.topics,
      'nextWeekSchedule': instance.nextWeekSchedule,
    };

_ReportStudent _$ReportStudentFromJson(Map<String, dynamic> json) =>
    _ReportStudent(
      id: json['id'] as String?,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
    );

Map<String, dynamic> _$ReportStudentToJson(_ReportStudent instance) =>
    <String, dynamic>{
      'id': instance.id,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
    };

_ReportWeek _$ReportWeekFromJson(Map<String, dynamic> json) =>
    _ReportWeek(start: json['start'] as String, end: json['end'] as String);

Map<String, dynamic> _$ReportWeekToJson(_ReportWeek instance) =>
    <String, dynamic>{'start': instance.start, 'end': instance.end};

_ReportAttendance _$ReportAttendanceFromJson(Map<String, dynamic> json) =>
    _ReportAttendance(
      present: (json['present'] as num?)?.toInt() ?? 0,
      absent: (json['absent'] as num?)?.toInt() ?? 0,
      excused: (json['excused'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$ReportAttendanceToJson(_ReportAttendance instance) =>
    <String, dynamic>{
      'present': instance.present,
      'absent': instance.absent,
      'excused': instance.excused,
    };

_ReportTest _$ReportTestFromJson(Map<String, dynamic> json) => _ReportTest(
  title: json['title'] as String? ?? '',
  score: json['score'] as num?,
  maxScore: json['maxScore'] as num?,
  createdAt: json['createdAt'] as String?,
);

Map<String, dynamic> _$ReportTestToJson(_ReportTest instance) =>
    <String, dynamic>{
      'title': instance.title,
      'score': instance.score,
      'maxScore': instance.maxScore,
      'createdAt': instance.createdAt,
    };

_ReportHomework _$ReportHomeworkFromJson(
  Map<String, dynamic> json,
) => _ReportHomework(
  assignments: json['assignments'] == null
      ? const ReportAssignments()
      : ReportAssignments.fromJson(json['assignments'] as Map<String, dynamic>),
  dailyMarks: json['dailyMarks'] == null
      ? const ReportDailyMarks()
      : ReportDailyMarks.fromJson(json['dailyMarks'] as Map<String, dynamic>),
  quizzes:
      (json['quizzes'] as List<dynamic>?)
          ?.map((e) => ReportQuiz.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <ReportQuiz>[],
);

Map<String, dynamic> _$ReportHomeworkToJson(_ReportHomework instance) =>
    <String, dynamic>{
      'assignments': instance.assignments,
      'dailyMarks': instance.dailyMarks,
      'quizzes': instance.quizzes,
    };

_ReportQuiz _$ReportQuizFromJson(Map<String, dynamic> json) => _ReportQuiz(
  date: json['date'] as String,
  classroom: json['classroom'] as String? ?? '',
  score: (json['score'] as num?)?.toDouble() ?? 0,
  problemCount: (json['problemCount'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$ReportQuizToJson(_ReportQuiz instance) =>
    <String, dynamic>{
      'date': instance.date,
      'classroom': instance.classroom,
      'score': instance.score,
      'problemCount': instance.problemCount,
    };

_ReportAssignments _$ReportAssignmentsFromJson(Map<String, dynamic> json) =>
    _ReportAssignments(
      done: (json['done'] as num?)?.toInt() ?? 0,
      notDone: (json['notDone'] as num?)?.toInt() ?? 0,
      items:
          (json['items'] as List<dynamic>?)
              ?.map(
                (e) => ReportAssignmentItem.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          const <ReportAssignmentItem>[],
    );

Map<String, dynamic> _$ReportAssignmentsToJson(_ReportAssignments instance) =>
    <String, dynamic>{
      'done': instance.done,
      'notDone': instance.notDone,
      'items': instance.items,
    };

_ReportAssignmentItem _$ReportAssignmentItemFromJson(
  Map<String, dynamic> json,
) => _ReportAssignmentItem(
  title: json['title'] as String? ?? '',
  dueDate: json['dueDate'] as String?,
  done: json['done'] as bool? ?? false,
);

Map<String, dynamic> _$ReportAssignmentItemToJson(
  _ReportAssignmentItem instance,
) => <String, dynamic>{
  'title': instance.title,
  'dueDate': instance.dueDate,
  'done': instance.done,
};

_ReportDailyMarks _$ReportDailyMarksFromJson(Map<String, dynamic> json) =>
    _ReportDailyMarks(
      done: (json['done'] as num?)?.toInt() ?? 0,
      partial: (json['partial'] as num?)?.toInt() ?? 0,
      notDone: (json['notDone'] as num?)?.toInt() ?? 0,
      unmarked: (json['unmarked'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$ReportDailyMarksToJson(_ReportDailyMarks instance) =>
    <String, dynamic>{
      'done': instance.done,
      'partial': instance.partial,
      'notDone': instance.notDone,
      'unmarked': instance.unmarked,
    };

_ReportTopics _$ReportTopicsFromJson(Map<String, dynamic> json) =>
    _ReportTopics(
      best: json['best'] == null
          ? null
          : ReportTopic.fromJson(json['best'] as Map<String, dynamic>),
      weakest: json['weakest'] == null
          ? null
          : ReportTopic.fromJson(json['weakest'] as Map<String, dynamic>),
      complete: json['complete'] as bool? ?? true,
      sampleLimit: (json['sampleLimit'] as num?)?.toInt(),
    );

Map<String, dynamic> _$ReportTopicsToJson(_ReportTopics instance) =>
    <String, dynamic>{
      'best': instance.best,
      'weakest': instance.weakest,
      'complete': instance.complete,
      'sampleLimit': instance.sampleLimit,
    };

_ReportTopic _$ReportTopicFromJson(Map<String, dynamic> json) => _ReportTopic(
  topic: json['topic'] as String,
  rate: json['rate'] as num? ?? 0,
);

Map<String, dynamic> _$ReportTopicToJson(_ReportTopic instance) =>
    <String, dynamic>{'topic': instance.topic, 'rate': instance.rate};

_ReportLesson _$ReportLessonFromJson(Map<String, dynamic> json) =>
    _ReportLesson(
      date: json['date'] as String,
      startMinute: (json['startMinute'] as num?)?.toInt() ?? 0,
      endMinute: (json['endMinute'] as num?)?.toInt() ?? 0,
      room: json['room'] as String?,
      classroom: json['classroom'] as String? ?? '',
    );

Map<String, dynamic> _$ReportLessonToJson(_ReportLesson instance) =>
    <String, dynamic>{
      'date': instance.date,
      'startMinute': instance.startMinute,
      'endMinute': instance.endMinute,
      'room': instance.room,
      'classroom': instance.classroom,
    };
