import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/classrooms_admin/application/classrooms_admin_providers.dart';
import 'package:piemath_app/features/classrooms_admin/ui/classroom_detail_screen.dart';
import 'package:piemath_app/features/classrooms_admin/ui/classroom_sheets.dart';
import 'package:piemath_app/features/classrooms_admin/ui/classrooms_admin_screen.dart';
import 'package:piemath_app/features/classrooms_admin/ui/dismissal_screen.dart';
import 'package:piemath_app/features/classrooms_admin/ui/registry_screen.dart';
import 'package:piemath_app/features/teacher/ui/classes_screen.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/fake_http.dart';
import '../teacher/teacher_fixtures.dart' show dashDetail, dashList, dashClass;
import 'classrooms_fixtures.dart';

class _FakeLauncher implements ShareLauncher {
  final shared = <File>[];
  final types = <String>[];

  @override
  Future<bool> shareFile(File file, {required String mimeType, String? subject, Rect? origin}) async {
    shared.add(file);
    types.add(mimeType);
    return true;
  }
}

/// Шүүлтүүрийн чип (хэвтээ жагсаалтад дэлгэцээс гадуур байж болно).
Future<void> _tapChip(WidgetTester tester, String id) async {
  final chip = find.byKey(ValueKey('filter:$id'));
  final row = find.descendant(
    of: find.byWidgetPredicate((w) => w is ListView && w.scrollDirection == Axis.horizontal),
    matching: find.byType(Scrollable),
  );
  await tester.drag(row.first, const Offset(2000, 0));
  await settle(tester, frames: 4);
  await tester.scrollUntilVisible(chip, 80, scrollable: row.first);
  await tester.ensureVisible(chip);
  await settle(tester, frames: 4);
  await tester.tap(chip);
  await settle(tester);
}

Future<void> _undoWindow(WidgetTester tester) async {
  await tester.pump(const Duration(seconds: 6));
  await settle(tester, frames: 20);
}

Future<void> _menuFor(WidgetTester tester, String studentName, String action) async {
  final row = find.ancestor(of: find.text(studentName), matching: find.byType(AppCard));
  await tester.tap(find.descendant(of: row, matching: find.byTooltip('Үйлдэл')));
  await settle(tester);
  await tester.tap(find.text(action));
  await settle(tester);
}

