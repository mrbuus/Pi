import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/app/redirect.dart';
import 'package:piemath_app/core/auth/current_user.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';

import '../helpers/test_container.dart';

SignedIn signedIn(UserRole role, {Map<String, Object?>? me}) => SignedIn(
      StoredAuth(token: 't', userId: 'u1', role: role),
      me == null ? null : CurrentUser.fromJson(me),
    );

void main() {
  Uri u(String s) => Uri.parse(s);

  group('safeNext', () {
    test('зөвхөн дотоод зам', () {
      expect(safeNext('/app/tests/1'), '/app/tests/1');
      expect(safeNext('//evil.com'), isNull);
      expect(safeNext('https://evil.com'), isNull);
      expect(safeNext('/login?next=/x'), isNull);
      expect(safeNext('/app/a b'), isNull);
      expect(safeNext(null), isNull);
    });
  });

  group('appRedirect', () {
    test('сэргээж байхад splash, очих замыг хадгална', () {
      expect(appRedirect(const SessionRestoring(), u('/app/tests/5')), '/splash?next=%2Fapp%2Ftests%2F5');
      expect(appRedirect(const SessionRestoring(), u('/splash')), isNull);
    });

    test('нэвтрээгүй бол login, буцах замтай', () {
      expect(appRedirect(const SignedOut(), u('/app/homework')), '/login?next=%2Fapp%2Fhomework');
      expect(appRedirect(const SignedOut(), u('/splash?next=%2Fapp%2Fhomework')), '/login?next=%2Fapp%2Fhomework');
      expect(appRedirect(const SignedOut(), u('/splash')), '/login');
      expect(appRedirect(const SignedOut(), u('/app')), '/login');
    });

    test('W6-ийн шинэ зам: нэвтрээгүй бол login?next=, нэвтэрсэн бол шилжүүлэхгүй (эрхийг сервер шалгана)', () {
      for (final path in [
        '/app/classes/c1/checks',
        '/app/teacher/room406?date=2026-11-14',
        '/app/book-money',
        '/app/paper-exams',
        '/app/paper-exams/e1',
        '/app/tests?tab=paper',
      ]) {
        expect(appRedirect(const SignedOut(), u(path)), '/login?next=${Uri.encodeComponent(path)}', reason: path);
        expect(isPublicPath(u(path).path), isFalse, reason: path);
        expect(appRedirect(signedIn(UserRole.teacher), u(path)), isNull, reason: path);
        expect(appRedirect(signedIn(UserRole.student), u(path)), isNull, reason: path);
      }
    });

    test('нийтийн зам нэвтрэлтгүй нээгдэнэ', () {
      expect(appRedirect(const SignedOut(), u('/login')), isNull);
      expect(appRedirect(const SignedOut(), u('/books/300')), isNull);
      expect(appRedirect(const SignedOut(), u('/forgot-password')), isNull);
    });

    test('нэвтэрсэн бол login/splash → нүүр эсвэл next', () {
      expect(appRedirect(signedIn(UserRole.student), u('/login')), '/app/student');
      expect(appRedirect(signedIn(UserRole.parent), u('/splash')), '/app/parent');
      expect(appRedirect(signedIn(UserRole.teacherPlus), u('/')), '/app/teacher');
      expect(appRedirect(signedIn(UserRole.student), u('/login?next=%2Fapp%2Ftests%2F5')), '/app/tests/5');
      expect(appRedirect(signedIn(UserRole.student), u('/login?next=%2F%2Fevil.com')), '/app/student');
      expect(appRedirect(signedIn(UserRole.student), u('/app/homework')), isNull);
    });

    test('гадны багшийн профайлтай багш → бүлгийн нүүр', () {
      final s = signedIn(UserRole.teacher, me: {...fakeMe(role: 'TEACHER'), 'externalTeacherProfile': {'verifiedAt': null}});
      expect(appRedirect(s, u('/app')), '/app/groups');
    });

    test('номын QR: /q/<код> → /app/scan/<код>', () {
      expect(appRedirect(signedIn(UserRole.student), u('/q/ab12cd34')), '/app/scan/AB12CD34');
      expect(appRedirect(const SignedOut(), u('/q/AB12CD34')), '/login?next=%2Fapp%2Fscan%2FAB12CD34');
      // I, L, O, U Crockford-д байхгүй.
      expect(appRedirect(signedIn(UserRole.student), u('/q/ILOU1234')), '/app/scan');
      expect(appRedirect(signedIn(UserRole.student), u('/q/AB12')), '/app/scan');
    });

    test('зөвшөөрөл шаардлагатай бол /app/consent', () {
      final s = signedIn(UserRole.student, me: fakeMe());
      expect(appRedirect(s, u('/app/student'), needsConsent: (_) => true), '/app/consent');
      expect(appRedirect(s, u('/app/consent'), needsConsent: (_) => true), isNull);
      expect(appRedirect(s, u('/app/student'), needsConsent: (_) => false), isNull);
    });
  });
}
