// `/finance/*` (вэбийн `FinanceDashboardClient.tsx`, api `finance.service.ts`).
// Апп мөнгө ТООЦОХГҮЙ — бүх дүн, нийлбэр, ашиг серверээс ирсэн утгаараа харагдана.
import '../../../core/time/ub_time.dart';

int _int(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) ?? 0 : 0);

int? _intOrNull(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) : null);

Map<String, Object?> _map(Object? v) => v is Map ? v.cast<String, Object?>() : const {};

/// Сар (`2026-11`) — тайлан, зарлагын жагсаалтын түлхүүр.
class YearMonth implements Comparable<YearMonth> {
  const YearMonth(this.year, this.month) : assert(month >= 1 && month <= 12);

  factory YearMonth.of(UbDateTime d) => YearMonth(d.year, d.month);

  final int year;
  final int month;

  /// API-ийн `month` параметр: `2026-11`.
  String get key => '$year-${month.toString().padLeft(2, '0')}';

  /// «2026 оны 11-р сар»
  String get label => '$year оны $month-р сар';

  YearMonth get previous => month == 1 ? YearMonth(year - 1, 12) : YearMonth(year, month - 1);

  YearMonth get next => month == 12 ? YearMonth(year + 1, 1) : YearMonth(year, month + 1);

  @override
  int compareTo(YearMonth other) => year != other.year ? year - other.year : month - other.month;

  @override
  bool operator ==(Object other) => other is YearMonth && other.year == year && other.month == month;

  @override
  int get hashCode => Object.hash(year, month);

  @override
  String toString() => key;
}

/// Зарлагын ангилал (сервер: SALARY … OTHER). Дараалал нь вэбийнхтэй ижил.
enum ExpenseCategory {
  salary('SALARY', 'Цалин'),
  rent('RENT', 'Түрээс'),
  utilities('UTILITIES', 'Коммунал'),
  marketing('MARKETING', 'Сурталчилгаа'),
  materials('MATERIALS', 'Материал'),
  equipment('EQUIPMENT', 'Тоног төхөөрөмж'),
  other('OTHER', 'Бусад');

  const ExpenseCategory(this.api, this.label);

  final String api;
  final String label;

  /// Мэдэгдэхгүй утга → `null` (дэлгэц түүхий утгыг харуулна).
  static ExpenseCategory? fromApi(String? v) {
    final up = v?.toUpperCase();
    for (final c in values) {
      if (c.api == up) return c;
    }
    return null;
  }
}

/// Тайлангийн нэг мөр (шошго + серверийн дүн).
typedef MoneyLine = ({String label, int amount});

/// `GET /finance/report?month=` — сарын орлого, зарлага, цэвэр ашиг.
class FinanceReport {
  const FinanceReport({
    required this.period,
    required this.trainingFees,
    required this.exams,
    required this.books,
    required this.otherIncome,
    required this.totalIncome,
    required this.expenseByCategory,
    required this.totalExpenses,
    required this.netProfit,
    required this.previousNetProfit,
    required this.profitChange,
    required this.reconciliationRequired,
  });

  factory FinanceReport.fromJson(Object? json) {
    final j = _map(json);
    final income = _map(j['income']);
    final expenses = _map(j['expenses']);
    return FinanceReport(
      period: j['period']?.toString() ?? '',
      trainingFees: _int(income['trainingFees']),
      exams: _int(income['exams']),
      books: _int(income['books']),
      otherIncome: _int(income['other']),
      totalIncome: _int(j['totalIncome']),
      expenseByCategory: {
        ExpenseCategory.salary: _int(expenses['salary']),
        ExpenseCategory.rent: _int(expenses['rent']),
        ExpenseCategory.utilities: _int(expenses['utilities']),
        ExpenseCategory.marketing: _int(expenses['marketing']),
        ExpenseCategory.materials: _int(expenses['materials']),
        ExpenseCategory.equipment: _int(expenses['equipment']),
        ExpenseCategory.other: _int(expenses['other']),
      },
      totalExpenses: _int(j['totalExpenses']),
      netProfit: _int(j['netProfit']),
      previousNetProfit: _intOrNull(j['previousNetProfit']),
      profitChange: _intOrNull(j['profitChange']),
      reconciliationRequired: _int(j['incomeReconciliationRequired']),
    );
  }

