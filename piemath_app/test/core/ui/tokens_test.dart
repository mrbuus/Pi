import 'dart:math' as math;

import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/tokens.dart';

/// WCAG 2.x харьцангуй гэрэлтэлт.
double _luminance(Color c) {
  double ch(double v) => v <= 0.03928 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

double contrast(Color a, Color b) {
  final la = _luminance(a), lb = _luminance(b);
  final hi = math.max(la, lb), lo = math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

void main() {
  for (final (name, c) in [('цагаан', AppColors.light), ('хар', AppColors.dark)]) {
    group('$name горимын контраст (WCAG AA ≥ 4.5)', () {
      final text = {
        'ink': c.ink,
        'inkDim': c.inkDim,
        'brand': c.brand,
        'success': c.success,
        'warning': c.warning,
        'error': c.error,
        'info': c.info,
        'teal': c.teal,
        'violet': c.violet,
      };
      for (final bgName in ['surface', 'bg']) {
        final bg = bgName == 'surface' ? c.surface : c.bg;
        for (final e in text.entries) {
          test('${e.key} / $bgName', () {
            expect(contrast(e.value, bg), greaterThanOrEqualTo(4.5),
                reason: '${e.key} ${contrast(e.value, bg).toStringAsFixed(2)}');
          });
        }
      }
      test('onBrand / brand', () => expect(contrast(c.onBrand, c.brand), greaterThanOrEqualTo(4.5)));
      test('brand / brandTint (сонгогдсон таб)', () => expect(contrast(c.brand, c.brandTint), greaterThanOrEqualTo(4.5)));
      test('onStatus / error', () => expect(contrast(c.onStatus, c.error), greaterThanOrEqualTo(4.5)));
      for (final hue in AppHue.values) {
        test('${hue.name} / өөрийн хавтан (дүрсний хавтан, шошго)', () {
          final r = contrast(hue.fg(c), hue.tint(c));
          expect(r, greaterThanOrEqualTo(4.5), reason: '${hue.name} ${r.toStringAsFixed(2)}');
        });
      }
      test('surface / ink (snackbar, офлайн тууз)', () => expect(contrast(c.surface, c.ink), greaterThanOrEqualTo(4.5)));
    });
  }

  test('шар/алтан өнгө токенд байхгүй (hue 40-65°, ханалт өндөр)', () {
    for (final c in [AppColors.light, AppColors.dark]) {
      for (final color in [
        c.brand, c.brandBright, c.brandSoft, c.warning, c.success, c.info, c.error, c.teal, c.violet,
        for (final h in AppHue.values) h.tint(c),
      ]) {
        final hsv = HSVColor.fromColor(color);
        final yellowish = hsv.hue >= 40 && hsv.hue <= 65 && hsv.saturation > 0.4;
        expect(yellowish, isFalse, reason: '$color шар/алтан');
      }
    }
  });
}
