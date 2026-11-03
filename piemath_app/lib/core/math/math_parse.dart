/// Математик бичвэрийг хэсэгт задлах цэвэр логик (I/O-гүй, Flutter-гүй).
///
/// Вэбийн `web/src/components/MathText.tsx`-ийн `parse`, `normalizeMath`,
/// `parseWithPowers`, `renderInlineText`-тэй ЯГ ижил дүрэмтэй. Вэб, апп хоёр нэг бичвэрийг
/// өөр өөрөөр задалбал сурагч хоёр өөр томьёо харна — дүрмийг өөрчилбөл хоёуланг нь зас
/// (вэбийн тест: `web/src/components/MathText.powers.test.mjs`, апп: `test/core/math/`).
library;

import 'package:flutter/foundation.dart';

/// Хэсгийн төрөл.
enum MathSegmentType {
  /// Энгийн бичвэр (мөр шилжилт хадгалагдана).
  text,

  /// `$...$` — мөр доторх томьёо.
  inline,

  /// `$$...$$` — тусдаа мөрийн томьёо.
  display,
}

/// Задалсан нэг хэсэг.
@immutable
class MathSegment {
  const MathSegment(this.type, this.value);

  const MathSegment.text(this.value) : type = MathSegmentType.text;
  const MathSegment.inline(this.value) : type = MathSegmentType.inline;
  const MathSegment.display(this.value) : type = MathSegmentType.display;

  final MathSegmentType type;
  final String value;

  bool get isMath => type != MathSegmentType.text;

  @override
  bool operator ==(Object other) => other is MathSegment && other.type == type && other.value == value;

  @override
  int get hashCode => Object.hash(type, value);

  @override
  String toString() => switch (type) {
    MathSegmentType.text => value,
    MathSegmentType.inline => '[$value]',
    MathSegmentType.display => '[[$value]]',
  };
}

/// Эхлээд `$$...$$` display, дараа нь `$...$` inline (вэбийн `parse`).
final _segmentRe = RegExp(r'\$\$([\s\S]+?)\$\$|\$([^$]+?)\$');

/// Зэргийг илрүүлэх ЦОРЫН ГАНЦ дүрэм (вэбийн `POWER_RE`):
/// caret (`x^2`, `x^{12}`, `b^-3`) эсвэл docx-оос алдагдсан (`x2`, `x 2`).
/// Кирилл үсгийг ЗОРИУДААР оруулаагүй — «функцийн 2» зэрэг болохгүй.
final _powerRe = RegExp(r'([a-zA-Z\u{1D400}-\u{1D7FF}])(?:\^\{?([+-]?\d+)\}?|\s?(\d))', unicode: true);

/// Хэмжээний тэмдэглэгээ («100x100», «200 x 200») — номын цувралын нэр, математик биш.
final _dimensionRe = RegExp(r'\d+\s*[xх]\s*\d+', caseSensitive: false);

/// Далдлах тэмдэг — Private Use Area, жинхэнэ бичвэрт хэзээ ч таарахгүй.
const _dimMark = '\uE000';
final _dimMarkRe = RegExp(_dimMark);

/// Энгийн бичвэр доторх docx-оос алдагдсан зэргийг `$x^{2}$` болгоно (вэбийн `normalizeMath`).
/// Зөвхөн ХАРАГДАЦАД — сангийн өгөгдөл өөрчлөгдөхгүй.
String normalizePowers(String text) {
  final dims = <String>[];
  final masked = text.replaceAllMapped(_dimensionRe, (m) {
    dims.add(m.group(0)!);
    return _dimMark;
  });
  final powered = masked.replaceAllMapped(_powerRe, (m) => '\$${m.group(1)}^{${m.group(2) ?? m.group(3) ?? ''}}\$');
  var i = 0;
  return powered.replaceAllMapped(_dimMarkRe, (_) => i < dims.length ? dims[i++] : '');
}

