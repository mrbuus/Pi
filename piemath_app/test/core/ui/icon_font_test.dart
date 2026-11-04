import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/icons.dart';

/// Lucide фонт нь зөвхөн апп-д хэрэглэсэн глифтэй (tool/icon_font/build_icon_font.py).
/// Шинэ `LucideIcons.x` нэмээд скриптийг дахин ажиллуулаагүй бол энэ тест унана (дүрс хайрцаг болно).
void main() {
  test('lib/ дотор хэрэглэсэн Lucide дүрс бүр subset фонтод бий', () {
    final glyphs = jsonDecode(
      File('tool/icon_font/lucide_icons_flutter/assets/glyphs.json').readAsStringSync(),
    ) as Map<String, dynamic>;
    final names = (glyphs['names'] as List<dynamic>).cast<String>().toSet();
    final used = <String>{};
    final re = RegExp(r'\bLucideIcons\.(\w+)');
    for (final f in Directory('lib').listSync(recursive: true).whereType<File>()) {
      if (!f.path.endsWith('.dart')) continue;
      used.addAll(re.allMatches(f.readAsStringSync()).map((m) => m.group(1)!));
    }
    final missing = used.difference(names).toList()..sort();
    expect(missing, isEmpty, reason: 'python3 tool/icon_font/build_icon_font.py ажиллуул');
  });

  test('AppIcons-ийн codepoint subset фонтод бий', () {
    final glyphs = jsonDecode(
      File('tool/icon_font/lucide_icons_flutter/assets/glyphs.json').readAsStringSync(),
    ) as Map<String, dynamic>;
    final cps = (glyphs['codepoints'] as List<dynamic>).cast<int>().toSet();
    for (final icon in [AppIcons.home, AppIcons.back, AppIcons.check, AppIcons.more]) {
      expect(cps, contains(icon.codePoint));
      expect(icon.fontFamily, 'Lucide');
      expect(icon.fontPackage, 'lucide_icons_flutter');
    }
  });
}
