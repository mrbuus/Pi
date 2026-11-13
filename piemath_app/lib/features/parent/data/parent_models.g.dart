// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ClassroomRef _$ClassroomRefFromJson(Map<String, dynamic> json) =>
    _ClassroomRef(
      id: json['id'] as String?,
      name: json['name'] as String? ?? '',
      grade: (json['grade'] as num?)?.toInt(),
    );

Map<String, dynamic> _$ClassroomRefToJson(_ClassroomRef instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'grade': instance.grade,
    };

_ChildProfile _$ChildProfileFromJson(Map<String, dynamic> json) =>
    _ChildProfile(
      grade: (json['grade'] as num?)?.toInt(),
      school: json['school'] as String?,
      type: json['type'] as String?,
    );

Map<String, dynamic> _$ChildProfileToJson(_ChildProfile instance) =>
    <String, dynamic>{
      'grade': instance.grade,
      'school': instance.school,
      'type': instance.type,
    };

_AttendanceEntry _$AttendanceEntryFromJson(Map<String, dynamic> json) =>
    _AttendanceEntry(
      date: json['date'] as String,
      status: json['status'] as String,
      classroom: json['classroom'] == null
          ? const ClassroomRef()
          : ClassroomRef.fromJson(json['classroom'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$AttendanceEntryToJson(_AttendanceEntry instance) =>
    <String, dynamic>{
      'date': instance.date,
      'status': instance.status,
      'classroom': instance.classroom,
    };

_HomeworkMarkEntry _$HomeworkMarkEntryFromJson(Map<String, dynamic> json) =>
    _HomeworkMarkEntry(
      date: json['date'] as String,
      status: json['status'] as String,
      comment: json['comment'] as String?,
      classroom: json['classroom'] == null
          ? const ClassroomRef()
          : ClassroomRef.fromJson(json['classroom'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$HomeworkMarkEntryToJson(_HomeworkMarkEntry instance) =>
    <String, dynamic>{
      'date': instance.date,
      'status': instance.status,
      'comment': instance.comment,
      'classroom': instance.classroom,
    };

_HomeworkQuizEntry _$HomeworkQuizEntryFromJson(Map<String, dynamic> json) =>
    _HomeworkQuizEntry(
      date: json['date'] as String,
      classroom: json['classroom'] as String? ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0,
      problemCount: (json['problemCount'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$HomeworkQuizEntryToJson(_HomeworkQuizEntry instance) =>
    <String, dynamic>{
      'date': instance.date,
      'classroom': instance.classroom,
      'score': instance.score,
      'problemCount': instance.problemCount,
    };

_AssignmentRef _$AssignmentRefFromJson(Map<String, dynamic> json) =>
    _AssignmentRef(
      title: json['title'] as String? ?? '',
      dueDate: json['dueDate'] as String?,
      classroom: json['classroom'] == null
          ? null
          : ClassroomRef.fromJson(json['classroom'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$AssignmentRefToJson(_AssignmentRef instance) =>
    <String, dynamic>{
      'title': instance.title,
      'dueDate': instance.dueDate,
      'classroom': instance.classroom,
    };

_SubmissionEntry _$SubmissionEntryFromJson(Map<String, dynamic> json) =>
    _SubmissionEntry(
      id: json['id'] as String,
      state: json['state'] as String,
      imageKeys:
          (json['imageKeys'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
      submittedAt: json['submittedAt'] as String?,
      checkedAt: json['checkedAt'] as String?,
      assignment: json['assignment'] == null
          ? const AssignmentRef()
          : AssignmentRef.fromJson(json['assignment'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$SubmissionEntryToJson(_SubmissionEntry instance) =>
    <String, dynamic>{
      'id': instance.id,
      'state': instance.state,
      'imageKeys': instance.imageKeys,
      'submittedAt': instance.submittedAt,
      'checkedAt': instance.checkedAt,
      'assignment': instance.assignment,
    };

_TestRef _$TestRefFromJson(Map<String, dynamic> json) => _TestRef(
  title: json['title'] as String? ?? '',
  type: json['type'] as String?,
);

Map<String, dynamic> _$TestRefToJson(_TestRef instance) => <String, dynamic>{
  'title': instance.title,
  'type': instance.type,
};

_Acknowledgement _$AcknowledgementFromJson(Map<String, dynamic> json) =>
    _Acknowledgement(verifiedAt: json['verifiedAt'] as String?);

Map<String, dynamic> _$AcknowledgementToJson(_Acknowledgement instance) =>
    <String, dynamic>{'verifiedAt': instance.verifiedAt};

_TestResultEntry _$TestResultEntryFromJson(Map<String, dynamic> json) =>
    _TestResultEntry(
      id: json['id'] as String,
      totalScore: json['totalScore'] as num?,
      maxScore: json['maxScore'] as num?,
      source: json['source'] as String?,
      createdAt: json['createdAt'] as String,
      test: json['test'] == null
          ? const TestRef()
          : TestRef.fromJson(json['test'] as Map<String, dynamic>),
      acknowledgements:
          (json['acknowledgements'] as List<dynamic>?)
              ?.map((e) => Acknowledgement.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <Acknowledgement>[],
    );

Map<String, dynamic> _$TestResultEntryToJson(_TestResultEntry instance) =>
    <String, dynamic>{
      'id': instance.id,
      'totalScore': instance.totalScore,
      'maxScore': instance.maxScore,
      'source': instance.source,
      'createdAt': instance.createdAt,
      'test': instance.test,
      'acknowledgements': instance.acknowledgements,
    };

_ChildPayment _$ChildPaymentFromJson(Map<String, dynamic> json) =>
    _ChildPayment(
      id: json['id'] as String,
      status: json['status'] as String,
      amount: json['amount'] as num? ?? 0,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$ChildPaymentToJson(_ChildPayment instance) =>
    <String, dynamic>{
      'id': instance.id,
      'status': instance.status,
      'amount': instance.amount,
      'createdAt': instance.createdAt,
    };

_ChildStudent _$ChildStudentFromJson(
  Map<String, dynamic> json,
) => _ChildStudent(
  id: json['id'] as String,
  firstName: json['firstName'] as String? ?? '',
  lastName: json['lastName'] as String? ?? '',
  phone: json['phone'] as String?,
  studentProfile: json['studentProfile'] == null
      ? null
      : ChildProfile.fromJson(json['studentProfile'] as Map<String, dynamic>),
  classroom: json['classroom'] == null
      ? null
      : ClassroomRef.fromJson(json['classroom'] as Map<String, dynamic>),
  attendances:
      (json['attendances'] as List<dynamic>?)
          ?.map((e) => AttendanceEntry.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <AttendanceEntry>[],
  dailyHomeworkMarks:
      (json['dailyHomeworkMarks'] as List<dynamic>?)
          ?.map((e) => HomeworkMarkEntry.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <HomeworkMarkEntry>[],
  homeworkQuizzes:
      (json['homeworkQuizzes'] as List<dynamic>?)
          ?.map((e) => HomeworkQuizEntry.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <HomeworkQuizEntry>[],
  submissions:
      (json['submissions'] as List<dynamic>?)
          ?.map((e) => SubmissionEntry.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <SubmissionEntry>[],
  testResults:
      (json['testResults'] as List<dynamic>?)
          ?.map((e) => TestResultEntry.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <TestResultEntry>[],
  payments:
      (json['payments'] as List<dynamic>?)
          ?.map((e) => ChildPayment.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <ChildPayment>[],
);

Map<String, dynamic> _$ChildStudentToJson(_ChildStudent instance) =>
    <String, dynamic>{
      'id': instance.id,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'phone': instance.phone,
      'studentProfile': instance.studentProfile,
      'classroom': instance.classroom,
      'attendances': instance.attendances,
      'dailyHomeworkMarks': instance.dailyHomeworkMarks,
      'homeworkQuizzes': instance.homeworkQuizzes,
      'submissions': instance.submissions,
      'testResults': instance.testResults,
      'payments': instance.payments,
    };

_ParentLink _$ParentLinkFromJson(Map<String, dynamic> json) => _ParentLink(
  id: json['id'] as String,
  verified: json['verified'] as bool? ?? false,
  verifiedAt: json['verifiedAt'] as String?,
  student: ChildStudent.fromJson(json['student'] as Map<String, dynamic>),
);

Map<String, dynamic> _$ParentLinkToJson(_ParentLink instance) =>
    <String, dynamic>{
      'id': instance.id,
      'verified': instance.verified,
      'verifiedAt': instance.verifiedAt,
      'student': instance.student,
    };

_ExamResultCardData _$ExamResultCardDataFromJson(Map<String, dynamic> json) =>
    _ExamResultCardData(
      testResultId: json['testResultId'] as String,
      test: json['test'] == null
          ? const TestRef()
          : TestRef.fromJson(json['test'] as Map<String, dynamic>),
      totalScore: json['totalScore'] as num? ?? 0,
      maxScore: json['maxScore'] as num? ?? 0,
      percent: json['percent'] as num? ?? 0,
      parts: json['parts'] == null
          ? null
          : ExamParts.fromJson(json['parts'] as Map<String, dynamic>),
      weakTopics:
          (json['weakTopics'] as List<dynamic>?)
              ?.map((e) => WeakTopic.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <WeakTopic>[],
      takenAt: json['takenAt'] as String,
      acknowledgedAt: json['acknowledgedAt'] as String?,
      canAcknowledge: json['canAcknowledge'] as bool? ?? false,
    );

Map<String, dynamic> _$ExamResultCardDataToJson(_ExamResultCardData instance) =>
    <String, dynamic>{
      'testResultId': instance.testResultId,
      'test': instance.test,
      'totalScore': instance.totalScore,
      'maxScore': instance.maxScore,
      'percent': instance.percent,
      'parts': instance.parts,
      'weakTopics': instance.weakTopics,
      'takenAt': instance.takenAt,
      'acknowledgedAt': instance.acknowledgedAt,
      'canAcknowledge': instance.canAcknowledge,
    };

_ExamParts _$ExamPartsFromJson(Map<String, dynamic> json) => _ExamParts(
  part1: json['part1'] as num? ?? 0,
  part1Max: json['part1Max'] as num? ?? 0,
  part2: json['part2'] as num? ?? 0,
  part2Max: json['part2Max'] as num? ?? 0,
);

Map<String, dynamic> _$ExamPartsToJson(_ExamParts instance) =>
    <String, dynamic>{
      'part1': instance.part1,
      'part1Max': instance.part1Max,
      'part2': instance.part2,
      'part2Max': instance.part2Max,
    };

_WeakTopic _$WeakTopicFromJson(Map<String, dynamic> json) => _WeakTopic(
  name: json['name'] as String,
  percent: json['percent'] as num? ?? 0,
);

Map<String, dynamic> _$WeakTopicToJson(_WeakTopic instance) =>
    <String, dynamic>{'name': instance.name, 'percent': instance.percent};
