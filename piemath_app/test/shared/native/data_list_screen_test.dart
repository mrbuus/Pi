import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/pump.dart';

/// Зохиомол мөр (жинхэнэ сурагч биш).
class _Row {
  const _Row(this.id, this.name, this.group);

  final String id;
  final String name;
  final String group;
}

final _all = [for (var i = 1; i <= 45; i++) _Row('r$i', 'Сурагч $i', i.isEven ? 'paid' : 'debt')];

const _filters = [DataFilter('paid', 'Төлсөн'), DataFilter('debt', 'Өртэй'), DataFilter('none', 'Чөлөөтэй')];

DataPage<_Row> _local(DataQuery q, {int pageSize = 20}) => DataPage.local(
  _all,
  q,
  matches: (r, s) => r.name.toLowerCase().contains(s),
  inFilter: (r, f) => r.group == f,
  filters: _filters,
  pageSize: pageSize,
);

Widget _list({
  required DataPageLoader<_Row> load,
  void Function(_Row)? onTap,
  Widget Function(BuildContext, _Row)? detail,
  DataListController<_Row>? controller,
  bool search = true,
  bool filters = true,
}) => DataListScreen<_Row>(
  load: load,
  controller: controller,
  itemKey: (r) => r.id,
  itemBuilder: (_, r) => ItemRow(title: r.name),
  onTap: onTap,
  detailBuilder: detail,
  searchHint: search ? 'Нэрээр хайх' : null,
  filters: filters ? _filters : const [],
  emptyTitle: 'Сурагч алга',
);

