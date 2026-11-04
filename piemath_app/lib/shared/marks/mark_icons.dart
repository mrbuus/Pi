import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Ирц, даалгаврын тэмдэглэгээний дүрс — вэбийн `components/attendance/marks.tsx`-тэй ЯГ ижил
/// SVG (Lucide-ийн хүн/дэвтэр суурь, зураас 2). Ирц = нэг хүн + журналын тэмдэг,
/// даалгавар = нэг дэвтэр + тэмдэг. Эзний шийдвэр 2026-10-18.
enum MarkGlyph {
  /// Хүн + зөв тэмдэг.
  attPresent,

  /// Хүн + «Х» (журналын тэмдэг).
  attLate,

  /// Хүн + бүдүүн цэг.
  attAbsent,

  /// Хүн + «Ч».
  attExcused,

  /// Дэвтэр + зөв тэмдэг.
  hwDone,

  /// Дэвтэр + хагас будсан тойрог.
  hwPartial,

  /// Дэвтэр + загалмай.
  hwMissing,

  /// Дэвтэр + дээш сум (зураг илгээсэн).
  hwSent,

  /// Тэмдэглээгүй — хэвтээ зураас.
  none,
}

const _person = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>';
const _book = '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>';

String _body(MarkGlyph g) => switch (g) {
      MarkGlyph.attPresent => '$_person<path d="m16 11 2 2 4-4"/>',
      MarkGlyph.attLate => '$_person<path d="m17 8 5 6M22 8l-5 6"/>',
      MarkGlyph.attAbsent => '$_person<circle cx="19.5" cy="11" r="2.75" fill="#000"/>',
      MarkGlyph.attExcused => '$_person<path d="M17 8v2.2a1.8 1.8 0 0 0 1.8 1.8H22M22 8v6"/>',
      MarkGlyph.hwDone => '$_book<path d="m9 9.5 2 2 4-4"/>',
      MarkGlyph.hwPartial =>
        '$_book<circle cx="12" cy="9.5" r="3.25"/><path d="M12 6.25a3.25 3.25 0 0 1 0 6.5z" fill="#000" stroke="none"/>',
      MarkGlyph.hwMissing => '$_book<path d="m14.5 7-5 5M9.5 7l5 5"/>',
      MarkGlyph.hwSent => '$_book<path d="M12 13V6.5M9 9.5l3-3 3 3"/>',
      MarkGlyph.none => '<path d="M5 12h14"/>',
    };

/// SVG мөр (өнгө нь `ColorFilter`-ээр солигдоно — бүх зураас/дүүргэлт хар).
String markSvg(MarkGlyph g) =>
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${_body(g)}</svg>';

/// Тэмдэглэгээний дүрс. Дэлгэц уншигчид юу ч уншихгүй — утгыг дагалдах бичвэр (эсвэл
/// эцгийн Semantics) хэлнэ (өнгө, дүрс дангаараа утга илэрхийлэхгүй).
class MarkIcon extends StatelessWidget {
  const MarkIcon(this.glyph, {super.key, required this.color, this.size = 18});

  final MarkGlyph glyph;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SvgPicture.string(
        markSvg(glyph),
        width: size,
        height: size,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      ),
    );
  }
}
