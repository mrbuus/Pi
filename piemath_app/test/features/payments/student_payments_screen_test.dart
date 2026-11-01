import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/core/ui/surface.dart';
import 'package:piemath_app/features/payments/ui/student_payments_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_fixtures.dart';
import '../m7_harness.dart';

FakeHttp _http({Object? payments, String? paidUntil = '2026-11-30T00:00:00.000Z'}) => FakeHttp()
  ..json('GET', '/tuition/paid-until/my', {'paidUntil': paidUntil})
  ..json('GET', '/assignments/my-classrooms', [
    {'id': 'c1', 'name': '12Б', 'type': 'IN_PERSON', 'grade': 12},
  ])
  ..json('GET', '/payments/my', payments ?? myPayments());

void main() {
  testWidgets('өгөгдөлтэй: хугацаа, данс, нийлбэр, сараар түүх', (tester) async {
    await pumpM7(tester, const StudentPaymentsScreen(), http: _http());
    expect(find.text('2026.11.30'), findsOneWidget);
    expect(find.text('26 хоног үлдсэн'), findsOneWidget);
    expect(find.text('5720838844'), findsOneWidget);
    // Гүйлгээний утга нэвтэрсэн хүний нэр, утсаар.
    expect(find.text('Сурагч Тест, 99000000, 2027'), findsOneWidget);
    expect(find.text('350,000₮'), findsWidgets);
    await scrollTo(tester, find.text('2026 оны 10-р сар'));
    expect(find.text('2026 оны 11-р сар'), findsOneWidget);
    expect(find.text('Буцаасан'), findsOneWidget);
  });

  testWidgets('хоосон түүх — тайлбартай', (tester) async {
    await pumpM7(tester, const StudentPaymentsScreen(), http: _http(payments: <Object?>[], paidUntil: null));
    expect(find.text('Төлбөрийн хугацаа тооцогдоогүй байна'), findsOneWidget);
    await scrollTo(tester, find.text('Төлбөр бүртгэгдээгүй байна'));
    expect(find.text('0₮'), findsNWidgets(2));
  });

  testWidgets('түүх ачаалахад алдаа → «Дахин оролдох»', (tester) async {
    final h = FakeHttp()
      ..json('GET', '/tuition/paid-until/my', {'paidUntil': null})
      ..json('GET', '/assignments/my-classrooms', <Object?>[])
      ..error('GET', '/payments/my', 500);
    await pumpM7(tester, const StudentPaymentsScreen(), http: h);
    await scrollTo(tester, find.text(AppStrings.retry));
    expect(find.text(AppStrings.serverError), findsOneWidget);
  });

  testWidgets('«Хуулах» → санах ой + мэдэгдэл', (tester) async {
    String? copied;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.setData') copied = (call.arguments as Map)['text'] as String?;
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
    await pumpM7(tester, const StudentPaymentsScreen(), http: _http());
    await tester.tap(find.bySemanticsLabel('Дансны дугаар хуулах'));
    await tester.pump();
    expect(copied, '5720838844');
    expect(find.text('Дансны дугаар хуулсан'), findsOneWidget);
  });

  testWidgets('ачаалж байхад skeleton (хоосон цагаан биш)', (tester) async {
    final h = FakeHttp()
      ..on('GET', '/tuition/paid-until/my', (_) => const FakeResponse({'paidUntil': null}, delay: Duration(seconds: 5)))
      ..on('GET', '/payments/my', (_) => const FakeResponse(<Object?>[], delay: Duration(seconds: 5)))
      ..json('GET', '/assignments/my-classrooms', <Object?>[]);
    await pumpM7(tester, const StudentPaymentsScreen(), http: h);
    expect(find.byType(AppCard), findsWidgets);
    expect(find.bySemanticsLabel('Ачаалж байна'), findsWidgets);
    await tester.pump(const Duration(seconds: 6));
  });
}
