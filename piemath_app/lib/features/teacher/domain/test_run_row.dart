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
    this.leaveLimit,
    this.leftByLeaves = false,
    this.late,
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
      leaveLimit: _num(j['leaveLimit'])?.toInt(),
      leftByLeaves: j['leftByLeaves'] == true,
      late: LateAnswersInfo.fromJson(j['lateAnswers']),
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

  /// Шалгалтын аппаас гарах дүрэм: 2 = Хатуу, 3 = Зөөлөн (хуучин сервер: null).
  final int? leaveLimit;

  /// Гаралтын хязгаарт хүрч шалгалт автоматаар илгээгдсэн.
  final bool leftByLeaves;

  /// Хоцорч ирсэн хариу (сесс хаагдсаны дараа төхөөрөмжөөс) — хуучин сервер: null.
  final LateAnswersInfo? late;

  /// «Хатуу (2 дахь гаралтад илгээгдэнэ)» — хуучин сервер утга өгөхгүй бол null.
  static String? leaveRuleLabel(int? leaveLimit) => switch (leaveLimit) {
    null => null,
    2 => 'Хатуу (2 дахь гаралтад илгээгдэнэ)',
    _ => 'Зөөлөн (3 дахь гаралтад илгээгдэнэ)',
  };

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

/// `lateAnswers` — хоцорч ирсэн, дүнд ороогүй хариу (Админ / Багш+ «Хүлээн авах»).
class LateAnswersInfo {
  const LateAnswersInfo({required this.pending, this.differing = 0, this.canAccept = false, this.previousLabel});

  static LateAnswersInfo? fromJson(Object? raw) {
    if (raw is! Map) return null;
    final prev = raw['previousScore'];
    String? label;
    if (prev is Map && prev['totalScore'] is num && prev['maxScore'] is num) {
      String n(num v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);
      label = '${n(prev['totalScore'] as num)}/${n(prev['maxScore'] as num)}';
    }
    return LateAnswersInfo(
      pending: raw['pending'] == true,
      differing: raw['differing'] is num ? (raw['differing'] as num).toInt() : 0,
      canAccept: raw['canAccept'] == true,
      previousLabel: label,
    );
  }

  final bool pending;
  final int differing;
  final bool canAccept;

  /// Хүлээн авахаас өмнөх оноо «3/10».
  final String? previousLabel;

  String get label => pending
      ? 'Хоцорч ирсэн хариу: $differing бодлого зөрүүтэй'
      : previousLabel == null
      ? 'Хоцорсон хариу хүлээн авсан'
      : 'Хоцорсон хариу хүлээн авсан (өмнө $previousLabel)';
}
