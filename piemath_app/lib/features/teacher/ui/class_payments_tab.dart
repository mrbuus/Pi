import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/payment_status/money.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

// Ангийн самбарын «Төлбөр» таб (эзэн 2026-11-10) — вэбийн `ClassBoard embedded`, `LedgerRowItem`,
// `MonthBlocks`. Хүүхэд бүр нэг мөр, сар бүрийн блок, өртэй мөр улаан. Зөвхөн Админ, Багш+ (табыг
// дуудагч нуудаг; сервер мөн шалгана). Багш+-д сервер дүнг нуудаг (`amountsHidden`) — зөвхөн төлөв.

Map<String, Object?> _m(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};
String _s(Object? v) => v is String ? v : '';
int? _n(Object? v) => v is num ? v.toInt() : null;
List<Object?> _l(Object? v) => v is List ? v : const [];

/// Сарын блокийн төлөв.
enum BlockState { paid, partial, owed, future, off }

BlockState _state(Object? v) => switch (v) {
  'PAID' => BlockState.paid,
  'PARTIAL' => BlockState.partial,
  'OWED' => BlockState.owed,
  'FUTURE' => BlockState.future,
  _ => BlockState.off,
};

String blockStateLabel(BlockState s) => switch (s) {
  BlockState.paid => 'Төлсөн',
  BlockState.partial => 'Дутуу',
  BlockState.owed => 'Өртэй',
  BlockState.future => 'Хугацаа болоогүй',
  BlockState.off => 'Сураагүй',
};

@immutable
class LedgerBlock {
  const LedgerBlock({
    required this.month,
    required this.state,
    this.due,
    this.paid,
    this.dueOn,
    this.paidOn,
    this.lateDays = 0,
  });

  factory LedgerBlock.fromJson(Object? j) {
    final m = _m(j);
    return LedgerBlock(
      month: _s(m['month']),
      state: _state(m['state']),
      due: _n(m['due']),
      paid: _n(m['paid']),
      dueOn: m['dueOn'] as String?,
      paidOn: m['paidOn'] as String?,
      lateDays: _n(m['lateDays']) ?? 0,
    );
  }

  final String month;
  final BlockState state;
  final int? due;
  final int? paid;
  final String? dueOn;
  final String? paidOn;
  final int lateDays;
}

/// «2026-10» → «10-р сар».
String monthName(String m) => m.length >= 7 ? '${int.tryParse(m.substring(5, 7)) ?? 0}-р сар' : m;

/// «2026-10-07» → «10/07».
String dayLabel(String? iso) => iso == null || iso.length < 10 ? '' : '${iso.substring(5, 7)}/${iso.substring(8, 10)}';

/// Том дүнг сая-аар: 84392324 → «84.4 сая».
String millions(int n) => n.abs() < 100000 ? formatMnt(n) : '${(n / 1000000).toStringAsFixed(1)} сая';

/// 350000 → «350к», 1250000 → «1.25с».
String shortMnt(int n) {
  if (n >= 1000000) {
    final v = (n / 1000000).toStringAsFixed(2).replaceFirst(RegExp(r'\.?0+$'), '');
    return '$vс';
  }
  if (n >= 1000) return '${(n / 1000).round()}к';
  return '$n';
}

/// Блокийн дэлгэц уншигчийн шошго (вэбийн `blockLabel`). Дүн нуугдсан (Багш+) бол дүнгүй.
String blockLabel(LedgerBlock b, {bool settled = false}) {
  String amt(int? v) => v == null ? '' : ' ${formatMnt(v)}';
  final head = '${monthName(b.month)}: ${blockStateLabel(b.state)}';
  if (b.state == BlockState.off) return head;
  if (settled && b.state == BlockState.paid) return '$head (бүтэн жилд тооцсон)';
  return switch (b.state) {
    BlockState.paid =>
      b.lateDays > 0
          ? '$head${amt(b.paid)}, ${b.lateDays} хоног хоцорч, ${dayLabel(b.paidOn)}-нд'
          : '$head${amt(b.paid)}',
    BlockState.partial =>
      b.paid == null || b.due == null ? head : '$head, ${formatMnt(b.paid!)} / ${formatMnt(b.due!)}',
    BlockState.future => '$head, ${dayLabel(b.dueOn)}-нд${amt(b.due)}',
    _ => '$head${amt(b.due)}',
  };
}

