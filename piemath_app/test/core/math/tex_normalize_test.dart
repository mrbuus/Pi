// KaTeX-ийн дэмждэг командууд нормчлолын дараа flutter_math_fork-оор задарч, widget болж
// чадах эсэх (вэб, апп хоёр нэг томьёог харуулж чадах ёстой).
import 'package:flutter/painting.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/tex_engine.dart';
import 'package:piemath_app/core/math/tex_normalize.dart';

import 'katex_probes.dart';

/// Вэб ч дэмждэггүй, эсвэл санаатайгаар хориглосон (trust, макро) командууд.
const expectedUnsupported = <String>{
  r'\S',
  r'\P',
  r'\copyright',
  r'\euro',
  r'\above',
  r'\includegraphics{a}',
  r'\htmlClass{a}{b}',
  r'\def\x{a}\x',
  r'\let\x=a',
  r'\gdef\x{a}',
  r'\Coloneqq',
  r'\unicode{x2116}',
  r'\minuso',
  r'\parallelogram',
};

String? _render(String tex) {
  final r = TexEngine.parseUncached(tex);
  if (r.error != null) return r.error!.message;
  try {
    r.ast!.buildWidget(MathOptions(fontSize: 16, color: const Color(0xFF000000)));
  } on Object catch (e) {
    return '$e';
  }
  return null;
}

