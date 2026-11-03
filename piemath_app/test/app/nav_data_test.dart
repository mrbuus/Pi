import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/app/nav/nav_data.dart';
import 'package:piemath_app/core/auth/user_role.dart';

void main() {
  test('доод таб = вэбийн BottomTabs (PRIMARY_BY_ROLE)', () {
    expect(NavData.tabs(UserRole.student).map((t) => t.tabLabel), ['Нүүр', 'Даалгавар', 'Хичээл', 'Онол']);
    expect(NavData.tabs(UserRole.parent).map((t) => t.path), ['/app/parent', '/app/schedule']);
    expect(NavData.tabs(UserRole.teacher).map((t) => t.tabLabel), ['Нүүр', 'Хуваарь', 'Сан', 'Шалгалт']);
    expect(NavData.tabs(UserRole.teacherPlus).map((t) => t.tabLabel), ['Нүүр', 'Хуваарь', 'Төлбөр', 'Сурагчид']);
    expect(NavData.tabs(UserRole.admin).map((t) => t.tabLabel), ['Нүүр', 'Сурагчид', 'Элсэлт', 'Хуваарь']);
    expect(NavData.tabs(UserRole.buyer).map((t) => t.tabLabel), ['Нүүр', 'Сан', 'Видео', 'Хуваарь']);
    expect(NavData.tabs(UserRole.groupTeacher).map((t) => t.tabLabel), ['Нүүр', 'Сан', 'Видео']);
  });

  test('хэсгийн эхний таб = role-ийн нүүр, хэсгийн эхний дэд таб = доод табын зам', () {
    for (final role in UserRole.values) {
      final sections = NavData.sections(role);
      expect(sections.first.tab.path, NavData.home(role).path, reason: '$role');
      for (final s in sections) {
        expect(s.rootPath, s.tab.path, reason: '$role ${s.id}');
      }
    }
  });

  test('дэд табын шошго богино, монгол, цэггүй; хэсэг дотор давхардахгүй', () {
    final cyrillic = RegExp(r'^[А-Яа-яЁёӨөҮү ,]+$');
    for (final role in UserRole.values) {
      for (final s in NavData.sections(role)) {
        final paths = s.pages.map((p) => p.path).toList();
        expect(paths.toSet().length, paths.length, reason: '$role ${s.id} давхардсан');
        for (final p in s.pages) {
          final label = p.tabLabel;
          expect(label, matches(cyrillic), reason: '$role ${p.path}');
          expect(label.length, lessThanOrEqualTo(14), reason: '$role ${p.path} урт: $label');
          expect(label.endsWith('.'), isFalse);
        }
      }
    }
  });

  test('нэг ч цэс хасагдахгүй: хэсэгт эсвэл «Бусад»-д, давхардалгүй', () {
    for (final role in UserRole.values) {
      final placed = NavData.sectionPaths(role);
      final more = NavData.moreGroups(role).expand((g) => g.$2).map((l) => l.path).toSet();
      expect(more.intersection(placed), isEmpty, reason: '$role давхардсан');
      expect(more.union(placed), contains('/app/profile'), reason: '$role профайлгүй');
      expect(more, contains('/app/notifications'), reason: '$role мэдэгдэлгүй');
    }
    final student = NavData.moreGroups(UserRole.student).expand((g) => g.$2).map((l) => l.path);
    expect(student, containsAll(['/app/student/payments', '/app/store', '/app/tools']));
    // «Бусад»-д байсан Шалгалт, Ном одоо хэсэгт нь.
    expect(student, isNot(contains('/app/tests')));
    expect(student, isNot(contains('/app/library')));
  });

  test('ажилтны «Бусад» — дэд табд орсныг давтахгүй', () {
    final teacher = NavData.moreGroups(UserRole.teacher);
    // Багшийн бүх цэс хэсэгт орсон — «Бусад»-д зөвхөн хувийн.
    expect(teacher.map((g) => g.$1), [NavGroup.personal]);
    final admin = NavData.moreGroups(UserRole.admin).expand((g) => g.$2).map((l) => l.path);
    expect(admin, isNot(contains('/app/admin/analytics')));
    expect(admin, isNot(contains('/app/classes')));
    expect(admin, containsAll(['/app/library', '/app/admin/capabilities', '/app/internal']));
  });

  test('зам аль хэсэгт хамаарах: хамгийн урт угтвар, «Бусад»-ын холбоос -1', () {
    expect(NavData.sectionIndexOf(UserRole.student, '/app/student'), 0);
    expect(NavData.sectionIndexOf(UserRole.student, '/app/student/payments'), -1);
    expect(NavData.sectionIndexOf(UserRole.student, '/app/homework/12'), 1);
    expect(NavData.sectionIndexOf(UserRole.student, '/app/tests/5/result'), 1);
    expect(NavData.sectionIndexOf(UserRole.student, '/app/library/3/problems'), 3);
    expect(NavData.sectionIndexOf(UserRole.student, '/app/notifications'), -1);
    expect(NavData.sectionIndexOf(UserRole.teacher, '/app/teacher/board/c1'), 0);
    expect(NavData.sectionIndexOf(UserRole.teacher, '/app/classes/c1'), 1);
    expect(NavData.sectionIndexOf(UserRole.admin, '/app/teacher/board/c1'), 3);
    expect(NavData.sectionIndexOf(UserRole.admin, '/app/admin/placement'), 2);
    expect(NavData.sectionIndexOf(UserRole.teacherPlus, '/app/admin/leads'), 3);
  });

  test('идэвхтэй таб: нүүр яг таарвал, бусад угтвараар', () {
    final tabs = NavData.tabs(UserRole.student);
    expect(NavData.activeTab(tabs, '/app/student'), 0);
    expect(NavData.activeTab(tabs, '/app/student/payments'), -1);
    expect(NavData.activeTab(tabs, '/app/homework/12'), 1);
    expect(NavData.activeTab(tabs, '/app/notifications'), -1);
  });
}