@immutable
class ClassLedgerRow {
  const ClassLedgerRow({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.code,
    this.blocks = const [],
    this.owedNow,
    this.owedMonths = 0,
    this.overdueDays = 0,
    this.credit = 0,
    this.remaining,
    this.nextDue,
    this.planKind,
    this.planGuessed = false,
    this.settled = false,
    this.noteCount = 0,
    this.lastNote,
    this.promise,
  });

  factory ClassLedgerRow.fromJson(Object? j) {
    final m = _m(j);
    final plan = _m(m['plan']);
    final notes = _m(m['notes']);
    final next = _m(m['nextDue']);
    final promise = _m(m['promise']);
    return ClassLedgerRow(
      id: _s(m['id']),
      firstName: _s(m['firstName']),
      lastName: _s(m['lastName']),
      code: m['code'] as String?,
      blocks: [for (final b in _l(m['blocks'])) LedgerBlock.fromJson(b)],
      owedNow: _n(m['owedNow']),
      owedMonths: _n(m['owedMonths']) ?? 0,
      overdueDays: _n(m['overdueDays']) ?? 0,
      credit: _n(m['credit']) ?? 0,
      remaining: _n(m['remaining']),
      nextDue: next['dueOn'] is String ? (amount: _n(next['amount']), dueOn: next['dueOn']! as String) : null,
      planKind: plan['kind'] as String?,
      planGuessed: plan['guessed'] == true,
      settled: plan['settled'] == true,
      noteCount: _n(notes['count']) ?? 0,
      lastNote: _m(notes['last'])['body'] as String?,
      promise: promise['on'] is String
          ? (on: promise['on']! as String, state: _s(promise['state']), overdueDays: _n(promise['overdueDays']) ?? 0)
          : null,
    );
  }

  final String id;
  final String firstName;
  final String lastName;
  final String? code;
  final List<LedgerBlock> blocks;

  /// Багш+-д сервер null болгоно.
  final int? owedNow;
  final int owedMonths;
  final int overdueDays;
  final int credit;
  final int? remaining;
  final ({int? amount, String dueOn})? nextDue;
  final String? planKind;
  final bool planGuessed;

  /// Багш+ гараар «бүтэн жил» гэж тооцсон.
  final bool settled;
  final int noteCount;
  final String? lastNote;
  final ({String on, String state, int overdueDays})? promise;

  /// Өртэй эсэх — дүн нуугдсан үед өртэй сарын тоогоор (вэбийн `isOwed`).
  bool get owed => (owedNow ?? 0) > 0 || owedMonths > 0;

  /// Жилийн гэрээ бүрэн төлөгдсөн — дүн нуугдсан үед блокийн төлөвөөр.
  bool get complete =>
      remaining == null ? blocks.every((b) => b.state == BlockState.paid || b.state == BlockState.off) : remaining == 0;
}

@immutable
class ClassLedger {
  const ClassLedger({required this.month, this.months = const [], this.rows = const [], this.amountsHidden = true});

  factory ClassLedger.fromJson(Object? json) {
    final j = _m(json);
    return ClassLedger(
      month: _s(j['month']),
      months: [for (final m in _l(_m(j['year'])['months'])) _s(m)],
      rows: [for (final r in _l(j['rows'])) ClassLedgerRow.fromJson(r)],
      amountsHidden: j['amountsHidden'] != false,
    );
  }

  final String month;
  final List<String> months;
  final List<ClassLedgerRow> rows;

  /// Багш+ — дүнгүй, зөвхөн төлөв.
  final bool amountsHidden;
}

