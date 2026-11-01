import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../shared/marks/marks.dart';

export '../../../shared/marks/marks.dart' show AttendanceStatus, HomeworkStatus, LateRange;

part 'teacher_models.freezed.dart';
part 'teacher_models.g.dart';

/// Багшийн хэсгийн API загварууд — `docs/api-contract/teacher.md`.
/// Огнооны талбар бүр `YYYY-MM-DD` мөр (UB-ийн өдөр) эсвэл ISO агшин — тайлбарт заасан.

// Ирц/даалгаврын төлөв — `shared/marks`-ийн НЭГ enum (сурагч, эцэг эх, багш бүгд). Энд зөвхөн API мөр.
// Тасалсан шалтгаанд «өвчтэй» сонголт байхгүй (эзний дүрэм).

extension AttendanceStatusApi on AttendanceStatus {
  String get api => switch (this) {
    AttendanceStatus.present => 'PRESENT',
    AttendanceStatus.late => 'LATE',
    AttendanceStatus.absent => 'ABSENT',
    AttendanceStatus.excused => 'EXCUSED',
  };
}

extension HomeworkStatusApi on HomeworkStatus {
  String get api => switch (this) {
    HomeworkStatus.done => 'DONE',
    HomeworkStatus.partial => 'PARTIAL',
    HomeworkStatus.notDone => 'NOT_DONE',
  };
}

extension LateRangeApi on LateRange {
  String get api => switch (this) {
    LateRange.fiveToTen => 'FIVE_TO_TEN',
    LateRange.tenToThirty => 'TEN_TO_THIRTY',
    LateRange.thirtyToSixty => 'THIRTY_TO_SIXTY',
    LateRange.overOneHour => 'OVER_ONE_HOUR',
  };
}

AttendanceStatus? attendanceFromApi(Object? v) => v is String ? parseAttendanceStatus(v) : null;
HomeworkStatus? homeworkFromApi(Object? v) => v is String ? parseHomeworkStatus(v) : null;
LateRange? lateRangeFromApi(Object? v) => v is String ? parseLateRange(v) : null;

class AttStatusConverter implements JsonConverter<AttendanceStatus?, Object?> {
  const AttStatusConverter();
  @override
  AttendanceStatus? fromJson(Object? json) => attendanceFromApi(json);
  @override
  Object? toJson(AttendanceStatus? object) => object?.api;
}

class HwStatusConverter implements JsonConverter<HomeworkStatus?, Object?> {
  const HwStatusConverter();
  @override
  HomeworkStatus? fromJson(Object? json) => homeworkFromApi(json);
  @override
  Object? toJson(HomeworkStatus? object) => object?.api;
}

class LateRangeConverter implements JsonConverter<LateRange?, Object?> {
  const LateRangeConverter();
  @override
  LateRange? fromJson(Object? json) => lateRangeFromApi(json);
  @override
  Object? toJson(LateRange? object) => object?.api;
}

/// Тухайн өдрийн нэг хичээл (`startMinute` = UB шөнө дундаас хойших минут).
@freezed
abstract class BoardLesson with _$BoardLesson {
  const factory BoardLesson({
    required String scheduleId,
    required int startMinute,
    required int endMinute,
    String? room,
    String? topic,
    String? teacherName,
    String? leadTeacher,
    String? assistantTeacher,
    @Default(false) bool mine,
  }) = _BoardLesson;

  factory BoardLesson.fromJson(Map<String, Object?> json) => _$BoardLessonFromJson(json);
}

/// `GET /attendance/board` — тухайн өдөр хичээлтэй анги.
@freezed
abstract class DayClass with _$DayClass {
  const DayClass._();

  const factory DayClass({
    required String id,
    required String name,
    @Default('IN_PERSON') String type,
    int? grade,
    @Default(0) int studentCount,
    @Default(<BoardLesson>[]) List<BoardLesson> lessons,
  }) = _DayClass;

  factory DayClass.fromJson(Map<String, Object?> json) => _$DayClassFromJson(json);

  bool get isOnline => type == 'ONLINE';
  bool get mine => lessons.any((l) => l.mine);
}

@freezed
abstract class DayBoard with _$DayBoard {
  const factory DayBoard({required String date, @Default(<DayClass>[]) List<DayClass> classes, DayClass? selected}) =
      _DayBoard;

  factory DayBoard.fromJson(Map<String, Object?> json) => _$DayBoardFromJson(json);
}

