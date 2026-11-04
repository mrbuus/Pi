// Гүйцэтгэлийн хэмжилт (UX-RESEARCH §8, PERFORMANCE §3): кадрын хугацааг `traceAction`-оор.
//
// Бодит төхөөрөмж дээр (profile горим, USB-ээр холбосон, хамгийн сул утас — Android 9 / 2GB):
//   flutter drive --profile --no-dds \
//     --driver=test_driver/perf_driver.dart \
//     --target=integration_test/perf_test.dart
//
// Үр дүн: build/perf_<нэр>.timeline_summary.json (кадрын build/raster p50/p90/p99, алгассан кадр).
// Төсөв: build ба raster тус бүр 90-р персентиль < 12ms, алгассан кадр ≤ 1%. Тоог docs/PERF-LOG.md-д.
//
// Сервергүй: апп-ын жинхэнэ widget-үүдээр (MathText, SolutionView, хуудасны шилжилт, NavigationBar,
// skeleton) бүтээсэн тусдаа дэлгэц — нэвтрэлт, сүлжээ хэмжилтэд нөлөөлөхгүй.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/core/perf/perf_tier.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/shared/solution/solution.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    await DevicePerf.detect();
  });

  testWidgets('асуултын жагсаалт гүйлгэх', (tester) async {
    await tester.pumpWidget(const _PerfApp());
    await tester.pumpAndSettle();
    final list = find.byKey(const ValueKey('perf-list'));
    await binding.traceAction(() async {
      for (var i = 0; i < 4; i++) {
        await tester.fling(list, const Offset(0, -900), 2500);
        await tester.pumpAndSettle();
      }
      for (var i = 0; i < 4; i++) {
        await tester.fling(list, const Offset(0, 900), 2500);
        await tester.pumpAndSettle();
      }
    }, reportKey: 'scroll_problems');
  });

  testWidgets('бодолт нээх, буцах', (tester) async {
    await tester.pumpWidget(const _PerfApp());
    await tester.pumpAndSettle();
    await binding.traceAction(() async {
      for (var i = 0; i < 5; i++) {
        await tester.tap(find.byKey(ValueKey('row-$i')));
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const ValueKey('expand-solution')));
        await tester.pumpAndSettle();
        await tester.pageBack();
        await tester.pumpAndSettle();
      }
    }, reportKey: 'open_solution');
  });

  testWidgets('таб солих', (tester) async {
    await tester.pumpWidget(const _PerfApp());
    await tester.pumpAndSettle();
    await binding.traceAction(() async {
      for (var round = 0; round < 3; round++) {
        for (final label in ['Хуваарь', 'Бусад', 'Шалгалт']) {
          await tester.tap(find.text(label).last);
          // Skeleton тасралтгүй лугшдаг тул pumpAndSettle биш — тогтмол хугацаа.
          await tester.pump(const Duration(milliseconds: 600));
        }
      }
    }, reportKey: 'switch_tabs');
  });
}

String _problem(int i) => '${i + 1}. $_texts\n\$\$\\frac{${i + 2}x^2-${i + 1}}{x+${i % 7 + 1}} = \\sqrt{${i + 3}}\$\$';

const _texts = r'Тэгшитгэлийг бод: $x^2 - 5x + 6 = 0$ бол $x_1 + x_2$-ийн утгыг ол.';

const _solution = r'''**1-р алхам.** Виетийн теорем: $x_1 + x_2 = -\frac{b}{a}$.

$$x_1 + x_2 = -\frac{-5}{1} = 5$$

**2-р алхам.** Шалгах: $D = b^2 - 4ac = 25 - 24 = 1 > 0$.

$$x_{1,2} = \frac{5 \pm \sqrt{1}}{2}$$

**Хариу.** $5$''';

class _PerfApp extends StatelessWidget {
  const _PerfApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(debugShowCheckedModeBanner: false, theme: AppTheme.light(), home: const _Tabs());
  }
}

class _Tabs extends StatefulWidget {
  const _Tabs();

  @override
  State<_Tabs> createState() => _TabsState();
}

class _TabsState extends State<_Tabs> {
  int _i = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: switch (_i) {
        0 => const _ProblemList(),
        1 => const _SkeletonPage(),
        _ => const Center(child: SuccessCheck(haptic: false)),
      },
      bottomNavigationBar: NavigationBar(
        selectedIndex: _i,
        onDestinationSelected: (i) => setState(() => _i = i),
        destinations: const [
          NavigationDestination(icon: Icon(AppIcons.exam), label: 'Шалгалт'),
          NavigationDestination(icon: Icon(AppIcons.schedule), label: 'Хуваарь'),
          NavigationDestination(icon: Icon(AppIcons.more), label: 'Бусад'),
        ],
      ),
    );
  }
}

class _ProblemList extends StatelessWidget {
  const _ProblemList();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ListView.builder(
        key: const ValueKey('perf-list'),
        padding: const EdgeInsets.all(AppSpace.gutter),
        itemCount: 300,
        itemBuilder: (context, i) => staggerIn(
          i,
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.md),
            child: AppCard(
              key: ValueKey('row-$i'),
              onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => _SolutionPage(index: i))),
              child: MathText(_problem(i)),
            ),
          ),
        ),
      ),
    );
  }
}

class _SolutionPage extends StatelessWidget {
  const _SolutionPage({required this.index});

  final int index;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Бодлого ${index + 1}')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpace.gutter),
        children: [
          MathText(_problem(index)),
          const SizedBox(height: AppSpace.lg),
          TextButton(key: const ValueKey('expand-solution'), onPressed: () {}, child: const Text('Бодолт')),
          const SolutionView(source: _solution, initiallyExpanded: true),
        ],
      ),
    );
  }
}

class _SkeletonPage extends StatelessWidget {
  const _SkeletonPage();

  @override
  Widget build(BuildContext context) {
    return const SafeArea(
      child: Padding(
        padding: EdgeInsets.all(AppSpace.gutter),
        child: SkeletonPulse(
          child: Column(
            children: [
              SkeletonCard(),
              SizedBox(height: AppSpace.md),
              SkeletonCard(lines: 3),
              SizedBox(height: AppSpace.md),
              SkeletonRows(rows: 5),
            ],
          ),
        ),
      ),
    );
  }
}