/// Энэ сарын тоо (вэбийн `stats`).
@immutable
class LedgerStats {
  const LedgerStats({
    required this.expected,
    required this.covered,
    required this.active,
    required this.paid,
    required this.owed,
    required this.owedNow,
    required this.notes,
  });

  final int expected;
  final int covered;
  final int active;
  final int paid;
  final int owed;
  final int owedNow;
  final int notes;
}

LedgerStats ledgerStats(ClassLedger d) {
  final idx = d.months.indexOf(d.month);
  var expected = 0, covered = 0, active = 0, paid = 0;
  for (final r in d.rows) {
    final b = idx >= 0 && idx < r.blocks.length ? r.blocks[idx] : null;
    if (b != null && b.state != BlockState.off) {
      expected += b.due ?? 0;
      covered += b.paid ?? 0;
      active++;
      if (b.state == BlockState.paid) paid++;
    }
  }
  final owed = d.rows.where((r) => r.owed).toList();
  return LedgerStats(
    expected: expected,
    covered: covered,
    active: active,
    paid: paid,
    owed: owed.length,
    owedNow: owed.fold(0, (s, r) => s + (r.owedNow ?? 0)),
    notes: d.rows.where((r) => r.noteCount > 0).length,
  );
}

final classLedgerProvider = FutureProvider.autoDispose.family<ClassLedger, String>(
  (ref, id) => ref
      .watch(apiClientProvider)
      .get('/payments/ledger/board', query: {'classroomId': id}, parse: ClassLedger.fromJson),
);

enum _Filter { all, owed, notes }

/// «Төлбөр» таб.
class ClassPaymentsTab extends ConsumerStatefulWidget {
  const ClassPaymentsTab({super.key, required this.classId});

  final String classId;

  @override
  ConsumerState<ClassPaymentsTab> createState() => _ClassPaymentsTabState();
}

class _ClassPaymentsTabState extends ConsumerState<ClassPaymentsTab> {
  _Filter _filter = _Filter.all;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(classLedgerProvider(widget.classId));
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const LoadingState(cards: 4),
      error: (e, _) => e is ApiError && e.kind == ApiErrorKind.forbidden
          ? const EmptyState(
              icon: AppIcons.info,
              title: 'Төлбөрийн мэдээлэл танд харагдахгүй',
              message: 'Энэ хэсгийг төвийн эрх бүхий ажилтан харна',
            )
          : ErrorState(
              message: e is ApiError && e.message.isNotEmpty ? e.message : 'Төлбөрийн самбар ачаалагдсангүй',
              onRetry: () => ref.invalidate(classLedgerProvider(widget.classId)),
            ),
      data: (d) => _body(context, d),
    );
  }

  Widget _body(BuildContext context, ClassLedger d) {
    final c = context.colors;
    final st = ledgerStats(d);
    final rows = switch (_filter) {
      _Filter.owed => d.rows.where((r) => r.owed).toList(),
      _Filter.notes => d.rows.where((r) => r.noteCount > 0).toList(),
      _Filter.all => d.rows,
    };
    final hidden = d.amountsHidden;
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    final strong = context.text.titleSmall?.copyWith(
      fontWeight: FontWeight.w700,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
    return RefreshIndicator(
      onRefresh: () => ref.refresh(classLedgerProvider(widget.classId).future).then((_) {}, onError: (_) {}),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
        children: [
          AppCard(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(monthName(d.month), style: dim),
                      Text.rich(
                        TextSpan(
                          text: hidden ? '${st.paid}' : millions(st.covered),
                          children: [
                            TextSpan(
                              text: hidden ? ' / ${st.active} төлсөн' : ' / ${millions(st.expected)}',
                              style: TextStyle(fontWeight: FontWeight.w400, color: c.inkDim),
                            ),
                          ],
                        ),
                        style: strong,
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(hidden ? 'Өртэй' : 'Нийт өр', style: dim),
                    Text(
                      hidden ? '${st.owed} сурагч' : formatMnt(st.owedNow),
                      style: strong?.copyWith(color: st.owed > 0 ? c.error : c.ink),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.sm),
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: AppSpace.xs,
                  runSpacing: AppSpace.xs,
                  children: [
                    for (final (f, label, n) in [
                      (_Filter.all, 'Бүгд', d.rows.length),
                      (_Filter.owed, 'Өртэй', st.owed),
                      (_Filter.notes, 'Тэмдэглэлтэй', st.notes),
                    ])
                      ChoiceChip(
                        key: ValueKey('ledger-filter-${f.name}'),
                        label: Text('$label $n'),
                        selected: _filter == f,
                        materialTapTargetSize: MaterialTapTargetSize.padded,
                        onSelected: (_) => setState(() => _filter = f),
                      ),
                  ],
                ),
              ),
              const _BlockLegendButton(),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          if (rows.isEmpty)
            SizedBox(
              height: 200,
              child: EmptyState(
                icon: AppIcons.payments,
                title: _filter == _Filter.owed
                    ? 'Өртэй сурагч алга'
                    : _filter == _Filter.notes
                    ? 'Тэмдэглэлтэй сурагч алга'
                    : 'Сурагч алга',
              ),
            )
          else
            for (final r in rows) ...[
              _LedgerRowCard(row: r, current: d.month, hidden: hidden),
              const SizedBox(height: AppSpace.sm),
            ],
        ],
      ),
    );
  }
}

