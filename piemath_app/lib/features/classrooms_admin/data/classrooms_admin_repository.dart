import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import 'classrooms_admin_models.dart';

String _enc(String v) => Uri.encodeComponent(v);

List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) => [
  for (final e in (j as List?) ?? const []) f(asMap(e)),
];

/// Ангийн удирдлагын API (`api/src/classrooms/classrooms.controller.ts`). Эрхийг сервер шалгана:
/// жагсаалт, дэлгэрэнгүй — ажилтан бүр; нэмэх/шилжүүлэх — Админ, Багш+; хасах — Админ эсвэл эрхтэй Багш+;
/// засах, архивлах — Админ; багш оноох, тараах, шинэ анги — Админ, Багш+.
class ClassroomsAdminRepository {
  const ClassroomsAdminRepository(this._api);

  final ApiClient _api;

  Future<List<AdminClassroom>> list() => _api.get('/classrooms', parse: (j) => _list(j, AdminClassroom.fromJson));

  Future<ClassroomDetail> detail(String id) =>
      _api.get('/classrooms/${_enc(id)}', parse: (j) => ClassroomDetail.fromJson(asMap(j)));

  Future<List<UnassignedStudent>> unassigned() =>
      _api.get('/classrooms/unassigned-students', parse: (j) => _list(j, UnassignedStudent.fromJson));

  /// Сурагч хайх (код, нэр, username). 2-оос цөөн тэмдэгт бол сервер 400 өгдөг тул хүсэлт илгээхгүй.
  Future<List<StudentHit>> searchStudents(String q) async {
    final query = q.trim();
    if (query.length < 2) return const [];
    return _api.get('/users/search', query: {'q': query}, parse: (j) => _list(j, StudentHit.fromJson));
  }

  /// Ангийн мэдээлэл засах маягтын багш нар (Админ, вэбийн `GET /users/teachers`).
  Future<List<TeacherOption>> staffTeachers() =>
      _api.get('/users/teachers', parse: (j) => _list(j, TeacherOption.fromJson));

  /// Хуваарьт оногддог багш (`GET /schedule/teachers`) — Багш+ ангийн багш оноох (вэбийн `TeacherPicker`).
  Future<List<TeacherOption>> lessonTeachers() =>
      _api.get('/schedule/teachers', parse: (j) => _list(j, TeacherOption.fromJson));

  /// Сурагчийг ангид оруулах. Өмнөх идэвхтэй бичилт серверт хаагдана (түүх үлдэнэ).
  Future<void> enroll(String classId, String studentId) =>
      _api.post<Object?>('/classrooms/${_enc(classId)}/enroll', body: {'studentId': studentId});

  /// Ангиас гаргах — зөөлөн (`leftAt`), ирцийн түүх үлдэнэ. Хэзээ ч бүр мөсөн устгахгүй.
  Future<void> removeStudent(String classId, String studentId) =>
      _api.post<Object?>('/classrooms/${_enc(classId)}/remove-student', body: {'studentId': studentId});

  Future<void> update(String id, ClassroomPatch patch) =>
      _api.patch<Object?>('/classrooms/${_enc(id)}', body: patch.toJson());

  /// Ангийн багш, туслах багш. Хоосон бол чөлөөлнө.
  Future<void> setTeachers(String id, {String? teacherId, String? assistantTeacherId}) => _api.patch<Object?>(
    '/classrooms/${_enc(id)}/teachers',
    body: {'teacherId': teacherId, 'assistantTeacherId': assistantTeacherId},
  );

  /// Архивлах (Админ) — өнөөдрийн кодоор. Сурагчдын бүртгэл, ирц хадгалагдана.
  Future<void> archive(String id, String confirmCode) =>
      // ApiClient.delete-д query байхгүй тул замд бичнэ.
      _api.delete<Object?>('/classrooms/${_enc(id)}?confirmCode=${_enc(confirmCode)}');

  /// Анги тараах — идэвхтэй бүх сурагчийн бичилт хаагдана (`leftAt`). Хэдэн сурагч гарсныг буцаана.
  Future<int> disband(String id) => _api.post(
    '/classrooms/${_enc(id)}/disband',
    body: const <String, Object?>{},
    parse: (j) => (asMap(j)['affectedStudentCount'] as num?)?.toInt() ?? 0,
  );

  /// Шинэ анги (Админ, Багш+).
  Future<AdminClassroom> create({
    required String name,
    required ClassroomKind kind,
    int? grade,
    ClassSubject subject = ClassSubject.math,
    String? teacherId,
  }) => _api.post(
    '/classrooms',
    body: {
      'name': name.trim(),
      'type': kind.api,
      'grade': ?grade,
      'subject': subject.apiOrNull,
      if (teacherId != null && teacherId.isNotEmpty) 'teacherId': teacherId,
    },
    parse: (j) => AdminClassroom.fromJson(asMap(j)),
  );

  /// Бүртгэл. Вэбийн `GET /classrooms/registry` серверт хараахан алга (одоогоор 404) — тэгвэл анги бүрийн
  /// дэлгэрэнгүйгээс идэвхтэй бүрэлдэхүүнийг (түүхгүй) цуглуулна.
  Future<RegistryData> registry({int parallel = 4}) async {
    final results = await Future.wait([list(), unassigned()]);
    final rooms = (results[0] as List<AdminClassroom>).toList()..sort(compareClassrooms);
    final waiting = results[1] as List<UnassignedStudent>;
    try {
      final entries = await _api.get('/classrooms/registry', parse: (j) => _list(j, RegistryEntry.fromJson));
      return RegistryData(classrooms: rooms, entries: entries, unassigned: waiting);
    } on ApiError catch (e) {
      if (e.kind != ApiErrorKind.notFound) rethrow;
    }
    final entries = <RegistryEntry>[];
    for (var i = 0; i < rooms.length; i += parallel) {
      final chunk = rooms.sublist(i, (i + parallel).clamp(0, rooms.length));
      final details = await Future.wait(chunk.map((r) => detail(r.id)));
      for (final d in details) {
        for (final s in d.students) {
          entries.add(
            RegistryEntry(
              id: '${d.classroom.id}:${s.id}',
              student: RegistryStudent(
                id: s.id,
                firstName: s.firstName,
                lastName: s.lastName,
                studentCode: s.studentCode,
              ),
              classroomId: d.classroom.id,
              classroomName: d.classroom.name,
              joinedAt: s.joinedAt,
            ),
          );
        }
      }
    }
    return RegistryData(classrooms: rooms, entries: entries, unassigned: waiting, hasHistory: false);
  }
}

/// Вэбийн `compareClassroom`: түвшнээр, дараа нь нэрээр.
int compareClassrooms(AdminClassroom a, AdminClassroom b) {
  final g = (a.grade ?? 99) - (b.grade ?? 99);
  return g != 0 ? g : a.name.toLowerCase().compareTo(b.name.toLowerCase());
}
