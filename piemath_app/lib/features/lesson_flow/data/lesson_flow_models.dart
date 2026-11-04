// Хичээлийн өдөр (вэбийн `/app/lesson-flow`) — API-ийн хариуны загвар.
// Гэрээ: `api/src/lesson-flow/lesson-flow.service.ts#preview`, `#save`, `#turn`.
//
// Сервер шинэ талбар нэмбэл эвдрэхгүйн тулд гараар, зөөлөн задална.

import '../../../core/auth/user_role.dart';
import '../../../core/format/person_name.dart';

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

List<Object?> _list(Object? j) => j is List ? j : const <Object?>[];

String? _str(Object? v) => v is String && v.isNotEmpty ? v : null;

int _int(Object? v) => v is num ? v.toInt() : 0;

/// `GET /classrooms` — ажилтны харах анги.
class FlowClass {
  const FlowClass({required this.id, required this.name, this.teacherId, this.assistantId});

  factory FlowClass.fromJson(Map<String, Object?> j) => FlowClass(
    id: _str(j['id']) ?? '',
    name: _str(j['name']) ?? '',
    teacherId: _str(_map(j['teacher'])['id']) ?? _str(j['teacherId']),
    assistantId: _str(_map(j['assistantTeacher'])['id']) ?? _str(j['assistantTeacherId']),
  );

  final String id;
  final String name;
  final String? teacherId;
  final String? assistantId;
}

/// `GET /lessons/chapters` — сэдэв (бүлэг).
class FlowChapter {
  const FlowChapter({required this.id, required this.title, this.book});

  factory FlowChapter.fromJson(Map<String, Object?> j) {
    final b = _map(j['book']);
    return FlowChapter(
      id: _str(j['id']) ?? '',
      title: _str(j['title']) ?? '',
      book: _str(b['displayName']) ?? _str(b['title']),
    );
  }

  final String id;
  final String title;
  final String? book;
}

/// Сурагчийн товч (`{ studentId, firstName, lastName }`).
class FlowPupil {
  const FlowPupil({required this.id, this.firstName, this.lastName});

  factory FlowPupil.fromJson(Map<String, Object?> j) =>
      FlowPupil(id: _str(j['studentId']) ?? '', firstName: _str(j['firstName']), lastName: _str(j['lastName']));

  final String id;
  final String? firstName;
  final String? lastName;

  /// «Б. Нэр».
  String get name {
    final n = shortName(firstName, lastName);
    return n.isEmpty ? 'Сурагч' : n;
  }
}

/// Зураг авах ээлж (`LessonPhotoTurn`).
class PhotoTurn {
  const PhotoTurn({required this.studentId, this.reason});

  factory PhotoTurn.fromJson(Map<String, Object?> j) =>
      PhotoTurn(studentId: _str(j['studentId']) ?? '', reason: _str(j['reason']));

  final String studentId;

  /// Серверийн код (`ATTENDANCE_ROTATION` …) эсвэл багшийн бичсэн шалтгаан.
  final String? reason;
}

/// Ээлжийн шалтгааныг ойлгомжтой бичвэр болгоно. Багшийн бичсэн шалтгаан хэвээрээ.
String photoTurnReason(String? reason) => switch (reason) {
  null => 'Шалтгаангүй',
  'ATTENDANCE_ROTATION' => 'Ирцийн дарааллаар',
  'MISSED_TURN' => 'Өмнө ээлжээ алгассан',
  'TEACHER_OVERRIDE' => 'Багш сонгосон',
  'NO_RECORDED_TURN' => 'Анхны ээлж',
  'LEAST_RECENT' => 'Хамгийн удаан болсон',
  _ => reason,
};

/// Өдрийн багц (`LessonPacket`).
class FlowPacket {
  const FlowPacket({
    required this.id,
    this.homeworkAssignmentId,
    this.makeupTestId,
    this.testSessionId,
    this.photoTurn,
  });

  factory FlowPacket.fromJson(Map<String, Object?> j) => FlowPacket(
    id: _str(j['id']) ?? '',
    homeworkAssignmentId: _str(j['homeworkAssignmentId']),
    makeupTestId: _str(j['makeupTestId']),
    testSessionId: _str(j['testSessionId']),
    photoTurn: j['photoTurn'] is Map ? PhotoTurn.fromJson(_map(j['photoTurn'])) : null,
  );

  static FlowPacket? maybe(Object? j) => j is Map ? FlowPacket.fromJson(_map(j)) : null;

  final String id;
  final String? homeworkAssignmentId;
  final String? makeupTestId;
  final String? testSessionId;
  final PhotoTurn? photoTurn;
}

/// Сэдвийн онол.
class FlowTheory {
  const FlowTheory({required this.id, required this.title, this.imageKeys = const []});

  factory FlowTheory.fromJson(Map<String, Object?> j) => FlowTheory(
    id: _str(j['id']) ?? '',
    title: _str(j['title']) ?? '',
    imageKeys: [for (final k in _list(j['imageKeys'])) ?_str(k)],
  );

  final String id;
  final String title;
  final List<String> imageKeys;
}

/// Сонголт (`{ id, title }`).
class FlowChoice {
  const FlowChoice({required this.id, required this.title});

  factory FlowChoice.fromJson(Map<String, Object?> j) =>
      FlowChoice(id: _str(j['id']) ?? '', title: _str(j['title']) ?? '');

  final String id;
  final String title;
}

/// Ангид бүртгэсэн тест (`ClassTestSession`).
class FlowSession {
  const FlowSession({required this.id, this.testId, this.manualTitle});

