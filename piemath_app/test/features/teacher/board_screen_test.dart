import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/teacher/ui/board_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

const _screen = BoardScreen(classId: 'c1', date: testDate);

FakeHttp _http({Map<String, Object?>? board}) =>
    boardHttp(board: board)..on('POST', '/classrooms/c1/attendance', (req) => echoAttendance((req.data as Map).cast()));

Map<String, Object?> _lastAttBody(FakeHttp http) =>
    (http.requests.lastWhere((r) => r.method == 'POST' && r.path == '/classrooms/c1/attendance').data as Map).cast();

void main() {
  testWidgets('нэрс, эрсдэл, тоо, тайлбар (legend) доор', (tester) async {
    await pumpTeacher(tester, _screen, http: _http());
    expect(find.text('12Б'), findsOneWidget);
    expect(find.text('Б. Тэмүүжин'), findsOneWidget);
    expect(find.text('Г. Сарнай'), findsOneWidget);
    expect(find.byTooltip('5 удаа хоцорсон'), findsOneWidget);
    expect(find.text('Товшмогц хадгалагдана'), findsOneWidget);
    await scrollTo(tester, find.text('Үлдсэнийг нэг дор'));
    expect(find.text('Бүгд ирсэн (3)'), findsOneWidget);
    expect(find.text('Бүгд хийсэн (0)'), findsOneWidget);
  });

  testWidgets('товшилт шууд хадгалагдана (optimistic)', (tester) async {
    final http = _http();
    await pumpTeacher(tester, _screen, http: http);
    await tester.tap(find.byKey(const ValueKey('att-s1-present')));
    await tester.pump();
    expect(find.text('Хадгалж байна'), findsOneWidget);
    await settle(tester);
    expect(_lastAttBody(http)['entries'], [
      {'studentId': 's1', 'status': 'PRESENT'},
    ]);
    expect(find.textContaining('Хадгалсан'), findsOneWidget);
  });

  testWidgets('алдаа гарвал буцаана, «Хадгалагдсангүй»', (tester) async {
    final http = boardHttp()..error('POST', '/classrooms/c1/attendance', 404, 'Анги олдсонгүй');
    await pumpTeacher(tester, _screen, http: http);
    await tester.tap(find.byKey(const ValueKey('att-s1-absent')));
    await settle(tester);
    expect(find.text('Хадгалагдсангүй'), findsOneWidget);
    expect(find.text('Анги олдсонгүй'), findsOneWidget);
  });

  testWidgets('«Бүгд ирсэн» → «Буцаах»', (tester) async {
    final http = _http(board: boardJson(attendance: [attRow('s2', 'ABSENT')]));
    await pumpTeacher(tester, _screen, http: http);
    await scrollTo(tester, find.text('Бүгд ирсэн (2)'));
    await tester.tap(find.text('Бүгд ирсэн (2)'));
    await settle(tester);
    final entries = _lastAttBody(http)['entries']! as List;
    expect(entries.map((e) => (e as Map)['studentId']), ['s1', 's3']);
    expect(entries.every((e) => (e as Map)['onlyIf'] == 'UNMARKED'), isTrue);
    expect(find.text('Буцаах (2)'), findsOneWidget);
    await tester.tap(find.text('Буцаах (2)'));
    await settle(tester);
    expect((_lastAttBody(http)['entries']! as List).first, {'studentId': 's1', 'status': null, 'onlyIf': 'PRESENT'});
    expect(find.text('Бүгд ирсэн (2)'), findsOneWidget);
  });

  testWidgets('⋯ тэмдэглэл: «өвчтэй» сонголтгүй, чип шууд хадгалагдана', (tester) async {
    final http = boardHttp(board: boardJson(attendance: [attRow('s1', 'ABSENT')]))
      ..on(
        'POST',
        '/classrooms/c1/attendance',
        (req) => echoAttendance((req.data as Map).cast(), existing: const {'s1': 'ABSENT'}),
      );
    await pumpTeacher(tester, _screen, http: http);
    await tester.tap(find.byKey(const ValueKey('note-s1')));
    await settle(tester);
    expect(find.text('Тасалсан шалтгаан'), findsOneWidget);
    expect(find.textContaining('өвч'), findsNothing);
    await tester.tap(find.widgetWithText(ChoiceChip, 'тэмцээн'));
    await settle(tester);
    expect((_lastAttBody(http)['entries']! as List).single, {'studentId': 's1', 'note': 'тэмцээн'});
    await tester.tap(find.text('Болсон'));
    await settle(tester);
    expect(find.textContaining('тэмцээн', findRichText: true), findsOneWidget);
  });

  testWidgets('онлайн анги: даалгаврын багана үгүй, онлайн шалгах холбоос', (tester) async {
    await pumpTeacher(
      tester,
      _screen,
      http: _http(board: boardJson(type: 'ONLINE')),
    );
    expect(find.byKey(const ValueKey('hw-s1-done')), findsNothing);
    await scrollTo(tester, find.text('Онлайн даалгавар шалгах'));
    expect(find.text('Бүгд хийсэн (0)'), findsNothing);
  });

  testWidgets('амралтын өдөр', (tester) async {
    await pumpTeacher(
      tester,
      _screen,
      http: _http(board: boardJson(holiday: 'Үндэсний баяр')),
    );
    expect(find.text('Амралтын өдөр'), findsOneWidget);
    expect(find.text('Үндэсний баяр'), findsOneWidget);
  });

  testWidgets('ачааллын алдаа → дахин оролдох', (tester) async {
    final http = FakeHttp()..error('GET', '/attendance/classrooms/c1/board', 403, 'Энэ ангид хандах эрхгүй байна');
    await pumpTeacher(tester, _screen, http: http);
    expect(find.text('Энэ ангид хандах эрхгүй байна'), findsOneWidget);
    expect(find.text(AppStrings.retry), findsOneWidget);
  });

  testWidgets('жижиг утас (320dp): мөр халихгүй, товч 48dp', (tester) async {
    await pumpTeacher(
      tester,
      _screen,
      http: _http(
        board: boardJson(
          attendance: [attRow('s1', 'LATE', lateRange: 'THIRTY_TO_SIXTY', note: 'автобус')],
        ),
      ),
      size: const Size(320, 640),
    );
    expect(tester.takeException(), isNull);
    expect(tester.getSize(find.byKey(const ValueKey('att-s1-late'))), const Size(48, 48));
  });
}
