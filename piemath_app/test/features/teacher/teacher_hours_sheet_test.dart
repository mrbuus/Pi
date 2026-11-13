import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/teacher/data/teacher_hours_sheet.dart';
import 'package:piemath_app/features/teacher/domain/teacher_hours_logic.dart';
import 'package:piemath_app/features/teacher/ui/teacher_hours_screen.dart';
import 'package:piemath_app/features/teacher/ui/teacher_hours_sheet_view.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../../helpers/test_container.dart';
import '../student_harness.dart' show FixedSession;
import 'teacher_harness.dart';

// Зохиомол өгөгдөл (жинхэнэ багшийн нэр, данс биш).

Map<String, Object?> _bodyOf(RequestOptions r) => (r.data as Map).cast<String, Object?>();

List<String> _days(String ym, int from, int to) => [
  for (var d = from; d <= to; d++) '$ym-${d.toString().padLeft(2, '0')}',
];

Map<String, Object?> _sheet({bool canEdit = false, bool seesPay = false, String id = '2026-11-1'}) {
  final second = id.endsWith('-2');
  final ym = id.substring(0, 7);
  final days = second ? _days(ym, 16, 30) : _days(ym, 1, 15);
  return {
    'period': {
      'id': id,
      'start': days.first,
      'end': days.last,
      'days': days,
      'prev': second ? '$ym-1' : '2026-10-2',
      'next': id == '2026-11-1' ? null : '2026-11-1',
      'current': '2026-11-1',
    },
    'today': '2026-11-02',
    'viewer': {'userId': 'u1', 'canEdit': canEdit, 'seesPay': seesPay},
    'rows': [
      {
        'teacherId': 'u1',
        'name': 'Сарнай',
        'role': 'TEACHER',
        'inRoster': true,
        'archived': false,
        'hasAccount': true,
        'cells': {'2026-11-01': 750, '2026-11-02': 400},
        'totalHundredths': 1150,
        'staffed': {
          '2026-11-02': {'minutes': 240, 'lessons': 2},
        },
      },
      {
        'teacherId': 'u2',
        'name': 'Болд+',
        'role': 'TEACHER_PLUS',
        'inRoster': true,
        'archived': false,
        'hasAccount': false,
        'cells': {'2026-11-02': 300},
        'totalHundredths': 300,
        'staffed': <String, Object?>{},
      },
    ],
    'totalHundredths': 1450,
  };
}

Map<String, Object?> _account({bool canEdit = true, bool has = true}) => {
  'teacherId': 'u1',
  'fullName': 'Бат Сарнай',
  'canEdit': canEdit,
  'isSelf': true,
  'account': has
      ? {
          'bankName': 'Хаан банк',
          'accountNumber': '5012345678',
          'holderName': 'Бат Сарнай',
          'updatedAt': '2026-11-01T00:00:00.000Z',
          'updatedBy': 'Б. Сарнай',
        }
      : null,
};

class _FakeLauncher implements ShareLauncher {
  final shared = <({File file, String mimeType})>[];

  @override
  Future<bool> shareFile(File file, {required String mimeType, String? subject, Rect? origin}) async {
    shared.add((file: file, mimeType: mimeType));
    return true;
  }
}

Future<void> _pumpSheet(WidgetTester tester, FakeHttp http, {String role = 'TEACHER'}) => pumpTeacher(
  tester,
  const Scaffold(body: TeacherHoursSheetView()),
  http: http,
  session: teacherSession(role: role),
);

