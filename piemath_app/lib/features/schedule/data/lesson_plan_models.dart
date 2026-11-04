// Хичээлийн төлөвлөгөө ба батламж (вэбийн `components/schedule/day/PlanDialog.tsx`, `ConfirmDialog.tsx`,
// `TestPicker.tsx`) — API-ийн хариуны загвар. Гэрээ: `api/src/schedule/lesson-plan.service.ts`,
// `class-sessions.service.ts#roadmap`, `lesson-records.service.ts#confirm`.

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

List<Object?> _list(Object? j) => j is List ? j : const <Object?>[];

String? _str(Object? v) => v is String && v.isNotEmpty ? v : null;

String? _day(Object? v) {
  final s = _str(v);
  return s == null || s.length < 10 ? s : s.substring(0, 10);
}

/// `DISMISS` = тарах, `STAY` = үлдэнэ.
const dismissModes = ['DISMISS', 'STAY'];

/// Тэмдэглэлийн дээд урт (вэбийн `NOTE_MAX`, API `normalizeNote`).
const noteMax = 500;

/// Батлахад бичих тайлбарын дээд урт (API `DESCRIPTION_MAX`).
const descriptionMax = 1000;

/// Бодлогын санд байхгүй сэдвийн дээд тоо (API `CUSTOM_TOPIC_MAX`).
const customTopicMax = 12;

/// Нэг хичээлд орох тестийн дээд тоо (API `ArrayMaxSize(12)`).
const planTestMax = 12;

/// `GET /schedule/:id/plan?date=` — засах цонхны эхний утга.
class PlanContext {
  const PlanContext({
    this.testIds = const [],
    this.customTopics = const [],
    this.dismissMode,
    this.photoStudentId,
    this.roster = const [],
    this.photoSuggestion,
  });

  factory PlanContext.fromJson(Map<String, Object?> j) {
    final plan = j['plan'] is Map ? _map(j['plan']) : null;
    return PlanContext(
      testIds: [for (final t in _list(plan?['testIds'])) ?_str(t)],
      customTopics: [for (final t in _list(plan?['customTopics'])) ?_str(t)],
      dismissMode: _str(plan?['dismissMode']),
      photoStudentId: _str(plan?['photoStudentId']),
      roster: [
        for (final r in _list(j['roster'])) (id: _str(_map(r)['id']) ?? '', name: _str(_map(r)['name']) ?? 'Сурагч'),
      ],
      photoSuggestion: _str(j['photoSuggestion']),
    );
  }

  final List<String> testIds;
  final List<String> customTopics;
  final String? dismissMode;
  final String? photoStudentId;

  /// Ангийн сурагчид (онолын зураг илгээх сурагч сонгоход).
  final List<({String id, String name})> roster;

  /// Ээлжийн санал.
  final String? photoSuggestion;

  String? nameOf(String? id) {
    for (final r in roster) {
      if (r.id == id) return r.name;
    }
    return null;
  }
}

/// Замын зургийн тестийн төлөв.
enum RoadmapStatus { done, removed, skipped, todo }

RoadmapStatus _status(Object? v) => switch (v) {
  'DONE' => RoadmapStatus.done,
  'REMOVED' => RoadmapStatus.removed,
  'SKIPPED' => RoadmapStatus.skipped,
  _ => RoadmapStatus.todo,
};

/// Ангид хийх хувилбарын (A) нэг нэгж — номын дарааллаар.
class RoadmapUnit {
  const RoadmapUnit({
    required this.testId,
    required this.short,
    required this.topic,
    required this.bookCode,
    required this.bookTitle,
    this.status = RoadmapStatus.todo,
    this.plannedOn,
  });

  final String testId;
  final String short;

  /// Номын сэдэв (бүлгийн нэгдэл).
  final String topic;
  final String bookCode;
  final String bookTitle;
  final RoadmapStatus status;

  /// Өөр өдөр төлөвлөсөн (`YYYY-MM-DD`).
  final String? plannedOn;

  RoadmapUnit withStatus(RoadmapStatus next) => RoadmapUnit(
    testId: testId,
    short: short,
    topic: topic,
    bookCode: bookCode,
    bookTitle: bookTitle,
    status: next,
    plannedOn: plannedOn,
  );
}

/// `GET /classrooms/:id/roadmap?date=` — номын дарааллаар хавтгайруулсан (вэбийн `roadmapUnits`).
class Roadmap {
  const Roadmap({this.units = const [], this.next = const []});

  factory Roadmap.fromJson(Map<String, Object?> j) {
    final units = <RoadmapUnit>[];
    for (final b in _list(j['books'])) {
      final book = _map(b);
      for (final t in _list(book['topics'])) {
        final topic = _map(t);
        for (final c in _list(topic['chapters'])) {
          final tests = [for (final x in _list(_map(c)['tests'])) _map(x)];
          if (tests.isEmpty) continue;
          final a = tests.firstWhere((x) => (_str(x['variant']) ?? '').toUpperCase() == 'A', orElse: () => tests.first);
          units.add(
            RoadmapUnit(
              testId: _str(a['testId']) ?? '',
              short: _str(a['short']) ?? _str(a['title']) ?? 'Тест',
              topic: _str(topic['name']) ?? '',
              bookCode: _str(book['code']) ?? '',
              bookTitle: _str(book['title']) ?? '',
              status: _status(a['status']),
              plannedOn: _day(a['plannedOn']),
            ),
          );
        }
      }
    }
    return Roadmap(units: units, next: [for (final n in _list(j['next'])) ?_str(n)]);
  }

  final List<RoadmapUnit> units;

  /// Дараагийн тестийн санал (номын дарааллаар).
  final List<String> next;

  RoadmapUnit? unit(String id) {
    for (final u in units) {
      if (u.testId == id) return u;
    }
    return null;
  }

  /// Сонгосон тестүүдийг номын дарааллаар эрэмбэлнэ (вэбийн `sortIds`).
  List<String> sortIds(Iterable<String> ids) {
    final index = {for (var i = 0; i < units.length; i++) units[i].testId: i};
    return [...ids]..sort((a, b) => (index[a] ?? 1 << 30).compareTo(index[b] ?? 1 << 30));
  }

  Roadmap withStatus(String testId, RoadmapStatus status) =>
      Roadmap(units: [for (final u in units) u.testId == testId ? u.withStatus(status) : u], next: next);
}

/// Бодлогын санд байхгүй сэдэв ижил эсэх (жижиг, том үсэг ялгахгүй).
bool sameTopic(String a, String b) => a.toLowerCase() == b.toLowerCase();

/// «1-12, 15, 20» → [1..12, 15, 20] (API `lesson-records.logic.parseProblemNumbers`-тэй ижил дүрэм).
/// Танигдахгүй бол null — бичвэр нь хэвээр хадгалагдана.
List<int>? parseProblemNumbers(String text) {
  final parts = text.split(RegExp(r'[,;\s]+')).map((p) => p.trim()).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return null;
  final out = <int>{};
  final re = RegExp(r'^(\d{1,3})(?:[-–—](\d{1,3}))?$');
  for (final part in parts) {
    final m = re.firstMatch(part);
    if (m == null) return null;
    final a = int.parse(m.group(1)!);
    final b = m.group(2) == null ? a : int.parse(m.group(2)!);
    if (a < 1 || b < a) return null;
    for (var n = a; n <= b; n++) {
      out.add(n);
    }
    if (out.length > 500) return null;
  }
  return out.toList()..sort();
}
