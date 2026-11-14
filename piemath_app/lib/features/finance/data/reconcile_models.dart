// Банкны хуулга → хүүхдийн төлбөр (`/reconcile/*`, вэбийн `admin/reconcile/types.ts`,
// api `reconcile.service.ts`). Апп мөнгө ТООЦОХГҮЙ — тулгалт, ангилал, төлбөр үүсгэх, шийтэд бичих бүгд
// серверт. Энд зөвхөн задлана, вэбтэй ижил бичвэр, өнгөний ангилал гаргана.
import 'dart:typed_data';

int _int(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) ?? 0 : 0);

Map<String, Object?> _map(Object? v) => v is Map ? v.cast<String, Object?>() : const {};

List<Object?> _list(Object? v) => v is List ? v : const [];

String? _str(Object? v) {
  final s = v?.toString().trim();
  return s == null || s.isEmpty ? null : s;
}

/// Хуваарилалтын зориулалт (`AllocKind`).
enum AllocKind {
  tuition('TUITION', 'Сургалтын төлбөр'),
  social('SOCIAL', 'Нийгэм сургалт'),
  book('BOOK', 'Ном'),
  answerSheet('ANSWER_SHEET', 'Хариултын хуудас'),
  staffFine('STAFF_FINE', 'Заалны торгууль'),
  transfer('TRANSFER', 'Данс хоорондын шилжүүлэг'),
  expense('EXPENSE', 'Зарлага'),
  other('OTHER', 'Бусад');

  const AllocKind(this.api, this.label);

  final String api;
  final String label;

  /// Хүүхэдтэй холбогддог зориулалт (`STUDENT_KINDS`).
  bool get forStudent => this == tuition || this == social || this == book || this == answerSheet;

  /// Сургалтын мөнгө (математик эсвэл нийгэм) — хүүхэд заавал (`isTuitionKind`).
  bool get isTuition => this == tuition || this == social;

  static AllocKind fromApi(Object? v) => values.firstWhere((k) => k.api == v, orElse: () => other);

  /// Хуваарилах цонхны сонголт: орлогод зарлага биш, зарлагад сургалтын төлбөр биш.
  static List<AllocKind> choicesFor({required bool debit}) => [
    for (final k in values)
      if (debit ? !k.isTuition : k != expense) k,
  ];
}

/// Жагсаалт (`Lane`).
enum Lane {
  all('all', 'Бүгд', 'Хуулга хараахан ороогүй'),
  manual('manual', 'Шийдэх', 'Шийдэх гүйлгээ алга — бүгд хуваарилагдсан'),
  tuition('tuition', 'Сургалтын төлбөр', 'Сургалтын төлбөр хараахан ороогүй'),
  other('other', 'Бусад орлого', 'Ном, хариултын хуудас, торгууль энд харагдана'),
  expense('expense', 'Зарлага', 'Зарлага хараахан ороогүй'),
  sheet('sheet', 'Шийтэд хөтлөгдсөн', 'Ажилтны шийтэд хөтөлсөн гэж тэмдэглэсэн гүйлгээ энд харагдана');

  const Lane(this.api, this.label, this.empty);

  final String api;
  final String label;

  /// Хоосон жагсаалтын бичвэр.
  final String empty;

  static Lane fromApi(String? v) => values.firstWhere((l) => l.api == v, orElse: () => all);
}

/// Хүүхдийн утас (өөрийн, аав, ээж) — тулгахад.
typedef LabeledPhone = ({String label, String value});

/// Хүүхдийн товч мэдээлэл (`StudentCard`).
class StudentCard {
  const StudentCard({
    required this.id,
    required this.name,
    this.classroom,
    this.archived = false,
    this.phones = const [],
    this.paidUp = false,
  });

