import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_extras.dart';
import '../data/teacher_repository.dart';
import 'teacher_widgets.dart';

/// Ангийн эрсдэлийн шалгуур засах. ЗӨВХӨН Багш+ / Админ (`canEditCriteria`) — эрхийг сервер мөн шалгана.
/// Хадгалсны дараа [open] нь `true` буцаана (самбар эрсдэлийг дахин татна).
class CriteriaSheet extends ConsumerWidget {
  const CriteriaSheet({super.key, required this.classId});

  final String classId;

  static Future<bool> open(BuildContext context, {required String classId}) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => CriteriaSheet(classId: classId),
    );
    return saved ?? false;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(criteriaProvider(classId));
    return SafeArea(
      child: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const SizedBox(height: 280, child: LoadingState(cards: 2)),
        error: (e, _) => SizedBox(
          height: 300,
          child: ErrorState(
            message: errorText(e, 'Шалгуур нээгдсэнгүй'),
            onRetry: () => ref.invalidate(criteriaProvider(classId)),
          ),
        ),
        data: (p) => _CriteriaForm(classId: classId, payload: p),
      ),
    );
  }
}

class _CriteriaForm extends ConsumerStatefulWidget {
  const _CriteriaForm({required this.classId, required this.payload});

  final String classId;
  final CriteriaPayload payload;

  @override
  ConsumerState<_CriteriaForm> createState() => _CriteriaFormState();
}

class _CriteriaFormState extends ConsumerState<_CriteriaForm> {
  late RiskCriteria _draft = widget.payload.criteria;
  bool _busy = false;
  String? _error;

  Future<void> _save() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(teacherRepositoryProvider).saveCriteria(widget.classId, _draft);
      ref.invalidate(criteriaProvider(widget.classId));
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e is ApiError && e.message.trim().isNotEmpty ? e.message : 'Шалгуур хадгалагдсангүй';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final d = _draft;
    final defaults = widget.payload.defaults;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Эрсдэлийн шалгуур', style: context.text.titleMedium),
          const SizedBox(height: AppSpace.md),
          Text('Хэдэн хоногийг харах', style: context.text.labelLarge),
          const SizedBox(height: AppSpace.xs),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.sm,
            children: [
              for (final w in RiskCriteria.windowChoices)
                ChoiceChip(
                  label: Text('$w хоног'),
                  selected: d.windowDays == w,
                  materialTapTargetSize: MaterialTapTargetSize.padded,
                  onSelected: (_) => setState(() => _draft = d.copyWith(windowDays: w)),
                ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          _StepRow(
            label: 'Ирцийн доод хувь',
            value: d.minAttendance,
            min: 50,
            max: 100,
            step: 5,
            suffix: '%',
            onChanged: (v) => setState(() => _draft = d.copyWith(minAttendance: v)),
          ),
          _StepRow(
            label: 'Тасалсан дээд тоо',
            value: d.maxAbsences,
            min: 1,
            max: 10,
            onChanged: (v) => setState(() => _draft = d.copyWith(maxAbsences: v)),
          ),
          _StepRow(
            label: 'Хоцорсон дээд тоо',
            value: d.maxLates,
            min: 1,
            max: 10,
            onChanged: (v) => setState(() => _draft = d.copyWith(maxLates: v)),
          ),
          _StepRow(
            label: 'Даалгаврын доод хувь',
            value: d.minHomework,
            min: 0,
            max: 100,
            step: 5,
            suffix: '%',
            onChanged: (v) => setState(() => _draft = d.copyWith(minHomework: v)),
          ),
          _StepRow(
            label: 'Дараалан хийгээгүй дээд тоо',
            value: d.missingStreak,
            min: 1,
            max: 6,
            onChanged: (v) => setState(() => _draft = d.copyWith(missingStreak: v)),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpace.sm),
            Text(_error!, style: context.text.bodySmall?.copyWith(color: c.error)),
          ],
          const SizedBox(height: AppSpace.md),
          Row(
            children: [
              Expanded(
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: d == defaults
                      ? null
                      : TextButton(
                          style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                          onPressed: _busy ? null : () => setState(() => _draft = defaults),
                          child: const Text('Анхдагч болгох'),
                        ),
                ),
              ),
              FilledButton(
                style: FilledButton.styleFrom(minimumSize: const Size(120, teacherTap)),
                onPressed: _busy || d == widget.payload.criteria ? null : _save,
                child: const Text(AppStrings.save),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
    this.step = 1,
    this.suffix = '',
  });

  final String label;
  final int value;
  final int min;
  final int max;
  final int step;
  final String suffix;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: '$label $value$suffix',
    child: Row(
      children: [
        Expanded(
          child: ExcludeSemantics(child: Text(label, style: context.text.bodyMedium)),
        ),
        IconButton(
          tooltip: '$label, багасгах',
          constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
          icon: const Icon(AppIcons.minus),
          onPressed: value - step < min ? null : () => onChanged(value - step),
        ),
        SizedBox(
          width: 52,
          child: Text('$value$suffix', textAlign: TextAlign.center, style: context.text.titleSmall),
        ),
        IconButton(
          tooltip: '$label, нэмэгдүүлэх',
          constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
          icon: const Icon(AppIcons.add),
          onPressed: value + step > max ? null : () => onChanged(value + step),
        ),
      ],
    ),
  );
}
