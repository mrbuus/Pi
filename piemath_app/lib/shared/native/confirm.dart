import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/ui/ui.dart';

/// Баталгаажуулах цонх. «Болих» эсвэл цонхны гадна дарвал `false`.
///
/// [destructive] бол батлах товч улаан (устгах, архивлах, хаях). Прод өгөгдөл зөөлөн устгагддаг ч
/// хэрэглэгчид «буцаах боломжтой» гэж бүү амла — [showUndoSnack]-ийг хамт хэрэглэ.
Future<bool> confirmAction(
  BuildContext context, {
  required String title,
  String? message,
  String confirmLabel = 'Устгах',
  String cancelLabel = AppStrings.cancel,
  bool destructive = true,
}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) {
      final c = ctx.colors;
      return AlertDialog(
        title: Text(title),
        content: message == null ? null : Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(cancelLabel)),
          FilledButton(
            style: destructive ? FilledButton.styleFrom(backgroundColor: c.error, foregroundColor: c.onStatus) : null,
            onPressed: () {
              if (destructive) HapticFeedback.mediumImpact();
              Navigator.of(ctx).pop(true);
            },
            child: Text(confirmLabel),
          ),
        ],
      );
    },
  );
  return ok ?? false;
}

/// «Буцаах» товчтой snackbar. Хэрэглэгч «Буцаах» дарвал `true` (тэгээд [onUndo] дуудагдана),
/// хугацаа дуусах эсвэл өөр snackbar гарвал `false`.
///
/// Хэв маяг: мөрийг шууд жагсаалтаас ав → snackbar → `false` бол серверт илгээ, `true` бол буцааж тавь.
///
/// ```dart
/// final removed = list.removeWhere((s) => s.id == id);
/// final undone = await showUndoSnack(context, message: 'Архивлалаа');
/// if (undone) {
///   list.insert(removed!.index, removed.item);
/// } else {
///   await repo.archive(id);
/// }
/// ```
Future<bool> showUndoSnack(
  BuildContext context, {
  required String message,
  VoidCallback? onUndo,
  String undoLabel = 'Буцаах',
  Duration duration = const Duration(seconds: 5),
}) async {
  final messenger = ScaffoldMessenger.of(context)..hideCurrentSnackBar();
  final controller = messenger.showSnackBar(
    SnackBar(
      content: Text(message),
      duration: duration,
      // Үйлдэлтэй snackbar өгөгдмөлөөр үлддэг — энд хугацаа дуусахад хаагдах ёстой.
      persist: false,
      action: SnackBarAction(label: undoLabel, onPressed: () => onUndo?.call()),
    ),
  );
  final reason = await controller.closed;
  return reason == SnackBarClosedReason.action;
}
