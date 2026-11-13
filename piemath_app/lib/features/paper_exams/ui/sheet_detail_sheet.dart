import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';
import '../data/paper_exam_models.dart';
import '../domain/paper_exam_logic.dart';
import 'paper_ui.dart';

/// Нэг сурагчийн хуудас (вэбийн `SheetDialog`): бодлого бүрийн хариу, зөв хариу, агуулгын хувь,
/// алдсан бодлогын томьёо. Утсанд доод хуудсаар.
Future<void> showSheetDetail(BuildContext context, {required BoardRow row, required PaperBoard board}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.85,
        minChildSize: 0.4,
        maxChildSize: 1,
        builder: (context, scroll) => SheetDetail(row: row, board: board, controller: scroll),
      ),
    );

class SheetDetail extends StatelessWidget {
  const SheetDetail({super.key, required this.row, required this.board, this.controller});

  final BoardRow row;
  final PaperBoard board;
  final ScrollController? controller;

  @override
  Widget build(BuildContext context) {
    final items = board.items;
    final by = board.classifyBy;
    final review = reviewFormulas([
      for (var i = 0; i < items.length; i++)
        (number: items[i].number, slugs: items[i].formulaSlugs, missed: row.statusAt(i).missed),
    ], board.formulas);
    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
      children: [
        Text(row.name, style: context.text.titleLarge),
        const SizedBox(height: 2),
        Meta(
          items: [
            if (row.group != null) row.group,
            if (row.code.isNotEmpty) row.code,
            '${scoreText(row.totalScore)} / ${scoreText(row.maxScore)} оноо',
            if (row.pct != null) '${row.pct}%',
            if (row.rank != null) 'төвд ${row.rank}-р байр',
          ],
        ),
        const SizedBox(height: AppSpace.lg),
        ItemGrid(
          children: [
            for (var i = 0; i < items.length; i++)
              ItemCell(
                number: items[i].number,
                status: row.statusAt(i),
                letter: row.letterAt(i),
                answerKey: items[i].answerKey,
              ),
          ],
        ),
        const SizedBox(height: AppSpace.sm),
        const StatusLegend(),
        const SizedBox(height: AppSpace.xl),
        Text(by.by, style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        AreaBars(areas: by == ClassifyBy.topic ? row.topics : row.areas),
        if (review.isNotEmpty) ...[
          const SizedBox(height: AppSpace.xl),
          Text('Алдсан бодлогын томьёо', style: context.text.titleSmall),
          const SizedBox(height: AppSpace.sm),
          for (final r in review) ...[
            FormulaLine(formula: r.formula, compact: true, link: true),
            Padding(
              padding: const EdgeInsets.only(top: 2, bottom: AppSpace.sm),
              child: Text(
                'Бодлого: ${r.numbers.join(', ')}',
                style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
              ),
            ),
          ],
        ],
      ],
    );
  }
}
