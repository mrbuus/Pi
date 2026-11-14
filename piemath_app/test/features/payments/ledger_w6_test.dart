import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/payments/data/ledger.dart';
import 'package:piemath_app/features/payments/domain/ledger_format.dart';
import 'package:piemath_app/features/payments/ui/ledger_screens.dart';
import 'package:piemath_app/features/payments/ui/ledger_sheets.dart';
import 'package:piemath_app/features/payments/ui/month_blocks.dart';

import '../../helpers/fake_http.dart';
import '../finance/finance_fixtures.dart' show ledgerJson;
import '../m7_harness.dart';

Future<void> _tap(WidgetTester tester, Finder f, {int frames = 12}) async {
  await tester.ensureVisible(f.first);
  await tester.pump();
  await tester.tap(f.first);
  await settle(tester, frames: frames);
}

const _ext = {
  'id': 'x1',
  'month': '2026-10',
  'days': 3,
  'reason': 'Чөлөө авсан',
  'at': '2026-11-02T02:00:00.000Z',
  'authorName': 'Б. Тестийн+',
};

FakeHttp _http({
  String kind = 'MONTHLY',
  bool hidden = false,
  bool settled = false,
  List<Map<String, Object?>> ext = const [],
}) => FakeHttp()
  ..json(
    'GET',
    '/payments/ledger/student/k1',
    ledgerJson(kind: kind, hidden: hidden, settled: settled, extensions: ext),
  );

