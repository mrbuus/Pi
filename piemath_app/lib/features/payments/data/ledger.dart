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
  const MonthBlock({
    required this.month,
    required this.state,
    this.due,
    this.paid,
    this.dueOn,
    this.paidOn,
    this.lateDays = 0,
    this.periodFrom,
    this.periodTo,
    this.extDays = 0,
  });

  factory MonthBlock.fromJson(Object? j) {
    final m = _m(j);
    final period = _m(m['period']);
    return MonthBlock(
      month: _s(m['month']) ?? '',
      state: LedgerState.fromApi(_s(m['state'])),
      due: _n(m['due']),
      paid: _n(m['paid']),
      dueOn: _s(m['dueOn']),
      paidOn: _s(m['paidOn']),
      lateDays: _n(m['lateDays']) ?? 0,
      periodFrom: _s(period['from']),
      periodTo: _s(period['to']),
      extDays: _n(m['extDays']) ?? 0,
    );
  }

  /// «2026-11».
  final String month;
  final LedgerState state;
  final int? due;
  final int? paid;
  final String? dueOn;
  final String? paidOn;

  /// Хугацаанаас хэдэн хоног хоцорч бүрэн төлөгдсөн (цагтаа бол 0).
  final int lateDays;

  /// Сар бүрийн багц: энэ төлбөрийн хамрах хугацаа (шийтийн «Хугацаа», `YYYY-MM-DD`).
  final String? periodFrom;
  final String? periodTo;

  /// Энэ сард сунгасан хоног.
  final int extDays;

  bool get hasPeriod => periodFrom != null && periodTo != null;
}

/// Төлбөрийн багц (`PlanKind`).
enum PlanKind {
  monthly('MONTHLY', 'Сар бүр'),
  fullYear('FULL_YEAR', 'Бүтэн жил'),
  installment('INSTALLMENT', 'Хагас жил');

  const PlanKind(this.api, this.label);

  final String api;
  final String label;

  static PlanKind fromApi(String? v) => values.firstWhere((k) => k.api == v, orElse: () => monthly);
}

/// Сурагчийн багц (`LedgerRow.plan`). Дүн Багш+-д null.
class LedgerPlan {
  const LedgerPlan({
    this.kind = PlanKind.monthly,
    this.guessed = false,
    this.settled = false,
    this.fee,
    this.total,
    this.autoFull = false,
    this.discounted = false,
    this.fullYearLate = false,
  });

  factory LedgerPlan.fromJson(Object? j) {
    final m = _m(j);
    return LedgerPlan(
      kind: PlanKind.fromApi(_s(m['kind'])),
      guessed: m['guessed'] == true,
      settled: m['settled'] == true,
      fee: _n(m['fee']),
      total: _n(m['total']),
      autoFull: m['autoFull'] == true,
      discounted: m['discounted'] == true,
      fullYearLate: m['fullYearLate'] == true,
    );
  }

  final PlanKind kind;

  /// Багц бүртгэгдээгүй — сервер таамагласан.
  final bool guessed;

  /// Багш+ гараар «бүтэн жил» гэж тооцсон.
  final bool settled;
  final int? fee;
  final int? total;

  /// Төлбөрөөр автоматаар бүтэн жил болсон.
  final bool autoFull;

  /// Тохирсон (хөнгөлөлттэй) бүтэн жилийн дүнгээр тооцсон (`tuitionAgreed`).
  final bool discounted;

  /// Бүтэн жилийн дүн төлсөн ч хугацаа хэтэрсэн — Багш+ шалгана.
  final bool fullYearLate;
}

class ClassStat {
  const ClassStat({
    required this.id,
    required this.name,
    this.students,
    this.expected,
    this.covered,
    this.owedStudents,
    this.owedNow,
  });

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
    this.plan = const LedgerPlan(),
    this.phone,
    this.startDate,
    this.owedMonths = 0,
    this.overdueDays = 0,
    this.paidTotal,
    this.remaining,
    this.credit,
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
      plan: LedgerPlan.fromJson(m['plan']),
      phone: _s(m['phone']),
      startDate: _s(m['startDate']),
      owedMonths: _n(m['owedMonths']) ?? 0,
      overdueDays: _n(m['overdueDays']) ?? 0,
      paidTotal: _n(m['paidTotal']),
      remaining: _n(m['remaining']),
      credit: _n(m['credit']),
    );
  }

  final String id;
  final String name;
  final String? code;
  final String? classroom;
  final List<MonthBlock> blocks;
  final int? owedNow;
  final String? coveredThrough;
  final LedgerPlan plan;
  final String? phone;

  /// Сууж эхэлсэн өдөр (`YYYY-MM-DD`).
  final String? startDate;
  final int owedMonths;
  final int overdueDays;
  final int? paidTotal;
  final int? remaining;
  final int? credit;

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
  const PriceTier({required this.label, this.monthly, this.fullYear, this.installment, this.installmentFirst});

  factory PriceTier.fromJson(Object? j) {
    final m = _m(j);
    return PriceTier(
      label: _s(m['label']) ?? '',
      monthly: _n(m['monthly']),
      fullYear: _n(m['fullYear']),
      installment: _n(m['installment']),
      installmentFirst: _n(m['installmentFirst']),
    );
  }

  final String label;
  final int? monthly;
  final int? fullYear;

  /// Хагас жилийн багц (байхгүй шатлалд null; Багш+-д ч null).
  final int? installment;
  final int? installmentFirst;

  /// Багцын үнийн жагсаалтын дүн (вэбийн `PlanDialog.priceOf`).
  int? priceOf(PlanKind k) => switch (k) {
    PlanKind.monthly => monthly,
    PlanKind.fullYear => fullYear,
    PlanKind.installment => installment ?? fullYear,
  };
}