  factory StudentCard.fromJson(Object? json) {
    final j = _map(json);
    return StudentCard(
      id: _str(j['id']) ?? '',
      name: _str(j['name']) ?? 'Хүүхэд',
      classroom: _str(j['classroom']),
      archived: j['archived'] == true,
      phones: [
        for (final p in _list(j['phones']))
          if (_str(_map(p)['value']) case final v?) (label: _str(_map(p)['label']) ?? '', value: v),
      ],
      paidUp: j['paidUp'] == true,
    );
  }

  final String id;
  final String name;
  final String? classroom;

  /// Сургалтаас гарсан.
  final bool archived;
  final List<LabeledPhone> phones;

  /// Хайлтад: жилийн сургалтын төлбөрөө бүрэн төлсөн.
  final bool paidUp;

  /// Нэр, анги, «Гарсан», «Бүтэн төлсөн» (вэбийн `Meta`).
  List<String?> get meta => [name, classroom, if (archived) 'Гарсан', if (paidUp) 'Бүтэн төлсөн'];
}

/// Тулгалтын баримт (`MatchSignal`) — хүний хэлээр.
const signalLabels = <String, String>{
  'PHONE': 'утас таарсан',
  'PHONE_LEARNED': 'энэ утаснаас өмнө төлсөн',
  'ACCOUNT': 'энэ данснаас өмнө төлсөн',
  'ACCOUNT_LEARNED': 'энэ данснаас өмнө төлсөн',
  'NAME': 'нэр таарсан',
  'SURNAME': 'овог таарсан',
};

/// Шийтэд бүртгэгдсэн, ±3 хоногийн, хуулгатай холбогдоогүй төлбөр.
typedef SheetPay = ({int amount, String date});

/// Санал болгосон хүүхэд (`Candidate`).
class Candidate {
  const Candidate({
    required this.studentId,
    this.score = 0,
    this.signals = const [],
    this.student,
    this.sheetPays = const [],
  });

  factory Candidate.fromJson(Object? json) {
    final j = _map(json);
    return Candidate(
      studentId: _str(j['studentId']) ?? '',
      score: _int(j['score']),
      signals: [for (final s in _list(j['signals'])) ?_str(s)],
      student: j['student'] is Map ? StudentCard.fromJson(j['student']) : null,
      sheetPays: [
        for (final p in _list(j['sheetPays']))
          if (_str(_map(p)['date']) case final d?) (amount: _int(_map(p)['amount']), date: d),
      ],
    );
  }

  final String studentId;
  final int score;
  final List<String> signals;
  final StudentCard? student;
  final List<SheetPay> sheetPays;

  /// «утас таарсан, нэр таарсан» — давхардалгүй (вэбийн `signals`).
  String get signalText => {for (final s in signals) ?signalLabels[s]}.join(', ');
}

/// Яагаад хүн шийдэх хэрэгтэй болсныг товч хэлнэ (вэбийн `DECISION_HINT`).
const decisionHints = <String, String>{
  'SUGGEST': 'Зөвхөн нэг баримтаар танисан тул систем өөрөө оноогоогүй — зөв бол хүүхэд дээр дарна уу',
  'CHOOSE': 'Хэд хэдэн хүүхэд тохирч байна — утас, ангийг нь харьцуулаад зөвийг нь дарна уу',
  'NONE': 'Хүүхэд танигдсангүй — «Хүүхэд хайж оноох»-оор нэр, утсаар хайна уу',
};

/// Хуваах санал (`split`).
typedef SplitPart = ({AllocKind kind, int amount});

/// Серверийн санал (`Suggestion`).
class Suggestion {
  const Suggestion({
    required this.decision,
    required this.kind,
    required this.kindLabel,
    this.confident = false,
    this.split,
    this.reason = '',
    this.unrecorded = false,
    this.hiddenPaidUp = 0,
    this.candidates = const [],
  });

