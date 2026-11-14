import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/paper_exam_models.dart';
import '../data/paper_exams_repository.dart';
import '../domain/paper_exam_logic.dart';
import 'paper_ui.dart';

/// Сурагчийн өөрийн нэгдсэн шалгалтын дүн (вэбийн `StudentPaperDetail`, зөвхөн өөрөө харна): оноо, байр,
/// сэдэв/агуулга бүрийн хувь, алдсан бодлого бүрийн томьёо, давтах томьёо; доор нь төвийн жагсаалт
/// зөвхөн нийт оноогоор.
class StudentPaperDetailScreen extends ConsumerStatefulWidget {
  const StudentPaperDetailScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<StudentPaperDetailScreen> createState() => _StudentPaperDetailScreenState();
}

class _StudentPaperDetailScreenState extends ConsumerState<StudentPaperDetailScreen> {
  bool _onlyMissed = true;

  @override
  Widget build(BuildContext context) {
    final provider = myPaperDetailProvider(widget.id);
    final async = ref.watch(provider);
    return Scaffold(
      appBar: AppBar(title: Text(async.value?.title ?? 'Нэгдсэн шалгалт')),
      body: async.when(
        skipLoadingOnRefresh: true,
        loading: () => const LoadingState(cards: 4),
        error: (e, _) =>
            ErrorState(message: paperError(e, 'Дүнг ачаалж чадсангүй'), onRetry: () => ref.invalidate(provider)),
        data: (d) => RefreshIndicator(onRefresh: () => ref.refresh(provider.future), child: _body(context, d)),
      ),
    );
  }

