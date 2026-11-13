import '../data/staff_schedule_models.dart';
import 'test_names.dart';

// Өдрийн хуваарийн мөрийн «өнөөдрийн тест» (вэбийн `day/RoadMap.tsx#roadOf`) — I/O-гүй, тесттэй.

/// Нэг тест: богино нэр ба ангид хийгээгүй (хассан) бодлогын дугаар (1-ээс).
typedef RoadItem = ({String? testId, String short, List<int> excluded});

/// Өнөөдрийн тест: хийсэн (бүртгэлтэй) бол хийсэн нь, эс бөгөөс төлөвлөсөн нь; + бодлогын санд байхгүй
/// (багшийн бичсэн) сэдвүүд.
({List<RoadItem> today, bool doneToday, List<String> topics}) roadOf(DayLesson l, Map<String, PlanTest> tests) {
  final doneToday = l.done.isNotEmpty;
  final today = doneToday
      ? [
          for (final d in l.done)
            (
              testId: d.testId,
              short: (d.testId == null ? null : tests[d.testId]?.short) ?? d.manualTitle ?? 'Тест',
              excluded: excludedNumbers(tests[d.testId], d.excludedProblemIds),
            ),
        ]
      : [for (final id in l.planTestIds) (testId: id, short: tests[id]?.short ?? 'Тест', excluded: const <int>[])];
  return (today: today, doneToday: doneToday, topics: l.customTopics);
}

/// Хассан бодлогын id → тестийн доторх дугаар (1-ээс, өсөхөөр).
List<int> excludedNumbers(PlanTest? test, List<String> excludedIds) {
  if (test == null || excludedIds.isEmpty) return const [];
  return [
    for (var i = 0; i < test.problemIds.length; i++)
      if (excludedIds.contains(test.problemIds[i])) i + 1,
  ];
}

/// Мөрийн тестийн товч бичвэр: «Квадрат тэгшитгэл 1, 2; Давталт». Тест, сэдэвгүй бол хуучин сэдвийг товчилж.
String lessonTestsText(DayLesson l, Map<String, PlanTest> tests) {
  final road = roadOf(l, tests);
  final text = [groupTestNames(road.today.map((x) => x.short)), ...road.topics].where((s) => s.isNotEmpty).join('; ');
  if (text.isNotEmpty) return text;
  return regroupTopicText(l.topic);
}
