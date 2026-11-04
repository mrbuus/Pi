import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_error.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/native/native.dart';
import '../../data/lesson_plan_models.dart';
import '../../data/staff_schedule_repository.dart';

/// Номын дарааллаар тест сонгох (вэбийн `day/TestPicker.tsx`, эзэн 2026-10-18): хамгийн сүүлд хийсний ДАРААХ
/// тестүүд эхэнд санал болно; хийсэн, хассан тест сонголтод гарахгүй; үлдсэн нь тусгай тэмдэгтэй.
///
/// [onCustomTopicsChange] өгвөл хайлтын бичвэрийг бодлогын санд байхгүй ТУСДАА сэдэв болгож нэмнэ (эзэн 2026-10-31).
/// «Энэ ангиас хасах» нь шууд нуугдаж, 5 секундын «Буцаах»-ын дараа серверт. Хассаныг буцаах API нь мөр устгадаг тул
/// апп-д байхгүй (жагсаалтаар л харуулна).
class TestPicker extends ConsumerStatefulWidget {
  const TestPicker({
    super.key,
    required this.classroomId,
    required this.date,
    required this.selected,
    required this.onChanged,
    this.keepIds = const [],
    this.customTopics = const [],
    this.onCustomTopicsChange,
    this.hideChips = false,
    this.canRemove = false,
  });

  final String classroomId;
  final String date;
  final List<String> selected;
  final ValueChanged<List<String>> onChanged;

  /// Хийсэн гэж бүртгэгдсэн ч сонголтод гарах ёстой (батлах цонх).
  final List<String> keepIds;
  final List<String> customTopics;
  final ValueChanged<List<String>>? onCustomTopicsChange;

  /// Сонгосон ТЕСТИЙН чипийг нуух (батлах цонх өөрөө жагсаадаг); сэдвийн чип үргэлж харагдана.
  final bool hideChips;

  /// «Энэ ангиас хасах» (Багш+, Админ).
  final bool canRemove;

  @override
  ConsumerState<TestPicker> createState() => _TestPickerState();
}

class _TestPickerState extends ConsumerState<TestPicker> {
  final _query = TextEditingController();

  /// «Буцаах» хүлээж буй хасалт (харагдахгүй).
  final _removing = <String>{};

  ({String classroomId, String date}) get _key => (classroomId: widget.classroomId, date: widget.date);

  bool get _free => widget.onCustomTopicsChange != null;

  String get _typed => _query.text.replaceAll(RegExp(r'\s+'), ' ').trim();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _toggle(Roadmap map, String id) {
    final chosen = widget.selected.contains(id);
    if (!chosen && widget.selected.length >= planTestMax) return;
    final next = chosen ? ([...widget.selected]..remove(id)) : map.sortIds([...widget.selected, id]);
    widget.onChanged(next);
    if (!chosen && _free && _query.text.trim().isNotEmpty) setState(_query.clear);
  }

  void _addTopic() {
    final typed = _typed;
    if (!_free || typed.isEmpty) return;
    final exists = widget.customTopics.any((t) => sameTopic(t, typed));
    if (!exists && widget.customTopics.length < customTopicMax) {
      widget.onCustomTopicsChange!([...widget.customTopics, typed.length > 200 ? typed.substring(0, 200) : typed]);
    }
    setState(_query.clear);
  }

