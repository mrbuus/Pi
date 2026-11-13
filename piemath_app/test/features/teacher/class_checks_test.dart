import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/teacher/data/class_checks.dart';
import 'package:piemath_app/features/teacher/ui/class_checks_screen.dart';
import 'package:piemath_app/features/teacher/ui/classes_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

// «Чек» (эзэн 2026-10-22, 2026-11-10). Зохиомол нэр, утас.

Map<String, Object?> _person(String id, String first, String last, {String? role}) => {
  'id': id,
  'firstName': first,
  'lastName': last,
  'role': ?role,
};

Map<String, Object?> _mark(String sid, bool checked, {String by = 't2'}) => {
  'studentId': sid,
  'checked': checked,
  'updatedAt': '2026-11-02T06:05:00.000Z',
  'updatedBy': _person(by, 'Сараа', 'Болд', role: 'TEACHER_PLUS'),
};

Map<String, Object?> _check(
  String id,
  String title, {
  int? amount,
  List<Map<String, Object?>> marks = const [],
  String? archivedAt,
  String? bookKey,
}) => {
  'id': id,
  'title': title,
  'amount': amount,
  'bookKey': bookKey,
  'createdAt': '2026-11-01T02:00:00.000Z',
  'createdBy': _person('t1', 'Нараа', 'Бат', role: 'TEACHER'),
  'archivedAt': archivedAt,
  'archivedBy': archivedAt == null ? null : _person('t2', 'Сараа', 'Болд', role: 'TEACHER_PLUS'),
  'marks': marks,
};

Map<String, Object?> _list({List<Map<String, Object?>>? checks, List<Map<String, Object?>> archived = const []}) => {
  'classroomId': 'c1',
  'students': [_person('s2', 'Анужин', 'Дорж'), _person('s3', 'Сарнай', 'Ганаа'), _person('s1', 'Тэмүүжин', 'Бат')],
  'former': [_person('s9', 'Болор', 'Энх')],
  'checks':
      checks ??
      [
        _check('k1', 'Шалгалтын цаас', amount: 25000, marks: [_mark('s2', true), _mark('s9', true)]),
      ],
  'archived': archived,
};

FakeHttp _http({Map<String, Object?>? list}) => FakeHttp()
  ..json('GET', '/classrooms/c1/checks', list ?? _list())
  ..on(
    'PUT',
    '/classrooms/c1/checks/k1/students/s3',
    (req) => FakeResponse(_mark('s3', (req.data as Map)['checked'] == true)),
  )
  ..on(
    'PUT',
    '/classrooms/c1/checks/k1/students/s2',
    (req) => FakeResponse(_mark('s2', (req.data as Map)['checked'] == true)),
  )
  ..json('GET', '/classrooms/c1/checks/students/s3', {
    'id': 's3',
    'firstName': 'Сарнай',
    'lastName': 'Ганаа',
    'studentCode': 'B27120003',
    'classroomName': '12Б',
    'inClass': true,
    'guardianNote': 'Ээж нь ажлын цагаар утсаа авдаггүй',
    'contacts': [
      {'kind': 'student', 'phone': '99001122'},
      {'kind': 'father', 'phone': '+976 8800 3344', 'name': 'Г. Бат', 'appLinked': true},
    ],
  });

Map<String, Object?> _body(FakeHttp http, String method, String path) =>
    (http.requests.lastWhere((r) => r.method == method && r.path == path).data as Map).cast();

const _screen = ClassChecksScreen(classId: 'c1', className: '12Б');

