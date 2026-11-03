import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/parent/ui/parent_home_screen.dart';
import 'package:piemath_app/features/parent/ui/weekly_report_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_fixtures.dart';
import '../m7_harness.dart';

FakeHttp _http(List<Map<String, Object?>> links) => FakeHttp()
  ..json('GET', '/parent/children', links)
  ..json('GET', '/exam-results/parent/tr1', examCard())
  ..json('GET', '/tuition/paid-until/s1', {'paidUntil': '2026-11-06T00:00:00.000Z'});

final _parent = signedInAs('PARENT');

void main() {
  testWidgets('баталгаажсан хүүхэд: дүн, ирц, даалгавар, төлбөр', (tester) async {
    await pumpM7(tester, const ParentHomeScreen(), http: _http([verifiedLink()]), session: _parent);
    expect(find.text('Тэмүүлэн Тестийн'), findsOneWidget);
    expect(find.text('Холболт баталгаажсан'), findsOneWidget);
    expect(find.text('Хамгийн сүүлийн дүн'), findsOneWidget);
    expect(find.text('78%'), findsOneWidget);
    expect(find.text('Анхаарах сэдэв'), findsOneWidget);
    // Импортын «А · Б» гарчгийн цэг глифээр биш.
    expect(find.textContaining('·'), findsNothing);
    await scrollTo(tester, find.text('Хоцорсон'));
    expect(find.text('Тасалсан'), findsOneWidget);
    await scrollTo(tester, find.text('Дутуу'));
    expect(find.text('12Б: Хоёр бодлого дутуу'), findsOneWidget);
    await scrollTo(tester, find.text('Танилцсан, 2026.10.21'));
    await scrollTo(tester, find.text('2 хоногийн дараа дуусна'));
    expect(find.text('Тэмүүлэн: төлбөрийн хугацаа'), findsOneWidget);
  });

  testWidgets('онлайн хүүхэд: илгээлтийг харуулна', (tester) async {
    final http = _http([verifiedLink(type: 'ONLINE')]);
    await pumpM7(tester, const ParentHomeScreen(), http: http, session: _parent);
    await scrollTo(tester, find.text('Логарифмын даалгавар'));
    expect(find.text('Шалгуулахаар илгээсэн'), findsOneWidget);
  });

  testWidgets('олон хүүхэд: сонгох, баталгаажаагүйг тайлбарлана', (tester) async {
    await pumpM7(tester, const ParentHomeScreen(), http: _http([verifiedLink(), pendingLink()]), session: _parent);
    expect(find.byType(ChoiceChip), findsNWidgets(2));
    await tester.tap(find.widgetWithText(ChoiceChip, 'Ану'));
    await settle(tester);
    expect(find.textContaining('Холболтын баталгаажуулалт хүлээж байна'), findsOneWidget);
    expect(find.text('Хамгийн сүүлийн дүн'), findsNothing);
  });

  testWidgets('хүүхэдгүй: хоосон төлөв + холбох маягт', (tester) async {
    final http = _http(const [])..json('POST', '/parent/links', {'id': 'lnk9'});
    await pumpM7(tester, const ParentHomeScreen(), http: http, session: _parent);
    expect(find.text('Холбосон хүүхэд хараахан алга'), findsOneWidget);
    expect(find.text('Хүүхэд холбох'), findsOneWidget);
    final send = find.widgetWithText(FilledButton, 'Хүсэлт илгээх');
    await tester.enterText(find.byType(TextField), '9900001');
    await tester.pump();
    expect(tester.widget<FilledButton>(send).onPressed, isNull);
    await tester.enterText(find.byType(TextField), '99000001');
    await tester.pump();
    await tester.tap(send);
    await settle(tester);
    expect(http.requests.singleWhere((r) => r.method == 'POST').data, {'studentPhone': '99000001'});
    expect(find.textContaining('Холболтын хүсэлт илгээгдлээ'), findsOneWidget);
  });

  testWidgets('холбох: сурагч олдоогүй — серверийн монгол мессеж', (tester) async {
    final http = _http(const [])..error('POST', '/parent/links', 404, 'Ийм утасны дугаартай сурагч олдсонгүй');
    await pumpM7(tester, const ParentHomeScreen(), http: http, session: _parent);
    await tester.enterText(find.byType(TextField), '99000009');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Хүсэлт илгээх'));
    await settle(tester);
    expect(find.text('Ийм утасны дугаартай сурагч олдсонгүй'), findsOneWidget);
  });

  testWidgets('алдаа → дахин оролдох', (tester) async {
    final http = FakeHttp()..error('GET', '/parent/children', 500);
    await pumpM7(tester, const ParentHomeScreen(), http: http, session: _parent);
    expect(find.text(AppStrings.serverError), findsOneWidget);
    expect(find.text(AppStrings.retry), findsOneWidget);
  });

  testWidgets('дүнтэй танилцах: код хүсэх → батлах', (tester) async {
    final http = _http([verifiedLink()])
      ..json('POST', '/parent/results/tr1/ack/request', {'maskedEmail': 't***@example.mn'})
      ..json('POST', '/parent/results/tr1/ack/verify', {'id': 'ack1'});
    await pumpM7(tester, const ParentHomeScreen(), http: http, session: _parent);
    await tester.tap(find.widgetWithText(OutlinedButton, 'Дүнтэй танилцлаа'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Код авах'));
    await settle(tester);
    expect(find.text('Код t***@example.mn хаяг руу илгээгдлээ.'), findsOneWidget);
    await tester.enterText(find.byType(TextField).last, '123456');
    await tester.tap(find.text('Батлах'));
    await settle(tester);
    expect(http.requests.where((r) => r.path.endsWith('/ack/verify')).single.data, {'code': '123456'});
    expect(find.text('Батлах'), findsNothing);
  });

  group('7 хоногийн тайлан', () {
    testWidgets('тайлан: ирц, тест, хуваарь', (tester) async {
      final http = _http([verifiedLink()])..json('GET', '/parents/weekly-report', weeklyReportJson());
      await pumpM7(tester, const WeeklyReportScreen(), http: http, session: _parent);
      final req = http.requests.singleWhere((r) => r.path == '/parents/weekly-report');
      expect(req.queryParameters, {'studentId': 's1', 'week': '2026-11-02'});
      expect(find.text('3 ирсэн'), findsOneWidget);
      expect(find.text('Сайн: Интеграл'), findsOneWidget);
      await scrollTo(tester, find.text('Дүн бүртгэгдээгүй'));
      await scrollTo(tester, find.text('11-р сарын 9, Да, 15:00–17:00'));
    });

    testWidgets('Даваа биш огноо ирвэл Даваа руу засна', (tester) async {
      final http = _http([verifiedLink()])..json('GET', '/parents/weekly-report', weeklyReportJson());
      await pumpM7(tester, const WeeklyReportScreen(initialWeek: '2026-10-29'), http: http, session: _parent);
      final req = http.requests.singleWhere((r) => r.path == '/parents/weekly-report');
      expect(req.queryParameters['week'], '2026-10-26');
    });

    testWidgets('баталгаажсан хүүхэдгүй', (tester) async {
      await pumpM7(tester, const WeeklyReportScreen(), http: _http([pendingLink()]), session: _parent);
      expect(find.text('Баталгаажсан хүүхэд алга'), findsOneWidget);
    });
  });

  testWidgets('эцэг эх: сервер үнэ өгөөгүй тул тариф харагдахгүй, хугацаа серверээс', (tester) async {
    final link = verifiedLink();
    ((link['student']! as Map)['payments']! as List).clear();
    final http = _http([link]);
    await pumpM7(tester, const ParentHomeScreen(), http: http, session: _parent);
    await scrollTo(tester, find.text('Төлбөр төлөх данс'));
    expect(find.textContaining('₮'), findsNothing);
    expect(find.text('Сарын төлбөр'), findsNothing);
    expect(http.count('GET', '/tuition/paid-until/s1'), 1);
  });
}