  Future<void> _remove(RoadmapUnit u) async {
    final repo = ref.read(staffScheduleRepositoryProvider);
    final container = ProviderScope.containerOf(context, listen: false);
    final messenger = ScaffoldMessenger.maybeOf(context);
    setState(() => _removing.add(u.testId));
    if (widget.selected.contains(u.testId)) widget.onChanged([...widget.selected]..remove(u.testId));
    final undone = await showUndoSnack(context, message: '${u.short} энэ ангиас хасагдлаа');
    if (undone) {
      if (mounted) setState(() => _removing.remove(u.testId));
      return;
    }
    try {
      await repo.removeTestFromClass(widget.classroomId, u.testId);
      container.invalidate(roadmapProvider(_key));
    } catch (e) {
      messenger?.showSnackBar(SnackBar(content: Text(e is ApiError ? e.message : MutationResult.saveFailedMessage)));
    } finally {
      if (mounted) setState(() => _removing.remove(u.testId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(roadmapProvider(_key));
    final map = async.value;
    if (map == null) {
      if (async.hasError) {
        return ErrorState(message: AppStrings.genericError, onRetry: () => ref.invalidate(roadmapProvider(_key)));
      }
      return const LoadingState(cards: 2, padding: EdgeInsets.zero);
    }
    final c = context.colors;
    final chosen = widget.selected.toSet();
    final keep = widget.keepIds.toSet();
    final q = _query.text.trim().toLowerCase();
    final full = widget.selected.length >= planTestMax;
    final units = [
      for (final u in map.units)
        if (!_removing.contains(u.testId)) u,
    ];
    bool visible(RoadmapUnit u) =>
        keep.contains(u.testId) ||
        chosen.contains(u.testId) ||
        (u.status != RoadmapStatus.done && u.status != RoadmapStatus.removed);
    final groups = <({String key, String topic, String book, List<RoadmapUnit> units})>[];
    for (final u in units) {
      if (!visible(u)) continue;
      if (q.isNotEmpty && !'${u.short} ${u.topic} ${u.bookTitle}'.toLowerCase().contains(q)) continue;
      final key = '${u.bookCode}|${u.topic}';
      if (groups.isNotEmpty && groups.last.key == key) {
        groups.last.units.add(u);
      } else {
        groups.add((key: key, topic: u.topic, book: u.bookTitle, units: [u]));
      }
    }
    final suggestions = [
      for (final id in map.next)
        if (!chosen.contains(id) && !_removing.contains(id)) id,
    ].take(6).toList();
    final removed = units.where((u) => u.status == RoadmapStatus.removed).toList();
    final focusTopic = map.next.isEmpty ? null : map.unit(map.next.first)?.topic;
    final typed = _typed;
    final typedExists = widget.customTopics.any((t) => sameTopic(t, typed));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if ((!widget.hideChips && widget.selected.isNotEmpty) || widget.customTopics.isNotEmpty) ...[
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            children: [
              if (!widget.hideChips)
                for (final id in widget.selected)
                  InputChip(
                    key: ValueKey('picked:$id'),
                    label: Text(map.unit(id)?.short ?? 'Тест'),
                    onDeleted: () => _toggle(map, id),
                    deleteButtonTooltipMessage: 'Хасах',
                  ),
              for (final t in widget.customTopics)
                InputChip(
                  key: ValueKey('topic:$t'),
                  avatar: Icon(AppIcons.note, size: 16, color: c.inkDim),
                  label: Text(t),
                  onDeleted: () => widget.onCustomTopicsChange?.call([...widget.customTopics]..remove(t)),
                  deleteButtonTooltipMessage: 'Сэдвийг хасах',
                ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
        ],
        if (suggestions.isNotEmpty && q.isEmpty) ...[
          Row(
            children: [
              Icon(AppIcons.lightbulb, size: 16, color: c.inkDim),
              const SizedBox(width: AppSpace.xs),
              Text('Дараагийн тест', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            children: [
              for (final id in suggestions)
                ActionChip(
                  key: ValueKey('suggest:$id'),
                  avatar: Icon(AppIcons.add, size: 16, color: c.brand),
                  label: Text(map.unit(id)?.short ?? 'Тест'),
                  onPressed: full ? null : () => _toggle(map, id),
                ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
        ],
        TextField(
          key: const ValueKey('picker:search'),
          controller: _query,
          maxLength: _free ? 200 : null,
          decoration: InputDecoration(
            prefixIcon: const Icon(AppIcons.search),
            hintText: _free ? 'Тест хайх эсвэл сэдэв бичих' : 'Тест хайх',
            counterText: '',
          ),
          textInputAction: _free ? TextInputAction.done : TextInputAction.search,
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => _addTopic(),
        ),
        if (_free && typed.isNotEmpty) ...[
          const SizedBox(height: AppSpace.sm),
          OutlinedButton.icon(
            key: const ValueKey('picker:add-topic'),
            onPressed: typedExists || widget.customTopics.length >= customTopicMax ? null : _addTopic,
            icon: const Icon(AppIcons.add, size: 18),
            label: Text(
              typedExists
                  ? '«$typed» нэмэгдсэн'
                  : widget.customTopics.length >= customTopicMax
                  ? 'Сэдэв $customTopicMax-оос олон болохгүй'
                  : '«$typed» сэдэв болгож нэмэх',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
        if (full) ...[
          const SizedBox(height: AppSpace.sm),
          Text('Нэг хичээлд $planTestMax хүртэл тест', style: context.text.bodySmall?.copyWith(color: c.warning)),
        ],
        const SizedBox(height: AppSpace.sm),
        if (groups.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
            child: Text('Тохирох тест алга', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
          ),
        for (final g in groups)
          ExpansionTile(
            key: ValueKey('group:${g.key}|$q'),
            tilePadding: EdgeInsets.zero,
            minTileHeight: AppSizes.minTap,
            initiallyExpanded: q.isNotEmpty || g.topic == focusTopic || g.units.any((u) => chosen.contains(u.testId)),
            title: Text(g.topic, maxLines: 2, overflow: TextOverflow.ellipsis, style: context.text.titleSmall),
            subtitle: Text(g.book, style: context.text.bodySmall),
            children: [
              for (final u in g.units)
                _UnitRow(
                  unit: u,
                  selected: chosen.contains(u.testId),
                  enabled: chosen.contains(u.testId) || !full,
                  onTap: () => _toggle(map, u.testId),
                  onRemove: widget.canRemove && u.status != RoadmapStatus.done ? () => _remove(u) : null,
                ),
            ],
          ),
        if (removed.isNotEmpty)
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            minTileHeight: AppSizes.minTap,
            title: Text('Хассан тестүүд (${removed.length})', style: context.text.labelLarge),
            children: [
              for (final u in removed)
                ListTile(
                  dense: true,
                  minTileHeight: AppSizes.minTap,
                  leading: Icon(AppIcons.hide, size: 18, color: c.inkDim),
                  title: Text(u.short),
                  subtitle: Text(u.topic),
                ),
            ],
          ),
      ],
    );
  }
}

class _UnitRow extends StatelessWidget {
  const _UnitRow({
    required this.unit,
    required this.selected,
    required this.enabled,
    required this.onTap,
    this.onRemove,
  });

  final RoadmapUnit unit;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final u = unit;
    final tags = [
      if (u.status == RoadmapStatus.skipped) 'Үлдсэн',
      if (u.plannedOn != null) '${u.plannedOn!.substring(5).replaceAll('-', '.')} төлөвлөсөн',
      if (u.status == RoadmapStatus.done) 'Хийсэн',
    ];
    return Row(
      children: [
        Expanded(
          child: Semantics(
            checked: selected,
            child: InkWell(
              key: ValueKey('unit:${u.testId}'),
              onTap: enabled ? onTap : null,
              borderRadius: BorderRadius.circular(AppRadius.sm),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                child: Row(
                  children: [
                    Checkbox(value: selected, onChanged: enabled ? (_) => onTap() : null),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            u.short,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: context.text.bodyMedium?.copyWith(
                              fontWeight: selected ? FontWeight.w600 : null,
                              color: u.status == RoadmapStatus.skipped && !selected ? c.warning : null,
                            ),
                          ),
                          if (tags.isNotEmpty) Text(tags.join(', '), style: context.text.bodySmall),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (onRemove != null)
          IconButton(
            tooltip: '${u.short}, энэ ангиас хасах',
            icon: Icon(AppIcons.hide, size: 20, color: c.inkDim),
            onPressed: onRemove,
          ),
      ],
    );
  }
}