class _LedgerRowCard extends StatelessWidget {
  const _LedgerRowCard({required this.row, required this.current, required this.hidden});

  final ClassLedgerRow row;
  final String current;
  final bool hidden;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final r = row;
    // Төлбөр нь асуудалтай (хугацаа нь болсон өр) мөр улаанаар ялгарна — шийтийн адил нэг харахад олно.
    final owed = r.owed;
    final radius = BorderRadius.circular(AppRadius.md);
    final planTag = r.settled
        ? _Tag('Бүтэнд тооцсон', color: c.success)
        : r.planGuessed
        ? const _Tag('Багц?', dashed: true)
        : r.planKind == null
        ? null
        : _Tag(switch (r.planKind) {
            'FULL_YEAR' => 'Бүтэн жил',
            'INSTALLMENT' => 'Хагас жил',
            _ => 'Сар бүр',
          });
    return Material(
      color: owed ? Color.alphaBlend(c.error.withValues(alpha: 0.1), c.surface) : c.surface,
      shape: RoundedRectangleBorder(
        borderRadius: radius,
        side: BorderSide(color: owed ? c.error.withValues(alpha: 0.45) : c.line),
      ),
      child: InkWell(
        key: ValueKey('ledger-row-${r.id}'),
        borderRadius: radius,
        onTap: () => context.push('/app/payments/student/${Uri.encodeComponent(r.id)}'),
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text.rich(
                          TextSpan(
                            text: r.firstName,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                            children: [
                              TextSpan(
                                text: ' ${r.lastName}',
                                style: TextStyle(fontWeight: FontWeight.w400, color: c.inkDim),
                              ),
                            ],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.bodyLarge,
                        ),
                        const SizedBox(height: 2),
                        Wrap(
                          spacing: AppSpace.xs,
                          runSpacing: 2,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            ?planTag,
                            if (r.code != null) Text(r.code!, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpace.sm),
                  _RowSummary(row: r),
                ],
              ),
              const SizedBox(height: AppSpace.sm),
              _CompactBlocks(blocks: r.blocks, current: current, settled: r.settled),
              if (r.promise != null || r.lastNote != null) ...[const SizedBox(height: AppSpace.xs), _NoteLine(row: r)],
            ],
          ),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.text, {this.color, this.dashed = false});

  final String text;
  final Color? color;
  final bool dashed;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final label = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      child: Text(
        text,
        style: context.text.labelSmall?.copyWith(
          fontSize: 12,
          fontWeight: color == null ? FontWeight.w400 : FontWeight.w600,
          color: color ?? c.inkDim,
        ),
      ),
    );
    if (dashed) return DashedBox(radius: AppRadius.sm / 2, child: label);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: (color ?? c.ink).withValues(alpha: color == null ? 0.05 : 0.1),
        borderRadius: BorderRadius.circular(AppRadius.sm / 2),
      ),
      child: label,
    );
  }
}

