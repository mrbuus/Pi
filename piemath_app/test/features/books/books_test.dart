import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/auth/token_store.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/books/books_routes.dart';
import 'package:piemath_app/features/books/data/books_models.dart';
import 'package:piemath_app/features/books/data/placement_repository.dart';
import 'package:piemath_app/features/books/domain/book_meta.dart';
import 'package:piemath_app/features/books/domain/try_logic.dart';
import 'package:piemath_app/features/books/ui/sorils_screen.dart';

import '../../helpers/fake_http.dart';
import '../scan/scan_test_helpers.dart';

// Зохиомол каталог (жинхэнэ сурагчийн мэдээлэлгүй).
final catalogJson = [
  {'id': 'b3', 'code': '300', 'title': '300x300', 'displayName': null, 'subject': 'MATH', 'topics': 8, 'chapters': 40, 'tests': 80, 'solvableTests': 80, 'freeTests': 8, 'problems': 800},
  {'id': 'b1', 'code': '100V3', 'title': '100x100', 'displayName': null, 'subject': 'MATH', 'topics': 12, 'chapters': 60, 'tests': 120, 'solvableTests': 110, 'freeTests': 14, 'problems': 1200},
  {'id': 'b9', 'code': 'NEW', 'title': 'Шинэ ном', 'displayName': 'Е-1', 'subject': 'MATH', 'topics': 0, 'chapters': 0, 'tests': 0, 'solvableTests': 0, 'freeTests': 0, 'problems': 0},
];

final detailJson = {
  'id': 'b1',
  'code': '100V3',
  'title': '100x100',
  'displayName': null,
  'subject': 'MATH',
  'freeTests': 14,
  'topics': [
    {
      'name': 'Тоо тоолол',
      'tests': 4,
      'freeTests': 2,
      'problems': 40,
      'chapters': [
        {
          'id': 'ch1',
          'title': 'Тоо тоолол · Тест 1',
          'label': 'Тест 1',
          'order': 1,
          'problems': 10,
          'tests': [
            {'id': 't1a', 'title': 'Т1 A', 'variantLabel': 'A', 'groupKey': 'g', 'timeLimitMin': 40, 'type': 'DAILY', 'problemCount': 10, 'free': true, 'solvable': true},
            {'id': 't1b', 'title': 'Т1 B', 'variantLabel': 'B', 'groupKey': 'g', 'timeLimitMin': 40, 'type': 'DAILY', 'problemCount': 10, 'free': true, 'solvable': true},
          ],
        },
        {
          'id': 'ch2',
          'title': 'Тоо тоолол · Тест 2',
          'label': 'Тест 2',
          'order': 2,
          'problems': 10,
          'tests': [
            {'id': 't2', 'title': 'Т2', 'variantLabel': null, 'groupKey': null, 'timeLimitMin': null, 'type': 'DAILY', 'problemCount': 10, 'free': false, 'solvable': true},
          ],
        },
        {
          'id': 'ch3',
          'title': 'Тоо тоолол · Тест 3',
          'label': 'Тест 3',
          'order': 3,
          'problems': 10,
          'tests': [
            {'id': 't3', 'title': 'Т3', 'variantLabel': null, 'groupKey': null, 'timeLimitMin': null, 'type': 'DAILY', 'problemCount': 10, 'free': false, 'solvable': false},
          ],
        },
      ],
    },
  ],
};

final tryJson = {
  'id': 't1a',
  'title': 'Т1 A',
  'variantLabel': 'A',
  'timeLimitMin': 40,
  'type': 'DAILY',
  'book': {'code': '100V3', 'title': '100x100', 'displayName': null},
  'chapter': {'id': 'ch1', 'title': 'Тоо тоолол · Тест 1'},
  'problemCount': 3,
  'problems': [
    {'id': 'p1', 'n': 1, 'format': 'CHOICE', 'statementText': r'$2+3$ хэд вэ?', 'points': 1, 'imageKey': null, 'choiceMode': 'TEXT', 'choices': [r'$4$', r'$5$', r'$6$'], 'choiceImages': null},
    {'id': 'p2', 'n': 2, 'format': 'CHOICE', 'statementText': 'Хувилбар нь бичвэрт байна', 'points': 1, 'imageKey': null, 'choiceMode': 'LETTER', 'choices': ['A', 'B', 'C', 'D', 'E'], 'choiceImages': null},
    {'id': 'p3', 'n': 3, 'format': 'FILL_NUMBER', 'statementText': r'$x=[a]$, $y=[bc]$', 'points': 2, 'imageKey': null, 'choiceMode': null, 'choices': null, 'choiceImages': null},
  ],
};

