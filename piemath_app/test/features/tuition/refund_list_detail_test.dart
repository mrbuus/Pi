import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/tuition/ui/refund_detail_screen.dart';
import 'package:piemath_app/features/tuition/ui/refund_list_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';
import 'tuition_fixtures.dart';

void main() {
  group('жагсаалт', () {
    testWidgets('мөр: сурагч, анги, дүн (₮), төлөв; дарахад дэлгэрэнгүй', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/tuition/refunds', {
          'refunds': [refundJson(), refundJson(id: 'r2', firstName: 'Саруул', status: 'PAID')],
          'total': 2,
        });
      await pumpTuition(tester, const RefundListScreen(), http: h, role: 'ADMIN');
      expect(find.text('Тестийн Болд'), findsOneWidget);
      expect(find.text('Тестийн Саруул'), findsOneWidget);
      expect(find.text('Буцаах 328,125₮'), findsNWidgets(2));
      expect(find.text('Төлсөн 1,050,000₮'), findsNWidgets(2));
      expect(find.text('Гарсан 2026.11.03'), findsNWidgets(2));
      expect(find.text('Ноорог'), findsWidgets);
      expect(find.text('2 буцаалт'), findsOneWidget);
      expect(queryOf(h, '/tuition/refunds', 'offset'), '0');
      expect(queryOf(h, '/tuition/refunds', 'status'), isNull);

      await tester.tap(find.text('Тестийн Болд'));
      await settle(tester);
      expect(find.text('ROUTE:/app/tuition/refund/r1'), findsOneWidget);
    });

    testWidgets('төлвөөр шүүхэд серверт status явна', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/tuition/refunds', {
          'refunds': [refundJson()],
          'total': 1,
        })
        ..json('GET', '/tuition/refunds', {
          'refunds': [refundJson(id: 'r2', status: 'PAID')],
          'total': 1,
        });
      await pumpTuition(tester, const RefundListScreen(), http: h, role: 'ADMIN');
      const chip = ValueKey('filter:PAID');
      await tester.scrollUntilVisible(
        find.byKey(chip),
        120,
        scrollable: find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.right),
      );
      await tester.drag(
        find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.right),
        const Offset(-120, 0),
      );
      await settle(tester);
      await tester.tap(find.byKey(chip));
      await settle(tester, frames: 16);
      expect(queryOf(h, '/tuition/refunds', 'status'), 'PAID');
    });

    testWidgets('хуудаслалт: offset нь ачаалсан мөрийн тоо', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/tuition/refunds', {
          'refunds': [for (var i = 0; i < 20; i++) refundJson(id: 'a$i')],
          'total': 25,
        })
        ..json('GET', '/tuition/refunds', {
          'refunds': [for (var i = 0; i < 5; i++) refundJson(id: 'b$i')],
          'total': 25,
        });
      await pumpTuition(tester, const RefundListScreen(), http: h, role: 'ADMIN');
      // Картын гадна (зүүн захын зай) чирнэ — доод талд ойртоход дараагийн хуудас ачаална.
      for (var i = 0; i < 6; i++) {
        await tester.dragFrom(const Offset(4, 700), const Offset(0, -600));
        await settle(tester);
      }
      expect(h.count('GET', '/tuition/refunds'), greaterThanOrEqualTo(2));
      expect(queryOf(h, '/tuition/refunds', 'offset'), '20');
    });

    testWidgets('хоосон жагсаалт', (tester) async {
      final h = FakeHttp()..json('GET', '/tuition/refunds', {'refunds': <Object>[], 'total': 0});
      await pumpTuition(tester, const RefundListScreen(), http: h, role: 'ADMIN');
      expect(find.text('Буцаалтын бүртгэл алга'), findsOneWidget);
    });
  });

  group('дэлгэрэнгүй', () {
    FakeHttp detailHttp(String status, {Object? warnings, String? cancelReason, String? paymentMethod}) =>
        FakeHttp()..json(
          'GET',
          '/tuition/refund/r1',
          refundJson(
            status: status,
            detail: true,
            warnings: warnings ?? <String>[],
            cancelReason: cancelReason,
            paymentMethod: paymentMethod,
          ),
        );

    testWidgets('серверийн утга, анхааруулга, түүх (Багш+ нэрэнд «+»)', (tester) async {
      final h = detailHttp('PAID', warnings: ['ZERO_TUITION'], paymentMethod: 'CASH');
      await pumpTuition(
        tester,
        const RefundDetailScreen(refundId: 'r1'),
        http: h,
        role: 'ADMIN',
      );
      expect(find.text('Тестийн Болд'), findsOneWidget);
      expect(find.text('Олгосон'), findsOneWidget);
      expect(find.text('328,125₮'), findsOneWidget);
      expect(find.text('1,050,000₮'), findsOneWidget);
      expect(find.text('721,875₮'), findsOneWidget);
      expect(find.text('21,875₮'), findsOneWidget);
      expect(find.text('Бэлнээр'), findsOneWidget);
      await scrollTo(tester, find.textContaining('Ажилтан Сараа+'));
      expect(find.textContaining('сургалтын төлбөр тохируулагдаагүй'), findsOneWidget);
      expect(find.text('Ажилтан Сараа+'), findsOneWidget);
      expect(find.text('2026.11.03 12:00'), findsOneWidget); // 04:00Z = UB 12:00
    });

    testWidgets('зөвшөөрөх: дүнг хэлсэн баталгаажуулалт, нэг л хүсэлт', (tester) async {
      final h = detailHttp('DRAFT')..json('POST', '/tuition/refund/r1/approve', {'id': 'r1'});
      await pumpTuition(
        tester,
        const RefundDetailScreen(refundId: 'r1'),
        http: h,
        role: 'ADMIN',
      );
      await tester.tap(buttonWith('Зөвшөөрөх'));
      await settle(tester);
      final dialog = find.byType(AlertDialog);
      expect(find.descendant(of: dialog, matching: find.textContaining('328,125₮')), findsOneWidget);
      // Цонх нээлттэй байхад товч дахин дарагдахгүй (давхар цонх үгүй).
      await tester.tap(buttonWith('Зөвшөөрөх').first, warnIfMissed: false);
      await settle(tester);
      expect(find.byType(AlertDialog), findsOneWidget);
      await tester.tap(find.descendant(of: dialog, matching: find.text('Зөвшөөрөх')));
      await settle(tester);
      expect(h.count('POST', '/tuition/refund/r1/approve'), 1);
      expect(h.count('GET', '/tuition/refund/r1'), 2); // дахин ачаалсан
      expect(find.text('Төлөв шинэчлэгдлээ'), findsOneWidget);
    });

    testWidgets('илгээх (Багш+): «Болих» бол хүсэлтгүй', (tester) async {
      final h = detailHttp('DRAFT')
        ..json('GET', '/staff-capabilities/me', capsWithFinance)
        ..json('POST', '/tuition/refund/r1/pending', {'id': 'r1'});
      await pumpTuition(
        tester,
        const RefundDetailScreen(refundId: 'r1'),
        http: h,
        role: 'TEACHER_PLUS',
      );
      await tester.tap(buttonWith('Зөвшөөрөлд илгээх'));
      await settle(tester);
      await tester.tap(find.text('Болих'));
      await settle(tester);
      expect(h.count('POST', '/tuition/refund/r1/pending'), 0);
      await tester.tap(buttonWith('Зөвшөөрөлд илгээх'));
      await settle(tester);
      await tester.tap(find.text('Илгээх'));
      await settle(tester);
      expect(h.count('POST', '/tuition/refund/r1/pending'), 1);
    });

    testWidgets('цуцлах: шалтгаан заавал, серверт шалтгаан явна', (tester) async {
      final h = detailHttp('DRAFT')..json('POST', '/tuition/refund/r1/cancel', {'id': 'r1'});
      await pumpTuition(
        tester,
        const RefundDetailScreen(refundId: 'r1'),
        http: h,
        role: 'ADMIN',
      );
      await tester.tap(buttonWith('Цуцлах'));
      await tester.pumpAndSettle();
      expect(find.textContaining('328,125₮'), findsWidgets);
      final submit = buttonWith('Цуцлах').last;
      await tester.tap(submit);
      await tester.pumpAndSettle();
      expect(h.count('POST', '/tuition/refund/r1/cancel'), 0);
      await tester.enterText(find.widgetWithText(TextField, 'Цуцлах шалтгаан'), 'Огноо буруу');
      await tester.tap(submit);
      await tester.pumpAndSettle();
      expect(h.count('POST', '/tuition/refund/r1/cancel'), 1);
      expect(h.requests.lastWhere((r) => r.method == 'POST').data, {'cancelReason': 'Огноо буруу'});
    });

    testWidgets('олгосон: арга сонгоод, серверт paymentMethod явна', (tester) async {
      final h = detailHttp('APPROVED')..json('POST', '/tuition/refund/r1/paid', {'id': 'r1'});
      await pumpTuition(
        tester,
        const RefundDetailScreen(refundId: 'r1'),
        http: h,
        role: 'ADMIN',
      );
      await tester.tap(buttonWith('Олгосон гэж тэмдэглэх'));
      await tester.pumpAndSettle();
      expect(find.text('Дансаар'), findsOneWidget);
      await tester.tap(buttonWith('Олгосон гэж тэмдэглэх').last);
      await tester.pumpAndSettle();
      expect(h.count('POST', '/tuition/refund/r1/paid'), 1);
      expect(h.requests.lastWhere((r) => r.method == 'POST').data, {'paymentMethod': 'BANK_TRANSFER'});
    });

    testWidgets('серверийн алдаа: монгол мессеж, төлөв хэвээр', (tester) async {
      final h = detailHttp('DRAFT')
        ..error(
          'POST',
          '/tuition/refund/r1/approve',
          400,
          'Зөвхөн DRAFT эсвэл PENDING_APPROVAL статусны буцаалтыг баталгаажуулж болно',
        );
      await pumpTuition(
        tester,
        const RefundDetailScreen(refundId: 'r1'),
        http: h,
        role: 'ADMIN',
      );
      await tester.tap(buttonWith('Зөвшөөрөх'));
      await settle(tester);
      await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Зөвшөөрөх')));
      await settle(tester);
      expect(find.textContaining('баталгаажуулж болно'), findsOneWidget);
      expect(find.text('Ноорог'), findsOneWidget);
    });

    testWidgets('олдоогүй буцаалт', (tester) async {
      final h = FakeHttp()..error('GET', '/tuition/refund/x', 404, 'Буцаалт олдсонгүй');
      await pumpTuition(
        tester,
        const RefundDetailScreen(refundId: 'x'),
        http: h,
        role: 'ADMIN',
      );
      expect(find.text('Буцаалт олдсонгүй'), findsOneWidget);
    });
  });
}
