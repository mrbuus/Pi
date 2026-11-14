import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/passes/data/passes_models.dart';

import 'passes_fixtures.dart';

void main() {
  group('PassScope', () {
    test('ID: таслал, шинэ мөр, хоосон, давхардал', () {
      expect(PassScope.parseIds(' a, b\n\nc ,a, '), ['a', 'b', 'c']);
      expect(PassScope.parseIds(''), isEmpty);
    });

    test('«Бүх агуулга» сонгосон бол ID-уудыг тоохгүй', () {
      final s = PassScope.fromInput(all: true, chapterIds: 'x, y');
      expect(s.toJson(), {'all': true});
      expect(s.summary, 'Бүх агуулга');
      expect(s.isEmpty, isFalse);
    });

    test('хэсэгчилсэн: зөвхөн хоосон биш түлхүүр, хураангуй', () {
      final s = PassScope.fromInput(all: false, chapterIds: 'c1, c2', testIds: 't1');
      expect(s.toJson(), {
        'chapterIds': ['c1', 'c2'],
        'testIds': ['t1'],
      });
      expect(s.summary, '2 бүлэг, 1 тест');
    });

    test('юу ч сонгоогүй бол хоосон', () {
      final s = PassScope.fromInput(all: false);
      expect(s.isEmpty, isTrue);
      expect(s.summary, 'Хамрах хүрээ тохируулаагүй');
    });

    test('серверийн JSON: буруу төрлийг алгасна', () {
      final s = PassScope.fromJson(const {
        'chapterIds': ['c1', 3, ' '],
        'bookIds': 'b1',
      });
      expect(s.chapterIds, ['c1']);
      expect(s.bookIds, isEmpty);
      expect(s.all, isFalse);
    });
  });

  group('PassDef', () {
    test('серверийн утга, үнэгүй бол «Дурын дүн»', () {
      final p = PassDef.fromJson(passJson(price: null, holders: 5));
      expect(p.name, 'Сарын эрх');
      expect(p.durationLabel, '30 өдөр');
      expect(p.priceLabel, 'Дурын дүн');
      expect(p.holdersCount, 5);
      expect(p.active, isTrue);
      expect(PassDef.fromJson(passJson()).priceLabel, '50,000₮');
    });

    test('PATCH-ийн хариунд эзэмшигчийн тоо хадгалагдана', () {
      final p = PassDef.fromJson(passJson()..remove('holdersCount'));
      expect(p.holdersCount, 0);
      expect(p.withHolders(7).holdersCount, 7);
    });
  });

  test('PassDraft: үнэ хоосон бол илгээхгүй, нэрийг тайрна', () {
    const d = PassDraft(name: '  Эрх ', durationDays: 10, scope: PassScope(all: true));
    expect(d.toJson(), {
      'name': 'Эрх',
      'durationDays': 10,
      'scope': {'all': true},
    });
    const priced = PassDraft(name: 'Эрх', durationDays: 10, price: 0, scope: PassScope(all: true));
    expect(priced.toJson()['price'], 0);
  });

  test('PassHolder: нэр, код, UB огноо', () {
    final h = PassHolder.fromJson(holderJson(code: ''));
    expect(h.studentCode, isNull);
    expect(h.active, isTrue);
    expect(h.startsAt!.hour, 10); // 02:00Z = UB 10:00
  });

  test('эрх: жагсаалт, засвар зөвхөн Админ; олголт Админ, Багш+', () {
    const admin = PassesAccess(UserRole.admin);
    const plus = PassesAccess(UserRole.teacherPlus);
    const teacher = PassesAccess(UserRole.teacher);
    expect([admin.canView, admin.canEdit, admin.canGrant], [true, true, true]);
    expect([plus.canView, plus.canEdit, plus.canGrant], [false, false, true]);
    expect([teacher.canView, teacher.canEdit, teacher.canGrant], [false, false, false]);
    expect(const PassesAccess(null).canView, isFalse);
  });
}
