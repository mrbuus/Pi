import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/ui/ui.dart';
import '../domain/org_info.dart';

/// Төлбөр төлөх данс (вэбийн `PayInfo`): мөр бүрийг тусад нь, эсвэл бүгдийг нэг дор «Хуулах».
/// Өнгөгүй, саарал карт.
class PayInfoCard extends StatelessWidget {
  const PayInfoCard({super.key, required this.note});

  /// «Гүйлгээний утга» ([transferNote]).
  final String note;

  // Сургалтын үнэ энд байхгүй: үнийг зөвхөн серверээс (PARITY-AUDIT §4 #2). Сурагч/эцэг эхэд үнийн талбар
  // серверт гарахаар энд нэмнэ — апп өөрөө тоо зохиохгүй.
  String get allText => [
    '${BankInfo.account} ${BankInfo.name} ${BankInfo.holder}',
    'IBAN: ${BankInfo.iban}',
    'Утга: $note',
    OrgInfo.centerName,
  ].join('\n');

  @override
  Widget build(BuildContext context) {
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
          _InfoRow(label: 'Дансны дугаар', value: BankInfo.account, display: groupChars(BankInfo.account), copy: true),
          Divider(height: 1, color: context.colors.line),
          _InfoRow(label: 'IBAN', value: BankInfo.iban, display: groupChars(BankInfo.iban), copy: true),
          Divider(height: 1, color: context.colors.line),
          const _InfoRow(label: 'Хүлээн авагч', value: BankInfo.holder, copy: true),
          Divider(height: 1, color: context.colors.line),
          _InfoRow(label: 'Гүйлгээний утга', value: note, copy: true),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value, this.display, this.copy = false});

  final String label;

  /// Хуулах утга (бүлэглээгүй).
  final String value;

  /// Дэлгэцэд харуулах хэлбэр (бүлэглэсэн цифр); null бол [value].
  final String? display;
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
                SelectableText(display ?? value, style: context.text.titleSmall),
              ],
            ),
          ),
          if (copy) CopyButton(text: value, label: label),
        ],
      ),
    );
  }
}

/// «Хуулах» товч — санах ойд хуулаад хөнгөн haptic өгч «Хуулагдлаа» гэж snackbar-аар мэдэгдэнэ.
class CopyButton extends StatelessWidget {
  const CopyButton({super.key, required this.text, required this.label, this.caption = 'Хуулах'});

  final String text;

  /// Дэлгэц уншигчид: «<label> хуулах».
  final String label;
  final String caption;

  Future<void> _copy(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: text));
    unawaited(HapticFeedback.lightImpact());
    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text('$label хуулагдлаа')));
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '$label хуулах',
      // excludeSemantics нь доторх товчны үйлдлийг нууна — tap-ыг энд давхар зарлана (TalkBack/VoiceOver).
      onTap: () => unawaited(_copy(context)),
      excludeSemantics: true,
      child: OutlinedButton.icon(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(AppSizes.minTap, AppSizes.minTap),
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
        ),
        icon: Icon(AppIcons.copy, size: 16, color: context.colors.inkDim),
        label: Text(caption),
        onPressed: () => unawaited(_copy(context)),
      ),
    );
  }
}
