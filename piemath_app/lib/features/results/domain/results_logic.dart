import '../../../core/auth/user_role.dart';
import '../../classrooms_admin/data/classrooms_admin_models.dart' show buildCsv;
import '../../teacher/domain/board_logic.dart' show compareMn;
import '../data/results_models.dart';

/// Шалгалтын дүнгийн эрх — вэб, сервертэй ИЖИЛ (UI нуух/харуулах; шийдвэр серверт).
///
/// | Үйлдэл | Админ | Багш+ | Багш |
/// |---|---|---|---|
/// | Дүн, анализ, сурагчийн задаргаа харах | бүх анги | бүх анги | өөрийн анги (сервер шүүнэ) |
/// | Цаасан дүн оруулах, дахин оруулах | тийм | тийм | өөрийн ангийн сурагч |
/// | Онлайнаар өгсөн дүнг засах (шалтгаантай) | тийм | тийм | үгүй |
/// | Шалгалтын найдвартай байдал | тийм | тийм | үгүй (сервер илгээхгүй) |
class ResultsAccess {
  const ResultsAccess(this.role);

  final UserRole? role;

  /// `/app/tests/:id/results` — вэбийн `@Roles(ADMIN, TEACHER_PLUS, TEACHER)`.
  bool get canView => role?.isStaff ?? false;

  bool get canEnter => canView;

  /// `result-policy.ts` `OVERRIDE_ROLES`.
  bool get canOverrideOnline => role == UserRole.admin || role == UserRole.teacherPlus;

  /// Түгжээтэй мөрийг «Дахин оруулах» боломжтой эсэх.
  bool canReenter(ResultRow existing) => canEnter && (!existing.isOnline || canOverrideOnline);

  /// Онлайн дүнг засахад шалтгаан заавал.
  bool needsReason(ResultRow existing) => existing.isOnline;
}

/// `result-policy.ts` `MIN_REASON_LENGTH`.
const minReasonLength = 3;

// ───────── Эрэмбэ (вэбийн `ResultsTable`) ─────────

enum ResultSortKey {
  name('Нэр'),
  score('Оноо'),
  percent('Хувь');

  const ResultSortKey(this.label);
  final String label;
}

class ResultSort {
  const ResultSort(this.key, {this.ascending = false});

  /// Анхдагч: оноогоор, ихээс бага руу.
  static const initial = ResultSort(ResultSortKey.score);

  final ResultSortKey key;
  final bool ascending;

  /// Ижил түлхүүр — чиглэл солино; шинэ түлхүүр — нэр өсөхөөр, бусад нь буурахаар.
  ResultSort toggle(ResultSortKey k) =>
      k == key ? ResultSort(key, ascending: !ascending) : ResultSort(k, ascending: k == ResultSortKey.name);

  @override
  bool operator ==(Object other) => other is ResultSort && other.key == key && other.ascending == ascending;

  @override
  int get hashCode => Object.hash(key, ascending);
}

/// Эрэмбэлсэн шинэ жагсаалт. Хувиар эрэмбэлэхэд `maxScore` 0 мөр хамгийн сүүлд (буурахад) / эхэнд (өсөхөд).
List<ResultRow> sortResults(Iterable<ResultRow> rows, ResultSort sort) {
  final dir = sort.ascending ? 1 : -1;
  final list = [...rows];
  list.sort((a, b) {
    final d = switch (sort.key) {
      ResultSortKey.name => compareMn(a.name, b.name),
      ResultSortKey.score => a.totalScore.compareTo(b.totalScore),
      ResultSortKey.percent => (a.percent ?? -1).compareTo(b.percent ?? -1),
    };
    return d != 0 ? d * dir : compareMn(a.name, b.name);
  });
  return list;
}

// ───────── Шүүлтүүр ─────────

/// Дүнгийн бүлэг (вэбийн «Ангийн дундаж» мөрийн 80%+, 50–79%, 50%-с доош).
enum ScoreBand { good, mid, low, none }

ScoreBand bandOf(int? percent) {
  if (percent == null) return ScoreBand.none;
  if (percent >= 80) return ScoreBand.good;
  if (percent >= 50) return ScoreBand.mid;
  return ScoreBand.low;
}

abstract final class ResultFilters {
  static const good = 'good';
  static const mid = 'mid';
  static const low = 'low';

  /// Гарсан, скриншот, бичлэгийн тоо > 0.
  static const flagged = 'flagged';
  static const online = 'online';
  static const paper = 'paper';

  static bool test(ResultRow r, String id) => switch (id) {
    good => bandOf(r.percent) == ScoreBand.good,
    mid => bandOf(r.percent) == ScoreBand.mid,
    low => bandOf(r.percent) == ScoreBand.low,
    flagged => r.run.indicators.isNotEmpty,
    online => r.isOnline,
    paper => !r.isOnline,
    _ => true,
  };
}

/// Хайлт: нэрээр (том жижиг үсэг ялгахгүй).
bool resultMatches(ResultRow r, String q) => r.name.toLowerCase().contains(q);

/// Ангиар шүүх — [classStudentIds] null бол бүх анги.
List<ResultRow> inClass(List<ResultRow> rows, Set<String>? classStudentIds) => classStudentIds == null
    ? rows
    : [
        for (final r in rows)
          if (classStudentIds.contains(r.studentId)) r,
      ];

// ───────── Нэгтгэл ─────────

class ResultsStats {
  const ResultsStats({
    required this.avgPct,
    required this.good,
    required this.mid,
    required this.low,
    required this.total,
  });

  final int avgPct;
  final int good;
  final int mid;
  final int low;
  final int total;

