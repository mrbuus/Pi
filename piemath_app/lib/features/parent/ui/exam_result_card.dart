import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../data/parent_models.dart';
import '../data/parent_repository.dart';
import '../domain/parent_labels.dart';

/// Эцэг эхийн «Хамгийн сүүлийн дүн» карт (вэбийн `ExamResultCard`): оноо, хувь, хэсэг, сул сэдэв,
/// «Дүнтэй танилцлаа». Карт ачаалагдахгүй бол энгийн мөр ([fallback]).
class ExamResultCard extends ConsumerWidget {
  const ExamResultCard({super.key, required this.result, required this.onAcknowledge});

  final TestResultEntry result;
  final VoidCallback onAcknowledge;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(examResultCardProvider(result.id));
    return async.when(
      loading: () => const SkeletonPulse(child: SkeletonCard(lines: 3)),
      error: (_, _) => _Fallback(result: result),
      data: (card) => _CardBody(card: card, onAcknowledge: onAcknowledge),
    );
  }
}

class _Fallback extends StatelessWidget {
  const _Fallback({required this.result});

  final TestResultEntry result;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Хамгийн сүүлийн дүн', style: context.text.titleSmall),
          const SizedBox(height: AppSpace.xs),
          MetaTitle(result.test.title, style: context.text.bodyMedium),
          if (result.totalScore != null && result.maxScore != null)
            Text('${_n(result.totalScore!)}/${_n(result.maxScore!)} оноо', style: context.text.bodyMedium),
          Meta(items: [resultSourceLabel(result.source), dayLabel(result.createdAt)]),
        ],
      ),
    );
  }
}

class _CardBody extends StatelessWidget {
  const _CardBody({required this.card, required this.onAcknowledge});

  final ExamResultCardData card;
  final VoidCallback onAcknowledge;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final pct = card.percent.clamp(0, 100);
    final tone = pct >= 70
        ? c.success
        : pct >= 40
        ? c.warning
        : c.error;
    final parts = card.parts;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Хамгийн сүүлийн дүн', style: context.text.titleSmall),
          MetaTitle(card.test.title, style: context.text.bodySmall),
          const SizedBox(height: AppSpace.sm),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(_n(card.totalScore), style: context.text.displayMedium),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text('/${_n(card.maxScore)}', style: context.text.titleMedium?.copyWith(color: c.inkDim)),
              ),
              const SizedBox(width: AppSpace.md),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text('${_n(card.percent)}%', style: context.text.titleMedium),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          Semantics(
            label: '${_n(card.percent)} хувь',
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.pill),
              child: LinearProgressIndicator(value: pct / 100, minHeight: 8, color: tone, backgroundColor: c.line),
            ),
          ),
          if (parts != null && parts.part2Max > 0) ...[
            const SizedBox(height: AppSpace.sm),
            Text(
              'I хэсэг ${_n(parts.part1)}/${_n(parts.part1Max)}, II хэсэг ${_n(parts.part2)}/${_n(parts.part2Max)}',
              style: context.text.bodySmall,
            ),
          ],
          if (card.weakTopics.isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            Text('Анхаарах сэдэв', style: context.text.titleSmall),
            for (final t in card.weakTopics)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.xs),
                child: Row(
                  children: [
                    Expanded(child: MetaTitle(t.name, style: context.text.bodyMedium)),
                    Text(
                      '${_n(t.percent)}%',
                      style: context.text.labelLarge?.copyWith(
                        color: t.percent < 40
                            ? c.error
                            : t.percent < 70
                            ? c.warning
                            : c.ink,
                      ),
                    ),
                  ],
                ),
              ),
          ],
          const SizedBox(height: AppSpace.sm),
          Text(dayLabel(card.takenAt), style: context.text.bodySmall),
          const SizedBox(height: AppSpace.sm),
          if (card.acknowledgedAt != null)
            Row(
              children: [
                Icon(AppIcons.success, size: 16, color: c.success),
                const SizedBox(width: AppSpace.xs),
                Text('Танилцсан, ${dayLabel(card.acknowledgedAt)}', style: context.text.labelMedium),
              ],
            )
          else if (card.canAcknowledge)
            OutlinedButton.icon(
              onPressed: onAcknowledge,
              icon: const Icon(AppIcons.mailCheck, size: 18),
              label: const Text('Дүнтэй танилцлаа'),
            ),
        ],
      ),
    );
  }
}

String _n(num v) => v == v.roundToDouble() ? v.round().toString() : v.toStringAsFixed(1);
