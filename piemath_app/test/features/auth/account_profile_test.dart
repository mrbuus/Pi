import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/features/auth/data/native_sign_in.dart';
import 'package:piemath_app/features/auth/ui/deletion_request_screen.dart';
import 'package:piemath_app/features/auth/ui/linked_accounts_card.dart';
import 'package:piemath_app/features/auth/ui/native_sign_in_section.dart';
import 'package:piemath_app/features/push/push_service.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import '../push/fake_push_messaging.dart';
import 'auth_test_helpers.dart';
import 'native_fakes.dart';

Map<String, Object?> _request(String status, {String? note}) => {
      'id': 'r1',
      'status': status,
      'reason': 'Шилжиж байна',
      'createdAt': '2026-11-02T03:00:00.000Z',
      'reviewedAt': null,
      'reviewNote': note,
    };

void main() {
  late FakeHttp http;
  late FakeNativeSignIn native;
  late FakePushMessaging push;

  setUp(() {
    http = FakeHttp()..json('GET', '/auth/me', fakeMe());
    native = FakeNativeSignIn(appleOn: false);
    push = FakePushMessaging(enabled: false);
  });

  Future<ProviderContainer> pump(WidgetTester tester, String location, {MemoryTokenStore? store}) => pumpAuthApp(
        tester,
        http: http,
        auth: store == null ? signedInStudent : null,
        store: store,
        location: location,
        overrides: [
          nativeSignInProvider.overrideWithValue(native),
          pushMessagingProvider.overrideWithValue(push),
        ],
      );

  Future<void> tapText(WidgetTester tester, String text) async {
    await tester.ensureVisible(find.text(text).last);
    await tester.pump();
    await tester.tap(find.text(text).last);
    await settle(tester);
  }

  group('холбосон бүртгэл', () {
    testWidgets('холбогдсон Google-ийн имэйл, салгах', (tester) async {
      http
        ..json('GET', '/auth/google/status', {
          'enabled': true,
          'linked': true,
          'identity': {'email': 'test@example.com'},
        })
        ..json('DELETE', '/auth/google/link', {'linked': false});
      await pump(tester, '/app/profile');
      expect(find.text('Холбосон бүртгэл'), findsOneWidget);
      expect(find.text('test@example.com'), findsOneWidget);
      await tapText(tester, 'Салгах');
      expect(find.text('Google бүртгэлийг салгах уу?'), findsOneWidget);
      await tapText(tester, 'Салгах');
      expect(http.count('DELETE', '/auth/google/link'), 1);
      expect(http.count('GET', '/auth/google/status'), 2);
    });

    testWidgets('холбох: taken бол тайлбар', (tester) async {
      http
        ..json('GET', '/auth/google/status', {'enabled': true, 'linked': false, 'identity': null})
        ..json('POST', '/auth/google/native/link', {'result': 'taken'});
      await pump(tester, '/app/profile');
      await tapText(tester, 'Google бүртгэл холбох');
      final req = http.requests.firstWhere((r) => r.path == '/auth/google/native/link');
      expect(req.data, {'idToken': 'g-id'});
      expect(req.headers['Authorization'], 'Bearer tok-old');
      expect(find.text(takenText(NativeProvider.google)), findsOneWidget);
    });

    testWidgets('Apple холбох: түүхий nonce илгээж «Холбогдсон»', (tester) async {
      native
        ..google = false
        ..appleOn = true;
      http.json('POST', '/auth/apple/link', {'result': 'linked'});
      await pump(tester, '/app/profile');
      await tapText(tester, 'Apple ID холбох');
      final req = http.requests.firstWhere((r) => r.path == '/auth/apple/link');
      expect(req.data, {'identityToken': 'a-id', 'nonce': native.lastRawNonce});
      expect(find.text('Холбогдсон'), findsOneWidget);
    });

    testWidgets('тохиргоогүй бол хэсэг харагдахгүй', (tester) async {
      native.google = false;
      await pump(tester, '/app/profile');
      expect(find.text('Холбосон бүртгэл'), findsNothing);
      expect(http.count('GET', '/auth/google/status'), 0);
    });
  });

  testWidgets('гарахын өмнө push токеныг серверээс устгана', (tester) async {
    native.google = false;
    push.enabled = true;
    http
      ..json('POST', '/devices', {'registered': true, 'pushEnabled': true})
      ..json('DELETE', '/devices/fcm%3Atok%2F1', {'registered': false});
    final container = await pump(tester, '/app/profile');
    // Хадгалсан токеноор эхэлсэн үеийн бүртгэл (bootstrap-ийн `pushSyncProvider`-ийн адил).
    await tester.runAsync(() => container.read(pushServiceProvider).register());
    expect(http.count('POST', '/devices'), 1);
    await tapText(tester, 'Гарах');
    await tapText(tester, 'Гарах');
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
    await settle(tester);
    expect(http.count('DELETE', '/devices/fcm%3Atok%2F1'), 1);
    expect(container.read(sessionProvider), isA<SignedOut>());
  });

  group('бүртгэл устгах хүсэлт', () {
    testWidgets('профайлаас нээгдэж, хүсэлтгүй бол маягт', (tester) async {
      native.google = false;
      http.json('GET', '/me/deletion-request', {'request': null});
      await pump(tester, '/app/profile');
      await tapText(tester, 'Бүртгэл устгах хүсэлт');
      expect(find.byType(DeletionRequestScreen), findsOneWidget);
      expect(find.text('Хүсэлт хэрхэн шийдвэрлэгдэх вэ'), findsOneWidget);
      expect(find.text('Хүсэлт илгээх'), findsWidgets);
    });

    testWidgets('илгээх: баталгаажуулаад POST, дараа нь төлөв харагдана', (tester) async {
      http
        ..json('GET', '/me/deletion-request', {'request': null})
        ..json('GET', '/me/deletion-request', {'request': _request('PENDING')})
        ..json('POST', '/me/deletion-request', {'created': true, 'request': _request('PENDING')});
      await pump(tester, '/app/profile/deletion-request');
      await tester.enterText(find.byType(TextField), '  Шилжиж байна  ');
      await tapText(tester, 'Хүсэлт илгээх');
      expect(find.text('Бүртгэл устгах хүсэлт илгээх үү?'), findsOneWidget);
      await tapText(tester, 'Илгээх');
      final req = http.requests.firstWhere((r) => r.method == 'POST' && r.path == '/me/deletion-request');
      expect(req.data, {'reason': 'Шилжиж байна'});
      expect(find.text('Хүлээн авсан'), findsOneWidget);
      expect(find.text(deletionReceivedText), findsWidgets);
      expect(find.byType(TextField), findsNothing);
    });

    testWidgets('болих дарвал илгээхгүй', (tester) async {
      http.json('GET', '/me/deletion-request', {'request': null});
      await pump(tester, '/app/profile/deletion-request');
      await tapText(tester, 'Хүсэлт илгээх');
      await tapText(tester, 'Болих');
      expect(http.count('POST', '/me/deletion-request'), 0);
    });

    testWidgets('татгалзсан хүсэлт: хариу харагдаж, дахин илгээж болно', (tester) async {
      http.json('GET', '/me/deletion-request', {'request': _request('REJECTED', note: 'Төлбөрийн үлдэгдэлтэй')});
      await pump(tester, '/app/profile/deletion-request');
      expect(find.text('Татгалзсан'), findsOneWidget);
      expect(find.text('Төлбөрийн үлдэгдэлтэй'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('ачаалах алдаа: дахин оролдох', (tester) async {
      http
        ..on('GET', '/me/deletion-request', (_) => const FakeResponse.network())
        ..on('GET', '/me/deletion-request', (_) => const FakeResponse.network())
        ..json('GET', '/me/deletion-request', {'request': null});
      await pump(tester, '/app/profile/deletion-request');
      expect(find.text('Дахин оролдох'), findsOneWidget);
      await tapText(tester, 'Дахин оролдох');
      expect(find.text('Хүсэлт хэрхэн шийдвэрлэгдэх вэ'), findsOneWidget);
    });
  });
}
