import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/planner_controller.dart';
import '../data/planner_repository.dart';
import '../domain/planner_logic.dart';
import 'planner_actions.dart';
import 'task_form.dart';
import 'task_tile.dart';

/// Ажилтны төлөвлөгч `/app/planner` (вэбийн `PlannerClient`): бүлэглэсэн жагсаалт
/// (Хожимдсон, Өнөөдөр, Энэ 7 хоног, Дараа, Дууссан), шудрахад «Дууссан» + «Буцаах»,
/// дарахад дэлгэрэнгүй, нэмэх/засах доороос гарах маягтаар. Бүх өөрчлөлт optimistic.
class PlannerScreen extends ConsumerStatefulWidget {
  const PlannerScreen({super.key});

  static const path = '/app/planner';
  static const workloadPath = '/app/planner/workload';

  @override
  ConsumerState<PlannerScreen> createState() => _PlannerScreenState();
}

class _PlannerScreenState extends ConsumerState<PlannerScreen> {
  final _list = DataListController<PlannerRow>();

  PlannerScope? _scope;
  TaskServerFilter _server = noTaskServerFilter;
  bool _byDay = false;
  UbDateTime? _day;

  /// Серверээс сүүлд ачаалсан шүүлтүүр (`null` = хараахан ачаалаагүй).
  TaskServerFilter? _fetched;

  /// Сүүлийн ачааллын түлхүүр — ижил бол «доош татаж шинэчлэх» эсвэл «Дахин оролдох» (сүлжээ).
  Object? _lastKey;

  /// Өөрчлөлтийн дараах дотоод шинэчлэл — сүлжээ дуудахгүй.
  bool _localRefresh = false;
  bool _fetching = false;

  static const _statusFilters = [
    DataFilter('PLANNED', 'Төлөвлөсөн'),
    DataFilter('IN_PROGRESS', 'Хийгдэж байгаа'),
    DataFilter('BLOCKED', 'Хоригдсон'),
    DataFilter('DONE', 'Дууссан'),
    DataFilter('CANCELLED', 'Цуцалсан'),
  ];

  PlannerScope _scopeFor(PlannerMe me) {
    final allowed = scopesFor(me.role);
    final s = _scope;
    return s != null && allowed.contains(s) ? s : defaultScope(me.role);
  }

  UbDateTime get _now => ref.read(plannerClockProvider)();

  Object get _viewKey => (_scope, _server, _byDay, _day?.dateKey);

  Future<DataPage<PlannerRow>> _load(DataQuery q) async {
    final key = (q, _viewKey);
    final sameView = key == _lastKey;
    _lastKey = key;
    final local = _localRefresh;
    _localRefresh = false;
    if (!local && (_fetched != _server || sameView)) {
      _fetching = true;
      try {
        await ref.read(plannerControllerProvider.notifier).load(_server);
        _fetched = _server;
      } finally {
        _fetching = false;
      }
    }
    return _page(q);
  }

  DataPage<PlannerRow> _page(DataQuery q) {
    final me = ref.read(plannerMeProvider);
    final scope = _scopeFor(me);
    final search = q.search.trim().toLowerCase();
    final day = _byDay ? (_day ?? _now) : null;
    final base = [
      for (final i in flattenTasks(ref.read(plannerControllerProvider)))
        if (inScope(i, scope, me.userId) &&
            matchesServerFilter(i, _server) &&
            matchesSearch(i, search) &&
            (day == null || isDueOn(i.task, day)))
          i,
    ];
    final counts = <String, int>{DataFilter.allId: base.length};
    for (final i in base) {
      counts[i.task.status.api] = (counts[i.task.status.api] ?? 0) + 1;
    }
    for (final f in _statusFilters) {
      counts.putIfAbsent(f.id, () => 0);
    }
    final shown = q.filter == null ? base : [...base.where((i) => i.task.status.api == q.filter)];
    return DataPage(items: buildRows(shown, _now), total: shown.length, filterCounts: counts);
  }

  void _onTasksChanged() {
    if (_fetching || !mounted) return;
    _localRefresh = true;
    unawaited(_list.refresh());
  }

