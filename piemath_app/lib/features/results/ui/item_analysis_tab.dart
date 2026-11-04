import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../teacher/application/teacher_providers.dart' show errorText;
import '../application/results_providers.dart';
import '../data/results_models.dart';
import '../domain/results_logic.dart';
import 'results_widgets.dart';

/// «Бодлого» таб — вэбийн «Тойм» + «Бодлого» (`components/exams/OverviewTab`, `ProblemsTab`): өгсөн/нийт,
/// дундаж, медиан, тархалт, анги харьцуулалт, анхаарах бодлого, сэдвийн эзэмшил, бодлого бүрийн зөв хувь,
/// A–E тархалт, ялгах чадвар.
///
/// Зөв хариуны үсэг, бодлогын агуулга, бодолтыг апп харуулахгүй (хариуны хаалт) — зөвхөн тоо.
class ItemAnalysisTab extends ConsumerWidget {
  const ItemAnalysisTab({super.key, required this.testId, required this.classId, required this.onClassChanged});

  final String testId;
  final String? classId;
  final ValueChanged<String?> onClassChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = (testId: testId, classId: classId);
    final async = ref.watch(examAnalyticsProvider(key));
    return async.when(
      skipLoadingOnRefresh: false,
      skipLoadingOnReload: true,
      loading: () => const LoadingState(cards: 4),
      error: (e, _) => ErrorState(
        message: errorText(e, 'Бодлогын анализ ачаалж чадсангүй'),
        onRetry: () => ref.invalidate(examAnalyticsProvider(key)),
      ),
      data: (a) => RefreshIndicator(
        onRefresh: () => ref.refresh(examAnalyticsProvider(key).future).then((_) {}, onError: (_) {}),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: ClassChips(options: a.chips, selected: classId, onSelected: onClassChanged),
            ),
            ..._body(context, a),
            const SliverPadding(padding: EdgeInsets.only(bottom: AppSpace.xxl)),
          ],
        ),
      ),
    );
  }

  List<Widget> _body(BuildContext context, ExamAnalytics a) {
    final s = a.summary;
    if (s.students == 0 && a.items.isEmpty) {
      return const [
        SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(icon: AppIcons.students, title: 'Оноосон анги алга'),
        ),
      ];
    }
    final part1 = [
      for (final i in a.items)
        if (i.part == 1) i,
    ];
    final part2 = [
      for (final i in a.items)
        if (i.part == 2) i,
    ];
    final manualOnly = a.markedStudents - a.onlineStudents;
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
        sliver: SliverToBoxAdapter(
          child: StatRow(
            tiles: [
              StatTile(
                label: 'Өгсөн',
                value: '${s.taken}/${s.expected}',
                hint: s.pending > 0 ? '${s.pending} хүлээгдэж буй' : null,
              ),
              StatTile(
                label: 'Дундаж',
                value: _pct(s.avg),
                hint: s.max == null ? null : 'их ${s.max}%, бага ${s.min}%',
              ),
              StatTile(label: 'Медиан', value: _pct(s.median)),
              StatTile(label: 'Ирээгүй', value: '${s.absent}'),
            ],
          ),
        ),
      ),
      if (s.taken == 0)
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.only(top: AppSpace.xl),
            child: EmptyState(icon: AppIcons.hourglass, title: 'Дүн хараахан ороогүй'),
          ),
        )
      else ...[
        if (a.reliability != null)
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.sm, 0),
            sliver: SliverToBoxAdapter(child: _ReliabilityLine(level: a.reliability!)),
          ),
        const SliverSection(title: 'Тархалт'),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          sliver: SliverToBoxAdapter(child: HistogramBars(bins: a.histogram)),
        ),
        if (a.classes.length > 1) ...[
          const SliverSection(title: 'Ангиар'),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            sliver: SliverList.separated(
              itemCount: a.classes.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
              itemBuilder: (context, i) =>
                  _ClassCompareRow(row: a.classes[i], onTap: () => onClassChanged(a.classes[i].id)),
            ),
          ),
        ],
        if (a.attentionItems.isNotEmpty) ...[
          SliverSection(title: 'Анхаарах ${a.attentionItems.length} бодлого'),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            sliver: SliverList.separated(
              itemCount: a.attentionItems.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
              itemBuilder: (context, i) => _AttentionRow(item: a.attentionItems[i]),
            ),
          ),
        ],
        if (a.topics.length > 1) ...[
          const SliverSection(title: 'Сэдвийн эзэмшил'),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            sliver: SliverList.builder(
              itemCount: a.topics.length,
              itemBuilder: (context, i) => TopicBarRow(topic: a.topics[i]),
            ),
          ),
        ],
      ],
      if (a.items.isEmpty)
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.only(top: AppSpace.xl),
            child: EmptyState(icon: AppIcons.checklist, title: 'Энэ шалгалтад бодлого алга'),
          ),
        )
      else ...[
        SliverSection(
          title: part2.isEmpty ? 'Бодлого бүрээр' : 'I хэсэг',
          trailing: const InfoHint(
            title: 'Бодлогын анализын тайлбар',
            message:
                'Зөв хувь: ногоон 70%-иас дээш, шар 40–70%, улаан 40%-иас доош. A–E тархалт зөвхөн онлайнаар өгсөн '
                'сурагчийн хариугаар, гараар шивсэн дүнд зөвхөн зөв, буруу мэдэгддэг. «Сайн ялгадаг» нь сайн сурагчид '
                'сул сурагчдаас илүү зөв бодсон, «Асуудалтай» нь эсрэгээрээ тул бодлогыг шалгана уу. Ялгах чадвар '
                '10-аас дээш сурагчтай үед бодогдоно',
          ),
        ),
        if (a.markedStudents == 0)
          const _NoteSliver(text: 'Бодлого бүрийн дүн хараахан ороогүй')
        else if (manualOnly > 0 && a.onlineStudents > 0)
          _NoteSliver(
            text: 'A–E тархалт: онлайнаар өгсөн ${a.onlineStudents} сурагч ($manualOnly гар шивэлт тооцогдоогүй)',
          ),
        if (a.markedStudents > 0 && a.markedStudents < s.taken)
          _NoteSliver(text: '${s.taken - a.markedStudents} сурагчийн зөвхөн нийт оноо орсон тул задаргаанд ороогүй'),
        _itemsSliver(part1),
        if (part2.isNotEmpty) ...[const SliverSection(title: 'II хэсэг'), _itemsSliver(part2)],
      ],
    ];
  }

  Widget _itemsSliver(List<ItemStat> items) => SliverPadding(
    padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
    sliver: SliverList.separated(
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
      itemBuilder: (context, i) => ItemStatCard(item: items[i]),
    ),
  );

  static String _pct(int? v) => v == null ? '—' : '$v%';
}