void main() {
  setUpAll(loadAppFonts);

  group('логик (API, вэбтэй ижил)', () {
    test('нүдний утга унших', () {
      const ok = {
        '7': 700,
        '7.5': 750,
        '7,5': 750,
        ' 9,5 ': 950,
        '2.25': 225,
        '0,75': 75,
        '.5': 50,
        ',5': 50,
        '7.': 700,
        '0': 0,
        '24': 2400,
        '24.00': 2400,
        '07': 700,
        '0,05': 5,
      };
      for (final MapEntry(:key, :value) in ok.entries) {
        final r = parseHoursInput(key);
        expect((r.ok, r.hundredths), (true, value), reason: key);
      }
      for (final empty in ['', '   ', null]) {
        expect(parseHoursInput(empty).hundredths, isNull);
        expect(parseHoursInput(empty).ok, isTrue);
      }
      for (final bad in ['24.01', '25', '100', '-1', '7.555', 'abc', '1e1', '7.5.1', '.', ',', '7,5,0', '+5', '7 5']) {
        expect(parseHoursInput(bad).ok, isFalse, reason: bad);
      }
      expect(parseHoursInput('25').error, 'Нэг өдөрт 0–24 цаг');
      expect(parseHoursInput('7.555').error, 'Бутархай нь 2 оронгоос ихгүй (ж: 7,25)');
      expect(parseHoursInput('abc').error, 'Зөвхөн тоо бичнэ үү (ж: 7 эсвэл 7,5)');
    });

    test('бичих хэлбэр, уншиж бичихэд ижил', () {
      expect(formatHundredths(750), '7.5');
      expect(formatHundredths(725), '7.25');
      expect(formatHundredths(700), '7');
      expect(formatHundredths(5), '0.05');
      expect(formatHundredths(50), '0.5');
      expect(formatHundredths(null), '');
      for (var h = 0; h <= 2400; h++) {
        expect(parseHoursInput(formatHundredths(h)).hundredths, h);
      }
    });

    test('цалин, үе, огноо, минут', () {
      expect(payAmount(7850, 15000), 1177500);
      expect(payAmount(5, 10001), 500);
      expect(periodLabel('2026-11-16', '2026-11-30'), '2026 оны 11-р сар, 16–30');
      expect(hoursDateLabel('2026-11-03'), '11-р сарын 3, Мягмар');
      expect(minutesLabel(240), '4 цаг');
      expect(minutesLabel(90), '1 цаг 30 мин');
      expect(minutesLabel(45), '45 мин');
    });

    test('«Дараах»: доош, багана дуусвал дараагийн өдрийн эхний мөр', () {
      expect(nextHoursCell(0, 3, rows: 3, cols: 15), (row: 1, col: 3));
      expect(nextHoursCell(2, 3, rows: 3, cols: 15), (row: 0, col: 4));
      expect(nextHoursCell(2, 14, rows: 3, cols: 15), isNull);
    });

    test('CSV: BOM, томьёо шахалтаас хамгаална, нийт', () {
      final csv = hoursCsv(
        rows: [(teacherId: 'a', name: '=Сарнай'), (teacherId: 'b', name: 'Болд "Б"')],
        days: ['2026-11-01', '2026-11-02'],
        valueOf: (k) => const {'a|2026-11-01': 750, 'a|2026-11-02': 25, 'b|2026-11-02': 300}[k],
      );
      expect(csv.startsWith('﻿'), isTrue);
      expect(csv.substring(1).split('\n'), ['№,Нэр,1,2,Нийт', '1,"\'=Сарнай",7.5,0.25,7.75', '2,"Болд ""Б""",,3,3']);
    });

    test('дансны маягт бэлэн эсэх', () {
      expect(accountFormReady(bankName: 'Хаан банк', number: '5012 345', holder: 'Бат'), isTrue);
      expect(accountFormReady(bankName: 'Хаан банк', number: '50-12', holder: 'Бат'), isFalse);
      expect(accountFormReady(bankName: '', number: '5012345', holder: 'Бат'), isFalse);
    });

    test('хариу задлах', () {
      final s = HoursSheet.fromJson(_sheet(canEdit: true));
      expect(s.period.days, hasLength(15));
      expect(s.period.next, isNull);
      expect(s.rows.first.cells['2026-11-01'], 750);
      expect(s.rows.first.staffed['2026-11-02']!.lessons, 2);
      expect(s.canEdit, isTrue);
      expect(s.seesPay, isFalse);
      final a = TeacherAccount.fromJson(_account());
      expect(a.hasAccount, isTrue);
      expect(TeacherAccount.fromJson(_account(has: false)).hasAccount, isFalse);
    });
  });

  group('хүснэгт', () {
    testWidgets('Багш: зөвхөн харна, өнөөдрийн өдөр, хуваарьт орсон, нийт', (tester) async {
      final http = FakeHttp()..json('GET', '/teacher-hours/sheet', _sheet());
      await _pumpSheet(tester, http);
      expect(http.requests.single.queryParameters, isEmpty);
      expect(find.text('2026 оны 11-р сар, 1–15'), findsOneWidget);
      // Өнөөдөр (11-02) сонгогдсон: цаг, хуваарьт орсон.
      expect(find.text('11-р сарын 2, Даваа'), findsOneWidget);
      expect(find.text('Хуваарьт 2 хичээл (4 цаг)'), findsOneWidget);
      expect(find.byType(TextField), findsNothing);
      expect(
        find.descendant(of: find.byKey(const ValueKey('hours-row:u1|2026-11-02')), matching: find.text('4')),
        findsOneWidget,
      );
      expect(find.text('Нийт 7 цаг'), findsOneWidget);
      // Дараагийн үе байхгүй (одоогийн үеэс цааш шилжихгүй).
      final next = find.widgetWithIcon(IconButton, AppIcons.forward);
      expect(tester.widget<IconButton>(next).onPressed, isNull);

      await tester.ensureVisible(find.byKey(const ValueKey('hours-day:total')));
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('hours-day:total')));
      await settle(tester);
      expect(find.text('11.5 цаг'), findsWidgets);
      expect(find.byKey(const ValueKey('hours:grand-total')), findsOneWidget);
      expect(find.text('14.5 цаг'), findsOneWidget);
      expect(find.textContaining('₮'), findsNothing);
    });

    testWidgets('өмнөх хагас сар: ?period= илгээж, «Одоогийн үе» гарна', (tester) async {
      final http = FakeHttp()
        ..on('GET', '/teacher-hours/sheet', (r) {
          final p = r.queryParameters['period'] as String?;
          return FakeResponse(_sheet(id: p ?? '2026-11-1'));
        });
      await _pumpSheet(tester, http);
      await tester.tap(find.byTooltip('Өмнөх хагас сар'));
      await settle(tester);
      expect(http.requests.last.queryParameters['period'], '2026-10-2');
      expect(find.text('Одоогийн үе'), findsOneWidget);
      await tester.tap(find.text('Одоогийн үе'));
      await settle(tester);
      expect(http.requests.last.queryParameters['period'], '2026-11-1');
    });

    testWidgets('бөглөх: 1 секундын дараа автоматаар хадгалж, буруу утгыг илгээхгүй', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/teacher-hours/sheet', _sheet(canEdit: true))
        ..on(
          'PUT',
          '/teacher-hours/sheet/cell',
          (r) => FakeResponse({
            'teacherId': _bodyOf(r)['teacherId'],
            'date': _bodyOf(r)['date'],
            'hundredths': parseHoursInput(_bodyOf(r)['value'] as String?).hundredths,
            'changed': true,
          }),
        );
      await _pumpSheet(tester, http, role: 'TEACHER_PLUS');
      final cell = find.byKey(const ValueKey('hours-cell:u2|2026-11-02'));
      expect(cell, findsOneWidget);

      await tester.enterText(cell, '25');
      await tester.pump(const Duration(milliseconds: 1100));
      await settle(tester);
      expect(find.text('Нэг өдөрт 0–24 цаг'), findsOneWidget);
      expect(find.text('1 нүд хадгалагдаагүй'), findsOneWidget);
      expect(http.count('PUT', '/teacher-hours/sheet/cell'), 0);

      await tester.enterText(cell, '6,5');
      await tester.pump(const Duration(milliseconds: 500));
      expect(http.count('PUT', '/teacher-hours/sheet/cell'), 0);
      await tester.pump(const Duration(milliseconds: 600));
      await settle(tester);
      final put = http.requests.lastWhere((r) => r.path == '/teacher-hours/sheet/cell');
      expect(_bodyOf(put), {'teacherId': 'u2', 'date': '2026-11-02', 'value': '6,5'});
      expect(find.text('Хадгалагдсан'), findsOneWidget);
      // Өдрийн нийт: 4 + 6.5.
      expect(find.text('Нийт 10.5 цаг'), findsOneWidget);
    });

    testWidgets('«Дараах»: хадгалаад доорх багш, жагсаалт дуусахад дараагийн өдөр', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/teacher-hours/sheet', _sheet(canEdit: true))
        ..json('PUT', '/teacher-hours/sheet/cell', {'hundredths': 500});
      await _pumpSheet(tester, http, role: 'ADMIN');
      await tester.tap(find.byKey(const ValueKey('hours-cell:u1|2026-11-02')));
      await tester.enterText(find.byKey(const ValueKey('hours-cell:u1|2026-11-02')), '5');
      await tester.testTextInput.receiveAction(TextInputAction.next);
      await settle(tester);
      expect(http.count('PUT', '/teacher-hours/sheet/cell'), 1);
      final second = tester.widget<TextField>(find.byKey(const ValueKey('hours-cell:u2|2026-11-02')));
      expect(second.focusNode!.hasFocus, isTrue);

      await tester.testTextInput.receiveAction(TextInputAction.next);
      await settle(tester);
      expect(find.text('11-р сарын 3, Мягмар'), findsOneWidget);
      final next = tester.widget<TextField>(find.byKey(const ValueKey('hours-cell:u1|2026-11-03')));
      expect(next.focusNode!.hasFocus, isTrue);
    });

    testWidgets('серверийн алдаа нүдэнд үлдэж, «Дахин оролдох»', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/teacher-hours/sheet', _sheet(canEdit: true))
        ..error('PUT', '/teacher-hours/sheet/cell', 403, 'Цаг бөглөх эрх танд олгогдоогүй байна')
        ..json('PUT', '/teacher-hours/sheet/cell', {'hundredths': 800});
      await _pumpSheet(tester, http, role: 'TEACHER_PLUS');
      await tester.enterText(find.byKey(const ValueKey('hours-cell:u1|2026-11-02')), '8');
      await tester.pump(const Duration(milliseconds: 1100));
      await settle(tester);
      expect(find.text('Цаг бөглөх эрх танд олгогдоогүй байна'), findsOneWidget);
      await tester.tap(find.text('Дахин оролдох'));
      await settle(tester);
      expect(http.count('PUT', '/teacher-hours/sheet/cell'), 2);
      expect(find.text('Хадгалагдсан'), findsOneWidget);
    });

    testWidgets('хөлс: зөвхөн seesPay — «Нийт»-д ₮/цаг, цалин, хөлс тавих', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/teacher-hours/sheet', _sheet(canEdit: true, seesPay: true))
        ..json('GET', '/teacher-hours/pay', {
          'period': '2026-11-1',
          'rows': [
            {'teacherId': 'u1', 'ratePerHour': 20000, 'rateFrom': '2026-10-16', 'setThisPeriod': false},
          ],
          'totalAmount': 230000,
        })
        ..json('PUT', '/teacher-hours/pay/rate', {'changed': true});
      await _pumpSheet(tester, http, role: 'TEACHER_PLUS');
      expect(http.requests.where((r) => r.path == '/teacher-hours/pay').single.queryParameters, {
        'period': '2026-11-1',
      });
      await tester.ensureVisible(find.byKey(const ValueKey('hours-day:total')));
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('hours-day:total')));
      await settle(tester);
      expect(find.text('230,000₮'), findsWidgets);
      expect(find.text('10.16-аас'), findsOneWidget);
      await tester.enterText(find.byKey(const ValueKey('hours-rate:u2')), '15000');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await settle(tester);
      final put = http.requests.lastWhere((r) => r.path == '/teacher-hours/pay/rate');
      expect(_bodyOf(put), {'teacherId': 'u2', 'period': '2026-11-1', 'ratePerHour': 15000});
    });

    testWidgets('CSV: «Хуваалцах» цонхоор', (tester) async {
      final launcher = _FakeLauncher();
      final dir = Directory.systemTemp.createTempSync('hours_csv_test');
      addTearDown(() => dir.deleteSync(recursive: true));
      final http = FakeHttp()..json('GET', '/teacher-hours/sheet', _sheet());
      tester.view.physicalSize = const Size(390, 844) * 3;
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            ...testOverrides(http: http),
            sessionProvider.overrideWith(() => FixedSession(teacherSession())),
            shareLauncherProvider.overrideWithValue(launcher),
            teacherHoursTempDirProvider.overrideWithValue(() async => dir),
          ],
          retry: (_, _) => null,
          child: MaterialApp(
            theme: AppTheme.light(),
            home: const Scaffold(body: TeacherHoursSheetView()),
          ),
        ),
      );
      await settle(tester);
      await tester.runAsync(() async {
        await tester.tap(find.byKey(const ValueKey('hours:csv')));
        for (var i = 0; i < 50 && launcher.shared.isEmpty; i++) {
          await Future<void>.delayed(const Duration(milliseconds: 20));
          await tester.pump();
        }
      });
      expect(launcher.shared.single.mimeType, 'text/csv');
      expect(launcher.shared.single.file.path, endsWith('ajillasan-tsag-2026-11-1.csv'));
      expect(launcher.shared.single.file.readAsStringSync(), contains('1,"Сарнай",7.5,4'));
    });
  });

  group('данс', () {
    testWidgets('«Миний данс»: харах, хуулах, засах', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/teacher-hours/sheet', _sheet())
        ..json('GET', '/teacher-hours/accounts/u1', _account())
        ..json('PUT', '/teacher-hours/accounts/u1', {'changed': true});
      await _pumpSheet(tester, http);
      await tester.tap(find.byKey(const ValueKey('hours:my-account')));
      await settle(tester);
      expect(find.text('Бат Сарнай'), findsWidgets);
      expect(find.text('Хаан банк'), findsOneWidget);
      expect(find.text('5012345678'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('account:edit')));
      await settle(tester);
      await tester.enterText(find.byKey(const ValueKey('account:number-field')), '5099 1234');
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('account:save')));
      await settle(tester);
      final put = http.requests.lastWhere((r) => r.path == '/teacher-hours/accounts/u1' && r.method == 'PUT');
      expect(_bodyOf(put), {'bankName': 'Хаан банк', 'accountNumber': '5099 1234', 'holderName': 'Бат Сарнай'});
      expect(find.text('Данс хадгалагдлаа'), findsOneWidget);
    });

    testWidgets('бусдын данс эрхгүй бол засах товчгүй', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/teacher-hours/sheet', _sheet())
        ..json('GET', '/teacher-hours/accounts/u2', {
          ..._account(canEdit: false, has: false),
          'teacherId': 'u2',
          'fullName': 'Дорж Болд+',
          'isSelf': false,
        });
      await _pumpSheet(tester, http);
      await tester.tap(find.text('Болд+'));
      await settle(tester);
      expect(find.text('Данс хараахан оруулаагүй байна'), findsOneWidget);
      expect(find.byKey(const ValueKey('account:edit')), findsNothing);
      expect(find.byKey(const ValueKey('account:save')), findsNothing);
    });
  });

  group('дэлгэц', () {
    testWidgets('«Ажилласан цаг» анхдагч, «Хуваариас тооцоолсон» хуучин тооцоо', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/teacher-hours/sheet', _sheet())
        ..json('GET', '/teacher-hours/me', {'month': '2026-11', 'teachers': <Object?>[]});
      await pumpTeacher(tester, const TeacherHoursScreen(), http: http);
      expect(find.text('Ажилласан цаг'), findsWidgets);
      expect(http.requests.map((r) => r.path), ['/teacher-hours/sheet']);
      await tester.tap(find.text('Хуваариас'));
      await settle(tester);
      expect(http.requests.last.path, '/teacher-hours/me');
      expect(find.text('Энэ сард орсон хичээл алга'), findsOneWidget);
    });
  });
}
