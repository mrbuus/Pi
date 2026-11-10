import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/cache/cache_providers.dart';
import 'package:piemath_app/core/cache/keep_alive.dart';
import 'package:piemath_app/core/cache/prefetch.dart';
import 'package:piemath_app/core/cache/swr.dart';
import 'package:piemath_app/core/network/network_providers.dart';
import 'package:piemath_app/core/perf/memory.dart';
import 'package:piemath_app/core/perf/perf_tier.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

const _auth = StoredAuth(token: 't', userId: 'u1', role: UserRole.student);

final _overviewProvider = FutureProvider<Object?>(
  (ref) => swr(ref, () => ref.watch(apiClientProvider).get('/student-hub/overview', parse: (j) => j)),
);

void main() {
  group('swr провайдер', () {
    test('кэшээс шууд, шинэ хариу ирэхэд провайдер өөрөө шинэчлэгдэнэ', () async {
      var version = 1;
      final http = FakeHttp()
        ..json('GET', '/auth/me', fakeMe())
        ..on('GET', '/student-hub/overview', (_) => FakeResponse({'v': version}, delay: const Duration(milliseconds: 20)));
      final c = testContainer(http: http, store: MemoryTokenStore(_auth));
      await c.read(sessionProvider.notifier).restore();
      final sub = c.listen(_overviewProvider, (_, _) {});
      addTearDown(sub.close);
      expect(await c.read(_overviewProvider.future), {'v': 1});

      // Дахин ачаалахад (жишээ: таб руу буцаж, autoDispose дахин үүссэн) — хуучныг шууд.
      version = 2;
      c.invalidate(_overviewProvider, asReload: true);
      expect(await c.read(_overviewProvider.future), {'v': 1});
      // Арын шинэчлэл ирмэгц шинэ утга.
      await Future<void>.delayed(const Duration(milliseconds: 80));
      expect(c.read(_overviewProvider).value, {'v': 2});

      // Pull-to-refresh (`ref.refresh`) — эхлээд сүлжээ.
      version = 3;
      expect(await c.refresh(_overviewProvider.future), {'v': 3});
    });

    test('гарахад кэш устна (sync провайдер)', () async {
      final http = FakeHttp()
        ..json('GET', '/auth/me', fakeMe())
        ..json('GET', '/student-hub/overview', {'v': 1});
      final c = testContainer(http: http, store: MemoryTokenStore(_auth));
      c.read(responseCacheSessionSyncProvider);
      await c.read(sessionProvider.notifier).restore();
      await c.read(apiClientProvider).get('/student-hub/overview', parse: (j) => j);
      final cache = c.read(responseCacheProvider);
      expect(cache.memoryEntries, 1);
      await c.read(sessionProvider.notifier).signOut();
      expect(cache.memoryEntries, 0);
      expect(cache.scope, isNull);
    });
  });

  group('cacheFor', () {
    setUp(() => KeepAliveTtl.enabled = true);
    tearDown(() => KeepAliveTtl.enabled = false);

    test('сонсогчгүй болсноос хойш хугацаанд хадгалаад дараа нь чөлөөлнө', () {
      fakeAsync((async) {
        var builds = 0;
        final p = Provider.autoDispose<int>((ref) {
          ref.cacheFor(const Duration(minutes: 2));
          return ++builds;
        });
        final c = ProviderContainer();
        var sub = c.listen(p, (_, _) {});
        expect(sub.read(), 1);
        sub.close();
        async.elapse(const Duration(minutes: 1));
        sub = c.listen(p, (_, _) {});
        expect(sub.read(), 1); // буцаж ирэхэд дахин бүтээгдээгүй
        sub.close();
        async.elapse(const Duration(minutes: 3));
        expect(c.read(p), 2); // хугацаа дууссаны дараа шинээр
        c.dispose();
      });
    });
  });

  group('prefetch', () {
    test('сүлжээний төрөл: Wi-Fi хэмнэлтгүй, мобайл хэмнэлттэй', () {
      expect(ConnectionKind.of([ConnectivityResult.wifi]), ConnectionKind.unmetered);
      expect(ConnectionKind.of([ConnectivityResult.mobile]), ConnectionKind.metered);
      expect(ConnectionKind.of([ConnectivityResult.wifi, ConnectivityResult.mobile]), ConnectionKind.metered);
      expect(ConnectionKind.of([ConnectivityResult.none]), ConnectionKind.none);
      expect(ConnectionKind.of([]), ConnectionKind.none);
    });

    test('зөвхөн хүчтэй утас + онлайн + Wi-Fi', () async {
      final changes = StreamController<List<ConnectivityResult>>();
      addTearDown(changes.close);
      ProviderContainer make(PerfTier tier) {
        final c = ProviderContainer(overrides: [
          connectivityChangesProvider.overrideWithValue(changes.stream.asBroadcastStream()),
          connectivityCheckProvider.overrideWithValue(() async => [ConnectivityResult.wifi]),
          perfTierProvider.overrideWithValue(tier),
        ]);
        addTearDown(c.dispose);
        return c;
      }

      final high = make(PerfTier.high);
      expect(high.read(prefetchAllowedProvider), isFalse); // хараахан unknown
      high.listen(prefetchAllowedProvider, (_, _) {});
      await Future<void>.delayed(Duration.zero);
      expect(high.read(prefetchAllowedProvider), isTrue);
      changes.add([ConnectivityResult.mobile]);
      await Future<void>.delayed(Duration.zero);
      expect(high.read(prefetchAllowedProvider), isFalse);

      final low = make(PerfTier.low);
      low.listen(prefetchAllowedProvider, (_, _) {});
      await Future<void>.delayed(Duration.zero);
      expect(low.read(prefetchAllowedProvider), isFalse);
    });
  });

  test('зургийн кэшийн хязгаар түвшнээр', () {
    expect(imageCacheLimits(PerfTier.low).bytes, lessThan(imageCacheLimits(PerfTier.high).bytes));
    expect(imageCacheLimits(PerfTier.low).count, 300);
    expect(responseCacheBudget(PerfTier.low).memory, lessThan(responseCacheBudget(PerfTier.high).memory));
  });
}