  Future<void> _openFilters() async {
    final staff = ref.read(plannerStaffProvider).value ?? const [];
    final classrooms = ref.read(plannerClassroomsProvider).value ?? const [];
    final picked = await showPlannerFilterSheet(context, current: _server, staff: staff, classrooms: classrooms);
    if (picked != null && mounted) setState(() => _server = picked);
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(plannerMeProvider);
    final tasks = ref.watch(plannerControllerProvider);
    // Маягтын сонголтыг урьдчилан ачаалж, дэлгэц амьд байх хооронд хадгална.
    ref
      ..watch(plannerStaffProvider)
      ..watch(plannerClassroomsProvider)
      ..listen(plannerControllerProvider, (_, _) => _onTasksChanged());
    final actions = PlannerActions(ref);
    final scope = _scopeFor(me);
    final now = _now;

    return Scaffold(
      appBar: AppBar(title: const Text('Төлөвлөгч')),
      floatingActionButton: actions.canEdit
          ? FloatingActionButton.extended(
              heroTag: 'planner-add',
              onPressed: () => actions.create(context),
              icon: const Icon(AppIcons.add),
              label: const Text('Шинэ даалгавар'),
            )
          : null,
      body: DataListScreen<PlannerRow>(
        controller: _list,
        load: _load,
        reloadKey: _viewKey,
        itemKey: (r) => r.key,
        searchHint: 'Даалгавар хайх',
        filters: _statusFilters,
        allFilterLabel: 'Бүх төлөв',
        countLabel: (n) => '$n даалгавар',
        cardItems: false,
        emptyTitle: 'Даалгавар алга',
        emptyIcon: AppIcons.listTodo,
        emptyMessage: switch (scope) {
          PlannerScope.mine => 'Танд оноогдсон даалгавар алга',
          PlannerScope.created => 'Таны өгсөн даалгавар алга',
          PlannerScope.all => null,
        },
        header: _PlannerHeader(
          scopes: scopesFor(me.role),
          scope: scope,
          onScope: (s) => setState(() => _scope = s),
          filterCount: [_server.assigneeId, _server.classroomId, _server.subject].nonNulls.length,
          onFilters: _openFilters,
          byDay: _byDay,
          onByDay: (v) => setState(() {
            _byDay = v;
            _day ??= now.startOfDay;
          }),
          day: _day ?? now.startOfDay,
          today: now,
          dayCounts: dueCountsByDay([
            for (final i in flattenTasks(tasks))
              if (inScope(i, scope, me.userId) && matchesServerFilter(i, _server)) i,
          ]),
          onDay: (d) => setState(() => _day = d),
          onWorkload: () => context.push(PlannerScreen.workloadPath),
        ),
        itemBuilder: (context, row) => switch (row) {
          PlannerHeaderRow(:final group, :final count) => PlannerGroupHeader(group: group, count: count),
          PlannerTaskRow(:final item) => TaskTile(
            item: item,
            now: now,
            pending: isPendingTask(item.task),
            onTap: () => actions.openDetail(context, item.task.id),
            onComplete: actions.canChange(item.task) && !item.task.status.isClosed
                ? () => actions.complete(context, item.task)
                : null,
          ),
        },
      ),
    );
  }
}

class _PlannerHeader extends StatelessWidget {
  const _PlannerHeader({
    required this.scopes,
    required this.scope,
    required this.onScope,
    required this.filterCount,
    required this.onFilters,
    required this.byDay,
    required this.onByDay,
    required this.day,
    required this.today,
    required this.dayCounts,
    required this.onDay,
    required this.onWorkload,
  });

  final List<PlannerScope> scopes;
  final PlannerScope scope;
  final ValueChanged<PlannerScope> onScope;
  final int filterCount;
  final VoidCallback onFilters;
  final bool byDay;
  final ValueChanged<bool> onByDay;
  final UbDateTime day;
  final UbDateTime today;
  final Map<String, int> dayCounts;
  final ValueChanged<UbDateTime> onDay;
  final VoidCallback onWorkload;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: AppSpace.sm,
          children: [
            for (final s in scopes)
              ChoiceChip(
                key: ValueKey('scope:${s.name}'),
                label: Text(s.label),
                selected: s == scope,
                showCheckmark: false,
                selectedColor: c.brandTint,
                materialTapTargetSize: MaterialTapTargetSize.padded,
                onSelected: (_) {
                  unawaited(HapticFeedback.selectionClick());
                  onScope(s);
                },
              ),
          ],
        ),
        Wrap(
          spacing: AppSpace.sm,
          children: [
            TextButton.icon(
              key: const ValueKey('planner-filters'),
              onPressed: onFilters,
              icon: const Icon(AppIcons.slidersHorizontal, size: 18),
              label: Text(filterCount == 0 ? 'Шүүлтүүр' : 'Шүүлтүүр $filterCount'),
            ),
            TextButton.icon(
              key: const ValueKey('planner-by-day'),
              onPressed: () => onByDay(!byDay),
              icon: Icon(byDay ? AppIcons.listTodo : AppIcons.calendarRange, size: 18),
              label: Text(byDay ? 'Бүгдийг харах' : 'Өдрөөр'),
            ),
            TextButton.icon(
              key: const ValueKey('planner-workload'),
              onPressed: onWorkload,
              icon: const Icon(AppIcons.chart, size: 18),
              label: const Text('Ачаалал'),
            ),
          ],
        ),
        if (byDay) ...[
          WeekStrip(selected: day, today: today, counts: dayCounts, onSelected: onDay),
          Padding(
            padding: const EdgeInsets.only(top: AppSpace.xs),
            child: Text('${DateMn.longWithWeekday(day)}-нд дуусах', style: context.text.bodySmall),
          ),
        ],
      ],
    );
  }
}
