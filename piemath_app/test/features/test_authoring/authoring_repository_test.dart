import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/features/test_authoring/data/authoring_models.dart';
import 'package:piemath_app/features/test_authoring/data/authoring_repository.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'authoring_fixtures.dart';

void main() {
  TestAuthoringRepository repo(FakeHttp h) => testContainer(http: h).read(testAuthoringRepositoryProvider);

  test('GET /tests/:id — бодлого дарааллаар, хариу, хувилбар, анги', () async {
    final h = FakeHttp()..json('GET', '/tests/tst1', testJson());
    final t = await repo(h).test('tst1');
    expect(t.title, 'Илтгэгч тэгшитгэл 1');
    expect(t.version, 7);
    expect(t.subject, 'MATH');
    expect(t.timeLimitMin, 40);
    expect(t.classroomIds, ['c1']);
    expect(t.problems.map((p) => p.problemId), ['p1', 'p2']);
    final p1 = t.problems.first.problem;
    expect(p1.token, '100-23-05');
    expect(p1.version, 3);
    expect(p1.choiceOptions.where((c) => c.isCorrect).single.order, 2);
    expect(p1.tags, ['Квадрат тэгшитгэл']);
    expect(t.problems.last.points, 2);
  });

  test('edit-info: LIMITED / FULL', () async {
    final h = FakeHttp()
      ..json('GET', '/tests/a/edit-info', {'mode': 'LIMITED', 'reason': 'Сурагч эхлүүлсэн'})
      ..json('GET', '/tests/b/edit-info', {'mode': 'FULL'});
    final r = repo(h);
    expect((await r.editInfo('a')).limited, isTrue);
    expect((await r.editInfo('b')).limited, isFalse);
  });

  test('каталог: анги, бүлэг (хичээлийн query), бүлгийн бодлого take=100', () async {
    final h = FakeHttp()
      ..json('GET', '/classrooms', classroomsJson)
      ..json('GET', '/chapters', chaptersJson)
      ..json('GET', '/chapters/ch1/problems', chapterProblemsJson());
    final r = repo(h);
    final classes = await r.classrooms();
    expect(classes.first.enrollments, 18);
    expect(classes.first.subjectOrMath, 'MATH');
    expect(classes.last.subjectOrMath, 'SOCIAL_STUDIES');
    final chapters = await r.chapters(subject: 'MATH');
    expect(chapters.first.label, '100 — Илтгэгч тэгшитгэл');
    await r.chapters();
    final problems = await r.chapterProblems('ch1');
    expect(problems, hasLength(4));
    final q = h.requests.where((x) => x.path == '/chapters').map((x) => x.queryParameters).toList();
    expect(q[0], {'subject': 'MATH'});
    expect(q[1], isEmpty);
    expect(h.requests.last.queryParameters['take'], 100);
  });

  test('POST /tests: id, хариуны анхааруулга', () async {
    final h = FakeHttp()
      ..json('POST', '/tests', {
        'id': 'new1',
        'answerWarning': {'message': '1 бодлого хариуны түлхүүргүй тул дүнд тооцогдохгүй.', 'withoutAnswerCount': 1},
      });
    final created = await repo(h).createTest({'title': 'Т'});
    expect(created.id, 'new1');
    expect(created.answerWarning!.withoutAnswerCount, 1);
  });

  test('ноорог: үүсгэх, авах, PATCH-д expectedRevision', () async {
    final h = FakeHttp()
      ..json('POST', '/tests/drafts', {'id': 'd1', 'revision': 1, 'state': <String, Object?>{}})
      ..json('GET', '/tests/drafts/d1', {
        'id': 'd1',
        'revision': 4,
        'state': {'title': 'Ноорог тест'},
      })
      ..json('PATCH', '/tests/drafts/d1', {'id': 'd1', 'revision': 2, 'state': <String, Object?>{}});
    final r = repo(h);
    expect((await r.createDraft({'title': 'А'})).id, 'd1');
    final d = await r.draft('d1');
    expect(d.revision, 4);
    expect(d.title, 'Ноорог тест');
    expect((await r.updateDraft('d1', {'title': 'Б'}, expectedRevision: 1)).revision, 2);
    final body = h.requests.last.data as Map;
    expect(body['expectedRevision'], 1);
    expect(body['title'], 'Б');
  });

  test('бүлэг үүсгэх (номгүй хичээл), хуулах, бодлого үүсгэх/засах', () async {
    final h = FakeHttp()
      ..json('POST', '/chapters/for-subject', {'id': 'chS'})
      ..json('POST', '/tests/tst1/duplicate', {'id': 'cp1', 'title': 'Т (хуулбар)', 'problems': 2})
      ..json('POST', '/problems', choiceProblemJson(id: 'np1'))
      ..json('PATCH', '/problems/p1', {
        'id': 'p1',
        'version': 4,
        'mergedWith': ['Б. Болд'],
      });
    final r = repo(h);
    expect(await r.ensureSubjectChapter(subject: 'SOCIAL_STUDIES', title: 'Иргэн'), 'chS');
    expect((h.requests.first.data as Map)['subject'], 'SOCIAL_STUDIES');
    expect((await r.duplicate('tst1')).title, 'Т (хуулбар)');
    expect((await r.createProblem({'format': 'CHOICE'})).id, 'np1');
    expect((await r.updateProblem('p1', {'statementText': 'x'})).mergedWith, ['Б. Болд']);
  });

  test('409 VERSION_CONFLICT задлах', () async {
    final h = FakeHttp()
      ..json('PATCH', '/tests/tst1', {
        'statusCode': 409,
        'code': 'VERSION_CONFLICT',
        'message': 'Таныг засаж байх хооронд Б. Болд ижил хэсгийг өөрчилсөн: Нэр',
        'currentVersion': 9,
        'fields': ['title'],
      }, status: 409);
    try {
      await repo(h).updateTest('tst1', {'title': 'X'});
      fail('409');
    } on ApiError catch (e) {
      final c = VersionConflict.fromBody(e.message, e.status, e.body)!;
      expect(c.currentVersion, 9);
      expect(c.fields, ['title']);
      expect(c.message, contains('Б. Болд'));
    }
  });

  test('ажилтны жагсаалт: анги, тоо, ноорог', () async {
    final h = FakeHttp()
      ..json('GET', '/tests', [
        {
          'id': 't1',
          'title': 'Тест 1',
          'type': 'DAILY',
          'isDraft': true,
          'createdById': 'u1',
          '_count': {'problems': 10, 'results': 3},
          'access': [
            {
              'classroom': {'name': '12А анги'},
            },
          ],
          'chapter': {
            'book': {'code': '100'},
          },
        },
      ]);
    final rows = await repo(h).staffTests();
    expect(rows.single.problemCount, 10);
    expect(rows.single.resultCount, 3);
    expect(rows.single.classNames, ['12А анги']);
    expect(rows.single.isDraft, isTrue);
  });
}
