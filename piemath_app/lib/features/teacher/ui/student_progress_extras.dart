import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/payment_status/money.dart';
import '../application/student_calendar_providers.dart';
import '../data/student_calendar_models.dart';
import 'student_day_sheet.dart';

String _md(String key) {
  final p = key.split('-');
  return p.length == 3 ? '${p[1]}.${p[2]}' : key;
}

/// «Одоо гарвал буцаах дүн» (вэб 2026-11-08, `RefundEstimateRow`): нэг мөр, дарахад задаргаа. Багш ч харна
/// (эзний шийдвэр) — гэхдээ Багшид сервер зөвхөн буцаах дүн + хичээлийн тоог өгнө (`money` null). Анги/хуваарьгүй,
/// хасагдсан сурагчид юу ч харуулахгүй; хуваарьгүй ангид тайлбар. Тооцоо = «Сургалтаас хасах»-тай ЯГ ижил (серверт).
class StudentRefundEstimateRow extends ConsumerStatefulWidget {
  const StudentRefundEstimateRow({super.key, required this.studentId});

  final String studentId;

  static const hint =
      '«Сургалтаас хасах» үеийн гэрээний тооцоо, өнөөдрөөр. Бүтэн сар бүр сарын төлбөрөөр, энэ сар суусан хичээлээр '
      '(сарын төлбөр ÷ 16 эсвэл 12). Тасалсан өдөр хасагдахгүй, энэ сарын 1 чөлөө хасагдана. Вэбд ирц бүртгэхээс '
      'өмнөх хичээлд бүгдэд нь суусан гэж тооцно';

  @override
  ConsumerState<StudentRefundEstimateRow> createState() => _StudentRefundEstimateRowState();
}

class _StudentRefundEstimateRowState extends ConsumerState<StudentRefundEstimateRow> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(studentRefundEstimateProvider(widget.studentId));
    final c = context.colors;
    final e = async.value;
    if (async.isLoading && e == null) {
      return const Padding(
        padding: EdgeInsets.only(top: AppSpace.md),
        child: SkeletonPulse(child: SkeletonLine(width: 180, height: 14)),
      );
    }
    if (e == null) return const SizedBox.shrink();
    if (!e.applicable) {
      if (e.reason != 'NO_SCHEDULE') return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.only(top: AppSpace.md),
        child: Text(
          'Ангийн хуваарь алга тул буцаах дүн бодогдохгүй',
          style: context.text.bodySmall?.copyWith(color: c.inkDim),
        ),
      );
    }
    final cur = e.current;
    final m = e.money;
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.md),
      child: AppCard(
        lip: false,
        padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.xs, AppSpace.xs, AppSpace.xs),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Semantics(
                    button: true,
                    expanded: _open,
                    child: InkWell(
                      onTap: () => setState(() => _open = !_open),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Одоо гарвал буцаах дүн',
                                    style: context.text.bodySmall?.copyWith(color: c.inkDim),
                                  ),
                                  Text(
                                    e.refund > 0 ? formatMnt(e.refund) : 'Буцаалтгүй',
                                    style: context.text.titleSmall?.copyWith(color: e.refund > 0 ? c.ink : c.inkDim),
                                  ),
                                ],
                              ),
                            ),
                            AnimatedRotation(
                              turns: _open ? 0.5 : 0,
                              duration: const Duration(milliseconds: 150),
                              child: Icon(AppIcons.expand, size: 18, color: c.inkDim),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const InfoHint(title: 'Буцаах дүнгийн тайлбар', message: StudentRefundEstimateRow.hint),
              ],
            ),
            if (_open) ...[
              Divider(height: 1, color: c.line),
              const SizedBox(height: AppSpace.xs),
              _Line(k: 'Тооцсон хугацаа', v: '${_md(e.countFrom)}–${_md(e.asOf)}'),
              _Line(k: 'Бүтэн сар', v: e.fullMonths > 0 ? '${e.fullMonths}' : 'Байхгүй'),
              if (cur != null)
                _Line(
                  k: 'Энэ сар (${_md(cur.start)}-нөөс)',
                  v: cur.counted == cur.lessons ? '${cur.lessons} хичээл' : '${cur.lessons} хичээлээс ${cur.counted}',
                  note: cur.leaveDay == null ? null : '${_md(cur.leaveDay!)} чөлөө хассан',
                ),
              _Line(
                k: 'Болсон хичээл',
                v: '${e.lessonsHeld}',
                note: e.lessonsAssumed > 0
                    ? '${e.lessonsAssumed} нь вэбд ирц бүртгэхээс өмнө'
                          '${e.webStart == null ? '' : ' (${_md(e.webStart!)})'}, суусанд тооцсон'
                    : null,
              ),
              _Line(k: 'Сард ногдох хичээл', v: '${e.lessonsPerMonth}'),
              if (m != null) ...[
                _Line(k: 'Суусан хичээлийн төлбөр', v: formatMnt(m.owed)),
                _Line(k: 'Төлсөн', v: formatMnt(m.paid)),
                if (m.refundedBefore > 0) _Line(k: 'Өмнө буцаасан', v: formatMnt(m.refundedBefore)),
              ],
              const SizedBox(height: AppSpace.xs),
            ],
          ],
        ),
      ),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.k, required this.v, this.note});

  final String k;
  final String v;
  final String? note;

  @override
  Widget build(BuildContext context) {
    final dim = context.text.bodySmall?.copyWith(color: context.colors.inkDim);
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.xs, right: AppSpace.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(k, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
                if (note != null) Text(note!, style: dim),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.md),
          Text(v, style: context.text.labelLarge),
        ],
      ),
    );
  }
}

