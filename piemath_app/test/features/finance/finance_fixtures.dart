// Зохиомол өгөгдөл (жинхэнэ сурагч, ажилтан, гүйлгээ биш). Дүн нь серверийн хариу — тест юу ч тооцохгүй.
import 'dart:convert';
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

Map<String, Object?> txJson({
  String id = 't1',
  int amount = 350000,
  String status = 'UNMATCHED',
  String description = '99112233 Болд сургалт',
  Map<String, Object?>? matchedUser,
}) => {
  'id': id,
  'bankRef': 'KHAN-$id',
  'bookedAt': '2026-11-03T04:20:00.000Z',
  'amount': amount,
  'description': description,
  'accountNo': '5000123456',
  'counterparty': 'Тестийн Болд',
  'matchStatus': status,
  'matchedUserId': matchedUser?['id'],
  'matchedUser': matchedUser,
};

Map<String, Object?> page(List<Map<String, Object?>> items, {int? total}) => {
  'items': items,
  'total': total ?? items.length,
};

/// Тулгалтын тоо (`limit=1` хүсэлт бүр) — status-аас хамааруулж өөр тоо.
void summaryCounts(FakeHttp h, {int unmatched = 3, int auto = 5, int manual = 1, int ignored = 2}) {
  h.on('GET', '/reconcile/transactions', (r) {
    final q = r.queryParameters;
    if (q['limit'] == '1') {
      final n = switch (q['status']) {
        'UNMATCHED' => unmatched,
        'AUTO_MATCHED' => auto,
        'MANUAL_MATCHED' => manual,
        'IGNORED' => ignored,
        _ => unmatched + auto + manual + ignored,
      };
      return FakeResponse(page(const [], total: n));
    }
    return FakeResponse(_pages[h]?.removeAt(0) ?? page(const []));
  });
}

final _pages = Expando<List<Map<String, Object?>>>();

/// Жагсаалтын хуудсууд (limit=50 хүсэлт) дарааллаар; сүүлийнх нь давтагдахгүй — дараа нь хоосон.
void listPages(FakeHttp h, List<Map<String, Object?>> pages) => _pages[h] = [...pages];

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

Uint8List csvBytes([String text = 'Гүйлгээний огноо,Дүн,Утга\n2026-11-03,350000,99112233\n']) =>
    Uint8List.fromList(utf8.encode(text));

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

/// Жагсаалтын хүсэлтүүд (тооны `limit=1`-ээс бусад).
Iterable<Map<String, dynamic>> listQueries(FakeHttp h) => h.requests
    .where((r) => r.path == '/reconcile/transactions' && r.queryParameters['limit'] != '1')
    .map((r) => r.queryParameters);
