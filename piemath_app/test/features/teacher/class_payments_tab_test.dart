import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/teacher/ui/class_payments_tab.dart';
import 'package:piemath_app/features/teacher/ui/classes_screen.dart';
import 'package:piemath_app/features/teacher/ui/criteria_sheet.dart';
import 'package:piemath_app/features/teacher/ui/teacher_home_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

// Ангийн самбарын «Төлбөр» таб (эзэн 2026-11-10): зөвхөн Админ, Багш+; Багш+-д дүнгүй.

const _months = ['2026-09', '2026-10', '2026-11'];

Map<String, Object?> _row(
  String id,
  String first,
  String last, {
  List<String> states = const ['PAID', 'PAID', 'FUTURE'],
  int? owedNow,
  int owedMonths = 0,
  int overdueDays = 0,
  String? note,
}) => {
  'id': id,
  'firstName': first,
  'lastName': last,
  'code': 'B2712$id',
  'phone': null,
  'classroom': {'id': 'c1', 'name': '12Б'},
  'plan': {'kind': 'MONTHLY', 'guessed': false, 'settled': false},
  'blocks': [
    for (final (i, s) in states.indexed)
      {
        'month': _months[i],
        'state': s,
        'due': null,
        'paid': null,
        'dueOn': '${_months[i]}-10',
        'paidOn': null,
        'lateDays': 0,
      },
  ],
  'owedNow': owedNow,
  'owedMonths': owedMonths,
  'overdueDays': overdueDays,
  'credit': 0,
  'remaining': null,
  'nextDue': {'month': '2026-11', 'amount': null, 'dueOn': '2026-11-10'},
  'notes': {
    'count': note == null ? 0 : 1,
    'last': note == null ? null : {'body': note, 'authorName': 'Б. Сараа', 'at': '2026-11-01T02:00:00.000Z'},
  },
  'promise': null,
};

Map<String, Object?> _board({bool hidden = true}) => {
  'year': {'id': 'y', 'months': _months, 'firstHalfEnd': '2026-12', 'secondHalfDue': '2027-01'},
  'today': testDate,
  'month': '2026-11',
  'classroom': {'id': 'c1', 'name': '12Б'},
  'total': 2,
  'rows': [
    _row(
      's1',
      'Тэмүүжин',
      'Бат',
      states: ['PAID', 'OWED', 'FUTURE'],
      owedMonths: 1,
      overdueDays: 23,
      note: 'Сарын эцэст өгнө',
    ),
    _row('s2', 'Анужин', 'Дорж'),
  ],
  'amountsHidden': hidden,
};

FakeHttp _http() => FakeHttp()
  ..json('GET', '/class-dashboard/classes/c1', dashDetail(payment: {'PAID': 1, 'PARTIAL': 0, 'PENDING': 0, 'NONE': 1}))
  ..json('GET', '/payments/ledger/board', _board());

