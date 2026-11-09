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

    test('жагсаалт: status, limit, offset; «бүгд» бол status-гүй', () async {
      final h = FakeHttp()..json('GET', '/reconcile/transactions', page([txJson()], total: 51));
      final r = rec(h);
      final p = await r.transactions(status: BankMatchStatus.ignored, offset: 50);
      expect(p.total, 51);
      expect(p.items.single.id, 't1');
      expect(h.requests.last.queryParameters, {'status': 'IGNORED', 'limit': '50', 'offset': '50'});
      await r.transactions();
      expect(h.requests.last.queryParameters.containsKey('status'), isFalse);
    });

    test('тоо: төлөв бүрийн total (limit=1), апп нэмж тооцохгүй', () async {
      final h = FakeHttp();
      summaryCounts(h, unmatched: 3, auto: 5, manual: 1, ignored: 2);
      final s = await rec(h).summary();
      expect([s.total, s.unmatched, s.autoMatched, s.manualMatched, s.ignored], [11, 3, 5, 1, 2]);
      expect(h.requests.every((r) => r.queryParameters['limit'] == '1'), isTrue);
      expect(h.requests.length, 5);
    });

    test('сурагч хайх: массив эсвэл items, кодоор хайвал тэр нь эхэнд', () async {
      final h = FakeHttp()
        ..json('GET', '/users/search', {
          'items': [
            {'id': 'a', 'firstName': 'А', 'lastName': 'А', 'studentCode': 'B27120002'},
            {'id': 'b', 'firstName': 'Б', 'lastName': 'Б', 'studentCode': 'B27120001'},
          ],
        });
      final hits = await rec(h).searchStudents(' b27120001 ');
      expect(hits.map((x) => x.id), ['b', 'a']);
      expect(h.requests.single.queryParameters['q'], 'b27120001');
    });

    test('холбох: userId бие, серверийн хариу; алдаа бол давтахгүй', () async {
      final h = FakeHttp()..json('POST', '/reconcile/t1/match', txJson(status: 'MANUAL_MATCHED'));
      final t = await rec(h).match('t1', 'u9');
      expect(h.requests.single.data, {'userId': 'u9'});
      expect(t.status, BankMatchStatus.manualMatched);

      final h2 = FakeHttp()..on('POST', '/reconcile/t1/match', (_) => const FakeResponse.network());
      await expectLater(rec(h2).match('t1', 'u9'), throwsA(isA<ApiError>()));
      expect(h2.count('POST', '/reconcile/t1/match'), 1);
    });

    test('төлбөр биш: 204', () async {
      final h = FakeHttp()..json('POST', '/reconcile/t1/ignore', null, status: 204);
      await rec(h).ignore('t1');
      expect(h.count('POST', '/reconcile/t1/ignore'), 1);
    });

    test('импорт: multipart file (config-гүй), серверийн дүн; алдааг монголоор', () async {
      final bytes = csvBytes();
      final preview = StatementPreview.inspect('khan.csv', bytes);
      final h = FakeHttp()
        ..json('POST', '/reconcile/import', {
          'totalRows': 1,
          'imported': 1,
          'skipped': 0,
          'matched': 1,
          'errors': <Object>[],
        })
        ..error('POST', '/reconcile/import', 400, 'Файл байхгүй байна');
      final r = rec(h);
      final res = await r.importStatement(bytes, preview);
      expect(res.matched, 1);
      final form = h.requests.first.data as FormData;
      expect(form.files.single.key, 'file');
      expect(form.files.single.value.filename, 'khan.csv');
      expect(form.fields, isEmpty);
      await expectLater(
        r.importStatement(bytes, preview),
        throwsA(isA<ApiError>().having((e) => e.message, 'message', 'Файл байхгүй байна')),
      );
      expect(h.count('POST', '/reconcile/import'), 2);
    });
  });
}
