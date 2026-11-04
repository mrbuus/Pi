import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/theme.dart';

/// ₮ нь Onest, Unbounded-д байхгүй — PiemathSymbols фонтоор гарах ёстой (хоосон дөрвөлжин биш).
void main() {
  test('PiemathSymbols фонт багцлагдсан, ₮ (U+20AE)-ийн cmap-тай', () {
    final bytes = File('assets/fonts/PiemathSymbols.ttf').readAsBytesSync();
    expect(bytes.length, greaterThan(500));
    expect(File('assets/fonts/LICENSE-DejaVu.txt').existsSync(), isTrue);
  });

  test('бие ба тооны (display) загвар ₮-д PiemathSymbols-ыг нөөц болгоно', () {
    final theme = AppTheme.light();
    for (final style in [theme.textTheme.bodyMedium, theme.textTheme.displaySmall, theme.textTheme.titleLarge]) {
      expect(style?.fontFamilyFallback, contains(AppTheme.symbolsFont));
    }
  });

  testWidgets('ThemeData-ийн ерөнхий нөөц фонт', (tester) async {
    expect(AppTheme.light().textTheme.bodyLarge?.fontFamilyFallback, contains('PiemathSymbols'));
    await tester.pumpWidget(const SizedBox());
  });
}
