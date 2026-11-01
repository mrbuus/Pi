import 'package:flutter_test/flutter_test.dart';

import '../../helpers/fake_http.dart';
import 'exam_test_app.dart';

void main() {
  testWidgets('дараа харах тэмдэг, бодлогын тор + тайлбар, илгээхийн өмнөх жагсаалт', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/tests/t1', fakeMeta())
      ..json('POST', '/tests/t1/start', fakeStart())
      ..json('PATCH', '/tests/t1/session', {'status': 'IN_PROGRESS', 'leaveCount': 0, 'remainingSec': 2300});
    final app = ExamTestApp(http);
    await app.pump(tester, location: '/app/tests/t1');
    await tester.tap(find.text('Шалгалт эхлүүлэх'));
    await ExamTestApp.settle(tester);
    await tester.tap(find.text('Эхлэх'));
    await ExamTestApp.settle(tester);
    expect(find.text('1-р бодлого'), findsOneWidget);

    // Таймер: жижиг mm:ss, товшоод нууна.
    expect(find.text('40:00'), findsOneWidget);
    await tester.tap(find.text('40:00'));
    await ExamTestApp.settle(tester, 2);
    expect(find.text('40:00'), findsNothing);
    await tester.tap(find.byTooltip('Хугацааг харуулах'));
    await ExamTestApp.settle(tester, 2);
    expect(find.text('40:00'), findsOneWidget);

    // «Дараа харах» тэмдэг.
    await tester.tap(find.text('Дараа харах'));
    await ExamTestApp.settle(tester, 2);
    expect(find.text('Дараа харах: тэмдэглэсэн'), findsOneWidget);

    // Бодлогын тор: тайлбар жагсаалтын доор.
    await tester.tap(find.byTooltip('Бодлогын жагсаалт'));
    await ExamTestApp.settle(tester);
    expect(find.text('Хариулсан'), findsOneWidget);
    expect(find.text('Хариулаагүй'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp(r'^1-р бодлого, хариулаагүй, тэмдэглэсэн')), findsOneWidget);
    await tester.tapAt(const Offset(10, 10)); // sheet хаах
    await ExamTestApp.settle(tester);

    // Илгээхийн өмнө: хариулаагүй + дараа харах дугаарууд, товшиж үсэрнэ.
    await tester.tap(find.text('Дуусгах'));
    await ExamTestApp.settle(tester);
    expect(find.text('Илгээхээсээ өмнө шалгах'), findsOneWidget);
    expect(find.text('Илгээх үү? 2 бодлого хариулаагүй байна'), findsOneWidget);
    expect(find.text('2 хариулаагүй'), findsOneWidget);
    expect(find.text('1 дараа харах'), findsOneWidget);
    expect(find.bySemanticsLabel('2-р бодлого руу очих'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('2-р бодлого руу очих'));
    await ExamTestApp.settle(tester);
    expect(find.text('2-р бодлого'), findsOneWidget);
    expect(http.count('POST', '/tests/t1/submit'), 0);
    await app.close(tester);
  });
}
