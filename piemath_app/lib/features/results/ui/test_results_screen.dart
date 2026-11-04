import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../teacher/ui/test_run_screen.dart' show IntegrityChip;
import '../application/results_providers.dart';
import '../data/results_models.dart';
import '../domain/results_logic.dart';
import 'item_analysis_tab.dart';
import 'results_widgets.dart';
import 'score_entry_tab.dart';
import 'student_attempt_screen.dart';

/// Шалгалтын дүн (`/app/tests/:id/results`, вэбийн `app/tests/[id]/results`) — Багш, Багш+, Админ.
///
/// Гурван таб: «Дүн» (ангиар, эрэмбэ, шүүлтүүр, CSV), «Бодлого» (бодлогын анализ), «Оруулах» (цаасан дүнг
/// ангиар бөөнөөр, ангид байхгүй сурагчийг хайж нэмэх). Мөр дарахад сурагчийн задаргаа.
class TestResultsScreen extends ConsumerStatefulWidget {
  const TestResultsScreen({super.key, required this.testId, this.title, this.initialTab = 0});

  final String testId;
  final String? title;
  final int initialTab;

  @override
  ConsumerState<TestResultsScreen> createState() => _TestResultsScreenState();
}

class _TestResultsScreenState extends ConsumerState<TestResultsScreen> {
  final _list = DataListController<ResultRow>();

  /// Бүх табд нэг анги (null = бүх анги).
  String? _classId;
  ResultSort _sort = ResultSort.initial;
  bool _sharing = false;

  void _onSaved() {
    ref.invalidate(testResultsProvider(widget.testId));
    ref.invalidate(examAnalyticsProvider);
    _list.refresh();
  }

  Future<void> _shareCsv() async {
    if (_sharing) return;
    final messenger = ScaffoldMessenger.of(context);
    final rows = await _visibleRows();
    if (rows.isEmpty) {
      messenger.showSnackBar(const SnackBar(content: Text('Хуваалцах дүн алга')));
      return;
    }
    setState(() => _sharing = true);
    try {
      final dir = await ref.read(resultsTempDirProvider)();
      final name = FileShare.safeFileName('dun-${ref.read(resultsTodayProvider).dateKey}.csv');
      final file = File('${dir.path}${Platform.pathSeparator}$name');
      await file.writeAsString(resultsCsv(rows), flush: true);
      final ok = await ref.read(shareLauncherProvider).shareFile(file, mimeType: 'text/csv', subject: 'Шалгалтын дүн');
      if (!ok) messenger.showSnackBar(const SnackBar(content: Text('Энэ төхөөрөмж дээр хуваалцах боломжгүй байна')));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Файл бэлдэж чадсангүй. Дахин оролдоно уу')));
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  /// Одоо харагдаж буй анги, эрэмбээр бүх мөр.
  Future<List<ResultRow>> _visibleRows() async {
    final rows = await ref.read(testResultsProvider(widget.testId).future);
    final ids = _classId == null
        ? null
        : (await ref.read(classRosterProvider(_classId!).future)).map((s) => s.id).toSet();
    return sortResults(inClass(rows, ids), _sort);
  }

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(resultsAccessProvider);
    final meta = access.canView ? ref.watch(testMetaProvider(widget.testId)).value : null;
    final title = (widget.title?.isNotEmpty ?? false)
        ? widget.title!
        : (meta?.title.isNotEmpty ?? false)
        ? meta!.title
        : 'Шалгалтын дүн';
    if (!access.canView) {
      return Scaffold(
        appBar: AppBar(title: Text(title)),
        body: const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden),
      );
    }
    return DefaultTabController(
      length: 3,
      initialIndex: widget.initialTab.clamp(0, 2),
      child: Scaffold(
        appBar: AppBar(
          title: Text(title),
          actions: [
            IconButton(
              tooltip: 'CSV хуваалцах',
              icon: _sharing
                  ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(AppIcons.share),
              onPressed: _sharing ? null : _shareCsv,
            ),
          ],
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Дүн'),
              Tab(text: 'Бодлого'),
              Tab(text: 'Оруулах'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            ResultsListTab(
              testId: widget.testId,
              controller: _list,
              classId: _classId,
              sort: _sort,
              onClassChanged: (id) => setState(() => _classId = id),
              onSortChanged: (s) => setState(() => _sort = s),
            ),
            ItemAnalysisTab(
              testId: widget.testId,
              classId: _classId,
              onClassChanged: (id) => setState(() => _classId = id),
            ),
            ScoreEntryTab(testId: widget.testId, preferredClassId: _classId, onSaved: _onSaved),
          ],
        ),
      ),
    );
  }
}

