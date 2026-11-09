import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/internal_drafts/data/draft_models.dart';
import 'package:piemath_app/features/internal_drafts/data/draft_parse.dart';
import 'package:piemath_app/features/internal_drafts/data/draft_repository.dart';
import 'package:piemath_app/features/internal_drafts/ui/draft_editor_screen.dart';
import 'package:piemath_app/features/internal_drafts/ui/draft_list_screen.dart';
import 'package:piemath_app/features/internal_drafts/ui/draft_solve_screen.dart';
import 'package:piemath_app/features/internal_drafts/ui/word_import_screen.dart';

import '../../helpers/fake_http.dart';
import 'staff_harness.dart';

class _FakeDocx extends DocxPicker {
  const _FakeDocx();

  @override
  Future<({String name, Uint8List bytes})?> pick() async => (name: 'bodlogo.docx', bytes: Uint8List.fromList([1, 2, 3]));
}

Map<String, Object?> _block(String id, int order, {String statement = r'$2+2$', String? answer = 'B', int version = 1}) => {
  'id': id,
  'order': order,
  'version': version,
  'kind': 'CHOICE',
  'statement': statement,
  'choices': ['3', '4', '5'],
  'answer': answer,
  'points': 1,
  'issues': answer == null
      ? [
          {'code': 'NO_ANSWER', 'message': 'Хариу алга'},
        ]
      : <Object>[],
};

Map<String, Object?> _set({List<Map<String, Object?>>? blocks}) => {
  'id': 's1',
  'title': 'Тэгшитгэлийн ноорог',
  'subject': 'MATH',
  'status': 'DRAFT',
  'count': 2,
  'updatedByName': 'Сараа',
  'updatedAt': '2026-11-09T02:00:00.000Z',
  'blocks': blocks ?? [_block('k2', 2, statement: r'$3+3$', answer: null), _block('k1', 1)],
  'events': [
    {'id': 'e1', 'actorName': 'Сараа', 'summary': '2 бодлого нэмсэн', 'at': '2026-11-09T02:00:00.000Z'},
  ],
};

