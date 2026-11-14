// Зохиомол өгөгдөл (жинхэнэ сурагч, ажилтан, гүйлгээ биш). Дүн нь серверийн хариу — тест юу ч тооцохгүй.
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/finance/application/finance_providers.dart';
import 'package:piemath_app/features/finance/application/statement_picker.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';

const capsWithFinance = {
  'administrator': false,
  'grants': [
    {'id': 'implicit:finance.manage', 'capability': 'finance.manage', 'scopeKey': '', 'expiresAt': null},
  ],
};

const capsWithoutFinance = {
  'administrator': false,
  'grants': [
    {'id': 'g1', 'capability': 'payroll.view', 'scopeKey': '', 'expiresAt': null},
  ],
};

Map<String, Object?> reportJson({String period = '2026-11', int net = 1200000, int? change = 200000, int recon = 0}) =>
    {
      'period': period,
      'income': {'trainingFees': 2500000, 'exams': 300000, 'books': 150000, 'other': 50000},
      'totalIncome': 3000000,
      'expenses': {
        'salary': 1000000,
        'rent': 500000,
        'utilities': 100000,
        'marketing': 0,
        'materials': 200000,
        'equipment': 0,
        'other': 0,
      },
      'totalExpenses': 1800000,
      'netProfit': net,
      'previousNetProfit': change == null ? null : net - change,
      'profitChange': change,
      'incomeReconciliationRequired': recon,
    };

Map<String, Object?> expenseJson({
  String id = 'e1',
  int amount = 500000,
  String category = 'RENT',
  String? description = 'Арваннэгдүгээр сарын түрээс',
  String occurredOn = '2026-11-02T00:00:00.000Z',
}) => {
  'id': id,
  'amount': amount,
  'category': category,
  'description': description,
  'occurredOn': occurredOn,
  'createdBy': {'id': 'u2', 'firstName': 'Сараа', 'lastName': 'Ажилтан', 'role': 'TEACHER_PLUS'},
};

/// Хүүхдийн товч (`StudentCard`) — зохиомол нэр, утас.
Map<String, Object?> kidJson({
  String id = 'k1',
  String name = 'Тестийн Болд',
  String? classroom = '12Б',
  bool archived = false,
  bool paidUp = false,
  List<Map<String, Object?>> phones = const [
    {'label': 'Өөрийн', 'value': '99001122'},
    {'label': 'Ээж', 'value': '88112233'},
  ],
}) => {'id': id, 'name': name, 'classroom': classroom, 'archived': archived, 'phones': phones, 'paidUp': paidUp};

Map<String, Object?> candJson({
  String studentId = 'k1',
  List<String> signals = const ['PHONE', 'NAME', 'NAME'],
  Map<String, Object?>? student,
  List<Map<String, Object?>> sheetPays = const [],
}) => {
  'studentId': studentId,
  'score': 80,
  'signals': signals,
  'student': student ?? kidJson(id: studentId),
  'sheetPays': sheetPays,
};

Map<String, Object?> suggestionJson({
  String decision = 'SUGGEST',
  String kind = 'TUITION',
  String? kindLabel,
  String reason = 'Сургалтын төлбөр',
  List<Map<String, Object?>>? candidates,
  List<Map<String, Object?>>? split,
  bool unrecorded = false,
  int hiddenPaidUp = 0,
}) => {
  'decision': decision,
  'kind': kind,
  'kindLabel':
      kindLabel ??
      switch (kind) {
        'BOOK' => 'Ном',
        'TRANSFER' => 'Данс хоорондын шилжүүлэг',
        'SOCIAL' => 'Нийгэм сургалт',
        'EXPENSE' => 'Зарлага',
        _ => 'Сургалтын төлбөр',
      },
  'confident': false,
  'split': split,
  'reason': reason,
  'unrecorded': unrecorded,
  'hiddenPaidUp': hiddenPaidUp,
  'candidates': candidates ?? [candJson()],
};