  static Suggestion? fromJson(Object? json) {
    if (json is! Map) return null;
    final j = _map(json);
    final kind = AllocKind.fromApi(j['kind']);
    final split = j['split'];
    return Suggestion(
      decision: _str(j['decision']) ?? 'NONE',
      kind: kind,
      kindLabel: _str(j['kindLabel']) ?? kind.label,
      confident: j['confident'] == true,
      split: split is List
          ? [for (final p in split) (kind: AllocKind.fromApi(_map(p)['kind']), amount: _int(_map(p)['amount']))]
          : null,
      reason: _str(j['reason']) ?? '',
      unrecorded: j['unrecorded'] == true,
      hiddenPaidUp: _int(j['hiddenPaidUp']),
      candidates: [for (final c in _list(j['candidates'])) Candidate.fromJson(c)],
    );
  }

  /// `AUTO | SUGGEST | CHOOSE | SPLIT | NONE`.
  final String decision;
  final AllocKind kind;
  final String kindLabel;
  final bool confident;
  final List<SplitPart>? split;
  final String reason;

  /// Шийтэд бүртгэгдээгүй — батлахад шинэ төлбөр болно.
  final bool unrecorded;

  /// Жилийн төлбөрөө бүрэн төлсөн тул саналаас хассан хүүхдийн тоо.
  final int hiddenPaidUp;
  final List<Candidate> candidates;

  /// Вэбтэй ижил: `split` ирсэн (хоосон ч) эсвэл `SPLIT` шийдвэр.
  bool get needsSplit => split != null || decision == 'SPLIT';

  /// Шалтгааныг зориулалтын шошготой давхардуулахгүй харуулах эсэх (вэбийн нөхцөл).
  bool get showReason => reason.isNotEmpty && reason != kindLabel && !reason.startsWith('$kindLabel:');
}

/// Хийсэн хуваарилалт (`Allocation`).
class Allocation {
  const Allocation({
    required this.id,
    required this.kind,
    required this.kindLabel,
    required this.amount,
    this.studentId,
    this.student,
    this.auto = false,
    this.inSheet = false,
  });

  factory Allocation.fromJson(Object? json) {
    final j = _map(json);
    final kind = AllocKind.fromApi(j['kind']);
    return Allocation(
      id: _str(j['id']) ?? '',
      kind: kind,
      kindLabel: _str(j['kindLabel']) ?? kind.label,
      amount: _int(j['amount']),
      studentId: _str(j['studentId']),
      student: j['student'] is Map ? StudentCard.fromJson(j['student']) : null,
      auto: j['auto'] == true,
      inSheet: j['inSheet'] == true,
    );
  }

  final String id;
  final AllocKind kind;
  final String kindLabel;
  final int amount;
  final String? studentId;
  final StudentCard? student;

  /// Систем автоматаар оноосон.
  final bool auto;

  /// Шийтээс аль хэдийн орсон төлбөртэй холбосон.
  final bool inSheet;
}

/// Харьцсан данс: эзэмшигч, энэ данснаас ирсэн гүйлгээний тоо, өмнө оноосон хүүхэд.
class AccountInfo {
  const AccountInfo({this.owner, this.txCount = 0, this.students = const []});

  static AccountInfo? fromJson(Object? json) {
    if (json is! Map) return null;
    final j = _map(json);
    return AccountInfo(
      owner: _str(j['owner']),
      txCount: _int(j['txCount']),
      students: [for (final s in _list(j['students'])) StudentCard.fromJson(s)],
    );
  }

  final String? owner;
  final int txCount;
  final List<StudentCard> students;
}

/// Систем шийтэд бичсэн үр дүн (`SheetWrite`).
class SheetWrite {
  const SheetWrite({required this.studentId, required this.ok, this.cell, this.month, this.reason});

  factory SheetWrite.fromJson(Object? json) {
    final j = _map(json);
    return SheetWrite(
      studentId: _str(j['studentId']) ?? '',
      ok: j['ok'] == true,
      cell: _str(j['cell']),
      month: _str(j['month']),
      reason: _str(j['reason']),
    );
  }

  final String studentId;
  final bool ok;
  final String? cell;
  final String? month;
  final String? reason;

