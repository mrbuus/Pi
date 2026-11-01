import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/app/shell/pending_screen.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/auth/data/login_prefs.dart';
import 'package:piemath_app/features/auth/ui/forgot_password_screen.dart';
import 'package:piemath_app/features/auth/ui/login_screen.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'auth_test_helpers.dart';

Future<void> fillAndSubmit(WidgetTester tester, {String identifier = ' 99112233 ', String password = '99112233'}) async {
  await tester.enterText(find.byType(TextField).at(0), identifier);
  await tester.enterText(find.byType(TextField).at(1), password);
  await tester.tap(find.widgetWithText(FilledButton, 'Нэвтрэх'));
  await settle(tester);
}

void main() {
  late FakeHttp http;
  setUp(() => http = FakeHttp());

  testWidgets('анхны төлөв: талбарууд, «Намайг сана» чагттай, нууц үг нуугдсан', (tester) async {
    await pumpAuthApp(tester, http: http);
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.text('Утас, имэйл эсвэл нэвтрэх нэр'), findsOneWidget);
    final cb = tester.widget<Checkbox>(find.byType(Checkbox));
    expect(cb.value, isTrue);
    final pw = tester.widget<TextField>(find.byType(TextField).at(1));
    expect(pw.obscureText, isTrue);
    await tester.tap(find.byTooltip('Нууц үгийг харах'));
    await tester.pump();
    expect(tester.widget<TextField>(find.byType(TextField).at(1)).obscureText, isFalse);
    expect(find.text('Нууц үгээ мартсан уу?'), findsOneWidget);
  });

  testWidgets('сүүлд оруулсан нэвтрэх нэр, «Намайг сана»-г санана', (tester) async {
    await pumpAuthApp(tester, http: http, prefs: MemoryLoginPrefs(identifier: '88001122', rememberValue: false));
    expect(find.text('88001122'), findsOneWidget);
    expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isFalse);
  });

  testWidgets('хоосон бол талбарын алдаа, хүсэлт илгээхгүй', (tester) async {
    await pumpAuthApp(tester, http: http);
    await tester.tap(find.widgetWithText(FilledButton, 'Нэвтрэх'));
    await tester.pump();
    expect(find.text('Утас, имэйл эсвэл нэвтрэх нэрээ оруулна уу'), findsOneWidget);
    expect(find.text('Нууц үгээ оруулна уу'), findsOneWidget);
    expect(http.count('POST', '/auth/login'), 0);
  });

  testWidgets('амжилттай: trim хийсэн нэр, remember, session, нүүр рүү', (tester) async {
    http
      ..json('POST', '/auth/login', {'accessToken': 'tok-new', 'userId': 'u1', 'role': 'STUDENT'})
      ..json('GET', '/auth/me', fakeMe());
    final prefs = MemoryLoginPrefs();
    final store = MemoryTokenStore();
    final c = await pumpAuthApp(tester, http: http, prefs: prefs, store: store);
    await fillAndSubmit(tester);

    final req = http.requests.firstWhere((r) => r.path == '/auth/login');
    expect(req.data, {'identifier': '99112233', 'password': '99112233', 'remember': true});
    expect(req.headers.containsKey('Authorization'), isFalse);
    expect(c.read(sessionProvider), isA<SignedIn>());
    expect((c.read(sessionProvider) as SignedIn).role, UserRole.student);
    expect(store.lastPersist, isTrue);
    expect(prefs.identifier, '99112233');
    // Сурагчийн нүүр хараахан хийгдээгүй — «удахгүй» дэлгэц, нэвтрэх дэлгэц биш.
    expect(find.byType(LoginScreen), findsNothing);
    expect(find.byType(PendingScreen), findsOneWidget);
  });

  testWidgets('«Намайг сана» авбал remember: false, токен зөвхөн санах ойд', (tester) async {
    http
      ..json('POST', '/auth/login', {'accessToken': 't', 'userId': 'u1', 'role': 'PARENT'})
      ..json('GET', '/auth/me', fakeMe(role: 'PARENT'));
    final store = MemoryTokenStore();
    await pumpAuthApp(tester, http: http, store: store);
    await tester.tap(find.text('Намайг сана'));
    await tester.pump();
    await fillAndSubmit(tester);
    expect(http.requests.firstWhere((r) => r.path == '/auth/login').data, containsPair('remember', false));
    expect(store.lastPersist, isFalse);
  });

  testWidgets('буруу нууц үг: серверийн монгол мессеж, 2 удаагийн дараа сэргээх товч тод', (tester) async {
    http.error('POST', '/auth/login', 401, 'Нэвтрэх мэдээлэл эсвэл нууц үг буруу байна');
    final c = await pumpAuthApp(tester, http: http);
    await fillAndSubmit(tester);
    expect(find.text('Нэвтрэх мэдээлэл эсвэл нууц үг буруу байна'), findsOneWidget);
    expect(c.read(sessionProvider), isA<SignedOut>());
    expect(find.text('Нууц үгээ мартсан уу?'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Нэвтрэх'));
    await settle(tester);
    expect(find.text('Нууц үгээ сэргээх'), findsOneWidget);
    expect(find.text('Нууц үгээ мартсан уу?'), findsNothing);

    await tester.tap(find.text('Нууц үгээ сэргээх'));
    await settle(tester);
    expect(find.byType(ForgotPasswordScreen), findsOneWidget);
  });

  testWidgets('түгжээ (429): серверийн мессеж', (tester) async {
    const lock =
        'Олон удаа буруу оролдсон тул 15 минутын дараа дахин оролдоно уу. Нууц үгээ мартсан бол «Нууц үг сэргээх»-ийг ашиглана уу.';
    http.error('POST', '/auth/login', 429, lock);
    await pumpAuthApp(tester, http: http);
    await fillAndSubmit(tester);
    expect(find.text(lock), findsOneWidget);
  });

  testWidgets('сүлжээгүй: ойлгомжтой монгол мессеж', (tester) async {
    http.on('POST', '/auth/login', (_) => const FakeResponse.network());
    await pumpAuthApp(tester, http: http);
    await fillAndSubmit(tester);
    expect(find.text(AppStrings.networkError), findsOneWidget);
  });

  testWidgets('сесс дууссан шалтгааныг харуулна', (tester) async {
    http.error('GET', '/auth/me', 401, 'Нууц үг өөрчлөгдсөн тул дахин нэвтэрнэ үү');
    await pumpAuthApp(tester, http: http, auth: signedInStudent);
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.text('Нууц үг өөрчлөгдсөн тул дахин нэвтэрнэ үү'), findsOneWidget);
  });

  testWidgets('сургалтын төвийн зарлал', (tester) async {
    http.json('GET', '/auth/login-text', {'body': 'Шинэ улирал 9-р сарын 1-нд эхэлнэ', 'updatedAt': null});
    await pumpAuthApp(tester, http: http);
    expect(find.text('Шинэ улирал 9-р сарын 1-нд эхэлнэ'), findsOneWidget);
  });

  testWidgets('нэвтэрсний дараа ?next= руу очно', (tester) async {
    http
      ..json('POST', '/auth/login', {'accessToken': 't', 'userId': 'u1', 'role': 'STUDENT'})
      ..json('GET', '/auth/me', fakeMe());
    final c = await pumpAuthApp(tester, http: http, location: '/app/notifications');
    expect(find.byType(LoginScreen), findsOneWidget);
    await fillAndSubmit(tester);
    expect(c.read(sessionProvider), isA<SignedIn>());
    final pending = tester.widget<PendingScreen>(find.byType(PendingScreen));
    expect(pending.path, '/app/notifications');
  });
}
