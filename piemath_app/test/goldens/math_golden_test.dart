@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/core/ui/ui.dart';

import '../core/math/math_test_helpers.dart';
import '../helpers/fonts.dart';
import '../helpers/pump.dart';

/// Репод байгаа ЖИНХЭНЭ контентоос (100x100 V3, 200x200 V3, томьёоны сан, V2 засвар).
const _samples = <String>[
  r'$0.(3)$ үет бутархайг энгийн бутархай болго.',
  r'$\frac{dy}{dx} = 2$ дифференциал тэгшитгэлийн ерөнхий шийдийг ол.',
  r'$y > 2x - 1$ тэнцэтгэл бишийн графикийг дүрсэл.',
  r'$KL\bot LM$ ба $KL = 50$ км бол хоёр тээврийн хэрэгслийн хоорондох зай хамгийн багадаа хэд байх вэ?',
  r'$\sin200^\circ$-ын тэмдгийг тогтоо. $180^\circ<200^\circ<270^\circ$ тул гуравдугаар мөч.',
  r'$$\lim_{x\to a}\frac{(x-a)g(x)}{(x-a)h(x)}=\frac{g(a)}{h(a)}$$',
  r'$$\begin{array}{c|rrrr}&I&II&III&IV\\\sin&+&+&-&-\\\cos&+&-&-&+\\\operatorname{tg},\operatorname{ctg}&+&-&+&-\end{array}$$',
  r'$$\begin{cases}x+y=5\\x-y=1\end{cases}\Rightarrow x=3,\ y=2$$',
  r'$$\int_0^1 x^2\,dx=\frac{1}{3},\qquad \sqrt[3]{27}=3,\qquad \overarc{AB}$$',
  r'**I.** Хэрэв $a^{f(x)}=a^{g(x)}$ бол $f(x)=g(x)$, $a>0$, $a\ne1$.',
  r'x2 + y2 = z2 (docx-оос алдагдсан зэрэг), 100x100 ном хэвээр.',
  r'Алдаатай томьёо: $\frac{1}{$ гэвч апп унахгүй.',
];

class _Sheet extends StatelessWidget {
  const _Sheet();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpace.gutter),
      itemCount: _samples.length,
      separatorBuilder: (context, i) => const SizedBox(height: AppSpace.md),
      itemBuilder: (context, i) => DefaultTextStyle.merge(
        style: context.text.bodyLarge,
        child: MathText(_samples[i]),
      ),
    );
  }
}

List<ChoiceItem> _letters(List<String> texts, {int? correct}) => [
      for (var i = 0; i < texts.length; i++)
        ChoiceItem(label: String.fromCharCode(65 + i), text: texts[i], isCorrect: i == correct),
    ];

class _Choices extends StatelessWidget {
  const _Choices();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        const SectionHeader(title: 'Сонгосон хариу', padding: EdgeInsets.only(bottom: AppSpace.sm)),
        ChoiceGrid(choices: _letters(['4', '0.25', '16', '6', '3']), selectedIndex: 2, onSelect: (_) {}),
        const SectionHeader(title: '3 + 2'),
        ChoiceGrid(
          choices: _letters([
            r'$\frac{3}{10}$',
            r'$\frac{1}{6}$',
            r'$\frac{2}{3}$',
            r'$\frac{1}{3}$',
            r'$\frac{4}{9}$',
          ]),
          onSelect: (_) {},
        ),
        const SectionHeader(title: 'Мөр бүрт нэг'),
        ChoiceGrid(
          choices: _letters([
            r'$y = x^{2} + C$ ерөнхий шийд',
            r'$y = 2x + C$ ерөнхий шийд',
            r'$y = 2$ тогтмол функц',
            r'$y = x + C$ шулуун шугам',
            r'$y = \frac{x}{2} + C$ шулуун',
          ]),
          selectedIndex: 1,
          onSelect: (_) {},
        ),
        const SectionHeader(title: 'Нягт, багшид зөв хариу'),
        ChoiceGrid(
          choices: _letters([r'$15\sqrt{2}$ км', r'$10\sqrt{5}$ км', r'$5\sqrt{10}$ км', '10 км', r'$20\sqrt{5}$ км'], correct: 1),
          showCorrect: true,
          variant: ChoiceGridVariant.compact,
        ),
      ],
    );
  }
}

void main() {
  setUpAll(() async {
    await loadAppFonts();
    await loadKatexFonts();
  });

  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';

    testWidgets('томьёоны хуудас ($mode)', (tester) async {
      await pumpThemed(tester, const _Sheet(), dark: dark, size: const Size(390, 1250));
      await tester.pumpAndSettle();
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('math_sheet_$mode.png'));
    });

    testWidgets('хариултын байрлал ($mode)', (tester) async {
      await pumpThemed(tester, const _Choices(), dark: dark, size: const Size(390, 1000));
      await tester.pumpAndSettle();
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('math_choices_$mode.png'));
    });
  }

  testWidgets('бодлогын зураг: 403 ба ачаалагдсан (light)', (tester) async {
    final bytes = (await tester.runAsync(() => makePng(240, 160)))!;
    await pumpThemed(
      tester,
      ListView(
        padding: const EdgeInsets.all(AppSpace.gutter),
        children: [
          ProblemFigure(
            image: MemoryImage(bytes),
            child: const MathText(r'Зурагт $\angle ABC = 90^\circ$, $AB = 3$, $BC = 4$ бол $AC$-г ол.'),
          ),
          const SizedBox(height: AppSpace.xl),
          const ProblemFigure(image: FailingImage(403), child: MathText(r'Шалгалтын бодлого $x^2=9$')),
        ],
      ),
      size: const Size(390, 900),
    );
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 200)));
    await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('math_figure_light.png'));
  });
}
