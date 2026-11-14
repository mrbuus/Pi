import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../shared/marks/marks.dart';

part 'hub_models.freezed.dart';
part 'hub_models.g.dart';

// Сурагчийн самбар (`/student-hub/*`), ирц, нөхөх, онолын зураг — гэрээ:
// `docs/api-contract/student-hub.md`, `schedule-attendance.md`.
// Огноо бүр `"YYYY-MM-DD"` (УБ-ийн өдөр). Цаг = `startMinute` (УБ-ийн шөнө дундаас хойшхи минут).

const _nullEnum = JsonKey.nullForUndefinedEnumValue;

/// `GET /student-hub/overview`
@freezed
abstract class HubOverview with _$HubOverview {
  const factory HubOverview({
    @Default(<HubClassroom>[]) List<HubClassroom> classrooms,
    required AttendanceTotals attendance,
    required HomeworkTotals homework,
    HubToday? today,

    /// Хоёр ангид зэрэг суудаг сурагчийн (математик + Нийгэм) өнөөдрийн нөгөө ангийн хичээл (вэб 2026-11-12).
    @Default(<HubToday>[]) List<HubToday> todayOther,
    LatestMark? latestMark,
  }) = _HubOverview;

  factory HubOverview.fromJson(Map<String, Object?> json) => _$HubOverviewFromJson(json);
}

@freezed
abstract class HubClassroom with _$HubClassroom {
  const factory HubClassroom({required String id, required String name}) = _HubClassroom;

  factory HubClassroom.fromJson(Map<String, Object?> json) => _$HubClassroomFromJson(json);
}

/// Бүх хугацааны ирцийн тоо. `rate` 0..100 (сервер тооцсон).
@freezed
abstract class AttendanceTotals with _$AttendanceTotals {
  const AttendanceTotals._();

  const factory AttendanceTotals({
    @Default(0) int total,
    @JsonKey(name: 'PRESENT') @Default(0) int present,
    @JsonKey(name: 'LATE') @Default(0) int late,
    @JsonKey(name: 'ABSENT') @Default(0) int absent,
    @JsonKey(name: 'EXCUSED') @Default(0) int excused,
    @Default(0) int rate,
  }) = _AttendanceTotals;

  factory AttendanceTotals.fromJson(Map<String, Object?> json) => _$AttendanceTotalsFromJson(json);

  int count(AttendanceStatus s) => switch (s) {
    AttendanceStatus.present => present,
    AttendanceStatus.late => late,
    AttendanceStatus.absent => absent,
    AttendanceStatus.excused => excused,
  };
}

/// Бүх хугацааны даалгаврын тэмдэглэгээ. `rate` = (DONE + PARTIAL*0.5)/total (сервер).
@freezed
abstract class HomeworkTotals with _$HomeworkTotals {
  const HomeworkTotals._();

  const factory HomeworkTotals({
    @Default(0) int total,
    @JsonKey(name: 'DONE') @Default(0) int done,
    @JsonKey(name: 'PARTIAL') @Default(0) int partial,
    @JsonKey(name: 'NOT_DONE') @Default(0) int notDone,
    @Default(0) int rate,
  }) = _HomeworkTotals;

  factory HomeworkTotals.fromJson(Map<String, Object?> json) => _$HomeworkTotalsFromJson(json);

  int count(HomeworkStatus s) => switch (s) {
    HomeworkStatus.done => done,
    HomeworkStatus.partial => partial,
    HomeworkStatus.notDone => notDone,
  };
}

/// Өнөөдрийн хичээл (дуусаагүй эхнийх, бүгд дууссан бол сүүлийнх).
@freezed
abstract class HubToday with _$HubToday {
  const factory HubToday({
    required String classroomId,
    required String classroomName,
    required String date,
    required int startMinute,
    required int endMinute,
    String? room,
    String? topic,
  }) = _HubToday;

  factory HubToday.fromJson(Map<String, Object?> json) => _$HubTodayFromJson(json);
}

/// Багшийн хамгийн сүүлийн даалгаврын тэмдэглэгээ.
@freezed
abstract class LatestMark with _$LatestMark {
  const factory LatestMark({
    required String date,
    @JsonKey(unknownEnumValue: _nullEnum) HomeworkStatus? status,
    String? comment,
    String? classroomId,
    String? lessonDate,
  }) = _LatestMark;

  factory LatestMark.fromJson(Map<String, Object?> json) => _$LatestMarkFromJson(json);
}

/// `GET /student-hub/days?month=` — огноогоор БУУРАХ.
@freezed
abstract class HubDays with _$HubDays {
  const factory HubDays({
    required String month,
    String? prevMonth,
    String? nextMonth,
    @Default(<HubDay>[]) List<HubDay> days,
  }) = _HubDays;

  factory HubDays.fromJson(Map<String, Object?> json) => _$HubDaysFromJson(json);
}

