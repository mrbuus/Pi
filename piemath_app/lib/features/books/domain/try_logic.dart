/// Үнэгүй тестийн цэвэр логик (I/O-гүй, тесттэй). Дүгнэлтийг СЕРВЕР хийнэ — энд зөвхөн
/// хариуг серверийн хүлээн авах хэлбэрт оруулна (api-contract/exam.md §3.2).
library;

final _slotRe = RegExp(r'\[([a-zA-Zа-яА-ЯёЁ]{1,8})\]|\\lbrack\s*([a-zA-Zа-яА-ЯёЁ]{1,8})\s*\\rbrack');

/// FILL_NUMBER бодлогын нүдний бүлгүүд (`[a]`, `[bc]`, `\lbrack a\rbrack`) — текстэд гарсан
/// дарааллаар, давхардлыг нэг удаа. Бүлгийн урт = үсгийн тоо.
List<String> parseFillSlots(String? statement) {
  if (statement == null || statement.isEmpty) return const [];
  final out = <String>[];
  for (final m in _slotRe.allMatches(statement)) {
    final name = m.group(1) ?? m.group(2)!;
    if (!out.contains(name)) out.add(name);
  }
  return out;
}

/// Нүдтэй бодлогын хариуг объект болгоно: `{ "a": "3", "bc": "54" }`. Хоосон нүдийг орхино;
/// бүгд хоосон бол null (хариулаагүй).
Map<String, String>? encodeSlotAnswer(Map<String, String> values) {
  final out = <String, String>{
    for (final e in values.entries)
      if (e.value.trim().isNotEmpty) e.key: e.value.trim(),
  };
  return out.isEmpty ? null : out;
}

/// Хариулсан эсэх (вэб: `undefined` эсвэл `""` бол үгүй).
bool isAnswered(Object? v) {
  if (v == null) return false;
  if (v is String) return v.trim().isNotEmpty;
  if (v is Map) return v.isNotEmpty;
  return true;
}

/// Дүнгийн тайлбар — вэбийн `TryTest.tsx` `verdict()`-тэй ижил.
String tryVerdict(int pct) {
  if (pct >= 90) return 'маш сайн';
  if (pct >= 70) return 'сайн';
  if (pct >= 50) return 'дунд, давтах сэдэв бий';
  return 'суурь дээрээ ажиллах хэрэгтэй';
}

/// «05:09» — үлдсэн хугацаа.
String mmss(int seconds) {
  final s = seconds < 0 ? 0 : seconds;
  return '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';
}

/// Үсэг (TEXT горимд дэлгэцэнд, LETTER горимд утга).
const choiceLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
