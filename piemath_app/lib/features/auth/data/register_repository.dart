import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/user_role.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import '../../legal/legal_content.dart';

/// Бүртгүүлэгчийн төрөл (вэбийн `/register` «1. Та хэн бэ?»).
enum RegisterKind {
  classroom('Танхимын сурагч', 'Сургалтын төвд суралцдаг, багшаас өнөөдрийн код авна'),
  online('Төвөөс удирдах онлайн анги', 'Хичээл, элсэлтийн боломжийг доороос шалгана'),
  buyer('Бие даан суралцах', 'Цахим ном, бодлого, тестээ сонгож бие даан давтана'),
  parent('Эцэг эх', 'Хүүхдийнхээ ирц, даалгавар, шалгалтын дүнг харна');

  const RegisterKind(this.title, this.description);

  final String title;
  final String description;

  bool get isStudent => this == classroom || this == online;
}

/// Онлайн анги хаалттай үеийн тайлбар (вэбийн `KINDS[ONLINE].desc`).
const onlineClosedText = 'Одоогоор нээгдээгүй. Цахим ном, бодлого авах бол «Бие даан суралцах» төрлийг сонгоно';

/// Нийтийн элсэлтэд сонгох хичээл (вэбийн `SubjectPicker`).
enum RegisterSubject {
  math('MATH', 'Математик'),
  socialStudies('SOCIAL_STUDIES', 'Нийгэм судлал');

  const RegisterSubject(this.api, this.label);

  final String api;
  final String label;

  static RegisterSubject? fromApi(String? v) => switch (v) {
        'MATH' => math,
        'SOCIAL_STUDIES' => socialStudies,
        _ => null,
      };
}

/// `GET /enrollment-windows` — хичээл бүрийн элсэлтийн төлөв.
class EnrollmentWindow {
  const EnrollmentWindow({
    required this.subject,
    this.status = 'OPEN',
    this.availability = 'BOTH',
    this.centreOnlineClassEnabled = false,
  });

  static EnrollmentWindow? fromJson(Object? json) {
    if (json is! Map) return null;
    final subject = RegisterSubject.fromApi(json['subject'] as String?);
    if (subject == null) return null;
    return EnrollmentWindow(
      subject: subject,
      status: json['status'] as String? ?? 'CLOSED',
      availability: json['availability'] as String? ?? 'BOTH',
      centreOnlineClassEnabled: json['centreOnlineClassEnabled'] == true,
    );
  }

  final RegisterSubject subject;

  /// OPEN | CLOSED | COMING_SOON
  final String status;

  /// CLASSROOM_ONLY | ONLINE_ONLY | BOTH
  final String availability;
  final bool centreOnlineClassEnabled;

  bool get classroomOnly => availability == 'CLASSROOM_ONLY';
}

/// Сервер алдаа өгвөл: бүх хичээл нээлттэй, онлайн анги ХААЛТТАЙ (вэбийн `fallbackOpenWindows`).
const fallbackEnrollmentWindows = [
  EnrollmentWindow(subject: RegisterSubject.math),
  EnrollmentWindow(subject: RegisterSubject.socialStudies),
];

/// Сонгох боломжгүй бол шалтгаан, боломжтой бол null (вэбийн `lockStateFor`).
String? subjectLockReason(EnrollmentWindow w, RegisterKind kind) {
  if (kind == RegisterKind.online && !w.centreOnlineClassEnabled) {
    return 'Төвөөс удирдах онлайн анги одоогоор нээгдээгүй. Цахим ном, бодлого авах бол «Бие даан суралцах» '
        'төрлийг сонгоно уу';
  }
  if (w.status != 'OPEN') {
    return w.status == 'COMING_SOON'
        ? '${w.subject.label}-ийн элсэлт хараахан зарлагдаагүй байна'
        : '${w.subject.label}-ийн элсэлт одоогоор дууссан байна';
  }
  if (kind == RegisterKind.online && w.classroomOnly) return '${w.subject.label} зөвхөн танхимын ангид байдаг';
  return null;
}

/// Сервер (RegisterDto.subject) олон хичээл авдаггүй: ганц MATH/SOCIAL_STUDIES бол тэр, бусад нь BOTH
/// (вэбийн `toLegacyRegisterSubject`).
String legacyRegisterSubject(Set<RegisterSubject> subjects) {
  if (subjects.length == 1) return subjects.first.api;
  return 'BOTH';
}

/// Маягтын утгууд.
class RegisterForm {
  const RegisterForm({
    required this.kind,
    required this.lastName,
    required this.firstName,
    required this.phone,
    this.grade = 12,
    this.school = '',
    this.activationCode = '',
    this.subjects = const {},
    required this.isMinor,
    this.guardianConsent = false,
    this.googleTicket,
  });

  final RegisterKind kind;
  final String lastName;
  final String firstName;
  final String phone;
  final int grade;
  final String school;
  final String activationCode;
  final Set<RegisterSubject> subjects;
  final bool isMinor;
  final bool guardianConsent;
  final String? googleTicket;