/// Банкны мөр (`/reconcile/rows` item).
Map<String, Object?> rowJson({
  String id = 'r1',
  int amount = 350000,
  String direction = 'CREDIT',
  String description = '99001122 Болд сургалт ХААНААС: 350000 ТЕСТИЙН БОЛД',
  String? counterparty = '5000123456',
  Map<String, Object?>? account,
  String? resolvedAt,
  bool resolvedBySystem = false,
  bool inSheet = false,
  bool sheetMissing = false,
  List<Map<String, Object?>> sheetWrites = const [],
  Object? suggestion = const {},
  List<Map<String, Object?>> allocations = const [],
}) => {
  'id': id,
  'bookedAt': '2026-11-03T04:20:00.000Z',
  'amount': amount,
  'direction': direction,
  'description': description,
  'counterparty': counterparty,
  'account': account,
  'resolvedAt': resolvedAt,
  'resolvedBySystem': resolvedBySystem,
  'inSheet': inSheet,
  'sheetMissing': sheetMissing,
  'sheetWrites': sheetWrites,
  'suggestion': suggestion is Map && suggestion.isEmpty ? suggestionJson() : suggestion,
  'allocations': allocations,
};

Map<String, Object?> allocJson({
  String id = 'a1',
  String kind = 'TUITION',
  int amount = 350000,
  String? studentId = 'k1',
  bool auto = false,
  bool inSheet = false,
}) => {
  'id': id,
  'kind': kind,
  'kindLabel': kind == 'TUITION' ? 'Сургалтын төлбөр' : 'Ном',
  'amount': amount,
  'studentId': studentId,
  'student': studentId == null ? null : kidJson(id: studentId),
  'auto': auto,
  'inSheet': inSheet,
};

Map<String, Object?> overviewJson({
  Map<String, int>? counts,
  int sheetCheck = 0,
  String? sheetThrough,
  bool cursor = true,
  Map<String, Object?>? sheetWrite,
}) => {
  'cursors': [
    if (cursor)
      {
        'accountNo': '5000',
        'settledThrough': '2026-11-01',
        'coveredThrough': '2026-11-12',
        'sheetThrough': sheetThrough,
      },
  ],
  'counts': counts ?? {'all': 12, 'manual': 3, 'tuition': 6, 'other': 2, 'expense': 1, 'sheet': 0},
  'sheetCheck': sheetCheck,
  'lastImportAt': null,
  'sheetWrite': sheetWrite,
};

Map<String, Object?> rowsPage(List<Map<String, Object?>> items, {int? total}) => {
  'items': items,
  'total': total ?? items.length,
};

/// Хуулгын API: overview + rows (lane-аар). [rows] нь lane → хуудсууд.
FakeHttp reconcileHttp({Map<String, Object?>? overview, Map<String, List<Map<String, Object?>>> rows = const {}}) {
  final h = FakeHttp()..json('GET', '/reconcile/overview', overview ?? overviewJson());
  h.on('GET', '/reconcile/rows', (r) {
    final lane = r.queryParameters['lane']?.toString() ?? 'all';
    return FakeResponse(rowsPage(rows[lane] ?? const []));
  });
  return h;
}

/// Мөрийн хүсэлтүүдийн query.
Iterable<Map<String, dynamic>> rowQueries(FakeHttp h) =>
    h.requests.where((r) => r.path == '/reconcile/rows').map((r) => r.queryParameters);

Map<String, Object?> detailJson({
  String id = 'k1',
  List<Map<String, Object?>>? bank,
  List<Map<String, Object?>> payers = const [
    {'kind': 'ACCOUNT', 'value': '5000123456', 'count': 3},
  ],
}) => {
  'student': {
    ...kidJson(id: id),
    'phone': '99001122',
    'fatherPhone': null,
    'motherPhone': '88112233',
    'guardianNote': null,
    'school': '1-р сургууль',
    'grade': 12,
    'branch': null,
  },
  'bank':
      bank ??
      [
        {
          'id': 'al1',
          'bankTxId': 'r9',
          'kind': 'TUITION',
          'kindLabel': 'Сургалтын төлбөр',
          'amount': 350000,
          'txAmount': 700000,
          'bookedAt': '2026-10-04T02:00:00.000Z',
          'description': 'Болд сургалт',
          'sender': 'ТЕСТИЙН БОЛД',
          'counterparty': '5000123456',
          'auto': false,
          'paymentId': 'bank_p1',
          'inSheet': false,
        },
      ],
  'payers': payers,
};

