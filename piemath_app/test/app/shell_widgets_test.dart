import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/app/nav/nav_data.dart';
import 'package:piemath_app/app/shell/app_nav_bar.dart';
import 'package:piemath_app/app/shell/branch_stack.dart';
import 'package:piemath_app/app/shell/section_screen.dart';
import 'package:piemath_app/core/perf/perf_tier.dart';
import 'package:piemath_app/core/ui/ui.dart';

Widget _app(Widget child, {bool reduced = false}) => MaterialApp(
  theme: AppTheme.light(),
  home: Builder(
    builder: (context) => MediaQuery(
      data: MediaQuery.of(context).copyWith(disableAnimations: reduced),
      child: child,
    ),
  ),
);

class _Counter extends StatefulWidget {
  const _Counter(this.label);
  final String label;
  @override
  State<_Counter> createState() => _CounterState();
}

class _CounterState extends State<_Counter> {
  int builds = 0;
  @override
  Widget build(BuildContext context) {
    builds++;
    return Text(widget.label);
  }
}

double _opacityOf(WidgetTester t, String label) => t
    .widget<FadeTransition>(find.ancestor(of: find.text(label), matching: find.byType(FadeTransition)).first)
    .opacity
    .value;

void main() {
  tearDown(() => DevicePerf.tier = PerfTier.high);

  group('BranchStack', () {
    Widget stack(int i, {bool reduced = false}) => _app(
      BranchStack(currentIndex: i, children: const [_Counter('А'), _Counter('Б')]),
      reduced: reduced,
    );

    testWidgets('солиход state хадгалагдана, дахин build хийхгүй, богино fade-through', (tester) async {
      await tester.pumpWidget(stack(0));
      final a = tester.state<_CounterState>(find.byType(_Counter, skipOffstage: false).first);
      expect(find.text('Б'), findsNothing); // идэвхгүй салбар offstage
      await tester.pumpWidget(stack(1));
      await tester.pump(const Duration(milliseconds: 100));
      expect(_opacityOf(tester, 'Б'), inExclusiveRange(0, 1));
      await tester.pump(BranchStack.duration);
      await tester.pumpAndSettle();
      expect(find.text('Б'), findsOneWidget);
      expect(find.text('А'), findsNothing);
      await tester.pumpWidget(stack(0));
      await tester.pumpAndSettle();
      expect(tester.state(find.byType(_Counter, skipOffstage: false).first), same(a));
      expect(a.builds, 1);
    });

    testWidgets('хөдөлгөөн багасгах горимд шууд солино', (tester) async {
      await tester.pumpWidget(stack(0, reduced: true));
      await tester.pumpWidget(stack(1, reduced: true));
      expect(find.text('Б'), findsOneWidget);
      expect(find.text('А'), findsNothing);
      expect(_opacityOf(tester, 'Б'), 1);
    });

    testWidgets('сул төхөөрөмжид шууд солино', (tester) async {
      DevicePerf.tier = PerfTier.low;
      await tester.pumpWidget(stack(0));
      await tester.pumpWidget(stack(1));
      expect(find.text('Б'), findsOneWidget);
      expect(find.text('А'), findsNothing);
      expect(_opacityOf(tester, 'Б'), 1);
    });
  });

  group('AppNavBar', () {
    Widget bar(int i, {bool reduced = false, ValueChanged<int>? onTap}) => _app(
      Scaffold(
        bottomNavigationBar: AppNavBar(
          currentIndex: i,
          onTap: onTap ?? (_) {},
          items: const [
            AppNavItem(icon: Icon(AppIcons.home), label: 'Нүүр'),
            AppNavItem(icon: Icon(AppIcons.calendar), label: 'Хуваарь'),
            AppNavItem(icon: Icon(AppIcons.more), label: 'Бусад'),
          ],
        ),
      ),
      reduced: reduced,
    );

    double pillX(WidgetTester t) => t.getTopLeft(find.byType(Container).first).dx;

    testWidgets('pill дараагийн товч руу гулсана', (tester) async {
      await tester.pumpWidget(bar(0));
      final start = pillX(tester);
      await tester.pumpWidget(bar(2));
      await tester.pump(const Duration(milliseconds: 60));
      final mid = pillX(tester);
      await tester.pumpAndSettle();
      final end = pillX(tester);
      expect(mid, greaterThan(start));
      expect(mid, lessThan(end));
      expect(end - start, closeTo(tester.getSize(find.byType(AppNavBar)).width * 2 / 3, 1));
    });

    testWidgets('хөдөлгөөн багасгах горимд pill шууд', (tester) async {
      await tester.pumpWidget(bar(0, reduced: true));
      final start = pillX(tester);
      await tester.pumpWidget(bar(1, reduced: true));
      expect(pillX(tester) - start, closeTo(tester.getSize(find.byType(AppNavBar)).width / 3, 1));
    });

    testWidgets('товч ≥ 48dp, сонгогдсон төлөв semantics-д', (tester) async {
      final taps = <int>[];
      await tester.pumpWidget(bar(0, onTap: taps.add));
      await tester.tap(find.text('Хуваарь'));
      expect(taps, [1]);
      final size = tester.getSize(
        find.ancestor(of: find.text('Хуваарь'), matching: find.byType(GestureDetector)).first,
      );
      expect(size.height, greaterThanOrEqualTo(AppSizes.minTap));
      expect(size.width, greaterThanOrEqualTo(AppSizes.minTap));
      expect(
        tester.getSemantics(find.text('Нүүр')),
        isSemantics(isSelected: true, isButton: true, hasSelectedState: true, isInMutuallyExclusiveGroup: true),
      );
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    });
  });

  testWidgets('SectionScreen: дэд хуудасны өөрийн AppBar-ын мөр нуугдана, дотор таб үлдэнэ', (tester) async {
    const section = NavSection(
      'x',
      NavLink('/a', 'Хэсэг', AppIcons.home),
      pages: [NavLink('/a', 'Нэг', AppIcons.home), NavLink('/b', 'Хоёр', AppIcons.home)],
    );
    await tester.pumpWidget(
      _app(
        SectionScreen(
          section: section,
          index: 0,
          pages: [
            SectionPage(
              link: section.pages[0],
              builder: (_) => DefaultTabController(
                length: 2,
                child: Scaffold(
                  appBar: AppBar(
                    title: const Text('Дотоод гарчиг'),
                    bottom: const TabBar(
                      tabs: [
                        Tab(text: 'Т1'),
                        Tab(text: 'Т2'),
                      ],
                    ),
                  ),
                  body: const SizedBox(),
                ),
              ),
            ),
            SectionPage(
              link: section.pages[1],
              builder: (_) => const Scaffold(body: Text('Хоёр дахь')),
            ),
          ],
        ),
      ),
    );
    final inner = find.ancestor(of: find.text('Дотоод гарчиг'), matching: find.byType(AppBar));
    // Гарчгийн мөр 0, зөвхөн доторх TabBar (48) үлдэнэ.
    expect(tester.getSize(inner).height, kTextTabBarHeight);
    expect(find.text('Т1'), findsOneWidget);
    expect(find.text('Хэсэг'), findsOneWidget);
    // Дэд таб 48dp-ээс багагүй.
    expect(
      tester.getSize(find.ancestor(of: find.text('Хоёр'), matching: find.byType(Tab))).height,
      greaterThanOrEqualTo(48),
    );
    // Хоёр дахь дэд хуудас анх харагдах хүртэл зурагдахгүй (lazy).
    expect(find.text('Хоёр дахь', skipOffstage: false), findsNothing);
  });
}
