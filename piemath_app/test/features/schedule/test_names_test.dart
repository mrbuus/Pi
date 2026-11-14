import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/schedule/data/staff_schedule_models.dart';
import 'package:piemath_app/features/schedule/domain/lesson_road.dart';
import 'package:piemath_app/features/schedule/domain/test_names.dart';

import 'staff_fixtures.dart';

// Вэбийн `web/tests/testNames.test.cjs`-тэй ижил хүснэгт — гурван хэрэгжилт (API, вэб, апп) нэг дүрэмтэй.

void main() {
  group('groupTestNames', () {
    test('нэг сэдвийн дугаартай тестүүд нэг бүлэг', () {
      expect(
        groupTestNames([
          'Квадрат тэгшитгэлийн шийдийн хамаарал 1',
          'Квадрат тэгшитгэлийн шийдийн хамаарал 2',
          'Квадрат тэгшитгэлийн шийдийн хамаарал 3',
        ]),
        'Квадрат тэгшитгэлийн шийдийн хамаарал 1, 2, 3',
      );
    });

    test('өөр сэдвүүд «; »-оор тусдаа, дараалал хадгалагдана', () {
      expect(
        groupTestNames([
          'Иррационал тэгшитгэл 4',
          'Иррационал тэгшитгэл 5',
          'Иррационал тэгшитгэл 6',
          'Илтгэгч тэгшитгэл 1',
          'Илтгэгч тэгшитгэл 2',
          'Илтгэгч тэгшитгэл 3',
          'Илтгэгч тэгшитгэл 4',
        ]),
        'Иррационал тэгшитгэл 4, 5, 6; Илтгэгч тэгшитгэл 1, 2, 3, 4',
      );
    });

    test('ганц нэр, хоосон жагсаалт', () {
      expect(groupTestNames(['Тоо тоолол 1']), 'Тоо тоолол 1');
      expect(groupTestNames([]), '');
      expect(groupTestNames(['', '  ']), '');
    });

    test('олон оронтой тоо, тоон дараалал бичсэнээрээ', () {
      expect(groupTestNames(['Тоо тоолол 9', 'Тоо тоолол 10', 'Тоо тоолол 11']), 'Тоо тоолол 9, 10, 11');
      expect(groupTestNames(['Тоо тоолол 3', 'Тоо тоолол 1']), 'Тоо тоолол 3, 1');
    });

    test('тоогүй нэр бие даана, тоотой бүлэгтэй нийлэхгүй', () {
      expect(
        groupTestNames(['Илтгэгч тэгшитгэл', 'Илтгэгч тэгшитгэл 1', 'Илтгэгч тэгшитгэл 2', 'Иррац шалгалт']),
        'Илтгэгч тэгшитгэл; Илтгэгч тэгшитгэл 1, 2; Иррац шалгалт',
      );
    });

    test('угтвар суурь нэр өөр бүлэг', () {
      expect(
        groupTestNames(['Тэгшитгэл 1', 'Тэгшитгэл систем 1', 'Тэгшитгэл 2', 'Тэгшитгэл систем 2']),
        'Тэгшитгэл 1, 2; Тэгшитгэл систем 1, 2',
      );
      expect(
        groupTestNames(['Рациональ тэгшитгэл 1', 'Рациональ тэнцэтгэл биш 1']),
        'Рациональ тэгшитгэл 1; Рациональ тэнцэтгэл биш 1',
      );
    });

    test('холилдсон дараалал — бүлэг анх гарсан байрандаа', () {
      expect(groupTestNames(['А 1', 'Б 1', 'А 2']), 'А 1, 2; Б 1');
    });

    test('давхардал, илүү хоосон зай, зөвхөн тоо', () {
      expect(groupTestNames(['Модуль  1', 'Модуль 1', ' Модуль 2 ']), 'Модуль 1, 2');
      expect(groupTestNames(['5', '5', 'Сэдэв']), '5; Сэдэв');
      expect(groupTestNames(['Тест 1A', 'Тест 1B']), 'Тест 1A; Тест 1B');
    });
  });

  test('regroupTopicText: хуучин «, »-тэй гарчгийг товчилно, чөлөөт бичвэрийг эвдэхгүй', () {
    expect(regroupTopicText('Урвуу функц 1, Урвуу функц 2'), 'Урвуу функц 1, 2');
    expect(regroupTopicText('Урвуу функц 1, Модуль 3'), 'Урвуу функц 1, Модуль 3');
    expect(regroupTopicText('Давталт, шалгалт'), 'Давталт, шалгалт');
    expect(regroupTopicText('Урвуу функц 1, 2'), 'Урвуу функц 1, 2');
    expect(regroupTopicText(null), '');
    expect(regroupTopicText('Сэдэв'), 'Сэдэв');
  });

  test('groupTestItems: бүлгийн гишүүн бүр өөрийн зүйлтэй', () {
    final items = [
      (n: 'А 1', x: [2]),
      (n: 'Б', x: <int>[]),
      (n: 'А 2', x: <int>[]),
      (n: 'А 2', x: [9]),
    ];
    final g = groupTestItems(items, (i) => i.n);
    expect(g.map((x) => x.base), ['А', 'Б']);
    expect(g[0].members.map((m) => (m.number, m.item)), [('1', items[0]), ('2', items[2])]);
    expect(g[1].members.single.number, isNull);
  });

  group('мөрийн тест (roadOf)', () {
    const tests = {
      'tA': PlanTest(id: 'tA', title: 'Квадрат 1', short: 'Квадрат 1', problemIds: ['p1', 'p2', 'p3']),
      'tB': PlanTest(id: 'tB', title: 'Квадрат 2', short: 'Квадрат 2'),
    };

    test('хийгдээгүй бол төлөвлөсөн тест + сэдэв', () {
      final l = DayLesson.fromJson({
        ...lessonJson(id: 's1', date: '2026-11-04'),
        'plan': {
          'testIds': ['tA', 'tB'],
          'customTopics': ['Давталт'],
        },
      }, '2026-11-04');
      final road = roadOf(l, tests);
      expect(road.doneToday, isFalse);
      expect(lessonTestsText(l, tests), 'Квадрат 1, 2; Давталт');
    });

    test('хийсэн бол хийсэн тест (хассан дугаар, гараар бүртгэсэн нэр)', () {
      final l = DayLesson.fromJson({
        ...lessonJson(id: 's1', date: '2026-11-04'),
        'plan': {
          'testIds': ['tB'],
        },
        'done': [
          {
            'sessionId': 'x1',
            'testId': 'tA',
            'excludedProblemIds': ['p3', 'p1'],
          },
          {'sessionId': 'x2', 'testId': null, 'manualTitle': 'Цаасан сорил'},
        ],
      }, '2026-11-04');
      final road = roadOf(l, tests);
      expect(road.doneToday, isTrue);
      expect(road.today.first.excluded, [1, 3]);
      expect(lessonTestsText(l, tests), 'Квадрат 1; Цаасан сорил');
    });

    test('тест, сэдэвгүй бол хуучин сэдвийг товчилно', () {
      final l = DayLesson.fromJson(lessonJson(id: 's1', date: '2026-11-04', topic: 'Модуль 1, Модуль 2'), '2026-11-04');
      expect(lessonTestsText(l, tests), 'Модуль 1, 2');
    });
  });
}