void main() {
  test('KaTeX-ийн командууд нормчлолын дараа зурагдана', () {
    final fails = <String>[];
    for (final p in katexProbes) {
      if (expectedUnsupported.contains(p)) continue;
      final err = _render(p);
      if (err != null) fails.add('$p => ${err.split('\n').first}');
    }
    expect(fails, isEmpty, reason: fails.join('\n'));
    expect(katexProbes.length, greaterThan(400));
  });

  test('хориглосон командууд алдаа хэвээр (апп-д trust/макро байхгүй)', () {
    for (final p in [r'\includegraphics{a}', r'\htmlClass{a}{b}', r'\def\x{a}\x', r'\href']) {
      expect(_render(p), isNotNull, reason: p);
    }
  });

  group('normalizeTex', () {
    test('өөрчлөх зүйлгүй бол ижил мөр', () {
      expect(normalizeTex('x+1'), 'x+1');
      expect(normalizeTex(r'\frac{1}{2}+x^{2}'), r'\frac{1}{2}+x^{2}');
      expect(normalizeTex(r'\sqrt{2}\cdot 3'), r'\sqrt{2}\cdot 3');
    });

    test('энгийн орлуулалт, урт командыг андуурахгүй', () {
      expect(normalizeTex(r'x\in\Q'), r'x\in\mathbb{Q}');
      expect(normalizeTex(r'\Cup'), r'\Cup');
      expect(normalizeTex(r'30\textdegree'), r'30{}^{\circ}');
      expect(normalizeTex(r'a\notag'), 'a');
    });

    test('нэг аргументтэй команд, үүрлэсэн хаалт', () {
      expect(normalizeTex(r'\overarc{AB}'), r'\overset{\frown}{AB}');
      expect(normalizeTex(r'\pmb{\frac{a}{b}}'), r'\boldsymbol{\frac{a}{b}}');
      expect(normalizeTex(r'\sqrt{\smash[b]{y}}'), r'\sqrt{{y}}');
      expect(normalizeTex(r'\set{x \mid x>0}'), r'\left\{x \mid x>0\right\}');
      expect(normalizeTex(r'\href{https://a.mn}{холбоос}'), '{холбоос}');
      // Хаалт дутуу бол хөндөхгүй.
      expect(normalizeTex(r'\pmb'), r'\pmb');
    });

    test('орчин', () {
      expect(normalizeTex(r'\begin{align*}a&=b\end{align*}'), r'\begin{aligned}a&=b\end{aligned}');
      expect(normalizeTex(r'\begin{gathered}a\\b\end{gathered}'), r'\begin{array}{c}a\\b\end{array}');
      expect(normalizeTex(r'\begin{equation}x\end{equation}'), 'x');
      expect(normalizeTex(r'\begin{cases}a\end{cases}'), r'\begin{cases}a\end{cases}');
    });

    test('tag, label', () {
      expect(normalizeTex(r'x=1\tag{2}'), r'x=1\qquad(\text{2})');
      expect(normalizeTex(r'x=1\label{eq}'), 'x=1');
    });

    test('тэнцвэргүй left/right (импортын алдаа)', () {
      expect(normalizeTex(r'\lbrack - 1;\infty\left\lbrack'), r'\lbrack - 1;\infty\lbrack');
      expect(normalizeTex(r'\left( x \right)'), r'\left( x \right)');
      expect(normalizeTex(r'\leftarrow\left(x'), r'\leftarrow(x');
      expect(normalizeTex(r'\left. x \right|_{0}^{1}'), r'\left. x \right|_{0}^{1}');
    });

    test('орчноос гадуурх мөр шилжилт', () {
      expect(normalizeTex(r'a\\b'), r'\begin{array}{c}a\\b\end{array}');
      expect(normalizeTex(r'\begin{cases}a\\b\end{cases}'), r'\begin{cases}a\\b\end{cases}');
      expect(normalizeTex(r'\substack{a\\b}'), r'\substack{a\\b}');
      expect(normalizeTex(r'a\newline b'), r'\begin{array}{c}a\\ b\end{array}');
      expect(normalizeTex(r'\{a\}'), r'\{a\}');
    });

    test('аргументгүй төгсгөлийн frac (контентын алдаа)', () {
      expect(normalizeTex(r'10\frac'), '10');
      expect(normalizeTex(r'\frac{1}{2}'), r'\frac{1}{2}');
    });
  });

  group('TexEngine сан (зээлэх/буцаах)', () {
    setUp(TexEngine.clearCache);

    test('буцаасан модыг дахин зээлнэ (дахин задлахгүй)', () {
      final a = TexEngine.acquire(r'\frac{1}{2}');
      TexEngine.release(a);
      final b = TexEngine.acquire(r'\frac{1}{2}');
      expect(identical(a, b), isTrue);
      expect(a.ok, isTrue);
    });

    test('зээлэгдсэн байхад ижил томьёонд ШИНЭ мод (GlobalKey давхцахгүй)', () {
      final a = TexEngine.acquire('x^{2}');
      final b = TexEngine.acquire('x^{2}');
      expect(identical(a, b), isFalse);
      TexEngine.release(a);
      TexEngine.release(b);
      expect(TexEngine.pooledCount, 2);
    });

    test('нэг томьёоны хуулбар хязгаартай', () {
      final list = [for (var i = 0; i < 10; i++) TexEngine.acquire('y')];
      list.forEach(TexEngine.release);
      expect(TexEngine.pooledCount, TexEngine.maxCopies);
    });

    test('түлхүүрийн тоо хязгаартай, хамгийн эртнийх хасагдана (LRU)', () {
      for (var i = 0; i <= TexEngine.maxEntries; i++) {
        TexEngine.release(TexEngine.acquire('x_{$i}'));
      }
      expect(TexEngine.pooledKeys, TexEngine.maxEntries);
    });

    test('алдаатай томьёо унахгүй, алдааг буцаана, хуваалцаж болно', () {
      final r = TexEngine.acquire(r'\frac{1}{');
      expect(r.ok, isFalse);
      expect(r.error, isNotNull);
      expect(r.breakParts, isEmpty);
      expect(identical(TexEngine.acquire(r'\frac{1}{'), r), isTrue);
    });

    test('урт томьёог мөр шилжих хэсгүүдэд хуваана', () {
      final r = TexEngine.acquire('a+b+c=d+e+f');
      expect(r.breakParts.length, 2);
    });

    test('богино томьёо хуваагдахгүй, харьцаагүй урт хэсэг үйлдлийн дараа хуваагдана', () {
      expect(TexEngine.acquire('2x-1').breakParts.length, 1);
      expect(TexEngine.acquire('a+b+c+d+e+f+g+h+i+j=1').breakParts.length, greaterThan(3));
    });
  });
}
