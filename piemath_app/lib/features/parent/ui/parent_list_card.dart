import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';

/// Огноотой мөр: зүүн талд огноо + тайлбар, баруун талд төлөв.
class ParentDatedRow extends StatelessWidget {
  const ParentDatedRow({super.key, required this.date, required this.subtitle, required this.trailing});

  final String date;
  final String subtitle;
  final Widget trailing;

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
                Text(date, style: context.text.titleSmall),
                if (subtitle.isNotEmpty) Text(subtitle, style: context.text.bodySmall),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          Flexible(child: trailing),
        ],
      ),
    );
  }
}

/// Мөрүүдтэй карт; хоосон бол тайлбар.
class ParentListCard extends StatelessWidget {
  const ParentListCard({super.key, required this.children, required this.empty});

  final List<Widget> children;
  final String empty;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
      child: children.isEmpty
          ? Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
              child: Text(empty, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
            )
          : Column(
              children: [
                for (var i = 0; i < children.length; i++) ...[
                  if (i > 0) Divider(height: 1, color: context.colors.line),
                  children[i],
                ],
              ],
            ),
    );
  }
}
