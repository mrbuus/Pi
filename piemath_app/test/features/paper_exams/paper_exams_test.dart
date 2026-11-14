import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/paper_exams/data/paper_exam_models.dart';
import 'package:piemath_app/features/paper_exams/data/paper_exams_repository.dart';
import 'package:piemath_app/features/paper_exams/domain/paper_exam_logic.dart';
import 'package:piemath_app/features/paper_exams/paper_exams.dart';
import 'package:piemath_app/features/paper_exams/paper_exams_routes.dart';

import '../../helpers/fake_http.dart';
import '../student_harness.dart';
import 'internal_harness.dart';

// Зохиомол өгөгдөл — жинхэнэ сурагчийн нэр биш.
Map<String, Object?> _row(String sheet, String student, String first, num score, {String st = 'CWBM'}) => {
  'sheetId': sheet,
  'studentId': student,
  'code': 'M$sheet',
  'lastName': 'Тест',
  'firstName': first,
  'totalScore': score,
  'maxScore': 4,
  'pct': (score * 25).round(),
  'rank': 1,
  'weak': ['Алгебр'],
  'areas': [
    {'area': 'Алгебр', 'pct': 50},
  ],
  'topics': <Object?>[],
  'statuses': st,
  'answers': ['A', 'C', null, '*'],
};

Map<String, Object?> _board({bool published = false, String scope = 'ALL', List<Object?>? unmatched}) => {
  'exam': {'id': 'e1', 'title': 'Нэгдсэн шалгалт 3', 'heldOn': '2026-11-10', 'itemCount': 4, 'published': published},
  'scope': scope,
  'classifyBy': 'area',
  'formulas': [
    {'slug': 'kvadrat', 'title': 'Квадрат тэгшитгэл', 'latex': r'x = \frac{-b}{2a}'},
  ],
  'items': [
    {'number': 1, 'answerKey': 'A', 'points': 1, 'area': 'Алгебр', 'topic': null, 'formulaSlugs': <Object?>[], 'voided': false},
    {
      'number': 2,
      'answerKey': 'B',
      'points': 1,
      'area': 'Алгебр',
      'topic': 'Квадрат тэгшитгэл',
      'formulaSlugs': ['kvadrat'],
      'voided': false,
    },
    {'number': 3, 'answerKey': 'D', 'points': 1, 'area': 'Геометр ба тригонометр', 'formulaSlugs': <Object?>[], 'voided': false},
    {'number': 4, 'answerKey': 'E', 'points': 1, 'area': null, 'formulaSlugs': <Object?>[], 'voided': false},
  ],
  'overall': {
    'count': 2,
    'avgScore': 1.5,
    'avgPct': 38,
    'maxScore': 2,
    'minScore': 1,
    'medianScore': 1.5,
    'items': [
      {'number': 1, 'correct': 2, 'graded': 2, 'pct': 100, 'topWrong': null},
      {
        'number': 2,
        'correct': 0,
        'graded': 2,
        'pct': 0,
        'topWrong': {'letter': 'C', 'count': 2},
      },
      {'number': 3, 'correct': 0, 'graded': 2, 'pct': 0, 'topWrong': null},
      {'number': 4, 'correct': 1, 'graded': 2, 'pct': 50, 'topWrong': null},
    ],
    'areas': [
      {'area': 'Алгебр', 'pct': 50},
    ],
    'topics': <Object?>[],
  },
  'groups': [
    {
      'label': 'Баг 27',
      'teacher': 'Б. Багш',
      'count': 2,
      'avgScore': 1.5,
      'avgPct': 38,
      'items': [
        {'number': 1, 'pct': 100},
        {'number': 2, 'pct': 0},
        {'number': 3, 'pct': 0},
        {'number': 4, 'pct': 50},
      ],
      'areas': [
        {'area': 'Алгебр', 'pct': 50},
      ],
      'topics': <Object?>[],
      'rows': [_row('h1', 's1', 'Болд', 2), _row('h2', 's2', 'Сараа', 1, st: 'CWBB')],
    },
    {
      'label': 'Баг 28',
      'teacher': null,
      'count': 1,
      'items': <Object?>[],
      'areas': <Object?>[],
      'topics': <Object?>[],
      'rows': [_row('h3', 's3', 'Тэмүүжин', 3)],
    },
  ],
  'unmatched': unmatched ?? <Object?>[],
};