@freezed
abstract class HubDay with _$HubDay {
  const factory HubDay({
    required String date,
    required String classroomId,
    required String classroomName,
    int? startMinute,
    int? endMinute,
    String? room,
    String? topic,

    /// Багш+ нэрэнд «+» сервер өөрөө залгасан — дахин бүү нэм.
    @Default(<String>[]) List<String> teachers,
    String? problemNumbers,
    @Default(<HubDayTest>[]) List<HubDayTest> tests,
    DayAttendance? attendance,
    @Default(DayHomework()) DayHomework homework,
    @Default(DayTheory()) DayTheory theory,
    HomeworkPhoto? homeworkPhoto,
    @Default(false) bool canSendHomework,
  }) = _HubDay;

  factory HubDay.fromJson(Map<String, Object?> json) => _$HubDayFromJson(json);
}

/// Хаалттай тестийн шалтгаан: TOMORROW → «Маргааш нээгдэнэ»; NOT_AVAILABLE → юу ч бичихгүй.
@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum TestClosedReason { tomorrow, notAvailable }

@freezed
abstract class HubDayTest with _$HubDayTest {
  const factory HubDayTest({
    /// null = гараар бичсэн тест — нээгдэхгүй.
    String? testId,
    required String title,
    String? variant,
    @Default(false) bool open,
    @JsonKey(unknownEnumValue: _nullEnum) TestClosedReason? closedReason,
  }) = _HubDayTest;

  factory HubDayTest.fromJson(Map<String, Object?> json) => _$HubDayTestFromJson(json);
}

@freezed
abstract class DayAttendance with _$DayAttendance {
  const factory DayAttendance({
    @JsonKey(unknownEnumValue: _nullEnum) AttendanceStatus? status,
    @JsonKey(unknownEnumValue: _nullEnum) LateRange? lateRange,
  }) = _DayAttendance;

  factory DayAttendance.fromJson(Map<String, Object?> json) => _$DayAttendanceFromJson(json);
}

/// D өдрийн даалгаврыг дараагийн хичээл (D') дээр тэмдэглэнэ. status null = «Шалгаагүй».
@freezed
abstract class DayHomework with _$DayHomework {
  const factory DayHomework({
    @JsonKey(unknownEnumValue: _nullEnum) HomeworkStatus? status,
    String? comment,
    String? checkedOn,

    /// Шалгалтаар даалгавар шалгасан оноо (эзэн 2026-11-08 19:08); байхгүй бол null.
    HubQuiz? quiz,
  }) = _DayHomework;

  factory DayHomework.fromJson(Map<String, Object?> json) => _$DayHomeworkFromJson(json);
}

/// Гэрийн даалгаврыг ангид богино шалгалтаар шалгасан оноо — бутархай байж болно (7,5).
@freezed
abstract class HubQuiz with _$HubQuiz {
  const factory HubQuiz({required double score, @Default(0) int problemCount}) = _HubQuiz;

  factory HubQuiz.fromJson(Map<String, Object?> json) => _$HubQuizFromJson(json);
}

@freezed
abstract class DayTheory with _$DayTheory {
  const factory DayTheory({
    @Default(0) int count,
    @Default(false) bool mine,
    @Default(false) bool canUpload,
    @Default(false) bool assignedToMe,
  }) = _DayTheory;

  factory DayTheory.fromJson(Map<String, Object?> json) => _$DayTheoryFromJson(json);
}

@freezed
abstract class HomeworkPhoto with _$HomeworkPhoto {
  const factory HomeworkPhoto({
    required String id,
    required String fileKey,
    @Default(1) int pages,
    required String uploadedAt,
  }) = _HomeworkPhoto;

  factory HomeworkPhoto.fromJson(Map<String, Object?> json) => _$HomeworkPhotoFromJson(json);
}

/// `GET /student-hub/tests?q=` мөр.
@freezed
abstract class HubTestRow with _$HubTestRow {
  const factory HubTestRow({
    String? testId,
    required String title,
    String? variant,
    required String date,
    @Default('') String classroomName,
    @Default(0) int problemCount,
    @Default(false) bool open,
    @JsonKey(unknownEnumValue: _nullEnum) TestClosedReason? closedReason,
  }) = _HubTestRow;

  factory HubTestRow.fromJson(Map<String, Object?> json) => _$HubTestRowFromJson(json);
}

/// `GET /student-hub/tests/:testId` — нээгдсэн тестийн бодлого + зөв хариу.
@freezed
abstract class HubTestDetail with _$HubTestDetail {
  const factory HubTestDetail({
    required String testId,
    required String title,
    String? variant,
    required String date,

    /// А хувилбар (ангид хийдэг) — хариу хэзээ ч ирэхгүй, «Хариу харах» товчгүй (вэб 2026-11-10).
    @Default(false) bool answersHidden,
    @Default(<HubProblem>[]) List<HubProblem> problems,
  }) = _HubTestDetail;

  factory HubTestDetail.fromJson(Map<String, Object?> json) => _$HubTestDetailFromJson(json);
}

@freezed
abstract class HubProblem with _$HubProblem {
  const factory HubProblem({
    required String id,
    @Default(0) int order,
    String? stem,
    String? imageKey,
    @Default(<HubChoice>[]) List<HubChoice> choices,
    String? correctAnswer,
    @Default(false) bool hasVideo,
  }) = _HubProblem;

