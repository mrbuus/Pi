import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/tuition/ui/refund_start_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';
import 'tuition_fixtures.dart';

FakeHttp _http({List<String> warnings = const [], bool withClass = true, bool withPreview = true}) {
  final h = FakeHttp()
    ..json('GET', '/users/search', [
      {'id': 's1', 'studentCode': 'B27120001', 'firstName': 'Болд', 'lastName': 'Тестийн', 'username': null},
    ])
    ..json('GET', '/users/s1', {
      'id': 's1',
      'role': 'STUDENT',
      'currentClassroom': withClass ? {'id': 'c1', 'name': '12Б', 'grade': 12} : null,
    });
  if (withPreview) h.json('GET', '/tuition/refund/preview', previewJson(warnings: warnings));
  return h;
}

/// Дэлгэцийн ListView-ийг [finder] харагдтал гүйлгэнэ (lazy мөр ч зурагдана).
Future<void> _scroll(WidgetTester tester, Finder finder) async {
  await scrollTo(tester, finder);
  await tester.pump();
}

/// Сурагч хайж сонгоод тооцоог гаргана.
Future<void> _toPreview(WidgetTester tester) async {
  await tester.enterText(find.byKey(const Key('refund-search')), 'Бол');
  await tester.pump(const Duration(milliseconds: 350));
  await settle(tester);
  await tester.tap(find.text('Тестийн Болд'));
  await settle(tester);
  await tester.tap(find.byKey(const Key('refund-calc')));
  await settle(tester);
}

Future<void> _tapSave(WidgetTester tester) async {
  await _scroll(tester, find.byKey(const Key('refund-save')));
  await tester.tap(find.byKey(const Key('refund-save')));
  await settle(tester);
}

