import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/payments/domain/org_info.dart';

void main() {
  test('groupChars: 4-өөр бүлэглэнэ, богино бол хэвээр', () {
    expect(groupChars('5720838844'), '5720 8388 44');
    expect(groupChars('MN540005005720838844'), 'MN54 0005 0057 2083 8844');
    expect(groupChars('123'), '123');
    expect(groupChars('1234'), '1234');
    expect(groupChars(' 12 345 '), '1234 5');
    expect(groupChars(''), '');
  });
}