/// «Дүн» таб — вэбийн `ResultsTable`: анги, нэр/оноо/хувиар эрэмбэ, ангийн дундаж + тархалт, бүрэн бүтэн
/// байдлын тоо (> 0 үед л), эх сурвалж.
class ResultsListTab extends ConsumerStatefulWidget {
  const ResultsListTab({
    super.key,
    required this.testId,
    required this.controller,
    required this.classId,
    required this.sort,
    required this.onClassChanged,
    required this.onSortChanged,
  });

  final String testId;
  final DataListController<ResultRow> controller;
  final String? classId;
  final ResultSort sort;
  final ValueChanged<String?> onClassChanged;
  final ValueChanged<ResultSort> onSortChanged;

  @override
  ConsumerState<ResultsListTab> createState() => _ResultsListTabState();
}

class _ResultsListTabState extends ConsumerState<ResultsListTab> {
  DataQuery? _lastQuery;
  Object? _lastKey;

  static const _filters = [
    DataFilter(ResultFilters.good, '80%+'),
    DataFilter(ResultFilters.mid, '50–79%'),
    DataFilter(ResultFilters.low, '50%-иас доош'),
    DataFilter(ResultFilters.flagged, 'Анхаарах'),
    DataFilter(ResultFilters.online, 'Онлайн'),
    DataFilter(ResultFilters.paper, 'Цаасан'),
  ];

  Object get _key => (widget.classId, widget.sort);

  Future<DataPage<ResultRow>> _load(DataQuery q) async {
    // Ижил асуулга, ижил анги/эрэмбээр дахин ирвэл (доош татах) серверээс шинээр.
    if (q.isFirstPage && q == _lastQuery && _key == _lastKey) {
      ref.invalidate(testResultsProvider(widget.testId));
      if (widget.classId != null) ref.invalidate(classRosterProvider(widget.classId!));
    }
    if (q.isFirstPage) {
      _lastQuery = q;
      _lastKey = _key;
    }
    final rows = await ref.read(testResultsProvider(widget.testId).future);
    final ids = widget.classId == null
        ? null
        : (await ref.read(classRosterProvider(widget.classId!).future)).map((s) => s.id).toSet();
    return DataPage.local(
      sortResults(inClass(rows, ids), widget.sort),
      q,
      matches: resultMatches,
      inFilter: ResultFilters.test,
      filters: _filters,
      pageSize: 50,
    );
  }

  void _open(ResultRow r) => context.push(
    '/app/tests/${Uri.encodeComponent(widget.testId)}/results/${Uri.encodeComponent(r.studentId)}',
    extra: r.name,
  );