Map<String, Object?> _list() => {
  'id': 'e1',
  'title': 'Нэгдсэн шалгалт 3',
  'heldOn': '2026-11-10',
  'itemCount': 4,
  'published': false,
  'keyedCount': 4,
  'areaCount': 3,
  'voidedCount': 0,
  'sheetCount': 3,
  'unmatchedCount': 1,
  'avgPct': 38,
};

Map<String, Object?> _preview({bool saved = false}) => {
  'fileName': 'baguud.xlsx',
  'examItemCount': 4,
  'sheets': [
    {'name': 'Баг 27', 'groupLabel': 'Баг 27', 'groupTeacher': null, 'itemCount': 4, 'rowCount': 3, 'mode': 'LETTERS'},
  ],
  'skipped': <Object?>[],
  'blocking': null,
  'sameFileImportedAt': null,
  'totals': {'rows': 3, 'matched': 2, 'unmatched': 1, 'duplicates': 0, 'replaces': 1, 'warnings': 0, 'willWrite': 3},
  'noKeyLetters': false,
  'rows': [
    {
      'key': 1,
      'sheetName': 'Баг 27',
      'rowNumber': 4,
      'code': '',
      'lastName': 'Тест',
      'firstName': 'Олдохгүй',
      'groupLabel': 'Баг 27',
      'match': null,
      'student': null,
      'totalScore': 1,
      'maxScore': 4,
      'duplicate': false,
      'replaces': false,
      'warnings': <Object?>[],
    },
  ],
  'saved': saved,
};

class _FakePicker implements PaperSheetPicker {
  @override
  Future<PickedSheet?> pick() async => (name: 'baguud.xlsx', bytes: Uint8List.fromList([1, 2, 3]));
}

Object? _json(FakeHttp http, String method, String path) {
  final r = http.requests.lastWhere((r) => r.method == method && r.path == path);
  return r.data is String ? jsonDecode(r.data as String) : r.data;
}

Finder _vertical() => find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).first;