/// Сурагчийн нөхөлтийн түүх (вэб 2026-11-08, `MakeupHistory`): «Нөхөлт, N удаа», мөр бүр «12-6 ангид нөхөж
/// суусан» / «406-д нөхөж хийсэн», дарахад хэзээ, хэн, ямар тест. Нөхөлт байхгүй бол юу ч зурахгүй.
class StudentMakeupHistory extends ConsumerWidget {
  const StudentMakeupHistory({super.key, required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final list = ref.watch(studentMakeupHistoryProvider(studentId)).value ?? const <MakeupHistoryItem>[];
    if (list.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Нөхөлт, ${list.length} удаа', style: context.text.titleSmall),
          const SizedBox(height: AppSpace.sm),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final (i, v) in list.indexed) ...[
                  if (i > 0) Divider(height: 1, color: context.colors.line),
                  _MakeupRow(visit: v, studentId: studentId),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MakeupRow extends StatefulWidget {
  const _MakeupRow({required this.visit, required this.studentId});

  final MakeupHistoryItem visit;
  final String studentId;

  @override
  State<_MakeupRow> createState() => _MakeupRowState();
}

class _MakeupRowState extends State<_MakeupRow> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final v = widget.visit;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          button: true,
          expanded: _open,
          child: InkWell(
            onTap: () => setState(() => _open = !_open),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: AppSizes.minTap),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
                child: Row(
                  children: [
                    SizedBox(
                      width: 44,
                      child: Text(_md(v.date), style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                    ),
                    Icon(v.place.room406 ? AppIcons.doorOpen : AppIcons.repeat, size: 16, color: c.brand),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            v.label,
                            style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (v.tests.isNotEmpty)
                            Text(
                              v.tests.map((t) => t.title).join(', '),
                              style: context.text.bodySmall?.copyWith(color: c.inkDim),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                    AnimatedRotation(
                      turns: _open ? 0.5 : 0,
                      duration: const Duration(milliseconds: 150),
                      child: Icon(AppIcons.expand, size: 16, color: c.inkDim),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (_open)
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.lg, 0, AppSpace.lg, AppSpace.md),
            child: MakeupVisitBody(visit: v, studentId: widget.studentId),
          ),
      ],
    );
  }
}
