import 'package:freezed_annotation/freezed_annotation.dart';

part 'parent_models.freezed.dart';
part 'parent_models.g.dart';

// Гэрээ: docs/api-contract/parent.md. Огнооны `date` (`@db.Date`) нь `YYYY-MM-DDT00:00:00.000Z` —
// эхний 10 тэмдэгтийг л ав (UB-д бүсээр бүү шилжүүл).

@freezed
abstract class ClassroomRef with _$ClassroomRef {
  const factory ClassroomRef({String? id, @Default('') String name, int? grade}) = _ClassroomRef;

  factory ClassroomRef.fromJson(Map<String, Object?> json) => _$ClassroomRefFromJson(json);
}

@freezed
abstract class ChildProfile with _$ChildProfile {
  const factory ChildProfile({
    int? grade,
    String? school,

    /// `CLASSROOM` (танхим) | `ONLINE` — даалгаврын загвар сонгоход (STATUS §7.11).
    String? type,
  }) = _ChildProfile;

  factory ChildProfile.fromJson(Map<String, Object?> json) => _$ChildProfileFromJson(json);
}

@freezed
abstract class AttendanceEntry with _$AttendanceEntry {
  const factory AttendanceEntry({
    required String date,
    required String status,
    @Default(ClassroomRef()) ClassroomRef classroom,
  }) = _AttendanceEntry;

  factory AttendanceEntry.fromJson(Map<String, Object?> json) => _$AttendanceEntryFromJson(json);
}

@freezed
abstract class HomeworkMarkEntry with _$HomeworkMarkEntry {
  const factory HomeworkMarkEntry({
    required String date,
    required String status,
    String? comment,
    @Default(ClassroomRef()) ClassroomRef classroom,
  }) = _HomeworkMarkEntry;

  factory HomeworkMarkEntry.fromJson(Map<String, Object?> json) => _$HomeworkMarkEntryFromJson(json);
}

@freezed
abstract class AssignmentRef with _$AssignmentRef {
  const factory AssignmentRef({@Default('') String title, String? dueDate, ClassroomRef? classroom}) =
      _AssignmentRef;

  factory AssignmentRef.fromJson(Map<String, Object?> json) => _$AssignmentRefFromJson(json);
}

@freezed
abstract class SubmissionEntry with _$SubmissionEntry {
  const factory SubmissionEntry({
    required String id,
    required String state,
    @Default(<String>[]) List<String> imageKeys,
    String? submittedAt,
    String? checkedAt,
    @Default(AssignmentRef()) AssignmentRef assignment,
  }) = _SubmissionEntry;

  factory SubmissionEntry.fromJson(Map<String, Object?> json) => _$SubmissionEntryFromJson(json);
}

@freezed
abstract class TestRef with _$TestRef {
  const factory TestRef({@Default('') String title, String? type}) = _TestRef;

  factory TestRef.fromJson(Map<String, Object?> json) => _$TestRefFromJson(json);
}

@freezed
abstract class Acknowledgement with _$Acknowledgement {
  const factory Acknowledgement({String? verifiedAt}) = _Acknowledgement;

  factory Acknowledgement.fromJson(Map<String, Object?> json) => _$AcknowledgementFromJson(json);
}

@freezed
abstract class TestResultEntry with _$TestResultEntry {
  const TestResultEntry._();

  const factory TestResultEntry({
    required String id,
    num? totalScore,
    num? maxScore,
    String? source,
    required String createdAt,
    @Default(TestRef()) TestRef test,
    @Default(<Acknowledgement>[]) List<Acknowledgement> acknowledgements,
  }) = _TestResultEntry;

  factory TestResultEntry.fromJson(Map<String, Object?> json) => _$TestResultEntryFromJson(json);

  String? get acknowledgedAt => acknowledgements.isEmpty ? null : acknowledgements.first.verifiedAt;
}

@freezed
abstract class ChildPayment with _$ChildPayment {
  const factory ChildPayment({
    required String id,
    required String status,
    @Default(0) num amount,
    required String createdAt,
  }) = _ChildPayment;

  factory ChildPayment.fromJson(Map<String, Object?> json) => _$ChildPaymentFromJson(json);
}

@freezed
abstract class ChildStudent with _$ChildStudent {
  const ChildStudent._();

  const factory ChildStudent({
    required String id,
    @Default('') String firstName,
    @Default('') String lastName,
    String? phone,
    ChildProfile? studentProfile,
    ClassroomRef? classroom,
    @Default(<AttendanceEntry>[]) List<AttendanceEntry> attendances,
    @Default(<HomeworkMarkEntry>[]) List<HomeworkMarkEntry> dailyHomeworkMarks,
    @Default(<SubmissionEntry>[]) List<SubmissionEntry> submissions,
    @Default(<TestResultEntry>[]) List<TestResultEntry> testResults,
    @Default(<ChildPayment>[]) List<ChildPayment> payments,
  }) = _ChildStudent;

  factory ChildStudent.fromJson(Map<String, Object?> json) => _$ChildStudentFromJson(json);

  /// «Нэр Овог» (вэбийн эцэг эхийн хуудастай ижил дараалал).
  String get fullName => '$firstName $lastName'.trim();

  bool get isOnline => studentProfile?.type == 'ONLINE';
}

/// `GET /parent/children` мөр. Баталгаажаагүй бол зөвхөн нэр/утас.
@freezed
abstract class ParentLink with _$ParentLink {
  const factory ParentLink({
    required String id,
    @Default(false) bool verified,
    String? verifiedAt,
    required ChildStudent student,
  }) = _ParentLink;

  factory ParentLink.fromJson(Map<String, Object?> json) => _$ParentLinkFromJson(json);
}

/// `GET /exam-results/parent/:testResultId` — эцэг эхийн дүнгийн карт.
@freezed
abstract class ExamResultCardData with _$ExamResultCardData {
  const factory ExamResultCardData({
    required String testResultId,
    @Default(TestRef()) TestRef test,
    @Default(0) num totalScore,
    @Default(0) num maxScore,
    @Default(0) num percent,
    ExamParts? parts,
    @Default(<WeakTopic>[]) List<WeakTopic> weakTopics,
    required String takenAt,
    String? acknowledgedAt,
    @Default(false) bool canAcknowledge,
  }) = _ExamResultCardData;

  factory ExamResultCardData.fromJson(Map<String, Object?> json) => _$ExamResultCardDataFromJson(json);
}

@freezed
abstract class ExamParts with _$ExamParts {
  const factory ExamParts({
    @Default(0) num part1,
    @Default(0) num part1Max,
    @Default(0) num part2,
    @Default(0) num part2Max,
  }) = _ExamParts;

  factory ExamParts.fromJson(Map<String, Object?> json) => _$ExamPartsFromJson(json);
}

@freezed
abstract class WeakTopic with _$WeakTopic {
  const factory WeakTopic({required String name, @Default(0) num percent}) = _WeakTopic;

  factory WeakTopic.fromJson(Map<String, Object?> json) => _$WeakTopicFromJson(json);
}
