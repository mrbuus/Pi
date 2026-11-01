import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/payment_status/payment_status.dart';
import '../domain/org_info.dart';

/// Төлбөр төлөх данс (вэбийн `PayInfo`): мөр бүрийг тусад нь, эсвэл бүгдийг нэг дор «Хуулах».
/// Өнгөгүй, саарал карт.
class PayInfoCard extends StatelessWidget {
  const PayInfoCard({super.key, required this.note, this.tier});

  /// «Гүйлгээний утга» ([transferNote]).
  final String note;

  /// Сургуулийн ангийн үнийн түвшин; null бол үнэ харуулахгүй.
  final TuitionTier? tier;

  String get allText {
    final monthly = tier?.amountOf(TuitionPlanKind.monthly);
    final yearly = tier?.amountOf(TuitionPlanKind.fullYear);
    return [
      '${BankInfo.account} ${BankInfo.name} ${BankInfo.holder}',
      'IBAN: ${BankInfo.iban}',
      'Утга: $note',
      OrgInfo.centerName,
      if (monthly != null) 'Сарын төлбөр: ${formatMnt(monthly)}',
      if (yearly != null) 'Бүтэн жилийн төлбөр: ${formatMnt(yearly)}',
    ].join('\n');
  }

  @override
  Widget build(BuildContext context) {
    final monthly = tier?.amountOf(TuitionPlanKind.monthly);
    final yearly = tier?.amountOf(TuitionPlanKind.fullYear);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Semantics(header: true, child: Text('Төлбөр төлөх данс', style: context.text.titleMedium)),
              ),
              CopyButton(text: allText, label: 'Бүх мэдээллийг', caption: 'Бүгдийг хуулах'),
            ],
          ),
          Text(OrgInfo.centerName, style: context.text.bodySmall),
          const SizedBox(height: AppSpace.sm),
          Divider(height: 1, color: context.colors.line),
          const _InfoRow(label: 'Дансны дугаар', value: BankInfo.account, copy: true),
          Divider(height: 1, color: context.colors.line),
          const _InfoRow(label: 'IBAN', value: BankInfo.iban, copy: true),
          Divider(height: 1, color: context.colors.line),
          const _InfoRow(label: 'Хүлээн авагч, ${BankInfo.name}', value: BankInfo.holder),
          Divider(height: 1, color: context.colors.line),
          _InfoRow(label: 'Гүйлгээний утга', value: note, copy: true),
          Divider(height: 1, color: context.colors.line),
          if (monthly != null || yearly != null) ...[
            const SizedBox(height: AppSpace.md),
            Row(
              children: [
                if (monthly != null) Expanded(child: _Amount(label: 'Сарын төлбөр', amount: monthly)),
                if (yearly != null) Expanded(child: _Amount(label: 'Бүтэн жилийн төлбөр', amount: yearly)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value, this.copy = false});

  final String label;
  final String value;
  final bool copy;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: context.text.bodySmall),
                SelectableText(value, style: context.text.titleSmall),
              ],
            ),
          ),
          if (copy) CopyButton(text: value, label: label),
        ],
      ),
    );
  }
}

class _Amount extends StatelessWidget {
  const _Amount({required this.label, required this.amount});

  final String label;
  final int amount;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: context.text.bodySmall),
        Text(formatMnt(amount), style: context.text.titleMedium),
      ],
    );
  }
}

/// «Хуулах» товч — санах ойд хуулаад «Хуулсан» гэж snackbar-аар мэдэгдэнэ.
class CopyButton extends StatelessWidget {
  const CopyButton({super.key, required this.text, required this.label, this.caption = 'Хуулах'});

  final String text;

  /// Дэлгэц уншигчид: «<label> хуулах».
  final String label;
  final String caption;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '$label хуулах',
      excludeSemantics: true,
      child: OutlinedButton.icon(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(AppSizes.minTap, AppSizes.minTap),
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
        ),
        icon: Icon(PaymentIcons.copy, size: 16, color: context.colors.inkDim),
        label: Text(caption),
        onPressed: () async {
          await Clipboard.setData(ClipboardData(text: text));
          if (!context.mounted) return;
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(SnackBar(content: Text('$label хуулсан')));
        },
      ),
    );
  }
}