class _NoteSliver extends StatelessWidget {
  const _NoteSliver({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => SliverPadding(
    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.sm),
    sliver: SliverToBoxAdapter(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(AppIcons.info, size: 16, color: context.colors.inkDim),
          const SizedBox(width: AppSpace.sm),
          Expanded(
            child: Text(text, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
          ),
        ],
      ),
    ),
  );
}

class _ReliabilityLine extends StatelessWidget {
  const _ReliabilityLine({required this.level});

  final ReliabilityLevel level;

  @override
  Widget build(BuildContext context) {
    final tone = switch (level) {
      ReliabilityLevel.good => ChipTone.success,
      ReliabilityLevel.fair => ChipTone.warning,
      ReliabilityLevel.low => ChipTone.error,
    };
    return Row(
      children: [
        Icon(AppIcons.gauge, size: 18, color: MetaChip.toneColor(context, tone)),
        const SizedBox(width: AppSpace.sm),
        Expanded(child: Text('Шалгалтын найдвартай байдал: ${level.text}', style: context.text.bodyMedium)),
        const InfoHint(
          title: 'Найдвартай байдлын тайлбар',
          message:
              'Бодлогууд нэг чадварыг тууштай хэмжиж байгаа эсэх. Ногоон нь найдвартай, шар нь дунд зэрэг, улаан нь сул '
              'тул дүнг болгоомжтой тайлбарлана. 10-аас дээш сурагчтай үед бодогдоно',
        ),
      ],
    );
  }
}

/// Онооны тархалт — 5 багана, хэмнэлттэй.
class HistogramBars extends StatelessWidget {
  const HistogramBars({super.key, required this.bins});

