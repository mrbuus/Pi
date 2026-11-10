import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../application/enrollment_providers.dart';
import '../data/enrollment_models.dart';
import '../data/enrollment_repository.dart';

/// Серверийн монгол мессеж, эс бөгөөс [fallback] (техникийн үг харуулахгүй).
String enrollmentError(Object e, String fallback) =>
    e is ApiError && e.kind != ApiErrorKind.unknown && e.message.trim().isNotEmpty ? e.message : fallback;

void enrollmentSnack(BuildContext context, String message) {
  ScaffoldMessenger.maybeOf(context)
    ?..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

/// Эрх олгох (`POST /passes/:id/grant`, `finance.manage`). Олгосон бол `true`.
///
/// Вэбд энэ нь төлбөр баталгаажуулах хэсэгт байдаг; апп-д сурагч зөвшөөрсний дараа шууд.
Future<bool> showGrantPassSheet(
  BuildContext context,
  WidgetRef ref, {
  required String userId,
  required String userName,
}) async {
  final List<PassOption> passes;
  try {
    passes = await ref.read(passOptionsProvider.future);
  } catch (e) {
    if (context.mounted) enrollmentSnack(context, enrollmentError(e, 'Эрхийн жагсаалт нээгдсэнгүй'));
    return false;
  }
  if (!context.mounted) return false;
  if (passes.isEmpty) {
    enrollmentSnack(context, 'Олгох идэвхтэй эрх алга');
    return false;
  }
  final ok = await showFormSheet<bool>(
    context,
    title: 'Эрх олгох',
    subtitle: userName,
    submitLabel: 'Олгох',
    fields: [
      FormSelectField<String>(
        name: 'pass',
        label: 'Эрх',
        required: true,
        options: [
          for (final p in passes)
            SelectOption(
              p.id,
              p.name,
              subtitle: [
                '${p.durationDays} хоног',
                if (p.price != null) formatMnt(p.price!),
              ].join(', '),
            ),
        ],
      ),
      const FormTextField(name: 'note', label: 'Тэмдэглэл', maxLines: 2, maxLength: 500),
    ],
    onSubmit: (v) async {
      await ref.read(enrollmentRepositoryProvider).grantPass(v.get<String>('pass')!, userId, note: v.text('note'));
      return true;
    },
  );
  if (ok != true) return false;
  if (context.mounted) enrollmentSnack(context, '$userName эрх авлаа');
  return true;
}
