import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/finance/ui/finance_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';
import 'finance_fixtures.dart';

const _denied = 'Энэ хэсэг танд нээгдээгүй';

FakeHttp _http({List<Map<String, Object?>>? expenses}) => FakeHttp()
  ..json('GET', '/finance/report', reportJson())
  ..json('GET', '/finance/expenses', expenses ?? [expenseJson()]);

Finder _field(String label) => find.widgetWithText(TextField, label);

/// Дэлгэцийн босоо CustomScrollView-ийг [finder] харагдтал гүйлгэнэ.
Future<void> _scrollTo(WidgetTester tester, Finder finder) => tester.scrollUntilVisible(
  finder,
  250,
  scrollable: find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).first,
);

void main() {
  group('эрх: зөвхөн Админ (Багш+ төвийн нийт дүнг харахгүй)', () {
    for (final role in ['TEACHER_PLUS', 'TEACHER', 'STUDENT', 'PARENT']) {
      testWidgets('$role: хаалттай, хүсэлтгүй, мөнгөн дүнгүй', (tester) async {
        final h = _http();
        await pumpFinance(tester, const FinanceScreen(), http: h, role: role);
        expect(find.text(_denied), findsOneWidget);
        expect(find.textContaining('₮'), findsNothing);
        expect(h.requests, isEmpty);
      });
    }
  });

  testWidgets('тайлан: серверийн нийлбэр, задаргаа, өмнөх сартай харьцуулалт, зарлагын мөр', (tester) async {
    final h = _http();
    await pumpFinance(tester, const FinanceScreen(), http: h, role: 'ADMIN');
    expect(queryOf(h, '/finance/report', 'month'), '2026-11');
    expect(find.text('2026 оны 11-р сар'), findsOneWidget);
    expect(find.text('3,000,000₮'), findsNWidgets(2)); // гол тоо + «Нийт орлого»
    expect(find.text('1,800,000₮'), findsNWidgets(2));
    expect(find.text('Сургалтын төлбөр'), findsWidgets);
    await _scrollTo(tester, find.textContaining('Өмнөх сартай'));
    expect(find.text('Өмнөх сартай харьцуулбал +200,000₮'), findsOneWidget);
    expect(find.text('Өмнөх сарын цэвэр ашиг 1,000,000₮'), findsOneWidget);
    await _scrollTo(tester, find.byKey(const ValueKey('expense:e1')));
    expect(find.text('Арваннэгдүгээр сарын түрээс'), findsOneWidget);
    expect(find.textContaining('Сараа+'), findsOneWidget);
    expect(find.text('2026.11.02'), findsOneWidget);
    // Хатуу устгал апп-д байхгүй.
    expect(find.text('Устгах'), findsNothing);
  });

  testWidgets('сар солиход тухайн сарыг серверээс авна', (tester) async {
    final h = _http();
    await pumpFinance(tester, const FinanceScreen(), http: h, role: 'ADMIN');
    await tester.tap(find.byKey(const Key('finance-prev-month')));
    await settle(tester);
    expect(find.text('2026 оны 10-р сар'), findsOneWidget);
    expect(queryOf(h, '/finance/report', 'month'), '2026-10');
    expect(queryOf(h, '/finance/expenses', 'month'), '2026-10');
  });

  testWidgets('тайлангийн алдаа + дахин оролдох, хоосон зарлага', (tester) async {
    final h = FakeHttp()
      ..error('GET', '/finance/report', 500)
      ..json('GET', '/finance/report', reportJson())
      ..json('GET', '/finance/expenses', <Object>[]);
    await pumpFinance(tester, const FinanceScreen(), http: h, role: 'ADMIN');
    expect(find.text('Дахин оролдох'), findsOneWidget);
    expect(find.text('Энэ сарын зарлага алга'), findsOneWidget);
    await tester.tap(find.text('Дахин оролдох'));
    await settle(tester);
    expect(find.text('Цэвэр ашиг'), findsWidgets);
    expect(h.count('GET', '/finance/report'), 2);
  });

  testWidgets('ангилал тодорхойгүй төлбөрийн тоо харагдана', (tester) async {
    final h = FakeHttp()
      ..json('GET', '/finance/report', reportJson(recon: 3))
      ..json('GET', '/finance/expenses', <Object>[]);
    await pumpFinance(tester, const FinanceScreen(), http: h, role: 'ADMIN');
    await _scrollTo(tester, find.textContaining('ангилал тодорхойгүй'));
    expect(find.text('3 төлбөрийн ангилал тодорхойгүй тул «Бусад»-д орсон'), findsOneWidget);
  });

  testWidgets('зарлага нэмэх: дүнтэй баталгаажуулалт, нэг POST, тайлан дахин ачаална', (tester) async {
    final h = _http(expenses: [])..json('POST', '/finance/expenses', {'id': 'e9'});
    await pumpFinance(tester, const FinanceScreen(), http: h, role: 'ADMIN');
    await tester.tap(find.byKey(const Key('expense-add-top')));
    await settle(tester, frames: 20);
    expect(find.text('Зарлага нэмэх'), findsOneWidget);
    await tester.enterText(_field('Дүн'), '120000');
    await tester.enterText(_field('Тайлбар'), 'Цахилгаан');
    await tester.pump();
    await tester.tap(find.descendant(of: find.byType(BottomSheet), matching: find.text('Нэмэх')).last);
    await settle(tester, frames: 20);
    final dialog = find.byType(AlertDialog);
    expect(dialog, findsOneWidget);
    expect(find.descendant(of: dialog, matching: find.textContaining('Дүн: 120,000₮')), findsOneWidget);
    expect(find.descendant(of: dialog, matching: find.textContaining('Огноо: 2026.11.04')), findsOneWidget);
    expect(h.count('POST', '/finance/expenses'), 0);
    await tester.tap(find.descendant(of: dialog, matching: find.text('Нэмэх')));
    await settle(tester, frames: 20);
    expect(h.count('POST', '/finance/expenses'), 1);
    expect(h.requests.lastWhere((r) => r.method == 'POST').data, {
      'amount': 120000,
      'category': 'SALARY',
      'description': 'Цахилгаан',
      'occurredOn': '2026-11-04',
    });
    expect(find.text('Зарлага нэмэгдлээ'), findsOneWidget);
    expect(h.count('GET', '/finance/report'), 2);
  });

  testWidgets('баталгаажуулалтыг болиулбал хадгалахгүй, маягт нээлттэй', (tester) async {
    final h = _http(expenses: [])..json('POST', '/finance/expenses', {'id': 'e9'});
    await pumpFinance(tester, const FinanceScreen(), http: h, role: 'ADMIN');
    await tester.tap(find.byKey(const Key('expense-add-top')));
    await settle(tester, frames: 20);
    await tester.enterText(_field('Дүн'), '5000');
    await tester.tap(find.descendant(of: find.byType(BottomSheet), matching: find.text('Нэмэх')).last);
    await settle(tester, frames: 20);
    await tester.tap(find.text('Болих').last);
    await settle(tester, frames: 20);
    expect(h.count('POST', '/finance/expenses'), 0);
    expect(find.text('Зарлага нэмэх'), findsOneWidget);
  });

  testWidgets('зарлага засах: өмнөх ба шинэ дүн, PATCH; алдаа бол давтахгүй', (tester) async {
    final h = _http()..error('PATCH', '/finance/expenses/e1', 400, 'Дүн буруу байна');
    await pumpFinance(tester, const FinanceScreen(), http: h, role: 'ADMIN');
    await _scrollTo(tester, find.byKey(const ValueKey('expense:e1')));
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -300));
    await settle(tester);
    await tester.tap(find.byKey(const ValueKey('expense:e1')));
    await settle(tester, frames: 20);
    expect(find.text('Зарлага засах'), findsOneWidget);
    expect(find.text('500,000'), findsOneWidget);
    await tester.enterText(_field('Дүн'), '450000');
    await tester.pump();
    await tester.tap(find.descendant(of: find.byType(BottomSheet), matching: find.text('Хадгалах')).last);
    await settle(tester, frames: 20);
    final dialog = find.byType(AlertDialog);
    expect(find.descendant(of: dialog, matching: find.textContaining('Өмнөх дүн: 500,000₮')), findsOneWidget);
    expect(find.descendant(of: dialog, matching: find.textContaining('Шинэ дүн: 450,000₮')), findsOneWidget);
    await tester.tap(find.descendant(of: dialog, matching: find.text('Хадгалах')));
    await settle(tester, frames: 20);
    expect(h.count('PATCH', '/finance/expenses/e1'), 1);
    expect(h.requests.lastWhere((r) => r.method == 'PATCH').data, containsPair('category', 'RENT'));
    expect(find.text('Дүн буруу байна'), findsOneWidget);
    expect(find.text('Зарлага засах'), findsOneWidget);
  });
}
