// `GET /payments/ledger/*` (вэбийн `ledgerTypes.ts`, api `ledger.service.ts`). Эрх: ADMIN, Багш+ (`finance.manage`).
// Гар бичмэл, уян parse — сервер талбар нэмсэн/хассан ч эвдрэхгүй. Дүн бүр СЕРВЕРЭЭС; апп тоо зохиохгүй:
// талбар ирээгүй бол null, дэлгэцэд харуулахгүй.

Map<String, Object?> _m(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};
String? _s(Object? v) => v is String ? v : null;
int? _n(Object? v) => v is num ? v.toInt() : null;
List<Object?> _l(Object? v) => v is List ? v : const <Object?>[];

/// Сарын блокийн төлөв (`BlockState`).
enum LedgerState {
  paid('Төлсөн'),
  partial('Дутуу'),
  owed('Өртэй'),
  future('Хугацаа болоогүй'),
  off('Сураагүй'),
  unknown('Тодорхойгүй');

  const LedgerState(this.label);

  final String label;

  static LedgerState fromApi(String? v) => switch (v) {
    'PAID' => paid,
    'PARTIAL' => partial,
    'OWED' => owed,
    'FUTURE' => future,
    'OFF' => off,
    _ => unknown,
  };
}

class MonthBlock {
  const MonthBlock({required this.month, required this.state, this.due, this.paid, this.dueOn, this.paidOn});

  factory MonthBlock.fromJson(Object? j) {
    final m = _m(j);
    return MonthBlock(
      month: _s(m['month']) ?? '',
      state: LedgerState.fromApi(_s(m['state'])),
      due: _n(m['due']),
      paid: _n(m['paid']),
      dueOn: _s(m['dueOn']),
      paidOn: _s(m['paidOn']),
    );
  }

  /// «2026-11».
  final String month;
  final LedgerState state;
  final int? due;
  final int? paid;
  final String? dueOn;
  final String? paidOn;
}

class ClassStat {
  const ClassStat({required this.id, required this.name, this.students, this.expected, this.covered, this.owedStudents, this.owedNow});

  factory ClassStat.fromJson(Object? j) {
    final m = _m(j);
    return ClassStat(
      id: _s(m['id']) ?? '',
      name: _s(m['name']) ?? '',
      students: _n(m['students']),
      expected: _n(m['expected']),
      covered: _n(m['covered']),
      owedStudents: _n(m['owedStudents']),
      owedNow: _n(m['owedNow']),
    );
  }

  final String id;
  final String name;
  final int? students;
  final int? expected;
  final int? covered;
  final int? owedStudents;

  /// Нийт өр — сервер өгвөл л.
  final int? owedNow;
}

class LedgerOverview {
  const LedgerOverview({required this.month, required this.totals, this.classes = const []});

  factory LedgerOverview.fromJson(Object? j) {
    final m = _m(j);
    return LedgerOverview(
      month: _s(m['month']) ?? '',
      totals: m['totals'] is Map ? ClassStat.fromJson(m['totals']) : null,
      classes: [for (final c in _l(m['classes'])) ClassStat.fromJson(c)],
    );
  }

  final String month;
  final ClassStat? totals;
  final List<ClassStat> classes;
}

class LedgerRow {
  const LedgerRow({
    required this.id,
    required this.name,
    this.code,
    this.classroom,
    this.blocks = const [],
    this.owedNow,
    this.coveredThrough,
  });

  factory LedgerRow.fromJson(Object? j) {
    final m = _m(j);
    return LedgerRow(
      id: _s(m['id']) ?? '',
      name: '${_s(m['lastName']) ?? ''} ${_s(m['firstName']) ?? ''}'.trim(),
      code: _s(m['code']),
      classroom: _s(_m(m['classroom'])['name']),
      blocks: [for (final b in _l(m['blocks'])) MonthBlock.fromJson(b)],
      owedNow: _n(m['owedNow']),
      coveredThrough: _s(m['coveredThrough']),
    );
  }

  final String id;
  final String name;
  final String? code;
  final String? classroom;
  final List<MonthBlock> blocks;
  final int? owedNow;
  final String? coveredThrough;

  /// [month]-ын блок (серверийн төлөв). Байхгүй бол null.
  MonthBlock? blockOf(String month) => blocks.where((b) => b.month == month).firstOrNull;
}

class LedgerBoard {
  const LedgerBoard({required this.month, this.classroom, this.rows = const []});

  factory LedgerBoard.fromJson(Object? j) {
    final m = _m(j);
    return LedgerBoard(
      month: _s(m['month']) ?? '',
      classroom: _s(_m(m['classroom'])['name']),
      rows: [for (final r in _l(m['rows'])) LedgerRow.fromJson(r)],
    );
  }

  final String month;
  final String? classroom;
  final List<LedgerRow> rows;
}

/// Серверийн үнийн түвшин (`PriceTier`) — ангийн 7 хоногийн өдрөөс серверт тооцсон.
class PriceTier {
  const PriceTier({required this.label, this.monthly, this.fullYear});

  factory PriceTier.fromJson(Object? j) {
    final m = _m(j);
    return PriceTier(label: _s(m['label']) ?? '', monthly: _n(m['monthly']), fullYear: _n(m['fullYear']));
  }

  final String label;
  final int? monthly;
  final int? fullYear;
}

class LedgerPayment {
  const LedgerPayment({required this.id, required this.status, this.amount, this.method, this.forMonth, this.date});

  factory LedgerPayment.fromJson(Object? j) {
    final m = _m(j);
    return LedgerPayment(
      id: _s(m['id']) ?? '',
      status: _s(m['status']) ?? '',
      amount: _n(m['amount']),
      method: _s(m['method']),
      forMonth: _s(m['forMonth']),
      date: _s(m['paidAt']) ?? _s(m['createdAt']),
    );
  }

  final String id;
  final String status;
  final int? amount;
  final String? method;
  final String? forMonth;
  final String? date;
}

class StudentLedger {
  const StudentLedger({
    required this.month,
    required this.row,
    this.tier,
    this.daysPerWeek,
    this.paidTotal,
    this.remaining,
    this.payments = const [],
  });

  factory StudentLedger.fromJson(Object? j) {
    final m = _m(j);
    final row = _m(m['row']);
    return StudentLedger(
      month: _s(m['month']) ?? '',
      row: LedgerRow.fromJson(row),
      tier: m['tier'] is Map ? PriceTier.fromJson(m['tier']) : null,
      daysPerWeek: _n(m['daysPerWeek']),
      paidTotal: _n(row['paidTotal']),
      remaining: _n(row['remaining']),
      payments: [for (final p in _l(m['payments'])) LedgerPayment.fromJson(p)],
    );
  }

  final String month;
  final LedgerRow row;
  final PriceTier? tier;

  /// Суудаг анги 7 хоногт хэдэн өдөр (үнэ үүнээс).
  final int? daysPerWeek;
  final int? paidTotal;
  final int? remaining;
  final List<LedgerPayment> payments;
}
