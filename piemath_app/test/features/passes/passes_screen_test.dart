import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/passes/ui/pass_detail_screen.dart';
import 'package:piemath_app/features/passes/ui/passes_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';
import 'passes_fixtures.dart';

const _denied = 'Энэ хэсгийг зөвхөн админ удирдана';

void main() {
  group('эрх', () {
    for (final role in ['TEACHER_PLUS', 'TEACHER', 'STUDENT', 'PARENT']) {
      testWidgets('$role: жагсаалт ба дэлгэрэнгүй хаалттай, хүсэлтгүй', (tester) async {
        for (final screen in const [PassesScreen(), PassDetailScreen(passId: 'p1')]) {
          final h = FakeHttp();
          await pumpPasses(tester, screen, http: h, role: role);
          expect(find.text(_denied), findsOneWidget, reason: '$role ${screen.runtimeType}');
          expect(h.requests, isEmpty);
          expect(find.byTooltip('Шинэ эрх'), findsNothing);
        }
      });
    }
  });

  group('жагсаалт', () {
    testWidgets('мөр: нэр, хугацаа, үнэ, хүрээ, эзэмшигч, төлөв; дарахад дэлгэрэнгүй', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/passes', [
          passJson(),
          passJson(
            id: 'p2',
            name: 'Бүлгийн эрх',
            price: null,
            active: false,
            holders: 0,
            scope: {
              'chapterIds': ['c1', 'c2'],
            },
          ),
        ]);
      await pumpPasses(tester, const PassesScreen(), http: h);
      expect(find.text('Сарын эрх'), findsOneWidget);
      expect(find.text('Бүлгийн эрх'), findsOneWidget);
      expect(find.text('50,000₮'), findsOneWidget);
      expect(find.text('Дурын дүн'), findsOneWidget);
      expect(find.text('2 бүлэг'), findsOneWidget);
      expect(find.text('2 эрх'), findsOneWidget);
      expect(find.byTooltip('Шинэ эрх'), findsOneWidget);

      await tester.tap(find.text('Сарын эрх'));
      await settle(tester);
      expect(find.text('ROUTE:/app/admin/passes/p1'), findsOneWidget);
    });

    testWidgets('хайлт нэрээр (санах ойд)', (tester) async {
      final h = FakeHttp()..json('GET', '/passes', [passJson(), passJson(id: 'p2', name: 'Бүлгийн эрх')]);
      await pumpPasses(tester, const PassesScreen(), http: h);
      await tester.enterText(find.byType(TextField).first, 'бүлг');
      await settle(tester, frames: 16);
      expect(find.text('Сарын эрх'), findsNothing);
      expect(find.text('Бүлгийн эрх'), findsOneWidget);
    });

    testWidgets('хоосон', (tester) async {
      final h = FakeHttp()..json('GET', '/passes', <Object>[]);
      await pumpPasses(tester, const PassesScreen(), http: h);
      expect(find.text('Одоогоор эрх үүсгээгүй байна'), findsOneWidget);
    });

    testWidgets('алдаа + дахин оролдох', (tester) async {
      final h = FakeHttp()
        ..error('GET', '/passes', 500)
        ..json('GET', '/passes', [passJson()]);
      await pumpPasses(tester, const PassesScreen(), http: h);
      expect(find.text('Дахин оролдох'), findsOneWidget);
      await tester.tap(find.text('Дахин оролдох'));
      await settle(tester, frames: 16);
      expect(find.text('Сарын эрх'), findsOneWidget);
    });
  });

  group('дэлгэрэнгүй', () {
    testWidgets('нөхцөл, хүрээ, эзэмшигчид (UB огноо, код, төлөв)', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/passes', [
          passJson(
            scope: {
              'chapterIds': ['c1'],
              'testIds': ['t1', 't2'],
            },
          ),
        ])
        ..json('GET', '/passes/p1/holders', [
          holderJson(),
          holderJson(id: 'up2', firstName: 'Саруул', active: false, code: null),
        ]);
      await pumpPasses(tester, const PassDetailScreen(passId: 'p1'), http: h);
      expect(find.text('Сарын эрх'), findsOneWidget);
      expect(find.text('1 бүлэг, 2 тест'), findsOneWidget);
      expect(find.text('t1, t2'), findsOneWidget);
      expect(find.text('2 эзэмшигч'), findsOneWidget);
      await scrollTo(tester, find.text('Хугацаа дууссан'));
      expect(find.text('Хүчинтэй'), findsOneWidget);
      expect(find.text('B27120001'), findsOneWidget);
      expect(find.text('Кодгүй'), findsOneWidget);
      expect(find.text('2026.11.01 – 2026.12.01'), findsNWidgets(2));
      // Цуцлах, устгах үйлдэл байхгүй (сервер бүрмөсөн устгадаг).
      expect(find.text('Цуцлах'), findsNothing);
      expect(find.text('Устгах'), findsNothing);
    });

    testWidgets('эзэмшигчгүй, эрх олдоогүй төлөв', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/passes', [passJson()])
        ..json('GET', '/passes/p1/holders', <Object>[]);
      await pumpPasses(tester, const PassDetailScreen(passId: 'p1'), http: h);
      expect(find.text('Одоогоор эзэмшигч алга'), findsOneWidget);

      final h2 = FakeHttp()..json('GET', '/passes', [passJson()]);
      await pumpPasses(tester, const PassDetailScreen(passId: 'zzz'), http: h2);
      expect(find.text('Эрх олдсонгүй'), findsOneWidget);
      expect(h2.count('GET', '/passes/zzz/holders'), 0);
    });

    testWidgets('эзэмшигчдийн алдаа + дахин оролдох', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/passes', [passJson()])
        ..error('GET', '/passes/p1/holders', 500)
        ..json('GET', '/passes/p1/holders', [holderJson()]);
      await pumpPasses(tester, const PassDetailScreen(passId: 'p1'), http: h);
      await tester.ensureVisible(find.text('Дахин оролдох'));
      await tester.tap(find.text('Дахин оролдох'));
      await settle(tester, frames: 16);
      expect(find.text('Хүчинтэй'), findsOneWidget);
    });

    testWidgets('идэвхгүй болгох: баталгаажуулалт, нэг PATCH, болих бол хүсэлтгүй', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/passes', [passJson()])
        ..json('GET', '/passes', [passJson(active: false)])
        ..json('GET', '/passes/p1/holders', <Object>[])
        ..json('PATCH', '/passes/p1', passJson(active: false));
      await pumpPasses(tester, const PassDetailScreen(passId: 'p1'), http: h);

      await tester.tap(buttonWith('Идэвхгүй болгох'));
      await settle(tester);
      expect(find.byType(AlertDialog), findsOneWidget);
      await tester.tap(find.text('Болих'));
      await settle(tester);
      expect(h.count('PATCH', '/passes/p1'), 0);

      await tester.tap(buttonWith('Идэвхгүй болгох'));
      await settle(tester);
      await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Идэвхгүй болгох')));
      await settle(tester, frames: 16);
      expect(h.count('PATCH', '/passes/p1'), 1);
      expect(h.requests.lastWhere((r) => r.method == 'PATCH').data, {'active': false});
      expect(find.text('Эрхийг идэвхгүй болголоо'), findsOneWidget);
      // Идэвхгүй эрхэд олгох товч харагдахгүй.
      expect(find.text('Сурагчид эрх олгох'), findsNothing);
      expect(find.text('Идэвхжүүлэх'), findsOneWidget);
    });

    testWidgets('идэвх солиход алдаа: мессеж, дахин автоматаар илгээхгүй', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/passes', [passJson()])
        ..json('GET', '/passes/p1/holders', <Object>[])
        ..on('PATCH', '/passes/p1', (_) => const FakeResponse.network());
      await pumpPasses(tester, const PassDetailScreen(passId: 'p1'), http: h);
      await tester.tap(buttonWith('Идэвхгүй болгох'));
      await settle(tester);
      await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Идэвхгүй болгох')));
      await settle(tester, frames: 16);
      expect(h.count('PATCH', '/passes/p1'), 1);
      expect(find.byType(SnackBar), findsOneWidget);
    });

    testWidgets('сурагчид олгох: хайх → сонгох → нэг POST → эзэмшигчид шинэчлэгдэнэ', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/passes', [passJson(holders: 0)])
        ..json('GET', '/passes', [passJson(holders: 1)])
        ..json('GET', '/passes/p1/holders', <Object>[])
        ..json('GET', '/passes/p1/holders', [holderJson()])
        ..json('GET', '/users/search', [
          {'id': 'u9', 'firstName': 'Болд', 'lastName': 'Тестийн', 'studentCode': 'B27120001'},
        ])
        ..json('POST', '/passes/p1/grant', {'id': 'up1'});
      await pumpPasses(tester, const PassDetailScreen(passId: 'p1'), http: h);
      await tester.tap(buttonWith('Сурагчид эрх олгох'));
      await settle(tester);
      await tester.enterText(find.byKey(const ValueKey('grant:search')), 'Бо');
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      expect(h.requests.lastWhere((r) => r.path == '/users/search').queryParameters['q'], 'Бо');
      // Сонгоогүй бол олгох товч идэвхгүй.
      final submit = find.byKey(const ValueKey('grant:submit'));
      expect(tester.widget<FilledButton>(submit).onPressed, isNull);
      await tester.tap(find.byKey(const ValueKey('grant:hit:u9')));
      await settle(tester);
      await tester.enterText(find.byKey(const ValueKey('grant:note')), 'Бэлнээр төлсөн');
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await settle(tester, frames: 16);
      expect(h.count('POST', '/passes/p1/grant'), 1);
      expect(h.requests.lastWhere((r) => r.method == 'POST').data, {'userId': 'u9', 'note': 'Бэлнээр төлсөн'});
      expect(find.byKey(const ValueKey('grant:search')), findsNothing);
      expect(find.textContaining('сурагчид эрх олголоо'), findsOneWidget);
      expect(h.count('GET', '/passes/p1/holders'), 2);
    });

    testWidgets('олголтын алдаа: цонх нээлттэй, серверийн мессеж, давтахгүй', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/passes', [passJson()])
        ..json('GET', '/passes/p1/holders', <Object>[])
        ..json('GET', '/users/search', [
          {'id': 'u9', 'firstName': 'Болд', 'lastName': 'Тестийн'},
        ])
        ..error('POST', '/passes/p1/grant', 400, 'Энэ эрх идэвхтэй байна');
      await pumpPasses(tester, const PassDetailScreen(passId: 'p1'), http: h);
      await tester.tap(buttonWith('Сурагчид эрх олгох'));
      await settle(tester);
      await tester.enterText(find.byKey(const ValueKey('grant:search')), 'Болд');
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('grant:hit:u9')));
      await settle(tester);
      final submit = find.byKey(const ValueKey('grant:submit'));
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await settle(tester, frames: 16);
      expect(find.text('Энэ эрх идэвхтэй байна'), findsOneWidget);
      expect(h.count('POST', '/passes/p1/grant'), 1);
      expect(find.byKey(const ValueKey('grant:search')), findsOneWidget);
    });
  });
}
