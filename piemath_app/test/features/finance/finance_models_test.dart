import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/finance/data/finance_models.dart';
import 'package:piemath_app/features/finance/data/reconcile_models.dart';

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

  group('тулгалт', () {
    test('төлөв: вэбийн MANUALLY_MATCHED-ийг ч таньна', () {
      expect(BankMatchStatus.fromApi('MANUALLY_MATCHED'), BankMatchStatus.manualMatched);
      expect(BankMatchStatus.fromApi('MANUAL_MATCHED'), BankMatchStatus.manualMatched);
      expect(BankMatchStatus.fromApi('???'), BankMatchStatus.unknown);
      expect(BankMatchStatus.fromApi(''), BankMatchStatus.unknown);
    });

    test('гүйлгээ: UB цаг, холбогдсон сурагч, зөвхөн тулгаагүйд үйлдэл', () {
      final t = BankTransaction.fromJson(txJson());
      expect(t.bookedAt!.hour, 12); // 04:20Z = UB 12:20
      expect(t.actionable, isTrue);
      final m = BankTransaction.fromJson(
        txJson(
          status: 'AUTO_MATCHED',
          matchedUser: {'id': 'u1', 'firstName': 'Болд', 'lastName': 'Тестийн', 'phone': ''},
        ),
      );
      expect(m.actionable, isFalse);
      expect(m.matchedUser!.fullName, 'Тестийн Болд');
      expect(m.matchedUser!.phone, isNull);
      expect(t.copyWith(status: BankMatchStatus.ignored).status, BankMatchStatus.ignored);
      expect(() => BankTransaction.fromJson(const {}), throwsFormatException);
    });

    test('импортын дүн', () {
      final r = ImportResult.fromJson({
        'totalRows': 10,
        'imported': 7,
        'skipped': 2,
        'matched': 4,
        'errors': [
          {'rowIndex': 5, 'bankRef': null, 'reason': ''},
          'буруу',
        ],
      });
      expect([r.totalRows, r.imported, r.skipped, r.matched], [10, 7, 2, 4]);
      expect(r.errors.single.rowIndex, 5);
      expect(r.errors.single.reason, 'Тодорхойгүй алдаа');
    });

    test('сурагчийн код ба эрэмбэ', () {
      expect(looksLikeStudentCode('b27120001'), isTrue);
      expect(looksLikeStudentCode('B2712000'), isFalse);
      expect(looksLikeStudentCode('Болд'), isFalse);
      const a = StudentHit(id: 'a', firstName: 'А', lastName: 'А', code: 'B27120002');
      const b = StudentHit(id: 'b', firstName: 'Б', lastName: 'Б', code: 'B27120001');
      expect(rankStudentHits('b27120001', [a, b]).map((h) => h.id), ['b', 'a']);
      expect(rankStudentHits('Бо', [a, b]).map((h) => h.id), ['a', 'b']);
    });
  });

  group('хуулгын урьдчилсан шалгалт', () {
    test('CSV: мөрүүд, Хаан банкны толгой, BOM', () {
      final p = StatementPreview.inspect('khan.CSV', csvBytes('\u{FEFF}Гүйлгээний огноо,Дүн\r\n\r\n1,2\n'));
      expect(p.ok, isTrue);
      expect(p.kind, StatementKind.csv);
      expect(p.lineCount, 2);
      expect(p.hasKhanHeader, isTrue);
      expect(p.mimeType, 'text/csv');
    });

    test('CSV толгойгүй бол анхааруулга (илгээж болно)', () {
      final p = StatementPreview.inspect('a.csv', csvBytes('a,b\n1,2\n'));
      expect(p.ok, isTrue);
      expect(p.hasKhanHeader, isFalse);
    });

    test('буруу төрөл, хоосон, том, гэмтсэн Excel', () {
      expect(StatementPreview.inspect('a.pdf', Uint8List(3)).problem, 'Зөвхөн .xlsx эсвэл .csv файл оруулна');
      expect(StatementPreview.inspect('a.csv', Uint8List(0)).problem, 'Файл хоосон байна');
      expect(
        StatementPreview.inspect('a.xlsx', Uint8List(StatementPreview.maxBytes + 1)).problem,
        'Файл 5 МБ-аас том байна',
      );
      expect(StatementPreview.inspect('a.xlsx', Uint8List.fromList([1, 2, 3, 4])).ok, isFalse);
      final ok = StatementPreview.inspect('a.xlsx', Uint8List.fromList([0x50, 0x4B, 3, 4]));
      expect(ok.ok, isTrue);
      expect(ok.hasKhanHeader, isNull);
      expect(ok.kindLabel, 'Excel');
      expect(StatementPreview.inspect('a.csv', csvBytes(' \n \n')).problem, 'Файлд мөр алга');
    });

    test('хэмжээний шошго', () {
      expect(StatementPreview.inspect('a.csv', csvBytes('x')).sizeLabel, '1 байт');
      expect(
        StatementPreview.inspect('a.xlsx', Uint8List.fromList([0x50, 0x4B, ...List.filled(2046, 0)])).sizeLabel,
        '2 КБ',
      );
    });
  });
}