  factory FlowSession.fromJson(Map<String, Object?> j) =>
      FlowSession(id: _str(j['id']) ?? '', testId: _str(j['testId']), manualTitle: _str(j['manualTitle']));

  final String id;
  final String? testId;
  final String? manualTitle;
}

/// Өдрийн тоо.
class FlowCounters {
  const FlowCounters({
    this.classSize = 0,
    this.theorySubmitted,
    this.classTestSubmitted = 0,
    this.homeworkSubmitted = 0,
  });

  factory FlowCounters.fromJson(Map<String, Object?> j) => FlowCounters(
    classSize: _int(j['classSize']),
    theorySubmitted: j['theorySubmitted'] is num ? _int(j['theorySubmitted']) : null,
    classTestSubmitted: _int(j['classTestSubmitted']),
    homeworkSubmitted: _int(j['homeworkSubmitted']),
  );

  final int classSize;

  /// `null` = өдрийн багц хадгалаагүй (бүртгэл холбоогүй).
  final int? theorySubmitted;
  final int classTestSubmitted;
  final int homeworkSubmitted;
}

/// `GET /lesson-flow/classrooms/:id/preview?date=&chapterId=`.
class FlowPreview {
  const FlowPreview({
    required this.chapterId,
    required this.chapterTitle,
    this.packet,
    this.theories = const [],
    this.tests = const [],
    this.sessions = const [],
    this.counters = const FlowCounters(),
    this.prefillTitle = '',
    this.prefillDescription = '',
    this.homeworkImageKeys = const [],
    this.homeworkDue,
    this.photoCandidates = const [],
    this.rotation = const [],
    this.makeupPupils = const [],
    this.limitations = const [],
  });

  factory FlowPreview.fromJson(Map<String, Object?> j) {
    final chapter = _map(j['chapter']);
    final prefill = _map(j['prefill']);
    final due = _str(j['homeworkDueDate']);
    List<FlowPupil> pupils(Object? v) => [for (final p in _list(v)) FlowPupil.fromJson(_map(p))];
    return FlowPreview(
      chapterId: _str(chapter['id']) ?? '',
      chapterTitle: _str(chapter['title']) ?? '',
      packet: FlowPacket.maybe(j['packet']),
      theories: [for (final t in _list(chapter['theories'])) FlowTheory.fromJson(_map(t))],
      tests: [for (final t in _list(chapter['tests'])) FlowChoice.fromJson(_map(t))],
      sessions: [for (final s in _list(j['sessions'])) FlowSession.fromJson(_map(s))],
      counters: FlowCounters.fromJson(_map(j['counters'])),
      prefillTitle: _str(prefill['title']) ?? '',
      prefillDescription: prefill['description'] is String ? prefill['description']! as String : '',
      homeworkImageKeys: [for (final k in _list(j['homeworkImageKeys'])) ?_str(k)],
      homeworkDue: due == null || due.length < 10 ? null : due.substring(0, 10),
      photoCandidates: pupils(j['photoCandidates']),
      rotation: pupils(j['rotation']),
      makeupPupils: pupils(j['makeupPupils']),
      limitations: [for (final l in _list(j['limitations'])) ?_str(l)],
    );
  }

  final String chapterId;
  final String chapterTitle;
  final FlowPacket? packet;
  final List<FlowTheory> theories;

  /// Сэдвийн нийтлэгдсэн тестүүд.
  final List<FlowChoice> tests;

  /// Энэ өдөр ангид бүртгэсэн тестүүд.
  final List<FlowSession> sessions;
  final FlowCounters counters;
  final String prefillTitle;
  final String prefillDescription;

  /// Хадгалсан даалгаврын хавсралт — дахин хадгалахад хэвээр илгээнэ.
  final List<String> homeworkImageKeys;

  /// Даалгаврын дуусах өдөр (`YYYY-MM-DD`).
  final String? homeworkDue;

  /// Ирсэн, хоцорсон сурагчид — зураг авах ээлжийг гараар сонгох.
  final List<FlowPupil> photoCandidates;

  /// Дараагийн ээлжийн санал (ирцийн дарааллаар).
  final List<FlowPupil> rotation;

  /// Тасалсан, чөлөөтэй — нөхөх хичээл шаардлагатай.
  final List<FlowPupil> makeupPupils;
  final List<String> limitations;

  bool get saved => packet != null;

  String? testTitle(String? id) {
    for (final t in tests) {
      if (t.id == id) return t.title;
    }
    return null;
  }

  /// Өдрийн багцад холбох тест: хадгалсан багцынх эсвэл сүүлд бүртгэсэн.
  String? get linkedTestId {
    final sessionId = packet?.testSessionId;
    for (final s in sessions) {
      if (s.id == sessionId && s.testId != null) return s.testId;
    }
    for (final s in sessions.reversed) {
      if (s.testId != null && testTitle(s.testId) != null) return s.testId;
    }
    return null;
  }

  String pupilName(String id) {
    for (final p in [...photoCandidates, ...rotation, ...makeupPupils]) {
      if (p.id == id) return p.name;
    }
    return 'Сурагч';
  }
}

/// Ажилтанд харагдах анги: Админ, Багш+ — бүгд; Багш — үндсэн эсвэл туслах багш нь өөрөө
/// (`lesson-flow.service.ts#canRunClass`-тай ижил; сервер дахин шалгана).
List<FlowClass> runnableClasses(List<FlowClass> all, {required UserRole role, required String? userId}) {
  if (role == UserRole.admin || role == UserRole.teacherPlus) return all;
  if (role != UserRole.teacher || userId == null) return const [];
  return [
    for (final c in all)
      if (c.teacherId == userId || c.assistantId == userId) c,
  ];
}