  /// Вэбийн `stats`: `maxScore > 0` мөрөөс л. Мөргүй бол null.
  static ResultsStats? of(Iterable<ResultRow> rows) {
    final valid = [
      for (final r in rows)
        if (r.maxScore > 0) r,
    ];
    if (valid.isEmpty) return null;
    var sum = 0.0;
    var good = 0;
    var mid = 0;
    for (final r in valid) {
      final p = r.totalScore / r.maxScore * 100;
      sum += p;
      if (p >= 80) {
        good++;
      } else if (p >= 50) {
        mid++;
      }
    }
    return ResultsStats(
      avgPct: (sum / valid.length).round(),
      good: good,
      mid: mid,
      low: valid.length - good - mid,
      total: valid.length,
    );
  }
}

/// Бөөнөөр оруулах ангийн сонголт: тестэд оноосон анги; оноогоогүй бол ажилтны бүх анги (вэбтэй ижил).
List<ClassOption> classOptionsFor(TestMeta? meta, List<ClassOption> classrooms) {
  final ids = meta?.accessClassIds ?? const <String>{};
  final matched = [
    for (final c in classrooms)
      if (ids.contains(c.id)) c,
  ];
  return matched.isNotEmpty ? matched : classrooms;
}

// ───────── Оноо оруулах (вэбийн `BulkScoreEntry`) ─────────

/// «12», «12.5», «12,5» → тоо. Буруу бол null.
double? parseScore(String text) {
  final t = text.trim().replaceAll(',', '.');
  if (t.isEmpty) return null;
  final v = double.tryParse(t);
  return v != null && v.isFinite ? v : null;
}

/// Хоосон бол null (алдаагүй). Тоо биш, эсвэл 0–[max]-аас гадуур бол монгол алдаа.
String? scoreRangeError(String text, double max) {
  if (text.trim().isEmpty) return null;
  final n = parseScore(text);
  if (n == null) return 'Тоо оруулна уу';
  if (n < 0 || n > max) return '0–${fmtScore(max)} хооронд байх ёстой';
  return null;
}

/// Өмнө оноотой байсан сурагчид 0 бичвэл анхааруулна (санамсаргүй дарж бичихээс).
bool isSuspiciousZero(String text, ResultRow? existing) =>
    existing != null && existing.totalScore > 0 && parseScore(text) == 0;

enum SaveState { idle, saving, saved, error }

/// Нэг сурагчийн оруулах мөрийн төлөв.
class EntryState {
  const EntryState({this.value = '', this.locked = false, this.save = SaveState.idle, this.error, this.reason});

  final String value;

  /// Аль хэдийн дүнтэй — «Дахин оруулах» дарахаас нааш засахгүй.
  final bool locked;
  final SaveState save;
  final String? error;

  /// Онлайн дүнг засах шалтгаан (Багш+/Админ).
  final String? reason;

  EntryState copyWith({String? value, bool? locked, SaveState? save, String? error, String? reason}) => EntryState(
    value: value ?? this.value,
    locked: locked ?? this.locked,
    save: save ?? this.save,
    error: error,
    reason: reason ?? this.reason,
  );
}

/// Бүртгэлээр анхны төлөв: дүнтэй сурагч түгжээтэй, одоогийн оноо урьдчилан.
Map<String, EntryState> initialEntries(List<RosterStudent> roster, Map<String, ResultRow> existing) => {
  for (final s in roster)
    s.id: existing[s.id] == null
        ? const EntryState()
        : EntryState(value: fmtScore(existing[s.id]!.totalScore), locked: true),
};

/// Хадгалах мөрүүд: түгжээгүй, хоосон биш, хязгаартаа.
List<RosterStudent> saveCandidates(List<RosterStudent> roster, Map<String, EntryState> entries, double max) => [
  for (final s in roster)
    if (entries[s.id] case final e?)
      if (!e.locked && e.value.trim().isNotEmpty && scoreRangeError(e.value, max) == null) s,
];

/// «12 / 30 оруулсан» — хоосон биш утгатай мөр.
int filledCount(List<RosterStudent> roster, Map<String, EntryState> entries) =>
    roster.where((s) => (entries[s.id]?.value ?? '').trim().isNotEmpty).length;

// ───────── CSV (вэбийн `exportCsv`) ─────────

String resultsCsv(List<ResultRow> sorted) => buildCsv(
  const ['№', 'Нэр', 'Оноо', 'Нийт', 'Хувь', 'Эх сурвалж', 'Горимоос гарсан тоо', 'Скриншот', 'Бичлэг'],
  [
    for (var i = 0; i < sorted.length; i++)
      [
        i + 1,
        sorted[i].name,
        sorted[i].totalScore,
        sorted[i].maxScore,
        sorted[i].percent ?? '',
        ResultSource.label(sorted[i].source),
        sorted[i].run.leaveCount ?? 0,
        sorted[i].run.screenshotCount ?? 0,
        sorted[i].run.recordingCount ?? 0,
      ],
  ],
);

// ───────── Анализ ─────────

/// Зөв хувийн өнгө: 70+ сайн, 40–69 дунд, 40-өөс доош сул (вэбийн `correctTone`).
enum CorrectTone { good, mid, low, none }

CorrectTone correctTone(int? percent) {
  if (percent == null) return CorrectTone.none;
  if (percent >= 70) return CorrectTone.good;
  if (percent >= 40) return CorrectTone.mid;
  return CorrectTone.low;
}

/// Тархалтын баганын шошго.
const histogramLabels = ['0–20', '20–40', '40–60', '60–80', '80–100'];
