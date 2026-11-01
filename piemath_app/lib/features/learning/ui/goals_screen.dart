import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/goal_models.dart';
import '../data/goals_repository.dart';
import '../learning_icons.dart';
import 'inline_message.dart';

IconData _statusIcon(GoalStatus s) => switch (s) {
  GoalStatus.planned => LearningIcons.pending,
  GoalStatus.inProgress => LearningIcons.inProgress,
  GoalStatus.done => LearningIcons.done,
  GoalStatus.blocked => LearningIcons.blocked,
  GoalStatus.cancelled => LearningIcons.cancelled,
};

Color _statusColor(AppColors c, GoalStatus s) => switch (s) {
  GoalStatus.done => c.success,
  GoalStatus.inProgress => c.brand,
  GoalStatus.blocked => c.warning,
  _ => c.inkDim,
};

/// `/app/goals` — сурагчийн өөрийн зорилгууд. Хугацаа хэтэрсэн ч улаан/зэмлэл үгүй (UX-RESEARCH §10).
class GoalsScreen extends ConsumerWidget {
  const GoalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(goalsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Зорилго')),
      floatingActionButton: async.hasValue
          ? FloatingActionButton.extended(
              onPressed: () => showGoalSheet(context),
              icon: const Icon(LearningIcons.add),
              label: const Text('Зорилго нэмэх'),
            )
          : null,
      body: async.when(
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          title: 'Зорилго ачаалж чадсангүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(goalsProvider),
        ),
        data: (all) {
          if (all.isEmpty) {
            return EmptyState(
              icon: AppIcons.goal,
              title: 'Зорилго хараахан алга',
              message: 'Жишээ нь «Уламжлалын бүлгийг дуусгах» гэж бичээд хугацаа тавьж болно',
              action: FilledButton.icon(
                onPressed: () => showGoalSheet(context),
                icon: const Icon(LearningIcons.add, size: 18),
                label: const Text('Зорилго нэмэх'),
              ),
            );
          }
          final active = sortGoals(all.where((g) => g.status.isActive));
          final finished = sortGoals(all.where((g) => !g.status.isActive));
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(goalsProvider);
              await ref.read(goalsProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.gutter, AppSpace.gutter, 96),
              children: [
                if (active.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpace.md),
                    child: Text('Идэвхтэй зорилго алга', style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
                  ),
                for (final g in active) _GoalCard(goal: g),
                if (finished.isNotEmpty) ...[
                  const SectionHeader(title: 'Дууссан'),
                  for (final g in finished) _GoalCard(goal: g),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _GoalCard extends ConsumerStatefulWidget {
  const _GoalCard({required this.goal});

  final Goal goal;

  @override
  ConsumerState<_GoalCard> createState() => _GoalCardState();
}

class _GoalCardState extends ConsumerState<_GoalCard> {
  bool _busy = false;

  Future<void> _complete() async {
    if (_busy) return;
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(goalsRepositoryProvider).setStatus(widget.goal.id, GoalStatus.done);
      ref.invalidate(goalsProvider);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(errorText(e, 'Хадгалж чадсангүй. Дахин оролдоно уу'))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final g = widget.goal;
    final done = !g.status.isActive;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: AppCard(
        onTap: () => showGoalSheet(context, goal: g),
        semanticLabel: 'Зорилго засах: ${g.title}, ${g.status.label}',
        child: Row(
          children: [
            Icon(_statusIcon(g.status), color: _statusColor(c, g.status)),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    g.title,
                    style: context.text.titleSmall?.copyWith(color: done ? c.inkDim : null),
                  ),
                  if (g.description != null)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpace.xs),
                      child: Text(g.description!, maxLines: 2, overflow: TextOverflow.ellipsis, style: context.text.bodySmall),
                    ),
                  Meta(
                    items: [
                      g.status.label,
                      if (g.subject != null) g.subject!.label,
                      if (g.targetDate != null) DateMn.long(g.targetDate!, withYear: true),
                    ],
                    style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  ),
                ],
              ),
            ),
            if (g.status.isActive)
              IconButton(
                tooltip: 'Биелсэн гэж тэмдэглэх',
                constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
                onPressed: _busy ? null : _complete,
                icon: const Icon(AppIcons.check),
              ),
          ],
        ),
      ),
    );
  }
}

/// Зорилго нэмэх ([goal] үгүй) эсвэл засах хуудас.
Future<void> showGoalSheet(BuildContext context, {Goal? goal}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (_) => GoalSheet(goal: goal),
);

