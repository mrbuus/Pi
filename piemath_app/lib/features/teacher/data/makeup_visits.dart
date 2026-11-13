import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import '../../../shared/marks/marks.dart';

// Нөхөлт (эзэн 2026-11-08): өөр ангид суусан, 406 өрөөнд нөхсөн сурагч — `api/src/makeup-visits`
// (`VisitView`, `MakeupHistoryItem`). Талбарын нэр ЯГ ижил. Эрх: ADMIN / TEACHER_PLUS / TEACHER.

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};
String _s(Object? v) => v is String ? v : '';
String? _sn(Object? v) => v is String && v.isNotEmpty ? v : null;
String _enc(String v) => Uri.encodeComponent(v);
List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) => [
  for (final e in (j as List?) ?? const [])
    if (e is Map) f(e.cast<String, Object?>()),
];

/// Ангийн сонголт дахь 406 өрөө (ангийн id cuid тул давхцахгүй).
const room406 = '406';

/// «12-6 (Баруун 4)» → «12-6».
String shortClass(String name) {
  final s = name.replaceFirst(RegExp(r'\s*\([^)]*\)\s*$'), '').trim();
  return s.isEmpty ? name : s;
}

/// Овог нэр бүтнээр («Батчулуун Дэлгэрдалай») — ижил нэртэйг ялгана.
String fullName(String firstName, String lastName) => '$lastName $firstName'.trim();

@immutable
class VisitStudent {
  const VisitStudent({required this.id, required this.firstName, required this.lastName, this.code});

  factory VisitStudent.fromJson(Map<String, Object?> j) =>
      VisitStudent(id: _s(j['id']), firstName: _s(j['firstName']), lastName: _s(j['lastName']), code: _sn(j['code']));

  final String id;
  final String firstName;
  final String lastName;
  final String? code;

  String get full => fullName(firstName, lastName);
}

/// Нөхсөн тест/сэдэв (406-д багш сонгосон, эсвэл зочилсон ангийн тест).
@immutable
class CoveredTest {
  const CoveredTest({this.id, this.testId, required this.title, this.result});

  factory CoveredTest.fromJson(Map<String, Object?> j) {
    final r = _map(j['result']);
    return CoveredTest(
      id: _sn(j['id']),
      testId: _sn(j['testId']),
      title: _s(j['title']),
      result: r['score'] is num && r['max'] is num ? (score: r['score']! as num, max: r['max']! as num) : null,
    );
  }

  final String? id;

  /// Бодлогын сангийн тест; null = гараар бичсэн сэдэв.
  final String? testId;
  final String title;
  final ({num score, num max})? result;
}

/// `GET /makeup-visits?date=&place=` мөр.
@immutable
class VisitView {
  const VisitView({
    required this.id,
    required this.date,
    required this.student,
    this.homeClassroom,
    this.tests = const [],
    this.comment,
    this.att,
    this.lateRange,
    this.attNote,
    this.hw,
    this.hwNote,
    this.teacherName = '',
    this.createdAt,
  });

  factory VisitView.fromJson(Map<String, Object?> j) {
    final a = _map(j['attendance']);
    final h = _map(j['homework']);
    final home = _map(j['homeClassroom']);
    return VisitView(
      id: _s(j['id']),
      date: _s(j['date']),
      student: VisitStudent.fromJson(_map(j['student'])),
      homeClassroom: home['id'] is String ? (id: home['id']! as String, name: _s(home['name'])) : null,
      tests: _list(j['tests'], CoveredTest.fromJson),
      comment: j['comment'] as String?,
      att: parseAttendanceStatus(a['status'] as String?),
      lateRange: parseLateRange(a['lateRange'] as String?),
      attNote: a['note'] as String?,
      hw: parseHomeworkStatus(h['status'] as String?),
      hwNote: h['note'] as String?,
      teacherName: _s(_map(j['teacher'])['name']),
      createdAt: _sn(j['createdAt']),
    );
  }

  final String id;
  final String date;
  final VisitStudent student;

  /// Нэмэх үеийн өөрийн анги (ангигүй сурагч бол null).
  final ({String id, String name})? homeClassroom;
  final List<CoveredTest> tests;
  final String? comment;
  final AttendanceStatus? att;
  final LateRange? lateRange;
  final String? attNote;
  final HomeworkStatus? hw;
  final String? hwNote;
  final String teacherName;
  final String? createdAt;

  VisitView copyWith({
    AttendanceStatus? att,
    bool clearAtt = false,
    LateRange? lateRange,
    bool clearLateRange = false,
    String? attNote,
    bool clearAttNote = false,
    HomeworkStatus? hw,
    bool clearHw = false,
    String? hwNote,
    bool clearHwNote = false,
    String? comment,
    List<CoveredTest>? tests,
  }) => VisitView(
    id: id,
    date: date,
    student: student,
    homeClassroom: homeClassroom,
    tests: tests ?? this.tests,
    comment: comment ?? this.comment,
    att: clearAtt ? null : (att ?? this.att),
    lateRange: clearLateRange ? null : (lateRange ?? this.lateRange),
    attNote: clearAttNote ? null : (attNote ?? this.attNote),
    hw: clearHw ? null : (hw ?? this.hw),
    hwNote: clearHwNote ? null : (hwNote ?? this.hwNote),
    teacherName: teacherName,
    createdAt: createdAt,
  );
}

