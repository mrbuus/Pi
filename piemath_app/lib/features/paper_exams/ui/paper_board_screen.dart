import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/session.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/paper_exam_models.dart';
import '../data/paper_exams_repository.dart';
import '../domain/paper_exam_logic.dart';
import 'import_tab.dart';
import 'paper_exams_list_screen.dart';
import 'paper_ui.dart';
import 'sheet_detail_sheet.dart';

/// Ажилтны нэгдсэн шалгалтын хуудас (`/app/paper-exams/:id`, вэбийн `PaperBoard`). Багш — өөрийн ангийн
/// сурагч; Багш+/Админ — бүгд + нийтлэх, устгах, дүн оруулах. «Түлхүүр, агуулга» засварыг апп-д
/// хийхгүй (компьютерээр, вэбээс) — бодлого бүрийн сэдэв, томьёог «Тойм»-д харна.
class PaperBoardScreen extends ConsumerStatefulWidget {
  const PaperBoardScreen({super.key, required this.id, this.initialTab});

  final String id;
  final String? initialTab;

  @override
  ConsumerState<PaperBoardScreen> createState() => _PaperBoardScreenState();
}

class _PaperBoardScreenState extends ConsumerState<PaperBoardScreen> {
  bool _busy = false;

  Future<void> _togglePublish(PaperBoard b) async {
    setState(() => _busy = true);
    try {
      await ref.read(paperExamsRepositoryProvider).setPublished(widget.id, !b.published);
      ref.invalidate(paperBoardProvider(widget.id));
      ref.invalidate(paperExamsProvider);
      if (mounted) paperSnack(context, b.published ? 'Сурагчдаас нуулаа' : 'Сурагчид нээлээ');
    } catch (e) {
      if (mounted) paperSnack(context, paperError(e, 'Өөрчилж чадсангүй'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove() async {
    final ok = await confirmAction(
      context,
      title: 'Шалгалтыг устгах уу',
      message: 'Жагсаалтаас хасагдаж, сурагчдад харагдахаа болино',
      confirmLabel: 'Устгах',
      destructive: true,
    );
    if (!ok || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(paperExamsRepositoryProvider).remove(widget.id);
      ref.invalidate(paperExamsProvider);
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        paperSnack(context, paperError(e, 'Устгаж чадсангүй'));
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final manage = paperCanManage(ref.watch(sessionProvider));
    final async = ref.watch(paperBoardProvider(widget.id));
    final tabs = ['Багаар', 'Тойм', if (manage) 'Дүн оруулах'];
    final initial = manage && widget.initialTab == 'import'
        ? 2
        : widget.initialTab == 'overview'
        ? 1
        : 0;
    final b = async.value;
    return DefaultTabController(
      length: tabs.length,
      initialIndex: initial,
      child: Scaffold(
        appBar: AppBar(
          title: Text(b?.title ?? 'Нэгдсэн шалгалт'),
          actions: [
            if (manage && b != null) ...[
              IconButton(
                key: const Key('paper-publish'),
                tooltip: b.published ? 'Сурагчдаас нуух' : 'Сурагчид нээх',
                onPressed: _busy ? null : () => _togglePublish(b),
                icon: Icon(b.published ? AppIcons.hide : AppIcons.show),
              ),
              PopupMenuButton<String>(
                tooltip: 'Бусад',
                icon: const Icon(AppIcons.overflow),
                onSelected: (v) => v == 'delete' ? _remove() : null,
                itemBuilder: (_) => const [PopupMenuItem(value: 'delete', child: Text('Шалгалтыг устгах'))],
              ),
            ],
          ],
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              for (final t in tabs)
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(t),
                      if (t == 'Дүн оруулах' && (b?.unmatched.isNotEmpty ?? false)) ...[
                        const SizedBox(width: 6),
                        MetaChip(label: '${b!.unmatched.length}', tone: ChipTone.warning),
                      ],
                    ],
                  ),
                ),
            ],
          ),
        ),
        body: async.when(
          skipLoadingOnRefresh: true,
          loading: () => const LoadingState(cards: 4),
          error: (e, _) =>
              ErrorState(message: paperError(e), onRetry: () => ref.invalidate(paperBoardProvider(widget.id))),
          data: (board) => TabBarView(
            children: [
              _GroupsTab(board: board),
              _OverviewTab(board: board),
              if (manage) ImportTab(examId: widget.id, board: board),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.board});

  final PaperBoard board;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpace.sm,
      runSpacing: AppSpace.xs,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Meta(items: [dayText(board.heldOn), '${board.itemCount} бодлого', '${board.overall.count} сурагч']),
        MetaChip(
          label: board.published ? 'Сурагчид нээлттэй' : 'Нийтлээгүй',
          tone: board.published ? ChipTone.success : ChipTone.neutral,
        ),
        if (board.ownClassesOnly) const MetaChip(label: 'Таны ангийн сурагчид', tone: ChipTone.info),
      ],
    );
  }
}

/// Харагдац 1 — багийн хүснэгт. Утсанд: сурагч бүр нэг мөр, бодлого бүрийн хариу доод хуудсанд.
class _GroupsTab extends StatefulWidget {
  const _GroupsTab({required this.board});

