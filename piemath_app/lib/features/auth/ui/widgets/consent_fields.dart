import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/ui/ui.dart';

/// Нөхцөл, насны ангилал, эцэг эхийн зөвшөөрөл (вэбийн `ConsentFields`). Бодлогын холбоос апп дотор нээгдэнэ.
@immutable
class ConsentValue {
  const ConsentValue({this.acceptTerms = false, this.isMinor, this.guardianConsent = false});

  final bool acceptTerms;
  final bool? isMinor;
  final bool guardianConsent;

  bool get ready => acceptTerms && isMinor != null && (!isMinor! || guardianConsent);

  ConsentValue copyWith({bool? acceptTerms, bool? Function()? isMinor, bool? guardianConsent}) => ConsentValue(
        acceptTerms: acceptTerms ?? this.acceptTerms,
        isMinor: isMinor == null ? this.isMinor : isMinor(),
        guardianConsent: guardianConsent ?? this.guardianConsent,
      );
}

class ConsentFields extends StatelessWidget {
  const ConsentFields({super.key, required this.value, required this.onChanged, this.enabled = true});

  final ConsentValue value;
  final ValueChanged<ConsentValue> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final link = context.text.bodyMedium?.copyWith(
      color: context.colors.brand,
      decoration: TextDecoration.underline,
      decorationColor: context.colors.brand,
    );
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Нөхцөл ба зөвшөөрөл', style: context.text.titleSmall),
          const SizedBox(height: AppSpace.xs),
          Text('Бодлого нь хуульчаар хянуулах төсөл. Зөвшөөрөл бүрийг та өөрөө сонгоно', style: context.text.bodySmall),
          const SizedBox(height: AppSpace.sm),
          ConsentCheckRow(
            value: value.acceptTerms,
            enabled: enabled,
            semanticLabel: 'Үйлчилгээний нөхцөл, нууцлалын бодлогыг уншиж зөвшөөрч байна',
            onChanged: (v) => onChanged(value.copyWith(acceptTerms: v)),
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: 'Үйлчилгээний нөхцөл',
                    style: link,
                    recognizer: TapGestureRecognizer()..onTap = () => context.push('/terms'),
                  ),
                  const TextSpan(text: ', '),
                  TextSpan(
                    text: 'нууцлалын бодлогыг',
                    style: link,
                    recognizer: TapGestureRecognizer()..onTap = () => context.push('/privacy'),
                  ),
                  const TextSpan(text: ' уншиж зөвшөөрч байна'),
                ],
              ),
              style: context.text.bodyMedium,
            ),
          ),
          const SizedBox(height: AppSpace.md),
          Text('Насны ангилал', style: context.text.labelLarge),
          const SizedBox(height: AppSpace.sm),
          SegmentedButton<bool>(
            emptySelectionAllowed: true,
            segments: const [
              ButtonSegment(value: true, label: Text('18 нас хүрээгүй')),
              ButtonSegment(value: false, label: Text('18 ба түүнээс дээш')),
            ],
            selected: {?value.isMinor},
            onSelectionChanged: enabled
                ? (s) => onChanged(value.copyWith(isMinor: () => s.isEmpty ? null : s.first, guardianConsent: false))
                : null,
          ),
          if (value.isMinor ?? false) ...[
            const SizedBox(height: AppSpace.md),
            ConsentCheckRow(
              value: value.guardianConsent,
              enabled: enabled,
              semanticLabel: 'Эцэг эх, хууль ёсны төлөөлөгчтэйгөө бодлогыг уншиж, зөвшөөрлийг нь авсан',
              onChanged: (v) => onChanged(value.copyWith(guardianConsent: v)),
              child: Text(
                'Эцэг эх, хууль ёсны төлөөлөгчтэйгөө бодлогыг уншиж, зөвшөөрлийг нь авсан',
                style: context.text.bodyMedium,
              ),
            ),
            const SizedBox(height: AppSpace.xs),
            Text(
              'Энэ нь таны мэдүүлэг. Төв шаардлагатай үед төлөөлөгчтэй холбогдон баталгаажуулна',
              style: context.text.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

/// Чагт + бичвэр (бичвэрийг товшиход ч солигдоно).
class ConsentCheckRow extends StatelessWidget {
  const ConsentCheckRow({
    super.key,
    required this.value,
    required this.onChanged,
    required this.child,
    required this.semanticLabel,
    this.enabled = true,
  });

  final bool value;
  final ValueChanged<bool> onChanged;
  final Widget child;
  final String semanticLabel;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Checkbox(
          value: value,
          semanticLabel: semanticLabel,
          onChanged: enabled ? (v) => onChanged(v ?? false) : null,
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: enabled ? () => onChanged(!value) : null,
              child: child,
            ),
          ),
        ),
      ],
    );
  }
}
