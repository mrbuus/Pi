import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/session.dart';
import 'package:piemath_app/core/files/photo_document.dart';
import 'package:piemath_app/core/files/photo_source.dart';
import 'package:piemath_app/features/books/books_routes.dart';
import 'package:piemath_app/features/books/data/books_models.dart';
import 'package:piemath_app/features/books/data/placement_repository.dart';

import '../../helpers/fake_http.dart';
import '../scan/scan_test_helpers.dart';

// 1x1 PNG — зургийн урьдчилсан харагдац задрахад алдаа гарахгүй.
final _png = base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');

class _FakePhotos implements PhotoSource {
  @override
  Future<PhotoPage?> takePhoto() async => PhotoPage(Uint8List.fromList(_png));

  @override
  Future<List<PhotoPage>> pickFromGallery({required int limit}) async => [PhotoPage(Uint8List.fromList(_png))];
}

final _testJson = {
  'key': 'math-v1',
  'title': 'Түвшин шалгах тест',
  'minutes': 40,
  'instructions': 'Бодолтын зургаа илгээнэ\nЗураггүй бодлогыг чадаагүй гэж үзнэ',
  'problems': [
    {'n': 1, 'statement': r'$1+1$', 'kind': 'choice', 'points': 1, 'choices': {'A': r'$2$', 'B': r'$3$'}},
    {'n': 2, 'statement': 'Нүдийг бөглө', 'kind': 'boxes', 'points': 1, 'boxes': [{'key': 'a', 'digits': 2}]},
  ],
};

const _secret = 'sssssssssssssssssssssssss';

Future<void> _pumpPlacement(WidgetTester tester, FakeHttp http, MemoryPlacementAttemptStore store) => pumpRouted(
      tester,
      initial: '/placement',
      routes: booksRoutes.public,
      http: http,
      session: const SignedOut(),
      extra: [
        placementAttemptStoreProvider.overrideWithValue(store),
        photoSourceProvider.overrideWithValue(_FakePhotos()),
      ],
    );

/// ListView-ийн доод хэсгийг (залхуу зурдаг) харагдтал гүйлгэнэ.
Future<void> _scrollTo(WidgetTester tester, Finder f) async {
  await tester.scrollUntilVisible(f, 200, scrollable: find.byType(Scrollable).first);
  await tester.pump();
}

Map<String, Object?> _body(FakeHttp http, String method, String path) =>
    (http.requests.lastWhere((r) => r.method == method && r.path == path).data as Map).cast<String, Object?>();