  int get _monthNo => month != null && month!.length >= 7 ? int.tryParse(month!.substring(5, 7)) ?? 0 : 0;

  /// «Шийтэд бичлээ: E12 нүд, 11-р сар» / «Шийтэд бичсэнгүй: …» (вэбийн `sheetWriteText`).
  String get text => ok ? 'Шийтэд бичлээ: $cell нүд, $_monthNo-р сар' : 'Шийтэд бичсэнгүй: ${reason ?? ''}';

  /// Мөрийн доорх тэмдэглэл (вэбийн `sheetNote`).
  String get note => ok ? 'Шийтэд бичсэн: $cell нүд, $_monthNo-р сар' : 'Шийтэд бичээгүй: ${reason ?? ''}';
}

/// Хэд хэдэн бичилтийг «; »-ээр нэг мөрөнд. Хоосон бол `null`.
String? sheetWriteText(List<SheetWrite> ws) => ws.isEmpty ? null : ws.map((w) => w.text).join('; ');

/// Гүйлгээний төлөв — «Бүгд» жагсаалтад өнгө + шошгоор ялгана (вэбийн `RowTone`).
enum RowTone {
  auto('Сургалтын төлбөр, автоматаар'),
  done('Сургалтын төлбөр, гараар'),
  open('Шийдэх'),
  sheet('Шийтэд хөтлөгдсөн'),
  other('Бусад орлого'),
  expense('Зарлага');

  const RowTone(this.label);

  final String label;
}

/// Банкны нэг гүйлгээ (`BankRow`).
class BankRow {
  const BankRow({
    required this.id,
    required this.bookedAt,
    required this.amount,
    required this.debit,
    required this.description,
    this.counterparty,
    this.account,
    this.resolvedAt,
    this.resolvedBySystem = false,
    this.inSheet = false,
    this.sheetMissing = false,
    this.sheetWrites = const [],
    this.suggestion,
    this.allocations = const [],
  });

  factory BankRow.fromJson(Object? json) {
    final j = _map(json);
    final id = _str(j['id']);
    if (id == null) throw const FormatException('id');
    return BankRow(
      id: id,
      bookedAt: _str(j['bookedAt']) ?? '',
      amount: _int(j['amount']),
      debit: j['direction'] == 'DEBIT',
      description: j['description']?.toString() ?? '',
      counterparty: _str(j['counterparty']),
      account: AccountInfo.fromJson(j['account']),
      resolvedAt: _str(j['resolvedAt']),
      resolvedBySystem: j['resolvedBySystem'] == true,
      inSheet: j['inSheet'] == true,
      sheetMissing: j['sheetMissing'] == true,
      sheetWrites: [for (final w in _list(j['sheetWrites'])) SheetWrite.fromJson(w)],
      suggestion: Suggestion.fromJson(j['suggestion']),
      allocations: [for (final a in _list(j['allocations'])) Allocation.fromJson(a)],
    );
  }

  final String id;

  /// ISO хугацаа.
  final String bookedAt;
  final int amount;

  /// Зарлага (`DEBIT`).
  final bool debit;
  final String description;
  final String? counterparty;
  final AccountInfo? account;
  final String? resolvedAt;
  final bool resolvedBySystem;

  /// Ажилтан шийтэд хөтөлсөн гэж тэмдэглэгдсэн.
  final bool inSheet;

  /// Шийтэд ижил дүнтэй ±3 хоногийн бүртгэл олдсонгүй — шалгах.
  final bool sheetMissing;
  final List<SheetWrite> sheetWrites;
  final Suggestion? suggestion;
  final List<Allocation> allocations;

  /// Шийдэгдээгүй.
  bool get open => resolvedAt == null;

  RowTone get tone {
    if (open) return RowTone.open;
    if (inSheet) return RowTone.sheet;
    if (debit) return RowTone.expense;
    if (allocations.any((a) => a.kind.isTuition)) return resolvedBySystem ? RowTone.auto : RowTone.done;
    return RowTone.other;
  }

