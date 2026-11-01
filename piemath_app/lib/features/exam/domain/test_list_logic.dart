/// Тестийн жагсаалтын цэвэр логик — вэбийн `components/test-list/types.ts`-тэй ИЖИЛ.
library;

import '../data/exam_models.dart';

/// Жинхэнэ шалгалтын төрлүүд (1000 бодлого орно). Бусад нь энгийн дасгал тест.
bool isExamType(String? type) => type == 'CHAPTER_EXAM' || type == 'EESH_MOCK' || type == 'THOUSAND';

/// Сурагчид номын кодыг ХЭЗЭЭ Ч харуулахгүй (эзэн 2026-10-29) — нэр эсвэл юу ч үгүй.
const _studentBookNames = <String, String>{
  '100V3': 'Е-1',
  '200V3': 'Е-2',
  '300': 'Е-3',
  '1000': '1000 бодлого',
  'HG1': 'Хавтгайн геометр 1',
  'OGT': 'Огторгуйн геометр',
};

String? studentBookLabel(TestBook? book) {
  if (book == null) return null;
  return book.displayName ?? _studentBookNames[book.code];
}

const thousandTopic = '1000 бодлого';

int thousandSortKey(TestRow t) {
  final m = RegExp(r'^1000:([A-Z]+)(\d+)$').firstMatch(t.groupKey ?? '');
  if (m != null) return (m.group(1) == 'Y' ? 0 : 1000) + int.parse(m.group(2)!);
  final n = RegExp(r'(\d+)\s*-?\s*[A-ZА-Я]?\s*$').firstMatch(t.title);
  return 5000 + (n == null ? 0 : int.parse(n.group(1)!));
}

/// «1000 бодлого: Сорил 10-A» (дунд цэгтэй ч) → «Сорил 10-A».
String thousandShortTitle(String title) {
  final s = title.replaceFirst(RegExp('^1000\\s*бодлого\\s*[\u00B7:-]\\s*', caseSensitive: false), '').trim();
  return s.isEmpty ? title : s;
}

/// «Илтгэгч тэгшитгэл 1» → сэдэв «Илтгэгч тэгшитгэл», дугаар 1.
({String topic, int? num}) splitTopic(TestRow t) {
  if (t.type == 'THOUSAND') return (topic: thousandTopic, num: thousandSortKey(t));
  final key = (t.groupKey ?? t.title).trim();
  final m = RegExp(r'^(.*?)\s+(\d+)$').firstMatch(key);
  if (m != null) return (topic: m.group(1)!, num: int.parse(m.group(2)!));
  return (topic: 'Бусад', num: null);
}

/// А/Б хувилбарыг ижил бодлого гэж танихад.
String variantKey(TestRow t) => (t.groupKey ?? t.title).trim();

/// JS `(hash * 31 + charCodeAt(i)) >>> 0` — UTF-16 код нэгжээр, uint32. Вэбтэй ЯГ ижил байх ёстой:
/// эс бөгөөс вэб, апп хоёр сурагчид өөр хувилбар харуулна.
int variantHash(String key) {
  var hash = 0;
  for (final c in key.codeUnits) {
    hash = (hash * 31 + c) & 0xFFFFFFFF;
  }
  return hash;
}

/// Ижил бүлгийн хувилбаруудаас нэгийг (вэбийн `pickForStudent`): дүнтэй → эхэлсэн → hash.
TestRow pickForStudent(List<TestRow> rows, String? studentId) {
  if (rows.length == 1) return rows.first;
  for (final r in rows) {
    if (r.results.isNotEmpty) return r;
  }
  for (final r in rows) {
    if (r.sessionStatus == SessionStatus.inProgress) return r;
  }
  final key = '${studentId ?? ''}:${variantKey(rows.first)}';
  return rows[variantHash(key) % rows.length];
}

/// Хувилбаруудыг нэгтгэнэ — анх гарсан дарааллыг хадгална.
List<TestRow> collapseVariants(List<TestRow> rows, String? studentId) {
  final buckets = <String, List<TestRow>>{};
  for (final r in rows) {
    (buckets[variantKey(r)] ??= []).add(r);
  }
  return [for (final b in buckets.values) b.length > 1 ? pickForStudent(b, studentId) : b.first];
}

/// Хайлт (гарчиг, бүлэг) — жижиг/том үсэг ялгахгүй.
bool matchesQuery(TestRow t, String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return true;
  return t.title.toLowerCase().contains(q) || (t.groupKey ?? '').toLowerCase().contains(q);
}

/// Сэдвээр бүлэглэсэн тест (вэбийн TopicGroup). Сэдэв анх гарсан дарааллаар, дотор нь дугаараар.
List<({String topic, List<TestRow> rows})> groupByTopic(List<TestRow> rows) {
  final order = <String>[];
  final map = <String, List<({TestRow row, int? num})>>{};
  for (final r in rows) {
    final s = splitTopic(r);
    if (!map.containsKey(s.topic)) order.add(s.topic);
    (map[s.topic] ??= []).add((row: r, num: s.num));
  }
  return [
    for (final t in order)
      (
        topic: t,
        rows: ([...map[t]!]..sort((a, b) => (a.num ?? 1 << 30).compareTo(b.num ?? 1 << 30))).map((e) => e.row).toList(),
      ),
  ];
}
