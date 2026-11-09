import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/finance/ui/reconcile_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';
import 'finance_fixtures.dart';

const _denied = 'Энэ хэсэг танд нээгдээгүй';

bool _touchedReconcile(FakeHttp h) => h.requests.any((r) => r.path.startsWith('/reconcile'));

FakeHttp _http(List<Map<String, Object?>> pages) {
  final h = FakeHttp();
  summaryCounts(h);
  listPages(h, pages);
  return h;
}

Future<void> _openRow(WidgetTester tester, String id) async {
  await tester.tap(find.byKey(ValueKey('tx:$id')));
  await settle(tester, frames: 20);
}

void main() {
  group('эрх (Админ, finance.manage-тэй Багш+)', () {
    for (final role in ['TEACHER', 'STUDENT', 'PARENT']) {
      testWidgets('$role: хаалттай, ямар ч хүсэлтгүй', (tester) async {
        final h = FakeHttp();
        await pumpFinance(tester, const ReconcileScreen(), http: h, role: role);
        expect(find.text(_denied), findsOneWidget);
        expect(h.requests, isEmpty);
      });
    }

    testWidgets('Багш+ finance.manage-гүй: хаалттай, тулгалтын API дуудахгүй', (tester) async {
      final h = _http([
        page([txJson()]),
      ])..json('GET', '/staff-capabilities/me', capsWithoutFinance);
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'TEACHER_PLUS');
      expect(find.text(_denied), findsOneWidget);
      expect(find.textContaining('₮'), findsNothing);
      expect(_touchedReconcile(h), isFalse);
    });

    testWidgets('Багш+ эрхийн хүсэлт 403: хаалттай', (tester) async {
      final h = FakeHttp()..error('GET', '/staff-capabilities/me', 403, 'Эрхгүй');
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'TEACHER_PLUS');
      expect(find.text(_denied), findsOneWidget);
      expect(_touchedReconcile(h), isFalse);
    });

    testWidgets('Багш+ finance.manage-тэй: нээгдэнэ', (tester) async {
      final h = _http([
        page([txJson()]),
      ])..json('GET', '/staff-capabilities/me', capsWithFinance);
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'TEACHER_PLUS');
      expect(find.text(_denied), findsNothing);
      expect(find.text('350,000₮'), findsOneWidget);
    });

    testWidgets('Админ: эрхийн хүсэлтгүй', (tester) async {
      final h = _http([
        page([txJson()]),
      ]);
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      expect(h.count('GET', '/staff-capabilities/me'), 0);
    });
  });

  group('жагсаалт', () {
    testWidgets('өгөгдмөл нь тулгаагүй; тоо, мөр, хуулга вэбээр', (tester) async {
      final h = _http([
        page([txJson(), txJson(id: 't2', amount: 120000)], total: 2),
      ]);
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      expect(listQueries(h).first, {'status': 'UNMATCHED', 'limit': '50', 'offset': '0'});
      final summary = find.byKey(const Key('reconcile-summary'));
      expect(find.descendant(of: summary, matching: find.text('11')), findsOneWidget);
      expect(find.descendant(of: summary, matching: find.text('5')), findsOneWidget);
      expect(find.text('350,000₮'), findsOneWidget);
      expect(find.text('120,000₮'), findsOneWidget);
      expect(find.text('2 гүйлгээ'), findsOneWidget);
      expect(find.text('99112233 Болд сургалт'), findsNWidgets(2));
      expect(find.text('2026.11.03 12:20'), findsNWidgets(2)); // 04:20Z = UB 12:20
      expect(find.byKey(const Key('statement-import-web')), findsOneWidget);
      expect(find.byKey(const Key('statement-pick')), findsNothing);
    });

    testWidgets('хоосон', (tester) async {
      final h = _http([page(const [])]);
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      expect(find.text('Илэрц олдсонгүй'), findsOneWidget); // «Тулгаагүй» шүүлтүүртэй хоосон
    });

    testWidgets('алдаа + дахин оролдох', (tester) async {
      var calls = 0;
      final h = FakeHttp()
        ..on('GET', '/reconcile/transactions', (r) {
          if (r.queryParameters['limit'] == '1') return FakeResponse(page(const [], total: 1));
          calls++;
          return calls == 1 ? const FakeResponse({'statusCode': 500}, status: 500) : FakeResponse(page([txJson()]));
        });
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      expect(find.text('Дахин оролдох'), findsOneWidget);
      await tester.tap(find.text('Дахин оролдох'));
      await settle(tester, frames: 16);
      expect(find.text('350,000₮'), findsOneWidget);
    });
  });

  group('үйлдэл', () {
    testWidgets('холбогдсон гүйлгээнд үйлдэлгүй, сурагч харагдана', (tester) async {
      final h = _http([
        page([
          txJson(
            status: 'AUTO_MATCHED',
            matchedUser: {'id': 'u1', 'firstName': 'Болд', 'lastName': 'Тестийн', 'phone': '99112233'},
          ),
        ]),
      ]);
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      await _openRow(tester, 't1');
      expect(find.text('Холбогдсон сурагч'), findsOneWidget);
      expect(find.byKey(const Key('tx-match')), findsNothing);
      expect(find.byKey(const Key('tx-ignore')), findsNothing);
    });

    testWidgets('төлбөр биш: баталгаажуулалт, нэг POST, жагсаалтаас хасагдана', (tester) async {
      final h = _http([
        page([txJson(), txJson(id: 't2')]),
      ])..json('POST', '/reconcile/t1/ignore', null, status: 204);
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      await _openRow(tester, 't1');
      expect(
        find.descendant(of: find.byKey(const ValueKey('tx-detail:t1')), matching: find.text('KHAN-t1')),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const Key('tx-ignore')));
      await settle(tester);
      expect(find.byType(AlertDialog), findsOneWidget);
      await tester.tap(find.text('Болих'));
      await settle(tester);
      expect(h.count('POST', '/reconcile/t1/ignore'), 0);

      await tester.tap(find.byKey(const Key('tx-ignore')));
      await settle(tester);
      await tester.tap(find.text('Тэмдэглэх'));
      await settle(tester, frames: 20);
      expect(h.count('POST', '/reconcile/t1/ignore'), 1);
      expect(find.byKey(const ValueKey('tx:t1')), findsNothing);
      expect(find.byKey(const ValueKey('tx:t2')), findsOneWidget);
      expect(find.text('«Төлбөр биш» гэж тэмдэглэлээ'), findsOneWidget);
    });

    testWidgets('сурагчтай холбох: хайх → сонгох → дүнтэй баталгаажуулалт → нэг POST', (tester) async {
      final h =
          _http([
              page([txJson()]),
            ])
            ..json('GET', '/users/search', [
              {'id': 'u9', 'firstName': 'Болд', 'lastName': 'Тестийн', 'studentCode': 'B27120001'},
            ])
            ..json('POST', '/reconcile/t1/match', txJson(status: 'MANUAL_MATCHED'));
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      await _openRow(tester, 't1');
      await tester.tap(find.byKey(const Key('tx-match')));
      await settle(tester, frames: 20);
      await tester.enterText(find.byKey(const Key('student-search')), 'Болд');
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      expect(h.requests.lastWhere((r) => r.path == '/users/search').queryParameters['q'], 'Болд');
      await tester.tap(find.byKey(const ValueKey('student:u9')));
      await settle(tester, frames: 20);
      final dialog = find.byType(AlertDialog);
      expect(find.descendant(of: dialog, matching: find.textContaining('Гүйлгээ: 350,000₮')), findsOneWidget);
      expect(find.descendant(of: dialog, matching: find.textContaining('Тестийн Болд (B27120001)')), findsOneWidget);
      expect(h.count('POST', '/reconcile/t1/match'), 0);
      await tester.tap(find.descendant(of: dialog, matching: find.text('Холбох')));
      await settle(tester, frames: 20);
      expect(h.count('POST', '/reconcile/t1/match'), 1);
      expect(h.requests.lastWhere((r) => r.method == 'POST').data, {'userId': 'u9'});
      expect(find.byKey(const ValueKey('tx:t1')), findsNothing);
    });

    testWidgets('холбох алдаа: мессеж, цонх нээлттэй, автоматаар давтахгүй', (tester) async {
      final h =
          _http([
              page([txJson()]),
            ])
            ..json('GET', '/users/search', [
              {'id': 'u9', 'firstName': 'Болд', 'lastName': 'Тестийн'},
            ])
            ..error('POST', '/reconcile/t1/match', 400, 'Гүйлгээ аль хэдийн холбогдсон');
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN');
      await _openRow(tester, 't1');
      await tester.tap(find.byKey(const Key('tx-match')));
      await settle(tester, frames: 20);
      await tester.enterText(find.byKey(const Key('student-search')), 'Болд');
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('student:u9')));
      await settle(tester, frames: 20);
      await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Холбох')));
      await settle(tester, frames: 20);
      expect(find.text('Гүйлгээ аль хэдийн холбогдсон'), findsOneWidget);
      expect(h.count('POST', '/reconcile/t1/match'), 1);
      expect(find.byKey(const Key('tx-match')), findsOneWidget);
      expect(tester.widget<ButtonStyleButton>(find.byKey(const Key('tx-match'))).onPressed, isNotNull);
    });
  });

  group('хуулга оруулах', () {
    testWidgets('CSV: урьдчилсан шалгалт → нэг илгээлт → серверийн дүн, жагсаалт шинэчлэгдэнэ', (tester) async {
      final picker = FakePicker('khan.csv', csvBytes());
      final h =
          _http([
            page([txJson()]),
            page([txJson(), txJson(id: 't3')]),
          ])..json('POST', '/reconcile/import', {
            'totalRows': 4,
            'imported': 3,
            'skipped': 1,
            'matched': 2,
            'errors': [
              {'rowIndex': 4, 'bankRef': 'KHAN-9', 'reason': 'Огноо буруу'},
            ],
          });
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN', picker: picker);
      await tester.tap(find.byKey(const Key('statement-pick')));
      await settle(tester, frames: 20);
      final preview = find.byKey(const Key('statement-preview'));
      expect(find.descendant(of: preview, matching: find.text('khan.csv')), findsOneWidget);
      expect(find.descendant(of: preview, matching: find.textContaining('Гүйлгээний огноо')), findsOneWidget);
      expect(h.count('POST', '/reconcile/import'), 0);
      await tester.tap(find.byKey(const Key('statement-submit')));
      await settle(tester, frames: 20);
      expect(h.count('POST', '/reconcile/import'), 1);
      expect(find.byKey(const Key('import-result')), findsOneWidget);
      expect(find.text('3 шинэ'), findsOneWidget);
      expect(find.text('2 автоматаар холбогдсон'), findsOneWidget);
      expect(find.text('4-р мөр (KHAN-9): Огноо буруу'), findsOneWidget);
      expect(listQueries(h).length, 2);
    });

    testWidgets('буруу файл: шалтгаан харагдана, илгээхгүй', (tester) async {
      final picker = FakePicker('statement.pdf', Uint8List.fromList([1, 2, 3]));
      final h = _http([page(const [])]);
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN', picker: picker);
      await tester.tap(find.byKey(const Key('statement-pick')));
      await settle(tester, frames: 20);
      expect(find.byKey(const Key('statement-problem')), findsOneWidget);
      expect(tester.widget<FilledButton>(find.byKey(const Key('statement-submit'))).onPressed, isNull);
      expect(h.count('POST', '/reconcile/import'), 0);
    });

    testWidgets('импортын алдаа: мессеж, давтахгүй', (tester) async {
      final picker = FakePicker('khan.csv', csvBytes());
      final h = _http([page(const [])])..error('POST', '/reconcile/import', 400, 'Файл байхгүй байна');
      await pumpFinance(tester, const ReconcileScreen(), http: h, role: 'ADMIN', picker: picker);
      await tester.tap(find.byKey(const Key('statement-pick')));
      await settle(tester, frames: 20);
      await tester.tap(find.byKey(const Key('statement-submit')));
      await settle(tester, frames: 20);
      expect(find.text('Файл байхгүй байна'), findsOneWidget);
      expect(h.count('POST', '/reconcile/import'), 1);
    });
  });
}
