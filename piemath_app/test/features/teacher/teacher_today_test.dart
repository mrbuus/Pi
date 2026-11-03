import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/files/files.dart';
import 'package:piemath_app/features/teacher/data/teacher_models.dart';
import 'package:piemath_app/features/teacher/data/teacher_today.dart';
import 'package:piemath_app/features/teacher/ui/class_codes_tab.dart';
import 'package:piemath_app/features/teacher/ui/classes_screen.dart';
import 'package:piemath_app/features/teacher/ui/day_pdf_card.dart';
import 'package:piemath_app/features/teacher/ui/student_info_tab.dart';
import 'package:piemath_app/features/teacher/ui/student_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

Map<String, Object?> _studentDetail({String role = 'STUDENT', Object? phone = '99110001', List<Map<String, Object?>>? history}) => {
  'id': 's1',
  'role': role,
  'firstName': 'Тэмүүжин',
  'lastName': 'Бат',
  'phone': phone,
  'email': null,
  'studentCode': 'B27120001',
  'studentProfile': {
    'grade': 11,
    'school': '5-р сургууль',
    'fatherPhone': '99110002',
    'motherPhone': null,
    'guardianNote': null,
  },
  'classHistory':
      history ??
      [
        {
          'classroomId': 'c0',
          'name': '10А (Зүүн 4)',
          'joinedAt': '2025-09-01T00:00:00.000Z',
          'leftAt': '2026-06-01T00:00:00.000Z',
          'attendance': 40,
          'homework': 35,
        },
        {
          'classroomId': 'c1',
          'name': '11А (Зүүн 4)',
          'joinedAt': '2026-09-01T00:00:00.000Z',
          'leftAt': null,
          'attendance': 8,
          'homework': 6,
        },
      ],
};

Map<String, Object?> _dayPlan() => {
  'date': testDate,
  'entries': [
    {
      'classroomId': 'c1',
      'plan': {
        'testIds': ['t1', 't2'],
      },
      'done': <Object?>[],
      'previous': {
        'date': '2026-10-26',
        'tests': [
          {'testId': 't0', 'excludedNumbers': <int>[]},
        ],
      },
    },
    {
      'classroomId': 'c9',
      'plan': {
        'testIds': ['t3'],
      },
      'done': <Object?>[],
      'previous': null,
    },
  ],
  'tests': {
    't0': {'title': 'Тест 1', 'short': 'Т1', 'bookTitle': 'Функц', 'variant': null, 'sourcePdfKey': 'chapter-pdf-a.pdf'},
    't1': {'title': 'Тест 2', 'short': 'Т2', 'bookTitle': 'Функц', 'variant': 'A', 'sourcePdfKey': 'chapter-pdf-b.pdf'},
    't2': {'title': 'Тест 3', 'short': 'Т3', 'bookTitle': 'Функц', 'variant': null, 'sourcePdfKey': null},
    't3': {'title': 'Өөр', 'short': 'Ө', 'sourcePdfKey': 'chapter-pdf-z.pdf'},
  },
};

