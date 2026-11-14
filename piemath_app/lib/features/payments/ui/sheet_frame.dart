import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';

/// Доороос гарах цонх (вэбийн `LedgerDialog`). Гар гарахад дээшилнэ, агуулга урт бол гүйлгэнэ.
Future<T?> showLedgerSheet<T>(BuildContext context, WidgetBuilder builder) => showModalBottomSheet<T>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: builder,
);

/// Цонхны бие: гарчиг, тайлбар, агуулга, доод товч.
class LedgerSheetFrame extends StatelessWidget {
  const LedgerSheetFrame({
    super.key,
    required this.title,
    this.subtitle,
    required this.children,
    this.footer,
    this.error,
  });

  final String title;
  final String? subtitle;
  final List<Widget> children;

  /// Үндсэн товч (доор, бүтэн өргөн).
  final Widget? footer;

  /// Серверийн алдааны бичвэр (монгол).
  final String? error;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          AppSpace.gutter,
          0,
          AppSpace.gutter,
          AppSpace.xl + MediaQuery.paddingOf(context).bottom,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: context.text.titleMedium),
            if (subtitle != null) ...[
              const SizedBox(height: AppSpace.xs),
              Text(subtitle!, style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
            ],
            const SizedBox(height: AppSpace.lg),
            ...children,
            if (error != null) ...[
              const SizedBox(height: AppSpace.md),
              Text(
                error!,
                key: const Key('sheet-error'),
                style: context.text.bodyMedium?.copyWith(color: c.error),
              ),
            ],
            if (footer != null) ...[const SizedBox(height: AppSpace.lg), footer!],
          ],
        ),
      ),
    );
  }
}

/// Бүтэн өргөнтэй үндсэн товч (48dp-ээс багагүй).
class SheetPrimaryButton extends StatelessWidget {
  const SheetPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.busyLabel,
    this.busy = false,
  });

  final String label;
  final String? busyLabel;
  final bool busy;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => FilledButton(
    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
    onPressed: busy ? null : onPressed,
    child: Text(busy ? (busyLabel ?? 'Хадгалж байна') : label),
  );
}

/// Шошготой оролтын талбарын хүрээ.
class SheetField extends StatelessWidget {
  const SheetField({super.key, required this.label, required this.child, this.hint});

  final String label;
  final Widget child;

  /// Талбарын доорх жижиг тайлбар.
  final String? hint;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpace.md),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(label, style: context.text.labelMedium?.copyWith(color: context.colors.inkDim)),
        const SizedBox(height: AppSpace.xs),
        child,
        if (hint != null) ...[
          const SizedBox(height: AppSpace.xs),
          Text(hint!, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
        ],
      ],
    ),
  );
}
