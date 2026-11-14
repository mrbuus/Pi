import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/pump.dart';

@immutable
class _Task {
  const _Task(this.id, {this.done = false, this.version = 0});

  final String id;
  final bool done;
  final int version;
}

/// Серверийн хуурамч хариу — [_next]-ийг тестээс удирдана.
Completer<_Task> _next = Completer();

class _Tasks extends Notifier<List<_Task>> with OptimisticNotifier<List<_Task>> {
  @override
  List<_Task> build() => const [_Task('a'), _Task('b')];

  Future<MutationResult<_Task>> markDone(String id) => mutate(
    apply: (list) => [for (final t in list) t.id == id ? _Task(t.id, done: true, version: t.version) : t],
    commit: () => _next.future,
    revert: (list) => [for (final t in list) t.id == id ? _Task(t.id, version: t.version) : t],
    confirm: (list, saved) => [for (final t in list) t.id == id ? saved : t],
  );

  void rename(String id) => state = [for (final t in state) t.id == id ? _Task(t.id, version: 9) : t];
}

final _tasksProvider = NotifierProvider<_Tasks, List<_Task>>(_Tasks.new);

void main() {
  setUp(() => _next = Completer());

  test('шууд харагдана, серверийн хариугаар баталгаажна', () async {
    final c = ProviderContainer();
    addTearDown(c.dispose);
    final f = c.read(_tasksProvider.notifier).markDone('a');
    expect(c.read(_tasksProvider).first.done, isTrue, reason: 'хүлээхгүй');
    _next.complete(const _Task('a', done: true, version: 2));
    final r = await f;
    expect(r.isOk, isTrue);
    expect(r.value!.version, 2);
    expect(c.read(_tasksProvider).first.version, 2);
  });

  test('алдаа бол буцаана — зэрэг өөр өөрчлөлт алдагдахгүй (revert)', () async {
    final c = ProviderContainer();
    addTearDown(c.dispose);
    final f = c.read(_tasksProvider.notifier).markDone('a');
    c.read(_tasksProvider.notifier).rename('b'); // хүлээх зуур өөр мөр өөрчлөгдсөн
    _next.completeError(const ApiError(ApiErrorKind.server, 'Түр саатал гарлаа'));
    final r = await f;
    expect(r.isOk, isFalse);
    expect(r.message, 'Түр саатал гарлаа');
    final s = c.read(_tasksProvider);
    expect(s.first.done, isFalse);
    expect(s.last.version, 9);
  });

  test('revert өгөөгүй бол өмнөх төлөв бүхэлдээ; ApiError биш алдааны мессеж', () async {
    var state = 1;
    final r = await optimisticMutation<int, void>(
      read: () => state,
      write: (s) => state = s,
      apply: (s) => s + 1,
      commit: () async => throw StateError('x'),
    );
    expect(state, 1);
    expect(r.message, MutationResult.saveFailedMessage);
  });

  testWidgets('showMutationError: алдааны snackbar «Дахин оролдох»-той, амжилтад мессеж', (tester) async {
    var retried = 0;
    await pumpThemed(
      tester,
      Builder(
        builder: (ctx) => Column(
          children: [
            TextButton(
              onPressed: () => showMutationError(
                ctx,
                const MutationResult<void>.failed(ApiError(ApiErrorKind.network, 'Интернэт холболтоо шалгана уу')),
                onRetry: () => retried++,
              ),
              child: const Text('Алдаа'),
            ),
            TextButton(
              onPressed: () => showMutationError(ctx, const MutationResult<int>.ok(1), success: 'Хадгаллаа'),
              child: const Text('Амжилт'),
            ),
          ],
        ),
      ),
    );
    await tester.tap(find.text('Алдаа'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Интернэт холболтоо шалгана уу'), findsOneWidget);
    await tester.tap(find.text(AppStrings.retry));
    await tester.pumpAndSettle();
    expect(retried, 1);
    await tester.tap(find.text('Амжилт'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Хадгаллаа'), findsOneWidget);
  });
}