void main() {
  group('Ангиуд (/app/admin/classrooms)', () {
    testWidgets('жагсаалт: тоо, хайлт, шүүлтүүр, дэлгэрэнгүй рүү', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const ClassroomsAdminScreen(), http: http);
      expect(find.text('12А'), findsOneWidget);
      expect(find.text('11Б'), findsOneWidget);
      expect(find.text('10В'), findsOneWidget);
      expect(find.text('3 анги'), findsOneWidget);
      expect(find.text('Шинэ анги'), findsOneWidget);

      await _tapChip(tester, ClassroomFilters.online);
      expect(find.text('11Б'), findsOneWidget);
      expect(find.text('12А'), findsNothing);

      await _tapChip(tester, ClassroomFilters.noTeacher);
      expect(find.text('10В'), findsOneWidget);
      expect(find.text('11Б'), findsNothing);

      await _tapChip(tester, '*');
      await tester.enterText(find.byType(TextField), 'дорж');
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      expect(find.text('12А'), findsOneWidget);
      expect(find.text('11Б'), findsNothing);
      expect(find.text('1 анги'), findsOneWidget);

      await tester.tap(find.text('12А'));
      await settle(tester);
      expect(find.text('ROUTE:/app/admin/classrooms/c1'), findsOneWidget);
    });

    testWidgets('Багш: эрхгүй, жагсаалт татахгүй', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const ClassroomsAdminScreen(), http: http, role: 'TEACHER');
      expect(find.text(AppStrings.forbidden), findsOneWidget);
      expect(find.text('Шинэ анги'), findsNothing);
      expect(http.count('GET', '/classrooms'), 0);
    });

    testWidgets('анги тараах: нэрээ бичиж баталгаажуулна', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const ClassroomsAdminScreen(), http: http, role: 'TEACHER_PLUS', userId: 't2');
      await tester.tap(find.byTooltip('12А, үйлдэл'));
      await settle(tester);
      await tester.tap(find.text('Анги тараах'));
      await settle(tester);
      expect(find.text('«12А» ангийг тараах уу'), findsOneWidget);
      await tester.enterText(find.byType(TextField).last, '12');
      await tester.tap(find.text('Ангийг тараах'));
      await settle(tester);
      expect(find.text('Ангийн нэр таарахгүй байна'), findsOneWidget);
      expect(http.count('POST', '/classrooms/c1/disband'), 0);
      await tester.enterText(find.byType(TextField).last, '12А');
      await tester.tap(find.text('Ангийг тараах'));
      await settle(tester, frames: 20);
      expect(http.count('POST', '/classrooms/c1/disband'), 1);
      expect(find.text('2 сурагчийг ангиас гаргалаа. Түүх хадгалагдсан'), findsOneWidget);
    });

    testWidgets('таблет: зүүн жагсаалт, баруун дэлгэрэнгүй', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const ClassroomsAdminScreen(), http: http, size: const Size(1100, 800));
      await tester.tap(find.text('12А'));
      await settle(tester, frames: 20);
      expect(find.text('Бат Анар'), findsOneWidget);
      expect(find.textContaining('ROUTE:'), findsNothing);
    });
  });

  group('Ангийн удирдлага (/app/admin/classrooms/:id)', () {
    testWidgets('Админ: бүх үйлдэл, сурагчид', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const ClassroomDetailScreen(classId: 'c1'), http: http);
      expect(find.text('Бат Анар'), findsOneWidget);
      expect(find.text('Очир Тэмүүлэн'), findsOneWidget);
      expect(find.text('Сурагч нэмэх'), findsOneWidget);
      expect(find.text('Багш оноох'), findsOneWidget);
      expect(find.text('Засах'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Ангийг архивлах'), 200);
      expect(find.text('Ангийг архивлах'), findsOneWidget);
      expect(find.byTooltip('Үйлдэл'), findsNWidgets(2));
    });

    testWidgets('Багш+ сурагч удирдах эрхгүй: зөвхөн харах, багш оноох', (tester) async {
      final http = classroomsHttp(canManageStudents: false);
      await pumpClassrooms(
        tester,
        const ClassroomDetailScreen(classId: 'c1'),
        http: http,
        role: 'TEACHER_PLUS',
        userId: 't2',
      );
      expect(find.text('Бат Анар'), findsOneWidget);
      expect(find.text('Сурагч нэмэх'), findsNothing);
      expect(find.text('Засах'), findsNothing);
      expect(find.text('Багш оноох'), findsOneWidget);
      expect(find.text('Ангийг архивлах'), findsNothing);
      expect(find.byTooltip('Үйлдэл'), findsNothing);
      expect(find.text('Сурагч нэмэх, хасах, шилжүүлэх эрхийг админаар нээлгэнэ үү'), findsOneWidget);
    });

    testWidgets('Багш: эрхгүй', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(
        tester,
        const ClassroomDetailScreen(classId: 'c1'),
        http: http,
        role: 'TEACHER',
      );
      expect(find.text(AppStrings.forbidden), findsOneWidget);
      expect(http.count('GET', '/classrooms/c1'), 0);
    });

    testWidgets('хасах: баталгаажуулалт, «Буцаах» бол хүсэлт явахгүй, эс бөгөөс зөөлөн хасна', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const ClassroomDetailScreen(classId: 'c1'), http: http);
      await _menuFor(tester, 'Бат Анар', 'Ангиас хасах');
      expect(find.text('Бат Анар сурагчийг ангиас хасах уу'), findsOneWidget);
      await tester.tap(find.text('Хасах'));
      await settle(tester);
      expect(find.text('Бат Анар'), findsNothing);
      expect(find.text('1 идэвхтэй'), findsOneWidget);
      await tester.tap(find.text('Буцаах'));
      await settle(tester, frames: 20);
      expect(find.text('Бат Анар'), findsOneWidget);
      expect(http.count('POST', '/classrooms/c1/remove-student'), 0);

      await _menuFor(tester, 'Бат Анар', 'Ангиас хасах');
      await tester.tap(find.text('Хасах'));
      await settle(tester);
      await _undoWindow(tester);
      expect(http.count('POST', '/classrooms/c1/remove-student'), 1);
      expect(requestBody(http, 'POST', '/classrooms/c1/remove-student'), {'studentId': 's1'});
      expect(http.requests.where((r) => r.method == 'DELETE'), isEmpty);
    });

    testWidgets('хасах амжилтгүй бол буцаж гарч, алдаа харуулна', (tester) async {
      final failing = FakeHttp()
        ..json('GET', '/classrooms', [roomA, roomB, roomC])
        ..json('GET', '/classrooms/c1', detail(roomA, [studentS1, studentS2]))
        ..error('POST', '/classrooms/c1/remove-student', 404, 'Идэвхтэй бүртгэл олдсонгүй');
      await pumpClassrooms(tester, const ClassroomDetailScreen(classId: 'c1'), http: failing);
      await _menuFor(tester, 'Бат Анар', 'Ангиас хасах');
      await tester.tap(find.text('Хасах'));
      await settle(tester);
      await _undoWindow(tester);
      expect(find.text('Бат Анар'), findsOneWidget);
      expect(find.text('Идэвхтэй бүртгэл олдсонгүй'), findsOneWidget);
    });

    testWidgets('сурагч нэмэх: ангигүй сурагчаас сонгоод, 5 секундын дараа серверт', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const ClassroomDetailScreen(classId: 'c1'), http: http);
      await tester.tap(find.text('Сурагч нэмэх'));
      await settle(tester, frames: 20);
      expect(find.text('Мөнх Дөлгөөн'), findsOneWidget);
      await tester.tap(find.text('Мөнх Дөлгөөн'));
      await settle(tester);
      await tester.tap(find.text('Мөнх Дөлгөөн ангид нэмэх'));
      await settle(tester);
      expect(find.text('3 идэвхтэй'), findsOneWidget);
      await _undoWindow(tester);
      expect(requestBody(http, 'POST', '/classrooms/c1/enroll'), {'studentId': 'u1'});
    });

    testWidgets('сурагч нэмэх хайлт: зөвхөн ангигүй сурагчид', (tester) async {
      final http = classroomsHttp()
        ..json('GET', '/users/search', [
          {...studentS1},
          {'id': 'u1', 'firstName': 'Дөлгөөн', 'lastName': 'Мөнх', 'studentCode': 'B27120009'},
        ]);
      await pumpClassrooms(tester, const ClassroomDetailScreen(classId: 'c1'), http: http);
      await tester.tap(find.text('Сурагч нэмэх'));
      await settle(tester, frames: 20);
      await tester.enterText(find.byType(TextField).last, 'Мө');
      await tester.pump(const Duration(milliseconds: 350));
      await settle(tester);
      expect(http.requests.last.queryParameters['q'], 'Мө');
      final sheet = find.byType(AddStudentSheet);
      expect(find.descendant(of: sheet, matching: find.text('B27120009')), findsOneWidget);
      expect(find.descendant(of: sheet, matching: find.text('B27120001')), findsNothing);
    });

    testWidgets('шилжүүлэх: анги сонгоод «Буцаах» хугацааны дараа шинэ ангид', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const ClassroomDetailScreen(classId: 'c1'), http: http);
      await _menuFor(tester, 'Очир Тэмүүлэн', 'Өөр ангид шилжүүлэх');
      expect(find.text('Шилжүүлэх анги'), findsOneWidget);
      await tester.tap(find.text('11Б'));
      await settle(tester);
      expect(find.text('Очир Тэмүүлэн'), findsNothing);
      await _undoWindow(tester);
      expect(requestBody(http, 'POST', '/classrooms/c2/enroll'), {'studentId': 's2'});
      expect(http.count('POST', '/classrooms/c1/remove-student'), 0);
    });

    testWidgets('багш оноох: ижил хүнийг хоёр үүрэгт оноохгүй', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(
        tester,
        const ClassroomDetailScreen(classId: 'c1'),
        http: http,
        role: 'TEACHER_PLUS',
      );
      await tester.tap(find.text('Багш оноох'));
      await settle(tester, frames: 20);
      await tester.tap(find.text('Туслах ангийн багш'));
      await settle(tester);
      await tester.tap(find.text('Д. Болд').last);
      await settle(tester);
      await tester.tap(find.text(AppStrings.save));
      await settle(tester);
      expect(find.text('Ангийн багш ба туслах багш өөр хүн байх ёстой'), findsOneWidget);
      expect(http.count('PATCH', '/classrooms/c1/teachers'), 0);

      await tester.tap(find.text('Туслах ангийн багш'));
      await settle(tester);
      await tester.tap(find.text('Г. Сараа+').last);
      await settle(tester);
      await tester.tap(find.text(AppStrings.save));
      await settle(tester, frames: 20);
      expect(requestBody(http, 'PATCH', '/classrooms/c1/teachers'), {'teacherId': 't1', 'assistantTeacherId': 't2'});
      expect(find.text('Ангийн багшийг хадгаллаа'), findsOneWidget);
    });

    testWidgets('засах (Админ): зөвхөн өөрчилсөн талбар', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const ClassroomDetailScreen(classId: 'c1'), http: http);
      await tester.tap(find.text('Засах'));
      await settle(tester, frames: 20);
      expect(find.text('Ангийн мэдээлэл засах'), findsOneWidget);
      await tester.enterText(find.widgetWithText(TextField, 'Ангийн нэр'), '12А шинэ');
      await tester.tap(find.text(AppStrings.save));
      await settle(tester, frames: 20);
      expect(requestBody(http, 'PATCH', '/classrooms/c1'), {'name': '12А шинэ'});
    });

    testWidgets('архивлах (Админ): өнөөдрийн кодоор, дараа нь жагсаалт руу', (tester) async {
      final http = classroomsHttp()..json('DELETE', '/classrooms/c1?confirmCode=20261104', {'archived': true});
      await pumpClassrooms(tester, const ClassroomDetailScreen(classId: 'c1'), http: http);
      await tester.scrollUntilVisible(find.text('Ангийг архивлах'), 200);
      await tester.tap(find.text('Ангийг архивлах'));
      await settle(tester);
      await tester.enterText(find.byType(TextField).last, '20261103');
      await tester.tap(find.text('Архивлах'));
      await settle(tester);
      expect(find.text('Баталгаажуулах код таарахгүй байна'), findsOneWidget);
      await tester.enterText(find.byType(TextField).last, '20261104');
      await tester.tap(find.text('Архивлах'));
      await settle(tester, frames: 20);
      expect(http.count('DELETE', '/classrooms/c1?confirmCode=20261104'), 1);
      expect(find.text('ROUTE:/app/admin/classrooms'), findsOneWidget);
    });
  });

  group('Бүртгэл (/app/admin/registry)', () {
    testWidgets('тоо, ангиар шүүх, хайх, CSV хуваалцах', (tester) async {
      final http = classroomsHttp();
      final launcher = _FakeLauncher();
      final dir = Directory.systemTemp.createTempSync('registry');
      addTearDown(() => dir.deleteSync(recursive: true));
      await pumpClassrooms(
        tester,
        const RegistryScreen(),
        http: http,
        overrides: [
          shareLauncherProvider.overrideWithValue(launcher),
          registryTempDirProvider.overrideWithValue(() async => dir),
        ],
      );
      await settle(tester, frames: 20);
      expect(find.text('Идэвхтэй бүртгэл'), findsOneWidget);
      expect(find.text('4 сурагч'), findsOneWidget);
      expect(find.text('Мөнх Дөлгөөн'), findsOneWidget);

      await _tapChip(tester, 'c2');
      expect(find.text('Цэцэг Номин'), findsOneWidget);
      expect(find.text('Бат Анар'), findsNothing);

      await _tapChip(tester, '*');
      await tester.enterText(find.byType(TextField), 'B27120002');
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      expect(find.text('Очир Тэмүүлэн'), findsOneWidget);
      expect(find.text('1 сурагч'), findsOneWidget);

      await tester.runAsync(() async {
        await tester.tap(find.byTooltip('CSV хуваалцах'));
        for (var i = 0; i < 20 && launcher.shared.isEmpty; i++) {
          await Future<void>.delayed(const Duration(milliseconds: 20));
        }
      });
      await settle(tester);
      expect(launcher.types.single, 'text/csv');
      final csv = launcher.shared.single.readAsStringSync();
      expect(launcher.shared.single.path, endsWith('piemath-burtgel-2026-11-04.csv'));
      expect(csv, contains('Очир'));
      expect(csv, isNot(contains('Бат')));
    });

    testWidgets('ангигүй сурагчид анги заах — «Буцаах»-тай', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const RegistryScreen(), http: http, role: 'TEACHER_PLUS', userId: 't2');
      await settle(tester, frames: 20);
      await _tapChip(tester, 'unassigned');
      await settle(tester);
      await tester.tap(find.byTooltip('Анги заах'));
      await settle(tester);
      await tester.tap(find.text('10В'));
      await settle(tester);
      expect(find.text('Мөнх Дөлгөөн 10В руу шилжлээ'), findsOneWidget);
      await tester.tap(find.text('Буцаах'));
      await settle(tester);
      expect(http.count('POST', '/classrooms/c3/enroll'), 0);

      await tester.tap(find.byTooltip('Анги заах'));
      await settle(tester);
      await tester.tap(find.text('10В'));
      await settle(tester);
      await _undoWindow(tester);
      expect(requestBody(http, 'POST', '/classrooms/c3/enroll'), {'studentId': 'u1'});
    });

    testWidgets('Багш: эрхгүй', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const RegistryScreen(), http: http, role: 'TEACHER');
      expect(find.text(AppStrings.forbidden), findsOneWidget);
      expect(http.requests, isEmpty);
    });
  });

  group('Тарах цаг (/app/dismissal)', () {
    testWidgets('Багш: зөвхөн өөрийн анги, өдрийн тэмдэглэл нээгдэнэ', (tester) async {
      final http = classroomsHttp()..json('GET', '/learning-lab/classrooms/c1/dismissal', null);
      await pumpClassrooms(tester, const DismissalScreen(), http: http, role: 'TEACHER');
      await settle(tester, frames: 20);
      expect(find.text('12А'), findsOneWidget);
      expect(find.text('Тарах цаг'), findsOneWidget);
      expect(find.text('Тэмдэглээгүй'), findsOneWidget);
      final get = http.requests.lastWhere((r) => r.path == '/learning-lab/classrooms/c1/dismissal');
      expect(get.queryParameters['date'], '2026-11-04');
    });

    testWidgets('Админ: бүх анги, анги солих', (tester) async {
      final http = classroomsHttp()
        ..json('GET', '/learning-lab/classrooms/c3/dismissal', null)
        ..json('GET', '/learning-lab/classrooms/c2/dismissal', {
          'approximateAt': '2026-11-04T09:30:00.000Z',
          'lastLeftAt': null,
          'note': null,
        });
      await pumpClassrooms(tester, const DismissalScreen(), http: http);
      await settle(tester, frames: 20);
      // Түвшнээр эрэмбэлсэн: 10В эхэнд
      expect(find.text('10В'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('dismissal-class')));
      await settle(tester);
      await tester.tap(find.text('11Б').last);
      await settle(tester, frames: 20);
      expect(find.textContaining('Ойролцоо 17:30'), findsOneWidget);
    });

    testWidgets('анги алга бол хоосон төлөв', (tester) async {
      final http = classroomsHttp();
      await pumpClassrooms(tester, const DismissalScreen(), http: http, role: 'TEACHER', userId: 'nobody');
      expect(find.text('Танд харьяалагдсан идэвхтэй анги алга'), findsOneWidget);
    });
  });

  group('Багшийн «Ангиуд»-аас орох', () {
    testWidgets('ангийн самбар: Багш+/Админд «Удирдах»', (tester) async {
      final base = dashDetail();
      final http = FakeHttp()
        ..json('GET', '/class-dashboard/classes/c1', {
          ...base,
          'permissions': {'money': false, 'manageClass': true, 'isAdmin': false},
        });
      await pumpClassrooms(
        tester,
        const ClassDetailScreen(classId: 'c1'),
        http: http,
        role: 'TEACHER_PLUS',
      );
      await tester.tap(find.byTooltip('Удирдах'));
      await settle(tester);
      expect(find.text('ROUTE:/app/admin/classrooms/c1'), findsOneWidget);
    });

    testWidgets('ангийн самбар: Багшид «Удирдах» алга', (tester) async {
      final http = FakeHttp()..json('GET', '/class-dashboard/classes/c1', dashDetail());
      await pumpClassrooms(
        tester,
        const ClassDetailScreen(classId: 'c1'),
        http: http,
        role: 'TEACHER',
      );
      expect(find.byTooltip('Удирдах'), findsNothing);
    });

    testWidgets('ангиудын жагсаалт: Багш+-д «Ангиуд удирдах», Багшид үгүй', (tester) async {
      final http = FakeHttp()..json('GET', '/class-dashboard', dashList([dashClass('c1', '12Б')]));
      await pumpClassrooms(tester, const ClassesScreen(), http: http, role: 'TEACHER_PLUS');
      await tester.tap(find.byKey(const ValueKey('classes-manage')));
      await settle(tester);
      expect(find.text('ROUTE:/app/admin/classrooms'), findsOneWidget);
    });

    testWidgets('ангиудын жагсаалт: Багшид удирдах товч алга', (tester) async {
      final http = FakeHttp()..json('GET', '/class-dashboard', dashList([dashClass('c1', '12Б')]));
      await pumpClassrooms(tester, const ClassesScreen(), http: http, role: 'TEACHER');
      expect(find.byKey(const ValueKey('classes-manage')), findsNothing);
    });
  });
}