/// `$`-аар хуваах нэг шат (вэбийн `parse`).
List<MathSegment> parseDollars(String input) {
  final segments = <MathSegment>[];
  var last = 0;
  for (final m in _segmentRe.allMatches(input)) {
    if (m.start > last) segments.add(MathSegment.text(input.substring(last, m.start)));
    final display = m.group(1);
    segments.add(display != null ? MathSegment.display(display) : MathSegment.inline(m.group(2)!));
    last = m.end;
  }
  if (last < input.length) segments.add(MathSegment.text(input.substring(last)));
  return segments;
}

/// ХОЁР ШАТТАЙ задлалт (вэбийн `parseWithPowers`): аль хэдийн `$…$`-д бичигдсэн LaTeX-ийг
/// ялгаад, үлдсэн энгийн бичвэрт л зэргийн нормчлол хийнэ (хэдийн зөв LaTeX эвдэрэхгүй).
List<MathSegment> splitMath(String input) {
  final out = <MathSegment>[];
  for (final seg in parseDollars(input)) {
    if (seg.type != MathSegmentType.text) {
      out.add(seg);
      continue;
    }
    final fixed = normalizePowers(seg.value);
    if (fixed == seg.value) {
      out.add(seg);
    } else {
      out.addAll(parseDollars(fixed));
    }
  }
  return out;
}

/// Энгийн бичвэрийн тод хэсэг.
@immutable
class TextRun {
  const TextRun(this.text, {this.bold = false});

  final String text;
  final bool bold;

  @override
  bool operator ==(Object other) => other is TextRun && other.text == text && other.bold == bold;

  @override
  int get hashCode => Object.hash(text, bold);

  @override
  String toString() => bold ? '**$text**' : text;
}

final _boldRe = RegExp(r'\*\*([^*\n]+?)\*\*');

/// Markdown тод бичгийг (`**I.**`) тод хэсэг болгоно; хосгүй үлдсэн `**` арилна
/// (вэбийн `renderInlineText`).
List<TextRun> splitBold(String text) {
  if (!text.contains('**')) return [TextRun(text)];
  final out = <TextRun>[];
  var last = 0;
  for (final m in _boldRe.allMatches(text)) {
    if (m.start > last) {
      final plain = text.substring(last, m.start).replaceAll('**', '');
      if (plain.isNotEmpty) out.add(TextRun(plain));
    }
    out.add(TextRun(m.group(1)!, bold: true));
    last = m.end;
  }
  if (last < text.length) {
    final plain = text.substring(last).replaceAll('**', '');
    if (plain.isNotEmpty) out.add(TextRun(plain));
  }
  return out;
}

/// Дэлгэц уншигчид зориулсан ойролцоо унших хувилбар (`\frac{a}{b}` → «a / b»).
/// Вэб MathML гаргадаг; апп-д энэ энгийн хөрвүүлэлт л (нарийн биш).
String speakableTex(String tex) {
  var s = tex;
  final frac = RegExp(r'\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}');
  for (var i = 0; i < 4 && frac.hasMatch(s); i++) {
    s = s.replaceAllMapped(frac, (m) => '${m.group(1)} / ${m.group(2)}');
  }
  const words = {
    'cdot': ' үржих ',
    'times': ' үржих ',
    'le': ' бага буюу тэнцүү ',
    'leq': ' бага буюу тэнцүү ',
    'ge': ' их буюу тэнцүү ',
    'geq': ' их буюу тэнцүү ',
    'ne': ' тэнцүү биш ',
    'neq': ' тэнцүү биш ',
    'pi': ' пи ',
    'infty': ' хязгааргүй ',
  };
  s = s
      .replaceAllMapped(RegExp(r'\\sqrt\{([^{}]*)\}'), (m) => 'язгуур ${m.group(1)}')
      .replaceAll(RegExp(r'\\(left|right|displaystyle|textstyle|mathrm|operatorname|text)\b'), '')
      .replaceAllMapped(RegExp(r'\\([a-zA-Z]+)'), (m) => words[m.group(1)] ?? m.group(1)!)
      .replaceAll(RegExp(r'[{}\\]'), '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  return s;
}
