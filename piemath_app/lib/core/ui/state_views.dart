import 'package:flutter/material.dart';

import 'icons.dart';
import 'skeleton.dart';
import 'strings.dart';
import 'tokens.dart';

/// Ачаалж буй төлөв — бодит бүтцийн хэлбэртэй skeleton (хоосон цагаан дэлгэц ХЭЗЭЭ Ч үгүй).
class LoadingState extends StatelessWidget {
  const LoadingState({super.key, this.cards = 3, this.padding = const EdgeInsets.all(AppSpace.gutter)});

  /// Хэдэн карт хэлбэр зурах.
  final int cards;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return SkeletonPulse(
      child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        padding: padding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SkeletonLine(widthFactor: 0.45, height: 22),
            const SizedBox(height: AppSpace.lg),
            for (var i = 0; i < cards; i++) ...[
              if (i > 0) const SizedBox(height: AppSpace.md),
              SkeletonCard(lines: i.isEven ? 2 : 3),
            ],
          ],
        ),
      ),
    );
  }
}

/// Төлөвийн дүрсийг анимацаар солих: `(icon) => AnimationSlot(slot: ..., fallback: icon)`.
/// Анимацын файл байхгүй бол [icon] яг хэвээр зурагдана.
typedef StateArtBuilder = Widget Function(Widget icon);

/// Төлөвийн нийтлэг байрлал: дүрс, гарчиг, тайлбар, товч.
class _StateLayout extends StatelessWidget {
  const _StateLayout({
    required this.icon,
    required this.iconColor,
    required this.title,
    this.message,
    this.action,
    this.art,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String? message;
  final Widget? action;
  final StateArtBuilder? art;

  @override
  Widget build(BuildContext context) {
    final iconView = Icon(icon, size: 40, color: iconColor);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpace.xl),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              art?.call(iconView) ?? iconView,
              const SizedBox(height: AppSpace.lg),
              Text(title, style: context.text.titleMedium, textAlign: TextAlign.center),
              if (message != null) ...[
                const SizedBox(height: AppSpace.sm),
                Text(
                  message!,
                  style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                  textAlign: TextAlign.center,
                ),
              ],
              if (action != null) ...[
                const SizedBox(height: AppSpace.xl),
                action!,
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Алдааны төлөв — ойлгомжтой монгол мессеж + «Дахин оролдох».
/// Техникийн англи алдааг хэрэглэгчид ХЭЗЭЭ Ч харуулахгүй (STATUS §6.7).
class ErrorState extends StatelessWidget {
  const ErrorState({
    super.key,
    this.title = 'Алдаа гарлаа',
    this.message = AppStrings.genericError,
    this.onRetry,
    this.icon = AppIcons.error,
    this.art,
  });

  final String title;
  final String message;
  final VoidCallback? onRetry;
  final IconData icon;

  /// Дүрсийг анимацын слотоор солих ([StateArtBuilder]).
  final StateArtBuilder? art;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: _StateLayout(
        icon: icon,
        iconColor: context.colors.error,
        title: title,
        message: message,
        art: art,
        action: onRetry == null
            ? null
            : FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(AppIcons.retry, size: 18),
                label: const Text(AppStrings.retry),
              ),
      ),
    );
  }
}

/// Хоосон төлөв — яагаад хоосон, юу хийвэл дүүрэхийг хэлнэ.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    this.title = AppStrings.emptyDefault,
    this.message,
    this.icon = AppIcons.empty,
    this.action,
    this.art,
  });

  final String title;
  final String? message;
  final IconData icon;
  final Widget? action;

  /// Дүрсийг анимацын слотоор солих ([StateArtBuilder]).
  final StateArtBuilder? art;

  @override
  Widget build(BuildContext context) {
    return _StateLayout(
      icon: icon,
      iconColor: context.colors.inkDim,
      title: title,
      message: message,
      action: action,
      art: art,
    );
  }
}
