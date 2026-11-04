import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/test_authoring/application/test_editor_controller.dart';
import 'package:piemath_app/features/test_authoring/data/authoring_models.dart';
import 'package:piemath_app/features/test_authoring/data/authoring_repository.dart';
import 'package:piemath_app/features/test_authoring/domain/authoring_permissions.dart';
import 'package:piemath_app/features/test_authoring/domain/editor_model.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'authoring_fixtures.dart';

void main() {
  late FakeHttp h;

  Future<TestEditorController> loaded({
    UserRole role = UserRole.teacherPlus,
    String mode = 'FULL',
    Map<String, Object?>? test,
  }) async {
    h
      ..json('GET', '/tests/tst1', test ?? testJson())
      ..json('GET', '/tests/tst1/edit-info', {'mode': mode});
    final c = TestEditorController(
      repository: testContainer(http: h).read(testAuthoringRepositoryProvider),
      permissions: AuthoringPermissions(role, userId: 'u1'),
      testId: 'tst1',
      randomSuffix: () => 'ZZ11',
    );
    addTearDown(c.dispose);
    await c.load();
    return c;
  }

  setUp(() => h = FakeHttp());

  test('ачаалах: дараалал, оноо, анги; өөрчлөлтгүй', () async {
    final c = await loaded();
    expect(c.value.items.map((i) => i.key), ['p1', 'p2']);
    expect(c.value.classes, ['c1']);
    expect(c.dirty, isFalse);
    expect(c.stats.choice, 1);
    expect(c.stats.fill, 1);
    expect(c.stats.points, 3);
  });

  test('403 (Багш бусдын тест) — алдааны төлөв, серверийн мессеж', () async {
    h
      ..error('GET', '/tests/tst1/edit-info', 403, 'Та зөвхөн өөрийн үүсгэсэн тестийг засах боломжтой')
      ..json('GET', '/tests/tst1', testJson());
    final c = TestEditorController(
      repository: testContainer(http: h).read(testAuthoringRepositoryProvider),
      permissions: const AuthoringPermissions(UserRole.teacher, userId: 'u9'),
      testId: 'tst1',
    );
    addTearDown(c.dispose);
    await c.load();
    expect(c.loadError!.message, 'Та зөвхөн өөрийн үүсгэсэн тестийг засах боломжтой');
  });

  test('буцаах / давтах, хасаад сэргээх, эрэмбэлэх', () async {
    final c = await loaded();
    c.reorder(0, 1);
    expect(c.value.items.map((i) => i.key), ['p2', 'p1']);
    expect(c.dirtyCount, 1);
    c.undo();
    expect(c.value.items.map((i) => i.key), ['p1', 'p2']);
    expect(c.dirty, isFalse);
    c.redo();
    expect(c.value.items.first.key, 'p2');
    final removed = c.remove('p1')!;
    expect(c.value.items.map((i) => i.key), ['p2']);
    c.restore(removed);
    expect(c.value.items.map((i) => i.key), ['p2', 'p1']);
  });

  test('агуулгыг анхны хэлбэрт нь буцаавал өөрчлөлтгүй', () async {
    final c = await loaded();
    final item = c.value.items.first;
    final original = c.contentOfItem(item);
    c.applyEdit(item.key, original.copyWith(statement: 'x'), 1);
    expect(c.isChanged(item), isTrue);
    c.applyEdit(item.key, original, 1);
    expect(c.value.drafts, isEmpty);
    expect(c.dirty, isFalse);
  });

  test('хадгалах: шинэ бодлого POST → засвар PATCH (expectedVersion) → тест PATCH (шинэ id-гаар)', () async {
    final c = await loaded();
    h
      ..json('POST', '/problems', choiceProblemJson(id: 'created1', token: '100-23-NZZ11'))
      ..json('PATCH', '/problems/p1', {'id': 'p1', 'version': 4})
      ..json('PATCH', '/tests/tst1', {'id': 'tst1', 'version': 8, 'changed': true})
      ..json('GET', '/tests/tst1', testJson(version: 8))
      ..json('GET', '/tests/tst1/edit-info', {'mode': 'FULL'});
    c.applyEdit('p1', c.contentOfItem(c.value.items.first).copyWith(statement: r'$4\cdot x=8$'), 1);
    final key = c.insertNew(2, 'CHOICE');
    c.applyEdit(
      key,
      newContent('CHOICE').copyWith(
        statement: r'$\sqrt{16}$',
        choices: [for (var i = 0; i < 5; i++) EditorChoice(text: '${i + 2}', isCorrect: i == 2)],
      ),
      2,
    );
    final outcome = await c.save();
    expect(outcome.ok, isTrue, reason: outcome.message);
    final post = h.requests.firstWhere((r) => r.method == 'POST');
    final body = post.data as Map;
    expect(body['token'], '100-23-NZZ11');
    expect(body['chapterId'], 'ch1');
    expect((body['choiceOptions'] as List)[2], {'text': '4', 'isCorrect': true});
    final patchProblem = h.requests.firstWhere((r) => r.path == '/problems/p1');
    expect((patchProblem.data as Map)['expectedVersion'], 3);
    expect((patchProblem.data as Map)['statementText'], r'$4\cdot x=8$');
    final patchTest = h.requests.firstWhere((r) => r.path == '/tests/tst1' && r.method == 'PATCH');
    final tb = patchTest.data as Map;
    expect(tb['expectedVersion'], 7);
    expect((tb['problems'] as List).last, {'problemId': 'created1', 'order': 3, 'points': 2});
    expect(outcome.message, contains('1 шинэ бодлого'));
    expect(c.version, 8);
  });

  test('хадгалах: буруу бодлого — сервер рүү явахгүй, алдаатай бодлого руу заана', () async {
    final c = await loaded();
    final key = c.insertNew(0, 'CHOICE');
    final before = h.requests.length;
    final outcome = await c.save();
    expect(outcome.ok, isFalse);
    expect(outcome.jumpKey, key);
    expect(c.errors[key], 'Бодлогын текст хоосон байна');
    expect(h.requests.length, before);
  });

  test('хадгалах: шинэ бодлоготой ч бүлэггүй бол зогсооно', () async {
    final c = await loaded(test: testJson(chapterId: null));
    final key = c.insertNew(0, 'FILL_NUMBER');
    c.applyEdit(key, const BlockContent(format: 'FILL_NUMBER', statement: 'x', fill: '3'), 1);
    final outcome = await c.save();
    expect(outcome.message, 'Шинэ бодлого нэмэхэд тестийн бүлэг сэдэв хэрэгтэй («Тохиргоо»)');
  });

  test('409 VERSION_CONFLICT → зөрчил; «Миний хувилбарыг хадгалах» overwrite илгээнэ', () async {
    final c = await loaded();
    h.on('PATCH', '/tests/tst1', (r) {
      final overwrite = (r.data as Map)['overwrite'] == true;
      return overwrite
          ? const FakeResponse({'id': 'tst1', 'version': 9})
          : const FakeResponse({
              'statusCode': 409,
              'code': 'VERSION_CONFLICT',
              'message': 'Таныг засаж байх хооронд Б. Болд ижил хэсгийг өөрчилсөн: Нэр',
              'currentVersion': 8,
            }, status: 409);
    });
    h
      ..json('GET', '/tests/tst1', testJson(version: 9))
      ..json('GET', '/tests/tst1/edit-info', {'mode': 'FULL'});
    c.updateSettings(c.value.settings.copyWith(title: 'Шинэ нэр'));
    final first = await c.save();
    expect(first.conflict, isNotNull);
    expect(c.conflict!.message, contains('Б. Болд'));
    final second = await c.save(overwrite: true);
    expect(second.ok, isTrue);
    expect((h.requests.lastWhere((r) => r.method == 'PATCH').data as Map)['overwrite'], isTrue);
  });

  test('хэсэгчлэн амжсан: үүссэн бодлогыг дахин үүсгэхгүй', () async {
    final c = await loaded();
    h
      ..json('POST', '/problems', choiceProblemJson(id: 'created1'))
      ..error('PATCH', '/tests/tst1', 400, 'Бодлого бүр давтагдаагүй дугаар, дараалалтай байна');
    final key = c.insertNew(2, 'FILL_NUMBER');
    c.applyEdit(key, const BlockContent(format: 'FILL_NUMBER', statement: 'x', fill: '3'), 1);
    final outcome = await c.save();
    expect(outcome.ok, isFalse);
    expect(c.value.items.last.key, 'created1');
    expect(c.value.items.last.problemId, 'created1');
    expect(c.plan.creates, isEmpty);
    expect(c.plan.test, isNotNull, reason: 'тестийн бодлогын жагсаалт дахин илгээгдэнэ');
  });

  test('LIMITED: бүтэц, оноо түгжээтэй; зөвхөн нэр/хугацаа илгээнэ', () async {
    final c = await loaded(mode: 'LIMITED');
    expect(c.locks.structureLocked, isTrue);
    c.applyEdit('p1', c.contentOfItem(c.value.items.first), 9);
    expect(c.value.items.first.points, 1, reason: 'оноо түгжээтэй');
    c.updateSettings(c.value.settings.copyWith(timeLimit: '50', gradingMode: 'MANUAL'));
    expect(c.plan.test, {'timeLimitMin': 50});
  });

  test('1000 бодлого: анги сонгохгүй', () async {
    final c = await loaded(test: testJson(type: TestTypes.thousand));
    expect(c.locks.thousand, isTrue);
    expect(c.locks.canPickClasses, isFalse);
  });

  test('сангаас нэмэх: тестэд байгааг алгасна, оноо бодлогынх', () async {
    final c = await loaded();
    c.addFromBank(1, [
      ServerProblem.fromJson(choiceProblemJson(id: 'p1')),
      ServerProblem.fromJson(choiceProblemJson(id: 'b9', points: 3)),
    ]);
    expect(c.value.items.map((i) => i.key), ['p1', 'b9', 'p2']);
    expect(c.value.items[1].points, 3);
    expect(c.isChanged(c.value.items[1]), isFalse);
  });

  group('эрх (вэбтэй ижил)', () {
    test('байгаа бодлогын агуулга: Админ, Багш+ л; шинэ бодлогыг Багш ч', () async {
      final teacher = await loaded(role: UserRole.teacher);
      expect(teacher.canEditContentOf(teacher.value.items.first), isFalse);
      final key = teacher.insertNew(0, 'CHOICE');
      expect(teacher.canEditContentOf(teacher.value.items.firstWhere((i) => i.key == key)), isTrue);
      h = FakeHttp();
      final plus = await loaded();
      expect(plus.canEditContentOf(plus.value.items.first), isTrue);
    });

    test('төлбөр зөвхөн админ, жагсаалтын «Засах» — Багш өөрийнхөө', () {
      const admin = AuthoringPermissions(UserRole.admin, userId: 'a');
      const plus = AuthoringPermissions(UserRole.teacherPlus, userId: 'tp');
      const teacher = AuthoringPermissions(UserRole.teacher, userId: 'u1');
      const student = AuthoringPermissions(UserRole.student, userId: 's');
      expect([admin, plus, teacher, student].map((p) => p.canAuthor), [true, true, true, false]);
      expect([admin, plus, teacher].map((p) => p.canEditPrice), [true, false, false]);
      expect([admin, plus, teacher].map((p) => p.canEditContent), [true, true, false]);
      expect(teacher.canEditTest('u1'), isTrue);
      expect(teacher.canEditTest('other'), isFalse);
      expect(plus.canEditTest('other'), isTrue);
      expect(student.canEditTest('s'), isFalse);
    });
  });
}