class LedgerPayment {
  const LedgerPayment({
    required this.id,
    required this.status,
    this.amount,
    this.method,
    this.forMonth,
    this.date,
    this.paidAt,
    this.createdAt,
  });

  factory LedgerPayment.fromJson(Object? j) {
    final m = _m(j);
    return LedgerPayment(
      id: _s(m['id']) ?? '',
      status: _s(m['status']) ?? '',
      amount: _n(m['amount']),
      method: _s(m['method']),
      forMonth: _s(m['forMonth']),
      date: _s(m['paidAt']) ?? _s(m['createdAt']),
      paidAt: _s(m['paidAt']),
      createdAt: _s(m['createdAt']),
    );
  }

  final String id;
  final String status;
  final int? amount;
  final String? method;
  final String? forMonth;

  /// Төлсөн, эсвэл бүртгэсэн хугацаа (ISO).
  final String? date;
  final String? paidAt;
  final String? createdAt;
}

/// Сар бүрийн төлбөрийн хугацааны сунгалт (`extensions`).
class LedgerExtension {
  const LedgerExtension({
    required this.id,
    required this.month,
    required this.days,
    required this.reason,
    this.at,
    this.authorName,
  });

  factory LedgerExtension.fromJson(Object? j) {
    final m = _m(j);
    return LedgerExtension(
      id: _s(m['id']) ?? '',
      month: _s(m['month']) ?? '',
      days: _n(m['days']) ?? 0,
      reason: _s(m['reason']) ?? '',
      at: _s(m['at']),
      authorName: _s(m['authorName']),
    );
  }

  final String id;
  final String month;
  final int days;
  final String reason;
  final String? at;

  /// Сервер нэрийг Багш+-д «+»-тэй өгнө.
  final String? authorName;
}

/// Сарыг дүүргэсэн төлбөрийн хэсэг (`sources[month]`). Дүн Багш+-д null.
typedef BlockSource = ({String paymentId, int? amount});

class StudentLedger {
  const StudentLedger({
    required this.month,
    required this.row,
    this.tier,
    this.daysPerWeek,
    this.paidTotal,
    this.remaining,
    this.payments = const [],
    this.extensions = const [],
    this.sources = const {},
    this.amountsHidden = false,
    this.yearStart,
    this.fatherPhone,
    this.motherPhone,
  });

  factory StudentLedger.fromJson(Object? j) {
    final m = _m(j);
    final row = _m(m['row']);
    final profile = _m(m['profile']);
    final months = _l(_m(m['year'])['months']);
    return StudentLedger(
      month: _s(m['month']) ?? '',
      row: LedgerRow.fromJson(row),
      tier: m['tier'] is Map ? PriceTier.fromJson(m['tier']) : null,
      daysPerWeek: _n(m['daysPerWeek']),
      paidTotal: _n(row['paidTotal']),
      remaining: _n(row['remaining']),
      payments: [for (final p in _l(m['payments'])) LedgerPayment.fromJson(p)],
      extensions: [for (final e in _l(m['extensions'])) LedgerExtension.fromJson(e)],
      sources: {
        for (final e in _m(m['sources']).entries)
          e.key: [
            for (final x in _l(e.value))
              if (_s(_m(x)['paymentId']) case final id?) (paymentId: id, amount: _n(_m(x)['amount'])),
          ],
      },
      amountsHidden: m['amountsHidden'] == true,
      yearStart: months.isEmpty ? null : _s(months.first),
      fatherPhone: _s(profile['fatherPhone']),
      motherPhone: _s(profile['motherPhone']),
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

  /// Сар бүрийн төлбөрийн хугацааны сунгалт.
  final List<LedgerExtension> extensions;

  /// Сар бүрийг дүүргэсэн төлбөр (огноогоор хуучнаас).
  final Map<String, List<BlockSource>> sources;

  /// Сервер мөнгөн дүнг хассан (Админаас бусад).
  final bool amountsHidden;

  /// Хичээлийн жилийн эхний сар («2026-09»).
  final String? yearStart;
  final String? fatherPhone;
  final String? motherPhone;

  /// Хугацаа сунгах нь зөвхөн сар бүр төлдөг, гараар бүтэн жилд тооцоогүй сурагчид (вэб, сервер ижил).
  bool get canExtend => row.plan.kind == PlanKind.monthly && !row.plan.settled;
}