  Widget _body(BuildContext context, MyPaperDetail d) {
    final c = context.colors;
    final by = d.classifyBy;
    final mine = by == ClassifyBy.topic ? d.topics : d.areas;
    final center = {for (final a in (by == ClassifyBy.topic ? d.centerTopics : d.centerAreas)) a.area: a.pct};
    final missed = d.items.where((i) => i.status.missed).toList();
    final groups = missedGroups(d.items, by);
    final formulaBy = {for (final f in d.formulas) f.slug: f};
    final review = reviewFormulas([
      for (final i in d.items) (number: i.number, slugs: i.formulaSlugs, missed: i.status.missed),
    ], d.formulas);
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        Meta(items: [dayText(d.heldOn), d.group, '${d.itemCount} бодлого']),
        const SizedBox(height: AppSpace.md),
        StatRow(
          tiles: [
            StatTile(label: 'оноо', value: '${scoreText(d.totalScore)}/${scoreText(d.maxScore)}', icon: AppIcons.goal),
            StatTile(
              label: 'хувь',
              value: d.pct == null ? '' : '${d.pct}%',
              hint: d.centerAvgPct == null ? null : 'төвийн дундаж ${d.centerAvgPct}%',
              icon: AppIcons.medal,
            ),
            StatTile(label: 'байр', value: '${d.rank}', hint: '${d.participants} сурагчаас', icon: AppIcons.ranking),
          ],
        ),
        const SizedBox(height: AppSpace.lg),
        TitledCard(
          title: by.by,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (d.weak.isNotEmpty) ...[
                Text.rich(
                  TextSpan(
                    children: [
                      const TextSpan(text: 'Анхаарах: '),
                      TextSpan(
                        text: d.weak.join(', '),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  style: context.text.bodyMedium,
                ),
                const SizedBox(height: AppSpace.md),
              ],
              AreaBars(areas: mine, compare: center, compareLabel: 'төв'),
            ],
          ),
        ),
        if (review.isNotEmpty) ...[
          const SizedBox(height: AppSpace.lg),
          TitledCard(
            title: 'Давтах томьёо',
            icon: AppIcons.formula,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final r in review) ...[
                  FormulaLine(formula: r.formula, link: true),
                  Padding(
                    padding: const EdgeInsets.only(top: 2, bottom: AppSpace.sm),
                    child: Text('${r.numbers.length} бодлогод: ${r.numbers.join(', ')}', style: dim),
                  ),
                ],
              ],
            ),
          ),
        ],
        const SizedBox(height: AppSpace.lg),
        TitledCard(
          title: 'Бодлогууд',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: SegmentedButton<bool>(
                  showSelectedIcon: false,
                  segments: [
                    ButtonSegment(value: true, label: Text('Алдсан ${missed.length}')),
                    const ButtonSegment(value: false, label: Text('Бүгд')),
                  ],
                  selected: {_onlyMissed},
                  onSelectionChanged: (v) => setState(() => _onlyMissed = v.first),
                ),
              ),
              const SizedBox(height: AppSpace.md),
              _onlyMissed
                  ? missed.isEmpty
                        ? Text(
                            'Бүх бодлогыг зөв бодсон байна',
                            style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              for (final g in groups) ...[
                                Padding(
                                  padding: const EdgeInsets.only(bottom: AppSpace.sm, top: AppSpace.xs),
                                  child: Text('${g.name} (${g.items.length})', style: context.text.titleSmall),
                                ),
                                for (final i in g.items)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: AppSpace.sm),
                                    child: _MissedItem(
                                      item: i,
                                      showTopic: by != ClassifyBy.topic,
                                      formulas: [
                                        for (final s in i.formulaSlugs)
                                          if (formulaBy[s] != null) formulaBy[s]!,
                                      ],
                                    ),
                                  ),
                              ],
                            ],
                          )
                  : ItemGrid(
                      children: [
                        for (final i in d.items)
                          ItemCell(number: i.number, status: i.status, letter: i.answer, answerKey: i.key),
                      ],
                    ),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.lg),
        TitledCard(
          title: 'Төвийн жагсаалт',
          child: Column(
            children: [
              for (final r in d.ranking)
                Container(
                  decoration: r.isMe
                      ? BoxDecoration(color: c.brandTint, borderRadius: BorderRadius.circular(AppRadius.sm))
                      : null,
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: 6),
                  child: Row(
                    children: [
                      SizedBox(width: 32, child: Text('${r.rank}', style: context.text.bodyMedium)),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              r.isMe ? '${r.name} (Та)' : r.name,
                              style: context.text.bodyMedium?.copyWith(fontWeight: r.isMe ? FontWeight.w800 : null),
                            ),
                            if (r.group.isNotEmpty) Text(r.group, style: dim),
                          ],
                        ),
                      ),
                      Text('${scoreText(r.totalScore)}/${scoreText(r.maxScore)}', style: context.text.bodyMedium),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MissedItem extends StatelessWidget {
  const _MissedItem({required this.item, required this.showTopic, required this.formulas});

  final MyPaperItem item;
  final bool showTopic;
  final List<FormulaRef> formulas;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final t = statusColors(context, item.status);
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: c.line),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  constraints: const BoxConstraints(minWidth: 32),
                  height: 32,
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(color: t.bg, borderRadius: BorderRadius.circular(AppRadius.sm)),
                  child: Text('${item.number}', style: context.text.titleSmall?.copyWith(color: t.fg)),
                ),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      children: [
                        if (item.answer != null) ...[
                          const TextSpan(text: 'Таны хариу '),
                          TextSpan(
                            text: item.answer,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ] else
                          TextSpan(text: item.status.label),
                        if (item.key != null) ...[
                          const TextSpan(text: ', зөв хариу '),
                          TextSpan(
                            text: item.key,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ],
                      ],
                    ),
                    style: context.text.bodyMedium,
                  ),
                ),
              ],
            ),
            if ((showTopic && item.topic != null) || item.centerPct != null) ...[
              const SizedBox(height: AppSpace.xs),
              Meta(
                items: [if (showTopic) item.topic, if (item.centerPct != null) 'төвийн ${item.centerPct}% зөв бодсон'],
              ),
            ],
            for (final f in formulas) ...[
              const SizedBox(height: AppSpace.sm),
              FormulaLine(formula: f, compact: true, link: true),
            ],
          ],
        ),
      ),
    );
  }
}
