import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/app/router.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/features/auth/auth_routes.dart';
import 'package:piemath_app/features/auth/data/register_repository.dart';
import 'package:piemath_app/features/auth/ui/register_screen.dart';
import 'package:piemath_app/features/legal/legal_content.dart';
import 'package:piemath_app/features/legal/legal_screen.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import '../scan/scan_test_helpers.dart' as scan;
import 'auth_test_helpers.dart';

const _windows = [
  {'subject': 'MATH', 'status': 'OPEN', 'availability': 'BOTH', 'centreOnlineClassEnabled': false},
  {'subject': 'SOCIAL_STUDIES', 'status': 'OPEN', 'availability': 'CLASSROOM_ONLY', 'centreOnlineClassEnabled': false},
];

Future<void> _scrollTo(WidgetTester tester, Finder f) async {
  await tester.scrollUntilVisible(f, 200, scrollable: find.byType(Scrollable).first);
  await tester.pump();
}

/// Нөхцөл зөвшөөрөх + насны ангилал (18+).
Future<void> _acceptConsent(WidgetTester tester) async {
  final terms = find.bySemanticsLabel('Үйлчилгээний нөхцөл, нууцлалын бодлогыг уншиж зөвшөөрч байна');
  await _scrollTo(tester, find.text('18 ба түүнээс дээш'));
  await tester.tap(find.byWidgetPredicate((w) => w is Checkbox && w.semanticLabel == 'Үйлчилгээний нөхцөл, нууцлалын бодлогыг уншиж зөвшөөрч байна'));
  await tester.pump();
  await tester.tap(find.text('18 ба түүнээс дээш'));
  await tester.pump();
  expect(terms, findsWidgets);
}

Map<String, Object?> _registerBody(FakeHttp http) =>
    (http.requests.lastWhere((r) => r.path == '/auth/register').data as Map).cast<String, Object?>();