  Map<String, Object?> toJson() => {
        'acceptTerms': true,
        'privacyVersion': privacyVersion,
        'isMinor': isMinor,
        if (isMinor) 'guardianConsent': guardianConsent,
        'phone': phone,
        'firstName': firstName.trim(),
        'lastName': lastName.trim(),
        'googleTicket': ?googleTicket,
        if (kind == RegisterKind.parent) 'asParent': true,
        if (kind.isStudent) ...{
          'studentType': kind == RegisterKind.classroom ? 'CLASSROOM' : 'ONLINE',
          'grade': grade,
          'subject': legacyRegisterSubject(subjects),
          if (school.trim().isNotEmpty) 'school': school.trim(),
        },
        if (kind == RegisterKind.classroom) 'activationCode': activationCode,
      };
}

/// Маягтын талбар бүрийн алдаа (вэбийн `validate`).
Map<String, String> validateRegister({
  required RegisterKind kind,
  required String lastName,
  required String firstName,
  required String phone,
  required String activationCode,
  required Set<RegisterSubject> subjects,
}) {
  final digits8 = RegExp(r'^\d{8}$');
  return {
    if (lastName.trim().isEmpty) 'lastName': 'Овгоо оруулна уу',
    if (firstName.trim().isEmpty) 'firstName': 'Нэрээ оруулна уу',
    if (!digits8.hasMatch(phone)) 'phone': 'Утасны дугаар яг 8 оронтой байх ёстой',
    if (kind == RegisterKind.classroom && !digits8.hasMatch(activationCode))
      'activationCode': 'Багшаас авсан 8 оронтой кодоо оруулна уу',
    if (kind.isStudent && subjects.isEmpty) 'subjects': 'Дор хаяж нэг хичээл сонгоно уу',
  };
}

/// `POST /auth/register` хариу.
class RegisterResult {
  const RegisterResult({required this.accessToken, required this.userId, required this.role, this.studentCode});

  factory RegisterResult.fromJson(Object? json) {
    final m = (json! as Map).cast<String, Object?>();
    return RegisterResult(
      accessToken: m['accessToken']! as String,
      userId: m['userId']! as String,
      role: UserRole.fromApi(m['role'] as String?),
      studentCode: m['studentCode'] as String?,
    );
  }

  final String accessToken;
  final String userId;
  final UserRole role;
  final String? studentCode;
}

/// `GET /auth/google/signup-info` — Gmail тасалбараас урьдчилж бөглөх мэдээлэл.
class GoogleSignupInfo {
  const GoogleSignupInfo({required this.email, this.firstName = '', this.lastName = ''});

  factory GoogleSignupInfo.fromJson(Object? json) {
    final m = (json! as Map).cast<String, Object?>();
    return GoogleSignupInfo(
      email: m['email'] as String? ?? '',
      firstName: m['firstName'] as String? ?? '',
      lastName: m['lastName'] as String? ?? '',
    );
  }

  final String email;
  final String firstName;
  final String lastName;
}

/// Багшийн (гадны) бүртгэл — `POST /teacher-groups/register` (вэбийн `RegisterExternalTeacher`).
class TeacherRegisterForm {
  const TeacherRegisterForm({
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.password,
    this.organization = '',
  });

  final String email;
  final String firstName;
  final String lastName;
  final String password;
  final String organization;

  Map<String, Object?> toJson() => {
        'email': email.trim(),
        'firstName': firstName.trim(),
        'lastName': lastName.trim(),
        'password': password,
        if (organization.trim().isNotEmpty) 'organization': organization.trim(),
      };
}

Map<String, String> validateTeacherRegister(TeacherRegisterForm f) {
  final email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  return {
    if (!email.hasMatch(f.email.trim())) 'email': 'Имэйл хаягаа зөв оруулна уу',
    if (f.firstName.trim().length < 2) 'firstName': 'Нэрээ оруулна уу (2-оос доошгүй үсэг)',
    if (f.lastName.trim().length < 2) 'lastName': 'Овгоо оруулна уу (2-оос доошгүй үсэг)',
    if (f.password.length < 8) 'password': 'Нууц үг 8 ба түүнээс олон тэмдэгт байна',
  };
}

class RegisterRepository {
  const RegisterRepository(this._api);

  final ApiClient _api;

  Future<List<EnrollmentWindow>> enrollmentWindows() => _api.get(
        '/enrollment-windows',
        auth: false,
        parse: (j) => [
          for (final w in (j as List? ?? const [])) ?EnrollmentWindow.fromJson(w),
        ],
      );

  Future<GoogleSignupInfo> googleSignupInfo(String ticket) => _api.get(
        '/auth/google/signup-info',
        query: {'ticket': ticket},
        auth: false,
        parse: GoogleSignupInfo.fromJson,
      );

  Future<RegisterResult> register(RegisterForm form) =>
      _api.post('/auth/register', body: form.toJson(), parse: RegisterResult.fromJson, auth: false);

  Future<void> registerTeacher(TeacherRegisterForm form) =>
      _api.post<Object?>('/teacher-groups/register', body: form.toJson(), auth: false);
}

final registerRepositoryProvider = Provider<RegisterRepository>((ref) => RegisterRepository(ref.watch(apiClientProvider)));

/// Алдаа гарвал нээлттэй түр жагсаалт (онлайн анги хаалттай).
final enrollmentWindowsProvider = FutureProvider.autoDispose<List<EnrollmentWindow>>((ref) async {
  try {
    final list = await ref.watch(registerRepositoryProvider).enrollmentWindows();
    return list.isEmpty ? fallbackEnrollmentWindows : list;
  } catch (_) {
    return fallbackEnrollmentWindows;
  }
});
