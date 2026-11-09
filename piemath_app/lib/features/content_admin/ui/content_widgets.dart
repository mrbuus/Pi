import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';

/// Серверийн монгол алдаа эсвэл [fallback] (техникийн бичвэр хэзээ ч харуулахгүй).
String contentError(Object e, [String fallback = 'Хадгалж чадсангүй. Дахин оролдоно уу']) =>
    e is ApiError && e.kind != ApiErrorKind.unknown && e.message.trim().isNotEmpty ? e.message : fallback;

void contentSnack(BuildContext context, String message) {
  ScaffoldMessenger.maybeOf(context)
    ?..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

/// Сонгогчийн мөр: шошго + одоогийн утга + сум. Дарахад сонгох хуудас нээгдэнэ.
class PickerTile extends StatelessWidget {
  const PickerTile({super.key, required this.label, required this.value, this.icon, this.onTap});

  final String label;
  final String value;
  final IconData? icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: onTap != null,
      label: '$label: $value',
      excludeSemantics: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: AppSizes.minTap + 8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
            child: Row(
              children: [
                if (icon != null) ...[Icon(icon, size: 20, color: c.inkDim), const SizedBox(width: AppSpace.md)],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(label, style: context.text.labelMedium?.copyWith(color: c.inkDim)),
                      const SizedBox(height: 2),
                      Text(value, style: context.text.bodyLarge, maxLines: 2, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                if (onTap != null) Icon(AppIcons.expand, size: 20, color: c.inkDim),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// [AsyncValue]-ийн нийтлэг зурах: skeleton, алдаа + дахин, өгөгдөл.
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({super.key, required this.value, required this.data, required this.onRetry, this.errorTitle});

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final VoidCallback onRetry;
  final String? errorTitle;

  @override
  Widget build(BuildContext context) {
    return switch (value) {
      AsyncData(:final value) => data(value),
      AsyncError(:final error) when error is ApiError && error.kind == ApiErrorKind.forbidden => const EmptyState(
        icon: AppIcons.shield,
        title: AppStrings.forbidden,
      ),
      AsyncError(:final error) => ErrorState(
        title: errorTitle ?? 'Ачаалж чадсангүй',
        message: error is ApiError ? error.message : AppStrings.genericError,
        onRetry: onRetry,
      ),
      _ => const LoadingState(),
    };
  }
}