void main() {
  group('бүртгэлийн логик (вэбтэй ижил)', () {
    test('талбарын шалгалт', () {
      final e = validateRegister(
        kind: RegisterKind.classroom,
        lastName: ' ',
        firstName: 'Тэмүүжин',
        phone: '9911',
        activationCode: '123',
        subjects: const {},
      );
      expect(e.keys, containsAll(['lastName', 'phone', 'activationCode', 'subjects']));
      expect(e.containsKey('firstName'), isFalse);
      expect(
        validateRegister(
          kind: RegisterKind.parent,
          lastName: 'Бат',
          firstName: 'Сараа',
          phone: '99112233',
          activationCode: '',
          subjects: const {},
        ),
        isEmpty,
      );
    });

    test('хичээл → серверийн хуучин утга (ганц бол тэр, бусад BOTH)', () {
      expect(legacyRegisterSubject({RegisterSubject.math}), 'MATH');
      expect(legacyRegisterSubject({RegisterSubject.socialStudies}), 'SOCIAL_STUDIES');
      expect(legacyRegisterSubject({RegisterSubject.math, RegisterSubject.socialStudies}), 'BOTH');
    });

    test('онлайн анги хаалттай бол хичээл түгжээтэй', () {
      const w = EnrollmentWindow(subject: RegisterSubject.math);
      expect(subjectLockReason(w, RegisterKind.online), contains('онлайн анги'));
      expect(subjectLockReason(w, RegisterKind.classroom), isNull);
      const closed = EnrollmentWindow(subject: RegisterSubject.math, status: 'CLOSED');
      expect(subjectLockReason(closed, RegisterKind.classroom), contains('дууссан'));
    });

    test('серверийн бодлогын хувилбартай ижил', () {
      expect(privacyVersion, '2026-09-26-draft');
    });
  });

  group('бүртгүүлэх дэлгэц', () {
    late FakeHttp http;
    setUp(() => http = FakeHttp()..json('GET', '/enrollment-windows', _windows));

    testWidgets('нэвтрэхээс «Бүртгүүлэх» → апп доторх бүртгэл (вэб биш)', (tester) async {
      await pumpAuthApp(tester, http: http);
      await tester.tap(find.text('Бүртгүүлэх'));
      await settle(tester);
      expect(find.byType(RegisterScreen), findsOneWidget);
      expect(find.text('1. Та хэн бэ?'), findsOneWidget);
      // Онлайн анги серверээр нээгдээгүй
      expect(find.text(onlineClosedText), findsOneWidget);
    });

    testWidgets('эцэг эх: талбарын алдаа → бүртгэл → нэвтэрнэ', (tester) async {
      http
        ..json('POST', '/auth/register', {'accessToken': 'tok', 'userId': 'p1', 'role': 'PARENT'})
        ..json('GET', '/auth/me', fakeMe(id: 'p1', role: 'PARENT'));
      final c = await pumpAuthApp(tester, http: http, location: '/register');
      await tester.tap(find.text('Эцэг эх'));
      await settle(tester);
      await _acceptConsent(tester);
      await _scrollTo(tester, find.widgetWithText(FilledButton, 'Бүртгүүлэх'));
      await tester.tap(find.widgetWithText(FilledButton, 'Бүртгүүлэх'));
      await settle(tester);
      expect(http.count('POST', '/auth/register'), 0);
      await tester.scrollUntilVisible(find.text('Утасны дугаар яг 8 оронтой байх ёстой'), -200, scrollable: find.byType(Scrollable).first);
      expect(find.text('Утасны дугаар яг 8 оронтой байх ёстой'), findsOneWidget);

      await tester.enterText(find.widgetWithText(TextField, 'Овог'), 'Бат');
      await tester.enterText(find.widgetWithText(TextField, 'Нэр'), 'Сараа');
      await tester.enterText(find.widgetWithText(TextField, 'Утасны дугаар'), '99112233');
      await _scrollTo(tester, find.widgetWithText(FilledButton, 'Бүртгүүлэх'));
      await tester.tap(find.widgetWithText(FilledButton, 'Бүртгүүлэх'));
      await settle(tester);

      final body = _registerBody(http);
      expect(body['asParent'], isTrue);
      expect(body['phone'], '99112233');
      expect(body['acceptTerms'], isTrue);
      expect(body['isMinor'], isFalse);
      expect(body['privacyVersion'], privacyVersion);
      expect(body.containsKey('studentType'), isFalse);
      expect(c.read(sessionProvider), isA<SignedIn>());
      expect(find.byType(RegisterScreen), findsNothing);
    });

    testWidgets('танхимын сурагч: хичээл, код → сурагчийн код харуулна', (tester) async {
      http
        ..json('POST', '/auth/register', {'accessToken': 'tok', 'userId': 's1', 'role': 'STUDENT', 'studentCode': 'B27120001'})
        ..json('GET', '/auth/me', fakeMe(id: 's1'));
      final c = await pumpAuthApp(tester, http: http, location: '/register');
      await tester.tap(find.text('Танхимын сурагч'));
      await settle(tester);
      await tester.enterText(find.widgetWithText(TextField, 'Овог'), 'Бат');
      await tester.enterText(find.widgetWithText(TextField, 'Нэр'), 'Тэмүүжин');
      await tester.enterText(find.widgetWithText(TextField, 'Утасны дугаар'), '88112233');
      await _scrollTo(tester, find.text('Математик'));
      final math = find.byWidgetPredicate((w) => w is Checkbox && w.semanticLabel == 'Математик');
      await tester.ensureVisible(math);
      await tester.pump();
      await tester.tap(math);
      await tester.pump();
      expect(find.text('1 хичээл сонгосон'), findsOneWidget);
      await _scrollTo(tester, find.widgetWithText(TextField, 'Багшаас авсан өнөөдрийн код'));
      await tester.enterText(find.widgetWithText(TextField, 'Багшаас авсан өнөөдрийн код'), '20261110');
      await _acceptConsent(tester);
      await _scrollTo(tester, find.widgetWithText(FilledButton, 'Бүртгүүлэх'));
      await tester.tap(find.widgetWithText(FilledButton, 'Бүртгүүлэх'));
      await settle(tester);

      final body = _registerBody(http);
      expect(body['studentType'], 'CLASSROOM');
      expect(body['subject'], 'MATH');
      expect(body['grade'], 12);
      expect(body['activationCode'], '20261110');
      // Код харуулах үед хараахан нэвтрээгүй (redirect дэлгэцийг солихгүй)
      expect(find.text('B27120001'), findsOneWidget);
      expect(c.read(sessionProvider), isA<SignedOut>());
      await tester.tap(find.text('Үргэлжлүүлэх'));
      await settle(tester);
      expect(c.read(sessionProvider), isA<SignedIn>());
    });

    testWidgets('нөхцөлийн холбоос апп доторх бодлогын хуудас нээнэ', (tester) async {
      final c = await pumpAuthApp(tester, http: http, location: '/register');
      await tester.tap(find.text('Бие даан суралцах'));
      await settle(tester);
      await _scrollTo(tester, find.text('18 ба түүнээс дээш'));
      unawaited(c.read(routerProvider).push('/privacy'));
      await settle(tester);
      expect(find.byType(LegalScreen), findsOneWidget);
      expect(find.text(privacySections.first.title), findsOneWidget);
    });
  });

  group('багшийн бүртгэл', () {
    testWidgets('шалгалт → илгээх → амжилт', (tester) async {
      final http = FakeHttp()..json('POST', '/teacher-groups/register', {'ok': true});
      await scan.pumpRouted(
        tester,
        initial: '/teacher-register',
        routes: authRoutes.public,
        http: http,
        session: const SignedOut(),
      );
      await scan.settle(tester);
      await _scrollTo(tester, find.widgetWithText(FilledButton, 'Бүртгүүлэх'));
      await tester.tap(find.widgetWithText(FilledButton, 'Бүртгүүлэх'));
      await tester.pump();
      expect(http.count('POST', '/teacher-groups/register'), 0);
      await tester.scrollUntilVisible(find.text('Имэйл хаягаа зөв оруулна уу'), -200, scrollable: find.byType(Scrollable).first);
      expect(find.text('Имэйл хаягаа зөв оруулна уу'), findsOneWidget);
      await tester.enterText(find.widgetWithText(TextField, 'Имэйл'), 'bagsh@example.com');
      await tester.enterText(find.widgetWithText(TextField, 'Нэр'), 'Сараа');
      await tester.enterText(find.widgetWithText(TextField, 'Овог'), 'Бат');
      await tester.enterText(find.widgetWithText(TextField, 'Нууц үг'), 'nuuts1234');
      await _scrollTo(tester, find.widgetWithText(FilledButton, 'Бүртгүүлэх'));
      await tester.tap(find.widgetWithText(FilledButton, 'Бүртгүүлэх'));
      await scan.settle(tester);
      final body = (http.requests.single.data as Map).cast<String, Object?>();
      expect(body, {'email': 'bagsh@example.com', 'firstName': 'Сараа', 'lastName': 'Бат', 'password': 'nuuts1234'});
      expect(find.text('Бүртгэл үүслээ'), findsOneWidget);
    });
  });

  group('бодлогын хуудас', () {
    testWidgets('нууцлал → нөхцөл, брэнд Piemath', (tester) async {
      final c = await pumpAuthApp(tester, http: FakeHttp(), location: '/privacy');
      expect(find.text('Нууцлалын бодлого'), findsWidgets);
      expect(find.text(legalDraftNotice), findsOneWidget);
      await _scrollTo(tester, find.text('Үйлчилгээний нөхцөл'));
      await tester.tap(find.widgetWithText(OutlinedButton, 'Үйлчилгээний нөхцөл'));
      await settle(tester);
      expect(c.read(routerProvider).routerDelegate.currentConfiguration.uri.path, '/terms');
      expect(find.textContaining('Piemath нь сургалтын агуулга'), findsOneWidget);
    });
  });
}
