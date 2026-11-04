import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/test_authoring/application/draft_autosaver.dart';
import 'package:piemath_app/features/test_authoring/data/authoring_repository.dart';
import 'package:piemath_app/features/test_authoring/data/authoring_storage.dart';
import 'package:piemath_app/features/test_authoring/domain/builder_logic.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

const _delay = Duration(milliseconds: 20);

Future<void> _wait([int ms = 80]) => Future<void>.delayed(Duration(milliseconds: ms));

void main() {
  late FakeHttp h;
  late MemoryDraftPointerStore store;

  DraftAutosaver saver() {
    final repo = testContainer(http: h).read(testAuthoringRepositoryProvider);
    final s = DraftAutosaver(repository: repo, store: store, ownerId: 'u1', delay: _delay);
    addTearDown(s.dispose);
    return s;
  }

  setUp(() {
    h = FakeHttp();
    store = MemoryDraftPointerStore();
  });

  test('заагчгүй: шууд идэвхтэй, хоосон маягтыг хадгалахгүй', () async {
    final s = saver();
    await s.restore();
    expect(s.ready && s.active, isTrue);
    s.schedule(const BuilderForm());
    await _wait();
    expect(h.requests, isEmpty);
  });

  test('ойр ойрхон өөрчлөлт нэг хадгалалт болно; анх POST, дараа нь PATCH + expectedRevision', () async {
    h
      ..json('POST', '/tests/drafts', {'id': 'd1', 'revision': 1, 'state': <String, Object?>{}})
      ..json('PATCH', '/tests/drafts/d1', {'id': 'd1', 'revision': 2, 'state': <String, Object?>{}});
    final s = saver();
    await s.restore();
    s
      ..schedule(const BuilderForm(title: 'А'))
      ..schedule(const BuilderForm(title: 'Ал'))
      ..schedule(const BuilderForm(title: 'Алг'));
    await _wait();
    await s.idle;
    expect(h.count('POST', '/tests/drafts'), 1);
    expect((h.requests.single.data as Map)['title'], 'Алг');
    expect(store.read('u1'), 'd1');
    expect(s.status, 'Серверт хадгаллаа');

    s.schedule(const BuilderForm(title: 'Алгебр', selectedProblems: ['p1'], pointOverrides: {'p1': 3}));
    await _wait();
    await s.idle;
    final patch = h.requests.last;
    expect(patch.method, 'PATCH');
    expect((patch.data as Map)['expectedRevision'], 1);
    expect((patch.data as Map)['pointOverrides'], {'p1': 3});
    expect(s.revision, 2);
  });

  test('409: автомат хадгалалт зогсоод сүүлийн хувилбарыг татна; «нээх» нь серверийн төлөвийг буцаана', () async {
    store = MemoryDraftPointerStore({'u1': 'd1'});
    h
      ..json('GET', '/tests/drafts/d1', {
        'id': 'd1',
        'revision': 3,
        'state': {'title': 'Утаснаас'},
      })
      ..json('PATCH', '/tests/drafts/d1', {
        'statusCode': 409,
        'message': 'Ноорог өөр төхөөрөмжөөс шинэчлэгдсэн байна.',
      }, status: 409);
    final s = saver();
    await s.restore();
    expect(s.candidate!.title, 'Утаснаас');
    expect(s.active, isFalse, reason: 'хэрэглэгч сонгох хүртэл хадгалахгүй');
    final restored = s.continueCandidate()!;
    expect(restored.title, 'Утаснаас');
    expect(s.revision, 3);

    s.schedule(const BuilderForm(title: 'Компьютерээс'));
    await _wait();
    await s.idle;
    expect(s.conflict, isNotNull);
    expect(s.status, 'Ноорог өөр төхөөрөмжөөс шинэчлэгдсэн');

    final before = h.requests.length;
    s.schedule(const BuilderForm(title: 'Дахин'));
    await _wait();
    expect(h.requests.length, before, reason: 'зөрчилтэй үед хадгалахгүй');

    final latest = s.loadLatest()!;
    expect(latest.title, 'Утаснаас');
    expect(s.conflict, isNull);
  });

  test('409: «миний хувилбарыг шинэ ноорог болгох» — POST, нөгөө ноорог хэвээр', () async {
    store = MemoryDraftPointerStore({'u1': 'd1'});
    h
      ..json('GET', '/tests/drafts/d1', {'id': 'd1', 'revision': 1, 'state': <String, Object?>{}})
      ..json('PATCH', '/tests/drafts/d1', {'statusCode': 409}, status: 409)
      ..json('POST', '/tests/drafts', {'id': 'd2', 'revision': 1, 'state': <String, Object?>{}});
    final s = saver();
    await s.restore();
    s.continueCandidate();
    s.schedule(const BuilderForm(title: 'Минийх'));
    await _wait();
    await s.idle;
    await s.saveLocalAsNew(const BuilderForm(title: 'Минийх'));
    expect(s.draftId, 'd2');
    expect(store.read('u1'), 'd2');
    expect(s.conflict, isNull);
    expect(h.count('DELETE', '/tests/drafts/d1'), 0);
  });

  test('өмнөх ноорог 404 бол заагчийг мартаж шинээр эхэлнэ', () async {
    store = MemoryDraftPointerStore({'u1': 'gone'});
    h.error('GET', '/tests/drafts/gone', 404, 'Ноорог олдсонгүй');
    final s = saver();
    await s.restore();
    expect(store.read('u1'), isNull);
    expect(s.active, isTrue);
    expect(s.candidate, isNull);
  });

  test('сүлжээний алдаа: сэргээх алдаа, хадгалахгүй', () async {
    store = MemoryDraftPointerStore({'u1': 'd1'});
    h.on('GET', '/tests/drafts/d1', (_) => const FakeResponse.network());
    final s = saver();
    await s.restore();
    expect(s.restoreError, isNotEmpty);
    expect(s.ready, isFalse);
  });

  test('«Шинээр эхлэх» серверийн ноорогийг УСТГАХГҮЙ (DELETE дуудахгүй), заагчийг мартана', () async {
    store = MemoryDraftPointerStore({'u1': 'd1'});
    h.json('GET', '/tests/drafts/d1', {'id': 'd1', 'revision': 2, 'state': <String, Object?>{}});
    final s = saver();
    await s.restore();
    await s.startFresh();
    expect(store.read('u1'), isNull);
    expect(s.draftId, isNull);
    expect(h.requests.where((r) => r.method == 'DELETE'), isEmpty);
  });

  test('хадгалалт амжилтгүй — алдаа, «дахин оролдох» нь хадгална', () async {
    var calls = 0;
    h.on('POST', '/tests/drafts', (_) {
      calls++;
      return calls == 1
          ? const FakeResponse({'statusCode': 400, 'message': 'Бодлогын оноо эерэг бүхэл тоо байх ёстой'}, status: 400)
          : const FakeResponse({'id': 'd9', 'revision': 1, 'state': <String, Object?>{}});
    });
    final s = saver();
    await s.restore();
    s.schedule(const BuilderForm(title: 'А'));
    await _wait();
    await s.idle;
    expect(s.error, 'Бодлогын оноо эерэг бүхэл тоо байх ёстой');
    expect(s.status, 'Хадгалалт амжилтгүй');
    await s.retry();
    expect(s.draftId, 'd9');
    expect(s.error, isEmpty);
  });

  test('тест үүсгэхэд: хадгалалт зогсож, амжилттай бол заагч цэвэрлэгдэнэ', () async {
    h.json('POST', '/tests/drafts', {'id': 'd1', 'revision': 1, 'state': <String, Object?>{}});
    final s = saver();
    await s.restore();
    s.schedule(const BuilderForm(title: 'А'));
    await _wait();
    await s.idle;
    await s.beginPublish();
    s.schedule(const BuilderForm(title: 'Б'));
    await _wait();
    expect(h.count('POST', '/tests/drafts'), 1);
    expect(h.count('PATCH', '/tests/drafts/d1'), 0);
    await s.publishSucceeded();
    expect(store.read('u1'), isNull);
    expect(s.draftId, isNull);
  });

  test('BuilderForm ↔ ноорог: хүчингүй утгыг алгасна', () {
    final f = BuilderForm.fromDraftState(const {
      'subject': 'XYZ',
      'title': 'Т',
      'type': 'NOPE',
      'gradingMode': 'MANUAL',
      'selectedProblems': ['a', 3, 'b'],
      'pointOverrides': {'a': 2, 'b': 0, 'c': 1.5},
      'selectedClasses': 'c1',
    });
    expect(f.subject, '');
    expect(f.type, 'CHAPTER_EXAM');
    expect(f.gradingMode, 'MANUAL');
    expect(f.selectedProblems, ['a', 'b']);
    expect(f.pointOverrides, {'a': 2});
    expect(f.selectedClasses, isEmpty);
    expect(BuilderForm.fromDraftState(f.toDraftJson()), f);
  });
}