  factory HubProblem.fromJson(Map<String, Object?> json) => _$HubProblemFromJson(json);
}

@freezed
abstract class HubChoice with _$HubChoice {
  const factory HubChoice({required String label, @Default('') String text, String? imageKey}) = _HubChoice;

  factory HubChoice.fromJson(Map<String, Object?> json) => _$HubChoiceFromJson(json);
}

/// `GET /attendance/my` мөр. `date` нь `@db.Date` ISO — эхний 10 тэмдэгт.
@freezed
abstract class AttendanceRow with _$AttendanceRow {
  const factory AttendanceRow({
    required String date,
    @JsonKey(unknownEnumValue: _nullEnum) AttendanceStatus? status,
    @JsonKey(unknownEnumValue: _nullEnum) LateRange? lateRange,
    HubClassroom? classroom,
  }) = _AttendanceRow;

  factory AttendanceRow.fromJson(Map<String, Object?> json) => _$AttendanceRowFromJson(json);
}

/// Нөхөх хичээлийн төлөв.
@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum MakeupStatus { pending, partial, done, waived }

/// Нөхөх шалтгаан (тухайн өдрийн ирц).
@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum MakeupReason { absent, excused, late }

/// `GET /makeup/me` мөр.
@freezed
abstract class MakeupItem with _$MakeupItem {
  const MakeupItem._();

  const factory MakeupItem({
    required String classroomId,
    @Default('') String classroomName,
    required String date,
    @JsonKey(unknownEnumValue: MakeupReason.absent) @Default(MakeupReason.absent) MakeupReason reason,
    @JsonKey(unknownEnumValue: MakeupStatus.pending) @Default(MakeupStatus.pending) MakeupStatus status,
    @Default(0) int photos,
    @Default(<String>[]) List<String> imageKeys,
    String? submittedAt,
    @Default(false) bool resubmit,
    @Default(false) bool photosAccepted,
    @Default(<MakeupTest>[]) List<MakeupTest> tests,
  }) = _MakeupItem;

  factory MakeupItem.fromJson(Map<String, Object?> json) => _$MakeupItemFromJson(json);

  /// Нөхөх шаардлагатай хэвээр (PENDING, PARTIAL).
  bool get isOpen => status == MakeupStatus.pending || status == MakeupStatus.partial;
}

@freezed
abstract class MakeupTest with _$MakeupTest {
  const factory MakeupTest({
    required String testId,
    required String title,
    String? variant,
    @Default(false) bool done,
    @Default(false) bool inClass,
    @Default(true) bool online,
    @Default(false) bool open,
  }) = _MakeupTest;

  factory MakeupTest.fromJson(Map<String, Object?> json) => _$MakeupTestFromJson(json);
}

/// `GET /lesson-day/:classroomId/:date/photos` — ангийн онолын зураг (харах).
@freezed
abstract class TheoryDay with _$TheoryDay {
  const factory TheoryDay({
    required String classroomId,
    @Default('') String classroomName,
    required String date,
    @Default(false) bool upcoming,
    String? topic,
    TheoryUploader? uploader,
    @Default(false) bool canUpload,
    @Default(false) bool assignedToMe,
    @Default(<TheoryPhotoSet>[]) List<TheoryPhotoSet> photos,
  }) = _TheoryDay;

  factory TheoryDay.fromJson(Map<String, Object?> json) => _$TheoryDayFromJson(json);
}

@freezed
abstract class TheoryUploader with _$TheoryUploader {
  const factory TheoryUploader({@Default('Сурагч') String name, @Default(false) bool isMe}) = _TheoryUploader;

  factory TheoryUploader.fromJson(Map<String, Object?> json) => _$TheoryUploaderFromJson(json);
}

@freezed
abstract class TheoryPhotoSet with _$TheoryPhotoSet {
  const factory TheoryPhotoSet({
    required String id,
    @Default('') String uploaderName,
    @Default(false) bool isMine,
    @Default(false) bool isAssigned,
    @Default(<String>[]) List<String> imageKeys,
    @Default(0) int pages,
    String? createdAt,
  }) = _TheoryPhotoSet;

  factory TheoryPhotoSet.fromJson(Map<String, Object?> json) => _$TheoryPhotoSetFromJson(json);
}

/// `GET /announcements` — төвийн мэдэгдэл (сурагч, эцэг эх).
@freezed
abstract class Announcement with _$Announcement {
  const factory Announcement({
    required String id,
    @Default('') String title,
    @Default('') String body,
    @Default(false) bool pinned,
    required String createdAt,
  }) = _Announcement;

  factory Announcement.fromJson(Map<String, Object?> json) => _$AnnouncementFromJson(json);
}

/// `GET /assignments/my-classrooms` — ангийн төрөл (танхим/онлайн).
@freezed
abstract class MyClassroom with _$MyClassroom {
  const factory MyClassroom({required String id, required String name, @Default('IN_PERSON') String type, int? grade}) =
      _MyClassroom;

  factory MyClassroom.fromJson(Map<String, Object?> json) => _$MyClassroomFromJson(json);
}
