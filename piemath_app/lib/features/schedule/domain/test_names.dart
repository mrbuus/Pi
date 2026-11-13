// Тестийн нэрсийг товчлох (эзэн 2026-11-08) — вэбийн `web/src/lib/testNames.ts`, API-ийн
// `api/src/common/test-names.ts`-тэй ЯГ ИЖИЛ дүрэм (тест: test/features/schedule/test_names_test.dart).
//
// «Квадрат тэгшитгэл 1, Квадрат тэгшитгэл 2, Квадрат тэгшитгэл 3» → «Квадрат тэгшитгэл 1, 2, 3».
// Өөр сэдвүүд «; »-оор: «Иррационал тэгшитгэл 4, 5, 6; Илтгэгч тэгшитгэл 1, 2».
//
// - Нэр = «суурь нэр» + хоосон зай + ТӨГСГӨЛИЙН бүхэл тоо. Суурь нэр яг ижил бол нэг бүлэг
//   («Тэгшитгэл» ба «Тэгшитгэл систем» нь ӨӨР суурь).
// - Тоогүй нэр, эсвэл зөвхөн тоо — бие даасан нэг зүйл.
// - Дараалал хадгалагдана; давхардсан нэр/тоо нэг л удаа; хоосон мөр алгасна.

/// Нэг бүлэг: суурь нэр ба төгсгөлийн тоонууд (бичсэнээр нь, «01» хэвээр).
class TestNameGroup {
  TestNameGroup(this.base, List<String> numbers) : numbers = [...numbers];

  final String base;
  final List<String> numbers;

  /// «Квадрат тэгшитгэл 1, 2, 3» эсвэл «Иррац шалгалт».
  String get text => numbers.isEmpty ? base : '$base ${numbers.join(', ')}';
}

/// Бүлгийн нэг гишүүн: тоо (тоогүй нэрд null) ба эх зүйл.
typedef TestNameMember<T> = ({String? number, T item});

final _trailingNumber = RegExp(r'^(.*\S)\s+(\d+)$');

String _clean(String name) => name.replaceAll(RegExp(r'\s+'), ' ').trim();

/// Нэрсийг суурь нэрээр бүлэглэнэ (дараалал хадгалагдана).
List<TestNameGroup> groupTestNameParts(Iterable<String> names) => [
  for (final g in groupTestItems<String>(names, (n) => n))
    TestNameGroup(g.base, [for (final m in g.members) ?m.number]),
];

/// Зүйлсийг нэрээр нь бүлэглэнэ — бүлгийн тоо бүрийн хажууд нэмэлт тэмдэг (хассан бодлого) зурахад.
/// Давхардсан нэр нэг л удаа (эхнийх нь).
List<({String base, List<TestNameMember<T>> members})> groupTestItems<T>(
  Iterable<T> items,
  String Function(T item) nameOf,
) {
  final groups = <({String base, List<TestNameMember<T>> members})>[];
  final numbered = <String, List<TestNameMember<T>>>{};
  final plain = <String>{};
  for (final item in items) {
    final name = _clean(nameOf(item));
    if (name.isEmpty) continue;
    final m = _trailingNumber.firstMatch(name);
    if (m == null) {
      if (!plain.add(name)) continue;
      groups.add((base: name, members: [(number: null, item: item)]));
      continue;
    }
    final base = m.group(1)!;
    final number = m.group(2)!;
    final existing = numbered[base];
    if (existing != null) {
      if (!existing.any((x) => x.number == number)) existing.add((number: number, item: item));
      continue;
    }
    final members = <TestNameMember<T>>[(number: number, item: item)];
    numbered[base] = members;
    groups.add((base: base, members: members));
  }
  return groups;
}

/// «Квадрат тэгшитгэл 1, 2, 3; Илтгэгч тэгшитгэл 4».
String groupTestNames(Iterable<String> names) => groupTestNameParts(names).map((g) => g.text).join('; ');

/// Өмнө нь «, »-оор нийлүүлж хадгалсан гарчгийг товчилж харуулна. Нэгтгэх зүйлгүй бол бичвэрийг ЯГ хэвээр
/// буцаана (багшийн чөлөөт бичвэрийг эвдэхгүй).
String regroupTopicText(String? text) {
  final raw = text ?? '';
  if (!raw.contains(',')) return raw;
  final groups = groupTestNameParts(raw.split(RegExp(r'\s*,\s*')));
  return groups.any((g) => g.numbers.length > 1) ? groups.map((g) => g.text).join('; ') : raw;
}
