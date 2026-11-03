import 'package:flutter/material.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math_text.dart';
import 'package:piemath_app/core/math/tex_engine.dart';

import '../../helpers/fonts.dart';
import '../../helpers/pump.dart';
import 'math_test_helpers.dart';

void main() {
  setUpAll(() async {
    await loadAppFonts();
    await loadKatexFonts();
  });

  testWidgets('энгийн бичвэр — нэг Text, томьёогүй', (tester) async {
    await pumpThemed(tester, const MathText('Ердийн монгол өгүүлбэр'));
    expect(find.byType(Math), findsNothing);
    expect(find.text('Ердийн монгол өгүүлбэр', findRichText: true), findsOneWidget);
  });

  testWidgets('мөр доторх томьёо Math болж зурагдана', (tester) async {
    await pumpThemed(tester, const MathText(r'Хэрэв $x^2 = 4$ бол $x$-ийг ол'));
    expect(find.byType(Math), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('docx-оос алдагдсан зэрэг (x2) томьёо болно', (tester) async {
    await pumpThemed(tester, const MathText('x2 + y2 = z2'));
    expect(find.byType(Math), findsNWidgets(3));
  });

  testWidgets('display томьёо голлож, өргөн бол хэвтээ гүйлгэнэ (халихгүй)', (tester) async {
    const long =
        r'$$\frac{1}{2}+\frac{1}{3}+\frac{1}{4}+\frac{1}{5}+\frac{1}{6}+\frac{1}{7}+\frac{1}{8}+\frac{1}{9}+\frac{1}{10}+\frac{1}{11}+\frac{1}{12}+\frac{1}{13}$$';
    await pumpThemed(
      tester,
      const SizedBox(width: 200, child: MathText('Нийлбэр:\n$long\nбол')),
      size: const Size(320, 600),
    );
    expect(tester.takeException(), isNull);
    expect(find.byType(SingleChildScrollView), findsOneWidget);
    // Бичвэр — томьёо — бичвэр гурван блок.
    expect(find.byType(Column), findsWidgets);
  });

  testWidgets('урт мөр доторх томьёо нарийн дэлгэцэнд мөр шилжинэ', (tester) async {
    const src = r'Тэгшитгэл: $a+b+c+d+e+f+g+h+i+j+k+l+m+n+o+p = q+r+s+t+u+v+w$';
    await pumpThemed(
      tester,
      const Align(
        alignment: Alignment.topLeft,
        child: SizedBox(width: 160, child: MathText(src)),
      ),
    );
    expect(tester.takeException(), isNull);
    final h = tester.getSize(find.byType(MathText)).height;
    expect(h, greaterThan(60), reason: 'хэд хэдэн мөрөнд хуваагдах ёстой');
  });

  testWidgets('алдаатай LaTeX унахгүй, эхийг харуулна', (tester) async {
    await pumpThemed(tester, const MathText(r'Энд $\frac{1}{$ алдаа'));
    expect(tester.takeException(), isNull);
    expect(find.textContaining(r'\frac{1}{', findRichText: true), findsOneWidget);
    expect(find.textContaining('LaTeX алдаа', findRichText: true), findsNothing);
  });

  testWidgets('багшийн харагдацад «LaTeX алдаа» тэмдэг', (tester) async {
    await pumpThemed(tester, const MathText(r'$\frac{1}{$', showErrorInTeacherView: true));
    expect(find.text('LaTeX алдаа'), findsOneWidget);
  });

  testWidgets('**тод** бичвэр тод, од харагдахгүй', (tester) async {
    await pumpThemed(tester, const MathText('**I.** Бодолт'));
    expect(find.textContaining('**', findRichText: true), findsNothing);
    final rich = tester.widget<RichText>(find.byType(RichText).first);
    final spans = <TextSpan>[];
    rich.text.visitChildren((s) {
      if (s is TextSpan && s.text != null) spans.add(s);
      return true;
    });
    final bold = spans.firstWhere((s) => s.text == 'I.');
    expect(bold.style?.fontWeight, FontWeight.w700);
  });

  testWidgets('дэлгэц уншигчид томьёог уншигдах хэлбэрээр', (tester) async {
    await pumpThemed(tester, const MathText(r'Утга $\frac{1}{2}$ байна'));
    expect(find.bySemanticsLabel(RegExp(r'Утга 1 / 2 байна')), findsOneWidget);
  });

  testWidgets('томьёонд наалдсан үг томьёотой нэг хэсэгт (мөрийн төгсгөлд тасрахгүй)', (tester) async {
    await pumpThemed(tester, const MathText(r'Утга ($x$-ийн) тэнцүү'));
    final row = find.ancestor(of: find.byType(Math), matching: find.byType(Row));
    expect(row, findsOneWidget);
    expect(find.descendant(of: row, matching: find.text('(')), findsOneWidget);
    expect(find.descendant(of: row, matching: find.text('-ийн)')), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp(r'Утга \( ?x ?-ийн\) тэнцүү')), findsOneWidget);
  });

  testWidgets('урт наалдсан үг (12-оос урт) томьёонд наалдахгүй', (tester) async {
    await pumpThemed(tester, const MathText(r'$x$-тэйгээрээзүйлсийнхээ утга'));
    expect(find.ancestor(of: find.byType(Math), matching: find.byType(Row)), findsNothing);
  });

  testWidgets('ижил томьёо дэлгэцэд олон удаа — тус бүр өөр мод (GlobalKey давхцахгүй)', (tester) async {
    TexEngine.clearCache();
    await pumpThemed(tester, const Column(children: [MathText(r'$x^{2}$'), MathText(r'$x^{2}$ ба $x^{2}$')]));
    expect(tester.takeException(), isNull);
    expect(find.byType(Math), findsNWidgets(3));
    // Widget устахад мод санд буцна, дараагийнх нь дахин ашиглана.
    await pumpThemed(tester, const SizedBox());
    expect(TexEngine.pooledCount, 3);
    await pumpThemed(tester, const MathText(r'$x^{2}$'));
    expect(TexEngine.pooledCount, 2);
  });

  testWidgets('эх бичвэр өөрчлөгдөхөд хуучин модыг буцаана', (tester) async {
    TexEngine.clearCache();
    await pumpThemed(tester, const MathText(r'$a$'));
    await pumpThemed(tester, const MathText(r'$b$'));
    expect(find.byType(Math), findsOneWidget);
    expect(TexEngine.pooledCount, 1);
  });

  testWidgets('хоосон мөр юу ч зурахгүй', (tester) async {
    await pumpThemed(tester, const MathText(''));
    expect(find.byType(RichText), findsNothing);
  });

  testWidgets('хар горимд өнгө theme-ээс', (tester) async {
    await pumpThemed(tester, const MathText(r'$x$'), dark: true);
    final math = tester.widget<Math>(find.byType(Math));
    expect(math.textStyle?.color, isNotNull);
  });
}
