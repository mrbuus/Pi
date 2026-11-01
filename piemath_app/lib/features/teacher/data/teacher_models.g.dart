// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'teacher_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_BoardLesson _$BoardLessonFromJson(Map<String, dynamic> json) => _BoardLesson(
  scheduleId: json['scheduleId'] as String,
  startMinute: (json['startMinute'] as num).toInt(),
  endMinute: (json['endMinute'] as num).toInt(),
  room: json['room'] as String?,
  topic: json['topic'] as String?,
  teacherName: json['teacherName'] as String?,
  leadTeacher: json['leadTeacher'] as String?,
  assistantTeacher: json['assistantTeacher'] as String?,
  mine: json['mine'] as bool? ?? false,
);

Map<String, dynamic> _$BoardLessonToJson(_BoardLesson instance) => <String, dynamic>{
  'scheduleId': instance.scheduleId,
  'startMinute': instance.startMinute,
  'endMinute': instance.endMinute,
  'room': instance.room,
  'topic': instance.topic,
  'teacherName': instance.teacherName,
  'leadTeacher': instance.leadTeacher,
  'assistantTeacher': instance.assistantTeacher,
  'mine': instance.mine,
};

_DayClass _$DayClassFromJson(Map<String, dynamic> json) => _DayClass(
  id: json['id'] as String,
  name: json['name'] as String,
  type: json['type'] as String? ?? 'IN_PERSON',
  grade: (json['grade'] as num?)?.toInt(),
  studentCount: (json['studentCount'] as num?)?.toInt() ?? 0,
  lessons:
      (json['lessons'] as List<dynamic>?)?.map((e) => BoardLesson.fromJson(e as Map<String, dynamic>)).toList() ??
      const <BoardLesson>[],
);

Map<String, dynamic> _$DayClassToJson(_DayClass instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'type': instance.type,
  'grade': instance.grade,
  'studentCount': instance.studentCount,
  'lessons': instance.lessons,
};

_DayBoard _$DayBoardFromJson(Map<String, dynamic> json) => _DayBoard(
  date: json['date'] as String,
  classes:
      (json['classes'] as List<dynamic>?)?.map((e) => DayClass.fromJson(e as Map<String, dynamic>)).toList() ??
      const <DayClass>[],
  selected: json['selected'] == null ? null : DayClass.fromJson(json['selected'] as Map<String, dynamic>),
);

Map<String, dynamic> _$DayBoardToJson(_DayBoard instance) => <String, dynamic>{
  'date': instance.date,
  'classes': instance.classes,
  'selected': instance.selected,
};

_BoardStudent _$BoardStudentFromJson(Map<String, dynamic> json) => _BoardStudent(
  id: json['id'] as String,
  firstName: json['firstName'] as String? ?? '',
  lastName: json['lastName'] as String?,
  code: json['code'] as String?,
);

Map<String, dynamic> _$BoardStudentToJson(_BoardStudent instance) => <String, dynamic>{
  'id': instance.id,
  'firstName': instance.firstName,
  'lastName': instance.lastName,
  'code': instance.code,
};

_AttRow _$AttRowFromJson(Map<String, dynamic> json) => _AttRow(
  studentId: json['studentId'] as String,
  status: const AttStatusConverter().fromJson(json['status']),
  note: json['note'] as String?,
  lateRange: const LateRangeConverter().fromJson(json['lateRange']),
  markedBy: json['markedBy'] as String?,
);

Map<String, dynamic> _$AttRowToJson(_AttRow instance) => <String, dynamic>{
  'studentId': instance.studentId,
  'status': const AttStatusConverter().toJson(instance.status),
  'note': instance.note,
  'lateRange': const LateRangeConverter().toJson(instance.lateRange),
  'markedBy': instance.markedBy,
};

_HwRow _$HwRowFromJson(Map<String, dynamic> json) => _HwRow(
  studentId: json['studentId'] as String,
  status: const HwStatusConverter().fromJson(json['status']),
  comment: json['comment'] as String?,
  markedBy: json['markedBy'] as String?,
  updatedAt: json['updatedAt'] as String?,
);

Map<String, dynamic> _$HwRowToJson(_HwRow instance) => <String, dynamic>{
  'studentId': instance.studentId,
  'status': const HwStatusConverter().toJson(instance.status),
  'comment': instance.comment,
  'markedBy': instance.markedBy,
  'updatedAt': instance.updatedAt,
};

