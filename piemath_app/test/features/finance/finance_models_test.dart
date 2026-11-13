import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/finance/data/finance_models.dart';

import 'finance_fixtures.dart';

void main() {
  group('YearMonth', () {
    test('түлхүүр, шошго, жилийн зааг', () {
      const m = YearMonth(2026, 1);
      expect(m.key, '2026-01');
      expect(m.label, '2026 оны 1-р сар');
      expect(m.previous, const YearMonth(2025, 12));
      expect(const YearMonth(2026, 12).next, const YearMonth(2027, 1));
      expect(YearMonth.of(UbDateTime(2026, 11, 30)), const YearMonth(2026, 11));
      expect(const YearMonth(2026, 2).compareTo(const YearMonth(2025, 12)), greaterThan(0));
    });
  });

  group('FinanceReport', () {
    test('серверийн дүн хэвээр (апп нийлбэр тооцохгүй)', () {
      final r = FinanceReport.fromJson(reportJson(recon: 2));
      expect(r.totalIncome, 3000000);
      expect(r.totalExpenses, 1800000);
      expect(r.netProfit, 1200000);
      expect(r.previousNetProfit, 1000000);
      expect(r.profitChange, 200000);
      expect(r.reconciliationRequired, 2);
      expect(r.incomeLines.map((l) => l.label), ['Сургалтын төлбөр', 'Шалгалтын төлбөр', 'Номын төлбөр', 'Бусад']);
      expect(r.expenseLines.first, (label: 'Цалин', amount: 1000000));
      expect(r.expenseLines.length, ExpenseCategory.values.length);
    });

    test('өмнөх сар байхгүй, тоо мөрөөр ирсэн', () {
      final r = FinanceReport.fromJson({...reportJson(change: null), 'totalIncome': '42'});
      expect(r.previousNetProfit, isNull);
      expect(r.profitChange, isNull);
      expect(r.totalIncome, 42);
    });
  });

  group('зарлага', () {
    test('огноо UTC хуанлийн өдөр (эхний 10 тэмдэгт), ангилал, тайлбар', () {
      final e = ExpenseRecord.fromJson(expenseJson());
      expect(e.occurredOnKey, '2026-11-02');
      expect(e.occurredOn, UbDateTime(2026, 11, 2));
      expect(e.category, ExpenseCategory.rent);
      expect(e.categoryLabel, 'Түрээс');
      expect(e.createdBy.role, 'TEACHER_PLUS');
    });

    test('мэдэгдэхгүй ангилал түүхий утгаараа, хоосон тайлбар null', () {
      final e = ExpenseRecord.fromJson(expenseJson(category: 'TAX', description: '  '));
      expect(e.category, isNull);
      expect(e.categoryLabel, 'TAX');
      expect(e.description, isNull);
      expect(() => ExpenseRecord.fromJson(const {'amount': 1}), throwsFormatException);
    });

    test('ноорог: YYYY-MM-DD, тайлбарыг тайрна', () {
      final d = ExpenseDraft(
        amount: 120000,
        category: ExpenseCategory.utilities,
        occurredOn: UbDateTime(2026, 11, 4),
        description: ' Цахилгаан ',
      );
      expect(d.toJson(), {
        'amount': 120000,
        'category': 'UTILITIES',
        'description': 'Цахилгаан',
        'occurredOn': '2026-11-04',
      });
      expect(ExpenseCategory.fromApi('salary'), ExpenseCategory.salary);
    });
  });
}
