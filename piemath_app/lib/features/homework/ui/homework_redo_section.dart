import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../data/homework_models.dart';
import '../domain/homework_logic.dart';
import 'homework_providers.dart';

/// «Дахин бодох» (вэбийн `HomeworkRedo`): хичээлээс хойш N хичээл өнгөрсний дараа А, Б тестээ НЭГ удаа
/// дахин бодно. Анхны дүн хэвээр, дахин бодсон дүн тусдаа. Хоосон эсвэл алдаатай бол харагдахгүй.
class HomeworkRedoSection extends ConsumerWidget {
  const HomeworkRedoSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(homeworkRedoProvider).value;
    if (data == null || data.days.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionHeader(title: 'Дахин бодох', padding: EdgeInsets.only(top: AppSpace.lg, bottom: AppSpace.xs)),
        Text(
          'Хичээлээс хойш ${data.lessonsToOpen} хичээл өнгөрсний дараа А, Б тестээ нэг удаа дахин бодно',
          style: context.text.bodySmall,
        ),
        const SizedBox(height: AppSpace.sm),
        for (final d in data.days)
          Padding(padding: const EdgeInsets.only(bottom: AppSpace.md), child: _RedoDayCard(day: d)),
      ],
    );
  }
}

/// `/app/homework/:testId?date=&classroomId=&redo=1`.
String homeworkRedoPath(String testId, String date, String classroomId) => Uri(
  path: '/app/homework/${Uri.encodeComponent(testId)}',
  queryParameters: {'date': date, 'classroomId': classroomId, 'redo': '1'},
).toString();

class _RedoDayCard extends StatelessWidget {
  const _RedoDayCard({required this.day});

  final HwRedoDay day;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(dayLabel(day.date), style: context.text.titleSmall)),
              if (!day.opened)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(AppIcons.password, size: 14, color: c.inkDim),
                    const SizedBox(width: 4),
                    Text('Нээгдэхэд ${day.lessonsLeft} хичээл үлдсэн', style: context.text.labelSmall),
                  ],
                ),
            ],
          ),
          if (day.topic != null) Text(day.topic!, style: context.text.bodyMedium),
          Text(day.classroomName, style: context.text.bodySmall),
          for (final it in day.items) ...[const Divider(height: AppSpace.lg), _RedoItemRow(day: day, item: it)],
        ],
      ),
    );
  }
}

class _RedoItemRow extends StatelessWidget {
  const _RedoItemRow({required this.day, required this.item});

  final HwRedoDay day;
  final HwRedoItem item;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final again = item.again;
    final first = item.first;
    final canOpen = day.opened && (!item.locked || (again?.submitted ?? false));
    String score(HwRedoRound r) => r.score == null ? '' : ' ${r.score!.correct}/${r.score!.total}';
    final Widget? action = !day.opened
        ? null
        : item.locked && !(again?.submitted ?? false)
        ? _Pill(icon: AppIcons.password, label: 'Түр хаалттай', color: c.inkDim)
        : again?.submitted ?? false
        ? Text('Харах', style: context.text.labelMedium?.copyWith(color: c.inkDim))
        : again != null
        ? _Pill(icon: AppIcons.history, label: 'Үргэлжлүүлэх', color: c.brand)
        : _Pill(icon: AppIcons.play, label: 'Дахин бодох', color: c.brand, filled: true);
    final row = Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(cleanTitle(item.title, variantLabel: item.variantLabel), style: context.text.titleSmall),
              Meta(
                items: [
                  if (item.variantLabel != null) '${item.variantLabel} хувилбар',
                  item.inClass ? 'Ангид бодсон' : 'Гэртээ бодсон',
                  '${item.problemCount} бодлого',
                  if (item.timeLimitMin != null) '${item.timeLimitMin} мин',
                ],
              ),
              if (first != null || (again?.submitted ?? false))
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Wrap(
                    spacing: AppSpace.sm,
                    children: [
                      if (first != null) Text('Анх${score(first)}', style: context.text.labelSmall),
                      if (again != null && again.submitted)
                        Text('Дахин${score(again)}', style: context.text.labelSmall?.copyWith(color: c.success)),
                    ],
                  ),
                ),
            ],
          ),
        ),
        ?action,
        if (canOpen) Icon(AppIcons.forward, size: 18, color: c.inkDim),
      ],
    );
    if (!canOpen) return Opacity(opacity: 0.7, child: row);
    return InkWell(
      onTap: () => context.push(homeworkRedoPath(item.testId, day.date, day.classroomId)),
      child: ConstrainedBox(constraints: const BoxConstraints(minHeight: 48), child: row),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.icon, required this.label, required this.color, this.filled = false});

  final IconData icon;
  final String label;
  final Color color;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(left: AppSpace.sm),
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: 4),
      decoration: BoxDecoration(
        color: filled ? c.brand : null,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: filled ? null : Border.all(color: c.line),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: filled ? c.onBrand : color),
          const SizedBox(width: 4),
          Text(label, style: context.text.labelSmall?.copyWith(color: filled ? c.onBrand : color)),
        ],
      ),
    );
  }
}
