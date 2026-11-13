import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/teacher/data/student_calendar_models.dart';
import 'package:piemath_app/features/teacher/domain/student_calendar_logic.dart';
import 'package:piemath_app/features/teacher/ui/student_lesson_history_tab.dart';
import 'package:piemath_app/features/teacher/ui/student_screen.dart';
import 'package:piemath_app/shared/marks/marks.dart';
import 'package:piemath_app/shared/quiz_score/quiz_score.dart';

import '../../helpers/fake_http.dart';
import 'teacher_harness.dart';

// Давалгаа 6 (вэб 2026-11-08…11-12): сурагчийн хуудасны «Хичээлийн түүх» хуанли + өдрийн цонх,
// «Сэдэв хөтөлбөр», «Одоо гарвал буцаах дүн», нөхөлтийн түүх. Зохиомол өгөгдөл.

Map<String, Object?> _day(
  String date, {
  String cls = 'c1',
  String name = '12-6 (Баруун 4)',
  bool own = true,
  String? att,
  String? hw,
  Map<String, Object?>? quiz,
  bool future = false,
  List<Map<String, Object?>> tests = const [],
  String? testsText,
}) => {
  'key': '$date|$cls',
  'date': date,
  'classroomId': cls,
  'classroomName': name,
  'own': own,
  'scheduled': true,
  'startMinute': 960,
  'endMinute': 1080,
  'room': '406',
  'movedFrom': null,
  'topic': 'Квадрат тэгшитгэл 1, Квадрат тэгшитгэл 2',
  'lead': 'Н. Багш+',
  'assistant': null,
  'scheduleTeacher': null,
  'tests': tests,
  'testsText': testsText,
  'confirmed': null,
  'teacherNote': {'body': 'Сайн оролцсон', 'by': 'Н. Багш+'},
  'attendance': att == null ? null : {'status': att, 'lateRange': null, 'note': null, 'markedBy': 'Н. Багш+'},
  'homework': hw == null ? null : {'status': hw, 'comment': null, 'markedBy': null},
  'quiz': quiz,
  'future': future,
};

Map<String, Object?> _visit({String id = 'v1', String date = '2026-11-01', bool room406 = true}) => {
  'id': id,
  'date': date,
  'place': room406
      ? {'kind': 'ROOM_406', 'classroomId': null, 'name': '406'}
      : {'kind': 'CLASS', 'classroomId': 'c9', 'name': '12-4'},
  'label': room406 ? '406-д нөхөж хийсэн' : '12-4 ангид нөхөж суусан',
  'homeClassroom': {'id': 'c1', 'name': '12-6 (Баруун 4)'},
  'tests': [
    {
      'id': 'mt1',
      'testId': 't1',
      'title': 'Сорил 3',
      'variant': null,
      'source': 'RECORDED',
      'result': {'score': 8, 'max': 10},
    },
  ],
  'comment': null,
  'attendance': {'status': 'PRESENT', 'lateRange': null, 'note': null},
  'homework': {'status': null, 'note': null},
  'teacher': {'id': 'u2', 'name': 'Б. Болор+'},
  'createdAt': '2026-11-01T08:10:00.000Z',
  'updatedAt': '2026-11-01T08:10:00.000Z',
};

Map<String, Object?> _lessonDays(
  String from,
  String to,
  List<Map<String, Object?>> days, [
  List<Map<String, Object?>> makeups = const [],
]) => {'from': from, 'to': to, 'today': '2026-11-02', 'firstDate': '2026-10-01', 'days': days, 'makeups': makeups};

