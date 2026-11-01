import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/app/nav/nav_data.dart';
import 'package:piemath_app/core/auth/user_role.dart';

void main() {
  test('сурагчийн доод таб = вэбийн BottomTabs', () {
    expect(NavData.tabs(UserRole.student).map((t) => t.tabLabel), ['Нүүр', 'Даалгавар', 'Хичээл', 'Онол']);
    expect(NavData.tabs(UserRole.parent).map((t) => t.path), ['/app/parent', '/app/schedule']);
    expect(NavData.tabs(UserRole.teacherPlus).map((t) => t.tabLabel), ['Нүүр', 'Хуваарь', 'Төлбөр', 'Сурагчид']);
  });

  test('«Бусад»-д табд ороогүй БҮХ цэс бий (нэг ч хасагдахгүй)', () {
    for (final role in UserRole.values) {
      final tabs = NavData.tabs(role).map((t) => t.path).toSet();
      final more = NavData.moreGroups(role).expand((g) => g.$2).map((l) => l.path).toSet();
      expect(more.intersection(tabs), isEmpty, reason: '$role давхардсан');
      expect(more.union(tabs), contains('/app/profile'), reason: '$role профайлгүй');
      expect(more, contains('/app/notifications'), reason: '$role мэдэгдэлгүй');
    }
    final student = NavData.moreGroups(UserRole.student).expand((g) => g.$2).map((l) => l.path);
    expect(student, containsAll(['/app/tests', '/app/student/payments', '/app/library', '/app/store', '/app/tools']));
  });

  test('ажилтанд «Анги» бүлэг эхэнд, «Сурагчид» сүүлд', () {
    final groups = NavData.moreGroups(UserRole.teacher);
    expect(groups.first.$1, NavGroup.classes);
    expect(groups.first.$2.last.path, '/app/admin/students');
  });

  test('идэвхтэй таб: нүүр яг таарвал, бусад угтвараар', () {
    final tabs = NavData.tabs(UserRole.student);
    expect(NavData.activeTab(tabs, '/app/student'), 0);
    expect(NavData.activeTab(tabs, '/app/student/payments'), -1);
    expect(NavData.activeTab(tabs, '/app/homework/12'), 1);
    expect(NavData.activeTab(tabs, '/app/notifications'), -1);
  });
}
