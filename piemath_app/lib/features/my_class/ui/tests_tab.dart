import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../data/hub_models.dart';
import '../data/my_class_repository.dart';
import '../domain/hub_logic.dart';
import 'common.dart';
import 'list_frame.dart';

/// «Тестүүд» таб: анги хийсэн тестүүд, хайлттай (300мс debounce), сараар бүлэглэсэн.
class TestsTab extends ConsumerStatefulWidget {
  const TestsTab({super.key});

  @override
  ConsumerState<TestsTab> createState() => _TestsTabState();
}

class _TestsTabState extends ConsumerState<TestsTab> {
  final _input = TextEditingController();
  Timer? _debounce;
  String _q = '';

  @override
  void dispose() {
    _debounce?.cancel();
    _input.dispose();
    super.dispose();
  }

  void _onChanged(String v) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (mounted) setState(() => _q = v.trim());
    });
    setState(() {}); // цэвэрлэх товч
  }

  @override
  Widget build(BuildContext context) {
    final list = ref.watch(hubTestsProvider(_q));
    return RefreshIndicator(
      onRefresh: () => refreshProviders(ref, [hubTestsProvider(_q)]),
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.all(AppSpace.gutter),
            sliver: SliverToBoxAdapter(
              child: TextField(
                controller: _input,
                onChanged: _onChanged,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Тестийн нэрээр хайх',
                  prefixIcon: const Icon(AppIcons.search, size: 18),
                  suffixIcon: _input.text.isEmpty
                      ? null
                      : IconButton(
                          tooltip: 'Хайлт цэвэрлэх',
                          icon: const Icon(AppIcons.close, size: 18),
                          onPressed: () {
                            _input.clear();
                            _onChanged('');
                          },
                        ),
                ),
              ),
            ),
          ),
          ..._results(list),
        ],
      ),
    );
  }

  List<Widget> _results(AsyncValue<List<HubTestRow>> list) {
    final data = list.value;
    if (data == null) {
      if (list.hasError) {
        return [
          SliverFillRemaining(
            hasScrollBody: false,
            child: ErrorState(message: errorMessageOf(list.error!), onRetry: () => ref.invalidate(hubTestsProvider(_q))),
          ),
        ];
      }
      return [
        const SliverPadding(
          padding: EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          sliver: SliverToBoxAdapter(child: SkeletonPulse(child: SkeletonCard(lines: 4))),
        ),
      ];
    }
    final groups = groupTestsByMonth(data);
    if (groups.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(
            icon: AppIcons.exam,
            title: _q.isNotEmpty ? 'Тест олдсонгүй' : 'Анги хийсэн тест алга',
            message: _q.isNotEmpty ? 'Өөр үгээр хайж үзнэ үү' : 'Ангид тест хийсний маргааш энд нээгдэнэ',
          ),
        ),
      ];
    }
    final multiClass = data.map((t) => t.classroomName).toSet().length > 1;
    return [
      for (final (month, items) in groups)
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.lg),
          sliver: SliverMainAxisGroup(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(left: 4, bottom: AppSpace.sm),
                  child: Semantics(
                    header: true,
                    child: Text(monthTitle(month), style: context.text.labelMedium?.copyWith(color: context.colors.inkDim)),
                  ),
                ),
              ),
              SliverList.builder(
                itemCount: items.length,
                itemBuilder: (context, i) => ListFrameTile(
                  first: i == 0,
                  last: i == items.length - 1,
                  child: TestRowTile(test: items[i], showClass: multiClass),
                ),
              ),
            ],
          ),
        ),
    ];
  }
}

class TestRowTile extends StatelessWidget {
  const TestRowTile({super.key, required this.test, this.showClass = false});

  final HubTestRow test;
  final bool showClass;

  @override
  Widget build(BuildContext context) {
    final open = test.testId != null && test.open;
    return ListTile(
      minVerticalPadding: 12,
      title: Text(
        cleanTitle(test.title, variant: test.variant, fallback: test.title),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: context.text.titleSmall,
      ),
      subtitle: Meta(
        items: [
          dayShort(test.date),
          if (test.variant != null) '${test.variant} хувилбар',
          if (test.problemCount > 0) '${test.problemCount} бодлого',
          if (showClass) test.classroomName,
        ],
      ),
      trailing: open
          ? Icon(AppIcons.forward, size: 18, color: context.colors.inkDim)
          : (test.testId != null && test.closedReason == TestClosedReason.tomorrow)
              ? const InfoPill(label: 'Маргааш нээгдэнэ', icon: AppIcons.time)
              : null,
      onTap: open ? () => context.push('/app/my-class/tests/${Uri.encodeComponent(test.testId!)}') : null,
    );
  }
}
