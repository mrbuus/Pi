import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/network/network_providers.dart';

import 'fake_http.dart';

/// Тестийн бүх override — mock API, санах ойн токен, сүлжээний өөрчлөлтгүй.
/// Widget тестэд: `ProviderScope(overrides: testOverrides(http: http), child: ...)`.
List<Override> testOverrides({required FakeHttp http, TokenStore? store}) => [
      apiBaseUrlProvider.overrideWithValue('https://api.test/api'),
      httpClientAdapterProvider.overrideWithValue(http),
      tokenStoreProvider.overrideWithValue(store ?? MemoryTokenStore()),
      connectivityChangesProvider.overrideWithValue(const Stream<List<ConnectivityResult>>.empty()),
    ];

/// Unit тестэд: [ProviderContainer] (tearDown-д автоматаар dispose).
ProviderContainer testContainer({required FakeHttp http, TokenStore? store, List<Override> extra = const []}) {
  final c = ProviderContainer(
    overrides: [...testOverrides(http: http, store: store), ...extra],
    retry: (_, _) => null,
  );
  addTearDown(c.dispose);
  return c;
}

/// `/auth/me`-ийн хуурамч хариу (зохиомол хүн — жинхэнэ сурагчийн мэдээлэл биш).
Map<String, Object?> fakeMe({String id = 'u1', String role = 'STUDENT', String? type = 'IN_PERSON'}) => {
      'id': id,
      'role': role,
      'firstName': 'Тест',
      'lastName': 'Сурагч',
      'phone': '99000000',
      'email': null,
      'username': null,
      'studentCode': 'M0001',
      'teacherCode': null,
      'avatarUrl': null,
      'mustChangePassword': false,
      'studentProfile': role == 'STUDENT' ? {'type': type, 'grade': 12} : null,
      'teacherProfile': null,
      'externalTeacherProfile': null,
    };