@freezed
abstract class BoardStudent with _$BoardStudent {
  const factory BoardStudent({required String id, @Default('') String firstName, String? lastName, String? code}) =
      _BoardStudent;

  factory BoardStudent.fromJson(Map<String, Object?> json) => _$BoardStudentFromJson(json);
}

@freezed
abstract class AttRow with _$AttRow {
  const factory AttRow({
    required String studentId,
    @AttStatusConverter() AttendanceStatus? status,
    String? note,
    @LateRangeConverter() LateRange? lateRange,
    String? markedBy,
  }) = _AttRow;

  factory AttRow.fromJson(Map<String, Object?> json) => _$AttRowFromJson(json);
}

@freezed
abstract class HwRow with _$HwRow {
  const factory HwRow({
    required String studentId,
    @HwStatusConverter() HomeworkStatus? status,
    String? comment,
    String? markedBy,
    String? updatedAt,
  }) = _HwRow;

  factory HwRow.fromJson(Map<String, Object?> json) => _$HwRowFromJson(json);
}

/// Эрсдэлийн тэмдэг — сервер тооцно, `label` нь бэлэн монгол бичвэр.
@freezed
abstract class RiskFlag with _$RiskFlag {
  const factory RiskFlag({required String kind, required String label}) = _RiskFlag;

  factory RiskFlag.fromJson(Map<String, Object?> json) => _$RiskFlagFromJson(json);
}

@freezed
abstract class Recorder with _$Recorder {
  const factory Recorder({required String id, required String name, String? at, @Default(0) int count}) = _Recorder;

  factory Recorder.fromJson(Map<String, Object?> json) => _$RecorderFromJson(json);
}

@freezed
abstract class RecordedBy with _$RecordedBy {
  const factory RecordedBy({
    @Default(<Recorder>[]) List<Recorder> attendance,
    @Default(<Recorder>[]) List<Recorder> homework,
  }) = _RecordedBy;

  factory RecordedBy.fromJson(Map<String, Object?> json) => _$RecordedByFromJson(json);
}

Object? readSentStudents(Map<dynamic, dynamic> json, String key) {
  final sent = json['sent'];
  return sent is Map ? sent['students'] : null;
}

/// `GET /attendance/classrooms/:id/marks` (15 сек тутмын poll).
@freezed
abstract class MarksPayload with _$MarksPayload {
  const factory MarksPayload({
    required String date,
    @Default(<AttRow>[]) List<AttRow> attendance,
    @Default(<HwRow>[]) List<HwRow> homework,
    @Default(<String, List<RiskFlag>>{}) Map<String, List<RiskFlag>> risk,
    RecordedBy? recordedBy,
    @JsonKey(readValue: readSentStudents) @Default(<String>[]) List<String> sent,
  }) = _MarksPayload;

  factory MarksPayload.fromJson(Map<String, Object?> json) => _$MarksPayloadFromJson(json);
}

@freezed
abstract class BoardClassroom with _$BoardClassroom {
  const factory BoardClassroom({
    required String id,
    required String name,
    @Default('IN_PERSON') String type,
    int? grade,
  }) = _BoardClassroom;

  factory BoardClassroom.fromJson(Map<String, Object?> json) => _$BoardClassroomFromJson(json);
}

/// `GET /attendance/classrooms/:id/board` — анх нээхэд.
@freezed
abstract class BoardPayload with _$BoardPayload {
  const BoardPayload._();

  const factory BoardPayload({
    required String date,
    required String today,
    required BoardClassroom classroom,
    String? holiday,
    @Default(<BoardLesson>[]) List<BoardLesson> lessons,
    @Default(<BoardStudent>[]) List<BoardStudent> students,
    @Default(<AttRow>[]) List<AttRow> attendance,
    @Default(<HwRow>[]) List<HwRow> homework,
    @Default(<String, List<RiskFlag>>{}) Map<String, List<RiskFlag>> risk,
    RecordedBy? recordedBy,
    @JsonKey(readValue: readSentStudents) @Default(<String>[]) List<String> sent,
    @Default(false) bool canEditCriteria,
  }) = _BoardPayload;

  factory BoardPayload.fromJson(Map<String, Object?> json) => _$BoardPayloadFromJson(json);

  bool get isOnline => classroom.type == 'ONLINE';

  MarksPayload get marks => MarksPayload(
    date: date,
    attendance: attendance,
    homework: homework,
    risk: risk,
    recordedBy: recordedBy,
    sent: sent,
  );
}

