import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/format/person_name.dart';

void main() {
  test('shortName: овгийн эхний үсэг + нэр', () {
    expect(shortName('Нараа', 'болд'), 'Б. Нараа');
    expect(shortName(' Нараа ', ''), 'Нараа');
    expect(shortName('Нараа', null), 'Нараа');
  });

  test('Багш+ нэрийн ард «+», давхардахгүй', () {
    expect(staffName(firstName: 'Сараа', lastName: 'Очир', role: 'TEACHER_PLUS'), 'О. Сараа+');
    expect(staffName(firstName: 'Сараа', lastName: 'Очир', role: 'TEACHER'), 'О. Сараа');
    expect(withPlus('О. Сараа+', 'TEACHER_PLUS'), 'О. Сараа+');
    expect(withPlus('', 'TEACHER_PLUS'), '');
  });

  test('rosterNames: давхцвал бүтэн овог нэр', () {
    final names = rosterNames([
      (id: '1', firstName: 'Тэмүүлэн', lastName: 'Бат', role: null),
      (id: '2', firstName: 'Тэмүүлэн', lastName: 'Болд', role: null),
      (id: '3', firstName: 'Ану', lastName: 'Ган', role: null),
      (id: '4', firstName: 'Ану', lastName: 'Дорж', role: 'TEACHER_PLUS'),
    ]);
    expect(names['1'], 'Бат Тэмүүлэн');
    expect(names['2'], 'Болд Тэмүүлэн');
    expect(names['3'], 'Г. Ану');
    expect(names['4'], 'Д. Ану+');
  });
}
