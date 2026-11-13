import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/schedule/data/staff_schedule_models.dart';
import 'package:piemath_app/features/schedule/domain/day_export.dart';
import 'package:piemath_app/features/schedule/ui/staff/day_export.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../../helpers/test_container.dart';
import '../student_harness.dart';
import 'staff_fixtures.dart';

// Зохиомол өгөгдөл (жинхэнэ сурагч, багшийн нэр биш).

const _date = '2026-11-08';

class _FakeLauncher implements ShareLauncher {
  final shared = <({File file, String mimeType, String? subject})>[];

  @override
  Future<bool> shareFile(File file, {required String mimeType, String? subject, Rect? origin}) async {
    shared.add((file: file, mimeType: mimeType, subject: subject));
    return true;
  }
}

DayPlan _plan() => DayPlan.fromJson({
  ...dayPlanJson(
    _date,
    entries: [
      {
        ...lessonJson(id: 's1', date: _date, room: '504', lead: {'id': 't2', 'name': 'Болд', 'role': 'TEACHER_PLUS'}),
        'students': 26,
        'plan': {
          'testIds': ['tA', 'tB'],
          'customTopics': ['Давталт'],
          'dismissMode': 'STAY',
          'photoStudent': {'id': 'p1', 'name': 'Т. Анар'},
        },
        'note': {'body': 'Тооны машин', 'updatedByName': 'Болд+'},
        'dismissalAt': '2026-11-08T10:40:00.000Z',
      },
      {
        ...lessonJson(id: 's2', date: _date, classroomId: 'c3', classroomName: '10-1 (Баруун 4)', end: 690),
        'record': {
          'confirmedByName': 'Сарнай',
          'confirmedAt': '2026-11-08T05:00:00.000Z',
          'presentCount': 18,
          'enrolledCount': 20,
          'absentCount': 2,
          'attendanceMarked': 20,
          'problemNumbersText': '1-12',
        },
        'done': [
          {'sessionId': 'x1', 'testId': 'tA', 'excludedProblemIds': <String>[]},
        ],
      },
      lessonJson(
        id: 's3',
        date: _date,
        classroomId: 'c2',
        classroomName: '11-2 (Зүүн 4)',
        start: 840,
        end: 960,
        room: '301',
      ),
    ],
  ),
  'isHoliday': false,
  'restingClasses': [
    {'classroomName': '9-1 (Зүүн 4)'},
  ],
  'meal': {
    'cook': {'id': 't2', 'name': 'Болд', 'role': 'TEACHER_PLUS'},
    'food': 'Цуйван',
  },
  'tests': {
    'tA': {'testId': 'tA', 'title': 'Квадрат 1', 'short': 'Квадрат 1'},
    'tB': {'testId': 'tB', 'title': 'Квадрат 2', 'short': 'Квадрат 2'},
  },
});

void main() {
  setUpAll(loadAppFonts);

  test('зургийн агуулга: салбар, цагийн блок, тест товчлол, нэмэлт, танхимгүй', () {
    final m = dayExportModel(_plan());
    expect(m.title, '11-р сарын 8, Ням');
    expect(m.year, '2026');
    expect(m.notices, ['Амарна: 9-1']);
    expect(m.branches.map((b) => (b.name, b.count)), [('Баруун 4', 2), ('Зүүн 4', 1)]);

    final west = m.branches.first.blocks.single;
    // Дуусах цаг: олонх (12:00 ба 11:30 — тэнцвэл эрт нь) — ялгаатай мөрд «Дуусах».
    expect(west.time, '10:00–11:30');
    final a = west.rows.firstWhere((r) => r.className == '12-1');
    expect(a.tests, 'Квадрат 1, 2; Давталт');
    expect(a.done, isFalse);
    expect(a.lead, 'Болд+');
    expect(a.sub, '26 сурагч');
    final extras = [for (final x in a.extras) x.label.isEmpty ? x.text : '${x.label}: ${x.text}'];
    expect(extras, [
      'Дуусах: 12:00',
      'Үлдэнэ',
      'Тарсан: 18:40',
      'Онолын зураг: Т. Анар',
      '2 суудал дутна',
      'Тэмдэглэл: Тооны машин',
    ]);
    // Танхимын дугаар зурагт ОРОХГҮЙ.
    expect(extras.join(' '), isNot(contains('504')));

    final b = west.rows.firstWhere((r) => r.className == '10-1');
    expect(b.done, isTrue);
    expect(b.tests, 'Квадрат 1');
    expect([for (final x in b.extras) x.text], ['Батлагдсан', '18/20', '2', '1-12']);

    expect(m.footer.map((f) => '${f.label}: ${f.text}'), ['Ажиллах багш: Сарнай', 'Хоол: Болд+ — Цуйван']);
    expect(dayExportFileName(_date), 'huvaari-2026-11-08.png');
  });

  testWidgets('урьдчилан харуулаад PNG-г «Хуваалцах» цонхоор илгээнэ', (tester) async {
    final launcher = _FakeLauncher();
    final dir = Directory.systemTemp.createTempSync('piemath_export_test');
    addTearDown(() => dir.deleteSync(recursive: true));
    tester.view.physicalSize = const Size(390, 844) * 2;
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          ...testOverrides(http: FakeHttp()),
          sessionProvider.overrideWith(() => FixedSession(signedInAs(UserRole.teacherPlus))),
          shareLauncherProvider.overrideWithValue(launcher),
          dayExportDirProvider.overrideWithValue(() async => dir),
        ],
        retry: (_, _) => null,
        child: MaterialApp(
          theme: AppTheme.dark(),
          home: DayExportScreen(plan: _plan()),
        ),
      ),
    );
    await settle(tester);
    expect(find.text('Хуваарийн зураг'), findsOneWidget);
    expect(find.text('Хичээлийн хуваарь, 2026'), findsOneWidget);
    expect(find.text('Квадрат 1, 2; Давталт'), findsOneWidget);
    expect(find.text('504'), findsNothing);
    expect(tester.takeException(), isNull);

    await tester.runAsync(() async {
      await tester.tap(find.byKey(const ValueKey('day-export:share')));
      for (var i = 0; i < 50 && launcher.shared.isEmpty; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 20));
        await tester.pump();
      }
    });
    await settle(tester);
    expect(launcher.shared, hasLength(1));
    final s = launcher.shared.single;
    expect(s.mimeType, 'image/png');
    expect(s.subject, 'Хуваарь 11-р сарын 8, Ням');
    expect(s.file.path, endsWith('piemath_share/huvaari-2026-11-08.png'));
    final bytes = s.file.readAsBytesSync();
    expect(bytes.sublist(1, 4), 'PNG'.codeUnits);
  });
}