void main() {
  group('загвар', () {
    test('хариулсан эсэх: нүд бүгд бөглөгдсөн байх', () {
      final t = PlacementTest.fromJson(_testJson);
      expect(placementAnswered(t.problems[0], {'1': 'A'}), isTrue);
      expect(placementAnswered(t.problems[1], {'2': {'a': ''}}), isFalse);
      expect(placementAnswered(t.problems[1], {'2': {'a': '12'}}), isTrue);
    });

    test('эхлэхийн өмнөх шалгалт', () {
      expect(validatePlacementStart(name: 'Б', phone: '99112233', grade: 12), 'Нэрээ бүтэн бичнэ үү');
      expect(validatePlacementStart(name: 'Б. Тэмүүжин', phone: '9911', grade: 12), 'Утасны дугаар 8 оронтой байх ёстой');
      expect(validatePlacementStart(name: 'Б. Тэмүүжин', phone: '99112233', grade: null), 'Ангиа сонгоно уу');
      expect(validatePlacementStart(name: 'Б. Тэмүүжин', phone: '9911 2233', grade: 10), isNull);
    });

    test('сорилын бүртгэл задлах', () {
      final r = parseMockRegistrations({
        'registrations': [
          {'eventId': 'e1', 'testId': 't1', 'status': 'SUBMITTED', 'score': 30, 'max': 40},
          {'eventId': null},
        ],
      });
      expect(r.single.submitted, isTrue);
      expect(r.single.testId, 't1');
    });
  });

  group('түвшин тогтоох шалгалт апп дотор', () {
    testWidgets('маягт → эхлэх → хариу, зураг → илгээх → дууссан', (tester) async {
      final store = MemoryPlacementAttemptStore();
      final deadline = DateTime.now().toUtc().add(const Duration(minutes: 40)).toIso8601String();
      final http = FakeHttp()
        ..json('GET', '/placement/test', _testJson)
        ..json('POST', '/placement/start', {'id': 'a1', 'secret': _secret, 'deadlineAt': deadline, 'test': _testJson})
        ..json('PUT', '/placement/a1/answers', {'ok': true})
        ..json('POST', '/placement/a1/photos', {
          'key': 'k1.jpg',
          'photos': {'1': ['k1.jpg']},
        })
        ..json('POST', '/placement/a1/submit', {'ok': true, 'submittedAt': deadline});
      await _pumpPlacement(tester, http, store);
      await settle(tester);

      // Шалгалт эхлүүлэхгүйгээр алдаа заана
      await _scrollTo(tester, find.text('Шалгалт эхлэх, 40 минут'));
      await tester.tap(find.text('Шалгалт эхлэх, 40 минут'));
      await settle(tester);
      expect(find.text('Нэрээ бүтэн бичнэ үү'), findsOneWidget);

      await tester.enterText(find.widgetWithText(TextField, 'Овог нэр'), 'Б. Тэмүүжин');
      await tester.enterText(find.widgetWithText(TextField, 'Утасны дугаар'), '99112233');
      await _scrollTo(tester, find.text('Анги'));
      await tester.tap(find.text('Анги'));
      await settle(tester);
      await tester.tap(find.text('10-р анги').last);
      await settle(tester);
      await _scrollTo(tester, find.text('Шалгалт эхлэх, 40 минут'));
      await tester.tap(find.text('Шалгалт эхлэх, 40 минут'));
      await settle(tester);

      expect(_body(http, 'POST', '/placement/start'), {'name': 'Б. Тэмүүжин', 'phone': '99112233', 'grade': 10});
      expect(store.value?.id, 'a1');
      expect(find.text('1-р бодлого'), findsOneWidget);

      // Хариу сонгоход 700ms-ийн дараа автоматаар хадгална
      await tester.tap(find.text('A'));
      await tester.pump(const Duration(milliseconds: 800));
      await settle(tester);
      expect(_body(http, 'PUT', '/placement/a1/answers')['answers'], {'1': 'A'});

      // Бодолтын зураг (камер)
      await tester.tap(find.text('Бодолтын зураг').first);
      await settle(tester);
      await tester.tap(find.text('Камераар зураг авах'));
      await settle(tester);
      expect(http.count('POST', '/placement/a1/photos'), 1);
      expect(find.text('1 зураг орсон'), findsOneWidget);

      await _scrollTo(tester, find.text('Шалгалтаа илгээх'));
      await tester.tap(find.text('Шалгалтаа илгээх'));
      await settle(tester);
      expect(find.textContaining('2-р бодлогод бодолтын зураг алга'), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Илгээх'));
      await settle(tester);

      expect(_body(http, 'POST', '/placement/a1/submit')['auto'], isFalse);
      expect(find.text('Шалгалт илгээгдлээ'), findsOneWidget);
      expect(store.value, isNull);
    });

    testWidgets('хадгалсан шалгалт аль хэдийн илгээгдсэн бол дууссан төлөв', (tester) async {
      final store = MemoryPlacementAttemptStore(
        PlacementAttempt(id: 'a1', secret: _secret, deadline: DateTime.now().toUtc().add(const Duration(minutes: 5))),
      );
      final http = FakeHttp()
        ..json('POST', '/placement/a1/resume', {
          'id': 'a1',
          'deadlineAt': DateTime.now().toUtc().toIso8601String(),
          'submittedAt': DateTime.now().toUtc().toIso8601String(),
          'answers': <String, Object?>{},
          'photos': <String, Object?>{},
          'test': _testJson,
        });
      await _pumpPlacement(tester, http, store);
      await settle(tester);
      expect(find.text('Шалгалт илгээгдлээ'), findsOneWidget);
      expect(store.value, isNull);
    });

    testWidgets('хадгалсан шалгалт үргэлжилнэ (хариутай)', (tester) async {
      final store = MemoryPlacementAttemptStore(
        PlacementAttempt(id: 'a1', secret: _secret, deadline: DateTime.now().toUtc().add(const Duration(minutes: 30))),
      );
      final http = FakeHttp()
        ..json('POST', '/placement/a1/resume', {
          'id': 'a1',
          'deadlineAt': DateTime.now().toUtc().add(const Duration(minutes: 30)).toIso8601String(),
          'submittedAt': null,
          'answers': {'1': 'B'},
          'photos': {'1': ['k1.jpg']},
          'test': _testJson,
        });
      await _pumpPlacement(tester, http, store);
      await settle(tester);
      expect(find.text('1-р бодлого'), findsOneWidget);
      expect(find.text('Хариу 1/2'), findsOneWidget);
      expect(find.text('1 зураг орсон'), findsOneWidget);
    });

    testWidgets('хүчингүй болсон түлхүүр (404) → шинээр эхлэх', (tester) async {
      final store = MemoryPlacementAttemptStore(
        PlacementAttempt(id: 'gone', secret: _secret, deadline: DateTime.now().toUtc()),
      );
      final http = FakeHttp()
        ..error('POST', '/placement/gone/resume', 404, 'Шалгалт олдсонгүй')
        ..json('GET', '/placement/test', _testJson);
      await _pumpPlacement(tester, http, store);
      await settle(tester);
      expect(store.value, isNull);
      await _scrollTo(tester, find.text('Шалгалт эхлэх, 40 минут'));
      expect(find.text('Шалгалт эхлэх, 40 минут'), findsOneWidget);
    });
  });

  group('жишиг сорил апп дотор', () {
    final future = DateTime.now().toUtc().add(const Duration(days: 3));
    Map<String, Object?> pub() => {
          'live': null,
          'next': {
            'id': 'e1',
            'title': 'ЭЕШ жишиг сорил 6',
            'startsAt': future.toIso8601String(),
            'endsAt': future.add(const Duration(hours: 3)).toIso8601String(),
            'note': null,
            'timeLimitMin': 180,
            'problemCount': 40,
            'registered': 12,
            'phase': 'upcoming',
          },
          'upcoming': <Object?>[],
          'last': null,
        };

    testWidgets('нэвтрээгүй: апп доторх нэвтрэх, бүртгүүлэх', (tester) async {
      final http = FakeHttp()..json('GET', '/catalog/mock-exams', pub());
      await pumpRouted(tester, initial: '/sorils', routes: booksRoutes.public, http: http, session: const SignedOut());
      await settle(tester);
      expect(find.text('Нэвтэрч бүртгүүлэх'), findsOneWidget);
      expect(find.text('Шинэ хэрэглэгч үү? Бүртгүүлэх'), findsOneWidget);
      expect(find.textContaining('Вэбээр'), findsNothing);
      await tester.tap(find.text('Нэвтэрч бүртгүүлэх'));
      await settle(tester);
      expect(find.text('НЭВТРЭХ'), findsOneWidget);
    });

    testWidgets('сурагч: бүртгүүлэх → бүртгүүлсэн, цуцлах', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/catalog/mock-exams', pub())
        ..json('GET', '/mock-exams/my', {'registrations': <Object?>[]})
        ..json('GET', '/mock-exams/my', {
          'registrations': [
            {'eventId': 'e1', 'testId': 't9', 'status': 'NOT_STARTED', 'score': null, 'max': null},
          ],
        })
        ..json('POST', '/mock-exams/e1/register', {'ok': true});
      await pumpRouted(tester, initial: '/sorils', routes: booksRoutes.public, http: http);
      await settle(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Бүртгүүлэх'));
      await settle(tester);
      expect(http.count('POST', '/mock-exams/e1/register'), 1);
      expect(find.text('Бүртгүүлсэн'), findsOneWidget);
      expect(find.text('Цуцлах'), findsOneWidget);
    });
  });
}
