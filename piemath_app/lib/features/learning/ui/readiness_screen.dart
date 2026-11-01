import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/readiness_models.dart';
import '../data/readiness_repository.dart';
import 'inline_message.dart';

/// `/app/readiness` — ЭЕШ-ийн бэлэн байдлын баримжаа. Тооцоолол серверт; албан оноо биш гэдгийг тодорхой хэлнэ.
class ReadinessScreen extends ConsumerWidget {
  const ReadinessScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(readinessProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Бэлэн байдал')),
      body: async.when(
        loading: () => const LoadingState(cards: 3),
        error: (e, _) => ErrorState(
          title: 'Бэлэн байдал ачаалж чадсангүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(readinessProvider),
        ),
        data: (r) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(readinessProvider);
            await ref.read(readinessProvider.future);
          },
          child: ListView(
            padding: const EdgeInsets.all(AppSpace.gutter),
            children: [
              _Summary(r: r),
              if (r.weeks.any((w) => w.hasData)) ...[
                const SectionHeader(title: '8 долоо хоногийн өөрчлөлт'),
                _History(weeks: r.weeks),
              ],
              if (r.measuredTopics.isNotEmpty) ...[
                const SectionHeader(title: 'Сэдвийн эзэмшил'),
                AppCard(
                  child: Column(
                    children: [
                      for (final (i, t) in r.measuredTopics.indexed) ...[
                        if (i > 0) const SizedBox(height: AppSpace.lg),
                        _TopicRow(topic: t),
                      ],
                    ],
                  ),
                ),
                if (r.topics.any((t) => !t.measured))
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpace.sm),
                    child: Text(
                      'Хэмжигдээгүй ${r.topics.where((t) => !t.measured).length} сэдэв байна. Бодлого бодох тусам нэмэгдэнэ',
                      style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                    ),
                  ),
              ],
              if (r.hasEvidence && r.nextBest.isNotEmpty) ...[
                const SectionHeader(title: 'Дараагийн алхам'),
                for (final t in r.nextBest) _NextStep(topic: t),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.r});

  final Readiness r;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (!r.hasEvidence) {
      return AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Бэлэн байдлыг тооцох оролдлого алга', style: context.text.titleSmall),
            const SizedBox(height: AppSpace.xs),
            Text(
              'Дасгал, тест хийх тусам энд сэдэв тус бүрийн зураг гарна',
              style: context.text.bodyMedium?.copyWith(color: c.inkDim),
            ),
            const SizedBox(height: AppSpace.lg),
            FilledButton(onPressed: () => context.push('/app/practice'), child: const Text('Дасгал эхлэх')),
          ],
        ),
      );
    }
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            label: 'Бэлэн байдлын баримжаа ойролцоогоор ${r.index}, муж ${r.low}-аас ${r.high}',
            excludeSemantics: true,
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.end,
              spacing: AppSpace.md,
              children: [
                Text('~${r.index}', style: context.text.displaySmall?.copyWith(fontWeight: FontWeight.w700)),
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.sm),
                  child: Text(
                    'баримжаа муж ${r.low}-${r.high}',
                    style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.md),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(value: r.index / 100, minHeight: 8),
          ),
          const SizedBox(height: AppSpace.md),
          Meta(
            items: ['${r.coverage}% сэдэв хамрагдсан', '${r.dataPoints} оролдлого'],
            style: context.text.bodySmall?.copyWith(color: c.inkDim),
          ),
          const SizedBox(height: AppSpace.sm),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(AppIcons.info, size: 18, color: c.inkDim),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Text(
                  'Сүүлийн 60 хоногийн оролдлогоос тооцсон баримжаа. Муж нь үнэлгээний тодорхойгүй байдлыг заана, ЭЕШ-ийн албан оноо биш',
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _History extends StatelessWidget {
  const _History({required this.weeks});

  final List<ReadinessWeek> weeks;

  String _label(String week) {
    final d = parseDateKey(week);
    return d == null ? week : '${d.month}.${d.day}';
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const maxH = 96.0;
    return AppCard(
      child: MergeSemantics(
        child: Semantics(
          label:
              'Сүүлийн ${weeks.length} долоо хоногийн бэлэн байдал: ${[for (final w in weeks) w.hasData ? '${w.index}' : 'хэмжээгүй'].join(', ')}',
          excludeSemantics: true,
          child: Column(
            children: [
              SizedBox(
                height: maxH + 20,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    for (final w in weeks)
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              w.hasData ? '${w.index}' : '',
                              style: context.text.labelSmall?.copyWith(color: c.inkDim),
                            ),
                            const SizedBox(height: 2),
                            Container(
                              height: w.hasData ? (maxH * w.index / 100).clamp(4, maxH) : 4,
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              decoration: BoxDecoration(
                                color: w.hasData ? c.brand : c.line,
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpace.sm),
              Row(
                children: [
                  for (final w in weeks)
                    Expanded(
                      child: Text(
                        _label(w.week),
                        textAlign: TextAlign.center,
                        style: context.text.labelSmall?.copyWith(color: c.inkDim),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AppSpace.sm),
              Text(
                'Хоосон багана = тэр долоо хоногт хэмжилт байгаагүй',
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopicRow extends StatelessWidget {
  const _TopicRow({required this.topic});

  final ReadinessTopic topic;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (icon, trendText) = switch (topic.trend) {
      ReadinessTrend.up => (AppIcons.trendingUp, 'өсөж байна'),
      ReadinessTrend.down => (AppIcons.trendingDown, 'буурч байна'),
      ReadinessTrend.flat => (AppIcons.minus, 'тогтвортой'),
    };
    final m = topic.mastery ?? 0;
    return Semantics(
      label: '${topic.title}: $m%, ${topic.attempts} оролдлого, $trendText',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(topic.title, style: context.text.titleSmall)),
              Text('$m%', style: context.text.titleSmall),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(value: m / 100, minHeight: 6),
          ),
          const SizedBox(height: AppSpace.xs),
          Row(
            children: [
              Icon(icon, size: 16, color: c.inkDim),
              const SizedBox(width: AppSpace.xs),
              Expanded(
                child: Text(
                  '${topic.attempts} оролдлого, $trendText',
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _NextStep extends StatelessWidget {
  const _NextStep({required this.topic});

  final ReadinessTopic topic;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hint = topic.measured && topic.mastery != null
        ? '${topic.mastery}% эзэмшил, ${topic.attempts} оролдлого. Богино давтлагаас эхэлж болно'
        : 'Одоогоор хэмжигдээгүй. Энэ сэдвээр эхний бодлогоо бодож болно';
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(topic.title, style: context.text.titleSmall),
            const SizedBox(height: AppSpace.xs),
            Text(hint, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
            const SizedBox(height: AppSpace.md),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                FilledButton(onPressed: () => context.push('/app/practice'), child: const Text('Дасгал')),
                OutlinedButton(onPressed: () => context.push('/app/mistakes'), child: const Text('Алдаагаа давтах')),
                OutlinedButton(onPressed: () => context.push('/app/formulas'), child: const Text('Томьёо')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
