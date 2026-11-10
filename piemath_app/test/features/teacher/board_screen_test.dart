import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/icons.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/core/ui/tokens.dart';
import 'package:piemath_app/features/teacher/ui/board_screen.dart';
import 'package:piemath_app/features/teacher/ui/teacher_icons.dart';
import 'package:piemath_app/shared/marks/marks.dart';

import '../../helpers/fake_http.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

const _screen = BoardScreen(classId: 'c1', date: testDate);

FakeHttp _http({Map<String, Object?>? board}) =>
    boardHttp(board: board)..on('POST', '/classrooms/c1/attendance', (req) => echoAttendance((req.data as Map).cast()));

Map<String, Object?> _lastAttBody(FakeHttp http) =>
    (http.requests.lastWhere((r) => r.method == 'POST' && r.path == '/classrooms/c1/attendance').data as Map).cast();

Finder _inKey(String key, Finder f) => find.descendant(of: find.byKey(ValueKey(key)), matching: f);

/// Хайрцгийн хүрээ, дэвсгэрийн өнгө.
BoxDecoration _boxDecoration(WidgetTester tester, String key) {
  final ink = tester.widget<Ink>(_inKey(key, find.byType(Ink)));
  return ink.decoration! as BoxDecoration;
}

AppColors _colors(WidgetTester tester) => Theme.of(tester.element(find.byType(BoardScreen))).extension<AppColors>()!;

