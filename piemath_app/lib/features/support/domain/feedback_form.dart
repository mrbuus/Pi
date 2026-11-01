import 'dart:math' as math;

/// Санал хүсэлтийн төрөл (вэбийн `FeedbackWorkspace` `KIND`).
enum FeedbackKind {
  bug('BUG', 'Алдаа мэдээлэх'),
  suggestion('SUGGESTION', 'Санал өгөх'),
  question('QUESTION', 'Асуулт асуух');

  const FeedbackKind(this.api, this.label);

  final String api;
  final String label;

  static FeedbackKind fromApi(String? v) => values.firstWhere((k) => k.api == v, orElse: () => FeedbackKind.question);
}

/// Хүсэлтийн төлөв (`OPEN | IN_REVIEW | RESOLVED`).
String feedbackStateLabel(String state) => switch (state) {
      'OPEN' => 'Шинэ',
      'IN_REVIEW' => 'Шалгаж байна',
      'RESOLVED' => 'Шийдвэрлэсэн',
      _ => 'Шинэ',
    };

/// Серверийн DTO-той ижил шалгалт (гарчиг 3–120, дэлгэрэнгүй 10–10000). Алдаагүй бол null.
String? validateSubject(String raw) {
  final s = raw.trim();
  if (s.length < 3) return 'Гарчиг 3-аас дээш тэмдэгт байна';
  if (s.length > 120) return 'Гарчиг 120 тэмдэгтээс хэтрэхгүй';
  return null;
}

String? validateBody(String raw) {
  final s = raw.trim();
  if (s.length < 10) return 'Дэлгэрэнгүй 10-аас дээш тэмдэгт байна';
  if (s.length > 10000) return 'Дэлгэрэнгүй хэт урт байна';
  return null;
}

/// Санамсаргүй UUID v4 (`clientRequestId`). Нууцлалын түлхүүр биш — давхардал арилгах дугаар.
String uuidV4([math.Random? random]) {
  final r = random ?? math.Random.secure();
  final b = List<int>.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  final h = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

/// Нэг илгээлтийн давхардлын түлхүүр: агуулга өөрчлөгдөөгүй бол ижил id (сүлжээ тасарсны дараа
/// дахин илгээхэд сервер давхар үүсгэхгүй), өөрчлөгдвөл шинэ id.
class FeedbackRequestId {
  FeedbackRequestId([this._random]);

  final math.Random? _random;
  String? _fingerprint;
  String? _id;

  String forPayload(String fingerprint) {
    if (_id == null || _fingerprint != fingerprint) {
      _fingerprint = fingerprint;
      _id = uuidV4(_random);
    }
    return _id!;
  }

  void reset() {
    _fingerprint = null;
    _id = null;
  }
}