  @override
  Widget build(BuildContext context) {
    final classes = ref.watch(resultClassOptionsProvider(widget.testId)).value ?? const <ClassOption>[];
    final rows = ref.watch(testResultsProvider(widget.testId)).value;
    final roster = widget.classId == null ? null : ref.watch(classRosterProvider(widget.classId!)).value;
    final scoped = rows == null ? null : inClass(rows, roster?.map((s) => s.id).toSet());
    final stats = scoped == null || (widget.classId != null && roster == null) ? null : ResultsStats.of(scoped);
    return DataListScreen<ResultRow>(
      controller: widget.controller,
      load: _load,
      reloadKey: _key,
      itemKey: (r) => r.id,
      searchHint: 'Нэрээр хайх',
      filters: _filters,
      countLabel: (n) => '$n дүн',
      emptyTitle: 'Дүн алга байна',
      emptyMessage: 'Цаасан дүнг «Оруулах» табаас оруулна',
      emptyIcon: AppIcons.exam,
      header: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ClassChips(options: classes, selected: widget.classId, onSelected: widget.onClassChanged, gutter: 0),
          if (stats != null)
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.sm),
              child: StatRow(
                minTileWidth: 72,
                tiles: [
                  StatTile(label: 'Дундаж', value: '${stats.avgPct}%', hint: '${stats.total} сурагч'),
                  StatTile(label: '80%+', value: '${stats.good}', icon: AppIcons.success, tone: ChipTone.success),
                  StatTile(label: '50–79%', value: '${stats.mid}', icon: AppIcons.warning, tone: ChipTone.warning),
                  StatTile(label: '0–49%', value: '${stats.low}', icon: AppIcons.failure, tone: ChipTone.error),
                ],
              ),
            ),
          _SortBar(sort: widget.sort, onChanged: widget.onSortChanged),
        ],
      ),
      onTap: _open,
      detailBuilder: (_, r) =>
          StudentAttemptView(key: ValueKey(r.studentId), testId: widget.testId, studentId: r.studentId),
      itemBuilder: (context, r) => ResultItem(row: r),
    );
  }
}

class _SortBar extends StatelessWidget {
  const _SortBar({required this.sort, required this.onChanged});

  final ResultSort sort;
  final ValueChanged<ResultSort> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.sm),
      child: Row(
        children: [
          Semantics(
            label: 'Эрэмбэ',
            child: Icon(AppIcons.slidersHorizontal, size: 18, color: context.colors.inkDim),
          ),
          const SizedBox(width: AppSpace.sm),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final k in ResultSortKey.values) ...[
                    if (k.index > 0) const SizedBox(width: AppSpace.sm),
                    ChoiceChip(
                      key: ValueKey('sort:${k.name}'),
                      selected: sort.key == k,
                      materialTapTargetSize: MaterialTapTargetSize.padded,
                      avatar: sort.key == k
                          ? Icon(sort.ascending ? AppIcons.trendingUp : AppIcons.trendingDown, size: 16)
                          : null,
                      showCheckmark: false,
                      label: Text(k.label),
                      tooltip: sort.key == k
                          ? '${k.label}, ${sort.ascending ? 'өсөхөөр' : 'буурахаар'} эрэмбэлсэн'
                          : '${k.label}-аар эрэмбэлэх',
                      onSelected: (_) => onChanged(sort.toggle(k)),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const InfoHint(
            title: 'Гарсан, скриншот, бичлэг',
            message:
                'Гарсан, скриншот, бичлэгийн тоо нь шалгалтын үед бүртгэгдсэн үйл явдал бөгөөд багш өөрөө хянаж үзэх '
                'зорилготой. Эдгээр нь хууран мэхэлсэн гэсэн автомат дүгнэлт биш',
          ),
        ],
      ),
    );
  }
}

/// Дүнгийн нэг мөр: нэр, эх сурвалж, бүрэн бүтэн байдлын тоо, оноо, хувь.
class ResultItem extends StatelessWidget {
  const ResultItem({super.key, required this.row});

  final ResultRow row;

  @override
  Widget build(BuildContext context) {
    final inds = row.run.indicators;
    return ItemRow(
      title: row.name,
      meta: [ResultSource.label(row.source)],
      subtitle: inds.isEmpty
          ? null
          : Padding(
              padding: const EdgeInsets.only(top: AppSpace.xs),
              child: Wrap(
                spacing: AppSpace.md,
                runSpacing: AppSpace.xs,
                children: [for (final i in inds) IntegrityChip(kind: i.kind, count: i.count)],
              ),
            ),
      trailing: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(row.scoreText, style: context.text.titleMedium),
          PercentText(percent: row.percent, style: context.text.labelLarge),
        ],
      ),
      chevron: true,
    );
  }
}
