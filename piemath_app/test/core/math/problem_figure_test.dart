import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/problem_figure.dart';
import 'package:piemath_app/core/ui/skeleton.dart';
import 'package:piemath_app/core/ui/strings.dart';

import '../../helpers/pump.dart';
import 'math_test_helpers.dart';

void main() {
  testWidgets('зураггүй бол зөвхөн бичвэр', (tester) async {
    await pumpThemed(tester, const ProblemFigure(image: null, child: Text('Нөхцөл')));
    expect(find.text('Нөхцөл'), findsOneWidget);
    expect(find.byType(RawImage), findsNothing);
  });

  testWidgets('ачаалж байхад skeleton', (tester) async {
    await pumpThemed(tester, const ProblemFigure(image: PendingImage(), child: Text('Нөхцөл')));
    expect(find.byType(SkeletonPulse), findsOneWidget);
    expect(find.text('Нөхцөл'), findsOneWidget);
  });

  testWidgets('403 — тайван тайлбар, «Дахин оролдох» байхгүй', (tester) async {
    await pumpThemed(tester, const ProblemFigure(image: FailingImage(403), child: Text('Нөхцөл')));
    await tester.pump();
    expect(find.text('Зураг одоохондоо хаалттай'), findsOneWidget);
    expect(find.text(AppStrings.retry), findsNothing);
  });

  testWidgets('бусад алдаа — «Дахин оролдох»', (tester) async {
    await pumpThemed(tester, const ProblemFigure(image: FailingImage(500), child: Text('Нөхцөл')));
    await tester.pump();
    expect(find.text('Зураг ачаалагдсангүй'), findsOneWidget);
    expect(find.text(AppStrings.retry), findsOneWidget);
    await tester.tap(find.text(AppStrings.retry));
    await tester.pump();
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  testWidgets('өөрийн 403 ангилагч', (tester) async {
    await pumpThemed(
      tester,
      ProblemFigure(
        image: const FailingImage(401),
        isForbidden: (e) => true,
        forbiddenTitle: 'Түр хүлээнэ үү',
        forbiddenMessage: 'Багш нээсний дараа',
      ),
    );
    await tester.pump();
    expect(find.text('Түр хүлээнэ үү'), findsOneWidget);
  });

  testWidgets('ачаалагдсаны дараа зураг, дарахад бүтэн дэлгэц, хаах', (tester) async {
    final bytes = (await tester.runAsync(() => makePng(120, 90)))!;
    await pumpThemed(tester, ProblemFigure(image: MemoryImage(bytes), alt: 'Гурвалжин', child: const Text('Нөхцөл')));
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 200)));
    await tester.pump();
    expect(find.byType(RawImage), findsOneWidget);
    // Утсан дээр зураг бичвэрийн ДЭЭР.
    expect(tester.getTopLeft(find.byType(RawImage)).dy, lessThan(tester.getTopLeft(find.text('Нөхцөл')).dy));

    await tester.tap(find.byType(RawImage));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byType(FigureViewer), findsOneWidget);
    expect(find.byType(InteractiveViewer), findsOneWidget);
    await tester.tap(find.byTooltip(AppStrings.close));
    await tester.pumpAndSettle();
    expect(find.byType(FigureViewer), findsNothing);
  });

  testWidgets('таблетад (≥768) зураг бичвэрийн хажууд', (tester) async {
    final bytes = (await tester.runAsync(() => makePng(120, 90)))!;
    await pumpThemed(
      tester,
      ProblemFigure(image: MemoryImage(bytes), child: const Text('Нөхцөл')),
      size: const Size(1024, 768),
    );
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 200)));
    await tester.pump();
    final img = tester.getRect(find.byType(RawImage));
    final txt = tester.getRect(find.text('Нөхцөл'));
    expect(txt.left, greaterThan(img.right));
  });

  testWidgets('өргөн зураг (≥1.6) таблетад ч бүтэн өргөнөөр, дээр', (tester) async {
    final bytes = (await tester.runAsync(() => makePng(300, 60)))!;
    await pumpThemed(
      tester,
      ProblemFigure(image: MemoryImage(bytes), child: const Text('Нөхцөл')),
      size: const Size(1024, 768),
    );
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 200)));
    await tester.pump();
    final img = tester.getRect(find.byType(RawImage));
    final txt = tester.getRect(find.text('Нөхцөл'));
    expect(txt.top, greaterThan(img.bottom));
  });

  testWidgets('stacked: нөхцөл эхэнд, тогтмол өндөртэй хүрээ', (tester) async {
    await pumpThemed(
      tester,
      const ProblemFigure(image: PendingImage(), variant: ProblemFigureVariant.stacked, child: Text('Нөхцөл')),
    );
    final skeleton = tester.getRect(find.byType(SkeletonPulse));
    expect(tester.getRect(find.text('Нөхцөл')).bottom, lessThan(skeleton.top));
  });

  testWidgets('дэлгэц уншигчид alt', (tester) async {
    await pumpThemed(tester, const ProblemFigure(image: PendingImage(), alt: 'Тойрог', child: Text('Нөхцөл')));
    expect(find.bySemanticsLabel(RegExp('Тойрог')), findsOneWidget);
  });
}