/// `POST /classrooms/:id/attendance` хариу.
@freezed
abstract class AttMarkResponse with _$AttMarkResponse {
  const factory AttMarkResponse({
    @Default(<String>[]) List<String> applied,
    @Default(<String>[]) List<String> skipped,
    @Default(<AttRow>[]) List<AttRow> rows,
  }) = _AttMarkResponse;

  factory AttMarkResponse.fromJson(Map<String, Object?> json) => _$AttMarkResponseFromJson(json);
}

/// `POST /classrooms/:id/homework-marks/bulk` хариу.
@freezed
abstract class HwBulkResponse with _$HwBulkResponse {
  const factory HwBulkResponse({
    @Default(<String>[]) List<String> applied,
    @Default(<String>[]) List<String> skipped,
    @Default(<HwRow>[]) List<HwRow> rows,
  }) = _HwBulkResponse;

  factory HwBulkResponse.fromJson(Map<String, Object?> json) => _$HwBulkResponseFromJson(json);
}

/// Анги дахь багш (`{ id, firstName, lastName, role }`).
@freezed
abstract class StaffRef with _$StaffRef {
  const factory StaffRef({required String id, @Default('') String firstName, String? lastName, String? role}) =
      _StaffRef;

  factory StaffRef.fromJson(Map<String, Object?> json) => _$StaffRefFromJson(json);
}

Object? readEnrollmentCount(Map<dynamic, dynamic> json, String key) {
  final c = json['_count'];
  return c is Map ? c['enrollments'] : json['studentCount'];
}

/// `GET /classrooms` мөр.
@freezed
abstract class ClassroomSummary with _$ClassroomSummary {
  const ClassroomSummary._();

  const factory ClassroomSummary({
    required String id,
    required String name,
    @Default('IN_PERSON') String type,
    int? grade,
    StaffRef? teacher,
    StaffRef? assistantTeacher,
    @JsonKey(readValue: readEnrollmentCount) @Default(0) int studentCount,
  }) = _ClassroomSummary;

  factory ClassroomSummary.fromJson(Map<String, Object?> json) => _$ClassroomSummaryFromJson(json);

  bool isMine(String userId) => teacher?.id == userId || assistantTeacher?.id == userId;
  bool get isOnline => type == 'ONLINE';
}

@freezed
abstract class RosterStudent with _$RosterStudent {
  const factory RosterStudent({
    required String id,
    @Default('') String firstName,
    String? lastName,
    String? studentCode,
    String? joinedAt,
  }) = _RosterStudent;

  factory RosterStudent.fromJson(Map<String, Object?> json) => _$RosterStudentFromJson(json);
}

/// `GET /classrooms/:id`.
@freezed
abstract class ClassroomDetail with _$ClassroomDetail {
  const factory ClassroomDetail({
    required ClassroomSummary classroom,
    @Default(<RosterStudent>[]) List<RosterStudent> students,
  }) = _ClassroomDetail;

  factory ClassroomDetail.fromJson(Map<String, Object?> json) => _$ClassroomDetailFromJson(json);
}

@freezed
abstract class NamedRef with _$NamedRef {
  const factory NamedRef({required String id, @Default('') String name}) = _NamedRef;

  factory NamedRef.fromJson(Map<String, Object?> json) => _$NamedRefFromJson(json);
}

/// `GET /students/:id/attendance?from&to` мөр (`date` = `@db.Date` ISO — эхний 10 тэмдэгт).
@freezed
abstract class StudentAttendanceRow with _$StudentAttendanceRow {
  const factory StudentAttendanceRow({
    required String date,
    @AttStatusConverter() AttendanceStatus? status,
    String? note,
    @LateRangeConverter() LateRange? lateRange,
    NamedRef? classroom,
  }) = _StudentAttendanceRow;

  factory StudentAttendanceRow.fromJson(Map<String, Object?> json) => _$StudentAttendanceRowFromJson(json);
}

/// `GET /students/:id/homework-marks?from&to` мөр.
@freezed
abstract class StudentHomeworkRow with _$StudentHomeworkRow {
  const factory StudentHomeworkRow({
    required String date,
    @HwStatusConverter() HomeworkStatus? status,
    String? comment,
    NamedRef? classroom,
  }) = _StudentHomeworkRow;

  factory StudentHomeworkRow.fromJson(Map<String, Object?> json) => _$StudentHomeworkRowFromJson(json);
}

@freezed
abstract class TestRef with _$TestRef {
  const factory TestRef({required String id, @Default('') String title, String? type}) = _TestRef;

