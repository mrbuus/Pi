import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';
import '../data/ledger.dart';
import '../domain/ledger_format.dart';

/// Сарын блок (вэбийн `MonthBlocks.tsx` `LargeBlocks`). Төлөв бүр өөр ХЭЛБЭР + дүрс + үгтэй — өнгө дангаараа
/// утга илэрхийлэхгүй. Дэвсгэр саарал/цагаан, өнгө зөвхөн хүрээ, дүрсэнд (RULES §3).
///
/// Дүн, төлөв бүгд серверийнх. [money] `false` бол (Багш+) мөнгөн дүн огт зурагдахгүй.

/// «10/04–11/04» — сарын төлбөрийн хамрах хугацаа (сервер өгсөн бол).
String periodLabel(MonthBlock b) => b.hasPeriod ? '${dayLabel(b.periodFrom)}–${dayLabel(b.periodTo)}' : '';

/// Блокийн бүтэн тайлбар (уншигчид, вэбийн `blockLabel`).
String blockLabel(MonthBlock b, {bool settled = false, bool money = true}) {
  final period = b.hasPeriod ? ' (${periodLabel(b)}${b.extDays > 0 ? ', ${b.extDays} хоног сунгасан' : ''})' : '';
  final head = '${monthName(b.month)}$period: ${b.state.label}';
  if (b.state == LedgerState.off) return head;
  if (settled && b.state == LedgerState.paid) return '$head (бүтэн жилд тооцсон)';
  String m(int? v) => money ? mntOrEmpty(v) : '';
  return switch (b.state) {
    LedgerState.paid =>
      b.lateDays > 0
          ? '$head ${m(b.paid)} — ${b.lateDays} хоног хоцорч, ${dayLabel(b.paidOn)}-нд'.trim()
          : '$head ${m(b.paid)}'.trim(),
    LedgerState.partial => money ? '$head — ${m(b.paid)} / ${m(b.due)}' : head,
    LedgerState.future => '$head — ${dayLabel(b.dueOn)}-нд ${m(b.due)}'.trim(),
    _ => '$head ${m(b.due)}'.trim(),
  };
}

class MonthBlockCell extends StatelessWidget {
  const MonthBlockCell({
    super.key,
    required this.block,
    this.money = true,
    this.settled = false,
    this.current = false,
    this.selected = false,
    this.onTap,
  });

  final MonthBlock block;
  final bool money;
  final bool settled;

  /// Одоогийн сар — нимгэн брэндийн тойрог.
  final bool current;

  /// Дарж сонгосон сар.
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final b = block;
    final (IconData icon, Color tone, Color border, double width) = switch (b.state) {
      LedgerState.paid => (b.lateDays > 0 ? AppIcons.time : AppIcons.check, c.success, c.success, 1.5),
      LedgerState.partial => (AppIcons.circleDot, c.info, c.info, 1.5),
      LedgerState.owed => (AppIcons.warning, c.error, c.error, 2.0),
      LedgerState.future => (AppIcons.upcoming, c.inkDim, c.line, 1.0),
      LedgerState.off || LedgerState.unknown => (AppIcons.minus, c.inkDim, Colors.transparent, 1.0),
    };
    final amount = !money
        ? null
        : switch (b.state) {
            LedgerState.paid => settled ? null : shortMnt(b.paid),
            LedgerState.partial => b.due == null ? null : '${shortMnt(b.paid)} / ${shortMnt(b.due)}',
            LedgerState.owed => shortMnt(b.due),
            _ => null,
          };
    final dim = c.inkDim;
    final small = context.text.labelSmall;
    final body = Padding(
      padding: const EdgeInsets.all(AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(monthName(b.month), style: context.text.labelMedium?.copyWith(fontWeight: FontWeight.w700)),
          if (b.hasPeriod)
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: periodLabel(b)),
                  if (b.extDays > 0)
                    TextSpan(
                      text: ' +${b.extDays} хоног',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                ],
              ),
              style: small?.copyWith(color: dim, fontFeatures: const [FontFeature.tabularFigures()]),
            ),
          const SizedBox(height: 2),
          Row(
            children: [
              Icon(icon, size: 14, color: tone),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  b.state == LedgerState.future && b.dueOn != null ? dayLabel(b.dueOn) : b.state.label,
                  style: small,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          if (amount != null && amount.isNotEmpty)
            Text(
              amount,
              style: small?.copyWith(fontWeight: FontWeight.w700, fontFeatures: const [FontFeature.tabularFigures()]),
            ),
        ],
      ),
    );
    final radius = BorderRadius.circular(AppRadius.md);
    final decorated = DecoratedBox(
      decoration: BoxDecoration(
        color: b.state == LedgerState.off ? c.surfaceSunken : c.surface,
        borderRadius: radius,
        border: Border.all(color: selected ? c.brandBright : border, width: selected ? 2.5 : width),
        boxShadow: current && !selected ? [BoxShadow(color: c.focus, spreadRadius: 1.5)] : null,
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: AppSizes.minTap + 16),
        child: body,
      ),
    );
    final label = blockLabel(b, settled: settled, money: money);
    if (onTap == null) {
      return Semantics(label: label, excludeSemantics: true, child: decorated);
    }
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(borderRadius: radius, onTap: onTap, child: decorated),
      ),
    );
  }
}

/// Сарын блокууд: утсан дээр 3 багана ([timeline] `false`), эсвэл 9-р сараас 5-р сар хүртэл нэг мөр
/// хажуу тийш гүйлгэдэг он цагийн шугам ([timeline] `true`).
class MonthBlocks extends StatelessWidget {
  const MonthBlocks({
    super.key,
    required this.blocks,
    this.money = true,
    this.settled = false,
    this.current,
    this.selected,
    this.onPick,
    this.pickAll = false,
    this.timeline = false,
  });

  final List<MonthBlock> blocks;
  final bool money;
  final bool settled;
  final String? current;
  final String? selected;
  final ValueChanged<String>? onPick;

  /// Суусан бүх сарыг дарж болно (төлбөрийн эх сурвалж харах). `false` бол дарах үйлдэлгүй.
  final bool pickAll;
  final bool timeline;

  static const _timelineWidth = 104.0;

  Widget _cell(MonthBlock b) => MonthBlockCell(
    key: ValueKey('block:${b.month}'),
    block: b,
    money: money,
    settled: settled,
    current: b.month == current,
    selected: b.month == selected,
    onTap: onPick != null && pickAll && b.state != LedgerState.off ? () => onPick!(b.month) : null,
  );

  @override
  Widget build(BuildContext context) {
    if (timeline) {
      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < blocks.length; i++) ...[
              if (i > 0) const SizedBox(width: AppSpace.xs),
              SizedBox(width: _timelineWidth, child: _cell(blocks[i])),
            ],
          ],
        ),
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = constraints.maxWidth >= 600 ? 5 : 3;
        const gap = AppSpace.sm;
        final w = (constraints.maxWidth - gap * (cols - 1)) / cols;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [for (final b in blocks) SizedBox(width: w, child: _cell(b))],
        );
      },
    );
  }
}

/// Блокийн тайлбар — «i» дотор (жижиг тайлбар бичвэр олшруулахгүй).
const blockLegendText =
    'Төлсөн — ногоон хүрээ, тэмдэг. Хоцорч төлсөн — цагийн дүрс. Дутуу — цэнхэр хүрээ. '
    'Өртэй — улаан зузаан хүрээ, хугацаа нь болсон. Хугацаа болоогүй — саарал хүрээ. Ангид сураагүй сар — саарал дэвсгэр';
