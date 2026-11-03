/// A–E хариуны байрлалын шийдвэр (цэвэр логик, тесттэй).
///
/// Эзний ТОМ дүрэм (RULES §4, вэбийн `components/library/ChoiceGrid.tsx`, 2026-10-18):
/// - нэг мөрөнд бүгд багтвал тэнцүү багана — мөрөө дүүргэж, зай нь тэнцүү;
/// - багтахгүй бол 3 + 2; түүнд ч багтахгүй бол мөр бүрт нэг;
/// - ганц хариу өнчин мөрөнд ХЭЗЭЭ Ч үлдэхгүй (2+2+1 хэлбэрийг алгасна).
library;

/// n хариуг өнчингүй хуваах баганын тоонууд (томоос нь). Вэбийн `columnOptions`-той ижил.
///
/// 5 → [5, 3, 1]; 4 → [4, 2, 1]; 6 → [6, 4, 3, 2, 1]; 3 → [3, 1]; 2 → [2, 1].
List<int> choiceColumnOptions(int n) {
  if (n <= 1) return const [1];
  final opts = <int>[n];
  for (var c = n - 1; c >= 2; c--) {
    final rem = n % c;
    if (rem == 0 || rem >= 2) opts.add(c);
  }
  opts.add(1);
  return opts.toSet().toList();
}

/// Хамгийн өргөн хариу [widest] (бүтэн нүдний өргөн), боломжит өргөн [width] үед
/// баганын тоо. Аль ч хувилбар багтахгүй бол 1.
int pickChoiceColumns({
  required int count,
  required double widest,
  required double width,
  double gap = 12,
}) {
  for (final n in choiceColumnOptions(count)) {
    if (n * widest + (n - 1) * gap <= width + 0.5) return n;
  }
  return 1;
}

/// Мөр бүрийн хариуны тоо (жишээ: 5, 3 багана → [3, 2]).
List<int> choiceRows(int count, int columns) {
  if (count <= 0) return const [];
  final c = columns.clamp(1, count);
  return [for (var i = 0; i < count; i += c) (count - i) < c ? count - i : c];
}