  factory TestRef.fromJson(Map<String, Object?> json) => _$TestRefFromJson(json);
}

/// `GET /students/:id/test-results` мөр (TestResult + test).
@freezed
abstract class StudentTestResult with _$StudentTestResult {
  const factory StudentTestResult({
    required String id,
    required double totalScore,
    required double maxScore,
    String? createdAt,
    TestRef? test,
  }) = _StudentTestResult;

  factory StudentTestResult.fromJson(Map<String, Object?> json) => _$StudentTestResultFromJson(json);
}

/// Сурагчийн тэмдэглэл (`/students/:id/notes`).
@freezed
abstract class StudentNote with _$StudentNote {
  const factory StudentNote({
    required String id,
    @Default('GENERAL') String type,
    @Default('') String body,
    String? authorName,
    @Default(false) bool canEdit,
    String? createdAt,
    String? updatedAt,
    String? promisedOn,
    String? resolvedAt,
  }) = _StudentNote;

  factory StudentNote.fromJson(Map<String, Object?> json) => _$StudentNoteFromJson(json);
}

@freezed
abstract class HoursSession with _$HoursSession {
  const factory HoursSession({
    required String date,
    @Default('') String classroomName,
    required int startMinute,
    required int endMinute,
  }) = _HoursSession;

  factory HoursSession.fromJson(Map<String, Object?> json) => _$HoursSessionFromJson(json);
}

@freezed
abstract class TeacherHoursRow with _$TeacherHoursRow {
  const factory TeacherHoursRow({
    required String teacherId,
    @Default('') String teacherName,
    @Default(0) int lessons,
    @Default(0) int minutes,
    @Default(<HoursSession>[]) List<HoursSession> sessions,
  }) = _TeacherHoursRow;

  factory TeacherHoursRow.fromJson(Map<String, Object?> json) => _$TeacherHoursRowFromJson(json);
}

/// `GET /teacher-hours/me?month=YYYY-MM`.
@freezed
abstract class TeacherHours with _$TeacherHours {
  const factory TeacherHours({required String month, @Default(<TeacherHoursRow>[]) List<TeacherHoursRow> teachers}) =
      _TeacherHours;

  factory TeacherHours.fromJson(Map<String, Object?> json) => _$TeacherHoursFromJson(json);
}

/// `GET /learning-lab/classrooms/:id/dismissal?date=` (null = тэмдэглээгүй). Цагууд ISO агшин.
@freezed
abstract class Dismissal with _$Dismissal {
  const factory Dismissal({required String approximateAt, String? lastLeftAt, String? note}) = _Dismissal;

  factory Dismissal.fromJson(Map<String, Object?> json) => _$DismissalFromJson(json);
}

Object? readPendingCount(Map<dynamic, dynamic> json, String key) {
  final c = json['_count'];
  return c is Map ? c['submissions'] : 0;
}

/// Онлайн ангийн даалгавар (`GET /classrooms/:id/assignments`).
@freezed
abstract class AssignmentSummary with _$AssignmentSummary {
  const factory AssignmentSummary({
    required String id,
    @Default('') String title,
    String? description,
    String? type,
    String? dueDate,
    String? lessonDate,
    String? createdAt,
    @JsonKey(readValue: readPendingCount) @Default(0) int pending,
  }) = _AssignmentSummary;

  factory AssignmentSummary.fromJson(Map<String, Object?> json) => _$AssignmentSummaryFromJson(json);
}

@freezed
abstract class SubmissionStudent with _$SubmissionStudent {
  const factory SubmissionStudent({required String id, @Default('') String firstName, String? lastName}) =
      _SubmissionStudent;

  factory SubmissionStudent.fromJson(Map<String, Object?> json) => _$SubmissionStudentFromJson(json);
}

/// `GET /assignments/:id/submissions` мөр. `state` — `NOT_SUBMITTED | SUBMITTED | DONE_ONLINE | RETURNED | DONE_IN_CLASS`.
@freezed
abstract class Submission with _$Submission {
  const factory Submission({
    required SubmissionStudent student,
    @Default('NOT_SUBMITTED') String state,
    @Default(<String>[]) List<String> imageKeys,
    String? note,
    String? studentNote,
    String? reviewNote,
    String? submittedAt,
    String? checkedAt,
  }) = _Submission;

  factory Submission.fromJson(Map<String, Object?> json) => _$SubmissionFromJson(json);
}
