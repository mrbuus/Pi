/// Давтлагын цэвэр логик (тесттэй): хариуны код, үлдсэн хугацаа, idempotency id.
library;

import 'dart:math';

import '../../exam/data/exam_models.dart' show ChoiceMode;
import '../data/study_models.dart';

/// Хугацаа → дээд бодлогын тоо (`REVIEW_CAPS`). Зөвхөн харуулахад; хязгаарыг сервер хэрэгжүүлнэ.
const reviewBudgets = <int, int>{10: 5, 30: 10, 60: 20};

const maxReviewChapters = 5;

/// Өөрийн тэмдэглэгээ (сервер: `unsure | guessed | could-not | help`).
const reviewFlagLabels = <String, String>{
  'unsure': 'Эргэлзсэн',
  'guessed': 'Таасан',
  'could-not': 'Бодож чадаагүй',
  'help': 'Тусламж авсан',
};

/// Сонголтын хариуг серверийн кодоор: LETTER → `A`.., TEXT → `choice:<индекс>`.
String choiceAnswerCode(ChoiceMode? mode, int index) =>
    mode == ChoiceMode.letter ? String.fromCharCode(65 + index) : 'choice:$index';

/// Кодыг сонголтын индекс болгоно (`choice:2` эсвэл `C`). Танихгүй бол `null`.
int? choiceIndexOfCode(ChoiceMode? mode, String code) {
  if (mode == ChoiceMode.letter) {
    if (code.length == 1) {
      final i = code.codeUnitAt(0) - 65;
      return i >= 0 && i < 26 ? i : null;
    }
    return null;
  }
  final m = RegExp(r'^choice:(\d{1,2})$').firstMatch(code);
  return m == null ? null : int.parse(m.group(1)!);
}

/// Хадгалсан хариуг харуулах мөр. TEXT сонголт → сонголтын бичвэр.
String displayReviewAnswer(StudySource source, String value) {
  final idx = choiceIndexOfCode(source.choiceMode, value);
  if (idx != null && source.choices != null && idx < source.choices!.length) {
    final c = source.choices![idx];
    if (source.choiceMode == ChoiceMode.letter) return c.text.isEmpty ? value : c.text;
    return c.text;
  }
  return value.isEmpty ? 'Хариулт бичээгүй' : value;
}

String correctnessLabel(bool? correct) => correct == true
    ? 'Зөв'
    : correct == false
    ? 'Буруу'
    : 'Үнэлгээ тодорхойгүй';

/// Үлдсэн секунд. Төхөөрөмжийн цагийн зөрүүг [serverNow]-оор тэгшилж, амласан төсвөөс хэтрүүлэхгүй.
int remainingSeconds({
  required DateTime deadlineAt,
  required DateTime serverNow,
  required DateTime deviceNowAtFetch,
  required DateTime deviceNow,
  required int budgetMinutes,
}) {
  // Сервер ба төхөөрөмжийн зөрүү: serverNow - deviceNowAtFetch.
  final offset = serverNow.difference(deviceNowAtFetch);
  final estimatedServerNow = deviceNow.add(offset);
  final ms = deadlineAt.difference(estimatedServerNow).inMilliseconds;
  final secs = (ms / 1000).ceil();
  final cap = max(0, budgetMinutes) * 60;
  return secs.clamp(0, cap);
}

String formatCountdown(int seconds) => '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';

/// UUID v4 — `clientRequestId`. Тестэд [Random] өгч тогтвортой болгоно.
String newRequestId([Random? random]) {
  final r = random ?? Random.secure();
  final b = List<int>.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  String h(int from, int to) => b.sublist(from, to).map((x) => x.toRadixString(16).padLeft(2, '0')).join();
  return '${h(0, 4)}-${h(4, 6)}-${h(6, 8)}-${h(8, 10)}-${h(10, 16)}';
}