  /// Утга ба илгээгч (Хаан банк «… ХААНААС: 150000 НЭР ОВОГ» гэж залгадаг).
  ({String main, String? sender}) get parts => splitSender(description);

  /// Санал болгосон хүүхдийн зориулалт (хүүхдийн бус бол «Сургалтын төлбөр»).
  AllocKind get kidKind => suggestion != null && suggestion!.kind.forStudent ? suggestion!.kind : AllocKind.tuition;

  /// Нэг товшилтоор хүүхэд дээр батлах боломжтой (хуваах шаардлагагүй, орлого).
  bool get canQuickKid => open && suggestion != null && !suggestion!.needsSplit && !debit;

  bool get needsSplit => open && (suggestion?.needsSplit ?? false);

  /// «Ном гэж батлах» гэх мэт хүүхэдгүй нэг товшилт.
  AllocKind? get nonKidKind {
    final s = suggestion;
    if (!open || s == null || s.kind.forStudent || s.split != null) return null;
    return s.kind;
  }

  /// Хуваарилалтын шийттэй холбоо: ажилтны бичлэгтэй холбосон, систем аль нүдэнд бичсэн, эсвэл яагаад бичээгүй.
  String sheetNote(String? studentId, {required bool inSheet}) {
    if (inSheet) return 'Ажилтны шийтийн бичлэгтэй холбосон';
    final w = sheetWrites.where((x) => x.studentId == studentId).firstOrNull;
    return w?.note ?? 'Шинэ төлбөр';
  }

  /// Санал болгосон хүүхдийн шийтийн ойрын төлбөр.
  List<SheetPay> sheetPaysOf(String? studentId) =>
      suggestion?.candidates.where((c) => c.studentId == studentId).firstOrNull?.sheetPays ?? const [];
}

/// Гүйлгээний утга дахь 8 оронтой дугаарууд — хүүхдийн утастай шууд харьцуулна.
Set<String> phonesInText(String text) => {for (final m in RegExp(r'(?<!\d)\d{8}(?!\d)').allMatches(text)) m.group(0)!};

/// Хаан банк утганд илгээгчийг залгадаг: «… ХААНААС: 150000 НЭР ОВОГ» — утга ба илгээгчийг салгана.
({String main, String? sender}) splitSender(String text) {
  final m = RegExp(r'ХААНААС:?\s*\d*\s*', caseSensitive: false, unicode: true).firstMatch(text);
  if (m == null) return (main: text.trim(), sender: null);
  final sender = text.substring(m.end).trim();
  return (main: text.substring(0, m.start).trim(), sender: sender.isEmpty ? null : sender);
}

/// `GET /reconcile/rows` — `{ items, total }`.
class RowPage {
  const RowPage({required this.items, required this.total});

  factory RowPage.fromJson(Object? json) {
    final j = _map(json);
    return RowPage(items: [for (final r in _list(j['items'])) BankRow.fromJson(r)], total: _int(j['total']));
  }

  final List<BankRow> items;
  final int total;
}

/// Дансны курсор: бүрэн шийдсэн, хуулга хамарсан, ажилтан шийтэд бичсэн өдөр (`YYYY-MM-DD`).
class BankCursor {
  const BankCursor({required this.accountNo, this.settledThrough, this.coveredThrough, this.sheetThrough});

  factory BankCursor.fromJson(Object? json) {
    final j = _map(json);
    return BankCursor(
      accountNo: _str(j['accountNo']) ?? '',
      settledThrough: _str(j['settledThrough']),
      coveredThrough: _str(j['coveredThrough']),
      sheetThrough: _str(j['sheetThrough']),
    );
  }

  final String accountNo;
  final String? settledThrough;
  final String? coveredThrough;
  final String? sheetThrough;
}

/// `GET /reconcile/overview`.
class ReconcileOverview {
  const ReconcileOverview({
    this.cursors = const [],
    this.counts = const {},
    this.sheetCheck = 0,
    this.lastImportAt,
    this.sheetWriteDemo,
  });

