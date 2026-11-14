import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/auth/ui/forgot_password_screen.dart';
import 'package:piemath_app/features/auth/ui/login_screen.dart';

import '../../helpers/fake_http.dart';
import 'auth_test_helpers.dart';

const _sms = {
  'maskedTo': '9911****',
  'expiresInSeconds': 600,
  'linkExpiresInSeconds': 1800,
  'channels': {'sms': true, 'email': false},
};

Future<void> requestCode(WidgetTester tester, {String identifier = '99112233'}) async {
  await tester.enterText(find.byType(TextField).first, identifier);
  await tester.tap(find.widgetWithText(FilledButton, 'Сэргээх холбоос авах'));
  await settle(tester);
}

void main() {
  late FakeHttp http;
  setUp(() => http = FakeHttp());

  testWidgets('1-р алхам: хоосон бол алдаа, хүсэлтгүй', (tester) async {
    await pumpAuthApp(tester, http: http, location: '/forgot-password');
    expect(find.byType(ForgotPasswordScreen), findsOneWidget);
    expect(find.text('Алхам 1 / 2'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Сэргээх холбоос авах'));
    await tester.pump();
    expect(find.text('Утас, имэйл эсвэл нэвтрэх нэрээ оруулна уу'), findsOneWidget);
    expect(http.count('POST', '/auth/forgot-password'), 0);
  });

  testWidgets('SMS: код + шинэ нууц үг → амжилттай → нэвтрэх', (tester) async {
    http
      ..json('POST', '/auth/forgot-password', _sms)
      ..json('POST', '/auth/reset-password', {'reset': true});
    await pumpAuthApp(tester, http: http, location: '/forgot-password');
    await requestCode(tester, identifier: ' 99112233 ');
    expect(http.requests.last.data, {'identifier': '99112233'});
    expect(find.text('Код оруулах'), findsOneWidget);
    expect(find.textContaining('9911****'), findsOneWidget);
    expect(find.text('Код 10:00-ын дараа хүчингүй болно'), findsOneWidget);
    expect(find.text('Дахин илгээх (60с)'), findsOneWidget);

    await tester.pump(const Duration(seconds: 5));
    expect(find.text('Код 9:55-ын дараа хүчингүй болно'), findsOneWidget);

    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), '12a3456');
    expect(tester.widget<TextField>(fields.at(0)).controller!.text, '123456', reason: 'зөвхөн цифр, 6 орон');
    await tester.enterText(fields.at(1), 'шинэ2026');
    await tester.enterText(fields.at(2), 'шинэ2026');
    await tester.pump();
    expect(find.text('Таарч байна'), findsOneWidget);
    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Нууц үг солих'));
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Нууц үг солих'));
    await settle(tester);
    final reset = http.requests.firstWhere((r) => r.path == '/auth/reset-password');
    expect(reset.data, {'identifier': '99112233', 'code': '123456', 'newPassword': 'шинэ2026'});
    expect(find.text('Нууц үг солигдлоо'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Нэвтрэх'));
    await settle(tester);
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('буруу код: серверийн мессеж, тусламж өөрөө нээгдэнэ', (tester) async {
    const wrong = 'Код буруу эсвэл хугацаа нь дууссан байна. Шинээр код хүснэ үү.';
    http
      ..json('POST', '/auth/forgot-password', _sms)
      ..error('POST', '/auth/reset-password', 400, wrong);
    await pumpAuthApp(tester, http: http, location: '/forgot-password');
    await requestCode(tester);
    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), '000000');
    await tester.enterText(fields.at(1), 'abcd1234');
    await tester.enterText(fields.at(2), 'abcd1234');
    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Нууц үг солих'));
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Нууц үг солих'));
    await settle(tester);
    expect(find.text(wrong), findsOneWidget);
    expect(find.textContaining('Сургалтын төвд хандана уу'), findsOneWidget);
  });

  testWidgets('сул нууц үгтэй бол товч идэвхгүй', (tester) async {
    http.json('POST', '/auth/forgot-password', _sms);
    await pumpAuthApp(tester, http: http, location: '/forgot-password');
    await requestCode(tester);
    await tester.enterText(find.byType(TextField).at(1), 'abc');
    await tester.pump();
    final btn = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Нууц үг солих'));
    expect(btn.onPressed, isNull);
  });

  testWidgets('илгээж чадаагүй (503) бол тусламж автоматаар нээгдэнэ', (tester) async {
    const msg = 'Нууц үг сэргээх үйлчилгээ одоогоор тохируулагдаагүй байна. Сургалтын төвтэй холбогдоно уу.';
    http.error('POST', '/auth/forgot-password', 503, msg);
    await pumpAuthApp(tester, http: http, location: '/forgot-password');
    expect(find.textContaining('Сургалтын төвд хандана уу'), findsNothing);
    await requestCode(tester);
    expect(find.text(msg), findsOneWidget);
    expect(find.textContaining('Сургалтын төвд хандана уу'), findsOneWidget);
  });

  testWidgets('зөвхөн имэйл суваг: «Имэйлээ шалгана уу»', (tester) async {
    http.json('POST', '/auth/forgot-password', {
      'maskedTo': 'ba***@gmail.com',
      'expiresInSeconds': 600,
      'linkExpiresInSeconds': 1800,
      'channels': {'sms': false, 'email': true},
    });
    await pumpAuthApp(tester, http: http, location: '/forgot-password');
    await requestCode(tester, identifier: 'bat@gmail.com');
    expect(find.text('Имэйлээ шалгана уу'), findsOneWidget);
    expect(find.textContaining('30 минут хүчинтэй'), findsOneWidget);
    await tester.tap(find.text('Өөр хаяг оруулах'));
    await tester.pump();
    expect(find.text('Нууц үг сэргээх'), findsOneWidget);
  });

  testWidgets('имэйлийн холбоосоор (#t=) шинэ нууц үг', (tester) async {
    http.json('POST', '/auth/reset-password/link', {'reset': true});
    await pumpAuthApp(tester, http: http, location: '/forgot-password#t=AbCdEfGhIjKlMnOpQrStUv');
    expect(find.text('Шинэ нууц үг'), findsWidgets);
    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), 'abcd1234');
    await tester.enterText(fields.at(1), 'abcd1234');
    await tester.tap(find.widgetWithText(FilledButton, 'Нууц үг солих'));
    await settle(tester);
    expect(http.requests.last.data, {'token': 'AbCdEfGhIjKlMnOpQrStUv', 'newPassword': 'abcd1234'});
    expect(find.text('Нууц үг солигдлоо'), findsOneWidget);
  });
}
