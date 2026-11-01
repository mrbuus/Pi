import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/auth/data/auth_models.dart';
import 'package:piemath_app/features/auth/domain/password_policy.dart';
import 'package:piemath_app/features/auth/ui/forgot_password_screen.dart';

void main() {
  group('нууц үгийн бодлого (api/src/auth/password-policy.ts)', () {
    test('8+ тэмдэгт, үсэг, тоо', () {
      expect(isPasswordStrong('abcd1234'), isTrue);
      expect(isPasswordStrong('abc1234'), isFalse, reason: '7 тэмдэгт');
      expect(isPasswordStrong('abcdefgh'), isFalse, reason: 'тоогүй');
      expect(isPasswordStrong('12345678'), isFalse, reason: 'үсэггүй');
    });

    test('кирилл үсэг ч тоологдоно (Ө, Ү орно)', () {
      expect(isPasswordStrong('өвөө2026'), isTrue);
      expect(isPasswordStrong('Үнэн1234'), isTrue);
    });

    test('шалгуур тус бүр', () {
      final c = passwordChecks('ab1');
      expect([c.length, c.letter, c.digit], [false, true, true]);
      expect(passwordChecks('').strong, isFalse);
    });

    test('серверийн мессеж', () {
      expect(validatePasswordStrength('abc'), passwordPolicyMessage);
      expect(validatePasswordStrength('abcd1234'), isNull);
      expect(validatePasswordStrength('a1${'x' * 80}'), passwordTooLongMessage);
    });

    test('утасны дугаартай ижил байж болохгүй (+976, зай, зураас)', () {
      expect(isSameAsPhone('99112233', '99112233'), isTrue);
      expect(isSameAsPhone('+976 9911-2233', '99112233'), isTrue);
      expect(isSameAsPhone('97699112233', '99112233'), isTrue);
      expect(isSameAsPhone('a99112233', '99112233'), isFalse);
      expect(isSameAsPhone('99112233', null), isFalse);
      expect(isSameAsPhone('99112233', '---'), isFalse);
    });

    test('validateNewPassword: дараалал — хүч, утас, давталт', () {
      expect(validateNewPassword('abc'), passwordPolicyMessage);
      expect(validateNewPassword('bat99112233', phone: '99112233'), isNull);
      expect(validateNewPassword('abcd1234', confirm: 'abcd1235'), passwordMismatchMessage);
      expect(validateNewPassword('abcd1234', confirm: 'abcd1234', phone: '99112233'), isNull);
    });
  });

  group('нууц үг сэргээх туслах', () {
    test('имэйлийн холбоосын токен fragment-аас', () {
      expect(linkTokenFromFragment('t=AbCdEfGhIjKlMnOpQrStUv_-12'), 'AbCdEfGhIjKlMnOpQrStUv_-12');
      expect(linkTokenFromFragment('x=1&t=AbCdEfGhIjKlMnOpQrStUv'), 'AbCdEfGhIjKlMnOpQrStUv');
      expect(linkTokenFromFragment('t=short'), isNull);
      expect(linkTokenFromFragment(''), isNull);
      expect(linkTokenFromFragment('t=<script>alert(1)</script>xxxxxxxxxx'), isNull);
    });

    test('мм:сс', () {
      expect(mmss(545), '9:05');
      expect(mmss(600), '10:00');
      expect(mmss(0), '0:00');
    });

    test('ForgotResult: channels байхгүй (хуучин сервер) бол SMS', () {
      final r = ForgotResult.fromJson({'maskedTo': '9911****', 'expiresInSeconds': 600});
      expect(r.sms, isTrue);
      expect(r.email, isFalse);
      expect(r.linkExpiresInSeconds, 1800);
      final e = ForgotResult.fromJson({
        'maskedTo': 'ba***@gmail.com',
        'expiresInSeconds': 600,
        'linkExpiresInSeconds': 1800,
        'channels': {'sms': false, 'email': true},
      });
      expect(e.sms, isFalse);
      expect(e.email, isTrue);
    });
  });
}