  factory ReconcileOverview.fromJson(Object? json) {
    final j = _map(json);
    final c = _map(j['counts']);
    final sw = j['sheetWrite'];
    return ReconcileOverview(
      cursors: [for (final x in _list(j['cursors'])) BankCursor.fromJson(x)],
      counts: {for (final l in Lane.values) l: _int(c[l.api])},
      sheetCheck: _int(j['sheetCheck']),
      lastImportAt: _str(j['lastImportAt']),
      sheetWriteDemo: sw is Map ? sw['demo'] == true : null,
    );
  }

  final List<BankCursor> cursors;
  final Map<Lane, int> counts;

  /// Шийтэд хөтлөгдсөн гэж нуусан ч шийтэд байгааг баталж чадаагүй.
  final int sheetCheck;
  final String? lastImportAt;

  /// Гараар оноосон сургалтын төлбөрийг шийтэд бичих горим: `true` демо (хуулбар), `false` жинхэнэ,
  /// `null` бичихгүй.
  final bool? sheetWriteDemo;

  BankCursor? get cursor => cursors.firstOrNull;
  int count(Lane l) => counts[l] ?? 0;
}

/// `POST /reconcile/import` — серверийн дүн.
class ImportSummary {
  const ImportSummary({
    required this.rows,
    required this.newRows,
    required this.duplicates,
    required this.beforeSettled,
    required this.autoResolved,
    required this.inSheet,
    required this.open,
  });

  factory ImportSummary.fromJson(Object? json) {
    final j = _map(json);
    return ImportSummary(
      rows: _int(j['rows']),
      newRows: _int(j['newRows']),
      duplicates: _int(j['duplicates']),
      beforeSettled: _int(j['beforeSettled']),
      autoResolved: _int(j['autoResolved']),
      inSheet: _int(j['inSheet']),
      open: _int(j['open']),
    );
  }

  final int rows;
  final int newRows;
  final int duplicates;
  final int beforeSettled;
  final int autoResolved;
  final int inSheet;
  final int open;

  /// Вэбийн импортын дараах бичвэр. Алгассан тоо = давхардсан + өмнө орсон (серверийн тоо, нэмэх л).
  String get text =>
      'Хуулгад $rows гүйлгээ: шинээр $newRows орж, ${duplicates + beforeSettled} нь өмнө орсон тул алгасагдлаа. '
      'Автоматаар $autoResolved шийдэгдэж, $open гүйлгээ шийдэх жагсаалтад байна';
}

/// Хуваарилалтын нэг хэсэг (`AllocPart`).
class AllocPart {
  const AllocPart({required this.kind, required this.amount, this.studentId});

  final AllocKind kind;
  final int amount;
  final String? studentId;

  Map<String, Object?> toJson() => {
    'kind': kind.api,
    'amount': amount,
    if (kind.forStudent && studentId != null) 'studentId': studentId,
  };
}

/// `POST /reconcile/rows/:id/allocate` хариу.
class AllocateResult {
  const AllocateResult({this.alsoResolved = 0, this.sheetWrites = const []});

  factory AllocateResult.fromJson(Object? json) {
    final j = _map(json);
    return AllocateResult(
      alsoResolved: _int(j['alsoResolved']),
      sheetWrites: [for (final w in _list(j['sheetWrites'])) SheetWrite.fromJson(w)],
    );
  }

  /// Сурсан данс, утсаар нэмж шийдэгдсэн гүйлгээ.
  final int alsoResolved;
  final List<SheetWrite> sheetWrites;
}

/// «⋯» дэлгэрэнгүйн хуулгын нэг мөр (`StudentDetail.bank`).
class BankItem {
  const BankItem({
    required this.id,
    required this.bankTxId,
    required this.kind,
    required this.kindLabel,
    required this.amount,
    required this.txAmount,
    required this.bookedAt,
    this.description = '',
    this.sender,
    this.counterparty,
    this.auto = false,
    this.paymentId,
    this.inSheet = false,
  });