void main() {
  testWidgets('серверийн тооцоог яг харуулна: тайлбарын мөр бүр, ₮ дүн, анхааруулга', (tester) async {
    final h = _http(warnings: ['LEFT_AFTER_LAST_LESSON']);
    await pumpTuition(tester, const RefundStartScreen(), http: h, role: 'ADMIN');
    await _toPreview(tester);

    expect(queryOf(h, '/users/search', 'q'), 'Бол');
    expect(queryOf(h, '/tuition/refund/preview', 'studentId'), 's1');
    expect(queryOf(h, '/tuition/refund/preview', 'classroomId'), 'c1');
    expect(queryOf(h, '/tuition/refund/preview', 'leftOn'), '2026-11-03');

    expect(find.text('12Б, 12-р анги'), findsOneWidget);
    expect(find.text('Сар бүр'), findsOneWidget);
    expect(find.text('328,125₮'), findsOneWidget); // буцаах
    expect(find.text('1,050,000₮'), findsOneWidget); // төлсөн
    expect(find.text('721,875₮'), findsOneWidget); // ногдох
    expect(find.text('21,875₮'), findsOneWidget); // нэг хичээл (÷16)
    expect(find.textContaining('Гарсан сарын хичээл'), findsOneWidget);
    expect(find.textContaining('гэрээний сүүлийн хичээлээс хойш'), findsOneWidget);
    for (final line in previewExplanation) {
      await _scroll(tester, find.text(line));
      expect(find.text(line), findsOneWidget, reason: line);
    }
  });

  testWidgets('огноо солигдвол хуучин тооцоо, хадгалах товч алга болно', (tester) async {
    await pumpTuition(tester, const RefundStartScreen(), http: _http(), role: 'ADMIN');
    await _toPreview(tester);
    await _scroll(tester, find.byKey(const Key('refund-save')));
    expect(find.byKey(const Key('refund-save')), findsOneWidget);
    await tester.drag(find.byType(ListView).first, const Offset(0, 2000));
    await settle(tester);
    await tester.tap(find.byKey(const Key('refund-left-on')));
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(of: find.byType(DatePickerDialog), matching: find.text('2')));
    await tester.tap(find.text('Сонгох'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('refund-save')), findsNothing);
    expect(find.text('328,125₮'), findsNothing);
  });

  testWidgets('баталгаажуулалт дүнг хэлнэ; «Болих» бол юу ч илгээхгүй', (tester) async {
    final h = _http()..json('POST', '/tuition/refund', {'id': 'r1'});
    await pumpTuition(tester, const RefundStartScreen(), http: h, role: 'ADMIN');
    await _toPreview(tester);
    await _tapSave(tester);

    final dialog = find.byType(AlertDialog);
    expect(dialog, findsOneWidget);
    expect(find.descendant(of: dialog, matching: find.textContaining('Буцаах дүн: 328,125₮')), findsOneWidget);
    expect(find.descendant(of: dialog, matching: find.textContaining('Тестийн Болд, 12Б')), findsOneWidget);
    await tester.tap(find.text('Болих'));
    await settle(tester);
    expect(h.count('POST', '/tuition/refund'), 0);

    await _tapSave(tester);
    await tester.tap(find.text('Хадгалах'));
    await settle(tester);
    expect(h.count('POST', '/tuition/refund'), 1);
    expect(h.requests.lastWhere((r) => r.method == 'POST').data, {
      'studentId': 's1',
      'classroomId': 'c1',
      'leftOn': '2026-11-03',
    });
    expect(find.text('ROUTE:/app/tuition/refund/r1'), findsOneWidget);
  });

  testWidgets('давхар дарахад нэг л хүсэлт, хадгалж байхад товч идэвхгүй', (tester) async {
    final h = _http()
      ..on('POST', '/tuition/refund', (_) => const FakeResponse({'id': 'r1'}, delay: Duration(milliseconds: 1500)));
    await pumpTuition(tester, const RefundStartScreen(), http: h, role: 'ADMIN');
    await _toPreview(tester);
    await _scroll(tester, find.byKey(const Key('refund-save')));
    // Хоёр удаа дарвал баталгаажуулах цонх нэг л удаа.
    await tester.tap(find.byKey(const Key('refund-save')));
    await tester.tap(find.byKey(const Key('refund-save')), warnIfMissed: false);
    await settle(tester);
    expect(find.byType(AlertDialog), findsOneWidget);
    await tester.tap(find.text('Хадгалах'));
    await settle(tester); // ~240мс — хүсэлт (1.5с) хараахан дуусаагүй

    expect(find.byType(AlertDialog), findsNothing);
    expect(find.text('Хадгалж байна'), findsOneWidget);
    final button = tester.widget<ButtonStyleButton>(
      find.ancestor(of: find.text('Хадгалж байна'), matching: find.byWidgetPredicate((w) => w is ButtonStyleButton)),
    );
    expect(button.onPressed, isNull);
    await tester.tap(find.text('Хадгалж байна'), warnIfMissed: false);
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(AlertDialog), findsNothing);

    await tester.pump(const Duration(milliseconds: 1500));
    await settle(tester);
    expect(h.count('POST', '/tuition/refund'), 1);
    expect(find.text('ROUTE:/app/tuition/refund/r1'), findsOneWidget);
  });

  testWidgets('сервер давхардлыг татгалзвал байгаа буцаалт руу орно (шинээр үүсгэхгүй)', (tester) async {
    final h = _http()
      ..error('POST', '/tuition/refund', 400, 'Энэ сурагч болон ангийн буцаалтын бүртгэл аль хэдийн байна')
      ..json('GET', '/tuition/refunds', {
        'refunds': [refundJson(id: 'r9')],
        'total': 1,
      });
    await pumpTuition(tester, const RefundStartScreen(), http: h, role: 'ADMIN');
    await _toPreview(tester);
    await _tapSave(tester);
    await tester.tap(find.text('Хадгалах'));
    await settle(tester);
    expect(h.count('POST', '/tuition/refund'), 1);
    expect(find.text('ROUTE:/app/tuition/refund/r9'), findsOneWidget);
  });

  testWidgets('тооцооны алдаа: серверийн монгол мессеж', (tester) async {
    final h = _http(withPreview: false)
      ..error('GET', '/tuition/refund/preview', 400, 'Сурагч одоо ямар ч ангид суугаагүй байна');
    await pumpTuition(tester, const RefundStartScreen(), http: h, role: 'ADMIN');
    await _toPreview(tester);
    expect(find.text('Сурагч одоо ямар ч ангид суугаагүй байна'), findsOneWidget);
    expect(find.byKey(const Key('refund-save')), findsNothing);
  });

  testWidgets('идэвхтэй ангигүй сурагч: тооцоо хийх боломжгүй', (tester) async {
    final h = _http(withClass: false);
    await pumpTuition(tester, const RefundStartScreen(), http: h, role: 'ADMIN');
    await tester.enterText(find.byKey(const Key('refund-search')), 'Бол');
    await tester.pump(const Duration(milliseconds: 350));
    await settle(tester);
    await tester.tap(find.text('Тестийн Болд'));
    await settle(tester);
    expect(find.textContaining('идэвхтэй анги олдсонгүй'), findsOneWidget);
    final calc = tester.widget<ButtonStyleButton>(
      find.ancestor(of: find.text('Тооцоог харах'), matching: find.byWidgetPredicate((w) => w is ButtonStyleButton)),
    );
    expect(calc.onPressed, isNull);
  });

  testWidgets('жагсаалт руу орох холбоос', (tester) async {
    await pumpTuition(tester, const RefundStartScreen(), http: _http(), role: 'ADMIN');
    await tester.tap(find.text('Буцаалтын жагсаалт'));
    await settle(tester);
    expect(find.text('ROUTE:/app/tuition/refunds'), findsOneWidget);
  });
}
