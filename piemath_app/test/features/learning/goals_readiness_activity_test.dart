import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/learning/data/goal_models.dart';
import 'package:piemath_app/features/learning/data/readiness_models.dart';
import 'package:piemath_app/features/learning/ui/activity_screen.dart';
import 'package:piemath_app/features/learning/ui/goals_screen.dart';
import 'package:piemath_app/features/learning/ui/readiness_screen.dart';

import '../../helpers/fake_http.dart';
import 'learning_test_app.dart';

Map<String, Object?> goal(String id, String title, {String status = 'PLANNED', String? date, String? subject, String? desc}) => {
  'id': id,
  'title': title,
  'description': desc,
  'targetDate': date,
  'status': status,
  'subject': subject,
};

Map<String, Object?> topic(String code, String title, int? mastery, {int attempts = 4, String trend = 'FLAT'}) => {
  'topic': code,
  'title': title,
  'mastery': mastery,
  'measured': mastery != null,
  'weight': 0.05,
  'attempts': attempts,
  'effectiveAttempts': 3.5,
  'trend': trend,
};

Map<String, Object?> readiness({int points = 20}) => {
  'index': 62,
  'low': 48,
  'high': 76,
  'dataPoints': points,
  'effectiveDataPoints': 12.5,
  'coverage': 40,
  'topics': [
    topic('ALG', 'Алгебрийн хувиргалт', 80, trend: 'UP'),
    topic('DERIV', 'Уламжлал', 35, trend: 'DOWN'),
    topic('TRIG', 'Тригонометр', null, attempts: 0),
  ],
  'nextBestTopics': [topic('DERIV', 'Уламжлал', 35, trend: 'DOWN')],
  'weeklyHistory': [
    for (var i = 0; i < 8; i++) {'week': '2026-10-${10 + i}', 'index': i < 3 ? 0 : 50 + i, 'coverage': i < 3 ? 0 : 30},
  ],
};