class GoalSheet extends ConsumerStatefulWidget {
  const GoalSheet({super.key, this.goal});

  final Goal? goal;

  @override
  ConsumerState<GoalSheet> createState() => _GoalSheetState();
}

class _GoalSheetState extends ConsumerState<GoalSheet> {
  late final _title = TextEditingController(text: widget.goal?.title ?? '');
  late final _desc = TextEditingController(text: widget.goal?.description ?? '');
  late GoalStatus _status = widget.goal?.status ?? GoalStatus.planned;
  late GoalSubject? _subject = widget.goal?.subject;
  late UbDateTime? _date = widget.goal?.targetDate;
  bool _busy = false;
  String? _error;

  bool get _editing => widget.goal != null;

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = UbDateTime.now();
    final initial = _date ?? now;
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(initial.year, initial.month, initial.day),
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
      helpText: 'Зорилтот өдөр',
      cancelText: AppStrings.cancel,
      confirmText: AppStrings.ok,
    );
    if (picked != null) setState(() => _date = UbDateTime(picked.year, picked.month, picked.day));
  }

  Future<void> _save() async {
    final title = _title.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Зорилгоо бичнэ үү');
      return;
    }
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final repo = ref.read(goalsRepositoryProvider);
    try {
      if (_editing) {
        await repo.update(
          widget.goal!.id,
          title: title,
          description: _desc.text,
          targetDate: _date,
          status: _status,
          subject: _subject,
        );
      } else {
        await repo.create(title: title, description: _desc.text, targetDate: _date, status: _status, subject: _subject);
      }
      ref.invalidate(goalsProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Хадгалж чадсангүй. Дахин оролдоно уу'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(AppSpace.xl, 0, AppSpace.xl, AppSpace.xl + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(_editing ? 'Зорилго засах' : 'Шинэ зорилго', style: context.text.titleMedium),
          const SizedBox(height: AppSpace.lg),
          TextField(
            controller: _title,
            maxLength: 120,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(labelText: 'Зорилго', counterText: ''),
            onChanged: (_) {
              if (_error != null) setState(() => _error = null);
            },
          ),
          const SizedBox(height: AppSpace.md),
          TextField(
            controller: _desc,
            maxLength: 500,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'Тайлбар (заавал биш)', counterText: ''),
          ),
          const SizedBox(height: AppSpace.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _pickDate,
                  icon: const Icon(AppIcons.calendar, size: 18),
                  label: Text(_date == null ? 'Хугацаа тавих' : DateMn.long(_date!, withYear: true)),
                ),
              ),
              if (_date != null)
                IconButton(
                  tooltip: 'Хугацааг арилгах',
                  constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
                  onPressed: _busy ? null : () => setState(() => _date = null),
                  icon: const Icon(AppIcons.close),
                ),
            ],
          ),
          const SizedBox(height: AppSpace.lg),
          Text('Хичээл', style: context.text.labelLarge?.copyWith(color: c.inkDim)),
          const SizedBox(height: AppSpace.sm),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.sm,
            children: [
              for (final s in GoalSubject.values)
                _OptionChip(
                  label: s.label,
                  selected: _subject == s,
                  onTap: _busy ? null : () => setState(() => _subject = _subject == s ? null : s),
                ),
            ],
          ),
          if (_editing) ...[
            const SizedBox(height: AppSpace.lg),
            Text('Төлөв', style: context.text.labelLarge?.copyWith(color: c.inkDim)),
            const SizedBox(height: AppSpace.sm),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final s in GoalStatus.values)
                  _OptionChip(
                    label: s.label,
                    icon: _statusIcon(s),
                    selected: _status == s,
                    onTap: _busy ? null : () => setState(() => _status = s),
                  ),
              ],
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: AppSpace.md),
            InlineMessage(_error!),
          ],
          const SizedBox(height: AppSpace.xl),
          FilledButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Хадгалж байна' : AppStrings.save)),
        ],
      ),
    );
  }
}

/// Сонгох товч (48dp-ээс багагүй). Сонгосон нь дүрс/хүрээгээр ялгагдана, зөвхөн өнгөөр биш.
class _OptionChip extends StatelessWidget {
  const _OptionChip({required this.label, required this.selected, required this.onTap, this.icon});

  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: AppSizes.minTap),
      child: FilterChip(
        label: Text(label),
        avatar: icon == null ? null : Icon(icon, size: 18),
        selected: selected,
        showCheckmark: true,
        onSelected: onTap == null ? null : (_) => onTap!(),
        materialTapTargetSize: MaterialTapTargetSize.padded,
      ),
    );
  }
}