  final PaperBoard board;

  @override
  State<_GroupsTab> createState() => _GroupsTabState();
}

class _GroupsTabState extends State<_GroupsTab> {
  String? _active;
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final board = widget.board;
    final c = context.colors;
    if (board.groups.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(AppSpace.gutter),
        children: [
          _Header(board: board),
          SizedBox(
            height: 360,
            child: EmptyState(
              icon: AppIcons.students,
              title: board.ownClassesOnly ? 'Таны ангийн сурагчийн дүн алга' : 'Дүн оруулаагүй байна',
              message: board.ownClassesOnly
                  ? 'Энэ шалгалтад таны ангийн сурагч ороогүй, эсвэл дүн нь хараахан оруулагдаагүй'
                  : '«Дүн оруулах» табаас машины эсвэл Excel-ийн файлаа оруулна уу',
            ),
          ),
        ],
      );
    }
    final group = board.groups.firstWhere((g) => g.label == _active, orElse: () => board.groups.first);
    final found = _query.trim().isEmpty ? null : searchRows(board.groups, _query);
    final by = board.classifyBy;
    final overallBy = by == ClassifyBy.topic ? board.overall.topics : board.overall.areas;
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        _Header(board: board),
        const SizedBox(height: AppSpace.md),
        TextField(
          key: const Key('paper-search'),
          onChanged: (v) => setState(() => _query = v),
          decoration: const InputDecoration(prefixIcon: Icon(AppIcons.search), hintText: 'Нэр, шифр'),
        ),
        const SizedBox(height: AppSpace.md),
        if (found == null) ...[
          SizedBox(
            height: AppSizes.minTap,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: board.groups.length,
              separatorBuilder: (_, _) => const SizedBox(width: AppSpace.sm),
              itemBuilder: (_, i) {
                final g = board.groups[i];
                return ChoiceChip(
                  label: Text('${g.label}  ${g.count}'),
                  selected: g.label == group.label,
                  showCheckmark: false,
                  onSelected: (_) => setState(() => _active = g.label),
                );
              },
            ),
          ),
          const SizedBox(height: AppSpace.md),
          AppCard(
            padding: const EdgeInsets.all(AppSpace.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(group.label, style: context.text.titleMedium),
                if (group.teacher != null)
                  Text('Багш: ${group.teacher}', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                const SizedBox(height: 2),
                Meta(
                  items: [
                    '${group.count} сурагч',
                    if (group.avgScore != null) 'дундаж ${scoreText(group.avgScore)} оноо',
                    if (group.avgPct != null) '${group.avgPct}%',
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.md),
          _RowsCard(rows: group.rows, board: board, numbered: true),
          const SizedBox(height: AppSpace.lg),
          TitledCard(
            title: 'Бодлого бүрийн гүйцэтгэл %',
            child: ItemGrid(
              children: [
                for (var i = 0; i < group.items.length; i++)
                  _PctCell(
                    number: group.items[i].number,
                    pct: group.items[i].pct,
                    sub: i < board.items.length
                        ? (by == ClassifyBy.topic ? topicShort(board.items[i].topic) : areaShort(board.items[i].area))
                        : '',
                    voided: i < board.items.length && board.items[i].voided,
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.lg),
          TitledCard(
            title: '${by.by}, гүйцэтгэл %',
            child: AreaBars(
              areas: by == ClassifyBy.topic ? group.topics : group.areas,
              compare: {for (final a in overallBy) a.area: a.pct},
              compareLabel: 'төв',
            ),
          ),
          if (by == ClassifyBy.topic && group.areas.length > 1) ...[
            const SizedBox(height: AppSpace.lg),
            TitledCard(
              title: '${ClassifyBy.area.by}, гүйцэтгэл %',
              child: AreaBars(
                areas: group.areas,
                compare: {for (final a in board.overall.areas) a.area: a.pct},
                compareLabel: 'төв',
              ),
            ),
          ],
        ] else if (found.isEmpty)
          Padding(
            padding: const EdgeInsets.all(AppSpace.lg),
            child: Text('Олдсонгүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
          )
        else
          _RowsCard(rows: found, board: board, showGroup: true),
      ],
    );
  }
}

class _RowsCard extends StatelessWidget {
  const _RowsCard({required this.rows, required this.board, this.numbered = false, this.showGroup = false});

  final List<BoardRow> rows;
  final PaperBoard board;
  final bool numbered;
  final bool showGroup;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final weakLabel = board.classifyBy.weak;
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) Divider(height: 1, color: c.line),
            InkWell(
              key: Key('paper-row-${rows[i].sheetId}'),
              onTap: () => showSheetDetail(context, row: rows[i], board: board),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 56),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
                  child: Row(
                    children: [
                      if (numbered) ...[
                        SizedBox(
                          width: 24,
                          child: Text(
                            '${i + 1}',
                            textAlign: TextAlign.right,
                            style: context.text.bodySmall?.copyWith(color: c.inkDim),
                          ),
                        ),
                        const SizedBox(width: AppSpace.sm),
                      ],
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text.rich(
                              TextSpan(
                                children: [
                                  TextSpan(
                                    text: '${rows[i].lastName} ',
                                    style: TextStyle(color: c.inkDim),
                                  ),
                                  TextSpan(text: rows[i].firstName),
                                ],
                              ),
                              style: context.text.titleSmall,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Meta(
                              items: [
                                if (showGroup) rows[i].group,
                                if (showGroup && rows[i].code.isNotEmpty) rows[i].code,
                                if (rows[i].weak.isNotEmpty) '$weakLabel: ${rows[i].weak.join(', ')}',
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: AppSpace.sm),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          ScoreText(score: rows[i].totalScore, max: rows[i].maxScore),
                          PctBadge(pct: rows[i].pct),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PctCell extends StatelessWidget {
  const _PctCell({required this.number, required this.pct, required this.sub, this.voided = false});

  final int number;
  final int? pct;
  final String sub;
  final bool voided;

  @override
  Widget build(BuildContext context) {
    final t = toneColors(context, toneOf(pct));
    final small = context.text.labelSmall?.copyWith(color: t.fg);
    return Semantics(
      label: '$number-р бодлого ${pct ?? 0}%${voided ? ', хүчингүй' : ''}',
      excludeSemantics: true,
      child: DecoratedBox(
        decoration: BoxDecoration(color: t.bg, borderRadius: BorderRadius.circular(AppRadius.sm)),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Text(
                    '$number',
                    style: small?.copyWith(
                      fontWeight: FontWeight.w800,
                      decoration: voided ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  const Spacer(),
                  Text(pct == null ? '' : '$pct', style: small?.copyWith(fontWeight: FontWeight.w800)),
                ],
              ),
              Text(sub, maxLines: 1, overflow: TextOverflow.ellipsis, style: small?.copyWith(fontSize: 10)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Харагдац 2 — бүх багийн тойм, бодлого бүрийн сэдэв, томьёо, гүйцэтгэл.
class _OverviewTab extends StatelessWidget {
  const _OverviewTab({required this.board});

  final PaperBoard board;

  @override
  Widget build(BuildContext context) {
    final o = board.overall;
    final c = context.colors;
    if (o.count == 0) {
      return const EmptyState(
        icon: AppIcons.chart,
        title: 'Дүн алга',
        message: 'Дүн оруулсны дараа тойм энд харагдана',
      );
    }
    final by = board.classifyBy;
    final overallBy = by == ClassifyBy.topic ? o.topics : o.areas;
    final short = by == ClassifyBy.topic ? topicShort : areaShort;
    final formulaBy = {for (final f in board.formulas) f.slug: f};
    final itemBy = {for (final i in board.items) i.number: i};
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        StatRow(
          tiles: [
            StatTile(label: 'Сурагч', value: '${o.count}'),
            StatTile(label: 'Дундаж оноо', value: scoreText(o.avgScore)),
            StatTile(label: 'Дундаж', value: o.avgPct != null ? '${o.avgPct}%' : ''),
            StatTile(label: 'Медиан', value: scoreText(o.medianScore)),
            StatTile(label: 'Хамгийн их', value: scoreText(o.maxScore)),
            StatTile(label: 'Хамгийн бага', value: scoreText(o.minScore)),
          ],
        ),
        const SizedBox(height: AppSpace.lg),
        TitledCard(
          title: 'Багаар, ${by.one.toLowerCase()} бүрийн гүйцэтгэл %',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final g in [...board.groups.map((g) => (g, false)), (null, true)]) ...[
                _GroupLine(
                  label: g.$1?.label ?? 'Нийт',
                  teacher: g.$1?.teacher,
                  count: g.$1?.count ?? o.count,
                  avgScore: g.$1 != null ? g.$1!.avgScore : o.avgScore,
                  avgPct: g.$1 != null ? g.$1!.avgPct : o.avgPct,
                  areas: g.$1 == null ? overallBy : (by == ClassifyBy.topic ? g.$1!.topics : g.$1!.areas),
                  short: short,
                  total: g.$2,
                ),
                if (!g.$2) const Divider(height: AppSpace.lg),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppSpace.lg),
        TitledCard(
          title: '${by.by}, гүйцэтгэл %',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AreaBars(areas: overallBy),
              if (by == ClassifyBy.topic && o.areas.length > 1) ...[
                const SizedBox(height: AppSpace.lg),
                Text('${ClassifyBy.area.by}, гүйцэтгэл %', style: context.text.titleSmall),
                const SizedBox(height: AppSpace.sm),
                AreaBars(areas: o.areas),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppSpace.lg),
        TitledCard(
          title: 'Хамгийн их алдсан бодлого',
          child: Column(
            children: [
              for (final s in hardestItems(o.items)) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      SizedBox(width: 56, child: PctBadge(pct: s.pct)),
                      const SizedBox(width: AppSpace.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${s.number}-р бодлого', style: context.text.titleSmall),
                            if ((itemBy[s.number]?.topic ?? itemBy[s.number]?.area) != null)
                              Text(itemBy[s.number]!.topic ?? itemBy[s.number]!.area!, style: dim),
                          ],
                        ),
                      ),
                      if (s.topWrong != null) Text('ихэнх нь ${s.topWrong!.letter} (${s.topWrong!.count})', style: dim),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppSpace.lg),
        TitledCard(
          title: 'Бодлого бүрээр: сэдэв, томьёо, гүйцэтгэл',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < board.items.length; i++) ...[
                if (i > 0) const Divider(height: AppSpace.lg),
                _ItemLine(
                  item: board.items[i],
                  stat: i < o.items.length ? o.items[i] : null,
                  formulas: [
                    for (final s in board.items[i].formulaSlugs)
                      if (formulaBy[s] != null) formulaBy[s]!,
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _GroupLine extends StatelessWidget {
  const _GroupLine({
    required this.label,
    required this.teacher,
    required this.count,
    required this.avgScore,
    required this.avgPct,
    required this.areas,
    required this.short,
    required this.total,
  });

  final String label;
  final String? teacher;
  final int count;
  final double? avgScore;
  final int? avgPct;
  final List<AreaScore> areas;
  final String Function(String?) short;
  final bool total;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: total ? context.text.titleSmall?.copyWith(fontWeight: FontWeight.w800) : context.text.titleSmall,
              ),
            ),
            PctBadge(pct: avgPct),
          ],
        ),
        Meta(
          items: [if (teacher != null) teacher, '$count сурагч', if (avgScore != null) 'дундаж ${scoreText(avgScore)}'],
        ),
        if (areas.isNotEmpty) ...[
          const SizedBox(height: AppSpace.xs),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final a in areas)
                Tooltip(
                  message: a.area,
                  child: _MiniTone(label: short(a.area), pct: a.pct),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _MiniTone extends StatelessWidget {
  const _MiniTone({required this.label, required this.pct});

  final String label;
  final int? pct;

  @override
  Widget build(BuildContext context) {
    final t = toneColors(context, toneOf(pct));
    return DecoratedBox(
      decoration: BoxDecoration(color: t.bg, borderRadius: BorderRadius.circular(AppRadius.sm)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
        child: Text(
          '$label ${pct ?? ''}'.trim(),
          style: context.text.labelSmall?.copyWith(color: t.fg, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}

class _ItemLine extends StatelessWidget {
  const _ItemLine({required this.item, required this.stat, required this.formulas});

  final PaperItem item;
  final ItemStat? stat;
  final List<FormulaRef> formulas;

  @override
  Widget build(BuildContext context) {
    final dim = context.text.bodySmall?.copyWith(color: context.colors.inkDim);
    return Opacity(
      opacity: item.voided ? 0.6 : 1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(width: 32, child: Text('${item.number}', style: context.text.titleSmall)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (item.topic != null) Text(item.topic!, style: context.text.bodyMedium),
                    if (item.area != null) Text(item.area!, style: dim),
                    if (item.voided) Text('хүчингүй', style: dim),
                    if (stat?.topWrong != null)
                      Text('Түгээмэл алдаа ${stat!.topWrong!.letter}, ${stat!.topWrong!.count} сурагч', style: dim),
                  ],
                ),
              ),
              PctBadge(pct: stat?.pct),
            ],
          ),
          for (final f in formulas) ...[
            const SizedBox(height: AppSpace.xs),
            Padding(
              padding: const EdgeInsets.only(left: 32),
              child: FormulaLine(formula: f, compact: true, link: true),
            ),
          ],
        ],
      ),
    );
  }
}