void main() {
  test('goalProgress: цуцалсныг тоолохгүй, хугацаа хэтэрсэн', () {
    final goals = [
      Goal.fromJson(goal('a', 'A', status: 'DONE')),
      Goal.fromJson(goal('b', 'B', date: '2026-11-01T16:00:00.000Z')),
      Goal.fromJson(goal('c', 'C', status: 'CANCELLED', date: '2026-11-01T16:00:00.000Z')),
      Goal.fromJson(goal('d', 'D', date: '2026-12-01T16:00:00.000Z')),
    ];
    final p = goalProgress(goals, UbDateTime(2026, 11, 10));
    expect((p.done, p.total, p.percent, p.overdue), (1, 3, 33, 1));
  });

  group('зорилго', () {
    testWidgets('идэвхтэй ба дууссан зорилго тусдаа, огноо, төлөв', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/goals', [
          goal('g1', 'Уламжлалыг дуусгах', status: 'IN_PROGRESS', date: '2026-11-19T16:00:00.000Z', subject: 'MATH'),
          goal('g2', 'Тригонометр давтах'),
          goal('g3', 'Логарифм', status: 'DONE'),
        ]);
      await pumpLearning(tester, http, location: '/app/goals');
      expect(find.byType(GoalsScreen), findsOneWidget);
      expect(find.text('Уламжлалыг дуусгах'), findsOneWidget);
      expect(find.textContaining('2026 оны 11-р сарын 20'), findsOneWidget);
      expect(find.text('Дууссан'), findsOneWidget);
      expect(find.text('Логарифм'), findsOneWidget);
      expect(find.byTooltip('Биелсэн гэж тэмдэглэх'), findsNWidgets(2));
    });

    testWidgets('хоосон: нэмэх товч', (tester) async {
      final http = FakeHttp()..json('GET', '/goals', <Object?>[]);
      await pumpLearning(tester, http, location: '/app/goals');
      expect(find.text('Зорилго хараахан алга'), findsOneWidget);
    });

    testWidgets('алдаа: дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..error('GET', '/goals', 500)
        ..json('GET', '/goals', [goal('g1', 'Эхний зорилго')]);
      await pumpLearning(tester, http, location: '/app/goals');
      expect(find.text('Зорилго ачаалж чадсангүй'), findsOneWidget);
      await tester.tap(find.text('Дахин оролдох'));
      await settle(tester);
      expect(find.text('Эхний зорилго'), findsOneWidget);
    });

    testWidgets('шинэ зорилго нэмэх: хоосон гарчиг болохгүй, хадгалаад жагсаалт шинэчлэгдэнэ', (tester) async {
      Map<String, Object?>? body;
      final http = FakeHttp()
        ..json('GET', '/goals', <Object?>[])
        ..json('GET', '/goals', [goal('g1', 'Нэмэгдсэн зорилго')])
        ..on('POST', '/goals', (req) {
          body = (req.data as Map).cast<String, Object?>();
          return FakeResponse(goal('g1', 'Нэмэгдсэн зорилго'));
        });
      await pumpLearning(tester, http, location: '/app/goals');
      await tester.tap(find.text('Зорилго нэмэх').last);
      await settle(tester);
      await tester.tap(find.text('Хадгалах'));
      await settle(tester);
      expect(find.text('Зорилгоо бичнэ үү'), findsOneWidget);
      expect(http.count('POST', '/goals'), 0);
      await tester.enterText(find.widgetWithText(TextField, 'Зорилго'), '  Нэмэгдсэн зорилго ');
      await tester.tap(find.widgetWithText(FilterChip, 'Математик'));
      await tester.pump();
      await tester.tap(find.text('Хадгалах'));
      await settle(tester);
      expect(body, {'title': 'Нэмэгдсэн зорилго', 'status': 'PLANNED', 'subject': 'MATH'});
      expect(find.text('Нэмэгдсэн зорилго'), findsOneWidget);
      expect(find.text('Шинэ зорилго'), findsNothing);
    });

    testWidgets('биелсэн гэж тэмдэглэх: зөвхөн төлөв илгээнэ', (tester) async {
      Map<String, Object?>? body;
      final http = FakeHttp()
        ..json('GET', '/goals', [goal('g1', 'Уламжлал')])
        ..json('GET', '/goals', [goal('g1', 'Уламжлал', status: 'DONE')])
        ..on('PATCH', '/goals/g1', (req) {
          body = (req.data as Map).cast<String, Object?>();
          return FakeResponse(goal('g1', 'Уламжлал', status: 'DONE'));
        });
      await pumpLearning(tester, http, location: '/app/goals');
      await tester.tap(find.byTooltip('Биелсэн гэж тэмдэглэх'));
      await settle(tester);
      expect(body, {'status': 'DONE'});
      expect(find.byTooltip('Биелсэн гэж тэмдэглэх'), findsNothing);
      expect(find.text('Дууссан'), findsOneWidget);
    });

    testWidgets('засах: хугацааг арилгавал targetDate null, сервер алдаа бол хуудас хэвээр', (tester) async {
      Map<String, Object?>? body;
      final http = FakeHttp()
        ..json('GET', '/goals', [goal('g1', 'Уламжлал', date: '2026-11-19T16:00:00.000Z')])
        ..on('PATCH', '/goals/g1', (req) {
          body = (req.data as Map).cast<String, Object?>();
          return const FakeResponse({'statusCode': 500}, status: 500);
        });
      await pumpLearning(tester, http, location: '/app/goals');
      await tester.tap(find.text('Уламжлал'));
      await settle(tester);
      expect(find.text('Зорилго засах'), findsOneWidget);
      await tester.tap(find.byTooltip('Хугацааг арилгах'));
      await tester.pump();
      await tester.tap(find.widgetWithText(FilterChip, 'Хийгдэж байгаа'));
      await tester.pump();
      await tester.tap(find.text('Хадгалах'));
      await settle(tester);
      expect(body!['targetDate'], isNull);
      expect(body!.containsKey('targetDate'), isTrue);
      expect(body!['status'], 'IN_PROGRESS');
      expect(find.text('Зорилго засах'), findsOneWidget);
      expect(find.textContaining('Түр саатал'), findsOneWidget);
    });

    test('sortGoals: ойрхон хугацаа эхэнд, хугацаагүй сүүлд', () {
      const a = Goal(id: 'a', title: 'a', status: GoalStatus.planned);
      final b = Goal(id: 'b', title: 'b', status: GoalStatus.planned, targetDate: UbDateTime(2026, 12, 1));
      final c = Goal(id: 'c', title: 'c', status: GoalStatus.planned, targetDate: UbDateTime(2026, 11, 1));
      expect(sortGoals([a, b, c]).map((g) => g.id), ['c', 'b', 'a']);
    });

    test('Goal.fromJson: хөрвүүлэлт ба үл мэдэгдэх утга', () {
      final g = Goal.fromJson(const {'id': 'x', 'title': 't', 'status': '???', 'subject': 'MATH', 'targetDate': '2026-11-19T16:00:00.000Z'});
      expect(g.status, GoalStatus.planned);
      expect(g.subject, GoalSubject.math);
      expect(g.targetDate!.dateKey, '2026-11-20');
    });
  });

  group('бэлэн байдал', () {
    testWidgets('индекс, муж, сэдэв, дараагийн алхам; албан оноо биш гэж хэлнэ', (tester) async {
      final http = FakeHttp()..json('GET', '/readiness/my', readiness());
      await pumpLearning(tester, http, location: '/app/readiness');
      expect(find.byType(ReadinessScreen), findsOneWidget);
      expect(find.text('~62'), findsOneWidget);
      expect(find.text('баримжаа муж 48-76'), findsOneWidget);
      expect(find.textContaining('албан оноо биш'), findsOneWidget);
      expect(find.text('Алгебрийн хувиргалт'), findsOneWidget);
      expect(find.text('80%'), findsOneWidget);
      // Хэмжигдээгүй сэдэв жагсаалтад үгүй, тоо нь тайлбарт.
      expect(find.text('Тригонометр'), findsNothing);
      await tester.scrollUntilVisible(find.text('Дараагийн алхам'), 300, scrollable: find.byType(Scrollable).first);
      expect(find.text('Дасгал'), findsOneWidget);
    });

    testWidgets('«Миний зорилго»: хадгалсан утга, 0-100 шалгалт, PATCH', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/readiness/my', readiness())
        ..json('GET', '/goals', [goal('g9', 'Бэлэн байдлын зорилго: 80')])
        ..json('PATCH', '/goals/g9', goal('g9', 'Бэлэн байдлын зорилго: 85'));
      await pumpLearning(tester, http, location: '/app/readiness');
      expect(find.textContaining('ойролцоогоор 13 тусдаа бодлогын нотолгоо'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Зорилго хадгалах'), 300);
      expect(find.widgetWithText(TextField, '80'), findsOneWidget);
      await tester.enterText(find.byType(TextField), '120');
      await tester.tap(find.text('Зорилго хадгалах'));
      await settle(tester);
      expect(find.text('Бүхэл тоогоор 0-100 хооронд оруулна уу'), findsOneWidget);
      expect(http.count('PATCH', '/goals/g9'), 0);
      await tester.enterText(find.byType(TextField), '85');
      await tester.tap(find.text('Зорилго хадгалах'));
      await settle(tester);
      final patch = http.requests.firstWhere((r) => r.method == 'PATCH');
      expect((patch.data as Map)['title'], 'Бэлэн байдлын зорилго: 85');
    });

    testWidgets('сул сэдэв эхэнд (эзэмшил өсөхөөр)', (tester) async {
      final http = FakeHttp()..json('GET', '/readiness/my', readiness());
      await pumpLearning(tester, http, location: '/app/readiness');
      final weak = tester.getTopLeft(find.text('Уламжлал').first).dy;
      final strong = tester.getTopLeft(find.text('Алгебрийн хувиргалт')).dy;
      expect(weak < strong, isTrue);
    });

    testWidgets('оролдлого байхгүй бол тайлбар ба дасгал руу товч', (tester) async {
      final http = FakeHttp()..json('GET', '/readiness/my', readiness(points: 0)..['coverage'] = 0);
      await pumpLearning(tester, http, location: '/app/readiness');
      expect(find.text('Бэлэн байдлыг тооцох оролдлого алга'), findsOneWidget);
      expect(find.textContaining('~'), findsNothing);
      await tester.tap(find.text('Дасгал эхлэх'));
      await settle(tester);
    });

    testWidgets('алдаа: дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..error('GET', '/readiness/my', 500)
        ..json('GET', '/readiness/my', readiness());
      await pumpLearning(tester, http, location: '/app/readiness');
      expect(find.text('Бэлэн байдал ачаалж чадсангүй'), findsOneWidget);
      await tester.tap(find.text('Дахин оролдох'));
      await settle(tester);
      expect(find.text('~62'), findsOneWidget);
    });

    test('Readiness.fromJson: хэт утгыг 0-100 болгоно, хоосон JSON шидэхгүй', () {
      final r = Readiness.fromJson(const {'index': 250, 'low': -5, 'high': 300, 'topics': 'x'});
      expect(r.index, 100);
      expect(r.low, 0);
      expect(r.high, 100);
      expect(r.hasEvidence, isFalse);
      expect(Readiness.fromJson(null).topics, isEmpty);
    });
  });

  group('идэвх', () {
    final today = UbDateTime.now().startOfDay;

    Map<String, Object?> year(int y, {Map<String, int> counts = const {}}) {
      final days = <Map<String, Object?>>[];
      for (var d = UbDateTime(y); d.year == y; d = d.addDays(1)) {
        final n = counts[d.dateKey] ?? 0;
        days.add({'date': d.dateKey, 'count': n, 'level': n == 0 ? 0 : (n < 4 ? 1 : 2), 'isHoliday': false, 'isClassDay': true});
      }
      return {'year': y, 'totalActiveDays': counts.length, 'days': days};
    }

    testWidgets('сарын хуанли, тоо, дараалал (streak) харуулахгүй', (tester) async {
      final http = FakeHttp()..json('GET', '/activity/me', year(today.year, counts: {today.dateKey: 5}));
      await pumpLearning(tester, http, location: '/app/activity');
      expect(find.byType(ActivityScreen), findsOneWidget);
      expect(find.textContaining('нийт 5 бодлого бодсон'), findsOneWidget);
      expect(find.textContaining('5 бодлого'), findsWidgets);
      expect(find.textContaining('дараалал', findRichText: true), findsNothing);
      expect(find.textContaining('streak', findRichText: true), findsNothing);
      expect(http.requests.last.queryParameters['year'], today.year);
      // Одоогийн сарын дараа явахгүй.
      await tester.tap(find.byTooltip('Дараагийн сар'), warnIfMissed: false);
      await settle(tester);
      expect(http.count('GET', '/activity/me'), 1);
    });

    testWidgets('өмнөх сар руу шилжих', (tester) async {
      final prev = today.month == 1 ? UbDateTime(today.year - 1, 12) : UbDateTime(today.year, today.month - 1);
      final http = FakeHttp()
        ..on('GET', '/activity/me', (req) {
          final y = req.queryParameters['year'] as int;
          return FakeResponse(year(y, counts: {UbDateTime(prev.year, prev.month, 3).dateKey: 2}));
        });
      await pumpLearning(tester, http, location: '/app/activity');
      expect(find.textContaining('Энэ сард бодлого бодсон тэмдэглэл алга'), findsOneWidget);
      await tester.tap(find.byTooltip('Өмнөх сар'));
      await settle(tester);
      expect(find.textContaining('нийт 2 бодлого бодсон'), findsOneWidget);
    });

    testWidgets('алдаа: дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..error('GET', '/activity/me', 500)
        ..json('GET', '/activity/me', year(today.year));
      await pumpLearning(tester, http, location: '/app/activity');
      expect(find.text('Идэвх ачаалж чадсангүй'), findsOneWidget);
      await tester.tap(find.text('Дахин оролдох'));
      await settle(tester);
      expect(find.textContaining('Энэ сард'), findsOneWidget);
    });
  });
}