_RiskFlag _$RiskFlagFromJson(Map<String, dynamic> json) =>
    _RiskFlag(kind: json['kind'] as String, label: json['label'] as String);

Map<String, dynamic> _$RiskFlagToJson(_RiskFlag instance) => <String, dynamic>{
  'kind': instance.kind,
  'label': instance.label,
};

_Recorder _$RecorderFromJson(Map<String, dynamic> json) => _Recorder(
  id: json['id'] as String,
  name: json['name'] as String,
  at: json['at'] as String?,
  count: (json['count'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$RecorderToJson(_Recorder instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'at': instance.at,
  'count': instance.count,
};

_RecordedBy _$RecordedByFromJson(Map<String, dynamic> json) => _RecordedBy(
  attendance:
      (json['attendance'] as List<dynamic>?)?.map((e) => Recorder.fromJson(e as Map<String, dynamic>)).toList() ??
      const <Recorder>[],
  homework:
      (json['homework'] as List<dynamic>?)?.map((e) => Recorder.fromJson(e as Map<String, dynamic>)).toList() ??
      const <Recorder>[],
);

Map<String, dynamic> _$RecordedByToJson(_RecordedBy instance) => <String, dynamic>{
  'attendance': instance.attendance,
  'homework': instance.homework,
};

_MarksPayload _$MarksPayloadFromJson(Map<String, dynamic> json) => _MarksPayload(
  date: json['date'] as String,
  attendance:
      (json['attendance'] as List<dynamic>?)?.map((e) => AttRow.fromJson(e as Map<String, dynamic>)).toList() ??
      const <AttRow>[],
  homework:
      (json['homework'] as List<dynamic>?)?.map((e) => HwRow.fromJson(e as Map<String, dynamic>)).toList() ??
      const <HwRow>[],
  risk:
      (json['risk'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, (e as List<dynamic>).map((e) => RiskFlag.fromJson(e as Map<String, dynamic>)).toList()),
      ) ??
      const <String, List<RiskFlag>>{},
  recordedBy: json['recordedBy'] == null ? null : RecordedBy.fromJson(json['recordedBy'] as Map<String, dynamic>),
  sent: (readSentStudents(json, 'sent') as List<dynamic>?)?.map((e) => e as String).toList() ?? const <String>[],
);

Map<String, dynamic> _$MarksPayloadToJson(_MarksPayload instance) => <String, dynamic>{
  'date': instance.date,
  'attendance': instance.attendance,
  'homework': instance.homework,
  'risk': instance.risk,
  'recordedBy': instance.recordedBy,
  'sent': instance.sent,
};

_BoardClassroom _$BoardClassroomFromJson(Map<String, dynamic> json) => _BoardClassroom(
  id: json['id'] as String,
  name: json['name'] as String,
  type: json['type'] as String? ?? 'IN_PERSON',
  grade: (json['grade'] as num?)?.toInt(),
);

Map<String, dynamic> _$BoardClassroomToJson(_BoardClassroom instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'type': instance.type,
  'grade': instance.grade,
};

_BoardPayload _$BoardPayloadFromJson(Map<String, dynamic> json) => _BoardPayload(
  date: json['date'] as String,
  today: json['today'] as String,
  classroom: BoardClassroom.fromJson(json['classroom'] as Map<String, dynamic>),
  holiday: json['holiday'] as String?,
  lessons:
      (json['lessons'] as List<dynamic>?)?.map((e) => BoardLesson.fromJson(e as Map<String, dynamic>)).toList() ??
      const <BoardLesson>[],
  students:
      (json['students'] as List<dynamic>?)?.map((e) => BoardStudent.fromJson(e as Map<String, dynamic>)).toList() ??
      const <BoardStudent>[],
  attendance:
      (json['attendance'] as List<dynamic>?)?.map((e) => AttRow.fromJson(e as Map<String, dynamic>)).toList() ??
      const <AttRow>[],
  homework:
      (json['homework'] as List<dynamic>?)?.map((e) => HwRow.fromJson(e as Map<String, dynamic>)).toList() ??
      const <HwRow>[],
  risk:
      (json['risk'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, (e as List<dynamic>).map((e) => RiskFlag.fromJson(e as Map<String, dynamic>)).toList()),
      ) ??
      const <String, List<RiskFlag>>{},
  recordedBy: json['recordedBy'] == null ? null : RecordedBy.fromJson(json['recordedBy'] as Map<String, dynamic>),
  sent: (readSentStudents(json, 'sent') as List<dynamic>?)?.map((e) => e as String).toList() ?? const <String>[],
  canEditCriteria: json['canEditCriteria'] as bool? ?? false,
);

Map<String, dynamic> _$BoardPayloadToJson(_BoardPayload instance) => <String, dynamic>{
  'date': instance.date,
  'today': instance.today,
  'classroom': instance.classroom,
  'holiday': instance.holiday,
  'lessons': instance.lessons,
  'students': instance.students,
  'attendance': instance.attendance,
  'homework': instance.homework,
  'risk': instance.risk,
  'recordedBy': instance.recordedBy,
  'sent': instance.sent,
  'canEditCriteria': instance.canEditCriteria,
};

_AttMarkResponse _$AttMarkResponseFromJson(Map<String, dynamic> json) => _AttMarkResponse(
  applied: (json['applied'] as List<dynamic>?)?.map((e) => e as String).toList() ?? const <String>[],
  skipped: (json['skipped'] as List<dynamic>?)?.map((e) => e as String).toList() ?? const <String>[],
  rows:
      (json['rows'] as List<dynamic>?)?.map((e) => AttRow.fromJson(e as Map<String, dynamic>)).toList() ??
      const <AttRow>[],
);

Map<String, dynamic> _$AttMarkResponseToJson(_AttMarkResponse instance) => <String, dynamic>{
  'applied': instance.applied,
  'skipped': instance.skipped,
  'rows': instance.rows,
};

_HwBulkResponse _$HwBulkResponseFromJson(Map<String, dynamic> json) => _HwBulkResponse(
  applied: (json['applied'] as List<dynamic>?)?.map((e) => e as String).toList() ?? const <String>[],
  skipped: (json['skipped'] as List<dynamic>?)?.map((e) => e as String).toList() ?? const <String>[],
  rows:
      (json['rows'] as List<dynamic>?)?.map((e) => HwRow.fromJson(e as Map<String, dynamic>)).toList() ??
      const <HwRow>[],
);

Map<String, dynamic> _$HwBulkResponseToJson(_HwBulkResponse instance) => <String, dynamic>{
  'applied': instance.applied,
  'skipped': instance.skipped,
  'rows': instance.rows,
};

_StaffRef _$StaffRefFromJson(Map<String, dynamic> json) => _StaffRef(
  id: json['id'] as String,
  firstName: json['firstName'] as String? ?? '',
  lastName: json['lastName'] as String?,
  role: json['role'] as String?,
);

Map<String, dynamic> _$StaffRefToJson(_StaffRef instance) => <String, dynamic>{
  'id': instance.id,
  'firstName': instance.firstName,
  'lastName': instance.lastName,
  'role': instance.role,
};

_ClassroomSummary _$ClassroomSummaryFromJson(Map<String, dynamic> json) => _ClassroomSummary(
  id: json['id'] as String,
  name: json['name'] as String,
  type: json['type'] as String? ?? 'IN_PERSON',
  grade: (json['grade'] as num?)?.toInt(),
  teacher: json['teacher'] == null ? null : StaffRef.fromJson(json['teacher'] as Map<String, dynamic>),
  assistantTeacher: json['assistantTeacher'] == null
      ? null
      : StaffRef.fromJson(json['assistantTeacher'] as Map<String, dynamic>),
  studentCount: (readEnrollmentCount(json, 'studentCount') as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$ClassroomSummaryToJson(_ClassroomSummary instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'type': instance.type,
  'grade': instance.grade,
  'teacher': instance.teacher,
  'assistantTeacher': instance.assistantTeacher,
  'studentCount': instance.studentCount,
};

_RosterStudent _$RosterStudentFromJson(Map<String, dynamic> json) => _RosterStudent(
  id: json['id'] as String,
  firstName: json['firstName'] as String? ?? '',
  lastName: json['lastName'] as String?,
  studentCode: json['studentCode'] as String?,
  joinedAt: json['joinedAt'] as String?,
);

Map<String, dynamic> _$RosterStudentToJson(_RosterStudent instance) => <String, dynamic>{
  'id': instance.id,
  'firstName': instance.firstName,
  'lastName': instance.lastName,
  'studentCode': instance.studentCode,
  'joinedAt': instance.joinedAt,
};

_ClassroomDetail _$ClassroomDetailFromJson(Map<String, dynamic> json) => _ClassroomDetail(
  classroom: ClassroomSummary.fromJson(json['classroom'] as Map<String, dynamic>),
  students:
      (json['students'] as List<dynamic>?)?.map((e) => RosterStudent.fromJson(e as Map<String, dynamic>)).toList() ??
      const <RosterStudent>[],
);

Map<String, dynamic> _$ClassroomDetailToJson(_ClassroomDetail instance) => <String, dynamic>{
  'classroom': instance.classroom,
  'students': instance.students,
};

_NamedRef _$NamedRefFromJson(Map<String, dynamic> json) =>
    _NamedRef(id: json['id'] as String, name: json['name'] as String? ?? '');

Map<String, dynamic> _$NamedRefToJson(_NamedRef instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
};

_StudentAttendanceRow _$StudentAttendanceRowFromJson(Map<String, dynamic> json) => _StudentAttendanceRow(
  date: json['date'] as String,
  status: const AttStatusConverter().fromJson(json['status']),
  note: json['note'] as String?,
  lateRange: const LateRangeConverter().fromJson(json['lateRange']),
  classroom: json['classroom'] == null ? null : NamedRef.fromJson(json['classroom'] as Map<String, dynamic>),
);

Map<String, dynamic> _$StudentAttendanceRowToJson(_StudentAttendanceRow instance) => <String, dynamic>{
  'date': instance.date,
  'status': const AttStatusConverter().toJson(instance.status),
  'note': instance.note,
  'lateRange': const LateRangeConverter().toJson(instance.lateRange),
  'classroom': instance.classroom,
};

_StudentHomeworkRow _$StudentHomeworkRowFromJson(Map<String, dynamic> json) => _StudentHomeworkRow(
  date: json['date'] as String,
  status: const HwStatusConverter().fromJson(json['status']),
  comment: json['comment'] as String?,
  classroom: json['classroom'] == null ? null : NamedRef.fromJson(json['classroom'] as Map<String, dynamic>),
);

Map<String, dynamic> _$StudentHomeworkRowToJson(_StudentHomeworkRow instance) => <String, dynamic>{
  'date': instance.date,
  'status': const HwStatusConverter().toJson(instance.status),
  'comment': instance.comment,
  'classroom': instance.classroom,
};

_TestRef _$TestRefFromJson(Map<String, dynamic> json) =>
    _TestRef(id: json['id'] as String, title: json['title'] as String? ?? '', type: json['type'] as String?);

Map<String, dynamic> _$TestRefToJson(_TestRef instance) => <String, dynamic>{
  'id': instance.id,
  'title': instance.title,
  'type': instance.type,
};

_StudentTestResult _$StudentTestResultFromJson(Map<String, dynamic> json) => _StudentTestResult(
  id: json['id'] as String,
  totalScore: (json['totalScore'] as num).toDouble(),
  maxScore: (json['maxScore'] as num).toDouble(),
  createdAt: json['createdAt'] as String?,
  test: json['test'] == null ? null : TestRef.fromJson(json['test'] as Map<String, dynamic>),
);

Map<String, dynamic> _$StudentTestResultToJson(_StudentTestResult instance) => <String, dynamic>{
  'id': instance.id,
  'totalScore': instance.totalScore,
  'maxScore': instance.maxScore,
  'createdAt': instance.createdAt,
  'test': instance.test,
};

_StudentNote _$StudentNoteFromJson(Map<String, dynamic> json) => _StudentNote(
  id: json['id'] as String,
  type: json['type'] as String? ?? 'GENERAL',
  body: json['body'] as String? ?? '',
  authorName: json['authorName'] as String?,
  canEdit: json['canEdit'] as bool? ?? false,
  createdAt: json['createdAt'] as String?,
  updatedAt: json['updatedAt'] as String?,
  promisedOn: json['promisedOn'] as String?,
  resolvedAt: json['resolvedAt'] as String?,
);

Map<String, dynamic> _$StudentNoteToJson(_StudentNote instance) => <String, dynamic>{
  'id': instance.id,
  'type': instance.type,
  'body': instance.body,
  'authorName': instance.authorName,
  'canEdit': instance.canEdit,
  'createdAt': instance.createdAt,
  'updatedAt': instance.updatedAt,
  'promisedOn': instance.promisedOn,
  'resolvedAt': instance.resolvedAt,
};

_HoursSession _$HoursSessionFromJson(Map<String, dynamic> json) => _HoursSession(
  date: json['date'] as String,
  classroomName: json['classroomName'] as String? ?? '',
  startMinute: (json['startMinute'] as num).toInt(),
  endMinute: (json['endMinute'] as num).toInt(),
);

Map<String, dynamic> _$HoursSessionToJson(_HoursSession instance) => <String, dynamic>{
  'date': instance.date,
  'classroomName': instance.classroomName,
  'startMinute': instance.startMinute,
  'endMinute': instance.endMinute,
};

_TeacherHoursRow _$TeacherHoursRowFromJson(Map<String, dynamic> json) => _TeacherHoursRow(
  teacherId: json['teacherId'] as String,
  teacherName: json['teacherName'] as String? ?? '',
  lessons: (json['lessons'] as num?)?.toInt() ?? 0,
  minutes: (json['minutes'] as num?)?.toInt() ?? 0,
  sessions:
      (json['sessions'] as List<dynamic>?)?.map((e) => HoursSession.fromJson(e as Map<String, dynamic>)).toList() ??
      const <HoursSession>[],
);

Map<String, dynamic> _$TeacherHoursRowToJson(_TeacherHoursRow instance) => <String, dynamic>{
  'teacherId': instance.teacherId,
  'teacherName': instance.teacherName,
  'lessons': instance.lessons,
  'minutes': instance.minutes,
  'sessions': instance.sessions,
};

_TeacherHours _$TeacherHoursFromJson(Map<String, dynamic> json) => _TeacherHours(
  month: json['month'] as String,
  teachers:
      (json['teachers'] as List<dynamic>?)?.map((e) => TeacherHoursRow.fromJson(e as Map<String, dynamic>)).toList() ??
      const <TeacherHoursRow>[],
);

Map<String, dynamic> _$TeacherHoursToJson(_TeacherHours instance) => <String, dynamic>{
  'month': instance.month,
  'teachers': instance.teachers,
};

_Dismissal _$DismissalFromJson(Map<String, dynamic> json) => _Dismissal(
  approximateAt: json['approximateAt'] as String,
  lastLeftAt: json['lastLeftAt'] as String?,
  note: json['note'] as String?,
);

Map<String, dynamic> _$DismissalToJson(_Dismissal instance) => <String, dynamic>{
  'approximateAt': instance.approximateAt,
  'lastLeftAt': instance.lastLeftAt,
  'note': instance.note,
};

_AssignmentSummary _$AssignmentSummaryFromJson(Map<String, dynamic> json) => _AssignmentSummary(
  id: json['id'] as String,
  title: json['title'] as String? ?? '',
  description: json['description'] as String?,
  type: json['type'] as String?,
  dueDate: json['dueDate'] as String?,
  lessonDate: json['lessonDate'] as String?,
  createdAt: json['createdAt'] as String?,
  pending: (readPendingCount(json, 'pending') as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$AssignmentSummaryToJson(_AssignmentSummary instance) => <String, dynamic>{
  'id': instance.id,
  'title': instance.title,
  'description': instance.description,
  'type': instance.type,
  'dueDate': instance.dueDate,
  'lessonDate': instance.lessonDate,
  'createdAt': instance.createdAt,
  'pending': instance.pending,
};

_SubmissionStudent _$SubmissionStudentFromJson(Map<String, dynamic> json) => _SubmissionStudent(
  id: json['id'] as String,
  firstName: json['firstName'] as String? ?? '',
  lastName: json['lastName'] as String?,
);

Map<String, dynamic> _$SubmissionStudentToJson(_SubmissionStudent instance) => <String, dynamic>{
  'id': instance.id,
  'firstName': instance.firstName,
  'lastName': instance.lastName,
};

_Submission _$SubmissionFromJson(Map<String, dynamic> json) => _Submission(
  student: SubmissionStudent.fromJson(json['student'] as Map<String, dynamic>),
  state: json['state'] as String? ?? 'NOT_SUBMITTED',
  imageKeys: (json['imageKeys'] as List<dynamic>?)?.map((e) => e as String).toList() ?? const <String>[],
  note: json['note'] as String?,
  studentNote: json['studentNote'] as String?,
  reviewNote: json['reviewNote'] as String?,
  submittedAt: json['submittedAt'] as String?,
  checkedAt: json['checkedAt'] as String?,
);

Map<String, dynamic> _$SubmissionToJson(_Submission instance) => <String, dynamic>{
  'student': instance.student,
  'state': instance.state,
  'imageKeys': instance.imageKeys,
  'note': instance.note,
  'studentNote': instance.studentNote,
  'reviewNote': instance.reviewNote,
  'submittedAt': instance.submittedAt,
  'checkedAt': instance.checkedAt,
};