  factory BankItem.fromJson(Object? json) {
    final j = _map(json);
    final kind = AllocKind.fromApi(j['kind']);
    return BankItem(
      id: _str(j['id']) ?? '',
      bankTxId: _str(j['bankTxId']) ?? '',
      kind: kind,
      kindLabel: _str(j['kindLabel']) ?? kind.label,
      amount: _int(j['amount']),
      txAmount: _int(j['txAmount']),
      bookedAt: _str(j['bookedAt']) ?? '',
      description: j['description']?.toString() ?? '',
      sender: _str(j['sender']),
      counterparty: _str(j['counterparty']),
      auto: j['auto'] == true,
      paymentId: _str(j['paymentId']),
      inSheet: j['inSheet'] == true,
    );
  }

  final String id;
  final String bankTxId;
  final AllocKind kind;
  final String kindLabel;

  /// Энэ хүүхдэд оноосон хэсэг.
  final int amount;

  /// Гүйлгээний бүтэн дүн.
  final int txAmount;
  final String bookedAt;
  final String description;
  final String? sender;
  final String? counterparty;
  final bool auto;
  final String? paymentId;
  final bool inSheet;

  /// Хэд хэдэн хэсэгт хуваасан гүйлгээ.
  bool get partial => txAmount != amount;
}

/// Хүүхдэд төлдөг данс, утас (систем сурсан).
typedef PayerHint = ({String kind, String value, int count});

/// `GET /reconcile/students/:id`.
class StudentDetail {
  const StudentDetail({
    required this.student,
    this.phone,
    this.fatherPhone,
    this.motherPhone,
    this.school,
    this.grade,
    this.bank = const [],
    this.payers = const [],
  });

  factory StudentDetail.fromJson(Object? json) {
    final j = _map(json);
    final s = _map(j['student']);
    return StudentDetail(
      student: StudentCard.fromJson(s),
      phone: _str(s['phone']),
      fatherPhone: _str(s['fatherPhone']),
      motherPhone: _str(s['motherPhone']),
      school: _str(s['school']),
      grade: s['grade'] is num ? (s['grade']! as num).toInt() : null,
      bank: [for (final b in _list(j['bank'])) BankItem.fromJson(b)],
      payers: [
        for (final p in _list(j['payers']))
          if (_str(_map(p)['value']) case final v?)
            (kind: _str(_map(p)['kind']) ?? 'ACCOUNT', value: v, count: _int(_map(p)['count'])),
      ],
    );
  }

  final StudentCard student;
  final String? phone;
  final String? fatherPhone;
  final String? motherPhone;
  final String? school;
  final int? grade;
  final List<BankItem> bank;
  final List<PayerHint> payers;

  List<LabeledPhone> get contacts => [
    if (phone != null) (label: 'Өөрийн', value: phone!),
    if (fatherPhone != null) (label: 'Аав', value: fatherPhone!),
    if (motherPhone != null) (label: 'Ээж', value: motherPhone!),
  ];
}

/// Хуваарилах цонхны нэг хэсгийн ноорог.
class AllocDraft {
  AllocDraft({required this.kind, required this.amount, this.student});

  AllocKind kind;

  /// Төгрөг (хэрэглэгчийн оруулсан).
  int amount;
  StudentCard? student;

  AllocPart toPart() => AllocPart(kind: kind, amount: amount, studentId: kind.forStudent ? student?.id : null);
}

