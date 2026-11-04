import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/payments/ui/ledger_screens.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';

Map<String, Object?> _row({int? owedNow = 0, String state = 'PAID'}) => {
  'id': 'st1',
  'firstName': 'Тэмүүлэн',
  'lastName': 'Тестийн',
  'code': 'B27120001',
  'classroom': {'id': 'c1', 'name': '12Б'},
  'blocks': [
    {'month': '2026-11', 'state': state, 'due': 350000, 'paid': 100000, 'dueOn': '2026-11-05', 'paidOn': null},
  ],
  'paidTotal': 700000,
  'remaining': 1800000,
  'owedNow': ?owedNow,
};

final _staff = signedInAs('TEACHER_PLUS');

void main() {
  testWidgets('ангиудын товч: серверийн тоо, анги руу орно', (tester) async {
    final h = FakeHttp()
      ..json('GET', '/payments/ledger/overview', {
        'month': '2026-11',
        'totals': {'id': 'all', 'name': 'Бүгд', 'students': 30, 'expected': 30, 'covered': 25, 'owedStudents': 5},
        'classes': [
          {'id': 'c1', 'name': '12Б', 'students': 15, 'expected': 15, 'covered': 12, 'owedStudents': 3},
        ],
      });
    await pumpM7(tester, const LedgerOverviewScreen(), http: h, session: _staff);
    expect(find.text('2026 оны 11-р сар'), findsOneWidget);
    expect(find.text('25 / 30'), findsOneWidget);
    // owedNow ирээгүй — нийт өр харагдахгүй (апп тооцохгүй).
    expect(find.text('Нийт өр'), findsNothing);
    await tester.tap(find.text('12Б'));
    await settle(tester);
    expect(find.text('ROUTE:/app/payments/class/c1'), findsOneWidget);
  });

  testWidgets('ангийн самбар: сарын төлөв үгээр', (tester) async {
    final h = FakeHttp()
      ..json('GET', '/payments/ledger/board', {
        'month': '2026-11',
        'classroom': {'id': 'c1', 'name': '12Б'},
        'rows': [_row(state: 'PARTIAL', owedNow: 250000)],
      });
    await pumpM7(tester, const LedgerClassScreen(classroomId: 'c1'), http: h, session: _staff);
    expect(find.text('Тестийн Тэмүүлэн'), findsOneWidget);
    expect(find.text('Дутуу'), findsOneWidget);
    expect(find.text('Өр 250,000₮'), findsOneWidget);
    expect(h.requests.single.queryParameters['classroomId'], 'c1');
  });

  testWidgets('сурагчийн ledger: үнэ зөвхөн серверийн tier-ээс', (tester) async {
    final h = FakeHttp()
      ..json('GET', '/payments/ledger/student/st1', {
        'month': '2026-11',
        'row': _row(),
        'tier': {'key': 'd4', 'label': '7 хоногт 4 өдөр', 'monthly': 350000, 'fullYear': 2500000},
        'daysPerWeek': 4,
        'payments': [
          {'id': 'p1', 'amount': 350000, 'method': 'BANK_TRANSFER', 'status': 'CONFIRMED', 'forMonth': '2026-11', 'createdAt': '2026-11-02T02:00:00.000Z'},
        ],
      });
    await pumpM7(tester, const LedgerStudentScreen(studentId: 'st1'), http: h, session: signedInAs('ADMIN'));
    expect(find.text('4 өдөр'), findsOneWidget);
    expect(find.text('350,000₮'), findsWidgets);
    expect(find.text('2,500,000₮'), findsOneWidget);
  });

  testWidgets('Багш+ зөвхөн төлөв харна — сервер дүн буцаасан ч мөнгөн дүнгүй', (tester) async {
    final h = FakeHttp()
      ..json('GET', '/payments/ledger/student/st1', {
        'month': '2026-11',
        'row': _row(),
        'tier': {'key': 'd4', 'label': '7 хоногт 4 өдөр', 'monthly': 350000, 'fullYear': 2500000},
        'daysPerWeek': 4,
        'payments': [
          {'id': 'p1', 'amount': 350000, 'method': 'BANK_TRANSFER', 'status': 'CONFIRMED', 'forMonth': '2026-11', 'createdAt': '2026-11-02T02:00:00.000Z'},
        ],
      });
    await pumpM7(tester, const LedgerStudentScreen(studentId: 'st1'), http: h, session: _staff);
    expect(find.text('4 өдөр'), findsOneWidget);
    expect(find.textContaining('₮'), findsNothing);
  });

  testWidgets('сервер үнэ, дүн өгөөгүй бол ямар ч тоо зохиохгүй', (tester) async {
    final h = FakeHttp()
      ..json('GET', '/payments/ledger/student/st1', {
        'month': '2026-11',
        'row': {
          'id': 'st1',
          'firstName': 'Тэмүүлэн',
          'lastName': 'Тестийн',
          'blocks': [
            {'month': '2026-11', 'state': 'OWED'},
          ],
        },
        'payments': [
          {'id': 'p1', 'status': 'PENDING', 'createdAt': '2026-11-02T02:00:00.000Z'},
        ],
      });
    await pumpM7(tester, const LedgerStudentScreen(studentId: 'st1'), http: h, session: signedInAs('ADMIN'));
    expect(find.textContaining('₮'), findsNothing);
    expect(find.text('Сарын төлбөр'), findsNothing);
    expect(find.text('Өртэй'), findsOneWidget);
    expect(find.text('Хүлээгдэж буй'), findsOneWidget);
  });

  testWidgets('403 — төвийг сахисан тайлбар, алдаа биш', (tester) async {
    final h = FakeHttp()..error('GET', '/payments/ledger/overview', 403, 'Forbidden');
    await pumpM7(tester, const LedgerOverviewScreen(), http: h, session: signedInAs('TEACHER'));
    expect(find.text('Төлбөрийн мэдээлэл танд харагдахгүй'), findsOneWidget);
    expect(find.text(AppStrings.retry), findsNothing);
  });

  testWidgets('500 — «Дахин оролдох» дахин ачаална', (tester) async {
    final h = FakeHttp()
      ..error('GET', '/payments/ledger/overview', 500)
      ..json('GET', '/payments/ledger/overview', {'month': '2026-11', 'classes': <Object?>[]});
    await pumpM7(tester, const LedgerOverviewScreen(), http: h, session: _staff);
    expect(find.text(AppStrings.retry), findsOneWidget);
    await tester.tap(find.text(AppStrings.retry));
    await settle(tester);
    expect(find.text('Анги бүртгэгдээгүй байна'), findsOneWidget);
  });
}
