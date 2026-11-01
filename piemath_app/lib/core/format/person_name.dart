/// Хүний нэрийн формат — вэбийн `lib/personName.ts`-тэй ижил дүрэм.
library;

/// «Б. Өсөхбаяр» — овгийн эхний үсэг + нэр (эзэн 2026-10-13). Овог хоосон бол зөвхөн нэр.
String shortName(String? firstName, String? lastName) {
  final first = (firstName ?? '').trim();
  final last = (lastName ?? '').trim();
  if (last.isEmpty) return first;
  return '${last.substring(0, 1).toUpperCase()}. $first';
}

/// Багш+ эсэх — нэрийн ард үргэлж «+» (эзэн 2026-10-23).
bool isTeacherPlus(String? role) => role == 'TEACHER_PLUS';

/// Бэлэн нэрийн ард Багш+ бол «+». Давхар «+» тавихгүй.
String withPlus(String name, String? role) {
  final n = name.trimRight();
  return n.isNotEmpty && isTeacherPlus(role) && !n.endsWith('+') ? '$n+' : name;
}

/// Ажилтан/багшийн нэр: «Б. Нэр», Багш+ бол «Б. Нэр+». Нэр харуулах бүх газарт.
String staffName({String? firstName, String? lastName, String? role}) =>
    withPlus(shortName(firstName, lastName), role);

/// Жагсаалтын нэрс: «Б. Нэр»; ижил нэр, ижил овгийн үсэгтэй хоёр хүүхэд байвал
/// тэднийг бүтэн «Овог Нэр»-ээр (эзэн 2026-10-18). [role] өгвөл Багш+-д «+».
Map<String, String> rosterNames(Iterable<({String id, String? firstName, String? lastName, String? role})> people) {
  String key(String? f, String? l) => shortName(f, l).toLowerCase();
  final seen = <String, int>{};
  for (final p in people) {
    final k = key(p.firstName, p.lastName);
    seen[k] = (seen[k] ?? 0) + 1;
  }
  return {
    for (final p in people)
      p.id: withPlus(
        (seen[key(p.firstName, p.lastName)] ?? 0) > 1 && (p.lastName ?? '').trim().isNotEmpty
            ? '${(p.lastName ?? '').trim()} ${(p.firstName ?? '').trim()}'
            : shortName(p.firstName, p.lastName),
        p.role,
      ),
  };
}