/// Саналаас эхлэх хуваалт (вэбийн `initialDrafts`). Ах дүүгийн хамтын шилжүүлэгт ажилтан шийтэд
/// бүртгэсэн дүнгүүд байвал тэдгээрээр; үгүй бол тэнцүү хувааж «санал» гэж тэмдэглэнэ ([guessed]) —
/// хүн бодит дүнгээ оруулна. Энэ бол ЗӨВХӨН маягтын эхний утга: нийлбэрийг сервер шалгана.
({List<AllocDraft> drafts, bool guessed}) initialDrafts(BankRow row) {
  final s = row.suggestion;
  final cands = [
    for (final c in s?.candidates ?? const <Candidate>[])
      if (c.student != null) c,
  ];
  final kids = [for (final c in cands) c.student!];
  final split = s?.split;
  if (split != null && split.isNotEmpty) {
    return (
      drafts: [
        for (final p in split)
          AllocDraft(kind: p.kind, amount: p.amount, student: p.kind.forStudent ? kids.firstOrNull : null),
      ],
      guessed: false,
    );
  }
  if (s?.decision == 'SPLIT' && kids.length >= 2) {
    final kind = s!.kind == AllocKind.social ? AllocKind.social : AllocKind.tuition;
    final sheet = [for (final c in cands) c.sheetPays.length == 1 ? c.sheetPays.first.amount : null];
    if (sheet.every((x) => x != null)) {
      final sum = sheet.fold<int>(0, (t, x) => t + x!);
      if (sum <= row.amount) {
        return (
          drafts: [
            for (var i = 0; i < cands.length; i++) AllocDraft(kind: kind, amount: sheet[i]!, student: cands[i].student),
            if (row.amount - sum > 0) AllocDraft(kind: AllocKind.other, amount: row.amount - sum),
          ],
          guessed: false,
        );
      }
    }
    final each = (row.amount / kids.length / 1000).floor() * 1000;
    return (
      drafts: [
        for (var i = 0; i < kids.length; i++)
          AllocDraft(
            kind: kind,
            amount: i == kids.length - 1 ? row.amount - each * (kids.length - 1) : each,
            student: kids[i],
          ),
      ],
      guessed: true,
    );
  }
  final kind = row.debit ? AllocKind.expense : (s?.kind ?? AllocKind.tuition);
  return (
    drafts: [
      AllocDraft(kind: kind, amount: row.amount, student: kind.forStudent && kids.length == 1 ? kids.first : null),
    ],
    guessed: false,
  );
}

/// Сонгосон хуулгын урьдчилсан шалгалт (сервер рүү илгээхээс өмнө, хадгалахгүй).
///
/// Сервер зөвхөн Хаан банкнаас татсан `.xlsx`-ийг хүлээн авна (5 МБ). Апп файлын төрөл, хэмжээ, Excel-ийн
/// бүтцийг (zip «PK») шалгана — гүйлгээг уншиж, дүн тооцохгүй.
class StatementPreview {
  const StatementPreview._({required this.name, required this.sizeBytes, required this.problem});

  /// Серверийн хязгаар (`FileInterceptor` 5 MB).
  static const maxBytes = 5 * 1024 * 1024;

  static const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  factory StatementPreview.inspect(String name, Uint8List bytes) {
    String? problem;
    if (!name.toLowerCase().endsWith('.xlsx')) {
      problem = 'Хаан банкнаас татсан .xlsx хуулга оруулна уу';
    } else if (bytes.isEmpty) {
      problem = 'Файл хоосон байна';
    } else if (bytes.length > maxBytes) {
      problem = 'Файл 5 МБ-аас том байна';
    } else if (bytes.length < 4 || bytes[0] != 0x50 || bytes[1] != 0x4B) {
      problem = 'Excel файл гэмтсэн эсвэл өөр төрлийн файл байна';
    }
    return StatementPreview._(name: name, sizeBytes: bytes.length, problem: problem);
  }

  final String name;
  final int sizeBytes;

  /// Илгээх боломжгүй шалтгаан (монголоор). `null` = илгээж болно.
  final String? problem;

  bool get ok => problem == null;

  /// «840 КБ», «1.2 МБ»
  String get sizeLabel {
    if (sizeBytes < 1024) return '$sizeBytes байт';
    if (sizeBytes < 1024 * 1024) return '${(sizeBytes / 1024).ceil()} КБ';
    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} МБ';
  }
}