void main() {
  group('логик', () {
    test('нэр автоматаар дугаарлагдана', () {
      expect(nextTitle(['Нэгдсэн шалгалт 2', 'Нэгдсэн шалгалт 7', 'Сорил']), 'Нэгдсэн шалгалт 8');
      expect(nextTitle([]), 'Нэгдсэн шалгалт 1');
    });

    test('оноо, нүд, өнгө, товчлол', () {
      expect(scoreText(12), '12');
      expect(scoreText(7.5), '7.5');
      expect(scoreText(null), '');
      expect(dayText('2026-11-10'), '2026.11.10');
      expect(cellText(ItemStatus.correct, 'A'), '1');
      expect(cellText(ItemStatus.wrong, 'C'), 'C');
      expect(cellText(ItemStatus.wrong, null), '0');
      expect(cellText(ItemStatus.multi, null), '*');
      expect(cellText(ItemStatus.blank, null), '');
      expect(
        [toneOf(70), toneOf(40), toneOf(39), toneOf(null)],
        [PctTone.success, PctTone.warning, PctTone.danger, PctTone.neutral],
      );
      expect(areaShort('Геометр ба тригонометр'), 'ГТ');
      expect(topicShort('Модультай тэнцэтгэл биш'), 'МТБ');
      expect(topicShort('Логарифм'), 'Лог');
      expect(orderedAreas(['Шинэ', 'Алгебр', 'Тоо тоолол']), ['Тоо тоолол', 'Алгебр', 'Шинэ']);
    });

    test('хүснэгт задлах, хайлт, хамгийн их алдсан, давтах томьёо', () {
      final b = PaperBoard.fromJson(_board());
      expect(b.groups.first.rows.first.statusAt(1), ItemStatus.wrong);
      expect(b.groups.first.rows.first.letterAt(1), 'C');
      expect(b.groups.first.rows.first.letterAt(3), isNull);
      expect(searchRows(b.groups, 'сараа').single.sheetId, 'h2');
      expect(searchRows(b.groups, 'Mh3').single.group, 'Баг 28');
      expect(hardestItems(b.overall.items).map((s) => s.number), [2, 3, 4, 1]);
      final review = reviewFormulas([
        (number: 2, slugs: ['kvadrat'], missed: true),
        (number: 5, slugs: ['kvadrat', 'baihgui'], missed: true),
        (number: 6, slugs: ['kvadrat'], missed: false),
      ], b.formulas);
      expect(review.single.numbers, [2, 5]);
    });

    test('ажилтны харагдацад сурагчийн мөр шалгалт бүрээс', () {
      final rows = studentRowsFromBoards('s2', [PaperBoard.fromJson(_board())]);
      expect(rows.single.group, 'Баг 27');
      expect(rows.single.sheetId, 'h2');
      expect(rows.single.totalScore, 1);
    });

    test('сурагчийн алдсан бодлого агуулгаар бүлэглэгдэнэ', () {
      final items = [
        for (final (n, st, area) in [
          (1, 'WRONG', 'Геометр ба тригонометр'),
          (2, 'CORRECT', 'Алгебр'),
          (3, 'BLANK', 'Алгебр'),
          (4, 'MULTI', null),
        ])
          MyPaperItem.fromJson({'number': n, 'status': st, 'area': area}),
      ];
      final g = missedGroups(items, ClassifyBy.area);
      expect(g.map((x) => x.name), ['Алгебр', 'Геометр ба тригонометр', 'Агуулга оноогоогүй']);
    });

    test('импорт: бичигдэх хуудасны тоо солих эсэхээс', () {
      final p = ImportPreview.fromJson(_preview());
      expect(p.writeCount(replace: true), 3);
      expect(p.writeCount(replace: false), 2);
      expect(p.previewRows.single.problem, isTrue);
    });

    test('маршрут', () {
      final r = paperExamsRoutes.shell.single as GoRoute;
      expect(r.path, '/app/paper-exams');
      expect((r.routes.single as GoRoute).path, ':id');
    });
  });

  group('ажилтан', () {
    testWidgets('Багш: жагсаалт, «Шинэ шалгалт» товчгүй, холбогдоогүйн тоо харагдахгүй', (tester) async {
      final http = FakeHttp()..json('GET', '/paper-exams', [_list()]);
      await pumpInternal(tester, http: http, location: '/app/paper-exams', role: UserRole.teacher);
      expect(find.text('Нэгдсэн шалгалт 3'), findsOneWidget);
      expect(find.text('Нийтлээгүй'), findsOneWidget);
      expect(find.text('1 холбогдоогүй'), findsNothing);
      expect(find.byKey(const Key('paper-new')), findsNothing);
    });

    testWidgets('Багш+: шинэ шалгалт дараагийн дугаартай нэрээр, дараа нь «Дүн оруулах»', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/paper-exams', [_list()])
        ..json('POST', '/paper-exams', {'id': 'e2'})
        ..json('GET', '/paper-exams/e2', _board())
        ..json('GET', '/paper-exams/e2/imports', <Object?>[]);
      await pumpInternal(tester, http: http, location: '/app/paper-exams', role: UserRole.teacherPlus);
      expect(find.text('1 холбогдоогүй'), findsOneWidget);
      await tester.tap(find.byKey(const Key('paper-new')));
      await settle(tester);
      expect(find.text('Нэгдсэн шалгалт 4'), findsOneWidget);
      await tester.tap(find.text('Үүсгэх'));
      await settle(tester, frames: 20);
      final body = _json(http, 'POST', '/paper-exams') as Map;
      expect(body['title'], 'Нэгдсэн шалгалт 4');
      expect(body['itemCount'], 48);
      expect(body['heldOn'], matches(RegExp(r'^\d{4}-\d{2}-\d{2}$')));
      expect(find.text('Файл оруулах'), findsOneWidget);
    });

    testWidgets('багийн хүснэгт: сурагчаар мөр, дарвал бодлого бүрийн хариу доод хуудсанд', (tester) async {
      final http = FakeHttp()..json('GET', '/paper-exams/e1', _board(scope: 'OWN_CLASSES'));
      await pumpInternal(tester, http: http, location: '/app/paper-exams/e1', role: UserRole.teacher);
      expect(find.text('Таны ангийн сурагчид'), findsOneWidget);
      expect(find.text('Дүн оруулах'), findsNothing);
      expect(find.byKey(const Key('paper-publish')), findsNothing);
      expect(find.text('Тест Болд'), findsOneWidget);
      expect(find.text('Тест Тэмүүжин'), findsNothing);

      await tester.tap(find.byKey(const Key('paper-row-h1')));
      await settle(tester);
      expect(find.text('зөв: B'), findsOneWidget);
      expect(find.text('Алдсан бодлогын томьёо'), findsOneWidget);
      expect(find.text('Квадрат тэгшитгэл'), findsWidgets);
      Navigator.of(tester.element(find.text('зөв: B'))).pop();
      await settle(tester);

      await tester.enterText(find.byKey(const Key('paper-search')), 'тэмүү');
      await settle(tester);
      expect(find.text('Тест Тэмүүжин'), findsOneWidget);
    });

    testWidgets('тойм: бодлого бүрийн сэдэв, томьёо, түгээмэл алдаа', (tester) async {
      final http = FakeHttp()..json('GET', '/paper-exams/e1', _board());
      await pumpInternal(tester, http: http, location: '/app/paper-exams/e1?tab=overview', role: UserRole.teacher);
      await tester.scrollUntilVisible(find.text('Хамгийн их алдсан бодлого'), 300, scrollable: _vertical());
      await tester.scrollUntilVisible(
        find.text('Бодлого бүрээр: сэдэв, томьёо, гүйцэтгэл'),
        300,
        scrollable: _vertical(),
      );
      await tester.scrollUntilVisible(find.textContaining('Түгээмэл алдаа C, 2 сурагч'), 300, scrollable: _vertical());
      expect(find.textContaining('Түгээмэл алдаа C, 2 сурагч'), findsOneWidget);
    });

    testWidgets('Багш+: нийтлэх, Excel урьдчилан харах, хадгалах, буцаах', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/paper-exams/e1', _board(unmatched: [_row('u1', 'x', 'Олдохгүй', 1)..['studentId'] = null]))
        ..json('PATCH', '/paper-exams/e1', {'ok': true})
        ..json('GET', '/paper-exams/e1/imports', [
          {
            'id': 'i1',
            'fileName': 'omnoh.xlsx',
            'sheetCount': 2,
            'matchedCount': 20,
            'status': 'CONFIRMED',
            'createdAt': '2026-11-11T02:00:00.000Z',
            'revertedAt': null,
            'createdBy': 'Б. Багш',
          },
        ])
        ..json('POST', '/paper-exams/imports/i1/revert', {'ok': true, 'restored': 0})
        ..on('POST', '/paper-exams/e1/import', (r) {
          final confirm = r.queryParameters['confirm'] == '1';
          return FakeResponse(_preview(saved: confirm));
        });
      await pumpInternal(
        tester,
        http: http,
        location: '/app/paper-exams/e1?tab=import',
        role: UserRole.teacherPlus,
        overrides: [paperSheetPickerProvider.overrideWithValue(_FakePicker())],
      );
      await tester.tap(find.byKey(const Key('paper-publish')));
      await settle(tester);
      expect(_json(http, 'PATCH', '/paper-exams/e1'), {'published': true});

      expect(find.text('Сурагчтай холбогдоогүй хуудас'), findsOneWidget);
      await tester.tap(find.byKey(const Key('paper-pick')));
      await settle(tester, frames: 20);
      final first = http.requests.firstWhere((r) => r.path == '/paper-exams/e1/import');
      expect(first.queryParameters, {'confirm': '0', 'replace': '1'});
      expect(first.data, isA<FormData>());
      expect(find.text('baguud.xlsx'), findsOneWidget);
      expect(find.textContaining('Олдсонгүй, хадгалсны дараа гараар холбоно'), findsOneWidget);

      // Өмнөх дүнг солихгүй бол 2 хуудас
      await tester.scrollUntilVisible(find.byType(CheckboxListTile), 200, scrollable: _vertical());
      await tester.tap(find.byType(CheckboxListTile));
      await settle(tester);
      await tester.scrollUntilVisible(find.byKey(const Key('paper-import-save')), 200, scrollable: _vertical());
      expect(find.text('2 хуудас хадгалах'), findsOneWidget);
      await tester.tap(find.byKey(const Key('paper-import-save')));
      await settle(tester, frames: 20);
      final last = http.requests.lastWhere((r) => r.path == '/paper-exams/e1/import');
      expect(last.queryParameters, {'confirm': '1', 'replace': '0'});
      expect(find.text('baguud.xlsx'), findsNothing);

      await tester.scrollUntilVisible(find.byKey(const Key('paper-revert-i1')), 200, scrollable: _vertical());
      await tester.tap(find.byKey(const Key('paper-revert-i1')));
      await settle(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Буцаах'));
      await settle(tester);
      expect(http.count('POST', '/paper-exams/imports/i1/revert'), 1);
    });
  });

  group('сурагч', () {
    final detail = {
      'exam': {'id': 'e1', 'title': 'Нэгдсэн шалгалт 3', 'heldOn': '2026-11-10', 'itemCount': 3},
      'me': {
        'totalScore': 1,
        'maxScore': 3,
        'pct': 33,
        'rank': 5,
        'participants': 40,
        'group': 'Баг 27',
        'weak': ['Алгебр'],
        'areas': [
          {'area': 'Алгебр', 'earned': 1, 'possible': 3, 'pct': 33},
        ],
        'topics': <Object?>[],
        'items': [
          {
            'number': 1,
            'area': 'Алгебр',
            'topic': null,
            'formulaSlugs': <Object?>[],
            'centerPct': 80,
            'points': 1,
            'status': 'CORRECT',
            'answer': 'A',
            'key': 'A',
          },
          {
            'number': 2,
            'area': 'Алгебр',
            'topic': 'Квадрат тэгшитгэл',
            'formulaSlugs': ['kvadrat'],
            'centerPct': 20,
            'points': 1,
            'status': 'WRONG',
            'answer': 'C',
            'key': 'B',
          },
          {
            'number': 3,
            'area': 'Алгебр',
            'formulaSlugs': <Object?>[],
            'centerPct': 40,
            'points': 1,
            'status': 'BLANK',
            'answer': null,
            'key': 'D',
          },
        ],
      },
      'center': {
        'avgPct': 55,
        'areas': [
          {'area': 'Алгебр', 'pct': 60},
        ],
        'topics': <Object?>[],
      },
      'classifyBy': 'area',
      'formulas': [
        {'slug': 'kvadrat', 'title': 'Квадрат тэгшитгэл', 'latex': r'x = \frac{-b}{2a}'},
      ],
      'ranking': [
        {'rank': 1, 'name': 'Б. Тэмүүжин', 'group': 'Баг 28', 'totalScore': 3, 'maxScore': 3, 'isMe': false},
        {'rank': 5, 'name': 'Д. Болд', 'group': 'Баг 27', 'totalScore': 1, 'maxScore': 3, 'isMe': true},
      ],
    };

    testWidgets('өөрийн дүн: жагсаалт → дэлгэрэнгүй, давтах томьёо, төвийн жагсаалт', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/paper-exams/my', [
          {
            'id': 'e1',
            'title': 'Нэгдсэн шалгалт 3',
            'heldOn': '2026-11-10',
            'totalScore': 1,
            'maxScore': 3,
            'pct': 33,
            'rank': 5,
            'participants': 40,
          },
        ])
        ..json('GET', '/paper-exams/my/e1', detail);
      await pumpInternal(
        tester,
        http: http,
        role: UserRole.student,
        userId: 's1',
        home: const StudentPaperExams(studentId: 's1'),
      );
      expect(find.textContaining('5-р байр, 40 сурагчаас'), findsOneWidget);
      await tester.tap(find.byKey(const Key('paper-my-e1')));
      await settle(tester);
      await tester.scrollUntilVisible(find.text('Давтах томьёо'), 300, scrollable: _vertical());
      await tester.scrollUntilVisible(find.text('Алдсан 2'), 300, scrollable: _vertical());
      await tester.scrollUntilVisible(find.text('Д. Болд (Та)'), 300, scrollable: _vertical());
      expect(find.text('Д. Болд (Та)'), findsOneWidget);
      expect(http.count('GET', '/paper-exams'), 0);
    });

    for (final (loc, role, expectText) in [
      ('/app/paper-exams/e1', UserRole.student, 'Төвийн жагсаалт'),
      ('/app/paper-exams/e1', UserRole.admin, 'Тест Болд'),
      ('/app/paper-exams/e1?tab=overview', UserRole.admin, 'Бодлого бүрээр: сэдэв, томьёо, гүйцэтгэл'),
      ('/app/paper-exams/e1?tab=import', UserRole.admin, 'Оруулсан түүх'),
      ('/app/paper-exams', UserRole.admin, 'Нэгдсэн шалгалт 3'),
    ]) {
      testWidgets('320dp утсанд халихгүй: $loc ${role.apiValue}', (tester) async {
        final http = FakeHttp()
          ..json('GET', '/paper-exams/my/e1', detail)
          ..json('GET', '/paper-exams/e1', _board(unmatched: [_row('u1', 'x', 'Олдохгүй', 1)..['studentId'] = null]))
          ..json('GET', '/paper-exams/e1/imports', <Object?>[])
          ..json('GET', '/paper-exams', [_list()]);
        await pumpInternal(tester, http: http, location: loc, role: role, size: const Size(320, 640));
        await tester.scrollUntilVisible(find.text(expectText), 300, scrollable: _vertical());
        expect(find.text(expectText), findsWidgets);
      });
    }

    testWidgets('сурагч /app/paper-exams руу орвол «Шалгалт» хэсэг рүү', (tester) async {
      final http = FakeHttp();
      await pumpInternal(tester, http: http, location: '/app/paper-exams', role: UserRole.student);
      expect(find.text('ROUTE:/app/tests?tab=paper'), findsOneWidget);
    });

    testWidgets('ажилтан сурагчийн хуудаснаас: хүснэгтүүдээс тэр сурагчийн мөр', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/paper-exams', [
          _list(),
          {..._list(), 'id': 'e9', 'sheetCount': 0},
        ])
        ..json('GET', '/paper-exams/e1', _board());
      await pumpInternal(
        tester,
        http: http,
        role: UserRole.teacher,
        home: const StudentPaperExams(studentId: 's2'),
      );
      expect(http.count('GET', '/paper-exams/e9'), 0);
      expect(find.text('Нэгдсэн шалгалт 3'), findsOneWidget);
      expect(find.textContaining('Баг 27'), findsOneWidget);
      await tester.tap(find.byKey(const Key('paper-my-e1')));
      await settle(tester);
      expect(find.textContaining('Баг 27'), findsWidgets);
      expect(find.text('Тест Сараа'), findsOneWidget);
    });

    testWidgets('эцэг эх, бусад эрх: харах эрхгүй', (tester) async {
      final http = FakeHttp();
      await pumpInternal(
        tester,
        http: http,
        role: UserRole.parent,
        home: const StudentPaperExams(studentId: 's1'),
      );
      expect(http.requests, isEmpty);
    });
  });
}
