import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/payment_status/payment_status.dart';
import '../data/payment_record.dart';
import '../data/payments_repository.dart';
import '../domain/org_info.dart';
import '../domain/payment_history.dart';
import 'pay_info_card.dart';

/// Сурагчийн «Миний төлбөр» (`/app/student/payments`, вэбийн `StudentPaymentsClient`):
/// хэдий хүртэл төлсөн, төлөх данс, нийлбэр, сараар бүлэглэсэн түүх.
class StudentPaymentsScreen extends ConsumerWidget {
  const StudentPaymentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final user = session is SignedIn ? session.user : null;
    final payments = ref.watch(myPaymentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Миний төлбөр')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(paidUntilProvider(null));
          await ref.refresh(myPaymentsProvider.future).catchError((_) => <PaymentRecord>[]);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
          children: [
            const PaidUntilCard(),
            const SizedBox(height: AppSpace.lg),
            PayInfoCard(
              note: transferNote(firstName: user?.firstName, lastName: user?.lastName, phone: user?.phone),
            ),
            const SizedBox(height: AppSpace.lg),
            ...payments.when(
              skipLoadingOnRefresh: false,
              loading: () => const [SkeletonPulse(child: SkeletonCard(lines: 4))],
              error: (e, _) => [
                SizedBox(
                  height: 320,
                  child: ErrorState(
                    message: e is ApiError ? e.message : AppStrings.genericError,
                    onRetry: () => ref.invalidate(myPaymentsProvider),
                  ),
                ),
              ],
              data: (rows) => [PaymentHistoryView(history: PaymentHistory(rows))],
            ),
          ],
        ),
      ),
    );
  }
}

/// Нийлбэр + сараар бүлэглэсэн түүх.
class PaymentHistoryView extends StatelessWidget {
  const PaymentHistoryView({super.key, required this.history});

  final PaymentHistory history;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Row(
            children: [
              Expanded(
                child: _Total(label: 'Нийт төлсөн', amount: history.totalConfirmed),
              ),
              Container(width: 1, height: 40, color: context.colors.line),
              const SizedBox(width: AppSpace.lg),
              Expanded(
                child: _Total(label: 'Баталгаажихыг хүлээж буй', amount: history.totalPending),
              ),
            ],
          ),
        ),
        const SectionHeader(title: 'Төлбөрийн түүх'),
        if (history.isEmpty)
          const AppCard(
            child: SizedBox(
              height: 240,
              child: EmptyState(
                icon: AppIcons.receipt,
                title: 'Төлбөр бүртгэгдээгүй байна',
                message: 'Төлбөр төлж, ажилтан баталгаажуулмагц энд харагдана.',
              ),
            ),
          )
        else
          for (final (month, rows) in history.groups) ...[
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.sm, bottom: AppSpace.xs),
              child: Text(
                paymentMonthLabel(month),
                style: context.text.labelMedium?.copyWith(color: context.colors.inkDim),
              ),
            ),
            AppCard(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.xs),
              child: Column(
                children: [
                  for (var i = 0; i < rows.length; i++) ...[
                    if (i > 0) Divider(height: 1, color: context.colors.line),
                    PaymentRow(
                      status: PaymentStatus.fromApi(rows[i].status),
                      amount: rows[i].amount,
                      dateLabel: isoDateLabel(rows[i].paidAt ?? rows[i].createdAt),
                      meta: [
                        if (rows[i].forMonth != null) '${paymentMonthLabel(rows[i].forMonth!)}ын төлбөр',
                        paymentMethodLabel(rows[i].method),
                      ],
                      note: rows[i].description,
                    ),
                  ],
                ],
              ),
            ),
          ],
      ],
    );
  }
}

class _Total extends StatelessWidget {
  const _Total({required this.label, required this.amount});

  final String label;
  final num amount;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: context.text.bodySmall),
        const SizedBox(height: 2),
        Text(formatMnt(amount), style: context.text.titleLarge),
      ],
    );
  }
}
