// `/reconcile/*` (вэбийн `admin/reconcile/types.ts`, api `reconcile.dto.ts`).
// Апп мөнгө ТООЦОХГҮЙ — дүн, автомат тулгалт, төлбөр үүсгэх бүгд серверт.
import 'dart:convert';
import 'dart:typed_data';

import '../../../core/time/ub_time.dart';

int _int(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) ?? 0 : 0);

Map<String, Object?> _map(Object? v) => v is Map ? v.cast<String, Object?>() : const {};

String? _str(Object? v) {
  final s = v?.toString().trim();
  return s == null || s.isEmpty ? null : s;
}

/// Банкны гүйлгээний тулгалтын төлөв (Prisma `BankMatchStatus`).
enum BankMatchStatus {
  unmatched('UNMATCHED', 'Тулгаагүй', 'Тулгаагүй'),
  autoMatched('AUTO_MATCHED', 'Автоматаар холбогдсон', 'Автомат'),
  manualMatched('MANUAL_MATCHED', 'Гараар холбогдсон', 'Гараар'),
  ignored('IGNORED', 'Төлбөр биш', 'Төлбөр биш'),
  unknown('', 'Тодорхойгүй', 'Тодорхойгүй');

  const BankMatchStatus(this.api, this.label, this.short);

  final String api;
  final String label;

  /// Жагсаалтын мөрийн богино шошго (утасны өргөнд багтана).
  final String short;

  /// Шүүлтүүрийн чипүүд (вэб зөвхөн тулгаагүйг харуулдаг — апп бүх төлвийг).
  static const filters = [unmatched, autoMatched, manualMatched, ignored];

  static BankMatchStatus fromApi(String? v) {
    // Вэбийн `types.ts` алдаагаар `MANUALLY_MATCHED` гэж бичсэн — хоёуланг нь таньна.
    if (v == 'MANUALLY_MATCHED') return manualMatched;
    for (final s in values) {
      if (s != unknown && s.api == v) return s;
    }
    return unknown;
  }
}

/// Гүйлгээтэй холбогдсон сурагч.
class MatchedUser {
  const MatchedUser({required this.id, required this.firstName, required this.lastName, this.phone});

  factory MatchedUser.fromJson(Map<String, Object?> j) => MatchedUser(
    id: j['id']?.toString() ?? '',
    firstName: j['firstName']?.toString() ?? '',
    lastName: j['lastName']?.toString() ?? '',
    phone: _str(j['phone']),
  );

  final String id;
  final String firstName;
  final String lastName;
  final String? phone;

  String get fullName => [lastName, firstName].where((s) => s.trim().isNotEmpty).join(' ');
}

/// `BankTransactionResponseDto`.
class BankTransaction {
  const BankTransaction({
    required this.id,
    required this.bankRef,
    required this.bookedAtIso,
    required this.amount,
    required this.description,
    required this.status,
    this.accountNo,
    this.counterparty,
    this.matchedUserId,
    this.matchedUser,
  });

  factory BankTransaction.fromJson(Object? json) {
    final j = _map(json);
    final id = j['id'];
    if (id is! String || id.isEmpty) throw const FormatException('id');
    final user = j['matchedUser'];
    return BankTransaction(
      id: id,
      bankRef: j['bankRef']?.toString() ?? '',
      bookedAtIso: j['bookedAt']?.toString() ?? '',
      amount: _int(j['amount']),
      description: j['description']?.toString() ?? '',
      accountNo: _str(j['accountNo']),
      counterparty: _str(j['counterparty']),
      status: BankMatchStatus.fromApi(j['matchStatus']?.toString()),
      matchedUserId: _str(j['matchedUserId']),
      matchedUser: user is Map ? MatchedUser.fromJson(user.cast<String, Object?>()) : null,
    );
  }

  final String id;
  final String bankRef;
  final String bookedAtIso;
  final int amount;
  final String description;
  final String? accountNo;
  final String? counterparty;
  final BankMatchStatus status;
  final String? matchedUserId;
  final MatchedUser? matchedUser;

  /// Гараар холбох, төлбөр биш гэж тэмдэглэх нь зөвхөн тулгаагүй гүйлгээнд (сервер ч шалгана).
  bool get actionable => status == BankMatchStatus.unmatched;

