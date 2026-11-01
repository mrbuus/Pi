import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';

/// Алдааг хэрэглэгчид харуулах монгол бичвэр (техникийн мессеж хэзээ ч биш).
String errorMessageOf(Object error) => error is ApiError ? error.message : AppStrings.genericError;

/// `AsyncValue`-ийг skeleton / алдаа+дахин оролдох / өгөгдлөөр зурна.
/// Шинэчилж байх үед хуучин өгөгдөл харагдсаар (хоосон дэлгэц хэзээ ч үгүй).
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({
    super.key,
    required this.value,
    required this.builder,
    required this.onRetry,
    this.loading,
    this.compactError = false,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) builder;
  final VoidCallback onRetry;
  final Widget? loading;

  /// Карт доторх жижиг алдаа (бүтэн дэлгэцийн биш).
  final bool compactError;

  @override
  Widget build(BuildContext context) {
    final v = value;
    if (v.hasValue) return builder(v.requireValue);
    if (v.hasError) {
      final message = errorMessageOf(v.error!);
      if (compactError) return InlineError(message: message, onRetry: onRetry);
      return ErrorState(message: message, onRetry: onRetry, icon: _isOffline(v.error!) ? AppIcons.offline : AppIcons.error);
    }
    return loading ?? const LoadingState();
  }

  static bool _isOffline(Object e) => e is ApiError && e.isNetwork;
}

/// Карт доторх алдааны мөр + «Дахин оролдох».
class InlineError extends StatelessWidget {
  const InlineError({super.key, required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Row(
        children: [
          Icon(AppIcons.error, size: 20, color: context.colors.error),
          const SizedBox(width: AppSpace.sm),
          Expanded(child: Text(message, style: context.text.bodyMedium)),
          TextButton(onPressed: onRetry, child: const Text(AppStrings.retry)),
        ],
      ),
    );
  }
}

/// Гарчигтай карт (вэбийн `CardHead` + `CARD`). Гарчиг брэндийн зөөлөн өнгөөр, төгсгөлд цэггүй.
class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.icon,
    required this.title,
    required this.child,
    this.trailing,
    this.padding = const EdgeInsets.all(AppSpace.lg),
  });

  final IconData icon;
  final String title;
  final Widget child;
  final Widget? trailing;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: context.colors.brandSoft),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    title,
                    style: context.text.titleMedium?.copyWith(color: context.colors.brandSoft, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              ?trailing,
            ],
          ),
          const SizedBox(height: AppSpace.md),
          child,
        ],
      ),
    );
  }
}

/// Тасархай хүрээтэй жижиг тайлбар («Өнөөдөр хичээлгүй» гэх мэт).
class DashedNote extends StatelessWidget {
  const DashedNote(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: context.colors.line),
      ),
      child: Text(text, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
    );
  }
}

/// Танхимын тэмдэг — дотор нь дугаар, логоны өнгөөр (вэбийн `RoomBadge`). Өнгөт дэвсгэргүй, зөвхөн хүрээ.
class RoomBadge extends StatelessWidget {
  const RoomBadge({super.key, required this.room, this.size = 40});

  final String? room;
  final double size;

  @override
  Widget build(BuildContext context) {
    final r = room?.trim();
    final c = context.colors;
    return Semantics(
      label: r == null || r.isEmpty ? 'Танхим тодорхойгүй' : 'Танхим $r',
      excludeSemantics: true,
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          border: Border.all(color: c.logo, width: 1.5),
        ),
        child: r == null || r.isEmpty
            ? Icon(AppIcons.schedule, size: size * 0.45, color: c.logo)
            : FittedBox(
                fit: BoxFit.scaleDown,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: Text(
                    r,
                    style: context.text.labelMedium?.copyWith(color: c.logo, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
      ),
    );
  }
}

/// Жижиг саарал шошго (pill) — «Маргааш нээгдэнэ», «Томилогдсон».
class InfoPill extends StatelessWidget {
  const InfoPill({super.key, required this.label, this.icon});

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.pill)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 14, color: c.inkDim), const SizedBox(width: 4)],
          Text(label, style: context.text.labelSmall?.copyWith(color: c.inkDim, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Pull-to-refresh: провайдеруудыг дахин ачаалж дуустал хүлээнэ (алдааг дэлгэц өөрөө харуулна).
Future<void> refreshProviders(WidgetRef ref, List<FutureProvider<Object?>> providers) async {
  await Future.wait([
    for (final p in providers) ref.refresh(p.future).then<Object?>((v) => v, onError: (Object _) => null),
  ]);
}
