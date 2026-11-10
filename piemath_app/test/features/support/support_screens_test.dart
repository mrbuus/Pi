import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/support/domain/help_links.dart';
import 'package:piemath_app/features/support/ui/centre_info_screen.dart';
import 'package:piemath_app/features/support/ui/feedback_screen.dart';
import 'package:piemath_app/features/support/ui/support_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';

void main() {
  group('туслахын эх сурвалж апп доторх зам руу (вэб биш)', () {
    test('зураглал', () {
      expect(supportSourceTarget('/app/study'), '/app/study');
      expect(supportSourceTarget('/#branches'), centreInfoPath);
      expect(supportSourceTarget('/#tuition'), centreInfoPath);
      expect(supportSourceTarget('/register'), centreInfoPath);
      expect(supportSourceTarget('/login'), '/app/password');
      expect(supportSourceTarget('/offline'), isNull);
      expect(supportSourceTarget('https://pimath.mn/help'), isNull);
      expect(supportSourceTarget('//evil.com/app/x'), isNull);
    });

    testWidgets('вэбийн нүүрийн хэсэг → төвийн мэдээлэл, апп-д байхгүй бол товчгүй', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/centre-help/topics', {'version': '1', 'topics': <Object?>[]})
        ..json('POST', '/centre-help/ask', {
          'version': '1',
          'mode': 'authored-retrieval',
          'matches': [
            {'id': 'a', 'question': 'Салбарууд хаана', 'answer': 'Хоёр салбар', 'terms': <String>[], 'source': {'label': 'Салбарын хаяг', 'href': '/#branches'}},
            {'id': 'b', 'question': 'Интернэтгүй', 'answer': 'Хадгалсан томьёо', 'terms': <String>[], 'source': {'label': 'Холболтын тусламж', 'href': '/offline'}},
          ],
          'fallback': null,
        });
      await pumpM7(tester, const SupportScreen(), http: http);
      await tester.tap(find.text('Гэрийн даалгаврын зураг яаж илгээх вэ?'));
      await settle(tester);
      expect(find.text('Салбарууд хаана'), findsOneWidget);
      expect(find.text('Холболтын тусламж'), findsNothing);
      await tester.tap(find.text('Салбарын хаяг'));
      await settle(tester);
      expect(find.text('ROUTE:$centreInfoPath'), findsOneWidget);
    });

    testWidgets('төвийн мэдээлэл: салбар, утас', (tester) async {
      await pumpM7(tester, const CentreInfoScreen(), http: FakeHttp());
      expect(find.text('Салбар 1'), findsOneWidget);
      expect(find.text('9590 4411'), findsOneWidget);
    });
  });

  group('Төвийн туслах', () {
    testWidgets('сэдэв → асуух → хариулт, эх сурвалж апп-ын замаар', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/centre-help/topics', {
          'version': '1',
          'topics': [
            {'id': 't1', 'question': 'Гэрийн даалгаврын зураг яаж илгээх вэ?'},
          ],
        })
        ..json('POST', '/centre-help/ask', {
          'version': '1',
          'mode': 'authored-retrieval',
          'matches': [
            {
              'id': 'm1',
              'question': 'Гэрийн даалгавар илгээх',
              'answer': 'Даалгавар хэсгээс зургаа сонгоно',
              'terms': <String>[],
              'source': {'label': 'Даалгавар', 'href': '/app/homework'},
            },
          ],
          'fallback': null,
        });
      await pumpM7(tester, const SupportScreen(), http: http);
      await tester.tap(find.text('Гэрийн даалгаврын зураг яаж илгээх вэ?'));
      await settle(tester);
      final ask = http.requests.singleWhere((r) => r.path == '/centre-help/ask');
      expect(ask.data, {'question': 'Гэрийн даалгаврын зураг яаж илгээх вэ?'});
      expect(ask.headers.containsKey('Authorization'), isFalse);
      expect(find.text('Гэрийн даалгавар илгээх'), findsOneWidget);
      await tester.tap(find.text('Даалгавар'));
      await settle(tester);
      expect(find.text('ROUTE:/app/homework'), findsOneWidget);
    });

    testWidgets('сүлжээний алдаа: асуулт талбарт хэвээр', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/centre-help/topics', {'version': '1', 'topics': <Object?>[]})
        ..on('POST', '/centre-help/ask', (_) => const FakeResponse.network());
      await pumpM7(tester, const SupportScreen(), http: http);
      await tester.enterText(find.byType(TextField), 'Төлбөр хэрхэн төлөх вэ');
      await tester.pump();
      await tester.tap(find.text('Асуух'));
      await settle(tester);
      expect(find.textContaining('Туслахтай холбогдож чадсангүй'), findsOneWidget);
      expect(find.text('Төлбөр хэрхэн төлөх вэ'), findsOneWidget);
    });
  });

  group('Санал хүсэлт', () {
    testWidgets('шалгалт: богино гарчиг илгээхгүй', (tester) async {
      final http = FakeHttp()..json('GET', '/feedback', <Object?>[]);
      await pumpM7(tester, const FeedbackScreen(), http: http);
      expect(find.text('Хүсэлт хараахан алга'), findsOneWidget);
      await tester.enterText(find.byType(TextFormField).first, 'аб');
      await tester.tap(find.text('Хүсэлт илгээх'));
      await tester.pump();
      expect(find.text('Гарчиг 3-аас дээш тэмдэгт байна'), findsOneWidget);
      expect(http.requests.where((r) => r.method == 'POST'), isEmpty);
    });

    testWidgets('илгээх: DTO-ийн талбар л, давтан оролдлогод ижил id', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/feedback', <Object?>[])
        ..on('POST', '/feedback', (_) => const FakeResponse({'statusCode': 500}, status: 500))
        ..on(
          'POST',
          '/feedback',
          (req) => const FakeResponse({
            'id': 'f1',
            'kind': 'SUGGESTION',
            'subject': 'Харанхуй горим',
            'body': 'Шөнө уншихад тохиромжтой болгох',
            'state': 'OPEN',
            'response': null,
            'createdAt': '2026-11-04T02:00:00.000Z',
          }),
        );
      await pumpM7(tester, const FeedbackScreen(), http: http);
      await tester.tap(find.text('Санал өгөх'));
      await tester.enterText(find.byType(TextFormField).first, 'Харанхуй горим');
      await tester.enterText(find.byType(TextFormField).last, 'Шөнө уншихад тохиромжтой болгох');
      await tester.tap(find.text('Хүсэлт илгээх'));
      await settle(tester);
      expect(find.textContaining('баталгаажсангүй'), findsOneWidget);
      await tester.tap(find.text('Хүсэлт илгээх'));
      await settle(tester);
      final posts = http.requests.where((r) => r.method == 'POST').toList();
      expect(posts.length, 2);
      final a = posts[0].data as Map, b = posts[1].data as Map;
      expect(a['clientRequestId'], b['clientRequestId']);
      expect(a.keys.toSet(), {'clientRequestId', 'kind', 'subject', 'body'});
      expect(a['kind'], 'SUGGESTION');
      // Амжилтын дараа дэлгэрэнгүй sheet нээгдэнэ.
      await tester.pumpAndSettle();
      expect(find.text('Хариу хараахан ирээгүй байна.'), findsOneWidget);
    });
  });
}