void main() {
  group('харагдах хэлбэр', () {
    test('сар, өдөр, хугацаа, товч дүн', () {
      expect(monthName('2026-09'), '9-р сар');
      expect(dayLabel('2026-10-07T00:00:00.000Z'), '10/07');
      expect(dayLabel(null), '');
      expect(stampLabel('2026-11-03T04:20:00.000Z'), '11/03 12:20');
      expect(addDays('2026-12-30', 3), '2027-01-02');
      expect(shortMnt(150000), '150к');
      expect(shortMnt(1250000), '1.25с');
      expect(shortMnt(1200000), '1.2с');
      expect(shortMnt(null), '');
      expect(fallbackPeriod('2026-12', '2026-10-15', '2026-09'), '12/15–01/15');
      expect(fallbackPeriod('2026-10', '2026-08-31', '2026-09'), '10/01–11/01');
      expect(fallbackPeriod('2026-10', '2026-09-30', '2026-09'), '10/28–11/28');
    });

    test('блокийн тайлбар: хугацаа, сунгалт; Багш+-д дүнгүй', () {
      final l = StudentLedger.fromJson(ledgerJson());
      final oct = l.row.blocks[1];
      expect(oct.extDays, 3);
      expect(periodLabel(oct), '10/07–11/07');
      expect(blockLabel(oct), '10-р сар (10/07–11/07, 3 хоног сунгасан): Төлсөн 350,000₮');
      expect(blockLabel(l.row.blocks[2], money: false), '11-р сар (11/07–12/07, 3 хоног сунгасан): Өртэй');
      expect(l.sources['2026-10']!.single, (paymentId: 'bank_p1', amount: 350000));
      expect(l.yearStart, '2026-09');
      expect(l.canExtend, isTrue);
    });

    test('тохирсон дүн: зөвхөн бүтэн жилд, 800,000-аас их, үнийн жагсаалтаас бага; үнэ мэдэгдэхгүй бол үгүй', () {
      expect(isAgreedDiscount(PlanKind.fullYear, 2250000, 2500000), isTrue);
      expect(isAgreedDiscount(PlanKind.fullYear, 2500000, 2500000), isFalse);
      expect(isAgreedDiscount(PlanKind.fullYear, 700000, 2500000), isFalse);
      expect(isAgreedDiscount(PlanKind.monthly, 300000, 350000), isFalse);
      expect(isAgreedDiscount(PlanKind.fullYear, 2250000, null), isFalse);
    });

    test('багцын товч: гараар бүтэн, тодорхойгүй, дүнгүй', () {
      expect(ledgerPlanText(const LedgerPlan(settled: true), money: true), 'Бүтэнд тооцсон');
      expect(ledgerPlanText(const LedgerPlan(guessed: true), money: true), 'Багц тодорхойгүй');
      expect(
        ledgerPlanText(const LedgerPlan(kind: PlanKind.fullYear, total: 2250000, discounted: true), money: true),
        'Бүтэн жил 2,250,000₮',
      );
      expect(ledgerPlanText(const LedgerPlan(kind: PlanKind.fullYear, total: 2250000), money: false), 'Бүтэн жил');
    });
  });

  group('сурагчийн ledger', () {
    testWidgets('блок дээр хамрах хугацаа, +хоног; хугацаа сунгах товч тоотой', (tester) async {
      await pumpM7(
        tester,
        const LedgerStudentScreen(studentId: 'k1'),
        http: _http(ext: [_ext]),
        session: signedInAs('ADMIN'),
      );
      expect(find.text('10/07–11/07 +3 хоног', findRichText: true), findsOneWidget);
      expect(find.text('Хугацаа сунгах (1)'), findsOneWidget);
      expect(find.text('Сар бүр 350,000₮'), findsOneWidget);
      expect(find.text('Ээж 88112233'), findsOneWidget);
    });

    testWidgets('бүтэн жил эсвэл гараар бүтэн: сунгах товчгүй', (tester) async {
      await pumpM7(
        tester,
        const LedgerStudentScreen(studentId: 'k1'),
        http: _http(kind: 'FULL_YEAR'),
        session: signedInAs('ADMIN'),
      );
      expect(find.byKey(const Key('ledger-extend')), findsNothing);
    });

    testWidgets('Багш+: блок, багц, баримтад мөнгөн дүн гарахгүй', (tester) async {
      await pumpM7(
        tester,
        const LedgerStudentScreen(studentId: 'k1'),
        http: _http(hidden: true),
        session: signedInAs('TEACHER_PLUS'),
      );
      expect(find.textContaining('₮', findRichText: true), findsNothing);
      expect(find.text('Сар бүр'), findsOneWidget);
      expect(find.text('1 сар'), findsOneWidget);
    });

    testWidgets('хугацаа сунгах: сар, хоног, шалтгаан, урьдчилан харах, нэг POST', (tester) async {
      final h = _http()..json('POST', '/payments/ledger/student/k1/extensions', {'row': <String, Object?>{}});
      await pumpM7(
        tester,
        const LedgerStudentScreen(studentId: 'k1'),
        http: h,
        session: signedInAs('ADMIN'),
      );
      await _tap(tester, find.byKey(const Key('ledger-extend')));
      // Эхний төлөгдөөгүй сар (11-р сар) сонгогдсон.
      expect(find.text('11-р сар (11/07–12/07)'), findsWidgets);
      final save = find.descendant(of: find.byKey(const Key('extend-save')), matching: find.byType(FilledButton));
      expect(tester.widget<FilledButton>(save).onPressed, isNull);
      await tester.enterText(find.byKey(const Key('extend-days')), '5');
      await settle(tester);
      expect(find.text('11/07 – 12/07 нь 11/12 – 12/12 болно'), findsOneWidget);
      await _tap(tester, find.byKey(const Key('extend-save')));
      expect(h.count('POST', '/payments/ledger/student/k1/extensions'), 1);
      expect(h.requests.lastWhere((r) => r.method == 'POST').data, {
        'month': '2026-11',
        'days': 5,
        'reason': 'Өвчтэй байсан',
      });
      expect(find.text('11-р сар-ын хугацааг 5 хоногоор сунгалаа'), findsOneWidget);
    });

    testWidgets('«Бусад» шалтгаан бичихгүй бол хадгалахгүй; сунгалт цуцлах нь асуугаад DELETE', (tester) async {
      final h = _http(ext: [_ext])
        ..json('DELETE', '/payments/ledger/student/k1/extensions/x1', {'row': <String, Object?>{}});
      await pumpM7(
        tester,
        const LedgerStudentScreen(studentId: 'k1'),
        http: h,
        session: signedInAs('ADMIN'),
      );
      await _tap(tester, find.byKey(const Key('ledger-extend')));
      expect(find.text('10-р сар +3 хоног'), findsOneWidget);
      expect(find.textContaining('Б. Тестийн+'), findsOneWidget);
      await _tap(tester, find.byKey(const ValueKey('ext-cancel:x1')));
      await _tap(tester, find.descendant(of: find.byType(AlertDialog), matching: find.text('Болих')));
      expect(h.count('DELETE', '/payments/ledger/student/k1/extensions/x1'), 0);
      await _tap(tester, find.byKey(const ValueKey('ext-cancel:x1')));
      await _tap(tester, find.descendant(of: find.byType(AlertDialog), matching: find.text('Цуцлах')));
      expect(h.count('DELETE', '/payments/ledger/student/k1/extensions/x1'), 1);
      expect(find.byKey(const ValueKey('ext:x1')), findsNothing);
    });

    testWidgets('багц: бүтэн жилд хөнгөлөлттэй дүн → tuitionAgreed; тайлбар', (tester) async {
      final h = _http()..json('PATCH', '/users/k1/profile', {'id': 'k1'});
      await pumpM7(
        tester,
        const LedgerStudentScreen(studentId: 'k1'),
        http: h,
        session: signedInAs('ADMIN'),
      );
      await _tap(tester, find.byKey(const Key('ledger-plan')));
      await _tap(tester, find.text('Бүтэн жил').last);
      await tester.enterText(find.byKey(const Key('plan-amount')), '2250000');
      await settle(tester);
      expect(find.textContaining('Хөнгөлөлттэй гэрээ: 2,250,000₮'), findsOneWidget);
      await _tap(tester, find.byKey(const Key('plan-save')));
      expect(h.requests.lastWhere((r) => r.method == 'PATCH').data, {
        'tuitionPlan': 'FULL_YEAR',
        'tuitionAmount': 2250000,
        'tuitionAgreed': 2250000,
        'joinedOn': '2026-09-04',
      });
    });

    testWidgets('багц: үнийн жагсаалтын дүн бол tuitionAgreed null (стандарт)', (tester) async {
      final h = _http(kind: 'FULL_YEAR')..json('PATCH', '/users/k1/profile', {'id': 'k1'});
      await pumpM7(
        tester,
        const LedgerStudentScreen(studentId: 'k1'),
        http: h,
        session: signedInAs('ADMIN'),
      );
      await _tap(tester, find.byKey(const Key('ledger-plan')));
      await _tap(tester, find.byKey(const Key('plan-save')));
      final body = h.requests.lastWhere((r) => r.method == 'PATCH').data as Map;
      expect(body['tuitionAmount'], 2500000);
      expect(body.containsKey('tuitionAgreed'), isTrue);
      expect(body['tuitionAgreed'], isNull);
    });

    testWidgets('Багш+ багц: үнэ мэдэгдэхгүй тул tuitionAgreed илгээхгүй (Админы тавьсныг дарахгүй)', (tester) async {
      final h = _http(kind: 'FULL_YEAR', hidden: true)..json('PATCH', '/users/k1/profile', {'id': 'k1'});
      await pumpM7(
        tester,
        const LedgerStudentScreen(studentId: 'k1'),
        http: h,
        session: signedInAs('TEACHER_PLUS'),
      );
      await _tap(tester, find.byKey(const Key('ledger-plan')));
      expect(find.textContaining('Үнийн жагсаалт'), findsNothing);
      await _tap(tester, find.byKey(const Key('plan-save')));
      final body = h.requests.lastWhere((r) => r.method == 'PATCH').data as Map;
      expect(body.containsKey('tuitionAgreed'), isFalse);
      expect(body.containsKey('tuitionAmount'), isFalse);
      expect(body['tuitionPlan'], 'FULL_YEAR');
    });
  });
}
