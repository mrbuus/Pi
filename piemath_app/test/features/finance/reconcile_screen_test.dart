import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/finance/ui/reconcile_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';
import 'finance_fixtures.dart';

const _denied = 'Энэ хэсэг танд нээгдээгүй';

bool _touchedReconcile(FakeHttp h) => h.requests.any((r) => r.path.startsWith('/reconcile'));

Future<void> _tap(WidgetTester tester, Finder f, {int frames = 12}) async {
  await tester.ensureVisible(f.first);
  await tester.pump();
  await tester.tap(f.first);
  await settle(tester, frames: frames);
}

Finder _inDialog(String text) => find.descendant(of: find.byType(AlertDialog), matching: find.text(text));

void main() {
  group('эрх (Админ, finance.manage-тэй Багш+)', () {
    for (final role in ['TEACHER', 'STUDENT', 'PARENT']) {
      testWidgets('$role: хаалттай, ямар ч хүсэлтгүй', (tester) async {
        final h = FakeHttp();
        await pumpFinance(tester, const ReconcileScreen(), http: h, role: role);
        expect(find.text(_denied), findsOneWidget);
        expect(h.requests, isEmpty);
      });
    }

    testWidgets('Багш+ finance.manage-гүй: хаалттай, хуулгын API дуудахгүй', (tester) async {
      final h = reconcileHttp(
        rows: {
          'all': [rowJson()],
        },
      )..json('GET', '/staff-capabilities/me', capsWithoutFinance);
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'TEACHER_PLUS');
      expect(find.text(_denied), findsOneWidget);
      expect(_touchedReconcile(h), isFalse);
    });

    testWidgets('Багш+ эрхийн хүсэлт 403: хаалттай', (tester) async {
      final h = FakeHttp()..error('GET', '/staff-capabilities/me', 403, 'Эрхгүй');
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'TEACHER_PLUS');
      expect(find.text(_denied), findsOneWidget);
      expect(_touchedReconcile(h), isFalse);
    });

    testWidgets('Багш+ finance.manage-тэй: нээгдэнэ', (tester) async {
      final h = reconcileHttp(
        rows: {
          'all': [rowJson()],
        },
      )..json('GET', '/staff-capabilities/me', capsWithFinance);
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'TEACHER_PLUS');
      expect(find.text(_denied), findsNothing);
      expect(find.text('350,000₮'), findsOneWidget);
    });
  });

  group('товч ба жагсаалт', () {
    testWidgets('шийдвэр хүлээж буй тоо, хуулга хүртэл орсон өдөр, жагсаалтын тоо, «Бүгд» анх', (tester) async {
      final h = reconcileHttp(
        rows: {
          'all': [rowJson()],
        },
      );
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      expect(find.text('3 гүйлгээ таны шийдвэрийг хүлээж байна'), findsOneWidget);
      expect(find.textContaining('Хуулга 11/12 хүртэл орсон'), findsOneWidget);
      expect(find.text('Шийтэд хөтлөгдсөн өдөр'), findsOneWidget);
      expect(rowQueries(h).first, {'lane': 'all', 'limit': '50', 'offset': '0'});
      expect(find.byKey(const ValueKey('filter:manual')), findsOneWidget);
      // «Шийтэд хөтлөгдсөн» 0 — чип нуугдана.
      expect(find.byKey(const ValueKey('filter:sheet')), findsNothing);
      expect(find.text('Шийдэх'), findsWidgets);
      expect(h.count('GET', '/staff-capabilities/me'), 0);
    });

    testWidgets('хуулга ороогүй: тайлбар, өдрийн хэсэггүй', (tester) async {
      final h = reconcileHttp(overview: overviewJson(cursor: false, counts: const {}));
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      expect(find.text('Хуулга хараахан ороогүй'), findsWidgets);
      expect(find.byKey(const Key('sheet-through')), findsNothing);
    });

    testWidgets('мөр: илгээгч, данс, санал, утганд бичигдсэн утас тодорно, шийтийн горим', (tester) async {
      final h = reconcileHttp(
        overview: overviewJson(sheetWrite: {'url': 'x', 'demo': true}),
        rows: {
          'all': [
            rowJson(
              account: {
                'owner': 'ТЕСТИЙН ДОРЖ',
                'txCount': 4,
                'students': [kidJson(id: 'k5', name: 'Тестийн Сараа')],
              },
              suggestion: suggestionJson(hiddenPaidUp: 1, unrecorded: true),
            ),
          ],
        },
      );
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      expect(find.textContaining('Демо горим'), findsOneWidget);
      expect(find.text('99001122 Болд сургалт'), findsOneWidget);
      expect(find.text('ТЕСТИЙН БОЛД'), findsOneWidget);
      expect(find.text('Шийдэх'), findsWidgets);
      expect(find.textContaining('Жилийн төлбөрөө бүрэн төлсөн 1 хүүхдийг'), findsOneWidget);
      expect(find.textContaining('Шийтэд бүртгэгдээгүй'), findsOneWidget);
      expect(find.text('Өмнө оноосон'), findsOneWidget);
      expect(find.byKey(const ValueKey('phone-hit:99001122')), findsOneWidget);
      expect(find.byKey(const ValueKey('phone-hit:88112233')), findsNothing);
      expect(find.text('утас таарсан, нэр таарсан'), findsOneWidget);
    });

    testWidgets('нэг товшилтоор хүүхдэд оноох: нэг POST, «Бүгд»-д дахин ачаална', (tester) async {
      final h = reconcileHttp(
        rows: {
          'all': [rowJson()],
        },
      )..json('POST', '/reconcile/rows/r1/allocate', {'ok': true, 'alsoResolved': 2, 'sheetWrites': <Object>[]});
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      final before = rowQueries(h).length;
      await _tap(tester, find.byKey(const ValueKey('cand:k1')).first);
      expect(h.count('POST', '/reconcile/rows/r1/allocate'), 1);
      expect(h.requests.firstWhere((r) => r.method == 'POST').data, {
        'parts': [
          {'kind': 'TUITION', 'amount': 350000, 'studentId': 'k1'},
        ],
      });
      expect(rowQueries(h).length, greaterThan(before));
      expect(find.text('Өмнө оноосон данс, утсаар өөр 2 гүйлгээ автоматаар орлоо'), findsOneWidget);
    });

    testWidgets('шилжүүлэг: «… гэж батлах» — хүүхэдгүй; ном бол хүүхэд дээр BOOK', (tester) async {
      final h =
          reconcileHttp(
              rows: {
                'all': [
                  rowJson(
                    suggestion: suggestionJson(kind: 'TRANSFER', candidates: const []),
                  ),
                  rowJson(
                    id: 'r2',
                    suggestion: suggestionJson(kind: 'BOOK'),
                  ),
                ],
              },
            )
            ..json('POST', '/reconcile/rows/r1/allocate', {'ok': true, 'alsoResolved': 0})
            ..json('POST', '/reconcile/rows/r2/allocate', {'ok': true, 'alsoResolved': 0});
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      await _tap(tester, find.text('Данс хоорондын шилжүүлэг гэж батлах'));
      expect(h.requests.lastWhere((r) => r.method == 'POST').data, {
        'parts': [
          {'kind': 'TRANSFER', 'amount': 350000},
        ],
      });
      await _tap(
        tester,
        find.descendant(of: find.byKey(const ValueKey('row:r2')), matching: find.byKey(const ValueKey('cand:k1'))),
      );
      expect(h.requests.lastWhere((r) => r.method == 'POST').data, {
        'parts': [
          {'kind': 'BOOK', 'amount': 350000, 'studentId': 'k1'},
        ],
      });
    });

    testWidgets('буцаах: асуулт, «Болих» бол хүсэлтгүй; батлавал нэг POST, бусад жагсаалтаас хасагдана', (
      tester,
    ) async {
      final h = reconcileHttp(
        rows: {
          'all': [
            rowJson(resolvedAt: '2026-11-03T05:00:00.000Z', allocations: [allocJson()]),
          ],
        },
      )..json('POST', '/reconcile/rows/r1/undo', {'ok': true});
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      expect(find.text('Сургалтын төлбөр, гараар'), findsOneWidget);
      expect(find.text('Шинэ төлбөр'), findsOneWidget);
      await _tap(tester, find.byKey(const ValueKey('undo:r1')));
      expect(find.text('Хуваарилалтыг буцаах уу'), findsOneWidget);
      await _tap(tester, _inDialog('Болих'));
      expect(h.count('POST', '/reconcile/rows/r1/undo'), 0);
      await _tap(tester, find.byKey(const ValueKey('undo:r1')));
      await _tap(tester, _inDialog('Буцаах'));
      expect(h.count('POST', '/reconcile/rows/r1/undo'), 1);
      expect(find.text('Буцаалаа — «Шийдэх» жагсаалтад орлоо'), findsOneWidget);
    });

    testWidgets('шийтэд хөтлөгдсөн: «Шалгах» шүүлтүүр check=1, баталж чадаагүйг улаанаар', (tester) async {
      final h = reconcileHttp(
        overview: overviewJson(counts: const {'all': 5, 'sheet': 4, 'manual': 0}, sheetCheck: 1),
        rows: {
          'sheet': [rowJson(resolvedAt: 'x', inSheet: true, sheetMissing: true)],
        },
      );
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      await _tap(tester, find.byKey(const ValueKey('filter:sheet')));
      expect(find.textContaining('Шийтэд байгааг баталж чадсангүй'), findsOneWidget);
      expect(find.text('Буцааж шийдэх'), findsOneWidget);
      await _tap(tester, find.text('Шалгах (1)'));
      expect(rowQueries(h).last['check'], '1');
      expect(rowQueries(h).last['lane'], 'sheet');
    });
  });

  group('хуваарилах цонх', () {
    testWidgets('нийлбэр таарахгүй бол хадгалахгүй; хэсэг нэмэх, ном; нэг POST', (tester) async {
      final h = reconcileHttp(
        rows: {
          'all': [rowJson()],
        },
      )..json('POST', '/reconcile/rows/r1/allocate', {'ok': true, 'alsoResolved': 0});
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      await _tap(tester, find.byKey(const ValueKey('allocate:r1')));
      expect(find.text('Хуваарилах'), findsOneWidget);
      expect(find.text('Дүн таарч байна'), findsOneWidget);
      final amount = find.byWidgetPredicate((w) => w is TextField && w.decoration?.labelText == 'Дүн');
      await tester.enterText(amount.first, '300000');
      await settle(tester);
      expect(find.text('50,000₮ хуваарилагдаагүй'), findsOneWidget);
      final save = find.byKey(const Key('allocate-save'));
      expect(
        tester.widget<FilledButton>(find.descendant(of: save, matching: find.byType(FilledButton))).onPressed,
        isNull,
      );
      await _tap(tester, find.byKey(const Key('allocate-add')));
      expect(find.text('Дүн таарч байна'), findsOneWidget);
      // Шинэ хэсэг «Сургалтын төлбөр» — хүүхэдгүй тул хадгалахгүй.
      expect(find.text('Сургалтын төлбөрт хүүхэд сонгоно уу'), findsOneWidget);
      // Шинэ хэсгийг «Ном» болгоно (хүүхэд заавал биш).
      await _tap(tester, find.text('Сургалтын төлбөр').last);
      await _tap(tester, find.text('Ном').last);
      expect(find.text('Сургалтын төлбөрт хүүхэд сонгоно уу'), findsNothing);
      await _tap(tester, save);
      expect(h.count('POST', '/reconcile/rows/r1/allocate'), 1);
      expect(h.requests.lastWhere((r) => r.method == 'POST').data, {
        'parts': [
          {'kind': 'TUITION', 'amount': 300000, 'studentId': 'k1'},
          {'kind': 'BOOK', 'amount': 50000},
        ],
      });
    });

    testWidgets('серверийн алдаа цонхонд, давтахгүй', (tester) async {
      final h = reconcileHttp(
        rows: {
          'all': [rowJson()],
        },
      )..error('POST', '/reconcile/rows/r1/allocate', 400, 'Сонгосон хүүхэд олдсонгүй');
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      await _tap(tester, find.byKey(const ValueKey('allocate:r1')));
      await _tap(tester, find.byKey(const Key('allocate-save')));
      expect(find.text('Сонгосон хүүхэд олдсонгүй'), findsOneWidget);
      expect(h.count('POST', '/reconcile/rows/r1/allocate'), 1);
    });
  });

  group('«⋯» хүүхдийн дэлгэрэнгүй', () {
    FakeHttp detailHttp({bool hidden = false}) =>
        reconcileHttp(
            rows: {
              'all': [rowJson()],
            },
          )
          ..json('GET', '/reconcile/students/k1', detailJson())
          ..json('GET', '/payments/ledger/student/k1', ledgerJson(hidden: hidden));

    testWidgets('сар дээр дарахад хамрах хугацаа, аль төлбөр, ямар данс; сонгох нь оноох', (tester) async {
      final h = detailHttp()..json('POST', '/reconcile/rows/r1/allocate', {'ok': true, 'alsoResolved': 0});
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      await _tap(tester, find.byTooltip('Тестийн Болд — дэлгэрэнгүй'), frames: 20);
      expect(find.text('Төлсөн 700,000₮'), findsOneWidget);
      expect(find.text('Өр 350,000₮'), findsOneWidget);
      expect(find.text('+3 хоног', findRichText: true), findsNothing);
      await _tap(tester, find.byKey(const ValueKey('block:2026-10')));
      final card = find.byKey(const ValueKey('month-card:2026-10'));
      expect(card, findsOneWidget);
      expect(find.descendant(of: card, matching: find.text('10/07–11/07')), findsOneWidget);
      expect(find.descendant(of: card, matching: find.text('350,000₮ / 700,000₮', findRichText: true)), findsOneWidget);
      expect(find.descendant(of: card, matching: find.text('5000123456')), findsOneWidget);
      await _tap(tester, find.byKey(const ValueKey('block:2026-09')));
      expect(find.text('Бэлэн'), findsOneWidget);
      await _tap(tester, find.byKey(const Key('detail-pick')), frames: 20);
      expect(h.count('POST', '/reconcile/rows/r1/allocate'), 1);
    });

    testWidgets('Гүйлгээ таб: хуваасан гүйлгээг буцаах асуулт, нэг POST; Холбоо таб', (tester) async {
      final h = detailHttp()..json('POST', '/reconcile/rows/r9/undo', {'ok': true});
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      await _tap(tester, find.byTooltip('Тестийн Болд — дэлгэрэнгүй'), frames: 20);
      await _tap(tester, find.text('Гүйлгээ (1)'));
      expect(find.text('/ 700,000₮'), findsOneWidget);
      expect(find.text('Бэлэн'), findsOneWidget); // хуулгатай холбогдоогүй төлбөр
      await _tap(tester, find.byKey(const ValueKey('bank-undo:al1')));
      expect(find.textContaining('бүх хэсэг нь буцна'), findsOneWidget);
      expect(find.textContaining('Энэ гүйлгээнээс үүссэн төлбөр хүчингүй болно'), findsOneWidget);
      await _tap(tester, _inDialog('Буцаах'), frames: 20);
      expect(h.count('POST', '/reconcile/rows/r9/undo'), 1);
      await _tap(tester, find.text('Холбоо'));
      expect(find.text('88112233'), findsWidgets);
      expect(find.text('Энэ хүүхдэд төлдөг данс, утас'), findsOneWidget);
    });

    testWidgets('Багш+: ledger дүнгүй — мөнгөн дүн дэлгэрэнгүйд гарахгүй', (tester) async {
      final h = detailHttp(hidden: true)..json('GET', '/staff-capabilities/me', capsWithFinance);
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'TEACHER_PLUS');
      await _tap(tester, find.byTooltip('Тестийн Болд — дэлгэрэнгүй'), frames: 20);
      expect(find.textContaining('Төлсөн 700'), findsNothing);
      await _tap(tester, find.byKey(const ValueKey('block:2026-10')));
      final card = find.byKey(const ValueKey('month-card:2026-10'));
      expect(find.descendant(of: card, matching: find.textContaining('₮', findRichText: true)), findsNothing);
      expect(find.descendant(of: card, matching: find.text('Төлсөн', findRichText: true)), findsWidgets);
    });
  });

  group('хуулга оруулах, шийтэд хөтлөгдсөн өдөр', () {
    testWidgets('xlsx: нэг илгээлт → серверийн дүн, жагсаалт шинэчлэгдэнэ', (tester) async {
      final picker = FakePicker('khan.xlsx', xlsxBytes());
      final h = reconcileHttp()
        ..json('POST', '/reconcile/import', {
          'rows': 10,
          'newRows': 7,
          'duplicates': 2,
          'beforeSettled': 1,
          'autoResolved': 4,
          'inSheet': 0,
          'open': 3,
        });
      await pumpM7(
        tester,
        const ReconcileScreen(),
        http: h,
        session: signedInAs('ADMIN'),
        extra: financeExtra(picker: picker),
      );
      final before = rowQueries(h).length;
      await _tap(tester, find.byKey(const Key('statement-pick')), frames: 20);
      expect(h.count('POST', '/reconcile/import'), 1);
      expect(find.byKey(const Key('import-summary')), findsOneWidget);
      expect(find.text('7 шинэ гүйлгээ орлоо'), findsOneWidget);
      expect(rowQueries(h).length, greaterThan(before));
    });

    testWidgets('.csv: шалтгаан харагдана, илгээхгүй', (tester) async {
      final h = reconcileHttp();
      await pumpFinance(
        tester,
        const ReconcileScreen(),
        http: h,
        role: 'ADMIN',
        picker: FakePicker('khan.csv', xlsxBytes()),
      );
      await _tap(tester, find.byKey(const Key('statement-pick')));
      expect(find.text('Хаан банкнаас татсан .xlsx хуулга оруулна уу'), findsOneWidget);
      expect(h.count('POST', '/reconcile/import'), 0);
    });

    testWidgets('шийтэд хөтлөгдсөн өдөр: анхны утга хуулгын өдөр, нэг POST, тоо', (tester) async {
      final h = reconcileHttp()..json('POST', '/reconcile/sheet-through', {'marked': 5, 'reopened': 0});
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      await _tap(tester, find.byKey(const Key('sheet-through')));
      expect(find.text('2026.11.12'), findsOneWidget);
      await _tap(tester, find.byKey(const Key('sheet-through-save')), frames: 16);
      expect(h.requests.lastWhere((r) => r.method == 'POST').data, {'through': '2026-11-12'});
      expect(find.text('5 гүйлгээ «Шийтэд хөтлөгдсөн» жагсаалт руу шилжлээ'), findsOneWidget);
    });
  });
}