  final List<int> bins;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final max = bins.fold<int>(1, (m, v) => v > m ? v : m);
    return SizedBox(
      height: 120,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (var i = 0; i < bins.length && i < histogramLabels.length; i++)
            Expanded(
              child: Semantics(
                label: '${histogramLabels[i]} хувьд ${bins[i]} сурагч',
                excludeSemantics: true,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text('${bins[i]}', style: context.text.labelMedium),
                      const SizedBox(height: 2),
                      Container(
                        height: 4 + 64 * bins[i] / max,
                        decoration: BoxDecoration(
                          color: bins[i] > 0 ? c.brandBright : c.line,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.sm / 2)),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text('${histogramLabels[i]}%', style: context.text.labelSmall?.copyWith(color: c.inkDim)),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ClassCompareRow extends StatelessWidget {
  const _ClassCompareRow({required this.row, required this.onTap});

  final ClassCompare row;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => AppCard(
    onTap: onTap,
    padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
    child: Row(
      children: [
        Expanded(
          child: ItemRow(title: row.name, meta: ['${row.taken}/${row.students} өгсөн']),
        ),
        PercentText(percent: row.avg),
      ],
    ),
  );
}

class _AttentionRow extends StatelessWidget {
  const _AttentionRow({required this.item});

  final ItemStat item;

  @override
  Widget build(BuildContext context) {
    final w = item.choices?.mostWrong;
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
      child: Row(
        children: [
          Icon(AppIcons.warning, size: 18, color: context.colors.warning),
          const SizedBox(width: AppSpace.md),
          SizedBox(width: 48, child: Text(item.name, style: context.text.titleSmall)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${item.percent ?? 0}% зөв', style: context.text.titleSmall),
                if (w != null)
                  Text(
                    'Ихэнх нь ${w.letter}-г сонгосон${w.note != null && w.note!.isNotEmpty ? ' (${w.note})' : ''}',
                    style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Нэг бодлого (зүйл): зөв хувь, зурвас, тоо, ялгах чадвар, A–E тархалт. Зөв хариуг тэмдэглэхгүй.
class ItemStatCard extends StatelessWidget {
  const ItemStatCard({super.key, required this.item});

  final ItemStat item;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final tone = toneOfCorrect(correctTone(item.percent));
    final disc = item.discrimination;
    final ch = item.choices;
    return AppCard(
      padding: const EdgeInsets.all(AppSpace.md),
      semanticLabel: '${item.name}, ${item.percent == null ? 'дүнгүй' : '${item.percent}% зөв'}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(width: 56, child: Text(item.name, style: context.text.titleSmall)),
              Expanded(
                child: PercentBar(percent: item.percent, tone: tone),
              ),
              SizedBox(
                width: 56,
                child: Text(
                  item.percent == null ? '—' : '${item.percent}%',
                  textAlign: TextAlign.right,
                  style: context.text.titleSmall,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                '${item.correct}/${item.marked} зөв${item.blank > 0 ? ', ${item.blank} хоосон' : ''}',
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
              if (disc != null)
                MetaChip(
                  label: disc.text,
                  icon: switch (disc) {
                    DiscriminationLabel.good => AppIcons.success,
                    DiscriminationLabel.weak => AppIcons.circleMinus,
                    DiscriminationLabel.problem => AppIcons.warning,
                  },
                  tone: switch (disc) {
                    DiscriminationLabel.good => ChipTone.success,
                    DiscriminationLabel.weak => ChipTone.warning,
                    DiscriminationLabel.problem => ChipTone.error,
                  },
                ),
            ],
          ),
          if (ch != null && (ch.counts.isNotEmpty || ch.blank > 0)) ...[
            const SizedBox(height: AppSpace.sm),
            Wrap(
              spacing: AppSpace.xs,
              runSpacing: AppSpace.xs,
              children: [
                for (final e in ch.counts.entries)
                  _ChoiceCount(letter: e.key, count: e.value, mostWrong: ch.mostWrong?.letter == e.key),
                if (ch.blank > 0) _ChoiceCount(letter: 'Хоосон', count: ch.blank, mostWrong: false),
              ],
            ),
          ],
          if (disc == DiscriminationLabel.problem) ...[
            const SizedBox(height: AppSpace.xs),
            Text(
              'Сайн сурагчид сул сурагчдаас илүү алдсан тул бодлогыг шалгана уу (нөхцөл, хариуны түлхүүр)',
              style: context.text.bodySmall?.copyWith(color: c.inkDim),
            ),
          ],
        ],
      ),
    );
  }
}

class _ChoiceCount extends StatelessWidget {
  const _ChoiceCount({required this.letter, required this.count, required this.mostWrong});

  final String letter;
  final int count;
  final bool mostWrong;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final color = mostWrong ? c.error : c.inkDim;
    return Semantics(
      label: mostWrong ? '$letter $count, хамгийн олон сонгосон буруу хариу' : '$letter $count',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: 2),
        decoration: BoxDecoration(
          border: Border.all(color: mostWrong ? c.error : c.line),
          borderRadius: BorderRadius.circular(AppRadius.sm),
        ),
        child: Text('$letter $count', style: context.text.labelMedium?.copyWith(color: color)),
      ),
    );
  }
}