/// Өөрийн ангийн самбарт: тэр өдөр өөр газарт нөхсөн сурагч (`GET /makeup-visits/home`).
@immutable
class HomeBadge {
  const HomeBadge({required this.studentId, required this.hostName, required this.label});

  factory HomeBadge.fromJson(Map<String, Object?> j) =>
      HomeBadge(studentId: _s(j['studentId']), hostName: _s(j['hostName']), label: _s(j['label']));

  final String studentId;

  /// «12-6» эсвэл «406».
  final String hostName;

  /// «12-6 ангид нөхөж суусан» / «406-д нөхөж хийсэн».
  final String label;
}

/// Нэрийн шошго: утсан дээр богино, дэлгэц уншигч/таблетад бүтэн.
@immutable
class VisitNote {
  const VisitNote({required this.short, required this.full});

  final String short;
  final String full;

  @override
  bool operator ==(Object other) => other is VisitNote && other.short == short && other.full == full;

  @override
  int get hashCode => Object.hash(short, full);
}

/// Нэг өдөр хоёр газарт нөхсөн бол хоёуланг нь (вэбийн `visitNotes`).
Map<String, VisitNote> visitNotesOf(List<HomeBadge> rows) {
  final m = <String, VisitNote>{};
  for (final r in rows) {
    final prev = m[r.studentId];
    m[r.studentId] = VisitNote(
      short: prev == null ? '${r.hostName}-д нөхсөн' : '${prev.short}, ${r.hostName}-д',
      full: prev == null ? r.label : '${prev.full}, ${r.label}',
    );
  }
  return m;
}

/// Нэрээр хайсан сурагч (ангитайгаа).
@immutable
class SearchHit {
  const SearchHit({required this.id, required this.firstName, required this.lastName, this.classes = const []});

  factory SearchHit.fromJson(Map<String, Object?> j) => SearchHit(
    id: _s(j['id']),
    firstName: _s(j['firstName']),
    lastName: _s(j['lastName']),
    classes: [
      for (final c in (j['classes'] as List?) ?? const [])
        if (c is Map) (id: _s(c['id']), name: _s(c['name'])),
    ],
  );

  final String id;
  final String firstName;
  final String lastName;
  final List<({String id, String name})> classes;

  String get full => fullName(firstName, lastName);
}

@immutable
class VisitClassOption {
  const VisitClassOption({required this.id, required this.name, this.studentCount = 0});

  factory VisitClassOption.fromJson(Map<String, Object?> j) =>
      VisitClassOption(id: _s(j['id']), name: _s(j['name']), studentCount: (j['studentCount'] as num?)?.toInt() ?? 0);

  final String id;
  final String name;
  final int studentCount;
}

@immutable
class VisitClassStudent {
  const VisitClassStudent({required this.id, required this.firstName, required this.lastName, this.className = ''});

  factory VisitClassStudent.fromJson(Map<String, Object?> j) => VisitClassStudent(
    id: _s(j['id']),
    firstName: _s(j['firstName']),
    lastName: _s(j['lastName']),
    className: _s(_map(j['classroom'])['name']),
  );

  final String id;
  final String firstName;
  final String lastName;
  final String className;

  String get full => fullName(firstName, lastName);
}

/// Нэмэх боломжгүй шалтгаан (вэбийн `SKIP_TEXT`).
String skipText(String reason) => switch (reason) {
  'DUPLICATE' => 'аль хэдийн нэмэгдсэн',
  'OWN_CLASS' => 'энэ ангийн сурагч',
  'NOT_STUDENT' => 'сурагч биш',
  _ => 'нэмэгдсэнгүй',
};

@immutable
class CreateVisitsResult {
  const CreateVisitsResult({this.created = const [], this.skipped = const []});

  factory CreateVisitsResult.fromJson(Object? json) {
    final j = _map(json);
    return CreateVisitsResult(
      created: _list(j['created'], VisitView.fromJson),
      skipped: [for (final s in _list(j['skipped'], (m) => m)) _s(s['reason'])],
    );
  }

  final List<VisitView> created;

  /// Алгассан шалтгаанууд (`DUPLICATE`, `OWN_CLASS`, `NOT_STUDENT`).
  final List<String> skipped;
}

/// Тест сонгох замын зургийн нэг нэгж (номын дарааллаар, A хувилбар) — вэбийн `roadmapUnits`.
@immutable
class RoadmapUnit {
  const RoadmapUnit({
    required this.testId,
    required this.short,
    required this.topic,
    required this.bookTitle,
    required this.bookCode,
    required this.status,
    this.doneOn,
  });

  final String testId;
  final String short;
  final String topic;
  final String bookTitle;
  final String bookCode;

  /// `DONE` / `PLANNED` / `REMOVED` / …
  final String status;
  final String? doneOn;

