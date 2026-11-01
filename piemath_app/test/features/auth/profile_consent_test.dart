import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/auth/domain/password_policy.dart';
import 'package:piemath_app/features/auth/ui/consent_screen.dart';
import 'package:piemath_app/features/auth/ui/login_screen.dart';
import 'package:piemath_app/features/auth/ui/profile_screen.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'auth_test_helpers.dart';

Map<String, Object?> _me({String role = 'STUDENT'}) => {
      ...fakeMe(role: role),
      'firstName': 'Нараа',
      'lastName': 'Болд',
      'email': 'naraa@example.com',
      'studentCode': role == 'STUDENT' ? 'M1234' : null,
      'teacherCode': role == 'TEACHER_PLUS' ? 'T0042' : null,
    };

Future<void> fillChange(WidgetTester tester, {required String current, required String next, String? confirm}) async {
  final form = find.byType(TextField);
  await tester.enterText(form.at(0), current);
  await tester.enterText(form.at(1), next);
  await tester.enterText(form.at(2), confirm ?? next);
  await tester.pump();
  final btn = find.widgetWithText(FilledButton, 'Нууц үг солих');
  await tester.ensureVisible(btn);
  await tester.pump();
  await tester.tap(btn);
  await settle(tester);
}

void main() {
  late FakeHttp http;
  setUp(() => http = FakeHttp());

  group('профайл', () {
    testWidgets('мэдээлэл, код, Багш+ нэрийн ард «+»', (tester) async {
      http.json('GET', '/auth/me', _me(role: 'TEACHER_PLUS'));
      await pumpAuthApp(tester, http: http, auth: signedInStudent, location: '/app/profile');
      expect(find.byType(ProfileScreen), findsOneWidget);
      expect(find.text('Б. Нараа+'), findsOneWidget);
      expect(find.text('Багш+'), findsOneWidget);
      expect(find.text('T0042'), findsOneWidget);
      expect(find.text('Багшийн код'), findsOneWidget);
      expect(find.text('Болд Нараа'), findsOneWidget);
      expect(find.text('naraa@example.com'), findsOneWidget);
    });

    testWidgets('код хуулах', (tester) async {
      String? copied;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
        if (call.method == 'Clipboard.setData') copied = (call.arguments as Map)['text'] as String?;
        return null;
      });
      addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
      http.json('GET', '/auth/me', _me());
      await pumpAuthApp(tester, http: http, auth: signedInStudent, location: '/app/profile');
      await tester.tap(find.text('Хуулах'));
      await tester.pump();
      expect(copied, 'M1234');
      expect(find.text('Сурагчийн код хуулагдлаа'), findsOneWidget);
    });

    testWidgets('офлайнаар эхэлсэн, хэрэглэгчийн мэдээлэлгүй бол алдаа + дахин оролдох', (tester) async {
      http.on('GET', '/auth/me', (_) => const FakeResponse.network());
      await pumpAuthApp(tester, http: http, auth: signedInStudent, location: '/app/profile');
      expect(find.text(AppStrings.networkError), findsOneWidget);
      expect(find.text(AppStrings.retry), findsOneWidget);
    });

    testWidgets('нууц үг солих: шинэ токеноор солино', (tester) async {
      http
        ..json('GET', '/auth/me', _me())
        ..json('POST', '/auth/change-password', {
          'changed': true,
          'accessToken': 'tok-new',
          'userId': 'u1',
          'role': 'STUDENT',
        });
      final store = MemoryTokenStore(signedInStudent);
      final c = await pumpAuthApp(tester, http: http, store: store, location: '/app/profile');
      await fillChange(tester, current: '99000000', next: 'naraa2026');
      final req = http.requests.firstWhere((r) => r.path == '/auth/change-password');
      expect(req.data, {'currentPassword': '99000000', 'newPassword': 'naraa2026'});
      expect(req.headers['Authorization'], 'Bearer tok-old');
      expect((await store.read())!.token, 'tok-new');
      expect(c.read(tokenHolderProvider).token, 'tok-new');
      expect(find.textContaining('Нууц үг амжилттай солигдлоо'), findsOneWidget);
    });

    testWidgets('нууц үг солих: утасны дугаартай ижил бол серверт илгээхгүй', (tester) async {
      http.json('GET', '/auth/me', _me());
      await pumpAuthApp(tester, http: http, auth: signedInStudent, location: '/app/profile');
      // fakeMe-ийн утас 99000000; үсэггүй тул эхлээд бодлогын алдаа.
      await fillChange(tester, current: 'x', next: '99000000');
      expect(find.text(passwordPolicyMessage), findsOneWidget);
      expect(http.count('POST', '/auth/change-password'), 0);
    });

    testWidgets('нууц үг солих: одоогийн нууц үг буруу', (tester) async {
      http
        ..json('GET', '/auth/me', _me())
        ..error('POST', '/auth/change-password', 400, 'Одоогийн нууц үг буруу байна');
      await pumpAuthApp(tester, http: http, auth: signedInStudent, location: '/app/profile');
      await fillChange(tester, current: 'wrong', next: 'naraa2026');
      expect(find.text('Одоогийн нууц үг буруу байна'), findsOneWidget);
    });

    testWidgets('нууц үг давталт таарахгүй', (tester) async {
      http.json('GET', '/auth/me', _me());
      await pumpAuthApp(tester, http: http, auth: signedInStudent, location: '/app/password');
      expect(find.byType(ChangePasswordScreen), findsOneWidget);
      await fillChange(tester, current: 'a', next: 'naraa2026', confirm: 'naraa2027');
      expect(find.text(passwordMismatchMessage), findsWidgets);
      expect(http.count('POST', '/auth/change-password'), 0);
    });

    testWidgets('гарах', (tester) async {
      http.json('GET', '/auth/me', _me());
      final c = await pumpAuthApp(tester, http: http, auth: signedInStudent, location: '/app/profile');
      final logout = find.widgetWithText(OutlinedButton, 'Гарах');
      await tester.ensureVisible(logout);
      await tester.pump();
      await tester.tap(logout);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(TextButton, 'Гарах'));
      await settle(tester);
      expect(c.read(sessionProvider), isA<SignedOut>());
      expect(find.byType(LoginScreen), findsOneWidget);
    });
  });

  group('зөвшөөрөл', () {
    const status = {
      'termsAcceptedAt': null,
      'privacyVersion': null,
      'guardianConsentAt': null,
      'currentVersion': '2026-09-26-draft',
      'needsConsent': true,
    };

    test('consentReady (вэбийн consentReady)', () {
      expect(consentReady(acceptTerms: false, isMinor: false, guardianConsent: false), isFalse);
      expect(consentReady(acceptTerms: true, isMinor: null, guardianConsent: false), isFalse);
      expect(consentReady(acceptTerms: true, isMinor: true, guardianConsent: false), isFalse);
      expect(consentReady(acceptTerms: true, isMinor: true, guardianConsent: true), isTrue);
      expect(consentReady(acceptTerms: true, isMinor: false, guardianConsent: false), isTrue);
      expect(consentGateEnabled, isFalse, reason: 'вэбийн адил унтраалттай');
    });

    testWidgets('аль хэдийн зөвшөөрсөн', (tester) async {
      http
        ..json('GET', '/auth/me', _me())
        ..json('GET', '/consent/my', {
          ...status,
          'needsConsent': false,
          'privacyVersion': '2026-09-26-draft',
          'termsAcceptedAt': '2026-10-01T00:00:00.000Z',
        });
      await pumpAuthApp(tester, http: http, auth: signedInStudent, location: '/app/consent');
      expect(find.byType(ConsentScreen), findsOneWidget);
      expect(find.text('Зөвшөөрөл бүртгэгдсэн'), findsOneWidget);
    });

    testWidgets('насанд хүрээгүй бол эцэг эхийн зөвшөөрөл заавал, хадгална', (tester) async {
      http
        ..json('GET', '/auth/me', _me())
        ..json('GET', '/consent/my', status)
        // Хадгалсны дараа дахин уншихад сервер шинэ төлөв буцаана.
        ..json('GET', '/consent/my', {...status, 'needsConsent': false, 'privacyVersion': '2026-09-26-draft'})
        ..json('POST', '/consent/my', {...status, 'needsConsent': false, 'privacyVersion': '2026-09-26-draft'});
      await pumpAuthApp(tester, http: http, auth: signedInStudent, location: '/app/consent');
      FilledButton save() => tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Зөвшөөрч хадгалах'));
      expect(save().onPressed, isNull);

      await tester.tap(find.byType(Checkbox).first);
      await tester.tap(find.text('18 нас хүрээгүй'));
      await tester.pump();
      expect(save().onPressed, isNull, reason: 'эцэг эхийн зөвшөөрөлгүй');
      await tester.tap(find.byType(Checkbox).last);
      await tester.pump();
      expect(save().onPressed, isNotNull);

      await tester.tap(find.widgetWithText(FilledButton, 'Зөвшөөрч хадгалах'));
      await settle(tester);
      final post = http.requests.firstWhere((r) => r.method == 'POST' && r.path == '/consent/my');
      expect(post.data, {
        'acceptTerms': true,
        'privacyVersion': '2026-09-26-draft',
        'isMinor': true,
        'guardianConsent': true,
      });
      expect(find.text('Зөвшөөрөл бүртгэгдсэн'), findsOneWidget);
    });

    testWidgets('ачаалж чадаагүй бол алдаа + дахин оролдох', (tester) async {
      http
        ..json('GET', '/auth/me', _me())
        ..on('GET', '/consent/my', (_) => const FakeResponse.network());
      await pumpAuthApp(tester, http: http, auth: signedInStudent, location: '/app/consent');
      expect(find.text('Зөвшөөрлийн мэдээллийг авч чадсангүй'), findsOneWidget);
      expect(find.text(AppStrings.retry), findsOneWidget);
    });
  });
}
