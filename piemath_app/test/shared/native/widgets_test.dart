import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/pump.dart';

void main() {
  group('StatTile, StatRow', () {
    testWidgets('дарахад дэлгэрэнгүй, утга, тайлбар', (tester) async {
      var taps = 0;
      await pumpThemed(
        tester,
        Padding(
          padding: const EdgeInsets.all(16),
          child: StatRow(
            tiles: [
              StatTile(label: 'Сурагч', value: '128', hint: '+4', onTap: () => taps++),
              const StatTile(label: 'Өртэй', value: '12', tone: ChipTone.warning, icon: AppIcons.warning),
              const StatTile(label: 'Ирц', value: '94%'),
            ],
          ),
        ),
      );
      expect(find.text('128'), findsOneWidget);
      expect(find.text('+4'), findsOneWidget);
      await tester.tap(find.text('Сурагч'));
      expect(taps, 1);
      // 3 нь нэг мөрөнд, ижил өндөртэй.
      final a = tester.getRect(find.ancestor(of: find.text('128'), matching: find.byType(AppCard)));
      final b = tester.getRect(find.ancestor(of: find.text('94%'), matching: find.byType(AppCard)));
      expect(a.top, b.top);
      expect(a.height, b.height);
    });

    testWidgets('нарийн дэлгэцэд 4 тоо 2x2', (tester) async {
      await pumpThemed(
        tester,
        const StatRow(
          tiles: [
            StatTile(label: 'А', value: '1'),
            StatTile(label: 'Б', value: '2'),
            StatTile(label: 'В', value: '3'),
            StatTile(label: 'Г', value: '4'),
          ],
        ),
        size: const Size(320, 640),
      );
      final one = tester.getTopLeft(find.text('1'));
      final two = tester.getTopLeft(find.text('2'));
      final three = tester.getTopLeft(find.text('3'));
      expect(one.dy, two.dy);
      expect(three.dy, greaterThan(one.dy));
      expect(three.dx, one.dx);
    });
  });

  group('DetailHeader', () {
    test('нэрийн эхний үсэг', () {
      expect(DetailAvatar.initialsOf('Бат-Эрдэнэ Болд'), 'ББ');
      expect(DetailAvatar.initialsOf('  өлзий  '), 'Ө');
      expect(DetailAvatar.initialsOf(''), '');
    });

    testWidgets('гарчиг, мета, чип, үйлдлүүд', (tester) async {
      final pressed = <String>[];
      await pumpThemed(
        tester,
        DetailHeader(
          title: 'Болд Бат',
          subtitle: const ['9А анги', null, '99000000'],
          avatar: const DetailAvatar(initials: 'ББ'),
          chips: const [MetaChip(label: 'Төлсөн', icon: AppIcons.success, tone: ChipTone.success)],
          primary: DetailAction(label: 'Залгах', icon: AppIcons.phone, onPressed: () => pressed.add('call')),
          secondary: [
            DetailAction(label: 'Засах', onPressed: () => pressed.add('edit')),
            DetailAction(label: 'Архивлах', destructive: true, onPressed: () => pressed.add('archive')),
          ],
        ),
      );
      expect(find.text('Болд Бат'), findsOneWidget);
      expect(find.text('ББ'), findsOneWidget);
      expect(find.text('9А анги'), findsOneWidget);
      expect(find.byType(Dot), findsOneWidget);
      expect(find.text('Төлсөн'), findsOneWidget);
      await tester.tap(find.text('Залгах'));
      await tester.tap(find.text('Засах'));
      await tester.tap(find.text('Архивлах'));
      expect(pressed, ['call', 'edit', 'archive']);
      for (final label in ['Залгах', 'Засах', 'Архивлах']) {
        final size = tester.getSize(
          find.ancestor(of: find.text(label), matching: find.byWidgetPredicate((w) => w is ButtonStyleButton)),
        );
        expect(size.height, greaterThanOrEqualTo(AppSizes.minTap), reason: label);
      }
    });
  });

  testWidgets('ItemRow: гарчиг, мета, баруун тал', (tester) async {
    await pumpThemed(
      tester,
      const ItemRow(
        title: 'Сурагч',
        meta: ['501', '15:00'],
        trailing: MetaChip(label: 'Өртэй', tone: ChipTone.warning),
        chevron: true,
      ),
    );
    expect(find.text('501'), findsOneWidget);
    expect(find.text('Өртэй'), findsOneWidget);
    expect(find.byIcon(AppIcons.forward), findsOneWidget);
  });
}
