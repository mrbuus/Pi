import 'package:flutter/services.dart';

/// LaTeX бичих туслах товчнууд — түүхий талбарт курсорын байрлалд оруулна.
///
/// [insert]-ийн `|` нь оруулсны дараах курсорын байр (хаалтан дотор). Товчны дүрсийг [preview]
/// LaTeX-ээр (MathText) зурна — пи, квадрат, үржих цэг зэргийг глифээр UI-д хэзээ ч бичихгүй (RULES §4).
class LatexSnippet {
  const LatexSnippet(this.preview, this.insert, this.semantics);

  /// Товчны дүрс (`$...$` дотор зурна).
  final String preview;

  /// Оруулах бичвэр, `|` — курсор.
  final String insert;

  /// Дэлгэц уншигчид.
  final String semantics;
}

/// Хамгийн их хэрэглэгддэг тэмдэглэгээ. Үржих тэмдэг ЗӨВХӨН `\cdot`.
const latexSnippets = <LatexSnippet>[
  LatexSnippet(r'\$x\$', r'$|$', 'Томьёо'),
  LatexSnippet(r'\frac{a}{b}', r'\frac{|}{}', 'Бутархай'),
  LatexSnippet(r'\sqrt{x}', r'\sqrt{|}', 'Язгуур'),
  LatexSnippet(r'x^{n}', r'^{|}', 'Зэрэг'),
  LatexSnippet(r'x_{n}', r'_{|}', 'Доод индекс'),
  LatexSnippet(r'a\cdot b', r'\cdot |', 'Үржих'),
  LatexSnippet(r'\pi', r'\pi |', 'Пи'),
  LatexSnippet(r'\le', r'\le |', 'Бага буюу тэнцүү'),
  LatexSnippet(r'\ge', r'\ge |', 'Их буюу тэнцүү'),
  LatexSnippet(r'\ne', r'\ne |', 'Тэнцүү биш'),
  LatexSnippet(r'\left(x\right)', r'\left(|\right)', 'Хаалт'),
  LatexSnippet(r'x^{\circ}', r'^{\circ}|', 'Градус'),
  LatexSnippet(r'\infty', r'\infty |', 'Хязгааргүй'),
  LatexSnippet(r'\log_{a}x', r'\log_{|}', 'Логарифм'),
  LatexSnippet(r'\sin x', r'\sin |', 'Синус'),
  LatexSnippet(r'\cos x', r'\cos |', 'Косинус'),
  LatexSnippet(r'\angle', r'\angle |', 'Өнцөг'),
  LatexSnippet(r'\triangle', r'\triangle |', 'Гурвалжин'),
];

/// [snippet]-ийг [value]-ийн сонголтын оронд оруулна. Сонгосон бичвэр байвал эхний хоосон хаалтанд
/// (`|`-ийн байр) орно — жишээ нь `2x` сонгоод «Язгуур» дарвал `\sqrt{2x}`.
TextEditingValue insertSnippet(TextEditingValue value, String snippet) {
  final text = value.text;
  final sel = value.selection;
  final start = sel.isValid ? sel.start.clamp(0, text.length) : text.length;
  final end = sel.isValid ? sel.end.clamp(0, text.length) : text.length;
  final selected = text.substring(start, end);
  final caret = snippet.indexOf('|');
  final before = caret < 0 ? snippet : snippet.substring(0, caret);
  final after = caret < 0 ? '' : snippet.substring(caret + 1);
  final inserted = '$before$selected$after';
  final next = text.replaceRange(start, end, inserted);
  final offset = start + before.length + selected.length;
  return TextEditingValue(
    text: next,
    selection: TextSelection.collapsed(offset: offset),
  );
}

/// Томьёоны гарнаас ирсэн LaTeX-ийг `$...$`-д ороож оруулна.
TextEditingValue insertFormula(TextEditingValue value, String latex) => insertSnippet(value, '\$${latex.trim()}\$|');

/// Том хар цэг (U+2022), `\bullet`, дунд цэг (U+00B7, U+22C5) → `\cdot` (эзний дүрэм: үржих тэмдэг зөвхөн `\cdot`).
/// Гараас буулгасан (paste) бичвэрийг хадгалахын өмнө цэвэрлэнэ.
String normalizeMultiplication(String s) => s
    .replaceAll(r'\bullet', r'\cdot')
    .replaceAll('\u2022', r'\cdot ')
    .replaceAll('\u00B7', r'\cdot ')
    .replaceAll('\u22C5', r'\cdot ');