  UbDateTime? get bookedAt {
    final t = parseApiInstant(bookedAtIso);
    return t == null ? null : UbDateTime.fromInstant(t);
  }

  BankTransaction copyWith({BankMatchStatus? status}) => BankTransaction(
    id: id,
    bankRef: bankRef,
    bookedAtIso: bookedAtIso,
    amount: amount,
    description: description,
    accountNo: accountNo,
    counterparty: counterparty,
    status: status ?? this.status,
    matchedUserId: matchedUserId,
    matchedUser: matchedUser,
  );
}

/// `GET /reconcile/transactions` — `{ items, total }`.
class TransactionPage {
  const TransactionPage({required this.items, required this.total});

  factory TransactionPage.fromJson(Object? json) {
    final j = _map(json);
    return TransactionPage(
      items: [for (final t in (j['items'] as List?) ?? const []) BankTransaction.fromJson(t)],
      total: _int(j['total']),
    );
  }

  final List<BankTransaction> items;
  final int total;
}

/// Дээд талын тоонууд (вэбийн `SummaryCards`). Бүгд серверийн `total` — апп нэмж тооцохгүй.
class ReconcileSummary {
  const ReconcileSummary({
    required this.total,
    required this.unmatched,
    required this.autoMatched,
    required this.manualMatched,
    required this.ignored,
  });

  final int total;
  final int unmatched;
  final int autoMatched;
  final int manualMatched;
  final int ignored;

  Map<String, int> get filterCounts => {
    BankMatchStatus.unmatched.api: unmatched,
    BankMatchStatus.autoMatched.api: autoMatched,
    BankMatchStatus.manualMatched.api: manualMatched,
    BankMatchStatus.ignored.api: ignored,
  };
}

/// Импортын мөрийн алдаа.
typedef ImportRowError = ({int rowIndex, String? bankRef, String reason});

/// `POST /reconcile/import` — `ImportResultDto`.
class ImportResult {
  const ImportResult({
    required this.totalRows,
    required this.imported,
    required this.skipped,
    required this.matched,
    required this.errors,
  });

  factory ImportResult.fromJson(Object? json) {
    final j = _map(json);
    return ImportResult(
      totalRows: _int(j['totalRows']),
      imported: _int(j['imported']),
      skipped: _int(j['skipped']),
      matched: _int(j['matched']),
      errors: [
        for (final e in (j['errors'] as List?) ?? const [])
          if (e is Map)
            (
              rowIndex: _int(e['rowIndex']),
              bankRef: _str(e['bankRef']),
              reason: _str(e['reason']) ?? 'Тодорхойгүй алдаа',
            ),
      ],
    );
  }

  final int totalRows;
  final int imported;

  /// Давхардсан (өмнө импортлосон) эсвэл дебит/хоосон мөр.
  final int skipped;

  /// Утас, дүн хоёул таарч автоматаар баталгаажсан.
  final int matched;
  final List<ImportRowError> errors;
}

/// Сурагчийн код: `[B|Z|O|A][ЖЖ][АА][ДДДД]` — жишээ нь `B27120001` (PLAN-TOLBOR-CODE).
final studentCodePattern = RegExp(r'^[BZOA]\d{8}$');

/// Хайлтын бичвэр яг сурагчийн код уу (жижиг үсгийг ч зөвшөөрнө).
bool looksLikeStudentCode(String q) => studentCodePattern.hasMatch(q.trim().toUpperCase());

/// `GET /users/search?q=` — сурагч (сервер массив буцаана: id, studentCode, нэр, username).
class StudentHit {
  const StudentHit({required this.id, required this.firstName, required this.lastName, this.code, this.username});

  factory StudentHit.fromJson(Object? json) {
    final j = _map(json);
    final id = j['id'];
    if (id is! String || id.isEmpty) throw const FormatException('id');
    return StudentHit(
      id: id,
      firstName: j['firstName']?.toString() ?? '',
      lastName: j['lastName']?.toString() ?? '',
      code: _str(j['studentCode']),
      username: _str(j['username']),
    );
  }

  final String id;
  final String firstName;
  final String lastName;
  final String? code;
  final String? username;

  String get fullName => [lastName, firstName].where((s) => s.trim().isNotEmpty).join(' ');
}

