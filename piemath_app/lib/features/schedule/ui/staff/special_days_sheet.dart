import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_error.dart';
import '../../../../core/time/date_mn.dart';
import '../../../../core/time/ub_time.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/native/native.dart';
import '../../data/staff_schedule_models.dart';
import '../../data/staff_schedule_repository.dart';
import '../../domain/staff_schedule_logic.dart';
import 'staff_actions.dart';

/// «Онцгой өдөр» (вэбийн `SpecialDaysButton` + `CalendarAdmin`): амралт, завсарлага, шалгалтын өдөр.
/// Жилд 1–2 удаа хэрэглэдэг тул таб биш, толгойн товчоор доороос гарна. [canEdit] худал бол зөвхөн харна.
Future<void> showSpecialDaysSheet(BuildContext context, {required bool canEdit}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  backgroundColor: Colors.transparent,
  elevation: 0,
  builder: (_) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.75,
    minChildSize: 0.4,
    maxChildSize: 0.95,
    builder: (context, scroll) => Material(
      color: context.colors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg))),
      clipBehavior: Clip.antiAlias,
      child: _SpecialDays(canEdit: canEdit, controller: scroll),
    ),
  ),
);

class _SpecialDays extends ConsumerStatefulWidget {
  const _SpecialDays({required this.canEdit, required this.controller});

  final bool canEdit;
  final ScrollController controller;

  @override
  ConsumerState<_SpecialDays> createState() => _SpecialDaysState();
}

class _SpecialDaysState extends ConsumerState<_SpecialDays> {
  final _today = UbDateTime.now().dateKey;
  final _hidden = <String>{};

  Future<void> _delete(SpecialDay d) async {
    final ok = await confirmAction(context, title: 'Онцгой өдрийг устгах уу', message: '${d.date}, ${d.title}');
    if (!ok || !mounted) return;
    final c = ProviderScope.containerOf(context, listen: false);
    final messenger = ScaffoldMessenger.maybeOf(context);
    setState(() => _hidden.add(d.id));
    if (await showUndoSnack(context, message: 'Онцгой өдөр устгагдлаа')) {
      if (mounted) setState(() => _hidden.remove(d.id));
      return;
    }
    try {
      await c.read(staffScheduleRepositoryProvider).deleteSpecialDay(d.id);
      c.invalidate(specialDaysProvider);
      refreshSchedule(c);
    } catch (e) {
      if (mounted) setState(() => _hidden.remove(d.id));
      messenger?.showSnackBar(SnackBar(content: Text(e is ApiError ? e.message : MutationResult.saveFailedMessage)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(specialDaysProvider(_today));
    final c = context.colors;
    final days = [
      for (final d in async.value ?? const <SpecialDay>[])
        if (!_hidden.contains(d.id)) d,
    ]..sort((a, b) => a.date.compareTo(b.date));
    return CustomScrollView(
      controller: widget.controller,
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: AppSpace.sm),
                width: 36,
                height: 4,
                decoration: BoxDecoration(color: c.line, borderRadius: BorderRadius.circular(AppRadius.pill)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.sm, AppSpace.sm),
                child: Row(
                  children: [
                    Expanded(
                      child: Semantics(header: true, child: Text('Онцгой өдөр', style: context.text.titleLarge)),
                    ),
                    if (widget.canEdit)
                      FilledButton.icon(
                        icon: const Icon(AppIcons.add, size: 18),
                        label: const Text('Нэмэх'),
                        onPressed: () => unawaited(editSpecialDay(context)),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (async.value == null)
          SliverToBoxAdapter(
            child: async.hasError
                ? ErrorState(onRetry: () => ref.invalidate(specialDaysProvider))
                : const LoadingState(cards: 3),
          )
        else if (days.isEmpty)
          const SliverToBoxAdapter(
            child: EmptyState(icon: AppIcons.calendarOff, title: 'Удахгүй болох онцгой өдөр алга'),
          )
        else
          SliverList.builder(
            itemCount: days.length,
            itemBuilder: (context, i) {
              final d = days[i];
              final date = parseDateKey(d.date);
              return InkWell(
                onTap: widget.canEdit ? () => unawaited(editSpecialDay(context, day: d)) : null,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                  child: ItemRow(
                    title: d.title,
                    meta: [
                      if (date != null) DateMn.longWithWeekday(date, shortWeekday: true) else d.date,
                      calendarTypes[d.type] ?? d.type,
                      d.classroomIds.isEmpty ? 'Бүх анги' : '${d.classroomIds.length} анги',
                      d.note,
                    ],
                    trailing: widget.canEdit
                        ? IconButton(
                            tooltip: 'Устгах',
                            icon: Icon(AppIcons.trash, color: c.error),
                            onPressed: () => unawaited(_delete(d)),
                          )
                        : null,
                  ),
                ),
              );
            },
          ),
        const SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl)),
      ],
    );
  }
}
