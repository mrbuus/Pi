import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/core/ui/strings.dart';

void main() {
  test('message массив бол нийлүүлнэ', () {
    final e = ApiError.fromStatus(400, {
      'message': ['Утасны дугаар 8 оронтой байх ёстой', 'Нууц үг хоосон'],
    });
    expect(e.message, 'Утасны дугаар 8 оронтой байх ёстой, Нууц үг хоосон');
    expect(e.kind, ApiErrorKind.badRequest);
  });

  test('статус бүрийн ангилал', () {
    expect(ApiError.fromStatus(403, null).kind, ApiErrorKind.forbidden);
    expect(ApiError.fromStatus(409, null).kind, ApiErrorKind.conflict);
    expect(ApiError.fromStatus(503, null).message, AppStrings.timeoutError);
    expect(ApiError.fromStatus(418, null).kind, ApiErrorKind.unknown);
  });

  test('монгол үсэг илрүүлэх', () {
    expect(ApiError.isMongolian('Буруу'), isTrue);
    expect(ApiError.isMongolian('Өө'), isTrue);
    expect(ApiError.isMongolian('Bad Request'), isFalse);
  });

  test('retry боломжтой эсэх', () {
    expect(const ApiError(ApiErrorKind.network, '').isRetryable, isTrue);
    expect(const ApiError(ApiErrorKind.forbidden, '').isRetryable, isFalse);
  });
}
