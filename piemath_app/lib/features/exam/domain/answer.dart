/// Шалгалтын нэг хариу — серверийн `answers` утгын формат (`docs/api-contract/exam.md` §3.2).
///
/// - CHOICE TEXT: харуулсан индекс (`int`, 0-ээс; холилдсон дараалал)
/// - CHOICE LETTER: үсэг (`String`)
/// - FILL_NUMBER нүдтэй: нэг мөр (`"3_5"`), нүдгүй: чөлөөт мөр (`"-3.5"`)
/// - OPEN: мөр (1000 тэмдэгтээс ихгүй)
/// Сервер `number`, `string`, (FILL_NUMBER-д) `{slot: value}` объект хүлээнэ.
library;

/// Серверийн мөрийн дээд урт.
const maxAnswerLength = 1000;

/// JSON-оос ирсэн хариуны утгыг (draftAnswers, локал ноорог) аюулгүйгээр хувиргана: int, String, Map л.
Object? normalizeAnswer(Object? raw) {
  if (raw is int) return raw;
  if (raw is double) {
    if (!raw.isFinite) return null;
    return raw == raw.roundToDouble() ? raw.toInt() : raw;
  }
  if (raw is String) return raw.length > maxAnswerLength ? raw.substring(0, maxAnswerLength) : raw;
  if (raw is Map) {
    return <String, String>{
      for (final e in raw.entries)
        if (e.value is String) e.key.toString(): e.value as String,
    };
  }
  return null;
}

/// Хариулсан эсэх (навигаторын тоолол — вэб: `!== undefined && !== ""`).
bool isAnswered(Object? value) {
  if (value == null) return false;
  if (value is String) return value.isNotEmpty;
  if (value is Map) return value.values.any((v) => v is String && v.isNotEmpty);
  return true;
}

/// Хоёр хариу ижил эсэх (Map-ыг утгаар нь).
bool answerEquals(Object? a, Object? b) {
  if (a is Map && b is Map) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || a[k] != b[k]) return false;
    }
    return true;
  }
  return a == b;
}

/// Сурагчийн өөрийн үнэлгээ (оноонд нөлөөгүй, алдааны дэвтэрт нөлөөтэй).
enum SelfState {
  solvedClean('SOLVED_CLEAN', 'Алдаагүй'),
  fixedAfterError('FIXED_AFTER_ERROR', 'Зассан'),
  failed('FAILED', 'Алдсан'),
  guessed('GUESSED', 'Таамагласан');

  const SelfState(this.wire, this.label);

  final String wire;
  final String label;

  static SelfState? fromWire(Object? s) {
    for (final v in values) {
      if (v.wire == s) return v;
    }
    return null;
  }
}
