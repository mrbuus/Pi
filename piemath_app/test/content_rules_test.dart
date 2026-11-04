// Эзний дүрмийг эх кодноос автоматаар шалгана (RULES.md §1, §3, §4).
import 'package:flutter_test/flutter_test.dart';

import 'rules/source_scan.dart';

/// Emoji ба хориотой unicode глиф. Математик тэмдэгт нь LaTeX-ээр л (MathText).
final _forbiddenGlyph = RegExp(
  '[·•π²³⅓⅔√×−≤≥≠∞]'
  '|[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F000}-\u{1F2FF}]',
  unicode: true,
);

/// «Pimath» брэнд хэзээ ч биш. Зөвхөн техникийн хаяг (`pimath.mn`) зөвшөөрөгдөнө.
final _wrongBrand = RegExp(r'pimath(?!\.mn)', caseSensitive: false);

void main() {
  final sources = readSources(['lib']);

  test('emoji, хориотой глиф (·, •, π, ², √ …) lib/-д байхгүй', () {
    final hits = <String>[];
    for (final file in sources) {
      for (final (n, line) in file.lines) {
        if (_forbiddenGlyph.hasMatch(line)) hits.add('${file.path}:$n  $line'.trim());
      }
    }
    expect(hits, isEmpty, reason: hits.join('\n'));
  });

  test('«Pimath» брэнд lib/-д байхгүй (зөвхөн pimath.mn хаяг)', () {
    final hits = <String>[];
    for (final file in sources) {
      for (final (n, line) in file.lines) {
        if (_wrongBrand.hasMatch(line)) hits.add('${file.path}:$n  $line'.trim());
      }
    }
    expect(hits, isEmpty, reason: hits.join('\n'));
  });

  test('өнгийг дизайны токеноос гадуур шууд бичихгүй', () {
    // Color(0x...) зөвхөн lib/core/ui/tokens.dart-д.
    final hex = RegExp(r'Color\(0x[0-9A-Fa-f]{8}\)|(?<![A-Za-z])Colors\.(?!transparent\b)\w+');
    final hits = <String>[];
    for (final file in sources) {
      if (file.path.endsWith('lib/core/ui/tokens.dart')) continue;
      for (final (n, line) in file.lines) {
        if (hex.hasMatch(line)) hits.add('${file.path}:$n  $line'.trim());
      }
    }
    expect(hits, isEmpty, reason: hits.join('\n'));
  });
}