/// Сурагчийн ledger (сар бүрийн багц, хугацаа, сунгалт).
Map<String, Object?> ledgerJson({
  String kind = 'MONTHLY',
  bool hidden = false,
  bool settled = false,
  List<Map<String, Object?>> extensions = const [],
}) => {
  'year': {
    'id': '2026',
    'months': ['2026-09', '2026-10', '2026-11'],
  },
  'today': '2026-11-04',
  'month': '2026-11',
  'row': {
    'id': 'k1',
    'firstName': 'Болд',
    'lastName': 'Тестийн',
    'code': 'B27120001',
    'phone': '99001122',
    'classroom': {'id': 'c1', 'name': '12Б'},
    'plan': {
      'kind': kind,
      'guessed': false,
      'settled': settled,
      'fee': hidden ? null : 350000,
      'total': hidden ? null : 2500000,
      'first': null,
      'raw': null,
    },
    'startDate': '2026-09-04',
    'blocks': [
      {
        'month': '2026-09',
        'state': 'PAID',
        'due': hidden ? null : 350000,
        'paid': hidden ? null : 350000,
        'dueOn': '2026-09-04',
        'paidOn': '2026-09-03',
        'lateDays': 0,
        'period': {'from': '2026-09-04', 'to': '2026-10-04'},
      },
      {
        'month': '2026-10',
        'state': 'PAID',
        'due': hidden ? null : 350000,
        'paid': hidden ? null : 350000,
        'dueOn': '2026-10-07',
        'paidOn': '2026-10-04',
        'lateDays': 0,
        'period': {'from': '2026-10-07', 'to': '2026-11-07'},
        'extDays': 3,
      },
      {
        'month': '2026-11',
        'state': 'OWED',
        'due': hidden ? null : 350000,
        'paid': hidden ? null : 0,
        'dueOn': '2026-11-07',
        'paidOn': null,
        'lateDays': 0,
        'period': {'from': '2026-11-07', 'to': '2026-12-07'},
        'extDays': 3,
      },
    ],
    'paidTotal': hidden ? null : 700000,
    'owedNow': hidden ? null : 350000,
    'owedMonths': 1,
    'remaining': hidden ? null : 1800000,
    'credit': hidden ? null : 0,
    'overdueDays': 0,
    'coveredThrough': '2026-10',
  },
  'tier': {
    'key': 'd4',
    'label': '7 хоногт 4 өдөр',
    'monthly': hidden ? null : 350000,
    'fullYear': hidden ? null : 2500000,
    'installment': null,
    'installmentFirst': null,
  },
  'daysPerWeek': 4,
  'profile': {'fatherPhone': null, 'motherPhone': '88112233'},
  'payments': [
    {
      'id': 'bank_p1',
      'amount': hidden ? null : 700000,
      'method': 'BANK_TRANSFER',
      'status': 'CONFIRMED',
      'forMonth': '2026-10',
      'paidAt': '2026-10-04T02:00:00.000Z',
      'createdAt': '2026-10-04T02:00:00.000Z',
    },
    {
      'id': 'cash1',
      'amount': hidden ? null : 350000,
      'method': 'CASH',
      'status': 'CONFIRMED',
      'forMonth': '2026-09',
      'paidAt': '2026-09-03T02:00:00.000Z',
      'createdAt': '2026-09-03T02:00:00.000Z',
    },
  ],
  'sources': {
    '2026-09': [
      {'paymentId': 'cash1', 'amount': hidden ? null : 350000},
    ],
    '2026-10': [
      {'paymentId': 'bank_p1', 'amount': hidden ? null : 350000},
    ],
  },
  'extensions': extensions,
  'amountsHidden': ?(hidden ? true : null),
};

class FakePicker implements StatementPicker {
  FakePicker(this.name, this.bytes);

  final String name;
  final Uint8List bytes;
  int calls = 0;

  @override
  Future<PickedStatement?> pick() async {
    calls++;
    return (name: name, bytes: bytes);
  }
}

/// Хаан банкны .xlsx-ийн эхлэл (zip «PK») — агуулга нь зохиомол.
Uint8List xlsxBytes() => Uint8List.fromList([0x50, 0x4B, 3, 4, 0, 0, 0, 0]);

List<Override> financeExtra({StatementPicker? picker}) => [
  financeTodayProvider.overrideWithValue(UbDateTime(2026, 11, 4)),
  statementPickerProvider.overrideWithValue(picker),
];

Future<void> pumpFinance(
  WidgetTester tester,
  Widget screen, {
  required FakeHttp http,
  required String role,
  StatementPicker? picker,
}) => pumpM7(
  tester,
  screen,
  http: http,
  session: signedInAs(role),
  extra: financeExtra(picker: picker),
);

String? queryOf(FakeHttp h, String path, String key) =>
    h.requests.lastWhere((r) => r.path == path).queryParameters[key]?.toString();

Finder buttonWith(String label) =>
    find.ancestor(of: find.text(label), matching: find.byWidgetPredicate((w) => w is ButtonStyleButton));
