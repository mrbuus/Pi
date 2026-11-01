import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/auth/data/account_repository.dart';
import 'package:piemath_app/features/auth/data/native_sign_in.dart';
import 'package:piemath_app/features/auth/ui/login_screen.dart';
import 'package:piemath_app/features/auth/ui/native_sign_in_section.dart';
import 'package:piemath_app/features/push/push_service.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import '../push/fake_push_messaging.dart';
import 'auth_test_helpers.dart';
import 'native_fakes.dart';

const _ok = {'status': 'ok', 'accessToken': 'tok-native', 'userId': 'u1', 'role': 'STUDENT'};

void main() {
  group('nonce', () {
    test('түүхий nonce санамсаргүй, 43 тэмдэгт, base64url', () {
      final a = generateRawNonce();
      final b = generateRawNonce();
      expect(a, isNot(b));
      expect(a.length, 43);
      expect(RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(a), isTrue);
    });

    test('Apple-д SHA-256 hex', () {
      final raw = generateRawNonce(Random(1));
      expect(sha256OfNonce(raw), sha256.convert(raw.codeUnits).toString());
      expect(sha256OfNonce(raw), hasLength(64));
    });
  });

  group('NativeLoginResult', () {
    test('ok / signup / not_linked', () {
      expect(NativeLoginResult.fromJson(_ok), isA<NativeLoginOk>());
      expect(NativeLoginResult.fromJson({'status': 'signup', 'ticket': 't'}), isA<NativeLoginSignup>());
      expect(NativeLoginResult.fromJson({'status': 'not_linked'}), isA<NativeLoginNotLinked>());
      expect(() => NativeLoginResult.fromJson({'status': 'x'}), throwsFormatException);
    });
  });

  group('нэвтрэх дэлгэц', () {
    late FakeHttp http;
    late FakeNativeSignIn native;
    setUp(() {
      http = FakeHttp();
      native = FakeNativeSignIn();
    });

    Future<void> pump(WidgetTester tester, {FakePushMessaging? push}) => pumpAuthApp(
          tester,
          http: http,
          overrides: [
            nativeSignInProvider.overrideWithValue(native),
            pushMessagingProvider.overrideWithValue(push ?? FakePushMessaging(enabled: false)),
          ],
        );

    Future<void> tapText(WidgetTester tester, String text) async {
      await tester.ensureVisible(find.text(text));
      await tester.pump();
      await tester.tap(find.text(text));
      await settle(tester);
    }

    testWidgets('тохиргоогүй бол товч харагдахгүй', (tester) async {
      native
        ..google = false
        ..appleOn = false;
      await pump(tester);
      expect(find.byType(LoginScreen), findsOneWidget);
      expect(find.text('Google-ээр нэвтрэх'), findsNothing);
      expect(find.text('Apple-ээр нэвтрэх'), findsNothing);
    });

    testWidgets('Google ok: remember-тэй илгээж нэвтэрнэ, push бүртгэнэ', (tester) async {
      http
        ..json('POST', '/auth/google/native', _ok)
        ..json('GET', '/auth/me', fakeMe())
        ..json('POST', '/devices', {'registered': true, 'pushEnabled': false});
      await pump(tester, push: FakePushMessaging());
      expect(find.text('Google-ээр нэвтрэх'), findsOneWidget);
      final buttonSize = tester.getSize(find.widgetWithText(OutlinedButton, 'Google-ээр нэвтрэх'));
      expect(buttonSize.height, greaterThanOrEqualTo(48));
      await tapText(tester, 'Google-ээр нэвтрэх');
      final req = http.requests.firstWhere((r) => r.path == '/auth/google/native');
      expect(req.data, {'idToken': 'g-id', 'remember': true});
      expect(req.headers['Authorization'], isNull);
      expect(find.byType(LoginScreen), findsNothing);
      expect(http.count('POST', '/devices'), 1);
    });

    testWidgets('цуцалбал сервер рүү илгээхгүй, алдаа харуулахгүй', (tester) async {
      native.googleToken = null;
      await pump(tester);
      await tapText(tester, 'Google-ээр нэвтрэх');
      expect(native.googleCalls, 1);
      expect(http.count('POST', '/auth/google/native'), 0);
      expect(find.byType(LoginScreen), findsOneWidget);
    });

    testWidgets('not_linked: утсаар нэвтэрч профайлаас холбохыг тайлбарлана', (tester) async {
      http.json('POST', '/auth/google/native', {'status': 'not_linked'});
      await pump(tester);
      await tapText(tester, 'Google-ээр нэвтрэх');
      expect(find.text(notLinkedText(NativeProvider.google)), findsOneWidget);
      expect(find.byType(LoginScreen), findsOneWidget);
    });

    testWidgets('signup: бүртгэл олдсонгүй гэж тайлбарлана', (tester) async {
      http.json('POST', '/auth/google/native', {'status': 'signup', 'ticket': 'tk'});
      await pump(tester);
      await tapText(tester, 'Google-ээр нэвтрэх');
      expect(find.text(googleSignupText), findsOneWidget);
    });

    testWidgets('503: товчийг нууж, утсаар нэвтрэхийг санал болгоно', (tester) async {
      http.error('POST', '/auth/google/native', 503, 'Google нэвтрэлт тохируулагдаагүй байна');
      await pump(tester);
      await tapText(tester, 'Google-ээр нэвтрэх');
      expect(find.text('Google-ээр нэвтрэх'), findsNothing);
      expect(find.text(nativeUnavailableText(NativeProvider.google)), findsOneWidget);
    });

    testWidgets('плагины алдаа монголоор', (tester) async {
      native.throwOnGoogle = const NativeSignInException('Google-ээр нэвтэрч чадсангүй');
      await pump(tester);
      await tapText(tester, 'Google-ээр нэвтрэх');
      expect(find.text('Google-ээр нэвтэрч чадсангүй'), findsOneWidget);
    });

    testWidgets('Apple: ТҮҮХИЙ nonce-ийг серверт илгээж нэвтэрнэ', (tester) async {
      http
        ..json('POST', '/auth/apple', _ok)
        ..json('GET', '/auth/me', fakeMe());
      await pump(tester);
      await tapText(tester, 'Apple-ээр нэвтрэх');
      final req = http.requests.firstWhere((r) => r.path == '/auth/apple');
      expect(req.data, {'identityToken': 'a-id', 'nonce': native.lastRawNonce, 'remember': true});
      expect(find.byType(LoginScreen), findsNothing);
    });
  });
}