/// Яг кодоор хайсан бол тэр кодтой сурагч эхэнд (бусад дараалал серверийнх).
List<StudentHit> rankStudentHits(String query, List<StudentHit> hits) {
  if (!looksLikeStudentCode(query)) return hits;
  final code = query.trim().toUpperCase();
  return [...hits.where((h) => h.code?.toUpperCase() == code), ...hits.where((h) => h.code?.toUpperCase() != code)];
}

/// Импортын файлын төрөл.
enum StatementKind { xlsx, csv }

/// Сонгосон хуулгын урьдчилсан шалгалт (сервер рүү илгээхээс өмнө, хадгалахгүй).
///
/// Сервер импортыг шууд хадгалдаг (тусдаа preview endpoint алга) тул апп илгээхээс өмнө файлын
/// төрөл, хэмжээ, Excel-ийн бүтцийг шалгаж, CSV бол эхний мөрүүдийг харуулна. Дүнг уншиж,
/// нэмж тооцохгүй — тэр нь серверийн ажил.
class StatementPreview {
  const StatementPreview._({
    required this.name,
    required this.sizeBytes,
    required this.kind,
    required this.problem,
    required this.sampleLines,
    required this.lineCount,
  });

  /// Серверийн хязгаар (`FileInterceptor` 5 MB).
  static const maxBytes = 5 * 1024 * 1024;

  /// Хаан банкны хуулгын толгой (сервер үүгээр таньна).
  static const khanHeader = 'Гүйлгээний огноо';

  static const _sampleSize = 5;

  factory StatementPreview.inspect(String name, Uint8List bytes) {
    final lower = name.toLowerCase();
    final kind = lower.endsWith('.xlsx')
        ? StatementKind.xlsx
        : lower.endsWith('.csv')
        ? StatementKind.csv
        : null;
    String? problem;
    var sample = const <String>[];
    var lines = 0;
    if (kind == null) {
      problem = 'Зөвхөн .xlsx эсвэл .csv файл оруулна';
    } else if (bytes.isEmpty) {
      problem = 'Файл хоосон байна';
    } else if (bytes.length > maxBytes) {
      problem = 'Файл 5 МБ-аас том байна';
    } else if (kind == StatementKind.xlsx) {
      // .xlsx нь zip — эхний 2 байт «PK». Үгүй бол гэмтсэн эсвэл өөр файл.
      if (bytes.length < 4 || bytes[0] != 0x50 || bytes[1] != 0x4B) {
        problem = 'Excel файл гэмтсэн эсвэл өөр төрлийн файл байна';
      }
    } else {
      final text = utf8.decode(bytes, allowMalformed: true).replaceFirst('\u{FEFF}', '');
      final all = text.split(RegExp(r'\r\n|\n|\r')).where((l) => l.trim().isNotEmpty).toList();
      lines = all.length;
      sample = all.take(_sampleSize).toList();
      if (all.isEmpty) problem = 'Файлд мөр алга';
    }
    return StatementPreview._(
      name: name,
      sizeBytes: bytes.length,
      kind: kind,
      problem: problem,
      sampleLines: sample,
      lineCount: lines,
    );
  }

  final String name;
  final int sizeBytes;
  final StatementKind? kind;

  /// Илгээх боломжгүй шалтгаан (монголоор). `null` = илгээж болно.
  final String? problem;

  /// CSV-ийн эхний мөрүүд (Excel-д хоосон).
  final List<String> sampleLines;

  /// CSV-ийн хоосон биш мөрийн тоо (Excel-д 0 — сервер тоолно).
  final int lineCount;

  bool get ok => problem == null;

  /// CSV-д Хаан банкны толгой харагдаж байгаа эсэх (Excel-д `null` — шалгах боломжгүй).
  bool? get hasKhanHeader => kind == StatementKind.csv ? sampleLines.any((l) => l.contains(khanHeader)) : null;

  String get kindLabel => switch (kind) {
    StatementKind.xlsx => 'Excel',
    StatementKind.csv => 'CSV',
    null => 'Тодорхойгүй',
  };

  /// «840 КБ», «1.2 МБ»
  String get sizeLabel {
    if (sizeBytes < 1024) return '$sizeBytes байт';
    if (sizeBytes < 1024 * 1024) return '${(sizeBytes / 1024).ceil()} КБ';
    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} МБ';
  }

  String get mimeType =>
      kind == StatementKind.csv ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}