/// Баруун талын нэг тоо — өр, илүү, бүтэн эсвэл дараагийн төлөх өдөр (вэбийн `RowSummary`).
class _RowSummary extends StatelessWidget {
  const _RowSummary({required this.row});

  final ClassLedgerRow row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final r = row;
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    Widget box(Widget top, [String? bottom]) => Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        top,
        if (bottom != null) Text(bottom, style: dim),
      ],
    );
    final bold = context.text.titleSmall?.copyWith(
      fontWeight: FontWeight.w700,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
    if (r.owed) {
      return box(
        Text(r.owedNow == null ? 'Өртэй' : formatMnt(r.owedNow!), style: bold?.copyWith(color: c.error)),
        r.overdueDays > 0 ? '${r.overdueDays} хоног хэтэрсэн' : '${r.owedMonths} сарын өр',
      );
    }
    if (r.credit > 0) {
      return box(Text('+${formatMnt(r.credit)}', style: bold?.copyWith(color: c.info)), 'илүү төлсөн');
    }
    if (r.complete) {
      return box(
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(AppIcons.check, size: 16, color: c.success),
            const SizedBox(width: 4),
            Text('Бүтэн', style: bold?.copyWith(color: c.success)),
          ],
        ),
      );
    }
    if (r.nextDue case final n?) {
      return box(
        Text(n.amount == null ? 'Дараагийн төлөлт' : shortMnt(n.amount!), style: context.text.bodyMedium),
        '${dayLabel(n.dueOn)}-нд',
      );
    }
    return const SizedBox.shrink();
  }
}

/// Тэмдэглэл/амлалтын товч мөр.
class _NoteLine extends StatelessWidget {
  const _NoteLine({required this.row});

  final ClassLedgerRow row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = row.promise;
    final small = context.text.bodySmall;
    return Row(
      children: [
        if (p != null && p.state == 'BROKEN')
          Text(
            '${dayLabel(p.on)} амласан, ${p.overdueDays} хоног',
            style: small?.copyWith(color: c.error, fontWeight: FontWeight.w600),
          )
        else if (p != null && p.state == 'UPCOMING')
          Text(
            '${dayLabel(p.on)} амласан',
            style: small?.copyWith(color: c.brand, fontWeight: FontWeight.w600),
          )
        else
          Icon(AppIcons.messageSquareText, size: 14, color: c.inkDim),
        if (row.lastNote != null) ...[
          const SizedBox(width: AppSpace.xs),
          Expanded(
            child: Text(
              row.lastNote!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: small?.copyWith(color: c.inkDim),
            ),
          ),
        ],
      ],
    );
  }
}

/// Жагсаалтын жижиг блокийн мөр (9 сар). Өнгө ДАНГААРАА утга илэрхийлэхгүй — төлөв бүр өөр хэлбэр.
class _CompactBlocks extends StatelessWidget {
  const _CompactBlocks({required this.blocks, required this.current, required this.settled});

