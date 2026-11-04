import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/config/env.dart';

void main() {
  test('өгөгдмөл хаяг HTTPS, төгсгөлийн / хасна', () {
    expect(Env.apiBaseUrl, 'https://api.pimath.mn/api');
    expect(Env.checkedBaseUrl('https://a.mn/api//', allowInsecure: false), 'https://a.mn/api');
  });

  test('release-д http хориотой, debug-д зөвшөөрнө', () {
    expect(() => Env.checkedBaseUrl('http://10.0.2.2:3000/api', allowInsecure: false), throwsStateError);
    expect(Env.checkedBaseUrl('http://10.0.2.2:3000/api', allowInsecure: true), 'http://10.0.2.2:3000/api');
    expect(() => Env.checkedBaseUrl('api.pimath.mn', allowInsecure: true), throwsStateError);
  });
}