void main() {
  group('Задлагч (вэбийн parseDraftText)', () {
    test('дугаар, сонголт, хариу, бодолт, сэдэв', () {
      final r = parseDraftText('''
Энэ бол таны бодлогууд:
1. \\(x^2=4\\) тэгшитгэлийн эерэг шийд
A. \$1\$   B. \$2\$   C. \$3\$
Хариу: B
Бодолт: \$x=2\$
Сэдэв: Квадрат тэгшитгэл

2) Тоо бод: \$5\\cdot 3\$
Хариу: 15
''');
      expect(r, hasLength(2));
      expect(r.first.content.kind, DraftKind.choice);
      expect(r.first.content.statement, r'$x^2=4$ тэгшитгэлийн эерэг шийд');
      expect(r.first.content.choices, [r'$1$', r'$2$', r'$3$']);
      expect(r.first.content.answer, 'B');
      expect(r.first.content.solution, r'$x=2$');
      expect(r.first.content.tag, 'Квадрат тэгшитгэл');
      expect(r.last.content.kind, DraftKind.numeric);
      expect(r.last.content.answer, '15');
    });

    test('кирилл шошго, хариугүй бол тэмдэглэл', () {
      final r = parseDraftText('1. Асуулт\nА. нэг\nБ. хоёр\nВ. гурав');
      expect(r.single.content.choices, ['нэг', 'хоёр', 'гурав']);
      expect(r.single.notes, contains('Хариу алга'));
    });
  });

  testWidgets('жагсаалт: шүүлтүүр, шинэ ноорог үүсгэж нээнэ', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/internal-drafts/sets', [
        _set(),
        {..._set(), 'id': 's2', 'title': 'Нийтэлсэн багц', 'status': 'PUBLISHED', 'blocks': <Object>[]},
      ])
      ..json('POST', '/internal-drafts/sets', {..._set(), 'id': 's3'});
    await pumpStaff(tester, const DraftListScreen(), http: http, role: 'TEACHER_PLUS');
    expect(find.text('Тэгшитгэлийн ноорог'), findsOneWidget);
    expect(find.text('Нийтэлсэн багц'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const ValueKey('filter:published')));
    await settle(tester);
    await tester.tap(find.byKey(const ValueKey('filter:published')));
    await settle(tester);
    expect(find.text('Тэгшитгэлийн ноорог'), findsNothing);
    await tester.tap(find.text('Шинэ ноорог'));
    await settle(tester);
    expect(find.text('ROUTE:/app/internal/s3'), findsOneWidget);
  });

  testWidgets('Багшид ноорог харагдахгүй', (tester) async {
    await pumpStaff(tester, const DraftListScreen(), http: FakeHttp(), role: 'TEACHER');
    expect(find.text('Энэ хэсгийг харах эрх танд алга.'), findsOneWidget);
  });

  testWidgets('засагч: дараалал, засвар expectedVersion-тэй, бодлого устгах товчгүй', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/internal-drafts/sets/s1', _set())
      ..json('PATCH', '/internal-drafts/blocks/k1', _block('k1', 1, version: 2))
      ..json('PUT', '/internal-drafts/sets/s1/order', {'ok': true});
    await pumpStaff(tester, const DraftEditorScreen(id: 's1'), http: http, role: 'ADMIN');
    final y1 = tester.getTopLeft(find.byKey(const ValueKey('block:k1'))).dy;
    final y2 = tester.getTopLeft(find.byKey(const ValueKey('block:k2'))).dy;
    expect(y1 < y2, isTrue);
    expect(find.text('Хариу алга'), findsWidgets);
    expect(find.byTooltip('Устгах'), findsNothing);

    await tester.tap(find.byTooltip('Доош').first);
    await settle(tester);
    expect(lastBody(http, 'PUT', '/internal-drafts/sets/s1/order')['blockIds'], ['k2', 'k1']);

    // Дараалал солигдсон тул k1 одоо 2-р бодлого
    await tester.tap(find.text('2-р бодлого'));
    await settle(tester);
    await tester.ensureVisible(find.text('Болсон', skipOffstage: false));
    await settle(tester);
    await tester.tap(find.text('Болсон'));
    await settle(tester);
    final body = lastBody(http, 'PATCH', '/internal-drafts/blocks/k1');
    expect(body['expectedVersion'], 1);
    expect(body['answer'], 'B');
  });

  testWidgets('засагч: ChatGPT-ээс буулгаж бөөнөөр нэмнэ', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/internal-drafts/sets/s1', _set(blocks: []))
      ..json('POST', '/internal-drafts/sets/s1/blocks/bulk', [_block('n1', 1)]);
    await pumpStaff(tester, const DraftEditorScreen(id: 's1'), http: http, role: 'ADMIN');
    await tester.tap(find.text('ChatGPT-ээс'));
    await settle(tester);
    await tester.enterText(find.byType(TextField), '1. Бод \$1+1\$\nA. 1  B. 2\nХариу: B');
    await tester.tap(find.text('Задлах'));
    await settle(tester);
    expect(find.text('1 бодлого нэмэх үү'), findsOneWidget);
    await tester.tap(find.text('Нэмэх'));
    await settle(tester);
    final body = lastBody(http, 'POST', '/internal-drafts/sets/s1/blocks/bulk');
    expect(body['source'], 'PASTE');
    expect(((body['blocks']! as List).single as Map)['answer'], 'B');
  });

  testWidgets('бодох: хариу сонгоод шалгана', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/internal-drafts/sets/s1', _set(blocks: [_block('k1', 1)]))
      ..json('POST', '/internal-drafts/sets/s1/check', {
        'results': [
          {'n': 1, 'blockId': 'k1', 'given': 'A', 'correct': false, 'key': 'B'},
        ],
        'correct': 0,
        'wrong': 1,
        'blank': 0,
        'unkeyed': 0,
        'total': 1,
      });
    await pumpStaff(tester, const DraftSolveScreen(id: 's1'), http: http, role: 'ADMIN');
    await tester.tap(find.text('A'));
    await settle(tester);
    await tester.tap(find.text('Шалгах (1/1)'));
    await settle(tester);
    expect(lastBody(http, 'POST', '/internal-drafts/sets/s1/check'), {
      'answers': {'k1': 'A'},
    });
    expect(find.text('Буруу, зөв нь B'), findsOneWidget);
  });

  testWidgets('Word импорт: файл → нөхцөл, сонголт, зөв хариу → бүлэгт', (tester) async {
    final http = FakeHttp()
      ..json('POST', '/document-import/preview', {
        'filename': 'bodlogo.docx',
        'previewToken': 'tok',
        'equationCount': 1,
        'warnings': <Object>[],
        'blocks': [
          {'id': 'b1', 'kind': 'paragraph', 'text': r'Хэд вэ $2+2$', 'warnings': <Object>[]},
          {'id': 'b2', 'kind': 'paragraph', 'text': '3', 'warnings': <Object>[]},
          {'id': 'b3', 'kind': 'paragraph', 'text': '4', 'warnings': <Object>[]},
        ],
      })
      ..json('GET', '/chapters', [
        {'id': 'ch1', 'title': 'Нэмэх үйлдэл', 'book': {'title': 'Арифметик'}},
      ])
      ..json('POST', '/document-import/confirm', {'problemId': 'p1', 'duplicate': false});
    await pumpStaff(
      tester,
      const WordImportScreen(),
      http: http,
      role: 'TEACHER_PLUS',
      overrides: [docxPickerProvider.overrideWithValue(const _FakeDocx())],
    );
    await tester.tap(find.text('.docx файл сонгох'));
    await settle(tester);
    expect(find.textContaining('3 мөр'), findsOneWidget);

    Future<void> choose(String tile, String option) async {
      await tester.tap(find.text(tile));
      await settle(tester);
      await tester.tap(find.text(option).last);
      await settle(tester);
    }

    await choose('Нөхцөл', r'Хэд вэ $2+2$');
    await choose('Сонголт нэмэх', '3');
    await choose('Сонголт нэмэх', '4');
    await tester.tap(find.text('B сонголт'));
    await settle(tester);
    await choose('Бүлэг сэдэв', 'Нэмэх үйлдэл');
    await tester.tap(find.byType(Radio<String>).last);
    await settle(tester);
    await tester.tap(find.text('Нөхцөл, сонголт, зөв хариуг шалгасан'));
    await settle(tester);
    await tester.tap(find.text('Бүлэгт хадгалах'));
    await settle(tester);
    final body = lastBody(http, 'POST', '/document-import/confirm');
    expect(body['chapterId'], 'ch1');
    expect(body['mapping'], {
      'promptId': 'b1',
      'choiceIds': ['b2', 'b3'],
      'correctChoiceId': 'b3',
    });
    expect(find.text('Бодлого бүлэгт хадгалагдлаа'), findsOneWidget);
  });
}
