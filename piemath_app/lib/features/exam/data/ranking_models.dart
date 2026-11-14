/// `GET /test-rankings/:testId` (`docs/api-contract/exam.md` §1.5). Бусдын нэр хэзээ ч ирэхгүй.
class RankEntry {
  const RankEntry({required this.label, this.rank, this.participants = 0, this.tied = 0});

  factory RankEntry.fromJson(Object? raw, {String fallbackLabel = ''}) {
    final m = raw is Map ? raw : const <String, Object?>{};
    final label = m['label'];
    return RankEntry(
      label: label is String && label.trim().isNotEmpty ? label.trim() : fallbackLabel,
      rank: (m['rank'] as num?)?.toInt(),
      participants: (m['participants'] as num?)?.toInt() ?? 0,
      tied: (m['tied'] as num?)?.toInt() ?? 0,
    );
  }

  final String label;

  /// null — байр тооцогдоогүй.
  final int? rank;
  final int participants;

  /// Ижил хувийн дүнтэй хүмүүсийн тоо, ӨӨРИЙГӨӨ ОРУУЛСАН (`ranking.service.ts`): 1 = өөр хэн ч биш.
  final int tied;
}

class TestRanking {
  const TestRanking({
    required this.title,
    required this.totalScore,
    required this.maxScore,
    this.classes = const [],
    this.school,
    this.exam,
  });

  factory TestRanking.fromJson(Object? raw) {
    final j = raw is Map ? raw : const <String, Object?>{};
    final test = j['test'] is Map ? j['test'] as Map : const <String, Object?>{};
    return TestRanking(
      title: test['title'] is String ? test['title'] as String : '',
      totalScore: (j['totalScore'] as num?) ?? 0,
      maxScore: (j['maxScore'] as num?) ?? 0,
      classes: [for (final c in (j['classes'] as List? ?? const [])) RankEntry.fromJson(c, fallbackLabel: 'Анги')],
      school: j['school'] is Map ? RankEntry.fromJson(j['school'], fallbackLabel: 'Сургууль') : null,
      exam: j['exam'] is Map ? RankEntry.fromJson(j['exam'], fallbackLabel: 'Нийт шалгалт') : null,
    );
  }

  final String title;
  final num totalScore;
  final num maxScore;
  final List<RankEntry> classes;
  final RankEntry? school;
  final RankEntry? exam;

  List<RankEntry> get all => [...classes, ?school, ?exam];
  bool get hasAnyRank => all.any((e) => e.rank != null);
}