FakeHttp _http() => FakeHttp()
  ..json('GET', '/students/s1/attendance', [])
  ..json('GET', '/students/s1/homework-marks', [])
  ..json('GET', '/students/s1/test-results', [])
  ..json('GET', '/students/s1/notes', [])
  ..on('GET', '/students/s1/lesson-days', (r) {
    final from = r.queryParameters['from'] as String;
    if (from == '2026-11-01') {
      return FakeResponse(
        _lessonDays(
          '2026-11-01',
          '2026-11-30',
          [
            _day(
              '2026-11-02',
              att: 'ABSENT',
              tests: [
                {'testId': 't1', 'title': 'Сорил 3', 'variant': 'B'},
              ],
              testsText: 'Сорил 3',
            ),
            _day('2026-11-04', future: true),
          ],
          [_visit(date: '2026-11-03')],
        ),
      );
    }
    return FakeResponse(
      _lessonDays(from, '2026-10-31', [
        _day('2026-10-28', att: 'PRESENT', hw: 'DONE', quiz: {'score': 7.5, 'problemCount': 10}),
      ]),
    );
  })
  ..json('GET', '/students/s1/syllabus', {
    'student': {'id': 's1', 'name': 'Тэмүүжин'},
    'classroom': {'id': 'c1', 'name': '12-6 (Баруун 4)'},
    'summary': {'done': 1, 'missing': 1, 'todo': 1, 'total': 3},
    'books': [
      {
        'id': 'b1',
        'code': '100V3',
        'title': '100x100 V3',
        'chapters': [
          {
            'id': 'ch1',
            'order': 1,
            'title': 'Тоо тоолол',
            'tests': [
              {
                'id': 't1',
                'title': 'Тоо тоолол 1',
                'variant': 'B',
                'status': 'DONE',
                'doneOn': '2026-10-20',
                'events': <Object?>[],
              },
              {
                'id': 't2',
                'title': 'Тоо тоолол 2',
                'variant': null,
                'status': 'MISSING',
                'doneOn': null,
                'events': [
                  {
                    'kind': 'CLASS',
                    'done': false,
                    'date': '2026-10-27',
                    'classroomId': 'c1',
                    'classroomName': '12-6',
                    'attendance': 'ABSENT',
                  },
                ],
              },
              {'id': 't3', 'title': 'Тоо тоолол 3', 'variant': null, 'status': 'TODO', 'doneOn': null, 'events': <Object?>[]},
            ],
          },
        ],
      },
    ],
    'other': <Object?>[],
  });

