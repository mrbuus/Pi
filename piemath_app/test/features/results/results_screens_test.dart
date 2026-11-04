import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/results/ui/student_attempt_screen.dart';
import 'package:piemath_app/features/results/ui/test_results_screen.dart';

import 'results_fixtures.dart';

/// Мөрийн нэрсийг дэлгэцэн дээрх дарааллаар.
List<String> _order(WidgetTester tester, List<String> names) {
  final ys = {for (final n in names) n: tester.getTopLeft(find.text(n).first).dy};
  return [...names]..sort((a, b) => ys[a]!.compareTo(ys[b]!));
}

void main() {
  group('Дүн таб', () {
    testWidgets('оноогоор эрэмбэ, ангийн дундаж, бүрэн бүтэн байдал, эрэмбэ солих', (tester) async {
      await pumpResults(tester, const TestResultsScreen(testId: 't1'), http: resultsHttp());
      expect(find.text('Тэгшитгэл A'), findsOneWidget);
      expect(find.text('3 дүн'), findsOneWidget);
      expect(_order(tester, ['Анар Бат', 'Өлзий Дорж', 'Болд Сүх']), ['Анар Бат', 'Өлзий Дорж', 'Болд Сүх']);
      expect(find.text('63%'), findsOneWidget); // ангийн дундаж
      expect(find.text('Гарсан 2'), findsOneWidget);
      expect(find.text('36/40'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('sort:name')));
      await settle(tester);
      expect(_order(tester, ['Анар Бат', 'Өлзий Дорж', 'Болд Сүх']), ['Анар Бат', 'Болд Сүх', 'Өлзий Дорж']);
      await tester.tap(find.byKey(const ValueKey('sort:name')));
      await settle(tester);
      expect(_order(tester, ['Анар Бат', 'Өлзий Дорж', 'Болд Сүх']), ['Өлзий Дорж', 'Болд Сүх', 'Анар Бат']);
    });

    testWidgets('шүүлтүүр: анхаарах, 50%-иас доош; хайлт', (tester) async {
      await pumpResults(tester, const TestResultsScreen(testId: 't1'), http: resultsHttp());
      await tapScrolledChip(tester, const ValueKey('filter:flagged'));
      expect(find.text('Өлзий Дорж'), findsOneWidget);
      expect(find.text('Анар Бат'), findsNothing);
      await tapScrolledChip(tester, const ValueKey('filter:low'));
      expect(find.text('Болд Сүх'), findsOneWidget);
      expect(find.text('Өлзий Дорж'), findsNothing);
      await tapScrolledChip(tester, const ValueKey('filter:*'));
      await tester.enterText(find.byType(TextField).first, 'анар');
      await settle(tester, frames: 20);
      expect(find.text('Анар Бат'), findsOneWidget);
      expect(find.text('Болд Сүх'), findsNothing);
    });

    testWidgets('анги сонгоход тэр ангийн сурагчид л; мөр дарахад задаргаа', (tester) async {
      await pumpResults(tester, const TestResultsScreen(testId: 't1'), http: resultsHttp());
      await tapScrolledChip(tester, const ValueKey('class:c1'));
      expect(find.text('2 дүн'), findsOneWidget);
      expect(find.text('Болд Сүх'), findsNothing);
      await tester.tap(find.text('Анар Бат'));
      await settle(tester);
      expect(find.text('ROUTE:/app/tests/t1/results/s1'), findsOneWidget);
    });

    testWidgets('сурагч, эцэг эхэд хаалттай — API дуудахгүй', (tester) async {
      final http = resultsHttp();
      await pumpResults(
        tester,
        const TestResultsScreen(testId: 't1'),
        http: http,
        role: 'STUDENT',
      );
      expect(find.text(AppStrings.forbidden), findsOneWidget);
      expect(http.count('GET', '/tests/t1/results'), 0);
    });
  });

  group('Бодлого таб', () {
    testWidgets('нэгтгэл, анхаарах, ялгах чадвар, A–E тархалт; хариу, бодолт харагдахгүй', (tester) async {
      final http = resultsHttp();
      await pumpResults(tester, const TestResultsScreen(testId: 't1', initialTab: 1), http: http);
      expect(find.text('10/11'), findsOneWidget);
      expect(find.text('62%'), findsOneWidget);
      expect(find.text('Шалгалтын найдвартай байдал: Найдвартай'), findsOneWidget);
      final scroll = verticalScroll();
      await tester.scrollUntilVisible(find.text('Ихэнх нь C-г сонгосон (Тэмдэг андуурсан)'), 200, scrollable: scroll);
      expect(find.text('Анхаарах 2 бодлого'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Асуудалтай'), 200, scrollable: scroll);
      expect(find.text('C 6'), findsOneWidget);
      expect(find.textContaining('НУУЦ'), findsNothing);
      expect(find.textContaining('зөв хариу'), findsNothing);
      expect(http.requests.lastWhere((r) => r.path == '/exams/t1/analytics').queryParameters['classroomId'], 'all');
    });
  });

  group('Оруулах таб', () {
    testWidgets('Багш: онлайн дүн түгжээтэй, цаасан нь дахин оруулна; шинэ оноо хадгалагдана', (tester) async {
      final http = resultsHttp();
      await pumpResults(tester, const TestResultsScreen(testId: 't1', initialTab: 2), http: http);
      expect(find.text('12А'), findsOneWidget);
      expect(find.text('Нараа Ган'), findsOneWidget);
      expect(find.byKey(const ValueKey('reenter:s1')), findsOneWidget);
      expect(find.byKey(const ValueKey('reenter:s2')), findsNothing);
      expect(find.text('2 / 3 оруулсан'), findsOneWidget);

      await tester.enterText(find.byKey(const ValueKey('entry:max')), '40');
      await tester.enterText(find.byKey(const ValueKey('score:s3')), '50');
      await settle(tester);
      expect(find.text('0–40 хооронд байх ёстой'), findsOneWidget);
      await tester.enterText(find.byKey(const ValueKey('score:s3')), '25');
      await settle(tester);
      await tester.ensureVisible(find.byKey(const ValueKey('entry:save')));
      await tester.tap(find.byKey(const ValueKey('entry:save')));
      await settle(tester, frames: 20);
      expect(requestBody(http, 'POST', '/tests/t1/results'), {'studentId': 's3', 'totalScore': 25.0, 'maxScore': 40.0});
      expect(http.count('POST', '/tests/t1/results'), 1);
      expect(find.text('1 сурагчийн дүн хадгалагдлаа'), findsOneWidget);
    });

    testWidgets('Багш+: онлайн дүнг шалтгаантай дахин оруулна', (tester) async {
      final http = resultsHttp();
      await pumpResults(
        tester,
        const TestResultsScreen(testId: 't1', initialTab: 2),
        http: http,
        role: 'TEACHER_PLUS',
      );
      await tester.tap(find.byKey(const ValueKey('reenter:s2')));
      await settle(tester);
      expect(find.text('Онлайн дүнг засах'), findsOneWidget);
      await tester.enterText(find.byType(TextField).last, 'түлхүүр зассан');
      await settle(tester);
      await tester.tap(find.text('Үргэлжлүүлэх'));
      await settle(tester, frames: 20);
      await tester.enterText(find.byKey(const ValueKey('score:s2')), '32');
      await settle(tester);
      await tester.ensureVisible(find.byKey(const ValueKey('entry:save')));
      await tester.tap(find.byKey(const ValueKey('entry:save')));
      await settle(tester, frames: 20);
      expect(requestBody(http, 'POST', '/tests/t1/results'), {
        'studentId': 's2',
        'totalScore': 32.0,
        'maxScore': 100.0,
        'reason': 'түлхүүр зассан',
      });
    });
  });

  testWidgets('сурагчийн задаргаа: оноо, хэсэг, алдсан бодлого, явц', (tester) async {
    await pumpResults(
      tester,
      const StudentAttemptScreen(testId: 't1', studentId: 's1', name: 'Анар Бат'),
      http: resultsHttp(),
    );
    expect(find.text('36/40'), findsOneWidget);
    expect(find.text('30/32'), findsOneWidget);
    expect(find.text('Алдсан бодлого (2)'), findsOneWidget);
    expect(find.text('Буруу, 1 оноо'), findsOneWidget);
    expect(find.text('Хоосон, 1 оноо'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Олонлог B'), 200, scrollable: verticalScroll());
    expect(find.text('55%'), findsOneWidget);
  });

  testWidgets('задаргааны алдаа: серверийн монгол мессеж + дахин оролдох', (tester) async {
    final http = resultsHttp()..error('GET', '/exams/t1/students/s4', 403, 'Зөвхөн өөрийн ангийн сурагчийг харна');
    await pumpResults(
      tester,
      const StudentAttemptScreen(testId: 't1', studentId: 's4'),
      http: http,
    );
    expect(find.text('Зөвхөн өөрийн ангийн сурагчийг харна'), findsOneWidget);
    expect(find.text(AppStrings.retry), findsOneWidget);
    expect(http.requests.where((r) => r.path.startsWith('/exams/')).length, 1);
  });
}
