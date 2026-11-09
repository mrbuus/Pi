import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/finance/application/submit_guard.dart';

void main() {
  test('ижил түлхүүрээр зэрэг дуудвал хоёр дахь нь илгээхгүй (null)', () async {
    final g = SubmitGuard();
    final gate = Completer<int>();
    var calls = 0;
    final first = g.run('k', () {
      calls++;
      return gate.future;
    });
    expect(g.isRunning('k'), isTrue);
    expect(await g.run('k', () async => ++calls), isNull);
    // Өөр түлхүүр саадгүй.
    expect(await g.run('other', () async => 7), 7);
    gate.complete(1);
    expect(await first, 1);
    expect(calls, 1);
    expect(g.isRunning('k'), isFalse);
  });

  test('алдаа гарвал түлхүүр суларна, алдаа дамжина, давтахгүй', () async {
    final g = SubmitGuard();
    var calls = 0;
    await expectLater(
      g.run<void>('k', () async {
        calls++;
        throw StateError('x');
      }),
      throwsStateError,
    );
    expect(calls, 1);
    expect(g.isRunning('k'), isFalse);
    expect(await g.run('k', () async => 'ok'), 'ok');
  });
}
