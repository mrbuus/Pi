import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/features/passes/data/passes_models.dart';
import 'package:piemath_app/features/passes/data/passes_repository.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'passes_fixtures.dart';

void main() {
  PassesRepository repo(FakeHttp h) => testContainer(http: h).read(passesRepositoryProvider);

  test('жагсаалт, эзэмшигчид', () async {
    final h = FakeHttp()
      ..json('GET', '/passes', [passJson(), passJson(id: 'p2', active: false)])
      ..json('GET', '/passes/p%201/holders', [holderJson()]);
    final r = repo(h);
    final list = await r.list();
    expect(list.map((p) => p.id), ['p1', 'p2']);
    expect(list[1].active, isFalse);
    final holders = await r.holders('p 1');
    expect(holders.single.name, isNotEmpty);
  });

  test('шинэ эрх үргэлж идэвхтэй үүснэ', () async {
    final h = FakeHttp()..json('POST', '/passes', passJson());
    await repo(h).create(const PassDraft(name: 'Эрх', durationDays: 30, scope: PassScope(all: true)));
    expect(h.requests.single.data, {
      'name': 'Эрх',
      'durationDays': 30,
      'scope': {'all': true},
      'active': true,
    });
  });

  test('идэвх солих: зөвхөн active талбар', () async {
    final h = FakeHttp()..json('PATCH', '/passes/p1', passJson(active: false));
    final p = await repo(h).setActive('p1', active: false);
    expect(h.requests.single.data, {'active': false});
    expect(p.active, isFalse);
  });

  test('олголт: тэмдэглэл хоосон бол илгээхгүй', () async {
    final h = FakeHttp()
      ..json('POST', '/passes/p1/grant', {'id': 'up1'})
      ..json('POST', '/passes/p1/grant', {'id': 'up2'});
    final r = repo(h);
    await r.grant('p1', 'u1', note: '   ');
    await r.grant('p1', 'u2', note: ' Бэлнээр ');
    expect(h.requests[0].data, {'userId': 'u1'});
    expect(h.requests[1].data, {'userId': 'u2', 'note': 'Бэлнээр'});
  });

  test('олголт алдаа өгвөл автоматаар ДАВТАХГҮЙ', () async {
    final h = FakeHttp()..on('POST', '/passes/p1/grant', (_) => const FakeResponse.network());
    await expectLater(repo(h).grant('p1', 'u1'), throwsA(isA<ApiError>()));
    expect(h.count('POST', '/passes/p1/grant'), 1);
  });

  test('сервер 400 мессежийг монголоор дамжуулна', () async {
    final h = FakeHttp()..error('POST', '/passes/p1/grant', 400, 'Энэ эрх идэвхтэй байна');
    await expectLater(
      repo(h).grant('p1', 'u1'),
      throwsA(isA<ApiError>().having((e) => e.message, 'message', 'Энэ эрх идэвхтэй байна')),
    );
  });

  test('сурагч хайх: тайрсан query', () async {
    final h = FakeHttp()
      ..json('GET', '/users/search', [
        {'id': 'u1', 'firstName': 'Болд', 'lastName': 'Тестийн', 'studentCode': 'B27120001'},
      ]);
    final hits = await repo(h).searchStudents('  Бол ');
    expect(h.requests.single.queryParameters['q'], 'Бол');
    expect(hits.single.studentCode, 'B27120001');
  });
}