void main() {
  group('логик', () {
    test('сарын хил, сар нэмэх, шошго', () {
      expect(monthBounds('2026-02'), (from: '2026-02-01', to: '2026-02-28'));
      expect(monthBounds('2026-11').to, '2026-11-30');
      expect(addMonths('2026-01', -1), '2025-12');
      expect(addMonths('2026-12', 1), '2027-01');
      expect(monthKeyLabel('2026-11'), '2026 оны 11-р сар');
      expect(shortDay('2026-11-08'), '11-р сарын 8');
      expect(shortClass('12-6 (Баруун 4)'), '12-6');
    });

    test('сэдвийн нэр товчлол (вэбийн regroupTopicText)', () {
      expect(
        regroupTopicText('Квадрат тэгшитгэл 1, Квадрат тэгшитгэл 2, Илтгэгч 4'),
        'Квадрат тэгшитгэл 1, 2; Илтгэгч 4',
      );
      // Нэгтгэх зүйлгүй бол ЯГ хэвээр (багшийн чөлөөт бичвэр)
      expect(regroupTopicText('Давталт, шалгалт'), 'Давталт, шалгалт');
      expect(regroupTopicText('Сорил 3'), 'Сорил 3');
    });

    test('хайрцаг: огноогоор, ижил өдөр нөхөлт сүүлд; анги сольсон сард шошго', () {
      final data = LessonDaysResponse.fromJson(
        _lessonDays(
          '2026-11-01',
          '2026-11-30',
          [_day('2026-11-05', cls: 'c2', name: '12-4 (Зүүн)'), _day('2026-11-02')],
          [_visit(date: '2026-11-02')],
        ),
      );
      final cells = calendarCells(data);
      expect([for (final c in cells) c.key], ['2026-11-02|c1', 'm:v1', '2026-11-05|c2']);
      expect(cells[0].classLabel, '12-6');
      expect(cells[2].classLabel, '12-4');
      // Нэг ангитай сард шошгогүй
      final one = calendarCells(LessonDaysResponse.fromJson(_lessonDays('a', 'b', [_day('2026-11-02')])));
      expect(one.single.classLabel, isNull);
    });

    test(
      'сарын тоо: ирээдүй орохгүй, тэмдэглээгүй зөвхөн өөрийн ангид, шалгалттай өдөр даалгавар тэмдэглээгүйд орохгүй',
      () {
        final days = [
          for (final d in [
            _day('2026-11-02', att: 'PRESENT', hw: 'DONE'),
            _day('2026-11-03'),
            _day('2026-11-04', quiz: {'score': 5, 'problemCount': 10}),
            _day('2026-11-05', own: false, att: 'LATE'),
            _day('2026-11-06', future: true),
          ])
            LessonDay.fromJson(d),
        ];
        final c = monthCounts(days);
        expect(c.attendance[AttendanceStatus.present], 1);
        expect(c.attendance[AttendanceStatus.late], 1);
        expect(c.attendanceUnmarked, 2);
        expect(c.homework[HomeworkStatus.done], 1);
        expect(c.homeworkUnmarked, 1);
      },
    );

    test('тасалсан өдрийн нөхөлт: зөвхөн дараа нь, төлөвлөгөөгөөрхийг тооцохгүй', () {
      final day = LessonDay.fromJson(
        _day(
          '2026-11-02',
          att: 'EXCUSED',
          tests: [
            {'testId': 't1', 'title': 'Сорил 3', 'variant': null},
          ],
        ),
      );
      final later = MakeupHistoryItem.fromJson(_visit(date: '2026-11-03'));
      final before = MakeupHistoryItem.fromJson(_visit(id: 'v0', date: '2026-11-01'));
      final planned = MakeupHistoryItem.fromJson({
        ..._visit(id: 'v2', date: '2026-11-04', room406: false),
        'tests': [
          {'id': null, 'testId': 't1', 'title': 'Сорил 3', 'source': 'PLANNED', 'result': null},
        ],
      });
      expect(
        [
          for (final m in madeUpFor(day, [before, later, planned])) m.id,
        ],
        ['v1'],
      );
      final present = LessonDay.fromJson(_day('2026-11-02', att: 'PRESENT'));
      expect(madeUpFor(present, [later]), isEmpty);
    });

    test('сэдэв хөтөлбөр: шүүлтүүр, үйл явдлын бичвэр', () {
      final s = SyllabusResponse.fromJson(_syllabus());
      final shown = filterSyllabus(s.books, onlyMissing: false, showTodo: false);
      expect([for (final t in shown.single.chapters.single.tests) t.id], ['t1', 't2']);
      final all = filterSyllabus(s.books, onlyMissing: false, showTodo: true);
      expect(all.single.chapters.single.tests, hasLength(3));
      final missing = filterSyllabus(s.books, onlyMissing: true, showTodo: true);
      expect([for (final t in missing.single.chapters.single.tests) t.id], ['t2']);
      final t2 = s.books.single.chapters.single.tests[1];
      expect(syllabusEventText(t2.events.single), '10-р сарын 27, 12-6 — тасалсан');
      expect(syllabusSummary(s.books.single.chapters.single.tests.first), '10-р сарын 20');
      expect(
        syllabusEventText(
          SyllabusEvent.fromJson({'kind': 'PAST', 'done': true, 'date': null, 'classroomName': '12-6'}),
        ),
        '12-6 — өмнө үзсэн (огноогүй)',
      );
      expect(
        syllabusEventText(
          SyllabusEvent.fromJson({
            'kind': 'MAKEUP',
            'done': true,
            'date': '2026-11-03',
            'place': {'kind': 'ROOM_406', 'classroomId': null, 'name': '406'},
          }),
        ),
        '11-р сарын 3, 406-д нөхсөн',
      );
    });

    test('шалгалтын оноо: өнгө, хувь, бичлэг (вэбийн quizScore.ts)', () {
      expect(quizTone(4.99, 10), MarkTone.error);
      expect(quizTone(5, 10), MarkTone.warning);
      expect(quizTone(7.99, 10), MarkTone.warning);
      expect(quizTone(8, 10), MarkTone.success);
      expect(quizTone(null, 10), isNull);
      expect(quizTone(3, 0), isNull);
      expect(formatPercent(quizPercent(7.99, 10)!), '79%');
      expect(formatPercent(quizPercent(7.999, 10)!), '80%'); // зууны нэгээр бүхэлчилнэ (вэбтэй ижил)
      expect(formatScore(7.5), '7,5');
      expect(formatScore(8), '8');
      expect(formatScore(7.25), '7,25');
      expect(formatScore(7.05), '7,05');
      expect(quizDayText(8, 10), 'шалгалт 8/10, 80%');
    });

    test('буцаах дүн: Багшид мөнгөн задаргаагүй, хамааралгүй үед шалтгаан', () {
      final teacher = RefundEstimate.fromJson({
        'applicable': true,
        'refund': 120000,
        'basis': {
          'countFrom': '2026-09-01',
          'asOf': '2026-11-02',
          'webStart': '2026-10-23',
          'fullMonths': 2,
          'lessonsHeld': 20,
          'lessonsAssumed': 6,
          'lessonsPerMonth': 16,
          'current': {'start': '2026-11-01', 'end': '2026-11-30', 'lessons': 1, 'counted': 1, 'leaveDay': null},
        },
        'money': null,
      });
      expect(teacher.applicable, isTrue);
      expect(teacher.money, isNull);
      expect(teacher.current?.lessons, 1);
      final none = RefundEstimate.fromJson({'applicable': false, 'reason': 'NO_SCHEDULE'});
      expect((none.applicable, none.reason), (false, 'NO_SCHEDULE'));
    });
  });

  group('Сурагчийн хуудас (Давалгаа 6)', () {
    Future<void> openTab(WidgetTester tester, String label) async {
      await tester.ensureVisible(find.text(label));
      await tester.pumpAndSettle();
      await tester.tap(find.text(label));
      await settle(tester, frames: 20);
    }

    testWidgets('Хичээлийн түүх: сарын хуанли, тоо, тайлбар доор; хайрцаг дарахад өдрийн цонх', (tester) async {
      final http = _http();
      await pumpTeacher(
        tester,
        const StudentScreen(studentId: 's1', name: 'Б. Тэмүүжин'),
        http: http,
      );
      await openTab(tester, 'Хичээлийн түүх');
      expect(find.text('2026 оны 11-р сар'), findsOneWidget);
      final req = http.requests.lastWhere((r) => r.path == '/students/s1/lesson-days');
      expect(req.queryParameters, {'from': '2026-11-01', 'to': '2026-11-30'});
      // Хайрцаг: хичээл 2, нөхөлт 1
      expect(find.byType(StudentDayBox), findsNWidgets(3));
      expect(find.text('Нөхөлт (406, өөр анги)'), findsOneWidget);
      // Тайлбар тооны ДООР
      final legendY = tester.getTopLeft(find.text('Болоогүй')).dy;
      expect(legendY, greaterThan(tester.getTopLeft(find.text('Даалгавар').first).dy));
      // Өнөөдрийн сар — дараагийн сар руу шилжихгүй
      final next = tester.widget<IconButton>(
        find.ancestor(of: find.byTooltip('Дараагийн сар'), matching: find.byType(IconButton)),
      );
      expect(next.onPressed, isNull);

      // Тасалсан өдрийн цонх: багш, сэдэв (тестийн нэр), ирц, тэмдэглэл, нөхөлт (дараа нь 406-д)
      await tester.tap(find.byType(StudentDayBox).first);
      await tester.pumpAndSettle();
      expect(find.text('11-р сарын 2, Даваа'), findsOneWidget);
      expect(find.text('Н. Багш+'), findsWidgets);
      expect(find.text('Сорил 3'), findsWidgets);
      final sheet = find.byType(BottomSheet);
      expect(find.descendant(of: sheet, matching: find.text('Тасалсан')), findsOneWidget);
      expect(find.text('Сайн оролцсон'), findsOneWidget);
      expect(find.text('11-р сарын 3, 406-д нөхөж хийсэн'), findsOneWidget);
      await tester.tap(find.byTooltip('Хаах'));
      await tester.pumpAndSettle();

      // Өмнөх сар: шалгалтын хувь хайрцагт, цонхонд «Шалгалт 7,5/10»
      await tester.tap(find.byTooltip('Өмнөх сар'));
      await settle(tester, frames: 20);
      expect(find.text('2026 оны 10-р сар'), findsOneWidget);
      expect(find.text('75%'), findsOneWidget);
      await tester.tap(find.byType(StudentDayBox).first);
      await tester.pumpAndSettle();
      expect(find.descendant(of: find.byType(BottomSheet), matching: find.byType(QuizScoreChip)), findsOneWidget);
      expect(find.text('7,5', findRichText: true), findsNothing); // бүтэн мөр нь RichText
      expect(find.textContaining('7,5', findRichText: true), findsOneWidget);
      // Сэдэв товчлогдсон (вэбийн regroupTopicText)
      expect(find.textContaining('Квадрат тэгшитгэл 1, 2', findRichText: true), findsOneWidget);
    });

    testWidgets('Хичээлийн түүх: «Жагсаалт» — батлагдсан хичээл', (tester) async {
      final http = _http()
        ..json('GET', '/lesson-records/student/s1', [
          {
            'id': 'r1',
            'date': '2026-10-28',
            'classroomName': '12-6 (Баруун 4)',
            'startMinute': 960,
            'endMinute': 1080,
            'room': '406',
            'topic': 'Сорил 3',
            'leadTeacherName': 'Н. Багш+',
            'assistantTeacherName': null,
            'testCount': 1,
            'presentCount': 10,
            'enrolledCount': 12,
            'attendance': 'PRESENT',
          },
        ]);
      await pumpTeacher(tester, const StudentScreen(studentId: 's1'), http: http);
      await openTab(tester, 'Хичээлийн түүх');
      await tester.tap(find.text('Жагсаалт'));
      await settle(tester, frames: 20);
      expect(http.requests.last.queryParameters['limit'], 120);
      expect(find.text('Сорил 3'), findsOneWidget);
      expect(find.text('10.28'), findsOneWidget);
      expect(find.text('16:00'), findsOneWidget);
      expect(find.text('Ирсэн'), findsOneWidget);
    });

    testWidgets('Сэдэв хөтөлбөр: дутуугийн хураангуй, үзээгүйг нуух, «Зөвхөн дутуу»', (tester) async {
      await pumpTeacher(tester, const StudentScreen(studentId: 's1'), http: _http());
      await openTab(tester, 'Сэдэв хөтөлбөр');
      expect(find.text('Дутуу 1 сэдэв'), findsOneWidget);
      expect(find.text('Тоо тоолол 1  B', findRichText: true), findsOneWidget);
      expect(find.text('Тоо тоолол 3', findRichText: true), findsNothing);
      await tester.tap(find.text('Үзээгүй сэдвийг харуулах'));
      await tester.pump();
      expect(find.text('Тоо тоолол 3', findRichText: true), findsOneWidget);
      await tester.tap(find.text('Зөвхөн дутуу'));
      await tester.pump();
      expect(find.text('Тоо тоолол 1  B', findRichText: true), findsNothing);
      expect(find.text('Үзээгүй сэдвийг харуулах'), findsNothing);
      // Дутуу сэдвийг дэлгэхэд үйл явдал
      await tester.tap(find.text('Тоо тоолол 2', findRichText: true));
      await tester.pump();
      // Мөрийн товч + дэлгэсэн үйл явдал
      expect(find.text('10-р сарын 27, 12-6 — тасалсан'), findsNWidgets(2));
    });

    testWidgets('Ангийн явц: буцаах дүн (Багшид зөвхөн дүн, хичээлийн тоо), нөхөлтийн түүх', (tester) async {
      final http = _http()
        ..json('GET', '/tuition/refund-estimate/s1', {
          'applicable': true,
          'refund': 120000,
          'basis': {
            'countFrom': '2026-09-01',
            'asOf': '2026-11-02',
            'webStart': '2026-10-23',
            'fullMonths': 2,
            'lessonsHeld': 20,
            'lessonsAssumed': 6,
            'lessonsPerMonth': 16,
            'current': {'start': '2026-11-01', 'end': '2026-11-30', 'lessons': 1, 'counted': 1, 'leaveDay': null},
          },
          'money': null,
        })
        ..json('GET', '/students/s1/makeup-visits', [_visit()]);
      await pumpTeacher(tester, const StudentScreen(studentId: 's1'), http: http);
      expect(find.text('Одоо гарвал буцаах дүн'), findsOneWidget);
      expect(find.textContaining('120'), findsWidgets);
      await tester.tap(find.text('Одоо гарвал буцаах дүн'));
      await tester.pump();
      expect(find.text('Бүтэн сар'), findsOneWidget);
      expect(find.text('6 нь вэбд ирц бүртгэхээс өмнө (10.23), суусанд тооцсон'), findsOneWidget);
      // Багшид төлсөн/ногдох дүн огт байхгүй
      expect(find.text('Төлсөн'), findsNothing);
      expect(find.text('Суусан хичээлийн төлбөр'), findsNothing);

      expect(find.text('Нөхөлт, 1 удаа'), findsOneWidget);
      await tester.ensureVisible(find.text('406-д нөхөж хийсэн'));
      await tester.tap(find.text('406-д нөхөж хийсэн'));
      await tester.pumpAndSettle();
      expect(find.text('8/10'), findsOneWidget);
      await tester.ensureVisible(find.text('Хариу харах'));
      await tester.tap(find.text('Хариу харах'));
      await tester.pumpAndSettle();
      expect(find.text('ROUTE:/app/tests/t1/results/s1'), findsOneWidget);
    });

    testWidgets('буцаах дүн, нөхөлт байхгүй (404) үед юу ч гарахгүй; хуваарьгүй ангид тайлбар', (tester) async {
      await pumpTeacher(tester, const StudentScreen(studentId: 's1'), http: _http());
      expect(find.text('Одоо гарвал буцаах дүн'), findsNothing);
      expect(find.textContaining('Нөхөлт,'), findsNothing);

      final http = _http()..json('GET', '/tuition/refund-estimate/s1', {'applicable': false, 'reason': 'NO_SCHEDULE'});
      await pumpTeacher(tester, const StudentScreen(studentId: 's1'), http: http);
      expect(find.text('Ангийн хуваарь алга тул буцаах дүн бодогдохгүй'), findsOneWidget);
    });

    testWidgets('утас (320dp): хуанли, цонх халихгүй', (tester) async {
      await pumpTeacher(
        tester,
        const StudentScreen(studentId: 's1'),
        http: _http(),
        size: const Size(320, 640),
      );
      await openTab(tester, 'Хичээлийн түүх');
      expect(tester.takeException(), isNull);
      await tester.tap(find.byType(StudentDayBox).first);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(tester.getSize(find.byType(StudentDayBox).first).height, greaterThanOrEqualTo(48));
    });
  });
}

Map<String, Object?> _syllabus() => {
  'summary': {'done': 1, 'missing': 1, 'todo': 1, 'total': 3},
  'books': [
    {
      'id': 'b1',
      'code': '100V3',
      'title': '100x100 V3',
      'chapters': [
        {
          'id': 'ch1',
          'order': 1,
          'title': 'Тоо тоолол',
          'tests': [
            {'id': 't1', 'title': 'Тоо тоолол 1', 'status': 'DONE', 'doneOn': '2026-10-20', 'events': <Object?>[]},
            {
              'id': 't2',
              'title': 'Тоо тоолол 2',
              'status': 'MISSING',
              'events': [
                {
                  'kind': 'CLASS',
                  'done': false,
                  'date': '2026-10-27',
                  'classroomId': 'c1',
                  'classroomName': '12-6',
                  'attendance': 'ABSENT',
                },
              ],
            },
            {'id': 't3', 'title': 'Тоо тоолол 3', 'status': 'TODO', 'events': <Object?>[]},
          ],
        },
      ],
    },
  ],
  'other': <Object?>[],
};
