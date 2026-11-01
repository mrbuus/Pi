import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../../schedule/ui/schedule_view.dart';
import '../data/my_class_repository.dart';
import 'attendance_tab.dart';
import 'lesson_days_tab.dart';
import 'makeup_view.dart';
import 'my_class_icons.dart';
import 'tests_tab.dart';

/// «Хичээл» табуудын түлхүүр (`/app/my-class?tab=`), вэбтэй ижил.
enum MyClassTab {
  lessons('Хичээлүүд', AppIcons.calendar),
  attendance('Ирц', MyClassIcons.attendance),
  tests('Тестүүд', AppIcons.exam),
  makeup('Нөхөх', MyClassIcons.makeup),
  schedule('Хуваарь', MyClassIcons.scheduleTab);

  const MyClassTab(this.label, this.icon);
  final String label;
  final IconData icon;

  static MyClassTab parse(String? v) => MyClassTab.values.firstWhere((t) => t.name == v, orElse: () => lessons);
}

/// Сурагчийн «Хичээл» (`/app/my-class`) — вэбийн `MyClassHub`: Хичээлүүд, Ирц, Тестүүд,
/// Нөхөх (нөхөх зүйл байвал л, эсвэл `?tab=makeup`-ээр шууд орсон бол), Хуваарь.
class MyClassScreen extends ConsumerStatefulWidget {
  const MyClassScreen({super.key, this.initialTab = MyClassTab.lessons});

  final MyClassTab initialTab;

  @override
  ConsumerState<MyClassScreen> createState() => _MyClassScreenState();
}

class _MyClassScreenState extends ConsumerState<MyClassScreen> with TickerProviderStateMixin {
  TabController? _controller;
  List<MyClassTab> _tabs = const [];
  late MyClassTab _current = widget.initialTab;

  List<MyClassTab> _visibleTabs(int makeupCount) => [
        for (final t in MyClassTab.values)
          if (t != MyClassTab.makeup || makeupCount > 0 || _current == MyClassTab.makeup) t,
      ];

  void _sync(List<MyClassTab> tabs) {
    if (_controller != null && _listEquals(tabs, _tabs)) return;
    final index = tabs.indexOf(_current).clamp(0, tabs.length - 1);
    _controller?.dispose();
    _tabs = tabs;
    _controller = TabController(length: tabs.length, vsync: this, initialIndex: index)
      ..addListener(() {
        final c = _controller!;
        if (!c.indexIsChanging) _current = _tabs[c.index];
      });
  }

  static bool _listEquals(List<MyClassTab> a, List<MyClassTab> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Нөхөх таб: нөхөх зүйл байвал л (алдаа/ачаалж байхад нуух).
    final makeup = ref.watch(myMakeupProvider);
    final count = makeup.value?.where((i) => i.isOpen).length ?? 0;
    _sync(_visibleTabs(makeup.value?.length ?? 0));
    final controller = _controller!;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Хичээл'),
        bottom: TabBar(
          controller: controller,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelColor: context.colors.brandSoft,
          unselectedLabelColor: context.colors.inkDim,
          indicatorColor: context.colors.brandBright,
          labelStyle: context.text.labelLarge,
          tabs: [
            for (final t in _tabs)
              Tab(
                height: 48,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(t.icon, size: 18),
                    const SizedBox(width: 6),
                    Text(t.label),
                    if (t == MyClassTab.makeup && count > 0) ...[
                      const SizedBox(width: 6),
                      _CountBadge(count: count),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
      body: TabBarView(
        controller: controller,
        children: [
          for (final t in _tabs)
            switch (t) {
              MyClassTab.lessons => const LessonDaysTab(),
              MyClassTab.attendance => const AttendanceTab(),
              MyClassTab.tests => const TestsTab(),
              MyClassTab.makeup => const MakeupView(),
              MyClassTab.schedule => const ScheduleView(showPattern: true),
            },
        ],
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  const _CountBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: '$count үлдсэн',
      excludeSemantics: true,
      child: Container(
        constraints: const BoxConstraints(minWidth: 20),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
        decoration: BoxDecoration(color: c.error, borderRadius: BorderRadius.circular(AppRadius.pill)),
        child: Text(
          '$count',
          textAlign: TextAlign.center,
          style: context.text.labelSmall?.copyWith(color: c.onStatus, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}
