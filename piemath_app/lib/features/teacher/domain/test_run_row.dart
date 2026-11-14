/// `GET /tests/:id/results` мөр — багшид харагдах шалгалтын дүн + бүрэн бүтэн байдлын тоо.
///
/// `leaveCount`, `screenshotCount`, `recordingCount` нь `null` байж болно (session байхгүй). Эдгээр нь
/// БҮРТГЭГДСЭН үйл явдал — автомат «хууран мэхэлсэн» дүгнэлт биш.
class TestRunRow {
  const TestRunRow({
    required this.id,
    required this.studentId,
    required this.name,
    required this.totalScore,
    required this.maxScore,
    this.leaveCount,
    this.screenshotCount,
    this.recordingCount,
  });

  factory TestRunRow.fromJson(Map<String, Object?> j) {
    final s = j['student'];
    final st = s is Map ? s : const <Object?, Object?>{};
    final name = '${st['firstName'] ?? ''} ${st['lastName'] ?? ''}'.trim();
    return TestRunRow(
      id: '${j['id'] ?? ''}',
      studentId: '${st['id'] ?? ''}',
      name: name.isEmpty ? 'Сурагч' : name,
      totalScore: _num(j['totalScore']) ?? 0,
      maxScore: _num(j['maxScore']) ?? 0,
      leaveCount: _num(j['leaveCount'])?.toInt(),
      screenshotCount: _num(j['screenshotCount'])?.toInt(),
      recordingCount: _num(j['recordingCount'])?.toInt(),
    );
  }

  final String id;
  final String studentId;
  final String name;
  final double totalScore;
  final double maxScore;
  final int? leaveCount;
  final int? screenshotCount;
  final int? recordingCount;

  /// Тоо > 0 байгаа үзүүлэлтүүд л (дараалал: гарсан, скриншот, бичлэг).
  List<({IntegrityKind kind, int count})> get indicators => [
    if ((leaveCount ?? 0) > 0) (kind: IntegrityKind.leave, count: leaveCount!),
    if ((screenshotCount ?? 0) > 0) (kind: IntegrityKind.screenshot, count: screenshotCount!),
    if ((recordingCount ?? 0) > 0) (kind: IntegrityKind.recording, count: recordingCount!),
  ];

  static double? _num(Object? v) => v is num ? v.toDouble() : (v is String ? double.tryParse(v) : null);
}

enum IntegrityKind {
  leave('Гарсан'),
  screenshot('Скриншот'),
  recording('Бичлэг');

  const IntegrityKind(this.label);

  final String label;
}