void main() {
  group('загвар, мета', () {
    test('нэр: displayName → bookMeta → title', () {
      expect(bookDisplayName('100V3', '100x100'), 'Математикийн тестүүд I');
      expect(bookDisplayName('NEW', 'Шинэ ном', 'Е-1'), 'Е-1');
      expect(bookDisplayName('ZZZ', 'Гарчиг'), 'Гарчиг');
      expect(bookDisplayName('PI', 'pi'), r'$\pi$ тест');
      expect(bookOrder('300'), lessThan(bookOrder('ZZZ')));
    });

    test('BookDetail ба хувилбарууд', () {
      final d = BookDetail.fromJson(detailJson);
      expect(d.topics.single.chapters.first.variantLabels, ['A', 'B']);
      expect(d.topics.single.chapters.first.anyFree, isTrue);
      expect(d.topics.single.chapters[1].variantLabels, isEmpty);
    });

    test('TryResult хувь', () {
      final r = TryResult.fromJson(const {'score': 7, 'max': 10, 'answered': 9, 'perProblem': {'p1': true, 'p2': null}});
      expect(r.percent, 70);
      expect(r.perProblem['p2'], isNull);
      expect(r.perProblem.containsKey('p2'), isTrue);
    });

    test('MockPublic хоосон байж болно', () {
      expect(MockPublic.fromJson(const {'live': null, 'next': null, 'upcoming': <Object?>[], 'last': null}).isEmpty, isTrue);
    });
  });

  group('try_logic', () {
    test('нүдний задлал (exam.md §3.2)', () {
      expect(parseFillSlots(r'$x=[a]$, $y=[bc]$, дахин [a]'), ['a', 'bc']);
      expect(parseFillSlots(r'\lbrack a\rbrack + \lbrack de \rbrack'), ['a', 'de']);
      expect(parseFillSlots('нүдгүй'), isEmpty);
      expect(parseFillSlots(null), isEmpty);
    });

    test('нүдний хариуны объект', () {
      expect(encodeSlotAnswer({'a': '3', 'bc': ' 54 '}), {'a': '3', 'bc': '54'});
      expect(encodeSlotAnswer({'a': '', 'bc': '5'}), {'bc': '5'});
      expect(encodeSlotAnswer({'a': ''}), isNull);
    });

    test('хариулсан эсэх, тайлбар, цаг', () {
      expect(isAnswered(0), isTrue);
      expect(isAnswered(''), isFalse);
      expect(isAnswered(<String, String>{}), isFalse);
      expect(tryVerdict(95), 'маш сайн');
      expect(tryVerdict(40), 'суурь дээрээ ажиллах хэрэгтэй');
      expect(mmss(309), '05:09');
      expect(mmss(-3), '00:00');
    });

    test('сорилын цаг: «Ням, 10-р сарын 18, 11:00» UB-аар', () {
      // 2026-10-18 03:00 UTC = UB 11:00, Ням
      expect(formatEventTime(DateTime.utc(2026, 10, 18, 3)), 'Ням, 10-р сарын 18, 11:00');
    });
  });

  group('дэлгэцүүд', () {
    testWidgets('каталог: эрэмбэ, нэр, «Удахгүй», код харагдахгүй', (tester) async {
      final http = FakeHttp()..json('GET', '/catalog/books', catalogJson);
      await pumpRouted(tester, initial: '/books', routes: booksRoutes.public, http: http, session: const SignedOut());
      await settle(tester);
      final first = tester.getTopLeft(find.text('Математикийн тестүүд I')).dy;
      final third = tester.getTopLeft(find.text('Математикийн тестүүд III')).dy;
      expect(first, lessThan(third));
      expect(find.text('Е-1'), findsOneWidget);
      expect(find.text('Удахгүй'), findsOneWidget);
      expect(find.text('100V3'), findsNothing);
      expect(http.requests.single.headers.containsKey('Authorization'), isFalse);
    });

    testWidgets('каталог алдаа → дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..error('GET', '/catalog/books', 500)
        ..json('GET', '/catalog/books', catalogJson);
      await pumpRouted(tester, initial: '/books', routes: booksRoutes.public, http: http, session: const SignedOut());
      await settle(tester);
      expect(find.text(AppStrings.serverError), findsOneWidget);
      await tester.tap(find.text(AppStrings.retry));
      await settle(tester);
      expect(find.text('Математикийн тестүүд I'), findsOneWidget);
    });

    testWidgets('ном → сэдэв → тестүүд (нэвтрээгүй: Бодож үзэх / Эрх нээх / Танхимд)', (tester) async {
      final http = FakeHttp()..json('GET', '/catalog/books/100V3', detailJson);
      await pumpRouted(tester, initial: '/books/100V3', routes: booksRoutes.public, http: http, session: const SignedOut());
      await settle(tester);
      expect(find.text('Тоо тоолол'), findsOneWidget);
      await tester.tap(find.text('Тоо тоолол'));
      await settle(tester);
      expect(find.text('Тест 1'), findsOneWidget);
      expect(find.text('Бодож үзэх'), findsOneWidget);
      expect(find.text('Эрх нээх'), findsWidgets);
      expect(find.text('Танхимд, удахгүй онлайнаар'), findsOneWidget);
      // A/B хувилбар
      await tester.tap(find.text('B хувилбар'));
      await settle(tester);
      expect(find.text('Бодож үзэх'), findsOneWidget);
      // Эрх нээх → мэдээлэл (үнэ, худалдах товчгүй)
      await tester.tap(find.widgetWithText(OutlinedButton, 'Эрх нээх').first);
      await settle(tester);
      expect(find.textContaining('эрхтэй сурагчид үзнэ'), findsWidgets);
      // Apple 3.1.1 / Google Play: худалдан авалт руу хөтлөх холбоос байхгүй
      expect(find.text('Вэбээр нээх'), findsNothing);
    });

    testWidgets('нэвтэрсэн бол үнэгүй биш тест → «Эрхтэй бол нээх»', (tester) async {
      final http = FakeHttp()..json('GET', '/catalog/books/100V3', detailJson);
      await pumpRouted(tester, initial: '/books/100V3/topic/0', routes: booksRoutes.public, http: http);
      await settle(tester);
      expect(find.text('Эрхтэй бол нээх'), findsOneWidget);
    });

    testWidgets('сурагчид «Эх PDF» харагдахгүй', (tester) async {
      final http = FakeHttp()..json('GET', '/catalog/books/100V3', detailJson);
      await pumpRouted(tester, initial: '/books/100V3/topic/0', routes: booksRoutes.public, http: http);
      await settle(tester);
      expect(find.text('Эх PDF'), findsNothing);
    });

    testWidgets('багш: «Эх PDF» бүлэг бүрт', (tester) async {
      final http = FakeHttp()..json('GET', '/catalog/books/100V3', detailJson);
      await pumpRouted(
        tester,
        initial: '/books/100V3/topic/0',
        routes: booksRoutes.public,
        http: http,
        session: const SignedIn(StoredAuth(token: 't', userId: 'u2', role: UserRole.teacher)),
      );
      await settle(tester);
      expect(find.text('Эх PDF'), findsNWidgets(3));
    });

    testWidgets('багш: эх PDF-гүй бүлэг → тайван тайлбар, олдвол түлхүүр заасан хүсэлт', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/catalog/books/100V3', detailJson)
        ..json('GET', '/tests/source-pdf', {'key': null});
      await pumpRouted(
        tester,
        initial: '/books/100V3/topic/0',
        routes: booksRoutes.public,
        http: http,
        session: const SignedIn(StoredAuth(token: 't', userId: 'u2', role: UserRole.teacherPlus)),
      );
      await settle(tester);
      await tester.tap(find.text('Эх PDF').first);
      await settle(tester);
      expect(http.requests.last.path, '/tests/source-pdf');
      expect(http.requests.last.queryParameters['chapterId'], 'ch1');
      expect(find.text('Энэ бүлгийн эх PDF одоогоор алга'), findsOneWidget);
    });

    testWidgets('багш: эх PDF-д эрхгүй (403) → серверийн мессеж', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/catalog/books/100V3', detailJson)
        ..error('GET', '/tests/source-pdf', 403, 'Танд энэ файлыг үзэх эрх алга');
      await pumpRouted(
        tester,
        initial: '/books/100V3/topic/0',
        routes: booksRoutes.public,
        http: http,
        session: const SignedIn(StoredAuth(token: 't', userId: 'u2', role: UserRole.teacher)),
      );
      await settle(tester);
      await tester.tap(find.text('Эх PDF').first);
      await settle(tester);
      expect(find.text('Танд энэ файлыг үзэх эрх алга'), findsOneWidget);
    });

    testWidgets('үнэгүй тест: хариулаад дүгнүүлнэ, серверт зөв хэлбэрээр', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/catalog/try/tests/t1a', tryJson)
        ..json('POST', '/catalog/try/tests/t1a/grade', {
          'score': 3,
          'max': 4,
          'answered': 3,
          'perProblem': {'p1': true, 'p2': false, 'p3': true},
        });
      await pumpRouted(tester, initial: '/books/100V3/try/t1a', routes: booksRoutes.public, http: http, session: const SignedOut());
      await settle(tester);
      expect(find.text('3 бодлого, 40 минут'), findsOneWidget);
      // TEXT горим: индекс, LETTER горим: үсэг
      final grids = find.byType(ChoiceGrid);
      await tester.tap(find.descendant(of: grids.at(0), matching: find.text('B')));
      await tester.pump();
      await tester.tap(find.descendant(of: grids.at(1), matching: find.text('C')));
      await tester.pump();
      final list = find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first;
      await tester.scrollUntilVisible(find.widgetWithText(TextField, 'bc'), 200, scrollable: list);
      await tester.enterText(find.widgetWithText(TextField, 'a'), '3');
      await tester.enterText(find.widgetWithText(TextField, 'bc'), '54');
      await tester.pump();
      await tester.scrollUntilVisible(find.text('Дүгнүүлэх'), 200, scrollable: list);
      await tester.tap(find.text('Дүгнүүлэх'));
      await settle(tester, frames: 20);
      final body = http.requests.last.data as Map;
      expect(body['answers'], {
        'p1': 1,
        'p2': 'C',
        'p3': {'a': '3', 'bc': '54'},
      });
      expect(find.text('3 / 4 оноо'), findsOneWidget);
      expect(find.text('Зөв'), findsNWidgets(2));
      expect(find.text('Буруу'), findsOneWidget);
      // Дахин бодох
      await tester.tap(find.text('Дахин бодох'));
      await settle(tester);
      expect(find.text('3 / 4 оноо'), findsNothing);
    });

    testWidgets('үнэгүй биш тест (403) → тайлбар', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/catalog/try/tests/t2', {'locked': true, 'message': 'Энэ тест номын эрхтэй сурагчдад нээлттэй'}, status: 403);
      await pumpRouted(tester, initial: '/books/100V3/try/t2', routes: booksRoutes.public, http: http, session: const SignedOut());
      await settle(tester);
      expect(find.text('Энэ тест номын эрхтэй сурагчдад нээлттэй'), findsOneWidget);
    });

    testWidgets('жишиг сорил', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/catalog/mock-exams', {
          'live': null,
          'next': {
            'id': 'e1', 'title': 'ЭЕШ жишиг сорил 5', 'startsAt': '2026-11-08T03:00:00.000Z', 'endsAt': '2026-11-08T06:00:00.000Z',
            'note': null, 'timeLimitMin': 180, 'problemCount': 40, 'registered': 120, 'phase': 'upcoming',
          },
          'upcoming': <Object?>[],
          'last': {'title': 'ЭЕШ жишиг сорил 4', 'startsAt': '2026-11-01T03:00:00.000Z', 'participants': 300, 'avgPct': 54},
        });
      await pumpRouted(tester, initial: '/sorils', routes: booksRoutes.public, http: http, session: const SignedOut());
      await settle(tester);
      expect(find.text('ЭЕШ жишиг сорил 5'), findsOneWidget);
      expect(find.text('Ням, 11-р сарын 8, 11:00'), findsOneWidget);
      expect(find.text('300 оролцогч'), findsOneWidget);
    });

    testWidgets('түвшин тогтоох: мэдээлэл', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/placement/test', {
          'key': 'math-v1',
          'title': 'Түвшин шалгах тест',
          'minutes': 40,
          'instructions': 'Бодолтын зургаа илгээнэ\nХугацаа 40 минут',
          'problems': [
            {'n': 1, 'statement': r'$1+1$', 'kind': 'choice', 'points': 1, 'choices': {'A': r'$2$'}},
          ],
        });
      await pumpRouted(
        tester,
        initial: '/placement',
        routes: booksRoutes.public,
        http: http,
        session: const SignedOut(),
        extra: [placementAttemptStoreProvider.overrideWithValue(MemoryPlacementAttemptStore())],
      );
      await settle(tester);
      expect(find.text('Түвшин шалгах тест'), findsOneWidget);
      expect(find.text('1 бодлого'), findsOneWidget);
      // Апп дотор өгнө — вэб рүү хөтлөхгүй (эзэн 2026-11-10)
      await tester.scrollUntilVisible(find.text('Шалгалт эхлэх, 40 минут'), 200, scrollable: find.byType(Scrollable).first);
      expect(find.text('Шалгалт эхлэх, 40 минут'), findsOneWidget);
      expect(find.textContaining('Вэбээр'), findsNothing);
    });
  });
}