void main() {
  testWidgets('Багш+: «Төлбөр» таб — хүүхэд бүр нэг мөр, өртэй мөр улаан, дүнгүй', (tester) async {
    final http = _http();
    await pumpTeacher(
      tester,
      const ClassDetailScreen(classId: 'c1'),
      http: http,
      session: teacherSession(role: 'TEACHER_PLUS'),
    );
    await tester.tap(find.widgetWithText(Tab, 'Төлбөр'));
    await settle(tester, frames: 20);
    expect(http.requests.last.queryParameters, {'classroomId': 'c1'});
    expect(find.text('11-р сар'), findsOneWidget);
    expect(find.text('1 сурагч'), findsOneWidget); // өртэй
    expect(find.text('Өртэй'), findsWidgets);
    expect(find.text('23 хоног хэтэрсэн'), findsOneWidget);
    expect(find.text('Сарын эцэст өгнө'), findsOneWidget);
    expect(find.textContaining('₮'), findsNothing);
    final owed = tester.widget<Material>(
      find.ancestor(of: find.byKey(const ValueKey('ledger-row-s1')), matching: find.byType(Material)).first,
    );
    final ok = tester.widget<Material>(
      find.ancestor(of: find.byKey(const ValueKey('ledger-row-s2')), matching: find.byType(Material)).first,
    );
    expect(owed.color, isNot(ok.color));
    await tester.tap(find.byKey(const ValueKey('ledger-filter-owed')));
    await settle(tester);
    expect(find.byKey(const ValueKey('ledger-row-s2')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('ledger-row-s1')));
    await settle(tester);
    expect(find.text('ROUTE:/app/payments/student/s1'), findsOneWidget);
  });

  testWidgets('Багш: «Төлбөр» таб харагдахгүй, ledger татахгүй', (tester) async {
    final http = _http();
    await pumpTeacher(tester, const ClassDetailScreen(classId: 'c1'), http: http);
    expect(find.widgetWithText(Tab, 'Төлбөр'), findsNothing);
    expect(find.widgetWithText(Tab, 'Код'), findsOneWidget);
    expect(http.count('GET', '/payments/ledger/board'), 0);
    expect(find.byKey(const ValueKey('overview-payments')), findsNothing);
  });

  testWidgets('Тойм: «Сар бүрээр» → «Төлбөр» таб', (tester) async {
    await pumpTeacher(
      tester,
      const ClassDetailScreen(classId: 'c1'),
      http: _http(),
      session: teacherSession(role: 'ADMIN'),
    );
    await scrollTo(tester, find.byKey(const ValueKey('overview-payments')));
    await tester.tap(find.byKey(const ValueKey('overview-payments')));
    await settle(tester, frames: 30);
    expect(find.text('11-р сар'), findsOneWidget);
  });

  test('блокийн шошго: дүн нуусан бол дүнгүй', () {
    const b = LedgerBlock(month: '2026-10', state: BlockState.owed);
    expect(blockLabel(b), '10-р сар: Өртэй');
    const p = LedgerBlock(month: '2026-10', state: BlockState.paid, paid: 350000);
    expect(blockLabel(p), '10-р сар: Төлсөн 350,000₮');
    expect(millions(84392324), '84.4 сая');
    expect(shortMnt(350000), '350к');
    expect(shortMnt(1250000), '1.25с');
  });

  testWidgets('эрсдэлийн шалгуур: сүүлийн шалгалтын доод хувь, 0 = «Тооцохгүй»', (tester) async {
    Map<String, Object?> crit(int q) => {
      'windowDays': 30,
      'minAttendance': 80,
      'maxAbsences': 3,
      'maxLates': 4,
      'minHomework': 60,
      'missingStreak': 2,
      'minQuiz': q,
    };
    final http = FakeHttp()
      ..json('GET', '/attendance/classrooms/c1/criteria', {
        'criteria': crit(5),
        'defaults': crit(50),
        'isDefault': false,
      })
      ..json('PUT', '/attendance/classrooms/c1/criteria', {'criteria': crit(0), 'defaults': crit(50)});
    await pumpTeacher(
      tester,
      Builder(
        builder: (context) => TextButton(
          onPressed: () => CriteriaSheet.open(context, classId: 'c1'),
          child: const Text('нээх'),
        ),
      ),
      http: http,
    );
    await tester.tap(find.text('нээх'));
    await settle(tester, frames: 20);
    expect(find.text('Сүүлийн шалгалтын доод хувь'), findsOneWidget);
    expect(find.text('5%'), findsOneWidget);
    await tester.tap(find.byTooltip('Сүүлийн шалгалтын доод хувь, багасгах'));
    await tester.pump();
    expect(find.text('Тооцохгүй'), findsOneWidget);
    expect(find.byTooltip('Сүүлийн шалгалтын доод хувь, багасгах'), findsOneWidget);
    await tester.tap(find.text('Хадгалах'));
    await settle(tester, frames: 20);
    final body = (http.requests.lastWhere((r) => r.method == 'PUT').data as Map).cast<String, Object?>();
    expect(body['minQuiz'], 0);
  });

  testWidgets('багшийн самбар: «406 нөхөх өрөө» ӨДӨР БҮР харагдана', (tester) async {
    final http = FakeHttp()..json('GET', '/attendance/board', {'date': testDate, 'classes': <Object?>[]});
    await pumpTeacher(tester, const TeacherHomeScreen(), http: http);
    await scrollTo(tester, find.byKey(const ValueKey('room406-link')));
    expect(find.text('Хуваарьгүй, өдөр бүр'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('room406-link')));
    await settle(tester);
    expect(find.text('ROUTE:/app/teacher/room406?date=$testDate'), findsOneWidget);
  });
}
