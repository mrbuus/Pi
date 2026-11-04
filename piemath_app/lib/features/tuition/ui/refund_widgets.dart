import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../application/tuition_providers.dart';
import '../data/tuition_models.dart';

/// Эрхгүй үеийн төвийг сахисан тайлбар (403 ч мөн адил).
class TuitionDenied extends StatelessWidget {
  const TuitionDenied({super.key});

  @override
  Widget build(BuildContext context) => const EmptyState(
    icon: AppIcons.shield,
    title: 'Энэ хэсэг танд нээгдээгүй',
    message: 'Сургалтын төлбөрийн буцаалтыг Админ болон санхүүгийн эрхтэй Багш+ хариуцна',
  );
}

/// Эрхийн хаалга: эрх шалгаж байхад skeleton, эрхгүй бол [TuitionDenied], алдаа бол «Дахин оролдох».
/// Эрхгүй хэрэглэгчид [builder] огт зурагдахгүй — тиймээс буцаалтын API ч дуудагдахгүй.
class TuitionGate extends ConsumerWidget {
  const TuitionGate({super.key, required this.builder});

  final Widget Function(BuildContext context, TuitionAccess access) builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref
        .watch(tuitionAccessProvider)
        .when(
          loading: () => const LoadingState(cards: 2),
          error: (e, _) => ErrorState(
            message: e is ApiError ? e.message : AppStrings.genericError,
            onRetry: () => ref.invalidate(tuitionAccessProvider),
          ),
          data: (access) => access.allowed ? builder(context, access) : const TuitionDenied(),
        );
  }
}

/// «2026.11.03» — `YYYY-MM-DD` эсвэл ISO огнооноос (гарсан өдөр — цагийн бүсгүй хуанлийн өдөр).
String refundDay(String? key) {
  final d = parseDateKey(key);
  return d == null ? '' : DateMn.numeric(d);
}

/// «2026.11.03 14:20» — агшин (UB цагаар).
String refundMoment(String? iso) {
  final t = parseApiInstant(iso);
  return t == null ? '' : DateMn.numericWithTime(UbDateTime.fromInstant(t));
}

/// Төлөвийн чип (өнгө зөвхөн дүрсэнд).
class RefundStatusChip extends StatelessWidget {
  const RefundStatusChip(this.status, {super.key});

  final RefundStatus status;

  @override
  Widget build(BuildContext context) {
    final (icon, tone) = switch (status) {
      RefundStatus.draft => (AppIcons.document, ChipTone.neutral),
      RefundStatus.pendingApproval => (AppIcons.hourglass, ChipTone.warning),
      RefundStatus.approved => (AppIcons.success, ChipTone.info),
      RefundStatus.paid => (AppIcons.payments, ChipTone.success),
      RefundStatus.cancelled => (AppIcons.failure, ChipTone.error),
      RefundStatus.unknown => (AppIcons.circleDot, ChipTone.neutral),
    };
    return MetaChip(label: status.label, icon: icon, tone: tone);
  }
}

/// Нэг баримт (шошго + утга).
typedef RefundFact = ({String label, String value, ChipTone tone});

RefundFact fact(String label, String value, [ChipTone tone = ChipTone.neutral]) =>
    (label: label, value: value, tone: tone);

/// Баримтуудыг 2 баганаар (утсан дээр), картын дотор.
class RefundFacts extends StatelessWidget {
  const RefundFacts({super.key, required this.facts});

  final List<RefundFact> facts;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final w = (constraints.maxWidth - AppSpace.lg) / 2;
          return Wrap(
            spacing: AppSpace.lg,
            runSpacing: AppSpace.md,
            children: [
              for (final f in facts)
                SizedBox(
                  width: w,
                  child: Semantics(
                    label: '${f.label}: ${f.value}',
                    excludeSemantics: true,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(f.label, style: context.text.bodySmall),
                        const SizedBox(height: 2),
                        Text(
                          f.value,
                          style: context.text.titleMedium?.copyWith(
                            color: f.tone == ChipTone.neutral ? null : MetaChip.toneColor(context, f.tone),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

/// Серверийн анхааруулгууд.
class RefundWarnings extends StatelessWidget {
  const RefundWarnings({super.key, required this.codes});

  final List<String> codes;

  @override
  Widget build(BuildContext context) {
    if (codes.isEmpty) return const SizedBox.shrink();
    final c = context.colors;
    return AppCard(
      accent: c.warning,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final code in codes)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(AppIcons.warning, size: 18, color: c.warning),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(child: Text(refundWarningLabel(code), style: context.text.bodyMedium)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Серверийн тооцоог ЯГ харуулна: тоо, мөнгө (₮), тайлбарын мөр бүр дарааллаар нь. Апп юу ч тооцохгүй.
class RefundPreviewView extends StatelessWidget {
  const RefundPreviewView({super.key, required this.preview});

  final RefundPreview preview;

  @override
  Widget build(BuildContext context) {
    final p = preview;
    final calc = p.calculation;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(p.student.fullName, style: context.text.titleMedium),
        const SizedBox(height: 2),
        Meta(
          items: [
            p.classroom.name,
            'Гарсан ${refundDay(p.leftOn)}',
            if (p.joinedOn != null) 'Тооцоо ${refundDay(p.joinedOn)}-ээс',
          ],
        ),
        if (p.plan != null) ...[
          const SizedBox(height: AppSpace.sm),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: MetaChip(label: p.plan!.label, icon: AppIcons.receipt),
          ),
        ],
        if (calc.warnings.isNotEmpty) ...[const SizedBox(height: AppSpace.md), RefundWarnings(codes: calc.warnings)],
        const SizedBox(height: AppSpace.md),
        RefundFacts(
          facts: [
            fact(
              'Буцаах дүн',
              formatMnt(calc.refundAmount),
              calc.refundAmount > 0 ? ChipTone.success : ChipTone.neutral,
            ),
            fact('Төлсөн', formatMnt(calc.totalPaid)),
            fact('Ногдох төлбөр', formatMnt(calc.owed)),
            fact('Нэг хичээлийн үнэ', formatMnt(calc.dailyRate)),
            fact('Гарсан сарын хичээл', '${calc.totalLessonDays}'),
            fact('Тоологдсон хичээл', '${calc.attendedLessonDays}'),
            if (calc.shortfall > 0) fact('Дутуу төлбөр', formatMnt(calc.shortfall), ChipTone.error),
          ],
        ),
        if (p.explanation.isNotEmpty) ...[
          const SectionHeader(title: 'Тооцооны тайлбар'),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final line in p.explanation)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
                    child: Text(line, style: context.text.bodyMedium),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// API 403 бол эрхгүйн тайлбар, бусад алдаа бол серверийн монгол мессеж.
Widget refundErrorView(Object e, VoidCallback onRetry) {
  if (e is ApiError && e.kind == ApiErrorKind.forbidden) return const TuitionDenied();
  if (e is ApiError && e.kind == ApiErrorKind.notFound) {
    return const EmptyState(icon: AppIcons.fileQuestion, title: 'Буцаалт олдсонгүй');
  }
  return ErrorState(message: e is ApiError ? e.message : AppStrings.genericError, onRetry: onRetry);
}
