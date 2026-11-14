import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_error.dart';
import '../../core/ui/ui.dart';

/// Optimistic өөрчлөлтийн үр дүн.
@immutable
class MutationResult<R> {
  const MutationResult.ok(R this.value) : error = null;
  const MutationResult.failed(Object this.error) : value = null;

  final R? value;
  final Object? error;

  bool get isOk => error == null;

  /// Хэрэглэгчид харуулах монгол мессеж (амжилттай бол `null`).
  String? get message => switch (error) {
    null => null,
    final ApiError e => e.message,
    _ => saveFailedMessage,
  };

  static const saveFailedMessage = 'Хадгалж чадсангүй. Дахин оролдоно уу';
}

/// Optimistic өөрчлөлт (RESEARCH-2026-11 §1.2, Linear/Instagram маяг):
///
/// 1. [apply]-аар төлөвийг ШУУД солино (дэлгэц хүлээхгүй);
/// 2. [commit] серверт илгээнэ;
/// 3. амжилттай бол [confirm]-оор серверийн хариуг нэгтгэнэ (өгөөгүй бол optimistic утга үлдэнэ);
/// 4. алдаа бол буцаана: [revert] өгсөн бол одоогийн төлөвөөс (зэрэг өөр өөрчлөлт алдагдахгүй),
///    эс бөгөөс өмнөх төлөвийг бүхэлд нь сэргээнэ.
///
/// Алдаа шидэхгүй — [MutationResult]-ыг буцаана; UI [showMutationError]-оор snackbar гаргана.
Future<MutationResult<R>> optimisticMutation<S, R>({
  required S Function() read,
  required void Function(S state) write,
  required S Function(S current) apply,
  required Future<R> Function() commit,
  S Function(S current)? revert,
  S Function(S current, R result)? confirm,
}) async {
  final previous = read();
  write(apply(previous));
  try {
    final result = await commit();
    if (confirm != null) write(confirm(read(), result));
    return MutationResult.ok(result);
  } catch (e) {
    write(revert != null ? revert(read()) : previous);
    return MutationResult.failed(e);
  }
}

/// Riverpod `Notifier`-т optimistic өөрчлөлт.
///
/// ```dart
/// class TasksController extends Notifier<List<Task>> with OptimisticNotifier<List<Task>> {
///   @override
///   List<Task> build() => const [];
///
///   Future<MutationResult<Task>> markDone(String id) => mutate(
///     apply: (list) => [for (final t in list) t.id == id ? t.copyWith(done: true) : t],
///     commit: () => ref.read(tasksRepoProvider).markDone(id),
///     revert: (list) => [for (final t in list) t.id == id ? t.copyWith(done: false) : t],
///     confirm: (list, saved) => [for (final t in list) t.id == id ? saved : t],
///   );
/// }
///
/// // UI:
/// final r = await ref.read(tasksProvider.notifier).markDone(id);
/// if (context.mounted) showMutationError(context, r, onRetry: () => ...);
/// ```
mixin OptimisticNotifier<S> on Notifier<S> {
  Future<MutationResult<R>> mutate<R>({
    required S Function(S current) apply,
    required Future<R> Function() commit,
    S Function(S current)? revert,
    S Function(S current, R result)? confirm,
  }) => optimisticMutation<S, R>(
    read: () => state,
    write: (s) => state = s,
    apply: apply,
    commit: commit,
    revert: revert,
    confirm: confirm,
  );
}

/// Амжилтгүй бол алдааны snackbar («Дахин оролдох» товчтой, [onRetry] өгсөн бол).
/// Амжилттай бол [success] мессежийг (өгсөн бол) харуулна.
void showMutationError(BuildContext context, MutationResult<Object?> result, {VoidCallback? onRetry, String? success}) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) return;
  if (result.isOk) {
    if (success != null) messenger.showSnackBar(SnackBar(content: Text(success)));
    return;
  }
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(result.message!),
        persist: false,
        action: onRetry == null ? null : SnackBarAction(label: AppStrings.retry, onPressed: onRetry),
      ),
    );
}
