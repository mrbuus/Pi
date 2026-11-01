import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart';
import 'package:piemath_app/features/exam/domain/answer.dart';
import 'package:piemath_app/features/exam/domain/fill_slots.dart';
import 'package:piemath_app/features/exam/domain/test_list_logic.dart';
import 'package:piemath_app/features/exam/domain/timer_format.dart';

TestRow row(
  String id, {
  String title = 'Логарифм 3',
  String? groupKey,
  String type = 'DAILY',
  Object? status,
  bool result = false,
}) => TestRow.fromJson({
  'id': id,
  'title': title,
  'type': type,
  'groupKey': groupKey,
  '_count': const {'problems': 10},
  'results': result
      ? [
          {'totalScore': 7, 'maxScore': 10},
        ]
      : <Object?>[],
  'sessionStatus': status,
});

void main() {
  group('fillSlots (вэбийн fillSlots.ts-тэй ижил)', () {
    test('нүдний бүлэг, давхардлыг нэг удаа, \\lbrack хэлбэр', () {
      final g = parseFillSlots(r'Хариу [a] ба [bc], дахин [a]. Мөн \lbrack d \rbrack, [хо]');
      expect(g.map((e) => e.key), ['a', 'bc', 'd', 'хо']);
      expect(slotsTotalLength(g), 6);
      expect(parseFillSlots(null), isEmpty);
      expect(parseFillSlots(r'$x^{[2]}$'), isEmpty);
    });

    test('хоосон нүд «_», төгсгөлийн хоосныг тайрна', () {
      expect(encodeSlotDigits(['3', '', '5']), '3_5');
      expect(encodeSlotDigits(['3', '', '']), '3');
      expect(encodeSlotDigits(['', '', '']), '');
      expect(decodeSlotValue('3_5', 4), ['3', '', '5', '']);
    });

    test('цифр эхний хоосон нүдэнд, backspace сүүлийнхийг', () {
      expect(typeSlotDigit('3_5', 3, '4'), '345');
      expect(typeSlotDigit('345', 3, '1'), '345');
      expect(backspaceSlot('3_5', 3), '3');
      expect(setSlotDigit('', 3, 2, '7'), '__7');
      expect(setSlotDigit('__7', 3, 2, ''), '');
    });

    test('чөлөөт тоо: нэг «-» эхэнд, нэг «.»', () {
      var v = '';
      for (final k in ['3', '.', '5', '.', '-', '-']) {
        v = typeFreeNumber(v, k);
      }
      expect(v, '-3.5');
      expect(backspaceFree(v), '-3.');
      expect(typeFreeNumber('1', 'x'), '1');
    });
  });

  group('хариу', () {
    test('normalize: int, бүхэл double, мөр (≤1000), объект', () {
      expect(normalizeAnswer(2), 2);
      expect(normalizeAnswer(2.0), 2);
      expect(normalizeAnswer(2.5), 2.5);
      expect(normalizeAnswer(double.nan), isNull);
      expect((normalizeAnswer('x' * 1200)! as String).length, 1000);
      expect(normalizeAnswer({'a': '3', 'b': 4}), {'a': '3'});
      expect(normalizeAnswer(true), isNull);
      expect(normalizeAnswer(<Object?>[1]), isNull);
    });

    test('хариулсан эсэх (вэб: undefined ба "" биш)', () {
      expect(isAnswered(0), isTrue);
      expect(isAnswered(''), isFalse);
      expect(isAnswered(null), isFalse);
      expect(isAnswered({'a': ''}), isFalse);
      expect(isAnswered({'a': '3'}), isTrue);
    });

    test('ижил эсэх (Map-ыг утгаар)', () {
      expect(answerEquals({'a': '1'}, {'a': '1'}), isTrue);
      expect(answerEquals({'a': '1'}, {'b': '1'}), isFalse);
      expect(answerEquals(1, 1), isTrue);
    });

    test('SelfState wire', () {
      expect(SelfState.fromWire('FIXED_AFTER_ERROR'), SelfState.fixedAfterError);
      expect(SelfState.fromWire('BAD'), isNull);
    });
  });

  group('жагсаалт (вэбийн test-list/types.ts)', () {
    test('А/Б hash нь JS-ийн `(h*31+c)>>>0`-тэй ЯГ ижил (node-оор тооцсон)', () {
      expect(variantHash('u1:Илтгэгч тэгшитгэл 1'), 1034218167);
      expect(variantHash('ck9abc:Логарифм 3'), 817794252);
      expect(variantHash('student-xyz:1000:Y3'), 1190689410);
      expect(variantHash(':Өнцөг 12'), 100579296);
      // UTF-16 surrogate хос — charCodeAt-тай ижил.
      expect(variantHash('cmh123:\u{1D538} тест'), 125502635);
    });

    test('pickForStudent: дүнтэй → эхэлсэн → hash', () {
      final a = row('a', groupKey: 'Логарифм 3');
      final b = row('b', groupKey: 'Логарифм 3');
      expect(pickForStudent([a, b], 'ck9abc').id, 'a'); // hash % 2 == 0
      expect(pickForStudent([a, b], 'u1').id, 'b'); // 'u1:Логарифм 3'
      final started = row('c', groupKey: 'Логарифм 3', status: 'IN_PROGRESS');
      expect(pickForStudent([a, started], 'ck9abc').id, 'c');
      final done = row('d', groupKey: 'Логарифм 3', result: true);
      expect(pickForStudent([started, done], 'x').id, 'd');
    });

    test('collapseVariants дарааллыг хадгална', () {
      final rows = [row('1', title: 'А 1'), row('2', title: 'Б 1'), row('3', title: 'А 1')];
      expect(collapseVariants(rows, 's').map((r) => r.id).length, 2);
      expect(collapseVariants(rows, 's').last.id, '2');
    });

    test('сэдэв задлах, бүлэглэх, 1000', () {
      expect(splitTopic(row('1', title: 'Илтгэгч тэгшитгэл 12')), (topic: 'Илтгэгч тэгшитгэл', num: 12));
      expect(splitTopic(row('1', title: 'Давтлага')).topic, 'Бусад');
      expect(splitTopic(row('1', type: 'THOUSAND', groupKey: '1000:Y3')), (topic: thousandTopic, num: 3));
      expect(thousandShortTitle('1000 бодлого · Сорил 10-A'), 'Сорил 10-A');
      final g = groupByTopic([row('1', title: 'А 2'), row('2', title: 'Б 1'), row('3', title: 'А 1')]);
      expect(g.map((e) => e.topic), ['А', 'Б']);
      expect(g.first.rows.map((r) => r.id), ['3', '1']);
    });

    test('шалгалтын төрөл, номын кодыг харуулахгүй', () {
      expect(isExamType('THOUSAND'), isTrue);
      expect(isExamType('DAILY'), isFalse);
      expect(studentBookLabel(const TestBook(code: '200V3')), 'Е-2');
      expect(studentBookLabel(const TestBook(code: 'XYZ')), isNull);
      expect(studentBookLabel(const TestBook(code: '200V3', displayName: '200x200')), '200x200');
    });
  });

  test('хугацааны формат', () {
    expect(formatRemaining(309), '05:09');
    expect(formatRemaining(3723), '1:02:03');
    expect(formatRemaining(-5), '00:00');
    expect(spokenRemaining(725), '12 минут 5 секунд');
    expect(spokenRemaining(0), '0 секунд');
    expect(spokenDuration(const Duration(seconds: 12)), '12 секунд');
  });

  group('загвар задлах', () {
    test('start: draft, сонголтын зураг, хугацаагүй', () {
      final r = StartResult.fromJson(const {
        'test': {'title': 'Т', 'timeLimitMin': null},
        'session': {
          'status': 'IN_PROGRESS',
          'remainingSec': null,
          'leaveCount': 1,
          'draftAnswers': {'p1': 2, 'p2': '3_5', 'p3': true},
          'draftStates': {'p1': 'FAILED', 'p2': 'NOPE'},
        },
        'problems': [
          {
            'id': 'p1',
            'format': 'CHOICE',
            'choiceMode': 'TEXT',
            'choices': [r'$2$', ''],
            'choiceImages': [null, 'k.png'],
            'points': 1,
          },
        ],
      });
      expect(r.remainingSec, isNull);
      expect(r.draftAnswers, {'p1': 2, 'p2': '3_5'});
      expect(r.draftStates, {'p1': SelfState.failed});
      expect(r.problems.single.choiceImages, [null, 'k.png']);
      expect(r.problems.single.isChoice, isTrue);
    });

    test('аль хэдийн илгээсэн start', () {
      final r = StartResult.fromJson(const {
        'session': {'status': 'SUBMITTED'},
        'result': {'totalScore': 7, 'maxScore': 10},
      });
      expect(r.status, SessionStatus.submitted);
      expect(r.result, const ScorePair(7, 10));
      expect(r.problems, isEmpty);
    });

    test('YouTube зөвхөн youtube домэйн', () {
      expect(YoutubeLink.fromJson({'url': 'https://www.youtube.com/watch?v=x'}), isNotNull);
      expect(YoutubeLink.fromJson({'url': 'https://evil.example/watch'}), isNull);
      expect(YoutubeLink.fromJson({'url': 'http://www.youtube.com/watch?v=x'}), isNull);
    });

    test('хариуны харагдац', () {
      expect(answerDisplay({'a': '3', 'b': ''}), 'a = 3');
      expect(answerDisplay(2.0), '2');
      expect(answerDisplay(''), isNull);
    });
  });
}
