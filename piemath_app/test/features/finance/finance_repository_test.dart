import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/finance/data/finance_models.dart';
import 'package:piemath_app/features/finance/data/finance_repository.dart';
import 'package:piemath_app/features/finance/data/reconcile_models.dart';
import 'package:piemath_app/features/finance/data/reconcile_repository.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'finance_fixtures.dart';

void main() {
  FinanceRepository fin(FakeHttp h) => testContainer(http: h).read(financeRepositoryProvider);
  ReconcileRepository rec(FakeHttp h) => testContainer(http: h).read(reconcileRepositoryProvider);

  final draft = ExpenseDraft(amount: 1000, category: ExpenseCategory.other, occurredOn: UbDateTime(2026, 11, 4));

  group('санхүү', () {
    test('тайлан, зарлага: month query', () async {
      final h = FakeHttp()
        ..json('GET', '/finance/report', reportJson(period: '2026-10'))
        ..json('GET', '/finance/expenses', [expenseJson(), expenseJson(id: 'e2')]);
      final r = fin(h);
      expect((await r.report(const YearMonth(2026, 10))).period, '2026-10');
      expect(queryOf(h, '/finance/report', 'month'), '2026-10');
      expect((await r.expenses(const YearMonth(2026, 10))).length, 2);
      expect(queryOf(h, '/finance/expenses', 'month'), '2026-10');
    });

    test('зарлага нэмэх, засах: бие, зам', () async {
      final h = FakeHttp()
        ..json('POST', '/finance/expenses', {'id': 'e9'})
        ..json('PATCH', '/finance/expenses/e%201', {'id': 'e 1'});
      final r = fin(h);
      await r.createExpense(draft);
      await r.updateExpense('e 1', draft);
      expect(h.requests[0].data, draft.toJson());
      expect(h.requests[1].method, 'PATCH');
      expect(h.requests[1].data, draft.toJson());
    });

    test('зарлага нэмэх алдаа өгвөл автоматаар ДАВТАХГҮЙ', () async {
      final h = FakeHttp()..on('POST', '/finance/expenses', (_) => const FakeResponse.network());
      await expectLater(fin(h).createExpense(draft), throwsA(isA<ApiError>()));
      expect(h.count('POST', '/finance/expenses'), 1);
    });

    test('хатуу устгалын дуудлага огт байхгүй', () async {
      final h = FakeHttp()
        ..json('GET', '/finance/report', reportJson())
        ..json('GET', '/finance/expenses', [expenseJson()])
        ..json('POST', '/finance/expenses', {})
        ..json('PATCH', '/finance/expenses/e1', {});
      final r = fin(h);
      await r.report(const YearMonth(2026, 11));
      await r.expenses(const YearMonth(2026, 11));
      await r.createExpense(draft);
      await r.updateExpense('e1', draft);
      expect(h.requests.where((x) => x.method == 'DELETE'), isEmpty);
    });
  });

  group('тулгалт', () {
    test('санхүүгийн эрх: бүх ангид, administrator; нэг ангид хязгаарласан бол үгүй', () async {
      final h = FakeHttp()
        ..json('GET', '/staff-capabilities/me', capsWithFinance)
        ..json('GET', '/staff-capabilities/me', capsWithoutFinance)
        ..json('GET', '/staff-capabilities/me', {
          'administrator': false,
          'grants': [
            {'capability': 'finance.manage', 'scopeKey': 'c1'},
          ],
        })
        ..json('GET', '/staff-capabilities/me', {'administrator': true, 'grants': <Object>[]});
      final r = rec(h);
      expect(await r.hasFinanceCapability(), isTrue);
      expect(await r.hasFinanceCapability(), isFalse);
      expect(await r.hasFinanceCapability(), isFalse);
      expect(await r.hasFinanceCapability(), isTrue);
    });

    test('мөр: lane, limit, offset, хайлт; check зөвхөн «Шийтэд хөтлөгдсөн»-д', () async {
      final h = reconcileHttp(
        rows: {
          'manual': [rowJson()],
        },
      );
      final r = rec(h);
      final p = await r.rows(lane: Lane.manual, query: ' Болд ', checkOnly: true, offset: 50);
      expect(p.items.single.id, 'r1');
      expect(h.requests.last.queryParameters, {'lane': 'manual', 'limit': '50', 'offset': '50', 'q': 'Болд'});
      await r.rows(lane: Lane.sheet, checkOnly: true, limit: 500);
      expect(h.requests.last.queryParameters, {'lane': 'sheet', 'limit': '200', 'offset': '0', 'check': '1'});
    });

    test('товч: курсор, жагсаалт бүрийн тоо серверээс, шийтэд бичих горим', () async {
      final o = await rec(
        reconcileHttp(
          overview: overviewJson(sheetCheck: 2, sheetThrough: '2026-11-05', sheetWrite: {'url': 'x', 'demo': true}),
        ),
      ).overview();
      expect(o.count(Lane.manual), 3);
      expect(o.count(Lane.all), 12);
      expect(o.sheetCheck, 2);
      expect(o.cursor!.coveredThrough, '2026-11-12');
      expect(o.cursor!.sheetThrough, '2026-11-05');
      expect(o.sheetWriteDemo, isTrue);
      expect((await rec(reconcileHttp(overview: overviewJson(cursor: false))).overview()).cursor, isNull);
    });

    test('хүүхэд хайх: 2-оос бага тэмдэгтэд хүсэлтгүй; items, утас, бүтэн төлсөн', () async {
      final h = FakeHttp()
        ..json('GET', '/reconcile/students', {
          'items': [kidJson(paidUp: true)],
        });
      final r = rec(h);
      expect(await r.searchStudents(' Б '), isEmpty);
      expect(h.requests, isEmpty);
      final items = await r.searchStudents(' Болд ');
      expect(items.single.paidUp, isTrue);
      expect(items.single.phones.first.value, '99001122');
      expect(h.requests.single.queryParameters['q'], 'Болд');
    });

    test('хуваарилах: parts бие, хүүхдийн бус зориулалтад studentId-гүй; алдаа бол давтахгүй', () async {
      final h = FakeHttp()
        ..json('POST', '/reconcile/rows/r1/allocate', {
          'ok': true,
          'alsoResolved': 2,
          'sheetWrites': [
            {'studentId': 'k1', 'ok': true, 'cell': 'K14', 'month': '2026-11'},
          ],
        });
      final res = await rec(h).allocate('r1', const [
        AllocPart(kind: AllocKind.tuition, amount: 300000, studentId: 'k1'),
        AllocPart(kind: AllocKind.other, amount: 50000, studentId: 'k1'),
      ]);
      expect(h.requests.single.data, {
        'parts': [
          {'kind': 'TUITION', 'amount': 300000, 'studentId': 'k1'},
          {'kind': 'OTHER', 'amount': 50000},
        ],
      });
      expect(res.alsoResolved, 2);
      expect(sheetWriteText(res.sheetWrites), 'Шийтэд бичлээ: K14 нүд, 11-р сар');

      final h2 = FakeHttp()..on('POST', '/reconcile/rows/r1/allocate', (_) => const FakeResponse.network());
      await expectLater(rec(h2).allocate('r1', const []), throwsA(isA<ApiError>()));
      expect(h2.count('POST', '/reconcile/rows/r1/allocate'), 1);
    });

    test('буцаах, шийтэд хөтлөгдсөн өдөр: зам, бие; DELETE хэзээ ч үгүй', () async {
      final h = FakeHttp()
        ..json('POST', '/reconcile/rows/r%201/undo', {'ok': true})
        ..json('POST', '/reconcile/sheet-through', {'marked': 7, 'reopened': 0});
      final r = rec(h);
      await r.undo('r 1');
      expect(await r.markSheetThrough('2026-11-05'), 7);
      expect(h.requests.last.data, {'through': '2026-11-05'});
      expect(h.requests.where((x) => x.method == 'DELETE'), isEmpty);
    });

    test('дэлгэрэнгүй: хүүхэд, хуулга; ledger алдаатай бол null', () async {
      final h = FakeHttp()
        ..json('GET', '/reconcile/students/k1', detailJson())
        ..error('GET', '/payments/ledger/student/k1', 404, 'Анги алга');
      final r = rec(h);
      final d = await r.studentDetail('k1');
      expect(d.contacts.map((c) => c.label), ['Өөрийн', 'Ээж']);
      expect(d.bank.single.partial, isTrue);
      expect(d.payers.single.count, 3);
      expect(await r.studentLedger('k1'), isNull);
    });

    test('импорт: multipart file, серверийн дүн; алдааг монголоор', () async {
      final bytes = xlsxBytes();
      final preview = StatementPreview.inspect('khan.xlsx', bytes);
      final h = FakeHttp()
        ..json('POST', '/reconcile/import', {
          'rows': 10,
          'newRows': 7,
          'duplicates': 2,
          'beforeSettled': 1,
          'autoResolved': 4,
          'inSheet': 0,
          'open': 3,
        })
        ..error('POST', '/reconcile/import', 400, 'Хаан банкнаас татсан .xlsx хуулга оруулна уу');
      final r = rec(h);
      final res = await r.importStatement(bytes, preview);
      expect(res.newRows, 7);
      expect(
        res.text,
        'Хуулгад 10 гүйлгээ: шинээр 7 орж, 3 нь өмнө орсон тул алгасагдлаа. Автоматаар 4 шийдэгдэж, 3 гүйлгээ шийдэх жагсаалтад байна',
      );
      final form = h.requests.first.data as FormData;
      expect(form.files.single.key, 'file');
      expect(form.files.single.value.filename, 'khan.xlsx');
      await expectLater(
        r.importStatement(bytes, preview),
        throwsA(isA<ApiError>().having((e) => e.message, 'message', 'Хаан банкнаас татсан .xlsx хуулга оруулна уу')),
      );
      expect(h.count('POST', '/reconcile/import'), 2);
    });
  });
}
