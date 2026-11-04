/// «Тоо нөхөх» (Хэсэг II) бодлогын нүдний тэмдэглэгээ — вэбийн `components/exam/fillSlots.ts`,
/// серверийн `api/src/tests/grading.ts` (`fillSlotKeys`)-тэй ИЖИЛ дүрэм.
///
/// Нүд зөвхөн ХАРАГДАЦ: серверт нэг шулуун мөр (`"3_5"`) илгээнэ — хоосон нүд `_`,
/// төгсгөлийн хоосныг тайрна, бүгд хоосон бол `""`.
library;

class FillSlotGroup {
  const FillSlotGroup(this.key);

  /// Хаалт доторх үсгүүд («a», «bc»).
  final String key;

  /// Нүдний тоо (= үсгийн тоо).
  int get length => key.length;
}

final _bracket = RegExp(r'\[([a-zA-Zа-яА-ЯёЁ]{1,8})\]|\\lbrack\s*([a-zA-Zа-яА-ЯёЁ]{1,8})\s*\\rbrack');

/// Нүдний хоосон тэмдэг.
const fillEmpty = '_';

List<FillSlotGroup> parseFillSlots(String? statementText) {
  if (statementText == null || statementText.isEmpty) return const [];
  final seen = <String>{};
  final groups = <FillSlotGroup>[];
  for (final m in _bracket.allMatches(statementText)) {
    final key = m.group(1) ?? m.group(2)!;
    if (seen.add(key)) groups.add(FillSlotGroup(key));
  }
  return groups;
}

int slotsTotalLength(List<FillSlotGroup> groups) => groups.fold(0, (s, g) => s + g.length);

/// Мөр → нүд бүрийн цифр (`''` = хоосон).
List<String> decodeSlotValue(String value, int total) => [
  for (var i = 0; i < total; i++)
    if (i < value.length && value[i] != fillEmpty) value[i] else '',
];

/// Нүд бүрийн цифр → мөр (хоосон нүд `_`, төгсгөлийн хоосныг тайрна).
String encodeSlotDigits(List<String> digits) {
  var end = digits.length;
  while (end > 0 && digits[end - 1].isEmpty) {
    end--;
  }
  return digits.take(end).map((d) => d.isEmpty ? fillEmpty : d).join();
}

/// Цифр — эхний ХООСОН нүдэнд (бүгд дүүрсэн бол өөрчлөхгүй).
String typeSlotDigit(String value, int total, String digit) {
  final digits = decodeSlotValue(value, total);
  final idx = digits.indexWhere((d) => d.isEmpty);
  if (idx == -1) return value;
  digits[idx] = digit;
  return encodeSlotDigits(digits);
}

/// Тодорхой нүдийг тохируулах (нүд сонгоод бичих үед). `''` бол цэвэрлэнэ.
String setSlotDigit(String value, int total, int index, String digit) {
  if (index < 0 || index >= total) return value;
  final digits = decodeSlotValue(value, total);
  digits[index] = digit;
  return encodeSlotDigits(digits);
}

/// Backspace — хамгийн сүүлд бөглөгдсөн нүдийг цэвэрлэнэ.
String backspaceSlot(String value, int total) {
  final digits = decodeSlotValue(value, total);
  for (var i = digits.length - 1; i >= 0; i--) {
    if (digits[i].isNotEmpty) {
      digits[i] = '';
      break;
    }
  }
  return encodeSlotDigits(digits);
}

/// Чөлөөт тоон хариу (нүдгүй): цифр, нэг `-` эхэнд, нэг `.` — вэбийн гарын дүрэм.
String typeFreeNumber(String prev, String key) {
  if (RegExp(r'^[0-9]$').hasMatch(key)) return prev + key;
  if (key == '-' && !prev.contains('-')) return '-$prev';
  if (key == '.' && !prev.contains('.')) return '$prev.';
  return prev;
}

/// Чөлөөт тоон хариуны сүүлийн тэмдэгтийг арилгах.
String backspaceFree(String prev) => prev.isEmpty ? prev : prev.substring(0, prev.length - 1);
