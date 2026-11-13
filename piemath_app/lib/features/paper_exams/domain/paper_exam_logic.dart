import '../data/paper_exam_models.dart';

/// «Нэгдсэн шалгалт»-ын харуулах туслахууд (I/O-гүй, тесттэй) — вэбийн `paper-exams/types.ts`,
/// `PaperExamsList.nextTitle`, `StudentPaperDetail`. Оноо, байр, хувийг бүгд сервер бодно.

/// «Нэгдсэн шалгалт N» — байгаа хамгийн их дугаарын дараагийнх (эзэн 2026-11-13).
String nextTitle(Iterable<String> titles) {
  final re = RegExp(r'^Нэгдсэн шалгалт\s+(\d+)$', caseSensitive: false);
  var max = 0;
  for (final t in titles) {
    final m = re.firstMatch(t.trim());
    if (m != null) {
      final n = int.parse(m.group(1)!);
      if (n > max) max = n;
    }
  }
  return 'Нэгдсэн шалгалт ${max + 1}';
}

/// «2026-11-10» → «2026.11.10» (цагийн бүсгүй өдөр).
String dayText(String day) => day.replaceAll('-', '.');

/// Оноо: бүхэл бол бутархайгүй, эс бөгөөс 1 орон.
String scoreText(num? n) {
  if (n == null) return '';
  if (n == n.roundToDouble()) return n.round().toString();
  return n.toStringAsFixed(1);
}

/// Нүдний бичвэр (эзний Excel-ийн дагуу): зөв = 1; буруу бол сонгосон үсэг эсвэл 0; давхар = *.
String cellText(ItemStatus status, String? answer) => switch (status) {
  ItemStatus.correct => '1',
  ItemStatus.multi => '*',
  ItemStatus.wrong => answer != null && RegExp(r'^[A-E]$').hasMatch(answer) ? answer : '0',
  _ => '',
};

/// Хувийн өнгөний түвшин (70 / 40) — одоогийн шалгалтын анализтай ижил.
enum PctTone { success, warning, danger, neutral }

PctTone toneOf(int? pct) {
  if (pct == null) return PctTone.neutral;
  if (pct >= 70) return PctTone.success;
  if (pct >= 40) return PctTone.warning;
  return PctTone.danger;
}

const _areaShort = {
  'Тоо тоолол': 'ТТ',
  'Алгебр': 'Ал',
  'Анализын эхлэл': 'Ан',
  'Геометр ба тригонометр': 'ГТ',
  'Магадлал статистик': 'МС',
};

/// Агуулгын товчлол (хүснэгтийн толгой).
String areaShort(String? area) {
  if (area == null || area.isEmpty) return '';
  return _areaShort[area] ?? (area.length > 2 ? area.substring(0, 2) : area);
}

/// Сэдвийн товчлол: «Модультай тэнцэтгэл биш» → «МТБ».
String topicShort(String? topic) {
  if (topic == null || topic.isEmpty) return '';
  final words = topic.split(RegExp(r'[\s,]+')).where((w) => w.isNotEmpty).toList();
  if (words.length == 1) return words.first.length > 3 ? words.first.substring(0, 3) : words.first;
  final s = words.map((w) => w.substring(0, 1).toUpperCase()).join();
  return s.length > 4 ? s.substring(0, 4) : s;
}

/// БҮТ-ийн дарааллаар, жагсаалтад байхгүй нэр төгсгөлд.
List<String> orderedAreas(Iterable<String> names) {
  final list = names.toList();
  return [
    for (final a in kContentAreas)
      if (list.contains(a)) a,
    for (final n in list)
      if (!kContentAreas.contains(n)) n,
  ];
}

/// Хамгийн их алдсан 10 бодлого (хувь өсөхөөр, дараа нь дугаараар).
List<ItemStat> hardestItems(List<ItemStat> items, {int take = 10}) {
  final list = items.where((s) => s.pct != null).toList()
    ..sort((a, b) {
      final d = (a.pct ?? 0).compareTo(b.pct ?? 0);
      return d != 0 ? d : a.number.compareTo(b.number);
    });
  return list.take(take).toList();
}

/// Алдсан бодлогуудад хамаарах томьёо: томьёо → бодлогын дугаарууд (олон бодлогод орсон нь эхэнд).
List<({FormulaRef formula, List<int> numbers})> reviewFormulas(
  Iterable<({int number, List<String> slugs, bool missed})> items,
  List<FormulaRef> formulas,
) {
  final need = <String, List<int>>{};
  for (final it in items) {
    if (!it.missed) continue;
    for (final s in it.slugs) {
      (need[s] ??= []).add(it.number);
    }
  }
  final by = {for (final f in formulas) f.slug: f};
  final out = [
    for (final e in need.entries)
      if (by[e.key] != null) (formula: by[e.key]!, numbers: e.value),
  ];
  // Тогтвортой эрэмбэ: олон бодлоготой нь эхэнд, тэнцвэл анхны дараалал
  final indexed = out.asMap().entries.toList()
    ..sort((a, b) {
      final d = b.value.numbers.length.compareTo(a.value.numbers.length);
      return d != 0 ? d : a.key.compareTo(b.key);
    });
  return [for (final e in indexed) e.value];
}

/// Сурагчийн алдсан бодлогыг ангиллаар бүлэглэнэ: сэдэв — шалгалтын дарааллаар, агуулга — БҮТ-ээр.
List<({String name, List<MyPaperItem> items})> missedGroups(List<MyPaperItem> items, ClassifyBy by) {
  final groups = <String, List<MyPaperItem>>{};
  for (final w in items.where((i) => i.status.missed)) {
    final k = (by == ClassifyBy.topic ? w.topic : w.area) ?? '${by.one} оноогоогүй';
    (groups[k] ??= []).add(w);
  }
  final names = by == ClassifyBy.topic ? groups.keys.toList() : orderedAreas(groups.keys);
  return [for (final n in names) (name: n, items: groups[n]!)];
}

/// Багийн хүснэгтийн хайлт: нэр, шифрээр бүх багаас.
List<BoardRow> searchRows(List<BoardGroup> groups, String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return const [];
  return [
    for (final g in groups)
      for (final r in g.rows)
        if ('${r.lastName} ${r.firstName} ${r.code}'.toLowerCase().contains(q)) r,
  ];
}

/// Ажилтны харагдацад нэг сурагчийн нэгдсэн шалгалтууд — шалгалт бүрийн хүснэгтээс тэр сурагчийн мөрийг
/// олно (сервер эрхээр шүүсэн: Багш өөрийн ангийнхаа сурагчийг л харна).
List<MyPaperExam> studentRowsFromBoards(String studentId, Iterable<PaperBoard> boards) => [
  for (final b in boards)
    for (final g in b.groups)
      for (final r in g.rows)
        if (r.studentId == studentId)
          MyPaperExam(
            id: b.id,
            title: b.title,
            heldOn: b.heldOn,
            totalScore: r.totalScore,
            maxScore: r.maxScore,
            pct: r.pct,
            rank: r.rank,
            group: g.label,
            sheetId: r.sheetId,
          ),
];