void main() {
  group('тоо (вэбийн summary)', () {
    test('N/M одоогийн сурагчаар, гарсан ч тэмдэглэгдсэний мөнгө орно', () {
      final c = ClassCheck.fromJson(_check('k1', 'x', amount: 25000, marks: [_mark('s2', true), _mark('s9', true)]));
      final s = checkSummary(c, {'s1', 's2', 's3'});
      expect((s.done, s.total, s.former, s.collected, s.left), (1, 3, 1, 50000, 2));
    });

    test('номын чек: авахгүй нь M-д орохгүй, өөр ангид төлсөн мөнгө энд биш', () {
      final c = ClassCheck.fromJson(
        _check(
          'k2',
          'E-2',
          amount: 40000,
          bookKey: 'E2',
          marks: [
            {..._mark('s1', true), 'amount': 40000},
            {
              ..._mark('s2', true),
              'amount': 40000,
              'elsewhere': {'name': '12-4'},
            },
            {..._mark('s3', false), 'skipped': true},
          ],
        ),
      );
      final s = checkSummary(c, {'s1', 's2', 's3'});
      expect((s.done, s.total, s.skipped, s.collected), (2, 2, 1, 40000));
    });

    test('утас: tel холбоост зөвхөн цифр ба «+»', () {
      const ct = CheckContact(kind: 'father', phone: '+976 8800 3344');
      expect(ct.telHref, 'tel:+97688003344');
      expect(ct.label, 'Аав');
    });
  });

  testWidgets('жагсаалт: тоо, мөнгө, нээсэн хүн; нуусан хэсэг', (tester) async {
    await pumpTeacher(
      tester,
      _screen,
      http: _http(
        list: _list(archived: [_check('k0', 'Ном', archivedAt: '2026-11-01T03:00:00.000Z')]),
      ),
    );
    expect(find.text('Шалгалтын цаас'), findsOneWidget);
    expect(find.text('25,000₮'), findsOneWidget);
    expect(find.textContaining('1/3'), findsOneWidget);
    expect(find.textContaining('50,000₮'), findsOneWidget);
    expect(find.textContaining('Б. Нараа нээсэн, 11.01'), findsOneWidget);
    expect(find.text('Нуусан'), findsOneWidget);
  });

  testWidgets('шинэ чек: «Бусад» → нэр, дүн → нээгээд дэлгэрэнгүй рүү', (tester) async {
    final http = _http(list: _list(checks: const []))
      ..json('POST', '/classrooms/c1/checks', _check('k7', 'Шалгалтын цаас', amount: 3000));
    await pumpTeacher(tester, _screen, http: http);
    expect(find.text('Нээлттэй чек алга'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('check-new')));
    await settle(tester);
    await tester.tap(find.byKey(const ValueKey('kind-other')));
    await settle(tester);
    await tester.tap(find.byKey(const ValueKey('check-submit')));
    await settle(tester);
    expect(find.text('Чекийн нэрээ бичнэ үү'), findsOneWidget);
    await tester.enterText(find.byKey(const ValueKey('check-title')), '  Шалгалтын   цаас ');
    await tester.enterText(find.byKey(const ValueKey('check-amount')), '3000');
    await tester.tap(find.byKey(const ValueKey('check-submit')));
    await settle(tester, frames: 20);
    expect(_body(http, 'POST', '/classrooms/c1/checks'), {'title': 'Шалгалтын цаас', 'amount': 3000});
    expect(find.byKey(const ValueKey('check-back')), findsOneWidget);
  });

  testWidgets('дэлгэрэнгүй: дугуйгаар тэмдэглэнэ; «Үлдсэн» шүүлттэй үед дарсан хүүхэд алга болохгүй', (tester) async {
    final http = _http();
    await pumpTeacher(tester, _screen, http: http);
    await tester.tap(find.text('Шалгалтын цаас'));
    await settle(tester);
    expect(find.text('Ангиас гарсан'), findsOneWidget);
    expect(find.text('Э. Болор'), findsOneWidget);
    await tester.tap(find.text('Үлдсэн 2'));
    await settle(tester);
    expect(find.text('Д. Анужин'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('cs-toggle-Г. Сарнай')));
    await settle(tester);
    expect(_body(http, 'PUT', '/classrooms/c1/checks/k1/students/s3'), {'checked': true});
    // Шүүлтийг солих хүртэл жагсаалтад үлдэнэ.
    expect(find.text('Г. Сарнай'), findsOneWidget);
    expect(find.text('Болсон 2'), findsOneWidget);
    await tester.tap(find.text('Болсон 2'));
    await settle(tester);
    expect(find.text('Б. Тэмүүжин'), findsNothing);
  });

  testWidgets('тэмдэглэгээ алдаатай бол буцааж, серверээс дахин уншина', (tester) async {
    final http = _http()
      ..error('PUT', '/classrooms/c1/checks/k1/students/s1', 400, 'Энэ сурагч энэ ангид одоо бүртгэлгүй');
    await pumpTeacher(tester, _screen, http: http);
    await tester.tap(find.text('Шалгалтын цаас'));
    await settle(tester);
    final before = http.count('GET', '/classrooms/c1/checks');
    await tester.tap(find.byKey(const ValueKey('cs-toggle-Б. Тэмүүжин')));
    await settle(tester, frames: 20);
    expect(find.text('Энэ сурагч энэ ангид одоо бүртгэлгүй'), findsOneWidget);
    expect(find.text('Болсон 1'), findsOneWidget);
    expect(http.count('GET', '/classrooms/c1/checks'), before + 1);
  });

  testWidgets('нэр дарахад: код, анги, утас (аппад холбогдсон), тэмдэглэл — төлбөргүй', (tester) async {
    await pumpTeacher(tester, _screen, http: _http());
    await tester.tap(find.text('Шалгалтын цаас'));
    await settle(tester);
    await tester.tap(find.text('Г. Сарнай'));
    await settle(tester, frames: 20);
    expect(find.text('Ганаа Сарнай'), findsOneWidget);
    expect(find.textContaining('B27120003'), findsOneWidget);
    expect(find.text('99001122'), findsOneWidget);
    expect(find.text('+976 8800 3344'), findsOneWidget);
    expect(find.text('Аппад холбогдсон'), findsOneWidget);
    expect(find.text('Ээж нь ажлын цагаар утсаа авдаггүй'), findsOneWidget);
    expect(find.byTooltip('Аавын дугаар хуулах'), findsOneWidget);
    expect(find.descendant(of: find.byType(CheckStudentSheet), matching: find.textContaining('₮')), findsNothing);
  });

  testWidgets('нуух: үлдсэн тоог хэлнэ; устгах: буцааж гаргах боломжгүй', (tester) async {
    final http = _http()
      ..json(
        'PATCH',
        '/classrooms/c1/checks/k1',
        _check('k1', 'Шалгалтын цаас', amount: 25000, archivedAt: '2026-11-02T08:00:00.000Z'),
      )
      ..json('DELETE', '/classrooms/c1/checks/k1', {'id': 'k1', 'deleted': true});
    await pumpTeacher(tester, _screen, http: http);
    await tester.tap(find.text('Шалгалтын цаас'));
    await settle(tester);
    await scrollTo(tester, find.byKey(const ValueKey('check-archive')));
    await tester.tap(find.byKey(const ValueKey('check-archive')));
    await settle(tester);
    expect(find.text('2 хүүхэд тэмдэглэгдээгүй байна'), findsOneWidget);
    await scrollTo(tester, find.byKey(const ValueKey('check-confirm')));
    await tester.tap(find.byKey(const ValueKey('check-confirm')));
    await settle(tester, frames: 20);
    expect(_body(http, 'PATCH', '/classrooms/c1/checks/k1'), {'archived': true});
    expect(find.text('Чекийг нуулаа'), findsOneWidget);
    expect(find.byKey(const ValueKey('check-new')), findsOneWidget);
    // Нуусан чек → устгах
    await tester.tap(find.text('Нуусан'));
    await settle(tester);
    await tester.tap(find.text('Шалгалтын цаас'));
    await settle(tester);
    expect(find.byKey(const ValueKey('check-restore')), findsOneWidget);
    await scrollTo(tester, find.byKey(const ValueKey('check-delete')));
    await tester.tap(find.byKey(const ValueKey('check-delete')));
    await settle(tester);
    expect(find.textContaining('буцааж гаргах боломжгүй'), findsOneWidget);
    await scrollTo(tester, find.byKey(const ValueKey('check-confirm')));
    await tester.tap(find.byKey(const ValueKey('check-confirm')));
    await settle(tester, frames: 20);
    expect(http.count('DELETE', '/classrooms/c1/checks/k1'), 1);
    expect(find.text('Чекийг устгалаа'), findsOneWidget);
  });

  testWidgets('320dp утсан дээр жагсаалт, дэлгэрэнгүй халихгүй', (tester) async {
    await pumpTeacher(tester, _screen, http: _http(), size: const Size(320, 640));
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Шалгалтын цаас'));
    await settle(tester);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ангийн самбарын толгойд «Чек» товч нээлттэй тоотой', (tester) async {
    final http = FakeHttp()..json('GET', '/class-dashboard/classes/c1', {...dashDetail(), 'openChecks': 2});
    await pumpTeacher(tester, const ClassDetailScreen(classId: 'c1'), http: http);
    expect(find.text('Чек 2'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('class-checks')));
    await settle(tester);
    expect(find.text('ROUTE:/app/classes/c1/checks'), findsOneWidget);
  });
}
