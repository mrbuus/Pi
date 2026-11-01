import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/current_user.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/network/network_providers.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

void main() {
  late FakeHttp http;
  setUp(() => http = FakeHttp());

  test('хадгалсан токенгүй бол SignedOut', () async {
    final c = testContainer(http: http);
    expect(c.read(sessionProvider), isA<SessionRestoring>());
    await c.read(sessionProvider.notifier).restore();
    expect(c.read(sessionProvider), isA<SignedOut>());
  });

  test('хадгалсан токентой бол /auth/me ачаална', () async {
    http.json('GET', '/auth/me', fakeMe(type: 'ONLINE'));
    final store = MemoryTokenStore(const StoredAuth(token: 't', userId: 'u1', role: UserRole.student));
    final c = testContainer(http: http, store: store);
    await c.read(sessionProvider.notifier).restore();
    final s = c.read(sessionProvider) as SignedIn;
    expect(s.user!.displayName, 'С. Тест');
    expect(s.user!.isOnlineStudent, isTrue);
    expect(http.requests.single.headers['Authorization'], 'Bearer t');
  });

  test('офлайнаар эхэлбэл SignedIn хэвээр (user=null), role-оор бүрхүүл', () async {
    http.on('GET', '/auth/me', (_) => const FakeResponse.network());
    final store = MemoryTokenStore(const StoredAuth(token: 't', userId: 'u1', role: UserRole.parent));
    final c = testContainer(http: http, store: store);
    await c.read(sessionProvider.notifier).restore();
    final s = c.read(sessionProvider) as SignedIn;
    expect(s.user, isNull);
    expect(s.role, UserRole.parent);
    expect(c.read(reachabilityProvider), isFalse);
  });

  test('401 (нууц үг солигдсон) → SignedOut шалтгаантай, токен устна', () async {
    http.error('GET', '/auth/me', 401, 'Нууц үг өөрчлөгдсөн тул дахин нэвтэрнэ үү');
    final store = MemoryTokenStore(const StoredAuth(token: 't', userId: 'u1', role: UserRole.student));
    final c = testContainer(http: http, store: store);
    await c.read(sessionProvider.notifier).restore();
    await pumpEventQueue();
    final s = c.read(sessionProvider);
    expect(s, isA<SignedOut>());
    expect((s as SignedOut).message, 'Нууц үг өөрчлөгдсөн тул дахин нэвтэрнэ үү');
    expect(await store.read(), isNull);
    expect(c.read(tokenHolderProvider).token, isNull);
  });

  test('signIn: «Намайг сана»-г хадгалалтад дамжуулна', () async {
    http.json('GET', '/auth/me', fakeMe(role: 'PARENT'));
    final store = MemoryTokenStore();
    final c = testContainer(http: http, store: store);
    await c.read(sessionProvider.notifier).signIn(token: 'n', userId: 'u1', role: UserRole.parent, remember: false);
    expect(store.lastPersist, isFalse);
    expect((c.read(sessionProvider) as SignedIn).user!.role, UserRole.parent);
  });

  test('replaceToken: нууц үг сольсны дараах шинэ токен', () async {
    http.json('GET', '/auth/me', fakeMe());
    final store = MemoryTokenStore();
    final c = testContainer(http: http, store: store);
    final n = c.read(sessionProvider.notifier);
    await n.signIn(token: 'old', userId: 'u1', role: UserRole.student, remember: true);
    await n.replaceToken('new');
    expect((await store.read())!.token, 'new');
    expect(store.lastPersist, isTrue);
    expect(c.read(tokenHolderProvider).token, 'new');
    expect((c.read(sessionProvider) as SignedIn).user, isNotNull);
  });

  test('signOut: бүгдийг цэвэрлэнэ', () async {
    http.json('GET', '/auth/me', fakeMe());
    final store = MemoryTokenStore();
    final c = testContainer(http: http, store: store);
    final n = c.read(sessionProvider.notifier);
    await n.signIn(token: 't', userId: 'u1', role: UserRole.student, remember: true);
    await n.signOut();
    expect(c.read(sessionProvider), isA<SignedOut>());
    expect(await store.read(), isNull);
  });

  test('CurrentUser: шинэ, үл мэдэгдэх эрх аюулгүй', () {
    final u = CurrentUser.fromJson({...fakeMe(), 'role': 'SUPER_NEW_ROLE'});
    expect(u.role, UserRole.unknown);
  });

  test('UserRole: Багш+ нэрийн ард «+»', () {
    final u = CurrentUser.fromJson({...fakeMe(role: 'TEACHER_PLUS'), 'firstName': 'Сараа', 'lastName': 'Очир'});
    expect(u.displayName, 'О. Сараа+');
    expect(u.role.isStaff, isTrue);
    expect(UserRole.fromApi('GROUP_TEACHER'), UserRole.groupTeacher);
  });
}
