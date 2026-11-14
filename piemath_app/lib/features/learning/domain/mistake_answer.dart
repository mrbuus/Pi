/// Алдааны дэвтрийн хариуны хөрвүүлэлт (цэвэр функцүүд, тесттэй).
library;

import 'dart:convert';

import '../../exam/data/exam_models.dart' show ChoiceMode, ProblemFormat;
import '../../exam/domain/fill_slots.dart';
import '../data/mistake_models.dart';

/// Серверт илгээх хариу. `null` = хараахан бэлэн биш.
///
/// - `answerFields` байвал нүднүүдийн цифрийг түлхүүрээр нь `{a: '3', bc: '54'}` болгоно (бүх нүд дүүрсэн байх ёстой).
/// - бусад нь ирсэн утгаараа (int, үсэг, мөр).
Object? buildRetryAnswer(MistakeProblem p, Object? value) {
  if (value == null) return null;
  if (p.format == ProblemFormat.fillNumber && p.answerFields.isNotEmpty) {
    final s = value is String ? value : '';
    return slotStringToMap([for (final k in p.answerFields) FillSlotGroup(k)], s);
  }
  if (value is String) return value.trim().isEmpty ? null : value.trim();
  return value;
}

/// «3_54» + [a, bc] → `{a: '3', bc: '54'}`. Хоосон нүд байвал `null` (дутуу).
Map<String, String>? slotStringToMap(List<FillSlotGroup> groups, String value) {
  final total = slotsTotalLength(groups);
  final digits = decodeSlotValue(value, total);
  if (digits.any((d) => d.isEmpty)) return null;
  final out = <String, String>{};
  var i = 0;
  for (final g in groups) {
    out[g.key] = digits.sublist(i, i + g.length).join();
    i += g.length;
  }
  return out;
}

/// Сурагчийн өмнөх хариуг харуулах мөр. TEXT сонголт → индексийн бичвэр; Map → «a: 3, bc: 54».
/// Түүхэн өгөгдөлд JSON нэг удаа мөр болж орсон байж болно.
String? displayGivenAnswer(MistakeProblem p, Object? raw) {
  var v = raw;
  if (v is String && RegExp(r'^\s*[\[{]').hasMatch(v)) {
    try {
      v = jsonDecode(v);
    } catch (_) {}
  }
  if (v == null) return null;
  if (v is String && v.isEmpty) return null;
  if (v is int && p.choiceMode == ChoiceMode.text) {
    final c = p.choices;
    if (c != null && v >= 0 && v < c.length) return c[v];
  }
  return _plain(v);
}

/// Зөв хариу: сервер TEXT сонголтод бичвэрийг, бусдад түлхүүрийн утгыг өгнө.
String? displayCorrectAnswer(Object? raw) {
  if (raw == null) return null;
  final s = _plain(raw);
  return s.isEmpty ? null : s;
}

String _plain(Object v) {
  if (v is Map) return v.entries.map((e) => '${e.key}: ${e.value}').join(', ');
  if (v is List) return [for (final Object? x in v) if (x != null) _plain(x)].join(', ');
  return '$v';
}
