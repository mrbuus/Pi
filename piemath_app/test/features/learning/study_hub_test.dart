import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/learning/application/study_hub_providers.dart';
import 'package:piemath_app/features/learning/ui/study_hub_parts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../helpers/fake_http.dart';
import 'learning_test_app.dart';

/// Лхагва, 2026-11-04 10:00 (УБ).
final _now = UbDateTime(2026, 11, 4, 10);

Map<String, Object?> _hwDay(String date, {bool upcoming = false, String? topic}) => {
  'date': date,
  'classroomId': 'c1',
  'classroomName': '12А',
  'deadlineAt': null,
  'items': <Object?>[],
  'photo': null,
  'mark': null,
  'markComment': null,
  'upcoming': upcoming,
  'topic': topic,
};

Map<String, Object?> _topic(String code, String title, int mastery, {String? chapterId}) => {
  'topic': code,
  'title': title,
  'mastery': mastery,
  'measured': true,
  'attempts': 6,
  'trend': 'FLAT',
  'chapterId': ?chapterId,
};

/// Серверийн 7 хоногийн зорилго (PUT-оор өөрчлөгдөнө).
class _GoalServer {
  _GoalServer([this.days]);

  int? days;
  final puts = <Object?>[];

  void register(FakeHttp http) {
    http
      ..on('GET', '/study/weekly-goal', (_) => FakeResponse({'daysPerWeek': days, 'updatedAt': null}))
      ..on('PUT', '/study/weekly-goal', (r) {
        final v = (r.data as Map)['daysPerWeek'];
        puts.add(v);
        days = v as int?;
        return FakeResponse({'daysPerWeek': days, 'updatedAt': '2026-11-04T02:00:00.000Z'});
      });
  }
}

Map<String, Object?> _due(String id, String problemId) => {
  'id': id,
  'problem': {
    'id': problemId,
    'statementText': r'$2x=6$',
    'choices': [r'$2$', r'$3$'],
    'choiceMode': 'TEXT',
    'format': 'CHOICE',
    'imageKey': null,
  },
  'dueAt': '2026-11-03T16:00:00.000Z',
  'intervalDays': 1,
  'reps': 0,
  'lapses': 0,
  'lastResult': 'WRONG',
  'source': 'TEST',
  'formulas': <Object?>[],
};

FakeHttp _http({bool withData = true, Duration delay = Duration.zero, List<Object?>? topics}) => FakeHttp()
  ..on(
    'GET',
    '/mistakes/today',
    (_) => FakeResponse(withData ? [mistakeJson(), mistakeJson(id: 'm2')] : <Object?>[], delay: delay),
  )
  ..json('GET', '/formulas/review/due', {'dueCount': withData ? 3 : 0, 'newCount': 0, 'cards': <Object?>[]})
  ..json('GET', '/homework/my', {
    'days': withData
        ? [_hwDay('2026-11-03', topic: 'Илтгэгч функц'), _hwDay('2026-11-06', upcoming: true, topic: 'Логарифм')]
        : <Object?>[],
  })
  ..json('GET', '/readiness/my', {
    'index': 55,
    'low': 45,
    'high': 65,
    'dataPoints': withData ? 30 : 0,
    'coverage': withData ? 60 : 0,
    'topics':
        topics ??
        (withData
            ? [
                _topic('a', 'Логарифм', 35),
                _topic('b', 'Вектор', 72),
                _topic('c', 'Функц', 55),
                _topic('d', 'Тригонометр', 95),
              ]
            : <Object?>[]),
  })
  ..json('GET', '/exam-results/my', {
    'exams': withData
        ? [
            {
              'id': 'e1',
              'title': 'Бүлгийн шалгалт 3',
              'type': 'CHAPTER_EXAM',
              'upcoming': true,
              'assignedAt': '2026-11-07T02:00:00.000Z',
            },
          ]
        : <Object?>[],
  })
  ..json('GET', '/activity/me', {
    'year': 2026,
    'totalActiveDays': 1,
    'days': [
      {'date': '2026-11-03', 'count': 5, 'level': 2, 'isHoliday': false},
    ],
  })
  ..json('GET', '/activity/streak', {'currentStreak': 2, 'longestStreak': 5, 'totalActiveDays': 9});