void main() {
  group('Загвар', () {
    test('профайл засах эрх: Багш+ ажилтныг засахгүй, Админ засна, Багш хэнийг ч үгүй', () {
      expect(canEditProfile('TEACHER_PLUS', 'STUDENT'), isTrue);
      expect(canEditProfile('TEACHER_PLUS', 'PARENT'), isTrue);
      expect(canEditProfile('TEACHER_PLUS', 'TEACHER'), isFalse);
      expect(canEditProfile('TEACHER_PLUS', 'TEACHER_PLUS'), isFalse);
      expect(canEditProfile('TEACHER_PLUS', 'ADMIN'), isFalse);
      expect(canEditProfile('ADMIN', 'TEACHER'), isTrue);
      expect(canEditProfile('TEACHER', 'STUDENT'), isFalse);
      expect(canEditProfile(null, 'STUDENT'), isFalse);
    });

    test('day-plan: зөвхөн энэ ангийн, файлтай тест; өмнөх хичээл тусдаа тэмдэглэгээтэй', () {
      final list = parseDayTestPdfs(_dayPlan(), 'c1');
      expect([for (final t in list) t.pdfKey], ['chapter-pdf-b.pdf', 'chapter-pdf-a.pdf']);
      expect(list.first.title, 'Тест 2 — Функц — A хувилбар');
      expect(list.first.previous, isFalse);
      expect(list.last.previous, isTrue);
      expect(parseDayTestPdfs(_dayPlan(), 'c-none'), isEmpty);
    });

    test('day-plan: хийсэн тест байвал төлөвлөснийг орлоно', () {
      final j = _dayPlan();
      ((j['entries']! as List).first as Map)['done'] = [
        {'testId': 't1'},
      ];
      expect([for (final t in parseDayTestPdfs(j, 'c1')) t.testId], ['t1', 't0']);
    });

    test('ангийн түүх: сервер эрт->сүүл; нэрийн хаалт хасагдана', () {
      final d = StudentDetail.fromJson(_studentDetail());
      expect(d.classHistory.map((h) => h.shortName), ['10А', '11А']);
      expect(d.classHistory.last.leftAt, isNull);
      expect(d.grade, 11);
    });

    test('засварын бие: зөвхөн өөрчилсөн талбар, хоосон нэр/утас илгээхгүй', () {
      final d = StudentDetail.fromJson(_studentDetail());
      Map<String, Object?> patch({String phone = '99110001', String first = 'Тэмүүжин', String school = '5-р сургууль', bool g = true}) =>
          ProfileEditSheet.buildPatch(
            d,
            firstName: first,
            lastName: 'Бат',
            phone: phone,
            email: '',
            grade: '11',
            school: school,
            fatherPhone: '99110002',
            motherPhone: '',
            guardianNote: '',
            guardians: g,
          );
      expect(patch(), isEmpty);
      expect(patch(phone: '88110001'), {'phone': '88110001'});
      expect(patch(first: ''), isEmpty);
      expect(patch(school: ''), {'school': ''});
    });

    test('кодын жагсаалт: нэрээр эрэмбэлж «Нэр Овог - код», кодгүй бол «кодгүй»', () {
      const a = RosterStudent(id: 'a', firstName: 'Сарнай', lastName: 'Ганаа', studentCode: 'B2');
      const b = RosterStudent(id: 'b', firstName: 'Анужин', lastName: 'Дорж');
      expect(ClassCodesTab.copyText([a, b]), 'Анужин Дорж - кодгүй\nСарнай Ганаа - B2');
    });
  });

  group('Ангийн «Код» таб', () {
    FakeHttp http0() => FakeHttp()
      ..json(
        'GET',
        '/class-dashboard/classes/c1',
        dashDetail(
          students: [
            dashStudent('s2', 'Сарнай', 'Ганаа', code: 'B27120002'),
            dashStudent('s1', 'Анужин', 'Дорж'),
          ],
        ),
      );

    testWidgets('нэр, код харагдаж, «Бүгдийг хуулах» түрээсэнд хуулна', (tester) async {
      String? copied;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
        if (call.method == 'Clipboard.setData') copied = (call.arguments as Map)['text'] as String?;
        return null;
      });
      addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
      await pumpTeacher(tester, const ClassDetailScreen(classId: 'c1'), http: http0());
      await tester.tap(find.text('Код'));
      await settle(tester, frames: 20);
      expect(find.text('B27120002'), findsOneWidget);
      expect(find.text('кодгүй'), findsOneWidget);
      await tester.tap(find.text('Бүгдийг хуулах'));
      await settle(tester);
      expect(copied, 'Анужин Дорж - кодгүй\nСарнай Ганаа - B27120002');
      expect(find.text('Хуулсан'), findsOneWidget);
      await tester.pump(const Duration(seconds: 2));
    });
  });

  group('Сурагчийн «Мэдээлэл» таб', () {
    FakeHttp http0({Map<String, Object?>? detail}) => FakeHttp()..json('GET', '/users/s1', detail ?? _studentDetail());

    Future<void> openInfo(WidgetTester tester, FakeHttp http, {String role = 'TEACHER_PLUS'}) async {
      await pumpTeacher(
        tester,
        const StudentScreen(studentId: 's1', name: 'Б. Тэмүүжин'),
        http: http,
        session: teacherSession(role: role),
      );
      await tester.ensureVisible(find.text('Мэдээлэл'));
      await settle(tester);
      await tester.tap(find.text('Мэдээлэл'));
      await settle(tester, frames: 30);
    }

    testWidgets('ангийн түүх шинэ нь дээр; Багш+ дээр «Засах» харагдана', (tester) async {
      await openInfo(tester, http0());
      expect(find.text('Ангийн түүх'), findsOneWidget);
      expect(tester.getTopLeft(find.text('11А')).dy, lessThan(tester.getTopLeft(find.text('10А')).dy));
      expect(find.textContaining('одоог хүртэл', findRichText: true), findsOneWidget);
      expect(find.textContaining('ирц 40', findRichText: true), findsOneWidget);
      expect(find.text('Засах'), findsOneWidget);
      expect(find.text('99110001'), findsOneWidget);
    });

    testWidgets('энгийн Багшид «Засах» алга', (tester) async {
      await openInfo(tester, http0(), role: 'TEACHER');
      expect(find.text('Засах'), findsNothing);
    });

    testWidgets('Багш+ ажилтны профайлыг засахгүй (товч алга)', (tester) async {
      await openInfo(tester, http0(detail: _studentDetail(role: 'TEACHER')));
      expect(find.text('Засах'), findsNothing);
    });

    testWidgets('утас солиход зөвхөн утас илгээж, нууц үгийн мэдэгдлийг харуулна', (tester) async {
      final http = http0()..json('PATCH', '/users/s1/profile', {'user': {'id': 's1'}, 'passwordFollowedPhone': true});
      await openInfo(tester, http);
      await tester.tap(find.text('Засах'));
      await settle(tester);
      await tester.enterText(find.widgetWithText(TextField, 'Утасны дугаар'), '88110001');
      await tester.tap(find.widgetWithText(FilledButton, 'Хадгалах'));
      await settle(tester, frames: 20);
      final body = (http.requests.lastWhere((r) => r.method == 'PATCH').data as Map).cast<String, Object?>();
      expect(body, {'phone': '88110001'});
      expect(find.text('Хадгалагдлаа. Нууц үг шинэ дугаар боллоо'), findsOneWidget);
    });

    testWidgets('буруу утсыг илгээхгүй', (tester) async {
      final http = http0();
      await openInfo(tester, http);
      await tester.tap(find.text('Засах'));
      await settle(tester);
      await tester.enterText(find.widgetWithText(TextField, 'Утасны дугаар'), '123');
      await tester.tap(find.widgetWithText(FilledButton, 'Хадгалах'));
      await settle(tester);
      expect(find.text('Утасны дугаар 8 оронтой байх ёстой'), findsOneWidget);
      expect(http.count('PATCH', '/users/s1/profile'), 0);
    });

    testWidgets('403 бол серверийн мессежийг тайван харуулж, хуудас нээлттэй үлдэнэ', (tester) async {
      final http = http0()..error('PATCH', '/users/s1/profile', 403, 'Ажилтны мэдээллийг зөвхөн Админ засна');
      await openInfo(tester, http);
      await tester.tap(find.text('Засах'));
      await settle(tester);
      await tester.enterText(find.widgetWithText(TextField, 'Нэр'), 'Бат-Эрдэнэ');
      await tester.tap(find.widgetWithText(FilledButton, 'Хадгалах'));
      await settle(tester, frames: 20);
      expect(find.text('Ажилтны мэдээллийг зөвхөн Админ засна'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, 'Хадгалах'), findsOneWidget);
    });

    testWidgets('ачаалж чадаагүй бол алдаа ба «Дахин оролдох»', (tester) async {
      await openInfo(tester, FakeHttp()..error('GET', '/users/s1', 500));
      expect(find.text('Дахин оролдох'), findsOneWidget);
    });
  });

  group('Эх PDF', () {
    Future<void> pumpCard(WidgetTester tester, FakeHttp http) => pumpTeacher(
      tester,
      const Scaffold(body: DayPdfCard(classId: 'c1', date: testDate)),
      http: http,
    );

    testWidgets('файлтай тестүүд нэрээр жагсаалтад гарна', (tester) async {
      await pumpCard(tester, FakeHttp()..json('GET', '/schedule/day-plan', _dayPlan()));
      expect(find.text('Эх PDF'), findsOneWidget);
      expect(find.text('Тест 2 — Функц — A хувилбар'), findsOneWidget);
      expect(find.text('Тест 1 — Функц'), findsOneWidget);
      expect(find.text('Өмнөх хичээл'), findsOneWidget);
      expect(find.text('Өөр'), findsNothing);
      // 48dp-ээс бага биш
      expect(tester.getSize(find.byType(ListTile).first).height, greaterThanOrEqualTo(48));
    });

    testWidgets('файл олдохгүй бол карт харагдахгүй (403, 404)', (tester) async {
      await pumpCard(tester, FakeHttp()..error('GET', '/schedule/day-plan', 403));
      expect(find.text('Эх PDF'), findsNothing);
      expect(find.text('Дахин оролдох'), findsNothing);
    });

    testWidgets('сүлжээний алдаа бол «Дахин оролдох»', (tester) async {
      final http = FakeHttp()..on('GET', '/schedule/day-plan', (_) => const FakeResponse.network());
      await pumpCard(tester, http);
      await settle(tester, frames: 60);
      expect(find.text('Дахин оролдох'), findsOneWidget);
    });

    testWidgets('товшвол файлын давхарга (түлхүүрээр, URL-д токенгүй) нээгдэнэ', (tester) async {
      await pumpCard(tester, FakeHttp()..json('GET', '/schedule/day-plan', _dayPlan()));
      await tester.tap(find.text('Тест 2 — Функц — A хувилбар'));
      await settle(tester);
      final gallery = tester.widget<FileGalleryScreen>(find.byType(FileGalleryScreen));
      expect(gallery.fileKeys, ['chapter-pdf-b.pdf']);
      expect(gallery.title, 'Тест 2 — Функц — A хувилбар');
    });
  });
}