  final List<LedgerBlock> blocks;
  final String current;
  final bool settled;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final (i, b) in blocks.indexed) ...[
          if (i > 0) const SizedBox(width: 4),
          Expanded(
            child: Semantics(
              label: blockLabel(b, settled: settled),
              excludeSemantics: true,
              child: Tooltip(
                message: blockLabel(b, settled: settled),
                excludeFromSemantics: true,
                child: BlockSwatch(block: b, current: b.month == current),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Нэг сарын блок: төлсөн — бүтэн ногоон, дутуу — цэнхэр хүрээ (төлсөн хувиар доороос дүүрнэ), өртэй —
/// улаан хүрээ + налуу зураас, болоогүй — тасархай хүрээ, сураагүй — бараг харагдахгүй саарал.
class BlockSwatch extends StatelessWidget {
  const BlockSwatch({super.key, required this.block, this.current = false, this.height = 28});

  final LedgerBlock block;
  final bool current;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final b = block;
    final radius = BorderRadius.circular(6);
    Widget inner;
    switch (b.state) {
      case BlockState.paid:
        inner = DecoratedBox(
          decoration: BoxDecoration(color: c.success, borderRadius: radius),
        );
      case BlockState.partial:
        final due = b.due ?? 0;
        final pct = due <= 0 ? 0.5 : ((b.paid ?? 0) / due).clamp(0.08, 1.0);
        inner = DecoratedBox(
          decoration: BoxDecoration(
            color: c.info.withValues(alpha: 0.1),
            borderRadius: radius,
            border: Border.all(color: c.info.withValues(alpha: 0.6)),
          ),
          child: Align(
            alignment: Alignment.bottomCenter,
            child: FractionallySizedBox(
              heightFactor: pct.toDouble(),
              widthFactor: 1,
              child: ColoredBox(color: c.info.withValues(alpha: 0.7)),
            ),
          ),
        );
      case BlockState.owed:
        inner = ClipRRect(
          borderRadius: radius,
          child: CustomPaint(
            painter: _HatchPainter(color: c.error.withValues(alpha: 0.32)),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: c.error.withValues(alpha: 0.05),
                borderRadius: radius,
                border: Border.all(color: c.error.withValues(alpha: 0.75), width: 2),
              ),
            ),
          ),
        );
      case BlockState.future:
        inner = DashedBox(radius: 6, color: c.ink.withValues(alpha: 0.25), child: const SizedBox.expand());
      case BlockState.off:
        inner = DecoratedBox(
          decoration: BoxDecoration(color: c.ink.withValues(alpha: 0.04), borderRadius: radius),
        );
    }
    return Container(
      height: height,
      decoration: current
          ? BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: c.brand.withValues(alpha: 0.35), width: 2),
            )
          : null,
      padding: current ? const EdgeInsets.all(1) : EdgeInsets.zero,
      child: inner,
    );
  }
}

class _HatchPainter extends CustomPainter {
  const _HatchPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = 2;
    for (var x = -size.height; x < size.width; x += 6) {
      canvas.drawLine(Offset(x, size.height), Offset(x + size.height, 0), p);
    }
  }

  @override
  bool shouldRepaint(_HatchPainter old) => old.color != color;
}

/// «i» — блокийн тайлбар (жагсаалтын доор биш, товчоор).
class _BlockLegendButton extends StatelessWidget {
  const _BlockLegendButton();

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: 'Блокийн тайлбар',
    constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
    icon: Icon(AppIcons.info, size: 18, color: context.colors.inkDim),
    onPressed: () => showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpace.xl, 0, AppSpace.xl, AppSpace.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Блокийн тайлбар', style: ctx.text.titleMedium),
              const SizedBox(height: AppSpace.md),
              for (final (s, t) in const [
                (BlockState.paid, 'Төлсөн'),
                (BlockState.partial, 'Дутуу (дүүргэлт = төлсөн хувь)'),
                (BlockState.owed, 'Өртэй, хугацаа нь болсон'),
                (BlockState.future, 'Хугацаа болоогүй'),
                (BlockState.off, 'Ангид сураагүй сар'),
              ])
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.sm),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 28,
                        child: BlockSwatch(
                          block: LedgerBlock(month: '', state: s, due: 2, paid: 1),
                          height: 18,
                        ),
                      ),
                      const SizedBox(width: AppSpace.sm),
                      Text(t, style: ctx.text.bodyMedium),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    ),
  );
}

/// Табын дүрс.
const IconData classPaymentsIcon = TeacherIcons.wallet;