void main() {
  testWidgets('нэрс, эрсдэл, тоо, тайлбар (legend) доор', (tester) async {
    await pumpTeacher(tester, _screen, http: _http());
    expect(find.text('12Б'), findsOneWidget);
    expect(find.text('Д. Анужин'), findsOneWidget);
    expect(find.text('Г. Сарнай'), findsOneWidget);
    expect(find.byTooltip('5 удаа хоцорсон'), findsOneWidget);
    expect(find.text('Автоматаар хадгалагдана'), findsOneWidget);
    await scrollTo(tester, find.text('Б. Тэмүүжин'));
    await scrollTo(tester, find.text('Үлдсэнийг нэг дор'));
    expect(find.text('Бүгд ирсэн (3)'), findsOneWidget);
    expect(find.text('Бүгд хийсэн (0)'), findsOneWidget);
    await scrollTo(tester, find.text('Шалгуур хангаагүй'));
  });

  testWidgets('нэрээр эрэмбэлж дугаарлана (монгол цагаан толгой)', (tester) async {
    await pumpTeacher(tester, _screen, http: _http());
    expect(_inKey('card-s2', find.text('1')), findsOneWidget);
    expect(_inKey('card-s3', find.text('2')), findsOneWidget);
    expect(
      tester.getTopLeft(find.byKey(const ValueKey('card-s2'))).dy,
      lessThan(tester.getTopLeft(find.byKey(const ValueKey('card-s3'))).dy),
    );
  });

  testWidgets('утсан дээр: мөрийн шошго дүрсээр, хайрцаг бүр дүрс + бичиг', (tester) async {
    final sem = tester.ensureSemantics();
    await pumpTeacher(tester, _screen, http: _http());
    // «Ирц» мөр UserCheck, «Даалгавар» мөр NotebookPen дүрстэй; үг нь зөвхөн дэлгэц уншигчид.
    expect(_inKey('card-s2', find.byIcon(TeacherIcons.userCheck)), findsOneWidget);
    expect(_inKey('card-s2', find.byIcon(AppIcons.homework)), findsOneWidget);
    expect(find.bySemanticsLabel('Ирц, Д. Анужин'), findsOneWidget);
    expect(find.bySemanticsLabel('Даалгавар, Д. Анужин'), findsOneWidget);
    for (final (key, label) in [
      ('att-s2-present', 'Ирсэн'),
      ('att-s2-late', 'Хоцорсон'),
      ('att-s2-absent', 'Тасалсан'),
      ('att-s2-excused', 'Чөлөөтэй'),
      ('hw-s2-done', 'Хийсэн'),
      ('hw-s2-partial', 'Дутуу'),
      ('hw-s2-notDone', 'Хийгээгүй'),
    ]) {
      expect(_inKey(key, find.text(label)), findsOneWidget, reason: key);
      expect(_inKey(key, find.byType(MarkIcon)), findsOneWidget, reason: key);
      // Дүрс дээр, бичиг доор.
      expect(
        tester.getCenter(_inKey(key, find.byType(MarkIcon))).dy,
        lessThan(tester.getCenter(_inKey(key, find.text(label))).dy),
        reason: key,
      );
    }
    // Ирц ба даалгаврын хайрцгууд нэг баганад тэгширнэ, «Онлайн» нь 4-р багана.
    expect(
      tester.getRect(find.byKey(const ValueKey('att-s2-present'))).left,
      tester.getRect(find.byKey(const ValueKey('hw-s2-done'))).left,
    );
    expect(
      tester.getRect(find.byKey(const ValueKey('att-s2-excused'))).left,
      tester.getRect(find.byKey(const ValueKey('online-s2'))).left,
    );
    sem.dispose();
  });

  testWidgets('таблет (≥640): мөрийн шошго үгээр, нарийн таблетад хайрцагт дүрс дээр', (tester) async {
    await pumpTeacher(tester, _screen, http: _http(), size: const Size(820, 1180));
    expect(tester.takeException(), isNull);
    expect(_inKey('card-s2', find.text('Ирц')), findsOneWidget);
    expect(_inKey('card-s2', find.text('Даалгавар')), findsOneWidget);
    expect(_inKey('card-s2', find.byIcon(TeacherIcons.userCheck)), findsNothing);
    // Нэр зүүн баганад — хайрцгуудын зүүн талд.
    expect(
      tester.getRect(_inKey('card-s2', find.text('Д. Анужин'))).right,
      lessThan(tester.getRect(find.byKey(const ValueKey('att-s2-present'))).left),
    );
    expect(
      tester.getCenter(_inKey('att-s2-present', find.byType(MarkIcon))).dy,
      lessThan(tester.getCenter(_inKey('att-s2-present', find.text('Ирсэн'))).dy),
    );
  });

  testWidgets('өргөн дэлгэц (≥1024): нэг мөрт хайрцаг, «Онлайн» үгтэй', (tester) async {
    await pumpTeacher(tester, _screen, http: _http(), size: const Size(1180, 900));
    expect(tester.takeException(), isNull);
    expect(_inKey('online-s2', find.text('Онлайн')), findsOneWidget);
    expect(
      (tester.getCenter(_inKey('att-s2-present', find.byType(MarkIcon))).dy -
              tester.getCenter(_inKey('att-s2-present', find.text('Ирсэн'))).dy)
          .abs(),
      lessThan(2),
    );
  });

  testWidgets('сонгосон төлөвийн өнгө (вэбийн TONE_SELECTED), хоцорсон хугацаа хайрцагт', (tester) async {
    await pumpTeacher(
      tester,
      _screen,
      http: _http(
        board: boardJson(
          attendance: [attRow('s2', 'LATE', lateRange: 'TEN_TO_THIRTY')],
          homework: [hwRow('s2', 'NOT_DONE')],
        ),
      ),
    );
    final c = _colors(tester);
    final late = _boxDecoration(tester, 'att-s2-late');
    expect((late.border! as Border).top.color, c.warning);
    expect(late.color, Color.alphaBlend(c.warning.withValues(alpha: 0.15), c.surface));
    expect(tester.widget<Text>(_inKey('att-s2-late', find.text('Хоцорсон'))).style?.color, c.warning);
    expect(_inKey('att-s2-late', find.text('10–30 мин')), findsOneWidget);
    final missing = _boxDecoration(tester, 'hw-s2-notDone');
    expect((missing.border! as Border).top.color, c.error);
    // Сонгоогүй хайрцаг: саарал хүрээ, цагаан дэвсгэр.
    final idle = _boxDecoration(tester, 'att-s2-present');
    expect((idle.border! as Border).top.color, c.line);
    expect(idle.color, c.surface);
    expect(tester.widget<Text>(_inKey('att-s2-present', find.text('Ирсэн'))).style?.color, c.inkDim);
    // Мөр бүрийн өнгө, шошго marks.dart-ийн вэбийн утгатай ижил.
    expect(attendanceMeta(AttendanceStatus.present).tone, MarkTone.success);
    expect(homeworkMeta(HomeworkStatus.partial).tone, MarkTone.warning);
  });

  testWidgets('илгээсэн ч шалгаагүй карт өөр өнгөтэй, «Шалгаагүй»; тэмдэглэмэгц энгийн', (tester) async {
    final board = boardJson()
      ..['sent'] = {
        'assignmentIds': ['as1'],
        'students': ['s2'],
      };
    final http = boardHttp(board: board)
      ..json('PATCH', '/classrooms/c1/homework-marks/s2', {
        'student': {'id': 's2'},
        'applied': true,
        'status': 'DONE',
        'comment': null,
        'markedBy': 'Б. Болд',
        'updatedAt': '2026-11-02T07:00:00.000Z',
      });
    await pumpTeacher(tester, _screen, http: http);
    final c = _colors(tester);
    BoxDecoration card(String id) =>
        tester.widget<DecoratedBox>(find.byKey(ValueKey('card-$id'))).decoration as BoxDecoration;
    expect(card('s2').color, isNot(c.surface));
    expect((card('s2').border! as Border).top.color, c.brandBright.withValues(alpha: 0.6));
    expect(card('s3').color, c.surface);
    expect(_inKey('card-s2', find.text('Шалгаагүй')), findsOneWidget);
    expect(_inKey('card-s2', find.byTooltip('Даалгавраа илгээсэн')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('hw-s2-done')));
    await tester.pump();
    expect(card('s2').color, c.surface);
    expect(_inKey('card-s2', find.text('Шалгаагүй')), findsNothing);
    await settle(tester);
  });

  testWidgets('товшилт шууд хадгалагдана (optimistic), зөвхөн тэр карт дахин зурагдана', (tester) async {
    final http = _http();
    await pumpTeacher(tester, _screen, http: http);
    await tester.tap(find.byKey(const ValueKey('att-s2-present')));
    await tester.pump();
    expect(find.text('Хадгалж байна'), findsOneWidget);
    await settle(tester);
    expect(_lastAttBody(http)['entries'], [
      {'studentId': 's2', 'status': 'PRESENT'},
    ]);
    expect(find.textContaining('Хадгалагдсан '), findsOneWidget);
    expect(find.bySemanticsLabel('Ирсэн 1/3'), findsOneWidget);
  });

  testWidgets('алдаа гарвал буцаана, «Хадгалагдсангүй»', (tester) async {
    final http = boardHttp()..error('POST', '/classrooms/c1/attendance', 404, 'Анги олдсонгүй');
    await pumpTeacher(tester, _screen, http: http);
    await tester.tap(find.byKey(const ValueKey('att-s2-absent')));
    await settle(tester);
    expect(find.text('Хадгалагдсангүй'), findsOneWidget);
    expect(find.text('Анги олдсонгүй'), findsOneWidget);
  });

  testWidgets('шүүлтүүр: тоотой чип, «N/M сурагч», «Бүгд»', (tester) async {
    await pumpTeacher(
      tester,
      _screen,
      http: _http(board: boardJson(attendance: [attRow('s2', 'ABSENT')])),
    );
    expect(find.text('3 сурагч'), findsOneWidget);
    await tester.tap(find.text('Шүүлтүүр'));
    await settle(tester);
    // Тэг тоотой чип харагдахгүй.
    expect(find.byKey(const ValueKey('filter-attLate')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('filter-attAbsent')));
    await settle(tester);
    expect(find.byKey(const ValueKey('card-s2'), skipOffstage: false), findsOneWidget);
    expect(find.byKey(const ValueKey('card-s3'), skipOffstage: false), findsNothing);
    expect(find.text('/3 сурагч', findRichText: true), findsNothing);
    expect(find.textContaining('/3 сурагч', findRichText: true), findsOneWidget);
    await tester.tap(find.text('Бүгд'));
    await settle(tester);
    expect(find.text('3 сурагч'), findsOneWidget);
    // «Асуудалтай» — шалгуур хангаагүй сурагч.
    await tester.tap(find.byKey(const ValueKey('filter-risk')));
    await settle(tester);
    expect(find.byKey(const ValueKey('card-s3'), skipOffstage: false), findsOneWidget);
    expect(find.byKey(const ValueKey('card-s2'), skipOffstage: false), findsNothing);
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
    final http = boardHttp(board: boardJson(attendance: [attRow('s2', 'ABSENT')]))
      ..on(
        'POST',
        '/classrooms/c1/attendance',
        (req) => echoAttendance((req.data as Map).cast(), existing: const {'s2': 'ABSENT'}),
      );
    await pumpTeacher(tester, _screen, http: http);
    await tester.tap(find.byKey(const ValueKey('note-s2')));
    await settle(tester);
    expect(find.text('Тасалсан шалтгаан'), findsOneWidget);
    expect(find.textContaining('өвч'), findsNothing);
    await tester.tap(find.widgetWithText(ChoiceChip, 'тэмцээн'));
    await settle(tester);
    expect((_lastAttBody(http)['entries']! as List).single, {'studentId': 's2', 'note': 'тэмцээн'});
    await tester.tap(find.text('Болсон'));
    await settle(tester);
    // Хаалттай картад тэмдэглэлийн товч.
    expect(_inKey('card-s2', find.text('тэмцээн')), findsOneWidget);
  });

  testWidgets('онлайн анги: даалгаврын мөр үгүй, онлайн шалгах холбоос', (tester) async {
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

  for (final width in [320.0, 393.0]) {
    testWidgets('утас (${width.toInt()}dp): мөр халихгүй, зүүн ирмэгт тасрахгүй, товч 48-аас багагүй', (tester) async {
      await pumpTeacher(
        tester,
        _screen,
        http: _http(
          board: boardJson(
            attendance: [attRow('s2', 'LATE', lateRange: 'THIRTY_TO_SIXTY', note: 'автобус')],
          ),
        ),
        size: Size(width, 760),
      );
      expect(tester.takeException(), isNull);
      await scrollTo(tester, find.byKey(const ValueKey('card-s2')));
      for (final key in ['att-s2-late', 'att-s2-present', 'hw-s2-done', 'online-s2', 'note-s2']) {
        final r = tester.getRect(find.byKey(ValueKey(key)));
        expect(r.width, greaterThanOrEqualTo(48), reason: key);
        expect(r.height, greaterThanOrEqualTo(48), reason: key);
        expect(r.right, lessThanOrEqualTo(width), reason: key);
      }
      final card = tester.getRect(find.byKey(const ValueKey('card-s2')));
      expect(card.left, greaterThanOrEqualTo(16));
      expect(card.right, lessThanOrEqualTo(width - 16));
      expect(_inKey('card-s2', find.text('автобус')), findsOneWidget);
      // «⋯» картын баруун захад (нэрийн ард дунд хавьд үлдэхгүй) — тэмдэглэлтэй, тэмдэглэлгүй аль ч картад
      for (final id in ['s2', 's1']) {
        await scrollTo(tester, find.byKey(ValueKey('card-$id')));
        final box = tester.getRect(find.byKey(ValueKey('card-$id')));
        final more = tester.getRect(find.byKey(ValueKey('note-$id')));
        expect(box.right - more.right, lessThanOrEqualTo(12), reason: id);
      }
    });
  }
}
