import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/planner_controller.dart';
import '../data/planner_models.dart';
import '../domain/planner_logic.dart';
import 'planner_actions.dart';
import 'planner_visuals.dart';

/// Даалгаврын дэлгэрэнгүй — доороос гарах хуудас. Жагсаалтын төлөвийг сонсдог тул төлөв, засвар шууд
/// харагдана.
Future<void> showTaskDetailSheet(BuildContext context, {required String id}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (_) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.7,
    minChildSize: 0.4,
    maxChildSize: 0.94,
    builder: (context, scroll) => TaskDetailView(id: id, scroll: scroll),
  ),
);

/// Дэлгэрэнгүйн агуулга (sliver-ээр).
class TaskDetailView extends ConsumerWidget {
  const TaskDetailView({super.key, required this.id, this.scroll});

  final String id;
  final ScrollController? scroll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasks = ref.watch(plannerControllerProvider);
    final task = findTask(tasks, id);
    if (task == null) {
      return const EmptyState(icon: AppIcons.listTodo, title: 'Даалгавар олдсонгүй');
    }
    final parent = task.parentTaskId == null ? null : findTask(tasks, task.parentTaskId!);
    final actions = PlannerActions(ref);
    final now = ref.watch(plannerClockProvider)();
    final pending = isPendingTask(task);
    final canChange = actions.canChange(task);
    final c = context.colors;

    return CustomScrollView(
      controller: scroll,
      slivers: [
        SliverToBoxAdapter(
          child: DetailHeader(
            title: task.title,
            subtitle: parent != null
                ? 'Эцэг даалгавар: ${parent.title}'
                : task.createdBy == null
                ? null
                : 'Өгсөн: ${memberName(task.createdBy!)}',
            chips: [
              MetaChip(label: statusLabel(task.status), icon: statusIcon(task.status), tone: statusTone(task.status)),
              ?priorityChip(task.priority),
              if (task.subject != null) MetaChip(label: subjectLabel(task.subject!), icon: AppIcons.library),
              if (task.classroom != null && task.classroom!.name.isNotEmpty)
                MetaChip(label: task.classroom!.name, icon: AppIcons.classes),
              if (task.estimateHours != null) MetaChip(label: '${task.estimateHours} цаг', icon: AppIcons.timer),
              if (isOverdue(task, now))
                const MetaChip(label: 'Хожимдсон', icon: AppIcons.warning, tone: ChipTone.error),
            ],
            primary: actions.canEdit && !pending
                ? DetailAction(label: 'Засах', icon: AppIcons.pencilLine, onPressed: () => actions.edit(context, task))
                : null,
            secondary: [
              if (actions.canEdit && !pending && parent == null)
                DetailAction(
                  label: 'Дэд даалгавар нэмэх',
                  icon: AppIcons.add,
                  onPressed: () => actions.create(context, parent: task),
                ),
            ],
          ),
        ),
        _section(context, 'Төлөв'),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          sliver: SliverToBoxAdapter(
            child: Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final s in TaskStatus.values)
                  ChoiceChip(
                    key: ValueKey('status:${s.api}'),
                    avatar: Icon(statusIcon(s), size: 16, color: MetaChip.toneColor(context, statusTone(s))),
                    label: Text(statusLabel(s)),
                    selected: task.status == s,
                    showCheckmark: false,
                    selectedColor: c.brandTint,
                    materialTapTargetSize: MaterialTapTargetSize.padded,
                    onSelected: canChange ? (_) => actions.changeStatus(context, task, s) : null,
                  ),
              ],
            ),
          ),
        ),
        if (!canChange && !pending)
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
            sliver: SliverToBoxAdapter(
              child: Text('Танд оноогдсон даалгаврын төлөвийг л солино', style: context.text.bodySmall),
            ),
          ),
        _section(context, 'Хугацаа'),
        SliverToBoxAdapter(
          child: Column(
            children: [
              _InfoRow(
                icon: AppIcons.calendar,
                label: 'Эхлэх',
                value: task.startDate == null ? 'Тавиагүй' : formatTaskDate(task.startDate!, now),
              ),
              _InfoRow(
                icon: AppIcons.calendarCheck,
                label: 'Дуусах',
                value: task.dueDate == null ? 'Тавиагүй' : formatTaskDate(task.dueDate!, now),
              ),
            ],
          ),
        ),
        if (task.description != null) ...[
          _section(context, 'Тайлбар'),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            sliver: SliverToBoxAdapter(child: SelectableText(task.description!, style: context.text.bodyMedium)),
          ),
        ],
        _section(context, 'Хариуцах ажилтан'),
        if (task.assignees.isEmpty)
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            sliver: SliverToBoxAdapter(child: Text('Оноогоогүй', style: context.text.bodyMedium)),
          )
        else
          SliverList.builder(
            itemCount: task.assignees.length,
            itemBuilder: (context, i) => _InfoRow(icon: AppIcons.user, label: memberName(task.assignees[i])),
          ),
        if (parent == null && task.subtasks.isNotEmpty) ...[
          _section(context, 'Дэд даалгавар ${task.subtasks.length}'),
          SliverList.builder(
            itemCount: task.subtasks.length,
            itemBuilder: (context, i) {
              final s = task.subtasks[i];
              return ListTile(
                key: ValueKey('subtask:${s.id}'),
                minTileHeight: AppSizes.minTap,
                leading: StatusGlyph(s.status),
                title: Text(s.title),
                subtitle: s.dueDate == null ? null : Text(dueLabel(s.dueDate!, now)),
                trailing: const Icon(AppIcons.forward, size: 18),
                onTap: () => showTaskDetailSheet(context, id: s.id),
              );
            },
          ),
        ],
        SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl + MediaQuery.viewPaddingOf(context).bottom)),
      ],
    );
  }

  static Widget _section(BuildContext context, String title) => SliverPadding(
    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xl, AppSpace.gutter, AppSpace.sm),
    sliver: SliverToBoxAdapter(
      child: Semantics(header: true, child: Text(title, style: context.text.titleSmall)),
    ),
  );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, this.value});

  final IconData icon;
  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: AppSizes.minTap),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
        child: Row(
          children: [
            Icon(icon, size: 18, color: c.inkDim),
            const SizedBox(width: AppSpace.md),
            Expanded(child: Text(label, style: context.text.bodyMedium)),
            if (value != null) Text(value!, style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
          ],
        ),
      ),
    );
  }
}