Future<void> _pumpHub(WidgetTester tester, FakeHttp http) async {
  await pumpLearning(tester, http, location: '/app/study', overrides: [studyNowProvider.overrideWithValue(_now)]);
}

Finder get _scrollable => find.byType(Scrollable).first;

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('төлөвлөгөө: гэрийн даалгавар зүүсэн, эхэнд; дараа нь томьёо, алдаа, шалгалт, сэдэв', (tester) async {
    await _pumpHub(tester, _http());
    expect(find.text('Өнөөдрийн төлөвлөгөө'), findsOneWidget);
    expect(find.text('30 мин орчим'), findsOneWidget);
    final order = [
      'Гэрийн даалгавар',
      'Томьёо давтах',
      'Алдаагаа дахин бодох',
      'Шалгалтын өмнөх давтлага',
      'Сүүлийн хичээлийн сэдвээр',
    ];
    final ys = [for (final t in order) tester.getTopLeft(find.text(t)).dy];
    expect([...ys]..sort(), ys, reason: 'дээрээс доош дарааллаар');
    expect(find.text('11-р сарын 3, 12А'), findsOneWidget);
    expect(find.byIcon(AppIcons.pin), findsOneWidget);
    expect(find.text('Илтгэгч функц'), findsOneWidget);
  });

  testWidgets('тань дээр ажиллах: хамгийн сул 3 сэдэв 4 түвшингээр, давтах тоолуур, ангитай холбоо', (tester) async {
    await _pumpHub(tester, _http());
    await tester.scrollUntilVisible(find.text('Тань дээр ажиллах'), 200, scrollable: _scrollable);
    for (final t in ['Логарифм', 'Функц', 'Вектор']) {
      expect(find.text(t), findsWidgets);
    }
    expect(find.text('Тригонометр'), findsNothing, reason: 'зөвхөн хамгийн сул 3');
    expect(find.text('Оролдсон'), findsWidgets);
    expect(find.text('Танил'), findsWidgets);
    expect(find.text('Чадвартай'), findsWidgets);
    expect(find.byType(LevelSteps), findsNWidgets(3));
    expect(find.textContaining('%'), findsNothing, reason: 'оноо биш, түвшин');

    await tester.scrollUntilVisible(find.text('Давтах'), 200, scrollable: _scrollable);
    expect(find.text('5'), findsWidgets); // 2 алдаа + 3 томьёо
    expect(find.text('Алдаа 2'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('Дараагийн хичээл'), 200, scrollable: _scrollable);
    expect(find.text('11-р сарын 6, Баасан'), findsOneWidget);
    expect(find.text('Ойрын шалгалт'), findsOneWidget);
    await settle(tester); // гүйлгэхэд хожуу барьсан картуудын хүсэлт дуустал
  });

  testWidgets('7 хоногийн зорилго: сурагч өөрөө тавьж, хувийн явц харагдана, серверт хадгална', (tester) async {
    final http = _http();
    final goal = _GoalServer()..register(http);
    await _pumpHub(tester, http);
    await tester.scrollUntilVisible(find.text('7 хоногийн зорилго'), 200, scrollable: _scrollable);
    await tester.tap(find.text('7 хоногийн зорилго'));
    await settle(tester);
    expect(find.text('7 хоногт хэдэн өдөр суралцах вэ'), findsOneWidget);
    final chip = tester.getSize(find.widgetWithText(ChoiceChip, '4 өдөр'));
    expect(chip.height, greaterThanOrEqualTo(48));
    await tester.tap(find.text('4 өдөр'));
    await settle(tester);
    expect(find.text('Энэ 7 хоногт 1 / 4 өдөр'), findsOneWidget);
    expect(find.text('Дахиад 3 өдөр'), findsOneWidget);
    expect(goal.puts, [4], reason: 'серверт хадгална');
    expect((await SharedPreferences.getInstance()).getInt('${WeeklyGoalController.prefix}guest'), isNull);
  });

  testWidgets('утсан дээрх хуучин зорилгыг серверт НЭГ удаа шилжүүлж, утсанд арилгана', (tester) async {
    SharedPreferences.setMockInitialValues({'${WeeklyGoalController.prefix}guest': 1});
    final http = _http();
    final goal = _GoalServer()..register(http);
    await _pumpHub(tester, http);
    await tester.scrollUntilVisible(find.text('Энэ 7 хоногт 1 / 1 өдөр'), 200, scrollable: _scrollable);
    expect(find.text('Энэ 7 хоногийн зорилго биелсэн. Бусад өдөр амарч болно'), findsOneWidget);
    expect(goal.puts, [1]);
    expect((await SharedPreferences.getInstance()).getInt('${WeeklyGoalController.prefix}guest'), isNull);
  });

  testWidgets('серверт зорилго байвал түүнийг, утасны хуучин утгыг илгээхгүй', (tester) async {
    SharedPreferences.setMockInitialValues({'${WeeklyGoalController.prefix}guest': 6});
    final http = _http();
    final goal = _GoalServer(2)..register(http);
    await _pumpHub(tester, http);
    await tester.scrollUntilVisible(find.text('Энэ 7 хоногт 1 / 2 өдөр'), 200, scrollable: _scrollable);
    expect(goal.puts, isEmpty);
    expect((await SharedPreferences.getInstance()).getInt('${WeeklyGoalController.prefix}guest'), isNull);
  });

  testWidgets('амралтын өдрийн мэдээлэл тайван (улаан, буруутгал үгүй)', (tester) async {
    final http = _http()
      ..json('GET', '/activity/streak', {
        'currentStreak': 1,
        'longestStreak': 5,
        'totalActiveDays': 9,
        'flexStreak': 3,
        'restDayUsedThisWeek': true,
        'activeDaysThisWeek': 1,
      });
    _GoalServer(3).register(http);
    await _pumpHub(tester, http);
    const note = 'Энэ 7 хоногийн амралтын өдрөө ашигласан';
    await tester.scrollUntilVisible(find.text(note), 200, scrollable: _scrollable);
    final text = tester.widget<Text>(find.text(note));
    final context = tester.element(find.text(note));
    expect(text.style?.color, isNot(Theme.of(context).colorScheme.error));
    for (final banned in ['тасарсан', 'алдсан', 'алдлаа']) {
      expect(find.textContaining(banned), findsNothing, reason: banned);
    }
  });

  testWidgets('давтах: хугацаа нь болсон бодлого тоолуур, төлөвлөгөөнд (алдаатай давхардсаныг нэг л удаа)', (
    tester,
  ) async {
    final http = _http()
      ..json('GET', '/review/problems/due', {
        'total': 3,
        'items': [_due('r1', 'p-m1'), _due('r2', 'px'), _due('r3', 'py')],
      });
    await _pumpHub(tester, http);
    expect(find.text('Хугацаа нь болсон бодлого'), findsOneWidget);
    // 2 алдаа + давхардаагүй 2 бодлого (p-m1 нь өнөөдрийн алдаатай давхацна)
    expect(find.text('2 бодлого'), findsNWidgets(2));
    await tester.scrollUntilVisible(find.text('Давтах'), 200, scrollable: _scrollable);
    expect(find.text('7'), findsWidgets); // 2 бодлого + 2 алдаа + 3 томьёо
    expect(find.text('Бодлого 2'), findsOneWidget);
    await tester.tap(find.text('Давтах'));
    await settle(tester);
    expect(find.text('Бодлого давтах'), findsOneWidget);
  });

  testWidgets('сул сэдэв бүлэгтэй бол тэр сэдвээр дасгал, сүүлийн хичээлийн сэдэв бүлэгтэй таарвал түүгээр', (
    tester,
  ) async {
    final http =
        _http(
            topics: [
              _topic('a', 'Логарифм', 35, chapterId: 'ch-log'),
              _topic('b', 'Вектор', 72),
            ],
          )
          ..json('GET', '/recommend/chapter-match', {
            'chapterId': 'ch-exp',
            'chapterIds': ['ch-exp'],
            'title': 'Илтгэгч функц',
          })
          ..json('GET', '/recommend/next', [
            {'problemId': 'pp1', 'reason': 'WEAK_TOPIC', 'explanation': 'Сэдэв'},
          ]);
    final router = await pumpLearning(
      tester,
      http,
      location: '/app/study',
      overrides: [studyNowProvider.overrideWithValue(_now)],
    );
    await tester.tap(find.text('Сүүлийн хичээлийн сэдвээр'));
    await settle(tester);
    expect(router.state.uri.queryParameters['chapter'], 'ch-exp');
    expect(find.text('Илтгэгч функц'), findsWidgets, reason: 'гарчиг нь сэдэв');
    final match = http.requests.firstWhere((r) => r.path == '/recommend/chapter-match');
    expect(match.queryParameters['topic'], 'Илтгэгч функц');
    expect(http.requests.lastWhere((r) => r.path == '/recommend/next').queryParameters['chapterId'], 'ch-exp');

    router.go('/app/study');
    await settle(tester);
    final weak = find.descendant(of: find.byType(WeakTopicsCard), matching: find.text('Логарифм'));
    await tester.scrollUntilVisible(weak, 200, scrollable: _scrollable);
    final row = tester.getSize(find.ancestor(of: weak, matching: find.byType(InkWell)).first);
    expect(row.height, greaterThanOrEqualTo(48));
    await tester.tap(weak);
    await settle(tester);
    expect(router.state.uri.queryParameters['chapter'], 'ch-log');
    expect(http.requests.lastWhere((r) => r.path == '/recommend/next').queryParameters['chapterId'], 'ch-log');
  });

  testWidgets('өгөгдөлгүй: дасгалаар эхэлнэ, сул сэдэв тайлбартай, эрэмбэ/буруутгал үгүй', (tester) async {
    await _pumpHub(tester, _http(withData: false));
    expect(find.text('Танд тохирсон бодлого'), findsOneWidget);
    expect(find.byIcon(AppIcons.pin), findsNothing);
    await tester.scrollUntilVisible(find.text('Тань дээр ажиллах'), 200, scrollable: _scrollable);
    expect(find.text('Дасгал, тест хийх тусам энд сэдэв бүрийн түвшин гарна'), findsOneWidget);
    expect(find.text('Өнөөдөр давтах зүйл алга'), findsOneWidget);
    expect(find.text('Дараагийн хичээл'), findsNothing);
    for (final banned in ['байр', 'эрэмбэ', 'streak', 'алдлаа', 'санаж']) {
      expect(find.textContaining(banned), findsNothing, reason: banned);
    }
  });

  testWidgets('ачаалж байхад статик skeleton (лугшилтгүй)', (tester) async {
    await _pumpHub(tester, _http(delay: const Duration(seconds: 5)));
    expect(find.byType(SkeletonCard), findsWidgets);
    expect(find.ancestor(of: find.byType(SkeletonCard).first, matching: find.byType(SkeletonPulse)), findsNothing);
    await tester.pump(const Duration(seconds: 6));
    await settle(tester); // ачаалал дууссаны дараа эхэлсэн хүсэлтүүд (сэдвийн бүлэг г.м.)
  });
}