  final String period;
  final int trainingFees;
  final int exams;
  final int books;
  final int otherIncome;
  final int totalIncome;
  final Map<ExpenseCategory, int> expenseByCategory;
  final int totalExpenses;
  final int netProfit;
  final int? previousNetProfit;
  final int? profitChange;

  /// Хуваарилалт тодорхойгүй (олон төрлийн худалдан авалттай) төлбөрийн ТОО — мөнгө биш.
  final int reconciliationRequired;

  /// Орлогын задаргаа (вэбийн дараалал).
  List<MoneyLine> get incomeLines => [
    (label: 'Сургалтын төлбөр', amount: trainingFees),
    (label: 'Шалгалтын төлбөр', amount: exams),
    (label: 'Номын төлбөр', amount: books),
    (label: 'Бусад', amount: otherIncome),
  ];

  /// Зарлагын задаргаа (вэбийн дараалал).
  List<MoneyLine> get expenseLines => [
    for (final c in ExpenseCategory.values) (label: c.label, amount: expenseByCategory[c] ?? 0),
  ];
}

/// Зарлага бүртгэсэн ажилтан.
class ExpenseAuthor {
  const ExpenseAuthor({required this.id, required this.firstName, required this.lastName, this.role});

  factory ExpenseAuthor.fromJson(Object? json) {
    final j = _map(json);
    return ExpenseAuthor(
      id: j['id']?.toString() ?? '',
      firstName: j['firstName']?.toString() ?? '',
      lastName: j['lastName']?.toString() ?? '',
      role: j['role']?.toString(),
    );
  }

  final String id;
  final String firstName;
  final String lastName;
  final String? role;
}

/// `GET /finance/expenses?month=` — нэг зарлага.
class ExpenseRecord {
  const ExpenseRecord({
    required this.id,
    required this.amount,
    required this.categoryRaw,
    required this.description,
    required this.occurredOnKey,
    required this.createdBy,
  });

  factory ExpenseRecord.fromJson(Object? json) {
    final j = _map(json);
    final id = j['id'];
    if (id is! String || id.isEmpty) throw const FormatException('id');
    final occurred = j['occurredOn']?.toString() ?? '';
    final description = j['description'] is String ? (j['description'] as String).trim() : '';
    return ExpenseRecord(
      id: id,
      amount: _int(j['amount']),
      categoryRaw: j['category']?.toString() ?? '',
      description: description.isEmpty ? null : description,
      // `occurredOn` нь UTC хуанлийн өдөр (сервер `YYYY-MM-DD`-ийг UTC шөнө дунд хадгална) — эхний 10 тэмдэгт.
      occurredOnKey: occurred.length >= 10 ? occurred.substring(0, 10) : occurred,
      createdBy: ExpenseAuthor.fromJson(j['createdBy']),
    );
  }

  final String id;
  final int amount;
  final String categoryRaw;
  final String? description;

  /// `2026-11-04`
  final String occurredOnKey;
  final ExpenseAuthor createdBy;

  ExpenseCategory? get category => ExpenseCategory.fromApi(categoryRaw);

  String get categoryLabel => category?.label ?? categoryRaw;

  UbDateTime? get occurredOn => parseDateKey(occurredOnKey);
}

/// Зарлага нэмэх, засах оролт (`CreateExpenseDto`). Огноо `YYYY-MM-DD` (вэбтэй ижил).
class ExpenseDraft {
  const ExpenseDraft({required this.amount, required this.category, required this.occurredOn, this.description = ''});

  final int amount;
  final ExpenseCategory category;
  final UbDateTime occurredOn;
  final String description;

  Map<String, Object?> toJson() => {
    'amount': amount,
    'category': category.api,
    'description': description.trim(),
    'occurredOn': occurredOn.dateKey,
  };
}
