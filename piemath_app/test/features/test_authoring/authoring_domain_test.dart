import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/test_authoring/data/authoring_models.dart';
import 'package:piemath_app/features/test_authoring/domain/builder_logic.dart';
import 'package:piemath_app/features/test_authoring/domain/editor_model.dart';
import 'package:piemath_app/features/test_authoring/domain/latex_input.dart';

import 'authoring_fixtures.dart';

ServerProblem _p(Map<String, Object?> j) => ServerProblem.fromJson(j);

const _b = BlockItem.new;

void main() {
  group('сервер → засварлагч', () {
    test('сонголт дарааллаар, зөв хариу', () {
      final c = contentOf(_p(choiceProblemJson(correct: 3)));
      expect(c.choices, hasLength(5));
      expect(c.correctIndex, 3);
      expect(c.choices.first.text, r'$2$');
    });

    test('хуучин загвар: үсгээр эсвэл текстээр зөв хариу', () {
      expect(legacyChoiceList(['1', '2', '3'], 'B').map((c) => c.isCorrect), [false, true, false]);
      expect(legacyChoiceList(['1', '2', '3'], '3').map((c) => c.isCorrect), [false, false, true]);
      expect(legacyChoiceList(null, 'A'), isEmpty);
    });

    test('нөхөх: мөр, тоо, үсгээр түлхүүрлэсэн объект', () {
      const st = r'$x=[a]$, $y=[bc]$';
      expect(fillAnswerOf('325', st), '325');
      expect(fillAnswerOf(7, st), '7');
      expect(fillAnswerOf({'a': 3, 'b': '2', 'c': 5}, st), '325');
      expect(fillAnswerOf({'a': 3, 'bc': '25'}, st), '325');
      expect(fillAnswerOf({'a': 3}, st), '3');
      expect(fillAnswerOf({'b': 2}, st), '_2');
    });
  });

  group('бодлогын шалгалт (validateContent)', () {
    test('хоосон бичвэр, сонголт, зөв хариу', () {
      expect(validateContent(newContent('CHOICE')), 'Бодлогын текст хоосон байна');
      final c = newContent('CHOICE').copyWith(statement: r'$2\cdot 3$');
      expect(validateContent(c), 'Хоосон сонголт байна');
      final filled = c.copyWith(choices: [for (var i = 0; i < 5; i++) EditorChoice(text: '$i')]);
      expect(validateContent(filled), 'Зөв хариуг сонгоно уу');
      final ok = filled.copyWith(
        choices: [for (var i = 0; i < 5; i++) EditorChoice(text: '$i', isCorrect: i == 2)],
      );
      expect(validateContent(ok), '');
      expect(validateContent(ok.copyWith(choices: ok.choices.take(1).toList())), 'Дор хаяж 2 сонголт хэрэгтэй');
    });

    test('зурагтай сонголт текстгүй байж болно; зурагтай бодлого бичвэргүй байж болно', () {
      const c = BlockContent(
        imageKey: 'img1',
        choices: [
          EditorChoice(imageKey: 'a', isCorrect: true),
          EditorChoice(text: 'x'),
        ],
      );
      expect(validateContent(c), '');
    });

    test('нөхөх: бүх нүд бөглөгдсөн байх', () {
      const st = r'$x=[a]$, $y=[bc]$';
      expect(
        validateContent(const BlockContent(statement: st, format: 'FILL_NUMBER', fill: '3_5')),
        'Хариуны 3 нүдийг бүгдийг бөглөнө үү',
      );
      expect(validateContent(const BlockContent(statement: st, format: 'FILL_NUMBER', fill: '3-5')), '');
      expect(validateContent(const BlockContent(statement: 'x', format: 'FILL_NUMBER')), 'Хариуг оруулна уу');
    });
  });

  group('дараалал', () {
    final items = [_b(key: 'a'), _b(key: 'b'), _b(key: 'c'), _b(key: 'd')];
    List<String> keys(List<BlockItem> l) => [for (final i in l) i.key];

    test('moveItem: хязгаарт шахна, байр өөрчлөгдөөгүй бол ижил жагсаалт', () {
      expect(keys(moveItem(items, 'a', 2)), ['b', 'c', 'a', 'd']);
      expect(keys(moveItem(items, 'd', -5)), ['d', 'a', 'b', 'c']);
      expect(identical(moveItem(items, 'b', 1), items), isTrue);
    });

    test('reorderItems: onReorderItem-ийн эцсийн байр', () {
      expect(keys(reorderItems(items, 0, 3)), ['b', 'c', 'd', 'a']);
      expect(keys(reorderItems(items, 3, 0)), ['d', 'a', 'b', 'c']);
    });

    test('insertItems давхардлыг алгасна, removeItem', () {
      expect(keys(insertItems(items, 1, [_b(key: 'x'), _b(key: 'a')])), ['a', 'x', 'b', 'c', 'd']);
      expect(keys(removeItem(items, 'c')), ['a', 'b', 'd']);
    });

    test('сонгосон бодлогын дараалал (үүсгэх хуудас)', () {
      const f = BuilderForm(selectedProblems: ['a', 'b', 'c']);
      expect(reorderSelected(f, 0, 2).selectedProblems, ['b', 'c', 'a']);
      expect(moveSelected(f, 'c', -1).selectedProblems, ['a', 'c', 'b']);
      expect(moveSelected(f, 'a', 1).selectedProblems, ['b', 'a', 'c']);
      expect(moveSelected(f, 'a', -1), same(f));
    });
  });

  group('хадгалах төлөвлөгөө (planSave)', () {
    final p1 = _p(choiceProblemJson());
    final p2 = _p(fillProblemJson());
    final base = EditorState(
      settings: const TestSettings(title: 'Т', timeLimit: '40', chapterId: 'ch1'),
      items: [
        _b(key: 'p1', problemId: 'p1'),
        _b(key: 'p2', problemId: 'p2', points: 2),
      ],
      classes: const ['c1'],
    );
    SaveContext ctx({bool limited = false, bool admin = false, bool thousand = false}) => SaveContext(
      originals: {'p1': p1, 'p2': p2},
      limited: limited,
      isAdmin: admin,
      thousand: thousand,
      chapterId: 'ch1',
      makeToken: (_, i) => 'T-N$i',
    );

    test('өөрчлөлтгүй бол хоосон', () => expect(planSave(base, base, ctx()).isEmpty, isTrue));

    test('агуулгын засвар → PATCH зөвхөн өөрчлөгдсөн талбар + expectedVersion', () {
      final edited = contentOf(p1).copyWith(statement: r'$3\cdot x=9$');
      final plan = planSave(base.copyWith(drafts: {'p1': edited}), base, ctx());
      expect(plan.updates.single.body, {'statementText': r'$3\cdot x=9$'});
      expect(plan.updates.single.expectedVersion, 3);
      expect(plan.test, isNull);
    });

    test('шинэ бодлого → POST + тестийн бодлогын жагсаалт (түлхүүрээр)', () {
      final s = base.copyWith(
        items: [
          ...base.items,
          _b(key: 'new-1'),
        ],
        drafts: {'new-1': newContent('FILL_NUMBER').copyWith(statement: '[a]', fill: '4')},
      );
      final plan = planSave(s, base, ctx());
      expect(plan.creates.single.body['token'], 'T-N2');
      expect(plan.creates.single.body['correctAnswer'], '4');
      expect(plan.creates.single.body['chapterId'], 'ch1');
      expect((plan.test!['problems']! as List).last, {'problemId': 'new-1', 'order': 3, 'points': 1});
    });

    test('дараалал, оноо, анги, тохиргоо', () {
      final s = base.copyWith(
        items: [base.items[1], base.items[0].copyWith(points: 3)],
        classes: const ['c2', 'c1'],
        settings: base.settings.copyWith(title: ' Шинэ нэр ', groupKey: '  ', price: '5000'),
      );
      final test = planSave(s, base, ctx()).test!;
      expect(test['title'], 'Шинэ нэр');
      expect(test['groupKey'], isNull);
      expect(test.containsKey('groupKey'), isTrue);
      expect(test.containsKey('price'), isFalse, reason: 'төлбөр зөвхөн админ');
      expect(test['classroomIds'], ['c2', 'c1']);
      expect(test['problems'], [
        {'problemId': 'p2', 'order': 1, 'points': 2},
        {'problemId': 'p1', 'order': 2, 'points': 3},
      ]);
      expect(planSave(s, base, ctx(admin: true)).test!['price'], 5000);
    });

    test('LIMITED: зөвхөн нэр, хугацаа; бүтэц илгээгдэхгүй', () {
      final s = base.copyWith(
        items: [base.items[1], base.items[0]],
        settings: base.settings.copyWith(timeLimit: '60', type: 'DAILY'),
      );
      expect(planSave(s, base, ctx(limited: true)).test, {'timeLimitMin': 60});
    });

    test('1000 бодлого: төрөл, анги илгээгдэхгүй', () {
      final s = base.copyWith(
        classes: const [],
        settings: base.settings.copyWith(type: 'DAILY'),
      );
      expect(planSave(s, base, ctx(thousand: true)).test, isNull);
    });

    test('tokenPrefix', () {
      expect(tokenPrefix(['1000-S22A-12']), '1000-S22A');
      expect(tokenPrefix(['abc', '100-23-05']), '100-23');
      expect(tokenPrefix(const []), 'T');
    });
  });

  group('үүсгэх маягт', () {
    final problems = [for (final j in chapterProblemsJson(choice: 40, fill: 5)) _p(j)];

    test('hasKnownAnswer — серверийн grading.ts-тэй ижил', () {
      expect(hasKnownAnswer(_p(choiceProblemJson())), isTrue);
      expect(hasKnownAnswer(_p(choiceProblemJson(correct: -1))), isFalse);
      expect(hasKnownAnswer(_p(fillProblemJson(answer: null))), isFalse);
      expect(hasKnownAnswer(_p(fillProblemJson(answer: {'manualReview': true}))), isFalse);
      expect(
        hasKnownAnswer(const ServerProblem(id: 'x', format: 'CHOICE', choices: ['A', 'B', 'C'], correctAnswer: 'B')),
        isTrue,
        reason: 'үсгэн загвар',
      );
      expect(
        hasKnownAnswer(const ServerProblem(id: 'x', format: 'CHOICE', choices: ['12', '13'], correctAnswer: '12')),
        isFalse,
        reason: 'хуучин текстэн сонголт choiceOptions-гүй бол хариугүй',
      );
    });

    test('36+4 загвар: 36 сонгох (1, 2, 3 оноо) + 4 нөхөх, 100 мин, 100 оноо', () {
      final (f, notice) = applyEeshTemplate(const BuilderForm(chapterId: 'ch1', timeLimit: '30'), problems);
      expect(notice, isNull);
      expect(f.selectedProblems, hasLength(40));
      expect(f.title, '36+4 сэдвийн шалгалт');
      expect(f.timeLimit, '100');
      expect(f.pointOverrides['b0'], 1);
      expect(f.pointOverrides['b12'], 2);
      expect(f.pointOverrides['b35'], 3);
      final s = summarize(f, problems);
      expect(s.totalPoints, 12 + 32 + 24 + 4 * 2);
      expect(s.choice, 36);
      expect(s.fill, 4);
    });

    test('36+4: бодлого дутуу бол анхааруулга, огт байхгүй бол өөрчлөхгүй', () {
      final few = [for (final j in chapterProblemsJson(choice: 5, fill: 1)) _p(j)];
      final (f, notice) = applyEeshTemplate(const BuilderForm(), few);
      expect(f.selectedProblems, hasLength(6));
      expect(notice, contains('5/36'));
      final (same, n2) = applyEeshTemplate(const BuilderForm(), const []);
      expect(same, const BuilderForm());
      expect(n2, isNotNull);
    });

    test('ЭЕШ бүтцээс зөрөлт', () {
      const f = BuilderForm(type: 'EESH_MOCK', selectedProblems: ['b0'], timeLimit: '60');
      final d = summarize(f, problems).deviations;
      expect(d, hasLength(3));
      expect(d.last, 'Хугацаа 100 мин байх ёстой, одоо 60');
    });

    test('шалгалт: нэр, анги; бүх бодлого хариугүй бол ангид оноохгүй', () {
      expect(
        validateBuilder(const BuilderForm(), problems),
        'Дараах талбарууд дутуу байна: Тестийн нэр, Харагдах анги',
      );
      final noKey = [_p(choiceProblemJson(id: 'z', correct: -1))];
      const f = BuilderForm(title: 'Т', selectedProblems: ['z'], selectedClasses: ['c1']);
      expect(validateBuilder(f, noKey), contains('хариуны түлхүүргүй'));
      expect(validateBuilder(const BuilderForm(title: 'Т', selectedClasses: ['c1']), problems), isNull);
      expect(
        validateBuilder(const BuilderForm(title: 'Т', subject: 'SOCIAL_STUDIES'), problems),
        isNull,
        reason: 'бодлогогүй хаалттай хичээлийн тест анги шаардахгүй',
      );
    });

    test('POST /tests бие: дараалал, оноо override, хоосон талбаргүй', () {
      const f = BuilderForm(
        title: ' Т ',
        chapterId: 'ch1',
        timeLimit: 'abc',
        variantLabel: 'B',
        selectedProblems: ['b1', 'b0'],
        pointOverrides: {'b0': 3},
        selectedClasses: ['c1'],
      );
      final body = createTestBody(f, problems);
      expect(body['title'], 'Т');
      expect(body.containsKey('timeLimitMin'), isFalse);
      expect(body.containsKey('groupKey'), isFalse);
      expect(body['variantLabel'], 'B');
      expect(body['problems'], [
        {'problemId': 'b1', 'order': 1, 'points': 1},
        {'problemId': 'b0', 'order': 2, 'points': 3},
      ]);
      expect(
        createTestBody(
          const BuilderForm(title: 'Т', subject: 'SOCIAL_STUDIES'),
          problems,
          chapterId: 'chS',
        )['chapterId'],
        'chS',
      );
    });

    test('бодлого хасахад оноо override цэвэрлэгдэнэ', () {
      final f = toggleProblem(const BuilderForm(selectedProblems: ['a'], pointOverrides: {'a': 5}), 'a');
      expect(f.selectedProblems, isEmpty);
      expect(f.pointOverrides, isEmpty);
    });

    test('сангийн шүүлтүүр: код, бичвэр, tag, хариу, төрөл', () {
      final p = _p(choiceProblemJson());
      expect(const BankFilter(search: '23-05').matches(p), isTrue);
      expect(const BankFilter(search: 'квадрат').matches(p), isTrue);
      expect(const BankFilter(format: 'FILL_NUMBER').matches(p), isFalse);
      expect(const BankFilter(answerKey: AnswerKeyFilter.missing).matches(p), isFalse);
      expect(const BankFilter(image: ImageFilter.yes).matches(p), isFalse);
    });
  });

  group('LaTeX оруулах', () {
    test('курсорын байрлалд, хаалтан дотор курсор', () {
      const v = TextEditingValue(text: 'x=', selection: TextSelection.collapsed(offset: 2));
      final r = insertSnippet(v, r'\frac{|}{}');
      expect(r.text, r'x=\frac{}{}');
      expect(r.selection.baseOffset, 8);
    });

    test('сонгосон бичвэрийг ороож авна', () {
      const v = TextEditingValue(text: '2x+1', selection: TextSelection(baseOffset: 0, extentOffset: 2));
      expect(insertSnippet(v, r'\sqrt{|}').text, r'\sqrt{2x}+1');
    });

    test('томьёоны гарнаас — \$...\$', () {
      const v = TextEditingValue(text: 'Хариу ', selection: TextSelection.collapsed(offset: 6));
      expect(insertFormula(v, r'\frac{\sqrt{3}}{2}').text, r'Хариу $\frac{\sqrt{3}}{2}$');
    });

    test('үржих тэмдэг зөвхөн \\cdot', () {
      expect(normalizeMultiplication(r'2 \bullet 3'), r'2 \cdot 3');
      expect(normalizeMultiplication('2•3'), r'2\cdot 3');
      expect(normalizeMultiplication('2·3'), r'2\cdot 3');
      for (final s in latexSnippets) {
        expect(s.insert, isNot(contains(r'\bullet')));
        expect(s.insert.contains('|'), isTrue);
      }
    });
  });
}