  bool get done => status == 'DONE';
}

/// `GET /makeup-visits/roadmap` → нэгжүүд (бүлэг бүрт A хувилбар, байхгүй бол эхнийх).
List<RoadmapUnit> roadmapUnits(Object? json) {
  final out = <RoadmapUnit>[];
  for (final b in _list(_map(json)['books'], (m) => m)) {
    for (final t in _list(b['topics'], (m) => m)) {
      for (final c in _list(t['chapters'], (m) => m)) {
        final tests = _list(c['tests'], (m) => m);
        if (tests.isEmpty) continue;
        final test = tests.firstWhere((x) => _s(x['variant']).toUpperCase() == 'A', orElse: () => tests.first);
        out.add(
          RoadmapUnit(
            testId: _s(test['testId']),
            short: _s(test['short']).isEmpty ? _s(test['title']) : _s(test['short']),
            topic: _s(t['name']),
            bookTitle: _s(b['title']),
            bookCode: _s(b['code']),
            status: _s(test['status']),
            doneOn: _sn(test['doneOn']),
          ),
        );
      }
    }
  }
  return out;
}

/// Сонгосон тест эсвэл гараар бичсэн сэдэв.
@immutable
class PickedTest {
  const PickedTest({this.testId, required this.title});

  final String? testId;
  final String title;

  /// Давхардлын түлхүүр: тест бол id, сэдэв бол жижиг үсгээр.
  String get key => testId != null ? 't:$testId' : 'x:${normTopic(title)}';

  Map<String, Object?> toJson() => {'testId': testId, 'title': title};

  @override
  bool operator ==(Object other) => other is PickedTest && other.key == key;

  @override
  int get hashCode => key.hashCode;
}

String normTopic(String s) => s.toLowerCase().replaceAll(RegExp(r'\s+'), ' ').trim();

/// Нэг өрөөнд нэг дор байж болох гараар бичсэн сэдвийн дээд тоо (вэбийн `TOPIC_MAX`).
const topicMax = 12;

class MakeupVisitsRepository {
  const MakeupVisitsRepository(this._api);

  final ApiClient _api;

  /// Тэр өдөр тэр газарт (ангийн id эсвэл [room406]) нөхсөн сурагчид.
  Future<List<VisitView>> list(String place, String date) => _api.get(
    '/makeup-visits',
    query: {'date': date, 'place': place},
    parse: (j) => _list(j, VisitView.fromJson),
    cache: false,
  );

  /// Өөрийн ангийн самбар: «12-6 ангид нөхөж суусан» шошго.
  Future<List<HomeBadge>> home(String classId, String date) => _api.get(
    '/makeup-visits/home',
    query: {'classroomId': classId, 'date': date},
    parse: (j) => _list(j, HomeBadge.fromJson),
  );

  Future<List<SearchHit>> search(String q) =>
      _api.get('/makeup-visits/students/search', query: {'q': q}, parse: (j) => _list(j, SearchHit.fromJson));

  Future<List<VisitClassOption>> classrooms() =>
      _api.get('/makeup-visits/classrooms', parse: (j) => _list(j, VisitClassOption.fromJson));

  Future<List<VisitClassStudent>> classroomStudents(String classId) => _api.get(
    '/makeup-visits/classrooms/${_enc(classId)}/students',
    parse: (j) => _list(j, VisitClassStudent.fromJson),
  );

  Future<List<RoadmapUnit>> roadmap(String classId, String date) =>
      _api.get('/makeup-visits/roadmap', query: {'classroomId': classId, 'date': date}, parse: roadmapUnits);

  /// [hostClassId] null = 406 өрөө.
  Future<CreateVisitsResult> create({required String date, String? hostClassId, required List<String> studentIds}) =>
      _api.post(
        '/makeup-visits',
        body: {'date': date, 'hostClassroomId': hostClassId, 'studentIds': studentIds},
        parse: CreateVisitsResult.fromJson,
      );

  /// Ирц, даалгавар, тайлбар — ирүүлээгүй талбар хуучнаараа.
  Future<VisitView> update(String id, Map<String, Object?> fields) =>
      _api.patch('/makeup-visits/${_enc(id)}', body: fields, parse: (j) => VisitView.fromJson(_map(j)));

  /// 406: нэг/олон сурагчид ижил тест, сэдэв (бүтэн жагсаалт).
  Future<List<VisitView>> setTests(List<String> visitIds, List<PickedTest> tests) => _api.put(
    '/makeup-visits/tests',
    body: {
      'visitIds': visitIds,
      'tests': [for (final t in tests) t.toJson()],
    },
    parse: (j) => _list(j, VisitView.fromJson),
  );

  /// Зөөлөн устгал (түүх үлдэнэ).
  Future<void> remove(String id) => _api.delete<Object?>('/makeup-visits/${_enc(id)}');
}

final makeupVisitsRepositoryProvider = Provider<MakeupVisitsRepository>(
  (ref) => MakeupVisitsRepository(ref.watch(apiClientProvider)),
);
