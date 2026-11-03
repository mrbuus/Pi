import 'package:flutter/material.dart';

import 'icons.dart';
import 'motion.dart';
import 'tokens.dart';

/// Карт — дэвсгэр нь ҮРГЭЛЖ `surface` (цагаан/бараан саарал), нимгэн хүрээтэй.
/// Өнгөт дэвсгэртэй карт ХОРИОТОЙ (RULES §3). Өнгийг зөвхөн [accent] зурвас эсвэл дүрсэнд.
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpace.lg),
    this.onTap,
    this.accent,
    this.semanticLabel,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  /// Зүүн талын 3px зурвас (анги, төлөвийн өнгө — бичвэр дээр биш, STATUS §6.4).
  final Color? accent;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final radius = BorderRadius.circular(AppRadius.lg);
    Widget content = Padding(padding: padding, child: child);
    if (accent != null) {
      content = DecoratedBox(
        decoration: BoxDecoration(
          border: Border(left: BorderSide(color: accent!, width: 3)),
        ),
        child: content,
      );
    }
    final Widget card = Semantics(
      container: true,
      button: onTap != null,
      label: semanticLabel,
      child: Material(
        color: c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: BorderSide(color: c.line),
        ),
        clipBehavior: Clip.antiAlias,
        child: onTap == null ? content : InkWell(onTap: onTap, child: content),
      ),
    );
    // Дарахад шууд хариу (UX-RESEARCH §4): 0.97 scale, зөвхөн transform.
    return onTap == null ? card : PressableScale(child: card);
  }
}

/// Хэсгийн гарчиг (картын дээр). Төгсгөлд цэг тавихгүй.
class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.trailing, this.padding});

  final String title;
  final Widget? trailing;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? const EdgeInsets.only(top: AppSpace.xl, bottom: AppSpace.sm),
      child: Row(
        children: [
          Expanded(
            child: Semantics(header: true, child: Text(title, style: context.text.titleMedium)),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// Хуудасны том гарчиг + сонголтоор дэд мөр.
class PageHeader extends StatelessWidget {
  const PageHeader({super.key, required this.title, this.subtitle, this.trailing});

  final String title;
  final Widget? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.lg),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(header: true, child: Text(title, style: context.text.headlineMedium)),
                if (subtitle != null) ...[
                  const SizedBox(height: AppSpace.xs),
                  DefaultTextStyle.merge(style: context.text.bodySmall, child: subtitle!),
                ],
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// «i» тэмдэг — жижиг тайлбар бичвэр олшруулахын оронд (STATUS §3.5, RULES §3).
/// Дарахад доороос тайлбар гарна.
class InfoHint extends StatelessWidget {
  const InfoHint({super.key, required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: title,
      icon: Icon(AppIcons.info, size: 18, color: context.colors.inkDim),
      onPressed: () => showModalBottomSheet<void>(
        context: context,
        builder: (ctx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.xl, 0, AppSpace.xl, AppSpace.xl),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: ctx.text.titleMedium),
                const SizedBox(height: AppSpace.sm),
                Text(message, style: ctx.text.bodyMedium),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