void main() {
  group('DataPage.local', () {
    test('хайлт, шүүлтүүр, тоо, хуудаслалт', () {
      final p1 = _local(const DataQuery());
      expect(p1.items, hasLength(20));
      expect(p1.nextCursor, '20');
      expect(p1.total, 45);
      expect(p1.filterCounts, {DataFilter.allId: 45, 'paid': 22, 'debt': 23, 'none': 0});
      final p3 = _local(const DataQuery(cursor: '40'));
      expect(p3.items, hasLength(5));
      expect(p3.hasMore, isFalse);
      final s = _local(const DataQuery(search: 'Сурагч 1', filter: 'paid'));
      // 1, 10–19 → тэгш нь 10, 12, 14, 16, 18
      expect(s.items.map((r) => r.id), ['r10', 'r12', 'r14', 'r16', 'r18']);
      expect(s.filterCounts[DataFilter.allId], 11);
    });
  });

  group('DataListScreen', () {
    testWidgets('хайлт 250ms debounce-тай', (tester) async {
      final queries = <DataQuery>[];
      await pumpThemed(
        tester,
        _list(
          load: (q) async {
            queries.add(q);
            return _local(q);
          },
        ),
      );
      await tester.pump();
      expect(queries, [const DataQuery()]);

      await tester.enterText(find.byType(TextField), 'Сурагч 3');
      await tester.pump(const Duration(milliseconds: 200));
      expect(queries, hasLength(1), reason: '250ms болоогүй');
      await tester.enterText(find.byType(TextField), 'Сурагч 4');
      await tester.pump(const Duration(milliseconds: 200));
      expect(queries, hasLength(1), reason: 'дахин бичихэд хугацаа шинээр');
      await tester.pump(const Duration(milliseconds: 60));
      expect(queries.last.search, 'Сурагч 4');
      expect(queries, hasLength(2));
      await tester.pump();
      expect(find.text('Сурагч 4'), findsWidgets);
      expect(find.text('Сурагч 3'), findsNothing);
    });

    testWidgets('шүүлтүүрийн чип: тоотой, 0 бол нуугдана, сонгоход ачаална', (tester) async {
      final queries = <DataQuery>[];
      await pumpThemed(
        tester,
        _list(
          load: (q) async {
            queries.add(q);
            return _local(q);
          },
        ),
      );
      await tester.pump();
      expect(find.byKey(const ValueKey('filter:*')), findsOneWidget);
      expect(find.byKey(const ValueKey('filter:paid')), findsOneWidget);
      expect(find.byKey(const ValueKey('filter:none')), findsNothing, reason: '0 тоотой чип нуугдана');
      expect(find.textContaining('22'), findsWidgets);
      expect(find.text('Нийт 45'), findsOneWidget);

      await tester.ensureVisible(find.byKey(const ValueKey('filter:debt')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('filter:debt')));
      await tester.pump();
      expect(queries.last.filter, 'debt');
      expect(find.text('Нийт 23'), findsOneWidget);
    });

    testWidgets('ачааллын skeleton → хоосон төлөв', (tester) async {
      final done = Completer<DataPage<_Row>>();
      await pumpThemed(tester, _list(load: (_) => done.future, filters: false));
      await tester.pump();
      expect(find.byType(SkeletonCard), findsWidgets);
      done.complete(const DataPage(items: []));
      await tester.pump();
      await tester.pump();
      expect(find.byType(SkeletonCard), findsNothing);
      expect(find.text('Сурагч алга'), findsOneWidget);
    });

    testWidgets('хайлтын илэрцгүй бол «Илэрц олдсонгүй»', (tester) async {
      await pumpThemed(tester, _list(load: (q) async => _local(q)));
      await tester.pump();
      await tester.enterText(find.byType(TextField), 'байхгүй нэр');
      await tester.pump(DataListScreen.defaultDebounce);
      await tester.pump();
      expect(find.text('Илэрц олдсонгүй'), findsOneWidget);
    });

    testWidgets('алдаа → «Дахин оролдох» → мөрүүд', (tester) async {
      var calls = 0;
      await pumpThemed(
        tester,
        _list(
          load: (q) async {
            calls++;
            if (calls == 1) throw const ApiError(ApiErrorKind.network, 'Интернэт холболтоо шалгана уу');
            return _local(q);
          },
        ),
      );
      await tester.pump();
      expect(find.text('Интернэт холболтоо шалгана уу'), findsOneWidget);
      await tester.tap(find.text(AppStrings.retry));
      await tester.pump();
      await tester.pump();
      expect(calls, 2);
      expect(find.text('Сурагч 1'), findsOneWidget);
    });

    testWidgets('цааш ачаалах: товчоор болон гүйлгэхэд', (tester) async {
      final cursors = <String?>[];
      await pumpThemed(
        tester,
        _list(
          load: (q) async {
            cursors.add(q.cursor);
            return _local(q, pageSize: 5);
          },
          search: false,
          filters: false,
        ),
      );
      await tester.pump();
      expect(find.text('Сурагч 5'), findsOneWidget);
      expect(find.text('Сурагч 6'), findsNothing);

      await tester.scrollUntilVisible(find.text('Цааш үзэх'), 200);
      await tester.tap(find.text('Цааш үзэх'));
      await tester.pump();
      await tester.pump();
      expect(cursors, contains('5'));
      expect(find.text('Сурагч 6'), findsOneWidget);

      // Доод хэсэгт ойртоход өөрөө.
      final before = cursors.length;
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -2000));
      await tester.pump();
      await tester.pump();
      expect(cursors.length, greaterThan(before));
    });

    testWidgets('цааш ачаалахад алдаа → дахин оролдох', (tester) async {
      var fail = true;
      await pumpThemed(
        tester,
        _list(
          load: (q) async {
            if (q.cursor != null && fail) {
              fail = false;
              throw const ApiError(ApiErrorKind.server, 'Түр саатал гарлаа');
            }
            return _local(q, pageSize: 3);
          },
          search: false,
          filters: false,
        ),
      );
      await tester.pump();
      await tester.tap(find.text('Цааш үзэх'));
      await tester.pump();
      await tester.pump();
      expect(find.text('Түр саатал гарлаа'), findsOneWidget);
      await tester.tap(find.text(AppStrings.retry));
      await tester.pump();
      await tester.pump();
      expect(find.text('Сурагч 4'), findsOneWidget);
    });

    testWidgets('утсан дээр onTap, таблетад (768-аас өргөн) баруун талд дэлгэрэнгүй', (tester) async {
      final tapped = <String>[];
      Widget build() => _list(
        load: (q) async => _local(q),
        onTap: (r) => tapped.add(r.id),
        detail: (_, r) => Text('Дэлгэрэнгүй ${r.name}'),
      );

      await pumpThemed(tester, build());
      await tester.pump();
      await tester.tap(find.text('Сурагч 2'));
      expect(tapped, ['r2']);
      expect(find.textContaining('Дэлгэрэнгүй'), findsNothing);

      await pumpThemed(tester, build(), size: const Size(1024, 768));
      await tester.pump();
      expect(find.text('Жагсаалтаас сонгоно уу'), findsOneWidget);
      await tester.tap(find.text('Сурагч 3'));
      await tester.pump();
      expect(find.text('Дэлгэрэнгүй Сурагч 3'), findsOneWidget);
      expect(tapped, ['r2'], reason: 'таблетад onTap дуудагдахгүй');
    });

    testWidgets('767 өргөнд нэг багана', (tester) async {
      await pumpThemed(
        tester,
        _list(load: (q) async => _local(q), detail: (_, r) => Text('Дэлгэрэнгүй ${r.name}')),
        size: const Size(767, 900),
      );
      await tester.pump();
      expect(find.text('Жагсаалтаас сонгоно уу'), findsNothing);
      expect(find.byType(VerticalDivider), findsNothing);
    });

    testWidgets('controller: optimistic хасах, буцааж нэмэх, шинэчлэх', (tester) async {
      final list = DataListController<_Row>();
      var loads = 0;
      await pumpThemed(
        tester,
        _list(
          controller: list,
          load: (q) async {
            loads++;
            return _local(q);
          },
          search: false,
          filters: false,
        ),
      );
      await tester.pump();
      final removed = list.removeWhere((r) => r.id == 'r1');
      await tester.pump();
      expect(removed?.index, 0);
      expect(find.text('Сурагч 1'), findsNothing);
      expect(find.text('Нийт 44'), findsOneWidget);
      list.insert(removed!.index, removed.item);
      await tester.pump();
      expect(find.text('Сурагч 1'), findsOneWidget);
      expect(find.text('Нийт 45'), findsOneWidget);
      list.updateWhere((r) => r.id == 'r2', (r) => _Row(r.id, 'Шинэ нэр', r.group));
      await tester.pump();
      expect(find.text('Шинэ нэр'), findsOneWidget);
      await list.refresh();
      await tester.pump();
      expect(loads, 2);
    });

    testWidgets('хураангуй дээр наалдана, тоо хүлээн авна', (tester) async {
      await pumpThemed(
        tester,
        DataListScreen<_Row>(
          load: (q) async => _local(q),
          itemBuilder: (_, r) => Text(r.name),
          summaryBuilder: (_, snap) => Text('Хураангуй ${snap.total}'),
        ),
      );
      await tester.pump();
      expect(find.text('Хураангуй 45'), findsOneWidget);
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -600));
      await tester.pump();
      expect(find.text('Хураангуй 45'), findsOneWidget);
      expect(tester.getTopLeft(find.text('Хураангуй 45')).dy, lessThan(40));
    });
  });
}
